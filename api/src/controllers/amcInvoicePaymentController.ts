import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../errors/AppError';
import { AMCInvoice } from '../models/AMCInvoice';
import { AMCInvoicePayment, IAMCInvoicePayment } from '../models/AMCInvoicePayment';
import { Customer } from '../models/Customer';
import { generateAMCInvoicePaymentReceiptPDF } from '../utils/paymentReceiptPdf';
import mongoose from 'mongoose';

// Helper function to validate payment method details
const validatePaymentMethodDetails = (paymentMethod: string, details: any): string | null => {
  if (!details) {
    return 'Payment method details are required';
  }

  switch (paymentMethod) {
    case 'cash':
      // Received by field is optional for cash payments
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

// Helper function to recalculate AMC invoice payment totals (similar to regular quotations)
const recalculateAMCInvoicePayments = async (amcInvoiceId: string): Promise<void> => {
  try {
    // Get all payments for this AMC invoice
    const payments = await AMCInvoicePayment.find({ amcInvoiceId });
    const totalPaidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

    // Get AMC invoice details
    const amcInvoice = await AMCInvoice.findById(amcInvoiceId);
    if (!amcInvoice) return;

    const totalAmount = amcInvoice.grandTotal || 0;
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

    // Update AMC invoice with new payment totals
    await AMCInvoice.findByIdAndUpdate(amcInvoiceId, {
      paidAmount: totalPaidAmount,
      remainingAmount: remainingAmount,
      paymentStatus: paymentStatus
    });
  } catch (error) {
    console.error('Error updating AMC invoice payment status:', error);
  }
};

// @desc    Get all payments for a specific AMC invoice
// @route   GET /api/v1/amc-invoice-payments/:invoiceId/payments
// @access  Private
export const getAMCInvoicePayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    // Verify invoice exists
    const invoice = await AMCInvoice.findById(invoiceId);
    if (!invoice) {
      return next(new AppError('AMC invoice not found', 404));
    }

    // Get all payments for this invoice
    const payments = await AMCInvoicePayment.find({ amcInvoiceId: invoiceId })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { payments }
    });
  } catch (error) {
    console.error('Error fetching AMC invoice payments:', error);
    next(new AppError('Failed to fetch payments', 500));
  }
};

// @desc    Create a new AMC invoice payment with detailed method info
// @route   POST /api/v1/amc-invoice-payments
// @access  Private
export const createAMCInvoicePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      amcInvoiceId,
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
    if (!amcInvoiceId || !invoiceNumber || !customerId || !amount || !paymentMethod) {
      return next(new AppError('Missing required fields', 400));
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return next(new AppError('Invalid customer ID format', 400));
    }

    if (!mongoose.Types.ObjectId.isValid(amcInvoiceId)) {
      return next(new AppError('Invalid AMC invoice ID format', 400));
    }

    if (amount <= 0) {
      return next(new AppError('Payment amount must be greater than 0', 400));
    }

    // Validate payment method details based on payment method
    const validationError = validatePaymentMethodDetails(paymentMethod, paymentMethodDetails);
    if (validationError) {
      return next(new AppError(validationError, 400));
    }

    // Check if AMC invoice exists
    const amcInvoice = await AMCInvoice.findById(amcInvoiceId);
    if (!amcInvoice) {
      return next(new AppError('AMC Invoice not found', 404));
    }

    // Debug customer lookup
    console.log('=== Customer Lookup Debug ===');
    console.log('Request Customer ID:', customerId);
    console.log('Invoice Customer ID:', amcInvoice.customer);
    console.log('Customer ID type:', typeof customerId);
    console.log('Customer ID length:', customerId?.length);
    console.log('Customer ID valid format:', /^[0-9a-fA-F]{24}$/.test(customerId));
    console.log('============================');

    // Check if customer exists - try direct lookup first, then fallback to invoice customer
    let customer = await Customer.findById(customerId);
    console.log('Direct customer lookup result:', customer ? 'Found' : 'Not found');
    
    // If customer not found with provided ID, try using invoice's customer
    if (!customer && amcInvoice.customer) {
      console.log('Customer not found with provided ID, trying invoice customer...');
      customer = await Customer.findById(amcInvoice.customer);
      console.log('Invoice customer lookup result:', customer ? 'Found' : 'Not found');
    }

    if (!customer) {
      console.error('Customer not found with ID:', customerId);
      return next(new AppError(`Customer not found with ID: ${customerId}`, 404));
    }

    console.log('Customer found:', customer.name, customer.addresses?.[0]?.email || 'No email');

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
    console.log('=== AMC Invoice Payment Method Details Debug ===');
    console.log('Payment Method:', paymentMethod);
    console.log('Backend Key:', backendKey);
    console.log('Payment Method Details:', JSON.stringify(paymentMethodDetails, null, 2));
    console.log('Method Details:', JSON.stringify(methodDetails, null, 2));
    console.log('==============================================');
    
    const structuredPaymentMethodDetails = {
      [backendKey]: methodDetails
    };

    // Create the payment record
    const payment = new AMCInvoicePayment({
      amcInvoiceId,
      invoiceNumber,
      customerId: customer._id, // Use the found customer's ID
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

    // Update AMC invoice payment status using the same pattern as regular quotations
    await recalculateAMCInvoicePayments(amcInvoiceId);

    // Populate the response
    const populatedPayment = await AMCInvoicePayment.findById(payment._id)
      .populate('amcInvoiceId', 'invoiceNumber customer grandTotal')
      .populate('customerId', 'name email phone')
      .populate('createdBy', 'firstName lastName email');

    const response: APIResponse = {
      success: true,
      message: 'AMC Invoice payment created successfully',
      data: populatedPayment
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating AMC invoice payment:', error);
    next(new AppError('Failed to create AMC invoice payment', 500));
  }
};

// @desc    Update an existing payment
// @route   PUT /api/v1/amc-invoice-payments/:invoiceId/payments/:paymentId
// @access  Private
export const updateAMCInvoicePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId, paymentId } = req.params;
    const updateData = req.body;

    // Verify payment exists
    const payment = await AMCInvoicePayment.findOne({ 
      _id: paymentId, 
      amcInvoiceId: invoiceId 
    });

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Update payment
    const updatedPayment = await AMCInvoicePayment.findByIdAndUpdate(
      paymentId,
      {
        ...updateData,
        amount: Number(updateData.amount) || payment.amount,
        paymentDate: updateData.paymentDate ? new Date(updateData.paymentDate) : payment.paymentDate
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    // Recalculate invoice payment status
    await recalculateAMCInvoicePayments(invoiceId);

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: { payment: updatedPayment }
    });
  } catch (error) {
    console.error('Error updating AMC invoice payment:', error);
    next(new AppError('Failed to update payment', 500));
  }
};

// @desc    Delete a payment
// @route   DELETE /api/v1/amc-invoice-payments/:invoiceId/payments/:paymentId
// @access  Private
export const deleteAMCInvoicePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId, paymentId } = req.params;

    // Verify payment exists
    const payment = await AMCInvoicePayment.findOne({ 
      _id: paymentId, 
      amcInvoiceId: invoiceId 
    });

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Delete payment
    await AMCInvoicePayment.findByIdAndDelete(paymentId);

    // Recalculate invoice payment status
    await recalculateAMCInvoicePayments(invoiceId);

    res.status(200).json({
      success: true,
      message: 'Payment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting AMC invoice payment:', error);
    next(new AppError('Failed to delete payment', 500));
  }
};

// @desc    Get payment summary for an AMC invoice
// @route   GET /api/v1/amc-invoice-payments/:invoiceId/payment-summary
// @access  Private
export const getAMCInvoicePaymentSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    // Verify invoice exists
    const invoice = await AMCInvoice.findById(invoiceId);
    if (!invoice) {
      return next(new AppError('AMC invoice not found', 404));
    }

    // Get payment summary
    const paymentSummary = await AMCInvoicePayment.aggregate([
      { $match: { amcInvoiceId: invoice._id } },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Get total payments
    const totalPayments = await AMCInvoicePayment.aggregate([
      { $match: { amcInvoiceId: invoice._id, paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalPaid = totalPayments.length > 0 ? totalPayments[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        invoice: {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          grandTotal: invoice.grandTotal,
          paidAmount: invoice.paidAmount,
          remainingAmount: invoice.remainingAmount,
          paymentStatus: invoice.paymentStatus
        },
        paymentSummary,
        totalPaid,
        totalOutstanding: invoice.grandTotal - totalPaid
      }
    });
  } catch (error) {
    console.error('Error fetching AMC invoice payment summary:', error);
    next(new AppError('Failed to fetch payment summary', 500));
  }
};

// @desc    Get all AMC invoice payments with optional filtering
// @route   GET /api/v1/amc-invoice-payments
// @access  Private
export const getAllAMCInvoicePayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      paymentMethod, 
      startDate, 
      endDate,
      customerId,
      invoiceId 
    } = req.query;

    const query: any = {};

    // Apply filters
    if (status) query.paymentStatus = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (customerId) query.customerId = customerId;
    if (invoiceId) query.amcInvoiceId = invoiceId;

    // Date range filter
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate as string);
      if (endDate) query.paymentDate.$lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const payments = await AMCInvoicePayment.find(query)
      .populate('customerId', 'firstName lastName email phone')
      .populate('amcInvoiceId', 'invoiceNumber grandTotal')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await AMCInvoicePayment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        payments,
        pagination: {
          current: Number(page),
          pages: Math.ceil(total / Number(limit)),
          total
        }
      }
    });
  } catch (error) {
    console.error('Error fetching AMC invoice payments:', error);
    next(new AppError('Failed to fetch payments', 500));
  }
};

// @desc    Get AMC invoice payment by ID
// @route   GET /api/v1/amc-invoice-payments/:id
// @access  Private
export const getAMCInvoicePaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await AMCInvoicePayment.findById(id)
      .populate('customerId', 'firstName lastName email phone address')
      .populate('amcInvoiceId', 'invoiceNumber grandTotal paidAmount remainingAmount')
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    res.status(200).json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    console.error('Error fetching AMC invoice payment:', error);
    next(new AppError('Failed to fetch payment', 500));
  }
};

// @desc    Get payments for a specific AMC invoice
// @route   GET /api/v1/amc-invoice-payments/invoice/:invoiceId
// @access  Private
export const getAMCInvoicePaymentsByInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId } = req.params;

    // Verify invoice exists
    const invoice = await AMCInvoice.findById(invoiceId);
    if (!invoice) {
      return next(new AppError('AMC invoice not found', 404));
    }

    const payments = await AMCInvoicePayment.find({ amcInvoiceId: invoiceId })
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { 
        invoice: {
          _id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          grandTotal: invoice.grandTotal,
          paidAmount: invoice.paidAmount,
          remainingAmount: invoice.remainingAmount,
          paymentStatus: invoice.paymentStatus
        },
        payments 
      }
    });
  } catch (error) {
    console.error('Error fetching AMC invoice payments by invoice:', error);
    next(new AppError('Failed to fetch payments', 500));
  }
};

// @desc    Update AMC invoice payment status
// @route   PUT /api/v1/amc-invoice-payments/:id/status
// @access  Private
export const updateAMCInvoicePaymentStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { paymentStatus, notes } = req.body;

    const payment = await AMCInvoicePayment.findById(id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Update payment status
    const updatedPayment = await AMCInvoicePayment.findByIdAndUpdate(
      id,
      { 
        paymentStatus,
        notes: notes || payment.notes,
        updatedBy: req.user!.id
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');

    // Recalculate invoice payment totals
    await recalculateAMCInvoicePayments(payment.amcInvoiceId.toString());

    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      data: { payment: updatedPayment }
    });
  } catch (error) {
    console.error('Error updating AMC invoice payment status:', error);
    next(new AppError('Failed to update payment status', 500));
  }
};

// @desc    Generate payment receipt PDF for AMC invoice payment
// @route   GET /api/v1/amc-invoice-payments/:id/receipt
// @access  Private
export const generateAMCInvoicePaymentReceipt = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await AMCInvoicePayment.findById(id)
      .populate('customerId', 'firstName lastName email phone address')
      .populate('amcInvoiceId', 'invoiceNumber grandTotal')
      .populate('createdBy', 'firstName lastName email');

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Generate PDF receipt
    const pdfBuffer = await generateAMCInvoicePaymentReceiptPDF(payment as any);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="AMC-Invoice-Payment-Receipt-${payment.receiptNumber || payment._id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating AMC invoice payment receipt:', error);
    next(new AppError('Failed to generate receipt', 500));
  }
};
