import PDFDocument from 'pdfkit';
import { IDeliveryChallan } from '../models/DeliveryChallan';

interface PopulatedDeliveryChallan extends Omit<IDeliveryChallan, 'customer'> {
  customer: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    addresses?: Array<{
      id: number;
      address: string;
      state: string;
      district: string;
      pincode: string;
      isPrimary: boolean;
      gstNumber?: string;
    }>;
  };
}

export const generateDeliveryChallanPDF = (challan: PopulatedDeliveryChallan): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        size: 'A4', 
        margin: 30,
        bufferPages: true
      });
      
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });

      // Header - DELIVERY NOTE
      doc.fontSize(18).font('Helvetica-Bold');
      doc.text('DELIVERY NOTE', 0, 40, { align: 'center', width: doc.page.width });
      
      // Create invoice-style table structure with borders
      const startY = 80;
      let currentY = startY;
      
      // Define table dimensions
      const leftColumnX = 40;
      const rightColumnX = 300;
      const columnWidth = 250;
      const tableWidth = 515; // Full width
      const rowHeight = 20;
      
      // First Row: Company Info (Left) and Delivery Details (Right)
      const firstRowHeight = 220; // Increased height for more space
      
      // Draw first row border
      doc.rect(leftColumnX, currentY, tableWidth, firstRowHeight).stroke();
      
      // Vertical divider for first row
      doc.moveTo(rightColumnX, currentY)
         .lineTo(rightColumnX, currentY + firstRowHeight)
         .stroke();
      
      // Left side - Sun Power Services
      const companyStartY = currentY + 10;
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Sun Power Services', leftColumnX + 10, companyStartY);
      
      let companyCurrentY = companyStartY + 20;
      doc.fontSize(8).font('Helvetica');
      const companyInfo = [
        'D No.53,Plot No.4, 4th Street, Phase-1 Extension',
        'Annai Velankanni Nagar,Madhananthapuram,',
        'Porur',
        'Chennai - 600116',
        '044-24828218, 9176660123',
        'GSTIN/UIN: 33BLFPS9951M1ZC',
        'State Name : Tamil Nadu, Code : 33',
        'E-Mail : sunpowerservices@gmail.com'
      ];
      
      companyInfo.forEach(line => {
        doc.text(line, leftColumnX + 10, companyCurrentY);
        companyCurrentY += 12;
      });
      
      // Right side - Delivery Note Details (clean layout without internal borders)
      let detailsCurrentY = currentY + 15;
      doc.fontSize(9).font('Helvetica-Bold');
      
             // Define delivery details array for clean layout
       // Only show placeholder text for mandatory fields, empty string for optional fields
       const deliveryDetails = [
         { label: 'Delivery Note No.', value: challan.challanNumber || 'Auto Update' }, // Mandatory - keep placeholder
         { label: 'Dated', value: new Date(challan.dated).toLocaleDateString('en-GB') }, // Mandatory - always has value
         { label: 'Mode/Terms of Payment', value: challan.modeOfPayment || '' }, // Optional - empty if not provided
         { label: 'Department', value: challan.department }, // Mandatory - always has value
         { label: 'Reference No', value: challan.referenceNo || '' }, // Optional - empty if not provided
         { label: 'Other Reference No', value: challan.otherReferenceNo || '' }, // Optional - empty if not provided
         { label: "Buyer's Order No.", value: challan.buyersOrderNo || '' }, // Optional - empty if not provided
         { label: 'Order Date', value: challan.buyersOrderDate ? new Date(challan.buyersOrderDate).toLocaleDateString('en-GB') : '' }, // Optional - empty if not provided
         { label: 'Dispatch Doc No.', value: challan.dispatchDocNo || '' }, // Optional - empty if not provided
         { label: 'Destination', value: challan.destination }, // Mandatory - always has value
         { label: 'Dispatched through', value: challan.dispatchedThrough }, // Mandatory - always has value
         { label: 'Terms of Delivery', value: challan.termsOfDelivery || '' } // Optional - empty if not provided
       ];
      
             // Render delivery details in a clean format (only show fields with values)
       deliveryDetails.forEach((detail, index) => {
         // Only render fields that have values or are mandatory
         const isMandatory = ['Delivery Note No.', 'Dated', 'Department', 'Destination', 'Dispatched through'].includes(detail.label);
         const hasValue = detail.value && detail.value.trim() !== '';
         
         if (isMandatory || hasValue) {
           // Label
           doc.fontSize(8).font('Helvetica-Bold');
           doc.text(detail.label + ':', rightColumnX + 10, detailsCurrentY);
           
           // Value
           doc.fontSize(8).font('Helvetica');
           const valueText = detail.value.length > 25 ? detail.value.substring(0, 22) + '...' : detail.value;
           doc.text(valueText, rightColumnX + 125, detailsCurrentY);
           
           detailsCurrentY += 15;
         }
       });
      
      // Second Row: Billing Address (Left) and Shipping Address (Right)
      currentY = startY + firstRowHeight + 5; // Move to second row
      const secondRowHeight = 120;
      
      // Draw second row border
      doc.rect(leftColumnX, currentY, tableWidth, secondRowHeight).stroke();
      
      // Vertical divider for second row
      doc.moveTo(rightColumnX, currentY)
         .lineTo(rightColumnX, currentY + secondRowHeight)
         .stroke();
      
      // Left side - Buyer (Bill to)
      const billToStartY = currentY + 10;
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Buyer (Bill to)', leftColumnX + 10, billToStartY);
      
      let billToCurrentY = billToStartY + 20;
      doc.fontSize(8).font('Helvetica');
      doc.text(challan.customer.name, leftColumnX + 10, billToCurrentY);
      billToCurrentY += 12;
      
      // Add customer address if available
      if (challan.customer.addresses && challan.customer.addresses.length > 0) {
        const primaryAddress = challan.customer.addresses.find(addr => addr.isPrimary) || challan.customer.addresses[0];
        doc.text(primaryAddress.address, leftColumnX + 10, billToCurrentY);
        billToCurrentY += 12;
        doc.text(`${primaryAddress.district}, ${primaryAddress.state}`, leftColumnX + 10, billToCurrentY);
        billToCurrentY += 12;
        doc.text(`Pincode: ${primaryAddress.pincode}`, leftColumnX + 10, billToCurrentY);
        billToCurrentY += 12;
        if (primaryAddress.gstNumber) {
          doc.text(`GSTIN/UIN: ${primaryAddress.gstNumber}`, leftColumnX + 10, billToCurrentY);
          billToCurrentY += 12;
        }
      }
      
             // Right side - Consignee (Ship to)
       const shipToStartY = currentY + 10;
       doc.fontSize(12).font('Helvetica-Bold');
       doc.text('Consignee (Ship to)', rightColumnX + 10, shipToStartY);
       
       let shipToCurrentY = shipToStartY + 20;
       doc.fontSize(8).font('Helvetica');
       if (challan.consignee && challan.consignee.trim() !== '') {
         const consigneeLines = challan.consignee.split('\n');
         consigneeLines.forEach(line => {
           if (shipToCurrentY < currentY + secondRowHeight - 15) { // Check bounds
             doc.text(line, rightColumnX + 10, shipToCurrentY);
             shipToCurrentY += 12;
           }
         });
       } else {
         // Show empty space instead of placeholder text if no consignee provided
         doc.text('', rightColumnX + 10, shipToCurrentY);
       }
      
      // Move to items section
      currentY = currentY + secondRowHeight + 20;
      
      // Add a horizontal line before items section
      doc.lineWidth(0.5);
      doc.moveTo(leftColumnX, currentY - 10)
         .lineTo(leftColumnX + 515, currentY - 10)
         .stroke();
      
      // Spares Section
      doc.fontSize(12).font('Helvetica-Bold');
      doc.fillColor('#FFA500'); // Orange background color
      doc.rect(leftColumnX, currentY, 515, 20).fill();
      doc.fillColor('black');
      doc.text('Spares', leftColumnX + 5, currentY + 5);
      currentY += 20;
      
      // Spares Table Header
      doc.fontSize(9).font('Helvetica-Bold');
      doc.rect(leftColumnX, currentY, 515, 20).stroke();
      
      const colWidths = [50, 200, 100, 80, 85]; // SI No, Description, Part No, HSN/SAC, Quantity
      let colX = leftColumnX;
      
      doc.text('SI\nNo', colX + 5, currentY + 3);
      colX += colWidths[0];
      doc.rect(colX, currentY, 0, 20).stroke(); // Vertical line
      
      doc.text('Description of Goods', colX + 5, currentY + 7);
      colX += colWidths[1];
      doc.rect(colX, currentY, 0, 20).stroke();
      
      doc.text('Part No.', colX + 5, currentY + 7);
      colX += colWidths[2];
      doc.rect(colX, currentY, 0, 20).stroke();
      
      doc.text('HSN/SAC', colX + 5, currentY + 7);
      colX += colWidths[3];
      doc.rect(colX, currentY, 0, 20).stroke();
      
      doc.text('Quantity', colX + 5, currentY + 7);
      currentY += 20;
      
      // Spares Table Rows
      doc.fontSize(8).font('Helvetica');
      
      if (challan.spares && challan.spares.length > 0) {
        challan.spares.forEach((item, index) => {
          doc.rect(leftColumnX, currentY, 515, 20).stroke();
          
          colX = leftColumnX;
          doc.text(item.slNo.toString(), colX + 5, currentY + 7);
          colX += colWidths[0];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text(item.description, colX + 5, currentY + 7);
          colX += colWidths[1];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text(item.partNo || '', colX + 5, currentY + 7);
          colX += colWidths[2];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text(item.hsnSac || '', colX + 5, currentY + 7);
          colX += colWidths[3];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text(item.quantity.toString(), colX + 5, currentY + 7);
          currentY += 20;
        });
      } else {
        // Empty rows for spares
        for (let i = 0; i < 4; i++) {
          doc.rect(leftColumnX, currentY, 515, 20).stroke();
          
          colX = leftColumnX;
          doc.text((i + 1).toString(), colX + 5, currentY + 7);
          colX += colWidths[0];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          if (i === 0) doc.text('Type & Search', colX + 5, currentY + 7);
          colX += colWidths[1];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          if (i === 0) doc.text('Type & Search', colX + 5, currentY + 7);
          colX += colWidths[2];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          if (i === 0) doc.text('Auto select', colX + 5, currentY + 7);
          colX += colWidths[3];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          if (i === 0) doc.text('Manual', colX + 5, currentY + 7);
          currentY += 20;
        }
      }
      
      // Service Section
      currentY += 10;
      doc.fontSize(12).font('Helvetica-Bold');
      doc.fillColor('#FFA500'); // Orange background color
      doc.rect(leftColumnX, currentY, 515, 20).fill();
      doc.fillColor('black');
      doc.text('Service', leftColumnX + 5, currentY + 5);
      currentY += 20;
      
      // Service Table Header
      doc.fontSize(9).font('Helvetica-Bold');
      doc.rect(leftColumnX, currentY, 515, 20).stroke();
      
      colX = leftColumnX;
      doc.text('SI\nNo', colX + 5, currentY + 3);
      colX += colWidths[0];
      doc.rect(colX, currentY, 0, 20).stroke();
      
      doc.text('Description of Goods', colX + 5, currentY + 7);
      colX += colWidths[1];
      doc.rect(colX, currentY, 0, 20).stroke();
      
      doc.text('Part No.', colX + 5, currentY + 7);
      colX += colWidths[2];
      doc.rect(colX, currentY, 0, 20).stroke();
      
      doc.text('HSN/SAC', colX + 5, currentY + 7);
      colX += colWidths[3];
      doc.rect(colX, currentY, 0, 20).stroke();
      
      doc.text('Quantity', colX + 5, currentY + 7);
      currentY += 20;
      
      // Service Table Rows
      doc.fontSize(8).font('Helvetica');
      
      if (challan.services && challan.services.length > 0) {
        challan.services.forEach((item, index) => {
          doc.rect(leftColumnX, currentY, 515, 20).stroke();
          
          colX = leftColumnX;
          doc.text(item.slNo.toString(), colX + 5, currentY + 7);
          colX += colWidths[0];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text(item.description, colX + 5, currentY + 7);
          colX += colWidths[1];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text(item.partNo || 'Manual', colX + 5, currentY + 7);
          colX += colWidths[2];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text(item.hsnSac || 'Manual', colX + 5, currentY + 7);
          colX += colWidths[3];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text(item.quantity.toString(), colX + 5, currentY + 7);
          currentY += 20;
        });
      } else {
        // Default service rows
        const defaultServices = [
          'Manual (For service purpose)',
          'FIP for calibration purpose',
          'Radiator for Repair purpose'
        ];
        
        defaultServices.forEach((service, index) => {
          doc.rect(leftColumnX, currentY, 515, 20).stroke();
          
          colX = leftColumnX;
          doc.text((index + 1).toString(), colX + 5, currentY + 7);
          colX += colWidths[0];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text(service, colX + 5, currentY + 7);
          colX += colWidths[1];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text('Manual', colX + 5, currentY + 7);
          colX += colWidths[2];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text('Manual', colX + 5, currentY + 7);
          colX += colWidths[3];
          doc.rect(colX, currentY, 0, 20).stroke();
          
          doc.text('Manual', colX + 5, currentY + 7);
          currentY += 20;
        });
      }
      
      // Add horizontal line before footer
      currentY += 15;
      doc.lineWidth(0.5);
      doc.moveTo(leftColumnX, currentY)
         .lineTo(leftColumnX + 515, currentY)
         .stroke();
      
      // E & OE
      currentY += 15;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('E & OE', 500, currentY);
      
      // Footer Section
      currentY += 25;
      doc.fontSize(8).font('Helvetica');
      doc.text("Company's PAN : BLFPS9951M", leftColumnX, currentY);
      currentY += 25;
      doc.text('Recd. in Good Condition: _______________________', leftColumnX, currentY);
      
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}; 