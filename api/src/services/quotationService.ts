import { Invoice } from '../models/Invoice';
import { generateReferenceId } from '../utils/generateReferenceId';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

export interface IQuotation {
  quotationNumber: string;
  invoiceId?: string;
  issueDate: Date;
  validUntil: Date;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    pan?: string;
  };
  company: {
    name: string;
    logo?: string;
    address: string;
    phone: string;
    email: string;
    pan?: string;
    bankDetails?: {
      bankName: string;
      accountNo: string;
      ifsc: string;
      branch: string;
    };
  };
  items: Array<{
    product: string;
    description: string;
    hsnCode?: string;
    quantity: number;
    uom: string;
    unitPrice: number;
    discount: number;
    discountedAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  notes?: string;
  terms?: string;
  validityPeriod: number; // days
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface CalculationResult {
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  items: IQuotation['items'];
}

export class QuotationService {
  private static templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  /**
   * Comprehensive validation for quotation data
   */
  static validateQuotationData(data: Partial<IQuotation>): ValidationResult {
    const errors: ValidationError[] = [];

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
      if (data.customer.email && !this.isValidEmail(data.customer.email)) {
        errors.push({ field: 'customer.email', message: 'Invalid email format' });
      }
      if (data.customer.phone && !this.isValidPhone(data.customer.phone)) {
        errors.push({ field: 'customer.phone', message: 'Invalid phone number format' });
      }
    }

    // Company validation
    if (!data.company) {
      errors.push({ field: 'company', message: 'Company information is required' });
    } else {
      if (!data.company.name?.trim()) {
        errors.push({ field: 'company.name', message: 'Company name is required' });
      }
      if (!data.company.address?.trim()) {
        errors.push({ field: 'company.address', message: 'Company address is required' });
      }
      if (!data.company.phone?.trim()) {
        errors.push({ field: 'company.phone', message: 'Company phone is required' });
      }
      if (!data.company.email?.trim()) {
        errors.push({ field: 'company.email', message: 'Company email is required' });
      } else if (!this.isValidEmail(data.company.email)) {
        errors.push({ field: 'company.email', message: 'Invalid company email format' });
      }
    }

    // Items validation
    if (!data.items || data.items.length === 0) {
      errors.push({ field: 'items', message: 'At least one item is required' });
    } else {
      data.items.forEach((item, index) => {
        if (!item.product?.trim()) {
          errors.push({ field: `items[${index}].product`, message: 'Product is required' });
        }
        if (!item.description?.trim()) {
          errors.push({ field: `items[${index}].description`, message: 'Description is required' });
        }
        if (!this.isValidNumber(item.quantity) || item.quantity <= 0) {
          errors.push({ field: `items[${index}].quantity`, message: 'Quantity must be greater than 0' });
        }
        if (!this.isValidNumber(item.unitPrice) || item.unitPrice < 0) {
          errors.push({ field: `items[${index}].unitPrice`, message: 'Unit price must be non-negative' });
        }
        if (!this.isValidNumber(item.discount) || item.discount < 0 || item.discount > 100) {
          errors.push({ field: `items[${index}].discount`, message: 'Discount must be between 0 and 100%' });
        }
        if (!this.isValidNumber(item.taxRate) || item.taxRate < 0 || item.taxRate > 100) {
          errors.push({ field: `items[${index}].taxRate`, message: 'Tax rate must be between 0 and 100%' });
        }
        if (!item.uom?.trim()) {
          errors.push({ field: `items[${index}].uom`, message: 'Unit of measure is required' });
        }
      });
    }

    // Financial validation
    if (data.grandTotal !== undefined && data.grandTotal <= 0) {
      errors.push({ field: 'grandTotal', message: 'Grand total must be greater than 0' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate quotation totals with precision
   */
  static calculateQuotationTotals(items: IQuotation['items']): CalculationResult {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const calculatedItems = items.map(item => {
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
        discountedAmount: this.roundTo2Decimals(discountAmount),
        taxAmount: this.roundTo2Decimals(taxAmount),
        totalPrice: this.roundTo2Decimals(totalPrice)
      };
    });

    const grandTotalBeforeRound = subtotal - totalDiscount + totalTax;
    const grandTotal = Math.round(grandTotalBeforeRound);
    const roundOff = this.roundTo2Decimals(grandTotal - grandTotalBeforeRound);

    return {
      subtotal: this.roundTo2Decimals(subtotal),
      totalDiscount: this.roundTo2Decimals(totalDiscount),
      totalTax: this.roundTo2Decimals(totalTax),
      grandTotal,
      roundOff,
      items: calculatedItems
    };
  }

  /**
   * Sanitize quotation data
   */
  static sanitizeQuotationData(data: any): Partial<IQuotation> {
    return {
      ...data,
      customer: data.customer ? {
        name: String(data.customer.name || '').trim(),
        email: String(data.customer.email || '').trim(),
        phone: String(data.customer.phone || '').trim(),
        address: String(data.customer.address || '').trim(),
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
        quantity: Number(item.quantity) || 0,
        uom: String(item.uom || 'pcs').trim(),
        unitPrice: Number(item.unitPrice) || 0,
        discount: Number(item.discount) || 0,
        taxRate: Number(item.taxRate) || 0
      })) : [],
      notes: String(data.notes || '').trim(),
      terms: String(data.terms || '').trim()
    };
  }

  /**
   * Generate quotation from invoice with enhanced validation
   */
  static async generateQuotationFromInvoice(
    this: typeof QuotationService,
    invoiceId: string,
    validityDays: number = 30,
    companyDetails?: Partial<IQuotation['company']>
  ): Promise<IQuotation> {
    // Fetch the invoice with all related data
    const invoice = await Invoice.findById(invoiceId)
      .populate('customer', 'name email phone address pan')
      .populate('items.product', 'name partNo hsnSac')
      .lean();

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    // Validate invoice type
    if (invoice.invoiceType !== 'quotation' && invoice.invoiceType !== 'sale') {
      throw new Error('Only sale or quotation type invoices can be converted to quotations');
    }

    // Generate quotation number
    const quotationNumber = await generateReferenceId('QUOTATION');

    // Calculate validity date
    const issueDate = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    // Process items with calculations
    const processedItems = invoice.items.map((item: any) => {
      // Type guard for populated product
      const productObj = typeof item.product === 'object' && item.product !== null ? item.product as Record<string, any> : {};
      const itemTotal = item.quantity * item.unitPrice;
      const discountAmount = (item.discount || 0) * itemTotal / 100;
      const discountedTotal = itemTotal - discountAmount;
      const taxAmount = (item.taxRate || 0) * discountedTotal / 100;

      return {
        product: productObj.name || '',
        description: item.description,
        hsnCode: productObj.hsnSac || item.hsnSac || '',
        quantity: item.quantity,
        uom: item.uom || 'pcs',
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        discountedAmount: this.roundTo2Decimals(discountAmount),
        taxRate: item.taxRate || 0,
        taxAmount: this.roundTo2Decimals(taxAmount),
        totalPrice: this.roundTo2Decimals(discountedTotal + taxAmount)
      };
    });

    // Type guard for populated customer
    const customerObj = typeof invoice.customer === 'object' && invoice.customer !== null ? invoice.customer as Record<string, any> : {};

    // Calculate totals
    const subtotal = processedItems.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    const totalDiscount = processedItems.reduce((sum, item) => 
      sum + item.discountedAmount, 0
    );
    const totalTax = processedItems.reduce((sum, item) => 
      sum + item.taxAmount, 0
    );
    const grandTotalBeforeRound = subtotal - totalDiscount + totalTax;
    const grandTotal = Math.round(grandTotalBeforeRound);
    const roundOff = this.roundTo2Decimals(grandTotal - grandTotalBeforeRound);

    // Default company details
    const defaultCompany = {
      name: 'Sun Power Services',
      address: 'Plot no 1, Phase 1, 4th Street, Annai velankani nagar, Madhananthapuram, porur, chennai 600116',
      phone: '+91 9176660123',
      email: '24x7powerservice@gmail.com',
      pan: invoice.pan || '',
      bankDetails: invoice.bankName ? {
        bankName: invoice.bankName,
        accountNo: invoice.bankAccountNo || '',
        ifsc: invoice.bankIFSC || '',
        branch: invoice.bankBranch || ''
      } : undefined
    };

    const quotation: IQuotation = {
      quotationNumber,
      invoiceId: invoice._id.toString(),
      issueDate,
      validUntil,
      customer: {
        name: customerObj.name || '',
        email: customerObj.email || '',
        phone: customerObj.phone || '',
        address: invoice.customerAddress ? 
          `${invoice.customerAddress.address}, ${invoice.customerAddress.district}, ${invoice.customerAddress.state} - ${invoice.customerAddress.pincode}` :
          customerObj.address || '',
        pan: customerObj.pan || ''
      },
      company: { ...defaultCompany, ...companyDetails },
      items: processedItems,
      subtotal: this.roundTo2Decimals(subtotal),
      totalDiscount: this.roundTo2Decimals(totalDiscount),
      totalTax: this.roundTo2Decimals(totalTax),
      grandTotal,
      roundOff,
      notes: invoice.notes,
      terms: invoice.terms || 'Payment Terms: 100% advance payment alongwith PO.',
      validityPeriod: validityDays
    };

    // Validate calculations
    this.validateCalculations(quotation);

    return quotation;
  }

  /**
   * Generate quotation HTML
   */
  static async generateQuotationHTML(this: typeof QuotationService, quotation: IQuotation): Promise<string> {
    const templatePath = path.join(__dirname, '../templates/quotation.hbs');
    
    // Load and compile template
    let template = this.templateCache.get('quotation');
    if (!template) {
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      template = Handlebars.compile(templateSource);
      this.templateCache.set('quotation', template);
    }

    // Register helpers
    this.registerHandlebarsHelpers();

    // Format data for template
    const templateData = {
      ...quotation,
      issueDate: this.formatDate(quotation.issueDate),
      validUntil: this.formatDate(quotation.validUntil),
      hasDiscount: quotation.totalDiscount > 0,
      hasTax: quotation.totalTax > 0,
      hasRoundOff: Math.abs(quotation.roundOff) > 0.01
    };

    return template(templateData);
  }

  /**
   * Generate quotation PDF
   */
  static async generateQuotationPDF(
    this: typeof QuotationService,
    quotation: IQuotation,
    outputPath?: string
  ): Promise<Buffer> {
    const html = await this.generateQuotationHTML(quotation);
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Set PDF options for professional output
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%;">
            Page <span class="pageNumber"></span> of <span class="totalPages"></span>
          </div>
        `
      }) as Buffer;

      // Save to file if path provided
      if (outputPath) {
        fs.writeFileSync(outputPath, pdfBuffer);
      }

      return pdfBuffer;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generate printable view
   */
  static async generatePrintableView(this: typeof QuotationService, quotation: IQuotation): Promise<string> {
    const html = await this.generateQuotationHTML(quotation);
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Quotation - ${quotation.quotationNumber}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body { font-family: Arial, sans-serif; }
            .print-button { 
              position: fixed; 
              top: 20px; 
              right: 20px; 
              padding: 10px 20px; 
              background: #007bff; 
              color: white; 
              border: none; 
              border-radius: 5px; 
              cursor: pointer; 
            }
          </style>
        </head>
        <body>
          <button class="print-button no-print" onclick="window.print()">Print Quotation</button>
          ${html}
        </body>
      </html>
    `;
  }

  /**
   * Validate calculations
   */
  private static validateCalculations(this: typeof QuotationService, quotation: IQuotation): void {
    const calculatedTotals = this.calculateQuotationTotals(quotation.items);
    
    const tolerance = 0.01; // Allow for small rounding differences
    
    if (Math.abs(quotation.subtotal - calculatedTotals.subtotal) > tolerance) {
      throw new Error(`Subtotal calculation mismatch: expected ${calculatedTotals.subtotal}, got ${quotation.subtotal}`);
    }
    
    if (Math.abs(quotation.totalDiscount - calculatedTotals.totalDiscount) > tolerance) {
      throw new Error(`Total discount calculation mismatch: expected ${calculatedTotals.totalDiscount}, got ${quotation.totalDiscount}`);
    }
    
    if (Math.abs(quotation.totalTax - calculatedTotals.totalTax) > tolerance) {
      throw new Error(`Total tax calculation mismatch: expected ${calculatedTotals.totalTax}, got ${quotation.totalTax}`);
    }
    
    if (Math.abs(quotation.grandTotal - calculatedTotals.grandTotal) > tolerance) {
      throw new Error(`Grand total calculation mismatch: expected ${calculatedTotals.grandTotal}, got ${quotation.grandTotal}`);
    }
  }

  /**
   * Register Handlebars helpers
   */
  private static registerHandlebarsHelpers(this: typeof QuotationService): void {
    Handlebars.registerHelper('formatCurrency', function(amount: number) {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
      }).format(amount);
    });

    Handlebars.registerHelper('formatDate', function(date: Date) {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(new Date(date));
    });

    Handlebars.registerHelper('add', function(a: number, b: number) {
      return a + b;
    });

    Handlebars.registerHelper('multiply', function(a: number, b: number) {
      return a * b;
    });
  }

  /**
   * Round to 2 decimal places
   */
  private static roundTo2Decimals(this: typeof QuotationService, value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Format date
   */
  private static formatDate(this: typeof QuotationService, date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  /**
   * Validation helper functions
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  private static isValidNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }
} 