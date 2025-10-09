export const printInvoice = (invoice: any) => {
    if (!invoice) {
      console.error('No invoice data provided for printing');
      return;
    }
  
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
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
  
    const numberToWords = (num: number) => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      
      if (num === 0) return 'Zero';
      
      const crores = Math.floor(num / 10000000);
      const lakhs = Math.floor((num % 10000000) / 100000);
      const thousands = Math.floor((num % 100000) / 1000);
      const hundreds = Math.floor((num % 1000) / 100);
      const tensAndOnes = num % 100;
      
      let result = '';
      
      if (crores > 0) {
        result += ones[crores] + ' Crore ';
      }
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
  
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${invoice.invoiceNumber || 'N/A'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            line-height: 1.1;
            color: #000;
            background-color: #fff;
            padding: 10px;
            margin: 0;
          }
          
          .print-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            border: 2px solid #000;
          }
          
          /* Top company info section */
          .company-section {
            padding: 8px 12px;
            border-bottom: 1px solid #000;
          }
          
          .company-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 3px;
            color: #000;
          }
          
          .company-details {
            font-size: 9px;
            line-height: 1.1;
          }
          
          .company-details p {
            margin: 1px 0;
          }
          
          /* Invoice Title */
          .invoice-title-section {
            text-align: center;
            padding: 8px;
            border-bottom: 1px solid #000;
            font-size: 16px;
            font-weight: bold;
          }
          
          /* Address section */
          .address-container {
            display: table;
            width: 100%;
            border-bottom: 1px solid #000;
          }
          
          .address-section {
            display: table-row;
          }
          
          .address-block {
            display: table-cell;
            width: 50%;
            padding: 8px 12px;
            vertical-align: top;
            border-right: 1px solid #000;
          }
          
          .address-block:last-child {
            border-right: none;
          }
          
          .address-title {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          
          .address-content {
            font-size: 9px;
            line-height: 1.1;
          }
          
          .address-content p {
            margin: 1px 0;
          }
          
          /* Invoice details grid */
          .invoice-details-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
            border-bottom: 1px solid #000;
          }
          
          .invoice-details-table td {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 4px;
            vertical-align: top;
            height: 20px;
          }
          
          .invoice-details-table td:last-child {
            border-right: none;
          }
          
          .invoice-details-table td:nth-child(odd) {
            font-weight: bold;
            width: 16.66%;
          }
          
          .invoice-details-table td:nth-child(even) {
            width: 16.66%;
          }
          
          /* Items table */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }
          
          .items-table th {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 6px 3px;
            text-align: center;
            font-weight: bold;
            background-color: #f5f5f5;
            vertical-align: middle;
          }
          
          .items-table th:last-child {
            border-right: none;
          }
          
          .items-table td {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 3px;
            vertical-align: top;
            text-align: center;
          }
          
          .items-table td:last-child {
            border-right: none;
            text-align: right;
          }
          
          .items-table td:first-child {
            text-align: left;
            font-size: 8px;
          }
          
          .item-desc {
            font-weight: bold;
            line-height: 1.1;
          }
          
          .summary-row {
            background-color: #f8f8f8;
          }
          
          .total-row {
            font-weight: bold;
            background-color: #f0f0f0;
          }
          
          /* Amount in words */
          .amount-words-section {
            padding: 6px 12px;
            border-bottom: 1px solid #000;
            font-size: 9px;
            font-weight: bold;
            position: relative;
          }
          
          .eoe {
            position: absolute;
            right: 12px;
            top: 6px;
            font-size: 8px;
            font-weight: normal;
          }
          
          /* HSN Section */
          .hsn-section {
            border-bottom: 1px solid #000;
          }
          
          .hsn-title {
            padding: 6px 12px;
            font-size: 9px;
            font-weight: bold;
            border-bottom: 1px solid #000;
            background-color: #f5f5f5;
          }
          
          .hsn-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
          }
          
          .hsn-table th {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 2px;
            text-align: center;
            font-weight: bold;
            background-color: #f0f0f0;
          }
          
          .hsn-table th:last-child {
            border-right: none;
          }
          
          .hsn-table td {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 2px;
            text-align: center;
          }
          
          .hsn-table td:last-child {
            border-right: none;
          }
          
          /* Tax amount words */
          .tax-words-section {
            padding: 6px 12px;
            border-bottom: 1px solid #000;
            font-size: 9px;
            font-weight: bold;
          }
          
          /* Bottom section */
          .bottom-section {
            display: table;
            width: 100%;
          }
          
          .bottom-row {
            display: table-row;
          }
          
          .left-section {
            display: table-cell;
            width: 65%;
            padding: 8px 12px;
            vertical-align: top;
            border-right: 1px solid #000;
          }
          
          .right-section {
            display: table-cell;
            width: 35%;
            padding: 8px 12px;
            text-align: center;
            vertical-align: top;
          }
          
          .company-pan {
            font-size: 8px;
            margin-bottom: 8px;
          }
          
          .declaration-title {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          
          .declaration-text {
            font-size: 8px;
            line-height: 1.2;
            margin-bottom: 8px;
          }
          
          .bank-details {
            font-size: 8px;
            line-height: 1.2;
          }
          
          .bank-details p {
            margin: 1px 0;
          }
          
          .signature-section {
            font-size: 9px;
            text-align: left;
          }
          
          .signature-line {
            margin-top: 30px;
            font-size: 8px;
          }
          
          /* Footer */
          .footer-section {
            text-align: center;
            padding: 6px;
            font-size: 8px;
            border-top: 1px solid #000;
          }
          
          @media print {
            body {
              margin: 0 !important;
              padding: 5mm !important;
              font-size: 9px !important;
            }
            
            .print-container {
              max-width: none !important;
              width: 100% !important;
            }
            
            @page {
              margin: 8mm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          
          <!-- Company Information -->
          <div class="company-section">
            <div class="company-name">Sun Power Services</div>
            <div class="company-details">
              <p>D No.53, Plot No.4, 4th Street, Phase-1 Extension,</p>
              <p>Annai Velankanni Nagar, Madhananthapuram, Porur,</p>
              <p>Chennai - 600116</p>
              <p>044-24828218, 9176660123</p>
              <p>GSTIN/UIN: 33BLFPS9951M1ZC</p>
              <p>State Name: Tamil Nadu, Code: 33</p>
              <p>E-Mail: sunpowerservices@gmail.com</p>
            </div>
          </div>
  
          <!-- Invoice Title -->
          <div class="invoice-title-section">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="font-size: 20px; font-weight: bold;">Tax Invoice</div>
              <div style="text-align: right;">
                <div style="font-size: 12px; font-weight: bold;">e-Invoice</div>
                ${invoice.qrCodeInvoice ? `<img src="${invoice.qrCodeInvoice}" alt="QR Code" style="width: 60px; height: 60px; margin-top: 5px;" />` : ''}
              </div>
            </div>
            ${invoice.irn ? `
              <div style="margin-top: 10px; font-size: 10px;">
                <div><strong>IRN :</strong> ${invoice.irn}</div>
                <div><strong>Ack No. :</strong> ${invoice.ackNumber || 'N/A'}</div>
                <div><strong>Ack Date :</strong> ${formatDate(invoice.ackDate)}</div>
              </div>
            ` : ''}
          </div>
  
          <!-- Address Section -->
          <div class="address-container">
            <div class="address-section">
              <div class="address-block">
                <div class="address-title">Consignee (Ship to)</div>
                <div class="address-content">
                  <p style="font-weight: bold;">${invoice.shippingAddress?.address || 'N/A'}</p>
                  <p>${invoice.shippingAddress?.district || ''}</p>
                  <p>${invoice.shippingAddress?.state || ''} - ${invoice.shippingAddress?.pincode || ''}</p>
                  <p>GSTIN/UIN: ${invoice.shippingAddress?.gstNumber || 'N/A'}</p>
                  <p>State Name: ${invoice.shippingAddress?.state || 'N/A'}, Code: 29</p>
                </div>
              </div>
              <div class="address-block">
                <div class="address-title">Buyer (Bill to)</div>
                <div class="address-content">
                  <p style="font-weight: bold;">${invoice.customer?.name || 'N/A'}</p>
                  <p>${invoice.billingAddress?.address || 'N/A'}</p>
                  <p>${invoice.billingAddress?.district || ''}</p>
                  <p>${invoice.billingAddress?.state || ''} - ${invoice.billingAddress?.pincode || ''}</p>
                  <p>GSTIN/UIN: ${invoice.billingAddress?.gstNumber || 'N/A'}</p>
                  <p>State Name: ${invoice.billingAddress?.state || 'N/A'}, Code: 33</p>
                  <p>Place of Supply: ${invoice.billingAddress?.state || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
  
          <!-- Invoice Details Grid -->
          <table class="invoice-details-table">
            <tr>
              <td>Invoice No.</td>
              <td>${invoice.invoiceNumber || 'N/A'}</td>
              <td>Delivery Note</td>
              <td>${invoice.deliveryNotes || ''}</td>
              <td>Reference No. & Date.</td>
              <td>${invoice.referenceNumber ? `${invoice.referenceNumber} dt. ${formatDate(invoice.referenceDate)}` : ''}</td>
            </tr>
            <tr>
              <td>Dated</td>
              <td>${formatDate(invoice.invoiceDate)}</td>
              <td>Mode/Terms of Payment</td>
              <td>${invoice.paymentTerms || ''}</td>
              <td>Buyer's Order No.</td>
              <td>${invoice.buyersOrderNumber || ''}</td>
            </tr>
            <tr>
              <td>Dispatch Doc No.</td>
              <td>${invoice.dispatchDocNo || ''}</td>
              <td>Other References</td>
              <td>${typeof invoice.dgQuotationNumber === 'object' ? invoice.dgQuotationNumber?.quotationNumber || '' : invoice.dgQuotationNumber || ''}</td>
              <td>Dated</td>
              <td>${formatDate(invoice.buyersOrderDate)}</td>
            </tr>
            <tr>
              <td>Dispatched through</td>
              <td>${invoice.dispatchedThrough || ''}</td>
              <td>Destination</td>
              <td>${invoice.destination || ''}</td>
              <td>Delivery Note Date</td>
              <td>${formatDate(invoice.deliveryNoteDate)}</td>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td>Terms of Delivery</td>
              <td>${invoice.termsOfDelivery || ''}</td>
              <td></td>
              <td></td>
            </tr>
          </table>
  
          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 28%;">Description of<br>Goods and Services</th>
                <th style="width: 8%;">HSN/SAC</th>
                <th style="width: 8%;">GST<br>Rate</th>
                <th style="width: 8%;">Quantity</th>
                <th style="width: 12%;">Rate</th>
                <th style="width: 6%;">per</th>
                <th style="width: 8%;">Disc. %</th>
                <th style="width: 12%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map((item: any) => `
                <tr>
                  <td style="text-align: left;">
                    <div class="item-desc">${item.kva} KVA - Spare</div>
                    <div>Mahindra Powerol Diesel Genset</div>
                  </td>
                  <td>${item.hsnNumber || '85021100'}</td>
                  <td>${item.gstRate || 18}%</td>
                  <td>${formatNumber(item.quantity || 0)} Nos.</td>
                  <td>${formatNumber(item.unitPrice || 0)}</td>
                  <td>Nos.</td>
                  <td>${item.discount || ''}</td>
                  <td>${formatNumber(item.totalPrice || 0)}</td>
                </tr>
              `).join('') || ''}
              
              ${invoice.transportCharges && invoice.transportCharges.unitPrice > 0 ? `
                <tr>
                  <td style="text-align: left;">
                    <div class="item-desc">Transport Charges</div>
                  </td>
                  <td>${invoice.transportCharges.hsnNumber || '998399'}</td>
                  <td>${invoice.transportCharges.gstRate || 18}%</td>
                  <td>${formatNumber(invoice.transportCharges.quantity || 0)} Nos.</td>
                  <td>${formatNumber(invoice.transportCharges.unitPrice || 0)}</td>
                  <td>Nos.</td>
                  <td>0</td>
                  <td>${formatNumber(invoice.transportCharges.amount || 0)}</td>
                </tr>
              ` : ''}
              
              <tr class="summary-row">
                <td colspan="7" style="text-align: right; border-bottom: none;"></td>
                <td style="font-weight: bold; border-bottom: none;">${formatNumber(invoice.subtotal || 0)}</td>
              </tr>
              
              <tr class="summary-row">
                <td colspan="6" style="border-bottom: none;"></td>
                <td style="font-weight: bold; text-align: center; border-bottom: none;">OUTPUT SGST</td>
                <td style="font-weight: bold; border-bottom: none;">${formatNumber((invoice.taxAmount || 0) / 2)}</td>
              </tr>
              <tr class="summary-row">
                <td colspan="6" style="border-bottom: none;"></td>
                <td style="font-weight: bold; text-align: center; border-bottom: none;">OUTPUT CGST</td>
                <td style="font-weight: bold; border-bottom: none;">${formatNumber((invoice.taxAmount || 0) / 2)}</td>
              </tr>
              
              <tr class="total-row">
                <td style="font-weight: bold; text-align: center;">Total</td>
                <td></td>
                <td></td>
                <td style="font-weight: bold;">${formatNumber(invoice.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0)} Nos.</td>
                <td></td>
                <td></td>
                <td></td>
                <td style="font-weight: bold;">₹ ${formatNumber(invoice.totalAmount || 0)}</td>
              </tr>
            </tbody>
          </table>
  
          <!-- Amount in Words -->
          <div class="amount-words-section">
            <div class="eoe">E. & O.E</div>
            <div>Amount Chargeable (in words)</div>
            <div>Indian Rupees ${numberToWords(Math.round(invoice.totalAmount || 0))}</div>
          </div>
  
          <!-- HSN/SAC Summary -->
          <div class="hsn-section">
            <div class="hsn-title">Tax Details (HSN/SAC wise)</div>
            <table class="hsn-table">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 12%;">HSN/SAC</th>
                  <th rowspan="2" style="width: 15%;">Taxable<br>Value</th>
                  <th colspan="2" style="width: 18%;">CGST</th>
                  <th colspan="2" style="width: 18%;">SGST/UTGST</th>
                  <th rowspan="2" style="width: 15%;">Total<br>Tax Amount</th>
                </tr>
                <tr>
                  <th style="width: 8%;">Rate</th>
                  <th style="width: 10%;">Amount</th>
                  <th style="width: 8%;">Rate</th>
                  <th style="width: 10%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items?.map((item: any) => {
                  const itemSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
                  const discountAmount = (itemSubtotal * (item.discount || 0)) / 100;
                  const taxableValue = itemSubtotal - discountAmount;
                  const gstAmount = (taxableValue * (item.gstRate || 18)) / 100;
                  
                  return `
                    <tr>
                      <td>${item.hsnNumber || '85021100'}</td>
                      <td>${formatNumber(taxableValue)}</td>
                      <td>${Math.round((item.gstRate || 18) / 2)}%</td>
                      <td>${formatNumber(gstAmount / 2)}</td>
                      <td>${Math.round((item.gstRate || 18) / 2)}%</td>
                      <td>${formatNumber(gstAmount / 2)}</td>
                      <td>${formatNumber(gstAmount)}</td>
                    </tr>
                  `;
                }).join('') || ''}
                
                ${invoice.transportCharges && invoice.transportCharges.unitPrice > 0 ? (() => {
                  const transportTaxableValue = invoice.transportCharges.amount || 0;
                  const transportGstAmount = (transportTaxableValue * (invoice.transportCharges.gstRate || 18)) / 100;
                  
                  return `
                    <tr>
                      <td>${invoice.transportCharges.hsnNumber || '998399'}</td>
                      <td>${formatNumber(transportTaxableValue)}</td>
                      <td>${Math.round((invoice.transportCharges.gstRate || 18) / 2)}%</td>
                      <td>${formatNumber(transportGstAmount / 2)}</td>
                      <td>${Math.round((invoice.transportCharges.gstRate || 18) / 2)}%</td>
                      <td>${formatNumber(transportGstAmount / 2)}</td>
                      <td>${formatNumber(transportGstAmount)}</td>
                    </tr>
                  `;
                })() : ''}
                
                <tr style="font-weight: bold; background-color: #f0f0f0;">
                  <td>Total</td>
                  <td>${formatNumber(invoice.subtotal || 0)}</td>
                  <td></td>
                  <td>${formatNumber((invoice.taxAmount || 0) / 2)}</td>
                  <td></td>
                  <td>${formatNumber((invoice.taxAmount || 0) / 2)}</td>
                  <td>${formatNumber(invoice.taxAmount || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
  
          <!-- Tax Amount in Words -->
          <div class="tax-words-section">
            <div>Tax Amount (in words) :</div>
            <div>Indian Rupees ${numberToWords(Math.round(invoice.taxAmount || 0))}</div>
          </div>
  
          <!-- Bottom Section -->
          <div class="bottom-section">
            <div class="bottom-row">
              <div class="left-section">
                <div class="company-pan">
                  <p><strong>Company's PAN :</strong> BLFPS9951M</p>
                </div>
                
                <div class="declaration-title">Declaration</div>
                <div class="declaration-text">
                  We declare that this invoice shows the actual price of the goods<br>
                  described and that all particulars are true and correct.
                </div>
                
                <div class="bank-details">
                  <p><strong>Company's Bank Details</strong></p>
                  <p><strong>Bank Name :</strong> Hdfc Bank A/c No:50200051862959</p>
                  <p><strong>A/c No. :</strong> 50200051862959</p>
                  <p><strong>Branch & IFS Code :</strong> Moulivakkam & HDFC0005281</p>
                </div>
              </div>
              
              <div class="right-section">
                <div class="signature-section">
                  <p style="font-weight: bold;">for Sun Power Services</p>
                  <div class="signature-line">
                    <p>Authorised Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
  
  
          <!-- Footer -->
          <div class="footer-section">
            This is a Computer Generated Invoice
          </div>
          
        </div>
      </body>
      </html>
    `;
  
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
      console.error('Could not open print window');
    }
  };

export const printProforma = (proforma: any) => {
    if (!proforma) {
      console.error('No proforma data provided for printing');
      return;
    }
  
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
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
  
    const numberToWords = (num: number) => {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      
      if (num === 0) return 'Zero';
      
      const crores = Math.floor(num / 10000000);
      const lakhs = Math.floor((num % 10000000) / 100000);
      const thousands = Math.floor((num % 100000) / 1000);
      const hundreds = Math.floor((num % 1000) / 100);
      const tensAndOnes = num % 100;
      
      let result = '';
      
      if (crores > 0) {
        result += ones[crores] + ' Crore ';
      }
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
  
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Proforma Invoice - ${proforma.proformaNumber || 'N/A'}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 10px;
            line-height: 1.1;
            color: #000;
            background-color: #fff;
            padding: 10px;
            margin: 0;
          }
          
          .print-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            border: 2px solid #000;
          }
          
          /* Top company info section */
          .company-section {
            padding: 8px 12px;
            border-bottom: 1px solid #000;
          }
          
          .company-name {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 3px;
            color: #000;
          }
          
          .company-details {
            font-size: 9px;
            line-height: 1.1;
          }
          
          .company-details p {
            margin: 1px 0;
          }
          
          /* Proforma Invoice Title */
          .invoice-title-section {
            text-align: center;
            padding: 8px;
            border-bottom: 1px solid #000;
            font-size: 16px;
            font-weight: bold;
          }
          
          /* Address section */
          .address-container {
            display: table;
            width: 100%;
            border-bottom: 1px solid #000;
          }
          
          .address-section {
            display: table-row;
          }
          
          .address-block {
            display: table-cell;
            width: 50%;
            padding: 8px 12px;
            vertical-align: top;
            border-right: 1px solid #000;
          }
          
          .address-block:last-child {
            border-right: none;
          }
          
          .address-title {
            font-size: 10px;
            font-weight: bold;
            margin-bottom: 4px;
          }
          
          .address-content {
            font-size: 9px;
            line-height: 1.1;
          }
          
          .address-content p {
            margin: 1px 0;
          }
          
          /* Invoice details grid */
          .invoice-details-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
            border-bottom: 1px solid #000;
          }
          
          .invoice-details-table td {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 4px;
            vertical-align: top;
            height: 20px;
          }
          
          .invoice-details-table td:last-child {
            border-right: none;
          }
          
          .invoice-details-table td:nth-child(odd) {
            font-weight: bold;
            width: 16.66%;
          }
          
          .invoice-details-table td:nth-child(even) {
            width: 16.66%;
          }
          
          /* Items table */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
          }
          
          .items-table th {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 6px 3px;
            text-align: center;
            font-weight: bold;
            background-color: #f5f5f5;
            vertical-align: middle;
          }
          
          .items-table th:last-child {
            border-right: none;
          }
          
          .items-table td {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 3px;
            vertical-align: top;
            text-align: center;
          }
          
          .items-table td:last-child {
            border-right: none;
            text-align: right;
          }
          
          .items-table td:first-child {
            text-align: left;
            font-size: 8px;
          }
          
          .item-desc {
            font-weight: bold;
            line-height: 1.1;
          }
          
          .summary-row {
            background-color: #f8f8f8;
          }
          
          .total-row {
            font-weight: bold;
            background-color: #f0f0f0;
          }
          
          /* Amount in words */
          .amount-words-section {
            padding: 6px 12px;
            border-bottom: 1px solid #000;
            font-size: 9px;
            font-weight: bold;
            position: relative;
          }
          
          .eoe {
            position: absolute;
            right: 12px;
            top: 6px;
            font-size: 8px;
            font-weight: normal;
          }
          
          /* HSN Section */
          .hsn-section {
            border-bottom: 1px solid #000;
          }
          
          .hsn-title {
            padding: 6px 12px;
            font-size: 9px;
            font-weight: bold;
            border-bottom: 1px solid #000;
            background-color: #f5f5f5;
          }
          
          .hsn-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
          }
          
          .hsn-table th {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 2px;
            text-align: center;
            font-weight: bold;
            background-color: #f0f0f0;
          }
          
          .hsn-table th:last-child {
            border-right: none;
          }
          
          .hsn-table td {
            border-right: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 2px;
            text-align: center;
          }
          
          .hsn-table td:last-child {
            border-right: none;
          }
          
          /* Tax amount words */
          .tax-words-section {
            padding: 6px 12px;
            border-bottom: 1px solid #000;
            font-size: 9px;
            font-weight: bold;
          }
          
          /* Bottom section */
          .bottom-section {
            display: table;
            width: 100%;
          }
          
          .bottom-row {
            display: table-row;
          }
          
          .left-section {
            display: table-cell;
            width: 65%;
            padding: 8px 12px;
            vertical-align: top;
            border-right: 1px solid #000;
          }
          
          .right-section {
            display: table-cell;
            width: 35%;
            padding: 8px 12px;
            text-align: center;
            vertical-align: top;
          }
          
          .company-pan {
            font-size: 8px;
            margin-bottom: 8px;
          }
          
          .declaration-title {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 3px;
          }
          
          .declaration-text {
            font-size: 8px;
            line-height: 1.2;
            margin-bottom: 8px;
          }
          
          .bank-details {
            font-size: 8px;
            line-height: 1.2;
          }
          
          .bank-details p {
            margin: 1px 0;
          }
          
          .signature-section {
            font-size: 9px;
            text-align: left;
          }
          
          .signature-line {
            margin-top: 30px;
            font-size: 8px;
          }
          
          /* Footer */
          .footer-section {
            text-align: center;
            padding: 6px;
            font-size: 8px;
            border-top: 1px solid #000;
          }
          
          @media print {
            body {
              margin: 0 !important;
              padding: 5mm !important;
              font-size: 9px !important;
            }
            
            .print-container {
              max-width: none !important;
              width: 100% !important;
            }
            
            @page {
              margin: 8mm;
              size: A4;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          
          <!-- Company Information -->
          <div class="company-section">
            <div class="company-name">Sun Power Services</div>
            <div class="company-details">
              <p>D No.53, Plot No.4, 4th Street, Phase-1 Extension,</p>
              <p>Annai Velankanni Nagar, Madhananthapuram, Porur,</p>
              <p>Chennai - 600116</p>
              <p>044-24828218, 9176660123</p>
              <p>GSTIN/UIN: 33BLFPS9951M1ZC</p>
              <p>State Name: Tamil Nadu, Code: 33</p>
              <p>E-Mail: sunpowerservices@gmail.com</p>
            </div>
          </div>
  
          <!-- Proforma Invoice Title -->
          <div class="invoice-title-section">
            Proforma Invoice
          </div>
  
          <!-- Address Section -->
          <div class="address-container">
            <div class="address-section">
              <div class="address-block">
                <div class="address-title">Consignee (Ship to)</div>
                <div class="address-content">
                  <p style="font-weight: bold;">${proforma.shippingAddress?.address || 'N/A'}</p>
                  <p>${proforma.shippingAddress?.district || ''}</p>
                  <p>${proforma.shippingAddress?.state || ''} - ${proforma.shippingAddress?.pincode || ''}</p>
                  <p>GSTIN/UIN: ${proforma.shippingAddress?.gstNumber || 'N/A'}</p>
                  <p>State Name: ${proforma.shippingAddress?.state || 'N/A'}, Code: 29</p>
                </div>
              </div>
              <div class="address-block">
                <div class="address-title">Buyer (Bill to)</div>
                <div class="address-content">
                  <p style="font-weight: bold;">${proforma.customer?.name || 'N/A'}</p>
                  <p>${proforma.billingAddress?.address || 'N/A'}</p>
                  <p>${proforma.billingAddress?.district || ''}</p>
                  <p>${proforma.billingAddress?.state || ''} - ${proforma.billingAddress?.pincode || ''}</p>
                  <p>GSTIN/UIN: ${proforma.billingAddress?.gstNumber || 'N/A'}</p>
                  <p>State Name: ${proforma.billingAddress?.state || 'N/A'}, Code: 33</p>
                  <p>Place of Supply: ${proforma.billingAddress?.state || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
  
          <!-- Invoice Details Grid -->
          <table class="invoice-details-table">
            <tr>
              <td>Invoice No.</td>
              <td>${proforma.proformaNumber || 'N/A'}</td>
              <td>Delivery Note</td>
              <td>${proforma.deliveryNotes || ''}</td>
              <td>Reference No. & Date.</td>
              <td>${proforma.referenceNumber ? `${proforma.referenceNumber} ${formatDate(proforma.referenceDate)}` : ''}</td>
            </tr>
            <tr>
              <td>Dated</td>
              <td>${formatDate(proforma.proformaDate)}</td>
              <td>Mode/Terms of Payment</td>
              <td>${proforma.paymentTerms || ''}</td>
              <td>Buyer's Order No.</td>
              <td>${proforma.buyersOrderNumber || ''}</td>
            </tr>
            <tr>
              <td>Dispatch Doc No.</td>
              <td>${proforma.dispatchDocNo || ''}</td>
              <td>Other References</td>
              <td>${typeof proforma.dgQuotationNumber === 'object' ? proforma.dgQuotationNumber?.quotationNumber || '' : proforma.dgQuotationNumber || ''}</td>
              <td>Dated</td>
              <td>${formatDate(proforma.buyersOrderDate)}</td>
            </tr>
            <tr>
              <td>Dispatched through</td>
              <td>${proforma.dispatchedThrough || ''}</td>
              <td>Destination</td>
              <td>${proforma.destination || ''}</td>
              <td>Delivery Note Date</td>
              <td>${formatDate(proforma.deliveryNoteDate)}</td>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td>Terms of Delivery</td>
              <td>${proforma.termsOfDelivery || ''}</td>
              <td></td>
              <td></td>
            </tr>
          </table>
  
          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 28%;">Description of<br>Goods and Services</th>
                <th style="width: 8%;">HSN/SAC</th>
                <th style="width: 8%;">GST<br>Rate</th>
                <th style="width: 8%;">Quantity</th>
                <th style="width: 12%;">Rate</th>
                <th style="width: 6%;">per</th>
                <th style="width: 8%;">Disc. %</th>
                <th style="width: 12%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${proforma.items?.map((item: any) => `
                <tr>
                  <td style="text-align: left;">
                    <div class="item-desc">${item.kva} KVA</div>
                    <div>Mahindra Powerol Diesel Genset</div>
                    <div>Inculding of Transport & Unloading Charges</div>
                  </td>
                  <td>${item.hsnNumber || '85021100'}</td>
                  <td>${item.gstRate || 18} %</td>
                  <td>${formatNumber(item.quantity || 0)} Nos.</td>
                  <td>Nos.</td>
                  <td>${formatNumber(item.unitPrice || 0)}</td>
                  <td>${item.discount || 0}</td>
                  <td>${formatNumber(item.totalPrice || 0)}</td>
                </tr>
              `).join('') || ''}
              
              ${proforma.transportCharges && proforma.transportCharges.unitPrice > 0 ? `
                <tr>
                  <td style="text-align: left;">
                    <div class="item-desc">Transport Charges</div>
                  </td>
                  <td>${proforma.transportCharges.hsnNumber || '998399'}</td>
                  <td>${proforma.transportCharges.gstRate || 18} %</td>
                  <td>${formatNumber(proforma.transportCharges.quantity || 0)} Nos.</td>
                  <td>Nos.</td>
                  <td>${formatNumber(proforma.transportCharges.unitPrice || 0)}</td>
                  <td>0</td>
                  <td>${formatNumber(proforma.transportCharges.amount || 0)}</td>
                </tr>
              ` : ''}
              
              <tr class="summary-row">
                <td colspan="7" style="text-align: right; border-bottom: none;"></td>
                <td style="font-weight: bold; border-bottom: none;">${formatNumber(proforma.subtotal || 0)}</td>
              </tr>
              
              <tr class="summary-row">
                <td colspan="6" style="border-bottom: none;"></td>
                <td style="font-weight: bold; text-align: center; border-bottom: none;">OUTPUT SGST</td>
                <td style="font-weight: bold; border-bottom: none;">${formatNumber((proforma.taxAmount || 0) / 2)}</td>
              </tr>
              <tr class="summary-row">
                <td colspan="6" style="border-bottom: none;"></td>
                <td style="font-weight: bold; text-align: center; border-bottom: none;">OUTPUT CGST</td>
                <td style="font-weight: bold; border-bottom: none;">${formatNumber((proforma.taxAmount || 0) / 2)}</td>
              </tr>
              
              <tr class="total-row">
                <td style="font-weight: bold; text-align: center;">Total</td>
                <td></td>
                <td></td>
                <td style="font-weight: bold;">${formatNumber(proforma.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0)} Nos.</td>
                <td></td>
                <td></td>
                <td></td>
                <td style="font-weight: bold;">₹ ${formatNumber(proforma.totalAmount || 0)}</td>
              </tr>
            </tbody>
          </table>
  
          <!-- Amount in Words -->
          <div class="amount-words-section">
            <div class="eoe">E. & O.E</div>
            <div>Amount Chargeable (in words)</div>
            <div>Indian Rupees ${numberToWords(Math.round(proforma.totalAmount || 0))}</div>
          </div>
  
          <!-- HSN/SAC Summary -->
          <div class="hsn-section">
            <div class="hsn-title">Tax Details (HSN/SAC wise)</div>
            <table class="hsn-table">
              <thead>
                <tr>
                  <th rowspan="2" style="width: 12%;">HSN/SAC</th>
                  <th rowspan="2" style="width: 15%;">Taxable<br>Value</th>
                  <th colspan="2" style="width: 18%;">CGST</th>
                  <th colspan="2" style="width: 18%;">SGST/UTGST</th>
                  <th rowspan="2" style="width: 15%;">Total<br>Tax Amount</th>
                </tr>
                <tr>
                  <th style="width: 8%;">Rate</th>
                  <th style="width: 10%;">Amount</th>
                  <th style="width: 8%;">Rate</th>
                  <th style="width: 10%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${proforma.items?.map((item: any) => {
                  const itemSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
                  const discountAmount = (itemSubtotal * (item.discount || 0)) / 100;
                  const taxableValue = itemSubtotal - discountAmount;
                  const gstAmount = (taxableValue * (item.gstRate || 18)) / 100;
                  
                  return `
                    <tr>
                      <td>${item.hsnNumber || '85021100'}</td>
                      <td>${formatNumber(taxableValue)}</td>
                      <td>${Math.round((item.gstRate || 18) / 2)}%</td>
                      <td>${formatNumber(gstAmount / 2)}</td>
                      <td>${Math.round((item.gstRate || 18) / 2)}%</td>
                      <td>${formatNumber(gstAmount / 2)}</td>
                      <td>${formatNumber(gstAmount)}</td>
                    </tr>
                  `;
                }).join('') || ''}
                
                ${proforma.transportCharges && proforma.transportCharges.unitPrice > 0 ? (() => {
                  const transportTaxableValue = proforma.transportCharges.amount || 0;
                  const transportGstAmount = (transportTaxableValue * (proforma.transportCharges.gstRate || 18)) / 100;
                  
                  return `
                    <tr>
                      <td>${proforma.transportCharges.hsnNumber || '998399'}</td>
                      <td>${formatNumber(transportTaxableValue)}</td>
                      <td>${Math.round((proforma.transportCharges.gstRate || 18) / 2)}%</td>
                      <td>${formatNumber(transportGstAmount / 2)}</td>
                      <td>${Math.round((proforma.transportCharges.gstRate || 18) / 2)}%</td>
                      <td>${formatNumber(transportGstAmount / 2)}</td>
                      <td>${formatNumber(transportGstAmount)}</td>
                    </tr>
                  `;
                })() : ''}
                
                <tr style="font-weight: bold; background-color: #f0f0f0;">
                  <td>Total</td>
                  <td>${formatNumber(proforma.subtotal || 0)}</td>
                  <td></td>
                  <td>${formatNumber((proforma.taxAmount || 0) / 2)}</td>
                  <td></td>
                  <td>${formatNumber((proforma.taxAmount || 0) / 2)}</td>
                  <td>${formatNumber(proforma.taxAmount || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
  
          <!-- Tax Amount in Words -->
          <div class="tax-words-section">
            <div>Tax Amount (in words) :</div>
            <div>Indian Rupees ${numberToWords(Math.round(proforma.taxAmount || 0))}</div>
          </div>
  
          <!-- Bottom Section -->
          <div class="bottom-section">
            <div class="bottom-row">
              <div class="left-section">
                <div class="company-pan">
                  <p><strong>Company's PAN :</strong> BLFPS9951M</p>
                </div>
                
                <div class="declaration-title">Declaration</div>
                <div class="declaration-text">
                  We declare that this invoice shows the actual price of the goods<br>
                  described and that all particulars are true and correct.
                </div>
                
                <div class="bank-details">
                  <p><strong>Company's Bank Details</strong></p>
                  <p><strong>Bank Name :</strong> Hdfc Bank A/c No:50200051862959</p>
                  <p><strong>A/c No. :</strong> 50200051862959</p>
                  <p><strong>Branch & IFS Code :</strong> Moulivakkam & HDFC0005281</p>
                </div>
              </div>
              
              <div class="right-section">
                <div class="signature-section">
                  <p style="font-weight: bold;">for Sun Power Services</p>
                  <div class="signature-line">
                    <p>Authorised Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          <!-- Footer -->
          <div class="footer-section">
            This is a Computer Generated Invoice
          </div>
          
        </div>
      </body>
      </html>
    `;
  
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for content to load before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
      console.error('Could not open print window');
    }
  };

export const printAMCInvoice = (invoice: any) => {
    if (!invoice) return;
  
    const formatDate = (d: any) => {
      if (!d) return '';
      const date = new Date(d);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-GB');
    };
  
    const formatDateTime = (d: any) => {
      if (!d) return '';
      const date = new Date(d);
      if (isNaN(date.getTime())) return '';
      return `${date.toLocaleDateString('en-GB')} , ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };
  
    const formatMoney = (n: number) =>
      new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
  
    const numberToWords = (num: number) => {
      if (!isFinite(num)) return '';
      const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      const inWords = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
        return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
      };
      const rupees = Math.floor(num);
      return (inWords(rupees) || 'Zero') + ' Only';
    };
  
    const consignee = invoice.shippingAddress || invoice.shipToAddress || {};
    const buyer = invoice.billingAddress || invoice.billToAddress || {};
  
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const serviceCharges = Array.isArray(invoice.serviceCharges) ? invoice.serviceCharges : [];
    const allItems = [...items, ...serviceCharges];
  
    const rowsHtml = allItems.map((it: any, idx: number) => {
      const qty = Number(it.quantity || 0);
      const rate = Number(it.unitPrice || 0);
      const disc = Number(it.discount || 0);
      const taxRate = Number(it.taxRate || 0);
      const basic = rate * qty;
      const discAmt = (disc / 100) * basic;
      const taxable = basic - discAmt;
      const taxAmt = (taxRate / 100) * taxable;
      const total = taxable + taxAmt;
      return `
        <tr class="item-row">
          <td class="c no">${idx + 1}</td>
          <td class="desc">${it.description || ''}${it.note ? `<div class="note">${it.note}</div>` : ''}</td>
          <td class="c hsn">${it.hsnNumber || ''}</td>
          <td class="c gst">${taxRate ? taxRate + ' %' : ''}</td>
          <td class="c qty">${qty || ''}</td>
          <td class="r rate">${formatMoney(rate)}</td>
          <td class="c unit">${it.uom || 'nos'}</td>
          <td class="c disc">${disc ? disc + ' %' : ''}</td>
          <td class="r amount">${formatMoney(total)}</td>
        </tr>
      `;
    }).join('');
  
    const totalTax = allItems.reduce((sum: number, it: any) => {
      const qty = Number(it.quantity || 0);
      const rate = Number(it.unitPrice || 0);
      const disc = Number(it.discount || 0);
      const taxRate = Number(it.taxRate || 0);
      const basic = rate * qty;
      const discAmt = (disc / 100) * basic;
      const taxable = basic - discAmt;
      return sum + (taxRate / 100) * taxable;
    }, 0);
  
    const subtotal = allItems.reduce((sum: number, it: any) => {
      const qty = Number(it.quantity || 0);
      const rate = Number(it.unitPrice || 0);
      const disc = Number(it.discount || 0);
      const basic = rate * qty;
      const discAmt = (disc / 100) * basic;
      const taxable = basic - discAmt;
      const taxRate = Number(it.taxRate || 0);
      const taxAmt = (taxRate / 100) * taxable;
      return sum + taxable + taxAmt;
    }, 0);
  
    const grandTotal = Number(invoice.totalAmount || subtotal);

    // Determine intra-state (CGST/SGST) vs inter-state (IGST)
    const companyState = 'Tamil Nadu';
    const buyerState = (buyer && (buyer.state || '')).toString();
    const isIntraState = buyerState.toLowerCase().includes(companyState.toLowerCase());
    const cgstAmountTotal = typeof invoice.cgst === 'number' ? invoice.cgst : (isIntraState ? totalTax / 2 : 0);
    const sgstAmountTotal = typeof invoice.sgst === 'number' ? invoice.sgst : (isIntraState ? totalTax / 2 : 0);
    const igstAmountTotal = typeof invoice.igst === 'number' ? invoice.igst : (isIntraState ? 0 : totalTax);
  
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
  
    const html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Tax Invoice - ${invoice.invoiceNumber || ''}</title>
      <style>
        /* Base & print */
        @page { margin: 12mm; }
        html,body { margin:0; padding:0; background:#fff; color:#000; }
        body { font-family: "Times New Roman", Times, serif; font-size:11px; -webkit-print-color-adjust:exact; }
        .page { width:210mm; padding:4mm 6mm; box-sizing:border-box; }
  
        .top-info { display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:10px; }
        .top-info .left { text-align:left; width:33%; }
        .top-info .center { text-align:center; width:34%; font-weight:700; font-size:13px; }
        .top-info .right { text-align:right; width:33%; font-size:10px; }
  
        /* Header grid: row 1 = IRN (left) | QR (right); row 2 = title centered spanning both columns */
        .header-grid { display:grid; grid-template-columns: 1fr 140px; gap:8px; align-items:start; margin-bottom:6px; }
        .irn-box { font-size:11px; line-height:1.4; }
        .qr-block { text-align:right; }
        .qr-label { font-size:11px; font-weight:700; margin-bottom:4px; }
        .qr-block img { width:120px; height:120px; object-fit:contain; border:1px solid #000; padding:2px; background:#fff; display:inline-block; }
  
        .invoice-title-row { grid-column: 1 / -1; text-align:center; margin-top:6px; }
        .invoice-title { font-size:20px; font-weight:700; margin:0; }
  
        /* main header area */
        .header-main { display:flex; gap:8px; margin-top:8px; page-break-inside: avoid; break-inside: avoid; }
        .company-box { flex:1 1 62%; border:1px solid #000; padding:8px; box-sizing:border-box; font-size:11px; }
        .company-box .name { font-weight:700; margin-bottom:6px; }
        .meta-box { width:320px; border:1px solid #000; box-sizing:border-box; font-size:11px; }
        .meta-table { width:100%; border-collapse:collapse; }
        .meta-table td { border:1px solid #000; padding:6px; vertical-align:top; font-size:11px; }
        .meta-table .label { font-weight:700; font-size:11px; }
  
        /* stacked address boxes */
        .addresses { margin-top:8px; page-break-inside: avoid; break-inside: avoid; }
        .addr { border:1px solid #000; padding:8px; margin-bottom:6px; font-size:11px; box-sizing:border-box; }
        .addr .title { font-weight:700; margin-bottom:6px; }
  
        /* strong divider */
        .divider { border-top:3px solid #000; margin:2px 0 6px 0; }
  
        /* items table: wide description + thick vertical separator */
        .items { width:100%; border-collapse:collapse; page-break-inside:auto; font-size:11px; }
        .items thead th { border-bottom:1px solid #000; padding:8px; font-weight:700; background:#fff; }
        .items tbody td { border-bottom:1px solid #999; padding:8px; vertical-align:top; }
        .items td.desc { padding:12px; }
        .items td.hsn, .items th.hsn { border-left:4px solid #000; padding-left:10px; } /* thick vertical separator */
        .items td.r { text-align:right; }
        .items td.c { text-align:center; }
  
        /* avoid splitting row */
        .item-row { page-break-inside: avoid; break-inside: avoid; }
  
        /* reduce filler */
        .filler { min-height:8px; }
  
        /* bottom area: amount words, hsn table, totals */
        .bottom-area { display:flex; gap:8px; margin-top:8px; page-break-inside: avoid; break-inside: avoid; }
        .words { flex:1; border:1px solid #000; padding:8px; box-sizing:border-box; font-size:11px; }
        .words .title { font-weight:700; margin-bottom:6px; }
        .words .value { font-weight:700; }
  
        .hsn-summary { width:100%; border-collapse:collapse; margin-top:8px; font-size:11px; }
        .hsn-summary th, .hsn-summary td { border:1px solid #000; padding:6px; }
  
        .totals { width:340px; border:1px solid #000; box-sizing:border-box; }
        .totals table { width:100%; border-collapse:collapse; font-size:12px; }
        .totals td { padding:8px; border-bottom:1px solid #000; }
        .totals .label { font-weight:700; }
        .totals .grand { background:#f3f3f3; font-weight:700; font-size:14px; }
  
        .tax-in-words { margin-top:6px; font-weight:700; }
  
        .bank-declare { display:flex; gap:8px; margin-top:8px; page-break-inside: avoid; break-inside: avoid; }
        .bank, .declare { border:1px solid #000; padding:8px; box-sizing:border-box; font-size:11px; }
        .bank { flex:1; }
        .declare { width:340px; }
  
        .signature { margin-top:12px; text-align:right; }
        .signature .line { border-top:1px solid #000; display:inline-block; padding-top:6px; width:70%; }
  
        @media print {
          body { -webkit-print-color-adjust:exact; }
          .page { padding:6mm; }
          tr, td { orphans:3; widows:3; }
        }
      </style>
    </head>
    <body onload="window.print(); window.close();">
      <div class="page">
  
        <!-- tiny top info row -->
        <div class="top-info">
          <div class="left">${formatDateTime(new Date())}</div>
          <div class="center">${invoice.invoiceNumber ? `Tax Invoice - ${invoice.invoiceNumber}` : 'Tax Invoice'}</div>
          <div class="right"></div>
        </div>
  
        <!-- header grid: IRN left, QR right; title row spans both -->
        <div class="header-grid">
          <div class="irn-box">
            <div><strong>IRN</strong> &nbsp;: &nbsp; <span style="font-weight:700;">${invoice.irn || ''}</span></div>
            <div><strong>Ack No.</strong> &nbsp;: &nbsp; ${invoice.ackNumber || ''}</div>
            <div><strong>Ack Date</strong> &nbsp;: &nbsp; ${formatDate(invoice.ackDate)}</div>
          </div>
  
          <div class="qr-block">
            <div class="qr-label">e-Invoice</div>
            ${invoice.qrCodeInvoice ? `<img src="${invoice.qrCodeInvoice}" alt="QR"/>` : `<div style="width:120px;height:120px;border:1px solid #000;"></div>`}
          </div>
  
          <div class="invoice-title-row">
            <h1 class="invoice-title">Tax Invoice</h1>
          </div>
        </div>
  
        <!-- company left, invoice meta right -->
        <div class="header-main">
          <div class="company-box">
            <div class="name">Sun Power Services</div>
            <div>D No.53, Plot No.4, 4th Street, Phase-1 Extension</div>
            <div>Annai Velankanni Nagar, Madhananthapuram, Porur</div>
            <div>Chennai - 600116</div>
            <div>044-24828218, 9176660123</div>
            <div>GSTIN/UIN: 33BLFPS9951M1ZC</div>
            <div>State Name : Tamil Nadu, Code : 33</div>
            <div>E-Mail : sunpowerservices@gmail.com</div>
          </div>
  
          <div class="meta-box">
            <table class="meta-table">
              <tr>
                <td style="width:50%"><div class="label">Invoice No.</div><div style="font-weight:700;">${invoice.invoiceNumber || ''}</div></td>
                <td style="width:50%"><div class="label">Dated</div><div>${formatDate(invoice.invoiceDate || invoice.issueDate)}</div></td>
              </tr>
              <tr>
                <td><div class="label">Delivery Note</div><div>${invoice.deliveryNotes || ''}</div></td>
                <td><div class="label">Mode/Terms of Payment</div><div>${invoice.termsOfPayment || invoice.paymentTerms || ''}</div></td>
              </tr>
              <tr>
                <td><div class="label">Reference No. & Date.</div><div>${(invoice.referenceNumber || invoice.referenceNo || '') + (invoice.referenceDate ? ' ' + formatDate(invoice.referenceDate) : '')}</div></td>
                <td><div class="label">Other References</div><div>${invoice.otherReferences || ''}</div></td>
              </tr>
              <tr>
                <td><div class="label">Buyer's Order No.</div><div>${invoice.buyersOrderNumber || ''}</div></td>
                <td><div class="label">Dated</div><div>${formatDate(invoice.buyersOrderDate)}</div></td>
              </tr>
              <tr>
                <td><div class="label">Dispatch Doc No.</div><div>${invoice.dispatchDocNo || ''}</div></td>
                <td><div class="label">Delivery Note Date</div><div>${formatDate(invoice.deliveryNoteDate)}</div></td>
              </tr>
              <tr>
                <td><div class="label">Dispatched through</div><div>${invoice.dispatchedThrough || ''}</div></td>
                <td><div class="label">Destination</div><div>${invoice.destination || ''}</div></td>
              </tr>
              <tr>
                <td colspan="2"><div class="label">Terms of Delivery</div><div>${invoice.termsOfDelivery || ''}</div></td>
              </tr>
            </table>
          </div>
        </div>
  
        <!-- stacked consignee / buyer -->
        <div class="addresses">
          <div class="addr">
            <div class="title">Consignee (Ship to)</div>
            <div style="font-weight:700;">${consignee.name || invoice.shippingName || ''}</div>
            <div>${consignee.address || ''}</div>
            <div>${consignee.district || ''} ${consignee.state ? ', ' + consignee.state : ''} ${consignee.pincode ? '- ' + consignee.pincode : ''}</div>
            <div>GSTIN/UIN : ${consignee.gstNumber || 'N/A'}</div>
          </div>
  
          <div class="addr">
            <div class="title">Buyer (Bill to)</div>
            <div style="font-weight:700;">${invoice.customer?.name || buyer.name || ''}</div>
            <div>${buyer.address || ''}</div>
            <div>${buyer.district || ''} ${buyer.state ? ', ' + buyer.state : ''} ${buyer.pincode ? '- ' + buyer.pincode : ''}</div>
            <div>GSTIN/UIN : ${buyer.gstNumber || 'N/A'}</div>
          </div>
        </div>
  
        <div class="divider"></div>
  
        <table class="items">
          <thead>
            <tr>
              <th style="width:4%;">Sl No.</th>
              <th style="width:62%;">Description of Services</th>
              <th class="hsn" style="width:8%;">HSN/SAC</th>
              <th style="width:6%;">GST Rate</th>
              <th style="width:5%;">Qty</th>
              <th style="width:7%;">Rate</th>
              <th style="width:5%;">Unit</th>
              <th style="width:5%;">Disc. %</th>
              <th style="width:8%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td class="c" colspan="9" style="padding:30px;text-align:center;">No items</td></tr>`}
            <tr><td colspan="9" class="filler"></td></tr>
          </tbody>
        </table>
  
        <div class="bottom-area">
          <div class="words">
            <div class="title">Amount Chargeable (in words)</div>
            <div class="value">Indian Rupees ${numberToWords(grandTotal)}</div>
  
            <table class="hsn-summary">
              <thead>
                <tr>
                  <th>HSN/SAC</th>
                  <th>Taxable Value</th>
                  <th>CGST</th>
                  <th>SGST/UTGST</th>
                  <th>Total Tax Amount</th>
                </tr>
                <tr>
                  <th></th>
                  <th></th>
                  <th>Rate Amount</th>
                  <th>Rate Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${allItems.length ? (() => {
                  const groups: { [k: string]: { taxable: number; rate: number; cgstAmt: number; sgstAmt: number; totalTax: number } } = {};
                  allItems.forEach((it: any) => {
                    const h = it.hsnNumber || '---';
                    const qty = Number(it.quantity || 0);
                    const rate = Number(it.unitPrice || 0);
                    const disc = Number(it.discount || 0);
                    const basic = qty * rate;
                    const discAmt = (disc / 100) * basic;
                    const taxable = basic - discAmt;
                    const taxRate = Number(it.taxRate || 0);
                    const taxAmt = (taxRate / 100) * taxable;
                    const cg = isIntraState ? taxAmt / 2 : 0;
                    const sg = isIntraState ? taxAmt / 2 : 0;
                    if (!groups[h]) groups[h] = { taxable: 0, rate: taxRate, cgstAmt: 0, sgstAmt: 0, totalTax: 0 };
                    groups[h].taxable += taxable;
                    groups[h].cgstAmt += cg;
                    groups[h].sgstAmt += sg;
                    groups[h].totalTax += taxAmt;
                  });
                  return Object.keys(groups).map(h => `<tr>
                    <td>${h}</td>
                    <td style="text-align:right;">${formatMoney(groups[h].taxable)}</td>
                    <td style="text-align:center;">${isIntraState ? (groups[h].rate/2).toFixed(0) + ' %' : '0 %'} <span style="float:right;">${formatMoney(groups[h].cgstAmt)}</span></td>
                    <td style="text-align:center;">${isIntraState ? (groups[h].rate/2).toFixed(0) + ' %' : '0 %'} <span style="float:right;">${formatMoney(groups[h].sgstAmt)}</span></td>
                    <td style="text-align:right;">${formatMoney(groups[h].totalTax)}</td>
                  </tr>`).join('');
                })() : `<tr><td colspan="5" style="text-align:center;">No HSN data</td></tr>`}
              </tbody>
            </table>
          </div>
  
          <div class="totals">
            <table>
              <tr><td class="label">Total</td><td style="text-align:right;">₹ ${formatMoney(Math.max(0, grandTotal - totalTax))}</td></tr>
              ${isIntraState ? `
                <tr><td class="label">CGST</td><td style="text-align:right;">₹ ${formatMoney(cgstAmountTotal)}</td></tr>
                <tr><td class="label">SGST/UTGST</td><td style="text-align:right;">₹ ${formatMoney(sgstAmountTotal)}</td></tr>
              ` : `
                <tr><td class="label">IGST</td><td style="text-align:right;">₹ ${formatMoney(igstAmountTotal)}</td></tr>
              `}
              <tr><td class="label grand">Grand Total</td><td style="text-align:right;" class="grand">₹ ${formatMoney(grandTotal)}</td></tr>
            </table>
          </div>
        </div>
  
        <div class="tax-in-words">Tax Amount (in words) : <span style="font-weight:normal;">Indian Rupees ${numberToWords(totalTax)}</span></div>
  
        <div class="bank-declare">
          <div class="bank">
            <div style="font-weight:700; margin-bottom:6px;">Company's Bank Details</div>
            <div>Bank Name : Hdfc Bank A/c No: ${invoice.bankAccount || '50200051862959'}</div>
            <div>A/c No. : ${invoice.bankAccount || '50200051862959'}</div>
            <div>Branch & IFS Code : ${invoice.branch || 'Moulivakkam & HDFC0005281'}</div>
            <div style="margin-top:8px; font-weight:700;">Company's PAN : ${invoice.companyPan || 'BLFPS9951M'}</div>
          </div>
  
          <div class="declare">
            <div style="font-weight:700; margin-bottom:6px;">Declaration</div>
            <div style="font-size:11px;">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
            <div class="signature">
              <div>for Sun Power Services</div>
              <div class="line">Authorised Signatory</div>
            </div>
          </div>
        </div>
  
      </div>
    </body>
    </html>
    `;
  
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };
  