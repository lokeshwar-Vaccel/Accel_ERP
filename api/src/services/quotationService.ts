import { Invoice } from '../models/Invoice';
import { Quotation, IQuotation } from '../models/Quotation';
import { generateReferenceId } from '../utils/generateReferenceId';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

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
  overallDiscount: number; // Overall discount percentage
  overallDiscountAmount: number; // Calculated overall discount amount
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  items: IQuotation['items'];
  serviceCharges: IQuotation['serviceCharges'];
  batteryBuyBack: IQuotation['batteryBuyBack'] | undefined;
}

export class QuotationService {
  private static templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  /**
   * Comprehensive validation for quotation data
   */
  static validateQuotationData(data: Partial<IQuotation>): ValidationResult {
    const errors: ValidationError[] = [];

    // Customer validation - now customer is a reference ID
    if (!data.customer) {
      errors.push({ field: 'customer', message: 'Customer ID is required' });
    }

    // Bill to address validation
    if (!data.billToAddress || !data.billToAddress.address?.trim()) {
      errors.push({ field: 'billToAddress.address', message: 'Bill to address is required' });
    }

    // Ship to address validation
    if (!data.shipToAddress || !data.shipToAddress.address?.trim()) {
      errors.push({ field: 'shipToAddress.address', message: 'Ship to address is required' });
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
    //   if (!data.company.phone?.trim()) {
    //     errors.push({ field: 'company.phone', message: 'Company phone is required' });
    //   }
    //   if (!data.company.email?.trim()) {
    //     errors.push({ field: 'company.email', message: 'Company email is required' });
    //   } else if (!this.isValidEmail(data.company.email)) {
    //     errors.push({ field: 'company.email', message: 'Invalid company email format' });
    //   }
    // }

    // Location validation
    if (!data.location) {
      errors.push({ field: 'location', message: 'From location is required' });
    }

    // Items validation
    if (!data.items || data.items.length === 0) {
      errors.push({ field: 'items', message: 'At least one item is required' });
    } else {
      data.items.forEach((item, index) => {
        if (!item.product?.trim()) {
          errors.push({ field: `items[${index}].product`, message: 'Product is required' });
        }
        // if (!item.description?.trim()) {
        //   errors.push({ field: `items[${index}].description`, message: 'Description is required' });
        // }
        // if (!this.isValidNumber(item.quantity) || item.quantity <= 0) {
        //   errors.push({ field: `items[${index}].quantity`, message: 'Quantity must be greater than 0' });
        // }
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
  static calculateQuotationTotals(
    items: IQuotation['items'] | undefined, 
    serviceCharges: IQuotation['serviceCharges'] | undefined = [], 
    batteryBuyBack: IQuotation['batteryBuyBack'] | undefined = undefined,
    overallDiscount: number = 0
  ): CalculationResult {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    if (!items) {
      return {
        subtotal: 0,
        totalDiscount: 0,
        overallDiscount: 0,
        overallDiscountAmount: 0,
        totalTax: 0,
        grandTotal: 0,
        roundOff: 0,
        items: [],
        serviceCharges: serviceCharges || [],
        batteryBuyBack: batteryBuyBack || undefined
      };
    }

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

    // Calculate service charges
    if (serviceCharges && serviceCharges.length > 0) {
      serviceCharges.forEach(service => {
        const quantity = Number(service.quantity) || 0;
        const unitPrice = Number(service.unitPrice) || 0;
        const discountRate = Number(service.discount) || 0;
        const taxRate = Number(service.taxRate) || 0;

        const itemSubtotal = quantity * unitPrice;
        const discountAmount = (discountRate / 100) * itemSubtotal;
        const discountedAmount = itemSubtotal - discountAmount;
        const taxAmount = (taxRate / 100) * discountedAmount;

        // Accumulate totals
        subtotal += itemSubtotal;
        totalDiscount += discountAmount;
        totalTax += taxAmount;
      });
    }

    // Calculate battery buy back (deduction from total)
    if (batteryBuyBack) {
      const quantity = Number(batteryBuyBack.quantity) || 0;
      const unitPrice = Number(batteryBuyBack.unitPrice) || 0;
      const discountRate = Number(batteryBuyBack.discount) || 0;
      const taxRate = Number(batteryBuyBack.taxRate) || 0;

      const itemSubtotal = quantity * unitPrice;
      const discountAmount = (discountRate / 100) * itemSubtotal;
      const discountedAmount = itemSubtotal - discountAmount;
      const taxAmount = (taxRate / 100) * discountedAmount;

      // For battery buy back, we DON'T add to subtotal since it's a deduction
      // We'll subtract it from the final grand total instead
      // We still need to track the discount and tax for the battery buy back itself
    }

    // Calculate grand total before overall discount and battery buy back
    // Include service charges in the calculation
    let grandTotalBeforeOverallDiscount = subtotal - totalDiscount + totalTax;
    
    // Add service charges to the total before overall discount
    if (serviceCharges && serviceCharges.length > 0) {
      serviceCharges.forEach(service => {
        const quantity = Number(service.quantity) || 0;
        const unitPrice = Number(service.unitPrice) || 0;
        const discountRate = Number(service.discount) || 0;
        const taxRate = Number(service.taxRate) || 0;

        const itemSubtotal = quantity * unitPrice;
        const discountAmount = (discountRate / 100) * itemSubtotal;
        const discountedAmount = itemSubtotal - discountAmount;
        const taxAmount = (taxRate / 100) * discountedAmount;
        const totalPrice = discountedAmount + taxAmount;
        
        grandTotalBeforeOverallDiscount += totalPrice;
      });
    }
    
    // Calculate overall discount amount as percentage of grand total
    const overallDiscountAmount = (overallDiscount / 100) * grandTotalBeforeOverallDiscount;
    
    // Apply overall discount to grand total
    let grandTotal = grandTotalBeforeOverallDiscount - overallDiscountAmount;
    
    // Subtract battery buy back amount from grand total (it's a deduction)
    if (batteryBuyBack) {
      const quantity = Number(batteryBuyBack.quantity) || 0;
      const unitPrice = Number(batteryBuyBack.unitPrice) || 0;
      const discountRate = Number(batteryBuyBack.discount) || 0;
      const taxRate = Number(batteryBuyBack.taxRate) || 0;

      const itemSubtotal = quantity * unitPrice;
      const discountAmount = (discountRate / 100) * itemSubtotal;
      const discountedAmount = itemSubtotal - discountAmount;
      const taxAmount = (taxRate / 100) * discountedAmount;
      const totalPrice = discountedAmount + taxAmount;
      
      grandTotal -= totalPrice;
    }
    const roundOff = 0; // No rounding for now

    return {
      subtotal: this.roundTo2Decimals(subtotal),
      totalDiscount: this.roundTo2Decimals(totalDiscount),
      overallDiscount: overallDiscount, // Keep the percentage
      overallDiscountAmount: this.roundTo2Decimals(overallDiscountAmount), // Add the calculated amount
      totalTax: this.roundTo2Decimals(totalTax),
      grandTotal: this.roundTo2Decimals(grandTotal),
      roundOff,
      items: calculatedItems || [],
      serviceCharges: serviceCharges || [],
      batteryBuyBack: batteryBuyBack || undefined
    };
  }

  /**
   * Sanitize quotation data
   */
  static sanitizeQuotationData(data: any): Partial<IQuotation> {
    return {
      ...data,
      subject: String(data.subject || '').trim(),
      customer: data.customer || undefined, // Customer is now a reference ID
      company: data?.company ? {
        name: String(data.company?.name || '').trim(),
        address: String(data.company?.address || '').trim(),
        phone: String(data.company?.phone || '').trim(),
        email: String(data.company?.email || '').trim(),
        pan: String(data.company?.pan || '').trim(),
        bankDetails: data.company?.bankDetails
      } : undefined,
      location: String(data.location || '').trim(), // Added location sanitization
      // Service Ticket related fields
      engineSerialNumber: String(data.engineSerialNumber || '').trim(),
      kva: String(data.kva || '').trim(),
      hourMeterReading: String(data.hourMeterReading || '').trim(),
      serviceRequestDate: data.serviceRequestDate ? new Date(data.serviceRequestDate) : undefined,
      items: Array.isArray(data.items) ? data.items.map((item: any) => ({
        product: String(item.product || '').trim(),
        description: String(item.description || '').trim(),
        hsnCode: String(item.hsnCode || '').trim(),
        quantity: Number(item.quantity) || 0,
        uom: String(item.uom || 'nos').trim(),
        unitPrice: Number(item.unitPrice) || 0,
        discount: Number(item.discount) || 0,
        taxRate: Number(item.taxRate) || 0
      })) : [],
      // New fields for service charges and battery buy back
      serviceCharges: Array.isArray(data.serviceCharges) ? data.serviceCharges.map((service: any) => ({
        description: String(service.description || '').trim(),
        quantity: Number(service.quantity) || 1,
        unitPrice: Number(service.unitPrice) || 0,
        discount: Number(service.discount) || 0,
        discountedAmount: Number(service.discountedAmount) || 0,
        taxRate: Number(service.taxRate) || 28,
        taxAmount: Number(service.taxAmount) || 0,
        totalPrice: Number(service.totalPrice) || 0
      })) : [],
      batteryBuyBack: data.batteryBuyBack ? {
        description: String(data.batteryBuyBack.description || 'Battery Buy Back').trim(),
        quantity: Number(data.batteryBuyBack.quantity) || 1,
        unitPrice: Number(data.batteryBuyBack.unitPrice) || 0,
        discount: Number(data.batteryBuyBack.discount) || 0,
        discountedAmount: Number(data.batteryBuyBack.discountedAmount) || 0,
        taxRate: Number(data.batteryBuyBack.taxRate) || 28,
        taxAmount: Number(data.batteryBuyBack.taxAmount) || 0,
        totalPrice: Number(data.batteryBuyBack.totalPrice) || 0
      } : undefined,
      notes: String(data.notes || '').trim(),
      terms: String(data.terms || '').trim(),
      qrCodeImage: data.qrCodeImage || undefined, // Include QR code image
      // Include calculated totals to ensure backend has the correct values
      subtotal: Number(data.subtotal) || 0,
      totalDiscount: Number(data.totalDiscount) || 0,
      totalTax: Number(data.totalTax) || 0,
      overallDiscount: Number(data.overallDiscount) || 0,
      overallDiscountAmount: Number(data.overallDiscountAmount) || 0,
      grandTotal: Number(data.grandTotal) || 0,
      roundOff: Number(data.roundOff) || 0
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
  ): Promise<Partial<IQuotation>> {
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
        uom: item.uom || 'nos',
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

    const quotation: Partial<IQuotation> = {
      quotationNumber,
      invoiceId: invoice._id.toString(),
      issueDate,
      validUntil,
      customer: customerObj._id || customerObj.id || customerObj,
      billToAddress: invoice.customerAddress ? {
        address: invoice.customerAddress.address || '',
        state: invoice.customerAddress.state || '',
        district: invoice.customerAddress.district || '',
        pincode: invoice.customerAddress.pincode || ''
      } : undefined,
      shipToAddress: invoice.customerAddress ? {
        address: invoice.customerAddress.address || '',
        state: invoice.customerAddress.state || '',
        district: invoice.customerAddress.district || '',
        pincode: invoice.customerAddress.pincode || ''
      } : undefined,
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

    return quotation;
  }

  /**
   * Generate quotation HTML
   */
  static async generateQuotationHTML(this: typeof QuotationService, quotation: Partial<IQuotation>): Promise<string> {
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
      issueDate: quotation.issueDate ? this.formatDate(quotation.issueDate) : '',
      validUntil: quotation.validUntil ? this.formatDate(quotation.validUntil) : '',
      hasDiscount: (quotation.totalDiscount || 0) > 0,
      hasTax: (quotation.totalTax || 0) > 0,
      hasRoundOff: Math.abs(quotation.roundOff || 0) > 0.01
    };

    return template(templateData);
  }

  /**
   * Generate quotation PDF
   */
  static async generateQuotationPDF(
    this: typeof QuotationService,
    quotation: Partial<IQuotation>,
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
  static async generatePrintableView(this: typeof QuotationService, quotation: Partial<IQuotation>): Promise<string> {
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
  private static validateCalculations(this: typeof QuotationService, quotation: Partial<IQuotation>): void {
    if (!quotation.items) {
      throw new Error('Quotation items are required for validation');
    }
    
            const calculatedTotals = this.calculateQuotationTotals(quotation.items, quotation.serviceCharges, quotation.batteryBuyBack, quotation.overallDiscount || 0);
    
    const tolerance = 0.01; // Allow for small rounding differences
    
    if (quotation.subtotal && Math.abs(quotation.subtotal - calculatedTotals.subtotal) > tolerance) {
      throw new Error(`Subtotal calculation mismatch: expected ${calculatedTotals.subtotal}, got ${quotation.subtotal}`);
    }
    
    if (quotation.totalDiscount && Math.abs(quotation.totalDiscount - calculatedTotals.totalDiscount) > tolerance) {
      throw new Error(`Total discount calculation mismatch: expected ${calculatedTotals.totalDiscount}, got ${quotation.totalDiscount}`);
    }
    
    if (quotation.totalTax && Math.abs(quotation.totalTax - calculatedTotals.totalTax) > tolerance) {
      throw new Error(`Total tax calculation mismatch: expected ${calculatedTotals.totalTax}, got ${quotation.totalTax}`);
    }
    
    if (quotation.grandTotal && Math.abs(quotation.grandTotal - calculatedTotals.grandTotal) > tolerance) {
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