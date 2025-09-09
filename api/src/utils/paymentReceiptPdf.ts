import PDFDocument from 'pdfkit';
import { IPurchaseOrderPayment } from '../models/PurchaseOrderPayment';

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
         .fill('#F9FAFB');
      
      doc.fontSize(10).font('Helvetica-Bold').fill('#374151');
      doc.text('Receipt Number:', margin + 15, receiptHeaderY + 10);
      doc.text('Date:', margin + 15, receiptHeaderY + 20);
      
      doc.font('Helvetica').fill('#1F2937');
      doc.text(String(payment._id), margin + 100, receiptHeaderY + 10);
      doc.text(new Date(payment.paymentDate).toLocaleDateString('en-IN'), margin + 100, receiptHeaderY + 20);

      // Payment details section
      const paymentSectionY = receiptHeaderY + 50;
      doc.fontSize(14).font('Helvetica-Bold').fill('#1F2937');
      doc.text('Payment Information', margin, paymentSectionY);

      // Payment details table with borders
      const tableY = paymentSectionY + 25;
      const tableWidth = contentWidth;
      const rowHeight = 25;
      const labelWidth = 150;
      const valueWidth = tableWidth - labelWidth;

      // Table header
      doc.rect(margin, tableY, tableWidth, rowHeight)
         .fill('#F3F4F6');
      
      doc.fontSize(10).font('Helvetica-Bold').fill('#374151');
      doc.text('Description', margin + 10, tableY + 8);
      doc.text('Details', margin + labelWidth + 10, tableY + 8);

      // Table rows
      const paymentDetails = [
        { label: 'Payment Amount', value: `₹${payment.amount.toLocaleString('en-IN')}` },
        { label: 'Payment Method', value: getPaymentMethodLabel(payment.paymentMethod) },
        { label: 'Payment Status', value: payment.paymentStatus.toUpperCase() },
        { label: 'Currency', value: payment.currency },
        { label: 'PO Number', value: payment.poNumber },
        { label: 'Supplier', value: payment.supplierId.name },
      ];

      paymentDetails.forEach((detail, index) => {
        const rowY = tableY + (index + 1) * rowHeight;
        
        // Alternate row colors
        if (index % 2 === 0) {
          doc.rect(margin, rowY, tableWidth, rowHeight)
             .fill('#FFFFFF');
        } else {
          doc.rect(margin, rowY, tableWidth, rowHeight)
             .fill('#F9FAFB');
        }
        
        // Row border
        doc.rect(margin, rowY, tableWidth, rowHeight)
           .stroke('#E5E7EB');
        
        // Vertical separator
        doc.moveTo(margin + labelWidth, rowY)
           .lineTo(margin + labelWidth, rowY + rowHeight)
           .stroke('#E5E7EB');
        
        // Text content
        doc.fontSize(9).font('Helvetica').fill('#374151');
        doc.text(detail.label, margin + 10, rowY + 8);
        doc.font('Helvetica-Bold').fill('#1F2937');
        doc.text(detail.value, margin + labelWidth + 10, rowY + 8);
      });

      // Payment method specific details
      const methodDetailsStartY = tableY + ((paymentDetails.length + 1) * rowHeight) + 20;
      if (payment.paymentMethodDetails && Object.keys(payment.paymentMethodDetails).length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').fill('#1F2937');
        doc.text('Payment Method Details', margin, methodDetailsStartY);
        
        const methodDetails = getPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails);
        let methodCurrentY = methodDetailsStartY + 20;
        
        methodDetails.forEach((detail, index) => {
          const detailY = methodCurrentY + (index * 20);
          
          // Background for each detail
          doc.rect(margin, detailY - 5, contentWidth, 20)
             .fill(index % 2 === 0 ? '#FFFFFF' : '#F9FAFB');
          
          doc.fontSize(9).font('Helvetica').fill('#374151');
          doc.text(`${detail.label}:`, margin + 10, detailY);
          doc.font('Helvetica-Bold').fill('#1F2937');
          doc.text(detail.value, margin + 150, detailY);
        });
      }

      // Notes section
      if (payment.notes) {
        const notesStartY = methodDetailsStartY + (payment.paymentMethodDetails && Object.keys(payment.paymentMethodDetails).length > 0 ? 
          (getPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails).length * 20) + 40 : 40);
        
        doc.fontSize(12).font('Helvetica-Bold').fill('#1F2937');
        doc.text('Notes', margin, notesStartY);
        
        doc.rect(margin, notesStartY + 15, contentWidth, 60)
           .fill('#F9FAFB')
           .stroke('#E5E7EB');
        
        doc.fontSize(9).font('Helvetica').fill('#374151');
        doc.text(payment.notes, margin + 10, notesStartY + 25, { 
          width: contentWidth - 20,
          align: 'left'
        });
      }

      // Footer section
      const footerY = pageHeight - 80;
      doc.rect(margin, footerY, contentWidth, 40)
         .fill('#F3F4F6')
         .stroke('#E5E7EB');
      
      doc.fontSize(8).font('Helvetica').fill('#6B7280');
      doc.text('This is a computer generated receipt and does not require a signature.', 
               margin + 10, footerY + 10, { align: 'center', width: contentWidth - 20 });
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 
               margin + 10, footerY + 25, { align: 'center', width: contentWidth - 20 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Helper function to get payment method label
const getPaymentMethodLabel = (method: string): string => {
  const labels: { [key: string]: string } = {
    'cash': 'Cash',
    'cheque': 'Cheque',
    'bank_transfer': 'Bank Transfer',
    'upi': 'UPI',
    'card': 'Credit/Debit Card',
    'other': 'Other'
  };
  return labels[method] || method;
};

// Helper function to get payment method specific details
const getPaymentMethodDetails = (method: string, details: any): Array<{label: string, value: string}> => {
  const methodDetails: Array<{label: string, value: string}> = [];
  
  switch (method) {
    case 'cash':
      if (details.cash?.receivedBy) methodDetails.push({ label: 'Received By', value: details.cash.receivedBy });
      if (details.cash?.receiptNumber) methodDetails.push({ label: 'Receipt Number', value: details.cash.receiptNumber });
      break;
      
    case 'cheque':
      if (details.cheque?.chequeNumber) methodDetails.push({ label: 'Cheque Number', value: details.cheque.chequeNumber });
      if (details.cheque?.bankName) methodDetails.push({ label: 'Bank Name', value: details.cheque.bankName });
      if (details.cheque?.branchName) methodDetails.push({ label: 'Branch Name', value: details.cheque.branchName });
      if (details.cheque?.issueDate) methodDetails.push({ label: 'Issue Date', value: new Date(details.cheque.issueDate).toLocaleDateString('en-IN') });
      if (details.cheque?.accountHolderName) methodDetails.push({ label: 'Account Holder', value: details.cheque.accountHolderName });
      if (details.cheque?.accountNumber) methodDetails.push({ label: 'Account Number', value: details.cheque.accountNumber });
      if (details.cheque?.ifscCode) methodDetails.push({ label: 'IFSC Code', value: details.cheque.ifscCode });
      break;
      
    case 'bank_transfer':
    case 'bankTransfer':
      if (details.bankTransfer?.bankName) methodDetails.push({ label: 'Bank Name', value: details.bankTransfer.bankName });
      if (details.bankTransfer?.accountNumber) methodDetails.push({ label: 'Account Number', value: details.bankTransfer.accountNumber });
      if (details.bankTransfer?.ifscCode) methodDetails.push({ label: 'IFSC Code', value: details.bankTransfer.ifscCode });
      if (details.bankTransfer?.transactionId) methodDetails.push({ label: 'Transaction ID', value: details.bankTransfer.transactionId });
      if (details.bankTransfer?.transferDate) methodDetails.push({ label: 'Transfer Date', value: new Date(details.bankTransfer.transferDate).toLocaleDateString('en-IN') });
      if (details.bankTransfer?.referenceNumber) methodDetails.push({ label: 'Reference Number', value: details.bankTransfer.referenceNumber });
      break;
      
    case 'upi':
      if (details.upi?.upiId) methodDetails.push({ label: 'UPI ID', value: details.upi.upiId });
      if (details.upi?.transactionId) methodDetails.push({ label: 'Transaction ID', value: details.upi.transactionId });
      if (details.upi?.payerName) methodDetails.push({ label: 'Payer Name', value: details.upi.payerName });
      if (details.upi?.payerPhone) methodDetails.push({ label: 'Payer Phone', value: details.upi.payerPhone });
      break;
      
    case 'card':
      if (details.card?.cardType) methodDetails.push({ label: 'Card Type', value: details.card.cardType });
      if (details.card?.cardNetwork) methodDetails.push({ label: 'Card Network', value: details.card.cardNetwork });
      if (details.card?.lastFourDigits) methodDetails.push({ label: 'Last 4 Digits', value: `****${details.card.lastFourDigits}` });
      if (details.card?.transactionId) methodDetails.push({ label: 'Transaction ID', value: details.card.transactionId });
      if (details.card?.cardHolderName) methodDetails.push({ label: 'Card Holder', value: details.card.cardHolderName });
      if (details.card?.authorizationCode) methodDetails.push({ label: 'Authorization Code', value: details.card.authorizationCode });
      break;
      
    case 'other':
      if (details.other?.methodName) methodDetails.push({ label: 'Method Name', value: details.other.methodName });
      if (details.other?.referenceNumber) methodDetails.push({ label: 'Reference Number', value: details.other.referenceNumber });
      break;
  }
  
  return methodDetails;
};
