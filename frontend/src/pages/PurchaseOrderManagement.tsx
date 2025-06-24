import React, { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Form } from '../components/ui/Form';
import { Button } from '../components/ui/Botton';
import { PurchaseOrder, Product, StockLocation, TableColumn, FormField } from '../types';
import { apiClient } from '../utils/api';

const PurchaseOrderManagement: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockLocations, setStockLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<any>({});

  useEffect(() => {
    Promise.all([
      fetchPurchaseOrders(),
      fetchProducts(),
      fetchStockLocations()
    ]);
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.purchaseOrders.getAll();
      setPurchaseOrders(response.data);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
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

  const fetchStockLocations = async () => {
    try {
      const response = await apiClient.stock.getLocations();
      setStockLocations(response.data);
    } catch (error) {
      console.error('Error fetching stock locations:', error);
    }
  };

  const handleCreate = () => {
    setFormData({
      supplier: '',
      deliveryLocation: '',
      expectedDeliveryDate: '',
      paymentTerms: 'net_30',
      supplierContact: {
        name: '',
        email: '',
        phone: ''
      },
      items: [
        {
          product: '',
          quantity: 1,
          unitPrice: 0
        }
      ]
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleEdit = (po: PurchaseOrder) => {
    setEditingPO(po);
    setFormData({
      supplier: po.supplier,
      deliveryLocation: typeof po.deliveryLocation === 'string' ? po.deliveryLocation : po.deliveryLocation._id,
      expectedDeliveryDate: po.expectedDeliveryDate.split('T')[0],
      paymentTerms: po.paymentTerms,
      supplierContact: po.supplierContact,
      items: po.items.map(item => ({
        product: typeof item.product === 'string' ? item.product : item.product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleDelete = async (po: PurchaseOrder) => {
    if (window.confirm('Are you sure you want to delete this purchase order?')) {
      try {
        await apiClient.purchaseOrders.delete(po._id);
        setPurchaseOrders(purchaseOrders.filter(p => p._id !== po._id));
      } catch (error) {
        console.error('Error deleting purchase order:', error);
      }
    }
  };

  const handleSubmit = async (isEdit: boolean = false) => {
    try {
      setFormErrors({});
      
      // Calculate total amount
      const totalAmount = formData.items.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unitPrice), 0);
      
      const poData = {
        ...formData,
        totalAmount,
        items: formData.items.map((item: any) => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice
        }))
      };
      
      if (isEdit && editingPO) {
        const response = await apiClient.purchaseOrders.update(editingPO._id, poData);
        setPurchaseOrders(purchaseOrders.map(p => p._id === editingPO._id ? response.data : p));
        setShowEditModal(false);
      } else {
        const response = await apiClient.purchaseOrders.create(poData);
        setPurchaseOrders([...purchaseOrders, response.data]);
        setShowCreateModal(false);
      }
      
      setFormData({});
      setEditingPO(null);
    } catch (error: any) {
      console.error('Error saving purchase order:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      }
    }
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
      items: formData.items.filter((_: any, i: number) => i !== index)
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
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-blue-800 bg-blue-100';
      case 'received':
        return 'text-green-800 bg-green-100';
      case 'cancelled':
        return 'text-red-800 bg-red-100';
      case 'pending':
        return 'text-yellow-800 bg-yellow-100';
      default:
        return 'text-gray-800 bg-gray-100';
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

  const columns: TableColumn[] = [
    {
      key: 'poNumber',
      title: 'PO Number',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-blue-600">{value}</span>
      )
    },
    {
      key: 'supplier',
      title: 'Supplier',
      sortable: true
    },
    {
      key: 'totalAmount',
      title: 'Total Amount',
      render: (value) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'orderDate',
      title: 'Order Date',
      render: (value) => formatDate(value)
    },
    {
      key: 'expectedDeliveryDate',
      title: 'Expected Delivery',
      render: (value) => formatDate(value)
    },
    {
      key: 'status',
      title: 'Status',
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      )
    }
  ];

  const formFields: FormField[] = [
    {
      name: 'supplier',
      label: 'Supplier',
      type: 'text',
      required: true
    },
    {
      name: 'deliveryLocation',
      label: 'Delivery Location',
      type: 'select',
      required: true,
      options: stockLocations.map(location => ({
        value: location._id,
        label: location.name
      }))
    },
    {
      name: 'expectedDeliveryDate',
      label: 'Expected Delivery Date',
      type: 'date',
      required: true
    },
    {
      name: 'paymentTerms',
      label: 'Payment Terms',
      type: 'select',
      required: true,
      options: [
        { value: 'net_30', label: 'Net 30' },
        { value: 'net_15', label: 'Net 15' },
        { value: 'cod', label: 'Cash on Delivery' },
        { value: 'advance', label: 'Advance Payment' }
      ]
    },
    {
      name: 'supplierContact.name',
      label: 'Contact Person',
      type: 'text',
      required: true
    },
    {
      name: 'supplierContact.email',
      label: 'Contact Email',
      type: 'email',
      required: true
    },
    {
      name: 'supplierContact.phone',
      label: 'Contact Phone',
      type: 'tel',
      required: true
    }
  ];

  const stats = [
    {
      title: 'Total POs',
      value: purchaseOrders.length.toString(),
      icon: <Package className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Pending',
      value: purchaseOrders.filter(po => po.status === 'pending').length.toString(),
      icon: <Clock className="w-6 h-6" />,
      color: 'yellow'
    },
    {
      title: 'Confirmed',
      value: purchaseOrders.filter(po => po.status === 'confirmed').length.toString(),
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Total Value',
      value: formatCurrency(purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)),
      icon: <DollarSign className="w-6 h-6" />,
      color: 'green'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Order Management</h1>
          <p className="text-gray-600 mt-1">Manage procurement and purchase orders</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>New Purchase Order</span>
        </Button>
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
              placeholder="Search purchase orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <Table
        columns={columns}
        data={filteredPOs}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showCreateModal || showEditModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowEditModal(false);
        }}
        title={showCreateModal ? "Create Purchase Order" : "Edit Purchase Order"}
        size="xl"
      >
        <div className="space-y-6">
          <Form
            fields={formFields}
            values={formData}
            onChange={(name, value) => {
              if (name.includes('.')) {
                const [parent, child] = name.split('.');
                setFormData({
                  ...formData,
                  [parent]: {
                    ...formData[parent],
                    [child]: value
                  }
                });
              } else {
                setFormData({ ...formData, [name]: value });
              }
            }}
            errors={formErrors}
          />

          {/* Items Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Items</h3>
              <Button onClick={addItem} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
            
            <div className="space-y-3">
              {formData.items?.map((item: any, index: number) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                    <select
                      value={item.product}
                      onChange={(e) => updateItem(index, 'product', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Product</option>
                      {products.map(product => (
                        <option key={product._id} value={product._id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-2">
                    {formData.items.length > 1 && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => removeItem(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="mt-4 text-right">
              <p className="text-lg font-semibold">
                Total: {formatCurrency(
                  formData.items?.reduce((sum: number, item: any) => 
                    sum + (item.quantity * item.unitPrice), 0) || 0
                )}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setShowEditModal(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => handleSubmit(showEditModal)}>
              {showCreateModal ? 'Create Purchase Order' : 'Update Purchase Order'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PurchaseOrderManagement; 