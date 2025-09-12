import jsPDF from 'jspdf';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

interface DGQuotationData {
  quotationNumber: string;
  issueDate: string;
  validUntil: string;
  enquiryDetails?: {
    enquiryNo: string;
    enquiryDate: string;
    enquiryType: string;
    enquiryStatus: string;
    enquiryStage: string;
    assignedEmployeeName: string;
    plannedFollowUpDate: string;
    numberOfFollowUps: number;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
    pan?: string;
    corporateName?: string;
    address?: string;
    pinCode?: string;
    tehsil?: string;
    district?: string;
  };
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    pan: string;
    bankDetails: {
      bankName: string;
      accountNo: string;
      ifsc: string;
      branch: string;
    };
  };
  salesEngineer?: {
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    salesEmployeeCode: string;
  };
  dgSpecifications: {
    kva: string;
    phase: string;
    quantity: number;
    segment: string;
    subSegment: string;
    dgOwnership: string;
  };
  items: Array<{
    product: string;
    description: string;
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
  notes: string;
  terms: string;
  validityPeriod: number;
  deliveryTerms: string;
  paymentTerms: string;
  warrantyTerms: string;
  installationTerms: string;
  commissioningTerms: string;
  status: string;
  subject?: string;
  annexureRating?: string;
  dgModel?: string;
  cylinder?: string;
  warrantyFromInvoice?: string;
  warrantyFromCommissioning?: string;
  warrantyHours?: string;
  taxRate?: string;
  freightTerms?: string;
  deliveryPeriod?: string;
  validityDays?: string;
  quotationRevisionNo?: string;
}

export const generateDGQuotationPDF = async (quotationData: DGQuotationData): Promise<jsPDF> => {
  // Dynamically import jspdf-autotable
  await import('jspdf-autotable');
  
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Page dimensions
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  
  let yPosition = margin;
  
  // Header with logos
  doc.setFontSize(16);
  doc.setTextColor(220, 38, 38); // Red color for logos
  doc.setFont('helvetica', 'bold');
  
  // Left header - Powerol
  doc.text('powerol', margin, yPosition);
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('by Mahindra', margin, yPosition + 5);
  
  // Right header - Sun Power Services
  doc.setFontSize(14);
  doc.setTextColor(220, 38, 38);
  const sunPowerText = 'Sun Power Services';
  const sunPowerWidth = doc.getTextWidth(sunPowerText);
  doc.text(sunPowerText, pageWidth - margin - sunPowerWidth, yPosition);
  
  yPosition += 20;
  
  // Red line separator
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;
  
  // Enquiry/Quotation Header
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('Enquiry/Quotation', margin, yPosition);
  yPosition += 8;
  
  // Enquiry No and Ref/Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const enquiryNoText = `Enquiry No: ${quotationData.enquiryDetails?.enquiryNo || 'Drop Down'}`;
  doc.text(enquiryNoText, margin, yPosition);
  
  const refText = `Ref: ${quotationData.quotationNumber || 'SPS / 0001 / 25-26'}`;
  const dateText = `Date: ${quotationData.issueDate || '03-July-2025'}`;
  const refWidth = doc.getTextWidth(refText);
  const dateWidth = doc.getTextWidth(dateText);
  
  doc.text(refText, margin, yPosition + 5);
  doc.text(dateText, pageWidth - margin - dateWidth, yPosition + 5);
  yPosition += 15;
  
  // Recipient Details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text('To,', margin, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.text(quotationData.customer.name || 'M/s. Enpar Heater', margin, yPosition);
  yPosition += 4;
  
  // Use shipToAddress if available, otherwise fallback to customer address
  const address = quotationData.customer.address || '2nd floor Sri Towers, 17/18, Pattullos Road, Mount Road, Bayapettak, Chennai.';
  doc.text(address, margin, yPosition);
  yPosition += 8;
  
  doc.text('Dear Sir,', margin, yPosition);
  yPosition += 5;
  
  // Introduction text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const introText = [
    "We thank you very much for the interest shown in Mahindra Powerol Genset.",
    "Mahindra Powerol offers end to end solution for your back power requirements from 5 kVA to 625 kVA gensets in single configuration and up-to 4000 kVA in multiple configurations.",
    "Mahindra Powerol is the only Indian Industrial Engine manufacturer to win the prestigious JQM & DEMING AWARD. All Mahindra Engines meet the stringent CPCB IV+ norms for Noise and Exhaust Emission.",
    "Mahindra engines are manufactured at our facilities in Chakan, Pune and Nagpur with fully automated, controlled environment engine assembly and Quality control systems.",
    "More than 4,00,000 Mahindra Powerol gensets are powering diversified segments like Engineering, Realty, Retail, IT, Telecom, BFSI, Manufacturing, Pharma, Textile, Oil & Gas, DGSND.",
    "It will be our pleasure to serve you. Thanking you and assuring you of our prompt attention at all times."
  ];
  
  for (const line of introText) {
    const lines = doc.splitTextToSize(line, contentWidth);
    doc.text(lines, margin, yPosition);
    yPosition += lines.length * 5 + 3;
  }
  
  yPosition += 10;
  
  // Commercial Terms Table
  const commercialTermsData = [
    ['Quotation No.', quotationData.quotationNumber || 'Internal Entry'],
    ['Issue Date', quotationData.issueDate || 'Internal Entry'],
    ['Valid Until', quotationData.validUntil || 'Internal Entry'],
    ['Quotation Revision No.', quotationData.quotationRevisionNo || 'Internal Entry'],
    ['DG Enquiry No.', quotationData.enquiryDetails?.enquiryNo || 'Internal Entry'],
    ['Subject', quotationData.subject || 'Internal Entry'],
    ['Annexure Rating', quotationData.annexureRating || 'Internal Entry'],
    ['DG Model', quotationData.dgModel || 'Internal Entry'],
    ['Cylinder', quotationData.cylinder || 'Internal Entry'],
    ['Warranty From Invoice', quotationData.warrantyFromInvoice || 'Internal Entry'],
    ['Warranty From Commissioning', quotationData.warrantyFromCommissioning || 'Internal Entry'],
    ['Warranty Hours', quotationData.warrantyHours || 'Internal Entry'],
    ['Tax Rate', quotationData.taxRate || 'Internal Entry'],
    ['Freight Terms', quotationData.freightTerms || 'Internal Entry'],
    ['Delivery Period', quotationData.deliveryPeriod || 'Internal Entry'],
    ['Validity Days', quotationData.validityDays || 'Internal Entry']
  ];
  
  doc.autoTable({
    startY: yPosition,
    head: [['Commercial Terms', 'Details']],
    body: commercialTermsData,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 80 }
    }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 10;
  
  // Product Details Table
  const productData = quotationData.items.map((item, index) => [
    (index + 1).toString(),
    item.description,
    item.quantity.toString(),
    `₹${item.unitPrice.toLocaleString()}`,
    `₹${item.totalPrice.toLocaleString()}`
  ]);
  
  // Add totals
  productData.push(['', '', '', 'Subtotal', `₹${quotationData.subtotal.toLocaleString()}`]);
  productData.push(['', '', '', 'Discount', `₹${quotationData.totalDiscount.toLocaleString()}`]);
  productData.push(['', '', '', 'Tax', `₹${quotationData.totalTax.toLocaleString()}`]);
  productData.push(['', '', '', 'Grand Total', `₹${quotationData.grandTotal.toLocaleString()}`]);
  
  doc.autoTable({
    startY: yPosition,
    head: [['Sr. No.', 'Product Description', 'Quantity', 'Unit Rate (INR)', 'Total (INR)']],
    body: productData,
    theme: 'grid',
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 80 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 30, halign: 'right' }
    }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 10;
  
  // Warranty Policy
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('WARRANTY POLICY:', margin, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  const warrantyText = `Warranty period: ${quotationData.warrantyFromInvoice || '12'} months from date of invoice OR ${quotationData.warrantyFromCommissioning || '18'} months from Date of commissioning OR ${quotationData.warrantyHours || '3000'} Hours of operation whichever is earlier. Warranty for electrical/proprietary items as per manufacturer's standard clause. Warranty does not cover normal wear and tear, accident, wrong handling, improper maintenance.`;
  const warrantyLines = doc.splitTextToSize(warrantyText, contentWidth);
  doc.text(warrantyLines, margin, yPosition);
  yPosition += warrantyLines.length * 5 + 10;
  
  // Terms & Conditions
  doc.setFont('helvetica', 'bold');
  doc.text('TERMS & CONDITIONS:', margin, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  const termsText = [
    `Taxes: Prices are inclusive of GST @${quotationData.taxRate || '18'}%.`,
    `Freight: Prices are Exclusive of freight charges - Separately mentioned ${quotationData.freightTerms || 'Extra'}.`,
    `Transit Insurance: Extra at actuals.`,
    `Approvals: Approval from concern authorities shall be by customers account.`,
    `Delivery: Ex-stock subject to prior sale. ${quotationData.deliveryPeriod || '2-3 weeks'} from the date of receipt of your confirmed order/advance payment. We shall not be responsible for any delay due to force majeure conditions.`,
    `Validity: Our offer shall remain valid for a period of ${quotationData.validityDays || '30'} Days from the date of our offer and subject to your confirmation/amendment.`,
    `Scope of Supply: Our offer is confined to the stipulated technical and commercial clauses and subject to mutual agreement.`
  ];
  
  for (const term of termsText) {
    const lines = doc.splitTextToSize(term, contentWidth);
    doc.text(lines, margin, yPosition);
    yPosition += lines.length * 5 + 2;
  }
  
  yPosition += 5;
  
  // Exclusions
  doc.setFont('helvetica', 'bold');
  doc.text('EXCLUSIONS:', margin, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  const exclusionsText = "Installation/job work, unloading, earthing pits, DG room, foundation, cabling, exhaust piping, manual changeover switch, etc. will be charged extra.";
  const exclusionsLines = doc.splitTextToSize(exclusionsText, contentWidth);
  doc.text(exclusionsLines, margin, yPosition);
  yPosition += exclusionsLines.length * 5 + 10;
  
  // Arbitration
  doc.setFont('helvetica', 'bold');
  doc.text('ARBITRATION:', margin, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  const arbitrationText = "Any dispute arising out of or in connection with this contract shall be settled by arbitration in accordance with the Arbitration and Conciliation Act 1996. The arbitration shall be conducted by a single arbitrator appointed by mutual consent. The venue of arbitration shall be at Chennai and the language of arbitration shall be English.";
  const arbitrationLines = doc.splitTextToSize(arbitrationText, contentWidth);
  doc.text(arbitrationLines, margin, yPosition);
  yPosition += arbitrationLines.length * 5 + 15;
  
  // Signature section
  doc.text('Yours Truly,', margin, yPosition);
  yPosition += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('For SUN POWER SERVICES', margin, yPosition);
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${quotationData.salesEngineer?.firstName || ''} ${quotationData.salesEngineer?.lastName || '________________'}`, margin, yPosition);
  yPosition += 4;
  doc.text('Role: Sales Engineer', margin, yPosition);
  yPosition += 4;
  doc.text(`Mobile: ${quotationData.salesEngineer?.phone || quotationData.company.phone || '________________'}`, margin, yPosition);
  yPosition += 4;
  doc.text(`Email: ${quotationData.salesEngineer?.email || quotationData.company.email || '________________'}`, margin, yPosition);
  yPosition += 10;
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.text('AUTHORISED DEALER OF SALES AND SERVICE FOR MAHINDRA DIESEL GENERATORS', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Door No. 53, Plot No. 4, 4th Street, Phase-1Extension, Vivekakonni Nagar, Chennai - 600 116.', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  doc.text('Phone: 044 2482 8218', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 4;
  doc.text('E-mail: sunpowerservices@gmail.com Web: www.sunpowerservices.in', pageWidth / 2, yPosition, { align: 'center' });
  
  // Add enquiry tracking information at the bottom
  if (quotationData.enquiryDetails) {
    yPosition += 10;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Enquiry Tracking Information:', margin, yPosition);
    yPosition += 4;
    doc.text(`Enquiry Date: ${quotationData.enquiryDetails.enquiryDate} | Type: ${quotationData.enquiryDetails.enquiryType} | Status: ${quotationData.enquiryDetails.enquiryStatus} | Stage: ${quotationData.enquiryDetails.enquiryStage}`, margin, yPosition);
    yPosition += 4;
    doc.text(`Assigned Employee: ${quotationData.enquiryDetails.assignedEmployeeName} | Follow-ups: ${quotationData.enquiryDetails.numberOfFollowUps} | Next Follow-up: ${quotationData.enquiryDetails.plannedFollowUpDate}`, margin, yPosition);
  }
  
  return doc;
};

export const downloadDGQuotationPDF = async (quotationData: DGQuotationData, filename?: string): Promise<void> => {
  const doc = await generateDGQuotationPDF(quotationData);
  const defaultFilename = `DG_Quotation_${quotationData.quotationNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename || defaultFilename);
};

export const generateDGQuotationPDFBlob = async (quotationData: DGQuotationData): Promise<Blob> => {
  const doc = await generateDGQuotationPDF(quotationData);
  return doc.output('blob');
}; 