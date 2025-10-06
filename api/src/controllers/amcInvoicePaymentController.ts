import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../errors/AppError';
import { AMCInvoice } from '../models/AMCInvoice';
import { AMCInvoicePayment, IAMCInvoicePayment } from '../models/AMCInvoicePayment';
import { Customer } from '../models/Customer';
import { generateAMCInvoicePaymentReceiptPDF } from '../utils/paymentReceiptPdf';

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

// @desc    Create a new payment for an AMC invoice
// @route   POST /api/v1/amc-invoice-payments/:invoiceId/payments
// @access  Private
export const createAMCInvoicePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const paymentData = req.body;

    console.log("paymentData", paymentData);
    
    
    // Verify invoice exists
    const invoice = await AMCInvoice.findById(invoiceId);
    if (!invoice) {
      return next(new AppError('AMC invoice not found', 404));
    }
    console.log("invoice123", invoice);

    // Validate payment amount
    const paymentAmount = Number(paymentData.amount);
    if (paymentAmount <= 0) {
      return next(new AppError('Payment amount must be greater than 0', 400));
    }

    // Check if payment amount exceeds remaining amount
    if (paymentAmount > invoice.remainingAmount) {
      return next(new AppError('Payment amount cannot exceed remaining amount', 400));
    }

    // Create payment record
    const payment = new AMCInvoicePayment({
      amcInvoiceId: invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customer,
      amount: paymentAmount,
      currency: paymentData.currency || 'INR',
      paymentMethod: paymentData.paymentMethod,
      paymentMethodDetails: paymentData.paymentMethodDetails || {},
      paymentStatus: paymentData.paymentStatus || 'completed',
      paymentDate: paymentData.paymentDate ? new Date(paymentData.paymentDate) : new Date(),
      notes: paymentData.notes,
      receiptNumber: paymentData.receiptNumber,
      createdBy: req.user!.id
    });

    await payment.save();

    // Update invoice payment status
    const totalPaidAmount = await AMCInvoicePayment.aggregate([
      { $match: { amcInvoiceId: invoice._id, paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const newPaidAmount = totalPaidAmount.length > 0 ? totalPaidAmount[0].total : 0;
    const newRemainingAmount = invoice.grandTotal - newPaidAmount;
    
    let newPaymentStatus = 'pending';
    if (newPaidAmount >= invoice.grandTotal) {
      newPaymentStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newPaymentStatus = 'partial';
    }

    await AMCInvoice.findByIdAndUpdate(invoiceId, {
      paidAmount: newPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: newPaymentStatus
    });

    // Populate and return
    const populatedPayment = await AMCInvoicePayment.findById(payment._id)
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: { payment: populatedPayment }
    });
  } catch (error) {
    console.error('Error creating AMC invoice payment:', error);
    next(new AppError('Failed to record payment', 500));
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
    const invoice = await AMCInvoice.findById(invoiceId);
    if (invoice) {
      const totalPaidAmount = await AMCInvoicePayment.aggregate([
        { $match: { amcInvoiceId: invoice._id, paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const newPaidAmount = totalPaidAmount.length > 0 ? totalPaidAmount[0].total : 0;
      const newRemainingAmount = invoice.grandTotal - newPaidAmount;
      
      let newPaymentStatus = 'pending';
      if (newPaidAmount >= invoice.grandTotal) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'partial';
      }

      await AMCInvoice.findByIdAndUpdate(invoiceId, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus
      });
    }

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
    const invoice = await AMCInvoice.findById(invoiceId);
    if (invoice) {
      const totalPaidAmount = await AMCInvoicePayment.aggregate([
        { $match: { amcInvoiceId: invoice._id, paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const newPaidAmount = totalPaidAmount.length > 0 ? totalPaidAmount[0].total : 0;
      const newRemainingAmount = invoice.grandTotal - newPaidAmount;
      
      let newPaymentStatus = 'pending';
      if (newPaidAmount >= invoice.grandTotal) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'partial';
      }

      await AMCInvoice.findByIdAndUpdate(invoiceId, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus
      });
    }

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
    const invoice = await AMCInvoice.findById(payment.amcInvoiceId);
    if (invoice) {
      const totalPaidAmount = await AMCInvoicePayment.aggregate([
        { $match: { amcInvoiceId: invoice._id, paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const newPaidAmount = totalPaidAmount.length > 0 ? totalPaidAmount[0].total : 0;
      const newRemainingAmount = invoice.grandTotal - newPaidAmount;
      
      let newPaymentStatus = 'pending';
      if (newPaidAmount >= invoice.grandTotal) {
        newPaymentStatus = 'paid';
      } else if (newPaidAmount > 0) {
        newPaymentStatus = 'partial';
      }

      await AMCInvoice.findByIdAndUpdate(payment.amcInvoiceId, {
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus
      });
    }

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
