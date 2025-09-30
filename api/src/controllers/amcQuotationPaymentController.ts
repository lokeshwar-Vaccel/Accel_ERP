import { Response, NextFunction } from 'express';
import { AMCQuotationPayment, IPaymentMethodDetails } from '../models/AMCQuotationPayment';
import { AMCQuotation } from '../models/AMCQuotation';
import { Customer } from '../models/Customer';
import { User } from '../models/User';
import { AppError } from '../errors/AppError';
import { AuthenticatedRequest, APIResponse } from '../types';
import { generateAMCQuotationPaymentReceiptPDF } from '../utils/paymentReceiptPdf';

// Helper function to recalculate AMC quotation payment totals (similar to regular quotations)
const recalculateAMCQuotationPayments = async (amcQuotationId: string): Promise<void> => {
  try {
    // Get all payments for this AMC quotation
    const payments = await AMCQuotationPayment.find({ amcQuotationId });
    const totalPaidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Get AMC quotation details
    const amcQuotation = await AMCQuotation.findById(amcQuotationId);
    if (!amcQuotation) return;

    const totalAmount = amcQuotation.grandTotal || 0;
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

    // Update AMC quotation with new payment totals
    await AMCQuotation.findByIdAndUpdate(amcQuotationId, {
      paidAmount: totalPaidAmount,
      remainingAmount: remainingAmount,
      paymentStatus: paymentStatus
    });
  } catch (error) {
    console.error('Error updating AMC quotation payment status:', error);
  }
};

// @desc    Create a new AMC quotation payment with detailed method info
// @route   POST /api/v1/amc-quotation-payments
// @access  Private
export const createAMCQuotationPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      amcQuotationId,
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
    if (!amcQuotationId || !quotationNumber || !customerId || !amount || !paymentMethod) {
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

    // Check if AMC quotation exists
    const amcQuotation = await AMCQuotation.findById(amcQuotationId);
    if (!amcQuotation) {
      return next(new AppError('AMC Quotation not found', 404));
    }

    // Check if customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
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
    console.log('=== AMC Quotation Payment Method Details Debug ===');
    console.log('Payment Method:', paymentMethod);
    console.log('Backend Key:', backendKey);
    console.log('Payment Method Details:', JSON.stringify(paymentMethodDetails, null, 2));
    console.log('Method Details:', JSON.stringify(methodDetails, null, 2));
    console.log('==============================================');
    
    const structuredPaymentMethodDetails = {
      [backendKey]: methodDetails
    };

    // Create the payment record
    const payment = new AMCQuotationPayment({
      amcQuotationId,
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
      paymentStatus: 'completed' // Set to completed like regular quotations
    });

    await payment.save();

    // Update AMC quotation payment status using the same pattern as regular quotations
    await recalculateAMCQuotationPayments(amcQuotationId);

    // Populate the response
    const populatedPayment = await AMCQuotationPayment.findById(payment._id)
      .populate('amcQuotationId', 'quotationNumber customer grandTotal')
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'AMC Quotation payment created successfully',
      data: populatedPayment
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating AMC quotation payment:', error);
    next(new AppError('Failed to create AMC quotation payment', 500));
  }
};

// @desc    Get all AMC quotation payments with optional filtering
// @route   GET /api/v1/amc-quotation-payments
// @access  Private
export const getAMCQuotationPayments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      amcQuotationId,
      customerId,
      paymentMethod,
      paymentStatus,
      startDate,
      endDate,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    const filter: any = {};

    if (amcQuotationId) {
      filter.amcQuotationId = amcQuotationId;
    }

    if (customerId) {
      filter.customerId = customerId;
    }

    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) {
        filter.paymentDate.$gte = new Date(startDate as string);
      }
      if (endDate) {
        filter.paymentDate.$lte = new Date(endDate as string);
      }
    }

    // Calculate pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Get payments with pagination
    const payments = await AMCQuotationPayment.find(filter)
      .populate('amcQuotationId', 'quotationNumber customer grandTotal')
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Get total count for pagination
    const totalCount = await AMCQuotationPayment.countDocuments(filter);

    const response: APIResponse = {
      success: true,
      message: 'AMC Quotation payments retrieved successfully',
      data: {
        payments,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(totalCount / Number(limit)),
          totalCount,
          hasNextPage: Number(page) < Math.ceil(totalCount / Number(limit)),
          hasPrevPage: Number(page) > 1
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching AMC quotation payments:', error);
    next(new AppError('Failed to fetch AMC quotation payments', 500));
  }
};

// @desc    Get AMC quotation payment by ID
// @route   GET /api/v1/amc-quotation-payments/:id
// @access  Private
export const getAMCQuotationPaymentById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await AMCQuotationPayment.findById(id)
      .populate('amcQuotationId', 'quotationNumber customer grandTotal')
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('AMC Quotation payment not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'AMC Quotation payment retrieved successfully',
      data: payment
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching AMC quotation payment:', error);
    next(new AppError('Failed to fetch AMC quotation payment', 500));
  }
};

// @desc    Get payments for a specific AMC quotation
// @route   GET /api/v1/amc-quotation-payments/quotation/:quotationId
// @access  Private
export const getAMCQuotationPaymentsByQuotation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quotationId } = req.params;

    const payments = await AMCQuotationPayment.find({ amcQuotationId: quotationId })
      .populate('amcQuotationId', 'quotationNumber customer grandTotal')
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    const response: APIResponse = {
      success: true,
      message: 'AMC Quotation payments retrieved successfully',
      data: payments
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching AMC quotation payments:', error);
    next(new AppError('Failed to fetch AMC quotation payments', 500));
  }
};

// @desc    Update AMC quotation payment status
// @route   PUT /api/v1/amc-quotation-payments/:id/status
// @access  Private
export const updateAMCQuotationPaymentStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus, notes } = req.body;

    if (!paymentStatus) {
      return next(new AppError('Payment status is required', 400));
    }

    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      return next(new AppError('Invalid payment status', 400));
    }

    const payment = await AMCQuotationPayment.findByIdAndUpdate(
      id,
      { 
        paymentStatus,
        notes: notes || undefined
      },
      { new: true }
    ).populate('amcQuotationId', 'quotationNumber customer grandTotal')
     .populate('customerId', 'name email phone')
     .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('AMC Quotation payment not found', 404));
    }

    // If payment status is completed, update AMC quotation payment totals
    if (paymentStatus === 'completed') {
      await recalculateAMCQuotationPayments(payment.amcQuotationId.toString());
    }

    const response: APIResponse = {
      success: true,
      message: 'AMC Quotation payment status updated successfully',
      data: payment
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error updating AMC quotation payment status:', error);
    next(new AppError('Failed to update AMC quotation payment status', 500));
  }
};

// @desc    Delete AMC quotation payment
// @route   DELETE /api/v1/amc-quotation-payments/:id
// @access  Private
export const deleteAMCQuotationPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await AMCQuotationPayment.findById(id);
    if (!payment) {
      return next(new AppError('AMC Quotation payment not found', 404));
    }

    // Update AMC quotation payment status after deletion
    await recalculateAMCQuotationPayments(payment.amcQuotationId.toString());

    await AMCQuotationPayment.findByIdAndDelete(id);

    const response: APIResponse = {
      success: true,
      message: 'AMC Quotation payment deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error deleting AMC quotation payment:', error);
    next(new AppError('Failed to delete AMC quotation payment', 500));
  }
};

// @desc    Generate payment receipt PDF for AMC quotation payment
// @route   GET /api/v1/amc-quotation-payments/:id/receipt
// @access  Private
export const generateAMCQuotationPaymentReceipt = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await AMCQuotationPayment.findById(id)
      .populate({
        path: 'amcQuotationId',
        select: 'quotationNumber customer grandTotal company'
      })
      .populate('customerId', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('AMC Quotation payment not found', 404));
    }

    // Generate PDF receipt
    const pdfBuffer = await generateAMCQuotationPaymentReceiptPDF(payment as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="amc-quotation-payment-receipt-${payment.quotationNumber}-${payment._id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating AMC quotation payment receipt:', error);
    next(new AppError('Failed to generate payment receipt', 500));
  }
};

// Helper function to validate payment method details
const validatePaymentMethodDetails = (paymentMethod: string, details: any): string | null => {
  if (!details) {
    return 'Payment method details are required';
  }

  switch (paymentMethod) {
    case 'cash':
      if (!details.cash?.receivedBy) {
        return 'Received by field is required for cash payments';
      }
      break;

    case 'cheque':
      if (!details.cheque?.chequeNumber || !details.cheque?.bankName || !details.cheque?.issueDate) {
        return 'Cheque number, bank name, and issue date are required for cheque payments';
      }
      break;

    case 'bank_transfer':
    case 'bankTransfer':
      if (!details.bankTransfer?.transferDate) {
        return 'Transfer date is required for bank transfer payments';
      }
      break;

    case 'upi':
      // No required fields for UPI - transaction ID is optional
      break;

    case 'card':
      // No required fields for card - transaction ID is optional
      break;

    case 'other':
      if (!details.other?.methodName) {
        return 'Method name is required for other payment methods';
      }
      break;

    default:
      return 'Invalid payment method';
  }

  return null;
};
