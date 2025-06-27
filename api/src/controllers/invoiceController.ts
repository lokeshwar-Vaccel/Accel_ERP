import { Request, Response, NextFunction } from 'express';
import { Invoice, IInvoice } from '../models/Invoice';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Stock } from '../models/Stock';
import { StockLedger } from '../models/StockLedger';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateReferenceId } from '../utils/generateReferenceId';

// @desc    Get all invoices
// @route   GET /api/v1/invoices
// @access  Private
export const getInvoices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = '-createdAt', 
      search,
      status,
      paymentStatus,
      customer,
      dateFrom,
      dateTo
    } = req.query as QueryParams & {
      status?: string;
      paymentStatus?: string;
      customer?: string;
      dateFrom?: string;
      dateTo?: string;
    };

    // Build query
    const query: any = {};
    
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (customer) query.customer = customer;
    
    if (dateFrom || dateTo) {
      query.issueDate = {};
      if (dateFrom) query.issueDate.$gte = new Date(dateFrom);
      if (dateTo) query.issueDate.$lte = new Date(dateTo);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    const invoices = await Invoice.find(query)
      .populate('customer', 'name email phone address')
      .populate('location', 'name address')
      .populate('createdBy', 'firstName lastName')
      .populate('items.product', 'name category brand')
      .sort(sort as string)
      .skip(skip)
      .limit(Number(limit));

    const total = await Invoice.countDocuments(query);

    const response: APIResponse = {
      success: true,
      message: 'Invoices retrieved successfully',
      data: {
        invoices,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice
// @route   GET /api/v1/invoices/:id
// @access  Private
export const getInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer', 'name email phone address customerType')
      .populate('location', 'name address type')
      .populate('createdBy', 'firstName lastName email')
      .populate('items.product', 'name category brand modelNumber');

    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'Invoice retrieved successfully',
      data: { invoice }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new invoice
// @route   POST /api/v1/invoices
// @access  Private
export const createInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      customer, 
      items, 
      dueDate, 
      discountAmount = 0, 
      notes, 
      terms,
      invoiceType,
      referenceId,
      location,
      reduceStock = true
    } = req.body;

    // Generate invoice number
    const invoiceNumber = await generateReferenceId('invoice');

    // Validate and calculate items
    let calculatedItems = [];
    let subtotal = 0;
    let totalTax = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return next(new AppError(`Product not found: ${item.product}`, 404));
      }

      const itemTotal = item.quantity * item.unitPrice;
      const taxAmount = (item.taxRate || 0) * itemTotal / 100;

      calculatedItems.push({
        product: item.product,
        description: item.description || product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
        taxRate: item.taxRate || 0,
        taxAmount: taxAmount
      });

      subtotal += itemTotal;
      totalTax += taxAmount;
    }

    // Create invoice
    const invoice = new Invoice({
      invoiceNumber,
      customer,
      issueDate: new Date(),
      dueDate: new Date(dueDate),
      items: calculatedItems,
      subtotal,
      taxAmount: totalTax,
      discountAmount,
      totalAmount: subtotal + totalTax - discountAmount,
      notes,
      terms,
      invoiceType,
      referenceId,
      location,
      createdBy: req.user!.id
    });

    await invoice.save();

    // Reduce stock if requested
    if (reduceStock) {
      for (const item of calculatedItems) {
        const stock = await Stock.findOne({ 
          product: item.product, 
          location: location 
        });

        if (stock) {
          stock.quantity -= item.quantity;
          stock.availableQuantity = stock.quantity - stock.reservedQuantity;
          await stock.save();

          // Create stock ledger entry
          await StockLedger.create({
            product: item.product,
            location: location,
            transactionType: 'outward',
            quantity: -item.quantity,
            reason: `Invoice sale - ${invoiceNumber}`,
            notes: `Invoice created`,
            performedBy: req.user!.id,
            transactionDate: new Date(),
            resultingQuantity: stock.quantity,
            referenceId: invoiceNumber,
            referenceType: 'sale'
          });
        }
      }
    }

    const response: APIResponse = {
      success: true,
      message: 'Invoice created successfully',
      data: { invoice }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice
// @route   PUT /api/v1/invoices/:id
// @access  Private
export const updateInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, paymentStatus, paymentMethod, paymentDate, notes } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Update fields
    if (status) invoice.status = status;
    if (paymentStatus) invoice.paymentStatus = paymentStatus;
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (paymentDate) invoice.paymentDate = new Date(paymentDate);
    if (notes) invoice.notes = notes;

    await invoice.save();

    const response: APIResponse = {
      success: true,
      message: 'Invoice updated successfully',
      data: { invoice }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice
// @route   DELETE /api/v1/invoices/:id
// @access  Private
export const deleteInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Only allow deletion of draft invoices
    if (invoice.status !== 'draft') {
      return next(new AppError('Only draft invoices can be deleted', 400));
    }

    await Invoice.findByIdAndDelete(req.params.id);

    const response: APIResponse = {
      success: true,
      message: 'Invoice deleted successfully',
      data: null
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get invoice statistics
// @route   GET /api/v1/invoices/stats
// @access  Private
export const getInvoiceStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      totalRevenue
    ] = await Promise.all([
      Invoice.countDocuments(),
      Invoice.countDocuments({ paymentStatus: 'paid' }),
      Invoice.countDocuments({ 
        status: 'sent', 
        dueDate: { $lt: new Date() },
        paymentStatus: { $ne: 'paid' }
      }),
      Invoice.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Invoice statistics retrieved successfully',
      data: {
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        totalRevenue: totalRevenue[0]?.total || 0
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 