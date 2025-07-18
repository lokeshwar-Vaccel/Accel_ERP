import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { QuotationService } from '../services/quotationService';
import { Invoice } from '../models/Invoice';
import { Quotation } from '../models/Quotation';
import { generateReferenceId } from '../utils/generateReferenceId';

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
    // No populate needed for Quotation: customer is embedded, items.product is string
    const quotation = await Quotation.findById(req.params.id);
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

    // No populate needed for Quotation: customer is embedded, items.product is string
    const [quotations, total] = await Promise.all([
      Quotation.find().skip(skip).limit(limit).sort({ issueDate: -1 }),
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
    const calculationResult = calculateQuotationTotals(sanitizedData.items);
    
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
      totalTax: calculationResult.totalTax,
      grandTotal: calculationResult.grandTotal,
      roundOff: calculationResult.roundOff,
      items: calculationResult.items
    };

    // Step 8: Save to database
    const quotation = new Quotation(quotationData);
    await quotation.save();

    // Step 9: Return success response
    return res.status(201).json({
      success: true,
      message: 'Quotation created successfully',
      data: quotation
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

// Helper functions for validation and calculation
const sanitizeQuotationData = (data: any): any => {
  const sanitized = {
    ...data,
    customer: data.customer ? {
      _id: data.customer._id || undefined, // Preserve customer ID
      name: String(data.customer.name || '').trim(),
      email: String(data.customer.email || '').trim(),
      phone: String(data.customer.phone || '').trim(),
      address: String(data.customer.address || '').trim(), // Store actual address text
      addressId: data.customer.addressId || undefined, // Preserve address ID for reference
      pan: String(data.customer.pan || '').trim()
    } : undefined,
    company: data.company ? {
      name: String(data.company.name || '').trim(),
      address: String(data.company.address || '').trim(),
      phone: String(data.company.phone || '').trim(),
      email: String(data.company.email || '').trim(),
      pan: String(data.company.pan || '').trim(),
      bankDetails: data.company.bankDetails
    } : undefined,
    items: Array.isArray(data.items) ? data.items.map((item: any) => ({
      product: String(item.product || '').trim(),
      description: String(item.description || '').trim(),
      hsnCode: String(item.hsnCode || '').trim(),
      hsnNumber: String(item.hsnNumber || '').trim(), // Added hsnNumber field
      partNo: String(item.partNo || '').trim(), // Added partNo field
      quantity: Number(item.quantity) || 0,
      uom: String(item.uom || 'pcs').trim(),
      unitPrice: Number(item.unitPrice) || 0,
      discount: Number(item.discount) || 0,
      taxRate: Number(item.taxRate) || 0
    })) : [],
    notes: String(data.notes || '').trim(),
    terms: String(data.terms || '').trim()
  };
  
  return sanitized;
};

const validateQuotationData = (data: any): { isValid: boolean; errors: any[] } => {
  const errors: any[] = [];

  // Customer validation
  if (!data.customer) {
    errors.push({ field: 'customer', message: 'Customer information is required' });
  } else {
    if (!data.customer.name?.trim()) {
      errors.push({ field: 'customer.name', message: 'Customer name is required' });
    }
    if (!data.customer.address?.trim()) {
      errors.push({ field: 'customer.address', message: 'Customer address is required' });
    }
    if (data.customer.email && !isValidEmail(data.customer.email)) {
      errors.push({ field: 'customer.email', message: 'Invalid email format' });
    }
    if (data.customer.phone && !isValidPhone(data.customer.phone)) {
      errors.push({ field: 'customer.phone', message: 'Invalid phone number format' });
    }
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
      if (!item.product?.trim()) {
        errors.push({ field: `items[${index}].product`, message: 'Product is required' });
      }
      // if (!item.description?.trim()) {
      //   errors.push({ field: `items[${index}].description`, message: 'Description is required' });
      // }
      if (!isValidNumber(item.quantity) || item.quantity <= 0) {
        errors.push({ field: `items[${index}].quantity`, message: 'Quantity must be greater than 0' });
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
      if (!item.uom?.trim()) {
        errors.push({ field: `items[${index}].uom`, message: 'Unit of measure is required' });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const calculateQuotationTotals = (items: any[]): any => {
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

  const grandTotalBeforeRound = subtotal - totalDiscount + totalTax;
  const grandTotal = grandTotalBeforeRound;
  const roundOff = roundTo2Decimals(grandTotal - grandTotalBeforeRound);

  return {
    subtotal: roundTo2Decimals(subtotal),
    totalDiscount: roundTo2Decimals(totalDiscount),
    totalTax: roundTo2Decimals(totalTax),
    grandTotal,
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
    const quotation = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true });
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

// @desc    Delete a quotation
// @route   DELETE /api/v1/quotations/:id
export const deleteQuotation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quotation = await Quotation.findByIdAndDelete(req.params.id);
    if (!quotation) {
      res.status(404).json({ message: 'Quotation not found' });
      return;
    }
    res.json({ message: 'Quotation deleted successfully' });
    return;
  } catch (error) {
    next(error);
  }
}; 