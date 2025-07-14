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
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import { RootState } from 'store';
import { useSelector } from 'react-redux';
import { Pagination } from 'components/ui/Pagination';
import toast from 'react-hot-toast';


// Customer types matching backend enums
type CustomerType = 'retail' | 'telecom';
type CustomerMainType = 'customer' | 'supplier';
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
  name: string;
  designation?: string;
  contactPersonName?: string;
  gstNumber?: string;
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
  addresses?: Address[];
  type?: CustomerMainType;
}

// Address type
interface Address {
  id: number;
  address: string;
  state: string;
  district: string;
  pincode: string;
  isPrimary: boolean;
}

interface CustomerFormData {
  name: string;
  designation: string;
  contactPersonName: string;
  gstNumber: string;
  email: string;
  phone: string;
  address: string;
  customerType: CustomerType;
  leadSource: string;
  assignedTo: string;
  notes: string;
  addresses: Address[];
  type: CustomerMainType;
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

const CustomerManagement: React.FC = () => {
  const location = useLocation();
  
  // Core state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
    designation: '',
    contactPersonName: '',
    gstNumber: '',
    email: '',
    phone: '',
    address: '',
    customerType: 'retail',
    leadSource: '',
    assignedTo: '',
    notes: '',
    addresses: [{
      id: Date.now(),
      address: '',
      state: '',
      district: '',
      pincode: '',
      isPrimary: true
    }],
    type: 'customer'
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
    // Add more tabs here if needed
  ];
  const [activeTab, setActiveTab] = useState<'customer' | 'supplier'>('customer');

  // Add at the top, after useState imports
  const [customerTypeTab, setCustomerTypeTab] = useState<'customer' | 'supplier'>('customer');

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
      const response = await apiClient.customers.previewImportFromFile(file);
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
    try {
      const response = await apiClient.customers.importFromFile(selectedFile);
      if (response.success) {
        if (response.data.summary.successful > 0) {
          const successMessage = `Successfully imported ${response.data.summary.successful} customers from ${response.data.summary.totalRows} total rows!`;
          setImportMessage({ type: 'success', text: successMessage });
          toast.success(successMessage);
        } else {
          const errorMessage = `Import failed! 0 customers created from ${response.data.summary.totalRows} rows. Errors: ${response.data.errors.join('; ')}`;
          setImportMessage({ type: 'error', text: errorMessage });
          toast.error(errorMessage);
        }
        await fetchCustomers();
      } else {
        const errorMessage = response.data.errors?.[0] || 'Import failed. Please check your file format.';
        setImportMessage({ type: 'error', text: errorMessage });
        toast.error(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to import file. Please try again.';
      setImportMessage({ type: 'error', text: errorMessage });
      toast.error(errorMessage);
    } finally {
      setImporting(false);
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
      isPrimary: false
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
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'create') {
      setShowAddModal(true);
      // Clear the URL parameter
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

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
    let assignedToParam = assignedToFilter;
    if (user?.role === 'hr' && user?.id) {
      assignedToParam = user.id;
      if (assignedToFilter !== user.id) setAssignedToFilter(user.id);
    }
    if (user?.role === 'hr' && !assignedToParam) return;
    const params: any = {
      page: currentPage,
      limit,
      sort,
      search: searchTerm,
      type: customerTypeTab, // always send type
      ...(typeFilter !== 'all' && { customerType: typeFilter }),
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(assignedToParam && { assignedTo: assignedToParam }),
    };
    console.log('Fetching customers with type:', customerTypeTab);
    console.log('Params sent to API:', params);
    try {
      setLoading(true);
      const response = await apiClient.customers.getAll(params);
      console.log('API response data:', response);
      setCounts(response.data.counts);
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
    if (user?.role !== 'hr') {
      fetchUsers();
    }
  }, [user, currentPage, limit, sort, searchTerm, typeFilter, statusFilter, dateFrom, dateTo, assignedToFilter, customerTypeTab]);

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
    const errors: Record<string, string> = {};

    if (!customerFormData.name.trim()) {
      errors.name = 'Customer name is required';
    }
    if (!customerFormData.phone.trim()) {
      errors.phone = 'Phone number is required';
    }
    // Enhanced address validation
    if (!customerFormData.addresses.length) {
      errors.address = 'At least one address is required';
    } else {
      // Check for empty required fields in addresses
      const invalidAddresses = customerFormData.addresses.some(addr =>
        !addr.address.trim() || !addr.state.trim() || !addr.district.trim() || !addr.pincode.trim()
      );
      if (invalidAddresses) {
        errors.address = 'All address fields (address, state, district, pincode) are required';
      }

      const primaryCount = customerFormData.addresses.filter(addr => addr.isPrimary).length;
      if (primaryCount !== 1) {
        errors.address = 'There must be exactly one primary address';
      }

      // Validate pincode for each address
      const invalidPincode = customerFormData.addresses.some(addr => {
        return addr.pincode && !/^\d{6}$/.test(addr.pincode);
      });
      if (invalidPincode) {
        errors.address = 'Pincode must be exactly 6 digits';
      }
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
      const submitData = { ...customerFormData, type: customerTypeTab };
      if (!submitData.assignedTo || submitData.assignedTo.trim() === '') {
        delete (submitData as any).assignedTo;
      }
      const response = await apiClient.customers.create(submitData);
      fetchCustomers();
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
      const submitData = { ...customerFormData };
      if (!submitData.assignedTo || submitData.assignedTo.trim() === '') {
        delete (submitData as any).assignedTo;
      }

      const response = await apiClient.customers.update(editingCustomer._id, submitData);
      // setCustomers(customers.map(c => c._id === editingCustomer._id ? response.data : c));
      fetchCustomers()
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
      fetchCustomers();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };



  const resetCustomerForm = () => {
    setCustomerFormData({
      name: '',
      designation: '',
      contactPersonName: '',
      gstNumber: '',
      email: '',
      phone: '',
      address: '',
      customerType: 'retail',
      leadSource: '',
      assignedTo: '',
      notes: '',
      addresses: [{
        id: Date.now(),
        address: '',
        state: '',
        district: '',
        pincode: '',
        isPrimary: true
      }],
      type: customerTypeTab
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
    setEditingCustomer(customer);
    setCustomerFormData({
      name: customer.name,
      designation: customer.designation || '',
      contactPersonName: customer.contactPersonName || '',
      gstNumber: customer.gstNumber || '',
      email: customer.email || '',
      phone: customer.phone,
      address: customer.address,
      customerType: customer.customerType,
      leadSource: customer.leadSource || '',
      assignedTo: getUserId(customer.assignedTo),
      notes: customer.notes || '',
      addresses: (customer as any).addresses && Array.isArray((customer as any).addresses)
        ? (customer as any).addresses
        : [{
          id: Date.now(),
          address: '',
          state: '',
          district: '',
          pincode: '',
          isPrimary: true
        }],
      type: (customer as any).type || customerTypeTab // <-- ensure type is set
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
      const currentCustomer = customers.find(c => c._id === customerId);
      if (currentCustomer && currentCustomer.status !== newStatus) {
        handleStatusChange(customerId, newStatus);
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
      title: 'Total Customers',
      value: counts.totalCustomers ? counts.totalCustomers.toString() : '0',
      icon: <Users className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'New Leads',
      value: counts.newLeads ? counts.newLeads.toString() : '0',
      icon: <UserPlus className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Qualified',
      value: counts.qualified ? counts.qualified.toString() : '0',
      icon: <Target className="w-6 h-6" />,
      color: 'yellow'
    },
    {
      title: 'Converted',
      value: counts.converted ? counts.converted.toString() : '0',
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
    { value: 'retail', label: 'Retail' },
    { value: 'telecom', label: 'Telecom' },
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

  const getAssignedToLabel = (value: string) => {
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

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      {/* Header */}
      <PageHeader
        title="Lead Management"
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

          {user?.role !== 'hr' &&
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">{customerTypeTab === 'customer' ? 'Add Customer' : 'Add Supplier'}</span>
            </button>
          }
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className={`w-4 h-4 ${importing ? 'animate-pulse' : ''}`} />
            <span className="text-sm">{importing ? 'Importing...' : 'Import Excel'}</span>
          </button>


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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">

          <div>
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

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-600">
                Showing {customers.length} customers
              </span>
            </div>


          </div>

          {/* Tab Navigation inside filter card, right side */}
          {/* <div className="flex space-x-2">
            {tabOptions.map(tab => (
              <button
                key={tab.value}
                className={`px-4 py-2 rounded-lg font-semibold focus:outline-none transition-colors border-b-2 ${activeTab === tab.value ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 bg-gray-100 hover:text-blue-600'}`}
                onClick={() => setActiveTab(tab.value as typeof activeTab)}
              >
                {tab.label}
              </button>
            ))}
          </div> */}




          {/* Insert this above the filters section, after <PageHeader ... /> */}
          <div className="flex space-x-2 mb-4">
            <button
              className={`px-4 py-2 rounded-lg font-semibold focus:outline-none transition-colors border-b-2 ${customerTypeTab === 'customer' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 bg-gray-100 hover:text-blue-600'}`}
              onClick={() => setCustomerTypeTab('customer')}
              type="button"
            >
              Customer
            </button>
            <button
              className={`px-4 py-2 rounded-lg font-semibold focus:outline-none transition-colors border-b-2 ${customerTypeTab === 'supplier' ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 bg-gray-100 hover:text-blue-600'}`}
              onClick={() => setCustomerTypeTab('supplier')}
              type="button"
            >
              Supplier
            </button>
          </div>
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
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Loading customers...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    <div className="text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">{customerTypeTab === 'customer'?"No Customers found":"No Customers found"}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
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
                          {customer.phone || "N/A"}
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
                    <td className="px-4 py-3 whitespace-nowrap">{customer.designation || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {customer.addresses && customer.addresses.length > 0 ? (
                        <span>{customer.addresses[0].address}, {customer.addresses[0].district}, {customer.addresses[0].state}, {customer.addresses[0].pincode}</span>
                      ) : '-'}
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
                        {user?.role !== 'hr' &&
                          <button
                            onClick={() => handleDeleteCustomer(customer._id)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                            title="Delete Customer"
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">New Customers</p>
                      <p className="text-2xl font-bold text-blue-900">{previewData.summary.newCustomers}</p>
                    </div>
                    <Plus className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Existing Customers</p>
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
                    Customers to be Created ({previewData.customersToCreate.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-green-100 text-green-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Phone</th>
                          <th className="px-3 py-2 text-left font-medium">GST</th>
                          <th className="px-3 py-2 text-left font-medium">Contact Person</th>
                          <th className="px-3 py-2 text-left font-medium">Designation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-200">
                        {previewData.customersToCreate.slice(0, 10).map((customer: any, index: number) => (
                          <tr key={index} className="hover:bg-green-50">
                            <td className="px-3 py-2">{customer.name}</td>
                            <td className="px-3 py-2">{customer.phone}</td>
                            <td className="px-3 py-2">{customer.gstNumber}</td>
                            <td className="px-3 py-2">{customer.contactPersonName}</td>
                            <td className="px-3 py-2">{customer.designation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.customersToCreate.length > 10 && (
                      <p className="text-sm text-green-600 mt-2 text-center">
                        ... and {previewData.customersToCreate.length - 10} more customers
                      </p>
                    )}
                  </div>
                </div>
              )}
              {previewData.existingCustomers.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-yellow-900 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Existing Customers ({previewData.existingCustomers.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-yellow-100 text-yellow-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Phone</th>
                          <th className="px-3 py-2 text-left font-medium">GST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-yellow-200">
                        {previewData.existingCustomers.slice(0, 10).map((customer: any, index: number) => (
                          <tr key={index} className="hover:bg-yellow-50">
                            <td className="px-3 py-2">{customer.name}</td>
                            <td className="px-3 py-2">{customer.phone}</td>
                            <td className="px-3 py-2">{customer.gstNumber}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.existingCustomers.length > 10 && (
                      <p className="text-sm text-yellow-600 mt-2 text-center">
                        ... and {previewData.existingCustomers.length - 10} more existing customers
                      </p>
                    )}
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
                    Importing...
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New {customerTypeTab === 'customer' ? 'Customer' : 'Supplier'}</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetCustomerForm();
                  setShowAssignedToDropdown(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSubmitCustomer(); }}>
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}
              <div className="flex flex-1">
                {/* Left: Main Fields */}
                <div className="w-1/2 border-r border-gray-200 flex flex-col p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Customer Name, Type */}
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
                    <div className="relative dropdown-container">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCustomerTypeDropdown((v) => !v)}
                        className="flex items-center justify-between w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <span className="text-gray-700 truncate mr-1">
                          {getTypeLabel(customerFormData.customerType)}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCustomerTypeDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showCustomerTypeDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                          {typeOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setCustomerFormData({ ...customerFormData, customerType: option.value as CustomerType });
                                setShowCustomerTypeDropdown(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${customerFormData.customerType === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {/* Designation, Contact Person */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={customerFormData.designation}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, designation: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter designation"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Person Name
                      </label>
                      <input
                        type="text"
                        value={customerFormData.contactPersonName}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, contactPersonName: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter contact person name"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    {/* GST Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Number
                      </label>
                      <input
                        type="text"
                        value={customerFormData.gstNumber}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, gstNumber: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter gst number"
                      />
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
                      {formErrors.email && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="number"
                        value={customerFormData.phone}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, phone: e.target.value })}
                        className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.phone ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Enter phone number"
                      />
                      {formErrors.phone && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
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
                      <div className="relative dropdown-container">
                        <button
                          disabled={user?.role === 'hr'}
                          type="button"
                          onClick={() => setShowAssignedToDropdown(!showAssignedToDropdown)}
                          className="flex items-center justify-between w-full px-2.5 py-1.5 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <span className="text-gray-700 truncate mr-1">
                            {getAssignedToLabel(customerFormData.assignedTo)}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showAssignedToDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showAssignedToDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomerFormData({ ...customerFormData, assignedTo: '' });
                                setShowAssignedToDropdown(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${!customerFormData.assignedTo ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                            >
                              Unassigned
                            </button>
                            {users.map(user => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  setCustomerFormData({ ...customerFormData, assignedTo: user.id });
                                  setShowAssignedToDropdown(false);
                                }}
                                className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${customerFormData.assignedTo === user.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                  }`}
                              >
                                <div>
                                  <div className="font-medium">{user.fullName || `${user.firstName} ${user.lastName}`}</div>
                                  <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
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
                      placeholder="Additional notes about the customer"
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
                    <div className="max-h-80 overflow-y-auto pr-1 space-y-2">
                      {customerFormData.addresses.map((address, index) => (
                        <div
                          key={address.id}
                          className="border rounded px-3 pb-3 pt-2 bg-white flex justify-between"
                        >
                          <div className='flex-1'>
                            <div className="flex justify-between my-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address * {address.isPrimary && <span className="text-xs text-blue-600">(Primary)</span>}
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
                            {/* New fields for state, district, pincode */}
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <input
                                type="text"
                                value={address.state}
                                onChange={(e) => updateAddress(address.id, 'state', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                placeholder="State *"
                              />
                              <input
                                type="text"
                                value={address.district}
                                onChange={(e) => updateAddress(address.id, 'district', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                placeholder="District *"
                              />
                              <input
                                type="text"
                                value={address.pincode}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                  updateAddress(address.id, 'pincode', value);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                placeholder="Pincode *"
                                pattern="[0-9]{6}"
                                maxLength={6}
                              />
                            </div>
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
                      {formErrors.address && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
              <div className="flex space-x-3 p-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetCustomerForm();
                    setShowAssignedToDropdown(false);
                  }}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit {customerTypeTab === 'customer' ? 'Customer' : 'Supplier'}</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetCustomerForm();
                  setShowAssignedToDropdown(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdateCustomer(); }}>
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}
              <div className="flex flex-1">
                {/* Left: Main Fields */}
                <div className="w-1/2 border-r border-gray-200 flex flex-col p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Customer Name, Type */}
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
                    <div className="relative dropdown-container">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Type *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowCustomerTypeDropdown((v) => !v)}
                        className="flex items-center justify-between w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      >
                        <span className="text-gray-700 truncate mr-1">
                          {getTypeLabel(customerFormData.customerType)}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCustomerTypeDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showCustomerTypeDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                          {typeOptions.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setCustomerFormData({ ...customerFormData, customerType: option.value as CustomerType });
                                setShowCustomerTypeDropdown(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${customerFormData.customerType === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    {/* Designation, Contact Person */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        value={customerFormData.designation}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, designation: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter designation"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Person Name
                      </label>
                      <input
                        type="text"
                        value={customerFormData.contactPersonName}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, contactPersonName: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter contact person name"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    {/* GST Number */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        GST Number
                      </label>
                      <input
                        type="text"
                        value={customerFormData.gstNumber}
                        onChange={(e) => setCustomerFormData({ ...customerFormData, gstNumber: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter gst number"
                      />
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
                        className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.phone ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="Enter phone number"
                      />
                      {formErrors.phone && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
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
                      <div className="relative dropdown-container">
                        <button
                          disabled={user?.role === 'hr'}
                          type="button"
                          onClick={() => setShowAssignedToDropdown(!showAssignedToDropdown)}
                          className="flex items-center justify-between w-full px-2.5 py-1.5 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        >
                          <span className="text-gray-700 truncate mr-1">
                            {getAssignedToLabel(customerFormData.assignedTo)}
                          </span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showAssignedToDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showAssignedToDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomerFormData({ ...customerFormData, assignedTo: '' });
                                setShowAssignedToDropdown(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${!customerFormData.assignedTo ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                            >
                              Unassigned
                            </button>
                            {users.map(user => (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => {
                                  setCustomerFormData({ ...customerFormData, assignedTo: user.id });
                                  setShowAssignedToDropdown(false);
                                }}
                                className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${customerFormData.assignedTo === user.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                  }`}
                              >
                                <div>
                                  <div className="font-medium">{user.fullName || `${user.firstName} ${user.lastName}`}</div>
                                  <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
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
                      placeholder="Additional notes about the customer"
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
                    <div className="max-h-80 overflow-y-auto pr-1 space-y-2">
                      {customerFormData.addresses.map((address, index) => (
                        <div
                          key={address.id}
                          className="border rounded px-3 pb-3 pt-2 bg-white flex justify-between"
                        >
                          <div className='flex-1'>
                            <div className="flex justify-between my-1">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Address * {address.isPrimary && <span className="text-xs text-blue-600">(Primary)</span>}
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
                            {/* New fields for state, district, pincode */}
                            <div className="grid grid-cols-3 gap-2 mt-2">
                              <input
                                type="text"
                                value={address.state}
                                onChange={(e) => updateAddress(address.id, 'state', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                placeholder="State *"
                              />
                              <input
                                type="text"
                                value={address.district}
                                onChange={(e) => updateAddress(address.id, 'district', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                placeholder="District *"
                              />
                              <input
                                type="text"
                                value={address.pincode}
                                onChange={(e) => {
                                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                  updateAddress(address.id, 'pincode', value);
                                }}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                placeholder="Pincode *"
                                pattern="[0-9]{6}"
                                maxLength={6}
                              />
                            </div>
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
                      {formErrors.address && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>
                      )}
                    </div>
                  </div>
                </div>

              </div>
              <div className="flex space-x-3 p-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    resetCustomerForm();
                    setShowAssignedToDropdown(false);
                  }}
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[85vh] overflow-y-auto">
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
              <div className="space-y-6 mb-6">
                {/* Customer Information */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Customer Information</h3>
                  {/* Status Dropdown as Tag - moved here above the grid */}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Customer Type</p>
                      <p className="font-medium capitalize">{selectedCustomer.customerType}</p>
                    </div>
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
                    <div>
                      <p className="text-xs text-gray-500">Lead Source</p>
                      <p className="font-medium">{selectedCustomer.leadSource || 'Direct'}</p>
                    </div>
                    {selectedCustomer.designation && (
                      <div>
                        <p className="text-xs text-gray-500">Designation</p>
                        <p className="font-medium text-sm">{selectedCustomer.designation}</p>
                      </div>
                    )}
                    {selectedCustomer.contactPersonName && (
                      <div>
                        <p className="text-xs text-gray-500">Contact Person</p>
                        <p className="font-medium text-sm">{selectedCustomer.contactPersonName}</p>
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
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium">{selectedCustomer.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Assigned To</p>
                      <p className="font-medium">{getUserName(selectedCustomer.assignedTo) || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Created</p>
                      <p className="font-medium">{new Date(selectedCustomer.createdAt).toLocaleDateString()}</p>
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
                        <div key={address.id || index} className={`border rounded-lg p-3 ${address.isPrimary ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
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
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">
                      <p className="font-medium text-sm">{selectedCustomer.address}</p>
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

              {/* Contact History */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Contact History</h3>
                  <button
                    onClick={() => {
                      openContactModal(selectedCustomer);
                      setShowDetailsModal(false);
                    }}
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
                                {customer.customerType} • {customer.leadSource || 'Direct'}
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

      {/* Sales Pipeline Modal */}
      {/* {showPipelineModal && (
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
      )} */}
    </div>
  );
};

export default CustomerManagement; 