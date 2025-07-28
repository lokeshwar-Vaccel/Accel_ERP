import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  Save,
  ChevronDown
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { exportServiceTicketToPDF, exportMultipleTicketsToPDF, ServiceTicketPDFData } from '../utils/pdfExport';

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
  const location = useLocation();
  
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

  // Dropdown state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showSlaDropdown, setShowSlaDropdown] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDatas, setTotalDatas] = useState(0);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Refetch tickets when any filter or pagination changes (like CustomerManagement)
  useEffect(() => {
    if (!loading) {
      fetchTickets();
    }
  }, [currentPage, limit, searchTerm, statusFilter, priorityFilter, assigneeFilter, slaFilter]);

  // Check for URL parameters to auto-open create modal
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'create') {
      handleCreateTicket();
      // Clear the URL parameter
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

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
    console.log('fetchTickets called with:', { currentPage, limit, searchTerm, statusFilter, priorityFilter, assigneeFilter, slaFilter });
    
    // Reset to page 1 when filters change (but not when page changes)
    const hasFilterChanged = searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || assigneeFilter !== 'all' || slaFilter !== 'all';
    if (hasFilterChanged && currentPage !== 1) {
      setCurrentPage(1);
      return; // Don't fetch yet, let the page change trigger the fetch
    }
    
    try {
      // Build query parameters
      const params: any = {
        page: currentPage,
        limit: limit,
        sort: '-createdAt'
      };

      // Add search parameter if not empty
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      // Add filter parameters
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (priorityFilter !== 'all') {
        params.priority = priorityFilter;
      }

      if (assigneeFilter !== 'all' && assigneeFilter.match(/^[0-9a-fA-F]{24}$/)) {
        params.assignedTo = assigneeFilter;
      }

      if (slaFilter !== 'all') {
        params.slaStatus = slaFilter;
      }

      const response = await apiClient.services.getAll(params);
      
      let ticketsData: ServiceTicket[] = [];
      let total = 0;
      let pages = 0;
      
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          ticketsData = response.data;
        } else if ((response.data as any).tickets && Array.isArray((response.data as any).tickets)) {
          ticketsData = (response.data as any).tickets;
        }
        
        // Extract pagination info
        if ((response.data as any).pagination) {
          total = (response.data as any).pagination.total || 0;
          pages = (response.data as any).pagination.pages || 0;
        } else if (response.pagination) {
          total = response.pagination.total || 0;
          pages = response.pagination.pages || 0;
        }
      }
      
      setTickets(ticketsData);
      setTotalDatas(total);
      setTotalPages(pages);
      
      console.log('Pagination data:', {
        total,
        pages,
        currentPage,
        limit,
        ticketsCount: ticketsData.length,
        params: params
      });
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
      setTotalDatas(0);
      setTotalPages(0);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll({
        page: 1,
        limit: 100,
        type: 'customer'
      });
      let customersData: Customer[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          customersData = response.data;
        } else if (response.data.customers && Array.isArray(response.data.customers)) {
          customersData = response.data.customers;
        }
      }
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll({
        page: 1,
        limit: 100,
        isActive: true
      });
      let productsData: Product[] = [];
      if (response.success && response.data) {
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

  const fetchUsers = async () => {
    try {
      // Hardcoded technician data for service management with proper MongoDB ObjectId format
      const hardcodedTechnicians: User[] = [
        {
          _id: '507f1f77bcf86cd799439011',
          firstName: 'Rajesh',
          lastName: 'Kumar',
          email: 'rajesh.kumar@sunpower.com',
          phone: '+91 9876543210',
          fullName: 'Rajesh Kumar'
        },
        {
          _id: '507f1f77bcf86cd799439012',
          firstName: 'Priya',
          lastName: 'Sharma',
          email: 'priya.sharma@sunpower.com',
          phone: '+91 9876543211',
          fullName: 'Priya Sharma'
        },
        {
          _id: '507f1f77bcf86cd799439013',
          firstName: 'Amit',
          lastName: 'Patel',
          email: 'amit.patel@sunpower.com',
          phone: '+91 9876543212',
          fullName: 'Amit Patel'
        },
        {
          _id: '507f1f77bcf86cd799439014',
          firstName: 'Suresh',
          lastName: 'Reddy',
          email: 'suresh.reddy@sunpower.com',
          phone: '+91 9876543213',
          fullName: 'Suresh Reddy'
        },
        {
          _id: '507f1f77bcf86cd799439015',
          firstName: 'Kavita',
          lastName: 'Singh',
          email: 'kavita.singh@sunpower.com',
          phone: '+91 9876543214',
          fullName: 'Kavita Singh'
        }
      ];
      setUsers(hardcodedTechnicians);
    } catch (error) {
      console.error('Error setting hardcoded technicians:', error);
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
      
      // Format payload according to backend schema
      const payload: any = {
        customer: ticketFormData.customer,
        product: ticketFormData.product || undefined,
        serialNumber: ticketFormData.serialNumber || undefined,
        description: ticketFormData.description,
        priority: ticketFormData.priority,
        scheduledDate: ticketFormData.scheduledDate ? new Date(ticketFormData.scheduledDate).toISOString() : undefined
      };

      // Only include assignedTo if it's not empty
      if (ticketFormData.assignedTo && ticketFormData.assignedTo.trim() !== '') {
        payload.assignedTo = ticketFormData.assignedTo;
      }

      console.log('Creating service ticket with payload:', payload);
      const response = await apiClient.services.create(payload);
      
      // Add the new ticket to the list
      if (response.success && response.data) {
        const newTicket = response.data.ticket || response.data;
        setTickets([newTicket, ...tickets]);
      }
      
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
      
      // Format payload according to backend schema
      const payload: any = {
        customer: ticketFormData.customer,
        product: ticketFormData.product || undefined,
        serialNumber: ticketFormData.serialNumber || undefined,
        description: ticketFormData.description,
        priority: ticketFormData.priority,
        scheduledDate: ticketFormData.scheduledDate ? new Date(ticketFormData.scheduledDate).toISOString() : undefined
      };

      // Only include assignedTo if it's not empty
      if (ticketFormData.assignedTo && ticketFormData.assignedTo.trim() !== '') {
        payload.assignedTo = ticketFormData.assignedTo;
      }

      console.log('Updating service ticket with payload:', payload);
      const response = await apiClient.services.update(editingTicket._id, payload);
      
      // Update the ticket in the list
      if (response.success && response.data) {
        const updatedTicket = response.data.ticket || response.data;
        setTickets(tickets.map(t => t._id === editingTicket._id ? updatedTicket : t));
      }
      
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

  // Since filtering is now handled by the backend, we just use the tickets directly
  const filteredTickets = tickets;

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
      value: totalDatas.toString(),
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

  // Status options with labels
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  // Priority options with labels
  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  // SLA options with labels
  const slaOptions = [
    { value: 'all', label: 'All SLA' },
    { value: 'on_track', label: 'On Track' },
    { value: 'breached', label: 'Breached' },
    { value: 'met', label: 'Met' }
  ];

  const getStatusLabel = (value: string) => {
    const option = statusOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Status';
  };

  const getPriorityLabel = (value: string) => {
    const option = priorityOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Priority';
  };

  const getSlaLabel = (value: string) => {
    const option = slaOptions.find(opt => opt.value === value);
    return option ? option.label : 'All SLA';
  };

  const getAssigneeLabel = (value: string) => {
    if (value === 'all') return 'All Assignees';
    const user = users.find(u => u._id === value);
    return user ? getUserName(user) : 'All Assignees';
  };

  const handlePageChange = (page: number) => {
    console.log('Page change requested:', page);
    setCurrentPage(page);
  };

  const handleStatusUpdate = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      console.log('Updating ticket status:', { ticketId, newStatus });
      const response = await apiClient.services.updateStatus(ticketId, newStatus);
      
      if (response.success) {
        // Update the ticket in the local state
        setTickets(tickets.map(ticket => 
          ticket._id === ticketId 
            ? { ...ticket, status: newStatus }
            : ticket
        ));
        
        // Update selected ticket if it's the same one
        if (selectedTicket && selectedTicket._id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: newStatus });
        }
        
        // Show success message
        console.log('Status updated successfully');
        alert('Ticket status updated successfully!');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('Failed to update ticket status. Please try again.');
    }
  };

  const handleExportToPDF = async (ticket: ServiceTicket) => {
    try {
      const pdfData: ServiceTicketPDFData = {
        ticketNumber: ticket.ticketNumber,
        customer: {
          name: getCustomerName(ticket.customer),
          email: typeof ticket.customer === 'object' ? ticket.customer.email : undefined,
          phone: typeof ticket.customer === 'object' ? ticket.customer.phone : '',
          address: typeof ticket.customer === 'object' && (ticket.customer as any).address?.address 
            ? (ticket.customer as any).address.address 
            : undefined,
        },
        product: ticket.product && typeof ticket.product === 'object' ? {
          name: ticket.product.name,
          category: ticket.product.category,
          brand: ticket.product.brand,
          modelNumber: ticket.product.modelNumber,
        } : undefined,
        serialNumber: ticket.serialNumber,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        assignedTo: getUserName(ticket.assignedTo),
        scheduledDate: ticket.scheduledDate,
        completedDate: ticket.completedDate,
        createdAt: ticket.createdAt,
        serviceReport: ticket.serviceReport,
        partsUsed: ticket.partsUsed?.map(part => ({
          product: getProductName(part.product),
          quantity: part.quantity,
          serialNumbers: part.serialNumbers,
        })),
        slaDeadline: ticket.slaDeadline,
        slaStatus: ticket.slaStatus,
      };

      await exportServiceTicketToPDF(pdfData);
      console.log('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleBulkExportToPDF = async () => {
    if (tickets.length === 0) {
      alert('No tickets to export');
      return;
    }

    try {
      // Convert all tickets to PDF data format
      const pdfDataArray: ServiceTicketPDFData[] = tickets.map(ticket => ({
        ticketNumber: ticket.ticketNumber,
        customer: {
          name: getCustomerName(ticket.customer),
          email: typeof ticket.customer === 'object' ? ticket.customer.email : undefined,
          phone: typeof ticket.customer === 'object' ? ticket.customer.phone : '',
          address: typeof ticket.customer === 'object' && (ticket.customer as any).address?.address 
            ? (ticket.customer as any).address.address 
            : undefined,
        },
        product: ticket.product && typeof ticket.product === 'object' ? {
          name: ticket.product.name,
          category: ticket.product.category,
          brand: ticket.product.brand,
          modelNumber: ticket.product.modelNumber,
        } : undefined,
        serialNumber: ticket.serialNumber,
        description: ticket.description,
        priority: ticket.priority,
        status: ticket.status,
        assignedTo: getUserName(ticket.assignedTo),
        scheduledDate: ticket.scheduledDate,
        completedDate: ticket.completedDate,
        createdAt: ticket.createdAt,
        serviceReport: ticket.serviceReport,
        partsUsed: ticket.partsUsed?.map(part => ({
          product: getProductName(part.product),
          quantity: part.quantity,
          serialNumbers: part.serialNumbers,
        })),
        slaDeadline: ticket.slaDeadline,
        slaStatus: ticket.slaStatus,
      }));

      // Export all tickets in a single PDF
      await exportMultipleTicketsToPDF(pdfDataArray);
      console.log('Bulk PDF export completed');
    } catch (error) {
      console.error('Error in bulk PDF export:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowStatusDropdown(false);
        setShowPriorityDropdown(false);
        setShowAssigneeDropdown(false);
        setShowSlaDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      <PageHeader 
        title="Service Management"
        subtitle="Track tickets, manage service reports & monitor SLA"
      >
        <div className="flex space-x-3">
          <button
            onClick={handleBulkExportToPDF}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-gray-700 hover:to-gray-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Export All</span>
          </button>
          <button
            onClick={handleCreateTicket}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Create Ticket</span>
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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tickets..."
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
                setShowPriorityDropdown(false);
                setShowAssigneeDropdown(false);
                setShowSlaDropdown(false);
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
                      setStatusFilter(option.value as TicketStatus | 'all');
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

          {/* Priority Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowPriorityDropdown(!showPriorityDropdown);
                setShowStatusDropdown(false);
                setShowAssigneeDropdown(false);
                setShowSlaDropdown(false);
              }}
              className="flex items-center justify-between w-full px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getPriorityLabel(priorityFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showPriorityDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showPriorityDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                {priorityOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setPriorityFilter(option.value as TicketPriority | 'all');
                      setShowPriorityDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                      priorityFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Assignee Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowAssigneeDropdown(!showAssigneeDropdown);
                setShowStatusDropdown(false);
                setShowPriorityDropdown(false);
                setShowSlaDropdown(false);
              }}
              className="flex items-center justify-between w-full px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getAssigneeLabel(assigneeFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showAssigneeDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showAssigneeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                <button
                  onClick={() => {
                    setAssigneeFilter('all');
                    setShowAssigneeDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                    assigneeFilter === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  All Assignees
                </button>
                {users.map(user => (
                  <button
                    key={user._id}
                    onClick={() => {
                      setAssigneeFilter(user._id);
                      setShowAssigneeDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                      assigneeFilter === user._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {getUserName(user)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* SLA Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowSlaDropdown(!showSlaDropdown);
                setShowStatusDropdown(false);
                setShowPriorityDropdown(false);
                setShowAssigneeDropdown(false);
              }}
              className="flex items-center justify-between w-full px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getSlaLabel(slaFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showSlaDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showSlaDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                {slaOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSlaFilter(option.value as SLAStatus | 'all');
                      setShowSlaDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                      slaFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
            Showing {filteredTickets.length} of {totalDatas} tickets
          </span>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer & Product
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority & Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA & Schedule
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading tickets...</td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No tickets found</td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-blue-600">{ticket.ticketNumber}</div>
                        <div className="text-xs text-gray-900 font-medium">
                          {ticket.description.length > 50 
                            ? `${ticket.description.substring(0, 50)}...` 
                            : ticket.description}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created {formatDate(ticket.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-gray-900">{getCustomerName(ticket.customer)}</div>
                        {ticket.product && (
                          <div className="text-xs text-gray-600">{getProductName(ticket.product)}</div>
                        )}
                        {ticket.serialNumber && (
                          <div className="text-xs text-gray-500">S/N: {ticket.serialNumber}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                        </span>
                        <br />
                        <select
                          value={ticket.status}
                          onChange={(e) => handleStatusUpdate(ticket._id, e.target.value as TicketStatus)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${getStatusColor(ticket.status)}`}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">
                        {getUserName(ticket.assignedTo) || (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
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
                        {/* <button
                          onClick={() => handleExportToPDF(ticket)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                          title="Export PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {!loading && totalDatas > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>
          
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalDatas}
            itemsPerPage={limit}
          />
        </div>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Service Ticket</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitTicket(); }} className="p-4 space-y-3">
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
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
           <div className="bg-white rounded-xl shadow-xl w-full max-w-xl m-4 max-h-[90vh] overflow-y-auto">
             <div className="flex items-center justify-between p-4 border-b border-gray-200">
               <h2 className="text-xl font-semibold text-gray-900">Edit Service Ticket</h2>
               <button
                 onClick={() => setShowEditModal(false)}
                 className="text-gray-400 hover:text-gray-600"
               >
                 <X className="w-6 h-6" />
               </button>
             </div>

             <form onSubmit={(e) => { e.preventDefault(); handleUpdateTicket(); }} className="p-4 space-y-3">
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
                     className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                     className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                     className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                     className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                     className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                   className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                   className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
             <div className="flex items-center justify-between p-4 border-b border-gray-200">
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

             <div className="p-4 space-y-3">
               {/* Ticket Overview */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                 {/* Customer Information */}
                 <div className="bg-gray-50 p-6 rounded-lg">
                   <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                     <User className="w-5 h-5 mr-2" />
                     Customer Details
                   </h3>
                   {typeof selectedTicket.customer === 'object' ? (
                     <div className="space-y-2">
                       <div>
                         <p className="text-xs text-gray-600">Name</p>
                         <p className="font-medium">{selectedTicket.customer.name}</p>
                       </div>
                       {selectedTicket.customer.email && (
                         <div>
                           <p className="text-xs text-gray-600">Email</p>
                           <p className="font-medium">{selectedTicket.customer.email}</p>
                         </div>
                       )}
                       <div>
                         <p className="text-xs text-gray-600">Phone</p>
                         <p className="font-medium">{selectedTicket.customer.phone}</p>
                       </div>
                       <div>
                         <p className="text-xs text-gray-600">Address</p>
                         <p className="font-medium text-sm">
                           {typeof selectedTicket.customer === 'object' && (selectedTicket.customer as any).address?.address 
                             ? (selectedTicket.customer as any).address.address 
                             : 'No address available'}
                         </p>
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
                         <p className="text-xs text-gray-600">Product</p>
                         <p className="font-medium">{selectedTicket.product.name}</p>
                       </div>
                       <div>
                         <p className="text-xs text-gray-600">Category</p>
                         <p className="font-medium capitalize">{selectedTicket.product.category}</p>
                       </div>
                       {selectedTicket.product.brand && (
                         <div>
                           <p className="text-xs text-gray-600">Brand</p>
                           <p className="font-medium">{selectedTicket.product.brand}</p>
                         </div>
                       )}
                       {selectedTicket.product.modelNumber && (
                         <div>
                           <p className="text-xs text-gray-600">Model</p>
                           <p className="font-medium">{selectedTicket.product.modelNumber}</p>
                         </div>
                       )}
                       {selectedTicket.serialNumber && (
                         <div>
                           <p className="text-xs text-gray-600">Serial Number</p>
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
                       <p className="text-xs text-gray-600">Status</p>
                       <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTicket.status)}`}>
                         {selectedTicket.status.replace('_', ' ').charAt(0).toUpperCase() + selectedTicket.status.replace('_', ' ').slice(1)}
                       </span>
                     </div>
                     <div>
                       <p className="text-xs text-gray-600">Priority</p>
                       <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                         {selectedTicket.priority.charAt(0).toUpperCase() + selectedTicket.priority.slice(1)}
                       </span>
                     </div>
                     {selectedTicket.slaDeadline && (
                       <div>
                         <p className="text-xs text-gray-600">SLA Status</p>
                         <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSLAColor(selectedTicket.slaStatus)}`}>
                           {selectedTicket.slaStatus === 'on_track' && `${getTimeRemaining(selectedTicket.slaDeadline)} left`}
                           {selectedTicket.slaStatus === 'breached' && 'SLA Breached'}
                           {selectedTicket.slaStatus === 'met' && 'SLA Met'}
                         </span>
                       </div>
                     )}
                     <div>
                       <p className="text-xs text-gray-600">Assigned To</p>
                       <p className="font-medium">{getUserName(selectedTicket.assignedTo) || 'Unassigned'}</p>
                     </div>
                   </div>
                 </div>
               </div>

               {/* Timeline Information */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                             <td className="px-4 py-3 text-xs font-medium text-gray-900">
                               {getProductName(part.product)}
                             </td>
                             <td className="px-4 py-3 text-xs text-gray-600">{part.quantity}</td>
                             <td className="px-4 py-3 text-xs text-gray-600">
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

               {/* Status Update Section */}
               <div className="bg-gray-50 p-4 rounded-lg">
                 <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                   <Settings className="w-5 h-5 mr-2" />
                   Update Status
                 </h3>
                 <div className="flex items-center space-x-3">
                   <span className="text-sm text-gray-600">Current Status:</span>
                   <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTicket.status)}`}>
                     {selectedTicket.status.replace('_', ' ').charAt(0).toUpperCase() + selectedTicket.status.replace('_', ' ').slice(1)}
                   </span>
                   <span className="text-sm text-gray-600">→</span>
                   <select
                     value={selectedTicket.status}
                     onChange={(e) => handleStatusUpdate(selectedTicket._id, e.target.value as TicketStatus)}
                     className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                   >
                     <option value="open">Open</option>
                     <option value="in_progress">In Progress</option>
                     <option value="resolved">Resolved</option>
                     <option value="closed">Closed</option>
                     <option value="cancelled">Cancelled</option>
                   </select>
                 </div>
               </div>

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
                   onClick={() => handleExportToPDF(selectedTicket)}
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
             <div className="flex items-center justify-between p-4 border-b border-gray-200">
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

             <div className="p-4 space-y-3">
               {/* Work Completed */}
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Work Completed *
                 </label>
                 <textarea
                   value={reportData.workCompleted}
                   onChange={(e) => setReportData({ ...reportData, workCompleted: e.target.value })}
                   rows={4}
                   className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                   className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                   className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                       className="px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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