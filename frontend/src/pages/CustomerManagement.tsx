import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin,
  Building,
  Calendar,
  DollarSign,
  Eye,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus,
  MessageSquare,
  PhoneCall,
  Video,
  Send,
  ArrowRight,
  Users,
  TrendingUp,
  Target,
  FileText,
  UserCheck,
  ChevronDown,
  Contact,
  PhoneIncoming
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';

// Customer types matching backend enums
type CustomerType = 'retail' | 'telecom';
type LeadStatus = 'new' | 'qualified' | 'contacted' | 'converted' | 'lost';
type ContactType = 'call' | 'meeting' | 'email' | 'whatsapp';

interface ContactHistory {
  _id?: string;
  type: ContactType;
  date: string;
  notes: string;
  followUpDate?: string;
  createdBy: string | User;
}

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
  customerType: CustomerType;
  leadSource?: string;
  assignedTo?: string | User;
  status: LeadStatus;
  notes?: string;
  contactHistory: ContactHistory[];
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
  latestContact?: ContactHistory;
}

interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  customerType: CustomerType;
  leadSource: string;
  assignedTo: string;
  notes: string;
}

interface ContactFormData {
  type: ContactType;
  date: string;
  notes: string;
  followUpDate: string;
}

const CustomerManagement: React.FC = () => {
  // Core state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<CustomerType | 'all'>('all');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  
  // Selected data
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Form data
  const [customerFormData, setCustomerFormData] = useState<CustomerFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    customerType: 'retail',
    leadSource: '',
    assignedTo: '',
    notes: ''
  });
  
  const [contactFormData, setContactFormData] = useState<ContactFormData>({
    type: 'call',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    followUpDate: ''
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Dropdown state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.customers.getAll();
      // Handle response format like in other modules
      let customersData: Customer[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          customersData = response.data;
        } else if ((response.data as any).customers && Array.isArray((response.data as any).customers)) {
          customersData = (response.data as any).customers;
        }
      }
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      // Set fallback data on error
      setCustomers([
        {
          _id: '1',
          name: 'Rajesh Kumar',
          email: 'rajesh@techcorp.com',
          phone: '+91 9876543210',
          address: '123 Business Park, Sector 62, Noida, UP 201301',
          customerType: 'telecom',
          status: 'qualified',
          leadSource: 'Website Inquiry',
          assignedTo: 'John Doe (Sales)',
          notes: 'Interested in 500 KVA generator for telecom tower backup',
          contactHistory: [
            {
              _id: 'c1',
              type: 'call',
              date: new Date().toISOString(),
              notes: 'Initial qualification call. Customer confirmed requirement.',
              createdBy: 'John Doe'
            }
          ],
          createdBy: 'Admin User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: '2',
          name: 'Priya Sharma',
          email: 'priya.sharma@gmail.com',
          phone: '+91 8765432109',
          address: '45 Green Valley, Pune, Maharashtra 411028',
          customerType: 'retail',
          status: 'new',
          leadSource: 'Referral',
          notes: 'Home backup power solution needed',
          contactHistory: [],
          createdBy: 'Admin User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          _id: '3',
          name: 'Mumbai Industries Ltd',
          email: 'purchase@mumbaiind.com',
          phone: '+91 7654321098',
          address: 'Plot 15, Industrial Area, Mumbai, Maharashtra 400086',
          customerType: 'retail',
          status: 'converted',
          leadSource: 'Trade Show',
          assignedTo: 'Sarah Smith (Sales)',
          notes: 'Converted customer. Purchased 250 KVA genset with AMC.',
          contactHistory: [
            {
              _id: 'c2',
              type: 'meeting',
              date: new Date(Date.now() - 86400000).toISOString(),
              notes: 'Site visit completed. Order confirmed.',
              createdBy: 'Sarah Smith'
            }
          ],
          createdBy: 'Admin User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await apiClient.customers.delete(id);
        setCustomers(customers.filter(customer => customer._id !== id));
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  const filteredCustomers = Array.isArray(customers) ? customers.filter(customer => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         customer.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    const matchesType = typeFilter === 'all' || customer.customerType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }) : [];

  const validateCustomerForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!customerFormData.name.trim()) {
      errors.name = 'Customer name is required';
    }
    if (!customerFormData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    if (!customerFormData.address.trim()) {
      errors.address = 'Address is required';
    }
    if (customerFormData.email && !/\S+@\S+\.\S+/.test(customerFormData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitCustomer = async () => {
    if (!validateCustomerForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      const response = await apiClient.customers.create(customerFormData);
      setCustomers([...customers, response.data]);
      setShowAddModal(false);
      resetCustomerForm();
    } catch (error: any) {
      console.error('Error creating customer:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to create customer' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!validateCustomerForm() || !editingCustomer) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      const response = await apiClient.customers.update(editingCustomer._id, customerFormData);
      setCustomers(customers.map(c => c._id === editingCustomer._id ? response.data : c));
      setShowEditModal(false);
      setEditingCustomer(null);
      resetCustomerForm();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to update customer' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddContact = async () => {
    if (!selectedCustomer || !contactFormData.notes.trim()) return;

    setSubmitting(true);
    try {
      const contactData = {
        ...contactFormData,
        createdBy: 'current-user-id' // This should be the current user's ID from auth context
      };
      const response = await apiClient.customers.addContact(selectedCustomer._id, contactData);
      setCustomers(customers.map(c => 
        c._id === selectedCustomer._id 
          ? { ...c, contactHistory: [...c.contactHistory, response.data] }
          : c
      ));
      setShowContactModal(false);
      setContactFormData({
        type: 'call',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        followUpDate: ''
      });
    } catch (error) {
      console.error('Error adding contact:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (customerId: string, newStatus: LeadStatus) => {
    try {
      await apiClient.customers.update(customerId, { status: newStatus });
      setCustomers(customers.map(c => 
        c._id === customerId ? { ...c, status: newStatus } : c
      ));
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const resetCustomerForm = () => {
    setCustomerFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      customerType: 'retail',
      leadSource: '',
      assignedTo: '',
      notes: ''
    });
  };

  // Helper function to extract user name safely
  const getUserName = (user: string | User | undefined): string => {
    if (!user) return '';
    if (typeof user === 'string') return user;
    return user.fullName || `${user.firstName} ${user.lastName}` || user.email || '';
  };

  const getUserId = (user: string | User | undefined): string => {
    if (!user) return '';
    if (typeof user === 'string') return user;
    return user._id || '';
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setCustomerFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone,
      address: customer.address,
      customerType: customer.customerType,
      leadSource: customer.leadSource || '',
      assignedTo: getUserName(customer.assignedTo),
      notes: customer.notes || ''
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const openDetailsModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetailsModal(true);
  };

  const openContactModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setContactFormData({
      type: 'call',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      followUpDate: ''
    });
    setShowContactModal(true);
  };

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'qualified':
        return 'bg-yellow-100 text-yellow-800';
      case 'contacted':
        return 'bg-purple-100 text-purple-800';
      case 'converted':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: LeadStatus) => {
    switch (status) {
      case 'new':
        return <UserPlus className="w-4 h-4" />;
      case 'qualified':
        return <Target className="w-4 h-4" />;
      case 'contacted':
        return <Phone className="w-4 h-4" />;
      case 'converted':
        return <CheckCircle className="w-4 h-4" />;
      case 'lost':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  const getContactIcon = (type: ContactType) => {
    switch (type) {
      case 'call':
        return <PhoneCall className="w-4 h-4 text-blue-600" />;
      case 'meeting':
        return <Users className="w-4 h-4 text-green-600" />;
      case 'email':
        return <Mail className="w-4 h-4 text-purple-600" />;
      case 'whatsapp':
        return <MessageSquare className="w-4 h-4 text-green-500" />;
      default:
        return <MessageSquare className="w-4 h-4 text-gray-600" />;
    }
  };

  const stats = [
    {
      title: 'Total Customers',
      value: Array.isArray(customers) ? customers.length.toString() : '0',
      icon: <Users className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'New Leads',
      value: Array.isArray(customers) ? customers.filter(c => c.status === 'new').length.toString() : '0',
      icon: <UserPlus className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Qualified',
      value: Array.isArray(customers) ? customers.filter(c => c.status === 'qualified').length.toString() : '0',
      icon: <Target className="w-6 h-6" />,
      color: 'yellow'
    },
    {
      title: 'Converted',
      value: Array.isArray(customers) ? customers.filter(c => c.status === 'converted').length.toString() : '0',
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    }
  ];

  // Status options with labels
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'new', label: 'New' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'converted', label: 'Converted' },
    { value: 'lost', label: 'Lost' }
  ];

  // Type options with labels
  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'retail', label: 'Retail' },
    { value: 'telecom', label: 'Telecom' }
  ];

  const getStatusLabel = (value: string) => {
    const option = statusOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Status';
  };

  const getTypeLabel = (value: string) => {
    const option = typeOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Types';
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowStatusDropdown(false);
        setShowTypeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      {/* Header */}
      <PageHeader 
        title="Customer Relationship Management"
        subtitle="Manage leads, customers, and track interactions"
      >
        <div className="flex space-x-3">
          <button
            onClick={() => setShowPipelineModal(true)}
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-orange-700 hover:to-orange-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Sales Pipeline</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Customer</span>
          </button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowTypeDropdown(false);
              }}
              className="flex items-center justify-between w-full md:w-32 px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
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
                      setStatusFilter(option.value as LeadStatus | 'all');
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

          {/* Type Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowTypeDropdown(!showTypeDropdown);
                setShowStatusDropdown(false);
              }}
              className="flex items-center justify-between w-full md:w-28 px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getTypeLabel(typeFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showTypeDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showTypeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                {typeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setTypeFilter(option.value as CustomerType | 'all');
                      setShowTypeDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                      typeFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
            Showing {filteredCustomers.length} of {customers.length} customers
          </span>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Info
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Contact
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lead Source
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-gray-900">
                          {customer.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          ID: {customer._id.slice(-6)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        {customer.email && (
                          <div className="flex items-center text-xs text-gray-600">
                            <Mail className="w-4 h-4 mr-2" />
                            {customer.email}
                          </div>
                        )}
                        <div className="flex items-center text-xs text-gray-600">
                          <Phone className="w-4 h-4 mr-2" />
                          {customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                          {getStatusIcon(customer.status)}
                          <span className="ml-1 capitalize">{customer.status}</span>
                        </span>
                        <div className="text-xs text-gray-600 capitalize">
                          {customer.customerType}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {customer.contactHistory.length > 0 ? (
                        <div className="space-y-1">
                          <div className="flex items-center text-xs text-gray-600">
                            {getContactIcon(customer.contactHistory[customer.contactHistory.length - 1].type)}
                            <span className="ml-1 capitalize">
                              {customer.contactHistory[customer.contactHistory.length - 1].type}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(customer.contactHistory[customer.contactHistory.length - 1].date).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No contacts</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                      {customer.leadSource || 'Direct'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openDetailsModal(customer)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openContactModal(customer)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                          title="Add Contact"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(customer)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer._id)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete Customer"
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

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Customer</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitCustomer(); }} className="p-4 space-y-3">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={customerFormData.name}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter customer name"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Type *
                  </label>
                  <select
                    value={customerFormData.customerType}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, customerType: e.target.value as CustomerType })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="retail">Retail</option>
                    <option value="telecom">Telecom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter email address"
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter phone number"
                  />
                  {formErrors.phone && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  rows={3}
                  className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                    Lead Source
                  </label>
                  <input
                    type="text"
                    value={customerFormData.leadSource}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, leadSource: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Website, Referral, Trade Show"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={customerFormData.assignedTo}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, assignedTo: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Assign to sales rep"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={customerFormData.notes}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes about the customer"
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
                  {submitting ? 'Creating...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Customer</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdateCustomer(); }} className="p-4 space-y-3">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={customerFormData.name}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter customer name"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Type *
                  </label>
                  <select
                    value={customerFormData.customerType}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, customerType: e.target.value as CustomerType })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="retail">Retail</option>
                    <option value="telecom">Telecom</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerFormData.email}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter email address"
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={customerFormData.phone}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter phone number"
                  />
                  {formErrors.phone && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <textarea
                  value={customerFormData.address}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, address: e.target.value })}
                  rows={3}
                  className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                    Lead Source
                  </label>
                  <input
                    type="text"
                    value={customerFormData.leadSource}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, leadSource: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Website, Referral, Trade Show"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned To
                  </label>
                  <input
                    type="text"
                    value={customerFormData.assignedTo}
                    onChange={(e) => setCustomerFormData({ ...customerFormData, assignedTo: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Assign to sales rep"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={customerFormData.notes}
                  onChange={(e) => setCustomerFormData({ ...customerFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes about the customer"
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
                  {submitting ? 'Updating...' : 'Update Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-semibold text-gray-900">{selectedCustomer.name}</h2>
                <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCustomer.status)}`}>
                  {getStatusIcon(selectedCustomer.status)}
                  <span className="ml-1 capitalize">{selectedCustomer.status}</span>
                </span>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Customer Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Customer Type</p>
                      <p className="font-medium capitalize">{selectedCustomer.customerType}</p>
                    </div>
                    {selectedCustomer.email && (
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium">{selectedCustomer.email}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium">{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="font-medium">{selectedCustomer.address}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Lead Information</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">Lead Source</p>
                      <p className="font-medium">{selectedCustomer.leadSource || 'Direct'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Assigned To</p>
                      <p className="font-medium">{getUserName(selectedCustomer.assignedTo) || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="font-medium">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                    </div>
                    {selectedCustomer.notes && (
                      <div>
                        <p className="text-xs text-gray-500">Notes</p>
                        <p className="font-medium">{selectedCustomer.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact History */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Contact History</h3>
                  <button
                    onClick={() => openContactModal(selectedCustomer)}
                    className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                  >
                    Add Contact
                  </button>
                </div>
                {selectedCustomer.contactHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No contact history yet</p>
                    <p className="text-sm">Add the first contact interaction</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCustomer.contactHistory.map((contact, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getContactIcon(contact.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-gray-900 capitalize">
                              {contact.type} - {new Date(contact.date).toLocaleDateString()}
                            </p>
                            {contact.followUpDate && (
                              <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                Follow-up: {new Date(contact.followUpDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{contact.notes}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="mt-8 border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={() => openEditModal(selectedCustomer)}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Edit Customer
                  </button>
                  <div className="flex space-x-2">
                    {selectedCustomer.status !== 'qualified' && (
                      <button
                        onClick={() => handleStatusChange(selectedCustomer._id, 'qualified')}
                        className="bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 transition-colors text-sm"
                      >
                        Mark Qualified
                      </button>
                    )}
                    {selectedCustomer.status !== 'contacted' && (
                      <button
                        onClick={() => handleStatusChange(selectedCustomer._id, 'contacted')}
                        className="bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        Mark Contacted
                      </button>
                    )}
                    {selectedCustomer.status !== 'converted' && (
                      <button
                        onClick={() => handleStatusChange(selectedCustomer._id, 'converted')}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Mark Converted
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showContactModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add Contact History</h2>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAddContact(); }} className="p-4 space-y-3">
              <div>
                <p className="text-xs text-gray-600 mb-4">
                  Adding contact for: <span className="font-medium">{selectedCustomer.name}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Type *
                  </label>
                  <select
                    value={contactFormData.type}
                    onChange={(e) => setContactFormData({ ...contactFormData, type: e.target.value as ContactType })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="call">Phone Call</option>
                    <option value="meeting">Meeting</option>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Date *
                  </label>
                  <input
                    type="date"
                    value={contactFormData.date}
                    onChange={(e) => setContactFormData({ ...contactFormData, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Notes *
                </label>
                <textarea
                  value={contactFormData.notes}
                  onChange={(e) => setContactFormData({ ...contactFormData, notes: e.target.value })}
                  rows={4}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the interaction, outcome, and next steps..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date (Optional)
                </label>
                <input
                  type="date"
                  value={contactFormData.followUpDate}
                  onChange={(e) => setContactFormData({ ...contactFormData, followUpDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !contactFormData.notes.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales Pipeline Modal */}
      {showPipelineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Sales Pipeline Overview</h2>
              <button
                onClick={() => setShowPipelineModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-5 gap-4">
                {(['new', 'qualified', 'contacted', 'converted', 'lost'] as LeadStatus[]).map((status) => {
                  const statusCustomers = customers.filter(c => c.status === status);
                  const getColumnColor = (s: LeadStatus) => {
                    switch (s) {
                      case 'new': return 'bg-blue-50 border-blue-200';
                      case 'qualified': return 'bg-yellow-50 border-yellow-200';
                      case 'contacted': return 'bg-purple-50 border-purple-200';
                      case 'converted': return 'bg-green-50 border-green-200';
                      case 'lost': return 'bg-red-50 border-red-200';
                    }
                  };

                  return (
                    <div key={status} className={`rounded-lg border-2 ${getColumnColor(status)} p-4`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900 capitalize flex items-center">
                          {getStatusIcon(status)}
                          <span className="ml-2">{status}</span>
                        </h3>
                        <span className="text-sm font-medium text-gray-600">
                          {statusCustomers.length}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {statusCustomers.map((customer) => (
                          <div
                            key={customer._id}
                            className="bg-white rounded p-3 shadow-sm border cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => openDetailsModal(customer)}
                          >
                            <div className="font-medium text-xs text-gray-900 truncate">
                              {customer.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {customer.customerType} • {customer.leadSource || 'Direct'}
                            </div>
                            {customer.contactHistory.length > 0 && (
                              <div className="text-xs text-blue-600 mt-1">
                                Last: {customer.contactHistory[customer.contactHistory.length - 1].type}
                              </div>
                            )}
                          </div>
                        ))}
                        {statusCustomers.length === 0 && (
                          <div className="text-center text-gray-400 py-8">
                            <Users className="w-6 h-6 mx-auto mb-2" />
                            <p className="text-sm">No customers</p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Pipeline Metrics</h3>
                <div className="grid grid-cols-5 gap-4 text-center">
                  <div>
                    <p className="text-xl font-bold text-blue-600">{customers.filter(c => c.status === 'new').length}</p>
                    <p className="text-xs text-gray-600">New Leads</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-yellow-600">{customers.filter(c => c.status === 'qualified').length}</p>
                    <p className="text-xs text-gray-600">Qualified</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-purple-600">{customers.filter(c => c.status === 'contacted').length}</p>
                    <p className="text-xs text-gray-600">Contacted</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-600">{customers.filter(c => c.status === 'converted').length}</p>
                    <p className="text-xs text-gray-600">Converted</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-red-600">{customers.filter(c => c.status === 'lost').length}</p>
                    <p className="text-xs text-gray-600">Lost</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement; 