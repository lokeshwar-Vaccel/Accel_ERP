import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest, APIResponse } from '../types';
import { AppError } from '../middleware/errorHandler';
import { QuotationService } from '../services/quotationService';
import { Invoice } from '../models/Invoice';
import { Quotation } from '../models/Quotation';

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
    console.log("_______in ");
    
    const quotation = new Quotation(req.body);
    await quotation.save();
    res.status(201).json(quotation);
  } catch (error) {
    next(error);
  }
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