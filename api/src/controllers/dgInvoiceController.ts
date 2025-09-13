import { Request, Response, NextFunction } from 'express';
import { DGInvoice, IInvoice } from '../models/DGInvoice';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Stock } from '../models/Stock';
import { StockLedger } from '../models/StockLedger';
import { AuthenticatedRequest, APIResponse, QueryParams } from '../types';
import { AppError } from '../middleware/errorHandler';
import { generateReferenceId } from '../utils/generateReferenceId';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { InvoiceEmailService } from '../services/invoiceEmailService';
import { sendEmail } from '../utils/email';

// @desc    Get all DG invoices
// @route   GET /api/v1/dg-invoices
// @access  Private
export const getDGInvoices = async (
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
        { notes: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { poNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);

    const invoices = await DGInvoice.find(query)
      .populate('user', 'firstName lastName email')
      .populate('customer', 'name email phone address')
      .populate('location', 'name address')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedEngineer', 'firstName lastName email phone')
      .populate('items.product', 'name category brand partNo hsnNumber')
      .populate('dgSalesEnquiry', 'enquiryNumber')
      .sort(sort as string)
      .skip(skip)
      .limit(Number(limit));

    const total = await DGInvoice.countDocuments(query);

    const response: APIResponse = {
      success: true,
      message: 'DG Invoices retrieved successfully',
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


// @desc    Get single DG invoice
// @route   GET /api/v1/dg-invoices/:id
// @access  Private
export const getDGInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invoice = await DGInvoice.findById(req.params.id)
      .populate('customer', 'name email phone address customerType')
      .populate('location', 'name address type')
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedEngineer', 'firstName lastName email phone')
      .populate('items.product', 'name category brand modelNumber')
      .populate('dgSalesEnquiry', 'enquiryNumber');

    if (!invoice) {
      return next(new AppError('DG Invoice not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'DG Invoice retrieved successfully',
      data: { invoice }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create new DG invoice
// @route   POST /api/v1/dg-invoices
// @access  Private
export const createDGInvoice = async (
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
      // DG specific fields
      supplierName,
      supplierEmail,
      supplierAddress,
      poNumber,
      dgSalesEnquiry,
      assignedEngineer,
      overallDiscount = 0,
      overallDiscountAmount = 0,
      referenceNo,
      referenceDate,
    } = req.body;

    // Generate invoice number
    const invoiceNumber = await generateReferenceId('dg-invoice');

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
        hsnNumber: item.hsnNumber || ''
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
    
    const invoice = new DGInvoice({
      invoiceNumber,
      customer,
      user: req.user?.id,
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
      // DG specific fields
      supplierName,
      supplierEmail,
      supplierAddress,
      poNumber,
      dgSalesEnquiry,
      ...(assignedEngineer && assignedEngineer.trim() !== '' && { assignedEngineer }),
      referenceNo,
      referenceDate,
    });

    await invoice.save();

    // Note: Inventory reduction functionality has been removed from DG invoice creation
    // The reduceStock parameter is kept for backward compatibility but no longer affects inventory
    if (reduceStock) {
      console.log('📝 DG Invoice created without inventory reduction (functionality disabled)');
    }

    const response: APIResponse = {
      success: true,
      message: 'DG Invoice created successfully',
      data: { invoice }
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update DG invoice
// @route   PUT /api/v1/dg-invoices/:id
// @access  Private
export const updateDGInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      status, 
      paymentStatus, 
      paidAmount, 
      notes, 
      externalInvoiceNumber, 
      externalInvoiceTotal,
      // New fields for comprehensive updates
      customer,
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
      // DG specific fields
      supplierName,
      supplierEmail,
      supplierAddress,
      poNumber,
      dgSalesEnquiry,
      assignedEngineer,
      overallDiscount,
      overallDiscountAmount,
      referenceNo,
      referenceDate,
    } = req.body;

    const invoice = await DGInvoice.findById(req.params.id);
    if (!invoice) {
      return next(new AppError('DG Invoice not found', 404));
    }

    // Update basic fields
    if (status) invoice.status = status;
    if (paymentStatus) invoice.paymentStatus = paymentStatus;
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
          hsnNumber: item.hsnNumber || ''
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
    // DG specific fields
    if (supplierName) invoice.supplierName = supplierName;
    if (supplierEmail) invoice.supplierEmail = supplierEmail;
    if (supplierAddress) invoice.supplierAddress = supplierAddress;
    if (poNumber) invoice.poNumber = poNumber;
    if (dgSalesEnquiry) invoice.dgSalesEnquiry = dgSalesEnquiry;
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
    const updatedInvoice = await DGInvoice.findById(req.params.id)
      .populate('customer', 'name email phone address customerType')
      .populate('location', 'name address type')
      .populate('createdBy', 'firstName lastName email')
      .populate('assignedEngineer', 'firstName lastName email phone')
      .populate('items.product', 'name category brand modelNumber')
      .populate('dgSalesEnquiry', 'enquiryNumber');

    const response: APIResponse = {
      success: true,
      message: 'DG Invoice updated successfully',
      data: { invoice: updatedInvoice }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete DG invoice
// @route   DELETE /api/v1/dg-invoices/:id
// @access  Private
export const deleteDGInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const invoice = await DGInvoice.findById(req.params.id);
    if (!invoice) {
      return next(new AppError('DG Invoice not found', 404));
    }

    // Only allow deletion of draft invoices
    if (invoice.status !== 'draft') {
      return next(new AppError('Only draft DG invoices can be deleted', 400));
    }

    await DGInvoice.findByIdAndDelete(req.params.id);

    const response: APIResponse = {
      success: true,
      message: 'DG Invoice deleted successfully',
      data: null
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get DG invoice statistics
// @route   GET /api/v1/dg-invoices/stats
// @access  Private
export const getDGInvoiceStats = async (
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
      DGInvoice.countDocuments(),
      DGInvoice.countDocuments({ paymentStatus: 'paid' }),
      DGInvoice.countDocuments({
        status: 'sent',
        dueDate: { $lt: new Date() },
        paymentStatus: { $ne: 'paid' }
      }),
      DGInvoice.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ])
    ]);

    const response: APIResponse = {
      success: true,
      message: 'DG Invoice statistics retrieved successfully',
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


// @desc    Update price and GST of a product in a DG invoice
// @route   PUT /api/v1/dg-invoices/:invoiceId/products/:productId
// @access  Private
export const updateDGInvoiceProductPriceAndGST = async (
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

    const invoice = await DGInvoice.findById(invoiceId);
    if (!invoice) return next(new AppError('DG Invoice not found', 404));
    console.log("📄 Found DG Invoice:", invoice._id);

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

          console.log(`🧾 Updating DG Invoice Item - QTY: ${item.quantity} | Total: ${totalPrice} | Tax: ${taxAmount}`);

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
      return next(new AppError('No matching products found in DG invoice items', 404));
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

    console.log("💰 Final DG Invoice Totals:", {
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
      message: 'Product prices and GST updated successfully in DG invoice (and purchase order if linked)',
      data: { invoice }
    });
  } catch (error) {
    console.error('❌ Error updating DG invoice:', error);
    next(error);
  }
};



// @desc    Send DG invoice email with payment link
// @route   POST /api/v1/dg-invoices/:id/send-email
// @access  Private
export const sendDGInvoiceEmail = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Get DG invoice with populated customer
    const invoice = await DGInvoice.findById(id).populate('customer');
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Check if invoice is valid for email sending
    if (invoice.status === 'cancelled') {
      return next(new AppError('Cannot send email for cancelled invoice', 400));
    }

    if (invoice.paymentStatus === 'paid') {
      return next(new AppError('Cannot send email for fully paid invoice', 400));
    }

    // Get customer information
    let customer = null;
    if (invoice.customer) {
      customer = await Customer.findById(invoice.customer).lean();
    }

    // Check if we have an email (either from customer or supplier email)
    const customerEmail = customer?.email || invoice.supplierEmail;
    if (!customerEmail) {
      return next(new AppError('Customer email not found', 400));
    }

    // Create a simplified payment link (you may want to implement proper payment token logic later)
    const frontendUrl = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
    const paymentLink = `${frontendUrl}/dg-sales`;

    // Generate simple email content
    const customerName = customer?.name || invoice.supplierName || 'Valued Customer';
    const companyName = process.env.COMPANY_NAME || 'Sun Power Services';
    
    const subject = `DG Invoice ${invoice.invoiceNumber} - Payment Request - ${companyName}`;
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1f2937;">DG Invoice Payment Request</h2>
            
            <p>Dear ${customerName},</p>
            
            <p>Thank you for your business. Please find below the details of your DG invoice:</p>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Invoice #${invoice.invoiceNumber}</h3>
              <p><strong>Total Amount:</strong> ₹${invoice.totalAmount.toLocaleString('en-IN')}</p>
              <p><strong>Remaining Amount:</strong> ₹${invoice.remainingAmount.toLocaleString('en-IN')}</p>
              <p><strong>Status:</strong> ${invoice.paymentStatus.toUpperCase()}</p>
              ${invoice.poNumber ? `<p><strong>PO Number:</strong> ${invoice.poNumber}</p>` : ''}
            </div>
            
            ${invoice.notes ? `<div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <strong>Notes:</strong> ${invoice.notes}
            </div>` : ''}
            
            <p>Please contact us for payment details or if you have any questions.</p>
            
            <p>Best regards,<br><strong>${companyName} Team</strong></p>
          </div>
        </body>
      </html>
    `;

    // Send email using the existing email utility
    await sendEmail(customerEmail, subject, html);

    // Update invoice status to 'sent' if it's currently 'draft'
    if (invoice.status === 'draft') {
      invoice.status = 'sent';
      await invoice.save();
    }

    const response: APIResponse = {
      success: true,
      message: 'DG Invoice email sent successfully',
      data: {
        paymentLink
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error sending DG invoice email:', error);
    next(new AppError('Failed to send DG invoice email', 500));
  }
};

// @desc    Send DG payment reminder email
// @route   POST /api/v1/dg-invoices/:id/send-reminder
// @access  Private
export const sendDGPaymentReminder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Get DG invoice with populated customer
    const invoice = await DGInvoice.findById(id).populate('customer');
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Get customer information
    let customer = null;
    if (invoice.customer) {
      customer = await Customer.findById(invoice.customer).lean();
    }

    // Check if we have an email (either from customer or supplier email)
    const customerEmail = customer?.email || invoice.supplierEmail;
    if (!customerEmail) {
      return next(new AppError('Customer email not found', 400));
    }

    // Calculate days overdue
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    // Generate reminder email content
    const customerName = customer?.name || invoice.supplierName || 'Valued Customer';
    const companyName = process.env.COMPANY_NAME || 'Sun Power Services';
    
    const subject = `Payment Reminder - DG Invoice ${invoice.invoiceNumber} - ${companyName}`;
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626;">Payment Reminder</h2>
            
            <p>Dear ${customerName},</p>
            
            <div style="background: #fef2f2; border: 2px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #dc2626; margin-top: 0;">⚠️ Payment Reminder</h3>
              <p>This is a friendly reminder that your DG invoice payment is ${daysOverdue > 0 ? `${daysOverdue} days overdue` : 'due'}.</p>
            </div>
            
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Invoice #${invoice.invoiceNumber}</h3>
              <p><strong>Due Date:</strong> ${dueDate.toLocaleDateString('en-IN')}</p>
              <p><strong>Remaining Amount:</strong> ₹${invoice.remainingAmount.toLocaleString('en-IN')}</p>
              <p><strong>Status:</strong> ${invoice.paymentStatus.toUpperCase()}</p>
              ${invoice.poNumber ? `<p><strong>PO Number:</strong> ${invoice.poNumber}</p>` : ''}
            </div>
            
            <p>Please arrange for payment at your earliest convenience to avoid any service interruptions.</p>
            
            <p>If you have already made the payment, please disregard this reminder.</p>
            
            <p>For any questions, please contact our support team.</p>
            
            <p>Best regards,<br><strong>${companyName} Team</strong></p>
          </div>
        </body>
      </html>
    `;

    // Send email using the existing email utility
    await sendEmail(customerEmail, subject, html);

    const response: APIResponse = {
      success: true,
      message: 'Payment reminder sent successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error sending DG payment reminder:', error);
    next(new AppError('Failed to send DG payment reminder', 500));
  }
};


