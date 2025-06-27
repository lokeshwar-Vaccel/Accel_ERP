import React, { useState, useEffect } from 'react';
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
  Package
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import { Modal } from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { apiClient } from '../utils/api';

// Types
interface Invoice {
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
  totalAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
  invoiceType: 'sale' | 'service' | 'amc' | 'other';
  items: InvoiceItem[];
}

interface InvoiceItem {
  product: {
    _id: string;
    name: string;
    price: number;
  };
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  taxAmount: number;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  category: string;
  brand: string;
}

interface StockLocationData {
  _id: string;
  name: string;
  address: string;
  type: string;
  contactPerson?: string;
  phone?: string;
  isActive: boolean;
}

interface InvoiceStats {
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
}

const InvoiceManagement: React.FC = () => {
  // State management
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocationData[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
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

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Form states
  const [newInvoice, setNewInvoice] = useState({
    customer: '',
    dueDate: '',
    invoiceType: 'sale',
    location: '',
    notes: '',
    items: [
      {
        product: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 18
      }
    ],
    discountAmount: 0,
    reduceStock: true
  });

  // Stock validation states
  const [stockValidation, setStockValidation] = useState<Record<number, {
    available: number;
    isValid: boolean;
    message: string;
  }>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Initialize data
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInvoices(),
        fetchCustomers(),
        fetchProducts(),
        fetchLocations(),
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
      const response = await apiClient.invoices.getAll();
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll();
      const responseData = response.data as any;
      const customersData = responseData.customers || responseData || [];
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll();
      const responseData = response.data as any;
      const productsData = responseData.products || responseData || [];
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await apiClient.stock.getLocations();
      let locationsData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          locationsData = response.data;
        } else if ((response.data as any).locations && Array.isArray((response.data as any).locations)) {
          locationsData = (response.data as any).locations;
        }
      }
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.invoices.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateInvoice = () => {
    setNewInvoice({
      customer: '',
      dueDate: '',
      invoiceType: 'sale',
      location: '',
      notes: '',
      items: [
        {
          product: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 18
        }
      ],
      discountAmount: 0,
      reduceStock: true
    });
    setStockValidation({});
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  const addInvoiceItem = () => {
    setNewInvoice({
      ...newInvoice,
      items: [
        ...newInvoice.items,
        {
          product: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 18
        }
      ]
    });
  };

  const removeInvoiceItem = (index: number) => {
    const updatedItems = newInvoice.items.filter((_, i) => i !== index);
    setNewInvoice({ ...newInvoice, items: updatedItems });
  };

  const updateInvoiceItem = (index: number, field: string, value: any) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Auto-populate price when product is selected
    if (field === 'product') {
      const product = products.find(p => p._id === value);
      if (product) {
        updatedItems[index].unitPrice = product.price;
        updatedItems[index].description = product.name;
      }
      // Validate stock when product or quantity changes
      validateStockForItem(index, value, updatedItems[index].quantity);
    }

    // Validate stock when quantity changes
    if (field === 'quantity') {
      validateStockForItem(index, updatedItems[index].product, value);
    }

    setNewInvoice({ ...newInvoice, items: updatedItems });
  };

  // Validate stock availability for a specific item
  const validateStockForItem = async (itemIndex: number, productId: string, quantity: number) => {
    if (!productId || !newInvoice.location || quantity <= 0) {
      setStockValidation(prev => ({
        ...prev,
        [itemIndex]: { available: 0, isValid: true, message: '' }
      }));
      return;
    }

    try {
      const response = await apiClient.stock.getStock({ 
        product: productId, 
        location: newInvoice.location 
      });
      
      let stockData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          stockData = response.data;
        } else if (response.data.stockLevels && Array.isArray(response.data.stockLevels)) {
          stockData = response.data.stockLevels;
        }
      }

      const stockItem = stockData.length > 0 ? stockData[0] : null;
      const available = stockItem ? (stockItem.availableQuantity || (stockItem.quantity - (stockItem.reservedQuantity || 0))) : 0;
      
      const isValid = quantity <= available;
      const message = !isValid 
        ? `Only ${available} units available` 
        : `${available} units available`;

      setStockValidation(prev => ({
        ...prev,
        [itemIndex]: { available, isValid, message }
      }));
    } catch (error) {
      console.error('Error validating stock:', error);
      setStockValidation(prev => ({
        ...prev,
        [itemIndex]: { available: 0, isValid: false, message: 'Unable to check stock' }
      }));
    }
  };

  // Validate entire form including stock
  const validateInvoiceForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newInvoice.customer) {
      errors.customer = 'Customer is required';
    }
    if (!newInvoice.dueDate) {
      errors.dueDate = 'Due date is required';
    }
    if (!newInvoice.location) {
      errors.location = 'Location is required';
    }
    if (newInvoice.items.length === 0) {
      errors.items = 'At least one item is required';
    }

    // Validate each item
    newInvoice.items.forEach((item, index) => {
      if (!item.product) {
        errors[`item_${index}_product`] = 'Product is required';
      }
      if (item.quantity <= 0) {
        errors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice < 0) {
        errors[`item_${index}_price`] = 'Price cannot be negative';
      }

      // Check stock validation if stock reduction is enabled
      if (newInvoice.reduceStock && stockValidation[index] && !stockValidation[index].isValid) {
        errors[`item_${index}_stock`] = stockValidation[index].message;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateItemTotal = (item: any) => {
    return item.quantity * item.unitPrice;
  };

  const calculateSubtotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateTotalTax = () => {
    return newInvoice.items.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item);
      return sum + (itemTotal * (item.taxRate || 0) / 100);
    }, 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateTotalTax() - (newInvoice.discountAmount || 0);
  };

  const handleSubmitInvoice = async () => {
    if (!validateInvoiceForm()) return;

    setSubmitting(true);
    try {
      const invoiceData = {
        ...newInvoice,
        dueDate: new Date(newInvoice.dueDate).toISOString(),
        items: newInvoice.items.map(item => ({
          ...item,
          totalPrice: calculateItemTotal(item),
          taxAmount: calculateItemTotal(item) * (item.taxRate || 0) / 100
        }))
      };

      await apiClient.invoices.create(invoiceData);
      await fetchInvoices();
      await fetchStats();
      setShowCreateModal(false);
      setStockValidation({}); // Clear stock validation
      setFormErrors({}); // Clear form errors
    } catch (error) {
      console.error('Error creating invoice:', error);
      setFormErrors({ general: 'Failed to create invoice. Please try again.' });
    } finally {
      setSubmitting(false);
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
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || invoice.paymentStatus === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

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
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'purple'
    }
  ];

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      <PageHeader 
        title="Invoice Management"
        subtitle="Create and manage customer invoices"
      >
        <Button
          onClick={handleCreateInvoice}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">{stat.title}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg bg-${stat.color}-100 text-${stat.color}-600`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Payments</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </span>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading invoices...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No invoices found</td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{invoice.customer.name}</div>
                        <div className="text-xs text-gray-500">{invoice.customer.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(invoice.issueDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ₹{invoice.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                        {invoice.paymentStatus.charAt(0).toUpperCase() + invoice.paymentStatus.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewInvoice(invoice)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Invoice</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Form Errors */}
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              {/* Customer and Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer *
                  </label>
                  <select
                    value={newInvoice.customer}
                    onChange={(e) => setNewInvoice({ ...newInvoice, customer: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.customer ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select customer</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>
                        {customer.name} - {customer.email}
                      </option>
                    ))}
                  </select>
                  {formErrors.customer && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.customer}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <select
                    value={newInvoice.location}
                    onChange={(e) => {
                      setNewInvoice({ ...newInvoice, location: e.target.value });
                      // Re-validate all items when location changes
                      newInvoice.items.forEach((item, index) => {
                        if (item.product) {
                          validateStockForItem(index, item.product, item.quantity);
                        }
                      });
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.location ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select location</option>
                    {locations.map((location) => (
                      <option key={location._id} value={location._id}>
                        {location.name} - {location.type.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  {formErrors.location && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.dueDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    required
                  />
                  {formErrors.dueDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.dueDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Type
                  </label>
                  <select
                    value={newInvoice.invoiceType}
                    onChange={(e) => setNewInvoice({ ...newInvoice, invoiceType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="sale">Sale</option>
                    <option value="service">Service</option>
                    <option value="amc">AMC</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {/* Stock Reduction Option */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={newInvoice.reduceStock}
                    onChange={(e) => setNewInvoice({ ...newInvoice, reduceStock: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-blue-900">Reduce inventory stock</div>
                    <div className="text-xs text-blue-700">Automatically reduce stock quantities when invoice is created</div>
                  </div>
                </label>
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
                  <button
                    onClick={addInvoiceItem}
                    type="button"
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {newInvoice.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product
                          </label>
                          <select
                            value={item.product}
                            onChange={(e) => updateInvoiceItem(index, 'product', e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              formErrors[`item_${index}_product`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select product</option>
                            {products.map(product => (
                              <option key={product._id} value={product._id}>
                                {product.name} - ₹{product.price.toLocaleString()}
                              </option>
                            ))}
                          </select>
                          {formErrors[`item_${index}_product`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_product`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                            {stockValidation[index] && (
                              <span className={`ml-2 text-xs ${
                                stockValidation[index].isValid ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ({stockValidation[index].message})
                              </span>
                            )}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              formErrors[`item_${index}_quantity`] || formErrors[`item_${index}_stock`] ? 'border-red-500' : 
                              stockValidation[index] && !stockValidation[index].isValid ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {formErrors[`item_${index}_quantity`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_quantity`]}</p>
                          )}
                          {formErrors[`item_${index}_stock`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_stock`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                              formErrors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          />
                          {formErrors[`item_${index}_price`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_price`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tax (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.taxRate}
                            onChange={(e) => updateInvoiceItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="flex items-end">
                          <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium">
                              ₹{calculateItemTotal(item).toLocaleString()}
                            </div>
                          </div>
                          {newInvoice.items.length > 1 && (
                            <button
                              onClick={() => removeInvoiceItem(index)}
                              type="button"
                              className="ml-2 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Stock Status Display */}
                      {newInvoice.reduceStock && newInvoice.location && item.product && (
                        <div className={`mt-3 p-3 rounded-lg border ${
                          stockValidation[index] 
                            ? stockValidation[index].isValid 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center space-x-2 text-sm">
                            <Package className="w-4 h-4" />
                            <span className="font-medium">Stock Status:</span>
                            {stockValidation[index] ? (
                              <span className={stockValidation[index].isValid ? 'text-green-700' : 'text-red-700'}>
                                {stockValidation[index].message}
                              </span>
                            ) : (
                              <span className="text-gray-500">Checking...</span>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Item description"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Additional notes or terms..."
                />
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{calculateSubtotal().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Tax:</span>
                      <span className="font-medium">₹{calculateTotalTax().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-gray-600">Discount:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newInvoice.discountAmount}
                          onChange={(e) => setNewInvoice({ ...newInvoice, discountAmount: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-3">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">₹{calculateGrandTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {newInvoice.items.length} item(s) • Total: ₹{calculateGrandTotal().toLocaleString()}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitInvoice}
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Create Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {showViewModal && selectedInvoice && (
        <Modal
          title={`Invoice ${selectedInvoice.invoiceNumber}`}
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          size="xl"
        >
          <div className="space-y-6">
            {/* Invoice Header */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Invoice #{selectedInvoice.invoiceNumber}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Issue Date: {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    Due Date: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex space-x-2 mb-2">
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                      {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                    </span>
                    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(selectedInvoice.paymentStatus)}`}>
                      {selectedInvoice.paymentStatus.charAt(0).toUpperCase() + selectedInvoice.paymentStatus.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Bill To:</h4>
              <div className="text-sm text-gray-600">
                <p className="font-medium">{selectedInvoice.customer.name}</p>
                <p>{selectedInvoice.customer.email}</p>
                <p>{selectedInvoice.customer.phone}</p>
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Items:</h4>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">₹{item.unitPrice.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.taxRate}%</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">₹{item.totalPrice.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Invoice Total */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-right">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>₹{selectedInvoice.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default InvoiceManagement; 