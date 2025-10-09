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
  AlertTriangle,
  IndianRupee
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import { Badge } from '../components/ui/Badge';
import { apiClient } from '../utils/api';
import toast from 'react-hot-toast';
import { printAMCInvoice } from '../utils/printUtils';

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

interface PaymentRecord {
  _id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'cheque' | 'bank_transfer' | 'upi' | 'card' | 'other';
  paymentStatus: 'pending' | 'completed' | 'failed' | 'cancelled';
  receiptNumber?: string;
  notes?: string;
  paymentMethodDetails?: {
    cash?: {
      receivedBy?: string;
      receiptNumber?: string;
    };
    cheque?: {
      chequeNumber?: string;
      bankName?: string;
      issueDate?: string;
    };
    bankTransfer?: {
      transactionId?: string;
      bankName?: string;
      transferDate?: string;
    };
    upi?: {
      upiId?: string;
      transactionId?: string;
    };
    card?: {
      cardType?: string;
      transactionId?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

const AMCInvoiceView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<AMCInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState(false);

  useEffect(() => {
    if (id) {
      fetchInvoice();
      fetchPaymentHistory();
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

  const fetchPaymentHistory = async () => {
    if (!id) return;
    
    try {
      setLoadingPaymentHistory(true);
      const response = await apiClient.amcInvoicePayments.getPaymentsByInvoice(id);
      
      if (response.success) {
        setPaymentHistory(response.data.payments || []);
      } else {
        console.error('Failed to fetch payment history');
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoadingPaymentHistory(false);
    }
  };

  const handlePrint = () => {
    if (!invoice) return;

    // Map current invoice shape to printAMCInvoice expected structure
    const mapped = {
      // Header/meta
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.issueDate,
      irn: (invoice as any).irn,
      ackNumber: (invoice as any).ackNo,
      ackDate: (invoice as any).ackDate,
      deliveryNotes: (invoice as any).deliveryNote,
      referenceNumber: (invoice as any).referenceNo,
      referenceDate: (invoice as any).referenceDate,
      buyersOrderNumber: (invoice as any).buyerOrderNo,
      dispatchDocNo: (invoice as any).dispatchDocNo,
      dispatchedThrough: (invoice as any).dispatchedThrough,
      termsOfPayment: (invoice as any).termsOfPayment,
      otherReferences: (invoice as any).otherReferences,
      deliveryNoteDate: (invoice as any).deliveryNoteDate,
      destination: (invoice as any).destination,
      termsOfDelivery: (invoice as any).termsOfDelivery,

      // Addresses
      billingAddress: invoice.billToAddress,
      shippingAddress: invoice.shipToAddress,
      customer: { name: invoice.customer?.name },

      // Items: prefer serviceCharges, else derive from offerItems
      serviceCharges: (
        (invoice as any).serviceCharges && Array.isArray((invoice as any).serviceCharges)
          ? (invoice as any).serviceCharges.map((sc: any) => ({
              description: sc.description,
              hsnNumber: sc.hsnSac,
              taxRate: sc.gstRate,
              quantity: sc.quantity,
              unitPrice: sc.rate,
              uom: sc.per,
              discount: sc.discountPercent,
            }))
          : Array.isArray((invoice as any).offerItems)
          ? (invoice as any).offerItems.map((it: any) => {
              const qty = Number(it.qty || 0);
              const rate = Number(it.amcCostPerDG || 0);
              const base = qty * rate || 0;
              const gstAmount = Number(it.gst18 ?? 0);
              const inferredRate = base > 0 ? Math.round((gstAmount / base) * 100) : (invoice.totalTax && invoice.subtotal ? Math.round((invoice.totalTax / invoice.subtotal) * 100) : 0);
              return {
                description: `AMC Service - ${[it.make, it.engineSlNo, it.dgRatingKVA ? `(${it.dgRatingKVA} KVA)` : ''].filter(Boolean).join(' ')}`,
                hsnNumber: it.hsnCode,
                taxRate: inferredRate,
                quantity: qty,
                unitPrice: rate,
                uom: it.uom || 'nos',
                discount: 0,
              };
            })
          : []
      ),

      // Totals
      totalAmount: invoice.grandTotal,

      // Company/bank
      companyPan: invoice.company?.pan,
      bankAccount: undefined,
      branch: undefined,
    } as any;

    printAMCInvoice(mapped);
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

  // Generate PDF for AMC invoice payment
  const handleGeneratePaymentPDF = async (paymentId: string) => {
    try {
      const response = await apiClient.amcInvoicePayments.generateReceipt(paymentId);

      // Create blob URL and trigger download
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `amc-invoice-payment-receipt-${paymentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('PDF receipt generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
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
      partial: { color: 'bg-orange-100 text-orange-800', icon: IndianRupee },
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

  // Helper function to get payment method label
  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'cheque': return 'Cheque';
      case 'bank_transfer': return 'Bank Transfer';
      case 'upi': return 'UPI';
      case 'card': return 'Card';
      case 'other': return 'Other';
      default: return method.charAt(0).toUpperCase() + method.slice(1);
    }
  };

  // Render payment method details
  const renderPaymentMethodDetails = (paymentMethod: string, details: any) => {
    switch (paymentMethod) {
      case 'cash':
        return (
          <>
            {details.cash?.receivedBy && (
              <div>
                <span className="text-sm font-medium text-gray-600">Received By:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cash.receivedBy}</span>
              </div>
            )}
            {details.cash?.receiptNumber && (
              <div>
                <span className="text-sm font-medium text-gray-600">Receipt Number:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cash.receiptNumber}</span>
              </div>
            )}
          </>
        );
      case 'cheque':
        return (
          <>
            {details.cheque?.chequeNumber && (
              <div>
                <span className="text-sm font-medium text-gray-600">Cheque Number:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cheque.chequeNumber}</span>
              </div>
            )}
            {details.cheque?.bankName && (
              <div>
                <span className="text-sm font-medium text-gray-600">Bank:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cheque.bankName}</span>
              </div>
            )}
            {details.cheque?.issueDate && (
              <div>
                <span className="text-sm font-medium text-gray-600">Issue Date:</span>
                <span className="ml-2 text-sm text-gray-900">{formatDate(details.cheque.issueDate)}</span>
              </div>
            )}
          </>
        );
      case 'bank_transfer':
        return (
          <>
            {details.bankTransfer?.transactionId && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transaction ID:</span>
                <span className="ml-2 text-sm text-gray-900">{details.bankTransfer.transactionId}</span>
              </div>
            )}
            {details.bankTransfer?.bankName && (
              <div>
                <span className="text-sm font-medium text-gray-600">Bank:</span>
                <span className="ml-2 text-sm text-gray-900">{details.bankTransfer.bankName}</span>
              </div>
            )}
            {details.bankTransfer?.transferDate && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transfer Date:</span>
                <span className="ml-2 text-sm text-gray-900">{formatDate(details.bankTransfer.transferDate)}</span>
              </div>
            )}
          </>
        );
      case 'upi':
        return (
          <>
            {details.upi?.upiId && (
              <div>
                <span className="text-sm font-medium text-gray-600">UPI ID:</span>
                <span className="ml-2 text-sm text-gray-900">{details.upi.upiId}</span>
              </div>
            )}
            {details.upi?.transactionId && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transaction ID:</span>
                <span className="ml-2 text-sm text-gray-900">{details.upi.transactionId}</span>
              </div>
            )}
          </>
        );
      case 'card':
        return (
          <>
            {details.card?.cardType && (
              <div>
                <span className="text-sm font-medium text-gray-600">Card Type:</span>
                <span className="ml-2 text-sm text-gray-900">{details.card.cardType}</span>
              </div>
            )}
            {details.card?.transactionId && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transaction ID:</span>
                <span className="ml-2 text-sm text-gray-900">{details.card.transactionId}</span>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AMC Invoice</h1>
            <p className="text-gray-600">{invoice.invoiceNumber}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {/* <Button
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
          </Button> */}
          {/* <Button
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
          </Button> */}
          <Button
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>

          <Button
            onClick={() => navigate('/amc-invoices')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
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
                {invoice.invoiceNumber && <div>
                  <span className="font-medium text-gray-700">Invoice No.:</span>
                  <div className="mt-1">{invoice.invoiceNumber}</div>
                </div>}
                {invoice.issueDate && <div>
                  <span className="font-medium text-gray-700">Dated:</span>
                  <div className="mt-1">{formatDate(invoice.issueDate)}</div>
                </div>}
                {invoice.deliveryNote && <div>
                  <span className="font-medium text-gray-700">Delivery Note:</span>
                  <div className="mt-1">{invoice.deliveryNote || 'N/A'}</div>
                </div>}
                {invoice.termsOfPayment && <div>
                  <span className="font-medium text-gray-700">Mode/Terms of Payment:</span>
                  <div className="mt-1">{invoice.termsOfPayment || 'N/A'}</div>
                </div>}
                {invoice.referenceNo && <div>
                  <span className="font-medium text-gray-700">Reference No. & Date.:</span>
                  <div className="mt-1">{invoice.referenceNo || 'N/A'}</div>
                </div>}
                {invoice.otherReferences && <div>
                  <span className="font-medium text-gray-700">Other References:</span>
                  <div className="mt-1">{invoice.otherReferences || 'N/A'}</div>
                </div>}
                {invoice.buyerOrderNo && <div>
                  <span className="font-medium text-gray-700">Buyer's Order No.:</span>
                  <div className="mt-1">{invoice.buyerOrderNo || 'N/A'}</div>
                </div>}
                {invoice.referenceDate && <div>
                  <span className="font-medium text-gray-700">Dated:</span>
                  <div className="mt-1">{invoice.referenceDate ? formatDate(invoice.referenceDate) : 'N/A'}</div>
                </div>}
                {invoice.dispatchDocNo && <div>
                  <span className="font-medium text-gray-700">Dispatch Doc No.:</span>
                  <div className="mt-1">{invoice.dispatchDocNo || 'N/A'}</div>
                </div>}
                {invoice.deliveryNoteDate && <div>
                  <span className="font-medium text-gray-700">Delivery Note Date:</span>
                  <div className="mt-1">{invoice.deliveryNoteDate ? formatDate(invoice.deliveryNoteDate) : 'N/A'}</div>
                </div>}
                {invoice.dispatchedThrough && <div>
                  <span className="font-medium text-gray-700">Dispatched through:</span>
                  <div className="mt-1">{invoice.dispatchedThrough || 'N/A'}</div>
                </div>}
                {invoice.destination && <div>
                  <span className="font-medium text-gray-700">Destination:</span>
                  <div className="mt-1">{invoice.destination || 'N/A'}</div>
                </div>}
                {invoice.termsOfDelivery && <div>
                  <span className="font-medium text-gray-700">Terms of Delivery:</span>
                  <div className="mt-1">{invoice.termsOfDelivery || 'N/A'}</div>
                </div>}
              </div>
            </div>

            {/* Right Column - Company Details */}
            {/* <div className="space-y-4">
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
            </div> */}
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
                    {invoice.serviceCharges.some(service => service.discountPercent > 0) && <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Disc. %</th>}
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
                      {service.discountPercent > 0 && <td className="border border-gray-300 px-3 py-2 text-sm">{service.discountPercent}%</td>}
                      <td className="border border-gray-300 px-3 py-2 text-sm">{formatCurrency(service.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={ invoice.serviceCharges.some(service => service.discountPercent > 0) ? 8 : 7} className="border border-gray-300 px-3 py-2 text-right">Total:</td>
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
          {/* <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-6">
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
          </div> */}

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

      {/* Payment History Section - Hidden in print */}
      <div className="mt-8 print:hidden">
        <div className="bg-white border border-gray-300 shadow-lg rounded-lg">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              <div className="flex items-center gap-4">
                <p className="text-sm text-gray-500">
                  Total payments: {paymentHistory.length}
                </p>
                <Button
                  onClick={fetchPaymentHistory}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            {loadingPaymentHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">Loading payment history...</span>
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="mb-4">
                  <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-sm">No payment records found</p>
                <p className="text-xs text-gray-400 mt-1">Payment records will appear here once payments are recorded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentHistory.map((payment, index) => (
                  <div key={payment._id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          payment.paymentStatus === 'completed' ? 'bg-green-500' :
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
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {renderPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails)}
                        </div>
                      </div>
                    )}

                    {/* Payment Notes */}
                    {payment.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-600">
                          <span className="font-medium">Notes:</span> {payment.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
