import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/Botton';
import { ArrowLeft, Printer } from 'lucide-react';

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getSelectedAddress = (quotation: any) => {
  if (!quotation.selectedAddressId || !quotation.customer?.addresses) {
    return null;
  }
  
  return quotation.customer.addresses.find((addr: any) => 
    addr.id.toString() === quotation.selectedAddressId
  ) || null;
};

interface AMCQuotationPrintViewProps {
  quotation: any;
}

const AMCQuotationPrintView: React.FC<AMCQuotationPrintViewProps> = ({ quotation }) => {
  const navigate = useNavigate();

  if (!quotation) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Quotation Found</h2>
          <p className="text-gray-600 mb-6">Please select a quotation to print.</p>
          <Button onClick={() => navigate('/amc-quotations')}>
            Back to AMC Quotations
          </Button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
  
    // Generate dynamic content based on quotation data
    const generateOfferItemsRows = () => {
      return quotation.offerItems?.map((item: any, index: any) => `
        <tr>
          <td>${item.make || 'N/A'}</td>
          <td>${item.engineSlNo || 'N/A'}</td>
          <td class="currency">${item.dgRatingKVA || 'N/A'}</td>
          <td class="currency">${item.typeOfVisits || 'N/A'}</td>
          <td class="currency">${item.qty || 'N/A'}</td>
          <td class="currency">${formatCurrency(item.amcCostPerDG || 0)}</td>
          <td class="currency">${formatCurrency(item.totalAMCAmountPerDG || 0)}</td>
          <td class="currency">${formatCurrency(item.gst18 || 0)}</td>
          <td class="currency">${formatCurrency(item.totalAMCCost || 0)}</td>
        </tr>
      `).join('') || '<tr><td colspan="9" class="text-center">No items found</td></tr>';
    };
  
    const generateSparesRows = () => {
      if (quotation.amcType === 'CAMC' && quotation.sparesItems && quotation.sparesItems.length > 0) {
        return quotation.sparesItems.map((item: any, index: any) => `
          <tr>
            <td>${item.srNo || index + 1}</td>
            <td>${item.partNo || 'N/A'}</td>
            <td>${item.description || 'N/A'}</td>
            <td>${item.hsnCode || 'N/A'}</td>
            <td>${item.qty || 'N/A'}</td>
          </tr>
        `).join('');
      }
      return '<tr><td colspan="5" class="text-center">No spares items</td></tr>';
    };
  
    const printContent = `
      <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AMC Offer - ${quotation.customer?.name || 'N/A'}</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
  
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.3;
        color: #000;
        background: white;
        font-size: 12px;
      }
  
      .container {
        max-width: 210mm;
        margin: 0 auto;
        padding: 15px;
        background: white;
      }
  
      /* Print styles */
      @media print {
        body {
          margin: 0;
          padding: 0;
          font-size: 11px;
        }
        
        .container {
          max-width: none;
          margin: 0;
          padding: 10mm;
          box-shadow: none;
        }
        
        .no-print {
          display: none !important;
        }
        
        @page {
          margin: 8mm;
          size: A4;
        }
        
        .page-break {
          page-break-after: always;
        }
      }
  
      /* Header */
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        border-bottom: 2px solid #dc2626;
        padding-bottom: 10px;
      }
  
      .logo-section {
        display: flex;
        align-items: center;
        gap: 10px;
      }
  
      .logo {
        background: #dc2626;
        color: white;
        padding: 6px 12px;
        font-weight: bold;
        font-size: 14px;
        border-radius: 4px;
      }
  
      .company-info {
        font-size: 10px;
        color: #dc2626;
      }
  
      .service-tag {
        background: #dc2626;
        color: white;
        padding: 6px 12px;
        font-weight: bold;
        font-size: 12px;
        border-radius: 4px;
      }
  
      /* Title */
      .document-title {
        text-align: center;
        margin-bottom: 20px;
      }
  
      .main-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #dc2626;
      }
  
      /* Client info */
      .client-info {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 20px;
      }
  
      .info-group {
        display: flex;
        gap: 10px;
      }
  
      .info-label {
        font-weight: bold;
        min-width: 70px;
        color: #000;
        font-size: 11px;
      }
  
      .info-value {
        color: #000;
        font-size: 11px;
      }
  
      /* Offer details section */
      .section-title {
        font-size: 14px;
        font-weight: bold;
        margin: 15px 0 10px 0;
        color: #dc2626;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 4px;
      }
  
      /* Table styles */
      .offer-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
        font-size: 10px;
      }
  
      .offer-table th {
        background: #f8fafc;
        border: 1px solid #d1d5db;
        padding: 6px 4px;
        text-align: left;
        font-weight: 600;
        color: #374151;
        font-size: 10px;
      }
  
      .offer-table td {
        border: 1px solid #d1d5db;
        padding: 5px 4px;
        text-align: left;
        font-size: 10px;
      }
  
      .offer-table tr:nth-child(even) {
        background: #f9fafb;
      }
  
      .currency {
        text-align: right;
      }
  
      /* Terms section */
      .terms-list {
        font-size: 11px;
        line-height: 1.6;
      }
  
      /* Spares table */
      .spares-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
        font-size: 10px;
      }
  
      .spares-table th {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        padding: 6px 4px;
        text-align: center;
        font-weight: 600;
        font-size: 10px;
      }
  
      .spares-table td {
        border: 1px solid #cbd5e1;
        padding: 5px 4px;
        text-align: center;
        font-size: 10px;
      }
  
      /* Financial summary */
      .financial-summary {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 15px;
      }
  
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }
  
      .summary-item {
        text-align: center;
      }
  
      .summary-label {
        font-size: 10px;
        color: #64748b;
        margin-bottom: 4px;
        font-weight: 500;
      }
  
      .summary-value {
        font-size: 12px;
        font-weight: bold;
      }
  
      .summary-value.subtotal { color: #374151; }
      .summary-value.tax { color: #dc2626; }
      .summary-value.total { color: #059669; }
      .summary-value.paid { color: #2563eb; }
  
      /* Print button */
      .print-button {
        position: fixed;
        top: 20px;
        right: 20px;
        border: 2px solid #000;
        padding: 12px 24px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        background: white;
        border-radius: 4px;
      }
  
      .print-button:hover {
        background: #f3f4f6;
      }
  
      @media screen and (max-width: 768px) {
        .container {
          padding: 15px;
        }
        
        .client-info {
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        .summary-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .print-button {
          position: static;
          margin-bottom: 20px;
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <button class="print-button no-print" onclick="window.print()">🖨️ Print Document</button>
    
    <div class="container">
      <!-- PAGE 1: Main Quotation -->
      <!-- Header -->
      <div class="header">
        <div class="logo-section">
          <div class="logo">powerol</div>
          <div class="company-info">by Mahindra</div>
        </div>
        <div class="service-tag">Sun Power Services</div>
      </div>
  
      <!-- Document Title -->
      <div class="document-title">
        <h1 class="main-title">ANNUAL MAINTENANCE (${quotation.amcType}) OFFER</h1>
        <span style="color: black; font-size: 12px;">${quotation.amcType || 'AMC'}</span>
      </div>
  
      <!-- Client Information -->
      <div class="client-info">
        <div class="info-group">
          <span class="info-label">To, M/S:</span>
          <div class="info-value">
            <div>${quotation.customer?.name || 'N/A'}</div>
            ${(() => {
              const selectedAddress = getSelectedAddress(quotation);
              return selectedAddress ? `
                <div style="margin-top: 4px; font-size: 10px; color: #666;">
                  ${selectedAddress.address}<br>
                  ${selectedAddress.district}, ${selectedAddress.state} - ${selectedAddress.pincode}
                </div>
                ${selectedAddress.gstNumber ? `<div style="margin-top: 4px; font-size: 10px; color: #666;">GST No: ${selectedAddress.gstNumber}</div>` : ''}
                ${selectedAddress.email ? `<div style="margin-top: 4px; font-size: 10px; color: #666;">Email: ${selectedAddress.email}</div>` : ''}
                ${selectedAddress.phone ? `<div style="margin-top: 4px; font-size: 10px; color: #666;">Phone: ${selectedAddress.phone}</div>` : ''}
              ` : '';
            })()}
          </div>
        </div>
        <div class="info-group">
          <span class="info-label">Subject:</span>
          <span class="info-value">${quotation.subject || 'N/A'}</span>
        </div>
        <div class="info-group">
          <span class="info-label">Ref of quote:</span>
          <span class="info-value">${quotation.refOfQuote || 'N/A'}</span>
        </div>
        <div class="info-group">
          <span class="info-label">Create Date:</span>
          <span class="info-value">${formatDate(quotation.issueDate)}</span>
        </div>
      </div>
  
      <!-- Offer Details -->
      <h2 class="section-title">Offer Details</h2>
      <table class="offer-table">
        <thead>
          <tr>
            <th>Make</th>
            <th>Engine Sl.No</th>
            <th>DG Rating in KVA</th>
            <th>No Of Visits</th>
            <th>Qty</th>
            <th>${quotation.amcType} cost per DG</th>
            <th>Total ${quotation.amcType} Amount per DG</th>
            <th>GST @ 18%</th>
            <th>Total ${quotation.amcType} Cost</th>
          </tr>
        </thead>
        <tbody>
          ${generateOfferItemsRows()}
        </tbody>
      </table>
  
      <!-- Terms & Conditions - Short Summary -->
      <h2 class="section-title">TERMS & CONDITIONS:</h2>
      <div class="terms-list" style="margin-bottom: 15px;">
        <div style="margin-bottom: 8px;"><span style="font-weight: bold;">1. GST:</span> ${quotation.gstIncluded ? 'Included' : 'Not Included'}</div>
        <div style="margin-bottom: 8px;"><span style="font-weight: bold;">2. PAYMENT:</span> ${quotation.paymentTermsText || 'Manual Entry'}</div>
        <div style="margin-bottom: 8px;"><span style="font-weight: bold;">3. VALIDITY:</span> ${quotation.validityText || 'Manual Entry'}</div>
        <div style="margin-bottom: 8px;"><span style="font-weight: bold;">4. AMC Period:</span> ${formatDate(quotation.amcPeriodFrom)} TO ${formatDate(quotation.amcPeriodTo)}</div>
      </div>

            <!-- Financial Summary -->
      <h2 class="section-title" style="margin-top: 40px;">Financial Summary</h2>
      <div class="financial-summary">
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Subtotal:</div>
            <div class="summary-value subtotal">${formatCurrency(quotation.subtotal || 0)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Tax:</div>
            <div class="summary-value tax">${formatCurrency(quotation.totalTax || 0)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Grand Total:</div>
            <div class="summary-value total">${formatCurrency(quotation.grandTotal || 0)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Paid Amount:</div>
            <div class="summary-value paid">${formatCurrency(quotation.paidAmount || 0)}</div>
          </div>
        </div>
      </div>
      
      <div style="margin-bottom: 15px; font-size: 11px;">
        We trust that our offer is in line with your requirement and shall be glad to receive your valued Purchase Order.
      </div>
      
      <div style="text-align: right; margin-top: 40px; margin-bottom: 30px;">
        <div style="font-weight: bold; font-size: 11px;">Authorised Signatory</div>
      </div>
  
      <!-- Page Break -->
      <div class="page-break"></div>
  
      <!-- PAGE 2: Detailed Terms and Conditions -->
      <div class="header">
        <div class="logo-section">
          <div class="logo">powerol</div>
          <div class="company-info">by Mahindra</div>
        </div>
        <div class="service-tag">Sun Power Services</div>
      </div>
  
      <h2 class="section-title" style="margin-top: 20px; text-align: center;">TERMS AND CONDITIONS</h2>
      
      <div style="font-size: 13px; line-height: 1.6; margin-bottom: 15px; margin-top: 20px;">
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">1.</span> This agreement is valid for DIESEL GENERATOR ENGINE COUPLED with ALTERNATOR AND DG Standard PANEL BOARD.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">2.</span> Service Dealer reserves the right to inspect the engine before the agreement is entered.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">3.</span> Our service Engineer will make above scheduled visits during the period of this service Agreement for general checkup and preventive maintenance. This work will be carried out on the site as per customer and service dealer within the scheduled period.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">4.</span> In addition, Breakdown calls will be attended subject to a mutually agreed calls during the Agreement Year.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">5.</span> Customer will make Genset available for service and will provide necessary manual labour wherever required, for removal and fitment of bulky or heavy material, under this agreement.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">6.</span> The agreement does not cover Top Overhauls, Major overhauls, spares cost and modifications on engines, main alternators & Panel boards etc.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">7.</span> The break down calls will be attended with in 24 hrs and Genset services will be restored immediately provided no additional spares required.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">8.</span> The customer will not entrust the Genset under this service agreement to any other service agencies for repairs during the agreement period and in the event of withdrawal of the agreement the customer will inform us in writing before the expiry of the agreement and for mutual settlement.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">9.</span> Customer will take care of day to day maintenance and general care of the equipment and genset room under suitable conditions and also follow operating instructions as given by manufacturer.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">10.</span> Charges for repairing of main alternator, Panel board, self starter, charging alternator, Fuel pump, Injector, Radiator, Engine safety system, battery, Fuel tank, Canopy, Exhaust Pipe, Exhaust silencer, Engine mounting will be extra as actual.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">11.</span> Parts required for servicing of engines should be sourced from service Dealer only on chargeable - basis in case of AMC.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">12.</span> Under this agreement will automatically crease to exit in the event of change of ownership or location of the above said Genset.
        </div>
        
        <div style="margin-bottom: 10px;">
          <span style="font-weight: bold;">13.</span> The agreed contract amount to be paid by customer to service Dealer at the beginning of agreement, the Contract will come into effect only after receipt of full amount in advance.
        </div>
        
        <div style="margin-bottom: 10px; font-weight: bold; margin-top: 20px;">
          FOR SUN POWER SERVICES
        </div>
      </div>
  
      <!-- Page Break -->
      <div class="page-break"></div>
  
      <!-- PAGE 3: Spares Section -->
      ${quotation.amcType === 'CAMC' ? `<div class="header">
        <div class="logo-section">
          <div class="logo">powerol</div>
          <div class="company-info">by Mahindra</div>
        </div>
        <div class="service-tag">Sun Power Services</div>
      </div>` : ''}
  
      ${quotation.amcType === 'CAMC' ? `<h2 class="section-title" style="margin-top: 20px;">Spares replaced in this periodical service One:</h2>` : ''}
     
      ${quotation.amcType === 'CAMC' ? `<table class="spares-table">
        <thead>
          <tr>
            <th>Sr.No</th>
            <th>Part No</th>
            <th>Description</th>
            <th>HSN Code</th>
            <th>Qty</th>
          </tr>
        </thead>
        <tbody>
          ${generateSparesRows()}
        </tbody>
      </table>` : ''}
      
      ${quotation.amcType === 'CAMC' ? `<div style="font-size: 11px; margin-top: 15px; margin-bottom: 20px;">
        Any spares other than the above mentioned spares required for restoration of DG will be at extra cost.
      </div>` : ''}
      
      ${quotation.amcType === 'CAMC' ? `<div style="font-size: 11px; margin-top: 30px; font-weight: bold;">
        For Sun Power Services,
      </div>` : ''}
  

    </div>
  
    <script>
      // Auto print when page loads
      window.onload = function() {
        setTimeout(function() {
          window.print();
        }, 500);
      };
    </script>
  </body>
  </html>
    `;
  
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    }
  };

  const handleBack = () => {
    navigate('/amc-quotations');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Print Styles */}
     
      
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden p-4 bg-gray-100 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <Button
            onClick={handleBack}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to AMC Quotations</span>
          </Button>
          <Button
            onClick={handlePrint}
            className="flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Print Content */}
      <div className="p-6 print:p-8 print:bg-white print:max-w-none print:mx-0">
        {/* Header with Logos */}
        <div className="flex justify-between items-center mb-8 pb-4 border-b-2 border-red-300 print:mb-6">
          <div className="flex items-center">
            <div className="text-red-600 font-bold text-3xl print:text-2xl">powerol</div>
            <div className="text-gray-600 text-sm ml-3 print:text-xs">by Mahindra</div>
          </div>
          <div className="flex items-center">
            <div className="text-red-600 font-semibold text-xl print:text-lg">Sun Power Services</div>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 print:text-2xl print:mb-3">ANNUAL MAINTENANCE ({quotation.amcType}) OFFER</h1>
          <div className="flex justify-center items-center">
            <div className="px-6 py-3 border-2 border-blue-400 bg-blue-100 text-blue-800 rounded-full font-semibold text-lg print:px-4 print:py-2 print:text-base">
              {quotation.amcType}
            </div>
          </div>
        </div>

        {/* Customer and Subject Section */}
        <div className="mb-8 print:mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-6">
            {/* Left Column */}
            <div className="space-y-5 print:space-y-4">
              <div className="flex items-start space-x-6 print:space-x-4">
                <span className="font-semibold w-24 print:w-20 text-gray-700">To, M/S:</span>
                <div className="flex-1">
                  <div className="font-semibold text-lg print:text-base">{quotation.customer.name}</div>
                  {(() => {
                    const selectedAddress = getSelectedAddress(quotation);
                    return selectedAddress ? (
                      <div className="mt-2">
                        <div className="text-sm text-gray-600 print:text-xs">{selectedAddress.address}</div>
                        <div className="text-sm text-gray-600 print:text-xs">
                          {selectedAddress.district}, {selectedAddress.state} - {selectedAddress.pincode}
                        </div>
                        {selectedAddress.gstNumber && <div className="text-sm text-gray-600 print:text-xs">GST No : {selectedAddress.gstNumber}</div>}
                        {selectedAddress.email && <div className="text-sm text-gray-600 print:text-xs py-1">Email : {selectedAddress.email}</div>}
                        {selectedAddress.phone && <div className="text-sm text-gray-600 print:text-xs">Phone : {selectedAddress.phone}</div>}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className="flex items-center space-x-6 print:space-x-4">
                <span className="font-semibold w-24 print:w-20 text-gray-700">Ref of quote:</span>
                <div className="flex-1">
                  <div className="font-medium">{quotation.refOfQuote || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5 print:space-y-4">
              <div className="flex items-center space-x-6 print:space-x-4">
                <span className="font-semibold w-24 print:w-20 text-gray-700">Subject:</span>
                <div className="flex-1">
                  <div className="font-medium">{quotation.subject || 'N/A'}</div>
                </div>
              </div>

              <div className="flex items-center space-x-6 print:space-x-4">
                <span className="font-semibold w-24 print:w-20 text-gray-700">Create Date:</span>
                <div className="flex-1">
                  <div className="font-medium">{formatDate(quotation.issueDate)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Offer Details Table */}
        <div className="mb-8 print:mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-5 print:text-lg print:mb-4 underline">Offer Details</h3>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full border-2 border-gray-400 print:border-gray-600">
              <thead className="bg-gray-100 print:bg-gray-200">
                <tr>
                  <th className="border border-gray-400 px-3 py-3 text-left font-semibold text-sm print:px-2 print:py-2 print:text-xs">Make</th>
                  <th className="border border-gray-400 px-3 py-3 text-left font-semibold text-sm print:px-2 print:py-2 print:text-xs">Engine Sl.No</th>
                  <th className="border border-gray-400 px-3 py-3 text-left font-semibold text-sm print:px-2 print:py-2 print:text-xs">DG Rating in KVA</th>
                  <th className="border border-gray-400 px-3 py-3 text-left font-semibold text-sm print:px-2 print:py-2 print:text-xs">No Of Visits</th>
                  <th className="border border-gray-400 px-3 py-3 text-center font-semibold text-sm print:px-2 print:py-2 print:text-xs">Qty</th>
                  <th className="border border-gray-400 px-3 py-3 text-right font-semibold text-sm print:px-2 print:py-2 print:text-xs">{quotation.amcType} cost per DG</th>
                  <th className="border border-gray-400 px-3 py-3 text-right font-semibold text-sm print:px-2 print:py-2 print:text-xs">Total {quotation.amcType} Amount per DG</th>
                  <th className="border border-gray-400 px-3 py-3 text-right font-semibold text-sm print:px-2 print:py-2 print:text-xs">GST @ 18%</th>
                  <th className="border border-gray-400 px-3 py-3 text-right font-semibold text-sm print:px-2 print:py-2 print:text-xs">Total {quotation.amcType} Cost</th>
                </tr>
              </thead>
              <tbody>
                {quotation.offerItems.map((item: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50 print:hover:bg-transparent">
                    <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs font-medium">{item.make}</td>
                    <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs">{item.engineSlNo}</td>
                    <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs text-center">{item.dgRatingKVA}</td>
                    <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs text-center">{item.typeOfVisits}</td>
                    <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs text-center font-medium">{item.qty}</td>
                    <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs text-right">{formatCurrency(item.amcCostPerDG)}</td>
                    <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs text-right">{formatCurrency(item.totalAMCAmountPerDG)}</td>
                    <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs text-right">{formatCurrency(item.gst18)}</td>
                    <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs text-right font-semibold">{formatCurrency(item.totalAMCCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="mb-8 print:mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-5 print:text-lg print:mb-4 underline">TERMS & CONDITIONS:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-6">
            {/* Left Column */}
            <div className="space-y-5 print:space-y-4">
              <div className="flex items-start space-x-6 print:space-x-4">
                <span className="font-semibold w-28 print:w-24 text-gray-700">PAYMENT:</span>
                <span className="flex-1 font-medium">{quotation.paymentTermsText || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-6 print:space-x-4">
                <span className="font-semibold w-28 print:w-24 text-gray-700">AMC Start Date:</span>
                <span className="flex-1 font-medium">{formatDate(quotation.amcPeriodFrom)}</span>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5 print:space-y-4">
              <div className="flex items-start space-x-6 print:space-x-4">
                <span className="font-semibold w-28 print:w-24 text-gray-700">VALIDITY:</span>
                <span className="flex-1 font-medium">{quotation.validityText || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-6 print:space-x-4">
                <span className="font-semibold w-28 print:w-24 text-gray-700">AMC End Date:</span>
                <span className="flex-1 font-medium">{formatDate(quotation.amcPeriodTo)}</span>
              </div>
            </div>
          </div>

          {/* GST Section */}
          <div className="mt-6 print:mt-4 pt-4 print:pt-3 border-t border-gray-300 print:border-gray-400">
            <div className="flex items-center space-x-6 print:space-x-4">
              <span className="font-semibold w-28 print:w-24 text-gray-700">GST:</span>
              <span className="font-medium text-lg print:text-base">{quotation.gstIncluded ? 'Included' : 'Not Included'}</span>
            </div>
          </div>
        </div>

        {/* CAMC Spares Section */}
        {quotation.amcType === 'CAMC' && quotation.sparesItems && quotation.sparesItems.length > 0 && (
          <div className="mb-8 print:mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-5 print:text-lg print:mb-4 underline">Spares replaced in this periodical service</h3>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full border-2 border-gray-400 print:border-gray-600">
                <thead className="bg-gray-100 print:bg-gray-200">
                  <tr>
                    <th className="border border-gray-400 px-3 py-3 text-center font-semibold text-sm print:px-2 print:py-2 print:text-xs">Sr.No</th>
                    <th className="border border-gray-400 px-3 py-3 text-left font-semibold text-sm print:px-2 print:py-2 print:text-xs">Part No</th>
                    <th className="border border-gray-400 px-3 py-3 text-left font-semibold text-sm print:px-2 print:py-2 print:text-xs">Description</th>
                    <th className="border border-gray-400 px-3 py-3 text-left font-semibold text-sm print:px-2 print:py-2 print:text-xs">HSN Code</th>
                    <th className="border border-gray-400 px-3 py-3 text-center font-semibold text-sm print:px-2 print:py-2 print:text-xs">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.sparesItems.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50 print:hover:bg-transparent">
                      <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs text-center font-medium">{item.srNo}</td>
                      <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs font-medium">{item.partNo}</td>
                      <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs">{item.description}</td>
                      <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs">{item.hsnCode}</td>
                      <td className="border border-gray-400 px-3 py-3 text-sm print:px-2 print:py-2 print:text-xs text-center font-medium">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="mb-8 print:mb-6 p-6 print:p-4 bg-gray-100 print:bg-gray-200 rounded-lg print:rounded border-2 border-gray-300 print:border-gray-400">
          <h3 className="text-xl font-bold text-gray-900 mb-4 print:text-lg print:mb-3 underline">Financial Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:gap-4">
            <div className="text-center print:text-left">
              <div className="font-semibold text-gray-700 text-sm print:text-xs mb-1">Subtotal:</div>
              <div className="text-lg print:text-base font-bold text-gray-900">{formatCurrency(quotation.subtotal)}</div>
            </div>
            <div className="text-center print:text-left">
              <div className="font-semibold text-gray-700 text-sm print:text-xs mb-1">Total Tax:</div>
              <div className="text-lg print:text-base font-bold text-gray-900">{formatCurrency(quotation.totalTax)}</div>
            </div>
            <div className="text-center print:text-left">
              <div className="font-semibold text-gray-700 text-sm print:text-xs mb-1">Grand Total:</div>
              <div className="text-xl print:text-lg font-bold text-green-600">{formatCurrency(quotation.grandTotal)}</div>
            </div>
            <div className="text-center print:text-left">
              <div className="font-semibold text-gray-700 text-sm print:text-xs mb-1">Paid Amount:</div>
              <div className="text-lg print:text-base font-bold text-blue-600">{formatCurrency(quotation.paidAmount)}</div>
            </div>
          </div>
        </div>

        {/* Closing Statement */}
        <div className="mb-8 print:mb-6">
          <p className="text-gray-700 mb-6 print:mb-4 text-lg print:text-base leading-relaxed">
            We trust that our offer is in line with your requirement and shall be glad to receive your valued Purchase Order.
          </p>
          <div className="text-right">
            <p className="font-semibold text-lg print:text-base">Authorised Signatory</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 border-t-2 border-gray-300 print:border-gray-400 pt-6 print:pt-4">
          <p className="mb-2 print:mb-1">Generated on {formatDate(new Date().toISOString())}</p>
          <p className="font-semibold">Quotation Number: {quotation.quotationNumber}</p>
        </div>
      </div>
    </div>
  );
};

export default AMCQuotationPrintView;
