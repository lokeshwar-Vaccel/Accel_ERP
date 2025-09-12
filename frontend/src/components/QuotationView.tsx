import React from 'react';
import { Printer, Download } from 'lucide-react';
import { QuotationData } from '../utils/quotationUtils';

interface QuotationViewProps {
  quotation: QuotationData;
  onPrint?: () => void;
  onDownload?: () => void;
  isPrintMode?: boolean;
}

const QuotationView: React.FC<QuotationViewProps> = ({
  quotation,
  onPrint,
  onDownload,
  isPrintMode = false
}) => {
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Helper function to format date
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN');
  };

  // Calculate totals
  const subtotal = quotation.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  const totalDiscount = quotation.items.reduce((sum, item) => sum + (item.discountedAmount || 0), 0);
  const totalTax = quotation.items.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const grandTotal = quotation.grandTotal || 0;

  return (
    <div className={`quotation-view ${isPrintMode ? 'print-mode' : ''}`}>
      {/* Print Header - Only visible when printing */}
      {isPrintMode && (
        <div className="print-header">
          <h1 className="text-2xl font-bold text-center">Quotation</h1>
        </div>
      )}

      {/* Main Quotation Container */}
      <div className="quotation-container bg-white border border-gray-300 shadow-lg">
        
        {/* Header Section */}
        <div className="quotation-header p-6 border-b-2 border-black">
          <div className="flex justify-between items-start">
            {/* Left Header Block */}
            <div className="left-header flex-1 space-y-4">
              {/* Reference Number */}
              <div className="reference-section">
                <div className="text-sm font-medium text-gray-700">Ref: {quotation.quotationNumber || 'SPS/SER/CHE/QTN/25-26/00001'}</div>
                <div className="mt-2">
                  <label className="text-sm font-medium text-gray-700">Reference:</label>
                  <div className="mt-1 p-2 bg-yellow-100 border border-yellow-300 rounded min-h-[40px]">
                    {quotation.assignedEngineer ? 'Employee Name' : 'Balaji (Drop Down Employee name from HR Master)'}
                  </div>
                </div>
              </div>

              {/* Customer Billing Address */}
              <div className="customer-billing">
                <label className="text-sm font-medium text-gray-700">Customer Billing Address:</label>
                <div className="mt-1 p-3 border border-gray-300 rounded min-h-[80px] bg-gray-50">
                  {quotation.customerAddress?.address || 'Type & search'}
                </div>
              </div>

              {/* Engine Details */}
              <div className="engine-details grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Engine Serial Number:</label>
                  <div className="mt-1 p-2 bg-yellow-100 border border-yellow-300 rounded min-h-[40px]">
                    {quotation.engineSerialNumber || 'Auto select or drop down'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">DG Rating:</label>
                  <div className="mt-1 p-2 bg-yellow-100 border border-yellow-300 rounded min-h-[40px]">
                    {quotation.kva || 'Auto select or drop down'}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Header Block */}
            <div className="right-header flex-1 ml-8 space-y-4">
              {/* Date */}
              <div>
                <label className="text-sm font-medium text-gray-700">Date:</label>
                <div className="mt-1 p-2 bg-yellow-100 border border-yellow-300 rounded min-h-[40px]">
                  {formatDate(quotation.issueDate) || 'Select from Calendar'}
                </div>
              </div>

              {/* Customer Delivery Address */}
              <div>
                <label className="text-sm font-medium text-gray-700">Customer Delivery Address:</label>
                <div className="mt-1 p-3 border border-gray-300 rounded min-h-[80px] bg-gray-50">
                  {quotation.shipToAddress?.address || 'Type & search'}
                </div>
              </div>

              {/* Service Details */}
              <div className="service-details grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Service Done Date:</label>
                  <div className="mt-1 p-2 bg-gray-100 border border-gray-300 rounded">
                    1-Apr-25
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Service Done HMR:</label>
                  <div className="mt-1 p-2 bg-gray-100 border border-gray-300 rounded">
                    5003
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subject Section */}
        <div className="subject-section p-6 border-b border-gray-300">
          <div className="subject-line">
            <h2 className="text-lg font-bold text-black">
              Sub: {quotation.subject || ''}
            </h2>
          </div>
          <div className="salutation mt-4">
            <p className="text-gray-800">
              Dear Sir, With reference to the subject D.G. set we are here by furnishing our offer for Spares
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="items-table p-6">
          <div className="table-container overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">Sr.No</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">Part No</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">Description</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">HSN Code</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">UOM</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">Qty</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">Basic Amount</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">Total Basic</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">Discount %</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">Final Basic</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">GST %age</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">GST Amount</th>
                  <th className="border border-gray-300 p-2 text-center text-sm font-medium">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Regular Items */}
                {quotation.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 text-center text-sm">{index + 1}</td>
                    <td className="border border-gray-300 p-2 text-sm">{item.partNo || '-'}</td>
                    <td className="border border-gray-300 p-2 text-sm">{item.description}</td>
                    <td className="border border-gray-300 p-2 text-sm">{item.hsnCode || item.hsnNumber || '-'}</td>
                    <td className="border border-gray-300 p-2 text-center text-sm">{item.uom}</td>
                    <td className="border border-gray-300 p-2 text-center text-sm">{item.quantity}</td>
                    <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </td>
                    <td className="border border-gray-300 p-2 text-center text-sm bg-yellow-100">
                      {item.discount}%
                    </td>
                    <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                      {formatCurrency(item.discountedAmount)}
                    </td>
                    <td className="border border-gray-300 p-2 text-center text-sm bg-yellow-100">
                      {item.taxRate}%
                    </td>
                    <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                      {formatCurrency(item.taxAmount)}
                    </td>
                    <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}

                {/* Service Charges */}
                {quotation.serviceCharges && quotation.serviceCharges.length > 0 && (
                  quotation.serviceCharges.map((service, index) => (
                    <tr key={`service-${index}`} className="bg-blue-50">
                      <td className="border border-gray-300 p-2 text-center text-sm">
                        {quotation.items.length + index + 1}
                      </td>
                      <td className="border border-gray-300 p-2 text-sm">-</td>
                      <td className="border border-gray-300 p-2 text-sm font-medium">
                        {service.description}
                      </td>
                      <td className="border border-gray-300 p-2 text-sm">{service.hsnNumber || '-'}</td>
                      <td className="border border-gray-300 p-2 text-center text-sm">{service.uom}</td>
                      <td className="border border-gray-300 p-2 text-center text-sm">{service.quantity}</td>
                      <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                        Manual Entry
                      </td>
                      <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                        {formatCurrency(service.unitPrice)}
                      </td>
                      <td className="border border-gray-300 p-2 text-center text-sm bg-yellow-100">
                        {service.discount}%
                      </td>
                      <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                        {formatCurrency(service.discountedAmount)}
                      </td>
                      <td className="border border-gray-300 p-2 text-center text-sm bg-yellow-100">
                        {service.taxRate}%
                      </td>
                      <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                        {formatCurrency(service.taxAmount)}
                      </td>
                      <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                        {formatCurrency(service.totalPrice)}
                      </td>
                    </tr>
                  ))
                )}

                {/* Battery Buy Back */}
                {quotation.batteryBuyBack && (
                  <tr className="bg-green-50">
                    <td className="border border-gray-300 p-2 text-center text-sm">
                      {quotation.items.length + (quotation.serviceCharges?.length || 0) + 1}
                    </td>
                    <td className="border border-gray-300 p-2 text-sm">-</td>
                    <td className="border border-gray-300 p-2 text-sm font-medium">
                      {quotation.batteryBuyBack.description}
                    </td>
                    <td className="border border-gray-300 p-2 text-sm">{quotation.batteryBuyBack.hsnNumber || '-'}</td>
                    <td className="border border-gray-300 p-2 text-center text-sm">{quotation.batteryBuyBack.uom}</td>
                    <td className="border border-gray-300 p-2 text-center text-sm">{quotation.batteryBuyBack.quantity}</td>
                    <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                      Manual Entry
                    </td>
                    <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                      {formatCurrency(quotation.batteryBuyBack.unitPrice)}
                    </td>
                    <td className="border border-gray-300 p-2 text-center text-sm bg-yellow-100">
                      {quotation.batteryBuyBack.discount}%
                    </td>
                    <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                      {formatCurrency(quotation.batteryBuyBack.discountedAmount)}
                    </td>
                    <td className="border border-gray-300 p-2 text-center text-sm bg-yellow-100">
                      {quotation.batteryBuyBack.taxRate}%
                    </td>
                    <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                      {formatCurrency(quotation.batteryBuyBack.taxAmount)}
                    </td>
                    <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                      {formatCurrency(quotation.batteryBuyBack.totalPrice)}
                    </td>
                  </tr>
                )}

                {/* Grand Total Row */}
                <tr className="bg-gray-200 font-bold">
                  <td colSpan={7} className="border border-gray-300 p-2 text-center text-sm">
                    Grand Total
                  </td>
                  <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                    {formatCurrency(subtotal)}
                  </td>
                  <td className="border border-gray-300 p-2 text-center text-sm bg-yellow-100">
                    -
                  </td>
                  <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                    {formatCurrency(totalDiscount)}
                  </td>
                  <td className="border border-gray-300 p-2 text-center text-sm bg-yellow-100">
                    -
                  </td>
                  <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                    {formatCurrency(totalTax)}
                  </td>
                  <td className="border border-gray-300 p-2 text-right text-sm bg-yellow-100">
                    {formatCurrency(grandTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="terms-section p-6 border-b border-gray-300">
          <h3 className="text-lg font-bold text-black mb-4">TERMS & CONDITIONS:-</h3>
          <div className="space-y-2">
            <div className="flex">
              <span className="font-medium mr-2">1.</span>
              <span>Payment Terms: 100% advance payment alongwith PO.</span>
            </div>
            <div className="flex">
              <span className="font-medium mr-2">2.</span>
              <span>Ordering and Payment: In Favour of Sun Power Services.</span>
            </div>
            <div className="flex">
              <span className="font-medium mr-2">3.</span>
              <span>Delivery: With in One Month after your P.O.</span>
            </div>
            <div className="flex">
              <span className="font-medium mr-2">4.</span>
              <span>Note: <span className="bg-yellow-100 p-1 rounded">Typing Option</span></span>
            </div>
            <div className="flex">
              <span className="font-medium mr-2">5.</span>
              <span>Quote Validity: <span className="bg-yellow-100 p-1 rounded">Select date from Calendar</span></span>
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <div className="footer-section p-6">
          {/* Closing Remarks */}
          <div className="closing-remarks mb-6">
            <p className="text-gray-800 leading-relaxed">
              Hope the above offer will meet your requirement and we will be expecting your valuable order at the earliest. 
              Thanking you and assuring you our best and prompt services at all time.
            </p>
          </div>

          {/* Bottom Section */}
          <div className="bottom-section flex justify-between items-start">
            {/* Left Side - Bank Details */}
            <div className="bank-details flex-1">
              <h4 className="font-bold text-black mb-2">Sun Power Bank Details: -</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p>Bank Name: {quotation.company?.bankDetails?.bankName || 'Sun Power Bank'}</p>
                <p>Account No: {quotation.company?.bankDetails?.accountNo || '1234567890'}</p>
                <p>IFSC Code: {quotation.company?.bankDetails?.ifsc || 'SUNP0001234'}</p>
                <p>Branch: {quotation.company?.bankDetails?.branch || 'Chennai Main Branch'}</p>
              </div>
            </div>

            {/* Center - QR Code & Signature */}
            <div className="qr-signature-section flex-1 flex justify-center">
              <div className="flex space-x-8">
                {/* QR Code */}
                <div className="qr-code-section text-center">
                  <div className="w-32 h-32 border-2 border-gray-300 bg-white flex items-center justify-center mb-2">
                    {quotation.qrCodeImage ? (
                      <img 
                        src={quotation.qrCodeImage as string} 
                        alt="QR Code" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">Scanner QR Code</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">Scanner QR Code</span>
                </div>

                {/* Signature */}
                <div className="signature-section text-center">
                  <div className="w-32 h-16 border-b-2 border-gray-400 mb-2"></div>
                  <span className="text-sm font-medium text-black">For Sun Power Services</span>
                  <div className="text-xs text-gray-600 mt-1">Authorised Signature</div>
                </div>
              </div>
            </div>

            {/* Right Side - Company Info */}
            <div className="company-info flex-1 text-right">
              <div className="text-sm text-gray-700 space-y-1">
                <p><strong>Add:</strong> {quotation.company?.address || 'Plot no 1, Phase 1, 4th Street, Annai velankani nagar, Madhananthapuram, porur, chennai 600116.'}</p>
                <p><strong>Mobile:</strong> {quotation.company?.phone || '+91 9176660123'}</p>
                <p><strong>GSTIN:</strong> {quotation.company?.pan || '33BLFPS9951M1ZC'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons - Only visible when not printing */}
      {!isPrintMode && (
        <div className="action-buttons mt-6 flex justify-center space-x-4">
          <button
            onClick={onPrint}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Printer className="w-5 h-5" />
            <span>Print Quotation</span>
          </button>
          <button
            onClick={onDownload}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Download className="w-5 h-5" />
            <span>Download PDF</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default QuotationView; 