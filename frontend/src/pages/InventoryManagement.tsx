import React, { useState, useEffect, useRef } from 'react';
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
  Eye,
  Building2,
  User,
  Phone,
  Shield,
  Clock,
  Tag,
  Filter,
  LocateFixed,
  Map,
  MapPinIcon
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
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Custom dropdown states
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAddLocationModal, setAddShowLocationModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  // Form states
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [stockTransactions, setStockTransactions] = useState<any[]>([]);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  console.log("selectedLocation:", selectedLocation);

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

  const filteredLocations = locations.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'all' || location.type === selectedType;

    return matchesSearch && matchesType;
  });

  const uniqueTypes = [...new Set(locations.map(location => location.type))];

  console.log("filteredLocations:", filteredLocations);


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
        setShowCategoryDropdown(false);
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
      console.log("response:", response);

      setLocations(Array.isArray(response.data.locations) ? response.data.locations : []);
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

  const handleEditLocation = (location: any) => {
    setEditingLocation(location._id);
    setLocationFormData(location);
    setAddShowLocationModal(true);
  };

  const handleCreateNewLocation = () => {
    setLocationFormData({
      name: '',
      address: '',
      type: 'warehouse',
      contactPerson: '',
      phone: ''
    });
    setFormErrors({});
    setAddShowLocationModal(true);
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
      // const response = await apiClient.stock.createLocation(locationFormData);
      // setLocations([...locations, response.data.location]);
      if (editingLocation) {
        await apiClient.stock.updateLocation(editingLocation, locationFormData);
        setLocations(prev => prev.map(loc => (loc._id === editingLocation ? { ...loc, ...locationFormData } : loc)));
      } else {
        const response = await apiClient.stock.createLocation(locationFormData);
        setLocations(prev => [...prev, response.data.location]);
      }
      setAddShowLocationModal(false);
      fetchLocations();
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

  const openDeleteConfirm = (location: any) => {
    setUserToDelete(location);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setUserToDelete(null);
  };

  const handleViewLocation = (location: any) => {
    setSelectedLocation(location);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedLocation(null);
  };

  const handleDeleteLocation = async () => {
    if (!userToDelete) return;

    try {
      await apiClient.stock.deleteLocation(userToDelete._id);
      setLocations(prev => prev.filter(loc => loc._id !== userToDelete._id));
      // await fetchLocations();
      closeDeleteConfirm();
    } catch (error) {
      console.error('Error deleting location:', error);
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

  // Transfer initiation handler
  const handleInitiateTransfer = (stockItem: StockItem) => {
    const productId = typeof stockItem.product === 'string' ? stockItem.product : stockItem.product._id;
    const locationId = typeof stockItem.location === 'string' ? stockItem.location : stockItem.location._id;
    const maxQuantity = stockItem.availableQuantity || (stockItem.quantity - (stockItem.reservedQuantity || 0));

    setTransferFormData({
      product: productId,
      fromLocation: locationId,
      toLocation: '',
      quantity: Math.min(maxQuantity, 1),
      notes: ''
    });
    setFormErrors({});
    setShowTransferModal(true);
  };

  // Transfer form validation
  const validateTransferForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!transferFormData.product) {
      errors.product = 'Product is required';
    }
    if (!transferFormData.fromLocation) {
      errors.fromLocation = 'Source location is required';
    }
    if (!transferFormData.toLocation) {
      errors.toLocation = 'Destination location is required';
    }
    if (transferFormData.fromLocation === transferFormData.toLocation) {
      errors.toLocation = 'Source and destination locations must be different';
    }
    if (transferFormData.quantity <= 0) {
      errors.quantity = 'Transfer quantity must be greater than 0';
    }

    // Check maximum available quantity
    const sourceItem = inventory.find(item => {
      const productId = typeof item.product === 'string' ? item.product : item.product._id;
      const locationId = typeof item.location === 'string' ? item.location : item.location._id;
      return productId === transferFormData.product && locationId === transferFormData.fromLocation;
    });

    if (sourceItem) {
      const maxAvailable = sourceItem.availableQuantity || (sourceItem.quantity - (sourceItem.reservedQuantity || 0));
      if (transferFormData.quantity > maxAvailable) {
        errors.quantity = `Cannot transfer more than ${maxAvailable} units`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Transfer submission handler
  const handleSubmitTransfer = async () => {
    if (!validateTransferForm()) return;

    setSubmitting(true);
    try {
      await apiClient.stock.transferStock(transferFormData);

      // Simulate inventory update
      setInventory(prevInventory => {
        return prevInventory.map(item => {
          const productId = typeof item.product === 'string' ? item.product : item.product._id;
          const locationId = typeof item.location === 'string' ? item.location : item.location._id;

          // Update source location
          if (productId === transferFormData.product && locationId === transferFormData.fromLocation) {
            return {
              ...item,
              quantity: item.quantity - transferFormData.quantity,
              availableQuantity: (item.availableQuantity || 0) - transferFormData.quantity
            };
          }

          return item;
        });
      });

      setShowTransferModal(false);
      setTransferFormData({
        product: '',
        fromLocation: '',
        toLocation: '',
        quantity: 0,
        notes: ''
      });

      // Show success message (in real app, use toast notification)
      alert('Stock transfer completed successfully!');

    } catch (error) {
      console.error('Stock transfer failed:', error);
      setFormErrors({ general: 'Stock transfer failed. Please try again.' });
    } finally {
      setSubmitting(false);
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
          <div className="text-xs text-gray-500">{typeof value === 'object' ? value.category : ''}</div>
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

  // Category options with labels
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'genset', label: 'Generator Set' },
    { value: 'spare_part', label: 'Spare Part' },
    { value: 'accessory', label: 'Accessory' }
  ];

  const getCategoryLabel = (value: string) => {
    const option = categoryOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Categories';
  };

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      <PageHeader
        title="Inventory Management"
        subtitle="Track and manage stock across all locations"
      >
        <div className="flex space-x-3">
          <button
            onClick={handleCreateLocation}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Add Location</span>
          </button>
          <button
            onClick={() => setShowLedgerModal(true)}
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-orange-700 hover:to-orange-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Package className="w-4 h-4" />
            <span className="text-sm">Stock Ledger</span>
          </button>
          <button
            onClick={fetchAllData}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </PageHeader>

      {/* Stats */}
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

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex items-center justify-between w-full md:w-40 px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getCategoryLabel(categoryFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                {categoryOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setCategoryFilter(option.value);
                      setShowCategoryDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${categoryFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            Showing {filteredInventory.length} of {inventory.length} items
          </span>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reserved</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading inventory...</td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No inventory items found</td>
                </tr>
              ) : (
                filteredInventory.map((item) => {
                  const status = getStockStatus(item);
                  return (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-xs font-medium text-gray-900">{item.product.name}</div>
                          <div className="text-xs text-gray-500">{item.product.category} • {item.product.brand}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-xs font-medium text-gray-900">{item.location.name}</div>
                          <div className="text-xs text-gray-500">{item.location.type}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {item.reservedQuantity}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                        {item.availableQuantity || (item.quantity - (item.reservedQuantity || 0))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                          {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {new Date(item.lastUpdated).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
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
                            onClick={() => handleInitiateTransfer(item)}
                            // disabled={maxTransfer <= 0}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{editingLocation ? 'Edit Location' : 'Add Locations'}</h2>
              <button
                onClick={showAddLocationModal ?
                  () => { setAddShowLocationModal(false); setEditingLocation(null) }
                  : () => { setShowLocationModal(false); setAddShowLocationModal(false); setSelectedType('all') }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {showAddLocationModal && <form onSubmit={(e) => { e.preventDefault(); handleSubmitLocation(); }} className="p-4 space-y-3">
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
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.name ? 'border-red-500' : 'border-gray-300'
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
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.type ? 'border-red-500' : 'border-gray-300'
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
                  className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.address ? 'border-red-500' : 'border-gray-300'
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
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setAddShowLocationModal(false); setEditingLocation(null) }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {editingLocation ? submitting ? 'Updating...' : 'Update Location' : submitting ? 'Creating...' : 'Create Location'}
                </button>
              </div>
            </form>}

            {!showAddLocationModal && <div className=" bg-gray-50 p-6">
              <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">

                  <div className="flex items-center justify-between mb-6">
                    <div className='flex justify-between'>
                      <MapPinIcon className="h-8 w-8 text-blue-600 m-2" />
                      <div>
                        <h1 className="text-1xl font-bold text-gray-900 flex items-center gap-2">
                          Locations
                        </h1>
                        <p className="text-gray-600 text-sm mt-1">Manage your warehouse locations</p>
                      </div>
                    </div>
                    <button
                      onClick={handleCreateNewLocation}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-md"
                    >
                      <Plus className="h-4 w-4" />
                      Add Location
                    </button>
                  </div>

                  {/* Search Bar */}
                  <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                      <input
                        type="text"
                        placeholder="Search locations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm font-medium min-w-[140px] appearance-none cursor-pointer"
                      >
                        <option value="all">All Types</option>
                        {uniqueTypes.map(type => (
                          <option key={type} value={type} className="capitalize">
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 mt-6">
                    {filteredLocations.length === 0 ? (
                      <div className="text-center py-12">
                        <Building2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {searchTerm ? 'No locations found' : 'No locations yet'}
                        </h3>
                        <p className="text-gray-600 mb-6">
                          {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first location'}
                        </p>
                        {!searchTerm && (
                          <button
                            onClick={handleCreateNewLocation}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
                          >
                            <Plus className="h-5 w-5" />
                            Add Your First Location
                          </button>
                        )}
                      </div>
                    ) : (filteredLocations.map(location => (
                      <div key={location._id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="p-4">
                          {/* Header */}
                          <div className="flex items-start justify-between ">
                            {/* <div className="flex items-start justify-between mb-4"> */}
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-100 rounded-lg">
                                <Building2 className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${location.isActive
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-red-100 text-red-700'
                                    }`}>
                                    {location.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-500 capitalize">{location.type}</p>
                              </div>
                            </div>
                            {/* </div> */}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleViewLocation(location)}
                                className="p-2 hover:text-green-400 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleEditLocation(location)}
                                className="p-2 hover:text-blue-400 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit location"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openDeleteConfirm(location)}
                                className="p-2 hover:text-red-400 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete location"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                        </div>
                      </div>
                    )
                    ))}
                  </div>
                </div>
              </div>
            </div>}
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[70vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-orange-400 to-orange-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white bg-opacity-20 rounded-lg">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedLocation.name}</h2>
                    <p className="text-blue-100 text-sm">Location Details</p>
                  </div>
                </div>
                <button
                  onClick={closeViewModal}
                  className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Status and Type */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className={`p-4 rounded-lg border-2 ${selectedLocation.isActive
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
                  }`}>
                  <div className="flex items-center gap-2">
                    <Shield className={`h-5 w-5 ${selectedLocation.isActive ? 'text-green-600' : 'text-red-600'
                      }`} />
                    <div className={`text-sm font-medium ${selectedLocation.isActive ? 'text-green-600' : 'text-red-600'
                      }`}>Status</div>
                  </div>
                  <div className={`text-2xl font-bold ${selectedLocation.isActive ? 'text-green-700' : 'text-red-700'
                    }`}>
                    {selectedLocation.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-blue-600" />
                    <div className="text-blue-600 text-sm font-medium">Type</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-700 capitalize">{selectedLocation.type}</div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Details</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <MapPin className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Address</div>
                      <div className="text-gray-700 mt-1">{selectedLocation.address}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <User className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Contact Person</div>
                      <div className="text-gray-700 mt-1">{selectedLocation.contactPerson}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Phone className="h-5 w-5 text-gray-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Phone</div>
                      <div className="text-gray-700 mt-1">{selectedLocation.phone}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    Last Updated
                  </div>
                  <div className="text-gray-700 font-medium">
                    {new Date(selectedLocation.updatedAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(selectedLocation.updatedAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Adjust Stock</h2>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitStock(); }} className="p-4 space-y-3">
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
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
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
                    <p className="text-xl font-bold text-gray-900">{selectedItem.quantity}</p>
                    <p className="text-xs text-gray-600">Total Stock</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-yellow-600">{selectedItem.reservedQuantity}</p>
                    <p className="text-xs text-gray-600">Reserved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">
                      {selectedItem.availableQuantity || (selectedItem.quantity - (selectedItem.reservedQuantity || 0))}
                    </p>
                    <p className="text-xs text-gray-600">Available</p>
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
                          <td className="px-4 py-4 text-xs text-gray-900">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transaction.type === 'inward' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                              {transaction.type === 'inward' ? '↗ Inward' : '↙ Outward'}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs font-medium text-gray-900">
                            {transaction.type === 'inward' ? '+' : '-'}{transaction.quantity}
                          </td>
                          <td className="px-4 py-4 text-xs text-gray-600">{transaction.reason}</td>
                          <td className="px-4 py-4 text-xs text-gray-600">{transaction.reference}</td>
                          <td className="px-4 py-4 text-xs text-gray-600">{transaction.user}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm m-4">
            <div className="p-4">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-orange-100 rounded-full">
                <Trash2 className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Location
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to deactivate <strong>{userToDelete.name}</strong>?
                {/* The user will be marked as deleted but can be restored later if needed. */}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteLocation}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Deleting...' : 'Delete Location'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Ledger Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
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
                <ul className="text-yellow-700 text-sm mt-2 ml-3 list-disc">
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
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Transfer Stock</h3>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Product Details Card */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <Package className="w-8 h-8 text-yellow-600 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {products.find(p => p._id === transferFormData.product)?.name || 'Unknown Product'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Model Number: {products.find(p => p._id === transferFormData.product)?.modelNumber || 'N/A'}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Total Stock:</span>
                        <span className="ml-2 font-medium">
                          {inventory.find(item => {
                            const productId = typeof item.product === 'string' ? item.product : item.product._id;
                            const locationId = typeof item.location === 'string' ? item.location : item.location._id;
                            return productId === transferFormData.product && locationId === transferFormData.fromLocation;
                          })?.quantity || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Available:</span>
                        <span className="ml-2 font-medium text-green-600">
                          {inventory.find(item => {
                            const productId = typeof item.product === 'string' ? item.product : item.product._id;
                            const locationId = typeof item.location === 'string' ? item.location : item.location._id;
                            return productId === transferFormData.product && locationId === transferFormData.fromLocation;
                          })?.availableQuantity || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {formErrors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{formErrors.general}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From Location</label>
                  <div className="flex items-center p-3 bg-gray-50 border border-gray-300 rounded-lg">
                    <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-700">
                      {locations.find(l => l._id === transferFormData.fromLocation)?.name || 'Unknown Location'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={transferFormData.toLocation}
                    onChange={(e) => {
                      setTransferFormData({ ...transferFormData, toLocation: e.target.value });
                      if (formErrors.toLocation) {
                        setFormErrors({ ...formErrors, toLocation: '' });
                      }
                    }}
                    className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${formErrors.toLocation ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                  >
                    <option value="">Select destination location</option>
                    {locations
                      .filter(loc => loc._id !== transferFormData.fromLocation)
                      .map(loc => (
                        <option key={loc._id} value={loc._id}>{loc.name}</option>
                      ))
                    }
                  </select>
                  {formErrors.toLocation && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.toLocation}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={transferFormData.quantity}
                    onChange={(e) => {
                      setTransferFormData({ ...transferFormData, quantity: Number(e.target.value) });
                      if (formErrors.quantity) {
                        setFormErrors({ ...formErrors, quantity: '' });
                      }
                    }}
                    min="1"
                    max={inventory.find(item => {
                      const productId = typeof item.product === 'string' ? item.product : item.product._id;
                      const locationId = typeof item.location === 'string' ? item.location : item.location._id;
                      return productId === transferFormData.product && locationId === transferFormData.fromLocation;
                    })?.availableQuantity || 0}
                    className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors ${formErrors.quantity ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    placeholder="Enter quantity to transfer"
                  />
                  {formErrors.quantity && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.quantity}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={transferFormData.notes}
                    onChange={(e) => setTransferFormData({ ...transferFormData, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors resize-none"
                    rows={3}
                    placeholder="Add notes about this transfer (optional)"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center rounded-lg justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowTransferModal(false)}
                disabled={submitting}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitTransfer}
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Transferring...
                  </span>
                ) : (
                  'Transfer Stock'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryManagement; 