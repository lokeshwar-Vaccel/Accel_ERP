import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Truck,
  RefreshCw,
  Edit,
  Trash2,
  ArrowUpDown,
  MapPin,
  Calendar,
  History,
  ChevronDown,
  X,
  Eye
} from 'lucide-react';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Form } from '../components/ui/Form';
import { Button } from '../components/ui/Botton';
import { Stock, Product, StockLocation, TableColumn, FormField } from '../types';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';

// Types
interface ProductData {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  price: number;
  minStockLevel: number;
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

interface StockItem {
  _id: string;
  product: ProductData;
  location: StockLocationData;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastUpdated: string;
}

interface StockTransaction {
  _id: string;
  type: 'add' | 'subtract' | 'set' | 'transfer_in' | 'transfer_out';
  quantity: number;
  reason?: string;
  notes?: string;
  date: string;
  user: string;
}

// Form data interfaces
interface LocationFormData {
  name: string;
  address: string;
  type: string;
  contactPerson: string;
  phone: string;
}

interface StockAdjustmentFormData {
  product: string;
  location: string;
  adjustmentType: string;
  quantity: number;
  reason: string;
  notes: string;
}

interface StockTransferFormData {
  product: string;
  fromLocation: string;
  toLocation: string;
  quantity: number;
  notes: string;
}

const InventoryManagement: React.FC = () => {
  // State management
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [locations, setLocations] = useState<StockLocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Custom dropdown states
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  
  // Form states
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [stockTransactions, setStockTransactions] = useState<any[]>([]);
  const [locationFormData, setLocationFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    type: 'warehouse',
    contactPerson: '',
    phone: ''
  });
  const [adjustmentFormData, setAdjustmentFormData] = useState<StockAdjustmentFormData>({
    product: '',
    location: '',
    adjustmentType: 'add',
    quantity: 0,
    reason: '',
    notes: ''
  });
  const [transferFormData, setTransferFormData] = useState<StockTransferFormData>({
    product: '',
    fromLocation: '',
    toLocation: '',
    quantity: 0,
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Initialize data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowLocationDropdown(false);
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Data fetching functions
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInventory(),
        fetchProducts(),
        fetchLocations()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await apiClient.stock.getStock();
      // Handle different response formats from backend
      let stockData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          stockData = response.data;
        } else if (response.data.stockLevels && Array.isArray(response.data.stockLevels)) {
          stockData = response.data.stockLevels;
        }
      }
      setInventory(stockData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setInventory([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll();
      // Handle response format like in ProductManagement
      let productsData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          productsData = response.data;
        } else if ((response.data as any).products && Array.isArray((response.data as any).products)) {
          productsData = (response.data as any).products;
        }
      }
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await apiClient.stock.getLocations();
      setLocations(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  const handleCreateLocation = () => {
    setLocationFormData({
      name: '',
      address: '',
      type: 'warehouse',
      contactPerson: '',
      phone: ''
    });
    setFormErrors({});
    setShowLocationModal(true);
  };

  const handleUpdateStock = (stockItem: StockItem) => {
    setAdjustmentFormData({
      product: typeof stockItem.product === 'string' ? stockItem.product : stockItem.product._id,
      location: typeof stockItem.location === 'string' ? stockItem.location : stockItem.location._id,
      adjustmentType: 'adjustment',
      quantity: stockItem.quantity,
      reason: '',
      notes: ''
    });
    setFormErrors({});
    setShowAdjustmentModal(true);
  };

  const validateLocationForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!locationFormData.name.trim()) {
      errors.name = 'Location name is required';
    }
    if (!locationFormData.address.trim()) {
      errors.address = 'Address is required';
    }
    if (!locationFormData.type) {
      errors.type = 'Location type is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitLocation = async () => {
    if (!validateLocationForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      const response = await apiClient.stock.createLocation(locationFormData);
      setLocations([...locations, response.data]);
      setShowLocationModal(false);
      setLocationFormData({
        name: '',
        address: '',
        type: 'warehouse',
        contactPerson: '',
        phone: ''
      });
    } catch (error: any) {
      console.error('Error creating location:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to create location' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const validateStockForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!adjustmentFormData.product) {
      errors.product = 'Product is required';
    }
    if (!adjustmentFormData.location) {
      errors.location = 'Location is required';
    }
    if (adjustmentFormData.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }
    if (!adjustmentFormData.reason.trim()) {
      errors.reason = 'Reason is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitStock = async () => {
    if (!validateStockForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      const { product, location, adjustmentType, quantity, reason, notes } = adjustmentFormData;

      await apiClient.stock.adjustStock({
        product,
        location,
        adjustmentType,
        quantity,
        reason,
        notes
      });
      await fetchInventory(); // Refresh inventory
      setShowAdjustmentModal(false);
      setAdjustmentFormData({
        product: '',
        location: '',
        adjustmentType: 'add',
        quantity: 0,
        reason: '',
        notes: ''
      });
    } catch (error: any) {
      console.error('Error updating stock:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to adjust stock' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const viewStockHistory = async (item: StockItem) => {
    setSelectedItem(item);
    try {
      // For now, we'll simulate the transaction history
      // In a real implementation, this would fetch from the backend
      const mockTransactions = [
        {
          _id: '1',
          type: 'inward',
          quantity: 100,
          date: new Date().toISOString(),
          reason: 'Initial stock',
          user: 'Admin',
          reference: 'PO-001'
        },
        {
          _id: '2',
          type: 'outward',
          quantity: 25,
          date: new Date(Date.now() - 86400000).toISOString(),
          reason: 'Service ticket',
          user: 'Technician',
          reference: 'ST-001'
        }
      ];
      setStockTransactions(mockTransactions);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error fetching stock history:', error);
    }
  };

  const filteredInventory = Array.isArray(inventory) ? inventory.filter(item => {
    const productName = typeof item.product === 'string' ? '' : item.product.name;
    const locationName = typeof item.location === 'string' ? '' : item.location.name;
    
    const matchesSearch = productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         locationName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === 'all' || 
                          (typeof item.location === 'object' && item.location._id === locationFilter);
    
    return matchesSearch && matchesLocation;
  }) : [];

  const getStockStatus = (item: StockItem) => {
    const product = typeof item.product === 'object' ? item.product : null;
    if (!product) return 'unknown';
    
    if (item.quantity <= 0) return 'out_of_stock';
    if (item.quantity <= product.minStockLevel) return 'low_stock';
    return 'in_stock';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'text-green-800 bg-green-100';
      case 'low_stock':
        return 'text-yellow-800 bg-yellow-100';
      case 'out_of_stock':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'product',
      title: 'Product',
      render: (value) => (
        <div>
          <div className="font-medium">{typeof value === 'object' ? value.name : value}</div>
          <div className="text-sm text-gray-500">{typeof value === 'object' ? value.category : ''}</div>
        </div>
      )
    },
    {
      key: 'location',
      title: 'Location',
      render: (value) => (
        <span>{typeof value === 'object' ? value.name : value}</span>
      )
    },
    {
      key: 'quantity',
      title: 'Available',
      render: (value, record) => (
        <div className="text-center">
          <div className="font-bold text-lg">{value}</div>
          <div className="text-xs text-gray-500">Reserved: {record.reservedQuantity}</div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (value, record) => {
        const status = getStockStatus(record);
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
        );
      }
    },
    {
      key: 'lastUpdated',
      title: 'Last Updated',
      render: (value) => new Date(value).toLocaleDateString()
    }
  ];

  const locationFields: FormField[] = [
    {
      name: 'name',
      label: 'Location Name',
      type: 'text',
      required: true
    },
    {
      name: 'address',
      label: 'Address',
      type: 'textarea',
      required: true
    },
    {
      name: 'type',
      label: 'Location Type',
      type: 'select',
      required: true,
      options: [
        { value: 'warehouse', label: 'Warehouse' },
        { value: 'store', label: 'Store' },
        { value: 'main_office', label: 'Main Office' },
        { value: 'service_center', label: 'Service Center' }
      ]
    },
    {
      name: 'contactPerson',
      label: 'Contact Person',
      type: 'text',
      required: true
    },
    {
      name: 'phone',
      label: 'Contact Phone',
      type: 'tel',
      required: true
    },
    {
      name: 'capacity',
      label: 'Storage Capacity',
      type: 'number',
      required: true
    }
  ];

  const stockFields: FormField[] = [
    {
      name: 'adjustmentType',
      label: 'Adjustment Type',
      type: 'select',
      required: true,
      options: [
        { value: 'inward', label: 'Stock In' },
        { value: 'outward', label: 'Stock Out' },
        { value: 'adjustment', label: 'Stock Adjustment' },
        { value: 'transfer', label: 'Stock Transfer' }
      ]
    },
    {
      name: 'adjustmentQuantity',
      label: 'Quantity',
      type: 'number',
      required: true
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      required: false
    }
  ];

  const stats = [
    {
      title: 'Total Products',
      value: Array.isArray(inventory) ? inventory.length.toString() : '0',
      icon: <Package className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Low Stock Items',
      value: Array.isArray(inventory) ? inventory.filter(item => getStockStatus(item) === 'low_stock').length.toString() : '0',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'yellow'
    },
    {
      title: 'Out of Stock',
      value: Array.isArray(inventory) ? inventory.filter(item => getStockStatus(item) === 'out_of_stock').length.toString() : '0',
      icon: <TrendingDown className="w-6 h-6" />,
      color: 'red'
    },
    {
      title: 'Total Locations',
      value: Array.isArray(locations) ? locations.length.toString() : '0',
      icon: <Truck className="w-6 h-6" />,
      color: 'green'
    }
  ];

  return (
    <div className="pl-2 pr-6 py-6 space-y-6">
      <PageHeader 
        title="Inventory Management"
        subtitle="Track and manage stock across all locations"
      >
        <div className="flex space-x-3">
          <button 
            onClick={handleCreateLocation}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <MapPin className="w-5 h-5" />
            <span>Add Location</span>
          </button>
          <button 
            onClick={() => setShowLedgerModal(true)}
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 hover:from-orange-700 hover:to-orange-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Package className="w-5 h-5" />
            <span>Stock Ledger</span>
          </button>
          <button 
            onClick={fetchAllData}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl flex items-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Refresh</span>
          </button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Locations</option>
            {locations.map(location => (
              <option key={location._id} value={location._id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reserved</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">Loading inventory...</td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500">No inventory items found</td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.product.name}</div>
                          <div className="text-sm text-gray-500">{item.product.category} • {item.product.brand}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.location.name}</div>
                          <div className="text-sm text-gray-500">{item.location.type}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.reservedQuantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.availableQuantity || (item.quantity - (item.reservedQuantity || 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                          {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleUpdateStock(item)}
                            className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Adjust Stock"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => viewStockHistory(item)}
                            className="text-green-600 hover:text-green-900 p-2 rounded-lg hover:bg-green-50 transition-colors"
                            title="View History"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                          <button 
                            className="text-purple-600 hover:text-purple-900 p-2 rounded-lg hover:bg-purple-50 transition-colors"
                            title="Transfer Stock"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Location</h2>
              <button
                onClick={() => setShowLocationModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitLocation(); }} className="p-6 space-y-4">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={locationFormData.name}
                    onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter location name"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location Type *
                  </label>
                  <select
                    name="type"
                    value={locationFormData.type}
                    onChange={(e) => setLocationFormData({ ...locationFormData, type: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.type ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="warehouse">Warehouse</option>
                    <option value="main_office">Main Office</option>
                    <option value="service_center">Service Center</option>
                  </select>
                  {formErrors.type && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.type}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  name="address"
                  value={locationFormData.address}
                  onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter complete address"
                />
                {formErrors.address && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    name="contactPerson"
                    value={locationFormData.contactPerson}
                    onChange={(e) => setLocationFormData({ ...locationFormData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={locationFormData.phone}
                    onChange={(e) => setLocationFormData({ ...locationFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Adjust Stock</h2>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitStock(); }} className="p-6 space-y-4">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjustment Type *
                  </label>
                  <select
                    name="adjustmentType"
                    value={adjustmentFormData.adjustmentType}
                    onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, adjustmentType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="add">Add Stock</option>
                    <option value="subtract">Remove Stock</option>
                    <option value="set">Set Stock Level</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={adjustmentFormData.quantity}
                    onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, quantity: Number(e.target.value) })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <input
                  type="text"
                  name="reason"
                  value={adjustmentFormData.reason}
                  onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter reason for adjustment"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={adjustmentFormData.notes}
                  onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes (optional)"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Adjusting...' : 'Adjust Stock'}
                </button>
              </div>
            </form>
                     </div>
         </div>
       )}

       {/* Stock History Modal */}
       {showHistoryModal && selectedItem && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between p-6 border-b border-gray-200">
               <h2 className="text-xl font-semibold text-gray-900">
                 Stock History - {selectedItem.product.name} @ {selectedItem.location.name}
               </h2>
               <button
                 onClick={() => setShowHistoryModal(false)}
                 className="text-gray-400 hover:text-gray-600"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>

             <div className="p-6">
               <div className="bg-gray-50 p-4 rounded-lg mb-6">
                 <h3 className="text-lg font-medium text-gray-900 mb-2">Current Stock Status</h3>
                 <div className="grid grid-cols-3 gap-4">
                   <div className="text-center">
                     <p className="text-2xl font-bold text-gray-900">{selectedItem.quantity}</p>
                     <p className="text-sm text-gray-600">Total Stock</p>
                   </div>
                   <div className="text-center">
                     <p className="text-2xl font-bold text-yellow-600">{selectedItem.reservedQuantity}</p>
                     <p className="text-sm text-gray-600">Reserved</p>
                   </div>
                   <div className="text-center">
                     <p className="text-2xl font-bold text-green-600">
                       {selectedItem.availableQuantity || (selectedItem.quantity - (selectedItem.reservedQuantity || 0))}
                     </p>
                     <p className="text-sm text-gray-600">Available</p>
                   </div>
                 </div>
               </div>

               <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h3>
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead className="bg-gray-50">
                     <tr>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-200">
                     {stockTransactions.length === 0 ? (
                       <tr>
                         <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No transactions found</td>
                       </tr>
                     ) : (
                       stockTransactions.map((transaction) => (
                         <tr key={transaction._id} className="hover:bg-gray-50">
                           <td className="px-4 py-4 text-sm text-gray-900">
                             {new Date(transaction.date).toLocaleDateString()}
                           </td>
                           <td className="px-4 py-4 text-sm">
                             <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                               transaction.type === 'inward' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                             }`}>
                               {transaction.type === 'inward' ? '↗ Inward' : '↙ Outward'}
                             </span>
                           </td>
                           <td className="px-4 py-4 text-sm font-medium text-gray-900">
                             {transaction.type === 'inward' ? '+' : '-'}{transaction.quantity}
                           </td>
                           <td className="px-4 py-4 text-sm text-gray-600">{transaction.reason}</td>
                           <td className="px-4 py-4 text-sm text-gray-600">{transaction.reference}</td>
                           <td className="px-4 py-4 text-sm text-gray-600">{transaction.user}</td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
             </div>

             <div className="px-6 py-4 border-t border-gray-200">
               <button
                 onClick={() => setShowHistoryModal(false)}
                 className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
               >
                 Close
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Stock Ledger Modal */}
       {showLedgerModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between p-6 border-b border-gray-200">
               <h2 className="text-xl font-semibold text-gray-900">Stock Ledger - All Transactions</h2>
               <button
                 onClick={() => setShowLedgerModal(false)}
                 className="text-gray-400 hover:text-gray-600"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>

             <div className="p-6">
               <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                 <h3 className="text-lg font-medium text-yellow-800 mb-2">📋 Stock Ledger Features</h3>
                 <p className="text-yellow-700 text-sm">
                   This will show comprehensive Inward/Outward stock movements including:
                 </p>
                 <ul className="text-yellow-700 text-sm mt-2 ml-4 list-disc">
                   <li>Purchase Order receipts (Inward)</li>
                   <li>Service ticket parts usage (Outward)</li>
                   <li>Stock adjustments and transfers</li>
                   <li>Serial number tracking</li>
                   <li>Stock reconciliation reports</li>
                 </ul>
               </div>

               <div className="text-center py-12">
                 <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                 <h3 className="text-lg font-medium text-gray-900 mb-2">Stock Ledger Coming Soon</h3>
                 <p className="text-gray-600 mb-4">
                   Comprehensive stock transaction ledger with Purchase Order integration and Serial number tracking
                 </p>
                 <div className="flex justify-center space-x-4">
                   <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                     Purchase Orders
                   </span>
                   <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                     Serial Numbers
                   </span>
                   <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                     Reconciliation
                   </span>
                 </div>
               </div>
             </div>

             <div className="px-6 py-4 border-t border-gray-200">
               <button
                 onClick={() => setShowLedgerModal(false)}
                 className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
               >
                 Close
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default InventoryManagement; 