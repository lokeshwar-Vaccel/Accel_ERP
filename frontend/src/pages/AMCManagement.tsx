import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  Edit,
  Trash2,
  Eye,
  Bell,
  CalendarDays,
  TrendingUp,
  Building,
  Package,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';

// Types matching backend structure
type AMCStatus = 'active' | 'expired' | 'cancelled' | 'pending';
type VisitStatus = 'pending' | 'completed' | 'cancelled';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName?: string;
}

interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  customerType: string;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  specifications?: Record<string, any>;
}

interface VisitSchedule {
  _id?: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string | User;
  status: VisitStatus;
  notes?: string;
}

interface AMC {
  _id: string;
  contractNumber: string;
  customer: string | Customer;
  products: string[] | Product[];
  startDate: string;
  endDate: string;
  contractValue: number;
  scheduledVisits: number;
  completedVisits: number;
  status: AMCStatus;
  nextVisitDate?: string;
  visitSchedule: VisitSchedule[];
  terms?: string;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  remainingVisits?: number;
  contractDuration?: number;
  daysUntilExpiry?: number;
  completionPercentage?: number;
}

interface AMCFormData {
  customer: string;
  products: string[];
  startDate: string;
  endDate: string;
  contractValue: number;
  scheduledVisits: number;
  terms: string;
}

const AMCManagement: React.FC = () => {
  // Core state
  const [amcs, setAmcs] = useState<AMC[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AMCStatus | 'all'>('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  
  // Selected data
  const [selectedAMC, setSelectedAMC] = useState<AMC | null>(null);
  const [editingAMC, setEditingAMC] = useState<AMC | null>(null);
  
  // Form data
  const [amcFormData, setAmcFormData] = useState<AMCFormData>({
    customer: '',
    products: [],
    startDate: '',
    endDate: '',
    contractValue: 0,
    scheduledVisits: 4,
    terms: ''
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAMCs(),
        fetchCustomers(),
        fetchProducts()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAMCs = async () => {
    try {
      console.log('Fetching AMCs from API...');
      const response = await apiClient.amc.getAll();
      console.log('AMC API Response:', response);
      
      // Handle response format - API returns { success: boolean; data: { contracts: any[] }; pagination: any }
      let amcData: AMC[] = [];
      if (response.success && response.data) {
        const data = response.data as any;
        if (data.contracts && Array.isArray(data.contracts)) {
          amcData = data.contracts;
          console.log('Found AMC data:', amcData.length, 'contracts');
        } else if (Array.isArray(response.data)) {
          // Fallback for different response format
          amcData = response.data;
          console.log('Found AMC data (fallback format):', amcData.length, 'contracts');
        } else {
          console.log('Unexpected response format for AMC data:', response.data);
        }
      } else {
        console.log('No AMC data in response or unsuccessful response');
      }
      
      setAmcs(amcData);
      
      // Only show fallback data if there's no real data
      if (amcData.length === 0) {
        console.log('No AMC data found, showing empty state instead of mock data');
      }
    } catch (error) {
      console.error('Error fetching AMCs:', error);
      console.log('API call failed, showing empty state instead of mock data');
      // Don't show fallback data - show the actual error state
      setAmcs([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers from API...');
      const response = await apiClient.customers.getAll();
      console.log('Customers API Response:', response);
      
      let customersData: Customer[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        customersData = response.data;
        console.log('Found customers:', customersData.length);
      } else {
        console.log('No customer data or unexpected format:', response);
      }
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('Fetching products from API...');
      const response = await apiClient.products.getAll();
      console.log('Products API Response:', response);
      
      let productsData: Product[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        productsData = response.data;
        console.log('Found products:', productsData.length);
      } else {
        console.log('No product data or unexpected format:', response);
      }
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  // Helper functions
  const getUserName = (user: string | User | undefined): string => {
    if (!user) return '';
    if (typeof user === 'string') return user;
    return user.fullName || `${user.firstName} ${user.lastName}` || user.email || '';
  };

  const getCustomerName = (customer: string | Customer | undefined): string => {
    if (!customer) return '';
    if (typeof customer === 'string') return customer;
    return customer.name || '';
  };

  const getProductName = (product: string | Product | undefined): string => {
    if (!product) return '';
    if (typeof product === 'string') return product;
    return product.name || '';
  };

  const handleCreateAMC = () => {
    setAmcFormData({
      customer: '',
      products: [],
      startDate: '',
      endDate: '',
      contractValue: 0,
      scheduledVisits: 4,
      terms: ''
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleEditAMC = (amc: AMC) => {
    setEditingAMC(amc);
    setAmcFormData({
      customer: typeof amc.customer === 'string' ? amc.customer : amc.customer._id,
      products: Array.isArray(amc.products) ? amc.products.map(p => typeof p === 'string' ? p : p._id) : [],
      startDate: amc.startDate.split('T')[0],
      endDate: amc.endDate.split('T')[0],
      contractValue: amc.contractValue,
      scheduledVisits: amc.scheduledVisits,
      terms: amc.terms || ''
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleDeleteAMC = async (amc: AMC) => {
    if (window.confirm('Are you sure you want to delete this AMC contract?')) {
      try {
        await apiClient.amc.delete(amc._id);
        setAmcs(amcs.filter(a => a._id !== amc._id));
      } catch (error) {
        console.error('Error deleting AMC:', error);
      }
    }
  };

  const openDetailsModal = (amc: AMC) => {
    setSelectedAMC(amc);
    setShowDetailsModal(true);
  };

  const validateAMCForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!amcFormData.customer) {
      errors.customer = 'Customer is required';
    }
    if (amcFormData.products.length === 0) {
      errors.products = 'At least one product is required';
    }
    if (!amcFormData.startDate) {
      errors.startDate = 'Start date is required';
    }
    if (!amcFormData.endDate) {
      errors.endDate = 'End date is required';
    }
    if (amcFormData.startDate && amcFormData.endDate && new Date(amcFormData.endDate) <= new Date(amcFormData.startDate)) {
      errors.endDate = 'End date must be after start date';
    }
    if (amcFormData.contractValue <= 0) {
      errors.contractValue = 'Contract value must be greater than 0';
    }
    if (amcFormData.scheduledVisits <= 0) {
      errors.scheduledVisits = 'Scheduled visits must be greater than 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAMC = async () => {
    if (!validateAMCForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      const response = await apiClient.amc.create(amcFormData);
      setAmcs([...amcs, response.data]);
      setShowAddModal(false);
      resetAMCForm();
    } catch (error: any) {
      console.error('Error creating AMC:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to create AMC contract' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAMC = async () => {
    if (!validateAMCForm() || !editingAMC) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      const response = await apiClient.amc.update(editingAMC._id, amcFormData);
      setAmcs(amcs.map(a => a._id === editingAMC._id ? response.data : a));
      setShowEditModal(false);
      setEditingAMC(null);
      resetAMCForm();
    } catch (error: any) {
      console.error('Error updating AMC:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to update AMC contract' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetAMCForm = () => {
    setAmcFormData({
      customer: '',
      products: [],
      startDate: '',
      endDate: '',
      contractValue: 0,
      scheduledVisits: 4,
      terms: ''
    });
  };

  const filteredAMCs = amcs.filter(amc => {
    // Handle potential undefined customer gracefully
    const customerName = getCustomerName(amc.customer);
    const matchesSearch = amc.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || amc.status === statusFilter;
    const matchesCustomer = customerFilter === 'all' || 
                           (amc.customer && typeof amc.customer === 'object' && amc.customer._id === customerFilter);
    
    return matchesSearch && matchesStatus && matchesCustomer;
  });

  const getStatusColor = (status: AMCStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: AMCStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'expired':
        return <AlertTriangle className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Get expiring contracts (within 30 days)
  const getExpiringContracts = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return amcs.filter(amc => {
      const endDate = new Date(amc.endDate);
      return endDate <= thirtyDaysFromNow && amc.status === 'active';
    });
  };

  const stats = [
    {
      title: 'Total AMCs',
      value: amcs.length.toString(),
      icon: <FileText className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Active Contracts',
      value: amcs.filter(amc => amc.status === 'active').length.toString(),
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'Expiring Soon',
      value: getExpiringContracts().length.toString(),
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'orange'
    },
    {
      title: 'Total Value',
      value: formatCurrency(amcs.reduce((sum, amc) => sum + amc.contractValue, 0)),
      icon: <DollarSign className="w-6 h-6" />,
      color: 'purple'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="Annual Maintenance Contracts"
        subtitle="Manage AMC contracts, visits, and renewals"
      >
        <div className="flex space-x-3">
          <button
            onClick={() => setShowExpiryModal(true)}
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 hover:from-orange-700 hover:to-orange-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Bell className="w-5 h-5" />
            <span>Expiry Alerts</span>
          </button>
          <button
            onClick={handleCreateAMC}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            <span>New AMC Contract</span>
          </button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg bg-${stat.color}-100 text-${stat.color}-600`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search AMC contracts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AMCStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
              <option value="pending">Pending</option>
            </select>

            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Customers</option>
              {customers.map(customer => (
                <option key={customer._id} value={customer._id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Showing {filteredAMCs.length} of {amcs.length} contracts
            </span>
          </div>
        </div>
      </div>

      {/* AMC Contracts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value & Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Visit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">Loading AMC contracts...</td>
                </tr>
              ) : filteredAMCs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">No AMC contracts found</td>
                </tr>
              ) : (
                filteredAMCs.map((amc) => (
                  <tr key={amc._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-blue-600">{amc.contractNumber}</div>
                        <div className="text-sm text-gray-500">
                          {formatDate(amc.startDate)} - {formatDate(amc.endDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{getCustomerName(amc.customer)}</div>
                        {typeof amc.customer === 'object' && amc.customer.phone && (
                          <div className="text-sm text-gray-500">{amc.customer.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {Array.isArray(amc.products) ? (
                          <div>
                            <div className="font-medium">{amc.products.length} product(s)</div>
                            <div className="text-gray-500 text-xs">
                              {amc.products.slice(0, 2).map(p => getProductName(p)).join(', ')}
                              {amc.products.length > 2 && '...'}
                            </div>
                          </div>
                        ) : (
                          <span>No products</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(amc.contractValue)}</div>
                        <div className="text-sm text-gray-500">
                          {amc.daysUntilExpiry ? `${amc.daysUntilExpiry} days left` : 'Expired'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {amc.completedVisits}/{amc.scheduledVisits}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${(amc.completedVisits / amc.scheduledVisits) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(amc.status)}`}>
                        {getStatusIcon(amc.status)}
                        <span className="ml-1 capitalize">{amc.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {amc.nextVisitDate ? (
                        <div>
                          <div className="font-medium">{formatDate(amc.nextVisitDate)}</div>
                          <div className="text-xs text-gray-500">
                            {Math.ceil((new Date(amc.nextVisitDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No upcoming visit</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openDetailsModal(amc)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditAMC(amc)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                          title="Edit Contract"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAMC(amc)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete Contract"
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
      </div>

      {/* Add AMC Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create AMC Contract</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitAMC(); }} className="p-6 space-y-4">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer *
                  </label>
                  <select
                    value={amcFormData.customer}
                    onChange={(e) => setAmcFormData({ ...amcFormData, customer: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.customer ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.customer && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.customer}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Visits *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={amcFormData.scheduledVisits}
                    onChange={(e) => setAmcFormData({ ...amcFormData, scheduledVisits: Number(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.scheduledVisits ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Number of visits"
                  />
                  {formErrors.scheduledVisits && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.scheduledVisits}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Products *
                </label>
                <select
                  multiple
                  value={amcFormData.products}
                  onChange={(e) => {
                    const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                    setAmcFormData({ ...amcFormData, products: selectedValues });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32 ${
                    formErrors.products ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.category})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple products</p>
                {formErrors.products && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.products}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={amcFormData.startDate}
                    onChange={(e) => setAmcFormData({ ...amcFormData, startDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.startDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={amcFormData.endDate}
                    onChange={(e) => setAmcFormData({ ...amcFormData, endDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.endDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Value (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={amcFormData.contractValue}
                  onChange={(e) => setAmcFormData({ ...amcFormData, contractValue: Number(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.contractValue ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter contract value"
                />
                {formErrors.contractValue && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.contractValue}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  value={amcFormData.terms}
                  onChange={(e) => setAmcFormData({ ...amcFormData, terms: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter contract terms and conditions..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit AMC Modal */}
      {showEditModal && editingAMC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit AMC Contract</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdateAMC(); }} className="p-6 space-y-4">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer *
                  </label>
                  <select
                    value={amcFormData.customer}
                    onChange={(e) => setAmcFormData({ ...amcFormData, customer: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.customer ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.customer && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.customer}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Visits *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={amcFormData.scheduledVisits}
                    onChange={(e) => setAmcFormData({ ...amcFormData, scheduledVisits: Number(e.target.value) })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.scheduledVisits ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Number of visits"
                  />
                  {formErrors.scheduledVisits && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.scheduledVisits}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Products *
                </label>
                <select
                  multiple
                  value={amcFormData.products}
                  onChange={(e) => {
                    const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                    setAmcFormData({ ...amcFormData, products: selectedValues });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32 ${
                    formErrors.products ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.category})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple products</p>
                {formErrors.products && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.products}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={amcFormData.startDate}
                    onChange={(e) => setAmcFormData({ ...amcFormData, startDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.startDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={amcFormData.endDate}
                    onChange={(e) => setAmcFormData({ ...amcFormData, endDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.endDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Value (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={amcFormData.contractValue}
                  onChange={(e) => setAmcFormData({ ...amcFormData, contractValue: Number(e.target.value) })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.contractValue ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter contract value"
                />
                {formErrors.contractValue && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.contractValue}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  value={amcFormData.terms}
                  onChange={(e) => setAmcFormData({ ...amcFormData, terms: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter contract terms and conditions..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AMC Details Modal */}
      {showDetailsModal && selectedAMC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedAMC.contractNumber}</h2>
                <p className="text-gray-600">AMC Contract Details</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="pl-2 pr-6 py-6 space-y-6">
              {/* Contract Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Customer Information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Customer Details
                  </h3>
                  {typeof selectedAMC.customer === 'object' ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600">Name</p>
                        <p className="font-medium">{selectedAMC.customer.name}</p>
                      </div>
                      {selectedAMC.customer.email && (
                        <div>
                          <p className="text-sm text-gray-600">Email</p>
                          <p className="font-medium">{selectedAMC.customer.email}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium">{selectedAMC.customer.phone}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-medium text-sm">{selectedAMC.customer.address}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                          {selectedAMC.customer.customerType}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Customer information not available</p>
                  )}
                </div>

                {/* Contract Information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Contract Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedAMC.status)}`}>
                        {getStatusIcon(selectedAMC.status)}
                        <span className="ml-1 capitalize">{selectedAMC.status}</span>
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contract Value</p>
                      <p className="font-medium text-lg">{formatCurrency(selectedAMC.contractValue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Duration</p>
                      <p className="font-medium">{formatDate(selectedAMC.startDate)} - {formatDate(selectedAMC.endDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Days Remaining</p>
                      <p className="font-medium">{selectedAMC.daysUntilExpiry || 0} days</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Created By</p>
                      <p className="font-medium">{getUserName(selectedAMC.createdBy)}</p>
                    </div>
                  </div>
                </div>

                {/* Visit Progress */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Visit Progress
                  </h3>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {selectedAMC.completedVisits}/{selectedAMC.scheduledVisits}
                      </div>
                      <p className="text-sm text-gray-600">Visits Completed</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(selectedAMC.completedVisits / selectedAMC.scheduledVisits) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        {selectedAMC.completionPercentage || Math.round((selectedAMC.completedVisits / selectedAMC.scheduledVisits) * 100)}% Complete
                      </p>
                    </div>
                    {selectedAMC.nextVisitDate && (
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Next Visit</p>
                        <p className="font-medium">{formatDate(selectedAMC.nextVisitDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Products Covered */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Products Covered
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.isArray(selectedAMC.products) && selectedAMC.products.map((product, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">{getProductName(product)}</h4>
                      {typeof product === 'object' && (
                        <div className="mt-2 space-y-1">
                          {product.category && (
                            <p className="text-xs text-gray-600">Category: {product.category}</p>
                          )}
                          {product.brand && (
                            <p className="text-xs text-gray-600">Brand: {product.brand}</p>
                          )}
                          {product.modelNumber && (
                            <p className="text-xs text-gray-600">Model: {product.modelNumber}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Visit Schedule */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CalendarDays className="w-5 h-5 mr-2" />
                  Visit Schedule
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scheduled Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completed Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned To
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedAMC.visitSchedule.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No visits scheduled yet
                          </td>
                        </tr>
                      ) : (
                        selectedAMC.visitSchedule.map((visit, index) => (
                          <tr key={visit._id || index}>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(visit.scheduledDate)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {visit.completedDate ? formatDate(visit.completedDate) : '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {getUserName(visit.assignedTo) || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                                visit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {visit.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {visit.notes || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Terms & Conditions */}
              {selectedAMC.terms && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Terms & Conditions</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAMC.terms}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEditAMC(selectedAMC);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Contract</span>
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Schedule Visit</span>
                </button>
                <button
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Report</span>
                </button>
                {selectedAMC.status === 'active' && selectedAMC.daysUntilExpiry && selectedAMC.daysUntilExpiry <= 60 && (
                  <button
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Renew Contract</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Alerts Modal */}
      {showExpiryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Contract Expiry Alerts</h2>
              <button
                onClick={() => setShowExpiryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {getExpiringContracts().length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Good!</h3>
                  <p className="text-gray-600">No contracts expiring in the next 30 days.</p>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {getExpiringContracts().length} contract(s) expiring soon
                    </h3>
                    <p className="text-gray-600">Contracts expiring within the next 30 days</p>
                  </div>
                  <div className="space-y-3">
                    {getExpiringContracts().map((amc) => (
                      <div key={amc._id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{amc.contractNumber}</h4>
                            <p className="text-sm text-gray-600">{getCustomerName(amc.customer)}</p>
                            <p className="text-sm text-orange-700">
                              Expires on {formatDate(amc.endDate)} ({amc.daysUntilExpiry} days left)
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => openDetailsModal(amc)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                            >
                              View Details
                            </button>
                            <button
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Renew
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AMCManagement; 