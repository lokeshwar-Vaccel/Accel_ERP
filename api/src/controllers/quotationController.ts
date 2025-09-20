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
      .populate('location', 'name address type gstNumber') // Populate location details including GST
      .populate('customer', 'name email phone pan addresses') // Populate customer details including addresses
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
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;

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
      Quotation.find(filter)
        .populate('location', 'name address type gstNumber') // populate location details including GST
        .populate('customer', 'name email phone pan addresses') // populate customer details including addresses
        .populate('assignedEngineer', 'firstName lastName email phone') // populate assigned engineer details
        // .populate('pofromcustomers', 'poNumber status totalAmount orderDate expectedDeliveryDate')
        .populate('pofromcustomer', 'poNumber status totalAmount orderDate expectedDeliveryDate poPdf')
        .skip(skip)
        .limit(limit)
        .sort({ issueDate: -1 }),
      Quotation.countDocuments(filter)
    ]);
    
    console.log('PO from Customer (single object):', (quotations[0] as any)?.pofromcustomer);
    // Log the PO from Customer data (single instance)
    if (quotations.length > 0) {
      console.log('PO from Customer (single instance):', (quotations[0] as any)?.pofromcustomer);
      console.log('Full quotation data:', quotations[0]);
    }

    res.json({
      success: true,
      data: quotations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export quotations to Excel
// @route   GET /api/v1/quotations/export
export const exportQuotations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const status = req.query.status as string;
    const paymentStatus = req.query.paymentStatus as string;

    // Build filter object (same as getQuotations)
    const filter: any = {};

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

    if (startDate && startDate !== 'undefined' && startDate !== 'null') {
      filter.issueDate = filter.issueDate || {};
      filter.issueDate.$gte = new Date(startDate);
    }
    if (endDate && endDate !== 'undefined' && endDate !== 'null') {
      filter.issueDate = filter.issueDate || {};
      filter.issueDate.$lte = new Date(endDate);
    }

    // Get all quotations matching the filter
    const quotations = await Quotation.find(filter)
      .populate('location', 'name address type gstNumber')
      .populate('customer', 'name email phone pan addresses')
      .populate('assignedEngineer', 'firstName lastName email phone')
      .sort({ issueDate: -1 });

    // Prepare data for Excel export with proper formatting
    const exportData = quotations.map((quotation: any, index: number) => ({
      'S.No': index + 1,
      'Quotation Number': quotation.quotationNumber || '',
      'Customer Name': quotation.customer?.name || '',
      'Customer Email': quotation.customer?.email || '',
      'Customer Phone': quotation.customer?.phone || '',
      'Issue Date': quotation.issueDate ? new Date(quotation.issueDate).toLocaleDateString('en-GB') : '',
      'Valid Until': quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString('en-GB') : '',
      'Status': quotation.status || 'Draft',
      'Payment Status': quotation.paymentStatus || 'Pending',
      'Total Amount': `₹${(quotation.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      'Paid Amount': `₹${(quotation.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      'Remaining Amount': `₹${(quotation.remainingAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      'Location': quotation.location?.name || '',
      'Assigned Engineer': quotation.assignedEngineer ? `${quotation.assignedEngineer.firstName} ${quotation.assignedEngineer.lastName}` : '',
      'Created At': quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString('en-GB') : '',
    }));

    // Set response headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=quotations.xlsx');

    // For now, return JSON data (you can implement actual Excel generation later)
    res.json({
      success: true,
      data: exportData,
      message: 'Quotations data prepared for export'
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

    console.log("Sanitized data:", sanitizedData);
    
    
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
    const calculationResult = QuotationService.calculateQuotationTotals(
      sanitizedData.items, 
      sanitizedData.serviceCharges || [], 
      sanitizedData.batteryBuyBack || undefined,
      sanitizedData.overallDiscount || 0
    );

    console.log("Calculation result:", calculationResult);
    
    // Step 6: Validate financial calculations - Allow 0 total for quotations without items
    // if (calculationResult.grandTotal <= 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Quotation total must be greater than 0',
    //     errors: [{ field: 'grandTotal', message: 'Grand total must be greater than 0' }]
    //   });
    // }

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
      serviceCharges: calculationResult.serviceCharges,
      batteryBuyBack: calculationResult.batteryBuyBack,
      // Set default payment values
      paidAmount: sanitizedData.paidAmount || 0,
      remainingAmount: calculationResult.grandTotal - (sanitizedData.paidAmount || 0),
      paymentStatus: sanitizedData.paidAmount && sanitizedData.paidAmount > 0 ? 'partial' : 'pending',
      status: sanitizedData.status || 'draft'
    };

    console.log("QuotationData:", quotationData);
    

    // Step 8: Save to database
    const quotation = new Quotation(quotationData);
    await quotation.save();

    // Step 9: Populate location and assigned engineer, then return success response
    const populatedQuotation = await Quotation.findById(quotation._id)
      .populate('location', 'name address type gstNumber')
      .populate('customer', 'name email phone pan addresses')
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
        email: customer.addresses && customer.addresses[0] ? customer.addresses[0].email : '',
        phone: customer.addresses && customer.addresses[0] ? customer.addresses[0].phone : '',
        pan: customer.panNumber || '', // Use panNumber field from Customer
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
    location: data.location && data.location.trim() ? data.location.trim() : undefined, // Added location sanitization
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
    // Service charges sanitization
    serviceCharges: Array.isArray(data.serviceCharges) ? data.serviceCharges.map((service: any) => ({
      description: String(service.description || '').trim(),
      hsnNumber: String(service.hsnNumber || '').trim(),
      quantity: Number(service.quantity) || 1,
      unitPrice: Number(service.unitPrice) || 0,
      discount: Number(service.discount) || 0,
      taxRate: Number(service.taxRate) || 18,
      uom: String(service.uom || 'nos').trim()
    })) : [],
    // Battery buy back sanitization
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

  // Items validation - Made optional to allow quotations without items
  // if (!data.items || data.items.length === 0) {
  //   errors.push({ field: 'items', message: 'At least one item is required' });
  // } else {
  if (data.items && data.items.length > 0) {
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

    // Check if this is a status-only update
    const isStatusOnlyUpdate = Object.keys(req.body).length === 1 && req.body.status;
    console.log('Is status-only update:', isStatusOnlyUpdate);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body:', req.body);
    
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
      sanitizedData = sanitizeQuotationData(req.body);
      
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

    // Validate payment method details if provided
    if (paymentMethodDetails) {
      const validationError = validatePaymentMethodDetails(paymentMethod, paymentMethodDetails);
      if (validationError) {
        return next(new AppError(validationError, 400));
      }
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
    const updatedQuotation = await Quotation.findByIdAndUpdate(
      id,
      updateData,
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
    const subject = quotation.subject 
      ? `${quotation.subject} - Quotation ${quotation.quotationNumber}`
      : `Quotation ${quotation.quotationNumber} - ${quotation.company?.name || 'Sun Power Services'}`;
    
    console.log('Generating email content for quotation:', {
      quotationNumber: quotation.quotationNumber,
      customerEmail: quotation.customer.email,
      customerName: quotation.customer.name,
      companyName: quotation.company?.name,
      subject: subject
    });
    
    // Create comprehensive HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Quotation ${quotation.quotationNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 900px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 10px; margin-bottom: 25px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; }
            .header p { margin: 8px 0; opacity: 0.9; }
            .quotation-subject { background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2196f3; }
            .company-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e9ecef; }
            .customer-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e9ecef; }
            .addresses-section { display: flex; gap: 20px; margin-bottom: 20px; }
            .address-box { flex: 1; background: #fff; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6; }
            .quotation-details { background: #fff; padding: 20px; border: 1px solid #dee2e6; border-radius: 8px; margin-bottom: 20px; }
            .section-title { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 8px; margin-bottom: 15px; font-size: 18px; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .items-table th, .items-table td { border: 1px solid #dee2e6; padding: 12px; text-align: left; }
            .items-table th { background: #34495e; color: white; font-weight: 600; }
            .items-table tr:nth-child(even) { background-color: #f8f9fa; }
            .items-table tr:hover { background-color: #e3f2fd; }
            .calculation-summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #dee2e6; }
            .calculation-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef; }
            .calculation-row:last-child { border-bottom: none; font-weight: bold; font-size: 18px; color: #2c3e50; }
            .calculation-row.total-row { background: #e8f5e8; padding: 12px; border-radius: 5px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 30px; padding: 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 10px; }
            .contact-info { background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-top: 15px; }
            .highlight { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 15px 0; }
            .payment-status { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; text-transform: uppercase; font-size: 12px; }
            .payment-status.pending { background: #fff3cd; color: #856404; }
            .payment-status.partial { background: #d1ecf1; color: #0c5460; }
            .payment-status.paid { background: #d4edda; color: #155724; }
            
            /* Mobile responsiveness */
            @media (max-width: 768px) {
              .container { padding: 15px; margin: 10px; }
              .header { padding: 20px; }
              .header h1 { font-size: 24px; }
              .addresses-section { flex-direction: column; }
              .items-table { font-size: 12px; }
              .items-table th, .items-table td { padding: 8px; }
              .calculation-row { flex-direction: column; text-align: center; }
              .calculation-row span:first-child { margin-bottom: 5px; }
            }
            
            /* Print styles */
            @media print {
              body { background-color: white; }
              .container { box-shadow: none; border: 1px solid #ccc; }
              .header { background: #667eea !important; -webkit-print-color-adjust: exact; }
              .footer { background: #667eea !important; -webkit-print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Quotation ${quotation.quotationNumber}</h1>
              <p><strong>Issue Date:</strong> ${new Date(quotation.issueDate).toLocaleDateString()}</p>
              <p><strong>Valid Until:</strong> ${new Date(quotation.validUntil).toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span class="payment-status ${quotation.status}">${quotation.status}</span></p>
              <p><strong>Payment Status:</strong> <span class="payment-status ${quotation.paymentStatus}">${quotation.paymentStatus}</span></p>
            </div>

            ${quotation.subject ? `
            <div class="quotation-subject">
              <h3 style="margin: 0 0 10px 0; color: #1976d2;">Subject</h3>
              <p style="margin: 0; font-size: 16px; font-weight: 500;">${quotation.subject}</p>
            </div>
            ` : ''}

            <div class="company-info">
              <h3 class="section-title">Company Information</h3>
              <p><strong>${quotation.company?.name || 'Sun Power Services'}</strong></p>
              <p>${quotation.company?.address || 'Address not available'}</p>
              <p>Phone: ${quotation.company?.phone || 'N/A'}</p>
              <p>Email: ${quotation.company?.email || 'N/A'}</p>
              ${quotation.company?.pan ? `<p>PAN: ${quotation.company.pan}</p>` : ''}
              ${quotation.company?.bankDetails ? `
                <div style="margin-top: 15px; padding: 15px; background: white; border-radius: 5px; border: 1px solid #dee2e6;">
                  <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Bank Details</h4>
                  <p style="margin: 5px 0;"><strong>Bank:</strong> ${quotation.company.bankDetails.bankName || 'N/A'}</p>
                  <p style="margin: 5px 0;"><strong>Account:</strong> ${quotation.company.bankDetails.accountNo || 'N/A'}</p>
                  <p style="margin: 5px 0;"><strong>IFSC:</strong> ${quotation.company.bankDetails.ifsc || 'N/A'}</p>
                  <p style="margin: 5px 0;"><strong>Branch:</strong> ${quotation.company.bankDetails.branch || 'N/A'}</p>
                </div>
              ` : ''}
            </div>

            <div class="customer-info">
              <h3 class="section-title">Customer Information</h3>
              <p><strong>${quotation.customer?.name}</strong></p>
              <p>Phone: ${quotation.customer?.phone || 'N/A'}</p>
              <p>Email: ${quotation.customer?.email}</p>
              ${quotation.customer?.pan ? `<p>PAN: ${quotation.customer.pan}</p>` : ''}
            </div>

            ${(quotation.billToAddress || quotation.shipToAddress) ? `
            <div class="addresses-section">
              ${quotation.billToAddress ? `
                <div class="address-box">
                  <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Bill To Address</h4>
                  <p style="margin: 5px 0;">${quotation.billToAddress.address}</p>
                  <p style="margin: 5px 0;">${quotation.billToAddress.district}, ${quotation.billToAddress.state} - ${quotation.billToAddress.pincode}</p>
                </div>
              ` : ''}
              ${quotation.shipToAddress ? `
                <div class="address-box">
                  <h4 style="margin: 0 0 10px 0; color: #2c3e50;">Ship To Address</h4>
                  <p style="margin: 5px 0;">${quotation.billToAddress.address}</p>
                  <p style="margin: 5px 0;">${quotation.billToAddress.district}, ${quotation.billToAddress.state} - ${quotation.billToAddress.pincode}</p>
                </div>
              ` : ''}
            </div>
            ` : ''}

            <div class="quotation-details">
              <h3 class="section-title">Quotation Details</h3>
              ${quotation.notes ? `<p><strong>Notes:</strong> ${quotation.notes}</p>` : ''}
              ${quotation.terms ? `<p><strong>Terms:</strong> ${quotation.terms}</p>` : ''}
            </div>

            <h3 class="section-title">Items</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Product/Description</th>
                  <th>HSN Code</th>
                  <th>Part No.</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Discounted Amount</th>
                  <th>Tax Rate</th>
                  <th>Tax Amount</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${quotation.items.map((item: any) => `
                  <tr>
                    <td>${item.description || item.product || 'N/A'}</td>
                    <td>${item.hsnCode || item.hsnNumber || 'N/A'}</td>
                    <td>${item.partNo || 'N/A'}</td>
                    <td>${item.quantity} ${item.uom || 'nos'}</td>
                    <td>₹${item.unitPrice?.toFixed(2) || '0.00'}</td>
                    <td>${item.discount || 0}%</td>
                    <td>₹${item.discountedAmount?.toFixed(2) || '0.00'}</td>
                    <td>${item.taxRate || 0}%</td>
                    <td>₹${item.taxAmount?.toFixed(2) || '0.00'}</td>
                    <td>₹${item.totalPrice?.toFixed(2) || '0.00'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            ${quotation.serviceCharges && quotation.serviceCharges.length > 0 ? `
            <h3 class="section-title">Service Charges</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Discounted Amount</th>
                  <th>Tax Rate</th>
                  <th>Tax Amount</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${quotation.serviceCharges.map((service: any) => `
                  <tr>
                    <td>${service.description}</td>
                    <td>${service.quantity}</td>
                    <td>₹${service.unitPrice?.toFixed(2) || '0.00'}</td>
                    <td>${service.discount || 0}%</td>
                    <td>₹${service.discountedAmount?.toFixed(2) || '0.00'}</td>
                    <td>${service.taxRate || 0}%</td>
                    <td>₹${service.taxAmount?.toFixed(2) || '0.00'}</td>
                    <td>₹${service.totalPrice?.toFixed(2) || '0.00'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ` : ''}

            ${quotation.batteryBuyBack ? `
            <h3 class="section-title">Battery Buy-Back</h3>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Discount</th>
                  <th>Discounted Amount</th>
                  <th>Tax Rate</th>
                  <th>Tax Amount</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${quotation.batteryBuyBack.description}</td>
                  <td>${quotation.batteryBuyBack.quantity}</td>
                  <td>₹${quotation.batteryBuyBack.unitPrice?.toFixed(2) || '0.00'}</td>
                  <td>${quotation.batteryBuyBack.discount || 0}%</td>
                  <td>₹${quotation.batteryBuyBack.discountedAmount?.toFixed(2) || '0.00'}</td>
                  <td>${quotation.batteryBuyBack.taxRate || 0}%</td>
                  <td>₹${quotation.batteryBuyBack.taxAmount?.toFixed(2) || '0.00'}</td>
                  <td>₹${quotation.batteryBuyBack.totalPrice?.toFixed(2) || '0.00'}</td>
                </tr>
              </tbody>
            </table>
            ` : ''}

            <div class="calculation-summary">
              <h3 class="section-title">Calculation Summary</h3>
              
              <div class="calculation-row">
                <span>Items Subtotal:</span>
                <span>₹${quotation.subtotal?.toFixed(2) || '0.00'}</span>
              </div>
              
              ${quotation.serviceCharges && quotation.serviceCharges.length > 0 ? `
              <div class="calculation-row">
                <span>Service Charges Total:</span>
                <span>₹${quotation.serviceCharges.reduce((sum: number, service: any) => sum + (service.totalPrice || 0), 0).toFixed(2)}</span>
              </div>
              ` : ''}
              
              <div class="calculation-row">
                <span>Total Tax:</span>
                <span>₹${quotation.totalTax?.toFixed(2) || '0.00'}</span>
              </div>
              
              <div class="calculation-row">
                <span>Total Discount:</span>
                <span>₹${quotation.totalDiscount?.toFixed(2) || '0.00'}</span>
              </div>
              
              ${quotation.overallDiscount && quotation.overallDiscount > 0 ? `
              <div class="calculation-row">
                <span>Overall Discount (${quotation.overallDiscount}%):</span>
                <span>-₹${quotation.overallDiscountAmount?.toFixed(2) || '0.00'}</span>
              </div>
              ` : ''}
              
              ${quotation.batteryBuyBack && quotation.batteryBuyBack.totalPrice ? `
              <div class="calculation-row">
                <span>Battery Buy-Back Credit:</span>
                <span>-₹${quotation.batteryBuyBack.totalPrice?.toFixed(2) || '0.00'}</span>
              </div>
              ` : ''}
              
              <div class="calculation-row total-row">
                <span>Grand Total:</span>
                <span>₹${quotation.grandTotal?.toFixed(2) || '0.00'}</span>
              </div>
              
              ${quotation.roundOff && quotation.roundOff !== 0 ? `
              <div class="calculation-row">
                <span>Round Off:</span>
                <span>₹${quotation.roundOff?.toFixed(2) || '0.00'}</span>
              </div>
              ` : ''}
              
              ${quotation.paidAmount && quotation.paidAmount > 0 ? `
              <div class="calculation-row">
                <span>Paid Amount:</span>
                <span>₹${quotation.paidAmount?.toFixed(2) || '0.00'}</span>
              </div>
              <div class="calculation-row">
                <span>Remaining Amount:</span>
                <span>₹${quotation.remainingAmount?.toFixed(2) || '0.00'}</span>
              </div>
              ` : ''}
            </div>

            ${quotation.validityPeriod ? `
            <div class="highlight">
              <p style="margin: 0;"><strong>Validity:</strong> This quotation is valid for ${quotation.validityPeriod} days from the issue date.</p>
            </div>
            ` : ''}


            <div class="footer">
              <h3 style="margin: 0 0 15px 0;">Thank you for your interest in our services!</h3>
              <p style="margin: 0 0 15px 0; opacity: 0.9;">Please contact us if you have any questions or need clarification.</p>
              <div class="contact-info">
                <p style="margin: 5px 0;"><strong>Phone:</strong> ${quotation.company?.phone || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Email:</strong> ${quotation.company?.email || 'N/A'}</p>
                <p style="margin: 5px 0;"><strong>Address:</strong> ${quotation.company?.address || 'N/A'}</p>
              </div>
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

// @desc    Get quotation statistics
// @route   GET /api/v1/quotations/stats
// @access  Private
export const getQuotationStats = async (
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
      totalValue
    ] = await Promise.all([
      Quotation.countDocuments(),
      Quotation.countDocuments({ status: 'sent' }),
      Quotation.countDocuments({ status: 'accepted' }),
      Quotation.countDocuments({ status: 'rejected' }),
      Quotation.aggregate([
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ])
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Quotation statistics retrieved successfully',
      data: {
        totalQuotations,
        sentQuotations,
        acceptedQuotations,
        rejectedQuotations,
        quotationValue: totalValue[0]?.total || 0
      }
    };

    console.log('Quotation stats response:', response.data);
    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// Helper function to validate payment method details
const validatePaymentMethodDetails = (paymentMethod: string, details: any): string | null => {
  switch (paymentMethod) {
    case 'cash':
      // Cash is simple, no required validation
      return null;

    case 'cheque':
      if (!details.cheque?.chequeNumber || !details.cheque?.bankName || !details.cheque?.issueDate) {
        return 'Cheque payment requires cheque number, bank name, and issue date';
      }
      return null;

    case 'bank_transfer':
      if (!details.bankTransfer?.bankName || !details.bankTransfer?.accountNumber || 
          !details.bankTransfer?.ifscCode || !details.bankTransfer?.transactionId || 
          !details.bankTransfer?.transferDate) {
        return 'Bank transfer requires bank name, account number, IFSC code, transaction ID, and transfer date';
      }
      return null;

    case 'upi':
      if (!details.upi?.upiId || !details.upi?.transactionId) {
        return 'UPI payment requires UPI ID and transaction ID';
      }
      return null;

    case 'card':
      if (!details.card?.cardType || !details.card?.cardNetwork || 
          !details.card?.lastFourDigits || !details.card?.transactionId) {
        return 'Card payment requires card type, network, last 4 digits, and transaction ID';
      }
      return null;

    case 'other':
      if (!details.other?.methodName) {
        return 'Other payment method requires method name';
      }
      return null;

    default:
      return 'Invalid payment method';
  }
}; 