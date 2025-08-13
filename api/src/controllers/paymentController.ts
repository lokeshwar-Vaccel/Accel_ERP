import { Request, Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Payment, IPayment } from '../models/Payment';
import { Invoice } from '../models/Invoice';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

// Types for Razorpay
interface RazorpayOrderOptions {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
}

interface RazorpayPaymentVerification {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// @desc    Create Razorpay order
// @route   POST /api/v1/payments/create-order
// @access  Private
export const createRazorpayOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId, amount, currency = 'INR' } = req.body;

    // Validate input
    if (!invoiceId || !amount) {
      return next(new AppError('Invoice ID and amount are required', 400));
    }

    if (amount <= 0) {
      return next(new AppError('Amount must be greater than 0', 400));
    }

    // Verify invoice exists and is valid for payment
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    if (invoice.status === 'cancelled') {
      return next(new AppError('Cannot process payment for cancelled invoice', 400));
    }

    if (invoice.paymentStatus === 'paid') {
      return next(new AppError('Invoice is already fully paid', 400));
    }

    // Check if amount doesn't exceed remaining amount
    const remainingAmount = invoice.remainingAmount || (invoice.totalAmount - (invoice.paidAmount || 0));
    if (amount > remainingAmount) {
      return next(new AppError(`Payment amount cannot exceed remaining amount: ₹${remainingAmount}`, 400));
    }

    // Create Razorpay order
    const orderOptions: RazorpayOrderOptions = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paise
      currency,
      receipt: `INV_${invoice.invoiceNumber}_${Date.now()}`,
      notes: {
        invoiceId: invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customer?.toString() || 'Unknown'
      }
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    // Create payment record
    const payment = new Payment({
      invoiceId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      transactionDate: new Date(),
      notes: `Razorpay order created for invoice ${invoice.invoiceNumber}`,
      metadata: {
        razorpayOrder: razorpayOrder
      },
      createdBy: req.user!.id
    });

    await payment.save();

    const response: APIResponse = {
      success: true,
      message: 'Razorpay order created successfully',
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        paymentId: payment._id
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    next(new AppError('Failed to create payment order', 500));
  }
};

// @desc    Verify Razorpay payment
// @route   POST /api/v1/payments/verify
// @access  Private
export const verifyRazorpayPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      paymentId 
    } = req.body as RazorpayPaymentVerification & { paymentId: string };

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !paymentId) {
      return next(new AppError('Missing required payment verification parameters', 400));
    }

    // Find payment record
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      return next(new AppError('Payment record not found', 404));
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      payment.paymentStatus = 'failed';
      payment.metadata = {
        ...payment.metadata,
        verificationError: 'Invalid signature',
        receivedSignature: razorpay_signature,
        expectedSignature
      };
      await payment.save();

      return next(new AppError('Payment verification failed - invalid signature', 400));
    }

    // Update payment record
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.paymentStatus = 'completed';
    payment.metadata = {
      ...payment.metadata,
      verifiedAt: new Date(),
      razorpayPaymentId: razorpay_payment_id
    };

    await payment.save();

    // Update invoice payment status
    const invoice = await Invoice.findById(payment.invoiceId);
    if (invoice) {
      const newPaidAmount = (invoice.paidAmount || 0) + payment.amount;
      invoice.paidAmount = newPaidAmount;
      invoice.remainingAmount = Math.max(0, invoice.totalAmount - newPaidAmount);
      
      // Update payment status based on amount
      if (newPaidAmount >= invoice.totalAmount) {
        invoice.paymentStatus = 'paid';
        invoice.status = 'paid';
      } else if (newPaidAmount > 0) {
        invoice.paymentStatus = 'partial';
      }

      // Add payment method if not set
      if (!invoice.paymentMethod) {
        invoice.paymentMethod = 'razorpay';
      }

      await invoice.save();
    }

    const response: APIResponse = {
      success: true,
      message: 'Payment verified and processed successfully',
      data: {
        paymentId: payment._id,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        status: payment.paymentStatus
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error verifying payment:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body
    });
    next(new AppError('Failed to verify payment', 500));
  }
};

// @desc    Process manual payment (non-Razorpay)
// @route   POST /api/v1/payments/manual
// @access  Private
export const processManualPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      invoiceId, 
      amount, 
      paymentMethod, 
      paymentDate, 
      notes,
      currency = 'INR' 
    } = req.body;

    // Validate input
    if (!invoiceId || !amount || !paymentMethod) {
      return next(new AppError('Invoice ID, amount, and payment method are required', 400));
    }

    if (amount <= 0) {
      return next(new AppError('Amount must be greater than 0', 400));
    }

    const validPaymentMethods = ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'other'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return next(new AppError('Invalid payment method', 400));
    }

    // Verify invoice exists and is valid for payment
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    if (invoice.status === 'cancelled') {
      return next(new AppError('Cannot process payment for cancelled invoice', 400));
    }

    if (invoice.paymentStatus === 'paid') {
      return next(new AppError('Invoice is already fully paid', 400));
    }

    // Check if amount doesn't exceed remaining amount
    const remainingAmount = invoice.remainingAmount || (invoice.totalAmount - (invoice.paidAmount || 0));
    if (amount > remainingAmount) {
      return next(new AppError(`Payment amount cannot exceed remaining amount: ₹${remainingAmount}`, 400));
    }

    // Create payment record
    const payment = new Payment({
      invoiceId,
      amount,
      currency,
      paymentMethod,
      paymentStatus: 'completed',
      transactionDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes: notes || `Manual payment via ${paymentMethod}`,
      metadata: {
        manualPayment: true,
        processedBy: req.user!.id
      },
      createdBy: req.user!.id
    });

    await payment.save();

    // Update invoice payment status
    const newPaidAmount = (invoice.paidAmount || 0) + amount;
    invoice.paidAmount = newPaidAmount;
    invoice.remainingAmount = Math.max(0, invoice.totalAmount - newPaidAmount);
    
    // Update payment status based on amount
    if (newPaidAmount >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
      invoice.status = 'paid';
    } else if (newPaidAmount > 0) {
      invoice.paymentStatus = 'partial';
    }

    // Add payment method if not set
    if (!invoice.paymentMethod) {
      invoice.paymentMethod = paymentMethod;
    }

    // Add payment date if not set
    if (!invoice.paymentDate) {
      invoice.paymentDate = payment.transactionDate;
    }

    await invoice.save();

    const response: APIResponse = {
      success: true,
      message: 'Manual payment processed successfully',
      data: {
        paymentId: payment._id,
        invoiceId: payment.invoiceId,
        amount: payment.amount,
        status: payment.paymentStatus,
        updatedInvoice: {
          paidAmount: invoice.paidAmount,
          remainingAmount: invoice.remainingAmount,
          paymentStatus: invoice.paymentStatus
        }
      }
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error processing manual payment:', error);
    next(new AppError('Failed to process manual payment', 500));
  }
};

// @desc    Get payment history for an invoice
// @route   GET /api/v1/payments/invoice/:invoiceId
// @access  Private
export const getInvoicePayments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    const payments = await Payment.find({ invoiceId })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    const response: APIResponse = {
      success: true,
      message: 'Payment history retrieved successfully',
      data: { payments }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching payment history:', error);
    next(new AppError('Failed to fetch payment history', 500));
  }
};

// @desc    Razorpay webhook handler
// @route   POST /api/v1/payments/webhook
// @access  Public (but signature verified)
export const razorpayWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    
    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      return next(new AppError('Missing webhook signature', 400));
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (signature !== expectedSignature) {
      return next(new AppError('Invalid webhook signature', 400));
    }

    const { event, payload } = req.body;

    // Handle different webhook events
    switch (event) {
      case 'payment.captured':
        await handlePaymentCaptured(payload);
        break;
      case 'payment.failed':
        await handlePaymentFailed(payload);
        break;
      case 'order.paid':
        await handleOrderPaid(payload);
        break;
      default:
        console.error(`Unhandled webhook event: ${event}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    next(new AppError('Webhook processing failed', 500));
  }
};

// Helper functions for webhook handling
async function handlePaymentCaptured(payload: any) {
  const { payment } = payload.entity;
  
  // Find payment record by Razorpay payment ID
  const paymentRecord = await Payment.findOne({ razorpayPaymentId: payment.id });
  if (paymentRecord) {
    paymentRecord.paymentStatus = 'completed';
    paymentRecord.metadata = {
      ...paymentRecord.metadata,
      webhookProcessed: true,
      webhookEvent: 'payment.captured',
      processedAt: new Date()
    };
    await paymentRecord.save();

    // Update invoice
    await updateInvoiceFromPayment(paymentRecord);
  }
}

async function handlePaymentFailed(payload: any) {
  const { payment } = payload.entity;
  
  const paymentRecord = await Payment.findOne({ razorpayPaymentId: payment.id });
  if (paymentRecord) {
    paymentRecord.paymentStatus = 'failed';
    paymentRecord.metadata = {
      ...paymentRecord.metadata,
      webhookProcessed: true,
      webhookEvent: 'payment.failed',
      failureReason: payment.error_description,
      processedAt: new Date()
    };
    await paymentRecord.save();
  }
}

async function handleOrderPaid(payload: any) {
  const { order } = payload.entity;
  
  const paymentRecord = await Payment.findOne({ razorpayOrderId: order.id });
  if (paymentRecord) {
    paymentRecord.paymentStatus = 'completed';
    paymentRecord.metadata = {
      ...paymentRecord.metadata,
      webhookProcessed: true,
      webhookEvent: 'order.paid',
      processedAt: new Date()
    };
    await paymentRecord.save();

    // Update invoice
    await updateInvoiceFromPayment(paymentRecord);
  }
}

async function updateInvoiceFromPayment(payment: IPayment) {
  const invoice = await Invoice.findById(payment.invoiceId);
  if (invoice) {
    const newPaidAmount = (invoice.paidAmount || 0) + payment.amount;
    invoice.paidAmount = newPaidAmount;
    invoice.remainingAmount = Math.max(0, invoice.totalAmount - newPaidAmount);
    
    if (newPaidAmount >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
      invoice.status = 'paid';
    } else if (newPaidAmount > 0) {
      invoice.paymentStatus = 'partial';
    }

    if (!invoice.paymentMethod) {
      invoice.paymentMethod = payment.paymentMethod;
    }

    await invoice.save();
  }
} 