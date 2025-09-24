import PDFDocument from 'pdfkit';
import { IPurchaseOrderPayment } from '../models/PurchaseOrderPayment';
import { IQuotationPayment } from '../models/QuotationPayment';
import { IInvoicePayment } from '../models/InvoicePayment';
import { IDGInvoicePayment } from '../models/DGInvoicePayment';
import { IAMCQuotationPayment } from '../models/AMCQuotationPayment';

interface PopulatedPayment extends Omit<IPurchaseOrderPayment, 'purchaseOrderId' | 'supplierId' | 'createdBy'> {
  purchaseOrderId: {
    _id: string;
    poNumber: string;
    totalAmount: number;
  };
  supplierId: {
    _id: string;
    name: string;
    email: string;
    addresses?: Array<{
      address: string;
      state: string;
      district: string;
      pincode: string;
      gstNumber?: string;
    }>;
  };
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PopulatedQuotationPayment extends Omit<IQuotationPayment, 'quotationId' | 'customerId' | 'createdBy'> {
  quotationId: {
    _id: string;
    quotationNumber: string;
    grandTotal: number;
  };
  customerId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    addresses?: Array<{
      address: string;
      state: string;
      district: string;
      pincode: string;
      gstNumber?: string;
    }>;
  };
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PopulatedInvoicePayment extends Omit<IInvoicePayment, 'invoiceId' | 'customerId' | 'createdBy'> {
  invoiceId: {
    _id: string;
    invoiceNumber: string;
    totalAmount: number;
  };
  customerId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    addresses?: Array<{
      address: string;
      state: string;
      district: string;
      pincode: string;
      gstNumber?: string;
    }>;
  };
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface PopulatedDGInvoicePayment extends Omit<IDGInvoicePayment, 'dgInvoiceId' | 'customerId' | 'createdBy'> {
  dgInvoiceId: {
    _id: string;
    invoiceNumber: string;
    totalAmount: number;
  };
  customerId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    addresses?: Array<{
      address: string;
      state: string;
      district: string;
      pincode: string;
      gstNumber?: string;
    }>;
  };
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export const generatePaymentReceiptPDF = (payment: PopulatedPayment): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        bufferPages: true
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // Header with border
      doc.rect(margin, margin, contentWidth, 80)
         .stroke('#E5E7EB');
      
      // Company logo area (placeholder)
      doc.rect(margin + 10, margin + 10, 60, 60)
         .fill('#F3F4F6');
      
      doc.fontSize(8).font('Helvetica').fill('#6B7280');
      doc.text('LOGO', margin + 25, margin + 35, { align: 'center', width: 30 });

      // Company name and details
      doc.fontSize(18).font('Helvetica-Bold').fill('#1F2937');
      doc.text('SUN POWER SERVICES', margin + 80, margin + 15);
      
      doc.fontSize(9).font('Helvetica').fill('#4B5563');
      const companyInfo = [
        'D No.53, Plot No.4, 4th Street, Phase-1 Extension',
        'Kamaraj Nagar, Thiruvanmiyur, Chennai - 600041, Tamil Nadu, India',
        'GST: 33AABCS1234F1Z5 | Phone: +91 9876543210 | Email: info@sunpowerservices.com'
      ];
      
      let companyY = margin + 35;
      companyInfo.forEach(line => {
        doc.text(line, margin + 80, companyY);
        companyY += 12;
      });

      // Receipt title
      const titleY = margin + 100;
      doc.fontSize(24).font('Helvetica-Bold').fill('#1F2937');
      doc.text('PAYMENT RECEIPT', 0, titleY, { align: 'center', width: pageWidth });

      // Receipt details header
      const receiptHeaderY = titleY + 50;
      doc.rect(margin, receiptHeaderY, contentWidth, 30)
         .fill('#F3F4F6')
         .stroke('#D1D5DB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Receipt Details', margin + 15, receiptHeaderY + 8);

      // Receipt information
      const receiptInfoY = receiptHeaderY + 40;
      const leftColumn = margin + 15;
      const rightColumn = margin + contentWidth / 2 + 15;

      // Left column
      doc.fontSize(10).font('Helvetica').fill('#374151');
      doc.text(`Receipt Number: ${payment.receiptNumber || payment._id}`, leftColumn, receiptInfoY);
      doc.text(`Payment Date: ${payment.paymentDate.toLocaleDateString('en-IN')}`, leftColumn, receiptInfoY + 20);
      doc.text(`Payment Method: ${payment.paymentMethod.toUpperCase()}`, leftColumn, receiptInfoY + 40);
      doc.text(`Amount: ₹${payment.amount.toLocaleString('en-IN')}`, leftColumn, receiptInfoY + 60);

      // Right column
      doc.text(`PO Number: ${payment.purchaseOrderId.poNumber}`, rightColumn, receiptInfoY);
      doc.text(`PO Amount: ₹${payment.purchaseOrderId.totalAmount.toLocaleString('en-IN')}`, rightColumn, receiptInfoY + 20);
      doc.text(`Currency: ${payment.currency}`, rightColumn, receiptInfoY + 40);
      doc.text(`Status: ${payment.paymentStatus.toUpperCase()}`, rightColumn, receiptInfoY + 60);

      // Supplier information
      const supplierY = receiptInfoY + 100;
      doc.rect(margin, supplierY, contentWidth, 30)
         .fill('#F3F4F6')
         .stroke('#D1D5DB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Supplier Information', margin + 15, supplierY + 8);

      const supplierInfoY = supplierY + 40;
      doc.fontSize(10).font('Helvetica').fill('#374151');
      doc.text(`Name: ${payment.supplierId.name}`, leftColumn, supplierInfoY);
      doc.text(`Email: ${payment.supplierId.email}`, leftColumn, supplierInfoY + 20);

      // Payment method details
      const paymentDetailsY = supplierInfoY + 60;
      doc.rect(margin, paymentDetailsY, contentWidth, 30)
         .fill('#F3F4F6')
         .stroke('#D1D5DB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Payment Method Details', margin + 15, paymentDetailsY + 8);

      const paymentMethodDetailsY = paymentDetailsY + 40;
      const paymentDetails = getPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails);
      
      doc.fontSize(10).font('Helvetica').fill('#374151');
      paymentDetails.forEach((detail, index) => {
        doc.text(detail, leftColumn, paymentMethodDetailsY + (index * 20));
      });

      // Notes section
      if (payment.notes) {
        const notesY = paymentMethodDetailsY + (paymentDetails.length * 20) + 30;
        doc.rect(margin, notesY, contentWidth, 30)
           .fill('#F3F4F6')
           .stroke('#D1D5DB');
        
        doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
        doc.text('Notes', margin + 15, notesY + 8);

        doc.fontSize(10).font('Helvetica').fill('#374151');
        doc.text(payment.notes, leftColumn, notesY + 40, { width: contentWidth - 30 });
      }

      // Footer
      const footerY = pageHeight - 80;
      doc.fontSize(8).font('Helvetica').fill('#6B7280');
      doc.text('This is a computer-generated receipt and does not require a signature.', margin, footerY, { align: 'center', width: contentWidth });
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, margin, footerY + 15, { align: 'center', width: contentWidth });
      doc.text(`Generated by: ${payment.createdBy.firstName} ${payment.createdBy.lastName}`, margin, footerY + 30, { align: 'center', width: contentWidth });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate PDF for quotation payments
export const generateQuotationPaymentReceiptPDF = (payment: PopulatedQuotationPayment): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        bufferPages: true
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // Header with border
      doc.rect(margin, margin, contentWidth, 80)
         .stroke('#E5E7EB');
      
      // Company logo area (placeholder)
      doc.rect(margin + 10, margin + 10, 60, 60)
         .fill('#F3F4F6');
      
      doc.fontSize(8).font('Helvetica').fill('#6B7280');
      doc.text('LOGO', margin + 25, margin + 35, { align: 'center', width: 30 });

      // Company name and details
      doc.fontSize(18).font('Helvetica-Bold').fill('#1F2937');
      doc.text('SUN POWER SERVICES', margin + 80, margin + 15);
      
      doc.fontSize(9).font('Helvetica').fill('#4B5563');
      const companyInfo = [
        'D No.53, Plot No.4, 4th Street, Phase-1 Extension',
        'Kamaraj Nagar, Thiruvanmiyur, Chennai - 600041, Tamil Nadu, India',
        'GST: 33AABCS1234F1Z5 | Phone: +91 9876543210 | Email: info@sunpowerservices.com'
      ];
      
      let companyY = margin + 35;
      companyInfo.forEach(line => {
        doc.text(line, margin + 80, companyY);
        companyY += 12;
      });

      // Receipt title
      const titleY = margin + 100;
      doc.fontSize(24).font('Helvetica-Bold').fill('#1F2937');
      doc.text('QUOTATION PAYMENT RECEIPT', 0, titleY, { align: 'center', width: pageWidth });

      // Receipt details header
      const receiptHeaderY = titleY + 50;
      doc.rect(margin, receiptHeaderY, contentWidth, 30)
         .fill('#F3F4F6')
         .stroke('#D1D5DB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Receipt Details', margin + 15, receiptHeaderY + 8);

      // Receipt information
      const receiptInfoY = receiptHeaderY + 40;
      const leftColumn = margin + 15;
      const rightColumn = margin + contentWidth / 2 + 15;

      // Left column
      doc.fontSize(10).font('Helvetica').fill('#374151');
      doc.text(`Receipt Number: ${payment.receiptNumber || payment._id}`, leftColumn, receiptInfoY);
      doc.text(`Payment Date: ${payment.paymentDate.toLocaleDateString('en-IN')}`, leftColumn, receiptInfoY + 20);
      doc.text(`Payment Method: ${payment.paymentMethod.toUpperCase()}`, leftColumn, receiptInfoY + 40);
      doc.text(`Amount: ₹${payment.amount.toLocaleString('en-IN')}`, leftColumn, receiptInfoY + 60);

      // Right column
      doc.text(`Quotation Number: ${payment.quotationId.quotationNumber}`, rightColumn, receiptInfoY);
      doc.text(`Quotation Amount: ₹${payment.quotationId.grandTotal.toLocaleString('en-IN')}`, rightColumn, receiptInfoY + 20);
      doc.text(`Currency: ${payment.currency}`, rightColumn, receiptInfoY + 40);
      doc.text(`Status: ${payment.paymentStatus.toUpperCase()}`, rightColumn, receiptInfoY + 60);

      // Customer information
      const customerY = receiptInfoY + 100;
      doc.rect(margin, customerY, contentWidth, 30)
         .fill('#F3F4F6')
         .stroke('#D1D5DB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Customer Information', margin + 15, customerY + 8);

      const customerInfoY = customerY + 40;
      doc.fontSize(10).font('Helvetica').fill('#374151');
      doc.text(`Name: ${payment.customerId.name}`, leftColumn, customerInfoY);
      doc.text(`Email: ${payment.customerId.email}`, leftColumn, customerInfoY + 20);
      if (payment.customerId.phone) {
        doc.text(`Phone: ${payment.customerId.phone}`, leftColumn, customerInfoY + 40);
      }

      // Payment method details
      const paymentDetailsY = customerInfoY + 80;
      doc.rect(margin, paymentDetailsY, contentWidth, 30)
         .fill('#F3F4F6')
         .stroke('#D1D5DB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Payment Method Details', margin + 15, paymentDetailsY + 8);

      const paymentMethodDetailsY = paymentDetailsY + 40;
      const paymentDetails = getPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails);
      
      doc.fontSize(10).font('Helvetica').fill('#374151');
      paymentDetails.forEach((detail, index) => {
        doc.text(detail, leftColumn, paymentMethodDetailsY + (index * 20));
      });

      // Notes section
      if (payment.notes) {
        const notesY = paymentMethodDetailsY + (paymentDetails.length * 20) + 30;
        doc.rect(margin, notesY, contentWidth, 30)
           .fill('#F3F4F6')
           .stroke('#D1D5DB');
        
        doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
        doc.text('Notes', margin + 15, notesY + 8);

        doc.fontSize(10).font('Helvetica').fill('#374151');
        doc.text(payment.notes, leftColumn, notesY + 40, { width: contentWidth - 30 });
      }

      // Footer
      const footerY = pageHeight - 80;
      doc.fontSize(8).font('Helvetica').fill('#6B7280');
      doc.text('This is a computer-generated receipt and does not require a signature.', margin, footerY, { align: 'center', width: contentWidth });
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, margin, footerY + 15, { align: 'center', width: contentWidth });
      doc.text(`Generated by: ${payment.createdBy.firstName} ${payment.createdBy.lastName}`, margin, footerY + 30, { align: 'center', width: contentWidth });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate PDF for invoice payments
export const generateInvoicePaymentReceiptPDF = (payment: PopulatedInvoicePayment): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        bufferPages: true
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // Header with border
      doc.rect(margin, margin, contentWidth, 80)
         .stroke('#E5E7EB');
      
      // Company logo area (placeholder)
      doc.rect(margin + 10, margin + 10, 60, 60)
         .fill('#F3F4F6');
      
      doc.fontSize(8).font('Helvetica').fill('#6B7280');
      doc.text('LOGO', margin + 25, margin + 35, { align: 'center', width: 30 });

      // Company name and details
      doc.fontSize(18).font('Helvetica-Bold').fill('#1F2937');
      doc.text('SUN POWER SERVICES', margin + 80, margin + 15);
      
      doc.fontSize(9).font('Helvetica').fill('#4B5563');
      const companyInfo = [
        'D No.53, Plot No.4, 4th Street, Phase-1 Extension',
        'Kamaraj Nagar, Thiruvanmiyur, Chennai - 600041, Tamil Nadu, India',
        'GST: 33AABCS1234F1Z5 | Phone: +91 9876543210 | Email: info@sunpowerservices.com'
      ];
      
      let companyY = margin + 35;
      companyInfo.forEach(line => {
        doc.text(line, margin + 80, companyY);
        companyY += 12;
      });

      // Receipt title
      const titleY = margin + 100;
      doc.fontSize(24).font('Helvetica-Bold').fill('#1F2937');
      doc.text('PAYMENT RECEIPT', 0, titleY, { align: 'center', width: pageWidth });

      // Receipt details header
      const receiptHeaderY = titleY + 50;
      doc.rect(margin, receiptHeaderY, contentWidth, 30)
         .fill('#F9FAFB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Receipt Details', margin + 15, receiptHeaderY + 8);

      // Receipt information
      const receiptInfoY = receiptHeaderY + 40;
      const leftColumn = margin + 15;
      const rightColumn = margin + contentWidth / 2 + 15;

      // Left column
      doc.fontSize(10).font('Helvetica').fill('#374151');
      doc.text(`Receipt Number: ${payment.receiptNumber || payment._id}`, leftColumn, receiptInfoY);
      doc.text(`Payment Date: ${payment.paymentDate.toLocaleDateString('en-IN')}`, leftColumn, receiptInfoY + 20);
      doc.text(`Payment Method: ${payment.paymentMethod.toUpperCase()}`, leftColumn, receiptInfoY + 40);
      doc.text(`Amount: ₹${payment.amount.toLocaleString('en-IN')}`, leftColumn, receiptInfoY + 60);

      // Right column
      doc.text(`Invoice Number: ${payment.invoiceId.invoiceNumber}`, rightColumn, receiptInfoY);
      doc.text(`Invoice Amount: ₹${payment.invoiceId.totalAmount.toLocaleString('en-IN')}`, rightColumn, receiptInfoY + 20);
      doc.text(`Currency: ${payment.currency}`, rightColumn, receiptInfoY + 40);
      doc.text(`Status: ${payment.paymentStatus.toUpperCase()}`, rightColumn, receiptInfoY + 60);

      // Customer information
      const customerY = receiptInfoY + 100;
      doc.rect(margin, customerY, contentWidth, 30)
         .fill('#F3F4F6')
         .stroke('#D1D5DB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Customer Information', margin + 15, customerY + 8);

      const customerInfoY = customerY + 40;
      doc.fontSize(10).font('Helvetica').fill('#374151');
      doc.text(`Name: ${payment.customerId.name}`, leftColumn, customerInfoY);
      doc.text(`Email: ${payment.customerId.email}`, leftColumn, customerInfoY + 20);
      if (payment.customerId.phone) {
        doc.text(`Phone: ${payment.customerId.phone}`, leftColumn, customerInfoY + 40);
      }

      // Payment method details
      const paymentDetailsY = customerInfoY + 80;
      doc.rect(margin, paymentDetailsY, contentWidth, 30)
         .fill('#F3F4F6')
         .stroke('#D1D5DB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Payment Method Details', margin + 15, paymentDetailsY + 8);

      const paymentMethodDetailsY = paymentDetailsY + 40;
      const paymentDetails = getPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails);
      
      doc.fontSize(10).font('Helvetica').fill('#374151');
      paymentDetails.forEach((detail, index) => {
        doc.text(detail, leftColumn, paymentMethodDetailsY + (index * 20));
      });

      // Notes section
      if (payment.notes) {
        const notesY = paymentMethodDetailsY + (paymentDetails.length * 20) + 30;
        doc.rect(margin, notesY, contentWidth, 30)
           .fill('#F3F4F6')
           .stroke('#D1D5DB');
        
        doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
        doc.text('Notes', margin + 15, notesY + 8);

        doc.fontSize(10).font('Helvetica').fill('#374151');
        doc.text(payment.notes, leftColumn, notesY + 40, { width: contentWidth - 30 });
      }

      // Footer
      const footerY = pageHeight - 80;
      doc.fontSize(8).font('Helvetica').fill('#6B7280');
      doc.text('This is a computer-generated receipt and does not require a signature.', margin, footerY, { align: 'center', width: contentWidth });
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, margin, footerY + 15, { align: 'center', width: contentWidth });
      doc.text(`Generated by: ${payment.createdBy.firstName} ${payment.createdBy.lastName}`, margin, footerY + 30, { align: 'center', width: contentWidth });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Generate PDF for DG Invoice payments
export const generateDGInvoicePaymentReceiptPDF = (payment: PopulatedDGInvoicePayment): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        bufferPages: true
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Page dimensions
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // Header with border
      doc.rect(margin, margin, contentWidth, 80)
         .stroke('#E5E7EB');
      
      // Company logo area (placeholder)
      doc.rect(margin + 10, margin + 10, 60, 60)
         .fill('#F3F4F6');
      
      doc.fontSize(8).font('Helvetica').fill('#6B7280');
      doc.text('LOGO', margin + 25, margin + 35, { align: 'center', width: 30 });

      // Company name and details
      doc.fontSize(18).font('Helvetica-Bold').fill('#1F2937');
      doc.text('SUN POWER SERVICES', margin + 80, margin + 15);
      
      doc.fontSize(9).font('Helvetica').fill('#4B5563');
      const companyInfo = [
        'D No.53, Plot No.4, 4th Street, Phase-1 Extension',
        'Kamaraj Nagar, Thiruvanmiyur, Chennai - 600041, Tamil Nadu, India',
        'GST: 33AABCS1234F1Z5 | Phone: +91 9876543210 | Email: info@sunpowerservices.com'
      ];
      
      let companyY = margin + 35;
      companyInfo.forEach(line => {
        doc.text(line, margin + 80, companyY);
        companyY += 12;
      });

      // Receipt title
      const titleY = margin + 100;
      doc.fontSize(24).font('Helvetica-Bold').fill('#1F2937');
      doc.text('DG INVOICE PAYMENT RECEIPT', 0, titleY, { align: 'center', width: pageWidth });

      // Receipt details header
      const receiptHeaderY = titleY + 50;
      doc.rect(margin, receiptHeaderY, contentWidth, 30)
         .fill('#F3F4F6')
         .stroke('#D1D5DB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Receipt Details', margin + 15, receiptHeaderY + 8);

      // Receipt information
      const receiptInfoY = receiptHeaderY + 40;
      const leftColumn = margin + 15;
      const rightColumn = margin + contentWidth / 2 + 15;

      // Left column
      doc.fontSize(10).font('Helvetica').fill('#374151');
      doc.text(`Receipt Number: ${payment.receiptNumber || payment._id}`, leftColumn, receiptInfoY);
      doc.text(`Payment Date: ${payment.paymentDate.toLocaleDateString('en-IN')}`, leftColumn, receiptInfoY + 20);
      doc.text(`Payment Method: ${payment.paymentMethod.toUpperCase()}`, leftColumn, receiptInfoY + 40);
      doc.text(`Amount: ₹${payment.amount.toLocaleString('en-IN')}`, leftColumn, receiptInfoY + 60);

      // Right column
      doc.text(`Invoice Number: ${payment.dgInvoiceId.invoiceNumber}`, rightColumn, receiptInfoY);
      doc.text(`Invoice Amount: ₹${payment.dgInvoiceId.totalAmount.toLocaleString('en-IN')}`, rightColumn, receiptInfoY + 20);
      doc.text(`Currency: ${payment.currency}`, rightColumn, receiptInfoY + 40);
      doc.text(`Status: ${payment.paymentStatus.toUpperCase()}`, rightColumn, receiptInfoY + 60);

      // Customer information
      const customerY = receiptInfoY + 100;
      doc.rect(margin, customerY, contentWidth, 30)
         .fill('#F3F4F6')
         .stroke('#D1D5DB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Customer Information', margin + 15, customerY + 8);

      const customerInfoY = customerY + 40;
      doc.fontSize(10).font('Helvetica').fill('#374151');
      doc.text(`Name: ${payment.customerId.name}`, leftColumn, customerInfoY);
      doc.text(`Email: ${payment.customerId.email}`, leftColumn, customerInfoY + 20);
      if (payment.customerId.phone) {
        doc.text(`Phone: ${payment.customerId.phone}`, leftColumn, customerInfoY + 40);
      }

      // Payment method details
      const paymentDetailsY = customerInfoY + 80;
      doc.rect(margin, paymentDetailsY, contentWidth, 30)
         .fill('#F3F4F6')
         .stroke('#D1D5DB');
      
      doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
      doc.text('Payment Method Details', margin + 15, paymentDetailsY + 8);

      const paymentMethodDetailsY = paymentDetailsY + 40;
      const paymentDetails = getPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails);
      
      doc.fontSize(10).font('Helvetica').fill('#374151');
      paymentDetails.forEach((detail, index) => {
        doc.text(detail, leftColumn, paymentMethodDetailsY + (index * 20));
      });

      // Notes section
      if (payment.notes) {
        const notesY = paymentMethodDetailsY + (paymentDetails.length * 20) + 30;
        doc.rect(margin, notesY, contentWidth, 30)
           .fill('#F3F4F6')
           .stroke('#D1D5DB');
        
        doc.fontSize(12).font('Helvetica-Bold').fill('#374151');
        doc.text('Notes', margin + 15, notesY + 8);

        doc.fontSize(10).font('Helvetica').fill('#374151');
        doc.text(payment.notes, leftColumn, notesY + 40, { width: contentWidth - 30 });
      }

      // Footer
      const footerY = pageHeight - 80;
      doc.fontSize(8).font('Helvetica').fill('#6B7280');
      doc.text('This is a computer-generated receipt and does not require a signature.', margin, footerY, { align: 'center', width: contentWidth });
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, margin, footerY + 15, { align: 'center', width: contentWidth });
      doc.text(`Generated by: ${payment.createdBy.firstName} ${payment.createdBy.lastName}`, margin, footerY + 30, { align: 'center', width: contentWidth });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const getPaymentMethodDetails = (paymentMethod: string, paymentMethodDetails: any): string[] => {
  const details: string[] = [];
  
  if (!paymentMethodDetails) return details;

  switch (paymentMethod) {
    case 'cash':
      const cashDetails = paymentMethodDetails.cash;
      if (cashDetails) {
        if (cashDetails.receivedBy) details.push(`Received By: ${cashDetails.receivedBy}`);
        if (cashDetails.receiptNumber) details.push(`Receipt Number: ${cashDetails.receiptNumber}`);
      }
      break;
      
    case 'cheque':
      const chequeDetails = paymentMethodDetails.cheque;
      if (chequeDetails) {
        if (chequeDetails.chequeNumber) details.push(`Cheque Number: ${chequeDetails.chequeNumber}`);
        if (chequeDetails.bankName) details.push(`Bank Name: ${chequeDetails.bankName}`);
        if (chequeDetails.branchName) details.push(`Branch Name: ${chequeDetails.branchName}`);
        if (chequeDetails.issueDate) details.push(`Issue Date: ${chequeDetails.issueDate}`);
        if (chequeDetails.accountHolderName) details.push(`Account Holder: ${chequeDetails.accountHolderName}`);
      }
      break;
      
    case 'bank_transfer':
      const bankDetails = paymentMethodDetails.bankTransfer;
      if (bankDetails) {
        if (bankDetails.bankName) details.push(`Bank Name: ${bankDetails.bankName}`);
        if (bankDetails.accountNumber) details.push(`Account Number: ${bankDetails.accountNumber}`);
        if (bankDetails.ifscCode) details.push(`IFSC Code: ${bankDetails.ifscCode}`);
        if (bankDetails.transactionId) details.push(`Transaction ID: ${bankDetails.transactionId}`);
        if (bankDetails.transferDate) details.push(`Transfer Date: ${bankDetails.transferDate}`);
      }
      break;
      
    case 'upi':
      const upiDetails = paymentMethodDetails.upi;
      if (upiDetails) {
        if (upiDetails.upiId) details.push(`UPI ID: ${upiDetails.upiId}`);
        if (upiDetails.transactionId) details.push(`Transaction ID: ${upiDetails.transactionId}`);
        if (upiDetails.payerName) details.push(`Payer Name: ${upiDetails.payerName}`);
      }
      break;
      
    case 'card':
      const cardDetails = paymentMethodDetails.card;
      if (cardDetails) {
        if (cardDetails.cardType) details.push(`Card Type: ${cardDetails.cardType.toUpperCase()}`);
        if (cardDetails.cardNetwork) details.push(`Card Network: ${cardDetails.cardNetwork.toUpperCase()}`);
        if (cardDetails.lastFourDigits) details.push(`Last 4 Digits: ${cardDetails.lastFourDigits}`);
        if (cardDetails.transactionId) details.push(`Transaction ID: ${cardDetails.transactionId}`);
        if (cardDetails.cardHolderName) details.push(`Card Holder: ${cardDetails.cardHolderName}`);
      }
      break;
      
    case 'other':
      const otherDetails = paymentMethodDetails.other;
      if (otherDetails) {
        if (otherDetails.methodName) details.push(`Method Name: ${otherDetails.methodName}`);
        if (otherDetails.referenceNumber) details.push(`Reference Number: ${otherDetails.referenceNumber}`);
      }
      break;
  }
  
  return details;
};

// Interface for AMC Quotation Payment
interface PopulatedAMCQuotationPayment extends Omit<IAMCQuotationPayment, 'amcQuotationId' | 'customerId' | 'createdBy'> {
  amcQuotationId: {
    _id: string;
    quotationNumber: string;
    grandTotal: number;
    company?: {
      name?: string;
      address?: string;
      phone?: string;
      email?: string;
    };
  };
  customerId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    addresses?: Array<{
      address: string;
      state: string;
      district: string;
      pincode: string;
      gstNumber?: string;
    }>;
  };
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

// Generate PDF for AMC quotation payments
export const generateAMCQuotationPaymentReceiptPDF = (payment: PopulatedAMCQuotationPayment): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 40,
        info: {
          Title: `AMC Quotation Payment Receipt - ${payment.quotationNumber}`,
          Author: 'Sun Power Services ERP',
          Subject: 'Payment Receipt',
          Keywords: 'payment, receipt, AMC quotation'
        }
      });

      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .text('PAYMENT RECEIPT', { align: 'center' })
         .moveDown(0.5);

      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text('AMC Quotation Payment Receipt', { align: 'center' })
         .moveDown(1);

      // Company Information
      if (payment.amcQuotationId.company) {
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text(payment.amcQuotationId.company.name || 'Sun Power Services', { align: 'center' });
        
        if (payment.amcQuotationId.company.address) {
          doc.fontSize(10)
             .font('Helvetica')
             .text(payment.amcQuotationId.company.address, { align: 'center' });
        }
        
        if (payment.amcQuotationId.company.phone || payment.amcQuotationId.company.email) {
          const contactInfo = [];
          if (payment.amcQuotationId.company.phone) contactInfo.push(`Phone: ${payment.amcQuotationId.company.phone}`);
          if (payment.amcQuotationId.company.email) contactInfo.push(`Email: ${payment.amcQuotationId.company.email}`);
          
          doc.fontSize(10)
             .font('Helvetica')
             .text(contactInfo.join(' | '), { align: 'center' });
        }
      }

      doc.moveDown(1);

      // Receipt Details
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Receipt Details', { underline: true })
         .moveDown(0.5);

      const receiptDetails = [
        ['Receipt Number:', payment.receiptNumber || `AMC-${payment.quotationNumber}-${payment._id}`],
        ['AMC Quotation Number:', payment.quotationNumber],
        ['Payment Date:', new Date(payment.paymentDate).toLocaleDateString('en-IN')],
        ['Payment Method:', payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1)],
        ['Amount:', `${payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Currency:', payment.currency],
        ['Payment Status:', payment.paymentStatus.charAt(0).toUpperCase() + payment.paymentStatus.slice(1)]
      ];

      receiptDetails.forEach(([label, value]) => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(label, 50, doc.y)
           .font('Helvetica')
           .text(value, 200, doc.y);
        doc.moveDown(0.3);
      });

      doc.moveDown(0.5);

      // Customer Information
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Customer Information', { underline: true })
         .moveDown(0.5);

      const customerDetails = [
        ['Customer Name:', payment.customerId.name],
        ['Email:', payment.customerId.email || 'N/A'],
        ['Phone:', payment.customerId.phone || 'N/A']
      ];

      customerDetails.forEach(([label, value]) => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(label, 50, doc.y)
           .font('Helvetica')
           .text(value, 200, doc.y);
        doc.moveDown(0.3);
      });

      // Customer Address
      if (payment.customerId.addresses && payment.customerId.addresses.length > 0) {
        const primaryAddress = payment.customerId.addresses.find((addr: any) => addr.isPrimary) || payment.customerId.addresses[0];
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('Address:', 50, doc.y)
           .font('Helvetica')
           .text(primaryAddress.address, 200, doc.y);
        doc.moveDown(0.2);
        doc.font('Helvetica')
           .text(`${primaryAddress.district}, ${primaryAddress.state} - ${primaryAddress.pincode}`, 200, doc.y);
        if (primaryAddress.gstNumber) {
          doc.moveDown(0.2);
          doc.font('Helvetica')
             .text(`GST: ${primaryAddress.gstNumber}`, 200, doc.y);
        }
        doc.moveDown(0.5);
      }

      // Payment Method Details
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('Payment Method Details', { underline: true })
         .moveDown(0.5);

      const methodDetails = getPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails);
      methodDetails.forEach(detail => {
        doc.fontSize(10)
           .font('Helvetica')
           .text(detail, 50, doc.y);
        doc.moveDown(0.3);
      });

      doc.moveDown(0.5);

      // AMC Quotation Summary
      doc.fontSize(12)
         .font('Helvetica-Bold')
         .text('AMC Quotation Summary', { underline: true })
         .moveDown(0.5);

      const quotationSummary = [
        ['AMC Quotation Total:', `${payment.amcQuotationId.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Amount Paid:', `${payment.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`],
        ['Remaining Amount:', `${(payment.amcQuotationId.grandTotal - payment.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`]
      ];

      quotationSummary.forEach(([label, value]) => {
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text(label, 50, doc.y)
           .font('Helvetica')
           .text(value, 200, doc.y);
        doc.moveDown(0.3);
      });

      // Notes
      if (payment.notes) {
        doc.moveDown(0.5);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('Notes', { underline: true })
           .moveDown(0.5);
        
        doc.fontSize(10)
           .font('Helvetica')
           .text(payment.notes, { width: 500 });
      }

      // Footer
      doc.moveDown(2);
      doc.fontSize(8)
         .font('Helvetica')
         .text('This is a computer-generated receipt and does not require a signature.', { align: 'center' })
         .moveDown(0.5);
      
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, { align: 'center' })
         .text(`Generated by: ${payment.createdBy.firstName} ${payment.createdBy.lastName}`, { align: 'center' });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};