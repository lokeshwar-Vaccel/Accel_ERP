import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
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
  Settings
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import { Modal } from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { apiClient } from '../utils/api';
import { RootState } from '../redux/store';
import toast from 'react-hot-toast';
import { Pagination } from '../components/ui/Pagination';

// Types
interface DGInvoice {
  _id: string;
  invoiceNumber: string;
  customer: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  issueDate: string;
  dueDate: string;
  items: DGInvoiceItem[];
  subtotal: number;
  totalTax: number;
  totalDiscount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  customerAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  terms: string;
  notes: string;
  status: 'draft' | 'sent' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  deliveryStatus: 'pending' | 'shipped' | 'delivered' | 'installed' | 'commissioned';
  installationDate?: string;
  commissioningDate?: string;
  warrantyPeriod: number;
  warrantyStartDate?: string;
  dgPurchaseOrder?: any;
  proformaInvoice?: any;
  quotation?: any;
  createdBy: any;
  invoiceType: 'sale' | 'purchase';
}

interface DGInvoiceItem {
  description: string;
  specifications: string;
  kva: string;
  phase: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  partNo?: string;
  hsnNumber?: string;
  serialNumbers?: string[];
}

interface DGInvoiceStats {
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
}

const DGInvoiceManagement: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // State management
  const [invoices, setInvoices] = useState<DGInvoice[]>([]);
  const [stats, setStats] = useState<DGInvoiceStats>({
    totalInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalData, setTotalData] = useState(0);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  console.log("selectedInvoice:",selectedInvoice);
  

  // Custom dropdown states
  const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
  const [showPaymentFilterDropdown, setShowPaymentFilterDropdown] = useState(false);
  const [showDeliveryFilterDropdown, setShowDeliveryFilterDropdown] = useState(false);

  // Payment form state - Enhanced for comprehensive payment handling
  const [paymentUpdate, setPaymentUpdate] = useState({
    paymentStatus: 'pending',
    paymentMethod: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paidAmount: 0,
    notes: '',
    useRazorpay: false
  });

  // Form validation and UI states
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [showPaymentStatusDropdown, setShowPaymentStatusDropdown] = useState(false);
  const [showPaymentMethodDropdown, setShowPaymentMethodDropdown] = useState(false);

  // Delivery form state
  const [deliveryData, setDeliveryData] = useState({
    deliveryStatus: 'delivered',
    installationDate: '',
    commissioningDate: '',
    warrantyStartDate: ''
  });

  // Initialize data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    fetchInvoices();
  }, [currentPage, limit, searchTerm, statusFilter, paymentFilter, deliveryFilter]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowStatusFilterDropdown(false);
        setShowPaymentFilterDropdown(false);
        setShowDeliveryFilterDropdown(false);
        setShowPaymentStatusDropdown(false);
        setShowPaymentMethodDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInvoices(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const params: any = {
        page: currentPage,
        limit,
        search: searchTerm,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(paymentFilter !== 'all' && { paymentStatus: paymentFilter }),
        ...(deliveryFilter !== 'all' && { deliveryStatus: deliveryFilter })
      };

      const response = await apiClient.dgInvoices.getAll(params);
      
      // Handle the response structure - dgInvoices returns data.invoices
      const invoicesData = response.data?.invoices || [];
      const pagination = response.data?.pagination || {};
      
      setInvoices(invoicesData);
      setCurrentPage(pagination.page || 1);
      setLimit(pagination.limit || 10);
      setTotalData(pagination.total || 0);
      setTotalPages(pagination.pages || 0);
    } catch (error) {
      console.error('Error fetching DG invoices:', error);
      setInvoices([]);
    }
  };

  const fetchStats = async () => {
    try {
      // Use the dedicated stats endpoint
      const response = await apiClient.dgInvoices.getStats();
      
      if (response.success && response.data) {
        setStats({
          totalInvoices: response.data.totalInvoices || 0,
          paidInvoices: response.data.paidInvoices || 0,
          overdueInvoices: response.data.overdueInvoices || 0,
          totalRevenue: response.data.totalRevenue || 0
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback: calculate stats from invoices if stats endpoint fails
      try {
        const response = await apiClient.dgInvoices.getAll({ limit: 100 });
        const allInvoices = response.data?.invoices || [];
        
        const stats = {
          totalInvoices: allInvoices.length,
          paidInvoices: allInvoices.filter((inv: any) => inv.paymentStatus === 'paid').length,
          overdueInvoices: allInvoices.filter((inv: any) => inv.status === 'overdue').length,
          totalRevenue: allInvoices.reduce((sum: number, inv: any) => sum + (inv.paidAmount || 0), 0)
        };
        
        setStats(stats);
      } catch (fallbackError) {
        console.error('Error calculating fallback stats:', fallbackError);
        setStats({
          totalInvoices: 0,
          paidInvoices: 0,
          overdueInvoices: 0,
          totalRevenue: 0
        });
      }
    }
  };

  const handleCreateInvoice = () => {
    navigate('/dg-sales/invoice/create');
  };

  const handleViewInvoice = (invoice: DGInvoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const handleEditInvoice = (invoice: DGInvoice) => {
    navigate(`/dg-sales/invoice/edit/${invoice._id}`);
  };

  const handleUpdatePayment = (invoice: DGInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentUpdate({
      paymentStatus: invoice.paymentStatus === 'paid' ? 'paid' : 'partial',
      paymentMethod: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paidAmount: invoice.remainingAmount || 0,
      notes: '',
      useRazorpay: false
    });
    setShowPaymentModal(true);
  };

  const handleUpdateDelivery = (invoice: DGInvoice) => {
    setSelectedInvoice(invoice);
    setDeliveryData({
      deliveryStatus: invoice.deliveryStatus || 'delivered',
      installationDate: invoice.installationDate || '',
      commissioningDate: invoice.commissioningDate || '',
      warrantyStartDate: invoice.warrantyStartDate || ''
    });
    setShowDeliveryModal(true);
  };

  // Utility functions for payment handling
  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'partial': return 'Partial Payment';
      case 'paid': return 'Paid in Full';
      case 'failed': return 'Payment Failed';
      case 'overdue': return 'Overdue';
      default: return 'Unknown';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'cheque': return 'Cheque';
      case 'bank_transfer': return 'Bank Transfer';
      case 'upi': return 'UPI';
      case 'card': return 'Credit/Debit Card';
      case 'razorpay': return 'Razorpay Gateway';
      case 'other': return 'Other';
      default: return 'Select payment method';
    }
  };

  const validatePaymentForm = () => {
    const errors: { [key: string]: string } = {};

    if (!paymentUpdate.paymentStatus) {
      errors.paymentStatus = 'Payment status is required';
    }

    if (paymentUpdate.paidAmount <= 0) {
      errors.paidAmount = 'Payment amount must be greater than 0';
    }

    if (selectedInvoice && paymentUpdate.paidAmount > (selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0))) {
      errors.paidAmount = 'Payment amount cannot exceed remaining balance';
    }

    if (!paymentUpdate.paymentMethod && !paymentUpdate.useRazorpay) {
      errors.paymentMethod = 'Payment method is required';
    }

    if (!paymentUpdate.paymentDate) {
      errors.paymentDate = 'Payment date is required';
    } else {
      const paymentDate = new Date(paymentUpdate.paymentDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (paymentDate > today) {
        errors.paymentDate = 'Payment date cannot be in the future';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const isPaymentFormValid = () => {
    return paymentUpdate.paidAmount > 0 && 
           paymentUpdate.paymentStatus && 
           (paymentUpdate.paymentMethod || paymentUpdate.useRazorpay) && 
           paymentUpdate.paymentDate;
  };

  const submitPaymentUpdate = async () => {
    if (!selectedInvoice) return;

    // Validate form before submission
    if (!validatePaymentForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      // Calculate new paid amount (current + new payment)
      const currentPaidAmount = selectedInvoice.paidAmount || 0;
      const newTotalPaidAmount = currentPaidAmount + paymentUpdate.paidAmount;

      // Use the general update method with payment data
      await apiClient.dgInvoices.update(
        selectedInvoice._id,
        {
          paymentStatus: paymentUpdate.paymentStatus,
          paidAmount: newTotalPaidAmount,
          paymentMethod: paymentUpdate.paymentMethod,
          paymentDate: paymentUpdate.paymentDate,
          notes: paymentUpdate.notes
        }
      );
      
      await fetchInvoices();
      await fetchStats();
      setShowPaymentModal(false);
      
      // Clear form errors
      setFormErrors({});
      
      toast.success('Payment status updated successfully!');
    } catch (error) {
      console.error('Error updating payment status:', error);
      setFormErrors({ general: 'Failed to update payment status. Please try again.' });
      toast.error('Failed to update payment status');
    } finally {
      setSubmitting(false);
    }
  };

  const submitDeliveryUpdate = async () => {
    if (!selectedInvoice) return;

    setSubmitting(true);
    try {
      // Use the general update method with delivery data
      await apiClient.dgInvoices.update(
        selectedInvoice._id,
        {
          deliveryStatus: deliveryData.deliveryStatus,
          installationDate: deliveryData.installationDate || undefined,
          commissioningDate: deliveryData.commissioningDate || undefined,
          warrantyStartDate: deliveryData.warrantyStartDate || undefined
        }
      );
      
      await fetchInvoices();
      setShowDeliveryModal(false);
      toast.success('Delivery status updated successfully!');
    } catch (error) {
      console.error('Error updating delivery status:', error);
      toast.error('Failed to update delivery status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (invoice: DGInvoice) => {
    if (window.confirm('Are you sure you want to delete this invoice?')) {
      try {
        await apiClient.dgInvoices.delete(invoice._id);
        await fetchInvoices();
        await fetchStats();
        toast.success('Invoice deleted successfully!');
      } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.error('Failed to delete invoice');
      }
    }
  };

  // Quick send invoice email
  const quickSendInvoice = async (invoice: DGInvoice) => {
    // if (window.confirm(`Send invoice ${invoice.invoiceNumber} via email to customer?`))
     {
      setSubmitting(true);
      try {
        const response = await apiClient.dgInvoices.sendEmail(invoice._id);
        
        if (response.success) {
          toast.success('Invoice email sent successfully!');
          
          // Update invoice status to 'sent' after successful email
          await apiClient.dgInvoices.update(invoice._id, { status: 'sent' });
          await fetchInvoices();
          await fetchStats();
        }
      } catch (error) {
        console.error('Error sending invoice email:', error);
        toast.error('Failed to send invoice email. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Quick send payment reminder
  const quickSendReminder = async (invoice: DGInvoice) => {
    // if (window.confirm(`Send payment reminder for invoice ${invoice.invoiceNumber}?`)) 
        {
      setSubmitting(true);
      try {
        const response = await apiClient.dgInvoices.sendReminder(invoice._id);
        
        if (response.success) {
          toast.success('Payment reminder sent successfully!');
        }
      } catch (error) {
        console.error('Error sending payment reminder:', error);
        toast.error('Failed to send payment reminder. Please try again.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-orange-100 text-orange-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'commissioned':
        return 'bg-green-100 text-green-800';
      case 'installed':
        return 'bg-blue-100 text-blue-800';
      case 'delivered':
        return 'bg-purple-100 text-purple-800';
      case 'shipped':
        return 'bg-yellow-100 text-yellow-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const statCards = [
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      icon: <FileText className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Paid Invoices',
      value: stats.paidInvoices,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'Overdue',
      value: stats.overdueInvoices,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'red'
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats.totalRevenue || 0).toLocaleString()}`,
      icon: <IndianRupee className="w-6 h-6" />,
      color: 'purple'
    }
  ];

  if (loading) {
    return (
      <div className="pl-2 pr-6 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-2 pr-6 py-6 space-y-6">
      <PageHeader
        title="DG Invoice Management"
        subtitle="Manage DG sales invoices, payments, and delivery tracking"
      >
        <div className="flex space-x-3">
          <Button
            onClick={handleCreateInvoice}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>New DG Invoice</span>
          </Button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-full bg-${card.color}-100 mr-4`}>
                <div className={`text-${card.color}-600`}>
                  {card.icon}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-1 items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusFilterDropdown(!showStatusFilterDropdown)}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-700">Status: {statusFilter === 'all' ? 'All' : statusFilter}</span>
                  <ChevronDown className="ml-2 w-4 h-4" />
                </button>
                {showStatusFilterDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    {['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          setStatusFilter(status);
                          setShowStatusFilterDropdown(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Payment Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowPaymentFilterDropdown(!showPaymentFilterDropdown)}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-700">Payment: {paymentFilter === 'all' ? 'All' : paymentFilter}</span>
                  <ChevronDown className="ml-2 w-4 h-4" />
                </button>
                {showPaymentFilterDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    {['all', 'pending', 'partial', 'paid', 'overdue'].map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          setPaymentFilter(status);
                          setShowPaymentFilterDropdown(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        {status === 'all' ? 'All Payments' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Delivery Filter */}
              <div className="relative">
                <button
                  onClick={() => setShowDeliveryFilterDropdown(!showDeliveryFilterDropdown)}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <span className="text-sm text-gray-700">Delivery: {deliveryFilter === 'all' ? 'All' : deliveryFilter}</span>
                  <ChevronDown className="ml-2 w-4 h-4" />
                </button>
                {showDeliveryFilterDropdown && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                    {['all', 'pending', 'shipped', 'delivered', 'installed', 'commissioned'].map(status => (
                      <button
                        key={status}
                        onClick={() => {
                          setDeliveryFilter(status);
                          setShowDeliveryFilterDropdown(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        {status === 'all' ? 'All Delivery' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery
                </th> */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(Array.isArray(invoices) ? invoices : []).map((invoice) => (
                <tr key={invoice._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoiceNumber}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.quotation?.quotationNumber && `Quotation: ${invoice.quotation.quotationNumber}`}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.customer?.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.customer?.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>Issue: {new Date(invoice.issueDate).toLocaleDateString()}</div>
                      <div>Due: {new Date(invoice.dueDate).toLocaleDateString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        ₹{(invoice.totalAmount || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Paid: ₹{(invoice.paidAmount || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        Balance: ₹{((invoice.totalAmount || 0) - (invoice.paidAmount || 0)).toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                      {invoice.paymentStatus}
                    </span>
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDeliveryStatusColor(invoice.deliveryStatus)}`}>
                      {invoice.deliveryStatus}
                    </span>
                  </td> */}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewInvoice(invoice)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Invoice"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {/* <button
                        onClick={() => handleEditInvoice(invoice)}
                        className="text-green-600 hover:text-green-900"
                        title="Edit Invoice"
                      >
                        <Edit className="w-4 h-4" />
                      </button> */}
                      {/* Send Email - Only for draft sale invoices */}
                      {invoice.status === 'draft' && (
                        <button
                          onClick={() => quickSendInvoice(invoice)}
                          disabled={submitting}
                          className={`text-orange-600 hover:text-orange-900 hover:bg-orange-50 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Send Invoice Email"
                        >
                          {submitting ? (
                            <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {/* Send Reminder - Only for sent invoices that aren't paid */}
                      {invoice.status === 'sent' && invoice.paymentStatus !== 'paid' && (
                        <button
                          onClick={() => quickSendReminder(invoice)}
                          disabled={submitting}
                          className={`text-blue-600 hover:text-blue-900 hover:bg-blue-50 ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title="Send Payment Reminder"
                        >
                          {submitting ? (
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Clock className="w-4 h-4" />
                          )}
                        </button>
                      )}
                     {invoice.status === 'sent' && <button
                        onClick={() => handleUpdatePayment(invoice)}
                        className="text-green-600 hover:text-green-900 hover:bg-green-50"
                        title="Update Payment"
                      >
                        <IndianRupee className="w-4 h-4" />
                      </button>}
                      <button
                        onClick={() => handleUpdateDelivery(invoice)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Update Delivery"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteInvoice(invoice)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Invoice"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={limit}
              totalItems={totalData}
            />
          </div>
        )}
      </div>

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoice && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          title={`Invoice ${selectedInvoice.invoiceNumber}`}
          size="xl"
        >
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Details</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Name:</span> {selectedInvoice.customer?.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedInvoice.customer?.email}</p>
                    <p><span className="font-medium">Phone:</span> {selectedInvoice.customer?.phone}</p>
                    <p><span className="font-medium">Address:</span> {`${selectedInvoice.billToAddress?.address}, ${selectedInvoice.billToAddress?.state}, ${selectedInvoice.billToAddress?.district}, ${selectedInvoice.billToAddress?.pincode}`}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Issue Date:</span> {new Date(selectedInvoice.issueDate).toLocaleDateString()}</p>
                    <p><span className="font-medium">Due Date:</span> {new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                    <p><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                        {selectedInvoice.status}
                      </span>
                    </p>
                    <p><span className="font-medium">Warranty:</span> {selectedInvoice.warrantyPeriod} months</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">HSN</th>
                      {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specifications</th> */}
                      {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KVA</th> */}
                      {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phase</th> */}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInvoice.items.map((item:any, index:any) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.partNo || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.hsnNumber || '-'}</td>
                        {/* <td className="px-4 py-3 text-sm text-gray-900">{item.specifications}</td> */}
                        {/* <td className="px-4 py-3 text-sm text-gray-900">{item.kva}</td> */}
                        {/* <td className="px-4 py-3 text-sm text-gray-900">{item.phase}</td> */}
                        <td className="px-4 py-3 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">₹{(item.unitPrice || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{item.taxRate}%</td>
                        <td className="px-4 py-3 text-sm text-gray-900">₹{(item.totalPrice || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Summary */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
                  <div className="space-y-2">
                    <p><span className="font-medium">Total Amount:</span> ₹{(selectedInvoice.totalAmount || 0).toLocaleString()}</p>
                    <p><span className="font-medium">Paid Amount:</span> ₹{(selectedInvoice.paidAmount || 0).toLocaleString()}</p>
                    <p><span className="font-medium">Balance Amount:</span> ₹{(selectedInvoice.remainingAmount || 0).toLocaleString()}</p>
                    <p><span className="font-medium">Payment Status:</span> 
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getPaymentStatusColor(selectedInvoice.paymentStatus)}`}>
                        {selectedInvoice.paymentStatus}
                      </span>
                    </p>
                  </div>
                </div>
                <div>
                  {/* <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Information</h3> */}
                  <div className="space-y-2">
                    {/* Notes */}
            {(selectedInvoice.notes || selectedInvoice.terms) && (
              <div>
                {selectedInvoice.notes && (
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
                    <p className="text-gray-700">{selectedInvoice.notes}</p>
                  </div>
                )}
                {selectedInvoice.terms && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Terms & Conditions</h3>
                    <p className="text-gray-700">{selectedInvoice.terms}</p>
                  </div>
                )}
              </div>
            )}
                    {/* <p><span className="font-medium">Delivery Status:</span> 
                      <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getDeliveryStatusColor(selectedInvoice.deliveryStatus)}`}>
                        {selectedInvoice.deliveryStatus}
                      </span> */}
                    {/* </p> */}
                    {selectedInvoice.installationDate && (
                      <p><span className="font-medium">Installation Date:</span> {new Date(selectedInvoice.installationDate).toLocaleDateString()}</p>
                    )}
                    {selectedInvoice.commissioningDate && (
                      <p><span className="font-medium">Commissioning Date:</span> {new Date(selectedInvoice.commissioningDate).toLocaleDateString()}</p>
                    )}
                    {selectedInvoice.warrantyStartDate && (
                      <p><span className="font-medium">Warranty Start:</span> {new Date(selectedInvoice.warrantyStartDate).toLocaleDateString()}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            
          </div>
        </Modal>
      )}

      {/* Payment Update Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Update Payment</h2>
                <p className="text-sm text-gray-600 mt-1">Process payment for DG invoice #{selectedInvoice.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="px-6 pt-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column - Invoice Summary & Payment Info */}
                <div className="space-y-6">
                  {/* Invoice Summary Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-bold text-sm">₹</span>
                      </div>
                      Invoice Summary
                    </h3>

                    <div className="text-sm text-gray-600 mb-4">
                      Invoice: <span className="font-medium text-gray-900">{selectedInvoice.invoiceNumber}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <span className="text-gray-500 text-sm">Total Amount</span>
                        <div className="text-2xl font-bold text-gray-900">₹{(selectedInvoice.totalAmount || 0).toLocaleString()}</div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <span className="text-gray-500 text-sm">Already Paid</span>
                        <div className="text-2xl font-bold text-green-600">₹{(selectedInvoice.paidAmount || 0).toLocaleString()}</div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <span className="text-gray-500 text-sm">Remaining</span>
                        <div className="text-2xl font-bold text-red-600">₹{((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-500">Payment Status:</span>
                      <span className={`ml-2 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(selectedInvoice.paymentStatus)}`}>
                        {selectedInvoice.paymentStatus.charAt(0).toUpperCase() + selectedInvoice.paymentStatus.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Gateway Selection */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <CreditCard className="w-5 h-5 mr-3" />
                      Payment Gateway
                    </h3>

                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="manual-payment"
                            name="payment-gateway"
                            checked={!paymentUpdate.useRazorpay}
                            onChange={() => setPaymentUpdate({ ...paymentUpdate, useRazorpay: false })}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor="manual-payment" className="text-sm font-medium text-blue-800">
                            Manual Payment Entry
                          </label>
                        </div>
                        <p className="text-xs text-blue-600 mt-2 ml-7">Record payment received through other means</p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="razorpay-payment"
                            name="payment-gateway"
                            checked={paymentUpdate.useRazorpay}
                            onChange={() => setPaymentUpdate({ ...paymentUpdate, useRazorpay: true })}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor="razorpay-payment" className="text-sm font-medium text-blue-800">
                            Razorpay Gateway
                          </label>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Secure</span>
                        </div>

                        {paymentUpdate.useRazorpay && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center space-x-2 text-xs text-blue-700">
                              <CheckCircle className="w-3 h-3" />
                              <span>Secure payment page redirect</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-blue-700">
                              <CheckCircle className="w-3 h-3" />
                              <span>UPI, Cards, Net Banking, Wallets</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-blue-700">
                              <CheckCircle className="w-3 h-3" />
                              <span>Real-time verification</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  {paymentUpdate.paidAmount > 0 && (
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200 shadow-sm">
                      <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-yellow-600 font-bold text-sm">Σ</span>
                        </div>
                        Payment Summary
                      </h3>

                      <div className="space-y-3">
                        {selectedInvoice.paymentStatus === 'partial' && (
                          <div className="flex justify-between items-center py-2 border-b border-yellow-200">
                            <span className="text-yellow-700">Previously Paid:</span>
                            <span className="font-semibold text-yellow-800">₹{(selectedInvoice.paidAmount || 0).toLocaleString()}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center py-2 border-b border-yellow-200">
                          <span className="text-yellow-700">New Payment:</span>
                          <span className="font-semibold text-yellow-800">₹{(paymentUpdate.paidAmount || 0).toLocaleString()}</span>
                        </div>

                        {paymentUpdate.paidAmount < ((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)) && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-yellow-700">Remaining Balance:</span>
                            <span className="font-semibold text-red-600">₹{(((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)) - paymentUpdate.paidAmount).toLocaleString()}</span>
                          </div>
                        )}

                        {paymentUpdate.paidAmount >= ((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)) && (
                          <div className="bg-green-100 p-3 rounded-lg">
                            <div className="flex items-center text-green-800">
                              <CheckCircle className="w-5 h-5 mr-2" />
                              <span className="font-semibold">Invoice will be marked as PAID</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Payment Form */}
                <div className="space-y-6">

                  {/* Payment Amount */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-green-600 font-bold text-sm">₹</span>
                      </div>
                      Payment Amount
                    </h3>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {selectedInvoice.paymentStatus === 'partial' ? 'Additional Payment Amount (₹) *' : 'Payment Amount (₹) *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          max={(selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)}
                          step="1"
                          value={paymentUpdate.paidAmount}
                          onChange={(e) => {
                            const amount = parseFloat(e.target.value) || 0;
                            const remainingAmount = (selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0);

                            let newPaymentStatus = paymentUpdate.paymentStatus;
                            if (amount >= remainingAmount) {
                              newPaymentStatus = 'paid';
                            } else if (amount > 0) {
                              newPaymentStatus = 'partial';
                            } else {
                              newPaymentStatus = 'pending';
                            }

                            setPaymentUpdate({
                              ...paymentUpdate,
                              paidAmount: amount,
                              paymentStatus: newPaymentStatus
                            });

                            if (formErrors.paidAmount && amount > 0 && amount <= remainingAmount) {
                              setFormErrors(prev => ({ ...prev, paidAmount: '' }));
                            }
                          }}
                          className={`w-full pl-8 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold ${formErrors.paidAmount ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="0"
                        />
                      </div>
                      {formErrors.paidAmount && (
                        <p className="text-red-500 text-sm mt-2">{formErrors.paidAmount}</p>
                      )}
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      {selectedInvoice.paymentStatus === 'partial' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const remainingAmount = (selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0);
                              setPaymentUpdate({
                                ...paymentUpdate,
                                paidAmount: Math.round(remainingAmount * 0.5),
                                paymentStatus: 'partial'
                              });
                            }}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                          >
                            Half Remaining
                            <div className="text-xs">₹{Math.round(((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)) * 0.5).toLocaleString()}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const remainingAmount = (selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0);
                              setPaymentUpdate({
                                ...paymentUpdate,
                                paidAmount: remainingAmount,
                                paymentStatus: 'paid'
                              });
                            }}
                            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                          >
                            Full Remaining
                            <div className="text-xs">₹{((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)).toLocaleString()}</div>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const remainingAmount = (selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0);
                              setPaymentUpdate({
                                ...paymentUpdate,
                                paidAmount: Math.round(remainingAmount * 0.5),
                                paymentStatus: 'partial'
                              });
                            }}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                          >
                            50% Payment
                            <div className="text-xs">₹{Math.round(((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)) * 0.5).toLocaleString()}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const remainingAmount = (selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0);
                              setPaymentUpdate({
                                ...paymentUpdate,
                                paidAmount: remainingAmount,
                                paymentStatus: 'paid'
                              });
                            }}
                            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                          >
                            Full Amount
                            <div className="text-xs">₹{((selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0)).toLocaleString()}</div>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-purple-600 font-bold text-sm">i</span>
                      </div>
                      Payment Details
                    </h3>

                    <div className="space-y-4">
                      {/* Payment Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Status
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => setShowPaymentStatusDropdown(!showPaymentStatusDropdown)}
                            className="flex items-center justify-between w-full px-4 py-3 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 bg-gray-50"
                          >
                            <span className="text-gray-700 font-medium">{getPaymentStatusLabel(paymentUpdate.paymentStatus)}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPaymentStatusDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          {formErrors.paymentStatus && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.paymentStatus}</p>
                          )}
                          {showPaymentStatusDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                              {[
                                { value: 'pending', label: 'Pending', color: 'text-yellow-600' },
                                { value: 'partial', label: 'Partial Payment', color: 'text-blue-600' },
                                { value: 'paid', label: 'Paid in Full', color: 'text-green-600' },
                                { value: 'failed', label: 'Payment Failed', color: 'text-red-600' }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    let newPaidAmount = paymentUpdate.paidAmount;
                                    const remainingAmount = (selectedInvoice.totalAmount || 0) - (selectedInvoice.paidAmount || 0);
                                    
                                    if (option.value === 'partial' && paymentUpdate.paidAmount === 0) {
                                      newPaidAmount = Math.round(remainingAmount * 0.5);
                                    } else if (option.value === 'paid') {
                                      newPaidAmount = remainingAmount;
                                    }

                                    setPaymentUpdate({
                                      ...paymentUpdate,
                                      paidAmount: newPaidAmount,
                                      paymentStatus: option.value
                                    });
                                    setShowPaymentStatusDropdown(false);

                                    if (formErrors.paymentStatus) {
                                      setFormErrors(prev => ({ ...prev, paymentStatus: '' }));
                                    }
                                  }}
                                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${option.color} ${paymentUpdate.paymentStatus === option.value ? 'bg-blue-50' : ''
                                    }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => setShowPaymentMethodDropdown(!showPaymentMethodDropdown)}
                            className="flex items-center justify-between w-full px-4 py-3 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 bg-gray-50"
                          >
                            <span className="text-gray-700 font-medium">{getPaymentMethodLabel(paymentUpdate.paymentMethod)}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPaymentMethodDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          {formErrors.paymentMethod && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.paymentMethod}</p>
                          )}
                          {showPaymentMethodDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                              {[
                                { value: '', label: 'Select payment method' },
                                { value: 'cash', label: 'Cash' },
                                { value: 'cheque', label: 'Cheque' },
                                { value: 'bank_transfer', label: 'Bank Transfer' },
                                { value: 'upi', label: 'UPI' },
                                { value: 'card', label: 'Credit/Debit Card' },
                                { value: 'other', label: 'Other' }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    setPaymentUpdate({ ...paymentUpdate, paymentMethod: option.value });
                                    setShowPaymentMethodDropdown(false);

                                    if (formErrors.paymentMethod && option.value) {
                                      setFormErrors(prev => ({ ...prev, paymentMethod: '' }));
                                    }
                                  }}
                                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${paymentUpdate.paymentMethod === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                    }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          value={paymentUpdate.paymentDate}
                          onChange={(e) => {
                            setPaymentUpdate({ ...paymentUpdate, paymentDate: e.target.value });

                            if (formErrors.paymentDate && e.target.value) {
                              const paymentDate = new Date(e.target.value);
                              const today = new Date();
                              today.setHours(23, 59, 59, 999);
                              if (paymentDate <= today) {
                                setFormErrors(prev => ({ ...prev, paymentDate: '' }));
                              }
                            }
                          }}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 ${formErrors.paymentDate ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {formErrors.paymentDate && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.paymentDate}</p>
                        )}
                      </div>

                      {/* Payment Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Notes
                        </label>
                        <textarea
                          value={paymentUpdate.notes}
                          onChange={(e) => setPaymentUpdate({ ...paymentUpdate, notes: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-50"
                          placeholder="Transaction ID, reference number, or other payment details..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Messages */}
              {(formErrors.general || formErrors.razorpay || Object.keys(formErrors).length > 0) && (
                <div className="mt-6 space-y-4">
                  {formErrors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-red-600 font-bold text-sm">!</span>
                        </div>
                        <div>
                          <div className="font-medium text-red-800">Error</div>
                          <div className="text-red-700">{formErrors.general}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {formErrors.razorpay && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                          <CreditCard className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium text-red-800">Razorpay Configuration Error</div>
                          <div className="text-red-700">{formErrors.razorpay}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fixed Bottom Action Buttons */}
              <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 mt-5 z-10">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitPaymentUpdate}
                    disabled={!isPaymentFormValid() || submitting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      paymentUpdate.useRazorpay ? 'Proceed to Payment' : 'Update Payment'
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Delivery Update Modal */}
      {showDeliveryModal && selectedInvoice && (
        <Modal
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          title={`Update Delivery - ${selectedInvoice.invoiceNumber}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Status</label>
              <select
                value={deliveryData.deliveryStatus}
                onChange={(e) => setDeliveryData({ ...deliveryData, deliveryStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="installed">Installed</option>
                <option value="commissioned">Commissioned</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Installation Date</label>
              <input
                type="date"
                value={deliveryData.installationDate}
                onChange={(e) => setDeliveryData({ ...deliveryData, installationDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commissioning Date</label>
              <input
                type="date"
                value={deliveryData.commissioningDate}
                onChange={(e) => setDeliveryData({ ...deliveryData, commissioningDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Start Date</label>
              <input
                type="date"
                value={deliveryData.warrantyStartDate}
                onChange={(e) => setDeliveryData({ ...deliveryData, warrantyStartDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeliveryModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={submitDeliveryUpdate}
                isLoading={submitting}
              >
                Update Delivery
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DGInvoiceManagement; 