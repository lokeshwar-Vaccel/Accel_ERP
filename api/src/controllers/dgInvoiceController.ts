import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { DGInvoice } from '../models/DGInvoice';
import { DGInvoicePayment } from '../models/DGInvoicePayment';
import { Customer } from '../models/Customer';
import { DGQuotation } from '../models/DGQuotation';
import DGPoFromCustomer from '../models/DGPoFromCustomer';
import { DGEnquiry } from '../models/DGEnquiry';
import { AppError } from '../errors/AppError';

// @desc    Get all DG Invoices
// @route   GET /api/v1/dg-invoices
// @access  Private
export const getDGInvoices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;
    const customer = req.query.customer as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    // Build filter object
    const filter: any = {};

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (customer) filter.customer = customer;

    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      filter.invoiceDate = filter.invoiceDate || {};
      filter.invoiceDate.$gte = new Date(startDate);
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      filter.invoiceDate = filter.invoiceDate || {};
      filter.invoiceDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const dgInvoices = await DGInvoice.find(filter)
      .populate('customer', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email')
      .populate({
        path: 'dgQuotationNumber',
        select: 'quotationNumber issueDate validUntil'
      })
      .populate({
        path: 'poFromCustomer',
        select: 'poNumber poDate status'
      })
      .populate({
        path: 'dgEnquiry',
        select: 'enquiryNo enquiryDate customerName'
      })
      .populate({
        path: 'proformaReference',
        select: 'proformaNumber proformaDate status'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DGInvoice.countDocuments(filter);

    res.json({
      success: true,
      data: dgInvoices,
        pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get DG Invoice by ID
// @route   GET /api/v1/dg-invoices/:id
// @access  Private
export const getDGInvoiceById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dgInvoice = await DGInvoice.findById(req.params.id)
      .populate('customer', 'name email phone addresses pan')
      .populate('createdBy', 'firstName lastName email')
      .populate({
        path: 'dgQuotationNumber',
        select: 'quotationNumber issueDate validUntil'
      })
      .populate({
        path: 'poFromCustomer',
        select: 'poNumber poDate status'
      })
      .populate({
        path: 'dgEnquiry',
        select: 'enquiryNo enquiryDate customerName'
      })
      .populate({
        path: 'proformaReference',
        select: 'proformaNumber proformaDate status'
      });

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

// @desc    Create new DG Invoice
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
      customerEmail,
      customerAddress,
      billingAddress,
      shippingAddress,
      dgQuotationNumber,
      poNumber,
      poFromCustomer,
      invoiceDate,
      dueDate,
      status,
      paymentStatus,
      paymentTerms,
      notes,
      deliveryNotes,
      referenceNumber,
      referenceDate,
      buyersOrderNumber,
      buyersOrderDate,
      dispatchDocNo,
      dispatchDocDate,
      destination,
      deliveryNoteDate,
      dispatchedThrough,
      termsOfDelivery,
      items,
      additionalCharges,
      transportCharges,
      dgEnquiry,
      proformaReference,
      irn,
      ackNumber,
      ackDate,
      qrCodeInvoice
    } = req.body;

    // Validate required fields
    if (!customer || !invoiceDate || !dueDate || !items || !Array.isArray(items)) {
      return next(new AppError('Missing required fields', 400));
    }

    // Process items and calculate totals
    let subtotal = 0;
    let totalDiscount = 0;

    const processedItems = items.map((item: any) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = (itemSubtotal * (item.discount || 0)) / 100;
      const itemNetPrice = itemSubtotal - itemDiscount;
      
      // Calculate GST using item-level gstRate and gstAmount
      const itemGstRate = item.gstRate || 18;
      const itemGstAmount = item.gstAmount || (itemNetPrice * itemGstRate) / 100;
      const itemTotal = itemNetPrice + itemGstAmount;

      subtotal += itemNetPrice;
      totalDiscount += itemDiscount;

      return {
        product: item.product,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
        uom: item.uom || '',
        discount: item.discount || 0,
        discountedAmount: itemDiscount,
        gstRate: itemGstRate,
        gstAmount: itemGstAmount,
        kva: item.kva || '',
        phase: item.phase || '',
        annexureRating: item.annexureRating || '',
        dgModel: item.dgModel || '',
        numberOfCylinders: item.numberOfCylinders || 0,
        subject: item.subject || '',
        isActive: item.isActive !== false,
        hsnNumber: item.hsnNumber || ''
      };
    });

    // Process transport charges
    let transportChargesData = null;
    if (transportCharges && transportCharges.unitPrice > 0) {
      const transportSubtotal = transportCharges.quantity * transportCharges.unitPrice;
      const transportGstAmount = (transportSubtotal * transportCharges.gstRate) / 100;
      const transportTotalAmount = transportSubtotal + transportGstAmount;
      
      transportChargesData = {
        amount: transportSubtotal,
        quantity: transportCharges.quantity,
        unitPrice: transportCharges.unitPrice,
        hsnNumber: transportCharges.hsnNumber || '',
        gstRate: transportCharges.gstRate || 18,
        gstAmount: transportGstAmount,
        totalAmount: transportTotalAmount
      };
    }

    // Calculate total tax from item-level GST amounts
    const totalTaxAmount = processedItems.reduce((sum: number, item: any) => sum + (item.gstAmount || 0), 0);
    const transportTotal = transportChargesData ? transportChargesData.totalAmount : 0;
    const totalAmount = subtotal + totalTaxAmount + (additionalCharges?.freight || 0) + (additionalCharges?.insurance || 0) + (additionalCharges?.packing || 0) + (additionalCharges?.other || 0) + transportTotal;

    const dgInvoice = new DGInvoice({
      customer,
      customerEmail,
      customerAddress,
      billingAddress,
      shippingAddress,
      dgQuotationNumber,
      poNumber,
      poFromCustomer,
      invoiceDate: new Date(invoiceDate),
      dueDate: new Date(dueDate),
      status: status || 'Draft',
      paymentStatus: paymentStatus || 'Pending',
      paymentTerms: paymentTerms || '',
      notes,
      deliveryNotes,
      referenceNumber,
      referenceDate: referenceDate ? new Date(referenceDate) : undefined,
      buyersOrderNumber,
      buyersOrderDate: buyersOrderDate ? new Date(buyersOrderDate) : undefined,
      dispatchDocNo,
      dispatchDocDate: dispatchDocDate ? new Date(dispatchDocDate) : undefined,
      destination,
      deliveryNoteDate: deliveryNoteDate ? new Date(deliveryNoteDate) : undefined,
      dispatchedThrough,
      termsOfDelivery,
      items: processedItems,
      additionalCharges: additionalCharges || {
        freight: 0,
        insurance: 0,
        packing: 0,
        other: 0
      },
      transportCharges: transportChargesData,
      dgEnquiry: dgEnquiry || undefined,
      proformaReference: proformaReference || undefined,
      irn: irn || undefined,
      ackNumber: ackNumber || undefined,
      ackDate: ackDate ? new Date(ackDate) : undefined,
      qrCodeInvoice: qrCodeInvoice || undefined,
      subtotal,
      totalDiscount,
      taxRate: req.body.taxRate || 0,
      taxAmount: totalTaxAmount,
      totalAmount,
      createdBy: req.user?.id
    });

    // Save the invoice (invoice number will be generated by pre-save hook)
    await dgInvoice.save();

    res.status(201).json({
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
    const updateData = { ...req.body };

    // If items are being updated, recalculate totals
    if (updateData.items && Array.isArray(updateData.items)) {
      let subtotal = 0;
      let totalDiscount = 0;

      const processedItems = updateData.items.map((item: any) => {
        const itemSubtotal = item.quantity * item.unitPrice;
        const itemDiscount = (itemSubtotal * (item.discount || 0)) / 100;
        const itemNetPrice = itemSubtotal - itemDiscount;
        
        // Calculate GST using item-level gstRate and gstAmount
        const itemGstRate = item.gstRate || 18;
        const itemGstAmount = item.gstAmount || (itemNetPrice * itemGstRate) / 100;
        const itemTotal = itemNetPrice + itemGstAmount;

        subtotal += itemNetPrice;
        totalDiscount += itemDiscount;

        return {
          product: item.product,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: itemTotal,
          uom: item.uom || 'nos',
          discount: item.discount || 0,
          discountedAmount: itemDiscount,
          gstRate: itemGstRate,
          gstAmount: itemGstAmount,
          kva: item.kva || '',
          phase: item.phase || '',
          annexureRating: item.annexureRating || '',
          dgModel: item.dgModel || '',
          numberOfCylinders: item.numberOfCylinders || 0,
          subject: item.subject || '',
          isActive: item.isActive !== false,
          hsnNumber: item.hsnNumber || ''
        };
      });

      // Process transport charges
      let transportChargesData = null;
      if (updateData.transportCharges && updateData.transportCharges.unitPrice > 0) {
        const transportSubtotal = updateData.transportCharges.quantity * updateData.transportCharges.unitPrice;
        const transportGstAmount = (transportSubtotal * updateData.transportCharges.gstRate) / 100;
        const transportTotalAmount = transportSubtotal + transportGstAmount;
        
        transportChargesData = {
          amount: transportSubtotal,
          quantity: updateData.transportCharges.quantity,
          unitPrice: updateData.transportCharges.unitPrice,
          hsnNumber: updateData.transportCharges.hsnNumber || '998399',
          gstRate: updateData.transportCharges.gstRate || 18,
          gstAmount: transportGstAmount,
          totalAmount: transportTotalAmount
        };
      }

      // Calculate total tax from item-level GST amounts
      const totalTaxAmount = processedItems.reduce((sum: number, item: any) => sum + (item.gstAmount || 0), 0);
      const transportTotal = transportChargesData ? transportChargesData.totalAmount : 0;
      const totalAmount = subtotal + totalTaxAmount + (updateData.additionalCharges?.freight || 0) + (updateData.additionalCharges?.insurance || 0) + (updateData.additionalCharges?.packing || 0) + (updateData.additionalCharges?.other || 0) + transportTotal;

      updateData.items = processedItems;
      updateData.subtotal = subtotal;
      updateData.totalDiscount = totalDiscount;
      updateData.taxAmount = totalTaxAmount;
      updateData.totalAmount = totalAmount;
      updateData.transportCharges = transportChargesData;
    }

    // Handle date conversion for ackDate
    if (updateData.ackDate) {
      updateData.ackDate = new Date(updateData.ackDate);
    }

    const dgInvoice = await DGInvoice.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

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

// @desc    Export DG Invoices to Excel
// @route   GET /api/v1/dg-invoices/export
// @access  Private
export const exportDGInvoices = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;

    // Build filter object
    const filter: any = {};

    if (search) {
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      filter.invoiceDate = filter.invoiceDate || {};
      filter.invoiceDate.$gte = new Date(startDate);
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      filter.invoiceDate = filter.invoiceDate || {};
      filter.invoiceDate.$lte = new Date(endDate);
    }

    const dgInvoices = await DGInvoice.find(filter)
      .populate('customer', 'name email phone')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Export each item as a separate row
    const exportData: any[] = [];

    dgInvoices.forEach(invoice => {
      if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item: any) => {
          exportData.push({
            'Invoice Number': invoice.invoiceNumber,
            'Invoice Date': invoice.invoiceDate?.toLocaleDateString(),
            'Due Date': invoice.dueDate?.toLocaleDateString(),
            'Customer Name': (invoice.customer as any)?.name || '',
            'Customer Email': invoice.customerEmail,
            'Status': invoice.status,
            'Payment Status': invoice.paymentStatus,
            'Payment Terms': invoice.paymentTerms,
            'Delivery Notes': invoice.deliveryNotes || '',
            'Reference Number': invoice.referenceNumber || '',
            'Reference Date': invoice.referenceDate?.toLocaleDateString() || '',
            'Buyers Order Number': invoice.buyersOrderNumber || '',
            'Buyers Order Date': invoice.buyersOrderDate?.toLocaleDateString() || '',
            'Dispatch Doc No': invoice.dispatchDocNo || '',
            'Dispatch Doc Date': invoice.dispatchDocDate?.toLocaleDateString() || '',
            'Destination': invoice.destination || '',
            'Delivery Note Date': invoice.deliveryNoteDate?.toLocaleDateString() || '',
            'Dispatched Through': invoice.dispatchedThrough || '',
            'Terms of Delivery': invoice.termsOfDelivery || '',
            'Product': item.product,
            'Description': item.description,
            'KVA': item.kva,
            'Phase': item.phase,
            'Annexure Rating': item.annexureRating,
            'DG Model': item.dgModel,
            'Number of Cylinders': item.numberOfCylinders,
            'Subject': item.subject,
            'UOM': item.uom,
            'Quantity': item.quantity,
            'Unit Price': item.unitPrice,
            'Discount %': item.discount,
            'Discounted Amount': item.discountedAmount,
            'Total Price': item.totalPrice,
            'HSN Number': item.hsnNumber,
            'Subtotal': invoice.subtotal,
            'Total Discount': invoice.totalDiscount,
            'Tax Rate %': invoice.taxRate,
            'Tax Amount': invoice.taxAmount,
            'Freight': invoice.additionalCharges?.freight || 0,
            'Insurance': invoice.additionalCharges?.insurance || 0,
            'Packing': invoice.additionalCharges?.packing || 0,
            'Other Charges': invoice.additionalCharges?.other || 0,
            'Total Amount': invoice.totalAmount,
            'Paid Amount': invoice.paidAmount,
            'Remaining Amount': invoice.remainingAmount,
            'Notes': invoice.notes,
            'Created By': (invoice.createdBy as any)?.firstName + ' ' + (invoice.createdBy as any)?.lastName,
            'Created At': invoice.createdAt?.toLocaleDateString()
          });
        });
      } else {
        // If no items, still export the invoice
        exportData.push({
          'Invoice Number': invoice.invoiceNumber,
          'Invoice Date': invoice.invoiceDate?.toLocaleDateString(),
          'Due Date': invoice.dueDate?.toLocaleDateString(),
          'Customer Name': (invoice.customer as any)?.name || '',
          'Customer Email': invoice.customerEmail,
          'Status': invoice.status,
          'Payment Status': invoice.paymentStatus,
          'Payment Terms': invoice.paymentTerms,
          'Delivery Notes': invoice.deliveryNotes || '',
          'Reference Number': invoice.referenceNumber || '',
          'Reference Date': invoice.referenceDate?.toLocaleDateString() || '',
          'Buyers Order Number': invoice.buyersOrderNumber || '',
          'Buyers Order Date': invoice.buyersOrderDate?.toLocaleDateString() || '',
          'Dispatch Doc No': invoice.dispatchDocNo || '',
          'Dispatch Doc Date': invoice.dispatchDocDate?.toLocaleDateString() || '',
          'Destination': invoice.destination || '',
          'Delivery Note Date': invoice.deliveryNoteDate?.toLocaleDateString() || '',
          'Dispatched Through': invoice.dispatchedThrough || '',
          'Terms of Delivery': invoice.termsOfDelivery || '',
          'Product': '',
          'Description': '',
          'KVA': '',
          'Phase': '',
          'Annexure Rating': '',
          'DG Model': '',
          'Number of Cylinders': '',
          'Subject': '',
          'UOM': '',
          'Quantity': '',
          'Unit Price': '',
          'Discount %': '',
          'Discounted Amount': '',
          'Total Price': '',
          'HSN Number': '',
          'Subtotal': invoice.subtotal,
          'Total Discount': invoice.totalDiscount,
          'Tax Rate %': invoice.taxRate,
          'Tax Amount': invoice.taxAmount,
          'Freight': invoice.additionalCharges?.freight || 0,
          'Insurance': invoice.additionalCharges?.insurance || 0,
          'Packing': invoice.additionalCharges?.packing || 0,
          'Other Charges': invoice.additionalCharges?.other || 0,
          'Total Amount': invoice.totalAmount,
          'Paid Amount': invoice.paidAmount,
          'Remaining Amount': invoice.remainingAmount,
          'Notes': invoice.notes,
          'Created By': (invoice.createdBy as any)?.firstName + ' ' + (invoice.createdBy as any)?.lastName,
          'Created At': invoice.createdAt?.toLocaleDateString()
        });
      }
    });

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to validate payment method details
const validatePaymentMethodDetails = (paymentMethod: string, paymentMethodDetails: any): string | null => {
  if (!paymentMethodDetails) return null;

  switch (paymentMethod) {
    case 'cheque':
      const chequeDetails = paymentMethodDetails.cheque || paymentMethodDetails;
      if (!chequeDetails.chequeNumber) return 'Cheque number is required';
      if (!chequeDetails.bankName) return 'Bank name is required';
      if (!chequeDetails.issueDate) return 'Issue date is required';
      break;
    case 'bank_transfer':
      const bankTransferDetails = paymentMethodDetails.bankTransfer || paymentMethodDetails;
      if (!bankTransferDetails.transferDate) return 'Transfer date is required';
      break;
    case 'upi':
      // No required fields for UPI - transaction ID is optional
      break;
    case 'card':
      // No required fields for card - transaction ID is optional
      break;
    case 'other':
      const otherDetails = paymentMethodDetails.other || paymentMethodDetails;
      if (!otherDetails.methodName) return 'Method name is required';
      break;
  }
  return null;
};

// @desc    Update DG invoice payment
// @route   PUT /api/v1/dg-invoices/:id/payment
// @access  Private
export const updateDGInvoicePayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      paidAmount, 
      paymentMethod, 
      paymentMethodDetails,
      paymentDate, 
      notes,
      paymentStatus: newPaymentStatus
    } = req.body;

    // Validate required fields
    if (paidAmount === undefined || paidAmount < 0) {
      return next(new AppError('Valid payment amount is required', 400));
    }

    if (!paymentMethod) {
      return next(new AppError('Payment method is required', 400));
    }

    // Validate payment method details if provided
    if (paymentMethodDetails) {
      const validationError = validatePaymentMethodDetails(paymentMethod, paymentMethodDetails);
      if (validationError) {
        return next(new AppError(validationError, 400));
      }
    }

    // Find the DG invoice
    const dgInvoice = await DGInvoice.findById(id);
    if (!dgInvoice) {
      return next(new AppError('DG Invoice not found', 404));
    }

    // Calculate new total paid amount (existing + new payment)
    const existingPaidAmount = dgInvoice.paidAmount || 0;
    const newTotalPaidAmount = existingPaidAmount + paidAmount;
    
    // Calculate remaining amount
    const totalAmount = dgInvoice.totalAmount || 0;
    const newRemainingAmount = Math.max(0, totalAmount - newTotalPaidAmount);

    // Determine payment status
    let finalPaymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue' | 'GST Pending';
    if (newPaymentStatus === 'gst_pending') {
      finalPaymentStatus = 'GST Pending';
    } else if (newTotalPaidAmount === 0) {
      finalPaymentStatus = 'Pending';
    } else if (newTotalPaidAmount >= totalAmount) {
      finalPaymentStatus = 'Paid';
    } else {
      finalPaymentStatus = 'Partial';
    }

    // Prepare update data
    const updateData: any = {
      paidAmount: newTotalPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: finalPaymentStatus,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      paymentMethod,
      notes: notes || dgInvoice.notes,
      ...(dgInvoice.status === 'Draft' && newTotalPaidAmount > 0 && { status: 'Sent' })
    };

    // Add payment method details if provided
    if (paymentMethodDetails) {
      updateData.paymentMethodDetails = paymentMethodDetails;
    }

    // Update the DG invoice
    const updatedDGInvoice = await DGInvoice.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    // Create payment record for history
    if (paidAmount > 0) {
      const payment = new DGInvoicePayment({
        dgInvoiceId: id,
        invoiceNumber: dgInvoice.invoiceNumber,
        customerId: dgInvoice.customer,
        amount: paidAmount,
        currency: 'INR',
        paymentMethod,
        paymentMethodDetails: paymentMethodDetails || {},
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes,
        createdBy: req.user?.id,
        paymentStatus: 'completed'
      });

      await payment.save();
    }

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        dgInvoice: updatedDGInvoice,
        newPaymentAmount: paidAmount,
        totalPaidAmount: newTotalPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: finalPaymentStatus
      }
    });
  } catch (error) {
    next(error);
  }
};