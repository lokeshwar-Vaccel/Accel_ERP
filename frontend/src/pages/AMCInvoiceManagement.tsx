import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  MoreVertical,
  Printer,
  Mail,
  CreditCard,
  Send,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  ArrowLeft
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import { Badge } from '../components/ui/Badge';
import { Tooltip } from '../components/ui/Tooltip';
import { apiClient } from '../utils/api';
import UpdatePaymentModal from '../components/UpdatePaymentModal';
import toast from 'react-hot-toast';

interface AMCInvoice {
  _id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  customer: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  amcType: 'AMC' | 'CAMC';
  quotationNumber: string;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  sourceQuotation: {
    _id: string;
    quotationNumber: string;
    amcType: string;
  };
  createdBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface AMCInvoiceManagementProps {
  invoiceType?: 'sale' | 'proforma';
}

const AMCInvoiceManagement: React.FC<AMCInvoiceManagementProps> = ({ invoiceType = 'sale' }) => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<AMCInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  });

  console.log("invoices-99992:", invoiceType);
  

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [amcTypeFilter, setAmcTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<AMCInvoice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Stats state
  const [stats, setStats] = useState({
    totalInvoices: 0,
    draftInvoices: 0,
    sentInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    cancelledInvoices: 0,
    invoiceValue: 0,
    paidAmount: 0,
    pendingAmount: 0,
    amcCount: 0,
    camcCount: 0
  });

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, paymentStatusFilter, amcTypeFilter, startDate, endDate, invoiceType]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(paymentStatusFilter !== 'all' && { paymentStatus: paymentStatusFilter }),
        ...(amcTypeFilter !== 'all' && { amcType: amcTypeFilter }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        invoiceType: invoiceType
      });

      const response = await apiClient.amcInvoices.getAll(params);
      
      if (response.success) {
        setInvoices(response.data.invoices);
        setPagination(response.data.pagination);
      } else {
        toast.error('Failed to fetch AMC invoices');
      }
    } catch (error) {
      console.error('Error fetching AMC invoices:', error);
      toast.error('Failed to fetch AMC invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (invoiceType) {
        params.append('invoiceType', invoiceType);
      }
      const response = await apiClient.amcInvoices.getStats(params);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching AMC invoice stats:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this AMC invoice?')) {
      return;
    }

    try {
      const response = await apiClient.amcInvoices.delete(id);
      if (response.success) {
        toast.success('AMC invoice deleted successfully');
        fetchInvoices();
        fetchStats();
      } else {
        toast.error('Failed to delete AMC invoice');
      }
    } catch (error) {
      console.error('Error deleting AMC invoice:', error);
      toast.error('Failed to delete AMC invoice');
    }
  };

  const quickSendAMCInvoice = async (invoice: AMCInvoice) => {
    try {
      // Send AMC invoice email
      const response = await apiClient.amcInvoices.sendEmail(invoice._id);

      if (response.success) {
        toast.success(response.message || `AMC invoice email sent successfully!`);
        await fetchInvoices();
        await fetchStats();
      } else {
        toast.error(response.message || 'Failed to send AMC invoice email');
      }
    } catch (error) {
      console.error('Error sending AMC invoice email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send AMC invoice email. Please try again.';
      toast.error(errorMessage);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const response = await apiClient.amcInvoices.update(id, { status: newStatus });
      if (response.success) {
        toast.success('Status updated successfully');
        fetchInvoices();
        fetchStats();
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800' },
      sent: { color: 'bg-blue-100 text-blue-800' },
      paid: { color: 'bg-green-100 text-green-800' },
      overdue: { color: 'bg-red-100 text-red-800' },
      cancelled: { color: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800' },
      partial: { color: 'bg-orange-100 text-orange-800' },
      paid: { color: 'bg-green-100 text-green-800' },
      overdue: { color: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setAmcTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1);
  };

  // Payment handling functions
  const handlePaymentClick = (invoice: AMCInvoice) => {
    setSelectedInvoiceForPayment(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (paymentData: any) => {
    if (!selectedInvoiceForPayment) return;

    setSubmitting(true);
    try {
      // Create AMC Invoice Payment
      const paymentPayload = {
        amcInvoiceId: selectedInvoiceForPayment._id,
        invoiceNumber: selectedInvoiceForPayment.invoiceNumber,
        customerId: selectedInvoiceForPayment.customer?._id,
        amount: paymentData.paidAmount,
        paymentMethod: paymentData.paymentMethod,
        paymentMethodDetails: paymentData.paymentMethodDetails,
        paymentStatus: paymentData.paymentStatus,
        paymentDate: paymentData.paymentDate,
        notes: paymentData.notes,
        useRazorpay: paymentData.useRazorpay
      };

      await apiClient.amcInvoicePayments.create(paymentPayload);

      // Update the invoice's payment status and amounts
      const updatePayload: any = {
        paymentStatus: paymentData.paymentStatus
      };

      // Calculate new amounts
      const currentPaidAmount = selectedInvoiceForPayment.paidAmount || 0;
      const newPaidAmount = currentPaidAmount + paymentData.paidAmount;
      const remainingAmount = selectedInvoiceForPayment.grandTotal - newPaidAmount;

      updatePayload.paidAmount = newPaidAmount;
      updatePayload.remainingAmount = remainingAmount;

      // Update the invoice
      await apiClient.amcInvoices.update(selectedInvoiceForPayment._id, updatePayload);

      toast.success('Payment recorded successfully!');
      setShowPaymentModal(false);
      setSelectedInvoiceForPayment(null);
      fetchInvoices(); // Refresh the invoices list
      fetchStats(); // Refresh the stats
    } catch (error: any) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            AMC {invoiceType === 'proforma' ? 'Proforma' : 'Invoice'} Management
          </h1>
          <p className="text-gray-600">
            Manage Annual Maintenance Contract {invoiceType === 'proforma' ? 'proforma invoices' : 'invoices'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/amc-invoices/create', { state: { invoiceType } })}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create {invoiceType === 'proforma' ? 'Proforma' : 'Invoice'}
          </Button>
          <Button
              // onClick={handleExportToExcel}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <FileText className="w-4 h-4" />
              <span>Export Excel</span>
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Send className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sent</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sentInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paid</p>
              <p className="text-2xl font-bold text-gray-900">{stats.paidInvoices}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <IndianRupee className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.invoiceValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
            </Button>
            {(searchTerm || statusFilter !== 'all' || paymentStatusFilter !== 'all' || amcTypeFilter !== 'all' || startDate || endDate) && (
              <Button
                onClick={clearFilters}
                variant="outline"
                className="text-red-600 hover:text-red-700"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Payment Status</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AMC Type</label>
              <select
                value={amcTypeFilter}
                onChange={(e) => setAmcTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="AMC">AMC</option>
                <option value="CAMC">CAMC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No AMC {invoiceType === 'proforma' ? 'proforma invoices' : 'invoices'} found
            </h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first AMC {invoiceType === 'proforma' ? 'proforma invoice' : 'invoice'}.
            </p>
            <Button
              onClick={() => navigate('/amc-invoices/create', { state: { invoiceType } })}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create {invoiceType === 'proforma' ? 'Proforma' : 'Invoice'}
            </Button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      INVOICE NO
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CUSTOMER
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AMOUNT
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PAID
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      REMAINING
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STATUS
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PAYMENT
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DUE DATE
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/amc-invoices/${invoice._id}`)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {invoice.customer.name}
                          </div>
                          {invoice.customer.email && (
                            <div className="text-sm text-gray-500">
                              {invoice.customer.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.grandTotal)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(invoice.paidAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-sm font-medium ${invoice.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(invoice.remainingAmount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getStatusBadge(invoice.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {getPaymentStatusBadge(invoice.paymentStatus)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">
                            {formatDate(invoice.dueDate)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-3">
                          {/* View Icon - Always visible */}
                          <Tooltip content="View Invoice" position="top">
                            <button
                              onClick={() => navigate(`/amc-invoices/${invoice._id}`)}
                              className="p-2 text-blue-600 hover:bg-blue-50 hover:scale-110 transition-all duration-200 rounded-md"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </Tooltip>

                          {/* Status-based actions */}
                          {invoice.status === 'draft' && invoice.paymentStatus === 'pending' && (
                            <>
                              {/* Send Icon - Draft with pending payment */}
                              <Tooltip content="Send Invoice" position="top">
                                <button
                                  onClick={() => quickSendAMCInvoice(invoice)}
                                  className="p-2 text-orange-600 hover:bg-orange-50 hover:scale-110 transition-all duration-200 rounded-md"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              {/* Delete Icon - Draft with pending payment */}
                              <Tooltip content="Delete Invoice" position="top">
                                <button
                                  onClick={() => handleDelete(invoice._id)}
                                  className="p-2 text-red-600 hover:bg-red-50 hover:scale-110 transition-all duration-200 rounded-md"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            </>
                          )}

                          {invoice.status === 'paid' && (
                            <>
                              {/* Payment Details Icon - Paid status */}
                              <Tooltip content="Payment Details" position="top">
                                <button
                                  onClick={() => navigate(`/amc-invoices/${invoice._id}/payments`)}
                                  className="p-2 text-green-600 hover:bg-green-50 hover:scale-110 transition-all duration-200 rounded-md"
                                >
                                  <IndianRupee className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              {/* Print Icon - Paid status */}
                              <Tooltip content="Print Invoice" position="top">
                                <button
                                  onClick={() => navigate(`/amc-invoices/${invoice._id}/print`)}
                                  className="p-2 text-gray-600 hover:bg-gray-50 hover:scale-110 transition-all duration-200 rounded-md"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            </>
                          )}

                          {/* Payment Icon - Available for all statuses except cancelled */}
                          {invoice.status !== 'cancelled' && (
                            <Tooltip content="Record Payment" position="top">
                              <button
                                onClick={() => handlePaymentClick(invoice)}
                                className="p-2 text-green-600 hover:bg-green-50 hover:scale-110 transition-all duration-200 rounded-md"
                              >
                                <IndianRupee className="w-4 h-4" />
                              </button>
                            </Tooltip>
                          )}

                          {invoice.status === 'draft' && invoice.paymentStatus === 'partial' && (
                            <>
                              {/* Print Icon - Draft with partial payment */}
                              <Tooltip content="Print Invoice" position="top">
                                <button
                                  onClick={() => navigate(`/amc-invoices/${invoice._id}/print`)}
                                  className="p-2 text-gray-600 hover:bg-gray-50 hover:scale-110 transition-all duration-200 rounded-md"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              {/* Send Icon - Draft with partial payment */}
                              <Tooltip content="Send Invoice" position="top">
                                <button
                                  onClick={() => quickSendAMCInvoice(invoice)}
                                  className="p-2 text-orange-600 hover:bg-orange-50 hover:scale-110 transition-all duration-200 rounded-md"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </Tooltip>
                              {/* Delete Icon - Draft with partial payment */}
                              <Tooltip content="Delete Invoice" position="top">
                                <button
                                  onClick={() => handleDelete(invoice._id)}
                                  className="p-2 text-red-600 hover:bg-red-50 hover:scale-110 transition-all duration-200 rounded-md"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Tooltip>
                            </>
                          )}

                          {/* Additional actions for other statuses */}
                          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
                            <>
                              {/* Print Icon - Sent or overdue status */}
                              {/* <Tooltip content="Print Invoice" position="top">
                                <button
                                  onClick={() => navigate(`/amc-invoices/${invoice._id}/print`)}
                                  className="p-2 text-gray-600 hover:bg-gray-50 hover:scale-110 transition-all duration-200 rounded-md"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </Tooltip> */}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === pagination.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing{' '}
                    <span className="font-medium">
                      {(currentPage - 1) * itemsPerPage + 1}
                    </span>{' '}
                    to{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, pagination.totalItems)}
                    </span>{' '}
                    of{' '}
                    <span className="font-medium">{pagination.totalItems}</span>{' '}
                    results
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-l-md text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`relative inline-flex items-center px-3 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Payment Modal */}
      <UpdatePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        item={selectedInvoiceForPayment}
        itemType="invoice"
        onSubmit={handlePaymentSubmit}
        submitting={submitting}
      />
    </div>
  );
};

export default AMCInvoiceManagement;
