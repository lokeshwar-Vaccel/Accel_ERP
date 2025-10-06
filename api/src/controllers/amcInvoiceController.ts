import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { AMCInvoice, IAMCInvoice } from '../models/AMCInvoice';
import { AMCQuotation } from '../models/AMCQuotation';
import { generateReferenceId } from '../utils/generateReferenceId';
import { Customer } from '../models/Customer';
import { AMCInvoiceEmailService } from '../services/amcInvoiceEmailService';
// import { numberToWords } from '../utils/numberToWords';

// @desc    Get all AMC invoices with pagination and filtering
// @route   GET /api/v1/amc-invoices
// @access  Private
export const getAMCInvoices = async (req: Request, res: Response, next: NextFunction) => {
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
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } },
        { quotationNumber: { $regex: search, $options: 'i' } }
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

    const [invoices, total] = await Promise.all([
      AMCInvoice.find(filter)
        .populate('sourceQuotation', 'quotationNumber amcType')
        .populate('createdBy', 'firstName lastName email')
        .skip(skip)
        .limit(limit)
        .sort({ issueDate: -1 }),
      AMCInvoice.countDocuments(filter)
    ]);

    // Process invoices to merge customer data properly
    const processedInvoices = await Promise.all(invoices.map(async (invoice) => {
      const invoiceObj = invoice.toObject();
      
      // If customer has _id, fetch the full customer data from Customer collection
      if (invoiceObj.customer && typeof invoiceObj.customer === 'object' && invoiceObj.customer._id) {
        try {
          const fullCustomer = await Customer.findById(invoiceObj.customer._id).select('name panNumber addresses');
          if (fullCustomer) {
            // Get primary address email and phone
            const primaryAddress = fullCustomer.addresses?.find(addr => addr.isPrimary);
            const primaryEmail = primaryAddress?.email || '';
            const primaryPhone = primaryAddress?.phone || '';
            
            invoiceObj.customer = {
              _id: (fullCustomer._id as any).toString(),
              name: fullCustomer.name || invoiceObj.customer.name,
              email: primaryEmail || invoiceObj.customer.email,
              phone: primaryPhone || invoiceObj.customer.phone,
              pan: fullCustomer.panNumber || invoiceObj.customer.pan,
              addresses: (fullCustomer.addresses || []) as any[]
            };
          }
        } catch (error) {
          console.error('Error fetching customer data:', error);
          // Fallback to existing customer data with empty addresses
          invoiceObj.customer.addresses = [];
        }
      }

      return invoiceObj;
    }));

    res.status(200).json({
      success: true,
      data: {
        invoices: processedInvoices,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Error fetching AMC invoices:', error);
    next(new AppError('Failed to fetch AMC invoices', 500));
  }
};

// @desc    Get single AMC invoice by ID
// @route   GET /api/v1/amc-invoices/:id
// @access  Private
export const getAMCInvoiceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await AMCInvoice.findById(req.params.id)
      .populate('customer', 'name email phone addresses')
      .populate('sourceQuotation')
      .populate('createdBy', 'firstName lastName email');

    if (!invoice) {
      return next(new AppError('AMC invoice not found', 404));
    }

    // Convert to object for processing
    let processedInvoice: any = invoice.toObject();

    // Ensure customer data is properly structured
    if (processedInvoice.customer) {
      if (typeof processedInvoice.customer === 'object' && processedInvoice.customer._id) {
        // Customer is already populated, ensure we have all needed fields
        processedInvoice.customer = {
          _id: processedInvoice.customer._id.toString(),
          name: processedInvoice.customer.name || 'Unknown Customer',
          email: processedInvoice.customer.email || '',
          phone: processedInvoice.customer.phone || '',
          addresses: processedInvoice.customer.addresses || []
        };
      } else if (typeof processedInvoice.customer === 'string') {
        // Customer is just an ID, fetch full data
        try {
          const fullCustomer = await Customer.findById(processedInvoice.customer);
          if (fullCustomer) {
            const fullCustomerObj = fullCustomer as any;
            processedInvoice.customer = {
              _id: fullCustomerObj._id.toString(),
              name: fullCustomerObj.name || 'Unknown Customer',
              email: fullCustomerObj.email || '',
              phone: fullCustomerObj.phone || '',
              addresses: (fullCustomerObj.addresses || []).map((addr: any) => ({
                id: addr.id || 0,
                address: addr.address || '',
                state: addr.state || '',
                district: addr.district || '',
                pincode: addr.pincode || '',
                isPrimary: addr.isPrimary || false,
                gstNumber: addr.gstNumber || '',
                email: addr.email || '',
                phone: addr.phone || '',
                contactPersonName: addr.contactPersonName || '',
                designation: addr.designation || '',
                registrationStatus: addr.registrationStatus || ''
              }))
            };
          } else {
            processedInvoice.customer = {
              _id: processedInvoice.customer,
              name: 'Unknown Customer',
              email: '',
              phone: '',
              addresses: []
            };
          }
        } catch (error) {
          console.error('Error fetching customer data:', error);
          processedInvoice.customer = {
            _id: processedInvoice.customer,
            name: 'Unknown Customer',
            email: '',
            phone: '',
            addresses: []
          };
        }
      }
    }


    // Ensure serviceCharges exists (for AMC invoices, this might be offerItems/sparesItems)
    if (!processedInvoice.serviceCharges || processedInvoice.serviceCharges.length === 0) {
      processedInvoice.serviceCharges = [];
      
      // Convert offerItems to serviceCharges format if they exist
      if (processedInvoice.offerItems && processedInvoice.offerItems.length > 0) {
        processedInvoice.serviceCharges = processedInvoice.offerItems.map((item: any, index: number) => ({
          siNo: index + 1,
          description: `AMC Service - ${item.make} ${item.engineSlNo} (${item.dgRatingKVA || 'N/A'} KVA)`,
          hsnSac: item.hsnCode || '', // Use HSN code from offer item or default
          gstRate: 18, // Default GST rate
          quantity: item.qty || 1,
          rate: item.amcCostPerDG || 0,
          per: item.uom || 'nos', // Use UOM from offer item or default
          discountPercent: 0,
          amount: item.totalAMCAmountPerDG || 0
        }));
      }
      
      // Add spares items if they exist
      if (processedInvoice.sparesItems && processedInvoice.sparesItems.length > 0) {
        const sparesStartIndex = (processedInvoice as any).serviceCharges.length;
        const sparesServices = processedInvoice.sparesItems.map((item: any, index: number) => ({
          siNo: sparesStartIndex + index + 1,
          description: item.description || 'Spare Part',
          hsnSac: item.hsnCode || '',
          gstRate: 18,
          quantity: item.qty || 1,
          rate: item.unitPrice || 0,
          per: item.uom || 'nos',
          discountPercent: 0,
          amount: item.totalPrice || 0
        }));
        (processedInvoice as any).serviceCharges = [...(processedInvoice as any).serviceCharges, ...sparesServices];
      }
    }

    // Ensure taxSummary exists
    if (!processedInvoice.taxSummary || processedInvoice.taxSummary.length === 0) {
      processedInvoice.taxSummary = [{
        hsnSac: processedInvoice.offerItems && processedInvoice.offerItems.length > 0 
          ? (processedInvoice.offerItems[0] as any).hsnCode || ''
          : '',
        taxableValue: processedInvoice.subtotal || 0,
        cgstRate: 9,
        cgstAmount: processedInvoice.cgst || 0,
        sgstRate: 9,
        sgstAmount: processedInvoice.sgst || 0,
        igstRate: 18,
        igstAmount: processedInvoice.igst || 0,
        totalTaxAmount: processedInvoice.totalTax || 0
      }];
    }

    res.status(200).json({
      success: true,
      data: { invoice: processedInvoice }
    });
  } catch (error) {
    console.error('Error fetching AMC invoice:', error);
    next(new AppError('Failed to fetch AMC invoice', 500));
  }
};

// @desc    Create AMC invoice from quotation
// @route   POST /api/v1/amc-invoices
// @access  Private
export const createAMCInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    console.log("Creating AMC invoice with data:", req.body);
    
    const data = req.body;

    // Step 1: Sanitize input data
    const sanitizedData = sanitizeAMCInvoiceData(data);

    console.log("Sanitized data:", sanitizedData);
    
    // Step 2: Validate required fields
    const validationResult = validateAMCInvoiceData(sanitizedData);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.errors
      });
    }

    // Step 3: Generate invoice number if not provided
    if (!sanitizedData.invoiceNumber) {
      try {
        sanitizedData.invoiceNumber = await generateReferenceId('amc-invoice');
      } catch (error) {
        console.error('Error generating AMC invoice number:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to generate invoice number'
        });
      }
    }

    // Step 4: Set default dates
    if (!sanitizedData.issueDate) {
      sanitizedData.issueDate = new Date();
    }
    
    if (!sanitizedData.dueDate) {
      const dueDate = new Date(sanitizedData.issueDate);
      dueDate.setDate(dueDate.getDate() + 30); // 30 days from issue date
      sanitizedData.dueDate = dueDate;
    }

    // Step 5: Calculate AMC totals from offer items if not provided
    if (sanitizedData.offerItems && sanitizedData.offerItems.length > 0) {
      const amcTotals = calculateAMCTotals(sanitizedData.offerItems, sanitizedData.gstIncluded);
      sanitizedData.subtotal = amcTotals.subtotal;
      sanitizedData.cgst = amcTotals.cgst;
      sanitizedData.sgst = amcTotals.sgst;
      sanitizedData.igst = amcTotals.igst;
      sanitizedData.totalTax = amcTotals.totalTax;
      sanitizedData.grandTotal = amcTotals.grandTotal;
    }

    // Step 6: Calculate remaining amount and payment status
    const paidAmount = Number(sanitizedData.paidAmount) || 0;
    const grandTotal = Number(sanitizedData.grandTotal) || 0;
    const remainingAmount = Math.max(0, grandTotal - paidAmount);
    
    // Update payment status based on amounts
    let paymentStatus = 'pending';
    if (paidAmount >= grandTotal) {
      paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      paymentStatus = 'partial';
    }
    
    sanitizedData.paidAmount = paidAmount;
    sanitizedData.remainingAmount = remainingAmount;
    sanitizedData.paymentStatus = paymentStatus;

    // Step 7: Generate amount in words
    if (!sanitizedData.amountInWords && sanitizedData.grandTotal) {
      sanitizedData.amountInWords = convertNumberToWords(sanitizedData.grandTotal);
    }

    // Step 8: Set created by
    if (req.user) {
      sanitizedData.createdBy = req.user.id;
    }

    // Step 9: Create the invoice
    const invoice = new AMCInvoice(sanitizedData);
    await invoice.save();

    // Step 10: Populate and return
    const populatedInvoice = await AMCInvoice.findById(invoice._id)
      .populate('sourceQuotation')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'AMC invoice created successfully',
      data: { invoice: populatedInvoice }
    });
  } catch (error) {
    console.error('Error creating AMC invoice:', error);
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return res.status(400).json({
        success: false,
        message: 'Invoice number already exists'
      });
    }
    return next(new AppError('Failed to create AMC invoice', 500));
  }
};

// @desc    Create AMC invoice from quotation
// @route   POST /api/v1/amc-invoices/from-quotation/:quotationId
// @access  Private
export const createAMCInvoiceFromQuotation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { quotationId } = req.params;
    const additionalData = req.body;

    // Step 1: Fetch the quotation
    const quotation = await AMCQuotation.findById(quotationId)
      .populate('customer', 'name email phone panNumber addresses');

    if (!quotation) {
      return next(new AppError('AMC quotation not found', 404));
    }

    // Step 2: Convert quotation to invoice data
    const invoiceData = convertQuotationToInvoice(quotation, additionalData);

    // Step 3: Generate invoice number
    try {
      invoiceData.invoiceNumber = await generateReferenceId('amc-invoice');
    } catch (error) {
      console.error('Error generating AMC invoice number:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate invoice number'
      });
    }

    // Step 4: Set dates
    invoiceData.issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    invoiceData.dueDate = dueDate;

    // Step 5: Set created by
    if (req.user) {
      invoiceData.createdBy = req.user.id;
    }

    // Step 6: Create the invoice
    const invoice = new AMCInvoice(invoiceData);
    await invoice.save();

    // Step 7: Populate and return
    const populatedInvoice = await AMCInvoice.findById(invoice._id)
      .populate('sourceQuotation')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'AMC invoice created successfully from quotation',
      data: { invoice: populatedInvoice }
    });
  } catch (error) {
    console.error('Error creating AMC invoice from quotation:', error);
    next(new AppError('Failed to create AMC invoice from quotation', 500));
  }
};

// @desc    Update AMC invoice
// @route   PUT /api/v1/amc-invoices/:id
// @access  Private
export const updateAMCInvoice = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const existingInvoice = await AMCInvoice.findById(id);

    if (!existingInvoice) {
      return next(new AppError('AMC invoice not found', 404));
    }

    // Check if this is a status-only update
    const isStatusOnlyUpdate = Object.keys(req.body).length === 1 && req.body.hasOwnProperty('status');

    let sanitizedData: any;
    if (isStatusOnlyUpdate) {
      sanitizedData = { status: req.body.status };
      console.log('Status-only update, sanitized data:', sanitizedData);
    } else {
      // For full updates, sanitize and validate all data
      sanitizedData = sanitizeAMCInvoiceData(req.body);
      
      // Preserve the original invoice number and dates
      sanitizedData.invoiceNumber = existingInvoice.invoiceNumber;
      sanitizedData.issueDate = existingInvoice.issueDate;
      
      const validationResult = validateAMCInvoiceData(sanitizedData);

      if (!validationResult.isValid) {
        const error = new AppError('Validation failed', 400);
        (error as any).errors = validationResult.errors;
        return next(error);
      }

      // Calculate remaining amount and payment status for full updates
      const paidAmount = Number(sanitizedData.paidAmount) || 0;
      const grandTotal = Number(sanitizedData.grandTotal) || 0;
      const remainingAmount = Math.max(0, grandTotal - paidAmount);
      
      // Update payment status based on amounts
      let paymentStatus = 'pending';
      if (paidAmount >= grandTotal) {
        paymentStatus = 'paid';
      } else if (paidAmount > 0) {
        paymentStatus = 'partial';
      }
      
      sanitizedData.paidAmount = paidAmount;
      sanitizedData.remainingAmount = remainingAmount;
      sanitizedData.paymentStatus = paymentStatus;
    }

    // Update the invoice
    const updatedInvoice = await AMCInvoice.findByIdAndUpdate(
      id,
      sanitizedData,
      { new: true, runValidators: true }
    ).populate('sourceQuotation').populate('createdBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'AMC invoice updated successfully',
      data: { invoice: updatedInvoice }
    });
  } catch (error) {
    console.error('Error updating AMC invoice:', error);
    next(new AppError('Failed to update AMC invoice', 500));
  }
};

// @desc    Delete AMC invoice
// @route   DELETE /api/v1/amc-invoices/:id
// @access  Private
export const deleteAMCInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const invoice = await AMCInvoice.findById(req.params.id);

    if (!invoice) {
      return next(new AppError('AMC invoice not found', 404));
    }

    // Check if invoice can be deleted (only draft invoices)
    if (invoice.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft invoices can be deleted'
      });
    }

    await AMCInvoice.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'AMC invoice deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting AMC invoice:', error);
    next(new AppError('Failed to delete AMC invoice', 500));
  }
};

// @desc    Record payment for AMC invoice
// @route   POST /api/v1/amc-invoices/:id/payment
// @access  Private
export const recordAMCInvoicePayment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, paymentDate, notes } = req.body;

    const invoice = await AMCInvoice.findById(id);

    if (!invoice) {
      return next(new AppError('AMC invoice not found', 404));
    }

    // Validate payment amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount must be greater than 0'
      });
    }

    if (amount > invoice.remainingAmount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount cannot exceed remaining amount'
      });
    }

    // Update payment details
    invoice.paidAmount += amount;
    invoice.remainingAmount = Math.max(0, invoice.grandTotal - invoice.paidAmount);

    // Update payment status
    if (invoice.remainingAmount === 0) {
      invoice.paymentStatus = 'paid';
      invoice.status = 'paid';
    } else if (invoice.paidAmount > 0) {
      invoice.paymentStatus = 'partial';
    }

    // Add payment record (you might want to create a separate Payment model)
    // For now, we'll store it in notes or create a simple payment record
    const paymentRecord = {
      amount,
      paymentMethod,
      paymentDate: paymentDate || new Date(),
      notes,
      recordedBy: req.user?.id,
      recordedAt: new Date()
    };

    // Store payment in notes for now (you should create a proper Payment model)
    const existingNotes = invoice.notes || '';
    const paymentNote = `Payment recorded: ₹${amount} via ${paymentMethod} on ${new Date(paymentRecord.paymentDate).toLocaleDateString()}. ${notes || ''}`;
    invoice.notes = existingNotes ? `${existingNotes}\n${paymentNote}` : paymentNote;

    await invoice.save();

    const updatedInvoice = await AMCInvoice.findById(id)
      .populate('sourceQuotation')
      .populate('createdBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      data: { 
        invoice: updatedInvoice,
        payment: paymentRecord
      }
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    next(new AppError('Failed to record payment', 500));
  }
};

// Helper functions for validation and sanitization
const sanitizeAMCInvoiceData = (data: any): any => {
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
      gstNumber: String(data.billToAddress.gstNumber || '').trim(),
      email: String(data.billToAddress.email || '').trim(),
      phone: String(data.billToAddress.phone || '').trim(),
      contactPersonName: String(data.billToAddress.contactPersonName || '').trim(),
      designation: String(data.billToAddress.designation || '').trim(),
      registrationStatus: String(data.billToAddress.registrationStatus || '').trim()
    } : undefined,
    shipToAddress: data.shipToAddress ? {
      address: String(data.shipToAddress.address || '').trim(),
      state: String(data.shipToAddress.state || '').trim(),
      district: String(data.shipToAddress.district || '').trim(),
      pincode: String(data.shipToAddress.pincode || '').trim(),
      addressId: data.shipToAddress.addressId,
      gstNumber: String(data.shipToAddress.gstNumber || '').trim(),
      email: String(data.shipToAddress.email || '').trim(),
      phone: String(data.shipToAddress.phone || '').trim(),
      contactPersonName: String(data.shipToAddress.contactPersonName || '').trim(),
      designation: String(data.shipToAddress.designation || '').trim(),
      registrationStatus: String(data.shipToAddress.registrationStatus || '').trim()
    } : undefined,
    company: data.company ? {
      name: String(data.company.name || '').trim(),
      address: String(data.company.address || '').trim(),
      phone: String(data.company.phone || '').trim(),
      email: String(data.company.email || '').trim(),
      pan: String(data.company.pan || '').trim(),
      gstin: String(data.company.gstin || '').trim(),
      stateName: String(data.company.stateName || '').trim(),
      stateCode: String(data.company.stateCode || '').trim(),
      bankDetails: data.company.bankDetails
    } : undefined,
    // AMC specific fields
    amcType: data.amcType || 'AMC',
    sourceQuotation: data.sourceQuotation,
    quotationNumber: String(data.quotationNumber || '').trim(),
    
    // AMC Offer Items
    offerItems: data.offerItems ? data.offerItems.map((item: any) => ({
      make: String(item.make || '').trim(),
      engineSlNo: String(item.engineSlNo || '').trim(),
      dgRatingKVA: item.dgRatingKVA ? Number(item.dgRatingKVA) : undefined,
      typeOfVisits: item.typeOfVisits ? Number(item.typeOfVisits) : undefined,
      qty: item.qty ? Number(item.qty) : 1,
      hsnCode: String(item.hsnCode || '').trim(),
      uom: String(item.uom || 'nos').trim(),
      amcCostPerDG: item.amcCostPerDG ? Number(item.amcCostPerDG) : undefined,
      totalAMCAmountPerDG: Number(item.totalAMCAmountPerDG) || 0,
      gst18: Number(item.gst18) || 0,
      totalAMCCost: Number(item.totalAMCCost) || 0
    })) : [],
    
    // AMC Spare Items
    sparesItems: data.sparesItems ? data.sparesItems.map((item: any) => ({
      srNo: Number(item.srNo) || 0,
      partNo: String(item.partNo || '').trim(),
      description: String(item.description || '').trim(),
      hsnCode: String(item.hsnCode || '').trim(),
      qty: Number(item.qty) || 0,
      productId: item.productId,
      uom: String(item.uom || 'nos').trim(),
      unitPrice: Number(item.unitPrice) || 0,
      gstRate: Number(item.gstRate) || 0,
      discount: Number(item.discount) || 0,
      discountedAmount: Number(item.discountedAmount) || 0,
      taxAmount: Number(item.taxAmount) || 0,
      totalPrice: Number(item.totalPrice) || 0,
      availableQuantity: Number(item.availableQuantity) || 0
    })) : [],
    
    // Financial details
    subtotal: Number(data.subtotal) || 0,
    cgst: Number(data.cgst) || 0,
    sgst: Number(data.sgst) || 0,
    igst: Number(data.igst) || 0,
    totalTax: Number(data.totalTax) || 0,
    grandTotal: Number(data.grandTotal) || 0,
    amountInWords: String(data.amountInWords || '').trim(),
    // Payment tracking
    paidAmount: Number(data.paidAmount) || 0,
    remainingAmount: Number(data.remainingAmount) || 0,
    paymentStatus: data.paymentStatus || 'pending',
    // Status
    status: data.status || 'draft',
    // Additional fields
    notes: String(data.notes || '').trim(),
    terms: String(data.terms || '').trim(),
    // Reference fields
    irn: String(data.irn || '').trim(),
    ackNo: String(data.ackNo || '').trim(),
    ackDate: data.ackDate ? new Date(data.ackDate) : undefined,
    deliveryNote: String(data.deliveryNote || '').trim(),
    referenceNo: String(data.referenceNo || '').trim(),
    referenceDate: data.referenceDate ? new Date(data.referenceDate) : undefined,
    buyerOrderNo: String(data.buyerOrderNo || '').trim(),
    dispatchDocNo: String(data.dispatchDocNo || '').trim(),
    dispatchedThrough: String(data.dispatchedThrough || '').trim(),
    termsOfPayment: String(data.termsOfPayment || '').trim(),
    otherReferences: String(data.otherReferences || '').trim(),
    deliveryNoteDate: data.deliveryNoteDate ? new Date(data.deliveryNoteDate) : undefined,
    destination: String(data.destination || '').trim(),
    termsOfDelivery: String(data.termsOfDelivery || '').trim()
  };

  return sanitized;
};

const validateAMCInvoiceData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required fields validation
  if (!data.customer?.name) {
    errors.push('Customer name is required');
  }

  // Address validation - check if address is provided either as object or ID
  if (!data.billToAddress?.address && !data.billToAddressId) {
    errors.push('Bill to address is required');
  }

  if (!data.shipToAddress?.address && !data.shipToAddressId) {
    errors.push('Ship to address is required');
  }

  if (!data.company?.name) {
    errors.push('Company name is required');
  }

  // Quotation number is optional for AMC invoices
  // if (!data.quotationNumber) {
  //   errors.push('Quotation number is required');
  // }


  return {
    isValid: errors.length === 0,
    errors
  };
};

const convertQuotationToInvoice = (quotation: any, additionalData: any = {}): any => {
  // Get selected addresses
  const billToAddress = getSelectedAddress(quotation, quotation.billToAddressId);
  const shipToAddress = getSelectedAddress(quotation, quotation.shipToAddressId);


  return {
    // Invoice identification
    invoiceType: 'amc',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    
    // Reference fields
    ...additionalData,
    
    // Customer and addresses
    customer: {
      _id: quotation.customer._id,
      name: quotation.customer.name,
      email: quotation.customer.email,
      phone: quotation.customer.phone,
      pan: quotation.customer.pan
    },
    billToAddress: billToAddress ? {
      address: billToAddress.address,
      state: billToAddress.state,
      district: billToAddress.district,
      pincode: billToAddress.pincode,
      addressId: billToAddress.id,
      gstNumber: billToAddress.gstNumber,
      email: billToAddress.email,
      phone: billToAddress.phone,
      contactPersonName: billToAddress.contactPersonName,
      designation: billToAddress.designation,
      registrationStatus: billToAddress.registrationStatus
    } : {
      address: '',
      state: '',
      district: '',
      pincode: ''
    },
    shipToAddress: shipToAddress ? {
      address: shipToAddress.address,
      state: shipToAddress.state,
      district: shipToAddress.district,
      pincode: shipToAddress.pincode,
      addressId: shipToAddress.id,
      gstNumber: shipToAddress.gstNumber,
      email: shipToAddress.email,
      phone: shipToAddress.phone,
      contactPersonName: shipToAddress.contactPersonName,
      designation: shipToAddress.designation,
      registrationStatus: shipToAddress.registrationStatus
    } : {
      address: '',
      state: '',
      district: '',
      pincode: ''
    },
    
    // Company details (from quotation or default)
    company: quotation.company || {
      name: 'Sun Power Services',
      address: 'D No.53, Plot No.4, 4th Street, Phase-1 Extension, Annai Velankanni Nagar, Madhananthapuram, Porur, Chennai - 600116',
      phone: '044-24828218',
      email: 'sumpowerservices@gmail.com',
      pan: 'BLFPS9951M',
      gstin: '33BLFPS9951M1ZC',
      stateName: 'Tamil Nadu',
      stateCode: '33'
    },
    
    // AMC specific
    amcType: quotation.amcType,
    sourceQuotation: quotation._id,
    quotationNumber: quotation.quotationNumber,
    
    
    // Financial details (will be calculated by pre-save middleware)
    subtotal: quotation.subtotal || 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    totalTax: quotation.totalTax || 0,
    grandTotal: quotation.grandTotal || 0,
    amountInWords: '',
    
    // Payment tracking
    paidAmount: 0,
    remainingAmount: quotation.grandTotal || 0,
    paymentStatus: 'pending',
    
    // Status
    status: 'draft',
    
    // Additional fields
    notes: quotation.notes || '',
    terms: quotation.terms || ''
  };
};

const getSelectedAddress = (quotation: any, addressId: string) => {
  if (!addressId || !quotation.customer?.addresses) {
    return null;
  }
  
  return quotation.customer.addresses.find((addr: any) => 
    addr.id.toString() === addressId
  ) || null;
};

// Helper function to calculate AMC totals
const calculateAMCTotals = (offerItems: any[], gstIncluded: boolean = true) => {
  let subtotal = 0;
  let totalTax = 0;
  let grandTotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  offerItems.forEach(item => {
    const qty = (item.qty !== undefined && item.qty !== null) ? Number(item.qty) : 0;
    const costPerDG = (item.amcCostPerDG !== undefined && item.amcCostPerDG !== null) ? Number(item.amcCostPerDG) : 0;
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

    subtotal += itemSubtotal;
    totalTax += itemTax;
    grandTotal += itemTotal;
  });

  // Calculate CGST, SGST, IGST (assuming same state for now - 9% each for CGST and SGST)
  if (totalTax > 0) {
    cgst = totalTax / 2; // 9% CGST
    sgst = totalTax / 2; // 9% SGST
    // IGST would be 18% if different states, but for same state it's 0
  }

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    grandTotal: Math.round(grandTotal * 100) / 100
  };
};

// Helper function to convert numbers to words
const convertNumberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  
  const convertHundreds = (n: number): string => {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      n = 0;
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result;
  };
  
  let result = '';
  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const hundreds = num % 1000;
  
  if (crores > 0) {
    result += convertHundreds(crores) + 'Crore ';
  }
  if (lakhs > 0) {
    result += convertHundreds(lakhs) + 'Lakh ';
  }
  if (thousands > 0) {
    result += convertHundreds(thousands) + 'Thousand ';
  }
  if (hundreds > 0) {
    result += convertHundreds(hundreds);
  }
  
  return result.trim() + ' Rupees Only';
};

// @desc    Get AMC invoice statistics
// @route   GET /api/v1/amc-invoices/stats
// @access  Private
export const getAMCInvoiceStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalInvoices,
      draftInvoices,
      sentInvoices,
      paidInvoices,
      overdueInvoices,
      cancelledInvoices,
      totalValue,
      paidAmount,
      pendingAmount,
      amcCount,
      camcCount
    ] = await Promise.all([
      AMCInvoice.countDocuments(),
      AMCInvoice.countDocuments({ status: 'draft' }),
      AMCInvoice.countDocuments({ status: 'sent' }),
      AMCInvoice.countDocuments({ status: 'paid' }),
      AMCInvoice.countDocuments({ status: 'overdue' }),
      AMCInvoice.countDocuments({ status: 'cancelled' }),
      AMCInvoice.aggregate([
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]),
      AMCInvoice.aggregate([
        { $group: { _id: null, total: { $sum: '$paidAmount' } } }
      ]),
      AMCInvoice.aggregate([
        { $group: { _id: null, total: { $sum: '$remainingAmount' } } }
      ]),
      AMCInvoice.countDocuments({ amcType: 'AMC' }),
      AMCInvoice.countDocuments({ amcType: 'CAMC' })
    ]);

    const response: APIResponse = {
      success: true,
      message: 'AMC invoice statistics retrieved successfully',
      data: {
        totalInvoices,
        draftInvoices,
        sentInvoices,
        paidInvoices,
        overdueInvoices,
        cancelledInvoices,
        invoiceValue: totalValue[0]?.total || 0,
        paidAmount: paidAmount[0]?.total || 0,
        pendingAmount: pendingAmount[0]?.total || 0,
        amcCount,
        camcCount
      }
    };

    console.log('AMC Invoice stats response:', response.data);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching AMC invoice stats:', error);
    next(error);
  }
};

// @desc    Send AMC invoice email to customer
// @route   POST /api/v1/amc-invoices/:id/send-email
// @access  Private
export const sendAMCInvoiceEmail = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await AMCInvoiceEmailService.sendAMCInvoiceEmail(id);

    if (!result.success) {
      res.status(400).json({
        success: false,
        message: result.message
      });
      return;
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
    console.error('Error sending AMC invoice email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send AMC invoice email'
    });
  }
};
