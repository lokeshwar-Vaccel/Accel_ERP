import React, { useState, useEffect, useRef } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';

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
  contactPerson?: string;
  customerType: string;
  location?: {
    latitude?: number;
    longitude?: number;
    address: string;
  };
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
}

interface AMCFormData {
  customer: string;
  products: string[];
  startDate: string;
  endDate: string;
  contractValue: number;
  scheduledVisits: number;
  billingCycle: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
  discountPercentage: number;
  responseTime: number;
  emergencyContactHours: string;
  coverageArea: string;
  terms: string;
  renewalTerms: string;
  exclusions: string[];
}

const AMCManagement: React.FC = () => {
  // Core state
  const [amcs, setAmcs] = useState<AMC[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [serviceTickets, setServiceTickets] = useState<ServiceTicket[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AMCStatus | 'all'>('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [expiryFilter, setExpiryFilter] = useState('all'); // all, 30days, 60days, 90days
  const [paymentFilter, setPaymentFilter] = useState('all');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  
  // Selected data
  const [selectedAMC, setSelectedAMC] = useState<AMC | null>(null);
  const [editingAMC, setEditingAMC] = useState<AMC | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<VisitSchedule | null>(null);
  
  // Form data
  const [amcFormData, setAmcFormData] = useState<AMCFormData>({
    customer: '',
    products: [],
    startDate: '',
    endDate: '',
    contractValue: 0,
    scheduledVisits: 4,
    billingCycle: 'monthly',
    discountPercentage: 0,
    responseTime: 24,
    emergencyContactHours: '9 AM - 6 PM',
    coverageArea: '',
    terms: '',
    renewalTerms: '',
    exclusions: []
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
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showExpiryDropdown, setShowExpiryDropdown] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);
  const [showBillingCycleDropdown, setShowBillingCycleDropdown] = useState(false);
  const [showVisitTypeDropdown, setShowVisitTypeDropdown] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

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

  const fetchAMCs = async () => {
    try {
      console.log('Fetching AMCs from API...');
      const response = await apiClient.amc.getAll();
      console.log('AMC API Response:', response);
      
      // Handle response format - API returns { success: boolean; data: { contracts: any[] }; pagination: any }
      let amcData: AMC[] = [];
      if (response.success && response.data) {
        const data = response.data as any;
        if (data.contracts && Array.isArray(data.contracts)) {
          amcData = data.contracts;
          console.log('Found AMC data:', amcData.length, 'contracts');
        } else if (Array.isArray(response.data)) {
          // Fallback for different response format
          amcData = response.data;
          console.log('Found AMC data (fallback format):', amcData.length, 'contracts');
        } else {
          console.log('Unexpected response format for AMC data:', response.data);
        }
      } else {
        console.log('No AMC data in response or unsuccessful response');
      }
      
      setAmcs(amcData);
      
      // Only show fallback data if there's no real data
      if (amcData.length === 0) {
        console.log('No AMC data found, showing empty state instead of mock data');
      }
    } catch (error) {
      console.error('Error fetching AMCs:', error);
      console.log('API call failed, showing empty state instead of mock data');
      // Don't show fallback data - show the actual error state
      setAmcs([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers from API...');
      const response = await apiClient.customers.getAll();
      console.log('Customers API Response:', response);
      
      let customersData: Customer[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        customersData = response.data;
        console.log('Found customers:', customersData.length);
      } else if (response.data && Array.isArray(response.data)) {
        // Fallback for different response format
        customersData = response.data;
        console.log('Found customers (fallback format):', customersData.length);
      } else {
        console.log('No customer data or unexpected format:', response);
      }
      
      setCustomers(customersData);
      
      // If no customers found, create some sample data for development
      if (customersData.length === 0) {
        console.log('No customers found, using sample data for development');
        const sampleCustomers: Customer[] = [
          {
            _id: 'cust-1',
            name: 'ABC Manufacturing Ltd',
            email: 'contact@abcmfg.com',
            phone: '+91-9876543210',
            address: 'Industrial Area, Sector 45, Gurgaon, Haryana',
            contactPerson: 'Rajesh Kumar',
            customerType: 'corporate'
          },
          {
            _id: 'cust-2',
            name: 'TechCorp Solutions',
            email: 'admin@techcorp.co.in',
            phone: '+91-8765432109',
            address: 'IT Park, Electronic City, Bangalore, Karnataka',
            contactPerson: 'Priya Sharma',
            customerType: 'enterprise'
          },
          {
            _id: 'cust-3',
            name: 'Global Textiles Pvt Ltd',
            email: 'operations@globaltextiles.com',
            phone: '+91-7654321098',
            address: 'Textile Hub, Coimbatore, Tamil Nadu',
            contactPerson: 'Murugan S',
            customerType: 'corporate'
          },
          {
            _id: 'cust-4',
            name: 'Metro Hospital',
            email: 'admin@metrohospital.org',
            phone: '+91-6543210987',
            address: 'Medical District, Mumbai, Maharashtra',
            contactPerson: 'Dr. Anita Desai',
            customerType: 'healthcare'
          },
          {
            _id: 'cust-5',
            name: 'Green Energy Solutions',
            email: 'info@greenenergy.co.in',
            phone: '+91-5432109876',
            address: 'Renewable Park, Pune, Maharashtra',
            contactPerson: 'Amit Patel',
            customerType: 'industrial'
          }
        ];
        setCustomers(sampleCustomers);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      // Set sample customers on error too
      const sampleCustomers: Customer[] = [
        {
          _id: 'cust-1',
          name: 'ABC Manufacturing Ltd',
          email: 'contact@abcmfg.com',
          phone: '+91-9876543210',
          address: 'Industrial Area, Sector 45, Gurgaon, Haryana',
          contactPerson: 'Rajesh Kumar',
          customerType: 'corporate'
        },
        {
          _id: 'cust-2',
          name: 'TechCorp Solutions',
          email: 'admin@techcorp.co.in',
          phone: '+91-8765432109',
          address: 'IT Park, Electronic City, Bangalore, Karnataka',
          contactPerson: 'Priya Sharma',
          customerType: 'enterprise'
        },
        {
          _id: 'cust-3',
          name: 'Global Textiles Pvt Ltd',
          email: 'operations@globaltextiles.com',
          phone: '+91-7654321098',
          address: 'Textile Hub, Coimbatore, Tamil Nadu',
          contactPerson: 'Murugan S',
          customerType: 'corporate'
        }
      ];
      setCustomers(sampleCustomers);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('Fetching products from API...');
      const response = await apiClient.products.getAll();
      console.log('Products API Response:', response);
      
      let productsData: Product[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        productsData = response.data;
        console.log('Found products:', productsData.length);
      } else {
        console.log('No product data or unexpected format:', response);
      }
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching users from API...');
      const response = await apiClient.users.getAll();
      console.log('Users API Response:', response);
      
      let usersData: User[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        usersData = response.data;
        console.log('Found users:', usersData.length);
      } else {
        console.log('No user data or unexpected format:', response);
      }
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    }
  };

  const fetchServiceTickets = async () => {
    try {
      console.log('Fetching service tickets from API...');
      const response = await apiClient.services.getAll();
      console.log('Service Tickets API Response:', response);
      
      let serviceTicketsData: ServiceTicket[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        serviceTicketsData = response.data;
        console.log('Found service tickets:', serviceTicketsData.length);
      } else {
        console.log('No service ticket data or unexpected format:', response);
      }
      setServiceTickets(serviceTicketsData);
    } catch (error) {
      console.error('Error fetching service tickets:', error);
      setServiceTickets([]);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      console.log('Fetching purchase orders from API...');
      const response = await apiClient.purchaseOrders.getAll();
      console.log('Purchase Orders API Response:', response);
      
      let purchaseOrdersData: PurchaseOrder[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        purchaseOrdersData = response.data;
        console.log('Found purchase orders:', purchaseOrdersData.length);
      } else {
        console.log('No purchase order data or unexpected format:', response);
      }
      setPurchaseOrders(purchaseOrdersData);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrders([]);
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
      products: [],
      startDate: '',
      endDate: '',
      contractValue: 0,
      scheduledVisits: 4,
      billingCycle: 'monthly',
      discountPercentage: 0,
      responseTime: 0,
      emergencyContactHours: '',
      coverageArea: '',
      terms: '',
      renewalTerms: '',
      exclusions: []
    });
    setFormErrors({});
    setShowAddModal(true);
  };

  const handleEditAMC = (amc: AMC) => {
    setEditingAMC(amc);
    setAmcFormData({
      customer: typeof amc.customer === 'string' ? amc.customer : amc.customer._id,
      products: Array.isArray(amc.products) ? amc.products.map(p => typeof p === 'string' ? p : p._id) : [],
      startDate: amc.startDate.split('T')[0],
      endDate: amc.endDate.split('T')[0],
      contractValue: amc.contractValue,
      scheduledVisits: amc.scheduledVisits,
      billingCycle: amc.billingCycle,
      discountPercentage: amc.discountPercentage || 0,
      responseTime: amc.responseTime || 0,
      emergencyContactHours: amc.emergencyContactHours || '',
      coverageArea: amc.coverageArea || '',
      terms: amc.terms || '',
      renewalTerms: amc.renewalTerms || '',
      exclusions: amc.exclusions || []
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  // New function to resume editing drafts in workflow mode
  const handleResumeDraft = (amc: AMC) => {
    console.log('Resuming draft AMC:', amc);
    
    // Load the existing data
    setAmcFormData({
      customer: typeof amc.customer === 'string' ? amc.customer : amc.customer._id,
      products: Array.isArray(amc.products) ? amc.products.map(p => typeof p === 'string' ? p : p._id) : [],
      startDate: amc.startDate ? amc.startDate.split('T')[0] : '',
      endDate: amc.endDate ? amc.endDate.split('T')[0] : '',
      contractValue: amc.contractValue || 0,
      scheduledVisits: amc.scheduledVisits || 4,
      billingCycle: amc.billingCycle || 'monthly',
      discountPercentage: amc.discountPercentage || 0,
      responseTime: amc.responseTime || 0,
      emergencyContactHours: amc.emergencyContactHours || '',
      coverageArea: amc.coverageArea || '',
      terms: amc.terms || '',
      renewalTerms: amc.renewalTerms || '',
      exclusions: amc.exclusions || []
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
    if (window.confirm('Are you sure you want to delete this AMC contract?')) {
      try {
        await apiClient.amc.delete(amc._id);
        setAmcs(amcs.filter(a => a._id !== amc._id));
      } catch (error) {
        console.error('Error deleting AMC:', error);
      }
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
    if (amcFormData.products.length === 0) {
      errors.products = 'At least one product is required';
    }
    if (!amcFormData.startDate) {
      errors.startDate = 'Start date is required';
    }
    if (!amcFormData.endDate) {
      errors.endDate = 'End date is required';
    }
    if (amcFormData.startDate && amcFormData.endDate && new Date(amcFormData.endDate) <= new Date(amcFormData.startDate)) {
      errors.endDate = 'End date must be after start date';
    }
    if (amcFormData.contractValue <= 0) {
      errors.contractValue = 'Contract value must be greater than 0';
    }
    if (amcFormData.scheduledVisits <= 0) {
      errors.scheduledVisits = 'Scheduled visits must be greater than 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitAMC = async () => {
    if (!validateAMCForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      
      const amcData = {
        ...amcFormData,
        // Include workflow data in the AMC creation
        siteSurvey: siteSurveyData,
        equipmentAssessment: equipmentAssessment,
        servicePlan: servicePlan,
        status: 'active' // Set as active when fully completed
      };

      const response = await apiClient.amc.create(amcData);
      setAmcs([response.data, ...amcs]);
      setShowAddModal(false);
      setWorkflowStep('inquiry');
      resetAMCForm();
    } catch (error: any) {
      console.error('Error creating AMC:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to create AMC contract' });
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
      
      const draftData = {
        ...amcFormData,
        siteSurvey: siteSurveyData,
        equipmentAssessment: equipmentAssessment,
        servicePlan: servicePlan,
        status: 'draft',
        workflowStep: workflowStep,
        isDraft: true
      };

      let response: any;
      if (editingAMC) {
        // Update existing draft
        response = await apiClient.amc.update(editingAMC._id, draftData);
        setAmcs(amcs.map(a => a._id === editingAMC._id ? response.data : a));
      } else {
        // Create new draft
        response = await apiClient.amc.create(draftData);
        setAmcs([response.data, ...amcs]);
      }
      
      // Show success message
      alert('Draft saved successfully! You can continue editing later.');
      
      setShowAddModal(false);
      setWorkflowStep('inquiry');
      setEditingAMC(null);
      resetAMCForm();
    } catch (error: any) {
      console.error('Error saving draft:', error);
      alert('Failed to save draft. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAMC = async () => {
    if (!validateAMCForm() || !editingAMC) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      const response = await apiClient.amc.update(editingAMC._id, amcFormData);
      setAmcs(amcs.map(a => a._id === editingAMC._id ? response.data : a));
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
      products: [],
      startDate: '',
      endDate: '',
      contractValue: 0,
      scheduledVisits: 4,
      billingCycle: 'monthly',
      discountPercentage: 0,
      responseTime: 0,
      emergencyContactHours: '',
      coverageArea: '',
      terms: '',
      renewalTerms: '',
      exclusions: []
    });
    
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

  const filteredAMCs = amcs.filter(amc => {
    const customerName = getCustomerName(amc.customer);
    const matchesSearch = amc.contractNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || amc.status === statusFilter;
    const matchesCustomer = customerFilter === 'all' || 
                           (amc.customer && typeof amc.customer === 'object' && amc.customer._id === customerFilter);
    
    // Expiry filter
    let matchesExpiry = true;
    if (expiryFilter !== 'all') {
      const today = new Date();
      const endDate = new Date(amc.endDate);
      const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      switch (expiryFilter) {
        case '30days':
          matchesExpiry = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
          break;
        case '60days':
          matchesExpiry = daysUntilExpiry <= 60 && daysUntilExpiry > 0;
          break;
        case '90days':
          matchesExpiry = daysUntilExpiry <= 90 && daysUntilExpiry > 0;
          break;
        case 'expired':
          matchesExpiry = daysUntilExpiry <= 0;
          break;
      }
    }

    // Payment filter
    let matchesPayment = true;
    if (paymentFilter !== 'all') {
      matchesPayment = amc.paymentStatus === paymentFilter;
    }
    
    return matchesSearch && matchesStatus && matchesCustomer && matchesExpiry && matchesPayment;
  });

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
      icon: <DollarSign className="w-6 h-6" />,
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

  const getCustomerLabel = (value: string) => {
    if (value === 'all') return 'All Customers';
    const customer = customers.find(c => c._id === value);
    return customer ? customer.name : 'All Customers';
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowStatusDropdown(false);
        setShowCustomerDropdown(false);
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

  const handleScheduleVisit = (amc: AMC) => {
    setSelectedAMC(amc);
    setVisitFormData({
      scheduledDate: '',
      assignedTo: '',
      visitType: 'routine',
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
    setFormErrors({});
    setShowVisitModal(true);
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
    setSelectedAMC(amc);
    const currentEndDate = new Date(amc.endDate);
    const newEndDate = new Date(currentEndDate);
    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
    
    setRenewalFormData({
      newEndDate: newEndDate.toISOString().split('T')[0],
      contractValue: amc.contractValue,
      scheduledVisits: amc.scheduledVisits,
      terms: amc.renewalTerms || amc.terms || ''
    });
    setFormErrors({});
    setShowRenewalModal(true);
  };

  const handleCompleteVisit = async (amc: AMC, visitId: string) => {
    try {
      // For now, we'll implement this as a simple update
      // In the future, a specific completeVisit API endpoint can be added
      await apiClient.amc.update(amc._id, {
        visitSchedule: amc.visitSchedule.map(visit => 
          visit._id === visitId 
            ? { ...visit, status: 'completed', completedDate: new Date().toISOString() }
            : visit
        )
      });
      await fetchAMCs(); // Refresh data
    } catch (error) {
      console.error('Error completing visit:', error);
    }
  };

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
      console.log('Emergency service ticket created');
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
      console.log('Purchase order created for parts replenishment:', response.data);
      
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
      console.log('Invoice generated for AMC:', response.data);
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
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

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search AMC contracts..."
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
                setShowCustomerDropdown(false);
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

          {/* Customer Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowCustomerDropdown(!showCustomerDropdown);
                setShowStatusDropdown(false);
                setShowExpiryDropdown(false);
                setShowPaymentDropdown(false);
                setShowBillingCycleDropdown(false);
                setShowVisitTypeDropdown(false);
                setShowAssigneeDropdown(false);
              }}
              className="flex items-center justify-between w-full md:w-40 px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getCustomerLabel(customerFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showCustomerDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showCustomerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                <button
                  onClick={() => {
                    setCustomerFilter('all');
                    setShowCustomerDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                    customerFilter === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  }`}
                >
                  All Customers
                </button>
                {customers.map((customer) => (
                  <button
                    key={customer._id}
                    onClick={() => {
                      setCustomerFilter(customer._id);
                      setShowCustomerDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${
                      customerFilter === customer._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {customer.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            Showing {filteredAMCs.length} of {amcs.length} contracts
          </span>
        </div>
      </div>

      {/* AMC Contracts Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contract
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Products
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value & Duration
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Visits
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Next Visit
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading AMC contracts...</td>
                </tr>
              ) : filteredAMCs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No AMC contracts found</td>
                </tr>
              ) : (
                filteredAMCs.map((amc) => (
                  <tr key={amc._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-blue-600">{amc.contractNumber}</div>
                        <div className="text-xs text-gray-500">
                          {formatDate(amc.startDate)} - {formatDate(amc.endDate)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-gray-900">{getCustomerName(amc.customer)}</div>
                        {typeof amc.customer === 'object' && amc.customer.phone && (
                          <div className="text-xs text-gray-500">{amc.customer.phone}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-900">
                        {Array.isArray(amc.products) ? (
                          <div>
                            <div className="font-medium">{amc.products.length} product(s)</div>
                            <div className="text-gray-500 text-xs">
                              {amc.products.slice(0, 2).map(p => getProductName(p)).join(', ')}
                              {amc.products.length > 2 && '...'}
                            </div>
                          </div>
                        ) : (
                          <span>No products</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-gray-900">{formatCurrency(amc.contractValue)}</div>
                        <div className="text-xs text-gray-500">
                          {amc.daysUntilExpiry ? `${amc.daysUntilExpiry} days left` : 'Expired'}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {amc.completedVisits}/{amc.scheduledVisits}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${(amc.completedVisits / amc.scheduledVisits) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(amc.status)}`}>
                        {getStatusIcon(amc.status)}
                        <span className="ml-1 capitalize">{amc.status}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                      {amc.nextVisitDate ? (
                        <div>
                          <div className="font-medium">{formatDate(amc.nextVisitDate)}</div>
                          <div className="text-xs text-gray-500">
                            {Math.ceil((new Date(amc.nextVisitDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">No upcoming visit</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openDetailsModal(amc)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {/* Show Resume Draft button for draft status, Edit button for others */}
                        {amc.status === 'draft' ? (
                          <button
                            onClick={() => handleResumeDraft(amc)}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50 transition-colors"
                            title="Resume Draft Workflow"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEditAMC(amc)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Edit Contract"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => handleDeleteAMC(amc)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete Contract"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        
                        {/* Quick Actions - only show for active contracts, not drafts */}
                        {amc.status !== 'draft' && (
                          <div className="border-l border-gray-200 pl-2 ml-2">
                            {amc.status === 'active' && (
                              <>
                                <button
                                  onClick={() => handleEmergencyService(amc)}
                                  className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                                  title="Emergency Service"
                                >
                                  <AlertTriangle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleScheduleVisit(amc)}
                                  className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                                  title="Schedule Visit"
                                >
                                  <Calendar className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleInvoiceGeneration(amc)}
                                  className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                                  title="Generate Invoice"
                                >
                                  <DollarSign className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            
                            {(amc.status === 'active' || amc.status === 'expired') && amc.daysUntilExpiry && amc.daysUntilExpiry <= 90 && (
                              <button
                                onClick={() => handleContractRenewal(amc)}
                                className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                                title="Renew Contract"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enhanced AMC Workflow Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">AMC Contract Workflow</h2>
                <p className="text-sm text-gray-600">Step {workflowStep === 'inquiry' ? '1' : workflowStep === 'survey' ? '2' : workflowStep === 'assessment' ? '3' : workflowStep === 'planning' ? '4' : '5'} of 5: {workflowStep === 'inquiry' ? 'Customer Inquiry' : workflowStep === 'survey' ? 'Site Survey' : workflowStep === 'assessment' ? 'Equipment Assessment' : workflowStep === 'planning' ? 'Service Planning' : 'Contract Creation'}</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setWorkflowStep('inquiry');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Workflow Progress */}
            <div className="px-4 py-3 bg-gray-50 border-b">
              <div className="flex justify-between items-center">
                <div className={`flex items-center space-x-2 ${workflowStep === 'inquiry' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${workflowStep === 'inquiry' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>1</div>
                  <span className="text-xs font-medium">Inquiry</span>
                </div>
                <div className={`flex items-center space-x-2 ${workflowStep === 'survey' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${workflowStep === 'survey' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>2</div>
                  <span className="text-xs font-medium">Survey</span>
                </div>
                <div className={`flex items-center space-x-2 ${workflowStep === 'assessment' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${workflowStep === 'assessment' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>3</div>
                  <span className="text-xs font-medium">Assessment</span>
                </div>
                <div className={`flex items-center space-x-2 ${workflowStep === 'planning' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${workflowStep === 'planning' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>4</div>
                  <span className="text-xs font-medium">Planning</span>
                </div>
                <div className={`flex items-center space-x-2 ${workflowStep === 'contract' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${workflowStep === 'contract' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100'}`}>5</div>
                  <span className="text-xs font-medium">Contract</span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Step 1: Customer Inquiry */}
              {workflowStep === 'inquiry' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Customer Inquiry Details</h3>
                    <p className="text-blue-700 text-sm">Gather initial customer requirements and equipment information.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                      <select
                        value={amcFormData.customer}
                        onChange={(e) => setAmcFormData({ ...amcFormData, customer: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Customer</option>
                        {customers.map(customer => (
                          <option key={customer._id} value={customer._id}>{customer.name}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Area</label>
                      <input
                        type="text"
                        value={amcFormData.coverageArea}
                        onChange={(e) => setAmcFormData({ ...amcFormData, coverageArea: e.target.value })}
                        placeholder="Service coverage area"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Equipment/Products *</label>
                    <select
                      multiple
                      value={amcFormData.products}
                      onChange={(e) => {
                        const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                        setAmcFormData({ ...amcFormData, products: selectedValues });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
                    >
                      {products.map(product => (
                        <option key={product._id} value={product._id}>
                          {product.name} - {product.category} ({product.brand})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple products</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Contact Hours</label>
                      <input
                        type="text"
                        value={amcFormData.emergencyContactHours}
                        onChange={(e) => setAmcFormData({ ...amcFormData, emergencyContactHours: e.target.value })}
                        placeholder="e.g., 24/7, 9 AM - 6 PM"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Response Time (hours)</label>
                      <input
                        type="number"
                        value={amcFormData.responseTime}
                        onChange={(e) => setAmcFormData({ ...amcFormData, responseTime: Number(e.target.value) })}
                        placeholder="Response time in hours"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Site Survey */}
              {workflowStep === 'survey' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-green-900 mb-2">Site Survey</h3>
                    <p className="text-green-700 text-sm">Document site conditions and accessibility for maintenance visits.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Survey Date</label>
                      <input
                        type="date"
                        value={siteSurveyData.surveyDate}
                        onChange={(e) => setSiteSurveyData({ ...siteSurveyData, surveyDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Surveyor</label>
                      <select
                        value={siteSurveyData.surveyor}
                        onChange={(e) => setSiteSurveyData({ ...siteSurveyData, surveyor: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select Surveyor</option>
                        {users.filter(user => user.role === 'technician' || user.role === 'manager').map(user => (
                          <option key={user._id} value={user._id}>{getUserName(user)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site Conditions</label>
                    <textarea
                      value={siteSurveyData.siteConditions}
                      onChange={(e) => setSiteSurveyData({ ...siteSurveyData, siteConditions: e.target.value })}
                      rows={3}
                      placeholder="Describe overall site conditions, environment, space constraints..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Accessibility</label>
                      <textarea
                        value={siteSurveyData.accessibility}
                        onChange={(e) => setSiteSurveyData({ ...siteSurveyData, accessibility: e.target.value })}
                        rows={2}
                        placeholder="Access roads, parking, security requirements..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Power Requirements</label>
                      <textarea
                        value={siteSurveyData.powerRequirements}
                        onChange={(e) => setSiteSurveyData({ ...siteSurveyData, powerRequirements: e.target.value })}
                        rows={2}
                        placeholder="Power supply, backup requirements..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Environmental Factors</label>
                    <textarea
                      value={siteSurveyData.environmentalFactors}
                      onChange={(e) => setSiteSurveyData({ ...siteSurveyData, environmentalFactors: e.target.value })}
                      rows={2}
                      placeholder="Weather conditions, dust, humidity, temperature variations..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recommendations</label>
                    <textarea
                      value={siteSurveyData.recommendations}
                      onChange={(e) => setSiteSurveyData({ ...siteSurveyData, recommendations: e.target.value })}
                      rows={3}
                      placeholder="Recommendations for optimal maintenance approach..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Equipment Assessment */}
              {workflowStep === 'assessment' && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-orange-900 mb-2">Equipment Assessment</h3>
                    <p className="text-orange-700 text-sm">Evaluate equipment condition and maintenance requirements.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Age (years)</label>
                      <input
                        type="number"
                        value={equipmentAssessment.equipmentAge}
                        onChange={(e) => setEquipmentAssessment({ ...equipmentAssessment, equipmentAge: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Overall Condition</label>
                      <select
                        value={equipmentAssessment.condition}
                        onChange={(e) => setEquipmentAssessment({ ...equipmentAssessment, condition: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="excellent">Excellent</option>
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance History</label>
                    <textarea
                      value={equipmentAssessment.maintenanceHistory}
                      onChange={(e) => setEquipmentAssessment({ ...equipmentAssessment, maintenanceHistory: e.target.value })}
                      rows={3}
                      placeholder="Previous maintenance records, known issues, repairs..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Recommended Schedule</label>
                      <select
                        value={equipmentAssessment.recommendedSchedule}
                        onChange={(e) => setEquipmentAssessment({ ...equipmentAssessment, recommendedSchedule: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="biannual">Bi-annual</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Annual Parts Cost (₹)</label>
                      <input
                        type="number"
                        value={equipmentAssessment.estimatedPartsCost}
                        onChange={(e) => setEquipmentAssessment({ ...equipmentAssessment, estimatedPartsCost: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Service Planning */}
              {workflowStep === 'planning' && (
                <div className="space-y-4">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-purple-900 mb-2">Service Planning</h3>
                    <p className="text-purple-700 text-sm">Design the optimal maintenance plan based on assessment.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Visit Frequency</label>
                      <select
                        value={servicePlan.visitFrequency}
                        onChange={(e) => setServicePlan({ ...servicePlan, visitFrequency: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="biannual">Bi-annual</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Visit Duration (hours)</label>
                      <input
                        type="number"
                        value={servicePlan.visitDuration}
                        onChange={(e) => setServicePlan({ ...servicePlan, visitDuration: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Parts Warranty (months)</label>
                      <input
                        type="number"
                        value={servicePlan.partsWarranty}
                        onChange={(e) => setServicePlan({ ...servicePlan, partsWarranty: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Service Types Included</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={servicePlan.preventiveMaintenance}
                            onChange={(e) => setServicePlan({ ...servicePlan, preventiveMaintenance: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm">Preventive Maintenance</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={servicePlan.predictiveMaintenance}
                            onChange={(e) => setServicePlan({ ...servicePlan, predictiveMaintenance: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm">Predictive Maintenance</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={servicePlan.emergencyResponse}
                            onChange={(e) => setServicePlan({ ...servicePlan, emergencyResponse: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm">Emergency Response</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={servicePlan.includesParts}
                            onChange={(e) => setServicePlan({ ...servicePlan, includesParts: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm">Parts & Consumables Included</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
                      <div className="space-y-2">
                        {['Electrical', 'Mechanical', 'Electronics', 'Fuel Systems', 'Controls'].map(skill => (
                          <label key={skill} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={servicePlan.requiredSkills.includes(skill)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setServicePlan({ ...servicePlan, requiredSkills: [...servicePlan.requiredSkills, skill] });
                                } else {
                                  setServicePlan({ ...servicePlan, requiredSkills: servicePlan.requiredSkills.filter(s => s !== skill) });
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">{skill}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Contract Creation */}
              {workflowStep === 'contract' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">Contract Details</h3>
                    <p className="text-blue-700 text-sm">Finalize contract terms and generate AMC agreement.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
                      <input
                        type="date"
                        value={amcFormData.startDate}
                        onChange={(e) => setAmcFormData({ ...amcFormData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
                      <input
                        type="date"
                        value={amcFormData.endDate}
                        onChange={(e) => setAmcFormData({ ...amcFormData, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Billing Cycle</label>
                      <select
                        value={amcFormData.billingCycle}
                        onChange={(e) => setAmcFormData({ ...amcFormData, billingCycle: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="half-yearly">Half-yearly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contract Value (₹) *</label>
                      <input
                        type="number"
                        value={amcFormData.contractValue}
                        onChange={(e) => setAmcFormData({ ...amcFormData, contractValue: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Visits</label>
                      <input
                        type="number"
                        value={amcFormData.scheduledVisits}
                        onChange={(e) => setAmcFormData({ ...amcFormData, scheduledVisits: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                      <input
                        type="number"
                        value={amcFormData.discountPercentage}
                        onChange={(e) => setAmcFormData({ ...amcFormData, discountPercentage: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions</label>
                    <textarea
                      value={amcFormData.terms}
                      onChange={(e) => setAmcFormData({ ...amcFormData, terms: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Contract terms and conditions..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Terms</label>
                    <textarea
                      value={amcFormData.renewalTerms}
                      onChange={(e) => setAmcFormData({ ...amcFormData, renewalTerms: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Auto-renewal and extension terms..."
                    />
                  </div>

                  {/* Contract Summary */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Contract Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Customer:</span>
                        <div className="font-medium">{customers.find(c => c._id === amcFormData.customer)?.name || 'Not selected'}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Products:</span>
                        <div className="font-medium">{amcFormData.products.length} items</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <div className="font-medium">
                          {amcFormData.startDate && amcFormData.endDate 
                            ? `${Math.ceil((new Date(amcFormData.endDate).getTime() - new Date(amcFormData.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))} months`
                            : 'Not set'
                          }
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Value:</span>
                        <div className="font-medium text-lg">₹{amcFormData.contractValue.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Workflow Navigation */}
            <div className="flex justify-between items-center p-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (workflowStep === 'inquiry') {
                    setShowAddModal(false);
                    setWorkflowStep('inquiry');
                  } else if (workflowStep === 'survey') {
                    setWorkflowStep('inquiry');
                  } else if (workflowStep === 'assessment') {
                    setWorkflowStep('survey');
                  } else if (workflowStep === 'planning') {
                    setWorkflowStep('assessment');
                  } else if (workflowStep === 'contract') {
                    setWorkflowStep('planning');
                  }
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {workflowStep === 'inquiry' ? 'Cancel' : 'Previous'}
              </button>

              <div className="flex space-x-3">
                {/* Save as Draft button - available at all steps */}
                <button
                  type="button"
                  onClick={handleSaveAsDraft}
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>💾</span>
                  <span>{submitting ? 'Saving...' : 'Save as Draft'}</span>
                </button>

                {workflowStep !== 'contract' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (workflowStep === 'inquiry') setWorkflowStep('survey');
                      else if (workflowStep === 'survey') setWorkflowStep('assessment');
                      else if (workflowStep === 'assessment') setWorkflowStep('planning');
                      else if (workflowStep === 'planning') setWorkflowStep('contract');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleSubmitAMC();
                    }}
                    disabled={submitting}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Creating Contract...' : 'Create AMC Contract'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit AMC Modal */}
      {showEditModal && editingAMC && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit AMC Contract</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdateAMC(); }} className="p-4 space-y-3">
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
                    value={amcFormData.customer}
                    onChange={(e) => setAmcFormData({ ...amcFormData, customer: e.target.value })}
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
                    Scheduled Visits *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={amcFormData.scheduledVisits}
                    onChange={(e) => setAmcFormData({ ...amcFormData, scheduledVisits: Number(e.target.value) })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.scheduledVisits ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Number of visits"
                  />
                  {formErrors.scheduledVisits && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.scheduledVisits}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Products *
                </label>
                <select
                  multiple
                  value={amcFormData.products}
                  onChange={(e) => {
                    const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
                    setAmcFormData({ ...amcFormData, products: selectedValues });
                  }}
                  className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-32 ${
                    formErrors.products ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {products.map(product => (
                    <option key={product._id} value={product._id}>
                      {product.name} ({product.category})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple products</p>
                {formErrors.products && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.products}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={amcFormData.startDate}
                    onChange={(e) => setAmcFormData({ ...amcFormData, startDate: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.startDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.startDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={amcFormData.endDate}
                    onChange={(e) => setAmcFormData({ ...amcFormData, endDate: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.endDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.endDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.endDate}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Value (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={amcFormData.contractValue}
                  onChange={(e) => setAmcFormData({ ...amcFormData, contractValue: Number(e.target.value) })}
                  className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.contractValue ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter contract value"
                />
                {formErrors.contractValue && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.contractValue}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  value={amcFormData.terms}
                  onChange={(e) => setAmcFormData({ ...amcFormData, terms: e.target.value })}
                  rows={4}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter contract terms and conditions..."
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
                  {submitting ? 'Updating...' : 'Update Contract'}
                </button>
              </div>
            </form>
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
                        <p className="font-medium text-sm">{selectedAMC.customer.address}</p>
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
                      <p className="text-xs text-gray-600">Contract Value</p>
                      <p className="font-medium text-lg">{formatCurrency(selectedAMC.contractValue)}</p>
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

              {/* Products Covered */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Products Covered
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.isArray(selectedAMC.products) && selectedAMC.products.map((product, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900">{getProductName(product)}</h4>
                      {typeof product === 'object' && (
                        <div className="mt-2 space-y-1">
                          {product.category && (
                            <p className="text-xs text-gray-600">Category: {product.category}</p>
                          )}
                          {product.brand && (
                            <p className="text-xs text-gray-600">Brand: {product.brand}</p>
                          )}
                          {product.modelNumber && (
                            <p className="text-xs text-gray-600">Model: {product.modelNumber}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
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
                          Completed Date
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Assigned To
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
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
                          <tr key={visit._id || index}>
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                              {formatDate(visit.scheduledDate)}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                              {visit.completedDate ? formatDate(visit.completedDate) : '-'}
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
                            <td className="px-4 py-4 text-xs text-gray-900">
                              {visit.notes || '-'}
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

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEditAMC(selectedAMC);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Contract</span>
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Schedule Visit</span>
                </button>
                <button
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Generate Report</span>
                </button>
                {selectedAMC.status === 'active' && selectedAMC.daysUntilExpiry && selectedAMC.daysUntilExpiry <= 60 && (
                  <button
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Renew Contract</span>
                  </button>
                )}
              </div>
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
                              onClick={() => openDetailsModal(amc)}
                              className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                            >
                              View Details
                            </button>
                            <button
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
    </div>
  );
};

export default AMCManagement; 