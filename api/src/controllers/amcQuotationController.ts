import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { AMCQuotation, IAMCQuotation } from '../models/AMCQuotation';
import { generateReferenceId } from '../utils/generateReferenceId';
import { Customer } from '../models/Customer';
import { QuotationService } from '../services/quotationService';

// @desc    Get all AMC quotations with pagination and filtering
// @route   GET /api/v1/amc-quotations
// @access  Private
export const getAMCQuotations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;
    const amcType = req.query.amcType as string;

    // Build filter object
    const filter: any = {};

    // Add search filter
    if (search) {
      filter.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Add payment status filter
    if (paymentStatus && paymentStatus !== 'all') {
      filter.paymentStatus = paymentStatus;
    }

    // Add AMC type filter
    if (amcType && amcType !== 'all') {
      filter.amcType = amcType;
    }

    // Add date filter
    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      filter.issueDate = filter.issueDate || {};
      filter.issueDate.$gte = new Date(startDate);
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      filter.issueDate = filter.issueDate || {};
      filter.issueDate.$lte = new Date(endDate);
    }

    const [quotations, total] = await Promise.all([
      AMCQuotation.find(filter)
        .populate('location', 'name address type gstNumber')
        .populate('customer', 'name email phone pan addresses')
        .populate('assignedEngineer', 'firstName lastName email phone')
        .skip(skip)
        .limit(limit)
        .sort({ issueDate: -1 }),
      AMCQuotation.countDocuments(filter)
    ]);

    const response: APIResponse = {
      success: true,
      message: 'AMC quotations retrieved successfully',
      data: quotations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single AMC quotation by ID
// @route   GET /api/v1/amc-quotations/:id
// @access  Private
export const getAMCQuotationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await AMCQuotation.findById(req.params.id)
      .populate('location', 'name address type gstNumber')
      .populate('customer', 'name email phone pan addresses')
      .populate('assignedEngineer', 'firstName lastName email phone');

    if (!quotation) {
      return next(new AppError('AMC quotation not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'AMC quotation retrieved successfully',
      data: quotation
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new AMC quotation
// @route   POST /api/v1/amc-quotations
// @access  Private
export const createAMCQuotation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log("Creating AMC quotation with data:", req.body);
    
    const data = req.body;

    // Step 1: Sanitize input data
    const sanitizedData = sanitizeAMCQuotationData(data);

    console.log("Sanitized data:", sanitizedData);
    
    // Step 2: Validate required fields
    const validationResult = validateAMCQuotationData(sanitizedData);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.errors
      });
    }

    // Step 3: Generate quotation number if not provided
    if (!sanitizedData.quotationNumber) {
      try {
        sanitizedData.quotationNumber = await generateReferenceId('amc-quotation');
      } catch (error) {
        console.error('Error generating AMC quotation number:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate quotation number'
        });
      }
    }

    // Step 4: Set default dates and validity
    if (!sanitizedData.issueDate) {
      sanitizedData.issueDate = new Date();
    }
    
    if (!sanitizedData.validUntil && !sanitizedData.validityPeriod) {
      sanitizedData.validityPeriod = 30;
      const validUntil = new Date(sanitizedData.issueDate);
      validUntil.setDate(validUntil.getDate() + 30);
      sanitizedData.validUntil = validUntil;
    } else if (sanitizedData.validityPeriod && !sanitizedData.validUntil) {
      const validUntil = new Date(sanitizedData.issueDate);
      validUntil.setDate(validUntil.getDate() + sanitizedData.validityPeriod);
      sanitizedData.validUntil = validUntil;
    }

    // Step 5: Set AMC-specific defaults
    if (!sanitizedData.contractStartDate) {
      sanitizedData.contractStartDate = sanitizedData.issueDate;
    }
    
    if (!sanitizedData.contractEndDate && sanitizedData.contractDuration) {
      const endDate = new Date(sanitizedData.contractStartDate);
      endDate.setMonth(endDate.getMonth() + sanitizedData.contractDuration);
      sanitizedData.contractEndDate = endDate;
    }

    if (!sanitizedData.amcPeriodFrom) {
      sanitizedData.amcPeriodFrom = sanitizedData.contractStartDate;
    }
    
    if (!sanitizedData.amcPeriodTo) {
      sanitizedData.amcPeriodTo = sanitizedData.contractEndDate;
    }

    // Step 6: Calculate financial details
    const calculationResult = QuotationService.calculateQuotationTotals(
      sanitizedData.items || [], 
      sanitizedData.serviceCharges || [], 
      sanitizedData.batteryBuyBack || undefined,
      sanitizedData.overallDiscount || 0
    );

    console.log("Calculation result:", calculationResult);
    
    // Step 7: Prepare final quotation data
    const quotationData = {
      ...sanitizedData,
      quotationType: 'amc',
      subtotal: calculationResult.subtotal,
      totalDiscount: calculationResult.totalDiscount,
      overallDiscount: sanitizedData.overallDiscount || 0,
      overallDiscountAmount: calculationResult.overallDiscountAmount,
      totalTax: calculationResult.totalTax,
      grandTotal: calculationResult.grandTotal,
      roundOff: calculationResult.roundOff,
      items: calculationResult.items,
      serviceCharges: calculationResult.serviceCharges,
      batteryBuyBack: calculationResult.batteryBuyBack,
      // Set default payment values
      paidAmount: sanitizedData.paidAmount || 0,
      remainingAmount: calculationResult.grandTotal - (sanitizedData.paidAmount || 0),
      paymentStatus: sanitizedData.paidAmount && sanitizedData.paidAmount > 0 ? 'partial' : 'pending',
      status: sanitizedData.status || 'draft',
      createdBy: req.user?.id
    };

    console.log("AMC QuotationData:", quotationData);
    
    // Step 8: Save to database
    const quotation = new AMCQuotation(quotationData);
    await quotation.save();

    // Step 9: Populate and return success response
    const populatedQuotation = await AMCQuotation.findById(quotation._id)
      .populate('location', 'name address type gstNumber')
      .populate('customer', 'name email phone pan addresses')
      .populate('assignedEngineer', 'firstName lastName email phone');

    const response: APIResponse = {
      success: true,
      message: 'AMC quotation created successfully',
      data: populatedQuotation
    };

    return res.status(201).json(response);

  } catch (error) {
    console.error('Error creating AMC quotation:', error);
    
    // Handle specific database errors
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'AMC quotation number already exists'
      });
    }
    return next(error);
  }
};

// @desc    Update an AMC quotation
// @route   PUT /api/v1/amc-quotations/:id
// @access  Private
export const updateAMCQuotation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log("Updating AMC quotation with ID:", req.params.id);
    console.log("Update data:", req.body);
    
    // Check if quotation exists
    const existingQuotation = await AMCQuotation.findById(req.params.id);
    if (!existingQuotation) {
      return next(new AppError('AMC quotation not found', 404));
    }

    // Check if this is a status-only update
    const isStatusOnlyUpdate = Object.keys(req.body).length === 1 && req.body.status;
    console.log('Is status-only update:', isStatusOnlyUpdate);
    
    let sanitizedData;
    if (isStatusOnlyUpdate) {
      // For status-only updates, just validate the status
      const validStatuses = ['draft', 'sent', 'accepted', 'rejected'];
      if (!validStatuses.includes(req.body.status)) {
        return next(new AppError('Invalid status. Must be one of: draft, sent, accepted, rejected', 400));
      }
      sanitizedData = { status: req.body.status };
      console.log('Status-only update, sanitized data:', sanitizedData);
    } else {
      // For full updates, sanitize and validate all data
      sanitizedData = sanitizeAMCQuotationData(req.body);
      
      // Preserve the original quotation number and dates
      sanitizedData.quotationNumber = existingQuotation.quotationNumber;
      sanitizedData.issueDate = existingQuotation.issueDate;
      sanitizedData.validUntil = existingQuotation.validUntil;
      
      const validationResult = validateAMCQuotationData(sanitizedData);

      if (!validationResult.isValid) {
        const error = new AppError('Validation failed', 400);
        (error as any).errors = validationResult.errors;
        return next(error);
      }
    }

    // Calculate totals if items are provided (only for full updates)
    if (!isStatusOnlyUpdate && sanitizedData.items && sanitizedData.items.length > 0) {
      const calculationResult = QuotationService.calculateQuotationTotals(
        sanitizedData.items, 
        sanitizedData.serviceCharges || [], 
        sanitizedData.batteryBuyBack || undefined,
        sanitizedData.overallDiscount || 0
      );
      sanitizedData.subtotal = calculationResult.subtotal;
      sanitizedData.totalDiscount = calculationResult.totalDiscount;
      sanitizedData.overallDiscount = sanitizedData.overallDiscount || 0;
      sanitizedData.overallDiscountAmount = calculationResult.overallDiscountAmount;
      sanitizedData.totalTax = calculationResult.totalTax;
      sanitizedData.grandTotal = calculationResult.grandTotal;
      sanitizedData.roundOff = calculationResult.roundOff;
      sanitizedData.items = calculationResult.items;
      sanitizedData.serviceCharges = calculationResult.serviceCharges;
      sanitizedData.batteryBuyBack = calculationResult.batteryBuyBack;
    }

    // Handle advance payment calculations if advance amount is provided (only for full updates)
    if (!isStatusOnlyUpdate && sanitizedData.paidAmount !== undefined) {
      const totalAmount = sanitizedData.grandTotal || existingQuotation.grandTotal || 0;
      const advanceAmount = sanitizedData.paidAmount || 0;
      
      // Calculate remaining amount
      sanitizedData.remainingAmount = Math.max(0, totalAmount - advanceAmount);
      
      // Determine advance payment status
      if (advanceAmount === 0) {
        sanitizedData.paymentStatus = 'pending';
      } else if (advanceAmount >= totalAmount) {
        sanitizedData.paymentStatus = 'paid';
      } else {
        sanitizedData.paymentStatus = 'partial';
      }
      
      // Update status to 'sent' if it was 'draft' and advance payment is made
      if (existingQuotation.status === 'draft' && advanceAmount > 0) {
        sanitizedData.status = 'sent';
      }
    }

    // Update the quotation
    const updatedQuotation = await AMCQuotation.findByIdAndUpdate(
      req.params.id,
      sanitizedData,
      { new: true, runValidators: true }
    ).populate('location', 'name address type')
      .populate('assignedEngineer', 'firstName lastName email phone');

    if (!updatedQuotation) {
      return next(new AppError('Failed to update AMC quotation', 500));
    }

    console.log("Updated AMC quotation:", updatedQuotation);
    
    const response: APIResponse = {
      success: true,
      message: 'AMC quotation updated successfully',
      data: { quotation: updatedQuotation }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete an AMC quotation
// @route   DELETE /api/v1/amc-quotations/:id
// @access  Private
export const deleteAMCQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const quotation = await AMCQuotation.findById(id);
    if (!quotation) {
      return next(new AppError('AMC quotation not found', 404));
    }

    await AMCQuotation.findByIdAndDelete(id);

    const response: APIResponse = {
      success: true,
      message: 'AMC quotation deleted successfully'
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Update AMC quotation payment
// @route   PUT /api/v1/amc-quotations/:id/payment
// @access  Private
export const updateAMCQuotationPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { 
      paidAmount, 
      paymentMethod, 
      paymentMethodDetails,
      paymentDate, 
      notes 
    } = req.body;

    // Validate required fields
    if (paidAmount === undefined || paidAmount < 0) {
      return next(new AppError('Valid payment amount is required', 400));
    }

    if (!paymentMethod) {
      return next(new AppError('Payment method is required', 400));
    }

    // Find the quotation
    const quotation = await AMCQuotation.findById(id);
    if (!quotation) {
      return next(new AppError('AMC quotation not found', 404));
    }

    // Calculate new total paid amount (existing + new payment)
    const existingPaidAmount = quotation.paidAmount || 0;
    const newTotalPaidAmount = existingPaidAmount + paidAmount;
    
    // Calculate remaining amount
    const totalAmount = quotation.grandTotal || 0;
    const newRemainingAmount = Math.max(0, totalAmount - newTotalPaidAmount);

    // Determine payment status
    let newPaymentStatus: 'pending' | 'partial' | 'paid' | 'gst_pending';
    if (newTotalPaidAmount === 0) {
      newPaymentStatus = 'pending';
    } else if (newTotalPaidAmount >= totalAmount) {
      newPaymentStatus = 'paid';
    } else {
      newPaymentStatus = 'partial';
    }

    // Prepare update data
    const updateData: any = {
      paidAmount: newTotalPaidAmount,
      remainingAmount: newRemainingAmount,
      paymentStatus: newPaymentStatus,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      paymentMethod,
      notes: notes || quotation.notes,
      ...(quotation.status === 'draft' && newTotalPaidAmount > 0 && { status: 'sent' })
    };

    // Add payment method details if provided
    if (paymentMethodDetails) {
      updateData.paymentMethodDetails = paymentMethodDetails;
    }

    // Update the quotation
    const updatedQuotation = await AMCQuotation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    const response: APIResponse = {
      success: true,
      message: 'AMC quotation payment updated successfully',
      data: {
        quotation: updatedQuotation,
        newPaymentAmount: paidAmount,
        totalPaidAmount: newTotalPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get AMC quotation statistics
// @route   GET /api/v1/amc-quotations/stats
// @access  Private
export const getAMCQuotationStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalQuotations,
      sentQuotations,
      acceptedQuotations,
      rejectedQuotations,
      totalValue,
      amcCount,
      camcCount
    ] = await Promise.all([
      AMCQuotation.countDocuments(),
      AMCQuotation.countDocuments({ status: 'sent' }),
      AMCQuotation.countDocuments({ status: 'accepted' }),
      AMCQuotation.countDocuments({ status: 'rejected' }),
      AMCQuotation.aggregate([
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      AMCQuotation.countDocuments({ amcType: 'AMC' }),
      AMCQuotation.countDocuments({ amcType: 'CAMC' })
    ]);

    const response: APIResponse = {
      success: true,
      message: 'AMC quotation statistics retrieved successfully',
      data: {
        totalQuotations,
        sentQuotations,
        acceptedQuotations,
        rejectedQuotations,
        quotationValue: totalValue[0]?.total || 0,
        amcCount,
        camcCount
      }
    };

    console.log('AMC Quotation stats response:', response.data);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Helper functions for validation and sanitization
const sanitizeAMCQuotationData = (data: any): any => {
  const sanitized = {
    ...data,
    customer: data.customer ? {
      _id: data.customer._id || undefined,
      name: String(data.customer.name || '').trim(),
      email: String(data.customer.email || '').trim(),
      phone: String(data.customer.phone || '').trim(),
      pan: String(data.customer.pan || '').trim()
    } : undefined,
    billToAddress: data.billToAddress ? {
      address: String(data.billToAddress.address || '').trim(),
      state: String(data.billToAddress.state || '').trim(),
      district: String(data.billToAddress.district || '').trim(),
      pincode: String(data.billToAddress.pincode || '').trim(),
      addressId: data.billToAddress.addressId,
      gstNumber: String(data.billToAddress.gstNumber || '').trim()
    } : undefined,
    shipToAddress: data.shipToAddress ? {
      address: String(data.shipToAddress.address || '').trim(),
      state: String(data.shipToAddress.state || '').trim(),
      district: String(data.shipToAddress.district || '').trim(),
      pincode: String(data.shipToAddress.pincode || '').trim(),
      addressId: data.shipToAddress.addressId,
      gstNumber: String(data.shipToAddress.gstNumber || '').trim()
    } : undefined,
    company: data.company ? {
      name: String(data.company.name || '').trim(),
      address: String(data.company.address || '').trim(),
      phone: String(data.company.phone || '').trim(),
      email: String(data.company.email || '').trim(),
      pan: String(data.company.pan || '').trim(),
      bankDetails: data.company.bankDetails
    } : undefined,
    location: data.location && data.location.trim() ? data.location.trim() : undefined,
    // AMC-specific fields
    amcType: data.amcType || 'AMC',
    contractDuration: Number(data.contractDuration) || 12,
    contractStartDate: data.contractStartDate ? new Date(data.contractStartDate) : undefined,
    contractEndDate: data.contractEndDate ? new Date(data.contractEndDate) : undefined,
    billingCycle: data.billingCycle || 'yearly',
    numberOfVisits: Number(data.numberOfVisits) || 12,
    numberOfOilServices: Number(data.numberOfOilServices) || 4,
    responseTime: Number(data.responseTime) || 24,
    coverageArea: String(data.coverageArea || '').trim(),
    emergencyContactHours: String(data.emergencyContactHours || '24/7').trim(),
    exclusions: Array.isArray(data.exclusions) ? data.exclusions.map((ex: any) => String(ex).trim()) : [],
    performanceMetrics: data.performanceMetrics ? {
      avgResponseTime: Number(data.performanceMetrics.avgResponseTime) || 4,
      customerSatisfaction: Number(data.performanceMetrics.customerSatisfaction) || 95,
      issueResolutionRate: Number(data.performanceMetrics.issueResolutionRate) || 98
    } : undefined,
    warrantyTerms: String(data.warrantyTerms || '').trim(),
    paymentTerms: String(data.paymentTerms || '').trim(),
    renewalTerms: String(data.renewalTerms || '').trim(),
    discountPercentage: Number(data.discountPercentage) || 0,
    // AMC Offer specific fields
    offerItems: Array.isArray(data.offerItems) ? data.offerItems.map((item: any) => ({
      make: String(item.make || '').trim(),
      engineSlNo: String(item.engineSlNo || '').trim(),
      dgRatingKVA: Number(item.dgRatingKVA) || 0,
      typeOfVisits: String(item.typeOfVisits || '').trim(),
      qty: Number(item.qty) || 1,
      amcCostPerDG: Number(item.amcCostPerDG) || 0,
      totalAMCAmountPerDG: Number(item.totalAMCAmountPerDG) || 0,
      gst18: Number(item.gst18) || 0,
      totalAMCCost: Number(item.totalAMCCost) || 0
    })) : [],
    sparesItems: Array.isArray(data.sparesItems) ? data.sparesItems.map((item: any) => ({
      srNo: Number(item.srNo) || 0,
      partNo: String(item.partNo || '').trim(),
      description: String(item.description || '').trim(),
      hsnCode: String(item.hsnCode || '').trim(),
      qty: Number(item.qty) || 1,
      productId: item.productId || undefined,
      uom: String(item.uom || 'nos').trim(),
      unitPrice: Number(item.unitPrice) || 0,
      gstRate: Number(item.gstRate) || 0,
      discount: Number(item.discount) || 0,
      discountedAmount: Number(item.discountedAmount) || 0,
      taxAmount: Number(item.taxAmount) || 0,
      totalPrice: Number(item.totalPrice) || 0,
      availableQuantity: Number(item.availableQuantity) || 0
    })) : [],
    selectedCustomerDG: data.selectedCustomerDG || null,
    refOfQuote: String(data.refOfQuote || '').trim(),
    paymentTermsText: String(data.paymentTermsText || '').trim(),
    validityText: String(data.validityText || '').trim(),
    amcPeriodFrom: data.amcPeriodFrom ? new Date(data.amcPeriodFrom) : undefined,
    amcPeriodTo: data.amcPeriodTo ? new Date(data.amcPeriodTo) : undefined,
    gstIncluded: Boolean(data.gstIncluded),
    // Standard quotation fields
    items: Array.isArray(data.items) ? data.items.map((item: any) => ({
      product: String(item.product || '').trim(),
      description: String(item.description || '').trim(),
      hsnCode: String(item.hsnCode || '').trim(),
      hsnNumber: String(item.hsnNumber || '').trim(),
      partNo: String(item.partNo || '').trim(),
      quantity: Number(item.quantity) || 0,
      uom: String(item.uom || 'nos').trim(),
      unitPrice: Number(item.unitPrice) || 0,
      discount: Number(item.discount) || 0,
      taxRate: Number(item.taxRate) || 0
    })) : [],
    serviceCharges: Array.isArray(data.serviceCharges) ? data.serviceCharges.map((service: any) => ({
      description: String(service.description || '').trim(),
      hsnNumber: String(service.hsnNumber || '').trim(),
      quantity: Number(service.quantity) || 1,
      unitPrice: Number(service.unitPrice) || 0,
      discount: Number(service.discount) || 0,
      taxRate: Number(service.taxRate) || 18,
      uom: String(service.uom || 'nos').trim()
    })) : [],
    batteryBuyBack: data.batteryBuyBack ? {
      description: String(data.batteryBuyBack.description || 'Battery Buy Back').trim(),
      hsnNumber: String(data.batteryBuyBack.hsnNumber || '').trim(),
      quantity: Number(data.batteryBuyBack.quantity) || 0,
      unitPrice: Number(data.batteryBuyBack.unitPrice) || 0,
      discount: Number(data.batteryBuyBack.discount) || 0,
      taxRate: Number(data.batteryBuyBack.taxRate) || 0,
      uom: String(data.batteryBuyBack.uom || 'nos').trim()
    } : undefined,
    notes: String(data.notes || '').trim(),
    terms: String(data.terms || '').trim(),
    assignedEngineer: data.assignedEngineer || undefined,
    overallDiscount: Number(data.overallDiscount) || 0
  };
  
  return sanitized;
};

const validateAMCQuotationData = (data: any): { isValid: boolean; errors: any[] } => {
  const errors: any[] = [];

  // Customer validation
  if (!data.customer) {
    errors.push({ field: 'customer', message: 'Customer information is required' });
  } else {
    if (!data.customer.name || (typeof data.customer.name === 'string' && !data.customer.name.trim())) {
      errors.push({ field: 'customer.name', message: 'Customer name is required' });
    }
  }

  // AMC-specific validation
  if (!data.amcType || !['AMC', 'CAMC'].includes(data.amcType)) {
    errors.push({ field: 'amcType', message: 'AMC type must be either AMC or CAMC' });
  }

  if (!data.contractDuration || data.contractDuration <= 0) {
    errors.push({ field: 'contractDuration', message: 'Contract duration must be greater than 0' });
  }

  if (!data.contractStartDate) {
    errors.push({ field: 'contractStartDate', message: 'Contract start date is required' });
  }

  if (!data.contractEndDate) {
    errors.push({ field: 'contractEndDate', message: 'Contract end date is required' });
  }

  if (!data.billingCycle || !['monthly', 'quarterly', 'half-yearly', 'yearly'].includes(data.billingCycle)) {
    errors.push({ field: 'billingCycle', message: 'Invalid billing cycle' });
  }

  // Offer items validation
  if (!data.offerItems || data.offerItems.length === 0) {
    errors.push({ field: 'offerItems', message: 'At least one offer item is required' });
  } else {
    data.offerItems.forEach((item: any, index: number) => {
      if (!item.make || (typeof item.make === 'string' && !item.make.trim())) {
        errors.push({ field: `offerItems[${index}].make`, message: 'Make is required' });
      }
      if (!item.engineSlNo || (typeof item.engineSlNo === 'string' && !item.engineSlNo.trim())) {
        errors.push({ field: `offerItems[${index}].engineSlNo`, message: 'Engine serial number is required' });
      }
      if (!isValidNumber(item.dgRatingKVA) || item.dgRatingKVA <= 0) {
        errors.push({ field: `offerItems[${index}].dgRatingKVA`, message: 'DG rating must be greater than 0' });
      }
      if (!item.typeOfVisits || (typeof item.typeOfVisits === 'string' && !item.typeOfVisits.trim())) {
        errors.push({ field: `offerItems[${index}].typeOfVisits`, message: 'Type of visits is required' });
      }
      if (!isValidNumber(item.qty) || item.qty <= 0) {
        errors.push({ field: `offerItems[${index}].qty`, message: 'Quantity must be greater than 0' });
      }
      if (!isValidNumber(item.amcCostPerDG) || item.amcCostPerDG < 0) {
        errors.push({ field: `offerItems[${index}].amcCostPerDG`, message: 'AMC cost per DG must be non-negative' });
      }
    });
  }

  // Spares items validation (only for CAMC)
  if (data.amcType === 'CAMC' && data.sparesItems && data.sparesItems.length > 0) {
    data.sparesItems.forEach((item: any, index: number) => {
      if (!item.partNo || (typeof item.partNo === 'string' && !item.partNo.trim())) {
        errors.push({ field: `sparesItems[${index}].partNo`, message: 'Part number is required' });
      }
      if (!item.description || (typeof item.description === 'string' && !item.description.trim())) {
        errors.push({ field: `sparesItems[${index}].description`, message: 'Description is required' });
      }
      if (!item.hsnCode || (typeof item.hsnCode === 'string' && !item.hsnCode.trim())) {
        errors.push({ field: `sparesItems[${index}].hsnCode`, message: 'HSN code is required' });
      }
      if (!isValidNumber(item.qty) || item.qty <= 0) {
        errors.push({ field: `sparesItems[${index}].qty`, message: 'Quantity must be greater than 0' });
      }
    });
  }

  // Standard quotation items validation (optional)
  if (data.items && data.items.length > 0) {
    data.items.forEach((item: any, index: number) => {
      if (!item.product || (typeof item.product === 'string' && !item.product.trim())) {
        errors.push({ field: `items[${index}].product`, message: 'Product is required' });
      }
      if (!isValidNumber(item.unitPrice) || item.unitPrice < 0) {
        errors.push({ field: `items[${index}].unitPrice`, message: 'Unit price must be non-negative' });
      }
      if (!isValidNumber(item.discount) || item.discount < 0 || item.discount > 100) {
        errors.push({ field: `items[${index}].discount`, message: 'Discount must be between 0 and 100%' });
      }
      if (!isValidNumber(item.taxRate) || item.taxRate < 0 || item.taxRate > 100) {
        errors.push({ field: `items[${index}].taxRate`, message: 'Tax rate must be between 0 and 100%' });
      }
      if (!item.uom || (typeof item.uom === 'string' && !item.uom.trim())) {
        errors.push({ field: `items[${index}].uom`, message: 'Unit of measure is required' });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Validation helper functions
const isValidNumber = (value: any): boolean => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};
