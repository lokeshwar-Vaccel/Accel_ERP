import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users
} from 'lucide-react';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Form } from '../components/ui/Form';
import { Button } from '../components/ui/Botton';
import { AMC, Customer, Product, TableColumn, FormField, AMCStatus } from '../types';
import { apiClient } from '../utils/api';

const AMCManagement: React.FC = () => {
  const [amcs, setAmcs] = useState<AMC[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingAMC, setEditingAMC] = useState<AMC | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formErrors, setFormErrors] = useState<any>({});

  useEffect(() => {
    Promise.all([
      fetchAMCs(),
      fetchCustomers(),
      fetchProducts()
    ]);
  }, []);

  const fetchAMCs = async () => {
    try {
      setLoading(true);
      const response = await apiClient.amc.getAll();
      setAmcs(response.data);
    } catch (error) {
      console.error('Error fetching AMCs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll();
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
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

  const handleCreate = () => {
    setFormData({
      customer: '',
      products: [],
      startDate: '',
      endDate: '',
      contractValue: 0,
      scheduledVisits: 0,
      contractType: 'comprehensive',
      paymentTerms: 'annual'
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleEdit = (amc: AMC) => {
    setEditingAMC(amc);
    setFormData({
      customer: typeof amc.customer === 'string' ? amc.customer : amc.customer._id,
      products: Array.isArray(amc.products) ? amc.products.map(p => typeof p === 'string' ? p : p._id) : [],
      startDate: amc.startDate.split('T')[0],
      endDate: amc.endDate.split('T')[0],
      contractValue: amc.contractValue,
      scheduledVisits: amc.scheduledVisits,
      contractType: amc.contractType,
      paymentTerms: amc.paymentTerms
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleDelete = async (amc: AMC) => {
    if (window.confirm('Are you sure you want to delete this AMC contract?')) {
      try {
        await apiClient.amc.delete(amc._id);
        setAmcs(amcs.filter(a => a._id !== amc._id));
      } catch (error) {
        console.error('Error deleting AMC:', error);
      }
    }
  };

  const handleSubmit = async (isEdit: boolean = false) => {
    try {
      setFormErrors({});
      
      if (isEdit && editingAMC) {
        const response = await apiClient.amc.update(editingAMC._id, formData);
        setAmcs(amcs.map(a => a._id === editingAMC._id ? response.data : a));
        setShowEditModal(false);
      } else {
        const response = await apiClient.amc.create(formData);
        setAmcs([...amcs, response.data]);
        setShowCreateModal(false);
      }
      
      setFormData({});
      setEditingAMC(null);
    } catch (error: any) {
      console.error('Error saving AMC:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      }
    }
  };

  const filteredAMCs = amcs.filter(amc => {
    const customerName = typeof amc.customer === 'string' ? amc.customer : amc.customer.name;
    const matchesSearch = amc.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || amc.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: AMCStatus) => {
    switch (status) {
      case AMCStatus.ACTIVE:
        return 'text-green-800 bg-green-100';
      case AMCStatus.EXPIRED:
        return 'text-red-800 bg-red-100';
      case AMCStatus.CANCELLED:
        return 'text-gray-800 bg-gray-100';
      case AMCStatus.PENDING:
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
      key: 'contractNumber',
      title: 'Contract Number',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-blue-600">{value}</span>
      )
    },
    {
      key: 'customer',
      title: 'Customer',
      render: (value) => (
        <span>{typeof value === 'string' ? value : value.name}</span>
      )
    },
    {
      key: 'contractValue',
      title: 'Contract Value',
      render: (value) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'startDate',
      title: 'Start Date',
      render: (value) => formatDate(value)
    },
    {
      key: 'endDate',
      title: 'End Date',
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
    },
    {
      key: 'scheduledVisits',
      title: 'Visits',
      render: (value, record) => (
        <span>{record.completedVisits || 0}/{value}</span>
      )
    }
  ];

  const formFields: FormField[] = [
    {
      name: 'customer',
      label: 'Customer',
      type: 'select',
      required: true,
      options: customers.map(customer => ({
        value: customer._id,
        label: customer.name
      }))
    },
    {
      name: 'products',
      label: 'Products',
      type: 'multiselect',
      required: true,
      options: products.map(product => ({
        value: product._id,
        label: product.name
      }))
    },
    {
      name: 'startDate',
      label: 'Start Date',
      type: 'date',
      required: true
    },
    {
      name: 'endDate',
      label: 'End Date',
      type: 'date',
      required: true
    },
    {
      name: 'contractValue',
      label: 'Contract Value (₹)',
      type: 'number',
      required: true
    },
    {
      name: 'scheduledVisits',
      label: 'Scheduled Visits',
      type: 'number',
      required: true
    },
    {
      name: 'contractType',
      label: 'Contract Type',
      type: 'select',
      required: true,
      options: [
        { value: 'comprehensive', label: 'Comprehensive' },
        { value: 'breakdown', label: 'Breakdown' },
        { value: 'preventive', label: 'Preventive' }
      ]
    },
    {
      name: 'paymentTerms',
      label: 'Payment Terms',
      type: 'select',
      required: true,
      options: [
        { value: 'annual', label: 'Annual' },
        { value: 'semi_annual', label: 'Semi-Annual' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'monthly', label: 'Monthly' }
      ]
    }
  ];

  const stats = [
    {
      title: 'Total AMCs',
      value: amcs.length.toString(),
      icon: <FileText className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Active Contracts',
      value: amcs.filter(amc => amc.status === AMCStatus.ACTIVE).length.toString(),
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'Expiring Soon',
      value: amcs.filter(amc => {
        const endDate = new Date(amc.endDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return endDate <= thirtyDaysFromNow && amc.status === AMCStatus.ACTIVE;
      }).length.toString(),
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AMC Management</h1>
          <p className="text-gray-600 mt-1">Manage Annual Maintenance Contracts</p>
        </div>
        <Button onClick={handleCreate} className="flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>New AMC Contract</span>
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
              placeholder="Search AMC contracts..."
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
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* AMCs Table */}
      <Table
        columns={columns}
        data={filteredAMCs}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Create Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create AMC Contract"
        size="lg"
      >
        <Form
          fields={formFields}
          values={formData}
          onChange={(name, value) => setFormData({ ...formData, [name]: value })}
          errors={formErrors}
        />
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setShowCreateModal(false)}
          >
            Cancel
          </Button>
          <Button onClick={() => handleSubmit(false)}>
            Create Contract
          </Button>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit AMC Contract"
        size="lg"
      >
        <Form
          fields={formFields}
          values={formData}
          onChange={(name, value) => setFormData({ ...formData, [name]: value })}
          errors={formErrors}
        />
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setShowEditModal(false)}
          >
            Cancel
          </Button>
          <Button onClick={() => handleSubmit(true)}>
            Update Contract
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AMCManagement; 