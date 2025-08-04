import { Response, NextFunction } from 'express';
import { DGInvoice } from '../models/DGInvoice';
import { DGPurchaseOrder } from '../models/DGPurchaseOrder';
import { ProformaInvoice } from '../models/ProformaInvoice';
import { Customer } from '../models/Customer';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { TransactionCounter } from '../models/TransactionCounter';

// Generate next DG Invoice number
const generateDGInvoiceNumber = async () => {
  const counter = await TransactionCounter.findOneAndUpdate(
    { type: 'dgInvoice' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `DG-INV-${String(counter.sequence).padStart(4, '0')}`;
};

// @desc    Create new DG Invoice
// @route   POST /api/v1/dg-invoices
// @access  Private
export const createDGInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { customerId, dgPurchaseOrderId, proformaInvoiceId, ...invoiceData } = req.body;

    // Validate customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Generate invoice number
    const invoiceNumber = await generateDGInvoiceNumber();

    // Create DG invoice
    const dgInvoice = await DGInvoice.create({
      ...invoiceData,
      invoiceNumber,
      customer: customerId,
      dgPurchaseOrder: dgPurchaseOrderId,
      proformaInvoice: proformaInvoiceId,
      createdBy: req.user?.id
    });

    await dgInvoice.populate('customer dgPurchaseOrder proformaInvoice quotation createdBy');

    res.status(201).json({
      success: true,
      message: 'DG Invoice created successfully',
      data: dgInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all DG Invoices
// @route   GET /api/v1/dg-invoices
// @access  Private
export const getDGInvoices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, status, paymentStatus, deliveryStatus, customerId } = req.query;
    
    const filter: any = {};
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (deliveryStatus) filter.deliveryStatus = deliveryStatus;
    if (customerId) filter.customer = customerId;

    const total = await DGInvoice.countDocuments(filter);
    const dgInvoices = await DGInvoice.find(filter)
      .populate('customer', 'name email phone')
      .populate('dgPurchaseOrder', 'poNumber totalAmount')
      .populate('proformaInvoice', 'invoiceNumber totalAmount')
      .populate('quotation', 'quotationNumber grandTotal')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: dgInvoices,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single DG Invoice
// @route   GET /api/v1/dg-invoices/:id
// @access  Private
export const getDGInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dgInvoice = await DGInvoice.findById(req.params.id)
      .populate('customer')
      .populate('dgPurchaseOrder')
      .populate('proformaInvoice')
      .populate('quotation')
      .populate('createdBy', 'firstName lastName');

    if (!dgInvoice) {
      return next(new AppError('DG Invoice not found', 404));
    }

    res.json({
      success: true,
      data: dgInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update DG Invoice
// @route   PUT /api/v1/dg-invoices/:id
// @access  Private
export const updateDGInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dgInvoice = await DGInvoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('customer dgPurchaseOrder proformaInvoice quotation createdBy');

    if (!dgInvoice) {
      return next(new AppError('DG Invoice not found', 404));
    }

    res.json({
      success: true,
      message: 'DG Invoice updated successfully',
      data: dgInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update DG Invoice payment status
// @route   PATCH /api/v1/dg-invoices/:id/payment-status
// @access  Private
export const updatePaymentStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { paymentStatus, paidAmount } = req.body;
    
    const dgInvoice = await DGInvoice.findById(req.params.id);
    if (!dgInvoice) {
      return next(new AppError('DG Invoice not found', 404));
    }

    dgInvoice.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) {
      dgInvoice.paidAmount = paidAmount;
      dgInvoice.balanceAmount = dgInvoice.totalAmount - paidAmount;
    }

    await dgInvoice.save();
    await dgInvoice.populate('customer');

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: dgInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update DG Invoice delivery status
// @route   PATCH /api/v1/dg-invoices/:id/delivery-status
// @access  Private
export const updateDeliveryStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { deliveryStatus, installationDate, commissioningDate, warrantyStartDate } = req.body;
    
    const updateData: any = { deliveryStatus };
    if (installationDate) updateData.installationDate = installationDate;
    if (commissioningDate) updateData.commissioningDate = commissioningDate;
    if (warrantyStartDate) updateData.warrantyStartDate = warrantyStartDate;

    const dgInvoice = await DGInvoice.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('customer');

    if (!dgInvoice) {
      return next(new AppError('DG Invoice not found', 404));
    }

    res.json({
      success: true,
      message: 'Delivery status updated successfully',
      data: dgInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create DG Invoice from Purchase Order
// @route   POST /api/v1/dg-invoices/from-po/:poId
// @access  Private
export const createDGInvoiceFromPO = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dgPurchaseOrder = await DGPurchaseOrder.findById(req.params.poId)
      .populate('dgQuotation');

    if (!dgPurchaseOrder) {
      return next(new AppError('DG Purchase Order not found', 404));
    }

    const invoiceNumber = await generateDGInvoiceNumber();

    // Convert PO items to invoice items
    const items = dgPurchaseOrder.items.map(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const taxAmount = (itemSubtotal * item.taxRate) / 100;
      
      return {
        description: item.description,
        specifications: item.description, // Use description as specifications
        kva: '', // Not available in new model
        phase: '', // Not available in new model
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        taxAmount: taxAmount,
        totalPrice: item.totalPrice,
        serialNumbers: []
      };
    });

    const totalTax = dgPurchaseOrder.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + (itemSubtotal * item.taxRate) / 100;
    }, 0);

    const dgInvoice = await DGInvoice.create({
      invoiceNumber,
      customer: dgPurchaseOrder.customer,
      dgPurchaseOrder: dgPurchaseOrder._id,
      quotation: dgPurchaseOrder.dgQuotation,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      items,
      subtotal: dgPurchaseOrder.totalAmount - totalTax,
      totalTax: totalTax,
      totalDiscount: 0,
      totalAmount: dgPurchaseOrder.totalAmount,
      paidAmount: 0, // No advance amount in new model
      balanceAmount: dgPurchaseOrder.totalAmount,
      customerAddress: {
        address: dgPurchaseOrder.customer.address || '',
        state: dgPurchaseOrder.customer.district || '',
        district: dgPurchaseOrder.customer.district || '',
        pincode: dgPurchaseOrder.customer.pinCode || ''
      },
      terms: dgPurchaseOrder.terms || '',
      notes: dgPurchaseOrder.notes || '',
      status: 'draft',
      paymentStatus: 'pending',
      deliveryStatus: 'pending',
      warrantyPeriod: 12,
      createdBy: req.user?.id,
      ...req.body
    });

    await dgInvoice.populate('customer dgPurchaseOrder quotation');

    res.status(201).json({
      success: true,
      message: 'DG Invoice created from Purchase Order successfully',
      data: dgInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete DG Invoice
// @route   DELETE /api/v1/dg-invoices/:id
// @access  Private
export const deleteDGInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dgInvoice = await DGInvoice.findByIdAndDelete(req.params.id);

    if (!dgInvoice) {
      return next(new AppError('DG Invoice not found', 404));
    }

    res.json({
      success: true,
      message: 'DG Invoice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
}; 