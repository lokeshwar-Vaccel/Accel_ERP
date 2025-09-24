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
    window.print();
  };

  const handleBack = () => {
    navigate('/amc-quotations');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            @page {
              margin: 0.5in;
              size: A4;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-break-inside-avoid {
              break-inside: avoid;
            }
            .print-break-after-page {
              break-after: page;
            }
            .print\\:hidden {
              display: none !important;
            }
            .print\\:p-8 {
              padding: 2rem !important;
            }
            .print\\:bg-white {
              background-color: white !important;
            }
            .print\\:max-w-none {
              max-width: none !important;
            }
            .print\\:mx-0 {
              margin-left: 0 !important;
              margin-right: 0 !important;
            }
            .print\\:overflow-visible {
              overflow: visible !important;
            }
            .print\\:border-gray-600 {
              border-color: #4b5563 !important;
            }
            .print\\:bg-gray-200 {
              background-color: #e5e7eb !important;
            }
            .print\\:text-xs {
              font-size: 0.75rem !important;
            }
            .print\\:text-base {
              font-size: 1rem !important;
            }
            .print\\:text-lg {
              font-size: 1.125rem !important;
            }
            .print\\:text-2xl {
              font-size: 1.5rem !important;
            }
            .print\\:px-2 {
              padding-left: 0.5rem !important;
              padding-right: 0.5rem !important;
            }
            .print\\:py-2 {
              padding-top: 0.5rem !important;
              padding-bottom: 0.5rem !important;
            }
            .print\\:mb-3 {
              margin-bottom: 0.75rem !important;
            }
            .print\\:mb-4 {
              margin-bottom: 1rem !important;
            }
            .print\\:mb-6 {
              margin-bottom: 1.5rem !important;
            }
            .print\\:mt-4 {
              margin-top: 1rem !important;
            }
            .print\\:pt-3 {
              padding-top: 0.75rem !important;
            }
            .print\\:pt-4 {
              padding-top: 1rem !important;
            }
            .print\\:gap-4 {
              gap: 1rem !important;
            }
            .print\\:gap-6 {
              gap: 1.5rem !important;
            }
            .print\\:space-x-4 > * + * {
              margin-left: 1rem !important;
            }
            .print\\:space-y-4 > * + * {
              margin-top: 1rem !important;
            }
            .print\\:w-20 {
              width: 5rem !important;
            }
            .print\\:w-24 {
              width: 6rem !important;
            }
            .print\\:rounded {
              border-radius: 0.25rem !important;
            }
            .print\\:border-gray-400 {
              border-color: #9ca3af !important;
            }
            .print\\:text-left {
              text-align: left !important;
            }
            .print\\:text-center {
              text-align: center !important;
            }
            .print\\:text-right {
              text-align: right !important;
            }
          }
        `
      }} />
      
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
          <h1 className="text-3xl font-bold text-gray-900 mb-4 print:text-2xl print:mb-3">ANNUAL MAINTENANCE (AMC) OFFER</h1>
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
                  {quotation.customer.email && (
                    <div className="text-sm text-gray-600 print:text-xs">{quotation.customer.email}</div>
                  )}
                  {quotation.customer.phone && (
                    <div className="text-sm text-gray-600 print:text-xs">{quotation.customer.phone}</div>
                  )}
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
                  <th className="border border-gray-400 px-3 py-3 text-left font-semibold text-sm print:px-2 print:py-2 print:text-xs">Type Of Visits</th>
                  <th className="border border-gray-400 px-3 py-3 text-center font-semibold text-sm print:px-2 print:py-2 print:text-xs">Qty</th>
                  <th className="border border-gray-400 px-3 py-3 text-right font-semibold text-sm print:px-2 print:py-2 print:text-xs">AMC/CAMC cost per DG</th>
                  <th className="border border-gray-400 px-3 py-3 text-right font-semibold text-sm print:px-2 print:py-2 print:text-xs">Total AMC Amount per DG</th>
                  <th className="border border-gray-400 px-3 py-3 text-right font-semibold text-sm print:px-2 print:py-2 print:text-xs">GST @ 18%</th>
                  <th className="border border-gray-400 px-3 py-3 text-right font-semibold text-sm print:px-2 print:py-2 print:text-xs">Total AMC Cost</th>
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
