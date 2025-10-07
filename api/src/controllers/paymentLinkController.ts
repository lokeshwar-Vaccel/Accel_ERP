import { Request, Response, NextFunction } from 'express';
import { InvoiceEmailService } from '../services/invoiceEmailService';
import { Invoice } from '../models/Invoice';
import { Payment } from '../models/Payment';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';

// @desc    Verify payment link token
// @route   GET /api/v1/payment-links/verify/:token
// @access  Public
export const verifyPaymentLink = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      return next(new AppError('Payment token is required', 400));
    }

    const result = await InvoiceEmailService.verifyPaymentToken(token);

    if (!result.success) {
      return next(new AppError(result.error || 'Invalid payment link', 400));
    }

    const response: APIResponse = {
      success: true,
      message: 'Payment link verified successfully',
      data: {
        invoice: {
          _id: result.invoice!._id,
          invoiceNumber: result.invoice!.invoiceNumber,
          totalAmount: result.invoice!.totalAmount,
          remainingAmount: result.invoice!.remainingAmount,
          dueDate: result.invoice!.dueDate,
          status: result.invoice!.status,
          paymentStatus: result.invoice!.paymentStatus,
          customer: result.invoice!.customer,
          items: result.invoice!.items
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error verifying payment link:', error);
    next(new AppError('Failed to verify payment link', 500));
  }
};

// @desc    Process payment via email link
// @route   POST /api/v1/payment-links/process/:token
// @access  Public
export const processEmailPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;
    const { 
      amount, 
      paymentMethod, 
      paymentDate, 
      notes,
      currency = 'INR',
      useRazorpay = false,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    } = req.body;

    if (!token) {
      return next(new AppError('Payment token is required', 400));
    }

    if (!amount || amount <= 0) {
      return next(new AppError('Valid payment amount is required', 400));
    }

    // Verify and consume payment token
    const tokenResult = await InvoiceEmailService.verifyAndConsumePaymentToken(token);
    if (!tokenResult.success) {
      return next(new AppError(tokenResult.error || 'Invalid payment link', 400));
    }

    const invoice = tokenResult.invoice! as any;

    // Validate payment amount
    if (amount > invoice.remainingAmount) {
      return next(new AppError(`Payment amount cannot exceed remaining amount: ₹${invoice.remainingAmount}`, 400));
    }

    // Validate invoice status
    if (invoice.status === 'cancelled') {
      return next(new AppError('Cannot process payment for cancelled invoice', 400));
    }

    if (invoice.paymentStatus === 'paid') {
      return next(new AppError('Invoice is already fully paid', 400));
    }

    let paymentRecord;

    if (useRazorpay) {
      // Handle Razorpay payment
      if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
        return next(new AppError('Razorpay payment details are required', 400));
      }

      paymentRecord = new Payment({
        invoiceId: invoice._id,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        amount,
        currency,
        paymentMethod: 'razorpay',
        paymentStatus: 'completed',
        transactionDate: new Date(paymentDate || Date.now()),
        notes: notes || `Payment via email link - ${paymentMethod}`,
        metadata: {
          paymentSource: 'email_link',
          token: token
        },
        createdBy: invoice.user // Use the invoice owner as the creator
      });
    } else {
      // Handle manual payment
      if (!paymentMethod) {
        return next(new AppError('Payment method is required for manual payments', 400));
      }

      paymentRecord = new Payment({
        invoiceId: invoice._id,
        amount,
        currency,
        paymentMethod,
        paymentStatus: 'completed',
        transactionDate: new Date(paymentDate || Date.now()),
        notes: notes || `Payment via email link - ${paymentMethod}`,
        metadata: {
          paymentSource: 'email_link',
          token: token
        },
        createdBy: invoice.user // Use the invoice owner as the creator
      });
    }

    await paymentRecord.save();

    // Fetch a fresh invoice object for updating (to avoid customer field issues)
    const freshInvoice = await Invoice.findById(invoice._id);
    if (!freshInvoice) {
      return next(new AppError('Invoice not found for update', 400));
    }

    // Update invoice payment status
    const newPaidAmount = (freshInvoice.paidAmount || 0) + amount;
    freshInvoice.paidAmount = newPaidAmount;
    freshInvoice.remainingAmount = Math.max(0, freshInvoice.totalAmount - newPaidAmount);
    
    // Update payment status based on amount
    if (newPaidAmount >= freshInvoice.totalAmount) {
      freshInvoice.paymentStatus = 'paid';
      freshInvoice.status = 'paid';
    } else if (newPaidAmount > 0) {
      freshInvoice.paymentStatus = 'partial';
    }

    // Payment method is now handled in separate InvoicePayment records

    await freshInvoice.save();

    // Send payment confirmation email
    try {
      await InvoiceEmailService.sendPaymentConfirmation(
        invoice._id.toString(),
        amount,
        paymentMethod || 'razorpay'
      );
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError);
      // Don't fail the payment if email fails
    }

    const response: APIResponse = {
      success: true,
      message: 'Payment processed successfully',
      data: {
        paymentId: paymentRecord._id,
        invoiceId: freshInvoice._id,
        amount: amount,
        remainingAmount: freshInvoice.remainingAmount,
        paymentStatus: freshInvoice.paymentStatus,
        invoiceStatus: freshInvoice.status
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error processing email payment:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    next(new AppError(`Failed to process payment: ${error instanceof Error ? error.message : 'Unknown error'}`, 500));
  }
};

// @desc    Send invoice email with payment link
// @route   POST /api/v1/payment-links/send-invoice/:invoiceId
// @access  Private
export const sendInvoiceEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    if (!invoiceId) {
      return next(new AppError('Invoice ID is required', 400));
    }

    const result = await InvoiceEmailService.sendInvoiceEmail(invoiceId);

    if (!result.success) {
      return next(new AppError(result.message, 400));
    }

    const response: APIResponse = {
      success: true,
      message: result.message,
      data: {
        paymentLink: result.paymentLink
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error sending invoice email:', error);
    next(new AppError('Failed to send invoice email', 500));
  }
};

// @desc    Send payment reminder email
// @route   POST /api/v1/payment-links/send-reminder/:invoiceId
// @access  Private
export const sendPaymentReminder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    if (!invoiceId) {
      return next(new AppError('Invoice ID is required', 400));
    }

    const result = await InvoiceEmailService.sendPaymentReminder(invoiceId);

    if (!result.success) {
      return next(new AppError(result.message, 400));
    }

    const response: APIResponse = {
      success: true,
      message: result.message
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error sending payment reminder:', error);
    next(new AppError('Failed to send payment reminder', 500));
  }
};

// @desc    Get payment link statistics
// @route   GET /api/v1/payment-links/stats
// @access  Private
export const getPaymentLinkStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get statistics about payment links
    const totalInvoices = await Invoice.countDocuments({ status: { $in: ['sent', 'overdue'] } });
    const paidInvoices = await Invoice.countDocuments({ paymentStatus: 'paid' });
    const overdueInvoices = await Invoice.countDocuments({ 
      status: 'overdue',
      paymentStatus: { $ne: 'paid' }
    });

    const response: APIResponse = {
      success: true,
      message: 'Payment link statistics retrieved successfully',
      data: {
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        pendingInvoices: totalInvoices - paidInvoices
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error getting payment link stats:', error);
    next(new AppError('Failed to get payment link statistics', 500));
  }
}; 