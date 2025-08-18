import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { QuotationService } from '../services/quotationService';
import { Invoice } from '../models/Invoice';
import { Quotation, IPopulatedQuotation } from '../models/Quotation';
import { generateReferenceId } from '../utils/generateReferenceId';
import { Customer } from '../models/Customer';
import { DGEnquiry } from '../models/DGEnquiry';
import { sendQuotationEmail as sendQuotationEmailViaNodemailer } from '../utils/nodemailer';

// Helper function to create quotation data from image
const createQuotationFromImageData = () => {
  const issueDate = new Date('2025-05-19');
  const validUntil = new Date(issueDate);
  validUntil.setDate(validUntil.getDate() + 30);

  return {
    quotationNumber: 'SPS/SER/CHE/QTN/25-26',
    issueDate: issueDate,
    validUntil: validUntil,
    validityPeriod: 30,
    customer: {
      name: 'M/S.AU Small Finance',
      email: '',
      phone: '',
      address: 'Sewaartham Enterprises Pvt Ltd, 137, R.S. No. 247/2, Block No. 8, Triplicane Part II, Mylapore Taluk, Anna Salai, Mount Road Chennai- 600002',
      pan: ''
    },
    company: {
      name: 'Sun Power Services',
      address: 'Plot no 1, Phase 1, 4th Street, Annai velankani nagar, Madhanthapuram, porur, Chennai 600116',
      phone: '+91 9176660123',
      email: '24x7powerolservice@gmail.com',
      pan: '33BLFPS9951M1ZC'
    },
    items: [
      {
        product: '507338A',
        description: 'POWEROL SUPER PREMIUM ENGINE OIL',
        hsnCode: '27101980',
        quantity: 9.75,
        uom: 'Ltr',
        unitPrice: 274.58,
        discount: 5,
        discountedAmount: 133.86,
        taxRate: 18,
        taxAmount: 457.79,
        totalPrice: 3001.05
      },
      {
        product: 'SPS1',
        description: 'POWEROL SUPER PREMIUM COOLANT',
        hsnCode: '38119000',
        quantity: 1,
        uom: 'Ltr',
        unitPrice: 202.54,
        discount: 5,
        discountedAmount: 10.13,
        taxRate: 18,
        taxAmount: 34.63,
        totalPrice: 227.05
      },
      {
        product: '006010197H1',
        description: 'OIL FILTER 6 CYLINDER',
        hsnCode: '84212300',
        quantity: 1,
        uom: 'Nos',
        unitPrice: 408.47,
        discount: 5,
        discountedAmount: 20.42,
        taxRate: 18,
        taxAmount: 69.85,
        totalPrice: 457.90
      },
      {
        product: '006001918A91-PB',
        description: 'SERVICE KIT FOR ELEMENTS OF FUEL FILTER',
        hsnCode: '84212300',
        quantity: 1,
        uom: 'Nos',
        unitPrice: 235.59,
        discount: 5,
        discountedAmount: 11.78,
        taxRate: 18,
        taxAmount: 40.29,
        totalPrice: 264.10
      }
    ],
    subtotal: 3523.73,
    totalDiscount: 176.19,
    totalTax: 602.56,
    grandTotal: 3950.10,
    roundOff: 0,
    notes: 'DG Rating : 62.5Kva / Model : 4905GMA-C2\nSub : QUOTATION FOR SPARES OF YOUR 62.5KVA DG SET',
    terms: '1 Payment Terms: 100% advance payment alongwith PO.\n2 Ordering and Payment: In Favour of Sun Power Services.\n3 Delivery: With in One Month after your P.O.'
  };
};

// @desc    Create quotation from image data
// @route   POST /api/v1/quotations/from-image
// @access  Private
export const createQuotationFromImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("Creating quotation from image data");
    
    const quotationData = createQuotationFromImageData();
    const quotation = new Quotation(quotationData);
    await quotation.save();
    
    res.status(201).json({
      success: true,
      message: 'Quotation created successfully from image data',
      data: quotation
    });
  } catch (error) {
    console.error('Error creating quotation from image:', error);
    next(error);
  }
};

// @desc    Generate quotation from invoice
// @route   POST /api/v1/quotations/generate/:invoiceId
// @access  Private
export const generateQuotation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { 
      validityDays = 30,
      companyDetails,
      outputFormat = 'json' // json, html, pdf
    } = req.body;

    // Check if invoice exists
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Generate quotation
    const quotation = await QuotationService.generateQuotationFromInvoice(
      invoiceId,
      validityDays,
      companyDetails
    );

    // Handle different output formats
    let responseData: any = { quotation };

    switch (outputFormat) {
      case 'html':
        const html = await QuotationService.generateQuotationHTML(quotation);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
        return;

      case 'pdf':
        const pdfBuffer = await QuotationService.generateQuotationPDF(quotation);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Quotation-${quotation.quotationNumber}.pdf"`);
        res.send(pdfBuffer);
        return;

      case 'json':
      default:
        const response: APIResponse = {
          success: true,
          message: 'Quotation generated successfully',
          data: responseData
        };
        res.status(200).json(response);
        return;
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Get quotation preview (HTML)
// @route   GET /api/v1/quotations/preview/:invoiceId
// @access  Private
export const getQuotationPreview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { validityDays = 30 } = req.query;

    // Generate quotation
    const quotation = await QuotationService.generateQuotationFromInvoice(
      invoiceId,
      Number(validityDays)
    );

    // Generate HTML preview
    const html = await QuotationService.generateQuotationHTML(quotation);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
    return;
  } catch (error) {
    next(error);
  }
};

// @desc    Download quotation as PDF
// @route   GET /api/v1/quotations/download/:invoiceId
// @access  Private
export const downloadQuotationPDF = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const { validityDays = 30 } = req.query;

    const quotation = await QuotationService.generateQuotationFromInvoice(
      invoiceId,
      Number(validityDays)
    );
    const pdfBuffer = await QuotationService.generateQuotationPDF(quotation);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Quotation-${quotation.quotationNumber}.pdf"`);
    res.send(pdfBuffer);
    return;
  } catch (error) {
    next(error);
  }
}; 

// @desc    Get a single quotation by ID
// @route   GET /api/v1/quotations/:id
export const getQuotationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('location', 'name address type') // Populate location details
      .populate('assignedEngineer', 'firstName lastName email phone'); // Populate assigned engineer details
    if (!quotation) {
      res.status(404).json({ message: 'Quotation not found' });
      return;
    }
    res.json(quotation);
    return;
  } catch (error) {
    next(error);
  }
};

// @desc    Get multiple quotations with pagination
// @route   GET /api/v1/quotations
export const getQuotations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [quotations, total] = await Promise.all([
      Quotation.find()
        .populate('location', 'name address type') // populate location details
        .populate('customer', 'name email phone pan') // populate customer details
        .populate('assignedEngineer', 'firstName lastName email phone') // populate assigned engineer details
        .skip(skip)
        .limit(limit)
        .sort({ issueDate: -1 }),
      Quotation.countDocuments()
    ]);
    

    res.json({
      data: quotations,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new quotation
// @route   POST /api/v1/quotations
export const createQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("Creating quotation with data:", req.body);
    
    const data = req.body;

    // Step 1: Sanitize input data
    const sanitizedData = sanitizeQuotationData(data);
    
    // Step 2: Validate required fields
    const validationResult = validateQuotationData(sanitizedData);
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
        sanitizedData.quotationNumber = await generateReferenceId('quotation');
      } catch (error) {
        console.error('Error generating quotation number:', error);
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

    // Step 5: Calculate financial details
    const calculationResult = calculateQuotationTotals(sanitizedData.items, sanitizedData.overallDiscount || 0);
    
    // Step 6: Validate financial calculations
    if (calculationResult.grandTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quotation total must be greater than 0',
        errors: [{ field: 'grandTotal', message: 'Grand total must be greater than 0' }]
      });
    }

    // Step 7: Prepare final quotation data
    const quotationData = {
      ...sanitizedData,
      subtotal: calculationResult.subtotal,
      totalDiscount: calculationResult.totalDiscount,
      overallDiscount: sanitizedData.overallDiscount || 0,
      overallDiscountAmount: calculationResult.overallDiscountAmount,
      totalTax: calculationResult.totalTax,
      grandTotal: calculationResult.grandTotal,
      roundOff: calculationResult.roundOff,
      items: calculationResult.items,
      // Set default payment values
      paidAmount: sanitizedData.paidAmount || 0,
      remainingAmount: calculationResult.grandTotal - (sanitizedData.paidAmount || 0),
      paymentStatus: sanitizedData.paidAmount && sanitizedData.paidAmount > 0 ? 'partial' : 'pending',
      status: sanitizedData.status || 'draft'
    };

    // Step 8: Save to database
    const quotation = new Quotation(quotationData);
    await quotation.save();

    // Step 9: Populate location and assigned engineer, then return success response
    const populatedQuotation = await Quotation.findById(quotation._id)
      .populate('location', 'name address type')
      .populate('assignedEngineer', 'firstName lastName email phone');

    return res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: populatedQuotation
    });

  } catch (error) {
    console.error('Error creating quotation:', error);
    
    // Handle specific database errors
    if (typeof error === 'object' && error !== null && 'code' in error && (error as any).code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Quotation number already exists'
      });
    }
    return next(error);
  }
};

// @desc    Create a quotation for a DG Sales customer
// @route   POST /api/v1/quotations/dg-sales
// @access  Private
export const createDGSalesQuotation = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { customerId, dgEnquiryId, ...quotationData } = req.body;
    if (!customerId) {
      return next(new AppError('Customer ID is required', 400));
    }
    // Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return next(new AppError('Customer not found', 404));
    }
    // Optionally find DGEnquiry
    let dgEnquiry = null;
    if (dgEnquiryId) {
      dgEnquiry = await DGEnquiry.findById(dgEnquiryId);
      if (!dgEnquiry) {
        return next(new AppError('DG Enquiry not found', 404));
      }
    }
    // Prepare quotation
    const quotation = await Quotation.create({
      ...quotationData,
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        pan: '', // No panNumber or pan field in Customer, so use empty string
      },
      dgEnquiry: dgEnquiry ? dgEnquiry._id : undefined,
      createdBy: req.user?.id
    });
    res.status(201).json({ success: true, quotation });
  } catch (error) {
    next(error);
  }
};

// @desc    List all quotations for a DG Sales customer or DGEnquiry
// @route   GET /api/v1/quotations/dg-sales
// @access  Private
export const listDGSalesQuotations = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { customerId, dgEnquiryId, page = 1, limit = 10 } = req.query;
    const filter: any = {};
    if (customerId) {
      filter['customer._id'] = customerId;
    }
    if (dgEnquiryId) {
      filter.dgEnquiry = dgEnquiryId;
    }
    const total = await Quotation.countDocuments(filter);
    const quotations = await Quotation.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));
    res.json({
      success: true,
      data: quotations,
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions for validation and calculation
const sanitizeQuotationData = (data: any): any => {
  const sanitized = {
    ...data,
    customer: data.customer ? {
      _id: data.customer._id || undefined, // Preserve customer ID
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
      addressId: data.billToAddress.addressId
    } : undefined,
    shipToAddress: data.shipToAddress ? {
      address: String(data.shipToAddress.address || '').trim(),
      state: String(data.shipToAddress.state || '').trim(),
      district: String(data.shipToAddress.district || '').trim(),
      pincode: String(data.shipToAddress.pincode || '').trim(),
      addressId: data.shipToAddress.addressId
    } : undefined,
    company: data.company ? {
      name: String(data.company.name || '').trim(),
      address: String(data.company.address || '').trim(),
      phone: String(data.company.phone || '').trim(),
      email: String(data.company.email || '').trim(),
      pan: String(data.company.pan || '').trim(),
      bankDetails: data.company.bankDetails
    } : undefined,
    location: String(data.location || '').trim(), // Added location sanitization
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
    notes: String(data.notes || '').trim(),
    terms: String(data.terms || '').trim(),
    assignedEngineer: data.assignedEngineer || undefined,
    overallDiscount: Number(data.overallDiscount) || 0
  };
  
  return sanitized;
};

const validateQuotationData = (data: any): { isValid: boolean; errors: any[] } => {
  const errors: any[] = [];

  // Customer validation
  if (!data.customer) {
    errors.push({ field: 'customer', message: 'Customer information is required' });
  } else {
    if (!data.customer.name || (typeof data.customer.name === 'string' && !data.customer.name.trim())) {
      errors.push({ field: 'customer.name', message: 'Customer name is required' });
    }
  }

  // Bill to address validation
  if (!data.billToAddress || !data.billToAddress.address || (typeof data.billToAddress.address === 'string' && !data.billToAddress.address.trim())) {
    errors.push({ field: 'billToAddress.address', message: 'Bill to address is required' });
  }

  // Ship to address validation
  if (!data.shipToAddress || !data.shipToAddress.address || (typeof data.shipToAddress.address === 'string' && !data.shipToAddress.address.trim())) {
    errors.push({ field: 'shipToAddress.address', message: 'Ship to address is required' });
  }

  // Assigned engineer validation (optional)
  // No validation needed - field is optional
  // if (!data.customerAddress || !data.customerAddress.state?.trim()) {
  //   errors.push({ field: 'customerAddress.state', message: 'Customer state is required' });
  // }
  // if (!data.customerAddress || !data.customerAddress.district?.trim()) {
  //   errors.push({ field: 'customerAddress.district', message: 'Customer district is required' });
  // }
  // if (!data.customerAddress || !data.customerAddress.pincode?.trim()) {
  //   errors.push({ field: 'customerAddress.pincode', message: 'Customer pincode is required' });
  // }

  // Location validation
  if (!data.location || (typeof data.location === 'string' && !data.location.trim())) {
    errors.push({ field: 'location', message: 'From location is required' });
  }

  // Company validation
  // if (!data.company) {
  //   errors.push({ field: 'company', message: 'Company information is required' });
  // } else {
  //   if (!data.company.name?.trim()) {
  //     errors.push({ field: 'company.name', message: 'Company name is required' });
  //   }
  //   if (!data.company.address?.trim()) {
  //     errors.push({ field: 'company.address', message: 'Company address is required' });
  //   }
  //   // Make phone and email optional
  //   if (data.company.phone && !isValidPhone(data.company.phone)) {
  //     errors.push({ field: 'company.phone', message: 'Invalid company phone number format' });
  //   }
  //   if (data.company.email && !isValidEmail(data.company.email)) {
  //     errors.push({ field: 'company.email', message: 'Invalid company email format' });
  //   }
  // }

  // Items validation
  if (!data.items || data.items.length === 0) {
    errors.push({ field: 'items', message: 'At least one item is required' });
  } else {
    data.items.forEach((item: any, index: number) => {
      if (!item.product || (typeof item.product === 'string' && !item.product.trim())) {
        errors.push({ field: `items[${index}].product`, message: 'Product is required' });
      }
      // if (!item.description?.trim()) {
      //   errors.push({ field: `items[${index}].description`, message: 'Description is required' });
      // }
      // if (!isValidNumber(item.quantity) || item.quantity <= 0) {
      //   errors.push({ field: `items[${index}].quantity`, message: 'Quantity must be greater than 0' });
      // }
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

const calculateQuotationTotals = (items: any[], overallDiscount: number = 0): any => {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  const calculatedItems = items.map((item: any) => {
    // Ensure all values are numbers
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const discountRate = Number(item.discount) || 0;
    const taxRate = Number(item.taxRate) || 0;

    // Calculate item totals
    const itemSubtotal = quantity * unitPrice;
    const discountAmount = (discountRate / 100) * itemSubtotal;
    const discountedAmount = itemSubtotal - discountAmount;
    const taxAmount = (taxRate / 100) * discountedAmount;
    const totalPrice = discountedAmount + taxAmount;

    // Accumulate totals
    subtotal += itemSubtotal;
    totalDiscount += discountAmount;
    totalTax += taxAmount;

    return {
      ...item,
      discountedAmount: roundTo2Decimals(discountAmount),
      taxAmount: roundTo2Decimals(taxAmount),
      totalPrice: roundTo2Decimals(totalPrice)
    };
  });

  // Calculate grand total before overall discount
  const grandTotalBeforeOverallDiscount = subtotal - totalDiscount + totalTax;
  
  // Calculate overall discount amount as percentage of grand total
  const overallDiscountAmount = (overallDiscount / 100) * grandTotalBeforeOverallDiscount;
  
  // Apply overall discount to grand total
  const grandTotal = grandTotalBeforeOverallDiscount - overallDiscountAmount;
  const roundOff = 0; // No rounding for now

  return {
    subtotal: roundTo2Decimals(subtotal),
    totalDiscount: roundTo2Decimals(totalDiscount),
    overallDiscount: roundTo2Decimals(overallDiscount),
    overallDiscountAmount: roundTo2Decimals(overallDiscountAmount),
    totalTax: roundTo2Decimals(totalTax),
    grandTotal: roundTo2Decimals(grandTotal),
    roundOff,
    items: calculatedItems
  };
};

// Validation helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

const isValidNumber = (value: any): boolean => {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
};

const roundTo2Decimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};


// @desc    Update a quotation
// @route   PUT /api/v1/quotations/:id
export const updateQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("Updating quotation with ID:", req.params.id);
    console.log("Update data:", req.body);
    
    // Check if quotation exists
    const existingQuotation = await Quotation.findById(req.params.id);
    if (!existingQuotation) {
      return next(new AppError('Quotation not found', 404));
    }

    // Sanitize and validate the update data
    const sanitizedData = sanitizeQuotationData(req.body);
    
    // Preserve the original quotation number and dates
    sanitizedData.quotationNumber = existingQuotation.quotationNumber;
    sanitizedData.issueDate = existingQuotation.issueDate;
    sanitizedData.validUntil = existingQuotation.validUntil;
    
    const validationResult = validateQuotationData(sanitizedData);

    if (!validationResult.isValid) {
      const error = new AppError('Validation failed', 400);
      (error as any).errors = validationResult.errors;
      return next(error);
    }

    // Calculate totals if items are provided
    if (sanitizedData.items && sanitizedData.items.length > 0) {
      const calculationResult = calculateQuotationTotals(sanitizedData.items, sanitizedData.overallDiscount || 0);
      sanitizedData.subtotal = calculationResult.subtotal;
      sanitizedData.totalDiscount = calculationResult.totalDiscount;
      sanitizedData.overallDiscount = sanitizedData.overallDiscount || 0;
      sanitizedData.overallDiscountAmount = calculationResult.overallDiscountAmount;
      sanitizedData.totalTax = calculationResult.totalTax;
      sanitizedData.grandTotal = calculationResult.grandTotal;
      sanitizedData.roundOff = calculationResult.roundOff;
      sanitizedData.items = calculationResult.items;
    }

    // Handle advance payment calculations if advance amount is provided
    if (sanitizedData.paidAmount !== undefined) {
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
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      sanitizedData,
      { new: true, runValidators: true }
    ).populate('location', 'name address type') // Populate location details
      .populate('assignedEngineer', 'firstName lastName email phone'); // Populate assigned engineer details

    if (!updatedQuotation) {
      return next(new AppError('Failed to update quotation', 500));
    }

    console.log("Updated quotation:", updatedQuotation);
    
    const response: APIResponse = {
      success: true,
      message: 'Quotation updated successfully',
      data: { quotation: updatedQuotation }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a quotation
// @route   DELETE /api/v1/quotations/:id
export const deleteQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return next(new AppError('Quotation not found', 404));
    }

    await Quotation.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Quotation deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update quotation payment
// @route   PUT /api/quotations/:id/payment
// @access  Private
export const updateQuotationPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { 
      paidAmount, 
      paymentMethod, 
      paymentDate, 
      notes 
    } = req.body;

    // Validate required fields
    if (paidAmount === undefined || paidAmount < 0) {
      return next(new AppError('Valid payment amount is required', 400));
    }

    // Find the quotation
    const quotation = await Quotation.findById(id);
    if (!quotation) {
      return next(new AppError('Quotation not found', 404));
    }

    // Calculate new total paid amount (existing + new payment)
    const existingPaidAmount = quotation.paidAmount || 0;
    const newTotalPaidAmount = existingPaidAmount + paidAmount;
    
    // Calculate remaining amount
    const totalAmount = quotation.grandTotal || 0;
    const newRemainingAmount = Math.max(0, totalAmount - newTotalPaidAmount);

    // Determine payment status
    let newPaymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
    if (newTotalPaidAmount === 0) {
      newPaymentStatus = 'pending';
    } else if (newTotalPaidAmount >= totalAmount) {
      newPaymentStatus = 'paid';
    } else {
      newPaymentStatus = 'partial';
    }

    // Update the quotation
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      id,
      {
        paidAmount: newTotalPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus,
        paymentDate: paymentDate ? new Date(paymentDate) : undefined,
        paymentMethod,
        notes,
        ...(quotation.status === 'draft' && newTotalPaidAmount > 0 && { status: 'sent' })
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Payment updated successfully',
      data: {
        quotation: updatedQuotation,
        newPaymentAmount: paidAmount,
        totalPaidAmount: newTotalPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentStatus: newPaymentStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send quotation email to customer
// @route   POST /api/v1/quotations/:id/send-email
// @access  Private
export const sendQuotationEmailToCustomer = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Find the quotation with populated customer and company data
    const quotation = await Quotation.findById(id)
      .populate('customer', 'name email phone pan addresses')
      .populate('company', 'name email phone address')
      .lean() as any; // Type assertion to avoid TypeScript complexity

    if (!quotation) {
      return next(new AppError('Quotation not found', 404));
    }

    // Check if quotation has customer email
    if (!quotation.customer?.email) {
      return next(new AppError('Customer email not found for this quotation', 400));
    }

    // Allow sending draft quotations - this will update their status to 'sent'

    // Generate email subject and content
    const subject = `Quotation ${quotation.quotationNumber} - ${quotation.company?.name || 'Sun Power Services'}`;
    
    console.log('Generating email content for quotation:', {
      quotationNumber: quotation.quotationNumber,
      customerEmail: quotation.customer.email,
      customerName: quotation.customer.name,
      companyName: quotation.company?.name,
      subject: subject
    });
    
    // Create HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Quotation ${quotation.quotationNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .company-info { background: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .customer-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .quotation-details { background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 5px; margin-bottom: 20px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th, .items-table td { border: 1px solid #dee2e6; padding: 10px; text-align: left; }
            .items-table th { background: #f8f9fa; }
            .totals { background: #f8f9fa; padding: 15px; border-radius: 5px; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 5px; }
            .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Quotation ${quotation.quotationNumber}</h1>
              <p><strong>Issue Date:</strong> ${new Date(quotation.issueDate).toLocaleDateString()}</p>
              <p><strong>Valid Until:</strong> ${new Date(quotation.validUntil).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${quotation.status}</p>
            </div>

            <div class="company-info">
              <h3>Company Information</h3>
              <p><strong>${quotation.company?.name || 'Sun Power Services'}</strong></p>
              <p>${quotation.company?.address || 'Address not available'}</p>
              <p>Phone: ${quotation.company?.phone || 'N/A'}</p>
              <p>Email: ${quotation.company?.email || 'N/A'}</p>
            </div>

            <div class="customer-info">
              <h3>Customer Information</h3>
              <p><strong>${quotation.customer?.name}</strong></p>
              <p>Phone: ${quotation.customer?.phone || 'N/A'}</p>
              <p>Email: ${quotation.customer?.email}</p>
            </div>

            <div class="quotation-details">
              <h3>Quotation Details</h3>
              ${quotation.notes ? `<p><strong>Notes:</strong> ${quotation.notes}</p>` : ''}
              ${quotation.terms ? `<p><strong>Terms:</strong> ${quotation.terms}</p>` : ''}
            </div>

            <h3>Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Tax Rate</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${quotation.items.map((item: any) => `
                  <tr>
                    <td>${item.description || item.product || 'N/A'}</td>
                    <td>${item.quantity} ${item.uom || 'nos'}</td>
                    <td>₹${item.unitPrice?.toFixed(2) || '0.00'}</td>
                    <td>${item.discount || 0}%</td>
                    <td>${item.taxRate || 0}%</td>
                    <td>₹${item.totalPrice?.toFixed(2) || '0.00'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals">
              <p><strong>Subtotal:</strong> ₹${quotation.subtotal?.toFixed(2) || '0.00'}</p>
              <p><strong>Total Discount:</strong> ₹${quotation.totalDiscount?.toFixed(2) || '0.00'}</p>
              <p><strong>Total Tax:</strong> ₹${quotation.totalTax?.toFixed(2) || '0.00'}</p>
              <p><strong>Grand Total:</strong> ₹${quotation.grandTotal?.toFixed(2) || '0.00'}</p>
            </div>

            <div class="footer">
              <p>Thank you for your interest in our services!</p>
              <p>Please contact us if you have any questions or need clarification.</p>
              <p><strong>Contact:</strong> ${quotation.company?.phone || 'N/A'} | ${quotation.company?.email || 'N/A'}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send the email
    await sendQuotationEmailViaNodemailer(
      quotation.customer.email,
      subject,
      htmlContent
    );

    // Log the email sending attempt
    console.log(`Attempting to send quotation email to ${quotation.customer.email} for quotation ${quotation.quotationNumber}`);

    // Always update quotation status to 'sent' after sending email
    await Quotation.findByIdAndUpdate(id, { status: 'sent' });

    // Log the email sending
    console.log(`Quotation email sent successfully to ${quotation.customer.email} for quotation ${quotation.quotationNumber}`);

    const response: APIResponse = {
      success: true,
      message: 'Quotation email sent successfully',
      data: {
        sentTo: quotation.customer.email,
        quotationNumber: quotation.quotationNumber,
        status: 'sent'
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error sending quotation email:', error);
    
    // Provide more specific error messages based on the error type
    let errorMessage = 'Failed to send quotation email';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required SMTP environment variables')) {
        errorMessage = 'Email service configuration is incomplete. Please contact administrator.';
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('SMTP connection failed')) {
        errorMessage = 'Email service is temporarily unavailable. Please try again later.';
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('Missing required email parameters')) {
        errorMessage = 'Invalid email data provided.';
        statusCode = 400; // Bad Request
      } else if (error.message.includes('Email sending failed')) {
        errorMessage = 'Failed to send email. Please try again.';
        statusCode = 500; // Internal Server Error
      } else {
        errorMessage = `Email error: ${error.message}`;
        statusCode = 500; // Internal Server Error
      }
    }
    
    next(new AppError(errorMessage, statusCode));
  }
}; 