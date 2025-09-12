import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
  PhoneIncoming,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Zap,
  Package,
  Download
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import { RootState } from 'store';
import { useSelector } from 'react-redux';
import { Pagination } from 'components/ui/Pagination';
import toast from 'react-hot-toast';


// Customer types matching backend enums
type CustomerType = 'retail' | 'telecom' | 'ev' | 'dg' | 'jenaral' | 'je' | 'oem';
type CustomerMainType = 'customer' | 'supplier' | 'dg_customer' | 'oem';
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

export interface CustomerCounts {
  totalCustomers: number;
  newLeads: number;
  qualified: number;
  converted: number;
  lost: number;
  contacted: number;


}



interface User {
  id: string;
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName?: string;
}

interface Customer {
  _id: string;
  customerId?: string;
  name: string;
  alice?: string;
  designation?: string;
  contactPersonName?: string;
  gstNumber?: string;
  email?: string;
  phone?: string;
  panNumber?: string;
  address: string | {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
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
  addresses?: Address[];
  type?: CustomerMainType;
  // DG Details
  dgDetails?: {
    dgSerialNumbers: string;
    alternatorMake?: string;
    alternatorSerialNumber?: string;
    dgMake: string;
    engineSerialNumber: string;
    dgModel: string;
    dgRatingKVA: number;
    salesDealerName?: string;
    commissioningDate: string;
    warrantyStatus: 'warranty' | 'non_warranty';
    cluster: string;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
    locationAddress?: string;
  }[];
  // OEM specific properties
  oemCode?: string;
  companyName?: string;
  contactPerson?: string;
  alternatePhone?: string;
  rating?: number;
  products?: Array<{
    model: string;
    kva: string;
    phase: string;
    fuelType: string;
    price: number;
    specifications: string;
    availability: string;
    leadTime: number;
  }>;
  // OEM bank details
  bankDetails?: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch: string;
  };
  paymentTerms?: string;
  deliveryTerms?: string;
  warrantyTerms?: string;
  creditLimit?: number;
  creditDays?: number;
  siteAddress?: string;
  numberOfDG?: number;
}

// Address type
interface Address {
  id: number;
  address: string;
  state: string;
  district: string;
  pincode: string;
  isPrimary: boolean;
  gstNumber?: string; // <-- Add GST number per address, optional
  contactPersonName?: string;
  designation?: string;
  email?: string;
  phone?: string;
  registrationStatus: 'registered' | 'non_registered';
}

interface CustomerFormData {
  name: string;
  alice?: string;
  contactPersonName: string;
  email: string;
  phone: string;
  panNumber: string;
  address: string;
  siteAddress?: string;
  numberOfDG?: number;
  customerType: CustomerType;
  leadSource?: string;
  assignedTo?: string;
  notes: string;
  addresses: Address[];
  type: CustomerMainType;
  bankDetails?: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch: string;
  };
  dgDetails?: {
    dgSerialNumbers: string;
    alternatorMake?: string;
    alternatorSerialNumber?: string;
    dgMake: string;
    engineSerialNumber: string;
    dgModel: string;
    dgRatingKVA: number;
    salesDealerName?: string;
    commissioningDate: string;
    warrantyStatus: 'warranty' | 'non_warranty';
    cluster: string;
    warrantyStartDate?: string;
    warrantyEndDate?: string;
    locationAddress?: string;
  }[];
}

interface ContactFormData {
  type: ContactType;
  date: string;
  notes: string;
  followUpDate: string;
}

interface AddContactHistoryInput {
  type: string;
  date: string;
  notes: string;
  followUpDate?: string; // <-- make it optional
  createdBy: string;
}

// GSTIN validation helper (format only per provided regex)
const isValidGSTIN = (input: string): boolean => {
  if (!input) return true; // empty handled separately
  const value = input.toUpperCase();
  const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return re.test(value);
};

// Format-only validator for live feedback (same as above)
const isValidGSTINFormat = (input: string): boolean => {
  if (!input) return true;
  const value = input.toUpperCase();
  const re = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return re.test(value);
};

const CustomerManagement: React.FC = () => {
  const location = useLocation();

  // Core state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  console.log("customers-99992:", customers);


  const [draggedCustomer, setDraggedCustomer] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<string | null>(null); // For loading state

  const [counts, setCounts] = useState<CustomerCounts>({
    totalCustomers: 0,
    newLeads: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
    contacted: 0,
  });

  // Individual status count states
  const [newLeadStatusCount, setNewLeadStatusCount] = useState(0);
  const [qualifiedStatusCount, setQualifiedStatusCount] = useState(0);
  const [convertedStatusCount, setConvertedStatusCount] = useState(0);
  const [lostStatusCount, setLostStatusCount] = useState(0);
  const [contactedStatusCount, setContactedStatusCount] = useState(0);
  const [totalCustomersCount, setTotalCustomersCount] = useState(0);
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<CustomerType | 'all'>('all');
  // const [leadSourceFilter, setLeadSourceFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDatas, setTotalDatas] = useState(0);


  const [sort, setSort] = useState('-createdAt');
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
  const [assignedToFilter, setAssignedToFilter] = useState<string | undefined>(undefined);

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
    alice: '',
    contactPersonName: '',
    email: '',
    phone: '',
    panNumber: '',
    address: '',
    siteAddress: '',
    numberOfDG: 0, // Start with 1 since we initialize with one DG detail
    customerType: 'retail',
    notes: '',
    addresses: [{
      id: Date.now(),
      address: '',
      state: '',
      district: '',
      pincode: '',
      isPrimary: true,
      gstNumber: '', // Add default
      contactPersonName: '',
      designation: '',
      email: '',
      phone: '',
      registrationStatus: 'non_registered',
    }],
    type: 'customer',
    bankDetails: { bankName: '', accountNo: '', ifsc: '', branch: '' },
    dgDetails: [{
      dgSerialNumbers: '',
      alternatorMake: '',
      alternatorSerialNumber: '',
      dgMake: '',
      engineSerialNumber: '',
      dgModel: '',
      dgRatingKVA: 0,
      salesDealerName: '',
      commissioningDate: new Date().toISOString().split('T')[0],
      warrantyStatus: 'warranty',
      cluster: '',
      warrantyStartDate: '',
      warrantyEndDate: ''
    }]
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
  const [showAssignedToDropdown, setShowAssignedToDropdown] = useState(false);
  const [showCustomerTypeDropdown, setShowCustomerTypeDropdown] = useState(false);
  const [showContactTypeDropdown, setShowContactTypeDropdown] = useState(false);
  const [showQuickActionsDropdown, setShowQuickActionsDropdown] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const user = useSelector((state: RootState) => state.auth.user);

  // Tab state for navigation
  const tabOptions = [
    { label: 'Customer', value: 'customer' },
    { label: 'Supplier', value: 'supplier' },
    { label: 'DG Customer', value: 'dg_customer' },
    { label: 'OEM', value: 'oem' },
    // Add more tabs here if needed
  ];
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier' | 'dg_customer' | 'oem'>('customer');

  const searchParams = new URLSearchParams(location.search);
  // Add at the top, after useState imports
  const [customerTypeTab, setCustomerTypeTab] = useState<'customer' | 'supplier' | 'dg_customer' | 'oem'>(searchParams.get('action') !== 'create-supplier' ? 'customer' : 'supplier');
  // Dynamic entity labels for shared UI between Customer and Supplier
  const entityLabel = customerTypeTab === 'supplier' ? 'Supplier' : (customerTypeTab === 'dg_customer' ? 'DG Customer' : 'Customer');
  const entityLabelLower = entityLabel.toLowerCase();


  // Add after other useState hooks for filters
  const [sortField, setSortField] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);

  const [importProgress, setImportProgress] = useState<number>(0); // percentage progress

  useEffect(() => {
    if (sortField === 'all') {
      setSort('-createdAt'); // default sort
    } else {
      // Map frontend field names to API field names
      let apiField = sortField;
      if (customerTypeTab === 'oem' && sortField === 'name') {
        apiField = 'companyName';
      }
      const sortParam = sortOrder === 'asc' ? apiField : `-${apiField}`;
      setSort(sortParam);
    }
  }, [sortField, sortOrder, customerTypeTab]);

  // Ensure supplier tab is selected if ?action=create is present in the URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'create') {
      setShowAddModal(true);
      // Clear the URL parameter
      window.history.replaceState({}, '', location.pathname);
    }
    if (searchParams.get('action') === 'create-supplier') {
      setCustomerTypeTab('supplier');
      setShowAddModal(true);
      // Optionally clear the query param after setting
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  const getTypeIcon = (value: string) => {
    // Optionally return a string or a default icon name
    const option = typeOptions.find(option => option.value === value);
    return option ? option.label : 'User';
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (!allowedTypes.includes(file.type)) {
      const errorMessage = 'Please select a valid Excel (.xlsx, .xls) or CSV file.';
      setImportMessage({ type: 'error', text: errorMessage });
      toast.error(errorMessage);
      return;
    }
    setImporting(true);
    setImportMessage(null);
    try {
      // Construct FormData with file and customerTypeTab
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', customerTypeTab); // assuming this is a string
  
      // Call API with FormData
      const response = await apiClient.customers.previewImportFromFile(file, customerTypeTab);
  
      if (response.success) {
        setSelectedFile(file);
        setPreviewData(response.data);
        setShowPreviewModal(true);
        toast.success('File preview generated successfully');
      } else {
        const errorMessage = response.data.errors?.[0] || 'Preview failed. Please check your file format.';
        setImportMessage({ type: 'error', text: errorMessage });
        toast.error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to preview file. Please try again.';
      setImportMessage({ type: 'error', text: errorMessage });
      toast.error(errorMessage);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setShowPreviewModal(false);
    setImportProgress(0);
    try {
      // Use XMLHttpRequest to track progress
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', customerTypeTab);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/v1/customers/import', true);
      // Add Authorization header from localStorage
      const token = localStorage.getItem('authToken');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setImportProgress(percent);
        }
      };
      xhr.onload = async function () {
        setImporting(false);
        setImportProgress(100);
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            const successMessage = `Successfully imported ${response.data.summary.successful} customers from ${response.data.summary.totalRows} total rows!`;
            setImportMessage({ type: 'success', text: successMessage });
            toast.success(successMessage);
            await fetchCustomers();
            await fetchAllCustomers();
          } else {
            const errorMessage = response.data.errors?.[0] || 'Import failed. Please check your file format.';
            setImportMessage({ type: 'error', text: errorMessage });
            toast.error(errorMessage);
          }
        } else {
          setImportMessage({ type: 'error', text: 'Import failed. Please try again.' });
          toast.error('Import failed. Please try again.');
        }
        setSelectedFile(null);
        setPreviewData(null);
      };
      xhr.onerror = function () {
        setImporting(false);
        setImportMessage({ type: 'error', text: 'Failed to import file. Please try again.' });
        toast.error('Failed to import file. Please try again.');
        setSelectedFile(null);
        setPreviewData(null);
      };
      xhr.send(formData);
    } catch (error: any) {
      setImporting(false);
      const errorMessage = error.message || 'Failed to import file. Please try again.';
      setImportMessage({ type: 'error', text: errorMessage });
      toast.error(errorMessage);
      setSelectedFile(null);
      setPreviewData(null);
    }
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setSelectedFile(null);
    setPreviewData(null);
  };


  const getAddressTypeColor = (type: string) => {
    const addressType = addressTypes.find(t => t.value === type);
    return addressType ? addressType.color : 'bg-gray-500';
  };

  const addAddress = () => {
    const newAddress: Address = {
      id: Date.now(),
      address: '',
      state: '',
      district: '',
      pincode: '',
      isPrimary: false,
      gstNumber: '',
      contactPersonName: '',
      designation: '',
      email: '',
      phone: '',
      registrationStatus: 'non_registered',
    };
    setCustomerFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, newAddress]
    }));
  };

  const removeAddress = (addressId: number) => {
    if (customerFormData.addresses.length === 1) return;
    const updatedAddresses = customerFormData.addresses.filter((addr: Address) => addr.id !== addressId);
    if (customerFormData.addresses.find((addr: Address) => addr.id === addressId)?.isPrimary) {
      updatedAddresses[0].isPrimary = true;
    }
    setCustomerFormData(prev => ({
      ...prev,
      addresses: updatedAddresses
    }));
  };

  const updateAddress = (addressId: number, field: keyof Address, value: string | boolean) => {
    const updatedAddresses = customerFormData.addresses.map((addr: Address) => {
      if (addr.id === addressId) {
        return { ...addr, [field]: value };
      }
      return addr;
    });

    // Live-validate GST and clear error once valid
    if (field === 'gstNumber') {
      const idx = customerFormData.addresses.findIndex((addr: Address) => addr.id === addressId);
      const gstValue = typeof value === 'string' ? value : '';
      setFormErrors(prev => {
        const next: any = { ...prev };
        const gstArray: string[] = Array.isArray(prev.gst) ? [...prev.gst] : [];

        if (!gstValue || isValidGSTINFormat(gstValue)) {
          gstArray[idx] = '';
        } else {
          gstArray[idx] = 'Invalid GST Number. It must match 22AAAAA0000A1Z5.';
        }

        // Remove trailing empty errors
        if (gstArray.every(msg => !msg)) {
          delete next.gst;
        } else {
          next.gst = gstArray;
        }
        return next;
      });
    }

    setCustomerFormData(prev => ({
      ...prev,
      addresses: updatedAddresses
    }));
  };

  const setPrimaryAddress = (addressId: number) => {
    const updatedAddresses = customerFormData.addresses.map((addr: Address) => ({
      ...addr,
      isPrimary: addr.id === addressId
    }));
    setCustomerFormData(prev => ({
      ...prev,
      addresses: updatedAddresses
    }));
  };

  // DGDetails helper functions
  const updateDGDetails = (index: number, field: keyof NonNullable<CustomerFormData['dgDetails']>[0], value: any) => {
    setCustomerFormData(prev => {
      const updatedDgDetails = prev.dgDetails!.map((dg, i) => {
        if (i === index) {
          const updatedDg = { ...dg, [field]: value };
          
          // Auto-calculate warranty end date when KVA or warranty start date changes
          if (field === 'dgRatingKVA' || field === 'warrantyStartDate') {
            const kva = field === 'dgRatingKVA' ? value : dg.dgRatingKVA;
            let startDate = field === 'warrantyStartDate' ? value : dg.warrantyStartDate;
            
            // If KVA is being updated and no warranty start date is set, use commissioning date as default
            if (field === 'dgRatingKVA' && kva > 0 && !startDate) {
              startDate = dg.commissioningDate || new Date().toISOString().split('T')[0];
              updatedDg.warrantyStartDate = startDate;
            }
            
            if (startDate && kva > 0) {
              updatedDg.warrantyEndDate = calculateWarrantyEndDate(startDate, kva);
            }
          }
          
          // Auto-calculate warranty end date when commissioning date changes (if no warranty start date is set)
          if (field === 'commissioningDate') {
            const kva = dg.dgRatingKVA;
            const startDate = dg.warrantyStartDate || value; // Use commissioning date if no warranty start date
            
            if (kva > 0 && startDate) {
              updatedDg.warrantyEndDate = calculateWarrantyEndDate(startDate, kva);
            }
            
            // Auto-determine warranty status based on commissioning date (2-year rule)
            if (value) {
              const commissioningDate = new Date(value);
              const today = new Date();
              const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
              
              // If commissioning date is more than 2 years old, mark as non-warranty
              if (commissioningDate < twoYearsAgo) {
                updatedDg.warrantyStatus = 'non_warranty';
              } else {
                updatedDg.warrantyStatus = 'warranty';
              }
            }
          }
          
          return updatedDg;
        }
        return dg;
      });
      
      return {
        ...prev,
        dgDetails: updatedDgDetails
      };
    });
  };

  const addDGDetails = () => {
    setCustomerFormData(prev => ({
      ...prev,
      dgDetails: [...prev.dgDetails!, {
        dgSerialNumbers: '',
        alternatorMake: '',
        alternatorSerialNumber: '',
        dgMake: '',
        engineSerialNumber: '',
        dgModel: '',
        dgRatingKVA: 0,
        salesDealerName: '',
        commissioningDate: new Date().toISOString().split('T')[0],
        warrantyStatus: 'warranty' as const,
        cluster: '',
        warrantyStartDate: '',
        warrantyEndDate: '',
        locationAddress: ''
      }],
      numberOfDG: (prev.dgDetails?.length || 0) + 1
    }));
  };

  const removeDGDetails = (index: number) => {
    if (customerFormData.dgDetails!.length > 1) {
      setCustomerFormData(prev => ({
        ...prev,
        dgDetails: prev.dgDetails!.filter((_, i) => i !== index),
        numberOfDG: prev.dgDetails!.length - 1
      }));
    }
  };

  // Helper function to calculate warranty period based on KVA
  const calculateWarrantyPeriod = (kva: number): number => {
    if (kva <= 5) {
      return 18;
    } else {
      return 24;
    }
  };

  // Helper function to calculate warranty end date based on start date and KVA
  const calculateWarrantyEndDate = (startDate: string, kva: number): string => {
    if (!startDate || kva <= 0) return '';
    
    const start = new Date(startDate);
    const months = calculateWarrantyPeriod(kva);
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + months);
    
    return endDate.toISOString().split('T')[0];
  };

  // Helper function to determine warranty status based on commissioning date (2-year rule)
  const determineWarrantyStatus = (commissioningDate: string): 'warranty' | 'non_warranty' => {
    if (!commissioningDate) return 'warranty';
    
    const commissioning = new Date(commissioningDate);
    const today = new Date();
    const twoYearsAgo = new Date(today.getFullYear() - 2, today.getMonth(), today.getDate());
    
    // If commissioning date is more than 2 years old, mark as non-warranty
    return commissioning < twoYearsAgo ? 'non_warranty' : 'warranty';
  };

  const addressTypes = [
    { value: 'billing', label: 'Billing Address', color: 'bg-blue-500' },
    { value: 'shipping', label: 'Shipping Address', color: 'bg-green-500' },
    { value: 'office', label: 'Office Address', color: 'bg-purple-500' },
    { value: 'home', label: 'Home Address', color: 'bg-orange-500' },
    { value: 'other', label: 'Other', color: 'bg-gray-500' }
  ];

  // const handleSubmitCustomer = () => {
  //   setSubmitting(true);
  //   setTimeout(() => {
  //     setSubmitting(false);
  //     setShowAddModal(false);
  //   }, 2000);
  // };


  useEffect(() => {
    if (user?.role === 'hr') {


      setAssignedToFilter(user.id);
    }
  }, [user]);

  // Check for URL parameters to auto-open create modal
  // useEffect(() => {
  //   const searchParams = new URLSearchParams(location.search);
  //   if (searchParams.get('action') === 'create') {
  //     setShowAddModal(true);
  //     // Clear the URL parameter
  //     window.history.replaceState({}, '', location.pathname);
  //   }
  // }, [location]);

  const fetchAllCustomers = async () => {
    try {
      let allCustomersData: Customer[] = [];
      let page = 1;
      let hasMore = true;

      // Special handling for OEM tab - use dedicated OEM API
      if (customerTypeTab === 'oem') {
        while (hasMore) {
          const response: any = await apiClient.customers.oemCustomers.getAll({
            page,
            limit: 100
          });
          
          if (response?.data && Array.isArray(response.data)) {
            allCustomersData = allCustomersData.concat(response.data);
          }

          // Check if there are more pages
          if (response?.pagination && response.pagination.pages && page < response.pagination.pages) {
            page += 1;
          } else {
            hasMore = false;
          }
        }
        setAllCustomers(allCustomersData);
        return;
      }

      while (hasMore) {
        const response: any = await apiClient.customers.getAll({
          page,
          limit: 100,
          type: customerTypeTab
        });
        let customersData: Customer[] = [];
        if (response?.data) {
          if (Array.isArray(response.data)) {
            customersData = response.data;
          } else if (response.data.customers && Array.isArray(response.data.customers)) {
            customersData = response.data.customers;
          }
        }
        allCustomersData = allCustomersData.concat(customersData);

        // Check if there are more pages
        const pagination = response?.pagination || response?.data?.pagination;
        if (pagination && pagination.pages && page < pagination.pages) {
          page += 1;
        } else {
          hasMore = false;
        }
      }

      setAllCustomers(allCustomersData);
    } catch (error) {
      console.error('Error fetching all customers:', error);
      setAllCustomers([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await apiClient.users.getAll({ role: 'hr' });
      // Handle response format like in other modules
      let usersData: User[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          usersData = response.data;
        } else if ((response.data as any).users && Array.isArray((response.data as any).users)) {
          usersData = (response.data as any).users;
        }
      }
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      // Set fallback data on error
      setUsers([]);
    }
  };

  const fetchCustomers = async () => {
    console.log('fetchCustomers called with customerTypeTab:', customerTypeTab);
    let assignedToParam = assignedToFilter;
    if (user?.role === 'hr' && user?.id) {
      assignedToParam = user.id;
      if (assignedToFilter !== user.id) setAssignedToFilter(user.id);
    }
    if (user?.role === 'hr' && !assignedToParam) return;

    // Special handling for OEM tab - use dedicated OEM API
    if (customerTypeTab === 'oem') {
      try {
        setLoading(true);
        const params: any = {
          page: currentPage,
          limit,
          sort,
          search: searchTerm,
          ...(statusFilter !== 'all' && { status: statusFilter }),
          ...(assignedToParam && { assignedTo: assignedToParam }),
        };

        const response = await apiClient.customers.oemCustomers.getAll(params);
        console.log('OEM API response:', response);
        console.log('OEM API response.data:', response.data);
        console.log('OEM API response.data type:', typeof response.data);
        console.log('OEM API response.data isArray:', Array.isArray(response.data));
        
        // Set pagination data
        setCurrentPage(response.pagination.page);
        setLimit(response.pagination.limit);
        setTotalDatas(response.pagination.total);
        setTotalPages(response.pagination.pages);
        
        // Set customers data - ensure it's an array
        const oemData = Array.isArray(response.data) ? response.data : [];
        console.log('OEM data to set:', oemData);
        setCustomers(oemData);
        
        // For OEM tab, we don't have the same counts structure, so set defaults
        setCounts({
          totalCustomers: response.pagination.total,
          newLeads: 0,
          qualified: 0,
          converted: response.pagination.total, // All OEM customers are considered converted
          lost: 0,
          contacted: 0,
        });
        
        setNewLeadStatusCount(0);
        setQualifiedStatusCount(0);
        setConvertedStatusCount(response.pagination.total);
        setLostStatusCount(0);
        setContactedStatusCount(0);
        setTotalCustomersCount(response.pagination.total);
        
      } catch (error) {
        console.error('Error fetching OEM customers:', error);
        setCustomers([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    const params: any = {
      page: currentPage,
      limit,
      sort,
      search: searchTerm,
      type: customerTypeTab, // always send type
      ...(typeFilter !== 'all' && { customerType: typeFilter }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(assignedToParam && { assignedTo: assignedToParam }),
    };

    // Handle status-based filters
    if (statusFilter === 'new') {
      params.newLeadStatus = 'true';
    } else if (statusFilter === 'qualified') {
      params.qualifiedStatus = 'true';
    } else if (statusFilter === 'converted') {
      params.convertedStatus = 'true';
    } else if (statusFilter === 'lost') {
      params.lostStatus = 'true';
    } else if (statusFilter === 'contacted') {
      params.contactedStatus = 'true';
    } else if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    // Special handling for DG Customer tab - show only converted customers
    if (customerTypeTab === 'dg_customer') {
      params.status = 'converted';
      params.type = 'customer'; // DG customers are still of type 'customer'
    }

    console.log('Fetching customers with type:', customerTypeTab);
    console.log('Params sent to API:', params);
    try {
      setLoading(true);
      const response = await apiClient.customers.getAll(params);
      console.log('API response data:', response);
      setCounts(response.data.counts);

      // Set individual status counts
      setNewLeadStatusCount((response.data as any).newLeadStatusCount || 0);
      setQualifiedStatusCount((response.data as any).qualifiedStatusCount || 0);
      setConvertedStatusCount((response.data as any).convertedStatusCount || 0);
      setLostStatusCount((response.data as any).lostStatusCount || 0);
      setContactedStatusCount((response.data as any).contactedStatusCount || 0);
      setTotalCustomersCount((response.data as any).totalCustomersCount || 0);

      setCurrentPage(response.pagination.page);
      setLimit(response.pagination.limit);
      setTotalDatas(response.pagination.total);
      setTotalPages(response.pagination.pages);
      let customersData: Customer[] = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          customersData = response.data as Customer[];
        } else if (typeof response.data === 'object' && Array.isArray((response.data as any).customers)) {
          customersData = (response.data as { customers: Customer[] }).customers;
        }
      }
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchAllCustomers();
    if (user?.role !== 'hr') {
      fetchUsers();
    }
  }, [user, currentPage, limit, sort, searchTerm, typeFilter, statusFilter, dateFrom, dateTo, assignedToFilter, customerTypeTab]);

  useEffect(() => {
    fetchAllCustomers();
  }, [customerTypeTab]);

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await apiClient.customers.delete(id);
        fetchCustomers()
        // setCustomers(customers.filter(customer => customer._id !== id));
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    }
  };

  // const filteredCustomers = Array.isArray(customers) ? customers.filter(customer => {
  //   // Ensure customer object exists and has required properties
  //   if (!customer || !customer.name) return false;

  //   const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //                        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
  //                        (customer.phone && customer.phone.includes(searchTerm));
  //   const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
  //   const matchesType = typeFilter === 'all' || customer.customerType === typeFilter;

  //   return matchesSearch && matchesStatus && matchesType;
  // }) : [];

  const validateCustomerForm = (): boolean => {
    const errors: Record<string, any> = {};
    const missingFields: string[] = [];
    const addressErrors: string[] = [];
    const gstErrors: string[] = [];
  
    // Top-level field checks
    if (!customerFormData.name.trim()) {
      errors.name = `${entityLabel} name is required`;
      missingFields.push(`${entityLabel} Name`);
    } else {
      const isDuplicateName = allCustomers.some(customer =>
        customer.name.trim().toLowerCase() === customerFormData.name.trim().toLowerCase() &&
        (!editingCustomer || customer._id !== editingCustomer._id)
      );
      if (isDuplicateName) {
        errors.name = `${entityLabel} name already exists. Please use a unique name.`;
        missingFields.push(`Unique ${entityLabel} Name`);
      }
    }
  
    if (customerFormData.panNumber && customerFormData.panNumber.trim() !== '') {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(customerFormData.panNumber)) {
        errors.panNumber = 'PAN must be 10 characters: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)';
        missingFields.push('Valid PAN Number');
      }
    }
  
    // Address field validation
    if (!customerFormData.addresses.length) {
      addressErrors[0] = 'At least one address is required';
      missingFields.push('Address');
    } else {
      customerFormData.addresses.forEach((addr, index) => {
        const addrMissing: string[] = [];
  
        if (!addr.address.trim()) addrMissing.push('address');
        if (!addr.state.trim()) addrMissing.push('state');
        if (!addr.district.trim()) addrMissing.push('district');
        if (!addr.pincode.trim()) addrMissing.push('pincode');
        else if (!/^\d{6}$/.test(addr.pincode)) addrMissing.push('valid 6-digit pincode');
  
        if (addr.gstNumber && addr.gstNumber.trim() !== '') {
          if (!isValidGSTIN(addr.gstNumber)) {
            gstErrors[index] = 'Invalid GST Number. It must match 22AAAAA0000A1Z5 and pass checksum.';
          } else {
            // Check if GST number already exists for another customer
            const existingCustomer = allCustomers.find(customer =>
              customer.addresses?.some(a => a.gstNumber === addr.gstNumber) &&
              (!editingCustomer || customer._id !== editingCustomer._id)
            );
            if (existingCustomer) {
              gstErrors[index] = 'GST Number already exists with another customer. Please use a different GST Number.';
            }
          }
        }
  
        if (addrMissing.length > 0) {
          addressErrors[index] = `Please fill in ${addrMissing.join(', ')}`;
          missingFields.push(`Address #${index + 1}`);
        }
      });
  
      const primaryCount = customerFormData.addresses.filter(addr => addr.isPrimary).length;
      if (primaryCount !== 1) {
        errors.addressPrimary = 'There must be exactly one primary address';
        missingFields.push('Primary Address');
      }
  
      if (addressErrors.length > 0) {
        errors.address = addressErrors;
      }
      if (gstErrors.length > 0) {
        errors.gst = gstErrors;
      }
    }
  
    // General error summary
    if (missingFields.length > 1) {
      errors.general = `Please fix the following: ${missingFields.join(', ')}`;
    } else if (missingFields.length === 1) {
      errors.general = `Please fix the error in: ${missingFields[0]}`;
    }
  
    if (errors.general) {
      toast.error(errors.general);
    }
  
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  



  const handleSubmitCustomer = async () => {
    if (!validateCustomerForm()) return;
    setSubmitting(true);
    try {
      setFormErrors({});
      const submitData = { 
        ...customerFormData, 
        type: customerTypeTab === 'oem' ? 'customer' : customerTypeTab,
        customerType: customerTypeTab === 'oem' ? 'oem' : customerFormData.customerType,
        alice: customerFormData.alice || undefined,
        siteAddress: customerFormData.siteAddress || undefined,
        numberOfDG: customerFormData.numberOfDG || undefined,
        bankDetails: customerTypeTab === 'supplier' ? customerFormData.bankDetails : undefined
      };
      if (!submitData.assignedTo || submitData.assignedTo.trim() === '') {
        delete (submitData as any).assignedTo;
      }
      console.log("submitData-99992:", submitData);
      const response = await apiClient.customers.create(submitData);
      console.log("response-99992:", response);
      fetchCustomers();
      fetchAllCustomers();
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

      // Prepare form data, excluding assignedTo if it's empty to avoid ObjectId validation error
      const submitData = { 
        ...customerFormData,
        customerType: customerTypeTab === 'oem' ? 'oem' : customerFormData.customerType,
        alice: customerFormData.alice || undefined,
        siteAddress: customerFormData.siteAddress || undefined,
        numberOfDG: customerFormData.numberOfDG || undefined,
        bankDetails: customerTypeTab === 'supplier' ? customerFormData.bankDetails : undefined
      };
      if (!submitData.assignedTo || submitData.assignedTo.trim() === '') {
        delete (submitData as any).assignedTo;
      }

      const response = await apiClient.customers.update(editingCustomer._id, submitData);
      // setCustomers(customers.map(c => c._id === editingCustomer._id ? response.data : c));
      fetchCustomers()
      fetchAllCustomers();
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
      // Remove followUpDate if it's empty or falsy
      if (!contactData.followUpDate) {
        delete (contactData as any).followUpDate;
      }
      const response = await apiClient.customers.addContact(selectedCustomer._id, contactData);
      fetchCustomers()
      fetchAllCustomers();
      // setCustomers(customers.map(c => 
      //   c._id === selectedCustomer._id 
      //     ? { ...c, contactHistory: [...c.contactHistory, response.data] }
      //     : c
      // ));
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
    // Optimistically update local state
    setCustomers(prev =>
      prev.map(c =>
        c._id === customerId ? { ...c, status: newStatus } : c
      )
    );
    try {
      await apiClient.customers.update(customerId, { status: newStatus });
      // Fetch from server after drop is complete
      // fetchCustomers();
      fetchAllCustomers();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };



  const resetCustomerForm = () => {
    setCustomerFormData({
      name: '',
      alice: '',
      contactPersonName: '',
      email: '',
      phone: '',
      panNumber: '',
      address: '',
      siteAddress: '',
      numberOfDG: 1, // Start with 1 since we initialize with one DG detail
      customerType: customerTypeTab === 'oem' ? 'oem' : 'retail',
      leadSource: '',
      notes: '',
      addresses: [{
        id: Date.now(),
        address: '',
        state: '',
        district: '',
        pincode: '',
        isPrimary: true,
        gstNumber: '',
        contactPersonName: '',
        designation: '',
        email: '',
        phone: '',
        registrationStatus: 'non_registered',
      }],
      type: customerTypeTab === 'oem' ? 'customer' : customerTypeTab,
      bankDetails: { bankName: '', accountNo: '', ifsc: '', branch: '' },
      dgDetails: [{
        dgSerialNumbers: '',
        alternatorMake: '',
        alternatorSerialNumber: '',
        dgMake: '',
        engineSerialNumber: '',
        dgModel: '',
        dgRatingKVA: 0,
        salesDealerName: '',
        commissioningDate: new Date().toISOString().split('T')[0],
        warrantyStatus: 'warranty',
        cluster: '',
        warrantyStartDate: '',
        warrantyEndDate: '',
        locationAddress: ''
      }]
    });
    setShowAssignedToDropdown(false);
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
    console.log('Opening edit modal for customer:', customer);
    console.log('Customer DGDetails:', (customer as any).dgDetails);
    setEditingCustomer(customer);
    setCustomerFormData({
      name: customer.name,
      alice: (customer as any).alice || '',
      contactPersonName: customer.contactPersonName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      panNumber: customer.panNumber || '',
      address: typeof customer.address === 'string' ? customer.address : 
        (customer.address && typeof customer.address === 'object' ? 
          `${customer.address.street}, ${customer.address.city}, ${customer.address.state} ${customer.address.pincode}` : ''),
      customerType: customer.customerType || 'retail',
      leadSource: (customer as any).leadSource || '',
      notes: customer.notes || '',
      siteAddress: (customer as any).siteAddress || '',
      numberOfDG: (customer as any).numberOfDG || 0,
      addresses: (customer as any).addresses && Array.isArray((customer as any).addresses)
        ? (customer as any).addresses.map((addr: any) => ({ ...addr, gstNumber: addr.gstNumber || '', contactPersonName: addr.contactPersonName || '', designation: addr.designation || '', email: addr.email || '', phone: addr.phone || '', registrationStatus: addr.registrationStatus || 'non_registered' }))
        : [{
          id: Date.now(),
          address: '',
          state: '',
          district: '',
          pincode: '',
          isPrimary: true,
          gstNumber: '',
          contactPersonName: '',
          designation: '',
          email: '',
          phone: '',
          registrationStatus: 'non_registered',
        }],
      type: (customer as any).type || (customerTypeTab === 'oem' ? 'customer' : customerTypeTab), // <-- ensure type is set
      bankDetails: (customer as any).bankDetails || { bankName: '', accountNo: '', ifsc: '', branch: '' },
      dgDetails: (customer as any).dgDetails && Array.isArray((customer as any).dgDetails) && (customer as any).dgDetails.length > 0
        ? (customer as any).dgDetails.map((dg: any) => ({
            dgSerialNumbers: dg.dgSerialNumbers || '',
            alternatorMake: dg.alternatorMake || '',
            alternatorSerialNumber: dg.alternatorSerialNumber || '',
            dgMake: dg.dgMake || '',
            engineSerialNumber: dg.engineSerialNumber || '',
            dgModel: dg.dgModel || '',
            dgRatingKVA: dg.dgRatingKVA || 0,
            salesDealerName: dg.salesDealerName || '',
            commissioningDate: dg.commissioningDate 
              ? new Date(dg.commissioningDate).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            warrantyStatus: dg.warrantyStatus || determineWarrantyStatus(dg.commissioningDate),
            cluster: dg.cluster || '',
            warrantyStartDate: dg.warrantyStartDate 
              ? new Date(dg.warrantyStartDate).toISOString().split('T')[0]
              : '',
            warrantyEndDate: dg.warrantyEndDate 
              ? new Date(dg.warrantyEndDate).toISOString().split('T')[0]
              : '',
            locationAddress: dg.locationAddress || ''
          }))
        : [{
            dgSerialNumbers: '',
            alternatorMake: '',
            alternatorSerialNumber: '',
            dgMake: '',
            engineSerialNumber: '',
            dgModel: '',
            dgRatingKVA: 0,
            salesDealerName: '',
            commissioningDate: new Date().toISOString().split('T')[0],
            warrantyStatus: 'warranty',
            cluster: '',
            warrantyStartDate: '',
            warrantyEndDate: '',
            locationAddress: ''
          }]
    });
    console.log('Final form data set:', customerFormData);
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


  const handleDragStart = (e: React.DragEvent, customerId: string) => {
    setDraggedCustomer(customerId);
    e.dataTransfer.setData('text/plain', customerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault();
    const customerId = e.dataTransfer.getData('text/plain');

    if (customerId && draggedCustomer) {
      const currentCustomer = allCustomers.find(c => c._id === customerId);
      if (currentCustomer && currentCustomer.status !== newStatus) {
        handleStatusChange(customerId, newStatus);
        fetchAllCustomers();
        fetchCustomers();
      }
    }


    setDraggedCustomer(null);
    setDragOverColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedCustomer(null);
    setDragOverColumn(null);
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
      title: customerTypeTab === 'customer' ? 'Total Customers' : 
             customerTypeTab === 'supplier' ? 'Total Suppliers' : 
             customerTypeTab === 'dg_customer' ? 'Total DG Customers' :
             'Total OEM Customers',
      value: customerTypeTab === 'dg_customer' 
        ? allCustomers.filter(customer => customer.type === 'customer' && customer.status === 'converted').length
        : customerTypeTab === 'oem'
        ? allCustomers.filter(customer => customer.type === 'customer' && customer.customerType === 'oem').length
        : allCustomers.filter(customer => customer.type === customerTypeTab).length,
      action: () => {
        clearAllFilters();
      },
      icon: <Users className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'New Leads',
      value: customerTypeTab === 'dg_customer' || customerTypeTab === 'oem' ? 0 : newLeadStatusCount,
      action: () => {
        if (customerTypeTab !== 'dg_customer' && customerTypeTab !== 'oem') {
          setStatusFilter('new');
        }
      },
      icon: <UserPlus className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Qualified',
      value: customerTypeTab === 'dg_customer' || customerTypeTab === 'oem' ? 0 : qualifiedStatusCount,
      action: () => {
        if (customerTypeTab !== 'dg_customer' && customerTypeTab !== 'oem') {
          setStatusFilter('qualified');
        }
      },
      icon: <Target className="w-6 h-6" />,
      color: 'yellow'
    },
    {
      title: 'Converted',
      value: customerTypeTab === 'dg_customer' ? convertedStatusCount : 
             customerTypeTab === 'oem' ? convertedStatusCount :
             convertedStatusCount,
      action: () => {
        if (customerTypeTab !== 'dg_customer' && customerTypeTab !== 'oem') {
          setStatusFilter('converted');
        }
      },
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    }
  ];

  // Status options with labels
  const statusOptions = customerTypeTab === 'oem' ? [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'blacklisted', label: 'Blacklisted' }
  ] : [
    { value: 'all', label: 'All Status' },
    { value: 'new', label: 'New' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'converted', label: 'Converted' },
    { value: 'lost', label: 'Lost' }
  ];

  // Type options with labels
  const typeOptions = customerTypeTab === 'oem' ? [
    { value: 'all', label: 'All Types' },
    { value: 'diesel', label: 'Diesel' },
    { value: 'petrol', label: 'Petrol' },
    { value: 'gas', label: 'Gas' },
    { value: 'hybrid', label: 'Hybrid' }
  ] : [
    { value: 'retail', label: 'Retail' },
    { value: 'telecom', label: 'Telecom' },
    { value: 'ev', label: 'EV' },
    { value: 'dg', label: 'DG' },
    { value: 'jenaral', label: 'Jenaral' },
    { value: 'je', label: 'JE' },
    { value: 'oem', label: 'OEM' }
  ];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusLabel = (value: string) => {
    const option = statusOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Status';
  };

  const getTypeLabel = (value: string) => {
    const found = typeOptions.find(opt => opt.value === value);
    return found ? found.label : 'Retail';
  };

  const getAssignedToLabel = (value: string | undefined) => {
    if (!value) return 'Select user (optional)';
    const user = users.find(u => u.id === value);

    return user ? (user.fullName || `${user.firstName} ${user.lastName}`) : 'Select user (optional)';
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowStatusDropdown(false);
        setShowTypeDropdown(false);
        setShowAssignedToDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const contactTypeOptions = [
    { value: 'call', label: 'Call' },
    { value: 'meeting', label: 'Meeting' },
    { value: 'email', label: 'Email' },
    { value: 'whatsapp', label: 'WhatsApp' },
  ];

  const getContactTypeLabel = (value: string) => {
    const found = contactTypeOptions.find(opt => opt.value === value);
    return found ? found.label : 'Select Contact Type';
  };

  // Add filter options for sort
  const sortFieldOptions = customerTypeTab === 'oem' ? [
    { value: 'all', label: 'Select Field' },
    { value: 'companyName', label: 'Company Name' },
    { value: 'oemCode', label: 'OEM Code' },
    { value: 'contactPerson', label: 'Contact Person' },
    { value: 'email', label: 'Email' },
    { value: 'rating', label: 'Rating' },
    { value: 'createdAt', label: 'Created Date' }
  ] : [
    { value: 'all', label: 'Select Field' },
    { value: 'name', label: `${entityLabel} Name` },
    { value: 'email', label: 'Email' },
    { value: 'createdAt', label: 'Created Date' }
  ];
  const sortOrderOptions = [
    { value: 'asc', label: 'Ascending (A-Z)' },
    { value: 'desc', label: 'Descending (Z-A)' },
  ];

  const clearAllFilters = () => {
    setShowFilters(false);
    setSearchTerm('');
    setSortField('all');
    setSortOrder('asc');
    setTypeFilter('all');
    setStatusFilter('all');
  };
  const hasActiveFilters = typeFilter !== 'all' || statusFilter !== 'all' || sortField !== 'all' || searchTerm;

  const handleExportExcel = async () => {
    try {
      // Build export parameters based on current filters
      const params: any = {};
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.customerType = typeFilter;
      if (assignedToFilter) params.assignedTo = assignedToFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      
      // Add type parameter for supplier/customer distinction
      if (customerTypeTab === 'supplier') {
        params.type = 'supplier';
      } else if (customerTypeTab === 'customer') {
        params.type = 'customer';
      }

      // Call the export API
      const blob = await apiClient.customers.export(params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename based on type
      const filename = customerTypeTab === 'supplier' ? 'suppliers-export.xlsx' : 'customers-export.xlsx';
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${customerTypeTab === 'supplier' ? 'Suppliers' : 'Customers'} exported successfully!`);
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error('Failed to export data: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      {/* Header */}
      <PageHeader
        title={customerTypeTab === 'oem' ? 'OEM Management' : 
               customerTypeTab === 'dg_customer' ? 'DG Customer Management' :
               customerTypeTab === 'supplier' ? 'Supplier Management' :
               'Customer Relationship Management'}
                  subtitle={customerTypeTab === 'oem' ? 'Manage OEM customers, products, and business relationships' :
                   customerTypeTab === 'dg_customer' ? 'Manage DG customers and track interactions' :
                   customerTypeTab === 'supplier' ? 'Manage suppliers and track interactions' :
                   'Manage customer relationships, leads, and track interactions'}
      >
        <div className="flex space-x-3">
          <button
            onClick={() => setShowPipelineModal(true)}
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-orange-700 hover:to-orange-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Sales Pipeline</span>
          </button>

          {user?.role !== 'hr' && customerTypeTab !== 'dg_customer' && customerTypeTab !== 'oem' &&
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">
                {customerTypeTab === 'customer' ? 'Add Customer' : 
                 customerTypeTab === 'supplier' ? 'Add Supplier' : 
                 customerTypeTab === 'dg_customer' ? 'Add DG Customer' :
                 'Add OEM Customer'}
              </span>
            </button>
          }
          {(customerTypeTab === 'customer' || customerTypeTab === 'supplier') && (
            <button
              onClick={handleImportClick}
              disabled={importing}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className={`w-4 h-4 ${importing ? 'animate-pulse' : ''}`} />
              <span className="text-sm">{importing ? 'Importing...' : 'Import Excel'}</span>
            </button>
          )}
                     {(customerTypeTab === 'customer' || customerTypeTab === 'supplier') && (
             <button
               onClick={handleExportExcel}
               disabled={importing}
               className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-purple-700 hover:to-purple-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
             >
               <Download className="w-4 h-4" />
               <span className="text-sm">{importing ? 'Exporting...' : 'Export Excel'}</span>
             </button>
           )}
        </div>
      </PageHeader>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      {importMessage && (
        <div className={`p-4 rounded-lg border ${importMessage.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{importMessage.text}</p>
            <button
              onClick={() => setImportMessage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}



      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} onClick={stat.action} className="bg-white hover:bg-gray-100 cursor-pointer p-4 rounded-xl shadow-sm border border-gray-100 transform transition-transform duration-200 hover:scale-105 active:scale-95">
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

      {/* Search and Tabs Section - Always Visible */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        {/* Header Section - Single Row */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={customerTypeTab === 'oem' ? 
                  "Search OEMs by company name, contact person, email, OEM code, or products..." :
                  "Search customers by name, email, or ESN"
                }
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm text-sm placeholder-gray-500"
              />
            </div>
            {/* Action Buttons */}
            {customerTypeTab !== 'oem' && customerTypeTab !== 'dg_customer' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFilters(v => !v)}
                  className="px-4 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 border border-gray-300 text-sm font-medium flex items-center gap-2 shadow-sm"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
            )}

            {/* Customer Type Tabs */}
            <div className="flex space-x-1 bg-white p-1 rounded-lg border border-gray-200">
              <button
                className={`px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${customerTypeTab === 'customer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                onClick={() => setCustomerTypeTab('customer')}
                type="button"
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>Existing Customers</span>
                </div>
              </button>
              <button
                className={`px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${customerTypeTab === 'dg_customer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                onClick={() => setCustomerTypeTab('dg_customer')}
                type="button"
              >
                <div className="flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Prospective Customers</span>
                </div>
              </button>
              <button
                className={`px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${customerTypeTab === 'oem'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                onClick={() => setCustomerTypeTab('oem')}
                type="button"
              >
                <div className="flex items-center space-x-2">
                  <Package className="w-4 h-4" />
                  <span>OEM</span>
                </div>
              </button>
              <button
                className={`px-4 py-2.5 rounded-md font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${customerTypeTab === 'supplier'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                onClick={() => setCustomerTypeTab('supplier')}
                type="button"
              >
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4" />
                  <span>Suppliers</span>
                </div>
              </button>
            </div>


          </div>
        </div>
        {/* Collapsible Filter Panel */}
        {customerTypeTab !== 'oem' && showFilters && (
          <div className="px-6 py-6 bg-gray-50">
            <div className="grid grid-cols-4 gap-4 mb-6">
              {/* Sort By */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Sort By</label>
                <select
                  value={sortField}
                  onChange={e => setSortField(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                >
                  {sortFieldOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {/* Sort Order */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                >
                  <option value="asc">Ascending (A-Z)</option>
                  <option value="desc">Descending (Z-A)</option>
                </select>
              </div>
              {/* Status */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                            setStatusFilter(option.value as any);
                            setShowStatusDropdown(false);
                          }}
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${statusFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearAllFilters}
                  // disabled={!hasActiveFilters}
                  className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${hasActiveFilters
                    ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                    : 'bg-gray-100 text-gray-400 border border-gray-200 hover-gray-700 '
                    }`}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Active Filters Chips */}
        {hasActiveFilters && (
          <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">{customers.filter(customer => customer.type === customerTypeTab).length}</span>
              <span className="mx-1">of</span>
              <span>{customers.filter(customer => customer.type === customerTypeTab).length}</span>
              <span className="ml-1">items found</span>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500">Active filters:</span>
              {typeFilter !== 'all' && (
                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs flex items-center">
                  {getTypeLabel(typeFilter)}
                  <button onClick={() => setTypeFilter('all')} className="ml-1 text-purple-500 hover:text-purple-700">×</button>
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs flex items-center">
                  {getStatusLabel(statusFilter)}
                  <button onClick={() => setStatusFilter('all')} className="ml-1 text-blue-500 hover:text-blue-700">×</button>
                </span>
              )}
              {sortField !== 'all' && (
                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs flex items-center">
                  {(() => {
                    let label = '';
                    if (sortField === 'name') label = 'Customer Name';
                    else if (sortField === 'email') label = 'Email';
                    else if (sortField === 'createdAt') label = 'Created Date';
                    return `${label} - ${sortOrder === 'asc' ? 'A-Z (Ascending)' : 'Z-A (Descending)'}`;
                  })()}
                  <button onClick={() => setSortField('all')} className="ml-1 text-green-500 hover:text-green-700">×</button>
                </span>
              )}
              {searchTerm && (
                <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs flex items-center">
                  {`Search: "${searchTerm}"`}
                  <button onClick={() => setSearchTerm('')} className="ml-1 text-yellow-500 hover:text-yellow-700">×</button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {customerTypeTab === 'oem' ? 'OEM Code' : 
                   customerTypeTab === 'customer' ? 'Customer ID' :
                   customerTypeTab === 'dg_customer' ? 'DG Customer ID' :
                   'Supplier ID'}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {customerTypeTab === 'oem' ? 'Company Name' : 
                   customerTypeTab === 'customer' ? 'Customer Name' :
                   customerTypeTab === 'dg_customer' ? 'DG Customer Name' :
                   'Supplier Name'}
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Person Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Designation
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile Number
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email ID
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  District
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pin Code
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GST Details
                </th>

                {/* Status - Only show for non-suppliers */}
                {customerTypeTab !== 'supplier' && (
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                )}
                {/* <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {customerTypeTab === 'oem' ? 'Rating' : 'Customer Type'}
                </th> */}
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={15} className="px-6 py-8 text-center text-gray-500">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-6 py-8 text-center text-gray-500">
                    <div className="text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">
                        {customerTypeTab === 'customer' ? "No Customers found" : 
                         customerTypeTab === 'supplier' ? "No Suppliers found" : 
                         customerTypeTab === 'dg_customer' ? "No DG Customers found" :
                         "No OEM Customers found"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.filter(customer => customer && customer._id).map((customer) => (
                  <tr key={customer._id} className="hover:bg-gray-50">
                    {/* ID Column */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                      {customerTypeTab === 'oem' && customer.oemCode ? customer.oemCode :
                       customer.customerId ? customer.customerId :
                       customer._id?.slice(-6) || 'N/A'}
                    </td>
                    
                    {/* Name Column */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">
                        {customerTypeTab === 'oem' ? 
                          (customer.companyName || customer.name || 'Unnamed OEM') : 
                          (customer.name || 'Unnamed Customer')
                        }
                      </div>
                    </td>
                    
                                          {/* Contact Person Name Column */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                        {(() => {
                          if (customerTypeTab === 'oem') return customer.contactPerson || '-';
                          const primary = customer.addresses && customer.addresses.length > 0
                            ? (customer.addresses.find(a => a.isPrimary) || customer.addresses[0])
                            : undefined;
                          return (primary && (primary as any).contactPersonName) || customer.contactPersonName || '-';
                        })()}
                      </td>
                    
                    {/* Designation Column */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                      {(() => {
                        if (customerTypeTab === 'oem') return customer.designation || '-';
                        const primary = customer.addresses && customer.addresses.length > 0
                          ? (customer.addresses.find(a => a.isPrimary) || customer.addresses[0])
                          : undefined;
                        return (primary && (primary as any).designation) || customer.designation || '-';
                      })()}
                    </td>
                    
                                          {/* Mobile Number Column */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                        {(() => {
                          const primary = customer.addresses && customer.addresses.length > 0
                            ? (customer.addresses.find(a => a.isPrimary) || customer.addresses[0])
                            : undefined;
                          return (primary && (primary as any).phone) || customer.phone || 'N/A';
                        })()}
                      </td>
                    
                                          {/* Email ID Column */}
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                        {(() => {
                          const primary = customer.addresses && customer.addresses.length > 0
                            ? (customer.addresses.find(a => a.isPrimary) || customer.addresses[0])
                            : undefined;
                          return (primary && (primary as any).email) || customer.email || 'N/A';
                        })()}
                      </td>
                    
                    {/* Address Column */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                      {(() => {
                        if (customer.addresses && customer.addresses.length > 0) {
                          const primaryAddress = customer.addresses.find(addr => addr.isPrimary) || customer.addresses[0];
                          return primaryAddress.address || 'N/A';
                        } else if (customerTypeTab === 'oem' && customer.address && typeof customer.address === 'object') {
                          return customer.address.street || 'N/A';
                        } else if (typeof customer.address === 'string') {
                          return customer.address;
                        }
                        return 'N/A';
                      })()}
                    </td>
                    
                    {/* State Column */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                      {(() => {
                        if (customer.addresses && customer.addresses.length > 0) {
                          const primaryAddress = customer.addresses.find(addr => addr.isPrimary) || customer.addresses[0];
                          return primaryAddress.state || 'N/A';
                        } else if (customerTypeTab === 'oem' && customer.address && typeof customer.address === 'object') {
                          return customer.address.state || 'N/A';
                        }
                        return 'N/A';
                      })()}
                    </td>
                    
                    {/* District Column */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                      {(() => {
                        if (customer.addresses && customer.addresses.length > 0) {
                          const primaryAddress = customer.addresses.find(addr => addr.isPrimary) || customer.addresses[0];
                          return primaryAddress.district || 'N/A';
                        }
                        return 'N/A';
                      })()}
                    </td>
                    
                    {/* Pin Code Column */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                      {(() => {
                        if (customer.addresses && customer.addresses.length > 0) {
                          const primaryAddress = customer.addresses.find(addr => addr.isPrimary) || customer.addresses[0];
                          return primaryAddress.pincode || 'N/A';
                        } else if (customerTypeTab === 'oem' && customer.address && typeof customer.address === 'object') {
                          return customer.address.pincode || 'N/A';
                        }
                        return 'N/A';
                      })()}
                    </td>
                    
                    {/* GST Details Column */}
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                      {(() => {
                        if (customer.addresses && customer.addresses.length > 0) {
                          const primaryAddress = customer.addresses.find(addr => addr.isPrimary) || customer.addresses[0];
                          return primaryAddress.gstNumber || 'N/A';
                        } else if (customer.gstNumber) {
                          return customer.gstNumber;
                        }
                        return 'N/A';
                      })()}
                    </td>
                    

                    
                    {/* Status Column - Only show for non-suppliers */}
                    {customerTypeTab !== 'supplier' && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {customerTypeTab === 'oem' ? (
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                            (customer.status as any) === 'active' ? 'bg-green-100 text-green-800' :
                            (customer.status as any) === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            (customer.status as any) === 'blacklisted' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            <span className="capitalize">{(customer.status as any) || 'active'}</span>
                          </span>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(customer.status)}`}>
                            {getStatusIcon(customer.status)}
                            <span className="ml-1 capitalize">{customer.status}</span>
                          </span>
                        )}
                      </td>
                    )}
                    
                    {/* Customer Type/Rating Column */}
                    {/* <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                      {customerTypeTab === 'oem' ? (
                        customer.rating ? `${customer.rating}/5` : 'N/A'
                      ) : (
                        <span className="capitalize">{customer.customerType}</span>
                      )}
                    </td> */}
                    
                    {/* Actions Column */}
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openDetailsModal(customer)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {customerTypeTab !== 'oem' && customerTypeTab !== 'dg_customer' && customerTypeTab !== 'supplier' && (
                          <></>
                        )}
                        {customerTypeTab !== 'oem' && customerTypeTab !== 'dg_customer' && (
                          <button
                            onClick={() => openEditModal(customer)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title={`Edit ${entityLabel}`} 
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {user?.role !== 'hr' && customerTypeTab !== 'oem' && customerTypeTab !== 'dg_customer' &&
                          <button
                            onClick={() => handleDeleteCustomer(customer._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title={(customerTypeTab as string) === 'oem' ? 'Delete OEM' : 'Delete Customer'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        }
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalDatas}
        itemsPerPage={limit}
      />

      {/* Preview Import Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Preview Excel Import</h2>
                <p className="text-gray-600 mt-1">Review what will be imported before confirming</p>
              </div>
              <button onClick={closePreviewModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Import Summary */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Import Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{previewData.summary.totalRows}</div>
                    <div className="text-gray-600">Total Rows</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{previewData.summary.newCustomers}</div>
                    <div className="text-gray-600">New Customers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{previewData.summary.existingCustomers}</div>
                    <div className="text-gray-600">Existing Customers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{previewData.errors.length}</div>
                    <div className="text-gray-600">Errors</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        {customerTypeTab === 'customer' ? 'New Customers' : 
                         customerTypeTab === 'supplier' ? 'New Suppliers' : 
                         customerTypeTab === 'dg_customer' ? 'New DG Customers' :
                         'New OEM Customers'}
                      </p>
                      <p className="text-2xl font-bold text-blue-900">{previewData.summary.newCustomers}</p>
                    </div>
                    <Plus className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">
                        {customerTypeTab === 'customer' ? 'Existing Customers' : 
                         customerTypeTab === 'supplier' ? 'Existing Suppliers' : 
                         customerTypeTab === 'dg_customer' ? 'Existing DG Customers' :
                         'Existing OEM Customers'}
                      </p>
                      <p className="text-2xl font-bold text-yellow-900">{previewData.summary.existingCustomers}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Total Rows</p>
                      <p className="text-2xl font-bold text-purple-900">{previewData.summary.totalRows}</p>
                    </div>
                    <FileText className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>
              {previewData.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Import Errors</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <ul className="list-disc list-inside space-y-1">
                          {previewData.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {previewData.customersToCreate.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-green-900 mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    {customerTypeTab === 'customer' ? 'Customers to be Created' : 
                     customerTypeTab === 'supplier' ? 'Suppliers to be Created' : 
                     customerTypeTab === 'dg_customer' ? 'DG Customers to be Created' :
                     'OEM Customers to be Created'} ({previewData.customersToCreate.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-green-100 text-green-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Customer Name</th>
                          <th className="px-3 py-2 text-left font-medium">Alias (Alice)</th>
                          <th className="px-3 py-2 text-left font-medium">Mobile Number</th>
                          <th className="px-3 py-2 text-left font-medium">Contact Person</th>
                          <th className="px-3 py-2 text-left font-medium">Designation</th>
                          <th className="px-3 py-2 text-left font-medium">Site Address</th>
                          {customerTypeTab === 'customer' && (
                            <>
                              <th className="px-3 py-2 text-left font-medium">DG Count</th>
                              <th className="px-3 py-2 text-left font-medium">
                                DG Details
                                <span className="ml-1 text-xs text-gray-500" title="Click on 'Yes' to view detailed DG information">
                                  ℹ️
                                </span>
                              </th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-200">
                        {previewData.customersToCreate.slice(0, 10).map((customer: any, index: number) => (
                          <tr key={index} className="hover:bg-green-50">
                            <td className="px-3 py-2">{customer.name}</td>
                            <td className="px-3 py-2">{customer.alice || '-'}</td>
                            <td className="px-3 py-2">{customer.phone || '-'}</td>
                            <td className="px-3 py-2">{customer.contactPersonName || '-'}</td>
                            <td className="px-3 py-2">
                              {(() => {
                                if (customerTypeTab === 'oem') return customer.designation || '-';
                                const primary = customer.addresses && customer.addresses.length > 0
                                  ? (customer.addresses.find((a: any) => a.isPrimary) || customer.addresses[0])
                                  : undefined;
                                return (primary && (primary as any).designation) || customer.designation || '-';
                              })()}
                            </td>
                            <td className="px-3 py-2">{customer.siteAddress || '-'}</td>
                            {customerTypeTab === 'customer' && (
                              <>
                                <td className="px-3 py-2">{customer.numberOfDG || 0}</td>
                                <td className="px-3 py-2">
                                  {customer.hasDGDetails ? (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full cursor-pointer hover:bg-blue-200" 
                                          title="Click to view DG details"
                                          onClick={() => {
                                            const dgDetails = customer.dgDetails || [];
                                            if (dgDetails.length > 0) {
                                              alert(`DG Details:\n${dgDetails.map((dg: any, idx: number) => 
                                                `DG ${idx + 1}:\n` +
                                                `  Serial: ${dg.dgSerialNumbers}\n` +
                                                `  Make: ${dg.dgMake}\n` +
                                                `  Model: ${dg.dgModel}\n` +
                                                `  Rating: ${dg.dgRatingKVA} KVA\n` +
                                                `  Alternator: ${dg.alternatorMake}\n` +
                                                `  Engine: ${dg.engineSerialNumber}\n` +
                                                `  Dealer: ${dg.salesDealerName}\n` +
                                                `  Commissioning: ${dg.commissioningDate}\n` +
                                                `  Warranty: ${dg.warrantyStatus}\n` +
                                                `  Cluster: ${dg.cluster}`
                                              ).join('\n\n')}`);
                                            }
                                          }}>
                                    Yes ({customer.dgDetails?.length || 0})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                    No
                                  </span>
                                )}
                              </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.customersToCreate.length > 10 && (
                      <p className="text-sm text-green-600 mt-2 text-center">
                        ... and {previewData.customersToCreate.length - 10} {
                          customerTypeTab === 'customer' ? 'more customers' : 
                          customerTypeTab === 'supplier' ? 'more suppliers' : 
                          customerTypeTab === 'dg_customer' ? 'more DG customers' :
                          'more OEM customers'
                        }
                      </p>
                    )}
                  </div>
                </div>
              )}
              {previewData.existingCustomers.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-yellow-900 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    {customerTypeTab === 'customer' ? 'Existing Customers' : 
                     customerTypeTab === 'supplier' ? 'Existing Suppliers' : 
                     customerTypeTab === 'dg_customer' ? 'Existing DG Customers' :
                     'Existing OEM Customers'} ({previewData.existingCustomers.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-yellow-100 text-yellow-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Customer Name</th>
                          <th className="px-3 py-2 text-left font-medium">Alias (Alice)</th>
                          <th className="px-3 py-2 text-left font-medium">Mobile Number</th>
                          <th className="px-3 py-2 text-left font-medium">Site Address</th>
                          {customerTypeTab === 'customer' && (
                            <th className="px-3 py-2 text-left font-medium">DG Count</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-yellow-200">
                        {previewData.existingCustomers.slice(0, 10).map((customer: any, index: number) => (
                          <tr key={index} className="hover:bg-yellow-50">
                            <td className="px-3 py-2">{customer.name}</td>
                            <td className="px-3 py-2">{customer.alice || '-'}</td>
                            <td className="px-3 py-2">{customer.phone || '-'}</td>
                            <td className="px-3 py-2">{customer.siteAddress || '-'}</td>
                            {customerTypeTab === 'customer' && (
                              <td className="px-3 py-2">{customer.numberOfDG || 0}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.existingCustomers.length > 10 && (
                      <p className="text-sm text-yellow-600 mt-2 text-center">
                        ... and {previewData.existingCustomers.length - 10} more existing {
                          customerTypeTab === 'customer' ? 'customers' : 
                          customerTypeTab === 'supplier' ? 'suppliers' : 
                          customerTypeTab === 'dg_customer' ? 'DG customers' :
                          'OEM customers'
                        }
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Data Validation Summary */}
              {previewData.customersToCreate.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-indigo-900 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Data Validation Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-600">
                        {previewData.customersToCreate.filter((c: any) => c.name && c.name.trim()).length}
                      </div>
                      <div className="text-gray-600">Valid Names</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {previewData.customersToCreate.filter((c: any) => c.phone && c.phone.trim()).length}
                      </div>
                      <div className="text-gray-600">With Phone</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-600">
                        {previewData.customersToCreate.filter((c: any) => c.siteAddress && c.siteAddress.trim()).length}
                      </div>
                      <div className="text-gray-600">With Site Address</div>
                    </div>
                    {customerTypeTab === 'customer' && (
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">
                          {previewData.customersToCreate.filter((c: any) => c.hasDGDetails).length}
                        </div>
                        <div className="text-gray-600">With DG Details</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Detailed Preview Section */}
              {previewData.customersToCreate.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Detailed Preview - First Customer
                  </h3>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    {(() => {
                      const firstCustomer = previewData.customersToCreate[0];
                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                              <div className="space-y-2 text-sm">
                                <div><span className="font-medium">Name:</span> {firstCustomer.name}</div>
                                <div><span className="font-medium">Alice:</span> {firstCustomer.alice || 'Not provided'}</div>
                                <div><span className="font-medium">Contact Person:</span> {firstCustomer.contactPersonName || 'Not provided'}</div>
                                <div><span className="font-medium">Designation:</span> {
                                  (() => {
                                    if (customerTypeTab === 'oem') return firstCustomer.designation || 'Not provided';
                                    const primary = firstCustomer.addresses && firstCustomer.addresses.length > 0
                                      ? (firstCustomer.addresses.find((a: any) => a.isPrimary) || firstCustomer.addresses[0])
                                      : undefined;
                                    return (primary && (primary as any).designation) || firstCustomer.designation || 'Not provided';
                                  })()
                                }</div>
                                <div><span className="font-medium">Phone:</span> {firstCustomer.phone || 'Not provided'}</div>
                                <div><span className="font-medium">Email:</span> {firstCustomer.email || 'Not provided'}</div>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Address & Location</h4>
                              <div className="space-y-2 text-sm">
                                <div><span className="font-medium">Site Address:</span> {firstCustomer.siteAddress || 'Not provided'}</div>
                                {customerTypeTab === 'customer' && (
                                  <div><span className="font-medium">Number of DG:</span> {firstCustomer.numberOfDG || 0}</div>
                                )}
                                <div><span className="font-medium">GST Number:</span> {firstCustomer.gstNumber || 'Not provided'}</div>
                              </div>
                            </div>
                          </div>
                          
                          {customerTypeTab === 'customer' && firstCustomer.hasDGDetails && firstCustomer.dgDetails && firstCustomer.dgDetails.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">DG Technical Details</h4>
                              <div className="bg-gray-50 rounded-lg p-3">
                                {firstCustomer.dgDetails.map((dg: any, idx: number) => (
                                  <div key={idx} className="mb-3 last:mb-0">
                                    <div className="font-medium text-sm text-gray-700 mb-2">DG Unit #{idx + 1}</div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div><span className="font-medium">Serial:</span> {dg.dgSerialNumbers || 'N/A'}</div>
                                      <div><span className="font-medium">Make:</span> {dg.dgMake || 'N/A'}</div>
                                      <div><span className="font-medium">Model:</span> {dg.dgModel || 'N/A'}</div>
                                      <div><span className="font-medium">Rating:</span> {dg.dgRatingKVA || 0} KVA</div>
                                      <div><span className="font-medium">Alternator:</span> {dg.alternatorMake || 'N/A'}</div>
                                      <div><span className="font-medium">Engine:</span> {dg.engineSerialNumber || 'N/A'}</div>
                                      <div><span className="font-medium">Dealer:</span> {dg.salesDealerName || 'N/A'}</div>
                                      <div><span className="font-medium">Commissioning:</span> {dg.commissioningDate || 'N/A'}</div>
                                      <div><span className="font-medium">Warranty:</span> {dg.warrantyStatus || 'N/A'}</div>
                                      <div><span className="font-medium">Cluster:</span> {dg.cluster || 'N/A'}</div>
                                      <div><span className="font-medium">Warranty Start Date:</span> {dg.warrantyStartDate || 'N/A'}</div>
                                      <div><span className="font-medium">Warranty End Date:</span> {dg.warrantyEndDate || 'N/A'}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                            <strong>Note:</strong> This preview shows the first customer from your Excel file. 
                            All {previewData.customersToCreate.length} customers will be imported with similar structure.
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
            <div className="flex space-x-4 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closePreviewModal}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel Import
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing || previewData.errors.length > 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {importing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing... {importProgress}%
                  </span>
                ) : (
                  `Confirm Import (${previewData.summary.newCustomers} New, ${previewData.summary.existingCustomers} Existing)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl m-4 h-[95vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add New {
                  customerTypeTab === 'customer' ? 'Customer' : 
                  customerTypeTab === 'supplier' ? 'Supplier' : 
                  customerTypeTab === 'dg_customer' ? 'DG Customer' :
                  'OEM Customer'
                }</h2>
                <p className="text-sm text-gray-600 mt-1">Fill in the details below to create a new {entityLabelLower}</p>
              </div>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetCustomerForm();
                  setFormErrors({})
                  setShowAssignedToDropdown(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={(e) => { e.preventDefault(); handleSubmitCustomer(); }}>
                {formErrors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 mx-6 mt-6">
                    <p className="text-red-600 text-sm">{formErrors.general}</p>
                  </div>
                )}
                <div className="flex flex-col lg:flex-row">
                  {/* Left: Main Fields */}
                  <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">Basic Information</h3>
                        <p className="text-sm text-gray-600 mt-1">{entityLabel} details and contact information</p>
                      </div>
                    </div>
                    <div>
                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={customerFormData.name}
                          onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Enter name"
                        />
                        {formErrors.name && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                        )}
                      </div>
                    </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          PAN Number
                        </label>
                        <input
                          type="text"
                          value={customerFormData.panNumber || ''}
                          onChange={e => setCustomerFormData({ ...customerFormData, panNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
                          className={`w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500${formErrors.panNumber ? ' border-red-500' : ''}`}
                          placeholder="Enter PAN number"
                          maxLength={10}
                        />
                        {formErrors.panNumber && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.panNumber}</p>
                        )}
                      </div>

                    <div className='mt-4'>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={customerFormData.notes}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Additional notes"
                      />
                    </div>

                    {/* Supplier Bank Details - only for Suppliers */}
                    {customerTypeTab === 'supplier' && (
                      <div className="mt-4">
                        <h4 className="text-md font-semibold text-gray-800 mb-2">Bank Details</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                            <input
                              type="text"
                              value={customerFormData.bankDetails?.bankName || ''}
                              onChange={(e) => setCustomerFormData({ ...customerFormData, bankDetails: { ...(customerFormData.bankDetails || { bankName: '', accountNo: '', ifsc: '', branch: '' }), bankName: e.target.value } })}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter bank name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                            <input
                              type="text"
                              value={customerFormData.bankDetails?.accountNo || ''}
                              onChange={(e) => setCustomerFormData({ ...customerFormData, bankDetails: { ...(customerFormData.bankDetails || { bankName: '', accountNo: '', ifsc: '', branch: '' }), accountNo: e.target.value } })}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter account number"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                            <input
                              type="text"
                              value={customerFormData.bankDetails?.ifsc || ''}
                              onChange={(e) => setCustomerFormData({ ...customerFormData, bankDetails: { ...(customerFormData.bankDetails || { bankName: '', accountNo: '', ifsc: '', branch: '' }), ifsc: e.target.value.toUpperCase() } })}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter IFSC code"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                            <input
                              type="text"
                              value={customerFormData.bankDetails?.branch || ''}
                              onChange={(e) => setCustomerFormData({ ...customerFormData, bankDetails: { ...(customerFormData.bankDetails || { bankName: '', accountNo: '', ifsc: '', branch: '' }), branch: e.target.value } })}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter branch name"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Alice (Alias) Field */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alice
                      </label>
                      <input
                        type="text"
                        value={customerFormData.alice || ''}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, alice: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Enter ${entityLabelLower} alias/short name`}
                      />
                    </div>
                  </div>

                  {/* Right: Addresses */}
                  <div className="w-1/2 p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">Addresses</h3>
                        <button
                          type="button"
                          onClick={addAddress}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          Add Address
                        </button>
                      </div>

                      {/* Scrollable container for address list */}
                      <div className="max-h-[850px] overflow-y-auto pr-1 space-y-2">
                        {customerFormData.addresses.map((address, index) => (
                          <div
                            key={address.id}
                            className="border rounded px-3 pb-3 pt-2 bg-white flex justify-between"
                          >
                            <div className='flex-1'>
                              <div className="flex justify-between my-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Address {index + 1} *{' '}
                                  {address.isPrimary && <span className="text-xs text-blue-600">(Primary)</span>}
                                </label>
                                {!address.isPrimary && (
                                  <button
                                    type="button"
                                    onClick={() => setPrimaryAddress(address.id)}
                                    className="px-2 py-1 mb-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                                  >
                                    Set as Primary
                                  </button>
                                )}
                              </div>
                              <textarea
                                value={address.address}
                                onChange={(e) => updateAddress(address.id, 'address', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                placeholder="Enter full address"
                              />
                              {/* Registration Status per address */}
                              <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Status *</label>
                                <select
                                  value={address.registrationStatus}
                                  onChange={(e) => updateAddress(address.id, 'registrationStatus', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm bg-white"
                                >
                                  <option value="registered">Registered</option>
                                  <option value="non_registered">Non Registered</option>
                                </select>
                              </div>
                              {/* GST Number per address */}
                              <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  GST Number
                                </label>
                                <input
                                  type="text"
                                  value={address.gstNumber || ''}
                                  onChange={(e) => updateAddress(address.id, 'gstNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                  placeholder="GST Number"
                                  maxLength={15}
                                />
                                {address.registrationStatus === 'registered' && (!address.gstNumber || !address.gstNumber.trim()) && (
                                  <p className="text-red-500 text-xs mt-1">GST Number is required for Registered status</p>
                                )}
                                {Array.isArray(formErrors.gst) && formErrors.gst[index] && (
                                  <p className="text-red-500 text-xs mt-1 pt-2">{formErrors.gst[index]}</p>
                                )}
                              </div>
                              {/* Per-address contact details */}
                              <div className="grid grid-cols-1 gap-2 mt-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                  <input
                                    type="text"
                                    value={address.contactPersonName || ''}
                                    onChange={(e) => updateAddress(address.id, 'contactPersonName', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Contact person"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                  <input
                                    type="text"
                                    value={address.designation || ''}
                                    onChange={(e) => updateAddress(address.id, 'designation', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Designation"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                  <input
                                    type="email"
                                    value={address.email || ''}
                                    onChange={(e) => updateAddress(address.id, 'email', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Email"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                  <input
                                    type="text"
                                    value={address.phone || ''}
                                    onChange={(e) => updateAddress(address.id, 'phone', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Phone"
                                  />
                                </div>
                              </div>
                              {/* New fields for state, district, pincode */}
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    State *
                                  </label>
                                  <input
                                    type="text"
                                    value={address.state}
                                    onChange={(e) => updateAddress(address.id, 'state', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="State"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    District *
                                  </label>
                                  <input
                                    type="text"
                                    value={address.district}
                                    onChange={(e) => updateAddress(address.id, 'district', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="District"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Pincode *
                                  </label>
                                  <input
                                    type="text"
                                    value={address.pincode}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                      updateAddress(address.id, 'pincode', value);
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Pincode"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                  />
                                </div>
                              </div>
                              {Array.isArray(formErrors.address) && formErrors.address[index] && (
                                <p className="text-red-500 text-xs mt-1 pt-2">{formErrors.address[index]}</p>
                              )}
                            </div>
                            <div className="flex gap-2 ps-2 mt-10 mb-8">
                              {customerFormData.addresses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeAddress(address.id)}
                                  className="text-red-500 rounded text-xs"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* DG Details Section - Only show for DG Customers */}
                  {customerTypeTab === 'customer' && (
                    <div className="w-full border-t border-gray-200 p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">DG Technical Details</h3>
                        <span className="text-sm text-gray-600">Service Team Information</span>
                      </div>
                      
                      {/* DG Details Management */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            DG Details ({customerFormData.dgDetails?.length || 0})
                          </label>
                          <button
                            type="button"
                            onClick={addDGDetails}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                          >
                            Add DG Details
                          </button>
                        </div>
                        
                        {/* Number of DG - Auto-calculated field */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of DG
                          </label>
                          <input
                            type="number"
                            value={customerFormData.dgDetails?.length || 0}
                            disabled
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                            placeholder="Auto-calculated based on DG details"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            This field is automatically calculated based on the number of DG details added above.
                          </p>
                        </div>
                        
                        <div className="space-y-4 max-h-[850px] overflow-y-auto">
                          {customerFormData.dgDetails?.map((dgDetail, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-gray-700">DG Details #{index + 1}</h4>
                                {customerFormData.dgDetails!.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeDGDetails(index)}
                                    className="px-2 py-1 text-red-500 hover:text-red-700 text-sm"
                                    title="Remove DG Details"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                {/* DG Serial Number */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DG Serial Number *
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.dgSerialNumbers}
                                    onChange={(e) => updateDGDetails(index, 'dgSerialNumbers', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., DG001"
                                  />
                                </div>

                                {/* DG Make */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DG Make *
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.dgMake}
                                    onChange={(e) => updateDGDetails(index, 'dgMake', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Cummins, Kirloskar"
                                  />
                                </div>

                                {/* DG Model */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DG Model *
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.dgModel}
                                    onChange={(e) => updateDGDetails(index, 'dgModel', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., C1100D5"
                                  />
                                </div>

                                {/* DG Rating KVA */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DG Rating (KVA) *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={dgDetail.dgRatingKVA}
                                    onChange={(e) => updateDGDetails(index, 'dgRatingKVA', parseFloat(e.target.value))}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., 1000"
                                  />
                                </div>

                                {/* Alternator Make */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Alternator Make
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.alternatorMake}
                                    onChange={(e) => updateDGDetails(index, 'alternatorMake', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Stamford, Leroy Somer"
                                  />
                                </div>

                                {/* Alternator Serial Number */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Alternator Serial Number
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.alternatorSerialNumber}
                                    onChange={(e) => updateDGDetails(index, 'alternatorSerialNumber', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., ALT001"
                                  />
                                </div>

                                {/* Engine Serial Number */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Engine Serial Number *
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.engineSerialNumber}
                                    onChange={(e) => updateDGDetails(index, 'engineSerialNumber', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., ENG001"
                                  />
                                </div>

                                {/* Sales Dealer Name */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sales Dealer Name
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.salesDealerName}
                                    onChange={(e) => updateDGDetails(index, 'salesDealerName', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., ABC Motors"
                                  />
                                </div>

                                {/* Commissioning Date */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Commissioning Date *
                                  </label>
                                  <input
                                    type="date"
                                    value={dgDetail.commissioningDate}
                                    onChange={(e) => updateDGDetails(index, 'commissioningDate', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>

                                {/* Warranty Status */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Warranty Status * 
                                  </label>
                                  <div className="relative">
                                    <select
                                      value={dgDetail.warrantyStatus}
                                      onChange={(e) => updateDGDetails(index, 'warrantyStatus', e.target.value)}
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                      title="Automatically determined: Warranty if commissioned within 2 years, Non-Warranty if older than 2 years"
                                    >
                                      <option value="warranty">Warranty</option>
                                      <option value="non_warranty">Non-Warranty</option>
                                    </select>
                                  </div>
                                </div>


                                {/* Cluster */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Service Cluster *
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.cluster}
                                    onChange={(e) => updateDGDetails(index, 'cluster', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., North Zone, South Zone"
                                  />
                                </div>
                                
                                {/* Warranty Start Date */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Warranty Start Date
                                  </label>
                                  <input
                                    type="date"
                                    value={dgDetail.warrantyStartDate || dgDetail.commissioningDate || ''}
                                    onChange={(e) => updateDGDetails(index, 'warrantyStartDate', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Defaults to commissioning date if not specified
                                  </p>
                                </div>
                                
                                {/* Warranty End Date */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Warranty End Date
                                  </label>
                                  <input
                                    type="date"
                                    value={(() => {
                                      if (dgDetail.warrantyEndDate) {
                                        return dgDetail.warrantyEndDate;
                                      }
                                      const startDate = dgDetail.warrantyStartDate || dgDetail.commissioningDate;
                                      if (startDate && dgDetail.dgRatingKVA > 0) {
                                        return calculateWarrantyEndDate(startDate, dgDetail.dgRatingKVA);
                                      }
                                      return '';
                                    })()}
                                    disabled
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Auto-calculated based on start date and KVA ({dgDetail.dgRatingKVA > 0 ? `${calculateWarrantyPeriod(dgDetail.dgRatingKVA)} months` : 'Enter KVA first'})
                                  </p>
                                </div>
                                {/* DG Location (Address) */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DG Location (Address) *
                                  </label>
                                  <select
                                    value={(dgDetail as any).locationAddress || ''}
                                    onChange={(e) => {
                                      const selectedText = e.target.value;
                                      updateDGDetails(index, 'locationAddress' as any, selectedText);
                                    }}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                  >
                                    <option value="" disabled>Select address</option>
                                    {customerFormData.addresses.map(a => (
                                      <option key={a.id} value={a.address}>{a.address ? a.address.slice(0, 80) : `Address #${a.id}`}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Fixed Footer */}
            <div className="flex space-x-4 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetCustomerForm();
                  setShowAssignedToDropdown(false);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitCustomer}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium shadow-sm"
              >
                {customerTypeTab === 'customer' ? (submitting ? 'Creating...' : 'Create Customer') : 
                 customerTypeTab === 'supplier' ? (submitting ? 'Creating...' : 'Create Supplier') : 
                 customerTypeTab === 'dg_customer' ? (submitting ? 'Creating...' : 'Create DG Customer') :
                 (submitting ? 'Creating...' : 'Create OEM Customer')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl m-4 h-[95vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Edit {
                  customerTypeTab === 'customer' ? 'Customer' : 
                  customerTypeTab === 'supplier' ? 'Supplier' : 
                  customerTypeTab === 'dg_customer' ? 'DG Customer' :
                  'OEM Customer'
                }</h2>
                <p className="text-sm text-gray-600 mt-1">{`Update ${entityLabelLower} information and details`}</p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetCustomerForm();
                  setFormErrors({});
                  setShowAssignedToDropdown(false);
                }}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              <form onSubmit={(e) => { e.preventDefault(); handleUpdateCustomer(); }}>
                {formErrors.general && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 mx-6 mt-6">
                    <p className="text-red-600 text-sm">{formErrors.general}</p>
                  </div>
                )}
                <div className="flex flex-1">
                  {/* Left: Main Fields */}
                  <div className="w-1/2 border-r border-gray-200 flex flex-col p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                    </div>
                    <div>
                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={customerFormData.name}
                          onChange={(e) => setCustomerFormData({ ...customerFormData, name: e.target.value })}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Enter name"
                        />
                        {formErrors.name && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email
                        </label>
                        <input
                          type="email"
                          value={customerFormData.email}
                          onChange={(e) => setCustomerFormData({ ...customerFormData, email: e.target.value })}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.email ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Enter email address"
                        />
                        {/* {formErrors.email && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                        )} */}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={customerFormData.phone}
                          onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter phone number (optional)"
                        />
                      </div>
                    </div>
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          PAN Number
                        </label>
                        <input
                          type="text"
                          value={customerFormData.panNumber || ''}
                          onChange={e => setCustomerFormData({ ...customerFormData, panNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
                          className={`w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500${formErrors.panNumber ? ' border-red-500' : ''}`}
                          placeholder="Enter PAN number"
                          maxLength={10}
                        />
                        {formErrors.panNumber && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.panNumber}</p>
                        )}
                      </div>

                    <div className='mt-4'>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={customerFormData.notes}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, notes: e.target.value })}
                        rows={3}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Additional notes"
                      />
                    </div>

                    {/* Supplier Bank Details - only for Suppliers */}
                    {customerTypeTab === 'supplier' && (
                      <div className="mt-4">
                        <h4 className="text-md font-semibold text-gray-800 mb-2">Bank Details</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                            <input
                              type="text"
                              value={customerFormData.bankDetails?.bankName || ''}
                              onChange={(e) => setCustomerFormData({ ...customerFormData, bankDetails: { ...(customerFormData.bankDetails || { bankName: '', accountNo: '', ifsc: '', branch: '' }), bankName: e.target.value } })}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter bank name"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                            <input
                              type="text"
                              value={customerFormData.bankDetails?.accountNo || ''}
                              onChange={(e) => setCustomerFormData({ ...customerFormData, bankDetails: { ...(customerFormData.bankDetails || { bankName: '', accountNo: '', ifsc: '', branch: '' }), accountNo: e.target.value } })}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter account number"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                            <input
                              type="text"
                              value={customerFormData.bankDetails?.ifsc || ''}
                              onChange={(e) => setCustomerFormData({ ...customerFormData, bankDetails: { ...(customerFormData.bankDetails || { bankName: '', accountNo: '', ifsc: '', branch: '' }), ifsc: e.target.value.toUpperCase() } })}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter IFSC code"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                            <input
                              type="text"
                              value={customerFormData.bankDetails?.branch || ''}
                              onChange={(e) => setCustomerFormData({ ...customerFormData, bankDetails: { ...(customerFormData.bankDetails || { bankName: '', accountNo: '', ifsc: '', branch: '' }), branch: e.target.value } })}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Enter branch name"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Alice (Alias) Field */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alice
                      </label>
                      <input
                        type="text"
                        value={customerFormData.alice || ''}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, alice: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={`Enter ${entityLabelLower} alias/short name`}
                      />
                    </div>


                  </div>

                  {/* Right: Addresses */}
                  <div className="w-1/2 p-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">Addresses</h3>
                        <button
                          type="button"
                          onClick={addAddress}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                        >
                          Add Address
                        </button>
                      </div>

                      {/* Scrollable container for address list */}
                      <div className="max-h-[500px] overflow-y-auto pr-1 space-y-2">
                        {customerFormData.addresses.map((address, index) => (
                          <div
                            key={address.id}
                            className="border rounded px-3 pb-3 pt-2 bg-white flex justify-between"
                          >
                            <div className='flex-1'>
                              <div className="flex justify-between my-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Address {index + 1} *{' '}
                                  {address.isPrimary && <span className="text-xs text-blue-600">(Primary)</span>}
                                </label>
                                {!address.isPrimary && (
                                  <button
                                    type="button"
                                    onClick={() => setPrimaryAddress(address.id)}
                                    className="px-2 py-1 mb-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                                  >
                                    Set as Primary
                                  </button>
                                )}
                              </div>
                              <textarea
                                value={address.address}
                                onChange={(e) => updateAddress(address.id, 'address', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                placeholder="Enter full address"
                              />
                              {/* GST Number per address */}
                              <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  GST Number
                                </label>
                                <input
                                  type="text"
                                  value={address.gstNumber || ''}
                                  onChange={(e) => updateAddress(address.id, 'gstNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                  placeholder="GST Number"
                                  maxLength={15}
                                />
                                {Array.isArray(formErrors.gst) && formErrors.gst[index] && (
                                  <p className="text-red-500 text-xs mt-1 pt-2">{formErrors.gst[index]}</p>
                                )}
                              </div>
                              {/* Per-address contact details */}
                              <div className="grid grid-cols-1 gap-2 mt-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                  <input
                                    type="text"
                                    value={address.contactPersonName || ''}
                                    onChange={(e) => updateAddress(address.id, 'contactPersonName', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Contact person"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
                                  <input
                                    type="text"
                                    value={address.designation || ''}
                                    onChange={(e) => updateAddress(address.id, 'designation', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Designation"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                  <input
                                    type="email"
                                    value={address.email || ''}
                                    onChange={(e) => updateAddress(address.id, 'email', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Email"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                  <input
                                    type="text"
                                    value={address.phone || ''}
                                    onChange={(e) => updateAddress(address.id, 'phone', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Phone"
                                  />
                                </div>
                              </div>
                              {/* New fields for state, district, pincode */}
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    State *
                                  </label>
                                  <input
                                    type="text"
                                    value={address.state}
                                    onChange={(e) => updateAddress(address.id, 'state', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="State"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    District *
                                  </label>
                                  <input
                                    type="text"
                                    value={address.district}
                                    onChange={(e) => updateAddress(address.id, 'district', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="District"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Pincode *
                                  </label>
                                  <input
                                    type="text"
                                    value={address.pincode}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                      updateAddress(address.id, 'pincode', value);
                                    }}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Pincode"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                                  />
                                </div>
                              </div>
                              {Array.isArray(formErrors.address) && formErrors.address[index] && (
                                <p className="text-red-500 text-xs mt-1 pt-2">{formErrors.address[index]}</p>
                              )}
                            </div>
                            <div className="flex gap-2 ps-2 mt-10 mb-8">
                              {customerFormData.addresses.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeAddress(address.id)}
                                  className="text-red-500 rounded text-xs"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* DG Details Section - Only show for Customers, not Suppliers */}
                  {customerTypeTab === 'customer' && (
                    <div className="w-full border-t border-gray-200 p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">DG Technical Details</h3>
                        <span className="text-sm text-gray-600">Service Team Information</span>
                      </div>
                      
                      {/* DG Details Management */}
                      <div className="mt-6">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">
                            DG Details ({customerFormData.dgDetails?.length || 0})
                          </label>
                          <button
                            type="button"
                            onClick={addDGDetails}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                          >
                            Add DG Details
                          </button>
                        </div>
                        
                        {/* Number of DG - Auto-calculated field */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of DG
                          </label>
                          <input
                            type="number"
                            value={customerFormData.dgDetails?.length || 0}
                            disabled
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                            placeholder="Auto-calculated based on DG details"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            This field is automatically calculated based on the number of DG details added above.
                          </p>
                        </div>
                        
                        <div className="space-y-4">
                          {customerFormData.dgDetails?.map((dgDetail, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-white">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-medium text-gray-700">DG Details #{index + 1}</h4>
                                {customerFormData.dgDetails!.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeDGDetails(index)}
                                    className="px-2 py-1 text-red-500 hover:text-red-700 text-sm"
                                    title="Remove DG Details"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                {/* DG Serial Number */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DG Serial Number *
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.dgSerialNumbers}
                                    onChange={(e) => updateDGDetails(index, 'dgSerialNumbers', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., DG001"
                                  />
                                </div>

                                {/* DG Make */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DG Make *
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.dgMake}
                                    onChange={(e) => updateDGDetails(index, 'dgMake', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Cummins, Kirloskar"
                                  />
                                </div>

                                {/* DG Model */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DG Model *
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.dgModel}
                                    onChange={(e) => updateDGDetails(index, 'dgModel', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., C1100D5"
                                  />
                                </div>

                                {/* DG Rating KVA */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DG Rating (KVA) *
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={dgDetail.dgRatingKVA}
                                    onChange={(e) => updateDGDetails(index, 'dgRatingKVA', parseFloat(e.target.value))}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., 1000"
                                  />
                                </div>

                                {/* Alternator Make */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Alternator Make
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.alternatorMake}
                                    onChange={(e) => updateDGDetails(index, 'alternatorMake', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., Stamford, Leroy Somer"
                                  />
                                </div>

                                {/* Alternator Serial Number */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Alternator Serial Number
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.alternatorSerialNumber}
                                    onChange={(e) => updateDGDetails(index, 'alternatorSerialNumber', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., ALT001"
                                  />
                                </div>

                                {/* Engine Serial Number */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Engine Serial Number *
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.engineSerialNumber}
                                    onChange={(e) => updateDGDetails(index, 'engineSerialNumber', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., ENG001"
                                  />
                                </div>

                                {/* Sales Dealer Name */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Sales Dealer Name
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.salesDealerName}
                                    onChange={(e) => updateDGDetails(index, 'salesDealerName', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., ABC Motors"
                                  />
                                </div>

                                {/* Commissioning Date */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Commissioning Date *
                                  </label>
                                  <input
                                    type="date"
                                    value={dgDetail.commissioningDate}
                                    onChange={(e) => updateDGDetails(index, 'commissioningDate', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                </div>

                                {/* Warranty Status */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Warranty Status * 
                                    <span className="text-xs text-gray-500 ml-1">(Auto-calculated)</span>
                                  </label>
                                  <div className="relative">
                                    <select
                                      value={dgDetail.warrantyStatus}
                                      onChange={(e) => updateDGDetails(index, 'warrantyStatus', e.target.value)}
                                      className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                                      title="Automatically determined: Warranty if commissioned within 2 years, Non-Warranty if older than 2 years"
                                    >
                                      <option value="warranty">Warranty</option>
                                      <option value="non_warranty">Non-Warranty</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
                                      <span className="text-xs text-blue-600">🔄</span>
                                    </div>
                                  </div>
                                </div>


                                {/* Cluster */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Service Cluster *
                                  </label>
                                  <input
                                    type="text"
                                    value={dgDetail.cluster}
                                    onChange={(e) => updateDGDetails(index, 'cluster', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="e.g., North Zone, South Zone"
                                  />
                                </div>
                                
                                {/* Warranty Start Date */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Warranty Start Date
                                  </label>
                                  <input
                                    type="date"
                                    value={dgDetail.warrantyStartDate || dgDetail.commissioningDate || ''}
                                    onChange={(e) => updateDGDetails(index, 'warrantyStartDate', e.target.value)}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Defaults to commissioning date if not specified
                                  </p>
                                </div>
                                
                                {/* Warranty End Date */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Warranty End Date
                                  </label>
                                  <input
                                    type="date"
                                    value={(() => {
                                      if (dgDetail.warrantyEndDate) {
                                        return dgDetail.warrantyEndDate;
                                      }
                                      const startDate = dgDetail.warrantyStartDate || dgDetail.commissioningDate;
                                      if (startDate && dgDetail.dgRatingKVA > 0) {
                                        return calculateWarrantyEndDate(startDate, dgDetail.dgRatingKVA);
                                      }
                                      return '';
                                    })()}
                                    disabled
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Auto-calculated based on start date and KVA ({dgDetail.dgRatingKVA > 0 ? `${calculateWarrantyPeriod(dgDetail.dgRatingKVA)} months` : 'Enter KVA first'})
                                  </p>
                                </div>
                                
                                {/* DG Location (Address) */}
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    DG Location (Address) *
                                  </label>
                                  <select
                                    value={(dgDetail as any).locationAddress || ''}
                                    onChange={(e) => {
                                      const selectedText = e.target.value;
                                      updateDGDetails(index, 'locationAddress' as any, selectedText);
                                    }}
                                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                  >
                                    <option value="" disabled>Select address</option>
                                    {customerFormData.addresses.map(a => (
                                      <option key={a.id} value={a.address}>{a.address ? a.address.slice(0, 80) : `Address #${a.id}`}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>

            {/* Fixed Footer */}
            <div className="flex space-x-4 p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  resetCustomerForm();
                  setShowAssignedToDropdown(false);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateCustomer}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium shadow-sm"
              >
                {submitting ? 'Updating...' : `Update ${
                  customerTypeTab === 'customer' ? 'Customer' : 
                  customerTypeTab === 'supplier' ? 'Supplier' : 
                  customerTypeTab === 'dg_customer' ? 'DG Customer' :
                  'OEM Customer'
                }`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-semibold text-gray-900">
                  {customerTypeTab === 'oem' ? 
                    (selectedCustomer.companyName || selectedCustomer.name || 'Unnamed OEM') : 
                    (selectedCustomer.name || 'Unnamed Customer')
                  }
                </h2>
                {customerTypeTab === 'oem' ? (
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                    (selectedCustomer.status as any) === 'active' ? 'bg-green-100 text-green-800' :
                    (selectedCustomer.status as any) === 'inactive' ? 'bg-gray-100 text-gray-800' :
                    (selectedCustomer.status as any) === 'blacklisted' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    <span className="ml-1 capitalize">{(selectedCustomer.status as any) || 'active'}</span>
                  </span>
                ) : (
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedCustomer.status)}`}>
                    {getStatusIcon(selectedCustomer.status)}
                    <span className="ml-1 capitalize">{selectedCustomer.status}</span>
                  </span>
                )}
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
              <div className="space-y-6 mb-6">
                {/* Customer Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                    {customerTypeTab === 'oem' ? 'OEM Information' : 
                     customerTypeTab === 'supplier' ? 'Supplier Information' :
                     customerTypeTab === 'dg_customer' ? 'DG Customer Information' :
                     'Customer Information'}
                  </h3>
                  {/* Status Dropdown as Tag - moved here above the grid */}

                  <div className="grid grid-cols-2 gap-4">
                    {customerTypeTab === 'oem' && selectedCustomer.oemCode && (
                      <div>
                        <p className="text-xs text-gray-500">OEM Code</p>
                        <p className="font-medium">{selectedCustomer.oemCode}</p>
                      </div>
                    )}
                    {customerTypeTab === 'oem' && selectedCustomer.companyName && (
                      <div>
                        <p className="text-xs text-gray-500">Company Name</p>
                        <p className="font-medium">{selectedCustomer.companyName}</p>
                      </div>
                    )}
                    {selectedCustomer.type === 'customer' && selectedCustomer.customerId && (
                      <div>
                        <p className="text-xs text-gray-500">{customerTypeTab === 'supplier' ? 'Supplier ID' : (customerTypeTab === 'dg_customer' ? 'DG Customer ID' : 'Customer ID')}</p>
                        <p className="font-medium">{selectedCustomer.customerId}</p>
                      </div>
                    )}

                    {/* Status - Only show for non-suppliers */}
                    {customerTypeTab !== 'supplier' && (
                      customerTypeTab === 'oem' ? (
                        <div>
                          <p className="text-xs text-gray-500">Status</p>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                            (selectedCustomer.status as any) === 'active' ? 'bg-green-100 text-green-800' :
                            (selectedCustomer.status as any) === 'inactive' ? 'bg-gray-100 text-gray-800' :
                            (selectedCustomer.status as any) === 'blacklisted' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            <span className="ml-1 capitalize">{(selectedCustomer.status as any) || 'active'}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="mb-2">
                          <div className="relative dropdown-container inline-block">
                            <button
                              type="button"
                              onClick={() => setShowStatusDropdown((v) => !v)}
                              className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full focus:outline-none transition-colors border cursor-pointer shadow-sm ${getStatusColor(selectedCustomer.status)} ${showStatusDropdown ? 'ring-2 ring-blue-400 border-blue-300' : 'border-transparent'}`}
                            >
                              {getStatusIcon(selectedCustomer.status)}
                              <span className="ml-2 capitalize">{getStatusLabel(selectedCustomer.status)}</span>
                              <ChevronDown className={`w-4 h-4 ml-2 text-gray-400 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showStatusDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white p-2 border border-gray-200 rounded-md shadow-lg z-50 py-1 min-w-[160px] flex flex-col">
                                {statusOptions
                                  .filter(opt => opt.value !== 'all' && opt.value !== selectedCustomer.status)
                                  .map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={async () => {
                                        await handleStatusChange(selectedCustomer._id, option.value as LeadStatus);
                                        setSelectedCustomer(prev => prev ? { ...prev, status: option.value as LeadStatus } : prev);
                                        setShowStatusDropdown(false);
                                      }}
                                      className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full w-full mb-2 focus:outline-none transition-colors border cursor-pointer shadow-sm ${getStatusColor(option.value as LeadStatus)} border-transparent hover:opacity-80 hover:scale-105`}
                                    >
                                      {getStatusIcon(option.value as LeadStatus)}
                                      <span className="ml-2 capitalize">{option.label}</span>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                    {customerTypeTab === 'oem' && selectedCustomer.contactPerson && (
                      <div>
                        <p className="text-xs text-gray-500">Contact Person</p>
                        <p className="font-medium text-sm">{selectedCustomer.contactPerson}</p>
                      </div>
                    )}
                    {customerTypeTab !== 'oem' && (() => {
                      const primary = selectedCustomer.addresses && selectedCustomer.addresses.length > 0
                        ? (selectedCustomer.addresses.find(a => a.isPrimary) || selectedCustomer.addresses[0])
                        : undefined;
                      const designation = (primary && (primary as any).designation) || selectedCustomer.designation;
                      return designation && (
                        <div>
                          <p className="text-xs text-gray-500">Designation</p>
                          <p className="font-medium text-sm">{designation}</p>
                        </div>
                      );
                    })()}
                    {customerTypeTab !== 'oem' && selectedCustomer.contactPersonName && (
                      <div>
                        <p className="text-xs text-gray-500">Contact Person</p>
                        <p className="font-medium text-sm">{selectedCustomer.contactPersonName}</p>
                      </div>
                    )}
                    {selectedCustomer.panNumber && (
                      <div>
                        <p className="text-xs text-gray-500">PAN Number</p>
                        <p className="font-medium text-sm">{selectedCustomer.panNumber}</p>
                      </div>
                    )}
                    {selectedCustomer.gstNumber && (
                      <div>
                        <p className="text-xs text-gray-500">GST Number</p>
                        <p className="font-medium text-sm">{selectedCustomer.gstNumber}</p>
                      </div>
                    )}
                    {selectedCustomer.email && (
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p className="font-medium text-sm">{selectedCustomer.email}</p>
                      </div>
                    )}
                    {selectedCustomer.phone && (
                      <div>
                        <p className="text-xs text-gray-500">Phone</p>
                        <p className="font-medium">{selectedCustomer.phone}</p>
                      </div>
                    )}
                    {selectedCustomer.alice && (
                      <div>
                        <p className="text-xs text-gray-500">Alice (Alias)</p>
                        <p className="font-medium text-sm">{selectedCustomer.alice}</p>
                      </div>
                    )}
                    {selectedCustomer.siteAddress && (
                      <div>
                        <p className="text-xs text-gray-500">Site Address</p>
                        <p className="font-medium text-sm">{selectedCustomer.siteAddress}</p>
                      </div>
                    )}
                    {customerTypeTab === 'customer' && selectedCustomer.numberOfDG && selectedCustomer.numberOfDG > 0 && (
                      <div>
                        <p className="text-xs text-gray-500">Number of DG</p>
                        <p className="font-medium text-sm">{selectedCustomer.numberOfDG}</p>
                      </div>
                    )}
                    {customerTypeTab === 'oem' && selectedCustomer.rating && (
                      <div>
                        <p className="text-xs text-gray-500">Rating</p>
                        <div className="flex items-center">
                          <span className="text-yellow-600 font-medium mr-2">{selectedCustomer.rating}/5</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={`text-lg ${star <= selectedCustomer.rating! ? 'text-yellow-400' : 'text-gray-300'}`}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    {customerTypeTab === 'oem' && selectedCustomer.alternatePhone && (
                      <div>
                        <p className="text-xs text-gray-500">Alternate Phone</p>
                        <p className="font-medium text-sm">{selectedCustomer.alternatePhone}</p>
                      </div>
                    )}
                    {customerTypeTab === 'oem' && selectedCustomer.paymentTerms && (
                      <div>
                        <p className="text-xs text-gray-500">Payment Terms</p>
                        <p className="font-medium text-sm">{selectedCustomer.paymentTerms}</p>
                      </div>
                    )}
                    {customerTypeTab === 'oem' && selectedCustomer.deliveryTerms && (
                      <div>
                        <p className="text-xs text-gray-500">Delivery Terms</p>
                        <p className="font-medium text-sm">{selectedCustomer.deliveryTerms}</p>
                      </div>
                    )}
                    {customerTypeTab === 'oem' && selectedCustomer.warrantyTerms && (
                      <div>
                        <p className="text-xs text-gray-500">Warranty Terms</p>
                        <p className="font-medium text-sm">{selectedCustomer.warrantyTerms}</p>
                      </div>
                    )}
                    {customerTypeTab === 'oem' && selectedCustomer.creditLimit && (
                      <div>
                        <p className="text-xs text-gray-500">Credit Limit</p>
                        <p className="font-medium text-sm">₹{selectedCustomer.creditLimit.toLocaleString()}</p>
                      </div>
                    )}
                    {customerTypeTab === 'oem' && selectedCustomer.creditDays && (
                      <div>
                        <p className="text-xs text-gray-500">Credit Days</p>
                        <p className="font-medium text-sm">{selectedCustomer.creditDays} days</p>
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="font-medium">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="font-medium text-sm">
                                            {customerTypeTab === 'oem' && selectedCustomer.address && typeof selectedCustomer.address === 'object' ? 
                      `${selectedCustomer.address.street}, ${selectedCustomer.address.city}, ${selectedCustomer.address.state} ${selectedCustomer.address.pincode}` :
                      selectedCustomer.addresses && selectedCustomer.addresses.length > 0
                        ? selectedCustomer.addresses.find(addr => addr.isPrimary)?.address || selectedCustomer.addresses[0].address
                        : (typeof selectedCustomer.address === 'string' ? selectedCustomer.address : 'No address provided')
                    }
                      </p>
                    </div>
                  </div>
                  {/* Removed Quick Actions dropdown here */}
                </div>
                {/* Addresses Section */}
                <div className="col-span-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Addresses</h4>
                  {selectedCustomer.addresses && selectedCustomer.addresses.length > 0 ? (
                    <div className="space-y-3">
                      {selectedCustomer.addresses.map((address, index) => (
                        <div key={index} className={`border rounded-lg p-3 ${address.isPrimary ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-gray-700">
                              Address {index + 1}
                            </span>
                            {address.isPrimary && (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm text-gray-900">{address.address}</p>
                            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
                              <span><strong>State:</strong> {address.state}</span>
                              <span><strong>District:</strong> {address.district}</span>
                              <span><strong>Pincode:</strong> {address.pincode}</span>
                            </div>
                            <div className="text-xs text-gray-700 mt-1">
                              <strong>Registration Status:</strong> {address.registrationStatus === 'registered' ? 'Registered' : 'Non Registered'}
                            </div>
                            <div className="text-xs text-gray-700 mt-1">
                              <strong>Contact Person Name:</strong> {address.contactPersonName || '-'}
                            </div>
                            <div className="text-xs text-gray-700 mt-1">
                              <strong>Designation:</strong> {address.designation || '-'}
                            </div>
                            <div className="text-xs text-gray-700 mt-1">
                              <strong>Contact Number:</strong> {address.phone || '-'}
                            </div>
                            <div className="text-xs text-gray-700 mt-1">
                              <strong>Email:</strong> {address.email || '-'}
                            </div>
                            {address.gstNumber && (
                              <div className="text-xs text-gray-700 mt-1">
                                <strong>GST Number:</strong> {address.gstNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                                              <p className="font-medium text-sm">
                          {customerTypeTab === 'oem' && selectedCustomer.address && typeof selectedCustomer.address === 'object' ? 
                            `${selectedCustomer.address.street}, ${selectedCustomer.address.city}, ${selectedCustomer.address.state} ${selectedCustomer.address.pincode}` :
                            (typeof selectedCustomer.address === 'string' ? selectedCustomer.address : 'No address provided')
                          }
                        </p>
                      <p className="text-xs text-gray-400 mt-1">(Legacy address format)</p>
                    </div>
                  )}
                </div>
                {selectedCustomer.notes && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="font-medium text-sm">{selectedCustomer.notes}</p>
                  </div>
                )}
              </div>

              {/* Supplier Bank Details */}
              {selectedCustomer.type === 'supplier' && (selectedCustomer as any).bankDetails && (
                <div className="space-y-6 mb-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Bank Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Bank Name</p>
                        <p className="font-medium text-sm">{(selectedCustomer as any).bankDetails.bankName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Account Number</p>
                        <p className="font-medium text-sm">{(selectedCustomer as any).bankDetails.accountNo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">IFSC Code</p>
                        <p className="font-medium text-sm">{(selectedCustomer as any).bankDetails.ifsc}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Branch</p>
                        <p className="font-medium text-sm">{(selectedCustomer as any).bankDetails.branch}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* OEM Bank Details */}
              {customerTypeTab === 'oem' && selectedCustomer.bankDetails && (
                <div className="space-y-6 mb-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Bank Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Bank Name</p>
                        <p className="font-medium text-sm">{selectedCustomer.bankDetails.bankName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Account Number</p>
                        <p className="font-medium text-sm">{selectedCustomer.bankDetails.accountNo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">IFSC Code</p>
                        <p className="font-medium text-sm">{selectedCustomer.bankDetails.ifsc}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Branch</p>
                        <p className="font-medium text-sm">{selectedCustomer.bankDetails.branch}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* OEM Products */}
              {customerTypeTab === 'oem' && selectedCustomer.products && Array.isArray(selectedCustomer.products) && selectedCustomer.products.length > 0 && (
                <div className="space-y-6 mb-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Products ({selectedCustomer.products.length})</h3>
                    <div className="space-y-3">
                      {selectedCustomer.products.map((product, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500">Model</p>
                              <p className="font-medium text-sm">{product.model}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">KVA</p>
                              <p className="font-medium text-sm">{product.kva}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Phase</p>
                              <p className="font-medium text-sm capitalize">{product.phase}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Fuel Type</p>
                              <p className="font-medium text-sm capitalize">{product.fuelType}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Price</p>
                              <p className="font-medium text-sm">₹{product.price.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Availability</p>
                              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                                product.availability === 'in_stock' ? 'bg-green-100 text-green-800' :
                                product.availability === 'on_order' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {product.availability.replace('_', ' ')}
                              </span>
                            </div>
                            {product.specifications && (
                              <div className="col-span-2">
                                <p className="text-xs text-gray-500">Specifications</p>
                                <p className="font-medium text-sm">{product.specifications}</p>
                              </div>
                            )}
                            {product.leadTime > 0 && (
                              <div>
                                <p className="text-xs text-gray-500">Lead Time</p>
                                <p className="font-medium text-sm">{product.leadTime} days</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DG Details Section - Only show for Customers, not Suppliers */}
              {customerTypeTab === 'customer' && selectedCustomer.dgDetails && Array.isArray(selectedCustomer.dgDetails) && selectedCustomer.dgDetails.length > 0 && (
                <div className="space-y-6 mb-6">
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">DG Technical Details ({selectedCustomer.dgDetails.length})</h3>
                    
                    {selectedCustomer.dgDetails.map((dgDetail, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-3">DG Details #{index + 1}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">DG Serial Number</p>
                            <p className="font-medium text-sm">{dgDetail.dgSerialNumbers}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">DG Make</p>
                            <p className="font-medium text-sm">{dgDetail.dgMake}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">DG Model</p>
                            <p className="font-medium text-sm">{dgDetail.dgModel}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">DG Rating (KVA)</p>
                            <p className="font-medium text-sm">{dgDetail.dgRatingKVA}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Alternator Make</p>
                            <p className="font-medium text-sm">{dgDetail.alternatorMake}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Alternator Serial Number</p>
                            <p className="font-medium text-sm">{dgDetail.alternatorSerialNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Engine Serial Number</p>
                            <p className="font-medium text-sm">{dgDetail.engineSerialNumber}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Sales Dealer Name</p>
                            <p className="font-medium text-sm">{dgDetail.salesDealerName}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Commissioning Date</p>
                            <p className="font-medium text-sm">{new Date(dgDetail.commissioningDate).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Warranty Status</p>
                            <p className="font-medium text-sm capitalize">{dgDetail.warrantyStatus.replace('_', ' ')}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Service Cluster</p>
                            <p className="font-medium text-sm">{dgDetail.cluster}</p>
                          </div>
                                                     <div>
                             <p className="text-xs text-gray-500">Warranty Start Date</p>
                             <p className="font-medium text-sm">{dgDetail.warrantyStartDate ? new Date(dgDetail.warrantyStartDate).toLocaleDateString() : 'N/A'}</p>
                           </div>
                           <div>
                             <p className="text-xs text-gray-500">Warranty End Date</p>
                             <p className="font-medium text-sm">{dgDetail.warrantyEndDate ? new Date(dgDetail.warrantyEndDate).toLocaleDateString() : 'N/A'}</p>
                           </div>
                           <div>
                             <p className="text-xs text-gray-500">DG Location (Address)</p>
                             <p className="font-medium text-sm">{(dgDetail as any).locationAddress || 'N/A'}</p>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact History removed as per requirement */}
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
                <div className="relative dropdown-container">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Type *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowContactTypeDropdown((v) => !v)}
                    className="flex items-center justify-between w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <span className="text-gray-700 truncate mr-1">
                      {getContactTypeLabel(contactFormData.type)}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showContactTypeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showContactTypeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                      {contactTypeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setContactFormData({ ...contactFormData, type: option.value as ContactType });
                            setShowContactTypeDropdown(false);
                          }}
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${contactFormData.type === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
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



      {/* darg n drop native html5*/}
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
                  const statusCustomers = allCustomers.filter(c => c.status === status);
                  const getColumnColor = (s: LeadStatus) => {
                    switch (s) {
                      case 'new': return 'bg-blue-50 border-blue-200';
                      case 'qualified': return 'bg-yellow-50 border-yellow-200';
                      case 'contacted': return 'bg-purple-50 border-purple-200';
                      case 'converted': return 'bg-green-50 border-green-200';
                      case 'lost': return 'bg-red-50 border-red-200';
                    }
                  };

                  const isBeingDraggedOver = dragOverColumn === status;
                  const columnClasses = `rounded-lg border-2 ${getColumnColor(status)} p-4 transition-all duration-200 ${isBeingDraggedOver ? 'border-blue-400 bg-blue-100 shadow-lg' : ''
                    }`;

                  return (
                    <div
                      key={status}
                      className={columnClasses}
                      onDragOver={(e) => handleDragOver(e, status)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, status)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900 capitalize flex items-center">
                          {getStatusIcon(status)}
                          <span className="ml-2">{status}</span>
                        </h3>
                        <span className="text-sm font-medium text-gray-600">
                          {statusCustomers.length}
                        </span>
                      </div>
                      <div className="space-y-2 h-96 overflow-y-auto">
                        {statusCustomers.map((customer) => {
                          const isBeingDragged = draggedCustomer === customer._id;
                          const isUpdatingThis = isUpdating === customer._id;
                          const cardClasses = `bg-white rounded p-3 shadow-sm border cursor-move hover:shadow-md transition-all duration-200 relative ${isBeingDragged ? 'opacity-50 scale-95' : ''
                            } ${isUpdatingThis ? 'opacity-75' : ''}`;

                          return (
                            <div
                              key={customer._id}
                              className={cardClasses}
                              draggable={!isUpdatingThis}
                              onDragStart={(e) => handleDragStart(e, customer._id)}
                              onDragEnd={handleDragEnd}
                            // onClick={() => openDetailsModal(customer)}
                            >
                              {isUpdatingThis && (
                                <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center rounded">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                </div>
                              )}
                              <div className="font-medium text-xs text-gray-900 truncate">
                                {customer.name}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {customer.customerType}
                              </div>
                              {customer.contactHistory.length > 0 && (
                                <div className="text-xs text-blue-600 mt-1">
                                  Last: {customer.contactHistory[customer.contactHistory.length - 1].type}
                                </div>
                              )}
                            </div>
                          );
                        })}
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
                    <p className="text-xl font-bold text-blue-600">{counts.newLeads}</p>
                    <p className="text-xs text-gray-600">New Leads</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-yellow-600">{counts.qualified}</p>
                    <p className="text-xs text-gray-600">Qualified</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-purple-600">{counts.contacted}</p>
                    <p className="text-xs text-gray-600">Contacted</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-green-600">{counts.converted}</p>
                    <p className="text-xs text-gray-600">Converted</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-red-600">{counts.lost}</p>
                    <p className="text-xs text-gray-600">Lost</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {importing && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-4 shadow-lg">
            <RefreshCw className="animate-spin w-8 h-8 text-green-600" />
            <div>
              <span className="text-lg font-semibold text-green-700 block">Importing, please wait...</span>
              <span className="text-base text-gray-700 mt-1 block">{importProgress}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement; 