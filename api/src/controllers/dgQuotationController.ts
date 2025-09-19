import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../errors/AppError';
import { DGQuotation } from '../models/DGQuotation';
import { DGEnquiry } from '../models/DGEnquiry';
import { Product } from '../models/Product';
import { generateReferenceId } from '../utils/generateReferenceId';
import { 
  createDGQuotationSchema, 
  updateDGQuotationSchema, 
  getDGQuotationsQuerySchema 
} from '../schemas/dgQuotationSchemas';

// Helper function to calculate quotation totals
const calculateQuotationTotals = (items: any[], services: any[] = [], globalTaxRate: string = '18') => {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  const taxRatePercent = parseFloat(globalTaxRate);

  // Calculate items totals
  items.forEach(item => {
    const itemTotal = item.quantity * item.unitPrice;
    const discountAmount = (itemTotal * (item.discount || 0)) / 100;
    const discountedAmount = itemTotal - discountAmount;
    const taxAmount = (discountedAmount * taxRatePercent) / 100;
    
    subtotal += itemTotal;
    totalDiscount += discountAmount;
    totalTax += taxAmount;
  });

  // Calculate services totals
  services.forEach(service => {
    const serviceTotal = service.quantity * service.unitPrice;
    const discountAmount = (serviceTotal * (service.discount || 0)) / 100;
    const discountedAmount = serviceTotal - discountAmount;
    const taxAmount = (discountedAmount * taxRatePercent) / 100;
    
    subtotal += serviceTotal;
    totalDiscount += discountAmount;
    totalTax += taxAmount;
  });

  const grandTotal = subtotal - totalDiscount + totalTax;
  const roundOff = Math.round(grandTotal) - grandTotal;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100,
    roundOff: Math.round(roundOff * 100) / 100
  };
};

// Create DG Quotation
export const createDGQuotation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Convert string dates to Date objects before validation
    const requestData = { ...req.body };
    if (requestData.enquiryDetails) {
      if (requestData.enquiryDetails.enquiryDate && typeof requestData.enquiryDetails.enquiryDate === 'string' && requestData.enquiryDetails.enquiryDate.trim() !== '') {
        requestData.enquiryDetails.enquiryDate = new Date(requestData.enquiryDetails.enquiryDate);
      }
      if (requestData.enquiryDetails.plannedFollowUpDate && typeof requestData.enquiryDetails.plannedFollowUpDate === 'string' && requestData.enquiryDetails.plannedFollowUpDate.trim() !== '') {
        requestData.enquiryDetails.plannedFollowUpDate = new Date(requestData.enquiryDetails.plannedFollowUpDate);
      }
    }

    // Validate request body
    const { error, value } = createDGQuotationSchema.validate(requestData);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const quotationData = value;

    // Check if quotation number already exists
    const existingQuotation = await DGQuotation.findOne({ 
      quotationNumber: quotationData.quotationNumber 
    });
    if (existingQuotation) {
      throw new AppError('Quotation number already exists', 400);
    }

    // Verify DG Enquiry exists if provided
    if (quotationData.dgEnquiry) {
      const dgEnquiry = await DGEnquiry.findById(quotationData.dgEnquiry);
      if (!dgEnquiry) {
        throw new AppError('DG Enquiry not found', 404);
      }
    }

    // Calculate totals - handle both items and dgItems for flexibility
    const items = quotationData.dgItems || quotationData.items || [];
    const totals = calculateQuotationTotals(items, quotationData.services, quotationData.taxRate);

    // Create quotation
    const quotation = new DGQuotation({
      ...quotationData,
      dgItems: items, // Ensure dgItems is set properly
      ...totals,
      createdBy: req.user?.id || 'system'
    });

    await quotation.save();

    // Populate related data
    await quotation.populate('dgEnquiry');

    res.status(201).json({
      success: true,
      data: quotation,
      message: 'DG Quotation created successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get DG Quotation by ID
export const getDGQuotationById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const quotation = await DGQuotation.findById(id)
      .populate('dgEnquiry')
      .populate('dgEnquiry.customer');

    if (!quotation) {
      throw new AppError('DG Quotation not found', 404);
    }

    res.status(200).json({
      success: true,
      data: quotation
    });
  } catch (error) {
    next(error);
  }
};

// Get all DG Quotations with pagination and filters
export const getAllDGQuotations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate query parameters
    const { error, value } = getDGQuotationsQuerySchema.validate(req.query);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const {
      page = 1,
      limit = 10,
      search,
      status,
      dgEnquiry,
      customerId,
      startDate,
      endDate,
      sortBy = 'issueDate',
      sortOrder = 'desc'
    } = value;

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (dgEnquiry) {
      filter.dgEnquiry = dgEnquiry;
    }

    if (customerId) {
      filter['customer._id'] = customerId;
    }

    if (startDate || endDate) {
      filter.issueDate = {};
      if (startDate) filter.issueDate.$gte = new Date(startDate);
      if (endDate) filter.issueDate.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sort: any = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const quotations = await DGQuotation.find(filter)
      .populate('dgEnquiry')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await DGQuotation.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: quotations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update DG Quotation
export const updateDGQuotation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Convert string dates to Date objects before validation
    const requestData = { ...req.body };
    if (requestData.enquiryDetails) {
      if (requestData.enquiryDetails.enquiryDate && typeof requestData.enquiryDetails.enquiryDate === 'string' && requestData.enquiryDetails.enquiryDate.trim() !== '') {
        requestData.enquiryDetails.enquiryDate = new Date(requestData.enquiryDetails.enquiryDate);
      }
      if (requestData.enquiryDetails.plannedFollowUpDate && typeof requestData.enquiryDetails.plannedFollowUpDate === 'string' && requestData.enquiryDetails.plannedFollowUpDate.trim() !== '') {
        requestData.enquiryDetails.plannedFollowUpDate = new Date(requestData.enquiryDetails.plannedFollowUpDate);
      }
    }

    // Validate request body
    const { error, value } = updateDGQuotationSchema.validate(requestData);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const updateData = value;

    // Check if quotation exists
    const existingQuotation = await DGQuotation.findById(id);
    if (!existingQuotation) {
      throw new AppError('DG Quotation not found', 404);
    }

    // Check if quotation number is being changed and if it already exists
    if (updateData.quotationNumber && 
        updateData.quotationNumber !== existingQuotation.quotationNumber) {
      const duplicateQuotation = await DGQuotation.findOne({ 
        quotationNumber: updateData.quotationNumber,
        _id: { $ne: id }
      });
      if (duplicateQuotation) {
        throw new AppError('Quotation number already exists', 400);
      }
    }

    // Calculate new totals if items or services are updated
    if (updateData.dgItems) {
      const items = updateData.dgItems || existingQuotation.dgItems;
      const totals = calculateQuotationTotals(items);
      updateData.subtotal = totals.subtotal;
      updateData.totalDiscount = totals.totalDiscount;
      updateData.totalTax = totals.totalTax;
      updateData.grandTotal = totals.grandTotal;
      updateData.roundOff = totals.roundOff;
    }

    // Update status-specific fields
    if (updateData.status === 'Sent' && existingQuotation.status !== 'Sent') {
      updateData.sentDate = new Date();
    } else if (updateData.status === 'Accepted' && existingQuotation.status !== 'Accepted') {
      updateData.acceptedDate = new Date();
    } else if (updateData.status === 'Rejected' && existingQuotation.status !== 'Rejected') {
      updateData.rejectedDate = new Date();
    }

    // Update quotation
    const updatedQuotation = await DGQuotation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('dgEnquiry');

    res.status(200).json({
      success: true,
      data: updatedQuotation,
      message: 'DG Quotation updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Delete DG Quotation
export const deleteDGQuotation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const quotation = await DGQuotation.findById(id);
    if (!quotation) {
      throw new AppError('DG Quotation not found', 404);
    }

    // Check if quotation can be deleted (only draft quotations)
    if (quotation.status !== 'Draft') {
      throw new AppError('Only draft quotations can be deleted', 400);
    }

    await DGQuotation.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'DG Quotation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get DG Quotation Statistics
export const getDGQuotationStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await DGQuotation.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          draft: {
            $sum: { $cond: [{ $eq: ['$status', 'Draft'] }, 1, 0] }
          },
          sent: {
            $sum: { $cond: [{ $eq: ['$status', 'Sent'] }, 1, 0] }
          },
          accepted: {
            $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'Rejected'] }, 1, 0] }
          },
          expired: {
            $sum: { $cond: [{ $eq: ['$status', 'Expired'] }, 1, 0] }
          },
          totalValue: { $sum: '$grandTotal' },
          averageValue: { $avg: '$grandTotal' }
        }
      }
    ]);

    // Monthly statistics for current year
    const currentYear = new Date().getFullYear();
    const monthlyStats = await DGQuotation.aggregate([
      {
        $match: {
          issueDate: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$issueDate' },
          count: { $sum: 1 },
          totalValue: { $sum: '$grandTotal' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overall: stats[0] || {
          total: 0,
          draft: 0,
          sent: 0,
          accepted: 0,
          rejected: 0,
          expired: 0,
          totalValue: 0,
          averageValue: 0
        },
        monthly: monthlyStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Generate quotation number
export const generateQuotationNumber = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const quotationNumber = await generateReferenceId('DGQTN');
    
    res.status(200).json({
      success: true,
      data: { quotationNumber }
    });
  } catch (error) {
    next(error);
  }
};

// Get quotation by DG Enquiry
export const getQuotationsByEnquiry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { enquiryId } = req.params;

    const quotations = await DGQuotation.find({ dgEnquiry: enquiryId })
      .populate('dgEnquiry')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: quotations
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
      if (!paymentMethodDetails.cheque?.chequeNumber) return 'Cheque number is required';
      if (!paymentMethodDetails.cheque?.bankName) return 'Bank name is required';
      if (!paymentMethodDetails.cheque?.issueDate) return 'Issue date is required';
      break;
    case 'bank_transfer':
      if (!paymentMethodDetails.bankTransfer?.bankName) return 'Bank name is required';
      if (!paymentMethodDetails.bankTransfer?.accountNumber) return 'Account number is required';
      if (!paymentMethodDetails.bankTransfer?.ifscCode) return 'IFSC code is required';
      if (!paymentMethodDetails.bankTransfer?.transactionId) return 'Transaction ID is required';
      if (!paymentMethodDetails.bankTransfer?.transferDate) return 'Transfer date is required';
      break;
    case 'upi':
      if (!paymentMethodDetails.upi?.upiId) return 'UPI ID is required';
      if (!paymentMethodDetails.upi?.transactionId) return 'Transaction ID is required';
      break;
    case 'card':
      if (!paymentMethodDetails.card?.cardType) return 'Card type is required';
      if (!paymentMethodDetails.card?.cardNetwork) return 'Card network is required';
      if (!paymentMethodDetails.card?.lastFourDigits) return 'Last 4 digits are required';
      if (!paymentMethodDetails.card?.transactionId) return 'Transaction ID is required';
      break;
    case 'other':
      if (!paymentMethodDetails.other?.methodName) return 'Method name is required';
      break;
  }
  return null;
};

// @desc    Update DG quotation payment
// @route   PUT /api/v1/dg-quotations/:id/payment
// @access  Private
export const updateDGQuotationPayment = async (
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

    // Find the DG quotation
    const dgQuotation = await DGQuotation.findById(id);
    if (!dgQuotation) {
      return next(new AppError('DG Quotation not found', 404));
    }

    // Calculate new total paid amount (existing + new payment)
    const existingPaidAmount = dgQuotation.paidAmount || 0;
    const newTotalPaidAmount = existingPaidAmount + paidAmount;
    
    // Calculate remaining amount
    const totalAmount = dgQuotation.grandTotal || 0;
    const newRemainingAmount = Math.max(0, totalAmount - newTotalPaidAmount);

    // Determine payment status
    let finalPaymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
    if (newPaymentStatus === 'gst_pending') {
      finalPaymentStatus = 'Partial'; // GST Pending is treated as Partial for quotations
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
      paymentStatus: finalPaymentStatus
    };

    // Update quotation
    const updatedQuotation = await DGQuotation.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('dgEnquiry');

    const response: APIResponse = {
      success: true,
      message: 'DG Quotation payment updated successfully',
      data: updatedQuotation
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 