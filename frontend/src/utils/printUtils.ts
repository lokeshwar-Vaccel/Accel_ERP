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
                    <div class="item-desc">${item.kva} KVA - GENSET</div>
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