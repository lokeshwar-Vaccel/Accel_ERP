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
  ChevronDown,
  ChevronUp,
  Keyboard,
  Calculator
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { exportServiceTicketToPDF, exportMultipleTicketsToPDF, ServiceTicketPDFData } from '../utils/pdfExport';
import DigitalServiceReport from '../components/DigitalServiceReport';

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
  addresses: Address[];
  customerType: string;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  specifications?: Record<string, any>;
  price?: number;
  stockQuantity?: number;
  totalQuantity?: number;
  reservedQuantity?: number;
  isActive?: boolean;
  stockDetails?: Array<{
    location: any;
    room: any;
    rack: any;
    quantity: number;
    reservedQuantity: number;
    availableQuantity: number;
    lastUpdated: string;
  }>;
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
  serviceCharge?: number;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  turnaroundTime?: number;
  slaStatus?: SLAStatus;
}

interface TicketFormData {
  customer: string;
  product?: string;
  serialNumber: string;
  description: string;
  priority: TicketPriority;
  assignedTo: string;
  scheduledDate: string;
  serviceCharge: number;
}



// Enhanced dropdown state interface
interface DropdownState {
  isOpen: boolean;
  searchTerm: string;
  selectedIndex: number;
  filteredOptions: any[];
}

interface Address {
  _id: string;
  address: string;
  isPrimary: boolean;
}


const ServiceManagement: React.FC = () => {
  const location = useLocation();

  // Core state
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  console.log("products=>",products);
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

  const [showDigitalReportModal, setShowDigitalReportModal] = useState(false);
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
    scheduledDate: new Date().toISOString().split('T')[0],
    serviceCharge: 0
  });



  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Dropdown state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [showSlaDropdown, setShowSlaDropdown] = useState(false);

  // Enhanced dropdown states for cascading dropdowns
  const [customerDropdown, setCustomerDropdown] = useState<DropdownState>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  const [productDropdown, setProductDropdown] = useState<DropdownState>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  const [priorityDropdown, setPriorityDropdown] = useState<DropdownState>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  const [assigneeDropdown, setAssigneeDropdown] = useState<DropdownState>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  // Refs for dropdown focus management
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);
  const priorityDropdownRef = useRef<HTMLDivElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const scheduledDateRef = useRef<HTMLInputElement>(null);
  const serialNumberRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

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

  // Initialize filtered options when data is loaded
  useEffect(() => {
    if (customers.length > 0) {
      setCustomerDropdown(prev => ({
        ...prev,
        filteredOptions: customers
      }));
    }
  }, [customers]);

  useEffect(() => {
    if (products.length > 0) {
      setProductDropdown(prev => ({
        ...prev,
        filteredOptions: products
      }));
    }
  }, [products]);

  useEffect(() => {
    if (users.length > 0) {
      setAssigneeDropdown(prev => ({
        ...prev,
        filteredOptions: users
      }));
    }
  }, [users]);

  // Form priority options (without 'all' option)
  const formPriorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' }
  ];

  useEffect(() => {
    setPriorityDropdown(prev => ({
      ...prev,
      filteredOptions: formPriorityOptions
    }));
  }, []);

  // Auto-open first dropdown when modal opens
  useEffect(() => {
    if (showCreateModal) {
      // Small delay to ensure modal is rendered
      setTimeout(() => {
        setCustomerDropdown(prev => ({
          ...prev,
          isOpen: true,
          searchTerm: '',
          filteredOptions: customers,
          selectedIndex: 0
        }));
        // Focus the customer input
        const customerInput = document.querySelector('input[placeholder="Search customer..."]') as HTMLInputElement;
        if (customerInput) {
          customerInput.focus();
        }
      }, 100);
    }
  }, [showCreateModal, customers]);

  // Handle Tab key navigation within modal
  useEffect(() => {
    const handleModalTabKey = (e: KeyboardEvent) => {
      if (!showCreateModal) return;

      if (e.key === 'Tab') {
        // Get all focusable elements in the modal
        const modal = document.querySelector('.bg-white.rounded-xl.shadow-xl') as HTMLElement;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'input, textarea, select, button, [tabindex]:not([tabindex="-1"])'
        ) as NodeListOf<HTMLElement>;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleModalTabKey);
    return () => {
      document.removeEventListener('keydown', handleModalTabKey);
    };
  }, [showCreateModal]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTickets(),
        fetchCustomers(),
        fetchProducts(),
        fetchFieldOperator()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
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
      const response = await apiClient.products.getWithInventory({
        isActive: true
      });
      let productsData: Product[] = [];
      if (response.success && response.data && response.data.products) {
        productsData = response.data.products;
      }

      // Filter out inactive products and products with zero stock
      const availableProducts = productsData.filter(product => 
        product.isActive && (product.stockQuantity || 0) > 0
      );

      setProducts(availableProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchFieldOperator = async () => {
    try {
      // Fetch field operators from API
      const response = await apiClient.users.getFieldOperators();
      if (response.success && response.data.fieldOperators) {
        const fieldOperators: User[] = response.data.fieldOperators.map((operator: any) => ({
          _id: operator.id,
          firstName: operator.firstName,
          lastName: operator.lastName,
          email: operator.email,
          phone: operator.phone,
          fullName: operator.name
        }));
        setUsers(fieldOperators);
      } else {
        // Fallback to hardcoded data if API fails
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
      }
    } catch (error) {
      console.error('Error fetching field operators:', error);
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
      scheduledDate: new Date().toISOString().split('T')[0],
      serviceCharge: 0
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
      scheduledDate: ticket.scheduledDate ? ticket.scheduledDate.split('T')[0] : '',
      serviceCharge: ticket.serviceCharge || 0
    });
    
    // Initialize dropdown states for edit mode
    setCustomerDropdown({
      isOpen: false,
      searchTerm: typeof ticket.customer === 'string' ? customers.find(c => c._id === ticket.customer)?.name || '' : ticket.customer?.name || '',
      selectedIndex: 0,
      filteredOptions: customers
    });
    
    setProductDropdown({
      isOpen: false,
      searchTerm: typeof ticket.product === 'string' ? products.find(p => p._id === ticket.product)?.name || '' : ticket.product?.name || '',
      selectedIndex: 0,
      filteredOptions: products
    });
    
    setPriorityDropdown({
      isOpen: false,
      searchTerm: formPriorityOptions.find(p => p.value === ticket.priority)?.label || '',
      selectedIndex: 0,
      filteredOptions: formPriorityOptions
    });
    
    setAssigneeDropdown({
      isOpen: false,
      searchTerm: typeof ticket.assignedTo === 'string' ? users.find(u => u._id === ticket.assignedTo)?.fullName || '' : ticket.assignedTo?.fullName || '',
      selectedIndex: 0,
      filteredOptions: users
    });
    
    setFormErrors({});
    setShowEditModal(true);
  };

  const openDetailsModal = (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
  };



  const openDigitalServiceReport = (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setShowDigitalReportModal(true);
  };

  const validateTicketForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!ticketFormData.customer) {
      errors.customer = 'Customer is required';
    }
    if (!ticketFormData.assignedTo) {
      errors.assignedTo = 'Assigned To is required';
    }
    if (!ticketFormData.scheduledDate) {
      errors.scheduledDate = 'Scheduled Date is required';
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
        serviceCharge: ticketFormData.serviceCharge || 0,
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
        fetchTickets();
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
        serviceCharge: ticketFormData.serviceCharge || 0,
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
      scheduledDate: new Date().toISOString().split('T')[0],
      serviceCharge: 0
    });

    // Reset dropdown states
    setCustomerDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
    setProductDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
    setPriorityDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
    setAssigneeDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
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
      
      // Find the ticket to check if it has a product
      const ticket = tickets.find(t => t._id === ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // If status is being changed to 'resolved' and ticket has a product, show confirmation
      if (newStatus === 'resolved' && ticket.product) {
        const productName = typeof ticket.product === 'string' 
          ? products.find(p => p._id === ticket.product)?.name || 'Unknown Product'
          : ticket.product.name;
        
        const confirmMessage = `This ticket has a product (${productName}) associated with it. Resolving this ticket will decrease the inventory by 1 unit. Do you want to continue?`;
        
        if (!confirm(confirmMessage)) {
          return; // User cancelled the operation
        }
      }

      // Update the ticket status first
      const response = await apiClient.services.updateStatus(ticketId, newStatus);

      if (response.success) {
        // If status is being changed to 'resolved' and ticket has a product, decrease inventory
        console.log("response:", response);
        if (newStatus === 'resolved' && ticket.product) {
          try {
            const productId = typeof ticket.product === 'string' ? ticket.product : ticket.product._id;
            
            // First, get the stock information for this product
            // We need to find the stock record for this product
            const stockResponse = await apiClient.stock.getStock({ product: productId });
            
            if (stockResponse.success && stockResponse.data.stockLevels.length > 0) {
              // Use the first stock record found for this product
              const stockRecord = stockResponse.data.stockLevels[0];
              
              // Decrease inventory by 1 for the product
              const inventoryAdjustment = {
                stockId: stockRecord._id,
                product: productId,
                location: stockRecord.location._id,
                adjustmentType: 'subtract',
                quantity: 1,
                reason: `Service ticket ${ticket.ticketNumber} resolved`,
                notes: `Inventory decreased due to service ticket resolution`
              };

              console.log('Adjusting inventory for resolved ticket:', inventoryAdjustment);
              const inventoryResponse = await apiClient.stock.adjustStock(inventoryAdjustment);

              if (inventoryResponse.success) {
                console.log('Inventory adjusted successfully');
                
                // Refresh products data to reflect updated stock levels
                await fetchProducts();
              } else {
                console.warn('Failed to adjust inventory, but ticket status was updated');
              }
            } else {
              console.warn('No stock record found for product, but ticket status was updated');
            }
          } catch (inventoryError) {
            console.error('Error adjusting inventory:', inventoryError);
            // Don't fail the entire operation if inventory adjustment fails
            // The ticket status was already updated successfully
          }
        }

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
        const message = newStatus === 'resolved' && ticket.product 
          ? 'Ticket status updated successfully! Inventory has been decreased for the product.'
          : 'Ticket status updated successfully!';
        
        console.log('Status updated successfully');
        alert(message);
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      alert('Failed to update ticket status. Please try again.');
    }
  };

  const handleExportToPDF = async (ticket: ServiceTicket) => {
    try {
      console.log("ticket-pdf", ticket);
      const pdfData: ServiceTicketPDFData = {
        ticketNumber: ticket.ticketNumber,
        customer: {
          name: getCustomerName(ticket.customer),
          email: typeof ticket.customer === 'object' ? ticket.customer.email : undefined,
          phone: typeof ticket.customer === 'object' ? ticket.customer.phone : '',
          address: typeof ticket.customer === 'object' ? (ticket.customer as any).addresses.find((address: any) => address.isPrimary)?.address || 'No address available' : undefined,
        },
        product: ticket.product && typeof ticket.product === 'object' ? {
          name: ticket.product.name,
          category: ticket.product.category,
          brand: ticket.product.brand,
          modelNumber: ticket.product.modelNumber,
          price: (() => {
            // Try to get price from ticket product first
            if (ticket.product && typeof ticket.product === 'object' && ticket.product.price) {
              return ticket.product.price;
            }
            // If not available, find the product in the local products array
            const productId = typeof ticket.product === 'string' ? ticket.product : ticket.product._id;
            const foundProduct = products.find(p => p._id === productId);
            return foundProduct?.price || 0;
          })(),
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
        serviceCharge: ticket.serviceCharge || 0,
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
          address: typeof ticket.customer === 'object' ? (ticket.customer as any).addresses.find((address: any) => address.isPrimary)?.address || 'No address available' : undefined,
        },
        product: ticket.product && typeof ticket.product === 'object' ? {
          name: ticket.product.name,
          category: ticket.product.category,
          price: (() => {
            // Try to get price from ticket product first
            if (ticket.product && typeof ticket.product === 'object' && ticket.product.price) {
              return ticket.product.price;
            }
            // If not available, find the product in the local products array
            const productId = typeof ticket.product === 'string' ? ticket.product : ticket.product._id;
            const foundProduct = products.find(p => p._id === productId);
            return foundProduct?.price || 0;
          })(),
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
        serviceCharge: ticket.serviceCharge || 0,
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

  // Enhanced dropdown handlers
  const scrollToSelectedItem = (dropdownType: 'customer' | 'product' | 'priority' | 'assignee') => {
    const dropdownState = getDropdownState(dropdownType);
    const containerId = `${dropdownType}-dropdown-container`;
    const selectedItemId = `${dropdownType}-item-${dropdownState.selectedIndex}`;

    setTimeout(() => {
      const container = document.getElementById(containerId);
      const selectedItem = document.getElementById(selectedItemId);

      if (container && selectedItem) {
        const containerRect = container.getBoundingClientRect();
        const itemRect = selectedItem.getBoundingClientRect();

        // Check if item is outside visible area
        if (itemRect.top < containerRect.top || itemRect.bottom > containerRect.bottom) {
          selectedItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }
      }
    }, 10);
  };

  const handleDropdownKeyDown = (
    dropdownType: 'customer' | 'product' | 'priority' | 'assignee',
    event: React.KeyboardEvent,
    options: any[],
    onSelect: (value: string) => void
  ) => {
    const dropdownState = getDropdownState(dropdownType);
    const setDropdownState = getSetDropdownState(dropdownType);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        setDropdownState(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, options.length - 1)
        }));
        // Scroll to the newly selected item
        setTimeout(() => scrollToSelectedItem(dropdownType), 0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        setDropdownState(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0)
        }));
        // Scroll to the newly selected item
        setTimeout(() => scrollToSelectedItem(dropdownType), 0);
        break;
      case 'Enter':
        event.preventDefault();
        event.stopPropagation();
        if (options.length > 0 && dropdownState.selectedIndex >= 0) {
          const selectedOption = options[dropdownState.selectedIndex];
          onSelect(selectedOption.value || selectedOption._id);
          setDropdownState(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
          moveToNextDropdown(dropdownType);
        }
        break;
      case 'Tab':
        event.preventDefault();
        event.stopPropagation();
        // Tab only navigates to next field, doesn't select
        moveToNextDropdown(dropdownType);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        setDropdownState(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
        break;
    }
  };

  const getDropdownState = (type: 'customer' | 'product' | 'priority' | 'assignee') => {
    switch (type) {
      case 'customer': return customerDropdown;
      case 'product': return productDropdown;
      case 'priority': return priorityDropdown;
      case 'assignee': return assigneeDropdown;
    }
  };

  const getSetDropdownState = (type: 'customer' | 'product' | 'priority' | 'assignee') => {
    switch (type) {
      case 'customer': return setCustomerDropdown;
      case 'product': return setProductDropdown;
      case 'priority': return setPriorityDropdown;
      case 'assignee': return setAssigneeDropdown;
    }
  };

  const moveToNextDropdown = (currentType: 'customer' | 'product' | 'priority' | 'assignee') => {
    // Close current dropdown
    const setCurrentDropdown = getSetDropdownState(currentType);
    setCurrentDropdown(prev => ({ ...prev, isOpen: false }));

    // Move to next field based on current type
    switch (currentType) {
      case 'customer':
        setTimeout(() => {
          setProductDropdown(prev => ({ ...prev, isOpen: true }));
          // Focus the product input
          const productInput = document.querySelector('input[placeholder="Search product..."]') as HTMLInputElement;
          if (productInput) {
            productInput.focus();
          }
        }, 50);
        break;
      case 'product':
        setTimeout(() => {
          setPriorityDropdown(prev => ({ ...prev, isOpen: true }));
          // Focus the priority input
          const priorityInput = document.querySelector('input[placeholder="Select priority..."]') as HTMLInputElement;
          if (priorityInput) {
            priorityInput.focus();
          }
        }, 50);
        break;
      case 'priority':
        setTimeout(() => {
          setAssigneeDropdown(prev => ({ ...prev, isOpen: true }));
          // Focus the assignee input
          const assigneeInput = document.querySelector('input[placeholder="Search technician..."]') as HTMLInputElement;
          if (assigneeInput) {
            assigneeInput.focus();
          }
        }, 50);
        break;
      case 'assignee':
        setTimeout(() => {
          scheduledDateRef.current?.focus();
        }, 50);
        break;
    }
  };

  const handleDropdownSearch = (
    type: 'customer' | 'product' | 'priority' | 'assignee',
    searchTerm: string
  ) => {
    const setDropdownState = getSetDropdownState(type);

    // Get the original data based on type
    let originalOptions: any[] = [];
    switch (type) {
      case 'customer':
        originalOptions = customers;
        break;
      case 'product':
        originalOptions = products;
        break;
      case 'priority':
        originalOptions = formPriorityOptions;
        break;
      case 'assignee':
        originalOptions = users;
        break;
    }

    // Filter from original data
    const filtered = originalOptions.filter((option: any) => {
      const searchText = searchTerm.toLowerCase();
      const optionText = (option.name || option.label || option.fullName || '').toLowerCase();
      return optionText.includes(searchText);
    });

    setDropdownState(prev => ({
      ...prev,
      searchTerm,
      filteredOptions: filtered,
      selectedIndex: 0
    }));
  };

  const handleDropdownFocus = (
    type: 'customer' | 'product' | 'priority' | 'assignee'
  ) => {
    const setDropdownState = getSetDropdownState(type);

    // Get the original data based on type
    let originalOptions: any[] = [];
    switch (type) {
      case 'customer':
        originalOptions = customers;
        break;
      case 'product':
        originalOptions = products;
        break;
      case 'priority':
        originalOptions = formPriorityOptions;
        break;
      case 'assignee':
        originalOptions = users;
        break;
    }

    // Reset dropdown to show all original options
    setDropdownState(prev => ({
      ...prev,
      isOpen: true,
      searchTerm: '',
      filteredOptions: originalOptions,
      selectedIndex: 0
    }));
  };

  const handleDropdownSelect = (
    type: 'customer' | 'product' | 'priority' | 'assignee',
    value: string
  ) => {
    const setDropdownState = getSetDropdownState(type);

    // For products, check if the selected product is in stock
    if (type === 'product') {
      const selectedProduct = products.find(p => p._id === value);
      if (selectedProduct && (selectedProduct.stockQuantity || 0) <= 0) {
        // Don't select out-of-stock products
        return;
      }
    }

    // Update form data
    setTicketFormData(prev => ({
      ...prev,
      [type === 'customer' ? 'customer' :
        type === 'product' ? 'product' :
          type === 'priority' ? 'priority' : 'assignedTo']: value
    }));

    // Clear error for this field when selected
    const errorField = type === 'customer' ? 'customer' :
      type === 'product' ? 'product' :
        type === 'priority' ? 'priority' : 'assignedTo';
    if (formErrors[errorField]) {
      setFormErrors(prev => ({ ...prev, [errorField]: '' }));
    }

    // Close current dropdown
    setDropdownState(prev => ({ ...prev, isOpen: false, searchTerm: '' }));

    // Move to next dropdown after selection
    moveToNextDropdown(type);
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

        // Close enhanced dropdowns
        setCustomerDropdown(prev => ({ ...prev, isOpen: false }));
        setProductDropdown(prev => ({ ...prev, isOpen: false }));
        setPriorityDropdown(prev => ({ ...prev, isOpen: false }));
        setAssigneeDropdown(prev => ({ ...prev, isOpen: false }));
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
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${statusFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${priorityFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${assigneeFilter === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${assigneeFilter === user._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${slaFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                  Service Charge
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
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <LoadingSpinner size="lg" />
                      <p className="text-gray-500 text-sm">Loading tickets...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No tickets found</td>
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
                        <div className="flex items-center space-x-1">
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
                          {ticket.product && (
                            <span 
                              className="text-xs text-orange-600 cursor-help" 
                              title="This ticket has a product. Resolving will decrease inventory by 1 unit."
                            >
                              📦
                            </span>
                          )}
                        </div>
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
                      <div className="text-xs text-gray-900">
                        {ticket.serviceCharge && ticket.serviceCharge > 0 ? (
                          <span className="text-green-600 font-medium">₹{ticket.serviceCharge}</span>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
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
                                    {ticket.status === 'resolved' && (
              <button
                onClick={() => openDigitalServiceReport(ticket)}
                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                title="Digital Service Report"
              >
                <FileText className="w-4 h-4" />
              </button>
            )}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Service Ticket</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetTicketForm();
                }}
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Enhanced Customer Dropdown */}
                <div className="relative dropdown-container" ref={customerDropdownRef} id="customer-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerDropdown.searchTerm || (ticketFormData.customer ? customers.find(c => c._id === ticketFormData.customer)?.name || '' : '')}
                      onChange={(e) => {
                        setCustomerDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                        handleDropdownSearch('customer', e.target.value);
                        // Clear error when user starts typing
                        if (formErrors.customer) {
                          setFormErrors(prev => ({ ...prev, customer: '' }));
                        }
                      }}
                      onKeyDown={(e) => handleDropdownKeyDown('customer', e, customerDropdown.filteredOptions, (value) => handleDropdownSelect('customer', value))}
                      onFocus={() => handleDropdownFocus('customer')}
                      onBlur={() => {
                        // Delay closing to allow for clicks on dropdown items
                        setTimeout(() => {
                          setCustomerDropdown(prev => ({ ...prev, isOpen: false }));
                        }, 200);
                      }}
                      placeholder="Search customer..."
                      className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.customer ? 'border-red-500' : 'border-gray-300'
                        } ${customerDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {customerDropdown.isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {customerDropdown.filteredOptions.length > 0 ? (
                        customerDropdown.filteredOptions.map((customer, index) => (
                          <button
                            key={customer._id}
                            id={`customer-item-${index}`}
                            type="button"
                            onClick={() => handleDropdownSelect('customer', customer._id)}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === customerDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                              }`}
                          >
                            <div className="font-medium">{customer.name}</div>
                            {customer.email && (
                              <div className="text-xs text-gray-500">{customer.email}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">No customers found</div>
                      )}
                    </div>
                  )}
                  {formErrors.customer && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.customer}</p>
                  )}
                </div>

                {/* Enhanced Product Dropdown - Spans 2 columns on large screens */}
                <div className="relative dropdown-container lg:col-span-2" ref={productDropdownRef} id="product-dropdown-container" style={{ zIndex: 1000 }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={productDropdown.searchTerm || (ticketFormData.product ? products.find(p => p._id === ticketFormData.product)?.name || '' : '')}
                      onChange={(e) => {
                        setProductDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                        handleDropdownSearch('product', e.target.value);
                        // Clear error when user starts typing
                        if (formErrors.product) {
                          setFormErrors(prev => ({ ...prev, product: '' }));
                        }
                      }}
                      onKeyDown={(e) => handleDropdownKeyDown('product', e, productDropdown.filteredOptions, (value) => handleDropdownSelect('product', value))}
                      onFocus={() => handleDropdownFocus('product')}
                      onBlur={() => {
                        // Delay closing to allow for clicks on dropdown items
                        setTimeout(() => {
                          setProductDropdown(prev => ({ ...prev, isOpen: false }));
                        }, 200);
                      }}
                      placeholder="Search product..."
                      className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.product ? 'border-red-500' : 'border-gray-300'
                        } ${productDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {productDropdown.isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1001] max-h-60 overflow-y-auto min-w-full" style={{ minWidth: '100%', maxWidth: 'none' }}>
                      {productDropdown.filteredOptions.length > 0 ? (
                        productDropdown.filteredOptions.map((product, index) => {
                          const isInStock = (product.stockQuantity || 0) > 0;
                          const stockQuantity = product.stockQuantity || 0;
                          
                          return (
                            <button
                              key={product._id}
                              id={`product-item-${index}`}
                              type="button"
                              onClick={() => !isInStock ? null : handleDropdownSelect('product', product._id)}
                              disabled={!isInStock}
                              className={`w-full px-3 py-2 text-left transition-colors ${
                                !isInStock 
                                  ? 'text-gray-400 cursor-not-allowed bg-gray-50' 
                                  : index === productDropdown.selectedIndex 
                                    ? 'bg-blue-100 text-blue-900 hover:bg-blue-50' 
                                    : 'text-gray-700 hover:bg-blue-50'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{product.name}</div>
                                  <div className="text-xs text-gray-500 truncate">{product.category}</div>
                                  {product.brand && (
                                    <div className="text-xs text-gray-400 truncate">Brand: {product.brand}</div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                    isInStock 
                                      ? 'bg-green-100 text-green-700 border border-green-200' 
                                      : 'bg-red-100 text-red-700 border border-red-200'
                                  }`}>
                                    {isInStock ? `${stockQuantity} in stock` : 'Out of stock'}
                                  </span>
                                  {product.price && (
                                    <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                                      ₹{product.price}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">No products found</div>
                      )}
                    </div>
                  )}
                  {formErrors.product && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.product}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Enhanced Priority Dropdown */}
                <div className="relative dropdown-container" ref={priorityDropdownRef} id="priority-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={priorityDropdown.searchTerm || (ticketFormData.priority ? formPriorityOptions.find(p => p.value === ticketFormData.priority)?.label || '' : '')}
                      onChange={(e) => {
                        setPriorityDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                        handleDropdownSearch('priority', e.target.value);
                        // Clear error when user starts typing
                        if (formErrors.priority) {
                          setFormErrors(prev => ({ ...prev, priority: '' }));
                        }
                      }}
                      onKeyDown={(e) => handleDropdownKeyDown('priority', e, priorityDropdown.filteredOptions, (value) => handleDropdownSelect('priority', value))}
                      onFocus={() => handleDropdownFocus('priority')}
                      onBlur={() => {
                        // Delay closing to allow for clicks on dropdown items
                        setTimeout(() => {
                          setPriorityDropdown(prev => ({ ...prev, isOpen: false }));
                        }, 200);
                      }}
                      placeholder="Select priority..."
                      className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.priority ? 'border-red-500' : 'border-gray-300'
                        } ${priorityDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {priorityDropdown.isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {priorityDropdown.filteredOptions.length > 0 ? (
                        priorityDropdown.filteredOptions.map((priority, index) => (
                          <button
                            key={priority.value}
                            id={`priority-item-${index}`}
                            type="button"
                            onClick={() => handleDropdownSelect('priority', priority.value)}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === priorityDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                              }`}
                          >
                            <div className="font-medium">{priority.label}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">No priorities found</div>
                      )}
                    </div>
                  )}
                  {formErrors.priority && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.priority}</p>
                  )}
                </div>

                {/* Enhanced Assignee Dropdown */}
                <div className="relative dropdown-container" ref={assigneeDropdownRef} id="assignee-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={assigneeDropdown.searchTerm || (ticketFormData.assignedTo ? users.find(u => u._id === ticketFormData.assignedTo)?.fullName || '' : '')}
                      onChange={(e) => {
                        setAssigneeDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                        handleDropdownSearch('assignee', e.target.value);
                        // Clear error when user starts typing
                        if (formErrors.assignedTo) {
                          setFormErrors(prev => ({ ...prev, assignedTo: '' }));
                        }
                      }}
                      onKeyDown={(e) => handleDropdownKeyDown('assignee', e, assigneeDropdown.filteredOptions, (value) => handleDropdownSelect('assignee', value))}
                      onFocus={() => handleDropdownFocus('assignee')}
                      onBlur={() => {
                        // Delay closing to allow for clicks on dropdown items
                        setTimeout(() => {
                          setAssigneeDropdown(prev => ({ ...prev, isOpen: false }));
                        }, 200);
                      }}
                      placeholder="Search technician..."
                      className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.assignedTo ? 'border-red-500' : 'border-gray-300'
                        } ${assigneeDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {assigneeDropdown.isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {assigneeDropdown.filteredOptions.length > 0 ? (
                        assigneeDropdown.filteredOptions.map((user, index) => (
                          <button
                            key={user._id}
                            id={`assignee-item-${index}`}
                            type="button"
                            onClick={() => handleDropdownSelect('assignee', user._id)}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === assigneeDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                              }`}
                          >
                            <div className="font-medium">{getUserName(user)}</div>
                            {user.email && (
                              <div className="text-xs text-gray-500">{user.email}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">No technicians found</div>
                      )}
                    </div>
                  )}
                  {formErrors.assignedTo && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.assignedTo}</p>
                  )}
                </div>

                {/* Scheduled Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled Date *
                  </label>
                  <input
                    ref={scheduledDateRef}
                    type="date"
                    value={ticketFormData.scheduledDate}
                    onChange={(e) => {
                      setTicketFormData({ ...ticketFormData, scheduledDate: e.target.value });
                      // Clear error when user selects a date
                      if (formErrors.scheduledDate) {
                        setFormErrors(prev => ({ ...prev, scheduledDate: '' }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        serialNumberRef.current?.focus();
                      }
                    }}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.scheduledDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {formErrors.scheduledDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.scheduledDate}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Serial Number
                </label>
                <input
                  ref={serialNumberRef}
                  type="text"
                  value={ticketFormData.serialNumber}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, serialNumber: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      descriptionRef.current?.focus();
                    }
                  }}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter product serial number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  ref={descriptionRef}
                  value={ticketFormData.description}
                  onChange={(e) => {
                    setTicketFormData({ ...ticketFormData, description: e.target.value });
                    // Clear error when user starts typing
                    if (formErrors.description) {
                      setFormErrors(prev => ({ ...prev, description: '' }));
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      // Focus the service charge input
                      const serviceChargeInput = document.querySelector('input[placeholder="Enter service charge"]') as HTMLInputElement;
                      if (serviceChargeInput) {
                        serviceChargeInput.focus();
                      }
                    }
                  }}
                  rows={4}
                  className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Describe in detail..."
                />
                {formErrors.description && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {ticketFormData.description.length}/2000 characters
                </p>
              </div>

              {/* Service Charge Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Charge (₹)
                </label>
                <input
                  type="number"
                  value={ticketFormData.serviceCharge}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, serviceCharge: Number(e.target.value) || 0 })}
                  onKeyDown={(e) => {
                    if (e.key === 'Tab' && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      // Focus the first customer input to complete the cycle
                      const customerInput = document.querySelector('input[placeholder="Search customer..."]') as HTMLInputElement;
                      if (customerInput) {
                        customerInput.focus();
                      }
                    }
                  }}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter service charge"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Cost Summary */}
              {(ticketFormData.product || ticketFormData.serviceCharge > 0) && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Cost Summary
                  </h3>
                  <div className="space-y-2">
                    {ticketFormData.product && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          {products.find(p => p._id === ticketFormData.product)?.name || 'Selected Product'}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          ₹{products.find(p => p._id === ticketFormData.product)?.price || 0}
                        </span>
                      </div>
                    )}
                    {ticketFormData.serviceCharge > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Service Charge</span>
                        <span className="text-sm font-medium text-gray-900">
                          ₹{ticketFormData.serviceCharge}
                        </span>
                      </div>
                    )}
                    {(ticketFormData.product || ticketFormData.serviceCharge > 0) && (
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-900">Total</span>
                          <span className="text-sm font-bold text-blue-600">
                            ₹{((products.find(p => p._id === ticketFormData.product)?.price || 0) + ticketFormData.serviceCharge)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetTicketForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" className="text-white" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    'Create Ticket'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ticket Modal */}
      {showEditModal && editingTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Enhanced Customer Dropdown */}
                <div className="relative dropdown-container" ref={customerDropdownRef} id="customer-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerDropdown.searchTerm || (ticketFormData.customer ? customers.find(c => c._id === ticketFormData.customer)?.name || '' : '')}
                      onChange={(e) => {
                        setCustomerDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                        handleDropdownSearch('customer', e.target.value);
                        // Clear error when user starts typing
                        if (formErrors.customer) {
                          setFormErrors(prev => ({ ...prev, customer: '' }));
                        }
                      }}
                      onKeyDown={(e) => handleDropdownKeyDown('customer', e, customerDropdown.filteredOptions, (value) => handleDropdownSelect('customer', value))}
                      onFocus={() => handleDropdownFocus('customer')}
                      onBlur={() => {
                        // Delay closing to allow for clicks on dropdown items
                        setTimeout(() => {
                          setCustomerDropdown(prev => ({ ...prev, isOpen: false }));
                        }, 200);
                      }}
                      placeholder="Search customer..."
                      className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.customer ? 'border-red-500' : 'border-gray-300'
                        } ${customerDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {customerDropdown.isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {customerDropdown.filteredOptions.length > 0 ? (
                        customerDropdown.filteredOptions.map((customer, index) => (
                          <button
                            key={customer._id}
                            id={`customer-item-${index}`}
                            type="button"
                            onClick={() => handleDropdownSelect('customer', customer._id)}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === customerDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                              }`}
                          >
                            <div className="font-medium">{customer.name}</div>
                            {customer.email && (
                              <div className="text-xs text-gray-500">{customer.email}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">No customers found</div>
                      )}
                    </div>
                  )}
                  {formErrors.customer && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.customer}</p>
                  )}
                </div>

                {/* Enhanced Product Dropdown - Spans 2 columns on large screens */}
                <div className="relative dropdown-container lg:col-span-2" ref={productDropdownRef} id="product-dropdown-container" style={{ zIndex: 1000 }}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={productDropdown.searchTerm || (ticketFormData.product ? products.find(p => p._id === ticketFormData.product)?.name || '' : '')}
                      onChange={(e) => {
                        setProductDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                        handleDropdownSearch('product', e.target.value);
                        // Clear error when user starts typing
                        if (formErrors.product) {
                          setFormErrors(prev => ({ ...prev, product: '' }));
                        }
                      }}
                      onKeyDown={(e) => handleDropdownKeyDown('product', e, productDropdown.filteredOptions, (value) => handleDropdownSelect('product', value))}
                      onFocus={() => handleDropdownFocus('product')}
                      onBlur={() => {
                        // Delay closing to allow for clicks on dropdown items
                        setTimeout(() => {
                          setProductDropdown(prev => ({ ...prev, isOpen: false }));
                        }, 200);
                      }}
                      placeholder="Search product..."
                      className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.product ? 'border-red-500' : 'border-gray-300'
                        } ${productDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {productDropdown.isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[1001] max-h-60 overflow-y-auto min-w-full" style={{ minWidth: '100%', maxWidth: 'none' }}>
                      {productDropdown.filteredOptions.length > 0 ? (
                        productDropdown.filteredOptions.map((product, index) => {
                          const isInStock = (product.stockQuantity || 0) > 0;
                          const stockQuantity = product.stockQuantity || 0;
                          
                          return (
                            <button
                              key={product._id}
                              id={`product-item-${index}`}
                              type="button"
                              onClick={() => !isInStock ? null : handleDropdownSelect('product', product._id)}
                              disabled={!isInStock}
                              className={`w-full px-3 py-2 text-left transition-colors ${
                                !isInStock 
                                  ? 'text-gray-400 cursor-not-allowed bg-gray-50' 
                                  : index === productDropdown.selectedIndex 
                                    ? 'bg-blue-100 text-blue-900 hover:bg-blue-50' 
                                    : 'text-gray-700 hover:bg-blue-50'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{product.name}</div>
                                  <div className="text-xs text-gray-500 truncate">{product.category}</div>
                                  {product.brand && (
                                    <div className="text-xs text-gray-400 truncate">Brand: {product.brand}</div>
                                  )}
                                </div>
                                <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                                    isInStock 
                                      ? 'bg-green-100 text-green-700 border border-green-200' 
                                      : 'bg-red-100 text-red-700 border border-red-200'
                                  }`}>
                                    {isInStock ? `${stockQuantity} in stock` : 'Out of stock'}
                                  </span>
                                  {product.price && (
                                    <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                                      ₹{product.price}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">No products found</div>
                      )}
                    </div>
                  )}
                  {formErrors.product && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.product}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Enhanced Priority Dropdown */}
                <div className="relative dropdown-container" ref={priorityDropdownRef} id="priority-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={priorityDropdown.searchTerm || (ticketFormData.priority ? formPriorityOptions.find(p => p.value === ticketFormData.priority)?.label || '' : '')}
                      onChange={(e) => {
                        setPriorityDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                        handleDropdownSearch('priority', e.target.value);
                        // Clear error when user starts typing
                        if (formErrors.priority) {
                          setFormErrors(prev => ({ ...prev, priority: '' }));
                        }
                      }}
                      onKeyDown={(e) => handleDropdownKeyDown('priority', e, priorityDropdown.filteredOptions, (value) => handleDropdownSelect('priority', value))}
                      onFocus={() => handleDropdownFocus('priority')}
                      onBlur={() => {
                        // Delay closing to allow for clicks on dropdown items
                        setTimeout(() => {
                          setPriorityDropdown(prev => ({ ...prev, isOpen: false }));
                        }, 200);
                      }}
                      placeholder="Select priority..."
                      className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.priority ? 'border-red-500' : 'border-gray-300'
                        } ${priorityDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {priorityDropdown.isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {priorityDropdown.filteredOptions.length > 0 ? (
                        priorityDropdown.filteredOptions.map((priority, index) => (
                          <button
                            key={priority.value}
                            id={`priority-item-${index}`}
                            type="button"
                            onClick={() => handleDropdownSelect('priority', priority.value)}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === priorityDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                              }`}
                          >
                            <div className="font-medium">{priority.label}</div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">No priorities found</div>
                      )}
                    </div>
                  )}
                  {formErrors.priority && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.priority}</p>
                  )}
                </div>

                {/* Enhanced Assignee Dropdown */}
                <div className="relative dropdown-container" ref={assigneeDropdownRef} id="assignee-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={assigneeDropdown.searchTerm || (ticketFormData.assignedTo ? users.find(u => u._id === ticketFormData.assignedTo)?.fullName || '' : '')}
                      onChange={(e) => {
                        setAssigneeDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                        handleDropdownSearch('assignee', e.target.value);
                        // Clear error when user starts typing
                        if (formErrors.assignedTo) {
                          setFormErrors(prev => ({ ...prev, assignedTo: '' }));
                        }
                      }}
                      onKeyDown={(e) => handleDropdownKeyDown('assignee', e, assigneeDropdown.filteredOptions, (value) => handleDropdownSelect('assignee', value))}
                      onFocus={() => handleDropdownFocus('assignee')}
                      onBlur={() => {
                        // Delay closing to allow for clicks on dropdown items
                        setTimeout(() => {
                          setAssigneeDropdown(prev => ({ ...prev, isOpen: false }));
                        }, 200);
                      }}
                      placeholder="Search technician..."
                      className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.assignedTo ? 'border-red-500' : 'border-gray-300'
                        } ${assigneeDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {assigneeDropdown.isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {assigneeDropdown.filteredOptions.length > 0 ? (
                        assigneeDropdown.filteredOptions.map((user, index) => (
                          <button
                            key={user._id}
                            id={`assignee-item-${index}`}
                            type="button"
                            onClick={() => handleDropdownSelect('assignee', user._id)}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === assigneeDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                              }`}
                          >
                            <div className="font-medium">{getUserName(user)}</div>
                            {user.email && (
                              <div className="text-xs text-gray-500">{user.email}</div>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">No technicians found</div>
                      )}
                    </div>
                  )}
                  {formErrors.assignedTo && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.assignedTo}</p>
                  )}
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
                  Description *
                </label>
                <textarea
                  value={ticketFormData.description}
                  onChange={(e) => setTicketFormData({ ...ticketFormData, description: e.target.value })}
                  rows={4}
                  className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                  placeholder="Describe in detail..."
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" className="text-white" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    'Update Ticket'
                  )}
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
                          {selectedTicket.customer.addresses.find((address: any) => address.isPrimary)?.address || 'No address available'}
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
                    {selectedTicket.serviceCharge && selectedTicket.serviceCharge > 0 && (
                      <div>
                        <p className="text-xs text-gray-600">Service Charge</p>
                        <p className="font-medium text-green-600">₹{selectedTicket.serviceCharge}</p>
                      </div>
                    )}
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

              {/* Description */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
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
                  <div className="flex items-center space-x-2">
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
                    {selectedTicket.product && (
                      <span 
                        className="text-sm text-orange-600 cursor-help" 
                        title="This ticket has a product. Resolving will decrease inventory by 1 unit."
                      >
                        📦
                      </span>
                    )}
                  </div>
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
                {selectedTicket.status === 'resolved' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      openDigitalServiceReport(selectedTicket);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Digital Service Report</span>
                  </button>
                )}
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
      {showDigitalReportModal && selectedTicket && (
        <DigitalServiceReport
          ticketId={selectedTicket._id}
          onClose={() => setShowDigitalReportModal(false)}
          onReportCreated={(report) => {
            console.log('Digital service report created:', report);
            setShowDigitalReportModal(false);
          }}
          onReportUpdated={(report) => {
            console.log('Digital service report updated:', report);
            setShowDigitalReportModal(false);
          }}
        />
      )}
    </div>
  );
};

export default ServiceManagement; 