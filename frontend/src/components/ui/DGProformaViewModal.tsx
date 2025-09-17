import React from 'react';
import { X, Download, Printer, FileText } from 'lucide-react';
import { Button } from './Botton';
import { printProforma } from '../../utils/printUtils';
import { useNavigate } from 'react-router-dom';

interface DGProformaViewModalProps {
  proforma: any;
  onClose: () => void;
}

const DGProformaViewModal: React.FC<DGProformaViewModalProps> = ({
  proforma,
  onClose
}) => {
  const navigate = useNavigate();
  
  if (!proforma) return null;

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
    printProforma(proforma);
  };

  const handleCreateInvoice = () => {
    // Prepare proforma data for auto-filling the invoice form
    const proformaData = {
      customer: proforma.customer?._id || proforma.customer || '',
      customerEmail: proforma.customer?.email || '',
      billingAddress: proforma.billingAddress,
      shippingAddress: proforma.shippingAddress,
      quotationNumber: typeof proforma.dgQuotationNumber === 'string' 
        ? proforma.dgQuotationNumber 
        : proforma.dgQuotationNumber?._id || '',
      poNumber: proforma.poNumber || '',
      poFromCustomer: typeof proforma.poFromCustomer === 'string' 
        ? proforma.poFromCustomer 
        : proforma.poFromCustomer?._id || '',
      dgEnquiry: typeof proforma.dgEnquiry === 'string' 
        ? proforma.dgEnquiry 
        : proforma.dgEnquiry?._id || '',
      items: proforma.items?.map((item: any) => ({
        product: typeof item.product === 'string' ? item.product : item.product?._id || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        uom: item.uom || 'nos',
        discount: item.discount || 0,
        discountedAmount: item.discountedAmount || 0,
        gstRate: item.gstRate || 18,
        gstAmount: item.gstAmount || 0,
        kva: item.kva || '',
        phase: item.phase || '',
        annexureRating: item.annexureRating || '',
        dgModel: item.dgModel || '',
        numberOfCylinders: item.numberOfCylinders || 0,
        subject: item.subject || '',
        isActive: item.isActive !== undefined ? item.isActive : true,
        hsnNumber: item.hsnNumber || ''
      })) || [],
      transportCharges: proforma.transportCharges || {
        amount: 0,
        quantity: 0,
        unitPrice: 0,
        hsnNumber: '',
        gstRate: 18,
        gstAmount: 0,
        totalAmount: 0
      },
      subtotal: proforma.subtotal || 0,
      totalDiscount: proforma.totalDiscount || 0,
      taxAmount: proforma.taxAmount || 0,
      totalAmount: proforma.totalAmount || 0,
      paymentTerms: proforma.paymentTerms || '',
      notes: proforma.notes || '',
      deliveryNotes: proforma.deliveryNotes || '',
      referenceNumber: proforma.referenceNumber || '',
      referenceDate: proforma.referenceDate || '',
      buyersOrderNumber: proforma.buyersOrderNumber || '',
      buyersOrderDate: proforma.buyersOrderDate || '',
      dispatchDocNo: proforma.dispatchDocNo || '',
      dispatchDocDate: proforma.dispatchDocDate || '',
      destination: proforma.destination || '',
      deliveryNoteDate: proforma.deliveryNoteDate || '',
      dispatchedThrough: proforma.dispatchedThrough || '',
      termsOfDelivery: proforma.termsOfDelivery || '',
      expectedDeliveryDate: proforma.expectedDeliveryDate || '',
      department: proforma.department || '',
      priority: proforma.priority || ''
    };

    // Navigate to create invoice page with proforma data
    navigate('/dg-sales/invoice/create', { 
      state: { 
        proformaData,
        fromProforma: true,
        proformaNumber: proforma.proformaNumber,
        proformaId: proforma._id // Pass the proforma ID for reference
      } 
    });
    
    // Close the modal
    onClose();
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
              variant="primary"
              size="sm"
              onClick={handleCreateInvoice}
              className="flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Create DG Invoice
            </Button>
            {proforma.proformaPdf && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(proforma.proformaPdf, '_blank')}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download PDF
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

        {/* Proforma Invoice Content */}
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
                    <p className="font-medium w-80">{proforma.shippingAddress?.address || 'N/A'}</p>
                    <p>{proforma.shippingAddress?.district || ''}</p>
                    <p>{proforma.shippingAddress?.state || ''} - {proforma.shippingAddress?.pincode || ''}</p>
                    <p>GSTIN/UIN: {proforma.shippingAddress?.gstNumber || 'N/A'}</p>
                    <p>State Name: {proforma.shippingAddress?.state || 'N/A'}, Code: 29</p>
                  </div>
                </div>

                {/* Buyer (Bill to) */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Buyer (Bill to)</h3>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p className="font-medium">{proforma.customer?.name || 'N/A'}</p>
                    <p className="w-80">{proforma.billingAddress?.address || 'N/A'}</p>
                    <p>{proforma.billingAddress?.district || ''}</p>
                    <p>{proforma.billingAddress?.state || ''} - {proforma.billingAddress?.pincode || ''}</p>
                    <p>GSTIN/UIN: {proforma.billingAddress?.gstNumber || 'N/A'}</p>
                    <p>State Name: {proforma.billingAddress?.state || 'N/A'}, Code: 33</p>
                    <p>Place of Supply: {proforma.billingAddress?.state || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="w-1/2">
              <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">PROFORMA INVOICE</h2>
              <table className="w-full border border-gray-300 text-sm">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Invoice No.:</td>
                    <td className="border border-gray-300 p-2">{proforma.proformaNumber || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Dated:</td>
                    <td className="border border-gray-300 p-2">{formatDate(proforma.proformaDate)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Delivery Note:</td>
                    <td className="border border-gray-300 p-2">{typeof proforma.deliveryNotes === 'string' ? proforma.deliveryNotes : ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Mode/Terms of Payment:</td>
                    <td className="border border-gray-300 p-2">{typeof proforma.paymentTerms === 'string' ? proforma.paymentTerms : ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Reference No. & Date:</td>
                    <td className="border border-gray-300 p-2">{typeof proforma.referenceNumber === 'string' && proforma.referenceNumber ? `${proforma.referenceNumber} ${formatDate(proforma.referenceDate)}` : ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Other References:</td>
                    <td className="border border-gray-300 p-2">{typeof proforma.dgQuotationNumber === 'object' ? proforma.dgQuotationNumber?.quotationNumber || '' : proforma.dgQuotationNumber || ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Buyer's Order No.:</td>
                    <td className="border border-gray-300 p-2">{typeof proforma.buyersOrderNumber === 'string' ? proforma.buyersOrderNumber : ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Dated:</td>
                    <td className="border border-gray-300 p-2">{formatDate(proforma.buyersOrderDate)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Dispatch Doc No.:</td>
                    <td className="border border-gray-300 p-2">{typeof proforma.dispatchDocNo === 'string' ? proforma.dispatchDocNo : ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Delivery Note Date:</td>
                    <td className="border border-gray-300 p-2">{formatDate(proforma.deliveryNoteDate)}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Dispatched through:</td>
                    <td className="border border-gray-300 p-2">{typeof proforma.dispatchedThrough === 'string' ? proforma.dispatchedThrough : ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Destination:</td>
                    <td className="border border-gray-300 p-2">{typeof proforma.destination === 'string' ? proforma.destination : ''}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-2 font-medium">Terms of Delivery:</td>
                    <td className="border border-gray-300 p-2">{typeof proforma.termsOfDelivery === 'string' ? proforma.termsOfDelivery : ''}</td>
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
                {proforma.items?.map((item: any, index: number) => (
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
                {proforma.transportCharges && proforma.transportCharges.unitPrice > 0 && (
                  <tr>
                    <td className="border border-gray-300 p-3">
                      <div className="font-medium">Transport Charges</div>
                    </td>
                    <td className="border border-gray-300 p-3 text-center">{proforma.transportCharges.hsnNumber || '998399'}</td>
                    <td className="border border-gray-300 p-3 text-center">{proforma.transportCharges.gstRate || 0} %</td>
                    <td className="border border-gray-300 p-3 text-center">{formatNumber(proforma.transportCharges.quantity || 0)} Nos.</td>
                    <td className="border border-gray-300 p-3 text-center">{formatNumber(proforma.transportCharges.unitPrice || 0)} Nos.</td>
                    <td className="border border-gray-300 p-3 text-center">0</td>
                    <td className="border border-gray-300 p-3 text-right font-bold">{formatNumber(proforma.transportCharges.amount || 0)}</td>
                  </tr>
                )}
                
                {/* Subtotal Row */}
                <tr>
                  <td className="border border-gray-300 p-3" colSpan={6}></td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">{formatNumber(proforma.subtotal || 0)}</td>
                </tr>
                
                {/* Tax Rows */}
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold" colSpan={6}>OUTPUT SGST</td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">{formatNumber((proforma.taxAmount || 0) / 2)}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold" colSpan={6}>OUTPUT CGST</td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">{formatNumber((proforma.taxAmount || 0) / 2)}</td>
                </tr>
                
                {/* Total Row */}
                <tr>
                  <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>Total</td>
                  <td className="border border-gray-300 p-3 text-center font-semibold">{proforma.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)} Nos.</td>
                  <td className="border border-gray-300 p-3" colSpan={2}></td>
                  <td className="border border-gray-300 p-3 text-right font-semibold">₹ {formatNumber(proforma.totalAmount || 0)} </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Amount in Words */}
          <div className="mb-8">
            <p className="text-sm font-medium">
              <span className="font-semibold">Amount Chargeable (in words):</span> Indian Rupees {numberToWords(Math.round(proforma.totalAmount || 0))}
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
                {proforma.items?.map((item: any, index: number) => {
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
                {proforma.transportCharges && proforma.transportCharges.unitPrice > 0 && (() => {
                  const transportTaxableValue = proforma.transportCharges.amount || 0;
                  const transportGstAmount = proforma.transportCharges.gstAmount || 0;
                  
                  return (
                    <tr>
                      <td className="border border-gray-300 p-3 text-center">{proforma.transportCharges.hsnNumber || '998399'}</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(transportTaxableValue)}</td>
                      <td className="border border-gray-300 p-3 text-center">{Math.round((proforma.transportCharges.gstRate || 0) / 2)}%</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(transportGstAmount / 2)}</td>
                      <td className="border border-gray-300 p-3 text-center">{Math.round((proforma.transportCharges.gstRate || 0) / 2)}%</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(transportGstAmount / 2)}</td>
                      <td className="border border-gray-300 p-3 text-center">{formatNumber(transportGstAmount)}</td>
                    </tr>
                  );
                })()}
                
                <tr className="font-semibold">
                  <td className="border border-gray-300 p-3 text-center">Total</td>
                  <td className="border border-gray-300 p-3 text-center">{formatNumber(proforma.subtotal || 0)}</td>
                  <td className="border border-gray-300 p-3 text-center"></td>
                  <td className="border border-gray-300 p-3 text-center">{formatNumber((proforma.taxAmount || 0) / 2)}</td>
                  <td className="border border-gray-300 p-3 text-center"></td>
                  <td className="border border-gray-300 p-3 text-center">{formatNumber((proforma.taxAmount || 0) / 2)}</td>
                  <td className="border border-gray-300 p-3 text-center">{formatNumber(proforma.taxAmount || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tax Amount in Words */}
          <div className="mb-8">
            <p className="text-sm font-medium">
              <span className="font-semibold">Tax Amount (in words):</span> Indian Rupees {numberToWords(Math.round(proforma.taxAmount || 0))}
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

export default DGProformaViewModal;
