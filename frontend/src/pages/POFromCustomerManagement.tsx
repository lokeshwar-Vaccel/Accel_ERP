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
import POFromCustomerViewModal from '../components/ui/POFromCustomerViewModal';
import { Button } from 'components/ui/Botton';
import * as XLSX from 'xlsx';

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB');
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string; color: string }> = ({ status, color }) => {
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    orange: 'bg-orange-100 text-orange-800',
    red: 'bg-red-100 text-red-800',
    purple: 'bg-purple-100 text-purple-800'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClasses[color as keyof typeof colorClasses] || colorClasses.gray}`}>
      {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </span>
  );
};

// Types
interface POFromCustomer {
  _id: string;
  poNumber: string;
  customer: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  customerEmail: string;
  customerAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  quotationNumber?: {
    _id: string;
    quotationNumber: string;
    issueDate: string;
    grandTotal: number;
    status: string;
  };
  items: Array<{
    product: {
      _id: string;
      name: string;
      partNo: string;
      hsnNumber?: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate: number;
  }>;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'draft' | 'sent_to_customer' | 'customer_approved' | 'in_production' | 'ready_for_delivery' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  department: 'retail' | 'corporate' | 'industrial_marine' | 'others';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

const POFromCustomerManagement: React.FC = () => {
  const navigate = useNavigate();

  // State management
  const [poFromCustomers, setPOFromCustomers] = useState<POFromCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(10);

  // Filter dropdown states
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showDepartmentFilter, setShowDepartmentFilter] = useState(false);
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<POFromCustomer | null>(null);

  // Status options
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent_to_customer', label: 'Sent to Customer' },
    { value: 'customer_approved', label: 'Customer Approved' },
    { value: 'in_production', label: 'In Production' },
    { value: 'ready_for_delivery', label: 'Ready for Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const departmentOptions = [
    { value: 'all', label: 'All Departments' },
    { value: 'retail', label: 'Retail' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'industrial_marine', label: 'Industrial & Marine' },
    { value: 'others', label: 'Others' }
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' }
  ];

  // Fetch PO from customers
  const fetchPOFromCustomers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit,
        search: searchTerm,
      };

      if (statusFilter !== 'all') params.status = statusFilter;
      if (departmentFilter !== 'all') params.department = departmentFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (fromDate) params.startDate = fromDate;
      if (toDate) params.endDate = toDate;

      const response = await apiClient.poFromCustomers.getAll(params);
      
      if (response.success) {
        setPOFromCustomers(response.data || []);
        setTotalPages(response.pagination?.pages || 1);
        setTotalCount(response.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching PO from customers:', error);
      toast.error('Failed to fetch PO from customers');
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    fetchPOFromCustomers();
  }, [currentPage, searchTerm, statusFilter, departmentFilter, priorityFilter, fromDate, toDate]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowStatusFilter(false);
        setShowDepartmentFilter(false);
        setShowPriorityFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close other dropdowns when one is opened
  const handleDropdownToggle = (dropdownType: 'status' | 'department' | 'priority') => {
    if (dropdownType === 'status') {
      setShowStatusFilter(!showStatusFilter);
      setShowDepartmentFilter(false);
      setShowPriorityFilter(false);
    } else if (dropdownType === 'department') {
      setShowDepartmentFilter(!showDepartmentFilter);
      setShowStatusFilter(false);
      setShowPriorityFilter(false);
    } else if (dropdownType === 'priority') {
      setShowPriorityFilter(!showPriorityFilter);
      setShowStatusFilter(false);
      setShowDepartmentFilter(false);
    }
  };

  // Handlers
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchPOFromCustomers();
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDepartmentFilter('all');
    setPriorityFilter('all');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const handleCreatePO = () => {
    navigate('/po-from-customer/create');
  };

  const handleViewPO = (id: string) => {
    const po = poFromCustomers.find(p => p._id === id);
    if (po) {
      setSelectedPO(po);
      setShowViewModal(true);
    }
  };

  const handleEditPO = (id: string) => {
    navigate(`/po-from-customer/edit/${id}`);
  };

  const handleDeletePO = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this PO from customer?')) {
      try {
        const response = await apiClient.poFromCustomers.delete(id);
        if (response.success) {
          toast.success('PO from customer deleted successfully');
          fetchPOFromCustomers();
          setShowViewModal(false);
          setSelectedPO(null);
        }
      } catch (error) {
        console.error('Error deleting PO from customer:', error);
        toast.error('Failed to delete PO from customer');
      }
    }
  };

  const handleCloseModal = () => {
    setShowViewModal(false);
    setSelectedPO(null);
  };

  const handleEditFromModal = (id: string) => {
    setShowViewModal(false);
    setSelectedPO(null);
    navigate(`/po-from-customer/edit/${id}`);
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const response = await apiClient.poFromCustomers.updateStatus(id, { status: newStatus });
      if (response.success) {
        toast.success('Status updated successfully');
        fetchPOFromCustomers();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleExport = async () => {
    try {
      const loadingToast = toast.loading('Exporting PO from customers to Excel...');
      
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (departmentFilter !== 'all') params.department = departmentFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (fromDate) params.startDate = fromDate;
      if (toDate) params.endDate = toDate;

      const response = await apiClient.poFromCustomers.export(params);
      
      if (response.success) {
        // Convert to Excel format
        const blob = convertToExcel(response.data);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const currentDate = new Date().toISOString().split('T')[0];
        const filterSuffix = fromDate || toDate ? `_${fromDate || 'start'}_to_${toDate || 'end'}` : '';
        link.download = `po_from_customers_${currentDate}${filterSuffix}.xlsx`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast.dismiss(loadingToast);
        toast.success('PO from customers exported successfully!');
      }
    } catch (error) {
      console.error('Error exporting PO from customers:', error);
      toast.error('Failed to export PO from customers. Please try again.');
    }
  };

  // Convert data to Excel format
  const convertToExcel = (data: any[]) => {
    if (!data || data.length === 0) return new Blob([], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths for better display
    const columnWidths = [
      { wch: 8 },   // S.No
      { wch: 20 },  // PO Number
      { wch: 25 },  // Customer Name
      { wch: 30 },  // Customer Email
      { wch: 15 },  // Customer Phone
      { wch: 12 },  // Order Date
      { wch: 15 },  // Expected Delivery
      { wch: 15 },  // Status
      { wch: 12 },  // Department
      { wch: 10 },  // Priority
      { wch: 18 },  // Total Amount
      { wch: 15 },  // Paid Amount
      { wch: 18 },  // Remaining Amount
      { wch: 12 },  // Payment Status
      { wch: 20 },  // Created By
      { wch: 12 },  // Created At
    ];
    
    ws['!cols'] = columnWidths;
    
    // Set row heights for better readability
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let row = range.s.r; row <= range.e.r; row++) {
      ws[`!rows`] = ws[`!rows`] || [];
      ws[`!rows`][row] = { hpt: 20 }; // Set row height to 20 points
    }
    
    // Add header styling (bold headers)
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "4472C4" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "thin", color: { rgb: "000000" } },
          bottom: { style: "thin", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }

    // Add summary row
    const summaryRow = {
      'S.No': '',
      'PO Number': 'SUMMARY',
      'Customer Name': '',
      'Customer Email': '',
      'Customer Phone': '',
      'Order Date': '',
      'Expected Delivery': '',
      'Status': '',
      'Department': '',
      'Priority': '',
      'Total Amount': `₹${data.reduce((sum, item) => sum + (parseFloat(item['Total Amount']?.replace(/[₹,]/g, '')) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      'Paid Amount': `₹${data.reduce((sum, item) => sum + (parseFloat(item['Paid Amount']?.replace(/[₹,]/g, '')) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      'Remaining Amount': `₹${data.reduce((sum, item) => sum + (parseFloat(item['Remaining Amount']?.replace(/[₹,]/g, '')) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
      'Payment Status': '',
      'Created By': '',
      'Created At': ''
    };

    // Add summary row to worksheet
    XLSX.utils.sheet_add_json(ws, [summaryRow], { origin: -1, skipHeader: true });
    
    // Style the summary row
    const summaryRowRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = summaryRowRange.s.c; col <= summaryRowRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: data.length, c: col });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: "F2F2F2" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: {
          top: { style: "medium", color: { rgb: "000000" } },
          bottom: { style: "medium", color: { rgb: "000000" } },
          left: { style: "thin", color: { rgb: "000000" } },
          right: { style: "thin", color: { rgb: "000000" } }
        }
      };
    }
    
    // Add the worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'PO From Customers');
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { 
      bookType: 'xlsx', 
      type: 'array',
      cellStyles: true,
      compression: true
    });
    
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'gray';
      case 'sent_to_customer': return 'blue';
      case 'customer_approved': return 'green';
      case 'in_production': return 'yellow';
      case 'ready_for_delivery': return 'purple';
      case 'delivered': return 'green';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'gray';
      case 'medium': return 'blue';
      case 'high': return 'orange';
      case 'urgent': return 'red';
      default: return 'gray';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'red';
      case 'partial': return 'yellow';
      case 'paid': return 'green';
      case 'failed': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6 m-2">
      <PageHeader
        title="PO From Customer Management"
        subtitle="Manage purchase orders received from customers"
      >
                <div className="flex space-x-3">

        <button
          onClick={handleCreatePO}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create PO From Customer</span>
        </button>
          <Button
            onClick={() => navigate('/billing')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Billing</span>
          </Button>
        </div>
      </PageHeader>

      {/* Compact Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-visible">
        <form onSubmit={handleSearch} id="search-form">
        {/* Row 1: Search and Basic Filters */}
        <div className="p-4 border-b border-gray-100 relative">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search PO number, customer, notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              />
            </div>

            {/* Status Filter */}
            <div className="relative dropdown-container">
              <button
                type="button"
                onClick={() => handleDropdownToggle('status')}
                className="flex items-center justify-between w-full min-w-[140px] px-3 py-2.5 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              >
                <span className="text-gray-700 truncate mr-2">{statusOptions.find(opt => opt.value === statusFilter)?.label}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showStatusFilter ? 'rotate-180' : ''}`} />
              </button>
              {showStatusFilter && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 min-w-[160px]">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(option.value);
                        setShowStatusFilter(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm whitespace-nowrap ${statusFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Department Filter */}
            <div className="relative dropdown-container">
              <button
                type="button"
                onClick={() => handleDropdownToggle('department')}
                className="flex items-center justify-between w-full min-w-[140px] px-3 py-2.5 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              >
                <span className="text-gray-700 truncate mr-2">{departmentOptions.find(opt => opt.value === departmentFilter)?.label}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showDepartmentFilter ? 'rotate-180' : ''}`} />
              </button>
              {showDepartmentFilter && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                  {departmentOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setDepartmentFilter(option.value);
                        setShowDepartmentFilter(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm whitespace-nowrap ${departmentFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Priority Filter */}
            <div className="relative dropdown-container">
              <button
                type="button"
                onClick={() => handleDropdownToggle('priority')}
                className="flex items-center justify-between w-full min-w-[140px] px-3 py-2.5 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              >
                <span className="text-gray-700 truncate mr-2">{priorityOptions.find(opt => opt.value === priorityFilter)?.label}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showPriorityFilter ? 'rotate-180' : ''}`} />
              </button>
              {showPriorityFilter && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                  {priorityOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setPriorityFilter(option.value);
                        setShowPriorityFilter(false);
                      }}
                      className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors text-sm whitespace-nowrap ${priorityFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Date Filters and Actions */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range Filter */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Date Range:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  placeholder="From Date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                <span className="text-gray-500 text-sm">to</span>
                <input
                  type="date"
                  placeholder="To Date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
                {(fromDate || toDate) && (
                  <button
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                    }}
                    className="flex items-center gap-1 px-2 py-2 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-gray-600 border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                <span>Clear</span>
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
              <button
                type="submit"
                form="search-form"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg flex items-center space-x-2 transition-colors text-sm"
              >
                <Search className="w-4 h-4" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 3: Results Summary */}
        <div className="px-4 py-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Showing <span className="">{poFromCustomers.length}</span> of {totalCount} PO results
            </span>
            <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          </div>
        </div>
        </form>
      </div>

      {/* Results Summary */}
      {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {poFromCustomers.length} of {totalCount} PO from customers
          </div>
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      </div> */}

      {/* PO From Customers Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        ) : poFromCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No PO from customers found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first PO from customer.</p>
            
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PO Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quotation Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {poFromCustomers.map((po) => (
                  <tr key={po._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{po.poNumber}</div>
                      <div className="text-sm text-gray-500">{po.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {po.quotationNumber ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{po.quotationNumber.quotationNumber}</div>
                          <div className="text-sm text-gray-500">
                            {formatDate(po.quotationNumber.issueDate)} • ₹{po.quotationNumber.grandTotal?.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic">No quotation</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{po.customer.name}</div>
                      <div className="text-sm text-gray-500">{po.customer.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(po.orderDate)}</div>
                      {po.expectedDeliveryDate && (
                        <div className="text-sm text-gray-500">
                          Expected: {formatDate(po.expectedDeliveryDate)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        status={po.status}
                        color={getStatusColor(po.status)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        status={po.priority}
                        color={getPriorityColor(po.priority)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(po.totalAmount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        Paid: {formatCurrency(po.paidAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge
                        status={po.paymentStatus}
                        color={getPaymentStatusColor(po.paymentStatus)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewPO(po._id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditPO(po._id)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePO(po._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalCount}
          onPageChange={setCurrentPage}
        />
      )}

      {/* View Modal */}
      <POFromCustomerViewModal
        po={selectedPO}
        isOpen={showViewModal}
        onClose={handleCloseModal}
        onEdit={handleEditFromModal}
        onDelete={handleDeletePO}
      />
    </div>
  );
};

export default POFromCustomerManagement;
