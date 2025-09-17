import React, { useState, useEffect } from 'react';
import { X, Download, Printer, RefreshCw } from 'lucide-react';
import { Button } from './Botton';
import { printInvoice } from '../../utils/printUtils';
import { apiClient } from '../../utils/api';
import { generateDGInvoicePDF } from '../../utils/dgInvoicePdf';

interface DGInvoiceViewModalProps {
  invoice: any;
  onClose: () => void;
}

const DGInvoiceViewModal: React.FC<DGInvoiceViewModalProps> = ({
  invoice,
  onClose
}) => {
    console.log("invoice1111:",invoice);
    
  // Payment history state
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
    
  if (!invoice) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
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
    // Simple number to words conversion for Indian currency
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    
    if (num === 0) return 'Zero';
    
    const lakhs = Math.floor(num / 100000);
    const thousands = Math.floor((num % 100000) / 1000);
    const hundreds = Math.floor((num % 1000) / 100);
    const tensAndOnes = num % 100;
    
    let result = '';
    
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

  const handlePrint = () => {
    printInvoice(invoice);
  };

  const handleDownloadPDF = () => {
    generateDGInvoicePDF(invoice);
  };

  // Fetch payment history for DG invoice
  const fetchDGInvoicePaymentHistory = async (invoiceId: string) => {
    try {
      setLoadingPayments(true);
      const response = await apiClient.dgInvoicePayments.getByInvoice(invoiceId);
      console.log('DG Invoice Payment History Response:', response);
      if (response.success) {
        // Handle different possible response structures
        let payments = [];
        if (Array.isArray(response.data)) {
          payments = response.data;
        } else if (response.data?.payments && Array.isArray(response.data.payments)) {
          payments = response.data.payments;
        } else if ((response.data as any)?.data && Array.isArray((response.data as any).data)) {
          payments = (response.data as any).data;
        }
        console.log('Processed payments:', payments);
        setPaymentHistory(payments);
      } else {
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Error fetching DG invoice payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Helper function to get payment method label
  const getPaymentMethodLabel = (value: string) => {
    const options = [
      { value: '', label: 'Select payment method' },
      { value: 'cash', label: 'Cash' },
      { value: 'bank_transfer', label: 'Bank Transfer' },
      { value: 'cheque', label: 'Cheque' },
      { value: 'upi', label: 'UPI' },
      { value: 'credit_card', label: 'Credit Card' },
      { value: 'debit_card', label: 'Debit Card' },
      { value: 'online', label: 'Online Payment' },
      { value: 'other', label: 'Other' }
    ];
    return options.find(option => option.value === value)?.label || value;
  };

  // Helper function to render payment method details
  const renderPaymentMethodDetails = (method: string, details: any) => {
    if (!details || Object.keys(details).length === 0) return null;

    switch (method) {
      case 'bank_transfer':
        return (
          <>
            {details.bankName && <div><span className="font-medium">Bank:</span> {details.bankName}</div>}
            {details.accountNumber && <div><span className="font-medium">Account:</span> {details.accountNumber}</div>}
            {details.transactionId && <div><span className="font-medium">Transaction ID:</span> {details.transactionId}</div>}
          </>
        );
      case 'cheque':
        return (
          <>
            {details.chequeNumber && <div><span className="font-medium">Cheque No:</span> {details.chequeNumber}</div>}
            {details.bankName && <div><span className="font-medium">Bank:</span> {details.bankName}</div>}
            {details.chequeDate && <div><span className="font-medium">Date:</span> {formatDate(details.chequeDate)}</div>}
          </>
        );
      case 'upi':
        return (
          <>
            {details.upiId && <div><span className="font-medium">UPI ID:</span> {details.upiId}</div>}
            {details.transactionId && <div><span className="font-medium">Transaction ID:</span> {details.transactionId}</div>}
          </>
        );
      case 'credit_card':
      case 'debit_card':
        return (
          <>
            {details.cardLastFour && <div><span className="font-medium">Card:</span> ****{details.cardLastFour}</div>}
            {details.transactionId && <div><span className="font-medium">Transaction ID:</span> {details.transactionId}</div>}
          </>
        );
      default:
        return Object.entries(details).map(([key, value]) => (
          <div key={key}><span className="font-medium">{key}:</span> {String(value)}</div>
        ));
    }
  };

  // Fetch payment history when component mounts
  useEffect(() => {
    if (invoice?._id) {
      fetchDGInvoicePaymentHistory(invoice._id);
    }
  }, [invoice?._id]);

  // Helper function to handle PDF generation for DG invoice payments
  const handleGeneratePaymentPDF = async (paymentId: string) => {
    try {
      const response = await apiClient.dgInvoicePayments.downloadReceipt(paymentId);

      // Create blob URL and trigger download
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dg-invoice-payment-receipt-${paymentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating payment PDF:', error);
    }
  };

  // Helper function to render payment history
  const renderPaymentHistory = () => {
    if (loadingPayments) {
      return (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading payment history...</span>
        </div>
      );
    }

    // Ensure paymentHistory is always an array
    const payments = Array.isArray(paymentHistory) ? paymentHistory : [];

    if (payments.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No payment records found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {payments.map((payment, index) => (
          <div key={payment._id || index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${payment.paymentStatus === 'completed' ? 'bg-green-500' :
                    payment.paymentStatus === 'pending' ? 'bg-yellow-500' :
                      payment.paymentStatus === 'failed' ? 'bg-red-500' :
                        'bg-gray-500'
                  }`}></div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {getPaymentMethodLabel(payment.paymentMethod)} Payment
                  </h4>
                  <p className="text-xs text-gray-500">
                    {formatDate(payment.paymentDate)} • {payment.paymentStatus}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(payment.amount)}
                  </p>
                  {payment.receiptNumber && (
                    <p className="text-xs text-gray-500">Receipt: {payment.receiptNumber}</p>
                  )}
                </div>
                <button
                  onClick={() => handleGeneratePaymentPDF(payment._id)}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                  title="Generate PDF Receipt"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Payment Method Details */}
            {payment.paymentMethodDetails && Object.keys(payment.paymentMethodDetails).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {renderPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails)}
                </div>
              </div>
            )}

            {/* Payment Notes */}
            {payment.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Notes:</span> {payment.notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        {/* Action Buttons */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            {invoice.invoicePdf && (
            <Button
              variant="outline"
                size="sm"
                onClick={() => window.open(invoice.invoicePdf, '_blank')}
                className="flex items-center gap-2"
            >
                <Download className="w-4 h-4" />
                View Original PDF
            </Button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Close
          </Button>
        </div>

        {/* Invoice Content */}
        <div className="p-8 bg-white">
          {/* Header Section */}
            <div className="flex justify-between items-start mb-8">
            {/* Company Info */}
            <div className="w-1/2">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Sun Power Services</h1>
              <div className="text-sm text-gray-700 space-y-1">
                <p>D No.53, Plot No.4, 4th Street, Phase-1 Extension,</p>
                <p>Annai Velankanni Nagar, Madhananthapuram, Porur,</p>
                <p>Chennai - 600116</p>
                <p className="mt-2">Contact: 044-24828218, 9176660123</p>
                <p>GSTIN/UIN: 33BLFPS9951M1ZC</p>
                <p>State Name: Tamil Nadu, Code: 33</p>
                <p>E-Mail: sunpowerservices@gmail.com</p>
              </div>
              <div className="mb-8 space-y-6 mt-8">
                {/* Consignee (Ship to) */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Consignee (Ship to)</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p className="font-medium w-80">{invoice.shippingAddress?.address || 'N/A'}</p>
                    <p>{invoice.shippingAddress?.district || ''}</p>
                    <p>{invoice.shippingAddress?.state || ''} - {invoice.shippingAddress?.pincode || ''}</p>
                    <p>GSTIN/UIN: {invoice.shippingAddress?.gstNumber || 'N/A'}</p>
                    <p>State Name: {invoice.shippingAddress?.state || 'N/A'}, Code: 29</p>
                  </div>
                </div>

                {/* Buyer (Bill to) */}
              <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Buyer (Bill to)</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p className="font-medium">{invoice.customer?.name || 'N/A'}</p>
                    <p className="w-80">{invoice.billingAddress?.address || 'N/A'}</p>
                    <p>{invoice.billingAddress?.district || ''}</p>
                    <p>{invoice.billingAddress?.state || ''} - {invoice.billingAddress?.pincode || ''}</p>
                    <p>GSTIN/UIN: {invoice.billingAddress?.gstNumber || 'N/A'}</p>
                    <p>State Name: {invoice.billingAddress?.state || 'N/A'}, Code: 33</p>
                    <p>Place of Supply: {invoice.billingAddress?.state || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="w-1/2">
                <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">INVOICE</h2>
                <table className="w-full border border-gray-300 text-sm">
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">Invoice No.:</td>
                      <td className="border border-gray-300 p-2">{invoice.invoiceNumber || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">Dated:</td>
                      <td className="border border-gray-300 p-2">{formatDate(invoice.invoiceDate)}</td>
                    </tr>
                    <tr>
                    <td className="border border-gray-300 p-2 font-medium">Delivery Note:</td>
                    <td className="border border-gray-300 p-2">{typeof invoice.deliveryNotes === 'string' ? invoice.deliveryNotes : ''}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">Mode/Terms of Payment:</td>
                    <td className="border border-gray-300 p-2">{typeof invoice.paymentTerms === 'string' ? invoice.paymentTerms : ''}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">Reference No. & Date:</td>
                    <td className="border border-gray-300 p-2">{typeof invoice.referenceNumber === 'string' && invoice.referenceNumber ? `${invoice.referenceNumber} ${formatDate(invoice.referenceDate)}` : ''}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">Other References(Quotation):</td>
                      <td className="border border-gray-300 p-2">{typeof invoice.dgQuotationNumber === 'object' ? invoice.dgQuotationNumber?.quotationNumber || '' : invoice.dgQuotationNumber || ''}</td>
                    </tr>
                    {invoice.proformaReference && (
                      <tr>
                        <td className="border border-gray-300 p-2 font-medium">Created from Proforma:</td>
                        <td className="border border-gray-300 p-2 text-blue-600 font-medium">{typeof invoice.proformaReference === 'object' ? invoice.proformaReference?.proformaNumber || invoice.proformaReference?._id || '' : invoice.proformaReference}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">IRN:</td>
                      <td className="border border-gray-300 p-2">{invoice.irn || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">ACK Number:</td>
                      <td className="border border-gray-300 p-2">{invoice.ackNumber || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-300 p-2 font-medium">ACK Date:</td>
                      <td className="border border-gray-300 p-2">{formatDate(invoice.ackDate)}</td>
                    </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Buyer's Order No.:</td>
                    <td className="border border-gray-300 p-2">{typeof invoice.buyersOrderNumber === 'string' ? invoice.buyersOrderNumber : ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Dated:</td>
                    <td className="border border-gray-300 p-2">{formatDate(invoice.buyersOrderDate)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Dispatch Doc No.:</td>
                    <td className="border border-gray-300 p-2">{typeof invoice.dispatchDocNo === 'string' ? invoice.dispatchDocNo : ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Delivery Note Date:</td>
                    <td className="border border-gray-300 p-2">{formatDate(invoice.deliveryNoteDate)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Dispatched through:</td>
                    <td className="border border-gray-300 p-2">{typeof invoice.dispatchedThrough === 'string' ? invoice.dispatchedThrough : ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Destination:</td>
                    <td className="border border-gray-300 p-2">{typeof invoice.destination === 'string' ? invoice.destination : ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Terms of Delivery:</td>
                    <td className="border border-gray-300 p-2">{typeof invoice.termsOfDelivery === 'string' ? invoice.termsOfDelivery : ''}</td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-8">
            <table className="w-full border border-gray-300">
                <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-left font-semibold">Description of Goods and Services</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">HSN/SAC</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">GST Rate</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Quantity</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Rate per</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Disc. %</th>
                  <th className="border border-gray-300 p-3 text-right font-semibold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                {invoice.items?.map((item: any, index: number) => (
                    <tr key={index}>
                    <td className="border border-gray-300 p-3">
                      <div className="font-medium">{item.kva} KVA Mahindra Powerol Diesel Genset</div>
                      <div className="text-sm text-gray-600">(Including of Transport & Unloading Charges)</div>
                      </td>
                    <td className="border border-gray-300 p-3 text-center">{item.hsnNumber || '85021100'}</td>
                    <td className="border border-gray-300 p-3 text-center">{item.gstRate || 0} %</td>
                    <td className="border border-gray-300 p-3 text-center">{formatNumber(item.quantity || 0)} Nos.</td>
                    <td className="border border-gray-300 p-3 text-center">{formatNumber(item.unitPrice || 0)} Nos.</td>
                    <td className="border border-gray-300 p-3 text-center">{item.discount || 0}</td>
                    <td className="border border-gray-300 p-3 text-right font-bold">{formatNumber(item.totalPrice || 0)}</td>
                    </tr>
                  ))}
                
                {/* Transport Charges Row */}
                {invoice.transportCharges && invoice.transportCharges.unitPrice > 0 && (
                  <tr>
                    <td className="border border-gray-300 p-3">
                      <div className="font-medium">Transport Charges</div>
                    </td>
                    <td className="border border-gray-300 p-3 text-center">{invoice.transportCharges.hsnNumber || '998399'}</td>
                    <td className="border border-gray-300 p-3 text-center">{invoice.transportCharges.gstRate || 0} %</td>
                    <td className="border border-gray-300 p-3 text-center">{formatNumber(invoice.transportCharges.quantity || 0)} Nos.</td>
                    <td className="border border-gray-300 p-3 text-center">{formatNumber(invoice.transportCharges.unitPrice || 0)} Nos.</td>
                    <td className="border border-gray-300 p-3 text-center">0</td>
                    <td className="border border-gray-300 p-3 text-right font-bold">{formatNumber(invoice.transportCharges.amount || 0)}</td>
                  </tr>
                )}
                
                {/* Subtotal Row */}
                <tr>
                  <td className="border border-gray-300 p-3" colSpan={6}></td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">{formatNumber(invoice.subtotal || 0)}</td>
                </tr>
                
                {/* Tax Rows */}
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold" colSpan={6}>OUTPUT SGST</td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">{formatNumber((invoice.taxAmount || 0) / 2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold" colSpan={6}>OUTPUT CGST</td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">{formatNumber((invoice.taxAmount || 0) / 2)}</td>
                </tr>
                
                {/* Total Row */}
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>Total</td>
                  <td className="border border-gray-300 p-3 text-center font-semibold">{invoice.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)} Nos.</td>
                  <td className="border border-gray-300 p-3" colSpan={2}></td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">₹ {formatNumber(invoice.totalAmount || 0)} </td>
                </tr>
                </tbody>
              </table>
            </div>

          {/* Amount in Words */}
          <div className="mb-8">
            <p className="text-sm font-medium">
              <span className="font-semibold">Amount Chargeable (in words):</span> Indian Rupees {numberToWords(Math.round(invoice.totalAmount || 0))}
            </p>
          </div>

          {/* Tax Details Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tax Details (HSN/SAC wise)</h3>
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-center font-semibold">HSN/SAC</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Taxable Value</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold" colSpan={2}>CGST</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold" colSpan={2}>SGST/UTGST</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Total Tax Amount</th>
                </tr>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-3 text-center font-semibold"></th>
                  <th className="border border-gray-300 p-3 text-center font-semibold"></th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Rate</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Amount</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Rate</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold">Amount</th>
                  <th className="border border-gray-300 p-3 text-center font-semibold"></th>
                </tr>
              </thead>
                  <tbody>
                {invoice.items?.map((item: any, index: number) => {
                  // Calculate taxable value after discount
                  const itemSubtotal = (item.quantity || 0) * (item.unitPrice || 0);
                  const discountAmount = (itemSubtotal * (item.discount || 0)) / 100;
                  const taxableValue = itemSubtotal - discountAmount;
                  const gstAmount = (taxableValue * (item.gstRate || 0)) / 100;
                  
                  return (
                    <tr key={index}>
                      <td className="border border-gray-300 p-3 text-center">{item.hsnNumber || '85021100'}</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(taxableValue)}</td>
                      <td className="border border-gray-300 p-3 text-center">{Math.round((item.gstRate || 0) / 2)}%</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(gstAmount / 2)}</td>
                      <td className="border border-gray-300 p-3 text-center">{Math.round((item.gstRate || 0) / 2)}%</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(gstAmount / 2)}</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(gstAmount)}</td>
                    </tr>
                  );
                })}
                
                {/* Transport Charges Tax Row */}
                {invoice.transportCharges && invoice.transportCharges.unitPrice > 0 && (() => {
                  const transportTaxableValue = invoice.transportCharges.amount || 0;
                  const transportGstAmount = invoice.transportCharges.gstAmount || 0;
                  
                  return (
                    <tr>
                      <td className="border border-gray-300 p-3 text-center">{invoice.transportCharges.hsnNumber || '998399'}</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(transportTaxableValue)}</td>
                      <td className="border border-gray-300 p-3 text-center">{Math.round((invoice.transportCharges.gstRate || 0) / 2)}%</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(transportGstAmount / 2)}</td>
                      <td className="border border-gray-300 p-3 text-center">{Math.round((invoice.transportCharges.gstRate || 0) / 2)}%</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(transportGstAmount / 2)}</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(transportGstAmount)}</td>
                    </tr>
                  );
                })()}
                
                <tr className="font-semibold">
                  <td className="border border-gray-300 p-3 text-center">Total</td>
                  <td className="border border-gray-300 p-3 text-center">{formatNumber(invoice.subtotal || 0)}</td>
                  <td className="border border-gray-300 p-3 text-center"></td>
                  <td className="border border-gray-300 p-3 text-center">{formatNumber((invoice.taxAmount || 0) / 2)}</td>
                  <td className="border border-gray-300 p-3 text-center"></td>
                  <td className="border border-gray-300 p-3 text-center">{formatNumber((invoice.taxAmount || 0) / 2)}</td>
                  <td className="border border-gray-300 p-3 text-center">{formatNumber(invoice.taxAmount || 0)}</td>
                    </tr>
                  </tbody>
                </table>
            </div>

          {/* Tax Amount in Words */}
            <div className="mb-8">
            <p className="text-sm font-medium">
              <span className="font-semibold">Tax Amount (in words):</span> Indian Rupees {numberToWords(Math.round(invoice.taxAmount || 0))}
              </p>
            </div>

          {/* Bank Details */}
              <div className="mb-8">
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Company's PAN:</span> BLFPS9951M</p>
              <p><span className="font-medium">Company's Bank Details:</span></p>
              <p><span className="font-medium">Bank Name:</span> Hdfc Bank A/c No:50200051862959</p>
              <p><span className="font-medium">A/c No.:</span> 50200051862959</p>
              <p><span className="font-medium">Branch & IFS Code:</span> Moulivakkam & HDFC0005281</p>
                </div>
              </div>

          {/* Declaration */}
              <div className="mb-8">
            <p className="text-sm italic">
              "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."
            </p>
              </div>

            {/* QR Code Section */}
            {invoice.qrCodeInvoice && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">QR Code</h3>
                <div className="flex justify-center">
                  <div className="border border-gray-300 p-4 rounded-lg">
                    <img 
                      src={invoice.qrCodeInvoice} 
                      alt="QR Code Invoice" 
                      className="max-w-xs max-h-xs"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Payment History */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                <button
                  onClick={() => fetchDGInvoicePaymentHistory(invoice._id)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  disabled={loadingPayments}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingPayments ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                {renderPaymentHistory()}
              </div>
            </div>

            {/* Footer */}
          <div className="flex justify-between items-end">
            <div className="text-sm">
              <p className="font-medium">for Sun Power Services</p>
              <p className="mt-8">Authorised Signatory</p>
                </div>
            <div className="text-xs text-gray-500">
              <p>This is a Computer Generated Invoice</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DGInvoiceViewModal;