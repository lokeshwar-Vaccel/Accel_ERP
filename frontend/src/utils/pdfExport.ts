import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ServiceTicketPDFData {
  ticketNumber: string;
  customer: {
    name: string;
    email?: string;
    phone: string;
    address?: string;
  };
  product?: {
    name: string;
    category: string;
    brand?: string;
    modelNumber?: string;
  };
  serialNumber?: string;
  description: string;
  priority: string;
  status: string;
  assignedTo?: string;
  scheduledDate?: string;
  completedDate?: string;
  createdAt: string;
  serviceReport?: string;
  partsUsed?: Array<{
    product: string;
    quantity: number;
    serialNumbers?: string[];
  }>;
  slaDeadline?: string;
  slaStatus?: string;
}

export const exportServiceTicketToPDF = async (ticket: ServiceTicketPDFData) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return lines.length * (fontSize * 0.4); // Return height used
  };

  // Helper function to add section
  const addSection = (title: string, content: string, y: number) => {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(44, 62, 80); // Dark blue
    pdf.text(title, margin, y);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(52, 73, 94); // Dark gray
    const contentHeight = addWrappedText(content, margin, y + 8, contentWidth);
    
    return 8 + contentHeight + 10; // Return height used
  };

  // Header
  pdf.setFillColor(52, 152, 219); // Blue background
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('SERVICE TICKET', pageWidth / 2, 20, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.text(ticket.ticketNumber, pageWidth / 2, 35, { align: 'center' });
  
  yPosition = 50;

  // Ticket Information
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(44, 62, 80);
  pdf.text('Ticket Information', margin, yPosition);
  yPosition += 8;

  // Ticket details in a table format
  const details = [
    { label: 'Status', value: ticket.status.toUpperCase() },
    { label: 'Priority', value: ticket.priority.toUpperCase() },
    { label: 'Created Date', value: new Date(ticket.createdAt).toLocaleDateString() },
    { label: 'Scheduled Date', value: ticket.scheduledDate ? new Date(ticket.scheduledDate).toLocaleDateString() : 'Not scheduled' },
    { label: 'Completed Date', value: ticket.completedDate ? new Date(ticket.completedDate).toLocaleDateString() : 'Not completed' },
    { label: 'SLA Deadline', value: ticket.slaDeadline ? new Date(ticket.slaDeadline).toLocaleDateString() : 'No SLA' },
    { label: 'SLA Status', value: ticket.slaStatus || 'Not set' },
  ];

  details.forEach((detail, index) => {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(52, 73, 94);
    pdf.text(detail.label + ':', margin, yPosition + (index * 6));
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(44, 62, 80);
    pdf.text(detail.value, margin + 40, yPosition + (index * 6));
  });

  yPosition += (details.length * 6) + 15;

  // Customer Information
  yPosition += addSection('Customer Information', 
    `Name: ${ticket.customer.name}\n` +
    `Phone: ${ticket.customer.phone}\n` +
    `Email: ${ticket.customer.email || 'Not provided'}\n` +
    `Address: ${ticket.customer.address || 'Not provided'}`, 
    yPosition
  );

  // Product Information
  if (ticket.product) {
    yPosition += addSection('Product Information',
      `Product: ${ticket.product.name}\n` +
      `Category: ${ticket.product.category}\n` +
      `Brand: ${ticket.product.brand || 'Not specified'}\n` +
      `Model: ${ticket.product.modelNumber || 'Not specified'}\n` +
      `Serial Number: ${ticket.serialNumber || 'Not provided'}`,
      yPosition
    );
  }

  // Problem Description
  yPosition += addSection('Problem Description', ticket.description, yPosition);

  // Service Report
  if (ticket.serviceReport) {
    yPosition += addSection('Service Report', ticket.serviceReport, yPosition);
  }

  // Parts Used
  if (ticket.partsUsed && ticket.partsUsed.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(44, 62, 80);
    pdf.text('Parts Used', margin, yPosition);
    yPosition += 8;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(52, 73, 94);
    pdf.text('Product', margin, yPosition);
    pdf.text('Quantity', margin + 80, yPosition);
    pdf.text('Serial Numbers', margin + 120, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'normal');
    ticket.partsUsed.forEach(part => {
      pdf.text(part.product, margin, yPosition);
      pdf.text(part.quantity.toString(), margin + 80, yPosition);
      pdf.text(part.serialNumbers?.join(', ') || '-', margin + 120, yPosition);
      yPosition += 5;
    });
    yPosition += 10;
  }

  // Assigned To
  if (ticket.assignedTo) {
    yPosition += addSection('Assigned To', ticket.assignedTo, yPosition);
  }

  // Footer
  const footerY = pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, footerY, { align: 'center' });

  // Save the PDF
  pdf.save(`service-ticket-${ticket.ticketNumber}.pdf`);
};

// Export multiple tickets to a single PDF
export const exportMultipleTicketsToPDF = async (tickets: ServiceTicketPDFData[]) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper function to add text with word wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12) => {
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(text, maxWidth);
    pdf.text(lines, x, y);
    return lines.length * (fontSize * 0.4); // Return height used
  };

  // Helper function to add section
  const addSection = (title: string, content: string, y: number) => {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(44, 62, 80); // Dark blue
    pdf.text(title, margin, y);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(52, 73, 94); // Dark gray
    const contentHeight = addWrappedText(content, margin, y + 8, contentWidth);
    
    return 8 + contentHeight + 10; // Return height used
  };

  // Helper function to add ticket to PDF
  const addTicketToPDF = (ticket: ServiceTicketPDFData, startY: number) => {
    let yPosition = startY;

    // Check if we need a new page
    if (yPosition > pageHeight - 100) {
      pdf.addPage();
      yPosition = margin;
    }

    // Ticket Header
    pdf.setFillColor(52, 152, 219); // Blue background
    pdf.rect(0, yPosition - 10, pageWidth, 30, 'F');
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(ticket.ticketNumber, pageWidth / 2, yPosition + 5, { align: 'center' });
    
    yPosition += 35;

    // Ticket Information
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(44, 62, 80);
    pdf.text('Ticket Information', margin, yPosition);
    yPosition += 8;

    // Ticket details in a table format
    const details = [
      { label: 'Status', value: ticket.status.toUpperCase() },
      { label: 'Priority', value: ticket.priority.toUpperCase() },
      { label: 'Created Date', value: new Date(ticket.createdAt).toLocaleDateString() },
      { label: 'Scheduled Date', value: ticket.scheduledDate ? new Date(ticket.scheduledDate).toLocaleDateString() : 'Not scheduled' },
      { label: 'Completed Date', value: ticket.completedDate ? new Date(ticket.completedDate).toLocaleDateString() : 'Not completed' },
      { label: 'SLA Deadline', value: ticket.slaDeadline ? new Date(ticket.slaDeadline).toLocaleDateString() : 'No SLA' },
      { label: 'SLA Status', value: ticket.slaStatus || 'Not set' },
    ];

    details.forEach((detail, index) => {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(52, 73, 94);
      pdf.text(detail.label + ':', margin, yPosition + (index * 6));
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(44, 62, 80);
      pdf.text(detail.value, margin + 40, yPosition + (index * 6));
    });

    yPosition += (details.length * 6) + 15;

    // Customer Information
    yPosition += addSection('Customer Information', 
      `Name: ${ticket.customer.name}\n` +
      `Phone: ${ticket.customer.phone}\n` +
      `Email: ${ticket.customer.email || 'Not provided'}\n` +
      `Address: ${ticket.customer.address || 'Not provided'}`, 
      yPosition
    );

    // Product Information
    if (ticket.product) {
      yPosition += addSection('Product Information',
        `Product: ${ticket.product.name}\n` +
        `Category: ${ticket.product.category}\n` +
        `Brand: ${ticket.product.brand || 'Not specified'}\n` +
        `Model: ${ticket.product.modelNumber || 'Not specified'}\n` +
        `Serial Number: ${ticket.serialNumber || 'Not provided'}`,
        yPosition
      );
    }

    // Problem Description
    yPosition += addSection('Problem Description', ticket.description, yPosition);

    // Service Report
    if (ticket.serviceReport) {
      yPosition += addSection('Service Report', ticket.serviceReport, yPosition);
    }

    // Parts Used
    if (ticket.partsUsed && ticket.partsUsed.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(44, 62, 80);
      pdf.text('Parts Used', margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(52, 73, 94);
      pdf.text('Product', margin, yPosition);
      pdf.text('Quantity', margin + 80, yPosition);
      pdf.text('Serial Numbers', margin + 120, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'normal');
      ticket.partsUsed.forEach(part => {
        pdf.text(part.product, margin, yPosition);
        pdf.text(part.quantity.toString(), margin + 80, yPosition);
        pdf.text(part.serialNumbers?.join(', ') || '-', margin + 120, yPosition);
        yPosition += 5;
      });
      yPosition += 10;
    }

    // Assigned To
    if (ticket.assignedTo) {
      yPosition += addSection('Assigned To', ticket.assignedTo, yPosition);
    }

    // Add separator line
    yPosition += 10;
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 20;

    return yPosition; // Return the new Y position
  };

  // Main PDF generation
  let currentY = margin;

  // Add title page
  pdf.setFillColor(52, 152, 219); // Blue background
  pdf.rect(0, 0, pageWidth, 60, 'F');
  
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('SERVICE TICKETS REPORT', pageWidth / 2, 30, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.text(`Total Tickets: ${tickets.length}`, pageWidth / 2, 45, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(255, 255, 255);
  pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, 55, { align: 'center' });

  pdf.addPage();

  // Add each ticket
  for (const ticket of tickets) {
    currentY = addTicketToPDF(ticket, currentY);
  }

  // Footer on last page
  const footerY = pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(128, 128, 128);
  pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, footerY, { align: 'center' });

  // Save the PDF
  pdf.save(`service-tickets-report-${new Date().toISOString().split('T')[0]}.pdf`);
};

// Alternative function to export from HTML element
export const exportElementToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found');
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 20;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 10;

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}; 