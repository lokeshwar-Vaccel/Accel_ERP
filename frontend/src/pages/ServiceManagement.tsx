import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
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
  MessageSquare,
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
import { MultiSelect } from '../components/ui/MultiSelect';
import { MultiSelectRef } from '../components/ui/MultiSelect';

// Types matching backend structure
type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

// New dropdown options
type TypeOfVisit = 'oil_service' | 'courtesy_visit' | 'amc_visit' | 'spare' | 'fsc_visit' | 'paid_visit' | '';
type NatureOfWork = 'oil_service' | 'site_visit' | 'breakdown' | 'installation' | 'dms_call' | '';
type SubNatureOfWork = 'fsc' | 'amc' | 'paid' | 'courtesy_visit' | 'warranty' | 'pre_installation' | 'commissioning' | 'ev' | 'logged' | 'without_logged' | '';

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
  // Standardized fields
  serviceRequestNumber: string;
  serviceRequestType: string;
  requestSubmissionDate: string;
  serviceRequiredDate: string;
  engineSerialNumber?: string;
  customerName: string;
  serviceRequestEngineer: string | User;
  serviceRequestStatus: TicketStatus;
  typeOfVisit?: TypeOfVisit;
  natureOfWork?: NatureOfWork;
  subNatureOfWork?: SubNatureOfWork;
  businessVertical?: string;
  siteIdentifier?: string;
  stateName?: string;
  siteLocation?: string;

  // Legacy fields for backward compatibility
  ticketNumber: string;
  customer: string | Customer;
  products?: string[] | Product[]; // Multiple products support
  serialNumber?: string;
  status: TicketStatus;
  assignedTo?: string | User;
  scheduledDate?: string;
  completedDate?: string;
  partsUsed: PartUsed[];
  serviceReport?: string;
  customerSignature?: string;
  complaintDescription?: string; // Keep for backward compatibility

  serviceCharge?: number;
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  turnaroundTime?: number;
}

interface TicketFormData {
  // Standardized fields
  serviceRequestType: string;
  serviceRequiredDate: string;
  engineSerialNumber?: string;
  customerName: string;
  serviceRequestEngineer: string;
  typeOfVisit: TypeOfVisit;
  natureOfWork: NatureOfWork;
  subNatureOfWork: SubNatureOfWork;
  businessVertical: string;
  siteIdentifier: string;
  stateName: string;
  siteLocation: string;

  // Legacy fields for backward compatibility
  customer: string;
  products?: string[]; // New field for multiple products
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');

  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');

  // Safeguard to ensure assigneeFilter is never undefined
  useEffect(() => {
    if (assigneeFilter === undefined) {
      setAssigneeFilter('all');
    }
  }, [assigneeFilter]);


  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);

  const [showDigitalReportModal, setShowDigitalReportModal] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);

  // Excel upload states
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<{
    importedCount: number;
    errorCount: number;
    errors: Array<{ row: number; error: string; data: any }>;
  } | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Feedback viewing states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [ticketsWithFeedback, setTicketsWithFeedback] = useState<Set<string>>(new Set());

  // Selected data
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [editingTicket, setEditingTicket] = useState<ServiceTicket | null>(null);

  // Current user for ticket creation
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Form data
  const [ticketFormData, setTicketFormData] = useState<TicketFormData>({
    // Standardized fields
    serviceRequestType: '',
    serviceRequiredDate: new Date().toISOString().slice(0, 16),
    engineSerialNumber: '',
    customerName: '',
    serviceRequestEngineer: '',
    typeOfVisit: 'oil_service',
    natureOfWork: 'oil_service',
    subNatureOfWork: 'fsc',
    businessVertical: '',
    siteIdentifier: '',
    stateName: '',
    siteLocation: '',

    // Legacy fields for backward compatibility
    customer: '',
    products: [], // New field for multiple products
    assignedTo: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    serviceCharge: 0
  });



  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Dropdown state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);


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



  const [assigneeDropdown, setAssigneeDropdown] = useState<DropdownState>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  // Enhanced dropdown states for the three new fields
  const [typeOfVisitDropdown, setTypeOfVisitDropdown] = useState<DropdownState>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  const [natureOfWorkDropdown, setNatureOfWorkDropdown] = useState<DropdownState>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  const [subNatureOfWorkDropdown, setSubNatureOfWorkDropdown] = useState<DropdownState>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  // Refs for dropdown focus management
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const scheduledDateRef = useRef<HTMLInputElement>(null);
  const serialNumberRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const multiSelectRef = useRef<MultiSelectRef>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDatas, setTotalDatas] = useState(0);



  useEffect(() => {
    fetchAllData();
    // Get current user ID from localStorage or auth context
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setCurrentUserId(userData._id || 'system');
      } catch (error) {
        console.error('Error parsing user data:', error);
        setCurrentUserId('system');
      }
    }
  }, []);



  // Refetch tickets when any filter or pagination changes (like CustomerManagement)
  useEffect(() => {
    if (!loading) {
      fetchTickets();
    }
  }, [currentPage, limit, searchTerm, statusFilter, assigneeFilter]);

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

  // Dropdown options for new fields
  const typeOfVisitOptions = [
    { value: '', label: 'Select Type of Visit' },
    { value: 'oil_service', label: 'Oil Service' },
    { value: 'courtesy_visit', label: 'Courtesy Visit' },
    { value: 'amc_visit', label: 'AMC Visit' },
    { value: 'spare', label: 'Spare' },
    { value: 'fsc_visit', label: 'FSC Visit' },
    { value: 'paid_visit', label: 'Paid Visit' }
  ];

  const natureOfWorkOptions = [
    { value: '', label: 'Select Nature of Work' },
    { value: 'oil_service', label: 'Oil Service' },
    { value: 'site_visit', label: 'Site Visit' },
    { value: 'breakdown', label: 'Breakdown' },
    { value: 'installation', label: 'Installation' },
    { value: 'dms_call', label: 'DMS Call' }
  ];

  const subNatureOfWorkOptions = [
    { value: '', label: 'Select Sub Nature of Work' },
    { value: 'fsc', label: 'FSC' },
    { value: 'amc', label: 'AMC' },
    { value: 'paid', label: 'Paid' },
    { value: 'courtesy_visit', label: 'Courtesy Visit' },
    { value: 'warranty', label: 'Warranty' },
    { value: 'pre_installation', label: 'Pre-Installation' },
    { value: 'commissioning', label: 'Commissioning' },
    { value: 'ev', label: 'EV' },
    { value: 'logged', label: 'Logged' },
    { value: 'without_logged', label: 'Without Logged' }
  ];

  useEffect(() => {

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
    const hasFilterChanged = searchTerm || statusFilter !== 'all' || assigneeFilter !== 'all';
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



      if (assigneeFilter !== 'all' && assigneeFilter && assigneeFilter.trim() !== '') {
        params.assignedTo = assigneeFilter;
      }

      // Filter out undefined values from params
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== undefined && value !== null)
      );

      const response = await apiClient.services.getAll(cleanParams);

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
          _id: operator._id || operator.id, // Try both _id and id
          firstName: operator.firstName,
          lastName: operator.lastName,
          email: operator.email,
          phone: operator.phone,
          fullName: operator.name || `${operator.firstName} ${operator.lastName}`
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
      // Use hardcoded data on error
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
  };

  // Helper functions
  const getUserName = (user: string | User | undefined): string => {
    if (!user) return '';
    if (typeof user === 'string') {
      // If it's a string (user ID), try to find the user in the users array
      const foundUser = users.find(u => u._id === user);
      return foundUser ? (foundUser.fullName || `${foundUser.firstName} ${foundUser.lastName}` || foundUser.email) : user;
    }
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
      // Standardized fields
      serviceRequestType: '',
      serviceRequiredDate: new Date().toISOString().split('T')[0],
      engineSerialNumber: '',
      customerName: '',
      serviceRequestEngineer: '',
      typeOfVisit: '',
      natureOfWork: '',
      subNatureOfWork: '',
      businessVertical: '',
      siteIdentifier: '',
      stateName: '',
      siteLocation: '',

      // Legacy fields for backward compatibility
      customer: '',
      products: [], // New field for multiple products
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
      // Standardized fields
      serviceRequestType: ticket.serviceRequestType || '',
      serviceRequiredDate: ticket.serviceRequiredDate ? ticket.serviceRequiredDate.slice(0, 16) : new Date().toISOString().slice(0, 16),
      engineSerialNumber: ticket.engineSerialNumber || '',
      customerName: ticket.customerName || '',
      serviceRequestEngineer: typeof ticket.serviceRequestEngineer === 'string' ? ticket.serviceRequestEngineer : ticket.serviceRequestEngineer?._id || '',
      typeOfVisit: ticket.typeOfVisit || '',
      natureOfWork: ticket.natureOfWork || '',
      subNatureOfWork: ticket.subNatureOfWork || '',
      businessVertical: ticket.businessVertical || '',
      siteIdentifier: ticket.siteIdentifier || '',
      stateName: ticket.stateName || '',
      siteLocation: ticket.siteLocation || '',

      // Legacy fields for backward compatibility
      customer: typeof ticket.customer === 'string' ? ticket.customer : ticket.customer._id,
      products: Array.isArray(ticket.products) ? ticket.products.map(p => typeof p === 'string' ? p : p._id) : [],
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
      searchTerm: Array.isArray(ticket.products) ? ticket.products.map(p => typeof p === 'string' ? p : p.name).join(', ') : '',
      selectedIndex: 0,
      filteredOptions: products
    });

    // Priority dropdown removed - no longer needed

    setAssigneeDropdown({
      isOpen: false,
      searchTerm: typeof ticket.assignedTo === 'string' ? users.find(u => u._id === ticket.assignedTo)?.fullName || '' : ticket.assignedTo?.fullName || '',
      selectedIndex: 0,
      filteredOptions: users
    });

    setFormErrors({});
    setShowEditModal(true);
  };

  const openDetailsModal = async (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);

    // Check if feedback exists for this ticket
    if (ticket.status === 'resolved') {
      const hasFeedback = await checkFeedbackExists(ticket._id);
      if (hasFeedback) {
        setTicketsWithFeedback(prev => new Set([...prev, ticket._id]));
      }
    }
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


    // Validate engine serial number if provided
    if (ticketFormData.engineSerialNumber && ticketFormData.engineSerialNumber.trim()) {
      const engineSerialLength = ticketFormData.engineSerialNumber.trim().length;
      if (engineSerialLength < 6) {
        errors.engineSerialNumber = 'Engine Serial Number must be at least 6 characters';
      } else if (engineSerialLength > 12) {
        errors.engineSerialNumber = 'Engine Serial Number cannot exceed 12 characters';
      }
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
        // Legacy fields for backward compatibility
        customer: ticketFormData.customer,
        products: ticketFormData.products || undefined, // Add products array
        serviceCharge: ticketFormData.serviceCharge || 0,
        scheduledDate: ticketFormData.scheduledDate ? new Date(ticketFormData.scheduledDate).toISOString() : undefined,

        // Standardized fields
        serviceRequestType: ticketFormData.serviceRequestType,
        requestSubmissionDate: new Date().toISOString(), // Set current date as submission date
        serviceRequiredDate: ticketFormData.serviceRequiredDate ? new Date(ticketFormData.serviceRequiredDate).toISOString() : undefined,
        engineSerialNumber: ticketFormData.engineSerialNumber || undefined,
        customerName: customers.find(c => c._id === ticketFormData.customer)?.name || '',
        serviceRequestEngineer: ticketFormData.assignedTo || undefined,
        typeOfVisit: ticketFormData.typeOfVisit,
        natureOfWork: ticketFormData.natureOfWork,
        subNatureOfWork: ticketFormData.subNatureOfWork,
        businessVertical: ticketFormData.businessVertical || undefined,
        siteIdentifier: ticketFormData.siteIdentifier || undefined,
        stateName: ticketFormData.stateName || undefined,
        siteLocation: ticketFormData.siteLocation || undefined
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
        // Legacy fields for backward compatibility
        customer: ticketFormData.customer,
        products: ticketFormData.products || undefined, // Add products array
        serviceCharge: ticketFormData.serviceCharge || 0,
        scheduledDate: ticketFormData.scheduledDate ? new Date(ticketFormData.scheduledDate).toISOString() : undefined,

        // Standardized fields
        serviceRequestType: ticketFormData.serviceRequestType,
        requestSubmissionDate: editingTicket?.requestSubmissionDate || new Date().toISOString(), // Preserve original submission date
        serviceRequiredDate: ticketFormData.serviceRequiredDate ? new Date(ticketFormData.serviceRequiredDate).toISOString() : undefined,
        engineSerialNumber: ticketFormData.engineSerialNumber || undefined,
        customerName: customers.find(c => c._id === ticketFormData.customer)?.name || '',
        serviceRequestEngineer: ticketFormData.assignedTo || undefined,
        typeOfVisit: ticketFormData.typeOfVisit,
        natureOfWork: ticketFormData.natureOfWork,
        subNatureOfWork: ticketFormData.subNatureOfWork,
        businessVertical: ticketFormData.businessVertical || undefined,
        siteIdentifier: ticketFormData.siteIdentifier || undefined,
        stateName: ticketFormData.stateName || undefined,
        siteLocation: ticketFormData.siteLocation || undefined
      };

      // Only include assignedTo if it's not empty
      if (ticketFormData.assignedTo && ticketFormData.assignedTo.trim() !== '') {
        payload.assignedTo = ticketFormData.assignedTo;
      }


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
      // Standardized fields
      serviceRequestType: '',
      serviceRequiredDate: new Date().toISOString().slice(0, 16),
      engineSerialNumber: '',
      customerName: '',
      serviceRequestEngineer: '',
      typeOfVisit: '',
      natureOfWork: '',
      subNatureOfWork: '',
      businessVertical: '',
      siteIdentifier: '',
      stateName: '',
      siteLocation: '',

      // Legacy fields for backward compatibility
      customer: '',
      products: [], // New field for multiple products
      assignedTo: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      serviceCharge: 0
    });

    // Reset dropdown states
    setCustomerDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
    setProductDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));

    setAssigneeDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
    
    // Reset the three new enhanced dropdown states
    setTypeOfVisitDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
    setNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
    setSubNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
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
      title: 'Resolved Tickets',
      value: tickets.filter(t => t.status === 'resolved').length.toString(),
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
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





  const getStatusLabel = (value: string) => {
    const option = statusOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Status';
  };





  const getAssigneeLabel = (value: string) => {
    if (value === 'all') return 'All Assignees';
    const user = users.find(u => u._id === value);
    return user ? getUserName(user) : 'All Assignees';
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };



  const handleStatusUpdate = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      // Find the ticket to check if it has a product
      const ticket = tickets.find(t => t._id === ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Update the ticket status
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

        toast.success('Ticket status updated successfully!');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast.error('Failed to update ticket status. Please try again.');
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
          address: typeof ticket.customer === 'object' ? (ticket.customer as any).addresses.find((address: any) => address.isPrimary)?.address || 'No address available' : undefined,
        },
        serialNumber: ticket.serialNumber,
        description: `${ticket.typeOfVisit ? typeOfVisitOptions.find(opt => opt.value === ticket.typeOfVisit)?.label || 'N/A' : 'N/A'} - ${ticket.natureOfWork ? natureOfWorkOptions.find(opt => opt.value === ticket.natureOfWork)?.label || 'N/A' : 'N/A'} - ${ticket.subNatureOfWork ? subNatureOfWorkOptions.find(opt => opt.value === ticket.subNatureOfWork)?.label || 'N/A' : 'N/A'}`,
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
      };

      await exportServiceTicketToPDF(pdfData);
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
        serialNumber: ticket.serialNumber,
        description: `${ticket.typeOfVisit ? typeOfVisitOptions.find(opt => opt.value === ticket.typeOfVisit)?.label || 'N/A' : 'N/A'} - ${ticket.natureOfWork ? natureOfWorkOptions.find(opt => opt.value === ticket.natureOfWork)?.label || 'N/A' : 'N/A'} - ${ticket.subNatureOfWork ? subNatureOfWorkOptions.find(opt => opt.value === ticket.subNatureOfWork)?.label || 'N/A' : 'N/A'}`,
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
      }));

      // Export all tickets in a single PDF
      await exportMultipleTicketsToPDF(pdfDataArray);

    } catch (error) {
      console.error('Error in bulk PDF export:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  // Excel upload functions
  const handleExcelUpload = () => {
    setShowExcelUploadModal(true);
    setExcelFile(null);
    setUploadResults(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.type === 'application/vnd.ms-excel' ||
        file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls')) {
        setExcelFile(file);
        setShowPreview(false);
        setPreviewData([]);
        setUploadResults(null);

        // Read and preview the file
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });

            // Get the first sheet
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to JSON with header row
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length < 2) {
              alert('Excel file must have at least a header row and one data row');
              return;
            }

            // Get headers from first row
            const headers = jsonData[0] as string[];

            // Convert data rows to objects
            const processedData = jsonData.slice(1).map((row: any) => {
              const rowData: any = {};
              headers.forEach((header, index) => {
                if (header && row[index] !== undefined) {
                  rowData[header] = row[index];
                }
              });
              return rowData;
            }).filter(row => Object.keys(row).length > 0); // Remove empty rows

            if (processedData.length === 0) {
              alert('No valid data found in Excel file');
              return;
            }

            setPreviewData(processedData);
            setShowPreview(true);

          } catch (error) {
            console.error('Error reading Excel file:', error);
            alert('Error reading Excel file. Please ensure it\'s a valid Excel file.');
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        alert('Please select a valid Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleExcelImport = async () => {
    if (!excelFile || previewData.length === 0) {
      alert('Please select a valid Excel file with data');
      return;
    }

    try {
      setUploadingExcel(true);
      setUploadProgress(0);

      // Process the preview data for import
      const processedData = previewData.map((row, index) => {
        // Helper function to find field value with multiple possible header names
        const getFieldValue = (possibleHeaders: string[], defaultValue: any = '') => {
          for (const header of possibleHeaders) {
            if (row[header] !== undefined && row[header] !== null && row[header] !== '') {
              return row[header];
            }
          }
          return defaultValue;
        };

        // Debug helper to check what headers are available for a specific field
        const debugFieldHeaders = (fieldName: string, possibleHeaders: string[]) => {
          // Debug function - removed console logs
        };

        // Helper function to convert Excel date to date only (for requestSubmissionDate)
        const convertExcelDateOnly = (dateValue: any) => {
          if (!dateValue) return new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';

          // If it's already a string in ISO format, extract date only
          if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateValue)) {
            return dateValue.split('T')[0] + 'T00:00:00.000Z';
          }

          // If it's a string in YYYY-MM-DD format, add time
          if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue + 'T00:00:00.000Z';
          }

          // Handle Excel date numbers (Excel stores dates as numbers)
          if (typeof dateValue === 'number') {
            // Excel dates are days since 1900-01-01
            const excelEpoch = new Date(1900, 0, 1);
            const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
            return date.toISOString().split('T')[0] + 'T00:00:00.000Z';
          }

          // If it's a Date object or other date string, convert it
          try {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              return date.toISOString().split('T')[0] + 'T00:00:00.000Z';
            }
          } catch (error) {
            console.warn('Invalid date value:', dateValue, 'Error:', error);
          }
          return new Date().toISOString().split('T')[0] + 'T00:00:00.000Z';
        };

        // Helper function to convert Excel date to proper format with time (for serviceRequiredDate)
        const convertExcelDateTime = (dateValue: any) => {
          if (!dateValue) return new Date().toISOString();

          // If it's already a string in ISO format, return as is
          if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateValue)) {
            return dateValue;
          }

          // If it's a string in YYYY-MM-DD format, add time
          if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue + 'T00:00:00.000Z';
          }

          // Handle Excel date numbers (Excel stores dates as numbers)
          if (typeof dateValue === 'number') {
            // Excel dates are days since 1900-01-01
            const excelEpoch = new Date(1900, 0, 1);
            const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
            return date.toISOString();
          }

          // If it's a Date object or other date string, convert it
          try {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          } catch (error) {
            console.warn('Invalid date value:', dateValue, 'Error:', error);
          }
          return new Date().toISOString();
        };

        // Map the Excel headers to our standardized fields with flexible header matching
        const mappedData = {
          serviceRequestNumber: getFieldValue(['Service Request Number', 'SR Number', 'Service Request Number'], ''),
          serviceRequestType: getFieldValue(['Service Request Type', 'SR Type', 'Service Type'], ''),
          requestSubmissionDate: convertExcelDateOnly(getFieldValue(['Request Submission Date', 'Requested Date', 'Submission Date', 'Created Date', 'Request Date', 'Date Requested', 'Request Date', 'Submission Date', 'Created Date', 'Date Created'])),
          serviceRequiredDate: convertExcelDateTime(getFieldValue(['Service Required Date', 'Service Required On Date', 'Required Date'])),
          engineSerialNumber: getFieldValue(['Engine Serial Number', 'Engine Sr No', 'Serial Number'], ''),
          customerName: getFieldValue(['Customer Name', 'Customer'], ''),
          serviceRequestEngineer: getFieldValue(['Service Request Engineer', 'SR Engineer', 'Engineer', 'Technician', 'Field Operator'], ''),
          typeOfVisit: getFieldValue(['Type of Visit', 'Visit Type', 'Type'], 'oil_service'),
          natureOfWork: getFieldValue(['Nature of Work', 'Work Nature', 'Nature'], 'oil_service'),
          subNatureOfWork: getFieldValue(['Sub Nature of Work', 'Sub Nature', 'Sub Work'], 'fsc'),
          businessVertical: getFieldValue(['Business Vertical', 'Vertical', 'Industry'], ''),
          siteIdentifier: getFieldValue(['Site Identifier', 'Site ID', 'Site'], ''),
          stateName: getFieldValue(['State Name', 'State'], ''),
          siteLocation: getFieldValue(['SiteLocation', 'Location', 'Site', 'Site Location', 'Location Address', 'Address'], ''),
          // Legacy fields
          description: getFieldValue(['Complaint Description', 'Complaint', 'Description', 'Issue'], ''),
          priority: 'medium',
          status: (() => {
            const statusHeaders = ['Service Request Status', 'SR Status', 'Status', 'Ticket Status', 'State', 'Current Status', 'Status'];
            const excelStatusValue = getFieldValue(statusHeaders, 'open');

            // Map Excel status to application status
            let mappedStatus = 'open';
            if (excelStatusValue) {
              const statusMapping: { [key: string]: string } = {
                'new': 'open',
                'New': 'open',
                'NEW': 'open',
                'resolved': 'resolved',
                'Resolved': 'resolved',
                'RESOLVED': 'resolved',
                'in progress': 'in_progress',
                'In Progress': 'in_progress',
                'IN PROGRESS': 'in_progress',
                'closed': 'closed',
                'Closed': 'closed',
                'CLOSED': 'closed',
                'cancelled': 'cancelled',
                'Cancelled': 'cancelled',
                'CANCELLED': 'cancelled'
              };
              mappedStatus = statusMapping[excelStatusValue] || 'open';
            }

            return mappedStatus;
          })(),
          serviceCharge: 0,
          // Ensure dates are in proper format
          scheduledDate: convertExcelDateTime(getFieldValue(['Service Required Date', 'Service Required On Date', 'Required Date']))
        };

        return mappedData;
      });


      setUploadProgress(20);

      // Process all data without filtering - let backend handle missing customers and service engineers
      const processedTickets = processedData.map((row, index) => {
        const rowNumber = index + 2; // Excel row number (1-based + header row)
        
        // Return the processed data as is - backend will handle validation and creation
        return {
          ...row,
          // Keep the original names for backend processing
          serviceRequestEngineer: row.serviceRequestEngineer || '',
          customerName: row.customerName || ''
        };
      });

      setUploadProgress(50);

      // Send all processed data to backend for import
      let successCount = 0;
      const creationErrors: Array<{ row: number; error: string; data: any }> = [];

      try {
        const response = await apiClient.services.bulkImport(processedTickets);

        if (response.success) {
          successCount = response.data.importedCount || 0;
          if (response.data.errors && response.data.errors.length > 0) {
            creationErrors.push(...response.data.errors);
          }
        } else {
          creationErrors.push({
            row: 0,
            error: 'Bulk import failed',
            data: processedTickets
          });
        }
      } catch (error: any) {
        creationErrors.push({
          row: 0,
          error: error.message || 'Bulk import failed',
          data: processedTickets
        });
      }

      setUploadProgress(100);

      // Use only creation errors since we removed frontend validation
      const allErrors = [...creationErrors];

      setUploadResults({
        importedCount: successCount,
        errorCount: allErrors.length,
        errors: allErrors
      });

      // Show combined toast message
      const duplicateErrors = allErrors.filter(error => 
        error.error.includes('already exists in the system')
      );
      
      if (successCount > 0 && duplicateErrors.length > 0) {
        // Both imported and duplicates
        toast.success(`✅ ${successCount} tickets added successfully | ⚠️ ${duplicateErrors.length} tickets already exist in system`);
      } else if (successCount > 0) {
        // Only imported
        toast.success(`✅ ${successCount} tickets added successfully!`);
      } else if (duplicateErrors.length > 0) {
        // Only duplicates
        toast.error(`⚠️ ${duplicateErrors.length} tickets already exist in system - no new tickets added`);
      } else if (allErrors.length > 0) {
        // Other errors
        toast.error(`❌ ${allErrors.length} tickets had errors during import`);
      }

      if (successCount > 0) {
        // Refresh the tickets list
        await fetchTickets();
        // Close the dialog box
        setShowExcelUploadModal(false);
        setExcelFile(null);
        setPreviewData([]);
        setUploadResults(null);
      }

    } catch (error: any) {
      console.error('Excel import error:', error);
      alert('Failed to import Excel file');
    } finally {
      setUploadingExcel(false);
      setUploadProgress(0);
    }
  };

  const handleViewFeedback = async (ticketId: string) => {
    try {
      setLoadingFeedback(true);
      const response = await apiClient.feedback.getByTicketId(ticketId);

      if (response.success && response.data) {
        setSelectedFeedback(response.data);
        setShowFeedbackModal(true);
      } else {
        toast.error('No feedback found for this ticket');
      }
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
      toast.error(error.message || 'Failed to fetch feedback');
    } finally {
      setLoadingFeedback(false);
    }
  };

  const checkFeedbackExists = async (ticketId: string): Promise<boolean> => {
    try {
      const response = await apiClient.feedback.getByTicketId(ticketId);
      return response.success && response.data;
    } catch (error) {
      return false;
    }
  };

  const handleExportToExcel = async () => {
    try {
      setSubmitting(true);

      // Get current filters
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (assigneeFilter !== 'all') params.assignedTo = assigneeFilter;

      // Fetch data from API
      const response = await apiClient.services.export(params);

      if (response.success && response.data.tickets) {
        // Import xlsx library dynamically
        const XLSX = await import('xlsx');

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(response.data.tickets);

        // Add yellow background color to headers
        const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
          if (!worksheet[cellAddress]) {
            worksheet[cellAddress] = { v: '', t: 's' };
          }
          worksheet[cellAddress].s = {
            fill: {
              fgColor: { rgb: "FFFF00" }, // Yellow background
              patternType: "solid"
            },
            font: {
              bold: true,
              color: { rgb: "000000" } // Black text
            }
          };
        }

        // Auto-size columns
        const columnWidths = [
          { wch: 20 }, // Service Request Number
          { wch: 20 }, // Service Request Type
          { wch: 15 }, // Request Submission Date
          { wch: 15 }, // Service Required Date
          { wch: 20 }, // Engine Serial Number
          { wch: 25 }, // Customer Name
          { wch: 25 }, // MAGIEC (System Code or Identifier)
          { wch: 15 }, // MAGIEC Code
          { wch: 25 }, // Service Request Engineer
          { wch: 15 }, // Service Request Status
          { wch: 20 }, // Type of Visit
          { wch: 20 }, // Nature of Work
          { wch: 20 }, // Sub Nature of Work
          { wch: 20 }, // Business Vertical
          { wch: 15 }, // Invoice Raised (Yes/No)
          { wch: 15 }, // Site Identifier
          { wch: 15 }, // State Name
          { wch: 25 }, // Site Location
        ];
        worksheet['!cols'] = columnWidths;

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Service Tickets');

        // Generate filename with current date
        const date = new Date().toISOString().split('T')[0];
        const filename = `service_tickets_${date}.xlsx`;

        // Write file and trigger download
        XLSX.writeFile(workbook, filename);

        toast.success(`Successfully exported ${response.data.totalCount} tickets to Excel`);
      } else {
        toast.error('Failed to export data');
      }
    } catch (error) {
      console.error('Excel export error:', error);
      toast.error('Failed to export to Excel');
    } finally {
      setSubmitting(false);
    }
  };



  // Enhanced dropdown handlers
  const scrollToSelectedItem = (dropdownType: 'customer' | 'product' | 'assignee') => {
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
    dropdownType: 'customer' | 'product' | 'assignee',
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

  const getDropdownState = (type: 'customer' | 'product' | 'assignee') => {
    switch (type) {
      case 'customer': return customerDropdown;
      case 'product': return productDropdown;
      case 'assignee': return assigneeDropdown;
    }
  };

  const getSetDropdownState = (type: 'customer' | 'product' | 'assignee') => {
    switch (type) {
      case 'customer': return setCustomerDropdown;
      case 'product': return setProductDropdown;
      case 'assignee': return setAssigneeDropdown;
    }
  };

  const moveToNextDropdown = (currentType: 'customer' | 'product' | 'assignee') => {
    // Close current dropdown
    const setCurrentDropdown = getSetDropdownState(currentType);
    setCurrentDropdown(prev => ({ ...prev, isOpen: false }));

    // Move to next field based on current type
    switch (currentType) {
      case 'customer':
        setTimeout(() => {
          // Focus the engine serial number field
          if (serialNumberRef.current) {
            serialNumberRef.current.focus();
          }
        }, 50);
        break;
      case 'product':
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
    type: 'customer' | 'product' | 'assignee',
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
      case 'assignee':
        originalOptions = users;
        break;
    }

    // Filter from original data
    const filtered = originalOptions.filter((option: any) => {
      const searchText = searchTerm.toLowerCase();
      const optionText = (option.name || option.label || option.fullName || '').toLowerCase();
      const partNumber = (option.modelNumber || '').toLowerCase();
      return optionText.includes(searchText) || partNumber.includes(searchText);
    });

    setDropdownState(prev => ({
      ...prev,
      searchTerm,
      filteredOptions: filtered,
      selectedIndex: 0
    }));
  };

  const handleDropdownFocus = (
    type: 'customer' | 'product' | 'assignee'
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

    // Focus the input field for immediate typing (for customer dropdown)
    if (type === 'customer') {
      setTimeout(() => {
        const input = document.querySelector('input[placeholder="Search customer..."]') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select(); // Select all text for easy replacement
        }
      }, 50);
    } else if (type === 'assignee') {
      setTimeout(() => {
        const input = document.querySelector('input[placeholder="Search technician..."]') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select(); // Select all text for easy replacement
        }
      }, 50);
    } else if (type === 'product') {
      setTimeout(() => {
        const input = document.querySelector('input[placeholder="Search products..."]') as HTMLInputElement;
        if (input) {
          input.focus();
          input.select(); // Select all text for easy replacement
        }
      }, 50);
    }
  };

  const handleDropdownSelect = (
    type: 'customer' | 'product' | 'assignee',
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
        type === 'product' ? 'product' : 'assignedTo']: value
    }));

    // Clear error for this field when selected
    const errorField = type === 'customer' ? 'customer' :
      type === 'product' ? 'product' : 'assignedTo';
    if (formErrors[errorField]) {
      setFormErrors(prev => ({ ...prev, [errorField]: '' }));
    }

    // Close current dropdown
    setDropdownState(prev => ({ ...prev, isOpen: false, searchTerm: '' }));

    // Move to next dropdown after selection
    moveToNextDropdown(type);
  };

  // Handler functions for the three new enhanced dropdowns
  const handleTypeOfVisitSearch = (searchTerm: string) => {
    const filtered = typeOfVisitOptions.filter((option) => {
      const searchText = searchTerm.toLowerCase();
      const optionText = option.label.toLowerCase();
      return optionText.includes(searchText);
    });

    setTypeOfVisitDropdown(prev => ({
      ...prev,
      searchTerm,
      filteredOptions: filtered,
      selectedIndex: 0
    }));
  };

  const handleTypeOfVisitFocus = () => {
    setTypeOfVisitDropdown(prev => ({
      ...prev,
      isOpen: true,
      searchTerm: '',
      filteredOptions: typeOfVisitOptions,
      selectedIndex: 0
    }));
    // Focus the input field for immediate typing
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Search Type of Visit..."]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select(); // Select all text for easy replacement
      }
    }, 50);
  };

  const handleTypeOfVisitKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        setTypeOfVisitDropdown(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.filteredOptions.length - 1)
        }));
        break;
      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        setTypeOfVisitDropdown(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0)
        }));
        break;
      case 'Enter':
        event.preventDefault();
        event.stopPropagation();
        if (typeOfVisitDropdown.filteredOptions.length > 0 && typeOfVisitDropdown.selectedIndex >= 0) {
          const selectedOption = typeOfVisitDropdown.filteredOptions[typeOfVisitDropdown.selectedIndex];
          handleTypeOfVisitSelect(selectedOption.value as TypeOfVisit);
        }
        break;
      case 'Tab':
        event.preventDefault();
        event.stopPropagation();
        // Focus the nature of work field and open it
        const natureOfWorkInput = document.querySelector('input[placeholder="Search Nature of Work..."]') as HTMLInputElement;
        if (natureOfWorkInput) {
          natureOfWorkInput.focus();
          // Trigger the focus event to open the dropdown
          natureOfWorkInput.dispatchEvent(new Event('focus', { bubbles: true }));
        }
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        setTypeOfVisitDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
        break;
    }
  };

  const handleTypeOfVisitSelect = (value: TypeOfVisit) => {
    setTicketFormData(prev => ({ ...prev, typeOfVisit: value }));
    
    // Clear error when user selects an option
    if (formErrors.typeOfVisit) {
      setFormErrors(prev => ({ ...prev, typeOfVisit: '' }));
    }

    // Close dropdown
    setTypeOfVisitDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
  };

  const handleNatureOfWorkSearch = (searchTerm: string) => {
    const filtered = natureOfWorkOptions.filter((option) => {
      const searchText = searchTerm.toLowerCase();
      const optionText = option.label.toLowerCase();
      return optionText.includes(searchText);
    });

    setNatureOfWorkDropdown(prev => ({
      ...prev,
      searchTerm,
      filteredOptions: filtered,
      selectedIndex: 0
    }));
  };

  const handleNatureOfWorkFocus = () => {
    setNatureOfWorkDropdown(prev => ({
      ...prev,
      isOpen: true,
      searchTerm: '',
      filteredOptions: natureOfWorkOptions,
      selectedIndex: 0
    }));
    // Focus the input field for immediate typing
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Search Nature of Work..."]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select(); // Select all text for easy replacement
      }
    }, 50);
  };

  const handleNatureOfWorkKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        setNatureOfWorkDropdown(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.filteredOptions.length - 1)
        }));
        break;
      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        setNatureOfWorkDropdown(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0)
        }));
        break;
      case 'Enter':
        event.preventDefault();
        event.stopPropagation();
        if (natureOfWorkDropdown.filteredOptions.length > 0 && natureOfWorkDropdown.selectedIndex >= 0) {
          const selectedOption = natureOfWorkDropdown.filteredOptions[natureOfWorkDropdown.selectedIndex];
          handleNatureOfWorkSelect(selectedOption.value as NatureOfWork);
        }
        break;
      case 'Tab':
        event.preventDefault();
        event.stopPropagation();
        // Focus the sub nature of work field and open it
        const subNatureOfWorkInput = document.querySelector('input[placeholder="Search Sub Nature of Work..."]') as HTMLInputElement;
        if (subNatureOfWorkInput) {
          subNatureOfWorkInput.focus();
          // Trigger the focus event to open the dropdown
          subNatureOfWorkInput.dispatchEvent(new Event('focus', { bubbles: true }));
        }
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        setNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
        break;
    }
  };

  const handleNatureOfWorkSelect = (value: NatureOfWork) => {
    setTicketFormData(prev => ({ ...prev, natureOfWork: value }));
    
    // Clear error when user selects an option
    if (formErrors.natureOfWork) {
      setFormErrors(prev => ({ ...prev, natureOfWork: '' }));
    }

    // Close dropdown
    setNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
  };

  const handleSubNatureOfWorkSearch = (searchTerm: string) => {
    const filtered = subNatureOfWorkOptions.filter((option) => {
      const searchText = searchTerm.toLowerCase();
      const optionText = option.label.toLowerCase();
      return optionText.includes(searchText);
    });

    setSubNatureOfWorkDropdown(prev => ({
      ...prev,
      searchTerm,
      filteredOptions: filtered,
      selectedIndex: 0
    }));
  };

  const handleSubNatureOfWorkFocus = () => {
    setSubNatureOfWorkDropdown(prev => ({
      ...prev,
      isOpen: true,
      searchTerm: '',
      filteredOptions: subNatureOfWorkOptions,
      selectedIndex: 0
    }));
    // Focus the input field for immediate typing
    setTimeout(() => {
      const input = document.querySelector('input[placeholder="Search Sub Nature of Work..."]') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select(); // Select all text for easy replacement
      }
    }, 50);
  };

  const handleSubNatureOfWorkKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        event.stopPropagation();
        setSubNatureOfWorkDropdown(prev => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, prev.filteredOptions.length - 1)
        }));
        break;
      case 'ArrowUp':
        event.preventDefault();
        event.stopPropagation();
        setSubNatureOfWorkDropdown(prev => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0)
        }));
        break;
      case 'Enter':
        event.preventDefault();
        event.stopPropagation();
        if (subNatureOfWorkDropdown.filteredOptions.length > 0 && subNatureOfWorkDropdown.selectedIndex >= 0) {
          const selectedOption = subNatureOfWorkDropdown.filteredOptions[subNatureOfWorkDropdown.selectedIndex];
          handleSubNatureOfWorkSelect(selectedOption.value as SubNatureOfWork);
        }
        break;
      case 'Tab':
        event.preventDefault();
        event.stopPropagation();
        // Focus the service request type field
        const serviceRequestTypeInput = document.querySelector('input[placeholder="Enter service request type"]') as HTMLInputElement;
        if (serviceRequestTypeInput) {
          serviceRequestTypeInput.focus();
        }
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        setSubNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
        break;
    }
  };

  const handleSubNatureOfWorkSelect = (value: SubNatureOfWork) => {
    setTicketFormData(prev => ({ ...prev, subNatureOfWork: value }));
    
    // Clear error when user selects an option
    if (formErrors.subNatureOfWork) {
      setFormErrors(prev => ({ ...prev, subNatureOfWork: '' }));
    }

    // Close dropdown
    setSubNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowStatusDropdown(false);
        setShowAssigneeDropdown(false);

        // Close enhanced dropdowns
        setCustomerDropdown(prev => ({ ...prev, isOpen: false }));
        setProductDropdown(prev => ({ ...prev, isOpen: false }));
        setAssigneeDropdown(prev => ({ ...prev, isOpen: false }));
        
        // Close the three new enhanced dropdowns
        setTypeOfVisitDropdown(prev => ({ ...prev, isOpen: false }));
        setNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false }));
        setSubNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false }));
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
        subtitle="Track tickets, manage service reports & monitor service requests"
      >
        <div className="flex space-x-3">
          <button
            onClick={handleExcelUpload}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">Upload Excel</span>
          </button>
          <button
            onClick={handleExportToExcel}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Export Excel</span>
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
                setShowAssigneeDropdown(false);
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



          {/* Assignee Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowAssigneeDropdown(!showAssigneeDropdown);
                setShowStatusDropdown(false);
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
                {users.length > 0 ? (
                  users.map(user => (
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
                  ))
                ) : (
                  <div className="px-3 py-1.5 text-sm text-gray-500">
                    Loading users...
                  </div>
                )}
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
                  Customer & Service Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visit Details
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site Info
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <LoadingSpinner size="lg" />
                      <p className="text-gray-500 text-sm">Loading tickets...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No tickets found</td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-blue-600">{ticket.ticketNumber}</div>
                        <div className="text-xs text-gray-900 font-medium">
                          {ticket.typeOfVisit ? typeOfVisitOptions.find(opt => opt.value === ticket.typeOfVisit)?.label : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          Created {formatDate(ticket.createdAt)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-gray-900">{getCustomerName(ticket.customer)}</div>
                        {ticket.serviceRequestType && (
                          <div className="text-xs text-gray-600 capitalize">{ticket.serviceRequestType}</div>
                        )}
                        {ticket.engineSerialNumber && (
                          <div className="text-xs text-gray-500">Engine: {ticket.engineSerialNumber}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-900">
                          <span className="font-medium">Type:</span> {ticket.typeOfVisit ? typeOfVisitOptions.find(opt => opt.value === ticket.typeOfVisit)?.label : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-600">
                          <span className="font-medium">Nature:</span> {ticket.natureOfWork ? natureOfWorkOptions.find(opt => opt.value === ticket.natureOfWork)?.label : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">Sub:</span> {ticket.subNatureOfWork ? subNatureOfWorkOptions.find(opt => opt.value === ticket.subNatureOfWork)?.label : 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
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

                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">
                        {(() => {
                          const userName = getUserName(ticket.assignedTo);
                          return userName || (
                            <span className="text-gray-400 italic">Unassigned</span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900 space-y-1">
                        {ticket.serviceRequiredDate && (
                          <div>
                            <span className="text-blue-600 font-medium">{formatDateTime(ticket.serviceRequiredDate)}</span>
                          </div>
                        )}
                        {!ticket.requestSubmissionDate && !ticket.serviceRequiredDate && (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="space-y-1">
                        {ticket.siteIdentifier && (
                          <div className="text-xs text-gray-900">
                            <span className="font-medium">Site ID:</span> {ticket.siteIdentifier}
                          </div>
                        )}
                        {ticket.siteLocation && (
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">Location:</span> {ticket.siteLocation}
                          </div>
                        )}
                        {ticket.stateName && (
                          <div className="text-xs text-gray-600">
                            <span className="font-medium">State:</span> {ticket.stateName}
                          </div>
                        )}
                        {!ticket.siteIdentifier && !ticket.siteLocation && (
                          <span className="text-gray-400 italic text-xs">-</span>
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

                {/* Engine Serial Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Engine Serial Number
                  </label>
                  <input
                    ref={serialNumberRef}
                    type="text"
                    value={ticketFormData.engineSerialNumber}
                    onChange={(e) => {
                      setTicketFormData({ ...ticketFormData, engineSerialNumber: e.target.value });
                      // Clear error when user starts typing
                      if (formErrors.engineSerialNumber) {
                        setFormErrors(prev => ({ ...prev, engineSerialNumber: '' }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Focus the assignee field and open it
                        const assigneeInput = document.querySelector('input[placeholder="Search technician..."]') as HTMLInputElement;
                        if (assigneeInput) {
                          assigneeInput.focus();
                          // Trigger the focus event to open the dropdown
                          assigneeInput.dispatchEvent(new Event('focus', { bubbles: true }));
                        }
                      }
                    }}
                    placeholder="Enter engine serial number"
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.engineSerialNumber ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {formErrors.engineSerialNumber && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.engineSerialNumber}</p>
                  )}
                </div>
              </div>

              {/* Second Row - Assignee and Scheduled Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    onFocus={(e) => {
                      // Open the date picker when focused via tab
                      (e.target as HTMLInputElement).showPicker?.();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Focus the service request type field
                        const serviceRequestTypeInput = document.querySelector('input[placeholder="Enter service request type"]') as HTMLInputElement;
                        if (serviceRequestTypeInput) {
                          serviceRequestTypeInput.focus();
                        }
                      }
                      // Open date picker on Enter key
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).showPicker?.();
                      }
                    }}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.scheduledDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Select date"
                  />
                  {formErrors.scheduledDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.scheduledDate}</p>
                  )}
                </div>
              </div>





              {/* New Standardized Fields Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Service Request Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Service Request Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Request Type *
                    </label>
                    <input
                      type="text"
                      value={ticketFormData.serviceRequestType}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, serviceRequestType: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter service request type"
                    />
                  </div>

                  {/* Service Required Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Required Date *
                    </label>
                    <input
                      type="datetime-local"
                      value={ticketFormData.serviceRequiredDate ? ticketFormData.serviceRequiredDate.replace('Z', '') : ''}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, serviceRequiredDate: e.target.value })}
                      onFocus={(e) => {
                        // Open the date picker when focused via tab
                        (e.target as HTMLInputElement).showPicker?.();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          // Focus the business vertical field
                          const businessVerticalInput = document.querySelector('input[placeholder="Enter vertical"]') as HTMLInputElement;
                          if (businessVerticalInput) {
                            businessVerticalInput.focus();
                          }
                        }
                        // Open date picker on Enter key
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).showPicker?.();
                        }
                      }}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Select date and time"
                    />
                  </div>





                  {/* Business Vertical */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vertical
                    </label>
                    <input
                      type="text"
                      value={ticketFormData.businessVertical}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, businessVertical: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter vertical"
                    />
                  </div>

                  {/* Site Identifier */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site ID
                    </label>
                    <input
                      type="text"
                      value={ticketFormData.siteIdentifier}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, siteIdentifier: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter site ID"
                    />
                  </div>

                  {/* State Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State Name
                    </label>
                    <input
                      type="text"
                      value={ticketFormData.stateName}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, stateName: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter state name"
                    />
                  </div>

                  {/* Site Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site Location
                    </label>
                    <input
                      type="text"
                      value={ticketFormData.siteLocation}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, siteLocation: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter site location"
                    />
                  </div>
                </div>

                {/* Enhanced Dropdown Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {/* Enhanced Type of Visit Dropdown */}
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Visit
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={typeOfVisitDropdown.searchTerm || (ticketFormData.typeOfVisit ? typeOfVisitOptions.find(opt => opt.value === ticketFormData.typeOfVisit)?.label : '')}
                        onChange={(e) => {
                          setTypeOfVisitDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                          handleTypeOfVisitSearch(e.target.value);
                          // Clear error when user starts typing
                          if (formErrors.typeOfVisit) {
                            setFormErrors(prev => ({ ...prev, typeOfVisit: '' }));
                          }
                        }}
                        onKeyDown={(e) => handleTypeOfVisitKeyDown(e)}
                        onFocus={() => handleTypeOfVisitFocus()}
                        onBlur={() => {
                          // Delay closing to allow for clicks on dropdown items
                          setTimeout(() => {
                            setTypeOfVisitDropdown(prev => ({ ...prev, isOpen: false }));
                          }, 200);
                        }}
                        placeholder="Search Type of Visit..."
                        className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.typeOfVisit ? 'border-red-500' : 'border-gray-300'} ${typeOfVisitDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      />
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {typeOfVisitDropdown.isOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {typeOfVisitDropdown.filteredOptions.length > 0 ? (
                          typeOfVisitDropdown.filteredOptions.map((option, index) => (
                            <button
                              key={option.value}
                              id={`typeOfVisit-item-${index}`}
                              type="button"
                              onClick={() => handleTypeOfVisitSelect(option.value as TypeOfVisit)}
                              className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === typeOfVisitDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : option.value === '' ? 'text-gray-400 italic' : 'text-gray-700'}`}
                            >
                              {option.label}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No options found</div>
                        )}
                      </div>
                    )}
                    {formErrors.typeOfVisit && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.typeOfVisit}</p>
                    )}
                  </div>

                  {/* Enhanced Nature of Work Dropdown */}
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nature of Work
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={natureOfWorkDropdown.searchTerm || (ticketFormData.natureOfWork ? natureOfWorkOptions.find(opt => opt.value === ticketFormData.natureOfWork)?.label : '')}
                        onChange={(e) => {
                          setNatureOfWorkDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                          handleNatureOfWorkSearch(e.target.value);
                          // Clear error when user starts typing
                          if (formErrors.natureOfWork) {
                            setFormErrors(prev => ({ ...prev, natureOfWork: '' }));
                          }
                        }}
                        onKeyDown={(e) => handleNatureOfWorkKeyDown(e)}
                        onFocus={() => handleNatureOfWorkFocus()}
                        onBlur={() => {
                          // Delay closing to allow for clicks on dropdown items
                          setTimeout(() => {
                            setNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false }));
                          }, 200);
                        }}
                        placeholder="Search Nature of Work..."
                        className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.natureOfWork ? 'border-red-500' : 'border-gray-300'} ${natureOfWorkDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      />
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {natureOfWorkDropdown.isOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {natureOfWorkDropdown.filteredOptions.length > 0 ? (
                          natureOfWorkDropdown.filteredOptions.map((option, index) => (
                            <button
                              key={option.value}
                              id={`natureOfWork-item-${index}`}
                              type="button"
                              onClick={() => handleNatureOfWorkSelect(option.value as NatureOfWork)}
                              className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === natureOfWorkDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : option.value === '' ? 'text-gray-400 italic' : 'text-gray-700'}`}
                            >
                              {option.label}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No options found</div>
                        )}
                      </div>
                    )}
                    {formErrors.natureOfWork && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.natureOfWork}</p>
                    )}
                  </div>

                  {/* Enhanced Sub Nature of Work Dropdown */}
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sub Nature of Work
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={subNatureOfWorkDropdown.searchTerm || (ticketFormData.subNatureOfWork ? subNatureOfWorkOptions.find(opt => opt.value === ticketFormData.subNatureOfWork)?.label : '')}
                        onChange={(e) => {
                          setSubNatureOfWorkDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                          handleSubNatureOfWorkSearch(e.target.value);
                          // Clear error when user starts typing
                          if (formErrors.subNatureOfWork) {
                            setFormErrors(prev => ({ ...prev, subNatureOfWork: '' }));
                          }
                        }}
                        onKeyDown={(e) => handleSubNatureOfWorkKeyDown(e)}
                        onFocus={() => handleSubNatureOfWorkFocus()}
                        onBlur={() => {
                          // Delay closing to allow for clicks on dropdown items
                          setTimeout(() => {
                            setSubNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false }));
                          }, 200);
                        }}
                        placeholder="Search Sub Nature of Work..."
                        className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.subNatureOfWork ? 'border-red-500' : 'border-gray-300'} ${subNatureOfWorkDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      />
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {subNatureOfWorkDropdown.isOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {subNatureOfWorkDropdown.filteredOptions.length > 0 ? (
                          subNatureOfWorkDropdown.filteredOptions.map((option, index) => (
                            <button
                              key={option.value}
                              id={`subNatureOfWork-item-${index}`}
                              type="button"
                              onClick={() => handleSubNatureOfWorkSelect(option.value as SubNatureOfWork)}
                              className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === subNatureOfWorkDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : option.value === '' ? 'text-gray-400 italic' : 'text-gray-700'}`}
                            >
                              {option.label}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No options found</div>
                        )}
                      </div>
                    )}
                    {formErrors.subNatureOfWork && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.subNatureOfWork}</p>
                    )}
                  </div>
                </div>
              </div>





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

              {/* First Row - Customer and Engine Serial Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Engine Serial Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Engine Serial Number
                  </label>
                  <input
                    ref={serialNumberRef}
                    type="text"
                    value={ticketFormData.engineSerialNumber}
                    onChange={(e) => {
                      setTicketFormData({ ...ticketFormData, engineSerialNumber: e.target.value });
                      // Clear error when user starts typing
                      if (formErrors.engineSerialNumber) {
                        setFormErrors(prev => ({ ...prev, engineSerialNumber: '' }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Focus the assignee field
                        setAssigneeDropdown(prev => ({ ...prev, isOpen: true }));
                        const assigneeInput = document.querySelector('input[placeholder="Search technician..."]') as HTMLInputElement;
                        if (assigneeInput) {
                          assigneeInput.focus();
                        }
                      }
                    }}
                    placeholder="Enter engine serial number"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Second Row - Assignee and Scheduled Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Focus the service request type field
                        const serviceRequestTypeInput = document.querySelector('input[placeholder="Enter service request type"]') as HTMLInputElement;
                        if (serviceRequestTypeInput) {
                          serviceRequestTypeInput.focus();
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Third Row - Service Request Type and Service Required Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Service Request Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Request Type *
                  </label>
                  <input
                    type="text"
                    value={ticketFormData.serviceRequestType}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, serviceRequestType: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter service request type"
                  />
                </div>

                {/* Service Required Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Required Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={ticketFormData.serviceRequiredDate ? ticketFormData.serviceRequiredDate.replace('Z', '') : ''}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, serviceRequiredDate: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        // Focus the business vertical field
                        const businessVerticalInput = document.querySelector('input[placeholder="Enter vertical"]') as HTMLInputElement;
                        if (businessVerticalInput) {
                          businessVerticalInput.focus();
                        }
                      }
                    }}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Fourth Row - Business Vertical and Site ID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Business Vertical */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vertical
                  </label>
                  <input
                    type="text"
                    value={ticketFormData.businessVertical}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, businessVertical: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter vertical"
                  />
                </div>

                {/* Site Identifier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site ID
                  </label>
                  <input
                    type="text"
                    value={ticketFormData.siteIdentifier}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, siteIdentifier: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter site ID"
                  />
                </div>
              </div>

              {/* Fifth Row - State Name and Site Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* State Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State Name
                  </label>
                  <input
                    type="text"
                    value={ticketFormData.stateName}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, stateName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter state name"
                  />
                </div>

                {/* Site Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Site Location
                  </label>
                  <input
                    type="text"
                    value={ticketFormData.siteLocation}
                    onChange={(e) => setTicketFormData({ ...ticketFormData, siteLocation: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:border-blue-500"
                    placeholder="Enter site location"
                  />
                </div>
              </div>

              {/* Service Request Details Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Service Request Details</h3>

                {/* Enhanced Dropdown Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Enhanced Type of Visit Dropdown */}
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Visit
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={typeOfVisitDropdown.searchTerm || (ticketFormData.typeOfVisit ? typeOfVisitOptions.find(opt => opt.value === ticketFormData.typeOfVisit)?.label : '')}
                        onChange={(e) => {
                          setTypeOfVisitDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                          handleTypeOfVisitSearch(e.target.value);
                          // Clear error when user starts typing
                          if (formErrors.typeOfVisit) {
                            setFormErrors(prev => ({ ...prev, typeOfVisit: '' }));
                          }
                        }}
                        onKeyDown={(e) => handleTypeOfVisitKeyDown(e)}
                        onFocus={() => handleTypeOfVisitFocus()}
                        onBlur={() => {
                          // Delay closing to allow for clicks on dropdown items
                          setTimeout(() => {
                            setTypeOfVisitDropdown(prev => ({ ...prev, isOpen: false }));
                          }, 200);
                        }}
                        placeholder="Search Type of Visit..."
                        className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.typeOfVisit ? 'border-red-500' : 'border-gray-300'} ${typeOfVisitDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      />
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {typeOfVisitDropdown.isOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {typeOfVisitDropdown.filteredOptions.length > 0 ? (
                          typeOfVisitDropdown.filteredOptions.map((option, index) => (
                            <button
                              key={option.value}
                              id={`edit-typeOfVisit-item-${index}`}
                              type="button"
                              onClick={() => handleTypeOfVisitSelect(option.value as TypeOfVisit)}
                              className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === typeOfVisitDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : option.value === '' ? 'text-gray-400 italic' : 'text-gray-700'}`}
                            >
                              {option.label}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No options found</div>
                        )}
                      </div>
                    )}
                    {formErrors.typeOfVisit && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.typeOfVisit}</p>
                    )}
                  </div>

                  {/* Enhanced Nature of Work Dropdown */}
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nature of Work
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={natureOfWorkDropdown.searchTerm || (ticketFormData.natureOfWork ? natureOfWorkOptions.find(opt => opt.value === ticketFormData.natureOfWork)?.label : '')}
                        onChange={(e) => {
                          setNatureOfWorkDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                          handleNatureOfWorkSearch(e.target.value);
                          // Clear error when user starts typing
                          if (formErrors.natureOfWork) {
                            setFormErrors(prev => ({ ...prev, natureOfWork: '' }));
                          }
                        }}
                        onKeyDown={(e) => handleNatureOfWorkKeyDown(e)}
                        onFocus={() => handleNatureOfWorkFocus()}
                        onBlur={() => {
                          // Delay closing to allow for clicks on dropdown items
                          setTimeout(() => {
                            setNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false }));
                          }, 200);
                        }}
                        placeholder="Search Nature of Work..."
                        className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.natureOfWork ? 'border-red-500' : 'border-gray-300'} ${natureOfWorkDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      />
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {natureOfWorkDropdown.isOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {natureOfWorkDropdown.filteredOptions.length > 0 ? (
                          natureOfWorkDropdown.filteredOptions.map((option, index) => (
                            <button
                              key={option.value}
                              id={`edit-natureOfWork-item-${index}`}
                              type="button"
                              onClick={() => handleNatureOfWorkSelect(option.value as NatureOfWork)}
                              className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === natureOfWorkDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : option.value === '' ? 'text-gray-400 italic' : 'text-gray-700'}`}
                            >
                              {option.label}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No options found</div>
                        )}
                      </div>
                    )}
                    {formErrors.natureOfWork && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.natureOfWork}</p>
                    )}
                  </div>

                  {/* Enhanced Sub Nature of Work Dropdown */}
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sub Nature of Work
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={subNatureOfWorkDropdown.searchTerm || (ticketFormData.subNatureOfWork ? subNatureOfWorkOptions.find(opt => opt.value === ticketFormData.subNatureOfWork)?.label : '')}
                        onChange={(e) => {
                          setSubNatureOfWorkDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                          handleSubNatureOfWorkSearch(e.target.value);
                          // Clear error when user starts typing
                          if (formErrors.subNatureOfWork) {
                            setFormErrors(prev => ({ ...prev, subNatureOfWork: '' }));
                          }
                        }}
                        onKeyDown={(e) => handleSubNatureOfWorkKeyDown(e)}
                        onFocus={() => handleSubNatureOfWorkFocus()}
                        onBlur={() => {
                          // Delay closing to allow for clicks on dropdown items
                          setTimeout(() => {
                            setSubNatureOfWorkDropdown(prev => ({ ...prev, isOpen: false }));
                          }, 200);
                        }}
                        placeholder="Search Sub Nature of Work..."
                        className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.subNatureOfWork ? 'border-red-500' : 'border-gray-300'} ${subNatureOfWorkDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      />
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {subNatureOfWorkDropdown.isOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {subNatureOfWorkDropdown.filteredOptions.length > 0 ? (
                          subNatureOfWorkDropdown.filteredOptions.map((option, index) => (
                            <button
                              key={option.value}
                              id={`edit-subNatureOfWork-item-${index}`}
                              type="button"
                              onClick={() => handleSubNatureOfWorkSelect(option.value as SubNatureOfWork)}
                              className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === subNatureOfWorkDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : option.value === '' ? 'text-gray-400 italic' : 'text-gray-700'}`}
                            >
                              {option.label}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No options found</div>
                        )}
                      </div>
                    )}
                    {formErrors.subNatureOfWork && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.subNatureOfWork}</p>
                    )}
                  </div>
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

              {/* Visit Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Visit Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Type of Visit</h4>
                    <p className="text-gray-900 font-medium">
                      {selectedTicket.typeOfVisit ? typeOfVisitOptions.find(opt => opt.value === selectedTicket.typeOfVisit)?.label : 'Not specified'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Nature of Work</h4>
                    <p className="text-gray-900 font-medium">
                      {selectedTicket.natureOfWork ? natureOfWorkOptions.find(opt => opt.value === selectedTicket.natureOfWork)?.label : 'Not specified'}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Sub Nature of Work</h4>
                    <p className="text-gray-900 font-medium">
                      {selectedTicket.subNatureOfWork ? subNatureOfWorkOptions.find(opt => opt.value === selectedTicket.subNatureOfWork)?.label : 'Not specified'}
                    </p>
                  </div>
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
                {selectedTicket.status === 'resolved' && ticketsWithFeedback.has(selectedTicket._id) && (
                  <button
                    onClick={() => handleViewFeedback(selectedTicket._id)}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>View Feedback</span>
                  </button>
                )}
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
            setShowDigitalReportModal(false);
          }}
          onReportUpdated={(report) => {
            setShowDigitalReportModal(false);
          }}
        />
      )}

      {/* Excel Upload Modal */}
      {showExcelUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Upload className="w-6 h-6 text-white" />
                  <h2 className="text-xl font-semibold text-white">Upload Service Tickets</h2>
                </div>
                <button
                  onClick={() => setShowExcelUploadModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - File Upload */}
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-blue-600" />
                      File Selection
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Choose Excel File
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileChange}
                            className="hidden"
                            id="excel-file-input"
                          />
                          <label htmlFor="excel-file-input" className="cursor-pointer">
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600">
                              <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Excel files (.xlsx, .xls) only
                            </p>
                          </label>
                        </div>
                      </div>

                      {excelFile && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-800">
                                {excelFile.name}
                              </p>
                              <p className="text-xs text-green-600">
                                {(excelFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {uploadingExcel && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">Processing file...</span>
                            <span className="text-blue-600 font-medium">{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {uploadResults && (
                        <div className={`border rounded-lg p-4 ${uploadResults.errorCount > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                          }`}>
                          <div className="flex items-center space-x-3">
                            {uploadResults.errorCount > 0 ? (
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            ) : (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            )}
                            <div>
                              <p className={`text-sm font-medium ${uploadResults.errorCount > 0 ? 'text-red-800' : 'text-green-800'
                                }`}>
                                {uploadResults.importedCount} tickets imported successfully
                                {uploadResults.errorCount > 0 && `, ${uploadResults.errorCount} errors`}
                              </p>
                            </div>
                          </div>
                          
                          {/* Enhanced error display */}
                          {uploadResults.errors && uploadResults.errors.length > 0 && (
                            <div className="mt-3">
                              {/* Summary of errors */}
                              <div className="mb-3 p-3 bg-red-100 rounded-lg">
                                <p className="text-sm font-semibold text-red-800 mb-2">
                                  ⚠️ Import Summary:
                                </p>
                                <div className="text-xs text-red-700 space-y-1">
                                  {(() => {
                                    const duplicateErrors = uploadResults.errors.filter(error => 
                                      error.error.includes('already exists in the system')
                                    );
                                    const otherErrors = uploadResults.errors.filter(error => 
                                      !error.error.includes('already exists in the system')
                                    );
                                    
                                    return (
                                      <>
                                        {duplicateErrors.length > 0 && (
                                          <p>• <strong>{duplicateErrors.length} tickets</strong> were skipped because they already exist in the system</p>
                                        )}
                                        {otherErrors.length > 0 && (
                                          <p>• <strong>{otherErrors.length} tickets</strong> had other errors during import</p>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              
                              {/* Detailed error list */}
                              <div>
                                <p className="text-xs font-medium text-red-700 mb-2">Detailed Errors:</p>
                                <div className="max-h-40 overflow-y-auto space-y-1">
                                  {uploadResults.errors.map((error, index) => (
                                    <div key={index} className="text-xs text-red-600 bg-red-100 p-2 rounded border-l-2 border-red-400">
                                      <div className="flex items-start justify-between">
                                        <span className="font-medium">Row {error.row}:</span>
                                        {error.error.includes('already exists in the system') && (
                                          <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">
                                            Duplicate
                                          </span>
                                        )}
                                      </div>
                                      <p className="mt-1">{error.error}</p>
                                      {error.data?.serviceRequestNumber && (
                                        <p className="mt-1 text-red-500">
                                          <strong>Service Request Number:</strong> {error.data.serviceRequestNumber}
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowExcelUploadModal(false)}
                      className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleExcelImport}
                      disabled={!excelFile || uploadingExcel}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {uploadingExcel ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        'Import Tickets'
                      )}
                    </button>
                  </div>
                </div>

                {/* Right Column - Preview */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Eye className="w-5 h-5 mr-2 text-blue-600" />
                    Data Preview
                  </h3>

                  {showPreview && previewData.length > 0 ? (
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(previewData[0]).map((header, index) => (
                                <th
                                  key={index}
                                  className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {previewData.slice(0, 5).map((row, rowIndex) => (
                              <tr key={rowIndex} className="hover:bg-gray-50">
                                {Object.values(row).map((cell, cellIndex) => (
                                  <td
                                    key={cellIndex}
                                    className="px-3 py-2 text-xs text-gray-900 max-w-32 truncate"
                                    title={String(cell)}
                                  >
                                    {String(cell)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {previewData.length > 5 && (
                        <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500 text-center">
                          Showing first 5 rows of {previewData.length} total rows
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">
                        Upload an Excel file to preview the data
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Feedback Modal */}
      {showFeedbackModal && selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-orange-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="w-6 h-6 text-white" />
                  <h2 className="text-xl font-semibold text-white">Customer Feedback</h2>
                </div>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {loadingFeedback ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Customer Information */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Customer Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-blue-700">Customer Name</label>
                        <p className="text-blue-900">{selectedFeedback.customerName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-blue-700">Email</label>
                        <p className="text-blue-900">{selectedFeedback.customerEmail}</p>
                      </div>
                    </div>
                  </div>

                  {/* Overall Rating */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Overall Rating</h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={`text-2xl ${star <= selectedFeedback.rating
                              ? 'text-yellow-400'
                              : 'text-gray-300'
                              }`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="text-lg font-medium text-gray-700">
                        {selectedFeedback.rating}/5
                      </span>
                    </div>
                  </div>

                  {/* Detailed Ratings */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Detailed Ratings</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Technician Rating</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`text-lg ${star <= selectedFeedback.technicianRating
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                                  }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-600">
                            {selectedFeedback.technicianRating}/5
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Timeliness Rating</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`text-lg ${star <= selectedFeedback.timelinessRating
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                                  }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-600">
                            {selectedFeedback.timelinessRating}/5
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Quality Rating</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span
                                key={star}
                                className={`text-lg ${star <= selectedFeedback.qualityRating
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                                  }`}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-sm font-medium text-gray-600">
                            {selectedFeedback.qualityRating}/5
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Service Quality */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Service Quality</h3>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${selectedFeedback.serviceQuality === 'excellent'
                      ? 'bg-green-100 text-green-800'
                      : selectedFeedback.serviceQuality === 'good'
                        ? 'bg-blue-100 text-blue-800'
                        : selectedFeedback.serviceQuality === 'average'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                      {selectedFeedback.serviceQuality.charAt(0).toUpperCase() + selectedFeedback.serviceQuality.slice(1)}
                    </span>
                  </div>

                  {/* Would Recommend */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Would Recommend</h3>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${selectedFeedback.wouldRecommend
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                      }`}>
                      {selectedFeedback.wouldRecommend ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {/* Comments */}
                  {selectedFeedback.comments && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Comments</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.comments}</p>
                    </div>
                  )}

                  {/* Improvement Suggestions */}
                  {selectedFeedback.improvementSuggestions && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Improvement Suggestions</h3>
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedFeedback.improvementSuggestions}</p>
                    </div>
                  )}

                  {/* Feedback Date */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Feedback Date</h3>
                    <p className="text-gray-700">
                      {new Date(selectedFeedback.feedbackDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceManagement; 