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
    price?: number;
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
  serviceCharge?: number;
  partsUsed?: Array<{
    product: string;
    quantity: number;
    serialNumbers?: string[];
  }>;
  slaDeadline?: string;
  slaStatus?: string;
}

export const exportServiceTicketToPDF = async (ticket: ServiceTicketPDFData) => {
  console.log("ticket",ticket);
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

  // Helper function to create a table
  const createTable = (headers: string[], data: string[][], startY: number, colWidths: number[]) => {
    let currentY = startY;
    
    // Draw table header
    pdf.setFillColor(52, 152, 219); // Blue background
    pdf.rect(margin, currentY, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    
    let xPos = margin;
    headers.forEach((header, index) => {
      pdf.text(header, xPos + 2, currentY + 6);
      xPos += colWidths[index];
    });
    
    currentY += 8;
    
    // Draw table data
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(44, 62, 80);
    
    data.forEach((row, rowIndex) => {
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(248, 249, 250); // Light gray
        pdf.rect(margin, currentY, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
      }
      
      xPos = margin;
      row.forEach((cell, cellIndex) => {
        pdf.text(cell, xPos + 2, currentY + 6);
        xPos += colWidths[cellIndex];
      });
      
      currentY += 8;
    });
    
    return currentY + 10; // Return new Y position
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

  // Ticket Information Table
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(44, 62, 80);
  pdf.text('Ticket Information', margin, yPosition);
  yPosition += 8;

  const ticketData = [
    ['Status', ticket.status.toUpperCase()],
    ['Priority', ticket.priority.toUpperCase()],
    ['Created Date', new Date(ticket.createdAt).toLocaleDateString()],
    ['Scheduled Date', ticket.scheduledDate ? new Date(ticket.scheduledDate).toLocaleDateString() : 'Not scheduled'],
    ['Service Engineer', ticket.assignedTo || 'Unassigned'],
    ['Problem Description', ticket.description],
  ];
  
  yPosition = createTable(['Field', 'Value'], ticketData, yPosition, [50, 120]);

  // Customer Information Table
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(44, 62, 80);
  pdf.text('Customer Information', margin, yPosition);
  yPosition += 8;

  const customerData = [
    ['Name', ticket.customer.name],
    ['Phone', ticket.customer.phone],
    ['Email', ticket.customer.email || 'Not provided'],
    ['Address', ticket.customer.address || 'Not provided']
  ];
  
  yPosition = createTable(['Field', 'Value'], customerData, yPosition, [50, 120]);

  // Product and Pricing Information Table
  if (ticket.product) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(44, 62, 80);
    pdf.text('Product and Pricing Information', margin, yPosition);
    yPosition += 8;

    const productPrice = ticket.product.price || 0;
    const serviceCharge = ticket.serviceCharge || 0;
    const totalAmount = productPrice + serviceCharge;

    const pricingData = [
      ['Product Name', ticket.product.name],
      ['Category', ticket.product.category],
      ['Serial Number', ticket.serialNumber || 'Not provided'],
      ['Product Price', `${productPrice.toFixed(2)}`],
      ['Service Charge', `${serviceCharge.toFixed(2)}`],
      ['Total Amount', `${totalAmount.toFixed(2)}`]
    ];
    
    yPosition = createTable(['Field', 'Value'], pricingData, yPosition, [50, 120]);
  }



  // Service Report
  if (ticket.serviceReport) {
    yPosition += addSection('Service Report', ticket.serviceReport, yPosition);
  }

  // Parts Used Table
  if (ticket.partsUsed && ticket.partsUsed.length > 0) {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(44, 62, 80);
    pdf.text('Parts Used', margin, yPosition);
    yPosition += 8;

    const partsData = ticket.partsUsed.map(part => [
      part.product,
      part.quantity.toString(),
      part.serialNumbers?.join(', ') || '-'
    ]);
    
    yPosition = createTable(['Product', 'Quantity', 'Serial Numbers'], partsData, yPosition, [80, 30, 80]);
  }

  // Footer
  // const footerY = pageHeight - 20;
  // pdf.setFontSize(8);
  // pdf.setFont('helvetica', 'normal');
  // pdf.setTextColor(128, 128, 128);
  // pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, footerY, { align: 'center' });

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

  // Helper function to create a table
  const createTable = (headers: string[], data: string[][], startY: number, colWidths: number[]) => {
    let currentY = startY;
    
    // Draw table header
    pdf.setFillColor(52, 152, 219); // Blue background
    pdf.rect(margin, currentY, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    
    let xPos = margin;
    headers.forEach((header, index) => {
      pdf.text(header, xPos + 2, currentY + 6);
      xPos += colWidths[index];
    });
    
    currentY += 8;
    
    // Draw table data
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(44, 62, 80);
    
    data.forEach((row, rowIndex) => {
      // Alternate row colors
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(248, 249, 250); // Light gray
        pdf.rect(margin, currentY, colWidths.reduce((a, b) => a + b, 0), 8, 'F');
      }
      
      xPos = margin;
      row.forEach((cell, cellIndex) => {
        pdf.text(cell, xPos + 2, currentY + 6);
        xPos += colWidths[cellIndex];
      });
      
      currentY += 8;
    });
    
    return currentY + 10; // Return new Y position
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

    // Ticket Information Table
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(44, 62, 80);
    pdf.text('Ticket Information', margin, yPosition);
    yPosition += 8;

    const ticketData = [
      ['Status', ticket.status.toUpperCase()],
      ['Priority', ticket.priority.toUpperCase()],
      ['Created Date', new Date(ticket.createdAt).toLocaleDateString()],
      ['Scheduled Date', ticket.scheduledDate ? new Date(ticket.scheduledDate).toLocaleDateString() : 'Not scheduled'],
      ['Working Demand', ticket.assignedTo || 'Unassigned'],
      ['Problem Description', ticket.description]
    ];
    
    yPosition = createTable(['Field', 'Value'], ticketData, yPosition, [50, 120]);

    // Customer Information Table
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(44, 62, 80);
    pdf.text('Customer Information', margin, yPosition);
    yPosition += 8;

    const customerData = [
      ['Name', ticket.customer.name],
      ['Phone', ticket.customer.phone],
      ['Email', ticket.customer.email || 'Not provided'],
      ['Address', ticket.customer.address || 'Not provided']
    ];
    
    yPosition = createTable(['Field', 'Value'], customerData, yPosition, [50, 120]);

    // Product and Pricing Information Table
    if (ticket.product) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(44, 62, 80);
      pdf.text('Product and Pricing Information', margin, yPosition);
      yPosition += 8;

      const productPrice = ticket.product.price || 0;
      const serviceCharge = ticket.serviceCharge || 0;
      const totalAmount = productPrice + serviceCharge;

      const pricingData = [
        ['Product Name', ticket.product.name],
        ['Category', ticket.product.category],
        ['Brand', ticket.product.brand || 'Not specified'],
        ['Model', ticket.product.modelNumber || 'Not specified'],
        ['Serial Number', ticket.serialNumber || 'Not provided'],
        ['Product Price', `₹${productPrice.toFixed(2)}`],
        ['Service Charge', `₹${serviceCharge.toFixed(2)}`],
        ['Total Amount', `₹${totalAmount.toFixed(2)}`]
      ];
      
      yPosition = createTable(['Field', 'Value'], pricingData, yPosition, [50, 120]);
    }

    // Service Report
    if (ticket.serviceReport) {
      yPosition += addSection('Service Report', ticket.serviceReport, yPosition);
    }

    // Parts Used Table
    if (ticket.partsUsed && ticket.partsUsed.length > 0) {
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(44, 62, 80);
      pdf.text('Parts Used', margin, yPosition);
      yPosition += 8;

      const partsData = ticket.partsUsed.map(part => [
        part.product,
        part.quantity.toString(),
        part.serialNumbers?.join(', ') || '-'
      ]);
      
      yPosition = createTable(['Product', 'Quantity', 'Serial Numbers'], partsData, yPosition, [80, 30, 80]);
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