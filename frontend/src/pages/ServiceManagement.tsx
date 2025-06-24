import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  X,
  Edit,
  Trash2,
  Eye,
  FileText,
  Wrench,
  Package,
  Signature,
  MapPin,
  Phone,
  Mail,
  Timer,
  TrendingUp,
  Activity,
  Settings,
  Download,
  Upload,
  Camera,
  Save
} from 'lucide-react';
import { apiClient } from '../utils/api';

// Types matching backend structure
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
type SLAStatus = 'on_track' | 'breached' | 'met' | 'no_sla';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
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

interface PartUsed {
  product: string | Product;
  quantity: number;
  serialNumbers?: string[];
}

interface ServiceTicket {
  _id: string;
  ticketNumber: string;
  customer: string | Customer;
  product?: string | Product;
  serialNumber?: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string | User;
  scheduledDate?: string;
  completedDate?: string;
  partsUsed: PartUsed[];
  serviceReport?: string;
  customerSignature?: string;
  slaDeadline?: string;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  turnaroundTime?: number;
  slaStatus?: SLAStatus;
}

interface TicketFormData {
  customer: string;
  product: string;
  serialNumber: string;
  description: string;
  priority: TicketPriority;
  assignedTo: string;
  scheduledDate: string;
}

interface ServiceReportData {
  workCompleted: string;
  partsUsed: PartUsed[];
  recommendations: string;
  customerFeedback: string;
  nextVisitRequired: boolean;
  nextVisitDate: string;
  signatureData: string;
}

const ServiceManagement: React.FC = () => {
  // Core state
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [slaFilter, setSlaFilter] = useState<SLAStatus | 'all'>('all');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  
  // Selected data
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [editingTicket, setEditingTicket] = useState<ServiceTicket | null>(null);
  
  // Form data
  const [ticketFormData, setTicketFormData] = useState<TicketFormData>({
    customer: '',
    product: '',
    serialNumber: '',
    description: '',
    priority: 'medium',
    assignedTo: '',
    scheduledDate: new Date().toISOString().split('T')[0]
  });
  
  const [reportData, setReportData] = useState<ServiceReportData>({
    workCompleted: '',
    partsUsed: [],
    recommendations: '',
    customerFeedback: '',
    nextVisitRequired: false,
    nextVisitDate: '',
    signatureData: ''
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
        fetchTickets(),
        fetchCustomers(),
        fetchProducts(),
        fetchUsers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      console.log('Fetching service tickets...');
      const response = await apiClient.services.getAll();
      console.log('Service tickets response:', response);
      
      let ticketsData: ServiceTicket[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          ticketsData = response.data;
        } else if ((response.data as any).tickets && Array.isArray((response.data as any).tickets)) {
          ticketsData = (response.data as any).tickets;
        }
        console.log('Found service tickets:', ticketsData.length);
      }
      
      // Set fallback data if no real data
      if (ticketsData.length === 0) {
        ticketsData = [
          {
            _id: '1',
            ticketNumber: 'TKT-202412-0001',
            customer: {
              _id: 'c1',
              name: 'Mumbai Industries Ltd',
              email: 'service@mumbaiind.com',
              phone: '+91 9876543210',
              address: 'Plot 15, Industrial Area, Mumbai, Maharashtra',
              customerType: 'retail'
            },
            product: {
              _id: 'p1',
              name: '250 KVA Diesel Generator',
              category: 'genset',
              brand: 'Cummins',
              modelNumber: 'C250D5'
            },
            serialNumber: 'GEN-250-001',
            description: 'Generator not starting - electrical issue suspected. Customer reports power failure during startup.',
            priority: 'high',
            status: 'in_progress',
            assignedTo: {
              _id: 'u1',
              firstName: 'Rajesh',
              lastName: 'Kumar',
              email: 'rajesh@sunpower.com',
              phone: '+91 9876543211',
              fullName: 'Rajesh Kumar'
            },
            scheduledDate: new Date().toISOString(),
            partsUsed: [
              {
                product: {
                  _id: 'p2',
                  name: 'Starter Motor',
                  category: 'spare_part',
                  brand: 'Cummins'
                },
                quantity: 1,
                serialNumbers: ['SM-001']
              }
            ],
            slaDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            serviceReport: 'Initial diagnosis completed. Starter motor replacement required.',
            createdBy: 'Admin User',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            turnaroundTime: 2,
            slaStatus: 'on_track'
          },
          {
            _id: '2',
            ticketNumber: 'TKT-202412-0002',
            customer: {
              _id: 'c2',
              name: 'TechCorp Solutions',
              email: 'admin@techcorp.com',
              phone: '+91 8765432109',
              address: 'Block B, Tech Park, Bangalore, Karnataka',
              customerType: 'telecom'
            },
            product: {
              _id: 'p3',
              name: '500 KVA Diesel Generator',
              category: 'genset',
              brand: 'Caterpillar',
              modelNumber: 'CAT-500D'
            },
            serialNumber: 'GEN-500-002',
            description: 'Routine maintenance and oil change required as per AMC schedule.',
            priority: 'medium',
            status: 'open',
            scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            partsUsed: [],
            slaDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
            createdBy: 'Admin User',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            slaStatus: 'on_track'
          }
        ];
      }
      
      setTickets(ticketsData);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll();
      let customersData: Customer[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        customersData = response.data;
      }
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
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

  const fetchUsers = async () => {
    try {
      const response = await apiClient.users.getAll();
      let usersData: User[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        usersData = response.data;
      }
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
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

  const handleCreateTicket = () => {
    setTicketFormData({
      customer: '',
      product: '',
      serialNumber: '',
      description: '',
      priority: 'medium',
      assignedTo: '',
      scheduledDate: new Date().toISOString().split('T')[0]
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleEditTicket = (ticket: ServiceTicket) => {
    setEditingTicket(ticket);
    setTicketFormData({
      customer: typeof ticket.customer === 'string' ? ticket.customer : ticket.customer._id,
      product: typeof ticket.product === 'string' ? ticket.product || '' : ticket.product?._id || '',
      serialNumber: ticket.serialNumber || '',
      description: ticket.description,
      priority: ticket.priority,
      assignedTo: typeof ticket.assignedTo === 'string' ? ticket.assignedTo || '' : ticket.assignedTo?._id || '',
      scheduledDate: ticket.scheduledDate ? ticket.scheduledDate.split('T')[0] : ''
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const openDetailsModal = (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
  };

  const openServiceReport = (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setReportData({
      workCompleted: ticket.serviceReport || '',
      partsUsed: ticket.partsUsed || [],
      recommendations: '',
      customerFeedback: '',
      nextVisitRequired: false,
      nextVisitDate: '',
      signatureData: ticket.customerSignature || ''
    });
    setShowReportModal(true);
  };

  const validateTicketForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!ticketFormData.customer) {
      errors.customer = 'Customer is required';
    }
    if (!ticketFormData.description.trim()) {
      errors.description = 'Description is required';
    }
    if (ticketFormData.description.length > 2000) {
      errors.description = 'Description cannot exceed 2000 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitTicket = async () => {
    if (!validateTicketForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      const response = await apiClient.services.create(ticketFormData);
      setTickets([...tickets, response.data]);
      setShowCreateModal(false);
      resetTicketForm();
    } catch (error: any) {
      console.error('Error creating ticket:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to create ticket' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTicket = async () => {
    if (!validateTicketForm() || !editingTicket) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      const response = await apiClient.services.update(editingTicket._id, ticketFormData);
      setTickets(tickets.map(t => t._id === editingTicket._id ? response.data : t));
      setShowEditModal(false);
      setEditingTicket(null);
      resetTicketForm();
    } catch (error: any) {
      console.error('Error updating ticket:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to update ticket' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetTicketForm = () => {
    setTicketFormData({
      customer: '',
      product: '',
      serialNumber: '',
      description: '',
      priority: 'medium',
      assignedTo: '',
      scheduledDate: new Date().toISOString().split('T')[0]
    });
  };

  const filteredTickets = tickets.filter(ticket => {
    const customerName = getCustomerName(ticket.customer);
    const productName = getProductName(ticket.product);
    const assigneeName = getUserName(ticket.assignedTo);
    
    const matchesSearch = ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         productName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesAssignee = assigneeFilter === 'all' || 
                           (ticket.assignedTo && typeof ticket.assignedTo === 'object' && ticket.assignedTo._id === assigneeFilter);
    const matchesSLA = slaFilter === 'all' || ticket.slaStatus === slaFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee && matchesSLA;
  });

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getSLAColor = (slaStatus: SLAStatus | undefined) => {
    switch (slaStatus) {
      case 'on_track':
        return 'bg-green-100 text-green-800';
      case 'breached':
        return 'bg-red-100 text-red-800';
      case 'met':
        return 'bg-blue-100 text-blue-800';
      case 'no_sla':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN');
  };

  const getTimeRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Overdue';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    return `${hours}h`;
  };

  // Statistics
  const stats = [
    {
      title: 'Total Tickets',
      value: tickets.length.toString(),
      icon: <FileText className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Open Tickets',
      value: tickets.filter(t => t.status === 'open').length.toString(),
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'orange'
    },
    {
      title: 'In Progress',
      value: tickets.filter(t => t.status === 'in_progress').length.toString(),
      icon: <Activity className="w-6 h-6" />,
      color: 'yellow'
    },
    {
      title: 'SLA Breached',
      value: tickets.filter(t => t.slaStatus === 'breached').length.toString(),
      icon: <Timer className="w-6 h-6" />,
      color: 'red'
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Service Management</h1>
          <p className="text-gray-600 mt-1">Track tickets, manage service reports & monitor SLA</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => console.log('Export tickets')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span>Export</span>
          </button>
          <button
            onClick={handleCreateTicket}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Ticket</span>
          </button>
        </div>
      </div>

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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Assignees</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>
                {getUserName(user)}
              </option>
            ))}
          </select>

          <select
            value={slaFilter}
            onChange={(e) => setSlaFilter(e.target.value as SLAStatus | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All SLA</option>
            <option value="on_track">On Track</option>
            <option value="breached">Breached</option>
            <option value="met">Met</option>
          </select>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Showing {filteredTickets.length} of {tickets.length} tickets
          </span>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer & Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority & Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA & Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">Loading tickets...</td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">No tickets found</td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-blue-600">{ticket.ticketNumber}</div>
                        <div className="text-sm text-gray-900 font-medium">
                          {ticket.description.length > 50 
                            ? `${ticket.description.substring(0, 50)}...` 
                            : ticket.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created {formatDate(ticket.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{getCustomerName(ticket.customer)}</div>
                        {ticket.product && (
                          <div className="text-sm text-gray-600">{getProductName(ticket.product)}</div>
                        )}
                        {ticket.serialNumber && (
                          <div className="text-xs text-gray-500">S/N: {ticket.serialNumber}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                        </span>
                        <br />
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ').charAt(0).toUpperCase() + ticket.status.replace('_', ' ').slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getUserName(ticket.assignedTo) || (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        {ticket.slaDeadline && (
                          <div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSLAColor(ticket.slaStatus)}`}>
                              {ticket.slaStatus === 'on_track' && `${getTimeRemaining(ticket.slaDeadline)} left`}
                              {ticket.slaStatus === 'breached' && 'SLA Breached'}
                              {ticket.slaStatus === 'met' && 'SLA Met'}
                            </span>
                          </div>
                        )}
                        {ticket.scheduledDate && (
                          <div className="text-xs text-gray-600">
                            Scheduled: {formatDate(ticket.scheduledDate)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openDetailsModal(ticket)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openServiceReport(ticket)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                          title="Service Report"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditTicket(ticket)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                          title="Edit Ticket"
                        >
                          <Edit className="w-4 h-4" />
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

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Service Ticket</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitTicket(); }} className="p-6 space-y-4">
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
                    value={ticketFormData.customer}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, customer: e.target.value })}
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
                    Product
                  </label>
                  <select
                    value={ticketFormData.product}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, product: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Product</option>
                    {products.map(product => (
                      <option key={product._id} value={product._id}>
                        {product.name} ({product.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority *
                  </label>
                  <select
                    value={ticketFormData.priority}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, priority: e.target.value as TicketPriority })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To
                  </label>
                  <select
                    value={ticketFormData.assignedTo}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Technician</option>
                    {users.map(user => (
                      <option key={user._id} value={user._id}>
                        {getUserName(user)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    value={ticketFormData.scheduledDate}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, scheduledDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  type="text"
                  value={ticketFormData.serialNumber}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, serialNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter product serial number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Problem Description *
                </label>
                <textarea
                  value={ticketFormData.description}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.description ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe the problem in detail..."
                />
                {formErrors.description && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {ticketFormData.description.length}/2000 characters
                </p>
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
                   {submitting ? 'Creating...' : 'Create Ticket'}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* Edit Ticket Modal */}
       {showEditModal && editingTicket && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between p-6 border-b border-gray-200">
               <h2 className="text-xl font-semibold text-gray-900">Edit Service Ticket</h2>
               <button
                 onClick={() => setShowEditModal(false)}
                 className="text-gray-400 hover:text-gray-600"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>

             <form onSubmit={(e) => { e.preventDefault(); handleUpdateTicket(); }} className="p-6 space-y-4">
               {formErrors.general && (
                 <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                   <p className="text-red-600 text-sm">{formErrors.general}</p>
                 </div>
               )}

               <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                 <p className="text-blue-800 text-sm font-medium">Ticket: {editingTicket.ticketNumber}</p>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Customer *
                   </label>
                   <select
                     value={ticketFormData.customer}
                     onChange={(e) => setTicketFormData({ ...ticketFormData, customer: e.target.value })}
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
                     Product
                   </label>
                   <select
                     value={ticketFormData.product}
                     onChange={(e) => setTicketFormData({ ...ticketFormData, product: e.target.value })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   >
                     <option value="">Select Product</option>
                     {products.map(product => (
                       <option key={product._id} value={product._id}>
                         {product.name} ({product.category})
                       </option>
                     ))}
                   </select>
                 </div>
               </div>

               <div className="grid grid-cols-3 gap-4">
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Priority *
                   </label>
                   <select
                     value={ticketFormData.priority}
                     onChange={(e) => setTicketFormData({ ...ticketFormData, priority: e.target.value as TicketPriority })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   >
                     <option value="low">Low</option>
                     <option value="medium">Medium</option>
                     <option value="high">High</option>
                     <option value="critical">Critical</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Assign To
                   </label>
                   <select
                     value={ticketFormData.assignedTo}
                     onChange={(e) => setTicketFormData({ ...ticketFormData, assignedTo: e.target.value })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   >
                     <option value="">Select Technician</option>
                     {users.map(user => (
                       <option key={user._id} value={user._id}>
                         {getUserName(user)}
                       </option>
                     ))}
                   </select>
                 </div>
                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1">
                     Scheduled Date
                   </label>
                   <input
                     type="date"
                     value={ticketFormData.scheduledDate}
                     onChange={(e) => setTicketFormData({ ...ticketFormData, scheduledDate: e.target.value })}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   />
                 </div>
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   Serial Number
                 </label>
                 <input
                   type="text"
                   value={ticketFormData.serialNumber}
                   onChange={(e) => setTicketFormData({ ...ticketFormData, serialNumber: e.target.value })}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="Enter product serial number"
                 />
               </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">
                   Problem Description *
                 </label>
                 <textarea
                   value={ticketFormData.description}
                   onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                   rows={4}
                   className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                     formErrors.description ? 'border-red-500' : 'border-gray-300'
                   }`}
                   placeholder="Describe the problem in detail..."
                 />
                 {formErrors.description && (
                   <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                 )}
                 <p className="text-xs text-gray-500 mt-1">
                   {ticketFormData.description.length}/2000 characters
                 </p>
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
                   {submitting ? 'Updating...' : 'Update Ticket'}
                 </button>
               </div>
             </form>
           </div>
         </div>
       )}

       {/* Ticket Details Modal */}
       {showDetailsModal && selectedTicket && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between p-6 border-b border-gray-200">
               <div>
                 <h2 className="text-xl font-semibold text-gray-900">{selectedTicket.ticketNumber}</h2>
                 <p className="text-gray-600">Service Ticket Details</p>
               </div>
               <button
                 onClick={() => setShowDetailsModal(false)}
                 className="text-gray-400 hover:text-gray-600"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>

             <div className="p-6 space-y-6">
               {/* Ticket Overview */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Customer Information */}
                 <div className="bg-gray-50 p-6 rounded-lg">
                   <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                     <User className="w-5 h-5 mr-2" />
                     Customer Details
                   </h3>
                   {typeof selectedTicket.customer === 'object' ? (
                     <div className="space-y-2">
                       <div>
                         <p className="text-sm text-gray-600">Name</p>
                         <p className="font-medium">{selectedTicket.customer.name}</p>
                       </div>
                       {selectedTicket.customer.email && (
                         <div>
                           <p className="text-sm text-gray-600">Email</p>
                           <p className="font-medium">{selectedTicket.customer.email}</p>
                         </div>
                       )}
                       <div>
                         <p className="text-sm text-gray-600">Phone</p>
                         <p className="font-medium">{selectedTicket.customer.phone}</p>
                       </div>
                       <div>
                         <p className="text-sm text-gray-600">Address</p>
                         <p className="font-medium text-sm">{selectedTicket.customer.address}</p>
                       </div>
                     </div>
                   ) : (
                     <p className="text-gray-500">Customer information not available</p>
                   )}
                 </div>

                 {/* Product Information */}
                 <div className="bg-gray-50 p-6 rounded-lg">
                   <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                     <Package className="w-5 h-5 mr-2" />
                     Product Details
                   </h3>
                   {selectedTicket.product && typeof selectedTicket.product === 'object' ? (
                     <div className="space-y-2">
                       <div>
                         <p className="text-sm text-gray-600">Product</p>
                         <p className="font-medium">{selectedTicket.product.name}</p>
                       </div>
                       <div>
                         <p className="text-sm text-gray-600">Category</p>
                         <p className="font-medium capitalize">{selectedTicket.product.category}</p>
                       </div>
                       {selectedTicket.product.brand && (
                         <div>
                           <p className="text-sm text-gray-600">Brand</p>
                           <p className="font-medium">{selectedTicket.product.brand}</p>
                         </div>
                       )}
                       {selectedTicket.product.modelNumber && (
                         <div>
                           <p className="text-sm text-gray-600">Model</p>
                           <p className="font-medium">{selectedTicket.product.modelNumber}</p>
                         </div>
                       )}
                       {selectedTicket.serialNumber && (
                         <div>
                           <p className="text-sm text-gray-600">Serial Number</p>
                           <p className="font-medium">{selectedTicket.serialNumber}</p>
                         </div>
                       )}
                     </div>
                   ) : (
                     <p className="text-gray-500">No product assigned</p>
                   )}
                 </div>

                 {/* Ticket Status */}
                 <div className="bg-gray-50 p-6 rounded-lg">
                   <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                     <Activity className="w-5 h-5 mr-2" />
                     Status & Priority
                   </h3>
                   <div className="space-y-3">
                     <div>
                       <p className="text-sm text-gray-600">Status</p>
                       <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTicket.status)}`}>
                         {selectedTicket.status.replace('_', ' ').charAt(0).toUpperCase() + selectedTicket.status.replace('_', ' ').slice(1)}
                       </span>
                     </div>
                     <div>
                       <p className="text-sm text-gray-600">Priority</p>
                       <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                         {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)}
                       </span>
                     </div>
                     {selectedTicket.slaDeadline && (
                       <div>
                         <p className="text-sm text-gray-600">SLA Status</p>
                         <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSLAColor(selectedTicket.slaStatus)}`}>
                           {selectedTicket.slaStatus === 'on_track' && `${getTimeRemaining(selectedTicket.slaDeadline)} left`}
                           {selectedTicket.slaStatus === 'breached' && 'SLA Breached'}
                           {selectedTicket.slaStatus === 'met' && 'SLA Met'}
                         </span>
                       </div>
                     )}
                     <div>
                       <p className="text-sm text-gray-600">Assigned To</p>
                       <p className="font-medium">{getUserName(selectedTicket.assignedTo) || 'Unassigned'}</p>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Timeline Information */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div>
                   <h4 className="text-sm font-medium text-gray-600">Created</h4>
                   <p className="text-lg font-medium">{formatDateTime(selectedTicket.createdAt)}</p>
                 </div>
                 {selectedTicket.scheduledDate && (
                   <div>
                     <h4 className="text-sm font-medium text-gray-600">Scheduled</h4>
                     <p className="text-lg font-medium">{formatDateTime(selectedTicket.scheduledDate)}</p>
                   </div>
                 )}
                 {selectedTicket.completedDate && (
                   <div>
                     <h4 className="text-sm font-medium text-gray-600">Completed</h4>
                     <p className="text-lg font-medium">{formatDateTime(selectedTicket.completedDate)}</p>
                   </div>
                 )}
               </div>

               {/* Problem Description */}
               <div>
                 <h3 className="text-lg font-medium text-gray-900 mb-3">Problem Description</h3>
                 <div className="bg-gray-50 p-4 rounded-lg">
                   <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.description}</p>
                 </div>
               </div>

               {/* Service Report */}
               {selectedTicket.serviceReport && (
                 <div>
                   <h3 className="text-lg font-medium text-gray-900 mb-3">Service Report</h3>
                   <div className="bg-blue-50 p-4 rounded-lg">
                     <p className="text-gray-700 whitespace-pre-wrap">{selectedTicket.serviceReport}</p>
                   </div>
                 </div>
               )}

               {/* Parts Used */}
               {selectedTicket.partsUsed && selectedTicket.partsUsed.length > 0 && (
                 <div>
                   <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                     <Wrench className="w-5 h-5 mr-2" />
                     Parts Used
                   </h3>
                   <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                     <table className="w-full">
                       <thead className="bg-gray-50">
                         <tr>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Part</th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                           <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Numbers</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-200">
                         {selectedTicket.partsUsed.map((part, index) => (
                           <tr key={index}>
                             <td className="px-4 py-3 text-sm font-medium text-gray-900">
                               {getProductName(part.product)}
                             </td>
                             <td className="px-4 py-3 text-sm text-gray-600">{part.quantity}</td>
                             <td className="px-4 py-3 text-sm text-gray-600">
                               {part.serialNumbers ? part.serialNumbers.join(', ') : '-'}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
               )}

               {/* Customer Signature */}
               {selectedTicket.customerSignature && (
                 <div>
                   <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                     <Signature className="w-5 h-5 mr-2" />
                     Customer Signature
                   </h3>
                   <div className="bg-gray-50 p-4 rounded-lg text-center">
                     <img 
                       src={selectedTicket.customerSignature} 
                       alt="Customer Signature" 
                       className="max-h-32 mx-auto border border-gray-300 rounded"
                     />
                   </div>
                 </div>
               )}

               {/* Action Buttons */}
               <div className="flex space-x-3 pt-4 border-t border-gray-200">
                 <button
                   onClick={() => {
                     setShowDetailsModal(false);
                     handleEditTicket(selectedTicket);
                   }}
                   className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                 >
                   <Edit className="w-4 h-4" />
                   <span>Edit Ticket</span>
                 </button>
                 <button
                   onClick={() => {
                     setShowDetailsModal(false);
                     openServiceReport(selectedTicket);
                   }}
                   className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                 >
                   <FileText className="w-4 h-4" />
                   <span>Service Report</span>
                 </button>
                 <button
                   className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                 >
                   <Download className="w-4 h-4" />
                   <span>Export PDF</span>
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Digital Service Report Modal */}
       {showReportModal && selectedTicket && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between p-6 border-b border-gray-200">
               <div>
                 <h2 className="text-xl font-semibold text-gray-900">Digital Service Report</h2>
                 <p className="text-gray-600">{selectedTicket.ticketNumber} - {getCustomerName(selectedTicket.customer)}</p>
               </div>
               <button
                 onClick={() => setShowReportModal(false)}
                 className="text-gray-400 hover:text-gray-600"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>

             <div className="p-6 space-y-6">
               {/* Work Completed */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Work Completed *
                 </label>
                 <textarea
                   value={reportData.workCompleted}
                   onChange={(e) => setReportData({ ...reportData, workCompleted: e.target.value })}
                   rows={4}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="Describe the work performed..."
                 />
               </div>

               {/* Parts Used Section */}
               <div>
                 <div className="flex justify-between items-center mb-3">
                   <label className="block text-sm font-medium text-gray-700">
                     Parts Used
                   </label>
                   <button
                     type="button"
                     className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                     onClick={() => {
                       const newPart = { product: '', quantity: 1, serialNumbers: [] };
                       setReportData({ 
                         ...reportData, 
                         partsUsed: [...reportData.partsUsed, newPart] 
                       });
                     }}
                   >
                     <Plus className="w-4 h-4" />
                     <span>Add Part</span>
                   </button>
                 </div>
                 
                 {reportData.partsUsed.map((part, index) => (
                   <div key={index} className="bg-gray-50 p-4 rounded-lg mb-3">
                     <div className="grid grid-cols-3 gap-4">
                       <div>
                         <label className="block text-xs font-medium text-gray-600 mb-1">Product</label>
                         <select
                           value={typeof part.product === 'string' ? part.product : part.product._id || ''}
                           onChange={(e) => {
                             const updatedParts = [...reportData.partsUsed];
                             updatedParts[index] = { ...updatedParts[index], product: e.target.value };
                             setReportData({ ...reportData, partsUsed: updatedParts });
                           }}
                           className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                         >
                           <option value="">Select Product</option>
                           {products.map(product => (
                             <option key={product._id} value={product._id}>
                               {product.name}
                             </option>
                           ))}
                         </select>
                       </div>
                       <div>
                         <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                         <input
                           type="number"
                           min="1"
                           value={part.quantity}
                           onChange={(e) => {
                             const updatedParts = [...reportData.partsUsed];
                             updatedParts[index] = { ...updatedParts[index], quantity: Number(e.target.value) };
                             setReportData({ ...reportData, partsUsed: updatedParts });
                           }}
                           className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                         />
                       </div>
                       <div className="flex items-end">
                         <button
                           type="button"
                           onClick={() => {
                             const updatedParts = reportData.partsUsed.filter((_, i) => i !== index);
                             setReportData({ ...reportData, partsUsed: updatedParts });
                           }}
                           className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     </div>
                   </div>
                 ))}
               </div>

               {/* Recommendations */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Recommendations
                 </label>
                 <textarea
                   value={reportData.recommendations}
                   onChange={(e) => setReportData({ ...reportData, recommendations: e.target.value })}
                   rows={3}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="Enter recommendations for future maintenance..."
                 />
               </div>

               {/* Customer Feedback */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Customer Feedback
                 </label>
                 <textarea
                   value={reportData.customerFeedback}
                   onChange={(e) => setReportData({ ...reportData, customerFeedback: e.target.value })}
                   rows={3}
                   className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   placeholder="Customer comments and feedback..."
                 />
               </div>

               {/* Next Visit Required */}
               <div className="flex items-center space-x-4">
                 <div className="flex items-center">
                   <input
                     type="checkbox"
                     id="nextVisitRequired"
                     checked={reportData.nextVisitRequired}
                     onChange={(e) => setReportData({ ...reportData, nextVisitRequired: e.target.checked })}
                     className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                   />
                   <label htmlFor="nextVisitRequired" className="ml-2 text-sm font-medium text-gray-700">
                     Next visit required
                   </label>
                 </div>
                 
                 {reportData.nextVisitRequired && (
                   <div>
                     <input
                       type="date"
                       value={reportData.nextVisitDate}
                       onChange={(e) => setReportData({ ...reportData, nextVisitDate: e.target.value })}
                       className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                     />
                   </div>
                 )}
               </div>

               {/* Digital Signature */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Customer Signature *
                 </label>
                 <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                   {reportData.signatureData ? (
                     <div>
                       <img 
                         src={reportData.signatureData} 
                         alt="Customer Signature" 
                         className="max-h-32 mx-auto mb-3 border border-gray-300 rounded"
                       />
                       <button
                         type="button"
                         onClick={() => setReportData({ ...reportData, signatureData: '' })}
                         className="text-red-600 hover:text-red-700 text-sm font-medium"
                       >
                         Clear Signature
                       </button>
                     </div>
                   ) : (
                     <div>
                       <Signature className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                       <p className="text-gray-500 mb-3">Click to capture customer signature</p>
                       <button
                         type="button"
                         onClick={() => {
                           // Simulate signature capture - in real app would open signature pad
                           const dummySignature = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8dGV4dCB4PSI1MCIgeT0iNTAiIGZvbnQtZmFtaWx5PSJjdXJzaXZlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjMzMzIj5TaWduYXR1cmU8L3RleHQ+Cjwvc3ZnPgo=";
                           setReportData({ ...reportData, signatureData: dummySignature });
                         }}
                         className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                       >
                         <Camera className="w-4 h-4" />
                         <span>Capture Signature</span>
                       </button>
                     </div>
                   )}
                 </div>
               </div>

               {/* Action Buttons */}
               <div className="flex space-x-3 pt-4 border-t border-gray-200">
                 <button
                   type="button"
                   onClick={() => setShowReportModal(false)}
                   className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   type="button"
                   className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                 >
                   <Save className="w-4 h-4" />
                   <span>Save Report</span>
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 };
 
 export default ServiceManagement; 