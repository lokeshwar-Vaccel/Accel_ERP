import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { AMCQuotation, IAMCQuotation } from '../models/AMCQuotation';
import { generateReferenceId } from '../utils/generateReferenceId';
import { Customer } from '../models/Customer';
import { QuotationService } from '../services/quotationService';
import { sendQuotationEmail as sendQuotationEmailViaNodemailer } from '../utils/nodemailer';

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

    // Process quotations to merge customer data properly
    const processedQuotations = await Promise.all(quotations.map(async (quotation) => {
      const quotationObj = quotation.toObject();
      
      // If customer has _id, fetch the full customer data from Customer collection
      if (quotationObj.customer && typeof quotationObj.customer === 'object' && quotationObj.customer._id) {
        try {
          const fullCustomer = await Customer.findById(quotationObj.customer._id).select('name panNumber addresses');
          if (fullCustomer) {
            // Get primary address email and phone
            const primaryAddress = fullCustomer.addresses?.find(addr => addr.isPrimary);
            const primaryEmail = primaryAddress?.email || '';
            const primaryPhone = primaryAddress?.phone || '';
            
            quotationObj.customer = {
              _id: (fullCustomer._id as any).toString(),
              name: fullCustomer.name || quotationObj.customer.name,
              email: primaryEmail || quotationObj.customer.email,
              phone: primaryPhone || quotationObj.customer.phone,
              pan: fullCustomer.panNumber || quotationObj.customer.pan,
              addresses: (fullCustomer.addresses || []) as any[]
            };
          }
        } catch (error) {
          console.error('Error fetching customer data:', error);
          // Fallback to existing customer data with empty addresses
          quotationObj.customer.addresses = [];
        }
      }
      
      return quotationObj;
    }));

    // Debug: Log customer data to check addresses population
    if (processedQuotations.length > 0) {
      console.log('Sample customer data:', JSON.stringify(processedQuotations[0].customer, null, 2));
    }

    const response: APIResponse = {
      success: true,
      message: 'AMC quotations retrieved successfully',
      data: processedQuotations,
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

    // Process quotation to merge customer data properly
    const quotationObj = quotation.toObject();
    
    // If customer has _id, fetch the full customer data from Customer collection
    if (quotationObj.customer && typeof quotationObj.customer === 'object' && quotationObj.customer._id) {
      try {
        const fullCustomer = await Customer.findById(quotationObj.customer._id).select('name panNumber addresses');
        if (fullCustomer) {
          // Get primary address email and phone
          const primaryAddress = fullCustomer.addresses?.find(addr => addr.isPrimary);
          const primaryEmail = primaryAddress?.email || '';
          const primaryPhone = primaryAddress?.phone || '';
          
          quotationObj.customer = {
            _id: (fullCustomer._id as any).toString(),
            name: fullCustomer.name || quotationObj.customer.name,
            email: primaryEmail || quotationObj.customer.email,
            phone: primaryPhone || quotationObj.customer.phone,
            pan: fullCustomer.panNumber || quotationObj.customer.pan,
            addresses: (fullCustomer.addresses || []) as any[]
          };
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
        // Fallback to existing customer data with empty addresses
        quotationObj.customer.addresses = [];
      }
    }

    const response: APIResponse = {
      success: true,
      message: 'AMC quotation retrieved successfully',
      data: quotationObj
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

    // Step 6: Calculate AMC financial details from offerItems
    let amcSubtotal = 0;
    let amcTotalTax = 0;
    let amcGrandTotal = 0;

    if (sanitizedData.offerItems && sanitizedData.offerItems.length > 0) {
      const gstIncluded = sanitizedData.gstIncluded !== false; // Default to true if not specified
      
      sanitizedData.offerItems.forEach((item: any) => {
        const qty = Number(item.qty) || 0;
        const costPerDG = Number(item.amcCostPerDG) || 0;
        const itemSubtotal = qty * costPerDG;
        
        let itemTax = 0;
        let itemTotal = itemSubtotal;
        
        if (gstIncluded) {
          // GST is included in the cost per DG
          itemTax = itemSubtotal * 0.18; // 18% GST
          itemTotal = itemSubtotal + itemTax;
        } else {
          // GST is not included, so the cost per DG is the final amount
          itemTotal = itemSubtotal;
        }

        amcSubtotal += itemSubtotal;
        amcTotalTax += itemTax;
        amcGrandTotal += itemTotal;
      });
    }

    // Round to 2 decimal places
    amcSubtotal = Math.round(amcSubtotal * 100) / 100;
    amcTotalTax = Math.round(amcTotalTax * 100) / 100;
    amcGrandTotal = Math.round(amcGrandTotal * 100) / 100;

    console.log("AMC Calculation result:", { amcSubtotal, amcTotalTax, amcGrandTotal });
    
    // Step 7: Prepare final quotation data
    const quotationData = {
      ...sanitizedData,
      quotationType: 'amc',
      subtotal: amcSubtotal,
      totalDiscount: 0, // AMC doesn't use item-level discounts
      overallDiscount: 0,
      overallDiscountAmount: 0,
      totalTax: amcTotalTax,
      grandTotal: amcGrandTotal,
      roundOff: 0,
      // Set default payment values
      paidAmount: sanitizedData.paidAmount || 0,
      remainingAmount: amcGrandTotal - (sanitizedData.paidAmount || 0),
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

    // Calculate AMC totals from offerItems (only for full updates)
    if (!isStatusOnlyUpdate && sanitizedData.offerItems && sanitizedData.offerItems.length > 0) {
      let amcSubtotal = 0;
      let amcTotalTax = 0;
      let amcGrandTotal = 0;

      const gstIncluded = sanitizedData.gstIncluded !== false; // Default to true if not specified
      
      sanitizedData.offerItems.forEach((item: any) => {
        const qty = Number(item.qty) || 0;
        const costPerDG = Number(item.amcCostPerDG) || 0;
        const itemSubtotal = qty * costPerDG;
        
        let itemTax = 0;
        let itemTotal = itemSubtotal;
        
        if (gstIncluded) {
          // GST is included in the cost per DG
          itemTax = itemSubtotal * 0.18; // 18% GST
          itemTotal = itemSubtotal + itemTax;
        } else {
          // GST is not included, so the cost per DG is the final amount
          itemTotal = itemSubtotal;
        }

        amcSubtotal += itemSubtotal;
        amcTotalTax += itemTax;
        amcGrandTotal += itemTotal;
      });

      // Round to 2 decimal places
      sanitizedData.subtotal = Math.round(amcSubtotal * 100) / 100;
      sanitizedData.totalTax = Math.round(amcTotalTax * 100) / 100;
      sanitizedData.grandTotal = Math.round(amcGrandTotal * 100) / 100;
      sanitizedData.totalDiscount = 0;
      sanitizedData.overallDiscount = 0;
      sanitizedData.overallDiscountAmount = 0;
      sanitizedData.roundOff = 0;
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
      dgRatingKVA: item.dgRatingKVA !== undefined ? Number(item.dgRatingKVA) : undefined,
      typeOfVisits: item.typeOfVisits !== undefined ? Number(item.typeOfVisits) : undefined,
      qty: item.qty !== undefined ? Number(item.qty) : undefined,
      amcCostPerDG: item.amcCostPerDG !== undefined ? Number(item.amcCostPerDG) : undefined,
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
    selectedAddressId: data.selectedAddressId ? String(data.selectedAddressId).trim() : undefined,
    billToAddressId: data.billToAddressId ? String(data.billToAddressId).trim() : undefined,
    shipToAddressId: data.shipToAddressId ? String(data.shipToAddressId).trim() : undefined,
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
      if (item.dgRatingKVA !== undefined && (!isValidNumber(item.dgRatingKVA) || item.dgRatingKVA <= 0)) {
        errors.push({ field: `offerItems[${index}].dgRatingKVA`, message: 'DG rating must be greater than 0' });
      }
      if (item.typeOfVisits !== undefined && (!isValidNumber(item.typeOfVisits) || item.typeOfVisits <= 0)) {
        errors.push({ field: `offerItems[${index}].typeOfVisits`, message: 'No of visits must be greater than 0' });
      }
      if (item.qty !== undefined && (!isValidNumber(item.qty) || item.qty <= 0)) {
        errors.push({ field: `offerItems[${index}].qty`, message: 'Quantity must be greater than 0' });
      }
      if (item.amcCostPerDG !== undefined && (!isValidNumber(item.amcCostPerDG) || item.amcCostPerDG < 0)) {
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

// @desc    Send AMC quotation email to customer
// @route   POST /api/v1/amc-quotations/:id/send-email
// @access  Private
export const sendAMCQuotationEmailToCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Find the AMC quotation
    const quotation = await AMCQuotation.findById(id)
      .populate('customer', 'name email phone addresses');

    if (!quotation) {
      return next(new AppError('AMC Quotation not found', 404));
    }

    // Process quotation to merge customer data properly
    const quotationObj = quotation.toObject();
    
    // If customer has _id, fetch the full customer data from Customer collection
    if (quotationObj.customer && typeof quotationObj.customer === 'object' && quotationObj.customer._id) {
      try {
        const fullCustomer = await Customer.findById(quotationObj.customer._id).select('name panNumber addresses');
        if (fullCustomer) {
          // Get primary address email and phone
          const primaryAddress = fullCustomer.addresses?.find(addr => addr.isPrimary);
          const primaryEmail = primaryAddress?.email || '';
          const primaryPhone = primaryAddress?.phone || '';
          
          quotationObj.customer = {
            _id: (fullCustomer._id as any).toString(),
            name: fullCustomer.name || quotationObj.customer.name,
            email: primaryEmail || quotationObj.customer.email,
            phone: primaryPhone || quotationObj.customer.phone,
            pan: fullCustomer.panNumber || quotationObj.customer.pan,
            addresses: (fullCustomer.addresses || []) as any[]
          };
        }
      } catch (error) {
        console.error('Error fetching customer data:', error);
        // Fallback to existing customer data with empty addresses
        quotationObj.customer.addresses = [];
      }
    }

    // Get customer emails (both primary address and main email)
    const customer = quotationObj.customer as any;
    const emailsToSend: string[] = [];

    // Get primary address email
    if (customer.addresses && customer.addresses.length > 0) {
      const primaryAddress = customer.addresses.find((addr: any) => addr.isPrimary);
      if (primaryAddress && primaryAddress.email) {
        emailsToSend.push(primaryAddress.email);
      }
    }

    // Get customer's main email (if different from primary address email)
    if (customer.email && !emailsToSend.includes(customer.email)) {
      emailsToSend.push(customer.email);
    }

    if (emailsToSend.length === 0) {
      const response: APIResponse = {
        success: false,
        message: 'Customer email not available for this AMC quotation',
        data: null
      };
      res.status(400).json(response);
      return;
    }

    // Create email subject
    const subject = `AMC Quotation ${quotationObj.quotationNumber} - Sun Power Services`;

    // Create HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AMC Quotation ${quotationObj.quotationNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .quotation-details {
              background-color: #ffffff;
              border: 1px solid #dee2e6;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 20px;
            }
            .footer {
              background-color: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              font-size: 14px;
              color: #6c757d;
            }
            .highlight {
              color: #007bff;
              font-weight: bold;
            }
            .amount {
              color: #28a745;
              font-weight: bold;
              font-size: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            th, td {
              border: 1px solid #dee2e6;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f8f9fa;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>AMC Quotation</h1>
            <p>Dear ${customer.name},</p>
            <p>Thank you for your interest in our AMC services. Please find below the details of your AMC quotation.</p>
          </div>

          <div class="quotation-details">
            <h2>Quotation Details</h2>
            <table>
              <tr>
                <td><strong>Quotation Number:</strong></td>
                <td class="highlight">${quotationObj.quotationNumber}</td>
              </tr>
              <tr>
                <td><strong>Issue Date:</strong></td>
                <td>${new Date(quotationObj.issueDate).toLocaleDateString('en-IN')}</td>
              </tr>
              <tr>
                <td><strong>Valid Until:</strong></td>
                <td>${new Date(quotationObj.validUntil).toLocaleDateString('en-IN')}</td>
              </tr>
              <tr>
                <td><strong>AMC Type:</strong></td>
                <td>${quotationObj.amcType}</td>
              </tr>
              <tr>
                <td><strong>Contract Duration:</strong></td>
                <td>${quotationObj.contractDuration} months</td>
              </tr>
              <tr>
                <td><strong>Billing Cycle:</strong></td>
                <td>${quotationObj.billingCycle}</td>
              </tr>
              <tr>
                <td><strong>Grand Total:</strong></td>
                <td class="amount">₹${quotationObj.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}</td>
              </tr>
            </table>

            ${quotationObj.offerItems && quotation.offerItems.length > 0 ? `
              <h3>AMC Offer Items</h3>
              <table>
                <thead>
                  <tr>
                    <th>Make</th>
                    <th>Engine S/N</th>
                    <th>DG Rating (KVA)</th>
                    <th>Type of Visits</th>
                    <th>Qty</th>
                    <th>AMC Cost per DG</th>
                    <th>Total AMC Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${quotationObj.offerItems.map((item: any) => `
                    <tr>
                      <td>${item.make || 'N/A'}</td>
                      <td>${item.engineSlNo || 'N/A'}</td>
                      <td>${item.dgRatingKVA || 'N/A'}</td>
                      <td>${item.typeOfVisits || 'N/A'}</td>
                      <td>${item.qty || 0}</td>
                      <td>₹${(item.amcCostPerDG || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td>₹${(item.totalAMCAmountPerDG || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            ${quotationObj.sparesItems && quotation.sparesItems.length > 0 ? `
              <h3>Spares Items</h3>
              <table>
                <thead>
                  <tr>
                    <th>Part No</th>
                    <th>Description</th>
                    <th>HSN Code</th>
                    <th>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  ${quotationObj.sparesItems.map((item: any) => `
                    <tr>
                      <td>${item.partNo || 'N/A'}</td>
                      <td>${item.description || 'N/A'}</td>
                      <td>${item.hsnCode || 'N/A'}</td>
                      <td>${item.qty || 0}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : ''}

            ${quotationObj.notes ? `
              <h3>Notes</h3>
              <p>${quotationObj.notes}</p>
            ` : ''}

            ${quotationObj.terms ? `
              <h3>Terms & Conditions</h3>
              <p>${quotationObj.terms}</p>
            ` : ''}
          </div>

          <div class="footer">
            <p>This is an automated email. Please do not reply to this email.</p>
            <p>For any queries, please contact us at our office.</p>
            <p>© ${new Date().getFullYear()} Sun Power Services. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    // Send the email to all recipients
    const emailPromises = emailsToSend.map(email => 
      sendQuotationEmailViaNodemailer(email, subject, htmlContent)
    );

    await Promise.all(emailPromises);

    // Log the email sending attempt
    console.log(`Attempting to send AMC quotation email to ${emailsToSend.join(', ')} for quotation ${quotationObj.quotationNumber}`);

    // Always update quotation status to 'sent' after sending email
    await AMCQuotation.findByIdAndUpdate(id, { status: 'sent' });

    // Log the email sending
    console.log(`AMC quotation email sent successfully to ${emailsToSend.join(', ')} for quotation ${quotationObj.quotationNumber}`);

    const response: APIResponse = {
      success: true,
      message: `AMC quotation email sent successfully to ${emailsToSend.join(', ')}`,
      data: {
        quotationNumber: quotationObj.quotationNumber,
        customerEmails: emailsToSend,
        status: 'sent'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error sending AMC quotation email:', error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to send AMC quotation email';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required SMTP environment variables')) {
        errorMessage = 'Email service configuration is incomplete. Please contact administrator.';
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('SMTP connection failed')) {
        errorMessage = 'Email service is temporarily unavailable. Please check SMTP configuration.';
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('Missing required email parameters')) {
        errorMessage = 'Invalid email data provided.';
        statusCode = 400; // Bad Request
      } else if (error.message.includes('Email sending failed')) {
        errorMessage = 'Failed to send email. Please try again.';
        statusCode = 500; // Internal Server Error
      } else if (error.message.includes('Authentication failed')) {
        errorMessage = 'Email authentication failed. Please check SMTP credentials.';
        statusCode = 503; // Service Unavailable
      } else {
        errorMessage = `Email error: ${error.message}`;
        statusCode = 500; // Internal Server Error
      }
    }

    const response: APIResponse = {
      success: false,
      message: errorMessage,
      data: null
    };

    res.status(statusCode).json(response);
  }
};

// @desc    Update AMC quotation status
// @route   PUT /api/v1/amc-quotations/:id/status
// @access  Private
export const updateAMCQuotationStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['draft', 'sent', 'accepted', 'rejected'];
    if (!validStatuses.includes(status)) {
      return next(new AppError('Invalid status. Must be one of: draft, sent, accepted, rejected', 400));
    }

    // Find and update the quotation
    const quotation = await AMCQuotation.findByIdAndUpdate(
      id,
      { 
        status,
        ...(notes && { notes })
      },
      { new: true }
    ).populate('customer', 'name email phone addresses');

    if (!quotation) {
      return next(new AppError('AMC Quotation not found', 404));
    }

    const response: APIResponse = {
      success: true,
      message: 'AMC quotation status updated successfully',
      data: quotation
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error updating AMC quotation status:', error);
    next(new AppError('Failed to update AMC quotation status', 500));
  }
};
