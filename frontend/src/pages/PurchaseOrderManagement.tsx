import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';

// Types matching backend structure
type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';

interface POItem {
  product: string | {
    _id: string;
    name: string;
    category: string;
    brand?: string;
    modelNumber?: string;
    price?: number;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier: string;
  items: POItem[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  createdBy: string | {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  deliveryStatus?: string;
  daysUntilDelivery?: number;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  price?: number;
  specifications?: Record<string, any>;
}

interface ReceiveItemsData {
  receivedItems: Array<{
    productId: string;
    quantityReceived: number;
  }>;
  location: string;
}

interface POFormData {
  supplier: string;
  expectedDeliveryDate: string;
  items: Array<{
    product: string;
    quantity: number;
    unitPrice: number;
  }>;
}

const PurchaseOrderManagement: React.FC = () => {
  // Core state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  
  // Selected data
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<POFormData>({
    supplier: '',
    expectedDeliveryDate: '',
    items: [{ product: '', quantity: 1, unitPrice: 0 }]
  });
  
  const [receiveData, setReceiveData] = useState<ReceiveItemsData>({
    receivedItems: [],
    location: 'main-warehouse'
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Dropdown state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPurchaseOrders(),
        fetchProducts()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      console.log('Fetching purchase orders...');
      const response = await apiClient.purchaseOrders.getAll();
      console.log('Purchase orders response:', response);
      
      let ordersData: PurchaseOrder[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          ordersData = response.data;
        } else if ((response.data as any).orders && Array.isArray((response.data as any).orders)) {
          ordersData = (response.data as any).orders;
        }
        console.log('Found purchase orders:', ordersData.length);
      }
      
      // Set fallback data if no real data
      if (ordersData.length === 0) {
        ordersData = [
          {
            _id: '1',
            poNumber: 'PO-202412-0001',
            supplier: 'ABC Motors Ltd',
            items: [
              {
                product: {
                  _id: 'p1',
                  name: '250 KVA Generator Parts Kit',
                  category: 'spare_part',
                  brand: 'Cummins'
                },
                quantity: 2,
                unitPrice: 15000,
                totalPrice: 30000
              },
              {
                product: {
                  _id: 'p2',
                  name: 'Oil Filter Set',
                  category: 'spare_part',
                  brand: 'Cummins'
                },
                quantity: 10,
                unitPrice: 500,
                totalPrice: 5000
              }
            ],
            totalAmount: 35000,
            status: 'confirmed',
            orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            createdBy: {
              _id: 'u1',
              firstName: 'Admin',
              lastName: 'User',
              email: 'admin@sunpower.com'
            },
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            deliveryStatus: 'on_time',
            daysUntilDelivery: 2
          },
          {
            _id: '2',
            poNumber: 'PO-202412-0002',
            supplier: 'TechParts Supplies',
            items: [
              {
                product: {
                  _id: 'p3',
                  name: '500 KVA Control Panel',
                  category: 'accessory',
                  brand: 'Caterpillar'
                },
                quantity: 1,
                unitPrice: 45000,
                totalPrice: 45000
              }
            ],
            totalAmount: 45000,
            status: 'sent',
            orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdBy: {
              _id: 'u1',
              firstName: 'Admin',
              lastName: 'User',
              email: 'admin@sunpower.com'
            },
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            deliveryStatus: 'pending',
            daysUntilDelivery: 7
          },
          {
            _id: '3',
            poNumber: 'PO-202412-0003',
            supplier: 'PowerGen Components',
            items: [
              {
                product: {
                  _id: 'p4',
                  name: 'Fuel Injection System',
                  category: 'spare_part',
                  brand: 'Perkins'
                },
                quantity: 1,
                unitPrice: 25000,
                totalPrice: 25000
              }
            ],
            totalAmount: 25000,
            status: 'received',
            orderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            expectedDeliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            actualDeliveryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            createdBy: {
              _id: 'u1',
              firstName: 'Admin',
              lastName: 'User',
              email: 'admin@sunpower.com'
            },
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            deliveryStatus: 'delivered'
          }
        ];
      }
      
      setPurchaseOrders(ordersData);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrders([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll();
      let productsData: Product[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        productsData = response.data;
      }
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  // Helper functions
  const getCreatedByName = (createdBy: string | { firstName: string; lastName: string; email: string }): string => {
    if (typeof createdBy === 'string') return createdBy;
    return `${createdBy.firstName} ${createdBy.lastName}`;
  };

  const getProductName = (product: string | { name: string }): string => {
    if (typeof product === 'string') return product;
    return product.name;
  };

  const handleCreatePO = () => {
    setFormData({
      supplier: '',
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{ product: '', quantity: 1, unitPrice: 0 }]
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPO(po);
    setFormData({
      supplier: po.supplier,
      expectedDeliveryDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.split('T')[0] : '',
      items: po.items.map(item => ({
        product: typeof item.product === 'string' ? item.product : item.product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const openDetailsModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setShowDetailsModal(true);
  };

  const openReceiveModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setReceiveData({
      receivedItems: po.items.map(item => ({
        productId: typeof item.product === 'string' ? item.product : item.product._id,
        quantityReceived: item.quantity
      })),
      location: 'main-warehouse'
    });
    setShowReceiveModal(true);
  };

  const validatePOForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.supplier.trim()) {
      errors.supplier = 'Supplier is required';
    }
    if (!formData.expectedDeliveryDate) {
      errors.expectedDeliveryDate = 'Expected delivery date is required';
    }
    if (formData.items.length === 0) {
      errors.items = 'At least one item is required';
    }
    
    formData.items.forEach((item, index) => {
      if (!item.product) {
        errors[`items.${index}.product`] = 'Product is required';
      }
      if (item.quantity <= 0) {
        errors[`items.${index}.quantity`] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice < 0) {
        errors[`items.${index}.unitPrice`] = 'Unit price cannot be negative';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitPO = async () => {
    if (!validatePOForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      
      const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      const poData = {
        ...formData,
        totalAmount,
        items: formData.items.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice
        }))
      };
      
      const response = await apiClient.purchaseOrders.create(poData);
      setPurchaseOrders([response.data, ...purchaseOrders]);
      setShowCreateModal(false);
      resetPOForm();
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to create purchase order' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePO = async () => {
    if (!validatePOForm() || !editingPO) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      
      const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      const poData = {
        ...formData,
        totalAmount,
        items: formData.items.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice
        }))
      };
      
      const response = await apiClient.purchaseOrders.update(editingPO._id, poData);
      setPurchaseOrders(purchaseOrders.map(po => po._id === editingPO._id ? response.data : po));
      setShowEditModal(false);
      setEditingPO(null);
      resetPOForm();
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to update purchase order' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (poId: string, newStatus: PurchaseOrderStatus) => {
    try {
      const response = await apiClient.purchaseOrders.updateStatus(poId, newStatus);
      setPurchaseOrders(purchaseOrders.map(po => 
        po._id === poId ? { ...po, status: newStatus } : po
      ));
    } catch (error) {
      console.error('Error updating PO status:', error);
    }
  };

  const handleReceiveItems = async () => {
    if (!selectedPO) return;

    setSubmitting(true);
    try {
      await apiClient.purchaseOrders.receiveItems(selectedPO._id, receiveData);
      setPurchaseOrders(purchaseOrders.map(po => 
        po._id === selectedPO._id ? { ...po, status: 'received', actualDeliveryDate: new Date().toISOString() } : po
      ));
      setShowReceiveModal(false);
      setSelectedPO(null);
    } catch (error) {
      console.error('Error receiving items:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const resetPOForm = () => {
    setFormData({
      supplier: '',
      expectedDeliveryDate: '',
      items: [{ product: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         po.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchesSupplier = !supplierFilter || po.supplier.toLowerCase().includes(supplierFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesSupplier;
  });

  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliveryStatusColor = (deliveryStatus: string | undefined) => {
    switch (deliveryStatus) {
      case 'on_time':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN');
  };

  // Statistics
  const stats = [
    {
      title: 'Total POs',
      value: purchaseOrders.length.toString(),
      icon: <Package className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Pending Approval',
      value: purchaseOrders.filter(po => po.status === 'draft' || po.status === 'sent').length.toString(),
      icon: <Clock className="w-6 h-6" />,
      color: 'orange'
    },
    {
      title: 'Confirmed',
      value: purchaseOrders.filter(po => po.status === 'confirmed').length.toString(),
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'Total Value',
      value: formatCurrency(purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)),
      icon: <DollarSign className="w-6 h-6" />,
      color: 'purple'
    }
  ];

  // Status options with labels
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'received', label: 'Received' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const getStatusLabel = (value: string) => {
    const option = statusOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Status';
  };

  const getSupplierLabel = (value: string) => {
    if (value === 'all') return 'All Suppliers';
    // Return the supplier name if you have supplier data
    return value || 'All Suppliers';
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowStatusDropdown(false);
        setShowSupplierDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <PageHeader 
        title="Purchase Order Management"
        subtitle="Manage procurement and purchase orders efficiently"
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
            <span className="text-sm">New Purchase Order</span>
          </button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
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

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search purchase orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowSupplierDropdown(false);
              }}
              className="flex items-center justify-between w-full px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getStatusLabel(statusFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value as PurchaseOrderStatus | 'all');
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                      statusFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Supplier Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowSupplierDropdown(!showSupplierDropdown);
                setShowStatusDropdown(false);
              }}
              className="flex items-center justify-between w-full px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getSupplierLabel(supplierFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showSupplierDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showSupplierDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                <button
                  onClick={() => {
                    setSupplierFilter('all');
                    setShowSupplierDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                    supplierFilter === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  All Suppliers
                </button>
                {/* Add actual suppliers here when available */}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            Showing {filteredPOs.length} of {purchaseOrders.length} purchase orders
          </span>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Order
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount & Items
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading purchase orders...</td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No purchase orders found</td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-blue-600">{po.poNumber}</div>
                        <div className="text-xs text-gray-600">
                          Created: {formatDate(po.orderDate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          By: {getCreatedByName(po.createdBy)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">{po.supplier}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-gray-900">{formatCurrency(po.totalAmount)}</div>
                        <div className="text-xs text-gray-600">{po.items.length} item(s)</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                        {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        {po.expectedDeliveryDate && (
                          <div className="text-xs text-gray-600">
                            Expected: {formatDate(po.expectedDeliveryDate)}
                          </div>
                        )}
                        {po.actualDeliveryDate && (
                          <div className="text-xs text-gray-600">
                            Delivered: {formatDate(po.actualDeliveryDate)}
                          </div>
                        )}
                        {po.deliveryStatus && (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDeliveryStatusColor(po.deliveryStatus)}`}>
                            {po.deliveryStatus.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openDetailsModal(po)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {po.status === 'draft' && (
                          <button
                            onClick={() => handleEditPO(po)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Edit PO"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {po.status === 'draft' && (
                          <button
                            onClick={() => handleStatusUpdate(po._id, 'sent')}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="Send PO"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {po.status === 'confirmed' && (
                          <button
                            onClick={() => openReceiveModal(po)}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                            title="Receive Items"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Purchase Order</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitPO(); }} className="p-4 space-y-3">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier *
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.supplier ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter supplier name"
                  />
                  {formErrors.supplier && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.supplier}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.expectedDeliveryDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.expectedDeliveryDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.expectedDeliveryDate}</p>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg">
                      <div className="col-span-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                        <select
                          value={item.product}
                          onChange={(e) => updateItem(index, 'product', e.target.value)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors[`items.${index}.product`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Product</option>
                          {products.map(product => (
                            <option key={product._id} value={product._id}>
                              {product.name} ({product.category})
                            </option>
                          ))}
                        </select>
                        {formErrors[`items.${index}.product`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.product`]}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors[`items.${index}.quantity`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          min="1"
                        />
                        {formErrors[`items.${index}.quantity`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.quantity`]}</p>
                        )}
                      </div>
                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors[`items.${index}.unitPrice`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          min="0"
                          step="0.01"
                        />
                        {formErrors[`items.${index}.unitPrice`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.unitPrice`]}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs font-medium text-gray-900">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 text-sm mt-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 text-right">
                  <p className="text-lg font-semibold">
                    Total: {formatCurrency(formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
                  </p>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit PO Modal */}
      {showEditModal && editingPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Purchase Order - {editingPO.poNumber}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdatePO(); }} className="p-4 space-y-3">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier *
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.supplier ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter supplier name"
                  />
                  {formErrors.supplier && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.supplier}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.expectedDeliveryDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.expectedDeliveryDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.expectedDeliveryDate}</p>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg">
                      <div className="col-span-5">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                        <select
                          value={item.product}
                          onChange={(e) => updateItem(index, 'product', e.target.value)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors[`items.${index}.product`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Product</option>
                          {products.map(product => (
                            <option key={product._id} value={product._id}>
                              {product.name} ({product.category})
                            </option>
                          ))}
                        </select>
                        {formErrors[`items.${index}.product`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.product`]}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors[`items.${index}.quantity`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          min="1"
                        />
                        {formErrors[`items.${index}.quantity`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.quantity`]}</p>
                        )}
                      </div>
                      <div className="col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors[`items.${index}.unitPrice`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          min="0"
                          step="0.01"
                        />
                        {formErrors[`items.${index}.unitPrice`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.unitPrice`]}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs font-medium text-gray-900">
                          {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 text-sm mt-1"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 text-right">
                  <p className="text-lg font-semibold">
                    Total: {formatCurrency(formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
                  </p>
                </div>
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
                  {submitting ? 'Updating...' : 'Update Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Details Modal */}
      {showDetailsModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Purchase Order Details</h2>
                <p className="text-gray-600">{selectedPO.poNumber}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Basic Information</h3>
                  <div className="space-y-2">
                    <p><span className="text-xs text-gray-600">PO Number:</span> <span className="font-medium">{selectedPO.poNumber}</span></p>
                    <p><span className="text-xs text-gray-600">Supplier:</span> <span className="font-medium">{selectedPO.supplier}</span></p>
                    <p><span className="text-xs text-gray-600">Total Amount:</span> <span className="font-medium">{formatCurrency(selectedPO.totalAmount)}</span></p>
                    <p><span className="text-xs text-gray-600">Status:</span> 
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPO.status)}`}>
                        {selectedPO.status.charAt(0).toUpperCase() + selectedPO.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Dates</h3>
                  <div className="space-y-2">
                    <p><span className="text-xs text-gray-600">Order Date:</span> <span className="font-medium">{formatDate(selectedPO.orderDate)}</span></p>
                    {selectedPO.expectedDeliveryDate && (
                      <p><span className="text-xs text-gray-600">Expected Delivery:</span> <span className="font-medium">{formatDate(selectedPO.expectedDeliveryDate)}</span></p>
                    )}
                    {selectedPO.actualDeliveryDate && (
                      <p><span className="text-xs text-gray-600">Actual Delivery:</span> <span className="font-medium">{formatDate(selectedPO.actualDeliveryDate)}</span></p>
                    )}
                    {selectedPO.deliveryStatus && (
                      <p><span className="text-xs text-gray-600">Delivery Status:</span> 
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDeliveryStatusColor(selectedPO.deliveryStatus)}`}>
                          {selectedPO.deliveryStatus.replace('_', ' ')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Created By</h3>
                  <div className="space-y-2">
                    <p><span className="text-xs text-gray-600">Name:</span> <span className="font-medium">{getCreatedByName(selectedPO.createdBy)}</span></p>
                    <p><span className="text-xs text-gray-600">Created:</span> <span className="font-medium">{formatDateTime(selectedPO.createdAt)}</span></p>
                    <p><span className="text-xs text-gray-600">Last Updated:</span> <span className="font-medium">{formatDateTime(selectedPO.updatedAt)}</span></p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Items Ordered</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedPO.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-xs font-medium text-gray-900">
                                {getProductName(item.product)}
                              </div>
                              {typeof item.product === 'object' && item.product.brand && (
                                <div className="text-xs text-gray-500">Brand: {item.product.brand}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                            {typeof item.product === 'object' ? item.product.category : '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-gray-900">
                            {formatCurrency(item.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-xs font-medium text-gray-900">
                          Total Amount:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatCurrency(selectedPO.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  {selectedPO.status === 'draft' && (
                    <>
                      <button
                        onClick={() => handleEditPO(selectedPO)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit PO</span>
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedPO._id, 'sent')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send to Supplier</span>
                      </button>
                    </>
                  )}
                  {selectedPO.status === 'sent' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedPO._id, 'confirmed')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark as Confirmed</span>
                    </button>
                  )}
                  {selectedPO.status === 'confirmed' && (
                    <button
                      onClick={() => openReceiveModal(selectedPO)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      <span>Receive Items</span>
                    </button>
                  )}
                  {(selectedPO.status === 'draft' || selectedPO.status === 'sent') && (
                    <button
                      onClick={() => handleStatusUpdate(selectedPO._id, 'cancelled')}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700 transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Cancel PO</span>
                    </button>
                  )}
                </div>
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

      {/* Receive Items Modal */}
      {showReceiveModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Receive Items</h2>
                <p className="text-gray-600">PO: {selectedPO.poNumber}</p>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <Package className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-800">Receiving Items</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      Review the quantities below and confirm receipt. This will update your inventory.
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Location *
                </label>
                <select
                  value={receiveData.location}
                  onChange={(e) => setReceiveData({ ...receiveData, location: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="main-warehouse">Main Warehouse</option>
                  <option value="secondary-warehouse">Secondary Warehouse</option>
                  <option value="field-office">Field Office</option>
                </select>
              </div>

              {/* Items to Receive */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Items to Receive</h3>
                <div className="space-y-4">
                  {selectedPO.items.map((item, index) => {
                    const receivedItem = receiveData.receivedItems[index];
                    return (
                      <div key={index} className="grid grid-cols-12 gap-4 items-center p-4 bg-gray-50 rounded-lg">
                        <div className="col-span-6">
                          <div className="text-xs font-medium text-gray-900">
                            {getProductName(item.product)}
                          </div>
                          {typeof item.product === 'object' && item.product.category && (
                            <div className="text-xs text-gray-500">Category: {item.product.category}</div>
                          )}
                        </div>
                        <div className="col-span-2 text-center">
                          <div className="text-xs text-gray-600">Ordered</div>
                          <div className="text-sm font-medium">{item.quantity}</div>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs text-gray-600 mb-1">Received</label>
                          <input
                            type="number"
                            value={receivedItem?.quantityReceived || 0}
                            onChange={(e) => {
                              const newReceivedItems = [...receiveData.receivedItems];
                              newReceivedItems[index] = {
                                ...newReceivedItems[index],
                                quantityReceived: parseInt(e.target.value) || 0
                              };
                              setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                            }}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="0"
                            max={item.quantity}
                          />
                        </div>
                        <div className="col-span-2 text-center">
                          <div className="text-xs text-gray-600">Unit Price</div>
                          <div className="text-sm font-medium">{formatCurrency(item.unitPrice)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-medium text-gray-900 mb-2">Receipt Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Items Ordered:</span>
                    <span className="ml-2 font-medium">{selectedPO.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Items Received:</span>
                    <span className="ml-2 font-medium">{receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Delivery Location:</span>
                    <span className="ml-2 font-medium">{receiveData.location.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiveItems}
                  disabled={submitting || receiveData.receivedItems.every(item => (item.quantityReceived || 0) === 0)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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

export default PurchaseOrderManagement; 