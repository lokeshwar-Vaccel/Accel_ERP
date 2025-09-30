import { Response, NextFunction } from 'express';
import { DGInvoicePayment, IPaymentMethodDetails } from '../models/DGInvoicePayment';
import { DGInvoice } from '../models/DGInvoice';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest, APIResponse } from '../types';
import { generateDGInvoicePaymentReceiptPDF } from '../utils/paymentReceiptPdf';

// Helper function to validate payment method details
const validatePaymentMethodDetails = (paymentMethod: string, paymentMethodDetails: any): string | null => {
  if (!paymentMethodDetails) return null;

  switch (paymentMethod) {
    case 'cheque':
      const chequeDetails = paymentMethodDetails.cheque || paymentMethodDetails;
      if (!chequeDetails.chequeNumber) return 'Cheque number is required';
      if (!chequeDetails.bankName) return 'Bank name is required';
      if (!chequeDetails.issueDate) return 'Issue date is required';
      break;
    case 'bank_transfer':
      const bankTransferDetails = paymentMethodDetails.bankTransfer || paymentMethodDetails;
      if (!bankTransferDetails.transferDate) return 'Transfer date is required';
      break;
    case 'upi':
      // No required fields for UPI - transaction ID is optional
      break;
    case 'card':
      // No required fields for card - transaction ID is optional
      break;
    case 'other':
      const otherDetails = paymentMethodDetails.other || paymentMethodDetails;
      if (!otherDetails.methodName) return 'Method name is required';
      break;
  }
  return null;
};

// Helper function to update DG Invoice payment status
const updateDGInvoicePaymentStatus = async (dgInvoiceId: string, amount: number): Promise<void> => {
  const dgInvoice = await DGInvoice.findById(dgInvoiceId);
  if (!dgInvoice) return;

  // Get all completed payments for this invoice
  const payments = await DGInvoicePayment.find({
    dgInvoiceId: dgInvoiceId,
    paymentStatus: 'completed'
  });

  const totalPaidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remainingAmount = Math.max(0, dgInvoice.totalAmount - totalPaidAmount);

  let paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'GST Pending';
  if (totalPaidAmount === 0) {
    paymentStatus = 'Pending';
  } else if (totalPaidAmount >= dgInvoice.totalAmount) {
    paymentStatus = 'Paid';
  } else {
    paymentStatus = 'Partial';
  }

  await DGInvoice.findByIdAndUpdate(dgInvoiceId, {
    paidAmount: totalPaidAmount,
    remainingAmount: remainingAmount,
    paymentStatus: paymentStatus
  });
};

// @desc    Create a new DG invoice payment with detailed method info
// @route   POST /api/v1/dg-invoice-payments
// @access  Private
export const createDGInvoicePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      dgInvoiceId,
      invoiceNumber,
      customerId,
      amount,
      currency = 'INR',
      paymentMethod,
      paymentMethodDetails,
      paymentDate,
      notes,
      receiptNumber
    } = req.body;

    // Validate required fields
    if (!dgInvoiceId || !invoiceNumber || !customerId || !amount || !paymentMethod) {
      return next(new AppError('Missing required fields', 400));
    }

    if (amount <= 0) {
      return next(new AppError('Payment amount must be greater than 0', 400));
    }

    // Validate payment method details based on payment method
    const validationError = validatePaymentMethodDetails(paymentMethod, paymentMethodDetails);
    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    // Check if DG invoice exists
    const dgInvoice = await DGInvoice.findById(dgInvoiceId);
    if (!dgInvoice) {
      return next(new AppError('DG Invoice not found', 404));
    }

    // Check if payment amount exceeds remaining amount
    if (amount > dgInvoice.remainingAmount) {
      return next(new AppError('Payment amount exceeds remaining amount', 400));
    }

    // Structure payment method details based on the selected payment method
    // Convert frontend keys to backend keys
    const keyMapping: { [key: string]: string } = {
      'bank_transfer': 'bankTransfer',
      'bankTransfer': 'bankTransfer',
      'cheque': 'cheque',
      'upi': 'upi',
      'card': 'card',
      'cash': 'cash',
      'other': 'other'
    };
    
    const backendKey = keyMapping[paymentMethod] || paymentMethod;
    
    // Get the payment method details from the correct key
    let methodDetails = {};
    if (paymentMethodDetails[paymentMethod]) {
      // If data is in the payment method key (e.g., bank_transfer)
      methodDetails = paymentMethodDetails[paymentMethod];
    } else if (paymentMethodDetails[backendKey]) {
      // If data is in the backend key (e.g., bankTransfer)
      methodDetails = paymentMethodDetails[backendKey];
    }
    
    // Debug logging
    console.log('=== DG Invoice Payment Method Details Debug ===');
    console.log('Payment Method:', paymentMethod);
    console.log('Backend Key:', backendKey);
    console.log('Payment Method Details:', JSON.stringify(paymentMethodDetails, null, 2));
    console.log('Method Details:', JSON.stringify(methodDetails, null, 2));
    console.log('==============================================');
    
    const structuredPaymentMethodDetails = {
      [backendKey]: methodDetails
    };

    // Create the payment record
    const payment = new DGInvoicePayment({
      dgInvoiceId,
      invoiceNumber,
      customerId,
      amount,
      currency,
      paymentMethod,
      paymentMethodDetails: structuredPaymentMethodDetails,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes,
      receiptNumber,
      createdBy: req.user?.id,
      paymentStatus: 'completed'
    });

    await payment.save();

    // Update the DG invoice payment status
    await updateDGInvoicePaymentStatus(dgInvoiceId, amount);

    const response: APIResponse = {
      success: true,
      message: 'DG Invoice payment created successfully',
      data: { payment }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments for a specific DG invoice
// @route   GET /api/v1/dg-invoice-payments/invoice/:dgInvoiceId
// @access  Private
export const getPaymentsByDGInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { dgInvoiceId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const payments = await DGInvoicePayment.find({ dgInvoiceId })
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await DGInvoicePayment.countDocuments({ dgInvoiceId });

    const response: APIResponse = {
      success: true,
      message: 'Payments retrieved successfully',
      data: {
        payments,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total
        }
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment by ID
// @route   GET /api/v1/dg-invoice-payments/:id
// @access  Private
export const getPaymentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await DGInvoicePayment.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Payment retrieved successfully',
      data: payment
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment details
// @route   PUT /api/v1/dg-invoice-payments/:id
// @access  Private
export const updatePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate payment method details if provided
    if (updateData.paymentMethod && updateData.paymentMethodDetails) {
      const validationError = validatePaymentMethodDetails(updateData.paymentMethod, updateData.paymentMethodDetails);
      if (validationError) {
        return next(new AppError(validationError, 400));
      }
    }

    const payment = await DGInvoicePayment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('customerId', 'name email phone')
     .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Update DG invoice payment status if amount changed
    if (updateData.amount !== undefined) {
      await updateDGInvoicePaymentStatus(payment.dgInvoiceId.toString(), payment.amount);
    }

    const response: APIResponse = {
      success: true,
      message: 'Payment updated successfully',
      data: payment
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment
// @route   DELETE /api/v1/dg-invoice-payments/:id
// @access  Private
export const deletePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await DGInvoicePayment.findById(req.params.id);

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Update DG invoice payment status before deleting
    await updateDGInvoicePaymentStatus(payment.dgInvoiceId.toString(), 0);

    await DGInvoicePayment.findByIdAndDelete(req.params.id);

    const response: APIResponse = {
      success: true,
      message: 'Payment deleted successfully'
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate PDF receipt for a payment
// @route   GET /api/v1/dg-invoice-payments/:id/pdf
// @access  Private
export const generatePaymentReceiptPDFEndpoint = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payment = await DGInvoicePayment.findById(req.params.id)
      .populate('customerId', 'name email phone')
      .populate('dgInvoiceId', 'invoiceNumber invoiceDate totalAmount')
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    const pdfBuffer = await generateDGInvoicePaymentReceiptPDF(payment as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="dg-invoice-payment-receipt-${payment._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};
