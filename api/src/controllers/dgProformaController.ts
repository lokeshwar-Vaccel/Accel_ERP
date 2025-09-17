import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { DGProforma } from '../models/DGProforma';
import { Customer } from '../models/Customer';
import { DGQuotation } from '../models/DGQuotation';
import DGPoFromCustomer from '../models/DGPoFromCustomer';
import { DGEnquiry } from '../models/DGEnquiry';
import { AppError } from '../errors/AppError';

// @desc    Get all DG Proformas
// @route   GET /api/v1/dg-proformas
// @access  Private
export const getDGProformas = async (
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
        { proformaNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (customer) filter.customer = customer;

    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      filter.proformaDate = filter.proformaDate || {};
      filter.proformaDate.$gte = new Date(startDate);
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      filter.proformaDate = filter.proformaDate || {};
      filter.proformaDate.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const dgProformas = await DGProforma.find(filter)
      .populate('customer', 'name email phone addresses')
      .populate('createdBy', 'firstName lastName email')
      .populate({
        path: 'dgQuotationNumber',
        select: 'quotationNumber issueDate validUntil'
      })
      .populate({
        path: 'poNumber',
        select: 'poNumber poDate status'
      })
      .populate({
        path: 'dgEnquiry',
        select: 'enquiryNo enquiryDate customerName'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await DGProforma.countDocuments(filter);

    res.json({
      success: true,
      data: dgProformas,
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

// @desc    Get DG Proforma by ID
// @route   GET /api/v1/dg-proformas/:id
// @access  Private
export const getDGProformaById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dgProforma = await DGProforma.findById(req.params.id)
      .populate('customer', 'name email phone addresses pan')
      .populate('createdBy', 'firstName lastName email')
      .populate({
        path: 'dgQuotationNumber',
        select: 'quotationNumber issueDate validUntil'
      })
      .populate({
        path: 'poNumber',
        select: 'poNumber poDate status'
      })
      .populate({
        path: 'dgEnquiry',
        select: 'enquiryNo enquiryDate customerName'
      });

    if (!dgProforma) {
      return next(new AppError('DG Proforma not found', 404));
    }

    res.json({
      success: true,
      data: dgProforma
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new DG Proforma
// @route   POST /api/v1/dg-proformas
// @access  Private
export const createDGProforma = async (
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
      proformaDate,
      validUntil,
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
      dgEnquiry
    } = req.body;

    // Validate required fields
    if (!customer || !proformaDate || !validUntil || !items || !Array.isArray(items)) {
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

    const dgProforma = new DGProforma({
      customer,
      customerEmail,
      customerAddress,
      billingAddress,
      shippingAddress,
      dgQuotationNumber,
      poNumber,
      poFromCustomer,
      proformaDate: new Date(proformaDate),
      validUntil: new Date(validUntil),
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
      subtotal,
      totalDiscount,
      taxRate: req.body.taxRate || 0,
      taxAmount: totalTaxAmount,
      totalAmount,
      createdBy: req.user?.id
    });

    // Save the proforma (proforma number will be generated by pre-save hook)
    await dgProforma.save();

    res.status(201).json({
      success: true,
      data: dgProforma
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update DG Proforma
// @route   PUT /api/v1/dg-proformas/:id
// @access  Private
export const updateDGProforma = async (
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
          uom: item.uom || 'PCS',
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

    const dgProforma = await DGProforma.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!dgProforma) {
      return next(new AppError('DG Proforma not found', 404));
    }

    res.json({
      success: true,
      data: dgProforma
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete DG Proforma
// @route   DELETE /api/v1/dg-proformas/:id
// @access  Private
export const deleteDGProforma = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const dgProforma = await DGProforma.findByIdAndDelete(req.params.id);

    if (!dgProforma) {
      return next(new AppError('DG Proforma not found', 404));
    }

    res.json({
      success: true,
      message: 'DG Proforma deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export DG Proformas to Excel
// @route   GET /api/v1/dg-proformas/export
// @access  Private
export const exportDGProformas = async (
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
        { proformaNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      filter.proformaDate = filter.proformaDate || {};
      filter.proformaDate.$gte = new Date(startDate);
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      filter.proformaDate = filter.proformaDate || {};
      filter.proformaDate.$lte = new Date(endDate);
    }

    const dgProformas = await DGProforma.find(filter)
      .populate('customer', 'name email phone')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    // Export each item as a separate row
    const exportData: any[] = [];

    dgProformas.forEach(proforma => {
      if (proforma.items && proforma.items.length > 0) {
        proforma.items.forEach((item: any) => {
          exportData.push({
            'Proforma Number': proforma.proformaNumber,
            'Proforma Date': proforma.proformaDate?.toLocaleDateString(),
            'Valid Until': proforma.validUntil?.toLocaleDateString(),
            'Customer Name': (proforma.customer as any)?.name || '',
            'Customer Email': proforma.customerEmail,
            'Status': proforma.status,
            'Payment Status': proforma.paymentStatus,
            'Payment Terms': proforma.paymentTerms,
            'Delivery Notes': proforma.deliveryNotes || '',
            'Reference Number': proforma.referenceNumber || '',
            'Reference Date': proforma.referenceDate?.toLocaleDateString() || '',
            'Buyers Order Number': proforma.buyersOrderNumber || '',
            'Buyers Order Date': proforma.buyersOrderDate?.toLocaleDateString() || '',
            'Dispatch Doc No': proforma.dispatchDocNo || '',
            'Dispatch Doc Date': proforma.dispatchDocDate?.toLocaleDateString() || '',
            'Destination': proforma.destination || '',
            'Delivery Note Date': proforma.deliveryNoteDate?.toLocaleDateString() || '',
            'Dispatched Through': proforma.dispatchedThrough || '',
            'Terms of Delivery': proforma.termsOfDelivery || '',
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
            'Subtotal': proforma.subtotal,
            'Total Discount': proforma.totalDiscount,
            'Tax Rate %': proforma.taxRate,
            'Tax Amount': proforma.taxAmount,
            'Freight': proforma.additionalCharges?.freight || 0,
            'Insurance': proforma.additionalCharges?.insurance || 0,
            'Packing': proforma.additionalCharges?.packing || 0,
            'Other Charges': proforma.additionalCharges?.other || 0,
            'Total Amount': proforma.totalAmount,
            'Notes': proforma.notes,
            'Created By': (proforma.createdBy as any)?.firstName + ' ' + (proforma.createdBy as any)?.lastName,
            'Created At': proforma.createdAt?.toLocaleDateString()
          });
        });
      } else {
        // If no items, still export the proforma
        exportData.push({
          'Proforma Number': proforma.proformaNumber,
          'Proforma Date': proforma.proformaDate?.toLocaleDateString(),
          'Valid Until': proforma.validUntil?.toLocaleDateString(),
          'Customer Name': (proforma.customer as any)?.name || '',
          'Customer Email': proforma.customerEmail,
          'Status': proforma.status,
          'Payment Status': proforma.paymentStatus,
          'Payment Terms': proforma.paymentTerms,
          'Delivery Notes': proforma.deliveryNotes || '',
          'Reference Number': proforma.referenceNumber || '',
          'Reference Date': proforma.referenceDate?.toLocaleDateString() || '',
          'Buyers Order Number': proforma.buyersOrderNumber || '',
          'Buyers Order Date': proforma.buyersOrderDate?.toLocaleDateString() || '',
          'Dispatch Doc No': proforma.dispatchDocNo || '',
          'Dispatch Doc Date': proforma.dispatchDocDate?.toLocaleDateString() || '',
          'Destination': proforma.destination || '',
          'Delivery Note Date': proforma.deliveryNoteDate?.toLocaleDateString() || '',
          'Dispatched Through': proforma.dispatchedThrough || '',
          'Terms of Delivery': proforma.termsOfDelivery || '',
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
          'Subtotal': proforma.subtotal,
          'Total Discount': proforma.totalDiscount,
          'Tax Rate %': proforma.taxRate,
          'Tax Amount': proforma.taxAmount,
          'Freight': proforma.additionalCharges?.freight || 0,
          'Insurance': proforma.additionalCharges?.insurance || 0,
          'Packing': proforma.additionalCharges?.packing || 0,
          'Other Charges': proforma.additionalCharges?.other || 0,
          'Total Amount': proforma.totalAmount,
          'Notes': proforma.notes,
          'Created By': (proforma.createdBy as any)?.firstName + ' ' + (proforma.createdBy as any)?.lastName,
          'Created At': proforma.createdAt?.toLocaleDateString()
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