import { Request, Response, NextFunction } from 'express';
import { Invoice, IInvoice } from '../models/Invoice';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Stock } from '../models/Stock';
import { StockLedger } from '../models/StockLedger';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateReferenceId } from '../utils/generateReferenceId';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { InvoiceEmailService } from '../services/invoiceEmailService';

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
      dateTo,
      invoiceType
    } = req.query as QueryParams & {
      status?: string;
      paymentStatus?: string;
      customer?: string;
      dateFrom?: string;
      dateTo?: string;
      invoiceType?: 'sale' | 'purchase';
    };

    // Build query
    const query: any = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (customer) query.customer = customer;
    if (invoiceType) query.invoiceType = invoiceType;

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
      .populate('user', 'firstName lastName email')
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
      reduceStock = true,
      externalInvoiceNumber,
      externalInvoiceTotal
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
      function roundTo2(n: number) {
  return Math.round(n * 100) / 100;
}

    // Create invoice with ALL required schema fields
    let ans = roundTo2(totalTax)
    const totalAmount = Number((Number(subtotal) + Number(ans)).toFixed(2)) - discountAmount;
    const invoice = new Invoice({
      invoiceNumber,
      customer,
      issueDate: new Date(),
      dueDate: new Date(dueDate),
      items: calculatedItems,
      subtotal,
      taxAmount: totalTax,
      discountAmount,
      totalAmount:399,
      paidAmount: 0,
      remainingAmount: totalAmount,
      status: 'draft',
      paymentStatus: 'pending',
      notes,
      terms,
      invoiceType,
      referenceId,
      location,
      createdBy: req.user!.id,
      externalInvoiceNumber,
      externalInvoiceTotal
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
    const { status, paymentStatus, paymentMethod, paymentDate, paidAmount, notes, externalInvoiceNumber, externalInvoiceTotal } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Update fields
    if (status) invoice.status = status;
    if (paymentStatus) invoice.paymentStatus = paymentStatus;
    if (paymentMethod) invoice.paymentMethod = paymentMethod;
    if (paymentDate) invoice.paymentDate = new Date(paymentDate);
    if (typeof paidAmount === 'number') {
      // Validate paidAmount
      if (paidAmount < 0) {
        return next(new AppError('Paid amount cannot be negative', 400));
      }
      if (paidAmount > invoice.totalAmount) {
        return next(new AppError('Paid amount cannot exceed total amount', 400));
      }
      invoice.paidAmount = paidAmount;
    }
    if (notes) invoice.notes = notes;
    if (externalInvoiceNumber !== undefined) invoice.externalInvoiceNumber = externalInvoiceNumber;
    if (externalInvoiceTotal !== undefined) invoice.externalInvoiceTotal = externalInvoiceTotal;

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


// @desc    Update price and GST of a product in an invoice
// @route   PUT /api/v1/invoices/:invoiceId/products/:productId
// @access  Private
export const updateInvoiceProductPriceAndGST = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return next(new AppError('Products array is required and cannot be empty', 400));
    }

    // 1. Fetch Invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return next(new AppError('Invoice not found', 404));

    let updated = false;
    let subtotal = 0;
    let totalTax = 0;

     const truncateTo2 = (value: number) => Math.floor(value * 10) / 10;

    // 2. Process each product update
    for (const { product: productId, price, gst } of products) {
      if (price < 0 || gst < 0) {
        return next(new AppError('Price and GST must be non-negative', 400));
      }

      const product = await Product.findById(productId);
      if (!product) return next(new AppError(`Product not found: ${productId}`, 404));

      // Update Product price & GST
      product.price = price;
      product.gst = gst;
      await product.save();
     

      // Update matching Invoice item
      invoice.items = invoice.items.map(item => {
        if (item.product.toString() === productId.toString()) {
          const totalPrice = item.quantity * price;
          let taxAmount = (gst * totalPrice) / 100;
          taxAmount = truncateTo2(taxAmount)
          console.log("_______taxAmount", taxAmount, "_____totalPrice", totalPrice);

          item.unitPrice = price;
          item.taxRate = gst;
          item.totalPrice = totalPrice;
          item.taxAmount = taxAmount;

          updated = true;
        }
        return item;
      });

      // Update optional stock record
      const stock = await Stock.findOne({ product: productId, location: invoice.location });
      if (stock) {
        stock.lastUpdated = new Date();
        await stock.save();
      }

      // 🔁 Optional: Update purchase order item if invoice is linked
      if (invoice.poNumber) {
        const purchaseOrder = await PurchaseOrder.findOne({ poNumber: invoice.poNumber });
        if (purchaseOrder) {
          for (const item of purchaseOrder.items) {
            if (item.product.toString() === productId.toString()) {
              item.unitPrice = price;
              item.taxRate = gst;
              item.totalPrice = item.quantity * price;
              updated = true;
            }
          }
          await purchaseOrder.save();
        }
      }
    }

    if (!updated) {
      return next(new AppError('No matching products found in invoice items', 404));
    }
    function roundTo2(n: number) {
      return Math.round(n * 100) / 100;
    }

    // 3. Recalculate invoice totals
    for (const item of invoice.items) {
      subtotal += item.totalPrice;
      totalTax += item.taxAmount ?? 0;
    }
    console.log("____subtotal", subtotal, "_____totalTax", totalTax, roundTo2(subtotal + totalTax), "______Number((subtotal + totalTax).toFixed(2))", Number((subtotal + totalTax).toFixed(2)));

    invoice.subtotal = subtotal;
    invoice.taxAmount = totalTax;
    invoice.totalAmount = Math.round(truncateTo2(subtotal + totalTax)) - invoice.discountAmount;
    invoice.remainingAmount = invoice.totalAmount - invoice.paidAmount;
console.log("_____nvoice.totalAmount",invoice.totalAmount);

    await invoice.save();

    // 4. Send response
    const response: APIResponse = {
      success: true,
      message: 'Product prices and GST updated successfully in invoice (and purchase order if linked)',
      data: { invoice }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error updating invoice:', error);
    next(error);
  }
};

// @desc    Send invoice email with payment link
// @route   POST /api/v1/invoices/:id/send-email
// @access  Private
export const sendInvoiceEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await InvoiceEmailService.sendInvoiceEmail(id);

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
// @route   POST /api/v1/invoices/:id/send-reminder
// @access  Private
export const sendPaymentReminder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await InvoiceEmailService.sendPaymentReminder(id);

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


