import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  Edit,
  Download,
  Mail,
  CreditCard,
  Calendar,
  FileText,
  User,
  Building,
  MapPin,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import { Badge } from '../components/ui/Badge';
import { apiClient } from '../utils/api';
import toast from 'react-hot-toast';

interface AMCInvoice {
  _id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  
  // Reference fields
  irn?: string;
  ackNo?: string;
  ackDate?: string;
  deliveryNote?: string;
  referenceNo?: string;
  referenceDate?: string;
  buyerOrderNo?: string;
  dispatchDocNo?: string;
  dispatchedThrough?: string;
  termsOfPayment?: string;
  otherReferences?: string;
  deliveryNoteDate?: string;
  destination?: string;
  termsOfDelivery?: string;
  
  // Customer and addresses
  customer: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
    pan?: string;
  };
  
  billToAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    gstNumber?: string;
    email?: string;
    phone?: string;
  };
  
  shipToAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    gstNumber?: string;
    email?: string;
    phone?: string;
  };
  
  // Company details
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    pan: string;
    gstin: string;
    stateName: string;
    stateCode: string;
  };
  
  // AMC specific
  amcType: 'AMC' | 'CAMC';
  sourceQuotation: {
    _id: string;
    quotationNumber: string;
    amcType: string;
  };
  quotationNumber: string;
  
  // Service charges
  serviceCharges: Array<{
    siNo: number;
    description: string;
    hsnSac: string;
    gstRate: number;
    quantity: number;
    rate: number;
    per: string;
    discountPercent: number;
    amount: number;
  }>;
  
  // Financial details
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
  amountInWords: string;
  
  // Tax summary
  taxSummary: Array<{
    hsnSac: string;
    taxableValue: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    igstRate: number;
    igstAmount: number;
    totalTaxAmount: number;
  }>;
  
  // Payment tracking
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  
  // Status
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  
  // Additional fields
  notes?: string;
  terms?: string;
  
  // Metadata
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

const AMCInvoiceView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<AMCInvoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await apiClient.amcInvoices.getById(id!);
      
      if (response.success) {
        setInvoice(response.data.invoice);
      } else {
        toast.error('Failed to fetch AMC invoice');
        navigate('/amc-invoices');
      }
    } catch (error) {
      console.error('Error fetching AMC invoice:', error);
      toast.error('Failed to fetch AMC invoice');
      navigate('/amc-invoices');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Implement PDF download functionality
    toast('PDF download feature coming soon');
  };

  const handleEmail = () => {
    // Implement email functionality
    toast('Email feature coming soon');
  };

  const handlePayment = () => {
    navigate(`/amc-invoices/${id}/payment`);
  };

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

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', icon: FileText },
      sent: { color: 'bg-blue-100 text-blue-800', icon: Mail },
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      overdue: { color: 'bg-red-100 text-red-800', icon: AlertTriangle },
      cancelled: { color: 'bg-gray-100 text-gray-800', icon: FileText }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      partial: { color: 'bg-orange-100 text-orange-800', icon: DollarSign },
      paid: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      overdue: { color: 'bg-red-100 text-red-800', icon: AlertTriangle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="ml-2 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h2>
          <p className="text-gray-600 mb-6">The requested AMC invoice could not be found.</p>
          <Button onClick={() => navigate('/amc-invoices')}>
            Back to AMC Invoices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 print:p-8 print:bg-white print:max-w-none print:mx-0">
      {/* Header - Hidden in print */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/amc-invoices')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AMC Invoice</h1>
            <p className="text-gray-600">{invoice.invoiceNumber}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate(`/amc-invoices/${id}/edit`)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </Button>
          <Button
            onClick={handlePayment}
            variant="outline"
            className="flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Record Payment
          </Button>
          <Button
            onClick={handleEmail}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Email
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </Button>
          <Button
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Status Badges - Hidden in print */}
      <div className="flex gap-4 mb-6 print:hidden">
        {getStatusBadge(invoice.status)}
        {getPaymentStatusBadge(invoice.paymentStatus)}
      </div>

      {/* Invoice Content */}
      <div className="bg-white border border-gray-300 shadow-lg print:shadow-none print:border-none">
        {/* Header with Logos */}
        <div className="flex justify-between items-center p-6 pb-4 border-b-2 border-red-300 print:mb-6">
          <div className="flex items-center">
            <div className="text-red-600 font-bold text-3xl print:text-2xl">powerol</div>
            <div className="text-gray-600 text-sm ml-3 print:text-xs">by Mahindra</div>
          </div>
          <div className="flex items-center">
            <div className="text-red-600 font-semibold text-xl print:text-lg">Sun Power Services</div>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 print:text-xl">TAX INVOICE</h1>
        </div>

        {/* Invoice Details */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-6">
            {/* Left Column - Invoice Details */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Invoice No.:</span>
                  <div className="mt-1">{invoice.invoiceNumber}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Dated:</span>
                  <div className="mt-1">{formatDate(invoice.issueDate)}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Delivery Note:</span>
                  <div className="mt-1">{invoice.deliveryNote || 'N/A'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Mode/Terms of Payment:</span>
                  <div className="mt-1">{invoice.termsOfPayment || 'N/A'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Reference No. & Date.:</span>
                  <div className="mt-1">{invoice.referenceNo || 'N/A'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Other References:</span>
                  <div className="mt-1">{invoice.otherReferences || 'N/A'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Buyer's Order No.:</span>
                  <div className="mt-1">{invoice.buyerOrderNo || 'N/A'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Dated:</span>
                  <div className="mt-1">{invoice.referenceDate ? formatDate(invoice.referenceDate) : 'N/A'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Dispatch Doc No.:</span>
                  <div className="mt-1">{invoice.dispatchDocNo || 'N/A'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Delivery Note Date:</span>
                  <div className="mt-1">{invoice.deliveryNoteDate ? formatDate(invoice.deliveryNoteDate) : 'N/A'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Dispatched through:</span>
                  <div className="mt-1">{invoice.dispatchedThrough || 'N/A'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Destination:</span>
                  <div className="mt-1">{invoice.destination || 'N/A'}</div>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Terms of Delivery:</span>
                  <div className="mt-1">{invoice.termsOfDelivery || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Right Column - Company Details */}
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Sun Power Services</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>{invoice.company.address}</div>
                  <div>Contact Numbers: {invoice.company.phone}</div>
                  <div>GSTIN/UIN: {invoice.company.gstin}</div>
                  <div>State Name: {invoice.company.stateName}, Code: {invoice.company.stateCode}</div>
                  <div>E-Mail: {invoice.company.email}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-6">
            {/* Bill To Address */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Buyer (Bill to):</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="font-medium">{invoice.customer.name}</div>
                <div>{invoice.billToAddress.address}</div>
                <div>{invoice.billToAddress.district}, {invoice.billToAddress.state} - {invoice.billToAddress.pincode}</div>
                {invoice.billToAddress.gstNumber && <div>GSTIN/UIN: {invoice.billToAddress.gstNumber}</div>}
                <div>State Name: {invoice.billToAddress.state}</div>
                <div>Place of Supply: {invoice.billToAddress.state}</div>
              </div>
            </div>

            {/* Ship To Address */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Consignee (Ship to):</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <div className="font-medium">{invoice.customer.name}</div>
                <div>{invoice.shipToAddress.address}</div>
                <div>{invoice.shipToAddress.district}, {invoice.shipToAddress.state} - {invoice.shipToAddress.pincode}</div>
                {invoice.shipToAddress.gstNumber && <div>GSTIN/UIN: {invoice.shipToAddress.gstNumber}</div>}
                <div>State Name: {invoice.shipToAddress.state}</div>
              </div>
            </div>
          </div>

          {/* Service Details Table */}
          <div className="mt-8">
            <h3 className="font-semibold text-gray-900 mb-4">Service Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SI No.</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description of Services</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">HSN/SAC</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST Rate</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">per</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Disc. %</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.serviceCharges.map((service, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{service.siNo}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{service.description}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{service.hsnSac}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{service.gstRate}%</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{service.quantity}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(service.rate)}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{service.per}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{service.discountPercent}%</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(service.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={8} className="border border-gray-300 px-3 py-2 text-right">Total:</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(invoice.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="mt-2 text-xs text-gray-600">E. & O.E</div>
          </div>

          {/* Amount in Words */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-300">
            <div className="text-sm">
              <span className="font-medium">Amount Chargeable (in words):</span>
              <div className="mt-1 font-medium">{invoice.amountInWords}</div>
            </div>
          </div>

          {/* Tax Summary */}
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Tax Summary</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">HSN/SAC</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Taxable Value</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">CGST</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">SGST/UTGST</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Tax Amount</th>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500"></th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500"></th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500">Rate Amount</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500">Rate Amount</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.taxSummary.map((tax, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{tax.hsnSac}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(tax.taxableValue)}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        {tax.cgstRate}% {formatCurrency(tax.cgstAmount)}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">
                        {tax.sgstRate}% {formatCurrency(tax.sgstAmount)}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(tax.totalTaxAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="border border-gray-300 px-3 py-2 text-sm">Total</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(invoice.subtotal)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(invoice.cgst)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(invoice.sgst)}</td>
                    <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(invoice.totalTax)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Tax Amount in Words */}
          <div className="mt-4 p-4 bg-gray-50 border border-gray-300">
            <div className="text-sm">
              <span className="font-medium">Tax Amount (in words):</span>
              <div className="mt-1 font-medium">Indian Rupees {numberToWords(invoice.totalTax)} Only</div>
            </div>
          </div>

          {/* Company Details */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Company's PAN:</h3>
              <div className="text-sm text-gray-700">{invoice.company.pan}</div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Company's Bank Details:</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <div>Bank Name: Hdfc Bank A/c No:50200051862959</div>
                <div>A/c No.: 50200051862959</div>
                <div>Branch & IFS Code: Moulivakkam & HDFC0005281</div>
              </div>
            </div>
          </div>

          {/* Declaration */}
          <div className="mt-8 p-4 border border-gray-300">
            <div className="text-sm">
              <div className="font-medium mb-2">Declaration:</div>
              <div className="mb-4">
                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <div className="font-medium">For: Sun Power Services</div>
                </div>
                <div className="text-center">
                  <div className="font-medium mb-8">Authorised Signatory</div>
                  <div className="border-t border-gray-300 w-32"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to convert numbers to words
const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  if (num === 0) return 'Zero';
  
  const convertHundreds = (n: number): string => {
    let result = '';
    
    if (n >= 100) {
      result += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    
    if (n >= 20) {
      result += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    } else if (n >= 10) {
      result += teens[n - 10] + ' ';
      n = 0;
    }
    
    if (n > 0) {
      result += ones[n] + ' ';
    }
    
    return result;
  };
  
  let result = '';
  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const hundreds = num % 1000;
  
  if (crores > 0) {
    result += convertHundreds(crores) + 'Crore ';
  }
  if (lakhs > 0) {
    result += convertHundreds(lakhs) + 'Lakh ';
  }
  if (thousands > 0) {
    result += convertHundreds(thousands) + 'Thousand ';
  }
  if (hundreds > 0) {
    result += convertHundreds(hundreds);
  }
  
  return result.trim();
};

export default AMCInvoiceView;
