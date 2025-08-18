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
      supplier,
      dateFrom,
      dateTo,
      invoiceType
    } = req.query as QueryParams & {
      status?: string;
      paymentStatus?: string;
      customer?: string;
      supplier?: string;
      dateFrom?: string;
      dateTo?: string;
      invoiceType?: 'sale' | 'purchase';
    };

    // Build query
    const query: any = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (customer) query.customer = customer;
    if (supplier) query.supplier = supplier;
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
      .populate('supplier', 'name email phone addresses')
      .populate('location', 'name address')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedEngineer', 'firstName lastName email phone')
      .populate('items.product', 'name category brand partNo hsnNumber')
      .sort(sort as string)
      .skip(skip)
      .limit(Number(limit));

    const total = await Invoice.countDocuments(query);

    console.log("invoices:", invoices);
    

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
      .populate('supplier', 'name email phone addresses')
      .populate('location', 'name address type')
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedEngineer', 'firstName lastName email phone')
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
      supplier,
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
      externalInvoiceTotal,
      // Bank details and PAN
      pan,
      bankName,
      bankAccountNo,
      bankIFSC,
      bankBranch,
      // Customer address details
      customerAddress,
      billToAddress,
      shipToAddress,
      supplierAddress,
      assignedEngineer,
      overallDiscount = 0,
      overallDiscountAmount = 0,
      referenceNo,
      referenceDate,
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
      const itemDiscount = (item.discount || 0) * itemTotal / 100;
      const discountedTotal = itemTotal - itemDiscount;
      const taxAmount = (item.taxRate || 0) * discountedTotal / 100;

      calculatedItems.push({
        product: item.product,
        description: item.description || product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: discountedTotal,
        taxRate: item.taxRate || 0,
        taxAmount: taxAmount,
        discount: item.discount || 0,
        uom: item.uom || 'nos',
        partNo: item.partNo || '',
        hsnSac: item.hsnSac || ''
      });

      subtotal += discountedTotal;
      totalTax += taxAmount;
    }
      function roundTo2(n: number) {
  return Math.round(n * 100) / 100;
}

    // Create invoice with ALL required schema fields
    let ans = roundTo2(totalTax)
    
    // Calculate overall discount if provided
    // Use the overallDiscountAmount sent from frontend directly
    const finalOverallDiscountAmount = overallDiscountAmount || 0;
    const grandTotalBeforeOverallDiscount = Number((Number(subtotal) + Number(ans)).toFixed(2)) - discountAmount;
    const finalTotalAmount = Number((grandTotalBeforeOverallDiscount - finalOverallDiscountAmount).toFixed(2));
    

    

    
    const invoice = new Invoice({
      invoiceNumber,
      customer,
      supplier,
      issueDate: new Date(),
      dueDate: new Date(dueDate),
      items: calculatedItems,
      subtotal,
      taxAmount: totalTax,
      discountAmount,
      overallDiscount: overallDiscount || 0,
      overallDiscountAmount: finalOverallDiscountAmount,
      totalAmount: finalTotalAmount,
      paidAmount: 0,
      remainingAmount: finalTotalAmount,
      status: 'draft',
      paymentStatus: 'pending',
      notes,
      terms,
      invoiceType,
      referenceId,
      location,
      createdBy: req.user!.id,
      externalInvoiceNumber,
      externalInvoiceTotal,
      // Bank details and PAN
      pan,
      bankName,
      bankAccountNo,
      bankIFSC,
      bankBranch,
      // Customer address details
      customerAddress,
      billToAddress,
      shipToAddress,
      supplierAddress,
      ...(assignedEngineer && assignedEngineer.trim() !== '' && { assignedEngineer }),
      referenceNo,
      referenceDate,
    });

    await invoice.save();



    // Reduce stock if requested
    if (reduceStock) {
      for (const item of calculatedItems) {
        const stock = await Stock.findOne({
          product: item.product,
          location: location
        });

        const originalQuantity = stock?.quantity ?? 0;

        if (stock) {
          stock.quantity -= item.quantity;
          stock.availableQuantity = stock.quantity - stock.reservedQuantity;
          await stock.save();

          // 🔔 AUTOMATIC NOTIFICATION TRIGGER
          // Check if stock reduction requires notification and send real-time alert
          try {
            const { Product } = await import('../models/Product');
            const { notificationService } = await import('../services/notificationService');
            
            const product = await Product.findById(item.product);
            if (product) {
              const currentStock = stock.availableQuantity;
              const minStockLevel = product.minStockLevel || 0;
              const maxStockLevel = product.maxStockLevel || 0;

              // Determine notification type based on new stock level
              let notificationType: 'low_stock' | 'out_of_stock' | 'over_stock' | null = null;
              let threshold = 0;

              if (currentStock === 0 && minStockLevel > 0) {
                notificationType = 'out_of_stock';
                threshold = minStockLevel;
              } else if (currentStock > 0 && currentStock <= minStockLevel && minStockLevel > 0) {
                notificationType = 'low_stock';
                threshold = minStockLevel;
              } else if (maxStockLevel > 0 && currentStock > maxStockLevel) {
                notificationType = 'over_stock';
                threshold = maxStockLevel;
              }

              // If notification is needed, send it via WebSocket
              if (notificationType) {
                console.log(`🔔 Invoice stock reduction triggered ${notificationType} notification for product: ${product.name}`);
                
                // Get location details
                const { StockLocation } = await import('../models/Stock');
                const { Room } = await import('../models/Stock');
                const { Rack } = await import('../models/Stock');
                
                const stockLocation = await StockLocation.findById(location);
                const room = stock.room ? await Room.findById(stock.room) : null;
                const rack = stock.rack ? await Rack.findById(stock.rack) : null;

                // Create real-time notification
                await notificationService.createInventoryNotification(
                  notificationType,
                  item.product.toString(),
                  product.name,
                  product.partNo || 'N/A',
                  currentStock,
                  threshold,
                  stockLocation?.name || 'Unknown',
                  room?.name,
                  rack?.name
                );

                console.log(`✅ Real-time ${notificationType} notification sent for ${product.name}`);
              }
            }
          } catch (error) {
            // Don't let notification errors break the invoice operation
            console.error('❌ Error in automatic invoice stock notification:', error);
          }

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
            previousQuantity: originalQuantity,
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
    const { 
      status, 
      paymentStatus, 
      paymentMethod, 
      paymentDate, 
      paidAmount, 
      notes, 
      externalInvoiceNumber, 
      externalInvoiceTotal,
      // New fields for comprehensive updates
      customer,
      supplier,
      items,
      dueDate,
      discountAmount,
      terms,
      invoiceType,
      referenceId,
      location,
      // Bank details and PAN
      pan,
      bankName,
      bankAccountNo,
      bankIFSC,
      bankBranch,
      // Customer address details
      customerAddress,
      billToAddress,
      shipToAddress,
      supplierAddress,
      assignedEngineer,
      overallDiscount,
      overallDiscountAmount,
      referenceNo,
      referenceDate,
    } = req.body;

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Update basic fields
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

    // Update new fields
    if (customer) invoice.customer = customer;
    if (supplier) invoice.supplier = supplier;
    if (items) {
      // Recalculate totals if items are updated
      let calculatedItems = [];
      let subtotal = 0;
      let totalTax = 0;

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return next(new AppError(`Product not found: ${item.product}`, 404));
        }

        const itemTotal = item.quantity * item.unitPrice;
        const itemDiscount = (item.discount || 0) * itemTotal / 100;
        const discountedTotal = itemTotal - itemDiscount;
        const taxAmount = (item.taxRate || 0) * discountedTotal / 100;

        calculatedItems.push({
          product: item.product,
          description: item.description || product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: discountedTotal,
          taxRate: item.taxRate || 0,
          taxAmount: taxAmount,
          discount: item.discount || 0,
          uom: item.uom || 'nos',
          partNo: item.partNo || '',
          hsnSac: item.hsnSac || ''
        });

        subtotal += discountedTotal;
        totalTax += taxAmount;
      }

      invoice.items = calculatedItems;
      invoice.subtotal = subtotal;
      invoice.taxAmount = totalTax;

      // Recalculate overall discount
      const grandTotalBeforeOverallDiscount = subtotal + totalTax - (invoice.discountAmount || 0);
      const calculatedOverallDiscountAmount = (invoice.overallDiscount || 0) > 0 ? 
        ((invoice.overallDiscount || 0) / 100) * grandTotalBeforeOverallDiscount : 0;
      const finalTotalAmount = Number((grandTotalBeforeOverallDiscount - calculatedOverallDiscountAmount).toFixed(2));

      invoice.totalAmount = finalTotalAmount;
      invoice.remainingAmount = finalTotalAmount - (invoice.paidAmount || 0);
      invoice.overallDiscountAmount = calculatedOverallDiscountAmount;
    }
    if (dueDate) invoice.dueDate = new Date(dueDate);
    if (discountAmount !== undefined) invoice.discountAmount = discountAmount;
    if (terms) invoice.terms = terms;
    if (invoiceType) invoice.invoiceType = invoiceType;
    if (referenceId) invoice.referenceId = referenceId;
    if (location) invoice.location = location;
    if (pan) invoice.pan = pan;
    if (bankName) invoice.bankName = bankName;
    if (bankAccountNo) invoice.bankAccountNo = bankAccountNo;
    if (bankIFSC) invoice.bankIFSC = bankIFSC;
    if (bankBranch) invoice.bankBranch = bankBranch;
    if (customerAddress) invoice.customerAddress = customerAddress;
    if (billToAddress) invoice.billToAddress = billToAddress;
    if (shipToAddress) invoice.shipToAddress = shipToAddress;
    if (supplierAddress) invoice.supplierAddress = supplierAddress;
    if (assignedEngineer) invoice.assignedEngineer = assignedEngineer;
    if (overallDiscount !== undefined) {
      invoice.overallDiscount = overallDiscount;
      // Use the overallDiscountAmount sent from frontend directly
      const finalOverallDiscountAmount = overallDiscountAmount || 0;
      const grandTotalBeforeOverallDiscount = invoice.subtotal + invoice.taxAmount - (invoice.discountAmount || 0);
      invoice.overallDiscountAmount = finalOverallDiscountAmount;
      invoice.totalAmount = Number((grandTotalBeforeOverallDiscount - finalOverallDiscountAmount).toFixed(2));
      invoice.remainingAmount = invoice.totalAmount - (invoice.paidAmount || 0);
    } else if (overallDiscountAmount !== undefined) {
      // If only overallDiscountAmount is provided, recalculate total
      const grandTotalBeforeOverallDiscount = invoice.subtotal + invoice.taxAmount - (invoice.discountAmount || 0);
      invoice.overallDiscountAmount = overallDiscountAmount;
      invoice.totalAmount = Number((grandTotalBeforeOverallDiscount - overallDiscountAmount).toFixed(2));
      invoice.remainingAmount = invoice.totalAmount - (invoice.paidAmount || 0);
    }
    if (referenceNo) invoice.referenceNo = referenceNo;
    if (referenceDate) invoice.referenceDate = referenceDate;

    await invoice.save();

    // Populate the updated invoice for response
    const updatedInvoice = await Invoice.findById(req.params.id)
      .populate('customer', 'name email phone address customerType')
      .populate('supplier', 'name email phone addresses')
      .populate('location', 'name address type')
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedEngineer', 'firstName lastName email phone')
      .populate('items.product', 'name category brand modelNumber');

    const response: APIResponse = {
      success: true,
      message: 'Invoice updated successfully',
      data: { invoice: updatedInvoice }
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

    console.log("📥 Incoming Request:", { invoiceId, products });

    if (!Array.isArray(products) || products.length === 0) {
      return next(new AppError('Products array is required and cannot be empty', 400));
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return next(new AppError('Invoice not found', 404));
    console.log("📄 Found Invoice:", invoice._id);

    let updated = false;
    let subtotal = 0;
    let totalTax = 0;

    const round2 = (n: number) => Number(n.toFixed(2));

    for (const { product: productId, price, gst } of products) {
      if (price < 0 || gst < 0) {
        return next(new AppError('Price and GST must be non-negative', 400));
      }

      console.log(`🔄 Processing Product: ${productId} | New Price: ${price} | GST: ${gst}`);

      const product = await Product.findById(productId);
      if (!product) return next(new AppError(`Product not found: ${productId}`, 404));

      product.price = round2(price);
      product.gst = round2(gst);
      await product.save();
      console.log(`✅ Product Updated: ${product.name} | Price: ${product.price} | GST: ${product.gst}`);

      invoice.items = invoice.items.map(item => {
        if (item.product.toString() === productId.toString()) {
          const totalPrice = round2(item.quantity * price);
          const taxAmount = round2((gst * totalPrice) / 100);

          console.log(`🧾 Updating Invoice Item - QTY: ${item.quantity} | Total: ${totalPrice} | Tax: ${taxAmount}`);

          item.unitPrice = round2(price);
          item.taxRate = round2(gst);
          item.totalPrice = totalPrice;
          item.taxAmount = taxAmount;

          updated = true;
        }
        return item;
      });

      const stock = await Stock.findOne({ product: productId, location: invoice.location });
      if (stock) {
        stock.lastUpdated = new Date();
        await stock.save();
        console.log(`📦 Stock Updated for Product ${productId} at Location ${invoice.location}`);
      }

      if (invoice.poNumber) {
        const purchaseOrder = await PurchaseOrder.findOne({ poNumber: invoice.poNumber });
        if (purchaseOrder) {
          for (const item of purchaseOrder.items) {
            if (item.product.toString() === productId.toString()) {
              item.unitPrice = round2(price);
              item.taxRate = round2(gst);
              item.totalPrice = round2(item.quantity * price);
              updated = true;
              console.log(`📑 PO Updated: ${invoice.poNumber} | Product: ${productId}`);
            }
          }
          await purchaseOrder.save();
        }
      }
    }

    if (!updated) {
      return next(new AppError('No matching products found in invoice items', 404));
    }

    // 3. Recalculate totals
    for (const item of invoice.items) {
      subtotal += round2(item.totalPrice);
      totalTax += round2(item.taxAmount ?? 0);
    }

    invoice.subtotal = round2(subtotal);
    invoice.taxAmount = round2(totalTax);
    invoice.totalAmount = round2(invoice.subtotal + invoice.taxAmount - invoice.discountAmount);
    invoice.remainingAmount = round2(invoice.totalAmount - invoice.paidAmount);

    console.log("💰 Final Invoice Totals:", {
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      discount: invoice.discountAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      remainingAmount: invoice.remainingAmount,
    });

    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Product prices and GST updated successfully in invoice (and purchase order if linked)',
      data: { invoice }
    });
  } catch (error) {
    console.error('❌ Error updating invoice:', error);
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


