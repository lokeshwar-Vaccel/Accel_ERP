import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Calendar,
  Filter,
  X,
  Package,
  Users,
  TrendingUp,
  ChevronDown,
  Send,
  CreditCard,
  Ban,
  AlertCircle,
  XCircle,
  TrendingDown,
  IndianRupee,
  Printer,
  Receipt,
  Truck,
  Settings,
  Download,
  Trash2,
  Wallet,
  RefreshCw,
  MoreHorizontal,
  Copy,
  Share2,
  Archive,
  Star,
  Building,
  Wrench,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import PageHeader from '../components/ui/PageHeader';
import UpdatePaymentModal from '../components/UpdatePaymentModal';
import { apiClient } from '../utils/api';
import { RootState } from '../store';
import toast from 'react-hot-toast';
import { Pagination } from '../components/ui/Pagination';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
// @ts-ignore
import AMCQuotationViewModal from '../components/quotations/AMCQuotationViewModal';
import * as XLSX from 'xlsx';

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
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

// Types
interface AMCQuotation {
  _id: string;
  quotationNumber: string;
  quotationType: 'amc';
  issueDate: string;
  validUntil: string;
  customer: {
    _id?: string;
    name: string;
    email: string;
    phone: string;
    pan?: string;
  };
  company?: {
    name?: string;
    logo?: string;
    address?: string;
    phone?: string;
    email?: string;
    pan?: string;
    bankDetails?: {
      bankName?: string;
      accountNo?: string;
      ifsc?: string;
      branch?: string;
    };
  };
  location?: string;
  assignedEngineer?: string;
  
  // AMC-specific fields
  amcType: 'AMC' | 'CAMC';
  contractDuration: number;
  contractStartDate: string;
  contractEndDate: string;
  billingCycle: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  numberOfVisits: number;
  numberOfOilServices: number;
  responseTime: number;
  coverageArea: string;
  emergencyContactHours: string;
  exclusions: string[];
  performanceMetrics: {
    avgResponseTime: number;
    customerSatisfaction: number;
    issueResolutionRate: number;
  };
  warrantyTerms: string;
  paymentTerms: string;
  renewalTerms: string;
  discountPercentage: number;
  
  // AMC Offer specific fields
  offerItems: Array<{
    make: string;
    engineSlNo: string;
    dgRatingKVA: number;
    typeOfVisits: string;
    qty: number;
    amcCostPerDG: number;
    totalAMCAmountPerDG: number;
    gst18: number;
    totalAMCCost: number;
  }>;
  sparesItems: Array<{
    srNo: number;
    partNo: string;
    description: string;
    hsnCode: string;
    qty: number;
    productId?: string;
    uom?: string;
    unitPrice?: number;
    gstRate?: number;
    discount?: number;
    discountedAmount?: number;
    taxAmount?: number;
    totalPrice?: number;
    availableQuantity?: number;
  }>;
  selectedCustomerDG: any;
  refOfQuote: string;
  paymentTermsText: string;
  validityText: string;
  amcPeriodFrom: string;
  amcPeriodTo: string;
  gstIncluded: boolean;
  
  // Standard quotation fields
  items: Array<{
    product: string;
    description: string;
    hsnCode?: string;
    hsnNumber?: string;
    partNo?: string;
    quantity: number;
    uom: string;
    unitPrice: number;
    discount: number;
    discountedAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  }>;
  serviceCharges: Array<{
    description: string;
    hsnNumber?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    discountedAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  }>;
  batteryBuyBack?: {
    description: string;
    hsnNumber?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    discountedAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  };
  subtotal: number;
  totalDiscount: number;
  overallDiscount?: number;
  overallDiscountAmount?: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  notes?: string;
  terms?: string;
  validityPeriod: number;
  billToAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    addressId?: number;
    gstNumber?: string;
  };
  shipToAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    addressId?: number;
    gstNumber?: string;
  };
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'gst_pending';
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

const AMCQuotationManagement: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  // State management
  const [quotations, setQuotations] = useState<AMCQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [amcTypeFilter, setAmcTypeFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Payment related states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedQuotationForPayment, setSelectedQuotationForPayment] = useState<AMCQuotation | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Status update states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedQuotationForStatus, setSelectedQuotationForStatus] = useState<AMCQuotation | null>(null);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    notes: ''
  });

  // Payment history states
  const [amcQuotationPaymentHistory, setAmcQuotationPaymentHistory] = useState<any[]>([]);
  const [loadingAmcQuotationPayments, setLoadingAmcQuotationPayments] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedQuotation, setSelectedQuotation] = useState<AMCQuotation | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [deletingQuotation, setDeletingQuotation] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalQuotations: 0,
    draftQuotations: 0,
    sentQuotations: 0,
    acceptedQuotations: 0,
    rejectedQuotations: 0,
    totalValue: 0,
    pendingAmount: 0,
    paidAmount: 0
  });

  // Fetch quotations
  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(amcTypeFilter && { amcType: amcTypeFilter }),
        ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      });

      const response = await apiClient.amcQuotations.getAll(params.toString());
      
      if (response.success && response.data) {
        setQuotations(response.data);
        setTotalPages(response.pagination?.totalPages || 1);
        setTotalItems(response.pagination?.totalItems || 0);
      }
    } catch (error) {
      console.error('Error fetching AMC quotations:', error);
      toast.error('Failed to fetch AMC quotations');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await apiClient.amcQuotations.getStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching AMC quotation stats:', error);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchQuotations();
    fetchStats();
  }, [currentPage, searchTerm, statusFilter, amcTypeFilter, paymentStatusFilter, dateRange]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Handle filter changes
  const handleFilterChange = (filterType: string, value: string) => {
    switch (filterType) {
      case 'status':
        setStatusFilter(value);
        break;
      case 'amcType':
        setAmcTypeFilter(value);
        break;
      case 'paymentStatus':
        setPaymentStatusFilter(value);
        break;
      case 'dateRange':
        setDateRange(value as any);
        break;
    }
    setCurrentPage(1);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setAmcTypeFilter('');
    setPaymentStatusFilter('');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  // Handle view quotation
  const handleViewQuotation = (quotation: AMCQuotation) => {
    setSelectedQuotation(quotation);
    setShowViewModal(true);
    fetchAMCQuotationPaymentHistory(quotation._id);
  };

  // Handle edit quotation
  const handleEditQuotation = (quotation: AMCQuotation) => {
    navigate(`/amc-quotations/edit/${quotation._id}`, {
      state: { quotation, mode: 'edit' }
    });
  };

  // Handle delete quotation
  const handleDeleteQuotation = async (quotation: AMCQuotation) => {
    if (!window.confirm(`Are you sure you want to delete AMC quotation ${quotation.quotationNumber}?`)) {
      return;
    }

    try {
      setDeletingQuotation(quotation._id);
      await apiClient.amcQuotations.delete(quotation._id);
      toast.success('AMC quotation deleted successfully');
      fetchQuotations();
      fetchStats();
    } catch (error: any) {
      console.error('Error deleting AMC quotation:', error);
      toast.error(error.response?.data?.message || 'Failed to delete AMC quotation');
    } finally {
      setDeletingQuotation(null);
    }
  };

  // Handle print quotation
  const handlePrintQuotation = (quotation: AMCQuotation) => {
    // Navigate to print page with quotation data
    navigate(`/amc-quotations/${quotation._id}/print`, { 
      state: { quotation } 
    });
  };

  // Handle export to Excel
  const handleExportToExcel = () => {
    try {
      const exportData = quotations.map(quotation => ({
        'Quotation Number': quotation.quotationNumber,
        'Customer Name': quotation.customer.name,
        'Customer Email': quotation.customer.email,
        'Customer Phone': quotation.customer.phone,
        'AMC Type': quotation.amcType,
        'Contract Duration (Months)': quotation.contractDuration,
        'Billing Cycle': quotation.billingCycle,
        'Number of Visits': quotation.numberOfVisits,
        'Response Time (Hours)': quotation.responseTime,
        'Issue Date': formatDate(quotation.issueDate),
        'Valid Until': formatDate(quotation.validUntil),
        'AMC Period From': formatDate(quotation.amcPeriodFrom),
        'AMC Period To': formatDate(quotation.amcPeriodTo),
        'Grand Total': quotation.grandTotal,
        'Payment Status': quotation.paymentStatus,
        'Status': quotation.status,
        'Created At': formatDateTime(quotation.createdAt)
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'AMC Quotations');
      
      const fileName = `amc-quotations-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      toast.success('AMC quotations exported successfully');
    } catch (error) {
      console.error('Error exporting AMC quotations:', error);
      toast.error('Failed to export AMC quotations');
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get payment status badge color
  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'gst_pending': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Payment related functions
  const handleUpdatePayment = (quotation: AMCQuotation) => {
    setSelectedQuotationForPayment(quotation);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (paymentData: any) => {
    if (!selectedQuotationForPayment) return;

    setSubmitting(true);

    try {
      const amcPaymentData = {
        amcQuotationId: selectedQuotationForPayment._id,
        quotationNumber: selectedQuotationForPayment.quotationNumber,
        customerId: selectedQuotationForPayment.customer._id,
        amount: paymentData.paidAmount,
        currency: 'INR',
        paymentMethod: paymentData.paymentMethod,
        paymentMethodDetails: paymentData.paymentMethodDetails,
        paymentDate: paymentData.paymentDate,
        notes: paymentData.notes,
        receiptNumber: `AMC-${selectedQuotationForPayment.quotationNumber}-${Date.now()}`
      };

      const response = await apiClient.amcQuotationPayments.create(amcPaymentData);

      if (response.success) {
        await fetchQuotations();
        await fetchStats();
        setShowPaymentModal(false);
        toast.success('Payment recorded successfully!');
      } else {
        throw new Error('Failed to record payment');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Email functionality
  const getPrimaryAddressEmail = (customer: any): string | null => {
    if (customer.addresses && customer.addresses.length > 0) {
      const primaryAddress = customer.addresses.find((addr: any) => addr.isPrimary);
      if (primaryAddress && primaryAddress.email) {
        return primaryAddress.email;
      }
    }
    // If no primary address email, try customer's main email
    if (customer.email) {
      return customer.email;
    }
    // If no primary address with email, return null
    return null;
  };

  const handleSendAMCQuotationEmail = async (quotation: AMCQuotation) => {
    try {
      // Get primary address email
      const primaryEmail = getPrimaryAddressEmail(quotation.customer);

      // Check if customer has primary address email
      if (!primaryEmail) {
        toast.error('Customer primary address email not available for this AMC quotation');
        return;
      }

      const response = await apiClient.amcQuotations.sendEmail(quotation._id);

      if (response.success) {
        toast.success(`AMC quotation email sent successfully to ${primaryEmail}`);
        // Refresh the quotations list to update the status
        await fetchQuotations();
      } else {
        throw new Error(response.message || 'Failed to send AMC quotation email');
      }
    } catch (error) {
      console.error('Error sending AMC quotation email:', error);
      toast.error('Failed to send AMC quotation email. Please try again.');
    }
  };

  // Status update functionality
  const handleUpdateStatus = (quotation: AMCQuotation) => {
    setSelectedQuotationForStatus(quotation);
    setStatusUpdate({ status: quotation.status, notes: '' });
    setShowStatusModal(true);
  };

  const submitStatusUpdate = async () => {
    if (!selectedQuotationForStatus) return;

    if (!statusUpdate.status) {
      toast.error('Please select a status');
      return;
    }

    try {
      const response = await apiClient.amcQuotations.updateStatus(selectedQuotationForStatus._id, statusUpdate);

      if (response.success) {
        await fetchQuotations();
        await fetchStats();
        setShowStatusModal(false);
        setStatusUpdate({ status: '', notes: '' });
        toast.success('AMC quotation status updated successfully!');
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update AMC quotation status. Please try again.');
    }
  };

  const getStatusOptions = (currentStatus: string) => {
    const allOptions = [
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'accepted', label: 'Accepted' },
      { value: 'rejected', label: 'Rejected' }
    ];

    return allOptions.filter(option => option.value !== currentStatus);
  };

  // Fetch AMC quotation payment history
  const fetchAMCQuotationPaymentHistory = async (quotationId: string) => {
    try {
      setLoadingAmcQuotationPayments(true);
      const response = await apiClient.amcQuotationPayments.getByQuotation(quotationId);
      if (response.success) {
        setAmcQuotationPaymentHistory(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching AMC quotation payment history:', error);
      toast.error('Failed to fetch payment history');
    } finally {
      setLoadingAmcQuotationPayments(false);
    }
  };

  // Generate PDF for AMC quotation payment
  const handleGenerateAMCQuotationPaymentPDF = async (paymentId: string) => {
    try {
      const response = await apiClient.amcQuotationPayments.generateReceipt(paymentId);

      // Create blob URL and trigger download
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `amc-quotation-payment-receipt-${paymentId}.pdf`;
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

  // Get AMC type badge color
  const getAMCTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'AMC': return 'bg-blue-100 text-blue-800';
      case 'CAMC': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Close modals
  const closeModals = () => {
    setShowViewModal(false);
    setSelectedQuotation(null);
  };

  // Helper function to render AMC quotation payment history
  const renderAMCQuotationPaymentHistory = () => {
    if (loadingAmcQuotationPayments) {
      return (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading payment history...</span>
        </div>
      );
    }

    if (amcQuotationPaymentHistory.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No payment records found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {amcQuotationPaymentHistory.map((payment, index) => (
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
                  onClick={() => handleGenerateAMCQuotationPaymentPDF(payment._id)}
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
                  {renderAMCQuotationPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails)}
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

  // Helper function to render payment method details for AMC quotations
  const renderAMCQuotationPaymentMethodDetails = (paymentMethod: string, details: any) => {
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

  // Handle form save
  const handleFormSave = () => {
    closeModals();
    fetchQuotations();
    fetchStats();
  };

  if (loading && quotations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white">
      {/* Header */}
      <PageHeader
        title="AMC Quotation Management"
        subtitle="Manage Annual Maintenance Contract quotations"
      >
        <div className="flex space-x-2">
          
          <Button
            onClick={() => {
              navigate('/amc-quotations/create', { state: { mode: 'create' } });
            }}
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New AMC Quotation</span>
          </Button>
          <Button
            onClick={() => navigate('/billing')}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Billing</span>
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-3 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Quotations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalQuotations}</p>
            </div>
          </div>
        </div>

        {/* <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Accepted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.acceptedQuotations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingAmount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <IndianRupee className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
            </div>
          </div>
        </div> */}
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search quotations, customers, or quotation numbers..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center space-x-2">
          <Button
            onClick={handleExportToExcel}
            variant='outline'
            className="flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </Button>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
            
            {(searchTerm || statusFilter || amcTypeFilter || paymentStatusFilter || dateRange.start || dateRange.end) && (
              <Button
                onClick={clearFilters}
                variant="outline"
                className="flex items-center space-x-2 text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* AMC Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">AMC Type</label>
                <select
                  value={amcTypeFilter}
                  onChange={(e) => handleFilterChange('amcType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  <option value="AMC">AMC</option>
                  <option value="CAMC">CAMC</option>
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Payment Status</option>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="gst_pending">GST Pending</option>
                </select>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <div className="flex space-x-2">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    placeholder="From"
                    className="text-sm"
                  />
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    placeholder="To"
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quotation Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AMC Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Financial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {quotations.map((quotation) => (
                <tr key={quotation._id} className="hover:bg-gray-50">
                  {/* Quotation Details */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {quotation.quotationNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDate(quotation.issueDate)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Valid until: {formatDate(quotation.validUntil)}
                      </div>
                    </div>
                  </td>

                  {/* Customer */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {quotation.customer.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {quotation.customer.email}
                      </div>
                      <div className="text-sm text-gray-500">
                        {quotation.customer.phone}
                      </div>
                    </div>
                  </td>

                  {/* AMC Details */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <Badge className={getAMCTypeBadgeColor(quotation.amcType)}>
                        {quotation.amcType}
                      </Badge>
                      <div className="text-sm text-gray-500 mt-1">
                        {quotation.contractDuration} months
                      </div>
                      <div className="text-sm text-gray-500">
                        {quotation.numberOfVisits} visits
                      </div>
                      <div className="text-sm text-gray-500">
                        {quotation.responseTime}h response
                      </div>
                    </div>
                  </td>

                  {/* Financial */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(quotation.grandTotal)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Paid: {formatCurrency(quotation.paidAmount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Remaining: {formatCurrency(quotation.remainingAmount)}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <Badge className={getStatusBadgeColor(quotation.status)}>
                        {quotation.status}
                      </Badge>
                      <Badge className={getPaymentStatusBadgeColor(quotation.paymentStatus)}>
                        {quotation.paymentStatus}
                      </Badge>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => handleViewQuotation(quotation)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleEditQuotation(quotation)}
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleUpdatePayment(quotation)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 hover:text-blue-700"
                        disabled={quotation.status === 'draft'}
                      >
                        <IndianRupee className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleSendAMCQuotationEmail(quotation)}
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:text-green-700"
                        disabled={!getPrimaryAddressEmail(quotation.customer)}
                        title={
                          !getPrimaryAddressEmail(quotation.customer)
                            ? 'Customer primary address email not available'
                            : 'Send AMC quotation to customer primary address email (will update status to sent)'
                        }
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleUpdateStatus(quotation)}
                        variant="outline"
                        size="sm"
                        className="text-orange-600 hover:text-orange-700"
                        title="Update AMC quotation status"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handlePrintQuotation(quotation)}
                        variant="outline"
                        size="sm"
                        className="text-purple-600 hover:text-purple-700"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteQuotation(quotation)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        disabled={deletingQuotation === quotation._id}
                      >
                        {deletingQuotation === quotation._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {quotations.length === 0 && !loading && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No AMC quotations found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter || amcTypeFilter || paymentStatusFilter || dateRange.start || dateRange.end
                ? 'Try adjusting your search criteria.'
                : 'Get started by creating a new AMC quotation.'}
            </p>
            {!(searchTerm || statusFilter || amcTypeFilter || paymentStatusFilter || dateRange.start || dateRange.end) && (
              <div className="mt-6">
                <Button
                  onClick={() => {
                    navigate('/amc-quotations/create', { state: { mode: 'create' } });
                  }}
                  className="flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>New AMC Quotation</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            itemsPerPage={10}
          />
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedQuotation && (
        <AMCQuotationViewModal
          quotation={selectedQuotation}
          onClose={closeModals}
          onEdit={() => {
            setShowViewModal(false);
            if (selectedQuotation) {
              navigate(`/amc-quotations/edit/${selectedQuotation._id}`, {
                state: { quotation: selectedQuotation, mode: 'edit' }
              });
            }
          }}
          onPrint={() => handlePrintQuotation(selectedQuotation)}
          paymentHistory={amcQuotationPaymentHistory}
          loadingPaymentHistory={loadingAmcQuotationPayments}
          onRefreshPaymentHistory={() => selectedQuotation && fetchAMCQuotationPaymentHistory(selectedQuotation._id)}
          onGeneratePaymentPDF={handleGenerateAMCQuotationPaymentPDF}
        />
      )}

      {/* Payment Modal */}
      <UpdatePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        item={selectedQuotationForPayment}
        itemType="quotation"
        onSubmit={handlePaymentSubmit}
        submitting={submitting}
      />

      {/* Status Update Modal */}
      {showStatusModal && selectedQuotationForStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Update Status - {selectedQuotationForStatus.quotationNumber}
              </h2>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Current Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Status
                </label>
                <div className="px-3 py-2 bg-gray-100 rounded-md">
                  <Badge className={getStatusBadgeColor(selectedQuotationForStatus.status)}>
                    {selectedQuotationForStatus.status}
                  </Badge>
                </div>
              </div>

              {/* New Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status *
                </label>
                <select
                  value={statusUpdate.status}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select new status</option>
                  {getStatusOptions(selectedQuotationForStatus.status).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any notes about this status change..."
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                onClick={() => setShowStatusModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={submitStatusUpdate}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Update Status
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AMCQuotationManagement;
