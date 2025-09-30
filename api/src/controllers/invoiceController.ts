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
import { Quotation } from '../models/Quotation';

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
      startDate,
      endDate,
      invoiceType
    } = req.query as QueryParams & {
      status?: string;
      paymentStatus?: string;
      customer?: string;
      supplier?: string;
      startDate?: string;
      endDate?: string;
      invoiceType?: 'sale' | 'purchase';
    };

    // Build query
    const query: any = {};

    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (customer) query.customer = customer;
    if (supplier) query.supplier = supplier;
    if (invoiceType) query.invoiceType = invoiceType;

    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate);
      if (endDate) query.issueDate.$lte = new Date(endDate);
    }

    // Search functionality
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { externalInvoiceNumber: { $regex: search, $options: 'i' } },
        { poNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);

    const invoices = await Invoice.find(query)
      .populate('user', 'firstName lastName email')
      .populate('customer', 'name email phone addresses')
      .populate('supplier', 'name email phone addresses')
      .populate('location', 'name address')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedEngineer', 'firstName lastName email phone')
      .populate('sourceQuotation', 'quotationNumber issueDate validUntil grandTotal status paymentStatus')
      .populate('items.product', 'name category brand partNo hsnNumber')
      .populate('poFromCustomer', 'poNumber status totalAmount orderDate expectedDeliveryDate poPdf')
      .sort(sort as string)
      .skip(skip)
      .limit(Number(limit));

    const total = await Invoice.countDocuments(query);

    // console.log("invoices:", invoices);
    

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
      .populate('items.product', 'name category brand modelNumber')
      .populate('poFromCustomer', 'poNumber status totalAmount orderDate expectedDeliveryDate poPdf');

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
      // Company information
      company,
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
      // Quotation reference fields
      sourceQuotation,
      quotationNumber,
      quotationPaymentDetails,
      // PO From Customer fields
      poFromCustomer,
      poNumber,
      poPdf,
      // New fields from quotation
      subject,
      engineSerialNumber,
      kva,
      hourMeterReading,
      serviceRequestDate,
      qrCodeImage,
      serviceCharges,
      batteryBuyBack,
    } = req.body;

    // Generate invoice number
    const invoiceNumber = await generateReferenceId('invoice');

    // Debug quotation and PO From Customer data
    console.log('Quotation and PO From Customer data received:', {
      quotation: {
        sourceQuotation,
        quotationNumber,
        hasSourceQuotation: !!sourceQuotation
      },
      poFromCustomer: {
        poFromCustomer,
        poNumber,
        poPdf,
        hasPoFromCustomer: !!poFromCustomer,
        hasPoNumber: !!poNumber,
        hasPoPdf: !!poPdf
      }
    });

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
        hsnNumber: item.hsnSac || item.hsnNumber || '',
        hsnSac: item.hsnSac || item.hsnNumber || ''
      });

      subtotal += discountedTotal;
      totalTax += taxAmount;
    }

    // Calculate service charges totals
    let serviceChargesSubtotal = 0;
    let serviceChargesTax = 0;
    if (serviceCharges && serviceCharges.length > 0) {
      for (const service of serviceCharges) {
        const itemSubtotal = service.quantity * service.unitPrice;
        const discountAmount = (service.discount / 100) * itemSubtotal;
        const discountedAmount = itemSubtotal - discountAmount;
        const taxAmount = (service.taxRate / 100) * discountedAmount;
        
        serviceChargesSubtotal += discountedAmount;
        serviceChargesTax += taxAmount;
      }
      console.log('Service Charges Calculation:', {
        serviceChargesSubtotal: serviceChargesSubtotal.toFixed(2),
        serviceChargesTax: serviceChargesTax.toFixed(2)
      });
    }

    // Calculate battery buy back totals (this is a DEDUCTION from the total)
    let batteryBuyBackSubtotal = 0;
    let batteryBuyBackTax = 0;
    if (batteryBuyBack && batteryBuyBack.description) {
      console.log('Received battery buyback data:', JSON.stringify(batteryBuyBack, null, 2));
      
      const itemSubtotal = batteryBuyBack.quantity * batteryBuyBack.unitPrice;
      const discountAmount = (batteryBuyBack.discount / 100) * itemSubtotal;
      const discountedAmount = itemSubtotal - discountAmount;
      const taxAmount = (batteryBuyBack.taxRate / 100) * discountedAmount;
      
      batteryBuyBackSubtotal = discountedAmount;
      batteryBuyBackTax = taxAmount;
      
      console.log('Battery Buy Back Calculation:', {
        quantity: batteryBuyBack.quantity,
        unitPrice: batteryBuyBack.unitPrice,
        itemSubtotal: itemSubtotal.toFixed(2),
        discount: batteryBuyBack.discount,
        discountAmount: discountAmount.toFixed(2),
        discountedAmount: discountedAmount.toFixed(2),
        taxRate: batteryBuyBack.taxRate,
        taxAmount: taxAmount.toFixed(2),
        totalPrice: (discountedAmount + taxAmount).toFixed(2)
      });
    } else {
      console.log('No battery buyback data received or description is empty');
      console.log('batteryBuyBack:', batteryBuyBack);
    }

    // Update totals to include service charges (battery buy back will be deducted later)
    const totalSubtotal = subtotal + serviceChargesSubtotal; // Don't subtract battery buyback here
    const totalTaxAmount = totalTax + serviceChargesTax; // Don't subtract battery buyback tax here

    console.log('Calculation Summary (before battery buyback deduction):', {
      itemsSubtotal: subtotal.toFixed(2),
      itemsTax: totalTax.toFixed(2),
      serviceChargesSubtotal: serviceChargesSubtotal.toFixed(2),
      serviceChargesTax: serviceChargesTax.toFixed(2),
      totalSubtotal: totalSubtotal.toFixed(2),
      totalTaxAmount: totalTaxAmount.toFixed(2)
    });

    const roundTo2 = (n: number) => Math.round(n * 100) / 100;

    // Create invoice with ALL required schema fields
    let ans = roundTo2(totalTaxAmount)
    
    // Calculate grand total BEFORE battery buyback deduction
    const grandTotalBeforeBatteryBuyBack = Number((Number(totalSubtotal) + Number(ans)).toFixed(2)) - discountAmount;
    
    // Calculate overall discount if provided
    const finalOverallDiscountAmount = overallDiscountAmount || 0;
    const grandTotalBeforeOverallDiscount = grandTotalBeforeBatteryBuyBack - finalOverallDiscountAmount;
    
    // FINALLY, subtract the battery buyback amount (this is the deduction)
    const finalTotalAmount = Number((grandTotalBeforeOverallDiscount - (batteryBuyBackSubtotal + batteryBuyBackTax)).toFixed(2));
    
    console.log('Final Total Calculation:', {
      totalSubtotal: totalSubtotal.toFixed(2),
      totalTaxAmount: totalTaxAmount.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      grandTotalBeforeBatteryBuyBack: grandTotalBeforeBatteryBuyBack.toFixed(2),
      grandTotalBeforeOverallDiscount: grandTotalBeforeOverallDiscount.toFixed(2),
      batteryBuyBackTotal: (batteryBuyBackSubtotal + batteryBuyBackTax).toFixed(2),
      finalTotalAmount: finalTotalAmount.toFixed(2)
    });
    
    // Handle payment details from quotation if this invoice is created from a quotation
    let paidAmount = 0;
    let remainingAmount = finalTotalAmount;
    let paymentStatus = 'pending';
    
    if (sourceQuotation && quotationPaymentDetails) {
      console.log('Creating invoice from quotation:', {
        sourceQuotation,
        quotationNumber,
        quotationPaymentDetails
      });
      
      // If this invoice is from a quotation, use the payment details
      paidAmount = quotationPaymentDetails.paidAmount || 0;
      remainingAmount = Math.max(0, finalTotalAmount - paidAmount);
      
      // Determine payment status based on paid amount
      if (paidAmount >= finalTotalAmount) {
        paymentStatus = 'paid';
        remainingAmount = 0;
      } else if (paidAmount > 0) {
        paymentStatus = 'partial';
      } else {
        paymentStatus = 'pending';
      }
      
      console.log('Payment details from quotation:', {
        paidAmount,
        remainingAmount,
        paymentStatus,
        finalTotalAmount
      });
    }
    
    // Prepare PO From Customer fields for inclusion
    const poFromCustomerFields = poFromCustomer ? {
      poFromCustomer,
      poNumber,
      poPdf
    } : {};

    console.log('PO From Customer fields to be included:', poFromCustomerFields);

    const invoice = new Invoice({
      invoiceNumber,
      customer,
      supplier,
      issueDate: new Date(),
      dueDate: new Date(dueDate),
      items: calculatedItems,
      subtotal: totalSubtotal, // This includes items + service charges (no battery buyback deduction yet)
      taxAmount: totalTaxAmount, // This includes items + service charges tax (no battery buyback deduction yet)
      discountAmount,
      overallDiscount: overallDiscount || 0,
      overallDiscountAmount: finalOverallDiscountAmount,
      totalAmount: finalTotalAmount, // This is the final amount AFTER battery buyback deduction
      paidAmount,
      remainingAmount,
      status: 'draft',
      paymentStatus,
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
      // Company information
      ...(company && { company }),
      // Customer address details
      customerAddress,
      billToAddress,
      shipToAddress,
      supplierAddress,
      ...(assignedEngineer && assignedEngineer.trim() !== '' && { assignedEngineer }),
      referenceNo,
      referenceDate,
      // Quotation reference fields
      ...(sourceQuotation && {
        sourceQuotation,
        quotationNumber,
        quotationPaymentDetails
      }),
      // PO From Customer fields
      ...poFromCustomerFields,
      // New fields from quotation
      ...(subject && { subject }),
      ...(engineSerialNumber && { engineSerialNumber }),
      ...(kva && { kva }),
      ...(hourMeterReading && { hourMeterReading }),
      ...(serviceRequestDate && { serviceRequestDate: new Date(serviceRequestDate) }),
      ...(qrCodeImage && { qrCodeImage }),
      // Sanitize service charges with hsnNumber
      ...(serviceCharges && serviceCharges.length > 0 && { 
        serviceCharges: serviceCharges.map((service: any) => ({
          description: String(service.description || '').trim(),
          hsnNumber: String(service.hsnNumber || '').trim(),
          quantity: Number(service.quantity) || 1,
          unitPrice: Number(service.unitPrice) || 0,
          discount: Number(service.discount) || 0,
          discountedAmount: Number(service.discountedAmount) || 0,
          taxRate: Number(service.taxRate) || 18,
          taxAmount: Number(service.taxAmount) || 0,
          totalPrice: Number(service.totalPrice) || 0
        }))
      }),
      // Sanitize battery buy back with hsnNumber
      ...(batteryBuyBack && batteryBuyBack.description && { 
        batteryBuyBack: {
          description: String(batteryBuyBack.description || 'Battery Buy Back').trim(),
          hsnNumber: String(batteryBuyBack.hsnNumber || '').trim(),
          quantity: Number(batteryBuyBack.quantity) || 1,
          unitPrice: Number(batteryBuyBack.unitPrice) || 0,
          discount: Number(batteryBuyBack.discount) || 0,
          discountedAmount: Number(batteryBuyBack.discountedAmount) || 0,
          taxRate: Number(batteryBuyBack.taxRate) || 0,
          taxAmount: Number(batteryBuyBack.taxAmount) || 0,
          totalPrice: Number(batteryBuyBack.totalPrice) || 0
        }
      }),
    });

    await invoice.save();

    // Verify both IDs are stored correctly
    if (sourceQuotation && !invoice.sourceQuotation) {
      console.warn('⚠️ Warning: sourceQuotation was provided but not stored in invoice');
    }
    if (poFromCustomer && !invoice.poFromCustomer) {
      console.warn('⚠️ Warning: poFromCustomer was provided but not stored in invoice');
    }

    // Log the created invoice details
    console.log('Invoice created successfully with IDs:', {
      invoiceNumber: invoice.invoiceNumber,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      remainingAmount: invoice.remainingAmount,
      paymentStatus: invoice.paymentStatus,
      // Quotation reference
      sourceQuotation: invoice.sourceQuotation,
      quotationNumber: invoice.quotationNumber,
      // PO From Customer reference
      poFromCustomer: invoice.poFromCustomer,
      poNumber: invoice.poNumber,
      poPdf: invoice.poPdf,
      // Additional fields
      batteryBuyBack: invoice.batteryBuyBack,
      serviceCharges: invoice.serviceCharges
    });

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
    const { invoiceType } = req.query;
    
    // Build match criteria based on invoice type
    const matchCriteria: any = {};
    if (invoiceType && invoiceType !== 'all') {
      matchCriteria.invoiceType = invoiceType;
    }

    console.log('Invoice stats query - invoiceType:', invoiceType, 'matchCriteria:', matchCriteria);

    const [
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      totalRevenue
    ] = await Promise.all([
      Invoice.countDocuments(matchCriteria),
      Invoice.countDocuments({ ...matchCriteria, paymentStatus: 'paid' }),
      Invoice.countDocuments({
        ...matchCriteria,
        status: 'sent',
        dueDate: { $lt: new Date() },
        paymentStatus: { $ne: 'paid' }
      }),
      Invoice.aggregate([
        { $match: { ...matchCriteria, paymentStatus: 'paid' } },
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
        totalRevenue: totalRevenue[0]?.total || 0,
        invoiceType: invoiceType || 'all'
      }
    };

    console.log('Invoice stats response:', response.data);
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

// @desc    Create invoice from quotation
// @route   POST /api/v1/invoices/create-from-quotation
// @access  Private
export const createInvoiceFromQuotation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { quotationId } = req.body;

    if (!quotationId) {
      return next(new AppError('Quotation ID is required', 400));
    }

    console.log('Creating invoice from quotation ID:', quotationId);

    // Find the quotation and populate necessary fields
    const quotation = await Quotation.findById(quotationId)
      .populate('customer', 'name email phone addresses')
      .populate('location', 'name address')
      .populate('assignedEngineer', 'firstName lastName email phone')
      .populate('items.product', 'name category brand partNo hsnNumber');

    if (!quotation) {
      return next(new AppError('Quotation not found', 404));
    }

    // Validate quotation has required fields
    if (!quotation.customer || !quotation.location) {
      return next(new AppError('Quotation is missing required customer or location information', 400));
    }

    // Validate quotation has items
    if (!quotation.items || quotation.items.length === 0) {
      return next(new AppError('Quotation must have at least one item', 400));
    }

    // Validate quotation has valid totals
    if (!quotation.grandTotal || quotation.grandTotal <= 0) {
      return next(new AppError('Quotation must have a valid grand total', 400));
    }

    // Generate invoice number
    const invoiceNumber = await generateReferenceId('INV');

    // Calculate totals properly
    const subtotal = quotation.subtotal || 0;
    const totalTax = quotation.totalTax || 0;
    const totalDiscount = quotation.totalDiscount || 0;
    const grandTotal = quotation.grandTotal || 0;
    const paidAmount = quotation.paidAmount || 0;
    const remainingAmount = Math.max(0, grandTotal - paidAmount);

    // Create invoice data from quotation
    const invoiceData = {
      invoiceNumber,
      user: req.user?.id,
      customer: typeof quotation.customer === 'object' ? quotation.customer._id : quotation.customer,
      issueDate: new Date(),
      dueDate: quotation.validUntil ? new Date(quotation.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: quotation.items.map((item: any) => ({
        product: item.product?._id || item.product,
        description: item.description || '',
        quantity: item.quantity || 0,
        unitPrice: item.unitPrice || 0,
        totalPrice: (item.unitPrice || 0) * (item.quantity || 0),
        taxRate: item.taxRate || 0,
        taxAmount: ((item.unitPrice || 0) * (item.quantity || 0) * (item.taxRate || 0)) / 100,
        uom: item.uom || 'nos',
        discount: item.discount || 0,
        hsnNumber: item.hsnNumber || ''
      })),
      subtotal,
      taxAmount: totalTax,
      discountAmount: totalDiscount,
      overallDiscount: quotation.overallDiscount || 0,
      totalAmount: grandTotal,
      paidAmount,
      remainingAmount,
      status: 'draft',
      paymentStatus: quotation.paymentStatus || 'pending',
      notes: quotation.notes || '',
      terms: quotation.terms || '',
      invoiceType: 'sale' as const,
      location: typeof quotation.location === 'object' ? quotation.location._id : quotation.location,
      createdBy: req.user?.id,
      assignedEngineer: typeof quotation.assignedEngineer === 'object' ? quotation.assignedEngineer._id : quotation.assignedEngineer,
      billToAddress: quotation.billToAddress,
      shipToAddress: quotation.shipToAddress,
      // Company information from quotation
      ...(quotation.company && { company: quotation.company }),
      // Quotation reference fields
      sourceQuotation: quotation._id,
      quotationNumber: quotation.quotationNumber,
      quotationPaymentDetails: {
        paidAmount,
        remainingAmount,
        paymentStatus: quotation.paymentStatus || 'pending'
      }
    };


    // Create the invoice
    const invoice = new Invoice(invoiceData);
    
    // Validate the invoice before saving
    const validationError = invoice.validateSync();
    if (validationError) {
      console.error('Invoice validation error:', validationError);
      return next(new AppError(`Invoice validation failed: ${validationError.message}`, 400));
    }
    
    await invoice.save();

    // Populate references for response
    await invoice.populate([
      'customer',
      'location',
      'createdBy',
      'assignedEngineer',
      'items.product'
    ]);

    console.log('Invoice created successfully:', {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer,
      totalAmount: invoice.totalAmount,
      sourceQuotation: invoice.sourceQuotation
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully from quotation',
      data: {
        invoice,
        quotationReference: {
          quotationId: quotation._id,
          quotationNumber: quotation.quotationNumber,
          paymentDetails: {
            paidAmount,
            remainingAmount,
            paymentStatus: quotation.paymentStatus || 'pending'
          }
        }
      }
    });
  } catch (error) {
    console.error('Error creating invoice from quotation:', error);
    next(new AppError('Failed to create invoice from quotation', 500));
  }
};

// @desc    Export invoices to Excel
// @route   GET /api/v1/invoices/export
// @access  Private
export const exportInvoices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const invoiceType = req.query.invoiceType as string;
    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;

    // Build filter object (same pattern as quotation export)
    const filter: any = {};

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
        { externalInvoiceNumber: { $regex: search, $options: 'i' } },
        { poNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      filter.issueDate = filter.issueDate || {};
      filter.issueDate.$gte = new Date(startDate);
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      filter.issueDate = filter.issueDate || {};
      filter.issueDate.$lte = new Date(endDate);
    }

    if (invoiceType && invoiceType !== 'undefined' && invoiceType !== 'null') {
      filter.invoiceType = invoiceType;
    }

    if (status && status !== 'undefined' && status !== 'null') {
      filter.status = status;
    }

    if (paymentStatus && paymentStatus !== 'undefined' && paymentStatus !== 'null') {
      filter.paymentStatus = paymentStatus;
    }

    // Get all invoices matching the filter
    const invoices = await Invoice.find(filter)
      .populate('customer', 'name email phone addresses')
      .populate('supplier', 'name email phone addresses')
      .populate('user', 'firstName lastName email')
      .populate('assignedEngineer', 'firstName lastName email phone')
      .populate('items.product', 'name partNo hsnNumber')
      .populate('sourceQuotation', 'quotationNumber')
      .sort({ issueDate: -1 });

    // Debug: Log first few invoices to check quotation number data
    console.log('Total invoices found:', invoices.length);
    console.log('First 3 invoices for export:');
    invoices.slice(0, 3).forEach((invoice: any, index: number) => {
      console.log(`Invoice ${index + 1}:`, {
        invoiceNumber: invoice.invoiceNumber,
        quotationNumber: invoice.quotationNumber,
        sourceQuotation: invoice.sourceQuotation,
        hasSourceQuotation: !!invoice.sourceQuotation,
        sourceQuotationQuotationNumber: (invoice.sourceQuotation && typeof invoice.sourceQuotation === 'object' && 'quotationNumber' in invoice.sourceQuotation ? (invoice.sourceQuotation as any).quotationNumber : null),
        allKeys: Object.keys(invoice)
      });
    });
    
    // Check if any invoices have quotation numbers
    const invoicesWithQuotationNumbers = invoices.filter(inv => 
      inv.quotationNumber || (inv.sourceQuotation && typeof inv.sourceQuotation === 'object' && 'quotationNumber' in inv.sourceQuotation)
    );
    console.log(`Invoices with quotation numbers: ${invoicesWithQuotationNumbers.length} out of ${invoices.length}`);

    // Check if we have any sale invoices (to determine if we should include quotation number column)
    const hasSaleInvoices = invoices.some(invoice => invoice.invoiceType === 'sale');
    
    // Prepare data for Excel export with proper formatting
    const exportData = invoices.map((invoice: any, index: number) => {
      const baseData = {
        'S.No': index + 1,
        'Invoice Number': invoice.invoiceNumber || '',
        'Customer/Supplier Name': invoice.customer?.name || invoice.supplier?.name || '',
        'Customer/Supplier Email': invoice.customer?.email || invoice.supplier?.email || '',
        'Customer/Supplier Phone': invoice.customer?.phone || invoice.supplier?.phone || '',
        'Issue Date': invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString('en-GB') : '',
        'Due Date': invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : '',
        'Status': invoice.status || 'Draft',
        'Payment Status': invoice.paymentStatus || 'Pending',
        'Total Amount': `₹${(invoice.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        'Paid Amount': `₹${(invoice.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        'Remaining Amount': `₹${(invoice.remainingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
        'External Invoice Number': invoice.externalInvoiceNumber || '',
        'PO Number': invoice.poNumber || '',
        'Invoice Type': invoice.invoiceType || '',
        'Created By': invoice.user ? `${invoice.user.firstName} ${invoice.user.lastName}` : '',
        'Created At': invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('en-GB') : '',
      };

      // Add assigned engineer information
      const assignedEngineerData = invoice.assignedEngineer ? {
        'Referred By': typeof invoice.assignedEngineer === 'object' && invoice.assignedEngineer.firstName && invoice.assignedEngineer.lastName 
          ? `${invoice.assignedEngineer.firstName} ${invoice.assignedEngineer.lastName}`.trim()
          : invoice.assignedEngineer || ''
      } : {};
      
      // Only include quotation number for sale invoices
      if (hasSaleInvoices) {
        return {
          ...baseData,
          ...assignedEngineerData,
          'Quotation Number': invoice.quotationNumber || (invoice.sourceQuotation && typeof invoice.sourceQuotation === 'object' && 'quotationNumber' in invoice.sourceQuotation ? (invoice.sourceQuotation as any).quotationNumber : '') || '',
        };
      }
      
      return {
        ...baseData,
        ...assignedEngineerData
      };
    });

    // Debug: Log the first export data item to verify quotation number column
    console.log('First export data item:', exportData[0]);
    console.log('Export data columns:', exportData.length > 0 ? Object.keys(exportData[0]) : 'No data');
    
    res.json({ success: true, data: exportData, message: 'Invoices data prepared for export' });
  } catch (error) {
    console.error('Error exporting invoices:', error);
    next(new AppError('Failed to export invoices', 500));
  }
};


