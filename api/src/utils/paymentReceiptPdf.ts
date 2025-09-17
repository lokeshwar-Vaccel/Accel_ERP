import PDFDocument from 'pdfkit';
import { IPurchaseOrderPayment } from '../models/PurchaseOrderPayment';
import { IQuotationPayment } from '../models/QuotationPayment';
import { IInvoicePayment } from '../models/InvoicePayment';
import { IDGInvoicePayment } from '../models/DGInvoicePayment';

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