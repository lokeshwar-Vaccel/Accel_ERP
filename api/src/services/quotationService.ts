import { Invoice } from '../models/Invoice';
import { generateReferenceId } from '../utils/generateReferenceId';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

export interface IQuotation {
  quotationNumber: string;
  invoiceId: string;
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

export class QuotationService {
  private static templateCache: Map<string, HandlebarsTemplateDelegate> = new Map();

  /**
   * Convert an invoice to a quotation
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
        discountedAmount: discountAmount,
        taxRate: item.taxRate || 0,
        taxAmount: this.roundTo2Decimal(taxAmount),
        totalPrice: this.roundTo2Decimal(discountedTotal + taxAmount)
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
    const roundOff = grandTotal - grandTotalBeforeRound;

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
      subtotal: this.roundTo2Decimal(subtotal),
      totalDiscount: this.roundTo2Decimal(totalDiscount),
      totalTax: this.roundTo2Decimal(totalTax),
      grandTotal,
      roundOff: this.roundTo2Decimal(roundOff),
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
   * Generate printable view HTML with print-specific styles
   */
  static async generatePrintableView(this: typeof QuotationService, quotation: IQuotation): Promise<string> {
    const html = await this.generateQuotationHTML(quotation);
    
    // Add print-specific styles
    const printStyles = `
      <style>
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
          table { page-break-inside: avoid; }
          tr { page-break-inside: avoid; }
        }
        @page {
          size: A4;
          margin: 15mm;
        }
      </style>
    `;

    return html.replace('</head>', `${printStyles}</head>`);
  }

  /**
   * Validate all calculations
   */
  private static validateCalculations(this: typeof QuotationService, quotation: IQuotation): void {
    // Validate item calculations
    quotation.items.forEach((item, index) => {
      const expectedTotal = (item.quantity * item.unitPrice) - 
        ((item.discount / 100) * item.quantity * item.unitPrice) +
        item.taxAmount;
      
      const diff = Math.abs(expectedTotal - item.totalPrice);
      if (diff > 0.01) {
        throw new Error(`Calculation error in item ${index + 1}: Expected ${expectedTotal}, got ${item.totalPrice}`);
      }
    });

    // Validate totals
    const calculatedSubtotal = quotation.items.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    const calculatedTax = quotation.items.reduce((sum, item) => 
      sum + item.taxAmount, 0
    );
    const calculatedDiscount = quotation.items.reduce((sum, item) => 
      sum + item.discountedAmount, 0
    );

    if (Math.abs(calculatedSubtotal - quotation.subtotal) > 0.01) {
      throw new Error('Subtotal calculation mismatch');
    }
    if (Math.abs(calculatedTax - quotation.totalTax) > 0.01) {
      throw new Error('Tax calculation mismatch');
    }
    if (Math.abs(calculatedDiscount - quotation.totalDiscount) > 0.01) {
      throw new Error('Discount calculation mismatch');
    }

    // Validate grand total
    const expectedGrandTotal = Math.round(
      quotation.subtotal - quotation.totalDiscount + quotation.totalTax
    );
    if (expectedGrandTotal !== quotation.grandTotal) {
      throw new Error('Grand total calculation mismatch');
    }
  }

  /**
   * Register Handlebars helpers
   */
  private static registerHandlebarsHelpers(this: typeof QuotationService): void {
    Handlebars.registerHelper('currency', (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2
      }).format(amount);
    });

    Handlebars.registerHelper('decimal', (value: number) => {
      return value.toFixed(2);
    });

    Handlebars.registerHelper('percentage', (value: number) => {
      return `${value}%`;
    });

    Handlebars.registerHelper('ifEquals', function(this: any, arg1: any, arg2: any, options: any) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('inc', (value: number) => value + 1);
  }

  /**
   * Utility functions
   */
  private static roundTo2Decimal(this: typeof QuotationService, value: number): number {
    return Math.round(value * 100) / 100;
  }

  private static formatDate(this: typeof QuotationService, date: Date): string {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }
} 