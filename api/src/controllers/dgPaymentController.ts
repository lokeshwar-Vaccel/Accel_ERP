import { Response, NextFunction } from 'express';
import { DGPayment } from '../models/DGPayment';
import { DGInvoice } from '../models/DGInvoice';
import { Customer } from '../models/Customer';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { TransactionCounter } from '../models/TransactionCounter';

// Generate next Payment number
const generatePaymentNumber = async () => {
  const counter = await TransactionCounter.findOneAndUpdate(
    { type: 'dgPayment' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `DG-PAY-${String(counter.sequence).padStart(4, '0')}`;
};

// @desc    Create new DG Payment
// @route   POST /api/v1/dg-payments
// @access  Private
export const createDGPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { customerId, dgInvoiceId, amount, ...paymentData } = req.body;

    // Validate customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Validate DG Invoice
    const dgInvoice = await DGInvoice.findById(dgInvoiceId);
    if (!dgInvoice) {
      return next(new AppError('DG Invoice not found', 404));
    }

    // Check if payment amount is valid
    if (amount > dgInvoice.balanceAmount) {
      return next(new AppError('Payment amount exceeds balance amount', 400));
    }

    // Generate payment number
    const paymentNumber = await generatePaymentNumber();

    // Create payment
    const dgPayment = await DGPayment.create({
      ...paymentData,
      paymentNumber,
      customer: customerId,
      dgInvoice: dgInvoiceId,
      amount,
      receivedBy: req.user?.id,
      createdBy: req.user?.id
    });

    // Update invoice payment status and amounts
    const newPaidAmount = dgInvoice.paidAmount + amount;
    const newBalanceAmount = dgInvoice.totalAmount - newPaidAmount;
    
    let paymentStatus = 'partial';
    if (newBalanceAmount === 0) {
      paymentStatus = 'paid';
    } else if (newPaidAmount === 0) {
      paymentStatus = 'pending';
    }

    await DGInvoice.findByIdAndUpdate(dgInvoiceId, {
      paidAmount: newPaidAmount,
      balanceAmount: newBalanceAmount,
      paymentStatus
    });

    await dgPayment.populate('customer dgInvoice receivedBy verifiedBy createdBy');

    res.status(201).json({
      success: true,
      message: 'DG Payment created successfully',
      data: dgPayment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all DG Payments
// @route   GET /api/v1/dg-payments
// @access  Private
export const getDGPayments = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, status, paymentMethod, customerId, dgInvoiceId } = req.query;
    
    const filter: any = {};
    if (search) {
      filter.$or = [
        { paymentNumber: { $regex: search, $options: 'i' } },
        { paymentReference: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (customerId) filter.customer = customerId;
    if (dgInvoiceId) filter.dgInvoice = dgInvoiceId;

    const total = await DGPayment.countDocuments(filter);
    const dgPayments = await DGPayment.find(filter)
      .populate('customer', 'name email phone')
      .populate('dgInvoice', 'invoiceNumber totalAmount')
      .populate('receivedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: dgPayments,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single DG Payment
// @route   GET /api/v1/dg-payments/:id
// @access  Private
export const getDGPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dgPayment = await DGPayment.findById(req.params.id)
      .populate('customer')
      .populate('dgInvoice')
      .populate('receivedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    if (!dgPayment) {
      return next(new AppError('DG Payment not found', 404));
    }

    res.json({
      success: true,
      data: dgPayment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update DG Payment
// @route   PUT /api/v1/dg-payments/:id
// @access  Private
export const updateDGPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dgPayment = await DGPayment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('customer dgInvoice receivedBy verifiedBy createdBy');

    if (!dgPayment) {
      return next(new AppError('DG Payment not found', 404));
    }

    res.json({
      success: true,
      message: 'DG Payment updated successfully',
      data: dgPayment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify DG Payment
// @route   PATCH /api/v1/dg-payments/:id/verify
// @access  Private
export const verifyDGPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    
    const dgPayment = await DGPayment.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        verifiedBy: req.user?.id,
        verificationDate: new Date()
      },
      { new: true, runValidators: true }
    ).populate('customer dgInvoice');

    if (!dgPayment) {
      return next(new AppError('DG Payment not found', 404));
    }

    // If payment is being rejected/cancelled, update invoice amounts
    if (status === 'failed' || status === 'cancelled' || status === 'bounced') {
      const dgInvoice = await DGInvoice.findById(dgPayment.dgInvoice);
      if (dgInvoice) {
        const newPaidAmount = dgInvoice.paidAmount - dgPayment.amount;
        const newBalanceAmount = dgInvoice.totalAmount - newPaidAmount;
        
        let paymentStatus = 'partial';
        if (newBalanceAmount === dgInvoice.totalAmount) {
          paymentStatus = 'pending';
        } else if (newBalanceAmount === 0) {
          paymentStatus = 'paid';
        }

        await DGInvoice.findByIdAndUpdate(dgPayment.dgInvoice, {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          paymentStatus
        });
      }
    }

    res.json({
      success: true,
      message: 'DG Payment verification updated successfully',
      data: dgPayment
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete DG Payment
// @route   DELETE /api/v1/dg-payments/:id
// @access  Private
export const deleteDGPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dgPayment = await DGPayment.findById(req.params.id);
    
    if (!dgPayment) {
      return next(new AppError('DG Payment not found', 404));
    }

    // Update invoice amounts before deleting payment
    const dgInvoice = await DGInvoice.findById(dgPayment.dgInvoice);
    if (dgInvoice && dgPayment.status === 'completed') {
      const newPaidAmount = dgInvoice.paidAmount - dgPayment.amount;
      const newBalanceAmount = dgInvoice.totalAmount - newPaidAmount;
      
      let paymentStatus = 'partial';
      if (newBalanceAmount === dgInvoice.totalAmount) {
        paymentStatus = 'pending';
      } else if (newBalanceAmount === 0) {
        paymentStatus = 'paid';
      }

      await DGInvoice.findByIdAndUpdate(dgPayment.dgInvoice, {
        paidAmount: newPaidAmount,
        balanceAmount: newBalanceAmount,
        paymentStatus
      });
    }

    await DGPayment.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'DG Payment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get payment summary for an invoice
// @route   GET /api/v1/dg-payments/invoice/:invoiceId/summary
// @access  Private
export const getPaymentSummaryByInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const payments = await DGPayment.find({ dgInvoice: req.params.invoiceId })
      .populate('receivedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const summary = {
      totalPayments: payments.length,
      totalAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
      completedPayments: payments.filter(p => p.status === 'completed'),
      pendingPayments: payments.filter(p => p.status === 'pending'),
      failedPayments: payments.filter(p => ['failed', 'cancelled', 'bounced'].includes(p.status))
    };

    res.json({
      success: true,
      data: {
        payments,
        summary
      }
    });
  } catch (error) {
    next(error);
  }
}; 