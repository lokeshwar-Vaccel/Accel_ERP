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

export interface AMCReportPDFData {
  reportType: string;
  reportData: any;
  filters: {
    dateFrom: string;
    dateTo: string;
    customer: string;
    status: string;
  };
  generatedAt: string;
}

export const exportAMCReportToPDF = async (data: AMCReportPDFData) => {
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
      
      let xPos = margin;
      row.forEach((cell, cellIndex) => {
        pdf.text(cell, xPos + 2, currentY + 6);
        xPos += colWidths[cellIndex];
      });
      
      currentY += 8;
    });
    
    return currentY;
  };

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(44, 62, 80);
  pdf.text('AMC Report', margin, yPosition);
  yPosition += 15;

  // Report type
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(52, 73, 94);
  pdf.text(`Report Type: ${data.reportType.replace('_', ' ').toUpperCase()}`, margin, yPosition);
  yPosition += 10;

  // Generated date
  pdf.setFontSize(10);
  pdf.setTextColor(127, 140, 141);
  pdf.text(`Generated on: ${new Date(data.generatedAt).toLocaleString()}`, margin, yPosition);
  yPosition += 15;

  // Filters section
  if (data.filters.dateFrom || data.filters.dateTo || data.filters.customer || data.filters.status) {
    yPosition += addSection('Filters Applied', 
      `Date Range: ${data.filters.dateFrom || 'All'} to ${data.filters.dateTo || 'All'}
       Customer: ${data.filters.customer || 'All'}
       Status: ${data.filters.status || 'All'}`, yPosition);
  }

  // Report content based on type
  switch (data.reportType) {
    case 'contract_summary':
      yPosition += addSection('Summary', 
        `Total Contracts: ${data.reportData.totalContracts || 0}
         Active Contracts: ${data.reportData.activeContracts || 0}
         Total Value: ₹${(data.reportData.totalValue || 0).toLocaleString()}
         Average Contract Value: ₹${(data.reportData.averageContractValue || 0).toLocaleString()}`, yPosition);
      
      if (data.reportData.contractsByStatus) {
        yPosition += 10;
        const statusData = Object.entries(data.reportData.contractsByStatus).map(([status, count]) => 
          [status.toUpperCase(), (count as number).toString()]
        );
        yPosition = createTable(['Status', 'Count'], statusData, yPosition, [80, 40]);
      }
      break;

    case 'revenue_analysis':
      yPosition += addSection('Revenue Analysis', 
        `Total Revenue: ₹${(data.reportData.totalRevenue || 0).toLocaleString()}
         Average Revenue per Contract: ₹${(data.reportData.averageRevenuePerContract || 0).toLocaleString()}`, yPosition);
      
      if (data.reportData.monthlyRevenue) {
        yPosition += 10;
        const revenueData = Object.entries(data.reportData.monthlyRevenue).map(([month, revenue]) => 
          [month, `₹${(revenue as number).toLocaleString()}`]
        );
        yPosition = createTable(['Month', 'Revenue'], revenueData, yPosition, [60, 60]);
      }
      break;

    case 'visit_completion':
      yPosition += addSection('Visit Completion', 
        `Total Scheduled: ${data.reportData.totalScheduled || 0}
         Total Completed: ${data.reportData.totalCompleted || 0}
         Overdue Visits: ${data.reportData.overdueVisits || 0}
         Completion Rate: ${(data.reportData.completionRate || 0).toFixed(1)}%`, yPosition);
      break;

    case 'expiring_contracts':
      yPosition += addSection('Expiring Contracts', 
        `Expiring Contracts: ${data.reportData.expiringContracts || 0}
         Value at Risk: ₹${(data.reportData.totalValueAtRisk || 0).toLocaleString()}`, yPosition);
      break;
  }

  // Add contract details if available
  if (data.reportData.contracts && data.reportData.contracts.length > 0) {
    yPosition += 20;
    yPosition += addSection('Contract Details', '', yPosition);
    
    const contractData = data.reportData.contracts.slice(0, 10).map((contract: any) => [
      contract.contractNumber || 'N/A',
      typeof contract.customer === 'object' ? contract.customer.name : contract.customer || 'N/A',
      `₹${(contract.contractValue || 0).toLocaleString()}`,
      contract.status || 'N/A',
      contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'N/A'
    ]);
    
    yPosition = createTable(
      ['Contract', 'Customer', 'Value', 'Status', 'Expiry'],
      contractData,
      yPosition,
      [40, 50, 30, 25, 30]
    );
  }

  // Footer
  const footerY = pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setTextColor(127, 140, 141);
  pdf.text('Generated by Sun Power Services ERP System', margin, footerY);

  // Save the PDF
  const filename = `amc_report_${data.reportType}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};

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
      
      let xPos = margin;
      row.forEach((cell, cellIndex) => {
        pdf.text(cell, xPos + 2, currentY + 6);
        xPos += colWidths[cellIndex];
      });
      
      currentY += 8;
    });
    
    return currentY;
  };

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(44, 62, 80);
  pdf.text('Service Ticket Report', margin, yPosition);
  yPosition += 15;

  // Ticket number
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(52, 73, 94);
  pdf.text(`Ticket Number: ${ticket.ticketNumber}`, margin, yPosition);
  yPosition += 10;

  // Customer information
  yPosition += addSection('Customer Information', 
    `Name: ${ticket.customer.name}
     Email: ${ticket.customer.email || 'N/A'}
     Phone: ${ticket.customer.phone}
     Address: ${ticket.customer.address || 'N/A'}`, yPosition);

  // Product information
  if (ticket.product) {
    yPosition += addSection('Product Information', 
      `Name: ${ticket.product.name}
       Category: ${ticket.product.category}
       Brand: ${ticket.product.brand || 'N/A'}
       Model: ${ticket.product.modelNumber || 'N/A'}
       Price: ₹${ticket.product.price?.toLocaleString() || 'N/A'}`, yPosition);
  }

  // Service details
  yPosition += addSection('Service Details', 
    `Serial Number: ${ticket.serialNumber || 'N/A'}
     Description: ${ticket.description}
     Priority: ${ticket.priority}
     Status: ${ticket.status}
     Assigned To: ${ticket.assignedTo || 'N/A'}
     Service Charge: ₹${ticket.serviceCharge?.toLocaleString() || '0'}`, yPosition);

  // Dates
  yPosition += addSection('Timeline', 
    `Created: ${new Date(ticket.createdAt).toLocaleString()}
     Scheduled: ${ticket.scheduledDate ? new Date(ticket.scheduledDate).toLocaleString() : 'N/A'}
     Completed: ${ticket.completedDate ? new Date(ticket.completedDate).toLocaleString() : 'N/A'}`, yPosition);

  // Service report
  if (ticket.serviceReport) {
    yPosition += addSection('Service Report', ticket.serviceReport, yPosition);
  }

  // Parts used
  if (ticket.partsUsed && ticket.partsUsed.length > 0) {
    yPosition += 10;
    const partsData = ticket.partsUsed.map(part => [
      part.product,
      part.quantity.toString(),
      part.serialNumbers?.join(', ') || 'N/A'
    ]);
    
    yPosition = createTable(
      ['Product', 'Quantity', 'Serial Numbers'],
      partsData,
      yPosition,
      [60, 30, 60]
    );
  }

  // Footer
  const footerY = pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setTextColor(127, 140, 141);
  pdf.text('Generated by Sun Power Services ERP System', margin, footerY);

  // Save the PDF
  const filename = `service_ticket_${ticket.ticketNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};

export const exportMultipleTicketsToPDF = async (tickets: ServiceTicketPDFData[]) => {
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
      
      let xPos = margin;
      row.forEach((cell, cellIndex) => {
        pdf.text(cell, xPos + 2, currentY + 6);
        xPos += colWidths[cellIndex];
      });
      
      currentY += 8;
    });
    
    return currentY;
  };

  // Helper function to add ticket to PDF
  const addTicketToPDF = (ticket: ServiceTicketPDFData, startY: number) => {
    let currentY = startY;

    // Ticket header
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(44, 62, 80);
    pdf.text(`Ticket: ${ticket.ticketNumber}`, margin, currentY);
    currentY += 8;

    // Customer info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(52, 73, 94);
    currentY += addWrappedText(`Customer: ${ticket.customer.name}`, margin, currentY, contentWidth);
    currentY += 4;

    // Product info
    if (ticket.product) {
      currentY += addWrappedText(`Product: ${ticket.product.name} (${ticket.product.category})`, margin, currentY, contentWidth);
      currentY += 4;
    }

    // Status and priority
    currentY += addWrappedText(`Status: ${ticket.status} | Priority: ${ticket.priority}`, margin, currentY, contentWidth);
    currentY += 4;

    // Service charge
    if (ticket.serviceCharge) {
      currentY += addWrappedText(`Service Charge: ₹${ticket.serviceCharge.toLocaleString()}`, margin, currentY, contentWidth);
      currentY += 4;
    }

    // Description
    if (ticket.description) {
      currentY += addWrappedText(`Description: ${ticket.description}`, margin, currentY, contentWidth);
      currentY += 4;
    }

    return currentY + 10; // Add some spacing
  };

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(44, 62, 80);
  pdf.text('Service Tickets Report', margin, yPosition);
  yPosition += 15;

  // Summary
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(52, 73, 94);
  pdf.text(`Total Tickets: ${tickets.length}`, margin, yPosition);
  yPosition += 10;

  // Generate date
  pdf.setFontSize(10);
  pdf.setTextColor(127, 140, 141);
  pdf.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 15;

  // Add each ticket
  tickets.forEach((ticket, index) => {
    // Check if we need a new page
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = margin;
    }

    yPosition = addTicketToPDF(ticket, yPosition);
  });

  // Footer
  const footerY = pageHeight - 20;
  pdf.setFontSize(8);
  pdf.setTextColor(127, 140, 141);
  pdf.text('Generated by Sun Power Services ERP System', margin, footerY);

  // Save the PDF
  const filename = `service_tickets_report_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
};

export const exportElementToPDF = async (elementId: string, filename: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id '${elementId}' not found`);
    }

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
    
    const imgWidth = pageWidth - 20; // 10mm margin on each side
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 10; // 10mm margin from top

    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight + 10;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting element to PDF:', error);
    throw error;
  }
}; 