import { Response, NextFunction } from 'express';
import { ProformaInvoice } from '../models/ProformaInvoice';
import { DGPurchaseOrder } from '../models/DGPurchaseOrder';
import { Customer } from '../models/Customer';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { TransactionCounter } from '../models/TransactionCounter';

// Generate next Proforma Invoice number
const generateProformaNumber = async () => {
  const counter = await TransactionCounter.findOneAndUpdate(
    { type: 'proformaInvoice' },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `PI-${String(counter.sequence).padStart(4, '0')}`;
};

// @desc    Create new Proforma Invoice
// @route   POST /api/v1/proforma-invoices
// @access  Private
export const createProformaInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { customerId, dgPurchaseOrderId, quotationId, ...invoiceData } = req.body;

    // Validate customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }

    // Validate PO if provided
    let dgPurchaseOrder = null;
    if (dgPurchaseOrderId) {
      dgPurchaseOrder = await DGPurchaseOrder.findById(dgPurchaseOrderId);
      if (!dgPurchaseOrder) {
        return next(new AppError('DG Purchase Order not found', 404));
      }
    }

    // Generate invoice number
    const invoiceNumber = await generateProformaNumber();

    // Create proforma invoice
    const proformaInvoice = await ProformaInvoice.create({
      ...invoiceData,
      invoiceNumber,
      customer: customerId,
      dgPurchaseOrder: dgPurchaseOrderId,
      quotation: quotationId,
      createdBy: req.user?.id
    });

    await proformaInvoice.populate('customer dgPurchaseOrder quotation createdBy');

    res.status(201).json({
      success: true,
      message: 'Proforma Invoice created successfully',
      data: proformaInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all Proforma Invoices
// @route   GET /api/v1/proforma-invoices
// @access  Private
export const getProformaInvoices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, status, customerId, purpose } = req.query;
    
    const filter: any = {};
    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (customerId) filter.customer = customerId;
    if (purpose) filter.purpose = purpose;

    const total = await ProformaInvoice.countDocuments(filter);
    const proformaInvoices = await ProformaInvoice.find(filter)
      .populate('customer', 'name email phone')
      .populate('dgPurchaseOrder', 'poNumber totalAmount')
      .populate('quotation', 'quotationNumber grandTotal')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({
      success: true,
      data: proformaInvoices,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single Proforma Invoice
// @route   GET /api/v1/proforma-invoices/:id
// @access  Private
export const getProformaInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const proformaInvoice = await ProformaInvoice.findById(req.params.id)
      .populate('customer')
      .populate('dgPurchaseOrder')
      .populate('quotation')
      .populate('createdBy', 'firstName lastName');

    if (!proformaInvoice) {
      return next(new AppError('Proforma Invoice not found', 404));
    }

    res.json({
      success: true,
      data: proformaInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Proforma Invoice
// @route   PUT /api/v1/proforma-invoices/:id
// @access  Private
export const updateProformaInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const proformaInvoice = await ProformaInvoice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('customer dgPurchaseOrder quotation createdBy');

    if (!proformaInvoice) {
      return next(new AppError('Proforma Invoice not found', 404));
    }

    res.json({
      success: true,
      message: 'Proforma Invoice updated successfully',
      data: proformaInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Proforma Invoice status
// @route   PATCH /api/v1/proforma-invoices/:id/status
// @access  Private
export const updateProformaInvoiceStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status } = req.body;
    
    const proformaInvoice = await ProformaInvoice.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('customer');

    if (!proformaInvoice) {
      return next(new AppError('Proforma Invoice not found', 404));
    }

    res.json({
      success: true,
      message: 'Proforma Invoice status updated successfully',
      data: proformaInvoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Proforma Invoice
// @route   DELETE /api/v1/proforma-invoices/:id
// @access  Private
export const deleteProformaInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const proformaInvoice = await ProformaInvoice.findByIdAndDelete(req.params.id);

    if (!proformaInvoice) {
      return next(new AppError('Proforma Invoice not found', 404));
    }

    res.json({
      success: true,
      message: 'Proforma Invoice deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Proforma Invoice from Purchase Order
// @route   POST /api/v1/proforma-invoices/from-po/:poId
// @access  Private
export const createProformaFromPO = async (
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

    const invoiceNumber = await generateProformaNumber();

    // Convert PO items to proforma items
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
        totalPrice: item.totalPrice
      };
    });

    const totalTax = dgPurchaseOrder.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + (itemSubtotal * item.taxRate) / 100;
    }, 0);

    const proformaInvoice = await ProformaInvoice.create({
      invoiceNumber,
      customer: dgPurchaseOrder.customer,
      dgPurchaseOrder: dgPurchaseOrder._id,
      quotation: dgPurchaseOrder.dgQuotation,
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      items,
      subtotal: dgPurchaseOrder.totalAmount - totalTax,
      totalTax: totalTax,
      totalAmount: dgPurchaseOrder.totalAmount,
      advanceAmount: 0, // No advance amount in new model
      balanceAmount: dgPurchaseOrder.totalAmount,
      customerAddress: {
        address: dgPurchaseOrder.customer.address || '',
        state: dgPurchaseOrder.customer.district || '',
        district: dgPurchaseOrder.customer.district || '',
        pincode: dgPurchaseOrder.customer.pinCode || ''
      },
      terms: dgPurchaseOrder.terms || '',
      notes: dgPurchaseOrder.notes || '',
      purpose: 'loan',
      status: 'draft',
      createdBy: req.user?.id,
      ...req.body
    });

    await proformaInvoice.populate('customer dgPurchaseOrder quotation');

    res.status(201).json({
      success: true,
      message: 'Proforma Invoice created from Purchase Order successfully',
      data: proformaInvoice
    });
  } catch (error) {
    next(error);
  }
}; 