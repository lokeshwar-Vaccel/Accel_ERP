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
  Calendar,
  Building2,
  Package,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  ChevronDown,
  MoreVertical,
  ArrowLeft
} from 'lucide-react';
import { apiClient } from '../utils/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import DGProformaViewModal from '../components/ui/DGProformaViewModal';
import { Button } from 'components/ui/Botton';
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
      return 'bg-orange-100 text-orange-800';
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
interface DGProforma {
  _id: string;
  proformaNumber: string;
  customer: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  customerEmail: string;
  proformaDate: string;
  validUntil: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
  paymentTerms: string;
  items: Array<{
    product: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    kva: string;
    phase: string;
    annexureRating: string;
    dgModel: string;
    numberOfCylinders: number;
    subject: string;
    isActive: boolean;
  }>;
  subtotal: number;
  totalDiscount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  additionalCharges: {
    freight: number;
    insurance: number;
    packing: number;
    other: number;
  };
  notes?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

const DGProformaManagement: React.FC = () => {
  const navigate = useNavigate();
  const [proformas, setProformas] = useState<DGProforma[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedProforma, setSelectedProforma] = useState<DGProforma | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch proformas
  const fetchProformas = async () => {
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

      const response = await apiClient.dgSales.dgProformas.getAll(params.toString());
      
      if (response.success) {
        setProformas(response.data);
        setTotalPages(response.pagination?.pages || 1);
        setTotalItems(response.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching proformas:', error);
      toast.error('Failed to fetch proformas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProformas();
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

  // Handle view proforma
  const handleViewProforma = (proforma: DGProforma) => {
    setSelectedProforma(proforma);
    setShowViewModal(true);
  };

  // Handle edit proforma
  const handleEditProforma = (proforma: DGProforma) => {
    navigate(`/dg-proforma/edit/${proforma._id}`);
  };

  // Handle delete proforma
  const handleDeleteProforma = async (proformaId: string) => {
    if (window.confirm('Are you sure you want to delete this proforma?')) {
      try {
        const response = await apiClient.dgSales.dgProformas.delete(proformaId);
        if (response.success) {
          toast.success('Proforma deleted successfully');
          fetchProformas();
        }
      } catch (error) {
        console.error('Error deleting proforma:', error);
        toast.error('Failed to delete proforma');
      }
    }
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

      const response = await apiClient.dgSales.dgProformas.export(params.toString());
      
      if (response.success) {
        // Convert to Excel
        const ws = XLSX.utils.json_to_sheet(response.data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'DG Proformas');
        
        // Set column widths
        const columnWidths = [
          { wch: 15 }, // Proforma Number
          { wch: 12 }, // Proforma Date
          { wch: 12 }, // Valid Until
          { wch: 20 }, // Customer Name
          { wch: 25 }, // Customer Email
          { wch: 10 }, // Status
          { wch: 12 }, // Payment Status
          { wch: 12 }, // Payment Terms
          { wch: 15 }, // Product
          { wch: 40 }, // Description
          { wch: 8 },  // KVA
          { wch: 8 },  // Phase
          { wch: 15 }, // Annexure Rating
          { wch: 15 }, // DG Model
          { wch: 8 },  // Number of Cylinders
          { wch: 30 }, // Subject
          { wch: 8 },  // UOM
          { wch: 8 },  // Quantity
          { wch: 12 }, // Unit Price
          { wch: 8 },  // Discount %
          { wch: 12 }, // Discounted Amount
          { wch: 12 }, // Total Price
          { wch: 12 }, // HSN Number
          { wch: 12 }, // Subtotal
          { wch: 12 }, // Total Discount
          { wch: 8 },  // Tax Rate %
          { wch: 12 }, // Tax Amount
          { wch: 10 }, // Freight
          { wch: 10 }, // Insurance
          { wch: 10 }, // Packing
          { wch: 10 }, // Other Charges
          { wch: 12 }, // Total Amount
          { wch: 30 }, // Notes
          { wch: 20 }, // Created By
          { wch: 12 }  // Created At
        ];
        ws['!cols'] = columnWidths;
        
        XLSX.writeFile(wb, `dg-proformas-${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Proformas exported successfully');
      }
    } catch (error) {
      console.error('Error exporting proformas:', error);
      toast.error('Failed to export proformas');
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="DG Proforma Management"
        subtitle="Manage DG Proformas and track their status"
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
                placeholder="Search proformas..."
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
            <Button
              onClick={() => navigate('/dg-proforma/create')}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Proforma
            </Button>
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

      {/* Proformas Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Proforma Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex items-center justify-center">
                      <Clock className="w-5 h-5 mr-2 animate-spin" />
                      Loading proformas...
                    </div>
                  </td>
                </tr>
              ) : proformas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <Package className="w-12 h-12 text-gray-300 mb-4" />
                      <p className="text-lg font-medium">No proformas found</p>
                      <p className="text-sm">Create your first proforma to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                proformas.map((proforma) => (
                  <tr key={proforma._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {proforma.proformaNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {proforma.items.length} item(s)
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {proforma.customer.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {proforma.customerEmail}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">
                          {formatDate(proforma.proformaDate)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Valid until: {formatDate(proforma.validUntil)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(proforma.status)}`}>
                          {proforma.status}
                        </span>
                        <br />
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(proforma.paymentStatus)}`}>
                          {proforma.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(proforma.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {proforma.paymentTerms}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewProforma(proforma)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditProforma(proforma)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProforma(proforma._id)}
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
      {showViewModal && selectedProforma && (
        <DGProformaViewModal
          proforma={selectedProforma}
          onClose={() => {
            setShowViewModal(false);
            setSelectedProforma(null);
          }}
        />
      )}

    </div>
  );
};

export default DGProformaManagement;