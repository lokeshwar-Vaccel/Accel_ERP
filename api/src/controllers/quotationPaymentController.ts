import { Response, NextFunction } from 'express';
import { QuotationPayment, IPaymentMethodDetails } from '../models/QuotationPayment';
import { Quotation } from '../models/Quotation';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest, APIResponse } from '../types';
import { generateQuotationPaymentReceiptPDF } from '../utils/paymentReceiptPdf';

// @desc    Create a new quotation payment with detailed method info
// @route   POST /api/v1/quotation-payments
// @access  Private
export const createQuotationPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      quotationId,
      quotationNumber,
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
    if (!quotationId || !quotationNumber || !customerId || !amount || !paymentMethod) {
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

    // Check if quotation exists
    const quotation = await Quotation.findById(quotationId);
    if (!quotation) {
      return next(new AppError('Quotation not found', 404));
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
    console.log('=== Quotation Payment Method Details Debug ===');
    console.log('Payment Method:', paymentMethod);
    console.log('Backend Key:', backendKey);
    console.log('Payment Method Details:', JSON.stringify(paymentMethodDetails, null, 2));
    console.log('Method Details:', JSON.stringify(methodDetails, null, 2));
    console.log('==============================================');
    
    const structuredPaymentMethodDetails = {
      [backendKey]: methodDetails
    };

    // Create the payment record
    const payment = new QuotationPayment({
      quotationId,
      quotationNumber,
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

    // Update the quotation payment status
    await updateQuotationPaymentStatus(quotationId, amount);

    const response: APIResponse = {
      success: true,
      message: 'Quotation payment created successfully',
      data: { payment }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all payments for a specific quotation
// @route   GET /api/v1/quotation-payments/quotation/:quotationId
// @access  Private
export const getPaymentsByQuotation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quotationId } = req.params;

    const payments = await QuotationPayment.find({ quotationId })
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    const response: APIResponse = {
      success: true,
      message: 'Quotation payments retrieved successfully',
      data: { payments }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment by ID
// @route   GET /api/v1/quotation-payments/:id
// @access  Private
export const getPaymentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await QuotationPayment.findById(id)
      .populate('quotationId', 'quotationNumber grandTotal')
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Payment retrieved successfully',
      data: { payment }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update payment details
// @route   PUT /api/v1/quotation-payments/:id
// @access  Private
export const updatePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate payment method details if payment method is being updated
    if (updateData.paymentMethod && updateData.paymentMethodDetails) {
      const validationError = validatePaymentMethodDetails(updateData.paymentMethod, updateData.paymentMethodDetails);
      if (validationError) {
        return next(new AppError(validationError, 400));
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
      
      const backendKey = keyMapping[updateData.paymentMethod] || updateData.paymentMethod;
      
      // Get the payment method details from the correct key
      let methodDetails = {};
      if (updateData.paymentMethodDetails[updateData.paymentMethod]) {
        // If data is in the payment method key (e.g., bank_transfer)
        methodDetails = updateData.paymentMethodDetails[updateData.paymentMethod];
      } else if (updateData.paymentMethodDetails[backendKey]) {
        // If data is in the backend key (e.g., bankTransfer)
        methodDetails = updateData.paymentMethodDetails[backendKey];
      }
      
      updateData.paymentMethodDetails = {
        [backendKey]: methodDetails
      };
    }

    const payment = await QuotationPayment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('quotationId', 'quotationNumber grandTotal')
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Payment updated successfully',
      data: { payment }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete payment
// @route   DELETE /api/v1/quotation-payments/:id
// @access  Private
export const deletePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await QuotationPayment.findById(id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Update quotation payment status after deletion
    await updateQuotationPaymentStatus(payment.quotationId.toString(), -payment.amount);

    await QuotationPayment.findByIdAndDelete(id);

    const response: APIResponse = {
      success: true,
      message: 'Payment deleted successfully',
      data: {}
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate PDF receipt for a quotation payment
// @route   GET /api/v1/quotation-payments/:id/pdf
// @access  Private
export const generatePaymentReceiptPDFEndpoint = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await QuotationPayment.findById(id)
      .populate('quotationId', 'quotationNumber grandTotal')
      .populate('customerId', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    const pdfBuffer = await generateQuotationPaymentReceiptPDF(payment as any);

    // Set headers for PDF download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quotation-payment-receipt-${payment._id}.pdf"`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    next(error);
  }
};

// Helper function to validate payment method details
const validatePaymentMethodDetails = (paymentMethod: string, details: IPaymentMethodDetails): string | null => {
  switch (paymentMethod) {
    case 'cash':
      // Cash is simple, no required validation
      return null;

    case 'cheque':
      if (!details.cheque?.chequeNumber || !details.cheque?.bankName || !details.cheque?.issueDate) {
        return 'Cheque payment requires cheque number, bank name, and issue date';
      }
      return null;

    case 'bank_transfer':
      if (!details.bankTransfer?.bankName || !details.bankTransfer?.accountNumber || 
          !details.bankTransfer?.ifscCode || !details.bankTransfer?.transactionId || 
          !details.bankTransfer?.transferDate) {
        return 'Bank transfer requires bank name, account number, IFSC code, transaction ID, and transfer date';
      }
      return null;

    case 'upi':
      if (!details.upi?.upiId || !details.upi?.transactionId) {
        return 'UPI payment requires UPI ID and transaction ID';
      }
      return null;

    case 'card':
      if (!details.card?.cardType || !details.card?.cardNetwork || 
          !details.card?.lastFourDigits || !details.card?.transactionId) {
        return 'Card payment requires card type, network, last 4 digits, and transaction ID';
      }
      return null;

    case 'other':
      if (!details.other?.methodName) {
        return 'Other payment method requires method name';
      }
      return null;

    default:
      return 'Invalid payment method';
  }
};

// Helper function to update quotation payment status
const updateQuotationPaymentStatus = async (quotationId: string, amount: number): Promise<void> => {
  try {
    // Get all payments for this quotation
    const payments = await QuotationPayment.find({ quotationId });
    const totalPaidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Get quotation details
    const quotation = await Quotation.findById(quotationId);
    if (!quotation) return;

    const totalAmount = quotation.grandTotal || 0;
    const remainingAmount = Math.max(0, totalAmount - totalPaidAmount);

    // Determine payment status
    let paymentStatus: 'pending' | 'partial' | 'paid' | 'gst_pending';
    if (totalPaidAmount === 0) {
      paymentStatus = 'pending';
    } else if (totalPaidAmount >= totalAmount) {
      paymentStatus = 'paid';
    } else {
      paymentStatus = 'partial';
    }

    // Update quotation with new payment totals
    await Quotation.findByIdAndUpdate(quotationId, {
      paidAmount: totalPaidAmount,
      remainingAmount: remainingAmount,
      paymentStatus: paymentStatus
    });
  } catch (error) {
    console.error('Error updating quotation payment status:', error);
  }
};
