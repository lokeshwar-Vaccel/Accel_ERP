import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Edit,
  Calendar,
  Filter,
  X,
  Package,
  Users,
  TrendingUp,
  ChevronDown,
  Send,
  CreditCard,
  Ban,
  AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import { Modal } from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { apiClient } from '../utils/api';
import { RootState } from '../redux/store';

// Types
interface Invoice {
  _id: string;
  invoiceNumber: string;
  customer: {
    _id: string;
    name: string;
    email: string;
    phone: string;
  };
  issueDate: string;
  dueDate: string;
  externalInvoiceNumber: string;
  externalInvoiceTotal: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
  invoiceType: 'sale' | 'service' | 'amc' | 'other';
  items: InvoiceItem[];
}

interface InvoiceItem {
  product: string; // Use string for product id in form state
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  // totalPrice and taxAmount are calculated, not needed in form state
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  category: string;
  brand: string;
}

interface StockLocationData {
  _id: string;
  name: string;
  address: string;
  type: string;
  contactPerson?: string;
  phone?: string;
  isActive: boolean;
}

interface InvoiceStats {
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
}

interface NewInvoiceItem {
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

interface NewInvoice {
  customer: string;
  dueDate: string;
  invoiceType: 'sale' | 'service' | 'amc' | 'other';
  location: string;
  notes: string;
  items: NewInvoiceItem[];
  discountAmount: number;
  externalInvoiceNumber: string;
  externalInvoiceTotal: number;
  reduceStock: boolean;
}

interface StatusUpdate {
  status: string;
  notes: string;
}

interface PaymentUpdate {
  paymentStatus: string;
  paymentMethod: string;
  paymentDate: string;
  paidAmount: number;
  notes: string;
}

const InvoiceManagement: React.FC = () => {
  // Get current user from Redux
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // State management
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocationData[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');

  // Custom dropdown states
  const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
  const [showPaymentFilterDropdown, setShowPaymentFilterDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showInvoiceTypeDropdown, setShowInvoiceTypeDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
  const [showStatusUpdateDropdown, setShowStatusUpdateDropdown] = useState(false);
  const [showPaymentStatusDropdown, setShowPaymentStatusDropdown] = useState(false);
  const [showPaymentMethodDropdown, setShowPaymentMethodDropdown] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Status update states
  const [statusUpdate, setStatusUpdate] = useState<StatusUpdate>({
    status: '',
    notes: ''
  });
  const [paymentUpdate, setPaymentUpdate] = useState<PaymentUpdate>({
    paymentStatus: '',
    paymentMethod: '',
    paymentDate: '',
    paidAmount: 0,
    notes: ''
  });

  console.log("paymentUpdate:",paymentUpdate);
  

  // Form states
  const [newInvoice, setNewInvoice] = useState<NewInvoice>({
    customer: '',
    dueDate: '',
    invoiceType: 'sale',
    location: '',
    notes: '',
    items: [
      {
        product: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 18
      }
    ],
    discountAmount: 0,
    externalInvoiceNumber: '',
    externalInvoiceTotal: 0,
    reduceStock: true
  });

  // Stock validation states
  const [stockValidation, setStockValidation] = useState<Record<number, {
    available: number;
    isValid: boolean;
    message: string;
  }>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});



  const [editMode, setEditMode] = useState(false);

const handleItemEdit = (index: number, field: string, value: any) => {
  if (!selectedInvoice) return;
  const updatedItems = [...selectedInvoice.items];
  updatedItems[index] = { ...updatedItems[index], [field]: value };
  // Recalculate total price for the item
  const item = updatedItems[index] as any;
  const subtotal = item.quantity * item.unitPrice;
  const taxAmount = subtotal * (item.taxRate / 100);
  // Add totalPrice property for calculation
  item.totalPrice = subtotal + taxAmount;
  updatedItems[index] = item;
  setSelectedInvoice({
    ...selectedInvoice,
    items: updatedItems,
    totalAmount: updatedItems.reduce((sum, item: any) => sum + (item.quantity * item.unitPrice + (item.quantity * item.unitPrice * (item.taxRate || 0) / 100)), 0)
  });
};

const recalculateItem = (index: number) => {
  if (!selectedInvoice) return;
  const updatedItems = [...selectedInvoice.items];
  const item = updatedItems[index] as any;
  const subtotal = item.quantity * item.unitPrice;
  const taxAmount = subtotal * (item.taxRate / 100);
  item.totalPrice = subtotal + taxAmount;
  updatedItems[index] = item;
  setSelectedInvoice({
    ...selectedInvoice,
    items: updatedItems,
    totalAmount: updatedItems.reduce((sum, item: any) => sum + (item.quantity * item.unitPrice + (item.quantity * item.unitPrice * (item.taxRate || 0) / 100)), 0)
  });
};

const handleSaveChanges = () => {
  // Save the changes to your backend/state
  setEditMode(false);
  // Add your save logic here
};


  // Initialize data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowStatusFilterDropdown(false);
        setShowPaymentFilterDropdown(false);
        setShowCustomerDropdown(false);
        setShowLocationDropdown(false);
        setShowInvoiceTypeDropdown(false);
        setShowProductDropdowns({});
        setShowStatusUpdateDropdown(false);
        setShowPaymentStatusDropdown(false);
        setShowPaymentMethodDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInvoices(),
        fetchCustomers(),
        fetchProducts(),
        fetchLocations(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await apiClient.invoices.getAll();
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll();
      const responseData = response.data as any;
      const customersData = responseData.customers || responseData || [];
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll();
      const responseData = response.data as any;
      const productsData = responseData.products || responseData || [];
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await apiClient.stock.getLocations();
      let locationsData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          locationsData = response.data;
        } else if ((response.data as any).locations && Array.isArray((response.data as any).locations)) {
          locationsData = (response.data as any).locations;
        }
      }
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.invoices.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleCreateInvoice = () => {
    setNewInvoice({
      customer: '',
      dueDate: '',
      invoiceType: 'sale',
      location: '',
      notes: '',
      items: [
        {
          product: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 18
        }
      ],
      discountAmount: 0,
      reduceStock: true,
      externalInvoiceNumber: '',
      externalInvoiceTotal: 0,
    });
    setStockValidation({});
    setFormErrors({});
    // Reset all dropdown states
    setShowCustomerDropdown(false);
    setShowLocationDropdown(false);
    setShowInvoiceTypeDropdown(false);
    setShowProductDropdowns({});
    setShowCreateModal(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowViewModal(true);
  };

  // Status management functions
  const handleUpdateStatus = (invoice: Invoice, newStatus: string) => {
    setSelectedInvoice(invoice);
    setStatusUpdate({ status: invoice.status, notes: '' }); // Pre-select current status
    setShowStatusUpdateDropdown(false); // Reset dropdown state
    setShowStatusModal(true);
  };

  const handleUpdatePayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    console.log("check---");
    

    // Smart defaults based on current payment status
    let defaultPaymentStatus = 'paid';
    let defaultPaidAmount = invoice.totalAmount;

    if (invoice.paymentStatus === 'pending') {
      defaultPaymentStatus = 'partial';
      defaultPaidAmount = Math.round(invoice.totalAmount * 0.5); // Default to 50% for partial
    } else if (invoice.paymentStatus === 'partial') {
      defaultPaymentStatus = 'paid';
      // For existing partial payments, suggest paying the remaining amount
      const remainingAmount = invoice.remainingAmount || (invoice.totalAmount - (invoice.paidAmount || 0));
      defaultPaidAmount = invoice.totalAmount;
    }

    setPaymentUpdate({
      paymentStatus: defaultPaymentStatus,
      paymentMethod: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paidAmount: defaultPaidAmount,
      notes: ''
    });
    // Reset dropdown states
    setShowPaymentStatusDropdown(false);
    setShowPaymentMethodDropdown(false);
    setShowPaymentModal(true);
  };

  const submitStatusUpdate = async () => {
    if (!selectedInvoice) return;

    setSubmitting(true);
    try {
      await apiClient.invoices.update(selectedInvoice._id, statusUpdate);
      await fetchInvoices();
      await fetchStats();
      setShowStatusModal(false);
      setStatusUpdate({ status: '', notes: '' });
    } catch (error) {
      console.error('Error updating invoice status:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const submitPaymentUpdate = async () => {
    if (!selectedInvoice) return;

    setSubmitting(true);
    try {
      await apiClient.invoices.update(selectedInvoice._id, paymentUpdate);
      await fetchInvoices();
      await fetchStats();
      setShowPaymentModal(false);
      setPaymentUpdate({ paymentStatus: '', paymentMethod: '', paymentDate: '', paidAmount: 0, notes: '' });
    } catch (error) {
      console.error('Error updating payment status:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Quick actions
  const quickSendInvoice = async (invoice: Invoice) => {
    await handleUpdateStatusQuick(invoice._id, 'sent');
  };

  const quickMarkPaid = async (invoice: Invoice) => {
    await handlePaymentUpdateQuick(invoice._id, {
      paymentStatus: 'paid',
      paymentDate: new Date().toISOString(),
      paidAmount: invoice.totalAmount
    });
  };

  const quickCancelInvoice = async (invoice: Invoice) => {
    if (confirm('Are you sure you want to cancel this invoice?')) {
      await handleUpdateStatusQuick(invoice._id, 'cancelled');
    }
  };

  const handleUpdateStatusQuick = async (invoiceId: string, status: string) => {
    try {
      await apiClient.invoices.update(invoiceId, { status });
      await fetchInvoices();
      await fetchStats();
    } catch (error) {
      console.error('Error updating invoice status:', error);
    }
  };

  const handlePaymentUpdateQuick = async (invoiceId: string, paymentData: any) => {
    try {
      await apiClient.invoices.update(invoiceId, paymentData);
      await fetchInvoices();
      await fetchStats();
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  // Get available actions for an invoice
  const getAvailableActions = (invoice: Invoice) => {
    const actions = [];

    // Always available
    actions.push({
      icon: <Eye className="w-4 h-4" />,
      label: 'View',
      action: () => handleViewInvoice(invoice),
      color: 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
    });

    // Edit Status - Available for all invoices except cancelled
    if (invoice.status !== 'cancelled') {
      actions.push({
        icon: <Edit className="w-4 h-4" />,
        label: 'Edit Status',
        action: () => handleUpdateStatus(invoice, invoice.status),
        color: 'text-purple-600 hover:text-purple-900 hover:bg-purple-50'
      });
    }

    // Payment Management - Available for invoices that can have payments
    if (invoice.status !== 'cancelled' && invoice.status !== 'draft') {
      actions.push({
        icon: <DollarSign className="w-4 h-4" />,
        label: 'Update Payment',
        action: () => handleUpdatePayment(invoice),
        color: 'text-green-600 hover:text-green-900 hover:bg-green-50'
      });
    }

    // Quick actions based on status
    if (invoice.status === 'draft') {
      actions.push({
        icon: <Send className="w-4 h-4" />,
        label: 'Quick Send',
        action: () => quickSendInvoice(invoice),
        color: 'text-orange-600 hover:text-orange-900 hover:bg-orange-50'
      });
    }

    if (invoice.status === 'sent' && invoice.paymentStatus === 'pending') {
      actions.push({
        icon: <CheckCircle className="w-4 h-4" />,
        label: 'Quick Paid',
        action: () => quickMarkPaid(invoice),
        color: 'text-green-600 hover:text-green-900 hover:bg-green-50'
      });
    }

    // Cancel option for non-finalized invoices
    if (invoice.status !== 'cancelled' && invoice.paymentStatus !== 'paid') {
      actions.push({
        icon: <X className="w-4 h-4" />,
        label: 'Cancel',
        action: () => quickCancelInvoice(invoice),
        color: 'text-red-600 hover:text-red-900 hover:bg-red-50'
      });
    }

    return actions;
  };

  const addInvoiceItem = () => {
    setNewInvoice(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 18
        }
      ]
    }));
  };

  const removeInvoiceItem = (index: number) => {
    setNewInvoice(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const updateInvoiceItem = (index: number, field: keyof NewInvoiceItem, value: any) => {
    setNewInvoice(prev => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      // Auto-populate price when product is selected
      if (field === 'product') {
        const productObj = products.find(p => p._id === value);
        if (productObj) {
          updatedItems[index].unitPrice = productObj.price;
          updatedItems[index].description = productObj.name;
        }
        // Validate stock when product or quantity changes
        validateStockForItem(index, value, updatedItems[index].quantity);
      }
      // Validate stock when quantity changes
      if (field === 'quantity') {
        validateStockForItem(index, updatedItems[index].product, value);
      }
      return { ...prev, items: updatedItems };
    });
  };

  // Validate stock availability for a specific item
  const validateStockForItem = async (itemIndex: number, productId: string, quantity: number) => {
    if (!productId || !newInvoice.location || quantity <= 0) {
      setStockValidation(prev => ({
        ...prev,
        [itemIndex]: { available: 0, isValid: true, message: '' }
      }));
      return;
    }

    try {
      const response = await apiClient.stock.getStock({
        product: productId,
        location: newInvoice.location
      });

      let stockData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          stockData = response.data;
        } else if (response.data.stockLevels && Array.isArray(response.data.stockLevels)) {
          stockData = response.data.stockLevels;
        }
      }

      const stockItem = stockData.length > 0 ? stockData[0] : null;
      const available = stockItem ? (stockItem.availableQuantity || (stockItem.quantity - (stockItem.reservedQuantity || 0))) : 0;

      const isValid = quantity <= available;
      const message = !isValid
        ? `Only ${available} units available`
        : `${available} units available`;

      setStockValidation(prev => ({
        ...prev,
        [itemIndex]: { available, isValid, message }
      }));
    } catch (error) {
      console.error('Error validating stock:', error);
      setStockValidation(prev => ({
        ...prev,
        [itemIndex]: { available: 0, isValid: false, message: 'Unable to check stock' }
      }));
    }
  };

  // Validate entire form including stock
  const validateInvoiceForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!newInvoice.customer) {
      errors.customer = 'Customer is required';
    }
    if (!newInvoice.dueDate) {
      errors.dueDate = 'Due date is required';
    }
    if (!newInvoice.location) {
      errors.location = 'Location is required';
    }
    if (newInvoice.items.length === 0) {
      errors.items = 'At least one item is required';
    }

    // Validate each item
    newInvoice.items.forEach((item, index) => {
      if (!item.product) {
        errors[`item_${index}_product`] = 'Product is required';
      }
      if (item.quantity <= 0) {
        errors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice < 0) {
        errors[`item_${index}_price`] = 'Price cannot be negative';
      }

      // Check stock validation if stock reduction is enabled
      if (newInvoice.reduceStock && stockValidation[index] && !stockValidation[index].isValid) {
        errors[`item_${index}_stock`] = stockValidation[index].message;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const calculateItemTotal = (item: any) => {
    return item.quantity * item.unitPrice;
  };

  const calculateSubtotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const calculateTotalTax = () => {
    return newInvoice.items.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item);
      return sum + (itemTotal * (item.taxRate || 0) / 100);
    }, 0);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateTotalTax() - (newInvoice.discountAmount || 0);
  };

  const handleSubmitInvoice = async () => {
    if (!validateInvoiceForm()) return;

    setSubmitting(true);
    try {
      const grandTotal = calculateGrandTotal();

      // Calculate totals for remainingAmount
      const totalAmount = Number(isNaN(grandTotal) ? 0 : grandTotal);

      const subtotal = calculateSubtotal();
      const taxAmount = calculateTotalTax();

      // Simple payload - backend controller now provides all required fields
      const invoiceData = {
        customer: newInvoice.customer,
        dueDate: new Date(newInvoice.dueDate).toISOString(),
        invoiceType: newInvoice.invoiceType,
        location: newInvoice.location,
        externalInvoiceNumber: newInvoice.externalInvoiceNumber,
        externalInvoiceTotal: newInvoice.externalInvoiceTotal,
        notes: newInvoice.notes,
        discountAmount: newInvoice.discountAmount || 0,
        reduceStock: newInvoice.reduceStock,
        items: newInvoice.items.map(item => ({
          product: item.product,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate || 0)
        }))
      };

      console.log('Invoice payload (backend fixed):', JSON.stringify(invoiceData, null, 2));

      await apiClient.invoices.create(invoiceData);
      await fetchInvoices();
      await fetchStats();
      setShowCreateModal(false);
      setStockValidation({}); // Clear stock validation
      setFormErrors({}); // Clear form errors
    } catch (error) {
      console.error('Error creating invoice:', error);
      setFormErrors({ general: 'Failed to create invoice. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial':
        return 'bg-orange-100 text-orange-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch =
      invoice?.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || invoice.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesPayment;
  });

  const statCards = [
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      icon: <FileText className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Paid Invoices',
      value: stats.paidInvoices,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'Overdue',
      value: stats.overdueInvoices,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'red'
    },
    {
      title: 'Total Revenue',
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      icon: <DollarSign className="w-6 h-6" />,
      color: 'purple'
    }
  ];

  // Helper functions for dropdown labels
  const getStatusFilterLabel = (value: string) => {
    const options = [
      { value: 'all', label: 'All Status' },
      { value: 'draft', label: 'Draft' },
      { value: 'sent', label: 'Sent' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'cancelled', label: 'Cancelled' }
    ];
    return options.find(opt => opt.value === value)?.label || 'All Status';
  };

  const getPaymentFilterLabel = (value: string) => {
    const options = [
      { value: 'all', label: 'All Payments' },
      { value: 'pending', label: 'Pending' },
      { value: 'partial', label: 'Partial' },
      { value: 'paid', label: 'Paid' },
      { value: 'failed', label: 'Failed' }
    ];
    return options.find(opt => opt.value === value)?.label || 'All Payments';
  };

  const getCustomerLabel = (value: string) => {
    if (!value) return 'Select customer';
    const customer = customers.find(c => c._id === value);
    return customer ? `${customer.name} - ${customer.email}` : 'Select customer';
  };

  const getLocationLabel = (value: string) => {
    if (!value) return 'Select location';
    const location = locations.find(l => l._id === value);
    return location ? `${location.name} - ${location.type.replace('_', ' ')}` : 'Select location';
  };

  const getInvoiceTypeLabel = (value: string) => {
    const options = [
      { value: 'sale', label: 'Sale' },
      { value: 'service', label: 'Service' },
      { value: 'amc', label: 'AMC' },
      { value: 'other', label: 'Other' }
    ];
    return options.find(opt => opt.value === value)?.label || 'Sale';
  };

  const getProductLabel = (value: string) => {
    if (!value) return 'Select product';
    const product = products.find(p => p._id === value);
    return product ? `${product?.name} - ₹${product?.price?.toLocaleString()}` : 'Select product';
  };

  const getStatusUpdateLabel = (value: string) => {
    const options = [
      { value: 'draft', label: 'Draft - Can be edited, not sent to customer' },
      { value: 'sent', label: 'Sent - Sent to customer, awaiting payment' },
      { value: 'paid', label: 'Paid - Payment completed' },
      { value: 'overdue', label: 'Overdue - Past due date, payment pending' },
      { value: 'cancelled', label: 'Cancelled - Invoice cancelled' }
    ];
    return options.find(opt => opt.value === value)?.label || 'Select status';
  };

  const getPaymentStatusLabel = (value: string) => {
    const options = [
      { value: 'pending', label: 'Pending - No payment received' },
      { value: 'partial', label: 'Partial Payment - Some amount paid' },
      { value: 'paid', label: 'Paid in Full - Complete payment' },
      { value: 'failed', label: 'Payment Failed - Transaction failed' }
    ];
    return options.find(opt => opt.value === value)?.label || 'Select payment status';
  };

  const getPaymentMethodLabel = (value: string) => {
    const options = [
      { value: '', label: 'Select payment method' },
      { value: 'cash', label: 'Cash' },
      { value: 'cheque', label: 'Cheque' },
      { value: 'bank_transfer', label: 'Bank Transfer' },
      { value: 'upi', label: 'UPI' },
      { value: 'card', label: 'Credit/Debit Card' },
      { value: 'other', label: 'Other' }
    ];
    return options.find(opt => opt.value === value)?.label || 'Select payment method';
  };

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      <PageHeader
        title="Invoice Management"
        subtitle="Create and manage customer invoices"
      >
        <Button
          onClick={handleCreateInvoice}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span>Create Invoice</span>
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
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
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowStatusFilterDropdown(!showStatusFilterDropdown)}
              className="flex items-center justify-between w-full md:w-40 px-3 py-1.5 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getStatusFilterLabel(statusFilter)}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showStatusFilterDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showStatusFilterDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                {[
                  { value: 'all', label: 'All Status' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'sent', label: 'Sent' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'cancelled', label: 'Cancelled' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value);
                      setShowStatusFilterDropdown(false);
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

          {/* Payment Filter Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => setShowPaymentFilterDropdown(!showPaymentFilterDropdown)}
              className="flex items-center justify-between w-full md:w-40 px-3 py-1.5 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getPaymentFilterLabel(paymentFilter)}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showPaymentFilterDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showPaymentFilterDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                {[
                  { value: 'all', label: 'All Payments' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'paid', label: 'Paid' },
                  { value: 'failed', label: 'Failed' }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setPaymentFilter(option.value);
                      setShowPaymentFilterDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${paymentFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
            Showing {filteredInvoices.length} of {invoices.length} invoices
          </span>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading invoices...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No invoices found</td>
                </tr>
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{invoice.customer?invoice.customer.name:invoice.user?.firstName}</div>
                        <div className="text-xs text-gray-500">{invoice.customer?invoice.customer.email:invoice.user?.email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ₹{invoice.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ₹{(invoice.paidAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ₹{(invoice.remainingAmount || invoice.totalAmount - (invoice.paidAmount || 0)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                        {invoice.paymentStatus.charAt(0).toUpperCase() + invoice.paymentStatus.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {getAvailableActions(invoice).map((action, index) => (
                          <button
                            key={index}
                            onClick={action.action}
                            className={`${action.color} p-1 rounded transition-colors`}
                            title={action.label}
                          >
                            {action.icon}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create New Invoice</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Form Errors */}
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              {/* Customer and Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer *
                  </label>
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                      className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.customer ? 'border-red-500' : 'border-gray-300'
                        } hover:border-gray-400`}
                    >
                      <span className="text-gray-700 truncate mr-1">{getCustomerLabel(newInvoice.customer)}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showCustomerDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            setNewInvoice({ ...newInvoice, customer: '' });
                            setShowCustomerDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!newInvoice.customer ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          Select customer
                        </button>
                        {customers.map(customer => (
                          <button
                            key={customer._id}
                            onClick={() => {
                              setNewInvoice({ ...newInvoice, customer: customer._id });
                              setShowCustomerDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${newInvoice.customer === customer._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                          >
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-gray-500">{customer.email}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {formErrors.customer && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.customer}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location *
                  </label>
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                      className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.location ? 'border-red-500' : 'border-gray-300'
                        } hover:border-gray-400`}
                    >
                      <span className="text-gray-700 truncate mr-1">{getLocationLabel(newInvoice.location)}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showLocationDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showLocationDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            setNewInvoice({ ...newInvoice, location: '' });
                            setShowLocationDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!newInvoice.location ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          Select location
                        </button>
                        {locations.map((location) => (
                          <button
                            key={location._id}
                            onClick={() => {
                              setNewInvoice({ ...newInvoice, location: location._id });
                              setShowLocationDropdown(false);
                              // Re-validate all items when location changes
                              newInvoice.items.forEach((item, index) => {
                                if (item.product) {
                                  validateStockForItem(index, item.product, item.quantity);
                                }
                              });
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${newInvoice.location === location._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                          >
                            <div>
                              <div className="font-medium">{location.name}</div>
                              <div className="text-xs text-gray-500 capitalize">{location.type.replace('_', ' ')}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {formErrors.location && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.dueDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                    required
                  />
                  {formErrors.dueDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.dueDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Type
                  </label>
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => setShowInvoiceTypeDropdown(!showInvoiceTypeDropdown)}
                      className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400"
                    >
                      <span className="text-gray-700 truncate mr-1">{getInvoiceTypeLabel(newInvoice.invoiceType)}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showInvoiceTypeDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showInvoiceTypeDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                        {[
                          { value: 'sale', label: 'Sale' },
                          { value: 'service', label: 'Service' },
                          { value: 'amc', label: 'AMC' },
                          { value: 'other', label: 'Other' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setNewInvoice({ ...newInvoice, invoiceType: option.value as 'sale' | 'service' | 'amc' | 'other' });
                              setShowInvoiceTypeDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${newInvoice.invoiceType === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stock Reduction Option */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={newInvoice.reduceStock}
                    onChange={(e) => setNewInvoice({ ...newInvoice, reduceStock: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-blue-900">Reduce inventory stock</div>
                    <div className="text-xs text-blue-700">Automatically reduce stock quantities when invoice is created</div>
                  </div>
                </label>
              </div>

              {/* Invoice Items */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
                  <button
                    onClick={addInvoiceItem}
                    type="button"
                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-1"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {newInvoice.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product
                          </label>
                          <div className="relative dropdown-container">
                            <button
                              onClick={() => setShowProductDropdowns({
                                ...showProductDropdowns,
                                [index]: !showProductDropdowns[index]
                              })}
                              className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors[`item_${index}_product`] ? 'border-red-500' : 'border-gray-300'
                                } hover:border-gray-400`}
                            >
                              <span className="text-gray-700 truncate mr-1">{getProductLabel(item.product)}</span>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showProductDropdowns[index] ? 'rotate-180' : ''}`} />
                            </button>
                            {showProductDropdowns[index] && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                                <button
                                  onClick={() => {
                                    updateInvoiceItem(index, 'product', '');
                                    setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                  }}
                                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!item.product ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                    }`}
                                >
                                  Select product
                                </button>
                                {products.map(product => (
                                  <button
                                    key={product._id}
                                    onClick={() => {
                                      updateInvoiceItem(index, 'product', product._id);
                                      setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                    }}
                                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${item.product === product._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                      }`}
                                  >
                                    <div>
                                      <div className="font-medium">{product?.name}</div>
                                      <div className="text-xs text-gray-500">₹{product?.price?.toLocaleString()} • {product?.category}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {formErrors[`item_${index}_product`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_product`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value) || 1)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`item_${index}_quantity`] || formErrors[`item_${index}_stock`] ? 'border-red-500' :
                              stockValidation[index] && !stockValidation[index].isValid ? 'border-red-500' : 'border-gray-300'
                              }`}
                          />
                          {formErrors[`item_${index}_quantity`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_quantity`]}</p>
                          )}
                          {formErrors[`item_${index}_stock`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_stock`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit Price (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                              }`}
                          />
                          {formErrors[`item_${index}_price`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_price`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tax (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.taxRate}
                            onChange={(e) => updateInvoiceItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div className="flex items-end">
                          <div className="w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium">
                              ₹{calculateItemTotal(item).toLocaleString()}
                            </div>
                          </div>
                          {newInvoice.items.length > 1 && (
                            <button
                              onClick={() => removeInvoiceItem(index)}
                              type="button"
                              className="ml-2 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Stock Status Display */}
                      {newInvoice.reduceStock && newInvoice.location && item.product && (
                        <div className={`mt-3 p-3 rounded-lg border ${stockValidation[index]
                          ? stockValidation[index].isValid
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                          : 'bg-gray-50 border-gray-200'
                          }`}>
                          <div className="flex items-center space-x-2 text-sm">
                            <Package className="w-4 h-4" />
                            <span className="font-medium">Stock Status:</span>
                            {stockValidation[index] ? (
                              <span className={stockValidation[index].isValid ? 'text-green-700' : 'text-red-700'}>
                                {stockValidation[index].message}
                              </span>
                            ) : (
                              <span className="text-gray-500">Checking...</span>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Item description"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={newInvoice.notes}
                  onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Additional notes or terms..."
                />
              </div>

              {/* Totals */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between">

                  <div className=''>
                    <div className="flex items-center space-x-2 mb-4">
                      {/* <DollarSign className="w-5 h-5 text-gray-600" /> */}
                      <h3 className="text-lg font-semibold text-gray-900">External Invoice details</h3>
                    </div>
                    <div className='flex gap-4'>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          External Invoice No
                        </label>
                        <input
                          type="text"
                          value={newInvoice.externalInvoiceNumber}
                          onChange={(e) => setNewInvoice({ ...newInvoice, externalInvoiceNumber: e.target.value })}
                         className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.externalInvoiceNumber ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="External Invoice No"
                        />
                        {formErrors.externalInvoiceNumber && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.externalInvoiceNumber}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          External Invoice Total
                        </label>
                        <input
                          type="text"
                          value={newInvoice.externalInvoiceTotal}
                          onChange={(e) => setNewInvoice({ ...newInvoice, externalInvoiceTotal: Number(e.target.value) })}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.externalInvoiceTotal ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="External Invoice Total"
                        />
                        {formErrors.externalInvoiceTotal && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.externalInvoiceTotal}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="w-80 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{calculateSubtotal().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Tax:</span>
                      <span className="font-medium">₹{calculateTotalTax().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-gray-600">Discount:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newInvoice.discountAmount}
                          onChange={(e) => setNewInvoice({ ...newInvoice, discountAmount: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-3">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">₹{calculateGrandTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {newInvoice.items.length} item(s) • Total: ₹{calculateGrandTotal().toLocaleString()}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitInvoice}
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Create Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
{showViewModal && selectedInvoice && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Invoice {selectedInvoice.invoiceNumber}</h2>
        <button
          onClick={() => setShowViewModal(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Invoice Header */}
        <div className="border-b border-gray-200 pb-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Invoice #{selectedInvoice.invoiceNumber}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Issue Date: {new Date(selectedInvoice.issueDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-600">
                Due Date: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <div className="flex space-x-2 mb-2">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                  {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                </span>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(selectedInvoice.paymentStatus)}`}>
                  {selectedInvoice.paymentStatus.charAt(0).toUpperCase() + selectedInvoice.paymentStatus.slice(1)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Bill To:</h4>
          <div className="text-sm text-gray-600">
            <p className="font-medium">{selectedInvoice.customer?selectedInvoice.customer.name:selectedInvoice.user?.firstName}</p>
            <p>{selectedInvoice.customer?selectedInvoice.customer.email:selectedInvoice.user?.email}</p>
            <p>{selectedInvoice.customer?selectedInvoice.customer.phone:""}</p>
          </div>
        </div>

        {/* Total Amount Mismatch Warning */}
        {selectedInvoice.totalAmount !== selectedInvoice.externalInvoiceTotal && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-yellow-800">Amount Mismatch Detected</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  Calculated Total: ₹{selectedInvoice?.totalAmount?.toLocaleString()} | 
                  External Total: ₹{selectedInvoice?.externalInvoiceTotal?.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setEditMode(true)}
                className="ml-3 bg-yellow-600 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-700"
              >
                Edit Items
              </button>
            </div>
          </div>
        )}

        {/* Invoice Items */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Items:</h4>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  {editMode && selectedInvoice.totalAmount !== selectedInvoice.externalInvoiceTotal && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedInvoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {editMode && selectedInvoice.totalAmount !== selectedInvoice.externalInvoiceTotal ? (
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemEdit(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                        />
                      ) : (
                        `₹${item.unitPrice.toLocaleString()}`
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {editMode && selectedInvoice.totalAmount !== selectedInvoice.externalInvoiceTotal ? (
                        <input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => handleItemEdit(index, 'taxRate', parseFloat(e.target.value) || 0)}
                          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          step="0.01"
                          min="0"
                          max="100"
                        />
                      ) : (
                        `${item.taxRate}%`
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">₹{(item.quantity * item.unitPrice + (item.quantity * item.unitPrice * (item.taxRate || 0) / 100)).toLocaleString()}</td>
                    {editMode && selectedInvoice.totalAmount !== selectedInvoice.externalInvoiceTotal && (
                      <td className="px-4 py-2 text-sm">
                        <button
                          onClick={() => recalculateItem(index)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Recalc
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Mode Actions */}
        {editMode && selectedInvoice.totalAmount !== selectedInvoice.externalInvoiceTotal && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <p>Make adjustments to unit prices and tax rates to match the external total.</p>
                <p className="font-medium mt-1">Target Total: ₹{selectedInvoice?.externalInvoiceTotal?.toLocaleString()}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setEditMode(false)}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Total */}
       <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2 text-right">
              {/* Brief Details */}
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{selectedInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tax:</span>
                  <span>₹{selectedInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate / 100), 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Items Count:</span>
                  <span>{selectedInvoice.items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Quantity:</span>
                  <span>{selectedInvoice.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className={selectedInvoice.totalAmount !== selectedInvoice.externalInvoiceTotal ? 'text-red-600' : 'text-gray-900'}>
                     ₹{selectedInvoice.totalAmount.toLocaleString()}
                  </span>
                </div>
                {selectedInvoice.totalAmount !== selectedInvoice.externalInvoiceTotal && (
                  <div className="flex justify-between text-sm text-gray-600 mt-1">
                    <span>External Total:</span>
                    <span>₹{selectedInvoice?.externalInvoiceTotal?.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Status Update Modal */}
      {showStatusModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Update Invoice Status</h2>
              <button
                onClick={() => setShowStatusModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">
                  Invoice: <span className="font-medium text-gray-900">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-xs text-gray-500">Current Status:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedInvoice.status)}`}>
                      {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Payment:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(selectedInvoice.paymentStatus)}`}>
                      {selectedInvoice.paymentStatus.charAt(0).toUpperCase() + selectedInvoice.paymentStatus.slice(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Change Status To
                </label>
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setShowStatusUpdateDropdown(!showStatusUpdateDropdown)}
                    className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400"
                  >
                    <span className="text-gray-700 truncate mr-1">{getStatusUpdateLabel(statusUpdate.status)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showStatusUpdateDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showStatusUpdateDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                      {[
                        { value: 'draft', label: 'Draft - Can be edited, not sent to customer' },
                        { value: 'sent', label: 'Sent - Sent to customer, awaiting payment' },
                        { value: 'paid', label: 'Paid - Payment completed' },
                        { value: 'overdue', label: 'Overdue - Past due date, payment pending' },
                        { value: 'cancelled', label: 'Cancelled - Invoice cancelled' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setStatusUpdate({ ...statusUpdate, status: option.value });
                            setShowStatusUpdateDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${statusUpdate.status === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status change guidance */}
                {statusUpdate.status !== selectedInvoice.status && (
                  <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="text-sm text-blue-800">
                      <strong>Status Change:</strong> {selectedInvoice.status} → {statusUpdate.status}
                      {statusUpdate.status === 'cancelled' && (
                        <div className="mt-1 text-red-600">Warning: Cancelled invoices cannot be changed back.</div>
                      )}
                      {statusUpdate.status === 'draft' && selectedInvoice.status !== 'draft' && (
                        <div className="mt-1 text-orange-600">Note: Moving back to draft will allow editing again.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes <span className="text-gray-500">(Optional)</span>
                </label>
                <textarea
                  value={statusUpdate.notes}
                  onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Add notes about this status change..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitStatusUpdate}
                  disabled={!statusUpdate.status || submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Update Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Update Payment</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Invoice Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-3">
                  Invoice: <span className="font-medium text-gray-900">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Total Amount:</span>
                    <div className="text-lg font-bold text-gray-900">₹{selectedInvoice.totalAmount.toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Already Paid:</span>
                    <div className="text-lg font-bold text-green-600">₹{(selectedInvoice.paidAmount || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Remaining:</span>
                    <div className="text-lg font-bold text-red-600">₹{(selectedInvoice.remainingAmount || selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toLocaleString()}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Payment Status:</span>
                  <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(selectedInvoice.paymentStatus)}`}>
                    {selectedInvoice.paymentStatus.charAt(0).toUpperCase() + selectedInvoice.paymentStatus.slice(1)}
                  </span>
                </div>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedInvoice.paymentStatus === 'partial' ? 'Additional Payment Amount (₹) *' : 'Payment Amount (₹) *'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={selectedInvoice.remainingAmount}
                  step="1"
                  value={paymentUpdate.paidAmount}
                  onChange={(e) => {
                    const amount = parseFloat(e.target.value) || 0;
                    setPaymentUpdate({
                      ...paymentUpdate,
                      paidAmount: amount,
                      // Auto-update payment status based on amount
                      paymentStatus: amount >= selectedInvoice.totalAmount ? 'paid' : amount > 0 ? 'partial' : 'pending'
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={selectedInvoice.paymentStatus === 'partial' ? 'Enter additional payment amount' : 'Enter payment amount'}
                />
                <div className="mt-2 flex justify-between text-sm">
                  {selectedInvoice.paymentStatus === 'partial' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setPaymentUpdate({
                          ...paymentUpdate,
                          paidAmount: (selectedInvoice.paidAmount || 0) + Math.round((selectedInvoice.remainingAmount || selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)) * 0.5),
                          paymentStatus: 'partial'
                        })}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Half Remaining (₹{Math.round(((selectedInvoice.remainingAmount || selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)) * 0.5)).toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentUpdate({
                          ...paymentUpdate,
                          paidAmount: selectedInvoice.totalAmount,
                          paymentStatus: 'paid'
                        })}
                        className="text-green-600 hover:text-green-800"
                      >
                        Pay Full Remaining (₹{(selectedInvoice.remainingAmount || selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toLocaleString()})
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setPaymentUpdate({
                          ...paymentUpdate,
                          paidAmount: Math.round(selectedInvoice.totalAmount * 0.5),
                          paymentStatus: 'partial'
                        })}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        50% (₹{Math.round(selectedInvoice.totalAmount * 0.5).toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentUpdate({
                          ...paymentUpdate,
                          paidAmount: selectedInvoice.totalAmount,
                          paymentStatus: 'paid'
                        })}
                        className="text-green-600 hover:text-green-800"
                      >
                        Full Amount (₹{selectedInvoice.totalAmount.toLocaleString()})
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Balance Calculation */}
              {paymentUpdate.paidAmount > 0 && paymentUpdate.paidAmount < selectedInvoice.totalAmount && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="text-sm text-yellow-800">
                    <div className="font-medium">Payment Summary:</div>
                    <div className="mt-2 space-y-1">
                      {selectedInvoice.paymentStatus === 'partial' && (
                        <div className="flex justify-between">
                          <span>Previously Paid:</span>
                          <span className="font-medium">₹{(selectedInvoice.paidAmount || 0).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>New Total Paid:</span>
                        <span className="font-medium">₹{paymentUpdate.paidAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining Balance:</span>
                        <span className="font-medium text-red-600">₹{(selectedInvoice.totalAmount - paymentUpdate.paidAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Payment Confirmation */}
              {paymentUpdate.paidAmount >= selectedInvoice.totalAmount && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm text-green-800">
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      <span className="font-medium">Full Payment - Invoice will be marked as PAID</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status
                </label>
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setShowPaymentStatusDropdown(!showPaymentStatusDropdown)}
                    className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400"
                  >
                    <span className="text-gray-700 truncate mr-1">{getPaymentStatusLabel(paymentUpdate.paymentStatus)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showPaymentStatusDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showPaymentStatusDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                      {[
                        { value: 'pending', label: 'Pending - No payment received' },
                        { value: 'partial', label: 'Partial Payment - Some amount paid' },
                        { value: 'paid', label: 'Paid in Full - Complete payment' },
                        { value: 'failed', label: 'Payment Failed - Transaction failed' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setPaymentUpdate({ ...paymentUpdate, paymentStatus: option.value });
                            setShowPaymentStatusDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${paymentUpdate.paymentStatus === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setShowPaymentMethodDropdown(!showPaymentMethodDropdown)}
                    className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400"
                  >
                    <span className="text-gray-700 truncate mr-1">{getPaymentMethodLabel(paymentUpdate.paymentMethod)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showPaymentMethodDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showPaymentMethodDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                      {[
                        { value: '', label: 'Select payment method' },
                        { value: 'cash', label: 'Cash' },
                        { value: 'cheque', label: 'Cheque' },
                        { value: 'bank_transfer', label: 'Bank Transfer' },
                        { value: 'upi', label: 'UPI' },
                        { value: 'card', label: 'Credit/Debit Card' },
                        { value: 'other', label: 'Other' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setPaymentUpdate({ ...paymentUpdate, paymentMethod: option.value });
                            setShowPaymentMethodDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${paymentUpdate.paymentMethod === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentUpdate.paymentDate}
                  onChange={(e) => setPaymentUpdate({ ...paymentUpdate, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Notes
                </label>
                <textarea
                  value={paymentUpdate.notes}
                  onChange={(e) => setPaymentUpdate({ ...paymentUpdate, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Transaction ID, reference number, or other payment details..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPaymentUpdate}
                  disabled={!paymentUpdate.paymentStatus || paymentUpdate.paidAmount < 0 || submitting}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceManagement; 