import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface DGInvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  deliveryNotes?: string;
  paymentTerms?: string;
  referenceNumber?: string;
  referenceDate?: string;
  dgQuotationNumber?: string | { quotationNumber: string };
  proformaReference?: string | { proformaNumber: string; _id: string };
  irn?: string;
  ackNumber?: string;
  ackDate?: string;
  buyersOrderNumber?: string;
  buyersOrderDate?: string;
  dispatchDocNo?: string;
  deliveryNoteDate?: string;
  dispatchedThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
  };
  billingAddress?: {
    address: string;
    district?: string;
    state?: string;
    pincode?: string;
    gstNumber?: string;
  };
  shippingAddress?: {
    address: string;
    district?: string;
    state?: string;
    pincode?: string;
    gstNumber?: string;
  };
  items: Array<{
    kva: string;
    hsnNumber?: string;
    gstRate?: number;
    quantity?: number;
    unitPrice?: number;
    discount?: number;
    totalPrice?: number;
  }>;
  transportCharges?: {
    hsnNumber?: string;
    gstRate?: number;
    quantity?: number;
    unitPrice?: number;
    amount?: number;
    gstAmount?: number;
  };
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  qrCodeInvoice?: string;
}

export const generateDGInvoicePDF = (invoiceData: DGInvoiceData): void => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Company Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Sun Power Services', 20, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('D No.53, Plot No.4, 4th Street, Phase-1 Extension,', 20, y);
  y += 4;
  doc.text('Annai Velankanni Nagar, Madhananthapuram, Porur,', 20, y);
  y += 4;
  doc.text('Chennai - 600116', 20, y);
  y += 4;
  doc.text('Contact: 044-24828218, 9176660123', 20, y);
  y += 4;
  doc.text('GSTIN/UIN: 33BLFPS9951M1ZC', 20, y);
  y += 4;
  doc.text('State Name: Tamil Nadu, Code: 33', 20, y);
  y += 4;
  doc.text('E-Mail: sunpowerservices@gmail.com', 20, y);
  y += 10;

  // Invoice Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.text('INVOICE', pageWidth / 2, y, { align: 'center' });
  y += 15;

  // Invoice Details Table
  const invoiceDetails = [
    ['Invoice No.:', invoiceData.invoiceNumber || 'N/A'],
    ['Dated:', formatDate(invoiceData.invoiceDate)],
    ['Delivery Note:', typeof invoiceData.deliveryNotes === 'string' ? invoiceData.deliveryNotes : ''],
    ['Mode/Terms of Payment:', typeof invoiceData.paymentTerms === 'string' ? invoiceData.paymentTerms : ''],
    ['Reference No. & Date:', typeof invoiceData.referenceNumber === 'string' && invoiceData.referenceNumber ? `${invoiceData.referenceNumber} ${formatDate(invoiceData.referenceDate || '')}` : ''],
    ['Other References(Quotation):', typeof invoiceData.dgQuotationNumber === 'object' ? invoiceData.dgQuotationNumber?.quotationNumber || '' : invoiceData.dgQuotationNumber || ''],
    ['IRN:', invoiceData.irn || 'N/A'],
    ['ACK Number:', invoiceData.ackNumber || 'N/A'],
    ['ACK Date:', formatDate(invoiceData.ackDate || '')],
    ['Buyer\'s Order No.:', typeof invoiceData.buyersOrderNumber === 'string' ? invoiceData.buyersOrderNumber : ''],
    ['Dated:', formatDate(invoiceData.buyersOrderDate || '')],
    ['Dispatch Doc No.:', typeof invoiceData.dispatchDocNo === 'string' ? invoiceData.dispatchDocNo : ''],
    ['Delivery Note Date:', formatDate(invoiceData.deliveryNoteDate || '')],
    ['Dispatched through:', typeof invoiceData.dispatchedThrough === 'string' ? invoiceData.dispatchedThrough : ''],
    ['Destination:', typeof invoiceData.destination === 'string' ? invoiceData.destination : ''],
    ['Terms of Delivery:', typeof invoiceData.termsOfDelivery === 'string' ? invoiceData.termsOfDelivery : '']
  ];

  autoTable(doc, {
    startY: y,
    head: [['Field', 'Value']],
    body: invoiceDetails,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 50 }
    }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Consignee and Buyer Information
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Consignee (Ship to)', 20, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (invoiceData.shippingAddress) {
    doc.text(invoiceData.shippingAddress.address || 'N/A', 20, y);
    y += 4;
    if (invoiceData.shippingAddress.district) {
      doc.text(invoiceData.shippingAddress.district, 20, y);
      y += 4;
    }
    if (invoiceData.shippingAddress.state && invoiceData.shippingAddress.pincode) {
      doc.text(`${invoiceData.shippingAddress.state} - ${invoiceData.shippingAddress.pincode}`, 20, y);
      y += 4;
    }
    doc.text(`GSTIN/UIN: ${invoiceData.shippingAddress.gstNumber || 'N/A'}`, 20, y);
    y += 4;
    doc.text(`State Name: ${invoiceData.shippingAddress.state || 'N/A'}, Code: 29`, 20, y);
    y += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Buyer (Bill to)', 20, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(invoiceData.customer?.name || 'N/A', 20, y);
  y += 4;
  if (invoiceData.billingAddress) {
    doc.text(invoiceData.billingAddress.address || 'N/A', 20, y);
    y += 4;
    if (invoiceData.billingAddress.district) {
      doc.text(invoiceData.billingAddress.district, 20, y);
      y += 4;
    }
    if (invoiceData.billingAddress.state && invoiceData.billingAddress.pincode) {
      doc.text(`${invoiceData.billingAddress.state} - ${invoiceData.billingAddress.pincode}`, 20, y);
      y += 4;
    }
    doc.text(`GSTIN/UIN: ${invoiceData.billingAddress.gstNumber || 'N/A'}`, 20, y);
    y += 4;
    doc.text(`State Name: ${invoiceData.billingAddress.state || 'N/A'}, Code: 33`, 20, y);
    y += 4;
    doc.text(`Place of Supply: ${invoiceData.billingAddress.state || 'N/A'}`, 20, y);
    y += 10;
  }

  // Items Table
  const itemsData = invoiceData.items?.map((item, index) => [
    `${item.kva} KVA Mahindra Powerol Diesel Genset\n(Including of Transport & Unloading Charges)`,
    item.hsnNumber || '85021100',
    `${item.gstRate || 0}%`,
    `${formatNumber(item.quantity || 0)} Nos.`,
    `${formatNumber(item.unitPrice || 0)}`,
    `${item.discount || 0}`,
    formatNumber(item.totalPrice || 0)
  ]) || [];

  // Add transport charges if present
  if (invoiceData.transportCharges && invoiceData.transportCharges.unitPrice && invoiceData.transportCharges.unitPrice > 0) {
    itemsData.push([
      'Transport Charges',
      invoiceData.transportCharges.hsnNumber || '998399',
      `${invoiceData.transportCharges.gstRate || 0}%`,
      `${formatNumber(invoiceData.transportCharges.quantity || 0)} Nos.`,
      `${formatNumber(invoiceData.transportCharges.unitPrice || 0)}`,
      '0',
      formatNumber(invoiceData.transportCharges.amount || 0)
    ]);
  }

  // Add subtotal row
  itemsData.push(['', '', '', '', '', 'Subtotal', formatNumber(invoiceData.subtotal || 0)]);

  // Add tax rows
  itemsData.push(['', '', '', '', '', 'OUTPUT SGST', formatNumber((invoiceData.taxAmount || 0) / 2)]);
  itemsData.push(['', '', '', '', '', 'OUTPUT CGST', formatNumber((invoiceData.taxAmount || 0) / 2)]);

  // Add total row
  const totalQuantity = invoiceData.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
  itemsData.push(['Total', '', '', `${totalQuantity} Nos.`, '', '', `₹ ${formatNumber(invoiceData.totalAmount || 0)}`]);

  autoTable(doc, {
    startY: y,
    head: [['Description of Goods and Services', 'HSN/SAC', 'GST Rate', 'Quantity', 'Rate per', 'Disc. %', 'Amount']],
    body: itemsData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 20 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 20 },
      5: { cellWidth: 15 },
      6: { cellWidth: 25 }
    }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Amount in Words
  const numberToWords = (num: number) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    
    const lakhs = Math.floor(num / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = Math.floor((num % 1000) / 100);
    const tensAndOnes = num % 100;
    
    let result = '';
    
    if (lakhs > 0) {
      result += ones[lakhs] + ' Lakh ';
    }
    if (thousands > 0) {
      result += ones[thousands] + ' Thousand ';
    }
    if (hundreds > 0) {
      result += ones[hundreds] + ' Hundred ';
    }
    if (tensAndOnes > 0) {
      if (tensAndOnes < 10) {
        result += ones[tensAndOnes];
      } else if (tensAndOnes < 20) {
        result += teens[tensAndOnes - 10];
      } else {
        result += tens[Math.floor(tensAndOnes / 10)] + ' ' + ones[tensAndOnes % 10];
      }
    }
    
    return result.trim() + ' Only';
  };

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Amount Chargeable (in words): Indian Rupees ${numberToWords(Math.round(invoiceData.totalAmount || 0))}`, 20, y);
  y += 10;

  // Tax Details Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Tax Details (HSN/SAC wise)', 20, y);
  y += 8;

  const taxDetailsData = invoiceData.items?.map((item) => {
    const itemSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
    const discountAmount = (itemSubtotal * (item.discount || 0)) / 100;
    const taxableValue = itemSubtotal - discountAmount;
    const gstAmount = (taxableValue * (item.gstRate || 0)) / 100;
    
    return [
      item.hsnNumber || '85021100',
      formatNumber(taxableValue),
      `${Math.round((item.gstRate || 0) / 2)}%`,
      formatNumber(gstAmount / 2),
      `${Math.round((item.gstRate || 0) / 2)}%`,
      formatNumber(gstAmount / 2),
      formatNumber(gstAmount)
    ];
  }) || [];

  // Add transport charges tax if present
  if (invoiceData.transportCharges && invoiceData.transportCharges.unitPrice && invoiceData.transportCharges.unitPrice > 0) {
    const transportTaxableValue = invoiceData.transportCharges.amount || 0;
    const transportGstAmount = invoiceData.transportCharges.gstAmount || 0;
    
    taxDetailsData.push([
      invoiceData.transportCharges.hsnNumber || '998399',
      formatNumber(transportTaxableValue),
      `${Math.round((invoiceData.transportCharges.gstRate || 0) / 2)}%`,
      formatNumber(transportGstAmount / 2),
      `${Math.round((invoiceData.transportCharges.gstRate || 0) / 2)}%`,
      formatNumber(transportGstAmount / 2),
      formatNumber(transportGstAmount)
    ]);
  }

  // Add total row
  taxDetailsData.push([
    'Total',
    formatNumber(invoiceData.subtotal || 0),
    '',
    formatNumber((invoiceData.taxAmount || 0) / 2),
    '',
    formatNumber((invoiceData.taxAmount || 0) / 2),
    formatNumber(invoiceData.taxAmount || 0)
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      ['HSN/SAC', 'Taxable Value', 'CGST', 'CGST', 'SGST/UTGST', 'SGST/UTGST', 'Total Tax Amount'],
      ['', '', 'Rate', 'Amount', 'Rate', 'Amount', '']
    ],
    body: taxDetailsData,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 25 },
      2: { cellWidth: 15 },
      3: { cellWidth: 20 },
      4: { cellWidth: 15 },
      5: { cellWidth: 20 },
      6: { cellWidth: 25 }
    }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Tax Amount in Words
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Tax Amount (in words): Indian Rupees ${numberToWords(Math.round(invoiceData.taxAmount || 0))}`, 20, y);
  y += 15;

  // Bank Details
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Company\'s PAN: BLFPS9951M', 20, y);
  y += 4;
  doc.text('Company\'s Bank Details:', 20, y);
  y += 4;
  doc.text('Bank Name: Hdfc Bank A/c No:50200051862959', 20, y);
  y += 4;
  doc.text('A/c No.: 50200051862959', 20, y);
  y += 4;
  doc.text('Branch & IFS Code: Moulivakkam & HDFC0005281', 20, y);
  y += 15;

  // Declaration
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.text('"We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."', 20, y);
  y += 15;

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('for Sun Power Services', 20, y);
  y += 20;
  doc.text('Authorised Signatory', 20, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('This is a Computer Generated Invoice', pageWidth - 20, y, { align: 'right' });

  // Save the PDF
  const fileName = `DG_Invoice_${invoiceData.invoiceNumber || 'Draft'}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};
