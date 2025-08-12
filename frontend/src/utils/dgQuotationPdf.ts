import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  dgSpecifications: {
    kva: string;
    phase: string;
    quantity: number;
    fuelType: string;
    engineModel: string;
    alternatorModel: string;
    fuelTankCapacity: string;
    runtime: string;
    noiseLevel: string;
    emissionCompliance: string;
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
}

export const generateDGQuotationPDF = (quotationData: DGQuotationData): jsPDF => {
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
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const dateText = new Date(quotationData.issueDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const dateWidth = doc.getTextWidth(dateText);
  doc.text(dateText, pageWidth - margin - dateWidth, yPosition + 8);
  
  yPosition += 20;
  
  // Red line separator
  doc.setDrawColor(220, 38, 38);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;
  
  // Enquiry details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  
  // Highlighted enquiry number
  const enquiryNoText = `Enquiry No: ${quotationData.enquiryDetails?.enquiryNo || '-'}`;
  doc.setFillColor(255, 255, 0); // Yellow background
  doc.rect(margin - 2, yPosition - 3, doc.getTextWidth(enquiryNoText) + 4, 6, 'F');
  doc.setTextColor(0, 0, 0);
  doc.text(enquiryNoText, margin, yPosition);
  yPosition += 5;
  doc.text('TO', margin, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  doc.text(quotationData.customer.name, margin, yPosition);
  yPosition += 4;
  doc.text(quotationData.customer.address || '', margin, yPosition);
  yPosition += 4;
  doc.text(`Kind Attn. ${quotationData.customer.corporateName || ''}`, margin, yPosition);
  yPosition += 4;
  doc.text(`Mob number - ${quotationData.customer.phone}`, margin, yPosition);
  yPosition += 4;
  doc.text(`Site @${quotationData.customer.district || ''}`, margin, yPosition);
  yPosition += 8;
  doc.text('Dear Sir,', margin, yPosition);
  yPosition += 10;
  
  // Subject line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const subjectText = `Sub: Best Quote for Supply ${quotationData.dgSpecifications.kva} & ${quotationData.dgSpecifications.kva} Kva Mahindra Powerol DG set CPCB IV+`;
  const subjectLines = doc.splitTextToSize(subjectText, contentWidth);
  doc.text(subjectLines, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += subjectLines.length * 5 + 10;
  
  // Body content
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const notesLines = doc.splitTextToSize(quotationData.notes, contentWidth);
  doc.text(notesLines, margin, yPosition);
  yPosition += notesLines.length * 5 + 10;
  
  // Items table
  const tableData = quotationData.items.map((item, index) => [
    (index + 1).toString(),
    item.description,
    item.quantity.toString(),
    `₹${item.unitPrice.toLocaleString()}`
  ]);
  
  (doc as any).autoTable({
    startY: yPosition,
    head: [['Sl.No', 'Description', 'Qty', 'Basic price']],
    body: tableData,
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
      1: { cellWidth: 100 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 30, halign: 'right' }
    }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 10;
  
  // Commercial terms
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Commercial Terms:', margin, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'normal');
  const termsLines = doc.splitTextToSize(quotationData.terms, contentWidth);
  doc.text(termsLines, margin, yPosition);
  yPosition += termsLines.length * 5 + 10;
  
  // Bank details table
  const bankData = [
    ['GST NO', quotationData.company.pan],
    ['ACCOUNT NAME', quotationData.company.name],
    ['ACCOUNT NUMBER', quotationData.company.bankDetails.accountNo],
    ['BANK', quotationData.company.bankDetails.bankName],
    ['BRANCH', quotationData.company.bankDetails.branch],
    ['IFSC CODE', quotationData.company.bankDetails.ifsc]
  ];
  
  (doc as any).autoTable({
    startY: yPosition,
    body: bankData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 100 }
    }
  });
  
  yPosition = (doc as any).lastAutoTable.finalY + 10;
  
  // Validity
  doc.setFontSize(10);
  const validityText = `Validity: Offer shall be valid for a period of ${quotationData.validityPeriod} days from the date of submission of offer and thereafter on written confirmation.`;
  const validityLines = doc.splitTextToSize(validityText, contentWidth);
  doc.text(validityLines, margin, yPosition);
  yPosition += validityLines.length * 5 + 15;
  
  // Signature section
  doc.text('Yours Truly,', margin, yPosition);
  yPosition += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(`For ${quotationData.company.name}`, margin, yPosition);
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('P.S.Sayee Ganesh', margin, yPosition);
  yPosition += 4;
  doc.text('Senior Sales Manager - HKVA', margin, yPosition);
  yPosition += 4;
  doc.text(`Mob: ${quotationData.company.phone}`, margin, yPosition);
  yPosition += 4;
  doc.text(`Email: ${quotationData.company.email}`, margin, yPosition);
  
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

export const downloadDGQuotationPDF = (quotationData: DGQuotationData, filename?: string): void => {
  const doc = generateDGQuotationPDF(quotationData);
  const defaultFilename = `DG_Quotation_${quotationData.quotationNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename || defaultFilename);
};

export const generateDGQuotationPDFBlob = async (quotationData: DGQuotationData): Promise<Blob> => {
  const doc = generateDGQuotationPDF(quotationData);
  return doc.output('blob');
}; 