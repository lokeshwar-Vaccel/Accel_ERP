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
  Settings,
  Download,
  Trash2,
  Wallet
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import { Modal } from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { apiClient } from '../utils/api';
import { RootState } from '../store';
import toast from 'react-hot-toast';
import { Pagination } from '../components/ui/Pagination';
import DGQuotationViewModal from '../components/ui/DGQuotationViewModal';
import DGQuotationForm from '../components/ui/DGQuotationForm';
import UpdatePaymentModal from '../components/UpdatePaymentModal';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
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

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'sent':
      return 'bg-blue-100 text-blue-800';
    case 'accepted':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    case 'expired':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'partial':
      return 'bg-blue-100 text-blue-800';
    case 'paid':
      return 'bg-green-100 text-green-800';
    case 'overdue':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Types
interface DGQuotation {
  _id: string;
  quotationNumber: string;
  customer: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    pan?: string;
  } | null;
  issueDate: string;
  validUntil: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
  dgSpecifications?: {
    kva: string;
    phase: string;
    quantity: number;
  };
  salesEngineer?: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    salesEmployeeCode: string;
  };
  enquiryDetails?: {
    enquiryNo: string;
    enquiryDate: string;
    enquiryType: string;
    enquiryStatus: string;
    enquiryStage: string;
    assignedEmployeeName: string;
    plannedFollowUpDate: string;
    numberOfFollowUps: number;
  };
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  validityDays?: string;
  validity?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

const DGQuotationManagement: React.FC = () => {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState<DGQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedQuotation, setSelectedQuotation] = useState<DGQuotation | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationFormMode, setQuotationFormMode] = useState<'create' | 'edit'>('create');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [products, setProducts] = useState<any[]>([]);

  // Fetch quotations
  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      });

      const response = await apiClient.dgSales.dgQuotations.getAll(params.toString());
      
      if (response.success) {
        const data = response.data as any;
        if (Array.isArray(data)) {
          setQuotations(data);
          setTotalPages(1);
          setTotalItems(data.length);
        } else {
          setQuotations(data.data || []);
          setTotalPages(data.pagination?.pages || 1);
          setTotalItems(data.pagination?.total || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast.error('Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [currentPage, searchTerm, statusFilter, paymentStatusFilter, dateRange]);

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Handle status filter
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  // Handle payment status filter
  const handlePaymentStatusFilter = (value: string) => {
    setPaymentStatusFilter(value);
    setCurrentPage(1);
  };

  // Handle date range filter
  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPaymentStatusFilter('');
    setDateRange({ start: '', end: '' });
    setCurrentPage(1);
  };

  // Handle view quotation
  const handleViewQuotation = (quotation: DGQuotation) => {
    setSelectedQuotation(quotation);
    setShowViewModal(true);
  };

  // Handle edit quotation
  const handleEditQuotation = (quotation: DGQuotation) => {
    setSelectedQuotation(quotation);
    setQuotationFormMode('edit');
    setShowQuotationForm(true);
  };

  // Handle delete quotation
  const handleDeleteQuotation = async (quotationId: string) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        const response = await apiClient.dgSales.dgQuotations.delete(quotationId);
        if (response.success) {
          toast.success('Quotation deleted successfully');
          fetchQuotations();
        }
      } catch (error) {
        console.error('Error deleting quotation:', error);
        toast.error('Failed to delete quotation');
      }
    }
  };

  // Handle payment update
  const handlePaymentUpdate = async (paymentData: any) => {
    if (!selectedQuotation) return;

    try {
      setSubmittingPayment(true);
      
      // Create a separate payment record instead of updating quotation directly
      const paymentRecord = {
        quotationId: selectedQuotation._id,
        quotationNumber: selectedQuotation.quotationNumber,
        customerId: selectedQuotation.customer?._id,
        amount: paymentData.paidAmount,
        currency: 'INR',
        paymentMethod: paymentData.paymentMethod,
        paymentMethodDetails: paymentData.paymentMethodDetails,
        paymentDate: paymentData.paymentDate,
        notes: paymentData.notes,
        receiptNumber: paymentData.receiptNumber || `RCP-${Date.now()}`
      };

      const response = await apiClient.dgSales.dgQuotationPayments.create(paymentRecord);
      
      if (response.success) {
        toast.success('Payment created successfully');
        setShowPaymentModal(false);
        setSelectedQuotation(null);
        fetchQuotations(); // Refresh the quotation list
      }
    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast.error(error.message || 'Failed to create payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Handle payment button click
  const handlePaymentClick = (quotation: DGQuotation) => {
    setSelectedQuotation(quotation);
    setShowPaymentModal(true);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(paymentStatusFilter && { paymentStatus: paymentStatusFilter }),
        ...(dateRange.start && { startDate: dateRange.start }),
        ...(dateRange.end && { endDate: dateRange.end }),
      });

      const response = await apiClient.dgSales.dgQuotations.getAll(params.toString());
        
      if (response.success) {
        // Convert to Excel
        const ws = XLSX.utils.json_to_sheet(response.data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DG Quotations');
        
        // Set column widths
        const columnWidths = [
          { wch: 15 }, // Quotation Number
          { wch: 12 }, // Issue Date
          { wch: 12 }, // Valid Until
          { wch: 20 }, // Customer Name
          { wch: 25 }, // Customer Email
          { wch: 10 }, // Status
          { wch: 12 }, // Payment Status
          { wch: 8 },  // KVA
          { wch: 8 },  // Phase
          { wch: 8 },  // Quantity
          { wch: 12 }, // Subtotal
          { wch: 12 }, // Total Discount
          { wch: 8 },  // Tax Rate %
          { wch: 12 }, // Tax Amount
          { wch: 12 }, // Grand Total
          { wch: 12 }, // Paid Amount
          { wch: 12 }, // Remaining Amount
          { wch: 20 }, // Created By
          { wch: 12 }  // Created At
        ];
        ws['!cols'] = columnWidths;
        
        XLSX.writeFile(wb, `dg-quotations-${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Quotations exported successfully');
      }
    } catch (error) {
      console.error('Error exporting quotations:', error);
      toast.error('Failed to export quotations');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="DG Quotation Management"
        subtitle="Manage DG Quotations and track their status"
      />

      {/* Filters and Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search quotations..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            {/* <Button
              onClick={() => {
                setSelectedQuotation(null);
                setQuotationFormMode('create');
                setShowQuotationForm(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Quotation
            </Button> */}
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>

              {/* Payment Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => handlePaymentStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Payment Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Partial">Partial</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quotation Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  DG Specifications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Engineer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
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
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                      Loading quotations...
                    </div>
                  </td>
                </tr>
              ) : quotations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Package className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No quotations found</p>
                      <p className="text-sm">Create your first quotation to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                quotations.map((quotation) => (
                  <tr key={quotation._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {quotation.quotationNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {quotation.dgSpecifications?.quantity || 0} item(s)
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {quotation.customer?.name || 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {quotation.customer?.email || 'No email'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {quotation.customer?.phone || 'No phone'}
                        </div>
                        {quotation.customer?.pan && (
                          <div className="text-xs text-gray-500">
                            PAN: {quotation.customer.pan}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium">
                          {quotation.dgSpecifications?.kva || 'N/A'} KVA
                        </div>
                        <div className="text-sm text-gray-600">
                          {quotation.dgSpecifications?.phase || 'N/A'} Phase
                        </div>
                        <div className="text-sm text-gray-600">
                          Qty: {quotation.dgSpecifications?.quantity || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        {quotation.salesEngineer ? (
                          <>
                            <div className="text-sm font-medium">
                              {quotation.salesEngineer.fullName || 
                               `${quotation.salesEngineer.firstName || ''} ${quotation.salesEngineer.lastName || ''}`.trim()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {quotation.salesEngineer.phone || 'No phone'}
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">Not assigned</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          Issue: {formatDate(quotation.issueDate)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Valid: {formatDate(quotation.validUntil)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(quotation.grandTotal)}
                        </div>
                        <div className="text-xs text-gray-600">
                          Subtotal: {formatCurrency(quotation.subtotal)}
                        </div>
                        <div className="text-xs text-gray-600">
                          Tax: {formatCurrency(quotation.totalTax)}
                        </div>
                        {quotation.totalDiscount > 0 && (
                          <div className="text-xs text-red-600">
                            Discount: {formatCurrency(quotation.totalDiscount)}
                          </div>
                        )}
                        {/* Payment Information */}
                        {quotation.paidAmount > 0 && (
                          <div className="text-xs text-blue-600">
                            Paid: {formatCurrency(quotation.paidAmount)}
                          </div>
                        )}
                        {quotation.remainingAmount > 0 && (
                          <div className="text-xs text-orange-600">
                            Remaining: {formatCurrency(quotation.remainingAmount)}
                          </div>
                        )}
                        {quotation.paymentStatus && (
                          <div className="text-xs">
                            <Badge 
                              variant={
                                quotation.paymentStatus === 'Paid' ? 'success' :
                                quotation.paymentStatus === 'Partial' ? 'warning' :
                                quotation.paymentStatus === 'Pending' ? 'info' : 'danger'
                              }
                              size="sm"
                            >
                              {quotation.paymentStatus}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quotation.status)}`}>
                          {quotation.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewQuotation(quotation)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePaymentClick(quotation)}
                          className="text-purple-600 hover:text-purple-900 p-1"
                          title="Payment"
                        >
                          <Wallet className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditQuotation(quotation)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuotation(quotation._id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      {showViewModal && selectedQuotation && (
        <DGQuotationViewModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedQuotation(null);
          }}
          quotation={selectedQuotation}
          onStatusUpdate={async (newStatus) => {
            try {
              const response = await apiClient.dgSales.dgQuotations.update(selectedQuotation._id, { status: newStatus });
              if (response.success) {
                toast.success(`Quotation status updated to ${newStatus}`);
                setSelectedQuotation({ ...selectedQuotation, status: newStatus as 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired' });
                fetchQuotations();
              }
            } catch (error) {
              toast.error('Failed to update quotation status');
            }
          }}
        />
      )}

      {/* Quotation Form Modal */}
      {showQuotationForm && (
        <DGQuotationForm
          isOpen={showQuotationForm}
          onClose={() => {
            setShowQuotationForm(false);
            setSelectedQuotation(null);
          }}
          onSuccess={() => {
            setShowQuotationForm(false);
            setSelectedQuotation(null);
            fetchQuotations();
          }}
          dgEnquiry={selectedQuotation?.enquiryDetails}
          products={products}
          generalSettings={null}
          initialData={selectedQuotation}
          mode={quotationFormMode}
          quotationId={selectedQuotation?._id}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedQuotation && (
        <UpdatePaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedQuotation(null);
          }}
          item={selectedQuotation}
          itemType="quotation"
          onSubmit={handlePaymentUpdate}
          submitting={submittingPayment}
        />
      )}
    </div>
  );
};

export default DGQuotationManagement;
