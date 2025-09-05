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

import DigitalServiceReport from '../components/DigitalServiceReport';
import { MultiSelect } from '../components/ui/MultiSelect';
import { MultiSelectRef } from '../components/ui/MultiSelect';

// Types matching backend structure
type TicketStatus = 'open' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

// New dropdown options
type TypeOfVisit = 'oil_service' | 'courtesy_visit' | 'amc_visit' | 'spare' | 'fsc_visit' | 'paid_visit' | '';
type TypeOfService = 'breakdown' | 'courtesy_visit' | 'free_service_coupon' | 'preventive_maintenance' | '';

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
  // New Excel fields from API response
  ServiceRequestNumber?: string;
  CustomerType?: string;
  CustomerName?: string;
  EngineSerialNumber?: string;
  EngineModel?: string;
  KVA?: string;
  ServiceRequestDate?: string;
  ServiceAttendedDate?: string;
  HourMeterReading?: string;
  TypeofService?: string;
  SiteID?: string;
  ServiceEngineerName?: string | User;
  ComplaintCode?: string;
  ComplaintDescription?: string;
  ResolutionDescription?: string;
  eFSRNumber?: string;
  eFSRClosureDateAndTime?: string;
  ServiceRequestStatus?: string;
  OemName?: string;

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
  typeOfService?: TypeOfService;
  natureOfWork?: string;
  subNatureOfWork?: string;
  businessVertical?: string;
  convenienceCharges?: string;

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
  // Import tracking
  uploadedViaExcel?: boolean;

}

interface TicketFormData {
  // Standardized fields
  serviceRequestNumber: string;
  serviceRequestType: string;
  serviceRequiredDate: string;
  engineSerialNumber?: string;
  engineModel?: string; // New field for engine model
  kva?: string; // New field for KVA rating
  customerName: string;
  serviceRequestEngineer: string;
  typeOfVisit: TypeOfVisit;
  typeOfService: TypeOfService;
  businessVertical: string;
  selectedAddress?: string; // New field for selected address
  complaintDescription?: string; // New field for complaint description

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

  // Helper function to generate service request number for manual creation
  const generateServiceRequestNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year (e.g., "25" for 2025)
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero (e.g., "08" for August)
    
    // For manual creation, we'll use a simple counter starting from 0001
    // In a real implementation, this would be fetched from database
    const counter = 1; // This would be fetched from database to get the next available number for the current month
    const counterStr = counter.toString().padStart(4, '0'); // e.g., "0001"
    
    // Format: SPS25080001 (SPS = company prefix, 25 = year, 08 = month, 0001 = sequence)
    return `SPS${year}${month}${counterStr}`;
  };

  // Core state
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [oems, setOems] = useState<any[]>([]);
  const [customerEngines, setCustomerEngines] = useState<any[]>([]);
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
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
  const [showExcelEditModal, setShowExcelEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExcelUploadModal, setShowExcelUploadModal] = useState(false);

  const [showDigitalReportModal, setShowDigitalReportModal] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);

  // Engineer Payment Report modal state
  const [showEngineerReportModal, setShowEngineerReportModal] = useState(false);

  // Engineer Payment Report states
  const [reportMonth, setReportMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [reportEngineerId, setReportEngineerId] = useState<string>('');
  const [showReportEngineerDropdown, setShowReportEngineerDropdown] = useState(false);
  const [engineerReportRows, setEngineerReportRows] = useState<any[]>([]);
  const [engineerReportTotals, setEngineerReportTotals] = useState<{ byEngineer: { engineerId: string; engineerName: string; totalAmount: number }[]; grandTotal: number }>({ byEngineer: [], grandTotal: 0 });
  const [loadingEngineerReport, setLoadingEngineerReport] = useState(false);
  const [exportingEngineerReport, setExportingEngineerReport] = useState(false);

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

  // Editable visit details state
  const [editableVisitDetails, setEditableVisitDetails] = useState({
    typeOfVisit: '',
    typeOfService: '',
    natureOfWork: '',
    subNatureOfWork: '',
    complaintDescription: '',
    convenienceCharges: ''
  });
  const [isEditingVisitDetails, setIsEditingVisitDetails] = useState(false);
  const [updatingVisitDetails, setUpdatingVisitDetails] = useState(false);
  const [visitDetailsHighlighted, setVisitDetailsHighlighted] = useState(false);

  // Current user for ticket creation
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Stats state
  const [serviceStats, setServiceStats] = useState({
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    closedTickets: 0,
    overdueTickets: 0
  });

  // Form data
  const [ticketFormData, setTicketFormData] = useState<TicketFormData>({
    // Standardized fields
    serviceRequestNumber: generateServiceRequestNumber(),
    serviceRequestType: '',
    serviceRequiredDate: new Date().toISOString().slice(0, 16),
    engineSerialNumber: '',
    engineModel: '', // New field for engine model
    kva: '', // New field for KVA rating
    customerName: '',
    serviceRequestEngineer: '',
    typeOfVisit: '',
    typeOfService: '',
    businessVertical: '',
    selectedAddress: '', // New field for selected address
    complaintDescription: '', // New field for complaint description

    // Legacy fields for backward compatibility
    customer: '',
    products: [], // New field for multiple products
    assignedTo: '',
    scheduledDate: new Date().toISOString().split('T')[0],
    serviceCharge: 0
  });

  // Excel-specific form data for editing Excel tickets
  const [excelFormData, setExcelFormData] = useState({
    ServiceRequestNumber: '',
    CustomerType: '',
    CustomerName: '',
    CustomerId: '', // Add customer ID for API payload
    EngineSerialNumber: '',
    EngineModel: '',
    KVA: '',
    ServiceRequestDate: '',
    ServiceAttendedDate: '',
    HourMeterReading: '',
    TypeofService: '',
    SiteID: '',
    SREngineer: '',
    SREngineerId: '', // Add service engineer ID for API payload
    ComplaintCode: '',
    ComplaintDescription: '',
    ResolutionDescription: '',
    eFSRNumber: '',
    eFSRClosureDateAndTime: '',
    ServiceRequestStatus: 'open',
    OEMName: ''
  });

  // Search terms for dropdowns
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [engineerSearchTerm, setEngineerSearchTerm] = useState('');
  const [oemSearchTerm, setOemSearchTerm] = useState('');
  const [serviceTypeSearchTerm, setServiceTypeSearchTerm] = useState('');



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

  const [engineDropdown, setEngineDropdown] = useState<DropdownState>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  const [addressDropdown, setAddressDropdown] = useState<DropdownState>({
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



  // Refs for dropdown focus management
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const engineDropdownRef = useRef<HTMLDivElement>(null);
  const addressDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const typeOfVisitDropdownRef = useRef<HTMLDivElement>(null);
  const typeOfServiceDropdownRef = useRef<HTMLDivElement>(null);
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
    { value: 'oil_service', label: 'Oil Service' },
    { value: 'courtesy_visit', label: 'Courtesy Visit' },
    { value: 'amc_visit', label: 'AMC Visit' },
    { value: 'spare', label: 'Spare' },
    { value: 'fsc_visit', label: 'FSC Visit' },
    { value: 'paid_visit', label: 'Paid Visit' }
  ];

  const typeOfServiceOptions = [
    { value: 'breakdown', label: 'Breakdown' },
    { value: 'courtesy_visit', label: 'Courtesy Visit' },
    { value: 'free_service_coupon', label: 'Free Service Coupon' },
    { value: 'preventive_maintenance', label: 'Preventive Maintenance' }
  ];



  const natureOfWorkOptions = [
    { value: 'oil_service', label: 'Oil Service' },
    { value: 'site_visit', label: 'Site Visit' },
    { value: 'breakdown', label: 'Breakdown' },
    { value: 'installation', label: 'Installation' },
    { value: 'dms_call', label: 'DMS Call' }
  ];

  const subNatureOfWorkOptions = [
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

  // Enhanced dropdown states for Type of Visit and Type of Service
  const [typeOfVisitDropdown, setTypeOfVisitDropdown] = useState<DropdownState>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: typeOfVisitOptions
  });

  const [typeOfServiceDropdown, setTypeOfServiceDropdown] = useState<DropdownState>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: typeOfServiceOptions
  });

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

  const fetchServiceStats = async () => {
    try {
      const response = await apiClient.services.getStats();
      if (response.success && response.data) {
        setServiceStats({
          totalTickets: response.data.totalTickets || 0,
          openTickets: response.data.openTickets || 0,
          resolvedTickets: response.data.resolvedTickets || 0,
          closedTickets: response.data.closedTickets || 0,
          overdueTickets: response.data.overdueTickets || 0
        });
      }
    } catch (error) {
      console.error('Error fetching service stats:', error);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTickets(),
        fetchServiceStats(),
        fetchCustomers(),
        fetchProducts(),
        fetchFieldEngineer(),
        fetchOEMs()
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
      // Use the API that fetches all customers without pagination
      const response = await apiClient.customers.getAllForDropdown();
      let customersData: Customer[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          customersData = response.data;
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

  const fetchFieldEngineer = async () => {
    try {
      // Fetch field engineers from API
      const response = await apiClient.users.getFieldEngineers();

      if (response.success && response.data.fieldEngineers) {
        const fieldEngineers: User[] = response.data.fieldEngineers.map((engineer: any) => ({
          _id: engineer._id || engineer.id, // Try both _id and id
          firstName: engineer.firstName,
          lastName: engineer.lastName,
          email: engineer.email,
          phone: engineer.phone,
          fullName: engineer.name || `${engineer.firstName} ${engineer.lastName}`
        }));
        setUsers(fieldEngineers);
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
      console.error('Error fetching field engineers:', error);
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

  const fetchOEMs = async () => {
    try {
      // For now, use hardcoded data until the API is properly set up
      const hardcodedOEMs = [
        { value: 'cummins', label: 'Cummins' },
        { value: 'caterpillar', label: 'Caterpillar' },
        { value: 'perkins', label: 'Perkins' },
        { value: 'deutz', label: 'Deutz' },
        { value: 'volvo_penta', label: 'Volvo Penta' },
        { value: 'man', label: 'MAN' },
        { value: 'scania', label: 'Scania' },
        { value: 'mtu', label: 'MTU' },
        { value: 'yanmar', label: 'Yanmar' },
        { value: 'kubota', label: 'Kubota' },
        { value: 'honda', label: 'Honda' },
        { value: 'kohler', label: 'Kohler' },
        { value: 'generac', label: 'Generac' },
        { value: 'briggs_stratton', label: 'Briggs & Stratton' },
        { value: 'other', label: 'Other' }
      ];
      setOems(hardcodedOEMs);
    } catch (error) {
      console.error('Error setting up OEMs:', error);
      setOems([]);
    }
  };

  const fetchCustomerData = async (customerId: string) => {
    try {
      // Fetch both engines and addresses in parallel
      const [enginesResponse, addressesResponse] = await Promise.all([
        apiClient.services.getCustomerEngines(customerId),
        apiClient.services.getCustomerAddresses(customerId)
      ]);

      if (enginesResponse.success && enginesResponse.data.engines) {
        setCustomerEngines(enginesResponse.data.engines);
        setEngineDropdown(prev => ({
          ...prev,
          filteredOptions: enginesResponse.data.engines
        }));
      }

      if (addressesResponse.success && addressesResponse.data.addresses) {
        setCustomerAddresses(addressesResponse.data.addresses);
        setAddressDropdown(prev => ({
          ...prev,
          filteredOptions: addressesResponse.data.addresses
        }));
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setCustomerEngines([]);
      setCustomerAddresses([]);
      setEngineDropdown(prev => ({
        ...prev,
        filteredOptions: []
      }));
      setAddressDropdown(prev => ({
        ...prev,
        filteredOptions: []
      }));
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
      serviceRequestNumber: generateServiceRequestNumber(),
      serviceRequestType: '',
      serviceRequiredDate: new Date().toISOString().split('T')[0],
      engineSerialNumber: '',
      engineModel: '', // New field for engine model
      kva: '', // New field for KVA rating
      customerName: '',
      serviceRequestEngineer: '',
      typeOfVisit: '',
      typeOfService: '',
      businessVertical: '',
      selectedAddress: '', // New field for selected address
      complaintDescription: '', // New field for complaint description

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

  const handleEditTicket = async (ticket: ServiceTicket) => {
    setEditingTicket(ticket);
    
    // Get customer ID
    const customerId = typeof ticket.customer === 'string' ? ticket.customer : ticket.customer._id;
    
    // Fetch customer data (engines and addresses) if customer exists
    if (customerId) {
      await fetchCustomerData(customerId);
    }
    
    setTicketFormData({
      // Standardized fields - handle both new Excel fields and standardized fields
      serviceRequestNumber: ticket.ServiceRequestNumber || ticket.serviceRequestNumber || generateServiceRequestNumber(),
      serviceRequestType: ticket.serviceRequestType || ticket.TypeofService || '',
      serviceRequiredDate: ticket.serviceRequiredDate ? ticket.serviceRequiredDate.slice(0, 16) : (ticket.ServiceRequestDate ? new Date(ticket.ServiceRequestDate).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)),
      engineSerialNumber: ticket.EngineSerialNumber || ticket.engineSerialNumber || '',
      engineModel: ticket.EngineModel || '', // New field for engine model
      kva: ticket.KVA || '', // New field for KVA rating
      customerName: ticket.CustomerName || ticket.customerName || '',
      serviceRequestEngineer: typeof ticket.serviceRequestEngineer === 'string' ? ticket.serviceRequestEngineer : ticket.serviceRequestEngineer?._id || '',
      typeOfVisit: ticket.typeOfVisit || '',
      typeOfService: (ticket.TypeofService || ticket.typeOfService || '') as TypeOfService || '',
      businessVertical: ticket.CustomerType || ticket.businessVertical || '',
      selectedAddress: '', // Will be populated after fetching customer data
      complaintDescription: ticket.ComplaintDescription || ticket.complaintDescription || '', // New field for complaint description

      // Legacy fields for backward compatibility
      customer: customerId,
      products: Array.isArray(ticket.products) ? ticket.products.map(p => typeof p === 'string' ? p : p._id) : [],
      assignedTo: typeof ticket.assignedTo === 'string' ? ticket.assignedTo || '' : ticket.assignedTo?._id || '',
      scheduledDate: ticket.scheduledDate ? ticket.scheduledDate.split('T')[0] : (ticket.ServiceRequestDate ? new Date(ticket.ServiceRequestDate).toISOString().split('T')[0] : ''),
      serviceCharge: ticket.serviceCharge || 0
    });



    // Initialize dropdown states for edit mode
    const customerName = typeof ticket.customer === 'string' ? customers.find(c => c._id === ticket.customer)?.name || '' : ticket.customer?.name || '';
    const assigneeName = typeof ticket.assignedTo === 'string' ? users.find(u => u._id === ticket.assignedTo)?.fullName || '' : ticket.assignedTo?.fullName || '';
    
    setCustomerDropdown({
      isOpen: false,
      searchTerm: customerName,
      selectedIndex: 0,
      filteredOptions: customers
    });

    setEngineDropdown({
      isOpen: false,
      searchTerm: ticket.EngineSerialNumber || ticket.engineSerialNumber || '',
      selectedIndex: 0,
      filteredOptions: customerEngines
    });

    setAddressDropdown({
      isOpen: false,
      searchTerm: '', // Will be populated after fetching customer data
      selectedIndex: 0,
      filteredOptions: customerAddresses
    });

    setProductDropdown({
      isOpen: false,
      searchTerm: Array.isArray(ticket.products) ? ticket.products.map(p => typeof p === 'string' ? p : p.name).join(', ') : '',
      selectedIndex: 0,
      filteredOptions: products
    });

    setAssigneeDropdown({
      isOpen: false,
      searchTerm: assigneeName,
      selectedIndex: 0,
      filteredOptions: users
    });

    setFormErrors({});
    
    // Show appropriate edit modal based on ticket type
    if (ticket.uploadedViaExcel) {
      // Populate Excel form data
      setExcelFormData({
        ServiceRequestNumber: ticket.ServiceRequestNumber || ticket.serviceRequestNumber || '',
        CustomerType: ticket.CustomerType || ticket.businessVertical || '',
        CustomerName: ticket.CustomerName || ticket.customerName || '',
        CustomerId: typeof ticket.customer === 'string' ? ticket.customer : ticket.customer?._id || '',
        EngineSerialNumber: ticket.EngineSerialNumber || (ticket as any).engineSerialNumber || '',
        EngineModel: ticket.EngineModel || '',
        KVA: ticket.KVA || '',
        ServiceRequestDate: ticket.ServiceRequestDate || ticket.serviceRequiredDate || '',
        ServiceAttendedDate: ticket.ServiceAttendedDate || '',
        HourMeterReading: ticket.HourMeterReading || '',
        TypeofService: ticket.TypeofService || ticket.serviceRequestType || '',
        SiteID: ticket.SiteID || '',
        SREngineer: ticket.ServiceEngineerName && typeof ticket.ServiceEngineerName === 'object' 
          ? `${(ticket.ServiceEngineerName as any).firstName} ${(ticket.ServiceEngineerName as any).lastName}`
          : (ticket.ServiceEngineerName && typeof ticket.ServiceEngineerName === 'string' 
              ? users.find(u => u._id === ticket.ServiceEngineerName)?.fullName || getUserName(ticket.assignedTo) || ''
              : getUserName(ticket.assignedTo) || ''),
        SREngineerId: ticket.ServiceEngineerName && typeof ticket.ServiceEngineerName === 'string' 
          ? ticket.ServiceEngineerName 
          : (typeof ticket.assignedTo === 'string' ? ticket.assignedTo : ticket.assignedTo?._id || ''),
        ComplaintCode: ticket.ComplaintCode || '',
        ComplaintDescription: ticket.ComplaintDescription || ticket.complaintDescription || '',
        ResolutionDescription: ticket.ResolutionDescription || '',
        eFSRNumber: ticket.eFSRNumber || '',
        eFSRClosureDateAndTime: ticket.eFSRClosureDateAndTime || '',
        ServiceRequestStatus: ticket.ServiceRequestStatus || ticket.status || 'open',
        OEMName: ticket.OemName || ''
      });
      setShowExcelEditModal(true);
      
      // Initialize search terms with current values
      setCustomerSearchTerm(excelFormData.CustomerName || '');
      setEngineerSearchTerm(excelFormData.SREngineer || '');
      setOemSearchTerm(excelFormData.OEMName || '');
      setServiceTypeSearchTerm(excelFormData.TypeofService || '');
    } else {
    setShowEditModal(true);
    }
  };

  const openDetailsModal = async (ticket: ServiceTicket) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
    
    // Reset editing state when opening modal
    setIsEditingVisitDetails(false);
    setEditableVisitDetails({
      typeOfVisit: '',
      typeOfService: '',
      natureOfWork: '',
      subNatureOfWork: '',
      complaintDescription: '',
      convenienceCharges: ''
    });
    setVisitDetailsHighlighted(false);

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
    if (!ticketFormData.typeOfService || ticketFormData.typeOfService.trim() === '') {
      errors.typeOfService = 'Type of Service is required';
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
    if (!validateTicketForm()) {
      return;
    }

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
        engineModel: ticketFormData.engineModel || '',
        kva: ticketFormData.kva || '',
        customerName: customers.find(c => c._id === ticketFormData.customer)?.name || '',
        serviceRequestEngineer: ticketFormData.assignedTo || undefined,
        typeOfVisit: ticketFormData.typeOfVisit,
        typeOfService: ticketFormData.typeOfService || '',
        businessVertical: ticketFormData.businessVertical || undefined,
        selectedAddress: ticketFormData.selectedAddress || undefined,
        complaintDescription: ticketFormData.complaintDescription || undefined
      };







      // Only include assignedTo if it's not empty
      if (ticketFormData.assignedTo && ticketFormData.assignedTo.trim() !== '') {
        payload.assignedTo = ticketFormData.assignedTo;
      }

  
      const response = await apiClient.services.create(payload);

      // Add the new ticket to the list
      if (response.success && response.data) {
        let newTicket = response.data.ticket || response.data;
        

        
        setTickets([newTicket, ...tickets]);
        fetchTickets();
        fetchServiceStats(); // Refresh stats after creating ticket
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
    if (!editingTicket) return;
    
    // For Excel tickets, we don't need to validate the same way as manual tickets
    if (!editingTicket.uploadedViaExcel && !validateTicketForm()) {
      return;
    }

    setSubmitting(true);
    try {
      setFormErrors({});

      // Format payload according to backend schema
      let payload: any = {};

      if (editingTicket.uploadedViaExcel) {
        // For Excel tickets, use Excel form data
        payload = {
          // Excel fields
          ServiceRequestNumber: excelFormData.ServiceRequestNumber,
          CustomerType: excelFormData.CustomerType,
          CustomerName: excelFormData.CustomerName,
          CustomerId: excelFormData.CustomerId, // Send customer objectId
          EngineSerialNumber: excelFormData.EngineSerialNumber,
          EngineModel: excelFormData.EngineModel,
          KVA: excelFormData.KVA,
          ServiceRequestDate: excelFormData.ServiceRequestDate ? new Date(excelFormData.ServiceRequestDate).toISOString() : undefined,
          ServiceAttendedDate: excelFormData.ServiceAttendedDate ? new Date(excelFormData.ServiceAttendedDate).toISOString() : undefined,
          HourMeterReading: excelFormData.HourMeterReading,
          TypeofService: excelFormData.TypeofService,
          SiteID: excelFormData.SiteID,
          SREngineer: excelFormData.SREngineer,
          SREngineerId: excelFormData.SREngineerId, // Send service engineer objectId
          ComplaintCode: excelFormData.ComplaintCode,
          ComplaintDescription: excelFormData.ComplaintDescription,
          ResolutionDescription: excelFormData.ResolutionDescription,
          eFSRNumber: excelFormData.eFSRNumber,
          eFSRClosureDateAndTime: excelFormData.eFSRClosureDateAndTime ? new Date(excelFormData.eFSRClosureDateAndTime).toISOString() : undefined,
          ServiceRequestStatus: excelFormData.ServiceRequestStatus,
          OEMName: excelFormData.OEMName
        };
      } else {
        // For manual tickets, use regular form data
        payload = {
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
        engineModel: ticketFormData.engineModel || '',
        kva: ticketFormData.kva || '',
        customerName: customers.find(c => c._id === ticketFormData.customer)?.name || '',
        serviceRequestEngineer: ticketFormData.assignedTo || undefined,
        typeOfVisit: ticketFormData.typeOfVisit,
        typeOfService: ticketFormData.typeOfService || '',
        businessVertical: ticketFormData.businessVertical || undefined,
        selectedAddress: ticketFormData.selectedAddress || undefined,
        complaintDescription: ticketFormData.complaintDescription || undefined
      };

      // Only include assignedTo if it's not empty
      if (ticketFormData.assignedTo && ticketFormData.assignedTo.trim() !== '') {
        payload.assignedTo = ticketFormData.assignedTo;
        }
      }



      let response;
      if (editingTicket.uploadedViaExcel) {
        // Use the new Excel-specific API for Excel tickets
        response = await apiClient.services.updateExcelTicket(editingTicket._id, payload);
      } else {
        // Use the regular update API for manual tickets
        response = await apiClient.services.update(editingTicket._id, payload);
      }

      // Update the ticket in the list
      if (response.success && response.data) {
        let updatedTicket = response.data.ticket || response.data;
        

        
        setTickets(tickets.map(t => t._id === editingTicket._id ? updatedTicket : t));
        
        // Update the editing ticket state if it's currently selected
        if (selectedTicket && selectedTicket._id === editingTicket._id) {
          setSelectedTicket(updatedTicket);
        }
        
        fetchServiceStats(); // Refresh stats after updating ticket
      }

      // Close appropriate modal based on ticket type
      if (editingTicket.uploadedViaExcel) {
        setShowExcelEditModal(false);
      } else {
      setShowEditModal(false);
      }
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

  // Helper function to refresh ticket data from server
  const refreshTicketData = async (ticketId: string) => {
    try {
      const response = await apiClient.services.getById(ticketId);
      if (response.success && response.data) {
        const refreshedTicket = response.data;
        
        // Update tickets list
        setTickets(tickets.map(t => t._id === ticketId ? refreshedTicket : t));
        
        // Update selected ticket if it's the same one
        if (selectedTicket && selectedTicket._id === ticketId) {
          setSelectedTicket(refreshedTicket);
        }
        
        // Update editing ticket if it's the same one
        if (editingTicket && editingTicket._id === ticketId) {
          setEditingTicket(refreshedTicket);
        }
      }
    } catch (error) {
      console.error('Error refreshing ticket data:', error);
    }
  };

  const resetTicketForm = () => {
    setTicketFormData({
      // Standardized fields
      serviceRequestNumber: generateServiceRequestNumber(),
      serviceRequestType: '',
      serviceRequiredDate: new Date().toISOString().slice(0, 16),
      engineSerialNumber: '',
      engineModel: '', // New field for engine model
      kva: '', // New field for KVA rating
      customerName: '',
      serviceRequestEngineer: '',
      typeOfVisit: '',
      typeOfService: '',
      businessVertical: '',
      selectedAddress: '', // New field for selected address
      complaintDescription: '', // New field for complaint description

      // Legacy fields for backward compatibility
      customer: '',
      products: [], // New field for multiple products
      assignedTo: '',
      scheduledDate: new Date().toISOString().split('T')[0],
      serviceCharge: 0
    });

    // Reset dropdown states
    setCustomerDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
    setEngineDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
    setAddressDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
    setProductDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));

    setAssigneeDropdown(prev => ({ ...prev, isOpen: false, searchTerm: '', selectedIndex: 0 }));
    

  };

  // Since filtering is now handled by the backend, we just use the tickets directly
  const filteredTickets = tickets;

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-800';
      case 'resolved':
        return 'bg-yellow-100 text-yellow-800';
      case 'closed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };





  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
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
      value: serviceStats.totalTickets.toString(),
      icon: <FileText className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Open Tickets',
      value: serviceStats.openTickets.toString(),
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'orange'
    },
    {
      title: 'Resolved Tickets',
      value: serviceStats.resolvedTickets.toString(),
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'Closed Tickets',
      value: serviceStats.closedTickets.toString(),
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'gray'
    }
  ];

  // Status options with labels
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
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

  const getReportEngineerLabel = (value: string) => {
    if (!value) return 'All Engineers';
    const user = users.find(u => u._id === value);
    return user ? getUserName(user) : 'All Engineers';
  };

  const formatFieldValue = (value: string | undefined | null): string => {
    if (!value || value === '' || value === '-') return '-';
    
    // Replace underscores with spaces and capitalize each word
    return value
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };



  const handleServiceRequestStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      // Find the ticket to check if it has a product
      const ticket = tickets.find(t => t._id === ticketId);
      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Update the ticket ServiceRequestStatus
      const response = await apiClient.services.update(ticketId, { ServiceRequestStatus: newStatus });

      if (response.success) {
        // Update the ticket in the local state
        setTickets(tickets.map(ticket =>
          ticket._id === ticketId
            ? { ...ticket, ServiceRequestStatus: newStatus, status: newStatus as TicketStatus }
            : ticket
        ));

        // Update selected ticket if it's the same one
        if (selectedTicket && selectedTicket._id === ticketId) {
          setSelectedTicket({ ...selectedTicket, ServiceRequestStatus: newStatus, status: newStatus as TicketStatus });
        }

        // Refresh stats after status update
        fetchServiceStats();

        toast.success('Service Request Status updated successfully!');
      }
    } catch (error) {
      console.error('Error updating Service Request Status:', error);
      toast.error('Failed to update Service Request Status. Please try again.');
    }
  };

  const handleVisitDetailsUpdate = async () => {
    if (!selectedTicket) return;

    try {
      setUpdatingVisitDetails(true);

      const payload = {
        typeOfVisit: editableVisitDetails.typeOfVisit,
        typeOfService: editableVisitDetails.typeOfService,
        natureOfWork: editableVisitDetails.natureOfWork,
        subNatureOfWork: editableVisitDetails.subNatureOfWork,
        complaintDescription: editableVisitDetails.complaintDescription,
        convenienceCharges: editableVisitDetails.convenienceCharges
      };

      const response = await apiClient.services.update(selectedTicket._id, payload);

      if (response.success) {
        // Update the ticket in the local state
        const updatedTicket = response.data.ticket || response.data;
        
        // Ensure the updated ticket has the complaint description and convenience charges from the form
        // Update both lowercase and uppercase versions for consistency across all ticket types
        const ticketWithComplaint = {
          ...updatedTicket,
          complaintDescription: editableVisitDetails.complaintDescription,
          ComplaintDescription: editableVisitDetails.complaintDescription,
          convenienceCharges: editableVisitDetails.convenienceCharges
        };
        
        setTickets(tickets.map(ticket =>
          ticket._id === selectedTicket._id ? ticketWithComplaint : ticket
        ));

        // Update selected ticket with the complaint description
        setSelectedTicket(ticketWithComplaint);

        // Exit edit mode
        setIsEditingVisitDetails(false);
        
        // Highlight the visit details section
        setVisitDetailsHighlighted(true);
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          setVisitDetailsHighlighted(false);
        }, 3000);
        
        // Refresh stats after updating visit details
        fetchServiceStats();
        
        toast.success('Visit details updated successfully!');
      }
    } catch (error) {
      console.error('Error updating visit details:', error);
      toast.error('Failed to update visit details. Please try again.');
    } finally {
      setUpdatingVisitDetails(false);
    }
  };

  const startEditingVisitDetails = () => {
    if (!selectedTicket) return;
    
    // Get complaint description from the appropriate field for all ticket types
    // Check both lowercase and uppercase versions to handle both Excel and manual tickets
    const complaintDesc = selectedTicket.complaintDescription || selectedTicket.ComplaintDescription || '';
    
    setEditableVisitDetails({
      typeOfVisit: selectedTicket.typeOfVisit || '',
      typeOfService: selectedTicket.typeOfService || '',
      natureOfWork: selectedTicket.natureOfWork || '',
      subNatureOfWork: selectedTicket.subNatureOfWork || '',
      complaintDescription: complaintDesc,
      convenienceCharges: selectedTicket.convenienceCharges || ''
    });
    setIsEditingVisitDetails(true);
  };

  const cancelEditingVisitDetails = () => {
    setIsEditingVisitDetails(false);
    setEditableVisitDetails({
      typeOfVisit: '',
      typeOfService: '',
      natureOfWork: '',
      subNatureOfWork: '',
      complaintDescription: '',
      convenienceCharges: ''
    });
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

        // Helper function to convert Excel date with time to proper format
        const convertExcelDateTimeWithTime = (dateValue: any) => {
          if (!dateValue) return new Date().toISOString();

          // If it's already a string in ISO format, return as is
          if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateValue)) {
            return dateValue;
          }

          // If it's a string in YYYY-MM-DD HH:MM:SS format, convert to ISO
          if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(dateValue)) {
            return new Date(dateValue.replace(' ', 'T')).toISOString();
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

        // Map the Excel headers to our new 19 fields structure
        const mappedData = {
          // Excel fields based on new structure
          SRNumber: getFieldValue(['SRNumber', 'SR Number', 'Service Request Number', 'SR Number'], ''),
          CustomerType: getFieldValue(['CustomerType', 'Customer Type', 'Customer Type'], ''),
          CustomerName: getFieldValue(['CustomerName', 'Customer Name', 'Customer'], ''),
          EngineNo: getFieldValue(['EngineNo', 'Engine No', 'Engine Number', 'Engine Serial Number'], ''),
          ModelCode: getFieldValue(['ModelCode', 'Model Code', 'Model'], ''),
          KVA: getFieldValue(['KVA', 'KVA Rating', 'KVA'], ''),
          RequestedDate: convertExcelDateTimeWithTime(getFieldValue(['RequestedDate', 'Requested Date', 'Request Date', 'Service Required Date'])),
          AttendedHrs: getFieldValue(['AttendedHrs', 'Attended Hours', 'Attended Hours'], ''),
          SRType: getFieldValue(['SRType', 'SR Type', 'Service Request Type', 'Service Type'], ''),
          SITEID: getFieldValue(['SITEID', 'Site ID', 'Site Identifier', 'Site'], ''),
          SREngineer: getFieldValue(['SREngineer', 'SR Engineer', 'Service Request Engineer', 'Engineer', 'Technician'], ''),
          ComplaintCode: getFieldValue(['ComplaintCode', 'Complaint Code', 'Complaint Code'], ''),
          ComplaintDescription: getFieldValue(['ComplaintDescription', 'Complaint Description', 'Complaint', 'Description'], ''),
          ResolutionDesc: getFieldValue(['ResolutionDesc', 'Resolution Description', 'Resolution', 'Resolution Desc'], ''),
          eFSRNo: getFieldValue(['eFSRNo', 'eFSR Number', 'eFSR No'], ''),
          eFSRClosureDateTime: convertExcelDateTimeWithTime(getFieldValue(['eFSRClosureDateTime', 'eFSR Closure Date Time', 'eFSR Closure Date'])),
          SRStatus: getFieldValue(['SRStatus', 'SR Status', 'Service Request Status', 'Status'], 'open'),
          OEMName: getFieldValue(['OEMName', 'OEM Name', 'OEM'], '')
        };

        return mappedData;
      });


      setUploadProgress(20);

      // Process all data and map to new field structure
      const processedTickets = processedData.map((row, index) => {
        const rowNumber = index + 2; // Excel row number (1-based + header row)
        
        // Return the processed data with new field names for backend processing
        return {
          ...row,
          // Map to new field names for backend
          SREngineer: row.SREngineer || '',
          CustomerName: row.CustomerName || ''
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
          // Handle duplicates separately
          if (response.data.duplicates && response.data.duplicates.length > 0) {
            creationErrors.push(...response.data.duplicates);
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

        // Auto-size columns for new 19 fields
        const columnWidths = [
          { wch: 20 }, // SRNumber
          { wch: 20 }, // CustomerType
          { wch: 25 }, // CustomerName
          { wch: 20 }, // EngineNo
          { wch: 20 }, // ModelCode
          { wch: 15 }, // KVA
          { wch: 20 }, // RequestedDate
          { wch: 20 }, // AttendedHrs
          { wch: 20 }, // SRType
          { wch: 20 }, // SITEID
          { wch: 25 }, // SREngineer
          { wch: 20 }, // ComplaintCode
          { wch: 30 }, // ComplaintDescription
          { wch: 30 }, // ResolutionDesc
          { wch: 20 }, // eFSRNo
          { wch: 25 }, // eFSRClosureDateTime
          { wch: 20 }, // SRStatus
          { wch: 20 }, // OEMName
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

  // Engineer Payment Report fetch
  const fetchEngineerReport = async () => {
    try {
      setLoadingEngineerReport(true);
      const params: any = { month: reportMonth };
      if (reportEngineerId) params.engineerId = reportEngineerId;
      const res = await apiClient.services.getEngineerPaymentReport(params);
      if (res.success && res.data) {
        setEngineerReportRows(res.data.rows || []);
        setEngineerReportTotals(res.data.totals || { byEngineer: [], grandTotal: 0 });
      } else {
        setEngineerReportRows([]);
        setEngineerReportTotals({ byEngineer: [], grandTotal: 0 });
      }
    } catch (err: any) {
      console.error('Engineer report fetch error:', err);
      toast.error(err.message || 'Failed to fetch report');
    } finally {
      setLoadingEngineerReport(false);
    }
  };

  const exportEngineerReportToExcel = async () => {
    try {
      setExportingEngineerReport(true);
      const XLSX = await import('xlsx');

      // Prepare worksheet data: add a header row
      const headers = [
        'Service Attended Date',
        'Customer',
        'Type of Visit',
        'Nature of Work',
        'Sub Nature of Work',
        'Engineer',
        'Ticket Number',
        'Convenience Charges'
      ];

      const rows = engineerReportRows.map((r) => ([
        r.serviceAttendedDate ? new Date(r.serviceAttendedDate).toISOString().replace('T', ' ').substring(0, 19) : '',
        r.customerName || '',
        r.typeOfVisit || '',
        r.natureOfWork || '',
        r.subNatureOfWork || '',
        r.serviceEngineerName || '',
        r.ticketNumber || '',
        Number(r.convenienceCharges || 0)
      ]));

      const summarySheetTitle = 'Engineer Summary';
      const detailsSheetTitle = 'Ticket Details';

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Summary sheet (per engineer + grand total)
      const summaryData = [
        ['Engineer', 'Total Amount'],
        ...engineerReportTotals.byEngineer.map(e => [e.engineerName, e.totalAmount]),
        [],
        ['Grand Total', engineerReportTotals.grandTotal]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, summarySheetTitle);

      // Details sheet
      const aoa = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      // Optional: Autosize columns
      const colWidths = headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));
      (ws as any)['!cols'] = colWidths;
      XLSX.utils.book_append_sheet(wb, ws, detailsSheetTitle);

      const filename = `engineer_payment_report_${reportMonth || new Date().toISOString().slice(0,7)}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast.success('Report exported to Excel');
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err.message || 'Failed to export');
    } finally {
      setExportingEngineerReport(false);
    }
  };

  // Enhanced dropdown handlers
  const scrollToSelectedItem = (dropdownType: 'customer' | 'engine' | 'address' | 'product' | 'assignee' | 'typeOfVisit' | 'typeOfService') => {
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

  const moveToNextField = (currentType: 'customer' | 'engine' | 'address' | 'product' | 'assignee' | 'typeOfVisit' | 'typeOfService') => {
    // Move to next field in the form sequence for Tab navigation
    switch (currentType) {
      case 'customer':
        setTimeout(() => {
          // Focus the engine input
          const engineInput = document.querySelector('input[placeholder="Search engine..."]') as HTMLInputElement;
          if (engineInput) {
            engineInput.focus();
          }
        }, 50);
        break;
      case 'engine':
        setTimeout(() => {
          // Focus the assignee input (skip address for now)
          const assigneeInput = document.querySelector('input[placeholder="Search technician..."]') as HTMLInputElement;
          if (assigneeInput) {
            assigneeInput.focus();
          }
        }, 50);
        break;
      case 'address':
        setTimeout(() => {
          // Focus the Service Request Type field
          const serviceRequestTypeInput = document.querySelector('input[placeholder="Enter service request type"]') as HTMLInputElement;
          if (serviceRequestTypeInput) {
            serviceRequestTypeInput.focus();
          }
        }, 50);
        break;
      case 'product':
        setTimeout(() => {
          // Focus the assignee input
          const assigneeInput = document.querySelector('input[placeholder="Search technician..."]') as HTMLInputElement;
          if (assigneeInput) {
            assigneeInput.focus();
          }
        }, 50);
        break;
      case 'assignee':
        setTimeout(() => {
          // Focus the scheduled date input
          scheduledDateRef.current?.focus();
        }, 50);
        break;
      case 'typeOfVisit':
        setTimeout(() => {
          // Focus the Type of Service field
          const typeOfServiceInput = document.querySelector('input[placeholder="Search type of service..."]') as HTMLInputElement;
          if (typeOfServiceInput) {
            typeOfServiceInput.focus();
          }
        }, 50);
        break;
      case 'typeOfService':
        setTimeout(() => {
          // Focus the Complaint Description textarea
          const complaintDescriptionTextarea = document.getElementById('complaint-description-textarea') as HTMLTextAreaElement;
          if (complaintDescriptionTextarea) {
            complaintDescriptionTextarea.focus();
          }
        }, 50);
        break;
    }
  };

  // Function to handle scheduled date navigation to address dropdown
  const moveFromScheduledDateToAddress = () => {
    setTimeout(() => {
      // Focus the address dropdown
      const addressInput = document.querySelector('input[placeholder="Search address..."]') as HTMLInputElement;
      if (addressInput) {
        addressInput.focus();
        // Open the address dropdown when focused
        setAddressDropdown(prev => ({ ...prev, isOpen: true }));
      }
    }, 50);
  };

  const handleDropdownKeyDown = (
    dropdownType: 'customer' | 'engine' | 'address' | 'product' | 'assignee' | 'typeOfVisit' | 'typeOfService',
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
          // Handle different object structures for different dropdown types
          let valueToSelect;
          if (dropdownType === 'address') {
            valueToSelect = selectedOption.fullAddress;
          } else if (dropdownType === 'engine') {
            valueToSelect = selectedOption.engineSerialNumber;
          } else {
            valueToSelect = selectedOption.value || selectedOption._id;
          }
          onSelect(valueToSelect);
          setDropdownState(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
          moveToNextDropdown(dropdownType);
        }
        break;
      case 'Tab':
        event.preventDefault();
        event.stopPropagation();
        // Close current dropdown
        setDropdownState(prev => ({ ...prev, isOpen: false }));
        // Move to next field in the form sequence
        moveToNextField(dropdownType);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        setDropdownState(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
        break;
    }
  };

  const getDropdownState = (type: 'customer' | 'engine' | 'address' | 'product' | 'assignee' | 'typeOfVisit' | 'typeOfService') => {
    switch (type) {
      case 'customer': return customerDropdown;
      case 'engine': return engineDropdown;
      case 'address': return addressDropdown;
      case 'product': return productDropdown;
      case 'assignee': return assigneeDropdown;
      case 'typeOfVisit': return typeOfVisitDropdown;
      case 'typeOfService': return typeOfServiceDropdown;
    }
  };

  const getSetDropdownState = (type: 'customer' | 'engine' | 'address' | 'product' | 'assignee' | 'typeOfVisit' | 'typeOfService') => {
    switch (type) {
      case 'customer': return setCustomerDropdown;
      case 'engine': return setEngineDropdown;
      case 'address': return setAddressDropdown;
      case 'product': return setProductDropdown;
      case 'assignee': return setAssigneeDropdown;
      case 'typeOfVisit': return setTypeOfVisitDropdown;
      case 'typeOfService': return setTypeOfServiceDropdown;
    }
  };

  const moveToNextDropdown = (currentType: 'customer' | 'engine' | 'address' | 'product' | 'assignee' | 'typeOfVisit' | 'typeOfService') => {
    // Close current dropdown
    const setCurrentDropdown = getSetDropdownState(currentType);
    setCurrentDropdown(prev => ({ ...prev, isOpen: false }));

    // Move to next field based on current type
    switch (currentType) {
      case 'customer':
        setTimeout(() => {
          // Open engine dropdown after customer selection
          setEngineDropdown(prev => ({ ...prev, isOpen: true }));
          // Focus the engine input
          const engineInput = document.querySelector('input[placeholder="Search engine..."]') as HTMLInputElement;
          if (engineInput) {
            engineInput.focus();
          }
        }, 50);
        break;
      case 'engine':
        setTimeout(() => {
          // Move to assignee dropdown after engine selection (skip address)
          setAssigneeDropdown(prev => ({ ...prev, isOpen: true }));
          // Focus the assignee input
          const assigneeInput = document.querySelector('input[placeholder="Search technician..."]') as HTMLInputElement;
          if (assigneeInput) {
            assigneeInput.focus();
          }
        }, 50);
        break;
      case 'address':
        setTimeout(() => {
          // Move to Service Request Type field after address selection
          const serviceRequestTypeInput = document.querySelector('input[placeholder="Enter service request type"]') as HTMLInputElement;
          if (serviceRequestTypeInput) {
            serviceRequestTypeInput.focus();
          }
        }, 100);
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
      case 'typeOfVisit':
        setTimeout(() => {
          // Move to Type of Service dropdown after Type of Visit selection
          setTypeOfServiceDropdown(prev => ({ ...prev, isOpen: true }));
          // Focus the Type of Service input
          const typeOfServiceInput = document.querySelector('input[placeholder="Search type of service..."]') as HTMLInputElement;
          if (typeOfServiceInput) {
            typeOfServiceInput.focus();
          }
        }, 50);
        break;
      case 'typeOfService':
        setTimeout(() => {
          // Move to Complaint Description after Type of Service selection
          const complaintDescriptionTextarea = document.getElementById('complaint-description-textarea') as HTMLTextAreaElement;
          if (complaintDescriptionTextarea) {
            complaintDescriptionTextarea.focus();
          }
        }, 50);
        break;
    }
  };

  const handleDropdownSearch = (
    type: 'customer' | 'engine' | 'address' | 'product' | 'assignee' | 'typeOfVisit' | 'typeOfService',
    searchTerm: string
  ) => {
    const setDropdownState = getSetDropdownState(type);

    // Get the original data based on type
    let originalOptions: any[] = [];
    switch (type) {
      case 'customer':
        originalOptions = customers;
        break;
      case 'engine':
        originalOptions = customerEngines;
        break;
      case 'address':
        originalOptions = customerAddresses;
        break;
      case 'product':
        originalOptions = products;
        break;
      case 'assignee':
        originalOptions = users;
        break;
      case 'typeOfVisit':
        originalOptions = typeOfVisitOptions;
        break;
      case 'typeOfService':
        originalOptions = typeOfServiceOptions;
        break;
    }

    // Filter from original data
    const filtered = originalOptions.filter((option: any) => {
      const searchText = searchTerm.toLowerCase();
      let optionText = '';
      
      // Handle different object structures for different dropdown types
      if (type === 'address') {
        optionText = (option.fullAddress || '').toLowerCase();
      } else if (type === 'engine') {
        optionText = (option.engineSerialNumber || '').toLowerCase();
        const partNumber = (option.engineModel || '').toLowerCase();
      return optionText.includes(searchText) || partNumber.includes(searchText);
      } else {
        optionText = (option.name || option.label || option.fullName || '').toLowerCase();
      }
      
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
    type: 'customer' | 'engine' | 'address' | 'product' | 'assignee' | 'typeOfVisit' | 'typeOfService'
  ) => {
    const setDropdownState = getSetDropdownState(type);

    // Get the original data based on type
    let originalOptions: any[] = [];
    switch (type) {
      case 'customer':
        originalOptions = customers;
        break;
      case 'engine':
        originalOptions = customerEngines;
        break;
      case 'address':
        originalOptions = customerAddresses;
        break;
      case 'product':
        originalOptions = products;
        break;
      case 'assignee':
        originalOptions = users;
        break;
      case 'typeOfVisit':
        originalOptions = typeOfVisitOptions;
        break;
      case 'typeOfService':
        originalOptions = typeOfServiceOptions;
        break;
    }

    // Reset dropdown to show all original options, but preserve existing search term if dropdown is already open
    setDropdownState(prev => ({
      ...prev,
      isOpen: true,
      searchTerm: prev.isOpen ? prev.searchTerm : '',
      filteredOptions: originalOptions,
      selectedIndex: 0
    }));
  };

  const handleDropdownSelect = (
    type: 'customer' | 'engine' | 'address' | 'product' | 'assignee' | 'typeOfVisit' | 'typeOfService',
    value: string
  ) => {
    const setDropdownState = getSetDropdownState(type);

    // Handle customer selection - fetch engines
    if (type === 'customer') {
      // Find the selected customer to get their type
      const selectedCustomer = customers.find(c => c._id === value);
      
      setTicketFormData(prev => ({
        ...prev,
        customer: value,
        engineSerialNumber: '', // Reset engine when customer changes
        engineModel: '', // Reset engine model when customer changes
        kva: '', // Reset KVA when customer changes
        businessVertical: selectedCustomer?.customerType || '', // Auto-populate with customer type
        selectedAddress: '' // New field for selected address
      }));
      
      // Fetch engines and addresses for this customer
      fetchCustomerData(value);
      
      // Clear error for this field when selected
      if (formErrors.customer) {
        setFormErrors(prev => ({ ...prev, customer: '' }));
      }
      
      // Close current dropdown
      setDropdownState(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
      
      // Move to next dropdown after selection
      moveToNextDropdown(type);
      return;
    }

    // Handle engine selection - auto-populate fields
    if (type === 'engine') {
      const selectedEngine = customerEngines.find(engine => engine.engineSerialNumber === value);

      
      if (selectedEngine) {
        setTicketFormData(prev => {
          const newData = {
            ...prev,
            engineSerialNumber: selectedEngine.engineSerialNumber,
            engineModel: selectedEngine.engineModel || '', // Auto-populate engine model
            kva: selectedEngine.kva || '', // Auto-populate KVA rating
            // Preserve the customer's businessVertical, don't override with engine's vertical
            businessVertical: prev.businessVertical || selectedEngine.businessVertical || ''
          };

          return newData;
        });
      }
      
      // Clear error for this field when selected
      if (formErrors.engineSerialNumber) {
        setFormErrors(prev => ({ ...prev, engineSerialNumber: '' }));
      }
      
      // Close current dropdown
      setDropdownState(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
      
      // Move to next dropdown after selection
      moveToNextDropdown(type);
      return;
    }

    // Handle address selection
    if (type === 'address') {
      setTicketFormData(prev => ({
        ...prev,
        selectedAddress: value
      }));
      
      // Clear error for this field when selected
      if (formErrors.selectedAddress) {
        setFormErrors(prev => ({ ...prev, selectedAddress: '' }));
      }
      
      // Close current dropdown
      setDropdownState(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
      
      // Move to Service Request Type field after selection
      setTimeout(() => {
        const serviceRequestTypeInput = document.querySelector('input[placeholder="Enter service request type"]') as HTMLInputElement;
        if (serviceRequestTypeInput) {
          serviceRequestTypeInput.focus();
        }
      }, 100);
      return;
    }

    // Handle Type of Visit selection
    if (type === 'typeOfVisit') {
      setTicketFormData(prev => ({
        ...prev,
        typeOfVisit: value as TypeOfVisit
      }));
      
      // Clear error for this field when selected
      if (formErrors.typeOfVisit) {
        setFormErrors(prev => ({ ...prev, typeOfVisit: '' }));
      }
      
      // Close current dropdown
      setDropdownState(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
      
      // Move to next dropdown after selection
      moveToNextDropdown(type);
      return;
    }

    // Handle Type of Service selection
    if (type === 'typeOfService') {
      setTicketFormData(prev => ({
        ...prev,
        typeOfService: value as TypeOfService
      }));
      
      // Clear error for this field when selected
      if (formErrors.typeOfService) {
        setFormErrors(prev => ({ ...prev, typeOfService: '' }));
      }
      
      // Close current dropdown
      setDropdownState(prev => ({ ...prev, isOpen: false, searchTerm: '' }));
      
      // Move to next field after selection
      moveToNextDropdown(type);
      return;
    }

    // For products, check if the selected product is in stock
    if (type === 'product') {
      const selectedProduct = products.find(p => p._id === value);
      if (selectedProduct && (selectedProduct.stockQuantity || 0) <= 0) {
        // Don't select out-of-stock products
        return;
      }
    }

    // Update form data for other types
    setTicketFormData(prev => ({
      ...prev,
      [type === 'product' ? 'product' : 'assignedTo']: value
    }));

    // Clear error for this field when selected
    const errorField = type === 'product' ? 'product' : 'assignedTo';
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
        setShowAssigneeDropdown(false);
        setShowReportEngineerDropdown(false);

        // Close enhanced dropdowns
        setCustomerDropdown(prev => ({ ...prev, isOpen: false }));
        setEngineDropdown(prev => ({ ...prev, isOpen: false }));
        setAddressDropdown(prev => ({ ...prev, isOpen: false }));
        setProductDropdown(prev => ({ ...prev, isOpen: false }));
        setAssigneeDropdown(prev => ({ ...prev, isOpen: false }));
        setTypeOfVisitDropdown(prev => ({ ...prev, isOpen: false }));
        setTypeOfServiceDropdown(prev => ({ ...prev, isOpen: false }));
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
            onClick={() => setShowEngineerReportModal(true)}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm">Payment Summary</span>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              className="flex items-center justify-between w-full px-2 py-1.5 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm h-8"
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
              className="flex items-center justify-between w-full px-2 py-1.5 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm h-8"
            >
              <span className="text-gray-700 truncate mr-1">{getAssigneeLabel(assigneeFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showAssigneeDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showAssigneeDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-80 overflow-y-auto">
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
        <div className="overflow-x-auto max-w-full">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Service Request Number
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Customer Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Customer Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Engine Serial Number
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Engine Model
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[80px]">
                  KVA
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Service Request Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Service Attended Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Hour Meter Reading
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[130px]">
                  Type of Service
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Site ID
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Service Engineer Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Complaint Code
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Complaint Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Resolution Description
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  eFSR Number
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                  eFSR Closure Date And Time
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Service Request Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  OEM Name
                </th>

                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={20} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <LoadingSpinner size="lg" />
                      <p className="text-gray-500 text-sm">Loading tickets...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={20} className="px-6 py-8 text-center text-gray-500">No tickets found</td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-blue-600">{ticket.ServiceRequestNumber || ticket.ticketNumber || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">{ticket.CustomerType || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900 max-w-[150px] truncate" title={ticket.CustomerName || getCustomerName(ticket.customer) || '-'}>
                        {ticket.CustomerName || getCustomerName(ticket.customer) || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">{ticket.EngineSerialNumber || ticket.engineSerialNumber || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">{ticket.EngineModel || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">{ticket.KVA || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">
                        {ticket.ServiceRequestDate ? formatDateTime(ticket.ServiceRequestDate) : (ticket.serviceRequiredDate ? formatDateTime(ticket.serviceRequiredDate) : '-')}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">
                        {ticket.ServiceAttendedDate ? formatDateTime(ticket.ServiceAttendedDate) : (ticket.ServiceRequestDate ? formatDateTime(ticket.ServiceRequestDate) : '-')}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">{ticket.HourMeterReading || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">{ticket.TypeofService || ticket.serviceRequestType || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">{ticket.SiteID || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">
                        {ticket.ServiceEngineerName && typeof ticket.ServiceEngineerName === 'object' && 'firstName' in ticket.ServiceEngineerName 
                          ? `${(ticket.ServiceEngineerName as any).firstName} ${(ticket.ServiceEngineerName as any).lastName}`
                          : getUserName(ticket.assignedTo) || '-'
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">{ticket.ComplaintCode || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900 max-w-[150px] truncate" title={ticket.ComplaintDescription || ticket.complaintDescription || '-'}>
                        {ticket.ComplaintDescription || ticket.complaintDescription || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900 max-w-[150px] truncate" title={ticket.ResolutionDescription || '-'}>
                        {ticket.ResolutionDescription || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">{ticket.eFSRNumber || '-'}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">
                        {ticket.eFSRClosureDateAndTime ? formatDateTime(ticket.eFSRClosureDateAndTime) : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-1">
                        <select
                          value={ticket.ServiceRequestStatus || ticket.status || 'open'}
                          onChange={(e) => handleServiceRequestStatusUpdate(ticket._id, e.target.value)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${getStatusColor((ticket.ServiceRequestStatus || ticket.status || 'open') as TicketStatus)}`}
                        >
                          <option value="open">Open</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900 max-w-[150px] truncate" title={ticket.OemName || '-'}>
                        {ticket.OemName || '-'}
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
                          className="p-1 rounded transition-colors text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50"
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

                {/* Enhanced Engine Dropdown */}
                <div className="relative dropdown-container" ref={engineDropdownRef} id="engine-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Engine Serial Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={engineDropdown.searchTerm || ticketFormData.engineSerialNumber || ''}
                      onChange={(e) => {
                        setEngineDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                        handleDropdownSearch('engine', e.target.value);
                        // Clear error when user starts typing
                        if (formErrors.engineSerialNumber) {
                          setFormErrors(prev => ({ ...prev, engineSerialNumber: '' }));
                        }
                      }}
                      onKeyDown={(e) => handleDropdownKeyDown('engine', e, engineDropdown.filteredOptions, (value) => handleDropdownSelect('engine', value))}
                      onFocus={() => handleDropdownFocus('engine')}
                      onBlur={() => {
                        // Delay closing to allow for clicks on dropdown items
                        setTimeout(() => {
                          setEngineDropdown(prev => ({ ...prev, isOpen: false }));
                        }, 200);
                      }}
                      placeholder="Search engine..."
                      className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.engineSerialNumber ? 'border-red-500' : 'border-gray-300'
                        } ${engineDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {engineDropdown.isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {engineDropdown.filteredOptions.length > 0 ? (
                        engineDropdown.filteredOptions.map((engine, index) => (
                          <button
                            key={engine.engineSerialNumber}
                            id={`engine-item-${index}`}
                            type="button"
                            onClick={() => handleDropdownSelect('engine', engine.engineSerialNumber)}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === engineDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                              }`}
                          >
                            <div className="font-medium">{engine.engineSerialNumber}</div>
                            <div className="text-xs text-gray-500">
                              {engine.engineModel && `Model: ${engine.engineModel}`}
                              {engine.kva && ` | KVA: ${engine.kva}`}
                              {engine.siteId && ` | Site: ${engine.siteId}`}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          {ticketFormData.customer ? 'No engines found for this customer' : 'Select a customer first'}
                        </div>
                      )}
                    </div>
                  )}
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
                        // Focus the address dropdown
                        moveFromScheduledDateToAddress();
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





              {/* Address Dropdown Row */}
              <div className="grid grid-cols-1 gap-4">
                {/* Enhanced Address Dropdown */}
                <div className="relative dropdown-container" ref={addressDropdownRef} id="address-dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Address
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={addressDropdown.searchTerm || ticketFormData.selectedAddress || ''}
                      onChange={(e) => {
                        setAddressDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                        handleDropdownSearch('address', e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          // Focus the Service Request Type field
                          const serviceRequestTypeInput = document.querySelector('input[placeholder="Enter service request type"]') as HTMLInputElement;
                          if (serviceRequestTypeInput) {
                            serviceRequestTypeInput.focus();
                          }
                        } else {
                          handleDropdownKeyDown('address', e, addressDropdown.filteredOptions, (value) => handleDropdownSelect('address', value));
                        }
                      }}
                      onFocus={() => {
                        handleDropdownFocus('address');
                        // Ensure the dropdown opens when focused
                        setAddressDropdown(prev => ({ ...prev, isOpen: true }));
                      }}
                      onBlur={() => {
                        // Delay closing to allow for clicks on dropdown items
                        setTimeout(() => {
                          setAddressDropdown(prev => ({ ...prev, isOpen: false }));
                        }, 200);
                      }}
                      placeholder="Search address..."
                      className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${addressDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}`}
                    />
                    <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {addressDropdown.isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                      {addressDropdown.filteredOptions.length > 0 ? (
                        addressDropdown.filteredOptions.map((address, index) => (
                          <button
                            key={address.id}
                            id={`address-item-${index}`}
                            type="button"
                            onClick={() => handleDropdownSelect('address', address.fullAddress)}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === addressDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                              }`}
                          >
                            <div className="font-medium">{address.fullAddress}</div>
                            <div className="text-xs text-gray-500">
                              {address.isPrimary && 'Primary Address'}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          {ticketFormData.customer ? 'No addresses found for this customer' : 'Select a customer first'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Service Request Details Section - Input Fields */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Service Request Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Service Request Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Request Type
                    </label>
                    <input
                      type="text"
                      value={ticketFormData.serviceRequestType}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, serviceRequestType: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          // Focus the Service Required Date field
                          const serviceRequiredDateInput = document.querySelector('input[placeholder="Select date and time"]') as HTMLInputElement;
                          if (serviceRequiredDateInput) {
                            serviceRequiredDateInput.focus();
                          }
                        }
                      }}
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
                          // Focus the Type of Visit input field
                          const typeOfVisitInput = document.querySelector('input[placeholder="Search type of visit..."]') as HTMLInputElement;
                          if (typeOfVisitInput) {
                            typeOfVisitInput.focus();
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
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      placeholder="Auto-populated from customer type"
                      readOnly
                    />
                  </div>

                  {/* Site Identifier */}


                  {/* Enhanced Type of Visit Dropdown */}
                  <div className="relative dropdown-container" ref={typeOfVisitDropdownRef} id="type-of-visit-dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Visit
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={typeOfVisitDropdown.searchTerm || (ticketFormData.typeOfVisit ? typeOfVisitOptions.find(opt => opt.value === ticketFormData.typeOfVisit)?.label || '' : '')}
                      onChange={(e) => {
                          setTypeOfVisitDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                          handleDropdownSearch('typeOfVisit', e.target.value);
                          // Clear error when user starts typing
                        if (formErrors.typeOfVisit) {
                          setFormErrors(prev => ({ ...prev, typeOfVisit: '' }));
                        }
                      }}
                        onKeyDown={(e) => handleDropdownKeyDown('typeOfVisit', e, typeOfVisitDropdown.filteredOptions, (value) => handleDropdownSelect('typeOfVisit', value))}
                        onFocus={() => handleDropdownFocus('typeOfVisit')}
                        onBlur={() => {
                          // Delay closing to allow for clicks on dropdown items
                          setTimeout(() => {
                            setTypeOfVisitDropdown(prev => ({ ...prev, isOpen: false }));
                          }, 200);
                        }}
                        placeholder="Search type of visit..."
                        className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.typeOfVisit ? 'border-red-500' : 'border-gray-300'
                          } ${typeOfVisitDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      />
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {typeOfVisitDropdown.isOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {typeOfVisitDropdown.filteredOptions.length > 0 ? (
                          typeOfVisitDropdown.filteredOptions.map((option, index) => (
                            <button
                              key={option.value}
                              id={`type-of-visit-item-${index}`}
                              type="button"
                              onClick={() => handleDropdownSelect('typeOfVisit', option.value)}
                              className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === typeOfVisitDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                                }`}
                            >
                              <div className="font-medium">{option.label}</div>
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



                  {/* Enhanced Type of Service Dropdown */}
                  <div className="relative dropdown-container" ref={typeOfServiceDropdownRef} id="type-of-service-dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Service
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={typeOfServiceDropdown.searchTerm || (ticketFormData.typeOfService ? typeOfServiceOptions.find(opt => opt.value === ticketFormData.typeOfService)?.label || '' : '')}
                      onChange={(e) => {
                          setTypeOfServiceDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                          handleDropdownSearch('typeOfService', e.target.value);
                          // Clear error when user starts typing
                        if (formErrors.typeOfService) {
                          setFormErrors(prev => ({ ...prev, typeOfService: '' }));
                        }
                      }}
                        onKeyDown={(e) => handleDropdownKeyDown('typeOfService', e, typeOfServiceDropdown.filteredOptions, (value) => handleDropdownSelect('typeOfService', value))}
                        onFocus={() => handleDropdownFocus('typeOfService')}
                        onBlur={() => {
                          // Delay closing to allow for clicks on dropdown items
                          setTimeout(() => {
                            setTypeOfServiceDropdown(prev => ({ ...prev, isOpen: false }));
                          }, 200);
                        }}
                        placeholder="Search type of service..."
                        className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.typeOfService ? 'border-red-500' : 'border-gray-300'
                          } ${typeOfServiceDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      />
                      <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {typeOfServiceDropdown.isOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {typeOfServiceDropdown.filteredOptions.length > 0 ? (
                          typeOfServiceDropdown.filteredOptions.map((option, index) => (
                            <button
                              key={option.value}
                              id={`type-of-service-item-${index}`}
                              type="button"
                              onClick={() => handleDropdownSelect('typeOfService', option.value)}
                              className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === typeOfServiceDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                                }`}
                            >
                              <div className="font-medium">{option.label}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">No options found</div>
                        )}
                      </div>
                    )}
                    {formErrors.typeOfService && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.typeOfService}</p>
                    )}
                  </div>

                  {/* Complaint Description */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Complaint Description
                    </label>
                    <textarea
                      id="complaint-description-textarea"
                      value={ticketFormData.complaintDescription || ''}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, complaintDescription: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Tab' && !e.shiftKey) {
                          e.preventDefault();
                          e.stopPropagation();
                          // Move to next field
                          const nextField = document.getElementById('create-ticket-button') as HTMLButtonElement;
                          if (nextField) {
                            nextField.focus();
                          }
                        }
                      }}
                      rows={3}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Enter complaint description..."
                    />
                  </div>



                </div>
              </div>

              {/* Selected Data Display Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Data</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Selected Address */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selected Address
                    </label>
                    <input
                      type="text"
                      value={ticketFormData.selectedAddress || 'No address selected'}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      readOnly
                    />
                  </div>

                  {/* Engine Model */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Engine Model
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        const selectedEngine = customerEngines.find(engine => engine.engineSerialNumber === ticketFormData.engineSerialNumber);
                        return selectedEngine?.engineModel || 'No engine selected';
                      })()}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      readOnly
                    />
                  </div>

                  {/* KVA Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      KVA Rating
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        const selectedEngine = customerEngines.find(engine => engine.engineSerialNumber === ticketFormData.engineSerialNumber);
                        return selectedEngine?.kva ? `${selectedEngine.kva} KVA` : 'No engine selected';
                      })()}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      readOnly
                    />
                  </div>

                  {/* DG Make */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DG Make
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        const selectedEngine = customerEngines.find(engine => engine.engineSerialNumber === ticketFormData.engineSerialNumber);
                        return selectedEngine?.dgMake || 'No engine selected';
                      })()}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      readOnly
                    />
                  </div>

                  {/* DG Serial Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      DG Serial Number
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        const selectedEngine = customerEngines.find(engine => engine.engineSerialNumber === ticketFormData.engineSerialNumber);
                        return selectedEngine?.dgSerialNumber || 'No engine selected';
                      })()}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      readOnly
                    />
                  </div>

                  {/* Alternator Make */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Alternator Make
                    </label>
                    <input
                      type="text"
                      value={(() => {
                        const selectedEngine = customerEngines.find(engine => engine.engineSerialNumber === ticketFormData.engineSerialNumber);
                        return selectedEngine?.alternatorMake || 'No engine selected';
                      })()}
                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      readOnly
                    />
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
                  id="create-ticket-button"
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl m-4 max-h-[90vh] overflow-y-auto">
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

              {/* Main Form Layout - Two Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Customer Dropdown */}
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
                          if (formErrors.customer) {
                            setFormErrors(prev => ({ ...prev, customer: '' }));
                          }
                        }}
                        onKeyDown={(e) => handleDropdownKeyDown('customer', e, customerDropdown.filteredOptions, (value) => handleDropdownSelect('customer', value))}
                        onFocus={() => handleDropdownFocus('customer')}
                        onBlur={() => {
                          setTimeout(() => {
                            setCustomerDropdown(prev => ({ ...prev, isOpen: false }));
                          }, 200);
                        }}
                        placeholder="Search customer..."
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.customer ? 'border-red-500' : 'border-gray-300'
                          } ${customerDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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

                  {/* Assign To Dropdown */}
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
                          if (formErrors.assignedTo) {
                            setFormErrors(prev => ({ ...prev, assignedTo: '' }));
                          }
                        }}
                        onKeyDown={(e) => handleDropdownKeyDown('assignee', e, assigneeDropdown.filteredOptions, (value) => handleDropdownSelect('assignee', value))}
                        onFocus={() => handleDropdownFocus('assignee')}
                        onBlur={() => {
                          setTimeout(() => {
                            setAssigneeDropdown(prev => ({ ...prev, isOpen: false }));
                          }, 200);
                        }}
                        placeholder="Search technician..."
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.assignedTo ? 'border-red-500' : 'border-gray-300'
                          } ${assigneeDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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

                  {/* Service Request Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Request Type
                    </label>
                    <input
                      type="text"
                      value={ticketFormData.serviceRequestType}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, serviceRequestType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter service request type"
                    />
                  </div>

                  {/* Vertical */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vertical
                    </label>
                    <input
                      type="text"
                      value={ticketFormData.businessVertical}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, businessVertical: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      placeholder="Auto-populated from customer type"
                      readOnly
                    />
                  </div>

                  {/* Type of Visit */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Visit
                    </label>
                    <select
                      value={ticketFormData.typeOfVisit}
                      onChange={(e) => {
                        setTicketFormData({ ...ticketFormData, typeOfVisit: e.target.value as TypeOfVisit });
                        if (formErrors.typeOfVisit) {
                          setFormErrors(prev => ({ ...prev, typeOfVisit: '' }));
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.typeOfVisit ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Select Type of Visit</option>
                      {typeOfVisitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.typeOfVisit && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.typeOfVisit}</p>
                    )}
                  </div>

                  {/* Complaint Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Complaint Description
                    </label>
                    <textarea
                      value={ticketFormData.complaintDescription || ''}
                      onChange={(e) => setTicketFormData({ ...ticketFormData, complaintDescription: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Enter complaint description..."
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Engine Serial Number */}
                  <div className="relative dropdown-container" ref={engineDropdownRef} id="engine-dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Engine Serial Number
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={engineDropdown.searchTerm || ticketFormData.engineSerialNumber || ''}
                        onChange={(e) => {
                          setEngineDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                          handleDropdownSearch('engine', e.target.value);
                          if (formErrors.engineSerialNumber) {
                            setFormErrors(prev => ({ ...prev, engineSerialNumber: '' }));
                          }
                        }}
                        onKeyDown={(e) => handleDropdownKeyDown('engine', e, engineDropdown.filteredOptions, (value) => handleDropdownSelect('engine', value))}
                        onFocus={() => handleDropdownFocus('engine')}
                        onBlur={() => {
                          setTimeout(() => {
                            setEngineDropdown(prev => ({ ...prev, isOpen: false }));
                          }, 200);
                        }}
                        placeholder="Search engine..."
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.engineSerialNumber ? 'border-red-500' : 'border-gray-300'
                          } ${engineDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>

                    {engineDropdown.isOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                        {engineDropdown.filteredOptions.length > 0 ? (
                          engineDropdown.filteredOptions.map((engine, index) => (
                            <button
                              key={engine.engineSerialNumber}
                              id={`engine-item-${index}`}
                              type="button"
                              onClick={() => handleDropdownSelect('engine', engine.engineSerialNumber)}
                              className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${index === engineDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                                }`}
                            >
                              <div className="font-medium">{engine.engineSerialNumber}</div>
                              <div className="text-xs text-gray-500">
                                {engine.engineModel && `Model: ${engine.engineModel}`}
                                {engine.kva && ` | KVA: ${engine.kva}`}
                                {engine.siteId && ` | Site: ${engine.siteId}`}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            {ticketFormData.customer ? 'No engines found for this customer' : 'Select a customer first'}
                          </div>
                        )}
                      </div>
                    )}
                    {formErrors.engineSerialNumber && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.engineSerialNumber}</p>
                    )}
                  </div>

                  {/* Scheduled Date */}
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
                        (e.target as HTMLInputElement).showPicker?.();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).showPicker?.();
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Select date and time"
                    />
                  </div>

                  {/* Type of Service */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Service
                    </label>
                    <select
                      value={ticketFormData.typeOfService}
                      onChange={(e) => {
                        setTicketFormData({ ...ticketFormData, typeOfService: e.target.value as TypeOfService });
                        if (formErrors.typeOfService) {
                          setFormErrors(prev => ({ ...prev, typeOfService: '' }));
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.typeOfService ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Select Type of Service</option>
                      {typeOfServiceOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.typeOfService && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.typeOfService}</p>
                    )}
                  </div>
                </div>
              </div>



              {/* Footer Buttons */}
              <div className="flex space-x-3 pt-6 border-t border-gray-200">
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
              {/* Service Request Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Service Request Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Service Request Number</p>
                    <p className="text-lg font-bold text-blue-900">{selectedTicket.ServiceRequestNumber || selectedTicket.ticketNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Customer Type</p>
                    <p className="text-lg font-semibold text-blue-900">{selectedTicket.CustomerType || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Type of Service</p>
                    <p className="text-lg font-semibold text-blue-900">{selectedTicket.TypeofService || selectedTicket.serviceRequestType || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Site ID</p>
                    <p className="text-lg font-semibold text-blue-900">{selectedTicket.SiteID || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Engine Information */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                  <Wrench className="w-5 h-5 mr-2" />
                  Engine Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Engine Serial Number</p>
                    <p className="text-lg font-semibold text-green-900">{selectedTicket.EngineSerialNumber || selectedTicket.engineSerialNumber || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Engine Model</p>
                    <p className="text-lg font-semibold text-green-900">{selectedTicket.EngineModel || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide">KVA Rating</p>
                    <p className="text-lg font-semibold text-green-900">{selectedTicket.KVA || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Hour Meter Reading</p>
                    <p className="text-lg font-semibold text-green-900">{selectedTicket.HourMeterReading || 'Not specified'}</p>
                  </div>
                </div>
              </div>

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

                {/* Service Engineer Information */}
                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-purple-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Service Engineer Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-600">Assigned Engineer</p>
                      <p className="font-medium text-purple-900">
                        {selectedTicket.ServiceEngineerName && typeof selectedTicket.ServiceEngineerName === 'object' && 'firstName' in selectedTicket.ServiceEngineerName 
                          ? `${(selectedTicket.ServiceEngineerName as any).firstName} ${(selectedTicket.ServiceEngineerName as any).lastName}`
                          : getUserName(selectedTicket.assignedTo) || getUserName(selectedTicket.serviceRequestEngineer) || 'Unassigned'
                        }
                      </p>
                    </div>
                    {selectedTicket.ServiceEngineerName && typeof selectedTicket.ServiceEngineerName === 'object' && (selectedTicket.ServiceEngineerName as any).email && (
                      <div>
                        <p className="text-xs text-gray-600">Engineer Email</p>
                        <p className="font-medium text-purple-900">{(selectedTicket.ServiceEngineerName as any).email}</p>
                      </div>
                    )}
                    {selectedTicket.ServiceEngineerName && typeof selectedTicket.ServiceEngineerName === 'object' && (selectedTicket.ServiceEngineerName as any).phone && (
                      <div>
                        <p className="text-xs text-gray-600">Engineer Phone</p>
                        <p className="font-medium text-purple-900">{(selectedTicket.ServiceEngineerName as any).phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ticket Status */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Service Request Status & Priority
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-600">Service Request Status</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor((selectedTicket.ServiceRequestStatus || selectedTicket.status) as TicketStatus)}`}>
                        {(selectedTicket.ServiceRequestStatus || selectedTicket.status || 'open').replace('_', ' ').charAt(0).toUpperCase() + (selectedTicket.ServiceRequestStatus || selectedTicket.status || 'open').replace('_', ' ').slice(1)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">OEM Name</p>
                      <p className="font-medium">{selectedTicket.OemName || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline Information */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  Timeline Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Created</p>
                    <p className="text-lg font-semibold text-indigo-900">{formatDateTime(selectedTicket.createdAt)}</p>
                  </div>
                  {selectedTicket.ServiceRequestDate && (
                    <div>
                      <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Service Request Date</p>
                      <p className="text-lg font-semibold text-indigo-900">{formatDateTime(selectedTicket.ServiceRequestDate)}</p>
                    </div>
                  )}
                  {selectedTicket.ServiceAttendedDate && (
                    <div>
                      <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Service Attended Date</p>
                      <p className="text-lg font-semibold text-indigo-900">{formatDateTime(selectedTicket.ServiceAttendedDate)}</p>
                    </div>
                  )}
                  {selectedTicket.scheduledDate && (
                    <div>
                      <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Scheduled</p>
                      <p className="text-lg font-semibold text-indigo-900">{formatDateTime(selectedTicket.scheduledDate)}</p>
                    </div>
                  )}
                  {selectedTicket.completedDate && (
                    <div>
                      <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Completed</p>
                      <p className="text-lg font-semibold text-indigo-900">{formatDateTime(selectedTicket.completedDate)}</p>
                    </div>
                  )}
                  {selectedTicket.eFSRClosureDateAndTime && (
                    <div>
                      <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">eFSR Closure Date</p>
                      <p className="text-lg font-semibold text-indigo-900">{formatDateTime(selectedTicket.eFSRClosureDateAndTime)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Complaint & Resolution Details */}
              {(selectedTicket.ComplaintDescription || selectedTicket.ResolutionDescription || selectedTicket.ComplaintCode || selectedTicket.eFSRNumber) && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-orange-900 mb-3 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Complaint & Resolution Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {selectedTicket.ComplaintCode && (
                      <div>
                        <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">Complaint Code</p>
                        <p className="text-lg font-semibold text-orange-900">{selectedTicket.ComplaintCode}</p>
                      </div>
                    )}
                    {selectedTicket.eFSRNumber && (
                      <div>
                        <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">eFSR Number</p>
                        <p className="text-lg font-semibold text-orange-900">{selectedTicket.eFSRNumber}</p>
                      </div>
                    )}
                    {selectedTicket.ComplaintDescription && (
                      <div className="md:col-span-2 lg:col-span-4">
                        <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">Complaint Description</p>
                        <p className="text-lg font-semibold text-orange-900">{selectedTicket.ComplaintDescription}</p>
                      </div>
                    )}
                    {selectedTicket.ResolutionDescription && (
                      <div className="md:col-span-2 lg:col-span-4">
                        <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">Resolution Description</p>
                        <p className="text-lg font-semibold text-orange-900">{selectedTicket.ResolutionDescription}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Visit Details */}
              <div className="transition-all duration-500 ease-in-out bg-green-50 border-2 border-green-300 rounded-lg p-4 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium flex items-center transition-colors duration-500 text-green-800">
                    <MapPin className="w-5 h-5 mr-2 transition-colors duration-500 text-green-600" />
                    Visit Details
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Active
                    </span>
                  </h3>
                  {!isEditingVisitDetails ? (
                    <button
                      onClick={startEditingVisitDetails}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                    >
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleVisitDetailsUpdate}
                        disabled={updatingVisitDetails}
                        className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors flex items-center space-x-1"
                      >
                        {updatingVisitDetails ? (
                          <>
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={cancelEditingVisitDetails}
                        disabled={updatingVisitDetails}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Visit
                    </label>
                    {isEditingVisitDetails ? (
                      <select
                        value={editableVisitDetails.typeOfVisit}
                        onChange={(e) => setEditableVisitDetails(prev => ({ ...prev, typeOfVisit: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Type of Visit</option>
                        {typeOfVisitOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-medium transition-colors duration-500 text-green-700">
                        {selectedTicket.typeOfVisit ? typeOfVisitOptions.find(opt => opt.value === selectedTicket.typeOfVisit)?.label : 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nature of Work
                    </label>
                    {isEditingVisitDetails ? (
                      <select
                        value={editableVisitDetails.natureOfWork}
                        onChange={(e) => setEditableVisitDetails(prev => ({ ...prev, natureOfWork: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Nature of Work</option>
                        {natureOfWorkOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-medium transition-colors duration-500 text-green-700">
                        {selectedTicket.natureOfWork ? natureOfWorkOptions.find(opt => opt.value === selectedTicket.natureOfWork)?.label : 'Not specified'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sub Nature of Work
                    </label>
                    {isEditingVisitDetails ? (
                      <select
                        value={editableVisitDetails.subNatureOfWork}
                        onChange={(e) => setEditableVisitDetails(prev => ({ ...prev, subNatureOfWork: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Sub Nature of Work</option>
                        {subNatureOfWorkOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="font-medium transition-colors duration-500 text-green-700">
                        {selectedTicket.subNatureOfWork ? subNatureOfWorkOptions.find(opt => opt.value === selectedTicket.subNatureOfWork)?.label : 'Not specified'}
                      </p>
                    )}
                  </div>

                  {/* Complaint Description - Available for all tickets */}
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Complaint Description
                    </label>
                    {isEditingVisitDetails ? (
                      <textarea
                        value={editableVisitDetails.complaintDescription}
                        onChange={(e) => setEditableVisitDetails(prev => ({ ...prev, complaintDescription: e.target.value }))}
                        rows={3}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        placeholder="Enter complaint description..."
                      />
                    ) : (
                      <p className="font-medium transition-colors duration-500 text-green-700">
                        {selectedTicket.complaintDescription || selectedTicket.ComplaintDescription || 'No complaint description provided'}
                      </p>
                    )}
                  </div>

                  {/* Convenience Charges - Available for all tickets */}
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Convenience Charges
                    </label>
                    {isEditingVisitDetails ? (
                      <input
                        type="text"
                        value={editableVisitDetails.convenienceCharges}
                        onChange={(e) => setEditableVisitDetails(prev => ({ ...prev, convenienceCharges: e.target.value }))}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter convenience charges..."
                      />
                    ) : (
                      <p className="font-medium transition-colors duration-500 text-green-700">
                        {selectedTicket.convenienceCharges || 'No convenience charges specified'}
                      </p>
                    )}
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
                  Update Service Request Status
                </h3>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">Current Service Request Status:</span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor((selectedTicket.ServiceRequestStatus || selectedTicket.status) as TicketStatus)}`}>
                    {(selectedTicket.ServiceRequestStatus || selectedTicket.status || 'open').replace('_', ' ').charAt(0).toUpperCase() + (selectedTicket.ServiceRequestStatus || selectedTicket.status || 'open').replace('_', ' ').slice(1)}
                  </span>
                  <span className="text-sm text-gray-600">→</span>
                  <div className="flex items-center space-x-2">
                    <select
                      value={selectedTicket.ServiceRequestStatus || selectedTicket.status || 'open'}
                      onChange={(e) => handleServiceRequestStatusUpdate(selectedTicket._id, e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>

                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
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

      {/* Excel Edit Ticket Modal */}
      {showExcelEditModal && editingTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl m-4 max-h-[95vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit Excel Service Ticket</h2>
                <p className="text-sm text-gray-600">Editing ticket uploaded via Excel - All fields available</p>
              </div>
              <button
                onClick={() => {
                  setShowExcelEditModal(false);
                  setEditingTicket(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdateTicket(); }} className="p-6 space-y-6">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm font-medium">Excel Ticket: {editingTicket.ServiceRequestNumber || editingTicket.ticketNumber}</p>
                <p className="text-blue-600 text-xs">This ticket was uploaded via Excel and has extended field support</p>
              </div>

              {/* Excel Fields Section */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  Excel Service Request Fields
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Service Request Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Request Number
                    </label>
                    <input
                      type="text"
                      value={excelFormData.ServiceRequestNumber}
                      onChange={(e) => setExcelFormData({ ...excelFormData, ServiceRequestNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter service request number"
                    />
                  </div>

                  {/* Customer Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Type
                    </label>
                    <input
                      type="text"
                      value={excelFormData.CustomerType}
                      onChange={(e) => setExcelFormData({ ...excelFormData, CustomerType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter customer type"
                    />
                  </div>

                  {/* Customer Name */}
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={customerSearchTerm || excelFormData.CustomerName}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        onFocus={() => {
                          // Show dropdown options when focused
                          const dropdown = document.getElementById('excel-customer-dropdown');
                          if (dropdown) dropdown.classList.remove('hidden');
                          // Clear search term to show all customers
                          setCustomerSearchTerm('');
                        }}
                        onBlur={() => {
                          // Hide dropdown after a delay to allow clicks
                          setTimeout(() => {
                            const dropdown = document.getElementById('excel-customer-dropdown');
                            if (dropdown) dropdown.classList.add('hidden');
                          }, 200);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="Search customer..."
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    
                    {/* Dropdown Options */}
                    <div 
                      id="excel-customer-dropdown"
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto hidden"
                    >
                      {customers
                        .filter(customer => 
                          customerSearchTerm === '' || 
                          customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
                        )
                        .map((customer) => (
                          <button
                            key={customer._id}
                            type="button"
                            onClick={() => {
                              setExcelFormData({ 
                                ...excelFormData, 
                                CustomerName: customer.name,
                                CustomerId: customer._id 
                              });
                              setCustomerSearchTerm('');
                              document.getElementById('excel-customer-dropdown')?.classList.add('hidden');
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-gray-700"
                          >
                            <div className="font-medium">{customer.name}</div>
                            {customer.email && (
                              <div className="text-xs text-gray-500">{customer.email}</div>
                            )}
                          </button>
                        ))}
                      {customers.filter(customer => 
                        customerSearchTerm === '' || 
                        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-gray-500 text-sm">No customers found</div>
                      )}
                    </div>
                  </div>

                  {/* Engine Serial Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Engine Serial Number
                    </label>
                    <input
                      type="text"
                      value={excelFormData.EngineSerialNumber}
                      onChange={(e) => setExcelFormData({ ...excelFormData, EngineSerialNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter engine serial number"
                    />
                  </div>

                  {/* Engine Model */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Engine Model
                    </label>
                    <input
                      type="text"
                      value={excelFormData.EngineModel}
                      onChange={(e) => setExcelFormData({ ...excelFormData, EngineModel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter engine model"
                    />
                  </div>

                  {/* KVA Rating */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      KVA Rating
                    </label>
                    <input
                      type="text"
                      value={excelFormData.KVA}
                      onChange={(e) => setExcelFormData({ ...excelFormData, KVA: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter KVA rating"
                    />
                  </div>

                  {/* Service Request Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Request Date
                    </label>
                    <input
                      type="datetime-local"
                      value={excelFormData.ServiceRequestDate ? new Date(excelFormData.ServiceRequestDate).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setExcelFormData({ ...excelFormData, ServiceRequestDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Select date and time"
                    />
                  </div>

                  {/* Service Attended Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Attended Date
                    </label>
                    <input
                      type="datetime-local"
                      value={excelFormData.ServiceAttendedDate ? new Date(excelFormData.ServiceAttendedDate).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setExcelFormData({ ...excelFormData, ServiceAttendedDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Select date and time"
                    />
                  </div>

                  {/* Hour Meter Reading */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hour Meter Reading
                    </label>
                    <input
                      type="text"
                      value={excelFormData.HourMeterReading}
                      onChange={(e) => setExcelFormData({ ...excelFormData, HourMeterReading: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter hour meter reading"
                    />
                  </div>

                  {/* Type of Service */}
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type of Service
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={serviceTypeSearchTerm || excelFormData.TypeofService}
                        onChange={(e) => setServiceTypeSearchTerm(e.target.value)}
                        onFocus={() => {
                          // Show dropdown options when focused
                          const dropdown = document.getElementById('excel-service-type-dropdown');
                          if (dropdown) dropdown.classList.remove('hidden');
                          // Clear search term to show all service types
                          setServiceTypeSearchTerm('');
                        }}
                        onBlur={() => {
                          // Hide dropdown after a delay to allow clicks
                          setTimeout(() => {
                            const dropdown = document.getElementById('excel-service-type-dropdown');
                            if (dropdown) dropdown.classList.add('hidden');
                          }, 200);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="Search type of service..."
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    
                    {/* Dropdown Options */}
                    <div 
                      id="excel-service-type-dropdown"
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto hidden"
                    >
                      {typeOfServiceOptions
                        .filter(option => 
                          serviceTypeSearchTerm === '' || 
                          option.label.toLowerCase().includes(serviceTypeSearchTerm.toLowerCase())
                        )
                        .map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setExcelFormData({ ...excelFormData, TypeofService: option.label });
                              setServiceTypeSearchTerm('');
                              document.getElementById('excel-service-type-dropdown')?.classList.add('hidden');
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-gray-700"
                          >
                            <div className="font-medium">{option.label}</div>
                          </button>
                        ))}
                      {typeOfServiceOptions.filter(option => 
                        serviceTypeSearchTerm === '' || 
                        option.label.toLowerCase().includes(serviceTypeSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-gray-500 text-sm">No service types found</div>
                      )}
                    </div>
                  </div>

                  {/* Site ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Site ID
                    </label>
                    <input
                      type="text"
                      value={excelFormData.SiteID}
                      onChange={(e) => setExcelFormData({ ...excelFormData, SiteID: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter site ID"
                    />
                  </div>

                  {/* Service Engineer Name */}
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Engineer Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={engineerSearchTerm || excelFormData.SREngineer}
                        onChange={(e) => setEngineerSearchTerm(e.target.value)}
                        onFocus={() => {
                          // Show dropdown options when focused
                          const dropdown = document.getElementById('excel-engineer-dropdown');
                          if (dropdown) dropdown.classList.remove('hidden');
                          // Clear search term to show all engineers
                          setEngineerSearchTerm('');
                        }}
                        onBlur={() => {
                          // Hide dropdown after a delay to allow clicks
                          setTimeout(() => {
                            const dropdown = document.getElementById('excel-engineer-dropdown');
                            if (dropdown) dropdown.classList.add('hidden');
                          }, 200);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="Search service engineer..."
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    
                    {/* Dropdown Options */}
                    <div 
                      id="excel-engineer-dropdown"
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto hidden"
                    >
                      {users
                        .filter(user => 
                          engineerSearchTerm === '' || 
                          getUserName(user).toLowerCase().includes(engineerSearchTerm.toLowerCase())
                        )
                        .map((user) => (
                          <button
                            key={user._id}
                            type="button"
                            onClick={() => {
                              setExcelFormData({ 
                                ...excelFormData, 
                                SREngineer: getUserName(user),
                                SREngineerId: user._id 
                              });
                              setEngineerSearchTerm('');
                              document.getElementById('excel-engineer-dropdown')?.classList.add('hidden');
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-gray-700"
                          >
                            <div className="font-medium">{getUserName(user)}</div>
                            {user.email && (
                              <div className="text-xs text-gray-500">{user.email}</div>
                            )}
                          </button>
                        ))}
                      {users.filter(user => 
                        engineerSearchTerm === '' || 
                        getUserName(user).toLowerCase().includes(engineerSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-gray-500 text-sm">No service engineers found</div>
                      )}
                    </div>
                  </div>

                  {/* Complaint Code */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Complaint Code
                    </label>
                    <input
                      type="text"
                      value={excelFormData.ComplaintCode}
                      onChange={(e) => setExcelFormData({ ...excelFormData, ComplaintCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter complaint code"
                    />
                  </div>

                  {/* Complaint Description */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Complaint Description
                    </label>
                    <textarea
                      value={excelFormData.ComplaintDescription}
                      onChange={(e) => setExcelFormData({ ...excelFormData, ComplaintDescription: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Enter complaint description"
                    />
                  </div>

                  {/* Resolution Description */}
                  <div className="md:col-span-2 lg:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Resolution Description
                    </label>
                    <textarea
                      value={excelFormData.ResolutionDescription}
                      onChange={(e) => setExcelFormData({ ...excelFormData, ResolutionDescription: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Enter resolution description"
                    />
                  </div>

                  {/* eFSR Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      eFSR Number
                    </label>
                    <input
                      type="text"
                      value={excelFormData.eFSRNumber}
                      onChange={(e) => setExcelFormData({ ...excelFormData, eFSRNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter eFSR number"
                    />
                  </div>

                  {/* eFSR Closure Date and Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      eFSR Closure Date and Time
                    </label>
                    <input
                      type="datetime-local"
                      value={excelFormData.eFSRClosureDateAndTime ? new Date(excelFormData.eFSRClosureDateAndTime).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setExcelFormData({ ...excelFormData, eFSRClosureDateAndTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Select date and time"
                    />
                  </div>

                  {/* Service Request Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Request Status
                    </label>
                    <select
                      value={excelFormData.ServiceRequestStatus}
                      onChange={(e) => setExcelFormData({ ...excelFormData, ServiceRequestStatus: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="open">Open</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  {/* OEM Name */}
                  <div className="relative dropdown-container">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OEM Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={oemSearchTerm || excelFormData.OEMName}
                        onChange={(e) => setOemSearchTerm(e.target.value)}
                        onFocus={() => {
                          // Show dropdown options when focused
                          const dropdown = document.getElementById('excel-oem-dropdown');
                          if (dropdown) dropdown.classList.remove('hidden');
                          // Clear search term to show all OEMs
                          setOemSearchTerm('');
                        }}
                        onBlur={() => {
                          // Hide dropdown after a delay to allow clicks
                          setTimeout(() => {
                            const dropdown = document.getElementById('excel-oem-dropdown');
                            if (dropdown) dropdown.classList.add('hidden');
                          }, 200);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        placeholder="Search OEM..."
                      />
                      <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    </div>
                    
                    {/* Dropdown Options */}
                    <div 
                      id="excel-oem-dropdown"
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto hidden"
                    >
                      {oems
                        .filter(option => 
                          oemSearchTerm === '' || 
                          option.label.toLowerCase().includes(oemSearchTerm.toLowerCase())
                        )
                        .map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setExcelFormData({ ...excelFormData, OEMName: option.label });
                              setOemSearchTerm('');
                              document.getElementById('excel-oem-dropdown')?.classList.add('hidden');
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-gray-700"
                          >
                            <div className="font-medium">{option.label}</div>
                          </button>
                        ))}
                      {oems.filter(option => 
                        oemSearchTerm === '' || 
                        option.label.toLowerCase().includes(oemSearchTerm.toLowerCase())
                      ).length === 0 && (
                        <div className="px-3 py-2 text-gray-500 text-sm">No OEMs found</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowExcelEditModal(false);
                    setEditingTicket(null);
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
                      <span>Updating Excel Ticket...</span>
                    </>
                  ) : (
                    'Update Excel Ticket'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Engineer Payment Report Modal */}
      {showEngineerReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">Engineer Payment Report</h2>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => { void exportEngineerReportToExcel(); }}
                  disabled={exportingEngineerReport || engineerReportRows.length === 0}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-1"
                  title="Export to Excel"
                >
                  <Download className="w-4 h-4" />
                  <span>{exportingEngineerReport ? 'Exporting...' : 'Export Excel'}</span>
                </button>
                <button onClick={() => setShowEngineerReportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Report Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Month</label>
                  <input
                    type="month"
                    value={reportMonth}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReportMonth(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Engineer</label>
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => setShowReportEngineerDropdown(!showReportEngineerDropdown)}
                      className="flex items-center justify-between w-full px-2.5 py-1.5 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm"
                    >
                      <span className="text-gray-700 truncate mr-1">{getReportEngineerLabel(reportEngineerId)}</span>
                      <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showReportEngineerDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showReportEngineerDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-80 overflow-y-auto">
                        <button
                          onClick={() => {
                            setReportEngineerId('');
                            setShowReportEngineerDropdown(false);
                          }}
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${!reportEngineerId ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                        >
                          All Engineers
                        </button>
                        {users
                          .slice()
                          .sort((a, b) => getUserName(a).localeCompare(getUserName(b)))
                          .map(user => (
                            <button
                              key={user._id}
                              onClick={() => {
                                setReportEngineerId(user._id);
                                setShowReportEngineerDropdown(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${reportEngineerId === user._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                            >
                              {getUserName(user)}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => { void fetchEngineerReport(); }}
                    disabled={loadingEngineerReport}
                    className="w-full bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {loadingEngineerReport ? 'Loading...' : 'Apply'}
                  </button>
                </div>
              </div>

              {/* Summary Totals */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">Grand Total</p>
                  <p className="text-lg font-semibold text-gray-900">₹ {engineerReportTotals.grandTotal.toFixed(2)}</p>
                </div>
              </div>

              {/* Per Engineer Totals */}
              {engineerReportTotals.byEngineer.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Engineer</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {engineerReportTotals.byEngineer.map((e, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">{e.engineerName}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">₹ {e.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Ticket Detail Rows */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ticket Number</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Service Attended Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type of Visit</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nature of Work</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sub Nature of Work</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Engineer</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Convenience Charges</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {engineerReportRows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-sm text-gray-500">No records</td>
                      </tr>
                    ) : (
                      engineerReportRows.map((r, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-blue-600">{r.ticketNumber || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{r.serviceAttendedDate ? formatDateTime(r.serviceAttendedDate) : '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{r.customerName || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatFieldValue(r.typeOfVisit)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatFieldValue(r.natureOfWork)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatFieldValue(r.subNatureOfWork)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{r.serviceEngineerName || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">₹ {Number(r.convenienceCharges || 0).toFixed(2)}</td>
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
    </div>
  );
};

export default ServiceManagement; 