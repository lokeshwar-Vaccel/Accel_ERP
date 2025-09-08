import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Calendar,
  DollarSign,
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  X,
  Edit,
  Trash2,
  Eye,
  Bell,
  CalendarDays,
  TrendingUp,
  Building,
  Package,
  RefreshCw,
  ChevronDown,
  IndianRupee,
  Filter,
  MoreHorizontal,
  BarChart3,
  Download,
  Settings
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import AMCReport from '../components/AMCReport';
import VisitScheduler from '../components/VisitScheduler';
import ContractRenewal from '../components/ContractRenewal';
import VisitStatusUpdate from '../components/VisitStatusUpdate';
import { MultiSelect } from '../components/ui/MultiSelect';
import { Pagination } from '../components/ui/Pagination';
import ConfirmationModal from '../components/ui/ConfirmationModal';

// Types matching backend structure
type AMCStatus = 'active' | 'expired' | 'cancelled' | 'pending' | 'suspended' | 'draft';
type VisitStatus = 'pending' | 'completed' | 'cancelled' | 'rescheduled';
type NotificationStatus = 'active' | 'sent' | 'dismissed';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  fullName?: string;
}

interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  contactPersonName?: string;
  customerType: string;
  addresses?: Array<{
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  }>;
  location?: {
    latitude?: number;
    longitude?: number;
    address: string;
  };
}

interface Engine {
  engineSerialNumber: string;
  engineModel: string;
  kva: number;
  dgMake: string;
  dgSerialNumber: string;
  alternatorMake: string;
  alternatorSerialNumber: string;
  commissioningDate: string;
  warrantyStatus: string;
  amcStatus: string;
  cluster: string;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  warrantyInfo?: {
    startDate: string;
    endDate: string;
    type: string;
  };
  specifications?: Record<string, any>;
}

interface ServiceTicket {
  _id: string;
  ticketNumber: string;
  customer: string | Customer;
  product: string | Product;
  status: string;
  priority: string;
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier: string;
  totalAmount: number;
  status: string;
}

interface VisitSchedule {
  _id?: string;
  scheduledDate: string;
  completedDate?: string;
  assignedTo?: string | User;
  status: VisitStatus;
  visitType: 'routine' | 'emergency' | 'followup' | 'inspection';
  duration?: number; // in hours
  notes?: string;
  checklistItems?: Array<{
    item: string;
    completed: boolean;
    notes?: string;
  }>;
  partsUsed?: Array<{
    product: string;
    quantity: number;
    cost: number;
  }>;
  serviceTicket?: string;
  travelTime?: number;
  customerFeedback?: {
    rating: number;
    comments?: string;
  };
  serviceReport?: string;
  issues?: Array<{
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    resolved?: boolean;
    followUpRequired?: boolean;
  }>;
  nextVisitRecommendations?: string;
  customerSignature?: string;
}

interface AMCNotification {
  _id?: string;
  type: 'visit_due' | 'contract_expiring' | 'visit_overdue' | 'renewal_due';
  message: string;
  dueDate: string;
  status: NotificationStatus;
  createdAt: string;
}

interface AMC {
  _id: string;
  contractNumber: string;
  customer: string | Customer;
  // New fields as per client requirements
  customerAddress: string;
  contactPersonName: string;
  contactNumber: string;
  engineSerialNumber: string;
  engineModel: string;
  kva: number;
  dgMake: string;
  dateOfCommissioning: string;
  amcStartDate: string;
  amcEndDate: string;
  amcType: 'AMC' | 'CAMC';
  numberOfVisits: number;
  numberOfOilServices: number;
  // Legacy fields (keeping for backward compatibility)
  products: string[] | Product[];
  startDate: string;
  endDate: string;
  contractValue: number;
  scheduledVisits: number;
  completedVisits: number;
  status: AMCStatus;
  nextVisitDate?: string;
  visitSchedule: VisitSchedule[];
  terms?: string;
  attachments?: string[];
  billingCycle: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  renewalTerms?: string;
  discountPercentage?: number;
  paymentStatus: 'paid' | 'pending' | 'overdue' | 'partial';
  lastPaymentDate?: string;
  emergencyContactHours?: string;
  responseTime?: number; // in hours
  coverageArea?: string;
  exclusions?: string[];
  performanceMetrics?: {
    avgResponseTime: number;
    customerSatisfaction: number;
    issueResolutionRate: number;
  };
  linkedPurchaseOrders?: string[];
  linkedServiceTickets?: string[];
  notifications?: AMCNotification[];
  createdBy: string | User;
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  remainingVisits?: number;
  contractDuration?: number;
  daysUntilExpiry?: number;
  completionPercentage?: number;
  nextDueAmount?: number;
  overdueVisits?: number;
  // Visit date range filter specific fields
  visitsInRange?: VisitSchedule[];
  visitCountInRange?: number;
}

interface AMCFormData {
  customer: string;
  customerAddress: string;
  contactPersonName: string;
  contactNumber: string;
  engineSerialNumber: string;
  engineModel: string;
  kva: number;
  dgMake: string;
  dateOfCommissioning: string;
  amcStartDate: string;
  amcEndDate: string;
  amcType: 'AMC' | 'CAMC';
  numberOfVisits: number;
  numberOfOilServices: number;
  // Legacy fields for backward compatibility
  products?: string[];
  startDate?: string;
  endDate?: string;
  contractValue?: number;
  scheduledVisits?: number;
  terms?: string;
}

const AMCManagement: React.FC = () => {
  const location = useLocation();
  
  // Core state
  const [amcs, setAmcs] = useState<AMC[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [customerEngines, setCustomerEngines] = useState<Engine[]>([]);
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AMCStatus | 'all'>('all');

  const [expiryFilter, setExpiryFilter] = useState('all'); // all, 30days, 60days, 90days
  const [paymentFilter, setPaymentFilter] = useState('all');
  
  // Visit date filter states
  const [visitStartDate, setVisitStartDate] = useState('');
  const [visitEndDate, setVisitEndDate] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'visitDate'>('all');
  const [visitDateSummary, setVisitDateSummary] = useState<any>(null);
  
  /*
   * VISIT DATE FILTER FUNCTIONALITY
   * 
   * This feature allows you to filter AMC contracts to show only those
   * that have visits scheduled on a specific date.
   * 
   * How it works:
   * 1. Click "Visit Date Filter" button to enable filter mode
   * 2. Select a specific date using the date picker
   * 3. The system will show only AMC contracts with visits on that date
   * 4. Summary statistics will update to show data for that specific date
   * 
   * Features:
   * - Quick date selection (Today, Tomorrow, Next Week)
   * - Summary cards showing total contracts, visits, customers, and value
   * - Visit count per contract for the selected date
   * - Status indicators for each visit (pending, completed, etc.)
   * - Works with other filters (status, customer, etc.)
   * 
   * API Endpoint: GET /api/v1/amc/visits-by-date?scheduledDate=YYYY-MM-DD
   */
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showVisitScheduler, setShowVisitScheduler] = useState(false);
  const [showContractRenewal, setShowContractRenewal] = useState(false);
  const [showVisitStatusUpdate, setShowVisitStatusUpdate] = useState(false);
  
  // Confirmation modal states
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [amcToDelete, setAmcToDelete] = useState<AMC | null>(null);
  
  // Status update modal states
  const [showStatusUpdateModal, setShowStatusUpdateModal] = useState(false);
  const [amcToUpdateStatus, setAmcToUpdateStatus] = useState<AMC | null>(null);
  const [newStatus, setNewStatus] = useState<AMCStatus>('active');
  const [statusUpdateReason, setStatusUpdateReason] = useState('');

  // Selected data
  const [selectedAMC, setSelectedAMC] = useState<AMC | null>(null);
  console.log("selectedAMC", selectedAMC);
  const [editingAMC, setEditingAMC] = useState<AMC | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitSchedule | null>(null);
  const [selectedAMCForVisit, setSelectedAMCForVisit] = useState<AMC | null>(null);
  const [selectedAMCForRenewal, setSelectedAMCForRenewal] = useState<AMC | null>(null);
  const [selectedVisitForUpdate, setSelectedVisitForUpdate] = useState<any>(null);

  
  // Form data
  const [amcFormData, setAmcFormData] = useState<AMCFormData>({
    customer: '',
    customerAddress: '',
    contactPersonName: '',
    contactNumber: '',
    engineSerialNumber: '',
    engineModel: '',
    kva: 0,
    dgMake: '',
    dateOfCommissioning: '',
    amcStartDate: '',
    amcEndDate: '',
    amcType: 'AMC',
    numberOfVisits: 0,
    numberOfOilServices: 0,
    // Legacy fields
    products: [],
    startDate: '',
    endDate: '',
    contractValue: 0,
    scheduledVisits: 0,
    terms: ''
  });

  const [visitFormData, setVisitFormData] = useState({
    scheduledDate: '',
    assignedTo: '',
    visitType: 'routine' as 'routine' | 'emergency' | 'followup' | 'inspection',
    duration: 2,
    notes: '',
    checklistItems: [
      { item: 'Visual inspection of equipment', completed: false, notes: '' },
      { item: 'Check oil levels and quality', completed: false, notes: '' },
      { item: 'Inspect air filters', completed: false, notes: '' },
      { item: 'Test safety systems', completed: false, notes: '' },
      { item: 'Check electrical connections', completed: false, notes: '' }
    ]
  });

  const [renewalFormData, setRenewalFormData] = useState({
    newEndDate: '',
    contractValue: 0,
    scheduledVisits: 4,
    terms: ''
  });
  
  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Dropdown state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const [showExpiryDropdown, setShowExpiryDropdown] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showBillingCycleDropdown, setShowBillingCycleDropdown] = useState(false);
  const [showVisitTypeDropdown, setShowVisitTypeDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  // Searchable dropdown states
  const [customerDropdown, setCustomerDropdown] = useState<{
    isOpen: boolean;
    searchTerm: string;
    selectedIndex: number;
    filteredOptions: Customer[];
  }>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  const [addressDropdown, setAddressDropdown] = useState<{
    isOpen: boolean;
    searchTerm: string;
    selectedIndex: number;
    filteredOptions: any[];
  }>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  const [engineDropdown, setEngineDropdown] = useState<{
    isOpen: boolean;
    searchTerm: string;
    selectedIndex: number;
    filteredOptions: Engine[];
  }>({
    isOpen: false,
    searchTerm: '',
    selectedIndex: 0,
    filteredOptions: []
  });

  // Enhanced workflow states
  const [workflowStep, setWorkflowStep] = useState<'inquiry' | 'survey' | 'assessment' | 'planning' | 'contract'>('inquiry');
  const [siteSurveyData, setSiteSurveyData] = useState({
    surveyDate: '',
    surveyor: '',
    siteConditions: '',
    accessibility: '',
    powerRequirements: '',
    environmentalFactors: '',
    photos: [] as string[],
    recommendations: ''
  });

  const [equipmentAssessment, setEquipmentAssessment] = useState({
    equipmentAge: '',
    condition: 'excellent' as 'excellent' | 'good' | 'fair' | 'poor',
    maintenanceHistory: '',
    criticalComponents: [] as string[],
    riskFactors: [] as string[],
    recommendedSchedule: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'biannual',
    estimatedPartsCost: 0
  });

  const [servicePlan, setServicePlan] = useState({
    visitFrequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'biannual',
    visitDuration: 2,
    requiredSkills: [] as string[],
    emergencyResponse: true,
    preventiveMaintenance: true,
    predictiveMaintenance: false,
    includesParts: true,
    partsWarranty: 12, // months
    laborWarranty: 6 // months
  });

  // Enhanced visit management
  const [visitTemplates, setVisitTemplates] = useState([
    {
      name: 'Routine Maintenance',
      duration: 2,
      checklistItems: [
        'Visual inspection of equipment',
        'Check oil levels and quality',
        'Inspect air filters',
        'Test safety systems',
        'Check electrical connections',
        'Verify control panel operation',
        'Check fuel system',
        'Test emergency shutdown',
        'Review maintenance logs'
      ]
    },
    {
      name: 'Emergency Service',
      duration: 4,
      checklistItems: [
        'Assess emergency situation',
        'Implement safety protocols',
        'Diagnose fault/failure',
        'Source replacement parts',
        'Execute repairs',
        'Test system operation',
        'Document incident',
        'Recommend preventive measures'
      ]
    }
  ]);

  // Performance tracking
  const [performanceMetrics, setPerformanceMetrics] = useState({
    averageResponseTime: 0,
    customerSatisfactionScore: 0,
    firstTimeFixRate: 0,
    emergencyCallsCount: 0,
    scheduledVisitsCompleted: 0,
    partsUtilizationRate: 0
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  // Check for URL parameters to auto-open create modal
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'create') {
      handleCreateAMC();
      // Clear the URL parameter
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  // Effect to handle pagination changes
  useEffect(() => {
    fetchAMCs(currentPage, itemsPerPage);
  }, [currentPage, itemsPerPage, searchTerm, statusFilter, filterMode, visitStartDate, visitEndDate]);

  // Effect to reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, filterMode, visitStartDate, visitEndDate]);

  // Effect to initialize dropdown options when data is loaded
  useEffect(() => {
    // Initialize customer dropdown with all customers
    setCustomerDropdown(prev => ({
      ...prev,
      filteredOptions: customers
    }));
  }, [customers]);

  useEffect(() => {
    // Initialize address dropdown with customer addresses
    setAddressDropdown(prev => ({
      ...prev,
      filteredOptions: customerAddresses
    }));
  }, [customerAddresses]);

  useEffect(() => {
    // Initialize engine dropdown with customer engines
    setEngineDropdown(prev => ({
      ...prev,
      filteredOptions: customerEngines
    }));
  }, [customerEngines]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAMCs(),
        fetchCustomers(),
        fetchProducts(),
        fetchUsers(),
        fetchServiceTickets(),
        fetchPurchaseOrders()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAMCs = async (page = currentPage, limit = itemsPerPage) => {
    try {
      // If we're in visit date filter mode, use the visit date API
          if (filterMode === 'visitDate' && visitStartDate && visitEndDate) {
      await fetchAMCsByVisitDate(page, limit);
      return;
    }

      const params: any = {
        page,
        limit,
      };

      // Only add search if it's not empty
      if (searchTerm && searchTerm.trim() !== '') {
        params.search = searchTerm.trim();
      }

      // Only add status if it's not 'all'
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }



      // Only add expiringIn if it's not 'all' and convert to number
      if (expiryFilter !== 'all') {
        // Extract number from strings like '30days', '60days', '90days'
        const expiringDays = parseInt(expiryFilter.replace('days', ''));
        if (!isNaN(expiringDays)) {
          params.expiringIn = expiringDays;
        }
      }

      const response = await apiClient.amc.getAll(params);
      
      // Handle response format - API returns { success: boolean; data: { contracts: any[] }; pagination: any }
      let amcData: AMC[] = [];
      let paginationData = { total: 0, pages: 0 };
      
      if (response.success && response.data) {
        const data = response.data as any;
        if (data.contracts && Array.isArray(data.contracts)) {
          amcData = data.contracts;
        } else if (Array.isArray(response.data)) {
          // Fallback for different response format
          amcData = response.data;
        }
        
        // Extract pagination data
        if (response.pagination) {
          paginationData = response.pagination;
        } else if (data.pagination) {
          paginationData = data.pagination;
        }
      }
      
      setAmcs(amcData);
      setTotalItems(paginationData.total || amcData.length);
      setTotalPages(paginationData.pages || Math.ceil(amcData.length / limit));
      
    } catch (error) {
      console.error('Error fetching AMCs:', error);
      // Show empty state on error
      setAmcs([]);
      setTotalItems(0);
      setTotalPages(0);
    }
  };

  /**
   * Fetch AMC contracts that have visits scheduled on a specific date
   * 
   * This function is called when filterMode === 'visitDate' and a date is selected.
   * It queries the backend API to get only AMC contracts with visits on the specified date.
   * 
   * @param page - Current page number for pagination
   * @param limit - Number of items per page
   * 
   * API Endpoint: GET /api/v1/amc/visits-by-date
   * Query Parameters:
   * - scheduledDate: The date to filter by (YYYY-MM-DD format)
   * - page: Page number for pagination
   * - limit: Items per page
   * - status: Optional status filter
   * - customer: Optional customer filter
   * 
   * Response includes:
   * - contracts: Array of AMC contracts with visits on the specified date
   * - summary: Statistics for the selected date (total contracts, visits, customers, value)
   * - pagination: Pagination information
   */
  const fetchAMCsByVisitDate = async (page = currentPage, limit = itemsPerPage) => {
    try {
      const params: any = {
        startDate: visitStartDate,
        endDate: visitEndDate,
        page,
        limit,
      };

      // Add additional filters if specified
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const response = await apiClient.amc.getByVisitDate(params);
      
      if (response.success && response.data) {
        const { contracts, summary } = response.data;
        setAmcs(contracts || []);
        setVisitDateSummary(summary);
        setTotalItems(response.pagination?.total || contracts?.length || 0);
        setTotalPages(response.pagination?.pages || Math.ceil((contracts?.length || 0) / limit));
      } else {
        setAmcs([]);
        setVisitDateSummary(null);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error('Error fetching AMCs by visit date:', error);
      setAmcs([]);
      setVisitDateSummary(null);
      setTotalItems(0);
      setTotalPages(0);
    }
  };

  const fetchCustomers = async () => {
    try {
      // Use the new API endpoint specifically for dropdown - no pagination
      const response = await apiClient.customers.getAllForDropdown({ 
        type: 'customer' // Ensure we get only customers, not leads
      });
      
      let customersData: Customer[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        customersData = response.data;
      } else {
        console.warn('Unexpected response format for customers:', response);
      }
      
      setCustomers(customersData);
      
      // If no customers found, log a warning but don't set sample data
      if (customersData.length === 0) {
        console.warn('No customers found in the system');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      // Don't set any sample data on error, just log the error
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll();
      
      let productsData: Product[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        productsData = response.data;
      } else if (
        response.data &&
        typeof response.data === 'object' &&
        !Array.isArray(response.data) &&
        response.data !== null &&
        Array.isArray((response.data as any).products)
      ) {
        productsData = (response.data as any).products;
      } else {
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
      } else if (
        response.data &&
        typeof response.data === 'object' &&
        !Array.isArray(response.data) &&
        response.data !== null &&
        Array.isArray((response.data as any).users)
      ) {
        usersData = (response.data as any).users;
      } else {
      }
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchServiceTickets = async () => {
    try {
      const response = await apiClient.services.getAll();
      
      let serviceTicketsData: ServiceTicket[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        serviceTicketsData = response.data;
      } else if (
        response.data &&
        typeof response.data === 'object' &&
        !Array.isArray(response.data) &&
        response.data !== null &&
        Array.isArray((response.data as any).tickets)
      ) {
        serviceTicketsData = (response.data as any).tickets;
      } else {
      }
      setServiceTickets(serviceTicketsData);
    } catch (error) {
      console.error('Error fetching service tickets:', error);
      setServiceTickets([]);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await apiClient.purchaseOrders.getAll();
      
      let purchaseOrdersData: PurchaseOrder[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        purchaseOrdersData = response.data;
      } else if (
        response.data &&
        typeof response.data === 'object' &&
        !Array.isArray(response.data) &&
        response.data !== null &&
        Array.isArray((response.data as any).orders)
      ) {
        purchaseOrdersData = (response.data as any).orders;
      } else {
      }
      setPurchaseOrders(purchaseOrdersData);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrders([]);
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
      }

      if (addressesResponse.success && addressesResponse.data.addresses) {
        const addresses = addressesResponse.data.addresses;
        setCustomerAddresses(addresses);
        
        // Auto-select primary address
        const primaryAddress = addresses.find((addr: any) => addr.isPrimary);
        if (primaryAddress) {
          setAmcFormData(prev => ({
            ...prev,
            customerAddress: primaryAddress.fullAddress || primaryAddress.address
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      setCustomerEngines([]);
      setCustomerAddresses([]);
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

  const handleCreateAMC = () => {
    setAmcFormData({
      customer: '',
      customerAddress: '',
      contactPersonName: '',
      contactNumber: '',
      engineSerialNumber: '',
      engineModel: '',
      kva: 0,
      dgMake: '',
      dateOfCommissioning: '',
      amcStartDate: '',
      amcEndDate: '',
      amcType: 'AMC',
      numberOfVisits: 0,
      numberOfOilServices: 0,
      // Legacy fields
      products: [],
      startDate: '',
      endDate: '',
      contractValue: 0,
      scheduledVisits: 0,
      terms: ''
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleEditAMC = (amc: AMC) => {
    setEditingAMC(amc);
    
    // Format dates for input fields
    const formatDateForInput = (dateString: string) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toISOString().split('T')[0];
      } catch (error) {
        return '';
      }
    };

    setAmcFormData({
      customer: typeof amc.customer === 'string' ? amc.customer : amc.customer._id,
      customerAddress: amc.customerAddress || '',
      contactPersonName: amc.contactPersonName || '',
      contactNumber: amc.contactNumber || '',
      engineSerialNumber: amc.engineSerialNumber || '',
      engineModel: amc.engineModel || '',
      kva: amc.kva || 0,
      dgMake: amc.dgMake || '',
      dateOfCommissioning: formatDateForInput(amc.dateOfCommissioning),
      amcStartDate: formatDateForInput(amc.amcStartDate),
      amcEndDate: formatDateForInput(amc.amcEndDate),
      amcType: amc.amcType || 'AMC',
      numberOfVisits: amc.numberOfVisits || 0,
      numberOfOilServices: amc.numberOfOilServices || 0,
      // Legacy fields
      products: Array.isArray(amc.products) ? amc.products.map(p => typeof p === 'string' ? p : p._id) : [],
      startDate: formatDateForInput(amc.startDate),
      endDate: formatDateForInput(amc.endDate),
      contractValue: amc.contractValue || 0,
      scheduledVisits: amc.scheduledVisits || 0,
      terms: amc.terms || ''
    });

    // Fetch customer data if customer is selected
    if (amc.customer) {
      const customerId = typeof amc.customer === 'string' ? amc.customer : amc.customer._id;
      fetchCustomerData(customerId);
    }

    setFormErrors({});
    setShowEditModal(true);
  };

  // New function to resume editing drafts in workflow mode
  const handleResumeDraft = (amc: AMC) => {
    
    // Load the existing data
    setAmcFormData({
      customer: typeof amc.customer === 'string' ? amc.customer : amc.customer._id,
      customerAddress: amc.customerAddress,
      contactPersonName: amc.contactPersonName,
      contactNumber: amc.contactNumber,
      engineSerialNumber: amc.engineSerialNumber,
      engineModel: amc.engineModel,
      kva: amc.kva,
      dgMake: amc.dgMake,
      dateOfCommissioning: amc.dateOfCommissioning,
      amcStartDate: amc.amcStartDate,
      amcEndDate: amc.amcEndDate,
      amcType: amc.amcType,
      numberOfVisits: amc.numberOfVisits,
      numberOfOilServices: amc.numberOfOilServices,
      // Legacy fields
      products: Array.isArray(amc.products) ? amc.products.map(p => typeof p === 'string' ? p : p._id) : [],
      startDate: amc.startDate,
      endDate: amc.endDate,
      contractValue: amc.contractValue,
      scheduledVisits: amc.scheduledVisits,
      terms: amc.terms || ''
    });

    // Load workflow-specific data if available
    if ((amc as any).siteSurvey) {
      setSiteSurveyData((amc as any).siteSurvey);
    }
    if ((amc as any).equipmentAssessment) {
      setEquipmentAssessment((amc as any).equipmentAssessment);
    }
    if ((amc as any).servicePlan) {
      setServicePlan((amc as any).servicePlan);
    }

    // Resume from the saved workflow step or start from inquiry
    const savedStep = (amc as any).workflowStep || 'inquiry';
    setWorkflowStep(savedStep);
    
    setEditingAMC(amc); // Set this so we update instead of creating new
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleDeleteAMC = async (amc: AMC) => {
    setAmcToDelete(amc);
    setShowDeleteConfirmModal(true);
  };

  const confirmDeleteAMC = async () => {
    if (!amcToDelete) return;
    
    try {
      await apiClient.amc.delete(amcToDelete._id);
      
      // Show success message
      toast.success('AMC contract deleted successfully');
      
      // Refresh the AMC data to get real-time updates
      await fetchAMCs();
      
      // Close the confirmation modal
      setShowDeleteConfirmModal(false);
      setAmcToDelete(null);
    } catch (error: any) {
      console.error('Error deleting AMC:', error);
      
      // Show error message as toast
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete AMC contract';
      toast.error(errorMessage);
      
      // Close the confirmation modal on error
      setShowDeleteConfirmModal(false);
      setAmcToDelete(null);
    }
  };

  const handleStatusUpdate = (amc: AMC) => {
    setAmcToUpdateStatus(amc);
    setNewStatus(amc.status);
    setStatusUpdateReason('');
    setShowStatusUpdateModal(true);
  };

  const confirmStatusUpdate = async () => {
    if (!amcToUpdateStatus) return;
    
    try {
      // Update the AMC status
      await apiClient.amc.update(amcToUpdateStatus._id, {
        status: newStatus,
        terms: statusUpdateReason ? 
          `${amcToUpdateStatus.terms || ''}\n\nStatus Update: ${newStatus} - ${statusUpdateReason}` : 
          `${amcToUpdateStatus.terms || ''}\n\nStatus Update: ${newStatus}`
      });
      
      // Show success message
      toast.success(`AMC contract status updated to ${newStatus} successfully`);
      
      // Refresh the AMC data to get real-time updates
      await fetchAMCs();
      
      // Close the status update modal
      setShowStatusUpdateModal(false);
      setAmcToUpdateStatus(null);
      setNewStatus('active');
      setStatusUpdateReason('');
    } catch (error: any) {
      console.error('Error updating AMC status:', error);
      
      // Show error message as toast
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update AMC contract status';
      toast.error(errorMessage);
    }
  };

  const openDetailsModal = (amc: AMC) => {
    setSelectedAMC(amc);
    setShowDetailsModal(true);
  };

  const validateAMCForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!amcFormData.customer) {
      errors.customer = 'Customer is required';
    }
    if (!amcFormData.customerAddress) {
      errors.customerAddress = 'Customer address is required';
    }
    if (!amcFormData.contactPersonName) {
      errors.contactPersonName = 'Contact person name is required';
    }
    if (!amcFormData.contactNumber) {
      errors.contactNumber = 'Contact number is required';
    }
    if (!amcFormData.engineSerialNumber) {
      errors.engineSerialNumber = 'Engine serial number is required';
    }
    if (!amcFormData.amcStartDate) {
      errors.amcStartDate = 'AMC start date is required';
    }
    if (!amcFormData.amcEndDate) {
      errors.amcEndDate = 'AMC end date is required';
    }
    if (amcFormData.amcStartDate && amcFormData.amcEndDate && new Date(amcFormData.amcEndDate) <= new Date(amcFormData.amcStartDate)) {
      errors.amcEndDate = 'AMC end date must be after start date';
    }
    if (amcFormData.numberOfVisits <= 0) {
      errors.numberOfVisits = 'Number of visits must be greater than 0';
    }
    if (amcFormData.numberOfOilServices < 0) {
      errors.numberOfOilServices = 'Number of oil services cannot be negative';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAMC = async () => {
    if (!validateAMCForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      
      // Convert dates to ISO 8601 format with proper validation
      const formatDateToISO = (dateString: string) => {
        if (!dateString || dateString.trim() === '') return undefined;
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return undefined;
          return date.toISOString();
        } catch (error) {
          console.error('Error formatting date:', error);
          return undefined;
        }
      };

      const amcData = {
        ...amcFormData,
        amcStartDate: formatDateToISO(amcFormData.amcStartDate),
        amcEndDate: formatDateToISO(amcFormData.amcEndDate),
        dateOfCommissioning: formatDateToISO(amcFormData.dateOfCommissioning),
        // Legacy fields
        startDate: formatDateToISO(amcFormData.amcStartDate),
        endDate: formatDateToISO(amcFormData.amcEndDate),
        scheduledVisits: amcFormData.numberOfVisits,
        status: 'active' // Set as active when fully completed
      };

      // Remove undefined values to avoid validation issues
      Object.keys(amcData).forEach(key => {
        if (amcData[key as keyof typeof amcData] === undefined) {
          delete amcData[key as keyof typeof amcData];
        }
      });

      const response = await apiClient.amc.create(amcData);
      
      // Show success message
      toast.success('AMC contract created successfully');
      
      // Refresh the AMC data to get real-time updates
      await fetchAMCs();
      
      setShowAddModal(false);
      setWorkflowStep('inquiry');
      resetAMCForm();
    } catch (error: any) {
      console.error('Error creating AMC:', error);
      const serverMessage = error?.response?.data?.message || error?.message || 'Failed to create AMC contract';
      toast.error(serverMessage);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: serverMessage });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // New function to save as draft
  const handleSaveAsDraft = async () => {
    setSubmitting(true);
    try {
      setFormErrors({});
      
      // Convert dates to ISO 8601 format with proper validation
      const formatDateToISO = (dateString: string) => {
        if (!dateString || dateString.trim() === '') return undefined;
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return undefined;
          return date.toISOString();
        } catch (error) {
          console.error('Error formatting date:', error);
          return undefined;
        }
      };

      // For drafts, we need to provide default values for required fields
      const currentDate = new Date().toISOString();
      const defaultEndDate = new Date();
      defaultEndDate.setFullYear(defaultEndDate.getFullYear() + 1); // Default 1 year from now

      // Ensure we have all required fields for draft
      const formattedData = {
        customer: amcFormData.customer || '',
        customerAddress: amcFormData.customerAddress || '',
        contactPersonName: amcFormData.contactPersonName || '',
        contactNumber: amcFormData.contactNumber || '',
        engineSerialNumber: amcFormData.engineSerialNumber || '',
        engineModel: amcFormData.engineModel || '',
        kva: amcFormData.kva || 0,
        dgMake: amcFormData.dgMake || '',
        dateOfCommissioning: formatDateToISO(amcFormData.dateOfCommissioning) || currentDate,
        amcStartDate: formatDateToISO(amcFormData.amcStartDate) || currentDate,
        amcEndDate: formatDateToISO(amcFormData.amcEndDate) || defaultEndDate.toISOString(),
        amcType: amcFormData.amcType || 'AMC',
        numberOfVisits: amcFormData.numberOfVisits || 4,
        numberOfOilServices: amcFormData.numberOfOilServices || 2,
        // Legacy fields
        startDate: formatDateToISO(amcFormData.amcStartDate) || currentDate,
        endDate: formatDateToISO(amcFormData.amcEndDate) || defaultEndDate.toISOString(),
        scheduledVisits: amcFormData.numberOfVisits || 4,
        contractValue: amcFormData.contractValue || 0,
        products: amcFormData.products || [],
        terms: amcFormData.terms || '',
        status: 'draft',
        workflowStep: workflowStep,
        isDraft: true
      };

      let response: any;
      if (editingAMC) {
        // Update existing draft
        response = await apiClient.amc.update(editingAMC._id, formattedData);
      } else {
        // Create new draft
        response = await apiClient.amc.create(formattedData);
      }
      
      // Refresh the AMC data to get real-time updates
      await fetchAMCs();
      
      // Show success message
      toast.success('Draft saved successfully! You can continue editing later.');
      
      setShowAddModal(false);
      setWorkflowStep('inquiry');
      setEditingAMC(null);
      resetAMCForm();
    } catch (error: any) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAMC = async () => {
    if (!validateAMCForm() || !editingAMC) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      
      // Convert dates to ISO 8601 format with proper validation
      const formatDateToISO = (dateString: string) => {
        if (!dateString || dateString.trim() === '') return undefined;
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return undefined;
          return date.toISOString();
        } catch (error) {
          console.error('Error formatting date:', error);
          return undefined;
        }
      };
      
      const formattedData = {
        ...amcFormData,
        amcStartDate: formatDateToISO(amcFormData.amcStartDate),
        amcEndDate: formatDateToISO(amcFormData.amcEndDate),
        dateOfCommissioning: formatDateToISO(amcFormData.dateOfCommissioning),
        // Legacy fields
        startDate: formatDateToISO(amcFormData.amcStartDate),
        endDate: formatDateToISO(amcFormData.amcEndDate),
        scheduledVisits: amcFormData.numberOfVisits
      };

      // Remove undefined values to avoid validation issues
      Object.keys(formattedData).forEach(key => {
        if (formattedData[key as keyof typeof formattedData] === undefined) {
          delete formattedData[key as keyof typeof formattedData];
        }
      });
      
      // Check if number of visits has changed
      const visitsChanged = editingAMC.numberOfVisits !== amcFormData.numberOfVisits;
      const datesChanged = editingAMC.amcStartDate !== amcFormData.amcStartDate || 
                          editingAMC.amcEndDate !== amcFormData.amcEndDate;
      
      // First update the AMC contract
      const response = await apiClient.amc.update(editingAMC._id, formattedData);
      
      // If visits or dates changed, regenerate the visit schedule
      if (visitsChanged || datesChanged) {
        try {
          // Check if there are completed visits - if yes, we need to preserve them
          const hasCompletedVisits = editingAMC.completedVisits > 0;
          
          if (hasCompletedVisits) {
            // If there are completed visits, show a confirmation dialog
            const shouldRegenerate = window.confirm(
              `You've changed the number of visits from ${editingAMC.numberOfVisits} to ${amcFormData.numberOfVisits}. ` +
              `This will regenerate the visit schedule. ` +
              `Note: Completed visits will be preserved, but the schedule will be adjusted. ` +
              `Do you want to continue?`
            );
            
            if (shouldRegenerate) {
              await apiClient.amc.regenerateVisits(editingAMC._id);
              toast.success('AMC contract updated and visit schedule regenerated successfully');
            } else {
              toast.success('AMC contract updated successfully (visit schedule unchanged)');
            }
          } else {
            // No completed visits, automatically regenerate
            await apiClient.amc.regenerateVisits(editingAMC._id);
            toast.success('AMC contract updated and visit schedule regenerated successfully');
          }
        } catch (regenerateError: any) {
          console.error('Error regenerating visits:', regenerateError);
          toast.error('AMC contract updated but failed to regenerate visit schedule. You can regenerate it manually later.');
        }
      } else {
        toast.success('AMC contract updated successfully');
      }
      
      // Refresh the AMC data to get real-time updates
      await fetchAMCs();
      
      setShowEditModal(false);
      setEditingAMC(null);
      resetAMCForm();
    } catch (error: any) {
      console.error('Error updating AMC:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to update AMC contract' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetAMCForm = () => {
    setAmcFormData({
      customer: '',
      customerAddress: '',
      contactPersonName: '',
      contactNumber: '',
      engineSerialNumber: '',
      engineModel: '',
      kva: 0,
      dgMake: '',
      dateOfCommissioning: '',
      amcStartDate: '',
      amcEndDate: '',
      amcType: 'AMC',
      numberOfVisits: 0,
      numberOfOilServices: 0,
      // Legacy fields
      products: [],
      startDate: '',
      endDate: '',
      contractValue: 0,
      scheduledVisits: 0,
      terms: ''
    });
    
    // Clear customer data
    setCustomerAddresses([]);
    setCustomerEngines([]);
    
    // Reset workflow data too
    setSiteSurveyData({
      surveyDate: '',
      surveyor: '',
      siteConditions: '',
      accessibility: '',
      powerRequirements: '',
      environmentalFactors: '',
      photos: [],
      recommendations: ''
    });
    
    setEquipmentAssessment({
      equipmentAge: '',
      condition: 'excellent',
      maintenanceHistory: '',
      criticalComponents: [],
      riskFactors: [],
      recommendedSchedule: 'monthly',
      estimatedPartsCost: 0
    });
    
    setServicePlan({
      visitFrequency: 'monthly',
      visitDuration: 2,
      requiredSkills: [],
      emergencyResponse: true,
      preventiveMaintenance: true,
      predictiveMaintenance: false,
      includesParts: true,
      partsWarranty: 12,
      laborWarranty: 6
    });
    
    setWorkflowStep('inquiry');
    setFormErrors({});
  };

  // Since we're using pagination and backend filtering, we'll use the amcs directly
  // The backend is now handling search, status, customer, and expiry filtering
  const filteredAMCs = amcs;

  const getStatusColor = (status: AMCStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-gray-100 text-gray-800';
      case 'draft':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: AMCStatus) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'expired':
        return <AlertTriangle className="w-4 h-4" />;
      case 'cancelled':
        return <X className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'suspended':
        return <AlertTriangle className="w-4 h-4" />;
      case 'draft':
        return <Edit className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  // Helper function to check if contract can be deleted
  const canDeleteContract = (amc: AMC): boolean => {
    // Allow deletion of cancelled, expired, or draft contracts
    if (amc.status === 'cancelled' || amc.status === 'expired' || amc.status === 'draft') {
      return true;
    }
    
    // Allow deletion of active contracts with no completed visits
    if (amc.status === 'active' && amc.completedVisits === 0) {
      return true;
    }
    
    // Allow deletion of pending contracts with no completed visits
    if (amc.status === 'pending' && amc.completedVisits === 0) {
      return true;
    }
    
    return false;
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

  // Get expiring contracts (within 30 days)
  const getExpiringContracts = () => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    return amcs.filter(amc => {
      const endDate = new Date(amc.endDate);
      return endDate <= thirtyDaysFromNow && amc.status === 'active';
    });
  };

  const stats = [
    {
      title: 'Total AMCs',
      value: amcs.length.toString(),
      icon: <FileText className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Active Contracts',
      value: amcs.filter(amc => amc.status === 'active').length.toString(),
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'Expiring Soon',
      value: getExpiringContracts().length.toString(),
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'orange'
    },
    {
      title: 'Overdue Visits',
      value: amcs.filter(amc => {
        if (!amc.nextVisitDate) return false;
        return new Date(amc.nextVisitDate) < new Date() && amc.status === 'active';
      }).length.toString(),
      icon: <Calendar className="w-6 h-6" />,
      color: 'red'
    },
    {
      title: 'Total Value',
      value: formatCurrency(amcs.reduce((sum, amc) => sum + amc.contractValue, 0)),
      icon: <IndianRupee className="w-6 h-6" />,
      color: 'purple'
    },
    {
      title: 'This Month Revenue',
      value: formatCurrency(amcs.filter(amc => {
        if (amc.billingCycle === 'monthly') return amc.status === 'active';
        return false;
      }).reduce((sum, amc) => sum + (amc.contractValue / 12), 0)),
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'indigo'
    }
  ];

  // Status options with labels
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'suspended', label: 'Suspended' }
  ];

  const getStatusLabel = (value: string) => {
    const option = statusOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Status';
  };



  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowStatusDropdown(false);
        
        setShowExpiryDropdown(false);
        setShowPaymentDropdown(false);
        setShowBillingCycleDropdown(false);
        setShowVisitTypeDropdown(false);
        setShowAssigneeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Searchable dropdown handlers
  const handleDropdownSearch = (type: 'customer' | 'address' | 'engine', searchTerm: string) => {
    switch (type) {
      case 'customer':
        const filteredCustomers = customers.filter(customer => 
          customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customer.phone.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setCustomerDropdown(prev => ({
          ...prev,
          searchTerm,
          filteredOptions: filteredCustomers,
          selectedIndex: 0
        }));
        break;
      
      case 'address':
        const filteredAddresses = customerAddresses.filter(address => 
          address.fullAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          address.address?.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setAddressDropdown(prev => ({
          ...prev,
          searchTerm,
          filteredOptions: filteredAddresses,
          selectedIndex: 0
        }));
        break;
      
      case 'engine':
        const filteredEngines = customerEngines.filter(engine => 
          engine.engineSerialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          engine.engineModel.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setEngineDropdown(prev => ({
          ...prev,
          searchTerm,
          filteredOptions: filteredEngines,
          selectedIndex: 0
        }));
        break;
    }
  };

  const handleDropdownFocus = (type: 'customer' | 'address' | 'engine') => {
    switch (type) {
      case 'customer':
        setCustomerDropdown(prev => ({
          ...prev,
          isOpen: true,
          filteredOptions: customers,
          selectedIndex: 0
        }));
        break;
      
      case 'address':
        setAddressDropdown(prev => ({
          ...prev,
          isOpen: true,
          filteredOptions: customerAddresses,
          selectedIndex: 0
        }));
        break;
      
      case 'engine':
        setEngineDropdown(prev => ({
          ...prev,
          isOpen: true,
          filteredOptions: customerEngines,
          selectedIndex: 0
        }));
        break;
    }
  };

  const handleDropdownSelect = (type: 'customer' | 'address' | 'engine', value: string) => {
    switch (type) {
      case 'customer':
        const selectedCustomer = customers.find(c => c._id === value);
        if (selectedCustomer) {
          setAmcFormData(prev => ({
            ...prev,
            customer: value,
            contactPersonName: selectedCustomer.contactPersonName || '',
            contactNumber: selectedCustomer.phone || ''
          }));
          fetchCustomerData(value);
        }
        setCustomerDropdown((prev: any) => ({ ...prev, isOpen: false, searchTerm: '' }));
        break;
      
      case 'address':
        setAmcFormData(prev => ({
          ...prev,
          customerAddress: value
        }));
        setAddressDropdown((prev: any) => ({ ...prev, isOpen: false, searchTerm: '' }));
        break;
      
      case 'engine':
        const selectedEngine = customerEngines.find(e => e.engineSerialNumber === value);
        if (selectedEngine) {
          let formattedCommissioningDate = '';
          if (selectedEngine.commissioningDate) {
            const date = new Date(selectedEngine.commissioningDate);
            if (!isNaN(date.getTime())) {
              formattedCommissioningDate = date.toISOString().split('T')[0];
            }
          }
          
          setAmcFormData(prev => ({
            ...prev,
            engineSerialNumber: value,
            engineModel: selectedEngine.engineModel,
            kva: selectedEngine.kva,
            dgMake: selectedEngine.dgMake,
            dateOfCommissioning: formattedCommissioningDate
          }));
        }
        setEngineDropdown((prev: any) => ({ ...prev, isOpen: false, searchTerm: '' }));
        break;
    }
  };

  const handleDropdownKeyDown = (
    type: 'customer' | 'address' | 'engine',
    event: React.KeyboardEvent,
    options: any[],
    onSelect: (value: string) => void
  ) => {
    const getDropdownState = () => {
      switch (type) {
        case 'customer': return customerDropdown;
        case 'address': return addressDropdown;
        case 'engine': return engineDropdown;
      }
    };

    const setDropdownState = (updater: any) => {
      switch (type) {
        case 'customer': setCustomerDropdown(updater); break;
        case 'address': setAddressDropdown(updater); break;
        case 'engine': setEngineDropdown(updater); break;
      }
    };

    const dropdownState = getDropdownState();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setDropdownState((prev: any) => ({
          ...prev,
          selectedIndex: Math.min(prev.selectedIndex + 1, options.length - 1)
        }));
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        setDropdownState((prev: any) => ({
          ...prev,
          selectedIndex: Math.max(prev.selectedIndex - 1, 0)
        }));
        break;
      
      case 'Enter':
        event.preventDefault();
        if (options.length > 0 && dropdownState.selectedIndex >= 0) {
          const selectedOption = options[dropdownState.selectedIndex];
          const value = type === 'customer' ? selectedOption._id : 
                       type === 'address' ? selectedOption.fullAddress || selectedOption.address :
                       selectedOption.engineSerialNumber;
          onSelect(value);
        }
        break;
      
      case 'Escape':
        setDropdownState((prev: any) => ({ ...prev, isOpen: false }));
        break;
    }
  };

  // Enhanced helper functions
  const generateVisitSchedule = (startDate: Date, endDate: Date, scheduledVisits: number): VisitSchedule[] => {
    const schedule: VisitSchedule[] = [];
    const contractDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const intervalDays = Math.floor(contractDays / scheduledVisits);

    for (let i = 0; i < scheduledVisits; i++) {
      const visitDate = new Date(startDate.getTime() + (i * intervalDays * 24 * 60 * 60 * 1000));
      schedule.push({
        scheduledDate: visitDate.toISOString(),
        status: 'pending',
        visitType: 'routine',
        duration: 2,
        checklistItems: [
          { item: 'Visual inspection of equipment', completed: false, notes: '' },
          { item: 'Check oil levels and quality', completed: false, notes: '' },
          { item: 'Inspect air filters', completed: false, notes: '' },
          { item: 'Test safety systems', completed: false, notes: '' },
          { item: 'Check electrical connections', completed: false, notes: '' }
        ]
      });
    }

    return schedule;
  };

  // Helper function to calculate optimal visit intervals
  const calculateVisitIntervals = (startDate: string, endDate: string, numberOfVisits: number) => {
    if (!startDate || !endDate || numberOfVisits <= 0) return null;
    
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const intervalDays = Math.floor(totalDays / numberOfVisits);
      
      return {
        totalDays,
        intervalDays,
        firstVisitAfter: intervalDays,
        lastVisitBefore: totalDays - intervalDays,
        visits: Array.from({ length: numberOfVisits }, (_, i) => {
          const visitDate = new Date(start);
          visitDate.setDate(start.getDate() + (i * intervalDays));
          return {
            visitNumber: i + 1,
            date: visitDate.toISOString().split('T')[0],
            daysFromStart: i * intervalDays
          };
        })
      };
    } catch (error) {
      return null;
    }
  };

  const handleScheduleVisit = (amc: AMC) => {
    setSelectedAMCForVisit(amc);
    setShowVisitScheduler(true);
  };

  const handleCreateServiceTicket = (amc: AMC) => {
    setSelectedAMC(amc);
    setShowServiceModal(true);
  };

  const handleCreatePurchaseOrder = (amc: AMC) => {
    setSelectedAMC(amc);
    setShowPOModal(true);
  };

  const handleRenewContract = (amc: AMC) => {
    setSelectedAMCForRenewal(amc);
    setShowContractRenewal(true);
  };

  const handleRegenerateVisits = async (amc: AMC) => {
    if (window.confirm('Are you sure you want to regenerate the visit schedule? This will clear all existing scheduled visits.')) {
      try {
        setSubmitting(true);
        await apiClient.amc.regenerateVisits(amc._id);
        
        // Refresh the AMC data to get updated visit schedule
        await fetchAMCs();
        
        // Close the details modal and show success message
        setShowDetailsModal(false);
        toast.success('Visit schedule regenerated successfully!');
      } catch (error: any) {
        console.error('Error regenerating visits:', error);
        
        // Show error message as toast
        const errorMessage = error.response?.data?.message || error.message || 'Failed to regenerate visit schedule. Please try again.';
        toast.error(errorMessage);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleCompleteVisit = (amc: AMC, visit: any, visitIndex: number) => {
    setSelectedAMC(amc);
    setSelectedVisitForUpdate(visit);
    setVisitViewMode('edit');
    setShowVisitStatusUpdate(true);
  };

  const handleViewVisitDetails = (amc: AMC, visit: any, visitIndex: number) => {
    setSelectedAMC(amc);
    setSelectedVisitForUpdate(visit);
    setVisitViewMode('view');
    setShowVisitStatusUpdate(true);
  };

  // Add state for visit view mode
  const [visitViewMode, setVisitViewMode] = useState<'edit' | 'view'>('edit');

  const handleSubmitVisit = async () => {
    if (!selectedAMC) return;

    setSubmitting(true);
    try {
      await apiClient.amc.scheduleVisit(selectedAMC._id, visitFormData);
      await fetchAMCs(); // Refresh data
      setShowVisitModal(false);
      setSelectedAMC(null);
    } catch (error: any) {
      console.error('Error scheduling visit:', error);
      setFormErrors({ general: 'Failed to schedule visit' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitRenewal = async () => {
    if (!selectedAMC) return;

    setSubmitting(true);
    try {
      await apiClient.amc.renew(selectedAMC._id, renewalFormData);
      await fetchAMCs(); // Refresh data
      setShowRenewalModal(false);
      setSelectedAMC(null);
    } catch (error: any) {
      console.error('Error renewing contract:', error);
      setFormErrors({ general: 'Failed to renew contract' });
    } finally {
      setSubmitting(false);
    }
  };

  // Enhanced workflow functions
  const handleSiteSurvey = async (customerId: string) => {
    setWorkflowStep('survey');
    setSiteSurveyData({
      surveyDate: new Date().toISOString().split('T')[0],
      surveyor: '',
      siteConditions: '',
      accessibility: '',
      powerRequirements: '',
      environmentalFactors: '',
      photos: [],
      recommendations: ''
    });
  };

  const handleEquipmentAssessment = async () => {
    setWorkflowStep('assessment');
    // Auto-populate based on product data if available
  };

  const handleServicePlanning = async () => {
    setWorkflowStep('planning');
    // Generate service plan based on assessment
    const recommendedVisits = calculateVisitFrequency(equipmentAssessment.condition, equipmentAssessment.equipmentAge);
    setServicePlan(prev => ({
      ...prev,
      visitFrequency: recommendedVisits
    }));
  };

  const calculateVisitFrequency = (condition: string, age: string): 'weekly' | 'monthly' | 'quarterly' | 'biannual' => {
    if (condition === 'poor' || parseInt(age) > 10) return 'monthly';
    if (condition === 'fair' || parseInt(age) > 5) return 'quarterly';
    return 'biannual';
  };

  const generateAutomaticVisitSchedule = (amc: AMC): VisitSchedule[] => {
    const visits: VisitSchedule[] = [];
    const startDate = new Date(amc.startDate);
    const endDate = new Date(amc.endDate);
    const visitCount = amc.scheduledVisits;
    
    // Calculate interval between visits
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const interval = Math.floor(totalDays / visitCount);
    
    for (let i = 0; i < visitCount; i++) {
      const visitDate = new Date(startDate);
      visitDate.setDate(startDate.getDate() + (interval * i));
      
      visits.push({
        scheduledDate: visitDate.toISOString(),
        status: 'pending',
        visitType: 'routine',
        duration: servicePlan.visitDuration,
        checklistItems: visitTemplates[0].checklistItems.map(item => ({
          item,
          completed: false,
          notes: ''
        }))
      });
    }
    
    return visits;
  };

  const handleEmergencyService = async (amc: AMC) => {
    // Create emergency service ticket
    const emergencyTicket = {
      amc: amc._id,
      customer: amc.customer,
      products: amc.products,
      priority: 'critical',
      visitType: 'emergency',
      scheduledDate: new Date().toISOString(),
      status: 'pending',
      checklistItems: visitTemplates[1].checklistItems.map(item => ({
        item,
        completed: false,
        notes: ''
      }))
    };
    
    try {
      // Send to service management
      await apiClient.services.create(emergencyTicket);
    } catch (error) {
      console.error('Error creating emergency service:', error);
    }
  };

  const handlePartsReplenishment = async (amc: AMC, partsNeeded: any[]) => {
    // Create purchase order for parts
    const poData = {
      supplier: 'Default Supplier', // Should be configurable
      items: partsNeeded.map(part => ({
        product: part.productId,
        quantity: part.quantity,
        unitPrice: part.estimatedCost || 0
      })),
      sourceType: 'amc',
      sourceId: amc._id,
      priority: 'medium',
      notes: `Parts replenishment for AMC: ${amc.contractNumber}`
    };
    
    try {
      const response = await apiClient.purchaseOrders.create(poData);
      
      // Update AMC with linked PO
      const updatedAMC = {
        ...amc,
        linkedPurchaseOrders: [...(amc.linkedPurchaseOrders || []), response.data._id]
      };
      await apiClient.amc.update(amc._id, updatedAMC);
    } catch (error) {
      console.error('Error creating purchase order:', error);
    }
  };

  const calculatePerformanceMetrics = (amc: AMC) => {
    const completedVisits = amc.visitSchedule.filter(visit => visit.status === 'completed');
    const totalVisits = amc.visitSchedule.length;
    
    const avgResponseTime = completedVisits.reduce((acc, visit) => {
      if (visit.completedDate && visit.scheduledDate) {
        const scheduled = new Date(visit.scheduledDate);
        const completed = new Date(visit.completedDate);
        return acc + Math.abs(completed.getTime() - scheduled.getTime()) / (1000 * 60 * 60);
      }
      return acc;
    }, 0) / completedVisits.length;

    const customerSatisfaction = completedVisits.reduce((acc, visit) => {
      return acc + (visit.customerFeedback?.rating || 0);
    }, 0) / completedVisits.length;

    return {
      completionRate: totalVisits > 0 ? (completedVisits.length / totalVisits) * 100 : 0,
      averageResponseTime: avgResponseTime || 0,
      customerSatisfaction: customerSatisfaction || 0,
      emergencyCallsCount: amc.visitSchedule.filter(visit => visit.visitType === 'emergency').length,
      onTimePerformance: completedVisits.filter(visit => {
        if (!visit.completedDate || !visit.scheduledDate) return false;
        const scheduled = new Date(visit.scheduledDate);
        const completed = new Date(visit.completedDate);
        return completed <= scheduled;
      }).length / completedVisits.length * 100
    };
  };

  const handleContractRenewal = async (amc: AMC) => {
    const metrics = calculatePerformanceMetrics(amc);
    
    // Auto-calculate renewal terms based on performance
    const performanceBonus = metrics.customerSatisfaction > 4 ? 0.05 : 0; // 5% discount for high satisfaction
    const loyaltyDiscount = amc.contractDuration && amc.contractDuration > 12 ? 0.1 : 0; // 10% for long-term contracts
    
    setRenewalFormData({
      newEndDate: new Date(new Date(amc.endDate).setFullYear(new Date(amc.endDate).getFullYear() + 1)).toISOString().split('T')[0],
      contractValue: amc.contractValue * (1 - performanceBonus - loyaltyDiscount),
      scheduledVisits: amc.scheduledVisits,
      terms: `Renewed contract with ${performanceBonus > 0 ? 'performance bonus' : ''} ${loyaltyDiscount > 0 ? 'loyalty discount' : ''}`
    });
    
    setSelectedAMC(amc);
    setShowRenewalModal(true);
  };

  const handleInvoiceGeneration = async (amc: AMC) => {
    // Calculate prorated amount based on billing cycle
    const now = new Date();
    const lastPayment = amc.lastPaymentDate ? new Date(amc.lastPaymentDate) : new Date(amc.startDate);
    
    let billingPeriod = 1; // months
    switch (amc.billingCycle) {
      case 'quarterly': billingPeriod = 3; break;
      case 'half-yearly': billingPeriod = 6; break;
      case 'yearly': billingPeriod = 12; break;
      default: billingPeriod = 1;
    }
    
    const monthlyAmount = amc.contractValue / 12;
    const invoiceAmount = monthlyAmount * billingPeriod;
    
    const invoiceData = {
      customer: amc.customer,
      amcContract: amc._id,
      amount: invoiceAmount,
      dueDate: new Date(now.setMonth(now.getMonth() + 1)).toISOString(),
      description: `AMC Service - ${amc.contractNumber}`,
      billingPeriod: amc.billingCycle,
      items: [{
        description: `AMC Service (${amc.billingCycle})`,
        quantity: 1,
        rate: invoiceAmount,
        amount: invoiceAmount
      }]
    };
    
    try {
      const response = await apiClient.invoices.create(invoiceData);
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  // Enhanced functionality handlers
  const handleGenerateReport = () => {
    setShowReportModal(true);
  };

  // Helper function to check if any filters are active
  const hasActiveFilters = () => {
    return searchTerm || 
           statusFilter !== 'all' || 
           expiryFilter !== 'all' || 
           (filterMode === 'visitDate' && visitStartDate && visitEndDate);
  };

  // Helper function to get a summary of active filters
  const getActiveFiltersSummary = () => {
    const filters = [];
    
    if (searchTerm) filters.push(`Search: "${searchTerm}"`);
    if (statusFilter !== 'all') filters.push(`Status: ${statusFilter}`);

    if (expiryFilter !== 'all') filters.push(`Expiring: ${expiryFilter}`);
          if (filterMode === 'visitDate' && visitStartDate && visitEndDate) {
        filters.push(`Visit Date Range: ${visitStartDate} to ${visitEndDate}`);
      }
    
    return filters.join(', ');
  };

  const handleExportToExcel = async () => {
    try {
      setSubmitting(true);
      
      // Build export parameters based on current filters
      // This ensures the exported data matches exactly what is shown in the current view
      const exportParams: any = {};

      // Add current filters
      if (searchTerm) exportParams.search = searchTerm;
      if (statusFilter !== 'all') exportParams.status = statusFilter;
  
      if (expiryFilter !== 'all') exportParams.expiringIn = parseInt(expiryFilter.replace('days', ''));

      // Add visit date filter if active
      if (filterMode === 'visitDate' && visitStartDate && visitEndDate) {
        exportParams.startDate = visitStartDate;
        exportParams.endDate = visitEndDate;
      }

      // Determine if we're exporting all data or filtered data
      const filtersActive = hasActiveFilters();

      const exportMessage = filtersActive 
        ? `Preparing export for ${amcs.length} filtered contracts...` 
        : 'Preparing export for all AMC contracts...';

      toast.loading(exportMessage, { id: 'export' });

      console.log('Exporting with parameters:', exportParams);
      console.log('Current view shows:', amcs.length, 'contracts');
      console.log('Has active filters:', filtersActive);
      if (filtersActive) {
        console.log('Active filters:', getActiveFiltersSummary());
      }
      
      // Debug: Log the exact URL being called
      const queryString = new URLSearchParams(exportParams).toString();
      console.log('Export URL parameters:', queryString);
      console.log('Full export URL:', `/amc/export-excel?${queryString}`);

      // Call the export API
      const response = await apiClient.amc.exportToExcel(exportParams);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on whether it's filtered or all data
      const filterIndicator = filtersActive ? '_Filtered' : '_All';
      const filename = `AMC_Export${filterIndicator}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success message with appropriate context
      const successMessage = filtersActive 
        ? `Filtered AMC data exported successfully! (${amcs.length} contracts)`
        : `All AMC data exported successfully! (${amcs.length} contracts)`;
      
      toast.success(successMessage, { id: 'export' });
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export AMC data. Please try again.', { id: 'export' });
    } finally {
      setSubmitting(false);
    }
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setExpiryFilter('all');
    setPaymentFilter('all');
    setFilterMode('all');
          setVisitStartDate('');
      setVisitEndDate('');
    setVisitDateSummary(null);
  };

  // Handle page change for pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };



  return (
    <div className="p-4 space-y-3">
      <PageHeader 
        title="Annual Maintenance Contracts"
        subtitle="Manage AMC contracts, visits, and renewals"
      >
        <div className="flex space-x-3">
          <button
            onClick={() => setShowExpiryModal(true)}
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-orange-700 hover:to-orange-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Bell className="w-4 h-4" />
            <span className="text-sm">Expiry Alerts</span>
          </button>
          
          <button
            onClick={handleGenerateReport}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm">Generate Reports</span>
          </button>

          {/* Export Button */}
          <button
            onClick={handleExportToExcel}
            disabled={submitting}
            className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 ${
              // Check if any filters are active
              hasActiveFilters()
                ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white'
                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white'
            }`}
            title={
              hasActiveFilters()
                ? `Export ${amcs.length} filtered contracts\nActive filters: ${getActiveFiltersSummary()}`
                : 'Export all AMC contracts'
            }
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">
              {hasActiveFilters()
                ? `Export Filtered (${amcs.length})`
                : 'Export All'
              }
            </span>
          </button>

          <button
            onClick={handleCreateAMC}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New AMC Contract</span>
          </button>
        </div>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {filterMode === 'visitDate' && visitDateSummary ? (
          <>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Contracts with Visits</p>
                  <p className="text-xl font-bold text-gray-900">{visitDateSummary.totalContracts}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Visits</p>
                  <p className="text-xl font-bold text-gray-900">{visitDateSummary.totalVisitsOnDate}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-100 text-green-600">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Unique Customers</p>
                  <p className="text-xl font-bold text-gray-900">{visitDateSummary.uniqueCustomers}</p>
                </div>
                <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                  <Building className="w-6 h-6" />
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">Total Value</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(visitDateSummary.totalContractValue)}</p>
                </div>
                <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                  <IndianRupee className="w-6 h-6" />
                </div>
              </div>
            </div>
          </>
        ) : (
          stats.map((stat, index) => (
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
          ))
        )}
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by contract number, customer name, or engine number..."
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

                setShowExpiryDropdown(false);
                setShowPaymentDropdown(false);
                setShowBillingCycleDropdown(false);
                setShowVisitTypeDropdown(false);
                setShowAssigneeDropdown(false);
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
                      setStatusFilter(option.value as AMCStatus | 'all');
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



          {/* Visit Date Filter */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (filterMode === 'visitDate') {
                  setFilterMode('all');
                  setVisitStartDate('');
      setVisitEndDate('');
                  setVisitDateSummary(null);
                } else {
                  setFilterMode('visitDate');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filterMode === 'visitDate' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              Visit Date Filter
            </button>
            
            {filterMode === 'visitDate' && (
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">From:</label>
                  <input
                    type="date"
                    value={visitStartDate}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      // If end date exists and is before new start, reset end date
                      if (visitEndDate && new Date(visitEndDate) < new Date(newStart)) {
                        toast.error('End date cannot be before start date');
                        setVisitEndDate('');
                      }
                      setVisitStartDate(newStart);
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Start date"
                    max={visitEndDate || undefined}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">To:</label>
                  <input
                    type="date"
                    value={visitEndDate}
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      if (visitStartDate && new Date(newEnd) < new Date(visitStartDate)) {
                        toast.error('End date cannot be before start date');
                        return; // Block selecting invalid end date
                      }
                      setVisitEndDate(newEnd);
                    }}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="End date"
                    min={visitStartDate || undefined}
                  />
                </div>
                

              </div>
            )}
          </div>

          {/* Clear Filters Button */}
          {(searchTerm || statusFilter !== 'all' || filterMode === 'visitDate') && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            {filterMode === 'visitDate' && visitDateSummary ? (
              <span>
                Showing {amcs.length} contracts with {visitDateSummary.totalVisitsInRange} visits scheduled between {visitStartDate} and {visitEndDate}
                {visitDateSummary.uniqueCustomers > 0 && ` • ${visitDateSummary.uniqueCustomers} unique customers`}
              </span>
            ) : (
              <span>
                Showing {filteredAMCs.length} of {totalItems} contracts
                {searchTerm && ` • Search results for "${searchTerm}"`}
              </span>
            )}
          </span>
          
          {filterMode === 'visitDate' && visitDateSummary && (
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span>Total Value: {formatCurrency(visitDateSummary.totalContractValue)}</span>
              <span>Days in Range: {visitDateSummary.daysInRange}</span>
              <span>Avg Visits/Day: {visitDateSummary.averageVisitsPerDay}</span>
            </div>
          )}
        </div>
      </div>

      {/* AMC Contracts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AMC Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engine Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  No. of Visits
                </th>
                {filterMode === 'visitDate' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Visits between {visitStartDate} and {visitEndDate}
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  End Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAMCs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center">
                    {filterMode === 'visitDate' && visitStartDate && visitEndDate ? (
                      <div className="text-gray-500">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">No visits scheduled between {visitStartDate} and {visitEndDate}</p>
                        <p className="text-sm">Try selecting a different date range or check if there are any AMC contracts with scheduled visits.</p>
                      </div>
                    ) : (
                      <div className="text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium mb-2">No AMC contracts found</p>
                        <p className="text-sm">Try adjusting your search criteria or create a new AMC contract.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAMCs.map((amc) => (
                  <tr key={amc._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{amc.contractNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{getCustomerName(amc.customer)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        amc.amcType === 'AMC' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {amc.amcType || 'AMC'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{amc.engineSerialNumber || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">{amc.numberOfVisits || amc.scheduledVisits || 0}</div>
                      </div>
                    </td>
                    {filterMode === 'visitDate' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">{amc.visitCountInRange || 0} visit{(amc.visitCountInRange || 0) !== 1 ? 's' : ''}</div>
                          {amc.visitsInRange && amc.visitsInRange.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {amc.visitsInRange.map((visit: any, index: number) => (
                                <div key={index} className="flex items-center space-x-1">
                                  <span className={`w-2 h-2 rounded-full ${
                                    visit.status === 'completed' ? 'bg-green-500' :
                                    visit.status === 'pending' ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}></span>
                                  <span className="capitalize">{visit.status}</span>
                                  {visit.assignedTo && (
                                    <span>• {getUserName(visit.assignedTo)}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(amc.amcStartDate || amc.startDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(amc.amcEndDate || amc.endDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(amc.status)}`}>
                        {getStatusIcon(amc.status)}
                        <span className="ml-1 capitalize">{amc.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${(amc.completedVisits / amc.scheduledVisits) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600">{amc.completedVisits}/{amc.scheduledVisits}</span>
                      </div>
                      {/* Visit Status Indicators */}
                      {amc.visitSchedule && amc.visitSchedule.length > 0 && (
                        <div className="flex items-center space-x-1 mt-1">
                          {amc.visitSchedule.slice(0, 3).map((visit: any, index: number) => (
                            <div
                              key={index}
                              className={`w-2 h-2 rounded-full ${
                                visit.status === 'completed' ? 'bg-green-500' :
                                visit.status === 'pending' ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              title={`Visit ${index + 1}: ${visit.status} - ${formatDate(visit.scheduledDate)}`}
                            />
                          ))}
                          {amc.visitSchedule.length > 3 && (
                            <span className="text-xs text-gray-500">+{amc.visitSchedule.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {amc.daysUntilExpiry !== null && amc.daysUntilExpiry !== undefined ? (
                          <span className={amc.daysUntilExpiry <= 30 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {amc.daysUntilExpiry} days
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openDetailsModal(amc)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleScheduleVisit(amc)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Schedule Visit"
                        >
                          <CalendarDays className="w-4 h-4" />
                        </button>
                        
                        
                        
                        <button
                          onClick={() => handleEditAMC(amc)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Edit Contract"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleStatusUpdate(amc)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50"
                          title="Change Status"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        
                        {amc.status === 'active' && amc.daysUntilExpiry && amc.daysUntilExpiry <= 60 && (
                          <button
                            onClick={() => handleRenewContract(amc)}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50"
                            title="Renew Contract"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteAMC(amc)}
                          disabled={!canDeleteContract(amc)}
                          className={`p-1 rounded transition-colors ${
                            canDeleteContract(amc)
                              ? 'text-red-600 hover:text-red-900 hover:bg-red-50'
                              : 'text-gray-400 cursor-not-allowed'
                          }`}
                          title={
                            canDeleteContract(amc)
                              ? 'Delete Contract'
                              : `Cannot delete ${amc.status} contract with completed visits`
                          }
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}

      {/* Simplified AMC Create Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Create New AMC Contract</h2>
                <p className="text-sm text-gray-600">Fill in the required information to create an AMC contract</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetAMCForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitAMC(); }} className="space-y-4">
                {formErrors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{formErrors.general}</p>
                  </div>
                )}

                {/* Customer Selection */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <div className="relative dropdown-container">
                    <input
                      type="text"
                      value={customerDropdown.searchTerm || (amcFormData.customer ? customers.find(c => c._id === amcFormData.customer)?.name || '' : '')}
                      onChange={(e) => {
                        setCustomerDropdown(prev => ({ ...prev, searchTerm: e.target.value, isOpen: true }));
                        handleDropdownSearch('customer', e.target.value);
                        if (formErrors.customer) {
                          setFormErrors(prev => ({ ...prev, customer: '' }));
                        }
                      }}
                      onKeyDown={(e) => handleDropdownKeyDown('customer', e, customerDropdown.filteredOptions, (value) => handleDropdownSelect('customer', value))}
                      onFocus={() => {
                        handleDropdownFocus('customer');
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setCustomerDropdown(prev => ({ ...prev, isOpen: false }));
                        }, 200);
                      }}
                      placeholder="Search customer..."
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.customer ? 'border-red-500' : 'border-gray-300'
                      } ${customerDropdown.isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    />
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>

                  {customerDropdown.isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] max-h-60 overflow-y-auto">
                      {customerDropdown.filteredOptions.length > 0 ? (
                        customerDropdown.filteredOptions.map((customer, index) => (
                          <button
                            key={customer._id}
                            type="button"
                            onClick={() => handleDropdownSelect('customer', customer._id)}
                            className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors ${
                              index === customerDropdown.selectedIndex ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                            }`}
                          >
                            <div className="font-medium">{customer.name}</div>
                            {customer.email && (
                              <div className="text-xs text-gray-500">{customer.email}</div>
                            )}
                            {customer.phone && (
                              <div className="text-xs text-gray-500">{customer.phone}</div>
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

                {/* Customer Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <select
                    value={amcFormData.customerAddress}
                    onChange={(e) => setAmcFormData({ ...amcFormData, customerAddress: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.customerAddress ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Address</option>
                    {customerAddresses.map((address, index) => (
                      <option key={index} value={address.fullAddress}>
                        {address.fullAddress} {address.isPrimary ? '(Primary)' : ''}
                      </option>
                    ))}
                  </select>
                  {formErrors.customerAddress && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.customerAddress}</p>
                  )}
                </div>

                {/* Contact Person and Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name *</label>
                    <input
                      type="text"
                      value={amcFormData.contactPersonName}
                      onChange={(e) => setAmcFormData({ ...amcFormData, contactPersonName: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.contactPersonName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Contact person name"
                    />
                    {formErrors.contactPersonName && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.contactPersonName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                    <input
                      type="text"
                      value={amcFormData.contactNumber}
                      onChange={(e) => setAmcFormData({ ...amcFormData, contactNumber: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.contactNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Contact number"
                    />
                    {formErrors.contactNumber && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.contactNumber}</p>
                    )}
                  </div>
                </div>

                {/* Engine Serial Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Engine Serial Number *</label>
                  <select
                    value={amcFormData.engineSerialNumber}
                    onChange={(e) => {
                      const engineSerial = e.target.value;
                      setAmcFormData({ ...amcFormData, engineSerialNumber: engineSerial });
                      if (engineSerial) {
                        const selectedEngine = customerEngines.find(engine => engine.engineSerialNumber === engineSerial);
                        if (selectedEngine) {
                          console.log('Selected engine:', selectedEngine); // Debug log
                          
                          // Format the commissioning date properly for the date input
                          let formattedCommissioningDate = '';
                          if (selectedEngine.commissioningDate) {
                            const date = new Date(selectedEngine.commissioningDate);
                            if (!isNaN(date.getTime())) {
                              formattedCommissioningDate = date.toISOString().split('T')[0];
                            }
                          }
                          
                          setAmcFormData({
                            ...amcFormData,
                            engineSerialNumber: engineSerial,
                            engineModel: selectedEngine.engineModel,
                            kva: selectedEngine.kva,
                            dgMake: selectedEngine.dgMake,
                            dateOfCommissioning: formattedCommissioningDate
                          });
                        }
                      } else {
                        // Clear engine-related fields when no engine is selected
                        setAmcFormData({
                          ...amcFormData,
                          engineSerialNumber: '',
                          engineModel: '',
                          kva: 0,
                          dgMake: '',
                          dateOfCommissioning: ''
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.engineSerialNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Engine Serial Number</option>
                    {customerEngines.map((engine, index) => (
                      <option key={index} value={engine.engineSerialNumber}>
                        {engine.engineSerialNumber} - {engine.kva} KVA
                      </option>
                    ))}
                  </select>
                  {formErrors.engineSerialNumber && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.engineSerialNumber}</p>
                  )}
                </div>

                {/* Auto-populated fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={amcFormData.engineModel}
                      onChange={(e) => setAmcFormData({ ...amcFormData, engineModel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Auto-populated from engine selection"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">KVA</label>
                    <input
                      type="number"
                      value={amcFormData.kva === 0 ? '' : amcFormData.kva}
                      onChange={(e) => setAmcFormData({ ...amcFormData, kva: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Auto-populated from engine selection"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DG Make</label>
                    <input
                      type="text"
                      value={amcFormData.dgMake}
                      onChange={(e) => setAmcFormData({ ...amcFormData, dgMake: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Auto-populated from engine selection"
                    />
                  </div>
                </div>

                {/* Date of Commissioning */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Commissioning</label>
                  <input
                    type="date"
                    value={amcFormData.dateOfCommissioning}
                    onChange={(e) => setAmcFormData({ ...amcFormData, dateOfCommissioning: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* AMC Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AMC Start Date *</label>
                    <input
                      type="date"
                      value={amcFormData.amcStartDate}
                      onChange={(e) => setAmcFormData({ ...amcFormData, amcStartDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.amcStartDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.amcStartDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.amcStartDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AMC End Date *</label>
                    <input
                      type="date"
                      value={amcFormData.amcEndDate}
                      onChange={(e) => setAmcFormData({ ...amcFormData, amcEndDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.amcEndDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.amcEndDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.amcEndDate}</p>
                    )}
                  </div>
                </div>

                {/* AMC Type and Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AMC Type *</label>
                    <select
                      value={amcFormData.amcType}
                      onChange={(e) => setAmcFormData({ ...amcFormData, amcType: e.target.value as 'AMC' | 'CAMC' })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.amcType ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="AMC">AMC</option>
                      <option value="CAMC">CAMC</option>
                    </select>
                    {formErrors.amcType && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.amcType}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Visits *</label>
                    <input
                      type="number"
                      min="1"
                      value={amcFormData.numberOfVisits === 0 ? '' : amcFormData.numberOfVisits}
                      onChange={(e) => setAmcFormData({ ...amcFormData, numberOfVisits: Number(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.numberOfVisits ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Number of visits"
                    />
                    {formErrors.numberOfVisits && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.numberOfVisits}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Oil Services *</label>
                    <input
                      type="number"
                      min="0"
                      value={amcFormData.numberOfOilServices === 0 ? '' : amcFormData.numberOfOilServices}
                      onChange={(e) => setAmcFormData({ ...amcFormData, numberOfOilServices: Number(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.numberOfOilServices ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Number of oil services"
                    />
                    {formErrors.numberOfOilServices && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.numberOfOilServices}</p>
                    )}
                  </div>
                </div>

                {/* Visit Schedule Preview */}
                {amcFormData.amcStartDate && amcFormData.amcEndDate && amcFormData.numberOfVisits > 0 && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Visit Schedule Preview</h4>
                    {(() => {
                      const intervals = calculateVisitIntervals(
                        amcFormData.amcStartDate, 
                        amcFormData.amcEndDate, 
                        amcFormData.numberOfVisits
                      );
                      
                      if (!intervals) return <p className="text-xs text-gray-500">Unable to calculate schedule</p>;
                      
                      return (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600">
                            <p>• Contract duration: {intervals.totalDays} days</p>
                            <p>• Visit interval: {intervals.intervalDays} days</p>
                            <p>• First visit: {intervals.firstVisitAfter} days after start</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {intervals.visits.map((visit) => (
                              <div key={visit.visitNumber} className="p-2 bg-white border border-gray-200 rounded text-center">
                                <div className="text-xs font-medium text-gray-900">Visit {visit.visitNumber}</div>
                                <div className="text-xs text-gray-600">{visit.date}</div>
                                <div className="text-xs text-gray-500">+{visit.daysFromStart} days</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </form>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetAMCForm();
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>💾</span>
                  <span>{submitting ? 'Saving...' : 'Save as Draft'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSubmitAMC}
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating Contract...' : 'Create AMC Contract'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit AMC Modal */}
      {showEditModal && editingAMC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Edit AMC Contract</h2>
                <p className="text-sm text-gray-600">Update the AMC contract information</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateAMC(); }} className="space-y-4">
                {formErrors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{formErrors.general}</p>
                  </div>
                )}

                {/* Changes Summary */}
                {editingAMC && (
                  (editingAMC.numberOfVisits !== amcFormData.numberOfVisits ||
                   editingAMC.amcStartDate !== amcFormData.amcStartDate ||
                   editingAMC.amcEndDate !== amcFormData.amcEndDate)
                ) && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center text-blue-700 mb-2">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      <span className="font-medium">Changes Detected</span>
                    </div>
                    <div className="text-sm text-blue-600 space-y-1">
                      {editingAMC.numberOfVisits !== amcFormData.numberOfVisits && (
                        <p>• Number of visits changed from {editingAMC.numberOfVisits} to {amcFormData.numberOfVisits}</p>
                      )}
                      {editingAMC.amcStartDate !== amcFormData.amcStartDate && (
                        <p>• AMC start date changed from {editingAMC.amcStartDate} to {amcFormData.amcStartDate}</p>
                      )}
                      {editingAMC.amcEndDate !== amcFormData.amcEndDate && (
                        <p>• AMC end date changed from {editingAMC.amcEndDate} to {amcFormData.amcEndDate}</p>
                      )}
                      <p className="font-medium mt-2">⚠️ These changes will automatically regenerate the visit schedule when you save.</p>
                    </div>
                  </div>
                )}

                {/* Customer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                  <select
                    value={amcFormData.customer}
                    onChange={(e) => {
                      const customerId = e.target.value;
                      setAmcFormData({ ...amcFormData, customer: customerId });
                      if (customerId) {
                        // Find the selected customer to auto-populate contact details
                        const selectedCustomer = customers.find(c => c._id === customerId);
                        if (selectedCustomer) {
                          setAmcFormData(prev => ({
                            ...prev,
                            customer: customerId,
                            contactPersonName: selectedCustomer.contactPersonName || '',
                            contactNumber: selectedCustomer.phone || ''
                          }));
                        }
                        fetchCustomerData(customerId);
                      } else {
                        // Clear contact details when no customer is selected
                        setAmcFormData(prev => ({
                          ...prev,
                          customer: '',
                          contactPersonName: '',
                          contactNumber: '',
                          customerAddress: ''
                        }));
                        setCustomerAddresses([]);
                        setCustomerEngines([]);
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.customer ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Customer</option>
                    {customers.map(customer => (
                      <option key={customer._id} value={customer._id}>{customer.name}</option>
                    ))}
                  </select>
                  {formErrors.customer && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.customer}</p>
                  )}
                </div>

                {/* Customer Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <select
                    value={amcFormData.customerAddress}
                    onChange={(e) => setAmcFormData({ ...amcFormData, customerAddress: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.customerAddress ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Address</option>
                    {customerAddresses.map((address, index) => (
                      <option key={index} value={address.fullAddress}>
                        {address.fullAddress} {address.isPrimary ? '(Primary)' : ''}
                      </option>
                    ))}
                  </select>
                  {formErrors.customerAddress && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.customerAddress}</p>
                  )}
                </div>

                {/* Contact Person and Number */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person Name *</label>
                    <input
                      type="text"
                      value={amcFormData.contactPersonName}
                      onChange={(e) => setAmcFormData({ ...amcFormData, contactPersonName: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.contactPersonName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Contact person name"
                    />
                    {formErrors.contactPersonName && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.contactPersonName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                    <input
                      type="text"
                      value={amcFormData.contactNumber}
                      onChange={(e) => setAmcFormData({ ...amcFormData, contactNumber: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.contactNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Contact number"
                    />
                    {formErrors.contactNumber && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.contactNumber}</p>
                    )}
                  </div>
                </div>

                {/* Engine Serial Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Engine Serial Number *</label>
                  <select
                    value={amcFormData.engineSerialNumber}
                    onChange={(e) => {
                      const engineSerial = e.target.value;
                      setAmcFormData({ ...amcFormData, engineSerialNumber: engineSerial });
                      if (engineSerial) {
                        const selectedEngine = customerEngines.find(engine => engine.engineSerialNumber === engineSerial);
                        if (selectedEngine) {
                          console.log('Selected engine:', selectedEngine); // Debug log
                          
                          // Format the commissioning date properly for the date input
                          let formattedCommissioningDate = '';
                          if (selectedEngine.commissioningDate) {
                            const date = new Date(selectedEngine.commissioningDate);
                            if (!isNaN(date.getTime())) {
                              formattedCommissioningDate = date.toISOString().split('T')[0];
                            }
                          }
                          
                          setAmcFormData({
                            ...amcFormData,
                            engineSerialNumber: engineSerial,
                            engineModel: selectedEngine.engineModel,
                            kva: selectedEngine.kva,
                            dgMake: selectedEngine.dgMake,
                            dateOfCommissioning: formattedCommissioningDate
                          });
                        }
                      } else {
                        // Clear engine-related fields when no engine is selected
                        setAmcFormData({
                          ...amcFormData,
                          engineSerialNumber: '',
                          engineModel: '',
                          kva: 0,
                          dgMake: '',
                          dateOfCommissioning: ''
                        });
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      formErrors.engineSerialNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Engine Serial Number</option>
                    {customerEngines.map((engine, index) => (
                      <option key={index} value={engine.engineSerialNumber}>
                        {engine.engineSerialNumber} - {engine.kva} KVA
                      </option>
                    ))}
                  </select>
                  {formErrors.engineSerialNumber && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.engineSerialNumber}</p>
                  )}
                </div>

                {/* Auto-populated fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input
                      type="text"
                      value={amcFormData.engineModel}
                      onChange={(e) => setAmcFormData({ ...amcFormData, engineModel: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Auto-populated from engine selection"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">KVA</label>
                    <input
                      type="number"
                      value={amcFormData.kva === 0 ? '' : amcFormData.kva}
                      onChange={(e) => setAmcFormData({ ...amcFormData, kva: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Auto-populated from engine selection"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DG Make</label>
                    <input
                      type="text"
                      value={amcFormData.dgMake}
                      onChange={(e) => setAmcFormData({ ...amcFormData, dgMake: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Auto-populated from engine selection"
                    />
                  </div>
                </div>

                {/* Date of Commissioning */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Commissioning</label>
                  <input
                    type="date"
                    value={amcFormData.dateOfCommissioning}
                    onChange={(e) => setAmcFormData({ ...amcFormData, dateOfCommissioning: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* AMC Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AMC Start Date *</label>
                    <input
                      type="date"
                      value={amcFormData.amcStartDate}
                      onChange={(e) => setAmcFormData({ ...amcFormData, amcStartDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.amcStartDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.amcStartDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.amcStartDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AMC End Date *</label>
                    <input
                      type="date"
                      value={amcFormData.amcEndDate}
                      onChange={(e) => setAmcFormData({ ...amcFormData, amcEndDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.amcEndDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.amcEndDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.amcEndDate}</p>
                    )}
                  </div>
                </div>
                
                {/* Show warning if dates changed */}
                {editingAMC && (
                  editingAMC.amcStartDate !== amcFormData.amcStartDate || 
                  editingAMC.amcEndDate !== amcFormData.amcEndDate
                ) && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center text-yellow-700">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      <span className="text-sm font-medium">Date Changes Detected</span>
                    </div>
                    <p className="text-xs text-yellow-600 mt-1">
                      Changing AMC start or end dates will affect the visit schedule. The schedule will be automatically regenerated when you save.
                    </p>
                  </div>
                )}

                {/* AMC Type and Numbers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">AMC Type *</label>
                    <select
                      value={amcFormData.amcType}
                      onChange={(e) => setAmcFormData({ ...amcFormData, amcType: e.target.value as 'AMC' | 'CAMC' })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.amcType ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="AMC">AMC</option>
                      <option value="CAMC">CAMC</option>
                    </select>
                    {formErrors.amcType && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.amcType}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Visits *</label>
                    <input
                      type="number"
                      min="1"
                      value={amcFormData.numberOfVisits === 0 ? '' : amcFormData.numberOfVisits}
                      onChange={(e) => setAmcFormData({ ...amcFormData, numberOfVisits: Number(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.numberOfVisits ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Number of visits"
                    />
                    {formErrors.numberOfVisits && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.numberOfVisits}</p>
                    )}
                    {/* Show warning if visits changed */}
                    {editingAMC && editingAMC.numberOfVisits !== amcFormData.numberOfVisits && (
                      <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                        <AlertTriangle className="w-3 h-3 inline mr-1" />
                        Visit schedule will be automatically regenerated when you save
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Oil Services *</label>
                    <input
                      type="number"
                      min="0"
                      value={amcFormData.numberOfOilServices === 0 ? '' : amcFormData.numberOfOilServices}
                      onChange={(e) => setAmcFormData({ ...amcFormData, numberOfOilServices: Number(e.target.value) || 0 })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.numberOfOilServices ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Number of oil services"
                    />
                    {formErrors.numberOfOilServices && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.numberOfOilServices}</p>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Form Actions */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleUpdateAMC()}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Updating Contract...' : 'Update AMC Contract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AMC Details Modal */}
      {showDetailsModal && selectedAMC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{selectedAMC.contractNumber}</h2>
                <p className="text-gray-600">AMC Contract Details</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="pl-2 pr-6 py-6 space-y-4">
              {/* Contract Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Customer Information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Customer Details
                  </h3>
                  {typeof selectedAMC.customer === 'object' ? (
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-600">Name</p>
                        <p className="font-medium">{selectedAMC.customer.name}</p>
                      </div>
                      {selectedAMC.customer.email && (
                        <div>
                          <p className="text-xs text-gray-600">Email</p>
                          <p className="font-medium">{selectedAMC.customer.email}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-600">Phone</p>
                        <p className="font-medium">{selectedAMC.customer.phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Address</p>
                        <p className="font-medium text-sm">{selectedAMC.customerAddress || selectedAMC.customer.address}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Type</p>
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                          {selectedAMC.customer.customerType}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">Customer information not available</p>
                  )}
                </div>

                {/* Contract Information */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Contract Information
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">Status</p>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedAMC.status)}`}>
                        {getStatusIcon(selectedAMC.status)}
                        <span className="ml-1 capitalize">{selectedAMC.status}</span>
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Duration</p>
                      <p className="font-medium">{formatDate(selectedAMC.startDate)} - {formatDate(selectedAMC.endDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Days Remaining</p>
                      <p className="font-medium">{selectedAMC.daysUntilExpiry || 0} days</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Created By</p>
                      <p className="font-medium">{getUserName(selectedAMC.createdBy)}</p>
                    </div>
                  </div>
                </div>

                {/* Visit Progress */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Visit Progress
                  </h3>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">
                        {selectedAMC.completedVisits}/{selectedAMC.scheduledVisits}
                      </div>
                      <p className="text-xs text-gray-600">Visits Completed</p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(selectedAMC.completedVisits / selectedAMC.scheduledVisits) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600">
                        {selectedAMC.completionPercentage || Math.round((selectedAMC.completedVisits / selectedAMC.scheduledVisits) * 100)}% Complete
                      </p>
                    </div>
                    {selectedAMC.nextVisitDate && (
                      <div className="text-center">
                        <p className="text-xs text-gray-600">Next Visit</p>
                        <p className="font-medium">{formatDate(selectedAMC.nextVisitDate)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* DG Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  DG Details
                </h3>
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-gray-600">Engine Serial Number</p>
                      <p className="font-medium text-gray-900">{selectedAMC.engineSerialNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Engine Model</p>
                      <p className="font-medium text-gray-900">{selectedAMC.engineModel}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">KVA Rating</p>
                      <p className="font-medium text-gray-900">{selectedAMC.kva} KVA</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">DG Make</p>
                      <p className="font-medium text-gray-900">{selectedAMC.dgMake}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Date of Commissioning</p>
                      <p className="font-medium text-gray-900">{formatDate(selectedAMC.dateOfCommissioning)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">AMC Type</p>
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                        {selectedAMC.amcType}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Visit Schedule */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CalendarDays className="w-5 h-5 mr-2" />
                  Visit Schedule
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scheduled Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned To
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Completion Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedAMC.visitSchedule.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                            No visits scheduled yet
                          </td>
                        </tr>
                      ) : (
                        selectedAMC.visitSchedule.map((visit, index) => (
                          <tr key={visit._id || index} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                              {formatDate(visit.scheduledDate)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                              {getUserName(visit.assignedTo) || '-'}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                                visit.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {visit.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                              {visit.completedDate ? (
                                <div>
                                  <div className="font-medium">{formatDate(visit.completedDate)}</div>
                                  {visit.customerSignature && (
                                    <span className="text-green-600 text-xs">✓ Signed</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">Not completed</span>
                              )}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                              {visit.status === 'pending' && (
                                <button
                                  onClick={() => handleCompleteVisit(selectedAMC, visit, index)}
                                  className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                                  title="Complete Visit"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              {visit.status === 'completed' && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-green-600 text-xs">
                                    ✓ Completed
                                  </span>
                                  <button
                                    onClick={() => handleViewVisitDetails(selectedAMC, visit, index)}
                                    className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                              {visit.status === 'cancelled' && (
                                <span className="text-red-600 text-xs">Cancelled</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Terms & Conditions */}
              {selectedAMC.terms && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Terms & Conditions</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedAMC.terms}</p>
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>
      )}

      {/* Expiry Alerts Modal */}
      {showExpiryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Contract Expiry Alerts</h2>
              <button
                onClick={() => setShowExpiryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {getExpiringContracts().length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Good!</h3>
                  <p className="text-gray-600">No contracts expiring in the next 30 days.</p>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {getExpiringContracts().length} contract(s) expiring soon
                    </h3>
                    <p className="text-gray-600">Contracts expiring within the next 30 days</p>
                  </div>
                  <div className="space-y-3">
                    {getExpiringContracts().map((amc) => (
                      <div key={amc._id} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{amc.contractNumber}</h4>
                            <p className="text-xs text-gray-600">{getCustomerName(amc.customer)}</p>
                            <p className="text-sm text-orange-700">
                              Expires on {formatDate(amc.endDate)} ({amc.daysUntilExpiry} days left)
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                setShowExpiryModal(false);
                                openDetailsModal(amc);
                              }}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                            >
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                setShowExpiryModal(false);
                                handleRenewContract(amc);
                              }}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              Renew
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Modals */}
      <AMCReport 
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />

      <VisitScheduler
        isOpen={showVisitScheduler}
        onClose={() => setShowVisitScheduler(false)}
        amcId={selectedAMCForVisit?._id || ''}
        amcData={selectedAMCForVisit}
        onSuccess={fetchAMCs}
      />

      <ContractRenewal
        isOpen={showContractRenewal}
        onClose={() => setShowContractRenewal(false)}
        amcData={selectedAMCForRenewal}
        isBulkRenewal={false}
      />

      <VisitStatusUpdate
        isOpen={showVisitStatusUpdate}
        onClose={() => {
          setShowVisitStatusUpdate(false);
          setSelectedVisitForUpdate(null);
        }}
        visit={selectedVisitForUpdate}
        visitIndex={selectedVisitForUpdate ? selectedAMC?.visitSchedule.findIndex((v: any) => v === selectedVisitForUpdate) || 0 : 0}
        amcId={selectedAMC?._id || ''}
        onSuccess={async () => {
          await fetchAMCs();
          setShowDetailsModal(false);
        }}
        mode={visitViewMode}
      />



      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && amcToDelete && (
        <ConfirmationModal
          isOpen={showDeleteConfirmModal}
          onClose={() => {
            setShowDeleteConfirmModal(false);
            setAmcToDelete(null);
          }}
          onConfirm={confirmDeleteAMC}
          title="Delete AMC Contract"
          message={`Are you sure you want to delete the AMC contract "${amcToDelete.contractNumber}" (Status: ${amcToDelete.status})? This action cannot be undone.`}
          type="danger"
          confirmText="Yes, Delete"
          cancelText="No, Cancel"
        />
      )}

      {/* Status Update Modal */}
      {showStatusUpdateModal && amcToUpdateStatus && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md m-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Update Contract Status</h2>
                <p className="text-sm text-gray-600">Change the status of {amcToUpdateStatus.contractNumber}</p>
              </div>
              <button
                onClick={() => {
                  setShowStatusUpdateModal(false);
                  setAmcToUpdateStatus(null);
                  setNewStatus('active');
                  setStatusUpdateReason('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Current Status Display */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">Current Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(amcToUpdateStatus.status)}`}>
                  {getStatusIcon(amcToUpdateStatus.status)}
                  <span className="ml-1 capitalize">{amcToUpdateStatus.status}</span>
                </span>
              </div>

              {/* New Status Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as AMCStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="suspended">Suspended</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              {/* Reason for Status Change */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">Reason for Status Change (Optional)</label>
                <textarea
                  value={statusUpdateReason}
                  onChange={(e) => setStatusUpdateReason(e.target.value)}
                  placeholder="e.g., Customer request, contract violation, etc."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Status Change Warnings */}
              {newStatus === 'cancelled' && amcToUpdateStatus.status === 'active' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center text-yellow-700">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Cancelling Active Contract</span>
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    Cancelling an active contract will stop all scheduled visits and may affect billing. Consider adding a reason for audit purposes.
                  </p>
                </div>
              )}

              {newStatus === 'expired' && amcToUpdateStatus.status === 'active' && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center text-orange-700">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    <span className="text-sm font-medium">Marking Contract as Expired</span>
                  </div>
                  <p className="text-xs text-orange-600 mt-1">
                    This will mark the contract as expired. All scheduled visits will be cancelled.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setShowStatusUpdateModal(false);
                  setAmcToUpdateStatus(null);
                  setNewStatus('active');
                  setStatusUpdateReason('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmStatusUpdate}
                disabled={newStatus === amcToUpdateStatus.status}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AMCManagement; 