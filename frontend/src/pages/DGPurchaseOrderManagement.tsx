import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Package,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  Truck,
  AlertTriangle,
  Edit,
  Eye,
  Send,
  X,
  FileText,
  Download,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Check,
  Ban,
  ChevronDown,
  Trash2,
  Users,
  IndianRupee
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import { Pagination } from 'components/ui/Pagination';
import toast from 'react-hot-toast';

// Types matching backend structure
type DGPurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled';

interface DGPOItem {
  product: string | {
    _id: string;
    name: string;
    category: string;
    brand?: string;
    modelNumber?: string;
    partNo?: string;
    price?: number;
    gst?: number;
  };
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  receivedQuantity?: number; // Track received quantities
  notes?: string;
}

interface DGPOItem1 {
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface DGPurchaseOrder {
  _id: string;
  poNumber: string;
  dgQuotation?: string;
  customer: {
    _id?: string;
    name: string;
    email: string;
    phone: string;
    pan?: string;
    corporateName?: string;
    address?: string;
    pinCode?: string;
    tehsil?: string;
    district?: string;
  };
  supplier: string;
  supplierEmail: string;
  supplierAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  items: DGPOItem[];
  totalAmount: number;
  status: DGPurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  shipDate?: string;
  docketNumber?: string;
  noOfPackages?: number;
  gstInvoiceNumber?: string;
  invoiceDate?: string;
  documentNumber?: string;
  documentDate?: string;
  notes?: string;
  terms?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdBy: string | {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  partNo?: string;
  price?: number;
  gst?: number;
  minStockLevel?: number;
  currentStock?: number;
  specifications?: Record<string, any>;
}

interface ReceiveItemsData {
  receivedItems: Array<{
    productId: string;
    quantityReceived: number;
    condition: 'good' | 'damaged' | 'defective';
    batchNumber?: string;
    notes?: string;
  }>;
  items: DGPOItem1[];
  location: string;
  receiptDate: string;
  inspectedBy: string;
  notes?: string;
  supplierName?: string;
  supplierEmail?: string;
  supplierAddress?: {
    address: string;
    state?: string;
    district?: string;
    pincode?: string;
  };
  externalInvoiceTotal?: number;
  // New shipping and documentation fields
  shipDate: string;
  docketNumber: string;
  noOfPackages: number;
  gstInvoiceNumber: string;
  invoiceDate: string;
  documentNumber: string;
  documentDate: string;
}

interface DGPOFormData {
  dgQuotation?: string;
  customer: {
    _id?: string;
    name: string;
    email: string;
    phone: string;
    pan?: string;
    corporateName?: string;
    address?: string;
    pinCode?: string;
    tehsil?: string;
    district?: string;
  };
  supplier: string;
  supplierEmail: string;
  supplierAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  expectedDeliveryDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  terms?: string;
  items: Array<{
    product: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    notes?: string;
  }>;
  poNumber?: string; // Added poNumber to formData
}

// Add supplier interface
interface Supplier {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  addresses?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  }[];
  contactPerson?: string;
  type?: string;
}

interface SupplierAddress {
  address: string;
  state: string;
  district: string;
  pincode: string;
}

interface StockLocation {
  _id: string;
  name: string;
  type: string;
}

const DGPurchaseOrderManagement: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // State management
  const [purchaseOrders, setPurchaseOrders] = useState<DGPurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<DGPurchaseOrderStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(10);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPO, setSelectedPO] = useState<DGPurchaseOrder | null>(null);
  const [editingPO, setEditingPO] = useState<DGPurchaseOrder | null>(null);

  // Form states
  const [formData, setFormData] = useState<DGPOFormData>({
    customer: {
      name: '',
      email: '',
      phone: '',
      pan: '',
      corporateName: '',
      address: '',
      pinCode: '',
      tehsil: '',
      district: ''
    },
    supplier: '',
    supplierEmail: '',
    supplierAddress: {
      address: '',
      state: '',
      district: '',
      pincode: ''
    },
    expectedDeliveryDate: '',
    priority: 'medium',
    notes: '',
    terms: '',
    items: [],
    poNumber: ''
  });

  const [receiveData, setReceiveData] = useState<ReceiveItemsData>({
    location: '',
    receiptDate: new Date().toISOString().split('T')[0],
    inspectedBy: '',
    receivedItems: [],
    items: [],
    shipDate: new Date().toISOString().split('T')[0],
    docketNumber: '',
    noOfPackages: 1,
    gstInvoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    documentNumber: '',
    documentDate: new Date().toISOString().split('T')[0],
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    confirmed: 0,
    received: 0,
    cancelled: 0,
    totalValue: 0
  });

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch data when filters change
  useEffect(() => {
    fetchPurchaseOrders();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPurchaseOrders(),
        fetchProducts(),
        fetchSuppliers(),
        fetchLocations(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await apiClient.dgSales.purchaseOrders.getAll(params);
      
      if (response.success) {
        setPurchaseOrders(response.data || []);
        setTotalPages(response.totalPages || 1);
        setTotalItems(response.total || 0);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Failed to load purchase orders');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll({ page: 1, limit: 100 });
      let products: Product[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          products = response.data;
        } else if ((response.data as any).products && Array.isArray((response.data as any).products)) {
          products = (response.data as any).products;
        }
      }
      setProducts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.customers.getAll({
        type: 'supplier',
        limit: 100
      });
      
      let suppliersData: Supplier[] = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          suppliersData = response.data as Supplier[];
        } else if (typeof response.data === 'object' && Array.isArray((response.data as any).customers)) {
          suppliersData = (response.data as { customers: Supplier[] }).customers;
        } else if (response.success && response.data && Array.isArray(response.data)) {
          suppliersData = response.data as Supplier[];
        } else if (response.success && response.data && typeof response.data === 'object' && (response.data as any).customers) {
          suppliersData = (response.data as any).customers as Supplier[];
        }
      }
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await apiClient.stock.getLocations();
      let locationsData: StockLocation[] = [];
      
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
      const response = await apiClient.dgSales.purchaseOrders.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreatePO = () => {
    setFormData({
      customer: {
        name: '',
        email: '',
        phone: '',
        pan: '',
        corporateName: '',
        address: '',
        pinCode: '',
        tehsil: '',
        district: ''
      },
      supplier: '',
      supplierEmail: '',
      supplierAddress: {
        address: '',
        state: '',
        district: '',
        pincode: ''
      },
      expectedDeliveryDate: '',
      priority: 'medium',
      notes: '',
      terms: '',
      items: [],
      poNumber: ''
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleEditPO = (po: DGPurchaseOrder) => {
    setEditingPO(po);
    setFormData({
      dgQuotation: po.dgQuotation,
      customer: po.customer,
      supplier: po.supplier,
      supplierEmail: po.supplierEmail,
      supplierAddress: po.supplierAddress,
      expectedDeliveryDate: po.expectedDeliveryDate || '',
      priority: po.priority,
      notes: po.notes || '',
      terms: po.terms || '',
      items: po.items.map(item => ({
        product: typeof item.product === 'string' ? item.product : item.product._id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        notes: item.notes
      })),
      poNumber: po.poNumber // Set poNumber for editing
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const openDetailsModal = (po: DGPurchaseOrder) => {
    setSelectedPO(po);
    setShowDetailsModal(true);
  };

  const openReceiveModal = (po: DGPurchaseOrder) => {
    setSelectedPO(po);
    setReceiveData({
      location: '',
      receiptDate: new Date().toISOString().split('T')[0],
      inspectedBy: '',
      receivedItems: po.items.map(item => ({
        productId: typeof item.product === 'string' ? item.product : item.product._id,
        quantityReceived: 0,
        condition: 'good' as const,
        batchNumber: '',
        notes: ''
      })),
      items: po.items.map(item => ({
        product: typeof item.product === 'string' ? item.product : item.product._id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate
      })),
      shipDate: new Date().toISOString().split('T')[0],
      docketNumber: '',
      noOfPackages: 1,
      gstInvoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      documentNumber: '',
      documentDate: new Date().toISOString().split('T')[0],
    });
    setShowReceiveModal(true);
  };

  const handleStatusUpdate = async (poId: string, newStatus: DGPurchaseOrderStatus) => {
    try {
      const response = await apiClient.dgSales.purchaseOrders.updateStatus(poId, newStatus, 'Status updated from management page');
      if (response.success) {
        toast.success(`Purchase order status updated to ${newStatus}`);
        fetchPurchaseOrders();
        setShowDetailsModal(false);
      } else {
        toast.error('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleFormSubmit = async () => {
    try {
      setSubmitting(true);
      
      // Validate required fields
      if (!formData.customer.name || !formData.supplier || formData.items.length === 0) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Calculate total amount from items
      const totalAmount = formData.items.reduce((total, item) => {
        const itemTotal = item.quantity * item.unitPrice * (1 + item.taxRate / 100);
        return total + itemTotal;
      }, 0);

      const submitData = {
        ...formData,
        totalAmount: totalAmount,
        orderDate: new Date().toISOString().split('T')[0], // Add current date as order date
        items: formData.items.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice * (1 + item.taxRate / 100)
        }))
      };

      let response;
      if (editingPO) {
        // Update existing purchase order
        response = await apiClient.dgSales.purchaseOrders.update(editingPO._id, submitData);
      } else {
        // Create new purchase order
        response = await apiClient.dgSales.purchaseOrders.create(submitData);
      }

      if (response.success) {
        toast.success(editingPO ? 'Purchase order updated successfully' : 'Purchase order created successfully');
        setShowCreateModal(false);
        setShowEditModal(false);
        setEditingPO(null);
        setFormData({
          customer: {
            name: '',
            email: '',
            phone: '',
            pan: '',
            corporateName: '',
            address: '',
            pinCode: '',
            tehsil: '',
            district: ''
          },
          supplier: '',
          supplierEmail: '',
          supplierAddress: {
            address: '',
            state: '',
            district: '',
            pincode: ''
          },
          expectedDeliveryDate: '',
          priority: 'medium',
          notes: '',
          terms: '',
          items: [],
          poNumber: ''
        });
        fetchPurchaseOrders();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error('Failed to save purchase order');
    } finally {
      setSubmitting(false);
    }
  };

  // Validation functions
  const validateReceiveForm = () => {
    const errors: Record<string, string> = {};

    // Required field validations
    if (!receiveData.location) {
      errors.location = 'Delivery location is required';
    }

    if (!receiveData.receiptDate) {
      errors.receiptDate = 'Receipt date is required';
    }

    if (!receiveData.inspectedBy) {
      errors.inspectedBy = 'Inspector name is required';
    }

    if (!receiveData.shipDate) {
      errors.shipDate = 'Ship date is required';
    }

    if (!receiveData.noOfPackages || receiveData.noOfPackages < 1) {
      errors.noOfPackages = 'Number of packages must be at least 1';
    }

    if (!receiveData.gstInvoiceNumber) {
      errors.gstInvoiceNumber = 'GST Invoice Number is required';
    }

    if (!receiveData.invoiceDate) {
      errors.invoiceDate = 'Invoice date is required';
    }

    // Validate received items
    const hasReceivedItems = receiveData.receivedItems.some(item => item.quantityReceived > 0);
    if (!hasReceivedItems) {
      errors.items = 'Please enter quantities for at least one item';
    }

    // Validate quantities
    receiveData.receivedItems.forEach((item, index) => {
      if (item.quantityReceived > 0) {
        const poItem = selectedPO?.items[index];
        if (poItem) {
          const remainingQty = poItem.quantity - (poItem.receivedQuantity || 0);
          if (item.quantityReceived > remainingQty) {
            errors[`item_${index}`] = `Cannot receive more than remaining quantity (${remainingQty})`;
          }
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReceiveItems = async () => {
    try {
      setSubmitting(true);
      
      if (!selectedPO) {
        toast.error('No purchase order selected');
        return;
      }
      
      // Validate form
      if (!validateReceiveForm()) {
        setSubmitting(false);
        return;
      }

      // Prepare receive data - exclude items and purchaseOrderId fields as they're not allowed by the schema
      const { items, ...receiveDataWithoutItems } = receiveData;
      const receivePayload = {
        ...receiveDataWithoutItems,
        receivedItems: receiveData.receivedItems.map((item, index) => {
          const poItem = selectedPO.items[index];
          const productId = typeof poItem.product === 'string' ? poItem.product : poItem.product._id;
          return {
            ...item,
            productId
          };
        })
      };

      // Call the receive API
      const response = await apiClient.dgSales.purchaseOrders.receiveItems(selectedPO._id, receivePayload);
      
      if (response.success) {
        toast.success('Items received successfully');
        setShowReceiveModal(false);
        setSelectedPO(null);
        setFormErrors({});
        fetchPurchaseOrders();
      }
    } catch (error) {
      console.error('Error receiving items:', error);
      toast.error('Failed to receive items');
    } finally {
      setSubmitting(false);
    }
  };

  const generatePONumber = async () => {
    try {
      const response = await apiClient.dgSales.purchaseOrders.generateNumber();
      if (response.success) {
        setFormData(prev => ({ ...prev, poNumber: response.data.poNumber }));
      }
    } catch (error) {
      console.error('Error generating PO number:', error);
      toast.error('Failed to generate PO number');
    }
  };

  const getStatusColor = (status: DGPurchaseOrderStatus) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'partially_received': return 'bg-orange-100 text-orange-800';
      case 'received': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <PageHeader
        title="DG Purchase Order Management"
        subtitle="Manage DG procurement and purchase orders efficiently"
      >
        <div className="flex space-x-3">
          <button
            onClick={fetchAllData}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
          <button
            onClick={handleCreatePO}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New DG Purchase Order</span>
          </button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total POs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats.draft + stats.sent}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Confirmed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.confirmed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue || 0)}</p>
            </div>
            <IndianRupee className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search purchase orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DGPurchaseOrderStatus | 'all')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="confirmed">Confirmed</option>
              <option value="partially_received">Partially Received</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchaseOrders.map((po) => (
                <tr key={po._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{po.poNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{po.customer.name}</div>
                    <div className="text-sm text-gray-500">{po.customer.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{po.supplier}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(po.orderDate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(po.totalAmount)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      po.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      po.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      po.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {po.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openDetailsModal(po)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditPO(po)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {(po.status === 'confirmed' || po.status === 'partially_received') && (
                        <button
                          onClick={() => openReceiveModal(po)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* Create/Edit Purchase Order Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {showCreateModal ? 'Create DG Purchase Order' : 'Edit DG Purchase Order'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {showCreateModal ? 'Create a new purchase order for DG sales' : `Editing PO: ${editingPO?.poNumber}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setEditingPO(null);
                  setFormData({
                    customer: {
                      name: '',
                      email: '',
                      phone: '',
                      pan: '',
                      corporateName: '',
                      address: '',
                      pinCode: '',
                      tehsil: '',
                      district: ''
                    },
                    supplier: '',
                    supplierEmail: '',
                    supplierAddress: {
                      address: '',
                      state: '',
                      district: '',
                      pincode: ''
                    },
                    expectedDeliveryDate: '',
                    priority: 'medium',
                    notes: '',
                    terms: '',
                    items: [],
                    poNumber: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.customer.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer: { ...prev.customer, name: e.target.value } }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.customer ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter customer name"
                    />
                    {formErrors.customer && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.customer}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={formData.customer.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer: { ...prev.customer, name: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.customer.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer: { ...prev.customer, email: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={formData.customer.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, customer: { ...prev.customer, phone: e.target.value } }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Supplier Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.supplier}
                      onChange={(e) => {
                        const selectedSupplier = suppliers.find(s => s._id === e.target.value);
                        if (selectedSupplier) {
                          setFormData(prev => ({
                            ...prev,
                            supplier: selectedSupplier.name || '',
                            supplierEmail: selectedSupplier.email || '',
                            supplierAddress: {
                              address: selectedSupplier.addresses?.[0]?.address || '',
                              state: selectedSupplier.addresses?.[0]?.state || '',
                              district: selectedSupplier.addresses?.[0]?.district || '',
                              pincode: selectedSupplier.addresses?.[0]?.pincode || ''
                            }
                          }));
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            supplier: '',
                            supplierEmail: '',
                            supplierAddress: {
                              address: '',
                              state: '',
                              district: '',
                              pincode: ''
                            }
                          }));
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.supplier ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Select supplier...</option>
                      {!Array.isArray(suppliers) || suppliers.length === 0 ? (
                        <option value="" disabled>Loading suppliers...</option>
                      ) : (
                        suppliers.map(supplier => (
                          <option key={supplier._id} value={supplier._id}>
                            {supplier.name}
                          </option>
                        ))
                      )}
                    </select>
                    {formErrors.supplier && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.supplier}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Email
                    </label>
                    <input
                      type="email"
                      value={formData.supplierEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplierEmail: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.supplierEmail ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Supplier email"
                    />
                    {formErrors.supplierEmail && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.supplierEmail}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Address
                    </label>
                    <input
                      type="text"
                      value={formData.supplierAddress.address}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        supplierAddress: { ...prev.supplierAddress, address: e.target.value } 
                      }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.supplierAddress ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Supplier address"
                    />
                    {formErrors.supplierAddress && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.supplierAddress}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.supplierAddress.state}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        supplierAddress: { ...prev.supplierAddress, state: e.target.value } 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      District
                    </label>
                    <input
                      type="text"
                      value={formData.supplierAddress.district}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        supplierAddress: { ...prev.supplierAddress, district: e.target.value } 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="District"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pin Code
                    </label>
                    <input
                      type="text"
                      value={formData.supplierAddress.pincode}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        supplierAddress: { ...prev.supplierAddress, pincode: e.target.value } 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Pin Code"
                    />
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PO Number
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={formData.poNumber || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Auto-generated"
                        readOnly={!editingPO}
                      />
                      {!editingPO && (
                        <button
                          type="button"
                          onClick={generatePONumber}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          title="Generate PO Number"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expected Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.expectedDeliveryDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedDeliveryDate: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.expectedDeliveryDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.expectedDeliveryDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.expectedDeliveryDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                  <button
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      items: [...prev.items, {
                        product: '',
                        description: '',
                        quantity: 1,
                        unitPrice: 0,
                        taxRate: 18,
                        notes: ''
                      }]
                    }))}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                </div>
                {formErrors.items && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{formErrors.items}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        <button
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            items: prev.items.filter((_, i) => i !== index)
                          }))}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={item.product}
                            onChange={(e) => {
                              const product = products.find(p => p._id === e.target.value);
                              setFormData(prev => ({
                                ...prev,
                                items: prev.items.map((it, i) => 
                                  i === index ? {
                                    ...it,
                                    product: e.target.value,
                                    description: product?.name || '',
                                    unitPrice: product?.price || 0,
                                    taxRate: product?.gst || 18
                                  } : it
                                )
                              }));
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors[`item_${index}_product`] ? 'border-red-500' : 'border-gray-300'}`}
                          >
                            <option value="">Select product...</option>
                            {!Array.isArray(products) || products.length === 0 ? (
                              <option value="" disabled>Loading products...</option>
                            ) : (
                              products.filter(p => 
                                p.category?.toLowerCase().includes('genset') || 
                                p.category?.toLowerCase().includes('generator') ||
                                p.name?.toLowerCase().includes('genset') ||
                                p.name?.toLowerCase().includes('generator')
                              ).map(product => (
                                <option key={product._id} value={product._id}>
                                  {product.name} - {product.category}
                                </option>
                              ))
                            )}
                          </select>
                          {formErrors[`item_${index}_product`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_product`]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              items: prev.items.map((it, i) => 
                                i === index ? { ...it, description: e.target.value } : it
                              )
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              items: prev.items.map((it, i) => 
                                i === index ? { ...it, quantity: parseInt(e.target.value) || 1 } : it
                              )
                            }))}
                            min="1"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors[`item_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'}`}
                          />
                          {formErrors[`item_${index}_quantity`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_quantity`]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Unit Price <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              items: prev.items.map((it, i) => 
                                i === index ? { ...it, unitPrice: parseFloat(e.target.value) || 0 } : it
                              )
                            }))}
                            min="0"
                            step="0.01"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors[`item_${index}_unitPrice`] ? 'border-red-500' : 'border-gray-300'}`}
                          />
                          {formErrors[`item_${index}_unitPrice`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_unitPrice`]}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tax Rate (%)
                          </label>
                          <input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              items: prev.items.map((it, i) => 
                                i === index ? { ...it, taxRate: parseFloat(e.target.value) || 0 } : it
                              )
                            }))}
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Price
                          </label>
                          <input
                            type="number"
                            value={((item.quantity * item.unitPrice) * (1 + item.taxRate / 100)).toFixed(2)}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Amount Summary */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Order Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium">Subtotal</div>
                    <div className="text-lg font-bold text-blue-900">
                      ₹{formData.items.reduce((total, item) => total + (item.quantity * item.unitPrice), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium">Tax Amount</div>
                    <div className="text-lg font-bold text-blue-900">
                      ₹{formData.items.reduce((total, item) => total + (item.quantity * item.unitPrice * item.taxRate / 100), 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium">Total Amount</div>
                    <div className="text-xl font-bold text-blue-900">
                      ₹{formData.items.reduce((total, item) => total + (item.quantity * item.unitPrice * (1 + item.taxRate / 100)), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes and Terms */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes & Terms</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter any additional notes..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Terms & Conditions
                    </label>
                    <textarea
                      value={formData.terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter terms and conditions..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setEditingPO(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleFormSubmit}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : (editingPO ? 'Update Purchase Order' : 'Create Purchase Order')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">DG Purchase Order Details</h2>
                <p className="text-gray-600 mt-1">
                  PO: <span className="font-semibold">{selectedPO.poNumber}</span>
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PO Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPO.poNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Order Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedPO.orderDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expected Delivery</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPO.expectedDeliveryDate ? formatDate(selectedPO.expectedDeliveryDate) : 'Not set'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(selectedPO.totalAmount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPO.status)}`}>
                      {selectedPO.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedPO.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      selectedPO.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      selectedPO.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {selectedPO.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPO.customer.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPO.customer.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPO.customer.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PAN</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPO.customer.pan || 'Not provided'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPO.customer.address && (
                        <>
                          {selectedPO.customer.address}
                          {selectedPO.customer.pinCode && `, ${selectedPO.customer.pinCode}`}
                          {selectedPO.customer.tehsil && `, ${selectedPO.customer.tehsil}`}
                          {selectedPO.customer.district && `, ${selectedPO.customer.district}`}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Supplier Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Supplier Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPO.supplier}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedPO.supplierEmail}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedPO.supplierAddress.address && (
                        <>
                          {selectedPO.supplierAddress.address}
                          {selectedPO.supplierAddress.state && `, ${selectedPO.supplierAddress.state}`}
                          {selectedPO.supplierAddress.district && `, ${selectedPO.supplierAddress.district}`}
                          {selectedPO.supplierAddress.pincode && `, ${selectedPO.supplierAddress.pincode}`}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
                <div className="space-y-4">
                  {selectedPO.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Product</label>
                          <p className="mt-1 text-sm text-gray-900">{item.description}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Quantity</label>
                          <p className="mt-1 text-sm text-gray-900">{item.quantity}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                          <p className="mt-1 text-sm text-gray-900">{formatCurrency(item.unitPrice)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Tax Rate</label>
                          <p className="mt-1 text-sm text-gray-900">{item.taxRate}%</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Total Price</label>
                          <p className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice)}</p>
                        </div>
                        {item.notes && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <p className="mt-1 text-sm text-gray-900">{item.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes and Terms */}
              {(selectedPO.notes || selectedPO.terms) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes & Terms</h3>
                  {selectedPO.notes && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedPO.notes}</p>
                    </div>
                  )}
                  {selectedPO.terms && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedPO.terms}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPO.status)}`}>
                  {selectedPO.status}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {/* Status Update Buttons */}
                {selectedPO.status === 'draft' && (
                  <button
                    onClick={() => handleStatusUpdate(selectedPO._id, 'sent')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send PO</span>
                  </button>
                )}
                {selectedPO.status === 'sent' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate(selectedPO._id, 'confirmed')}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark as Confirmed</span>
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(selectedPO._id, 'cancelled')}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700 transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Cancel PO</span>
                    </button>
                  </>
                )}
                {(selectedPO.status === 'confirmed' || selectedPO.status === 'partially_received') && (
                  <>
                    <button
                      onClick={() => openReceiveModal(selectedPO)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      <span>
                        {selectedPO.status === 'partially_received' ? 'Receive More Items' : 'Receive Items'}
                      </span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DG Purchase Order Receive Items Modal */}
      {showReceiveModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPO.status === 'partially_received' ? 'Receive More Items' : 'Receive Items'}
                </h2>
                <p className="text-gray-600 mt-1">
                  PO: <span className="font-semibold">{selectedPO.poNumber}</span>
                  {selectedPO.status === 'partially_received' && (
                    <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      Partially Received
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReceiveModal(false);
                  setReceiveData({
                    location: '',
                    receiptDate: new Date().toISOString().split('T')[0],
                    inspectedBy: '',
                    receivedItems: [],
                    items: [],
                    shipDate: new Date().toISOString().split('T')[0],
                    docketNumber: '',
                    noOfPackages: 1,
                    gstInvoiceNumber: '',
                    invoiceDate: new Date().toISOString().split('T')[0],
                    documentNumber: '',
                    documentDate: new Date().toISOString().split('T')[0],
                  });
                }}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Alert */}
              {selectedPO.status === 'partially_received' ? (
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Package className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-orange-800">Receiving Additional Items</h3>
                      <p className="text-sm text-orange-700 mt-1">
                        Some items from this purchase order have already been received. You can receive additional quantities as they arrive.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Package className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-800">Receiving Items</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Review the quantities below and confirm receipt. This will update your inventory.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={receiveData.location}
                      onChange={(e) => setReceiveData({ ...receiveData, location: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.location ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Select location...</option>
                      {!Array.isArray(locations) || locations.length === 0 ? (
                        <option value="" disabled>Loading locations...</option>
                      ) : (
                        locations.map(location => (
                          <option key={location._id} value={location._id}>
                            {location.name} ({location.type})
                          </option>
                        ))
                      )}
                    </select>
                    {formErrors.location && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receipt Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={receiveData.receiptDate}
                      onChange={(e) => setReceiveData({ ...receiveData, receiptDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.receiptDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.receiptDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.receiptDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inspected By <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={receiveData.inspectedBy}
                      onChange={(e) => setReceiveData({ ...receiveData, inspectedBy: e.target.value })}
                      placeholder="Inspector name"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.inspectedBy ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.inspectedBy && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.inspectedBy}</p>
                    )}
                  </div>

                  {/* Supplier Information */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier
                    </label>
                    <select
                      value={receiveData.supplierName || ''}
                      onChange={(e) => {
                        const selectedSupplier = suppliers.find(s => s._id === e.target.value);
                        if (selectedSupplier) {
                          setReceiveData({
                            ...receiveData,
                            supplierName: selectedSupplier.name || '',
                            supplierEmail: selectedSupplier.email || '',
                            supplierAddress: {
                              address: selectedSupplier.addresses?.[0]?.address || '',
                              state: selectedSupplier.addresses?.[0]?.state || '',
                              district: selectedSupplier.addresses?.[0]?.district || '',
                              pincode: selectedSupplier.addresses?.[0]?.pincode || ''
                            }
                          });
                        } else {
                          setReceiveData({
                            ...receiveData,
                            supplierName: '',
                            supplierEmail: '',
                            supplierAddress: {
                              address: '',
                              state: '',
                              district: '',
                              pincode: ''
                            }
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select supplier...</option>
                      {!Array.isArray(suppliers) || suppliers.length === 0 ? (
                        <option value="" disabled>Loading suppliers...</option>
                      ) : (
                        suppliers.map(supplier => (
                          <option key={supplier._id} value={supplier._id}>
                            {supplier.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Email
                    </label>
                    <input
                      type="email"
                      value={receiveData.supplierEmail || ''}
                      onChange={(e) => setReceiveData({ ...receiveData, supplierEmail: e.target.value })}
                      placeholder="Supplier email"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Supplier Address
                    </label>
                    <input
                      type="text"
                      value={receiveData.supplierAddress?.address || ''}
                      onChange={(e) => setReceiveData({
                        ...receiveData,
                        supplierAddress: {
                          ...receiveData.supplierAddress,
                          address: e.target.value
                        }
                      })}
                      placeholder="Supplier address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Shipping and Documentation Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ship Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={receiveData.shipDate}
                      onChange={(e) => setReceiveData({ ...receiveData, shipDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.shipDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.shipDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.shipDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Docket Number
                    </label>
                    <input
                      type="text"
                      value={receiveData.docketNumber}
                      onChange={(e) => setReceiveData({ ...receiveData, docketNumber: e.target.value })}
                      placeholder="Docket Number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Packages <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={receiveData.noOfPackages}
                      onChange={(e) => setReceiveData({ ...receiveData, noOfPackages: parseInt(e.target.value) || 1 })}
                      placeholder="1"
                      min="1"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.noOfPackages ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.noOfPackages && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.noOfPackages}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Invoice Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={receiveData.gstInvoiceNumber}
                      onChange={(e) => setReceiveData({ ...receiveData, gstInvoiceNumber: e.target.value })}
                      placeholder="GST Invoice Number"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.gstInvoiceNumber ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.gstInvoiceNumber && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.gstInvoiceNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={receiveData.invoiceDate}
                      onChange={(e) => setReceiveData({ ...receiveData, invoiceDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.invoiceDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.invoiceDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.invoiceDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Number
                    </label>
                    <input
                      type="text"
                      value={receiveData.documentNumber}
                      onChange={(e) => setReceiveData({ ...receiveData, documentNumber: e.target.value })}
                      placeholder="Document Number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Date
                    </label>
                    <input
                      type="date"
                      value={receiveData.documentDate}
                      onChange={(e) => setReceiveData({ ...receiveData, documentDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Notes
                  </label>
                  <textarea
                    value={receiveData.notes || ''}
                    onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                    rows={3}
                    placeholder="Any additional notes about the delivery..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                </div>
              </div>

              {/* Items to Receive */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Items to Receive</h3>
                </div>
                {formErrors.items && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{formErrors.items}</p>
                  </div>
                )}

                {(() => {
                  const itemsWithRemainingQty = selectedPO.items.filter(item =>
                    (item.quantity - (item.receivedQuantity || 0)) > 0
                  );

                  if (itemsWithRemainingQty.length === 0) {
                    return (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                          <Package className="w-12 h-12 text-green-600" />
                        </div>
                        <h4 className="text-xl font-semibold text-green-800 mb-2">All Items Received</h4>
                        <p className="text-green-700">All items from this purchase order have been fully received.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {selectedPO.items.map((item, index) => {
                        const remainingQty = item.quantity - (item.receivedQuantity || 0);
                        const receivedItem = receiveData.receivedItems[index];

                        if (remainingQty <= 0) return null;

                        return (
                          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center mb-4">
                              <div className="md:col-span-2">
                                <div className="text-sm font-semibold text-gray-900">
                                  {typeof item.product === 'string' ? item.product : item.product?.name || 'Unknown Product'}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {item.description}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Ordered</div>
                                <div className="text-sm font-semibold text-gray-900">{item.quantity}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Already Received</div>
                                <div className="text-sm font-semibold text-green-600">{item.receivedQuantity || 0}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Remaining</div>
                                <div className="text-sm font-semibold text-orange-600">{remainingQty}</div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Receive Now</label>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    value={receivedItem?.quantityReceived || ''}
                                    placeholder='0'
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value) || 0;
                                      const newReceivedItems = [...receiveData.receivedItems];
                                      const productId = typeof item.product === 'string' ? item.product : item.product?._id;
                                      
                                      newReceivedItems[index] = {
                                        productId: productId || '',
                                        quantityReceived: qty,
                                        condition: receivedItem?.condition || 'good',
                                        batchNumber: receivedItem?.batchNumber || '',
                                        notes: receivedItem?.notes || ''
                                      };

                                      setReceiveData({
                                        ...receiveData,
                                        receivedItems: newReceivedItems
                                      });
                                    }}
                                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors[`item_${index}`] ? 'border-red-500' : 'border-gray-300'}`}
                                    min="0"
                                    max={remainingQty}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newReceivedItems = [...receiveData.receivedItems];
                                      const productId = typeof item.product === 'string' ? item.product : item.product?._id;
                                      
                                      newReceivedItems[index] = {
                                        productId: productId || '',
                                        quantityReceived: remainingQty,
                                        condition: receivedItem?.condition || 'good',
                                        batchNumber: receivedItem?.batchNumber || '',
                                        notes: receivedItem?.notes || ''
                                      };

                                      setReceiveData({
                                        ...receiveData,
                                        receivedItems: newReceivedItems
                                      });
                                    }}
                                    className="px-3 py-2 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                                  >
                                    Max
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Condition</label>
                                <select
                                  value={receivedItem?.condition || 'good'}
                                  onChange={(e) => {
                                    const newReceivedItems = [...receiveData.receivedItems];
                                    const productId = typeof item.product === 'string' ? item.product : item.product?._id;
                                    
                                    newReceivedItems[index] = {
                                      ...newReceivedItems[index],
                                      productId: productId || '',
                                      condition: e.target.value as 'good' | 'damaged' | 'defective'
                                    };
                                    setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                >
                                  <option value="good">Good</option>
                                  <option value="damaged">Damaged</option>
                                  <option value="defective">Defective</option>
                                </select>
                              </div>
                            </div>

                            {/* Item Financial Details */}
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Unit Price</div>
                                  <div className="text-sm font-semibold text-gray-900">₹{item.unitPrice?.toLocaleString()}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">GST (%)</div>
                                  <div className="text-sm font-semibold text-gray-900">{item.taxRate || 0}%</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">GST Amount</div>
                                  <div className="text-sm font-semibold text-green-600">
                                    ₹{((receivedItem?.quantityReceived || 0) * item.unitPrice * (item.taxRate || 0) / 100).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Item Total</div>
                                  <div className="text-sm font-bold text-indigo-600">
                                    ₹{((receivedItem?.quantityReceived || 0) * item.unitPrice * (1 + (item.taxRate || 0) / 100)).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Additional Item Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Batch Number</label>
                                <input
                                  type="text"
                                  value={receivedItem?.batchNumber || ''}
                                  onChange={(e) => {
                                    const newReceivedItems = [...receiveData.receivedItems];
                                    const productId = typeof item.product === 'string' ? item.product : item.product?._id;
                                    
                                    newReceivedItems[index] = {
                                      ...newReceivedItems[index],
                                      productId: productId || '',
                                      batchNumber: e.target.value
                                    };
                                    setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                                  }}
                                  placeholder="Optional batch/lot number"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Item Notes</label>
                                <input
                                  type="text"
                                  value={receivedItem?.notes || ''}
                                  onChange={(e) => {
                                    const newReceivedItems = [...receiveData.receivedItems];
                                    const productId = typeof item.product === 'string' ? item.product : item.product?._id;
                                    
                                    newReceivedItems[index] = {
                                      ...newReceivedItems[index],
                                      productId: productId || '',
                                      notes: e.target.value
                                    };
                                    setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                                  }}
                                  placeholder="Notes about this item"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Enhanced Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Summary Card */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-gray-600" />
                    Order Summary
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Items Ordered:</span>
                      <span className="font-semibold text-gray-900 text-lg">
                        {selectedPO.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Previously Received:</span>
                      <span className="font-semibold text-green-600 text-lg">
                        {selectedPO.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Receiving Now:</span>
                      <span className="font-semibold text-blue-600 text-lg">
                        {receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Will Remain:</span>
                      <span className="font-semibold text-orange-600 text-lg">
                        {selectedPO.items.reduce((sum, item) => sum + item.quantity, 0) -
                          selectedPO.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) -
                          receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}
                      </span>
                    </div>

                    <div className="border-t border-gray-300 pt-4 mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600">Receipt Date:</span>
                        <span className="font-semibold text-gray-900">
                          {receiveData.receiptDate
                            ? new Date(receiveData.receiptDate).toLocaleDateString()
                            : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600">Inspector:</span>
                        <span className="font-semibold text-gray-900">
                          {receiveData.inspectedBy || 'Not assigned'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-semibold text-gray-900">
                          {receiveData.location || 'Not selected'}
                        </span>
                      </div>
                    </div>

                    {receiveData.notes && (
                      <div className="border-t border-gray-300 pt-4">
                        <span className="text-gray-600 text-sm">Notes:</span>
                        <div className="font-medium text-gray-900 text-sm italic mt-1">
                          {receiveData.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipt Summary Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Receipt Summary
                  </h4>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Items Count</div>
                      <div className="font-bold text-gray-900 text-xl">
                        {receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}
                      </div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Total GST</div>
                      <div className="font-bold text-green-700 text-lg">
                        ₹{(() => {
                          let total = 0;
                          selectedPO.items.forEach((item, index) => {
                            const receivedItem = receiveData.receivedItems[index];
                            const quantityToReceive = receivedItem?.quantityReceived || 0;
                            if (quantityToReceive > 0) {
                              total += quantityToReceive * item.unitPrice * (item.taxRate || 0) / 100;
                            }
                          });
                          return total.toLocaleString();
                        })()}
                      </div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Subtotal</div>
                      <div className="font-bold text-blue-900 text-lg">
                        ₹{(() => {
                          let total = 0;
                          selectedPO.items.forEach((item, index) => {
                            const receivedItem = receiveData.receivedItems[index];
                            const quantityToReceive = receivedItem?.quantityReceived || 0;
                            if (quantityToReceive > 0) {
                              total += quantityToReceive * item.unitPrice;
                            }
                          });
                          return total.toLocaleString();
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="text-center w-full mt-4 bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-xs text-gray-600 mb-1">Grand Total</div>
                    <div className="font-bold text-indigo-900 text-xl">
                      ₹{(() => {
                        let total = 0;
                        selectedPO.items.forEach((item, index) => {
                          const receivedItem = receiveData.receivedItems[index];
                          const quantityToReceive = receivedItem?.quantityReceived || 0;
                          if (quantityToReceive > 0) {
                            total += quantityToReceive * item.unitPrice * (1 + (item.taxRate || 0) / 100);
                          }
                        });
                        return total.toLocaleString();
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowReceiveModal(false);
                    setReceiveData({
                      location: '',
                      receiptDate: new Date().toISOString().split('T')[0],
                      inspectedBy: '',
                      receivedItems: [],
                      items: [],
                      shipDate: new Date().toISOString().split('T')[0],
                      docketNumber: '',
                      noOfPackages: 1,
                      gstInvoiceNumber: '',
                      invoiceDate: new Date().toISOString().split('T')[0],
                      documentNumber: '',
                      documentDate: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiveItems}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? 'Receiving...' : 'Confirm Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DGPurchaseOrderManagement; 