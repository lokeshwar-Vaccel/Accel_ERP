import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Truck
} from 'lucide-react';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Form } from '../components/ui/Form';
import { Button } from '../components/ui/Botton';
import { Stock, Product, StockLocation, TableColumn, FormField } from '../types';
import { apiClient } from '../utils/api';

const InventoryManagement: React.FC = () => {
  const [inventory, setInventory] = useState<Stock[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [showStockModal, setShowStockModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<any>({});

  useEffect(() => {
    Promise.all([
      fetchInventory(),
      fetchProducts(),
      fetchLocations()
    ]);
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const response = await apiClient.stock.getStock();
      setInventory(response.data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await apiClient.stock.getLocations();
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleCreateLocation = () => {
    setFormData({
      name: '',
      address: '',
      type: 'warehouse',
      contactPerson: '',
      phone: '',
      capacity: 0
    });
    setFormErrors({});
    setShowLocationModal(true);
  };

  const handleUpdateStock = (stockItem: Stock) => {
    setFormData({
      stockId: stockItem._id,
      product: typeof stockItem.product === 'string' ? stockItem.product : stockItem.product._id,
      location: typeof stockItem.location === 'string' ? stockItem.location : stockItem.location._id,
      quantity: stockItem.quantity,
      adjustmentType: 'adjustment',
      adjustmentQuantity: 0,
      notes: ''
    });
    setFormErrors({});
    setShowStockModal(true);
  };

  const handleSubmitLocation = async () => {
    try {
      setFormErrors({});
      const response = await apiClient.stock.createLocation(formData);
      setLocations([...locations, response.data]);
      setShowLocationModal(false);
      setFormData({});
    } catch (error: any) {
      console.error('Error creating location:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      }
    }
  };

  const handleSubmitStock = async () => {
    try {
      setFormErrors({});
      const { stockId, product, location, adjustmentType, adjustmentQuantity, notes } = formData;
      
      const updateData = {
        type: adjustmentType,
        quantity: adjustmentQuantity,
        notes
      };

      await apiClient.stock.updateStock(product, location, updateData);
      await fetchInventory(); // Refresh inventory
      setShowStockModal(false);
      setFormData({});
    } catch (error: any) {
      console.error('Error updating stock:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      }
    }
  };

  const filteredInventory = inventory.filter(item => {
    const productName = typeof item.product === 'string' ? '' : item.product.name;
    const locationName = typeof item.location === 'string' ? '' : item.location.name;
    
    const matchesSearch = productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         locationName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = locationFilter === 'all' || 
                           (typeof item.location === 'object' && item.location._id === locationFilter);
    
    return matchesSearch && matchesLocation;
  });

  const getStockStatus = (item: Stock) => {
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
      value: inventory.length.toString(),
      icon: <Package className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Low Stock Items',
      value: inventory.filter(item => getStockStatus(item) === 'low_stock').length.toString(),
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'yellow'
    },
    {
      title: 'Out of Stock',
      value: inventory.filter(item => getStockStatus(item) === 'out_of_stock').length.toString(),
      icon: <TrendingDown className="w-6 h-6" />,
      color: 'red'
    },
    {
      title: 'Total Locations',
      value: locations.length.toString(),
      icon: <Truck className="w-6 h-6" />,
      color: 'green'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track and manage stock across all locations</p>
        </div>
        <div className="flex space-x-3">
          <Button onClick={handleCreateLocation} variant="outline">
            <Plus className="w-5 h-5 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

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
      <Table
        columns={columns}
        data={filteredInventory}
        loading={loading}
        onEdit={handleUpdateStock}
        actions={true}
      />

      {/* Stock Update Modal */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title="Update Stock"
        size="md"
      >
        <Form
          fields={stockFields}
          values={formData}
          onChange={(name, value) => setFormData({ ...formData, [name]: value })}
          errors={formErrors}
        />
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => setShowStockModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmitStock}>
            Update Stock
          </Button>
        </div>
      </Modal>

      {/* Location Creation Modal */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="Add New Location"
        size="lg"
      >
        <Form
          fields={locationFields}
          values={formData}
          onChange={(name, value) => setFormData({ ...formData, [name]: value })}
          errors={formErrors}
        />
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={() => setShowLocationModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmitLocation}>
            Create Location
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default InventoryManagement; 