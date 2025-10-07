import React from 'react';
import { Printer, Download } from 'lucide-react';
import { Button } from './Botton';

interface DGInvoicePrintViewProps {
  invoice: any; // Replace 'any' with actual DGInvoice interface
}

const DGInvoicePrintView: React.FC<DGInvoicePrintViewProps> = ({ invoice }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
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

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const numberToWords = (num: number):any => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    if (num === 0) return 'Zero';
    if (num < 0) return 'Negative ' + numberToWords(-num);

    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
    return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // This will be implemented later with PDF generation
    console.log('Download PDF:', invoice);
  };

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto">
      {/* Print Controls */}
      <div className="print:hidden mb-6 flex justify-end space-x-4">
        <Button onClick={handlePrint} variant="outline" className="flex items-center">
          <Printer className="h-4 w-4 mr-2" /> Print
        </Button>
        <Button onClick={handleDownloadPDF} variant="outline" className="flex items-center">
          <Download className="h-4 w-4 mr-2" /> Download PDF
        </Button>
      </div>

      {/* Invoice Header */}
      <div className="border-b-2 border-gray-800 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">INVOICE</h1>
            <p className="text-lg text-gray-600 mt-2">Invoice No: {invoice.invoiceNumber}</p>
            <p className="text-sm text-gray-500">Date: {formatDate(invoice.invoiceDate)}</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-gray-800">Sun Power Services</h2>
            <p className="text-sm text-gray-600 mt-2">
              {invoice.companyAddress?.address}<br />
              {invoice.companyAddress?.city}, {invoice.companyAddress?.state} - {invoice.companyAddress?.pincode}<br />
              Phone: {invoice.companyAddress?.phone}<br />
              Email: {invoice.companyAddress?.email}
            </p>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Bill To:</h3>
          <div className="text-sm text-gray-700">
            <p className="font-medium">{invoice.customer?.name}</p>
            <p>{invoice.customerAddress?.address}</p>
            <p>{invoice.customerAddress?.district}, {invoice.customerAddress?.state} - {invoice.customerAddress?.pincode}</p>
            <p>Phone: {invoice.customer?.phone}</p>
            <p>Email: {invoice.customer?.email}</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Ship To:</h3>
          <div className="text-sm text-gray-700">
            <p className="font-medium">{invoice.customer?.name}</p>
            <p>{invoice.shippingAddress?.address || invoice.customerAddress?.address}</p>
            <p>{invoice.shippingAddress?.district || invoice.customerAddress?.district}, {invoice.shippingAddress?.state || invoice.customerAddress?.state} - {invoice.shippingAddress?.pincode || invoice.customerAddress?.pincode}</p>
          </div>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
        <div>
          <p><span className="font-medium">Due Date:</span> {formatDate(invoice.dueDate)}</p>
        </div>
        <div>
          <p><span className="font-medium">Payment Terms:</span> {invoice.paymentTerms || 'Net 30'}</p>
        </div>
        <div>
          <p><span className="font-medium">Status:</span> {invoice.status}</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Product</th>
              <th className="border border-gray-300 px-4 py-2 text-left text-sm font-medium text-gray-700">Description</th>
              <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">Qty</th>
              <th className="border border-gray-300 px-4 py-2 text-center text-sm font-medium text-gray-700">UOM</th>
              <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-700">Unit Price</th>
              <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-700">Discount</th>
              <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-700">GST %</th>
              <th className="border border-gray-300 px-4 py-2 text-right text-sm font-medium text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item: any, index: number) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{item.product}</td>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">{item.description}</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-700">{item.quantity}</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-700">{item.uom}</td>
                <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{formatCurrency(item.unitPrice)}</td>
                <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{item.discount}%</td>
                <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{item.gstRate}%</td>
                <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{formatCurrency(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Additional Charges */}
      {(invoice.additionalCharges?.freight > 0 || invoice.additionalCharges?.insurance > 0 || invoice.additionalCharges?.packing > 0 || invoice.additionalCharges?.other > 0) && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Additional Charges</h3>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              {invoice.additionalCharges?.freight > 0 && (
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Freight</td>
                  <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{formatCurrency(invoice.additionalCharges.freight)}</td>
                </tr>
              )}
              {invoice.additionalCharges?.insurance > 0 && (
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Insurance</td>
                  <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{formatCurrency(invoice.additionalCharges.insurance)}</td>
                </tr>
              )}
              {invoice.additionalCharges?.packing > 0 && (
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Packing</td>
                  <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{formatCurrency(invoice.additionalCharges.packing)}</td>
                </tr>
              )}
              {invoice.additionalCharges?.other > 0 && (
                <tr>
                  <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Other</td>
                  <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{formatCurrency(invoice.additionalCharges.other)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Transport Charges */}
      {invoice.transportCharges && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Transport Charges</h3>
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 text-sm text-gray-700">Transport Charges</td>
                <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{formatCurrency(invoice.transportCharges.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-80">
          <table className="w-full border-collapse border border-gray-300">
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Subtotal</td>
                <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{formatCurrency(invoice.subtotal)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Total Discount</td>
                <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{formatCurrency(invoice.totalDiscount)}</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700">Tax Amount</td>
                <td className="border border-gray-300 px-4 py-2 text-right text-sm text-gray-700">{formatCurrency(invoice.taxAmount)}</td>
              </tr>
              <tr className="bg-gray-100">
                <td className="border border-gray-300 px-4 py-2 text-sm font-bold text-gray-800">Total Amount</td>
                <td className="border border-gray-300 px-4 py-2 text-right text-sm font-bold text-gray-800">{formatCurrency(invoice.totalAmount)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="mb-6">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Amount in Words:</span> {numberToWords(Math.floor(invoice.totalAmount))} Rupees Only
        </p>
      </div>

      {/* Payment Information */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Payment Information</h3>
          <div className="text-sm text-gray-700">
            <p><span className="font-medium">Payment Status:</span> {invoice.paymentStatus}</p>
            <p><span className="font-medium">Paid Amount:</span> {formatCurrency(invoice.paidAmount || 0)}</p>
            <p><span className="font-medium">Remaining Amount:</span> {formatCurrency(invoice.remainingAmount || 0)}</p>
            {invoice.paymentMethod && <p><span className="font-medium">Payment Method:</span> {invoice.paymentMethod}</p>}
            {invoice.paymentDate && <p><span className="font-medium">Payment Date:</span> {formatDate(invoice.paymentDate)}</p>}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Terms & Conditions</h3>
          <div className="text-sm text-gray-700">
            {invoice.notes && <p>{invoice.notes}</p>}
            {invoice.deliveryNotes && <p><span className="font-medium">Delivery Notes:</span> {invoice.deliveryNotes}</p>}
            {invoice.termsOfDelivery && <p><span className="font-medium">Terms of Delivery:</span> {invoice.termsOfDelivery}</p>}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-300 pt-6 mt-6">
        <div className="grid grid-cols-2 gap-8 text-sm text-gray-600">
          <div>
            <p className="font-medium text-gray-800">Thank you for your business!</p>
            <p className="mt-2">For any queries, please contact us at the above address.</p>
          </div>
          <div className="text-right">
            <p className="font-medium text-gray-800">Authorized Signature</p>
            <div className="mt-8 h-16 border-b border-gray-300"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DGInvoicePrintView;
