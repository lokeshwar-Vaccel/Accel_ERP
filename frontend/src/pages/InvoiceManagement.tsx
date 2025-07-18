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
  AlertCircle,
  XCircle,
  TrendingDown
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import { Modal } from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { apiClient } from '../utils/api';
import { RootState } from '../redux/store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { Pagination } from 'components/ui/Pagination';
import apiClientQuotation from '../utils/api';
import QuotationForm from '../components/QuotationForm';


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
  user?: {
    firstName?: string;
    email?: string;
  };
  issueDate: string;
  dueDate: string;
  supplierName: string;
  supplierEmail: string;
  externalInvoiceNumber: string;
  externalInvoiceTotal: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
  invoiceType: 'quotation' | 'sale' | 'purchase' | 'challan';
  items: InvoiceItem[];
  referenceNo?: string;
  referenceDate?: string;
  buyersOrderNo?: string;
  buyersOrderDate?: string;
  dispatchDocNo?: string;
  deliveryNoteDate?: string;
  dispatchedThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
  sellerGSTIN?: string;
  sellerState?: string;
  sellerStateCode?: string;
  buyerGSTIN?: string;
  buyerState?: string;
  buyerStateCode?: string;
  pan?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIFSC?: string;
  bankBranch?: string;
  declaration?: string;
  signature?: string;
}

interface InvoiceItem {
  product: string; // Use string for product id in form state
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  // totalPrice and taxAmount are calculated, not needed in form state
  hsnSac?: string;
  gstRate?: number;
  partNo?: string;
  uom?: string;
  discount?: number;
  location?: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  addresses?: Array<{
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
  }>;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  category: string;
  brand: string;
  gst?: number;
  partNo?: string;
  hsnNumber?: string;
  uom?: string;
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
  taxRate?: number;
  hsnSac?: string;
  gstRate?: number;
  partNo?: string;
  uom?: string;
  discount?: number;
  location?: string;
  gst?: number;
  hsnNumber?: string;
}

interface NewInvoice {
  customer: string;
  address?: string;
  dueDate: string;
  invoiceType: 'quotation' | 'sale' | 'purchase' | 'challan';
  location: string;
  notes: string;
  items: NewInvoiceItem[];
  discountAmount: number;
  externalInvoiceNumber: string;
  externalInvoiceTotal: number;
  reduceStock: boolean;
  referenceNo?: string;
  referenceDate?: string;
  buyersOrderNo?: string;
  buyersOrderDate?: string;
  dispatchDocNo?: string;
  deliveryNoteDate?: string;
  dispatchedThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
  sellerGSTIN?: string;
  sellerState?: string;
  sellerStateCode?: string;
  buyerGSTIN?: string;
  buyerState?: string;
  buyerStateCode?: string;
  pan?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIFSC?: string;
  bankBranch?: string;
  declaration?: string;
  signature?: string;
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
  useRazorpay?: boolean;
  razorpayOrderId?: string;
  paymentId?: string;
}

// Helper to safely format numbers
function safeToFixed(val: any, digits = 2) {
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num) || num === null || num === undefined) return '0.00';
  return num.toFixed(digits);
}

const INVOICE_TYPES = [
  { value: 'quotation', label: 'Quotation', icon: <FileText /> },
  { value: 'sale', label: 'Sales Invoice', icon: <TrendingUp /> },
  { value: 'purchase', label: 'Purchase Invoice', icon: <TrendingDown /> },
  { value: 'challan', label: 'Delivery Challan', icon: <Package /> },
];

const InvoiceManagement: React.FC = () => {
  // Get current user from Redux
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // State management
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocationData[]>([]);
  const [generalSettings, setGeneralSettings] = useState<any>(null);
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
  const [quotations, setQuotations] = useState<any[]>([]);
  const [quotationLoading, setQuotationLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDatas, setTotalDatas] = useState(0);
  const [sort, setSort] = useState('-createdAt');

  console.log("invoices111111111111111:", invoices);


  // Custom dropdown states
  const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
  const [showPaymentFilterDropdown, setShowPaymentFilterDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
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
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [invoiceType, setInvoiceType] = useState<'quotation' | 'sale' | 'purchase' | 'challan'>('sale');

  console.log("invoiceType-------:", invoiceType);


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
    notes: '',
    useRazorpay: false
  });

  // Form states
  const [newInvoice, setNewInvoice] = useState<NewInvoice>({
    customer: '',
    dueDate: '',
    invoiceType: 'sale',
    location: '',
    address: '',
    notes: '',
    items: [
      {
        product: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0,
        gstRate: 0,
        partNo: '',
        hsnSac: '',
        uom: 'pcs',
        discount: 0
      }
    ],
    discountAmount: 0,
    externalInvoiceNumber: '',
    externalInvoiceTotal: 0,
    reduceStock: true,
    referenceNo: '',
    referenceDate: '',
    pan: '',
    bankName: '',
    bankAccountNo: '',
    bankIFSC: '',
    bankBranch: '',
    declaration: '',
  });

  console.log("newInvoice:", newInvoice);


  // Stock validation states
  const [stockValidation, setStockValidation] = useState<Record<number, {
    available: number;
    isValid: boolean;
    message: string;
  }>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});



  const [editMode, setEditMode] = useState(false);
  const [editModeChanges, setEditModeChanges] = useState(true);
  const [originalInvoiceData, setOriginalInvoiceData] = useState<any>(null);
  const [savingChanges, setSavingChanges] = useState(false);



  // Add search state for product dropdowns
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});

  // Add search state for UOM dropdowns
  const [uomSearchTerms, setUomSearchTerms] = useState<Record<number, string>>({});
  const [showUomDropdowns, setShowUomDropdowns] = useState<Record<number, boolean>>({});

  // Quotation-specific state
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [showQuotationViewModal, setShowQuotationViewModal] = useState(false);

  console.log("selectedQuotation:", selectedQuotation);
  

  // Filter products based on search term
  const getFilteredProducts = (searchTerm: string = '') => {
    console.log('getFilteredProducts called with:', { searchTerm, totalProducts: products.length, products: products.slice(0, 3) });

    if (!searchTerm.trim()) {
      console.log('No search term, returning all products:', products.length);
      return products;
    }

    const term = searchTerm.toLowerCase();
    const filtered = products.filter(product => {
      const nameMatch = product.name?.toLowerCase().includes(term);
      const categoryMatch = product.category?.toLowerCase().includes(term);
      const brandMatch = product.brand?.toLowerCase().includes(term);
      return nameMatch || categoryMatch || brandMatch;
    });

    console.log('Filtered products:', { term, filtered: filtered.length, results: filtered.slice(0, 3) });
    return filtered;
  };

  // Update product search term
  const updateProductSearchTerm = (itemIndex: number, searchTerm: string) => {
    setProductSearchTerms(prev => ({
      ...prev,
      [itemIndex]: searchTerm
    }));
  };

  // UOM options
  const UOM_OPTIONS = [
    'pcs', 'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos'
  ];

  // Filter UOM based on search term
  const getFilteredUomOptions = (searchTerm: string = '') => {
    if (!searchTerm.trim()) return UOM_OPTIONS;
    const term = searchTerm.toLowerCase();
    return UOM_OPTIONS.filter(uom => uom.toLowerCase().includes(term));
  };

  // Update UOM search term
  const updateUomSearchTerm = (itemIndex: number, searchTerm: string) => {
    setUomSearchTerms(prev => ({
      ...prev,
      [itemIndex]: searchTerm
    }));
  };

  const handleItemEdit = (index: number, field: string, value: any) => {
    if (!selectedInvoice) return;
    const updatedItems = [...selectedInvoice.items];
    let parsedValue = value;
    if (field === 'unitPrice' || field === 'taxRate') {
      parsedValue = parseFloat(value);
      if (isNaN(parsedValue)) parsedValue = 0;
    }
    updatedItems[index] = { ...updatedItems[index], [field]: parsedValue };
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
      totalAmount: updatedItems.reduce((sum, item: any) => (sum + (item.quantity * item.unitPrice + (item.quantity * item.unitPrice * (item.taxRate || 0) / 100))), 0)
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };


  const calculateAdjustedTaxRate = (unitPrice: number, quantity: number, targetTotal: number): number => {
    if (unitPrice === 0 || quantity === 0) return 0;
    const base = unitPrice * quantity;
    const tax = targetTotal - base;
    const taxRate = (tax / base) * 100;
    return Math.max(0, parseFloat(taxRate.toFixed(2)));
  };

  const autoAdjustTaxRates = () => {
    const items = selectedInvoice.items ?? [];
    const targetTotal = selectedInvoice.externalInvoiceTotal ?? 0;

    const subtotal = items.reduce(
      (sum: number, item: any) => sum + ((item.unitPrice ?? 0) * (item.quantity ?? 0)),
      0
    );

    const adjustedItems = items.map((item: any) => {
      const quantity = item.quantity ?? 0;
      const unitPrice = item.unitPrice ?? 0;

      if (quantity === 0 || unitPrice === 0) {
        return item; // Leave the item as-is if not applicable
      }

      const base = unitPrice * quantity;
      const share = subtotal > 0 ? base / subtotal : 0;
      const targetItemTotal = share * targetTotal;

      const adjustedTaxRateRaw = calculateAdjustedTaxRate(unitPrice, quantity, targetItemTotal);
      const adjustedTaxRate = Math.min(100, adjustedTaxRateRaw); // Limit to 100%

      let taxAmount = parseFloat(((base * adjustedTaxRate) / 100).toFixed(2));
      const totalPrice = parseFloat((base + taxAmount).toFixed(2));

      return {
        ...item,
        taxRate: adjustedTaxRate,
        taxAmount,
        totalPrice,
      };
    });

    const taxAmount = adjustedItems.reduce((sum: number, item: any) => sum + (item.taxAmount ?? 0), 0);
    const totalAmount = adjustedItems.reduce((sum: number, item: any) => sum + (item.totalPrice ?? 0), 0);

    setSelectedInvoice((prev: any) => ({
      ...prev,
      items: adjustedItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      remainingAmount: parseFloat(((totalAmount - (prev.paidAmount ?? 0))).toFixed(2)),
    }));
  };


  const autoAdjustUnitPrice = () => {
    const items = selectedInvoice.items ?? [];
    const targetTotal = selectedInvoice.externalInvoiceTotal ?? 0;

    const currentTotal = items.reduce((sum: number, item: any) => {
      const quantity = item.quantity ?? 0;
      const unitPrice = item.unitPrice ?? 0;
      const taxRate = item.taxRate ?? 0;
      const base = unitPrice * quantity;
      const tax = (base * taxRate) / 100;
      return sum + base + tax;
    }, 0);

    const adjustedItems = items.map((item: any) => {
      const quantity = item.quantity ?? 0;
      const taxRate = item.taxRate ?? 0;

      if (quantity === 0) {
        return item; // Skip adjustment for zero quantity
      }

      const itemBase = (item.unitPrice ?? 0) * quantity;
      const itemShare = currentTotal > 0 ? (itemBase + (itemBase * taxRate) / 100) / currentTotal : 0;
      const targetItemTotal = itemShare * targetTotal;

      const adjustedUnitPrice = parseFloat(((targetItemTotal / quantity) / (1 + taxRate / 100)).toFixed(2));
      const basePrice = adjustedUnitPrice * quantity;
      const taxAmount = parseFloat(((basePrice * taxRate) / 100).toFixed(2));
      const totalPrice = parseFloat((basePrice + taxAmount).toFixed(2));

      return {
        ...item,
        unitPrice: adjustedUnitPrice,
        taxAmount,
        totalPrice,
      };
    });

    const subtotal = adjustedItems.reduce((sum: number, item: any) => sum + ((item.unitPrice ?? 0) * (item.quantity ?? 0)), 0);
    const taxAmount = adjustedItems.reduce((sum: number, item: any) => sum + (item.taxAmount ?? 0), 0);
    const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));
    const paidAmount = selectedInvoice.paidAmount ?? 0;
    const remainingAmount = parseFloat((totalAmount - paidAmount).toFixed(2));

    setSelectedInvoice((prev: any) => ({
      ...prev,
      items: adjustedItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalAmount,
      remainingAmount,
    }));
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

  console.log("selectedInvoice3344:", selectedInvoice);
  const handleSaveChanges = async () => {
    setSavingChanges(true);
    try {
      if (!selectedInvoice) return;

      console.log("selectedInvoice33:", selectedInvoice);

      const payload = {
        products: selectedInvoice.items.map((item: any) => ({
          product: item.product?._id || item.product, // Handles populated or plain ID
          price: item.unitPrice,
          gst: item.taxRate,
        })),
      };

      const res = await apiClient.invoices.priceUpdate(selectedInvoice._id, payload);

      if (res.success) {
        // Update the selected invoice with new data
        const updatedInvoice = { ...selectedInvoice };

        // Update items with new prices and recalculate totals
        updatedInvoice.items = updatedInvoice.items.map((item: any, index: number) => {
          const updatedItem = { ...item };
          if (res.data && res.data.products && res.data.products[index]) {
            updatedItem.unitPrice = res.data.products[index].price;
            updatedItem.taxRate = res.data.products[index].gst;
          }
          return updatedItem;
        });

        // Recalculate total amount
        updatedInvoice.totalAmount = updatedInvoice.items.reduce((sum: number, item: any) => {
          const subtotal = item.quantity * item.unitPrice;
          const taxAmount = subtotal * (item.taxRate / 100);
          return sum + subtotal + taxAmount;
        }, 0);

        // Update remaining amount
        updatedInvoice.remainingAmount = updatedInvoice.totalAmount - (updatedInvoice.paidAmount || 0);

        // Update the selected invoice state
        // setSelectedInvoice(updatedInvoice);

        // Update the invoice in the main invoices list
        setInvoices(prevInvoices =>
          prevInvoices.map(invoice =>
            invoice._id === selectedInvoice._id ? updatedInvoice : invoice
          )
        );

        // Update stats
        await fetchStats();

        toast.success('Invoice updated successfully!');
      } else {
        throw new Error('Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice items:', error);
      toast.error('Failed to update invoice. Please try again.');
    } finally {
      setEditMode(false);
      setSavingChanges(false);
    }
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
        fetchStats(),
        fetchGeneralSettings()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    const params: any = {
      page: currentPage,
      limit,
      sort,
      search: searchTerm,
      ...(paymentFilter !== 'all' && { paymentStatus: paymentFilter }),
      ...(statusFilter !== 'all' && { status: statusFilter }),
      ...(invoiceType && { invoiceType }),
    };

    try {
      const response = await apiClient.invoices.getAll(params);
      console.log("response555:", response);

      if (response.data.pagination) {
        setCurrentPage(response.data.pagination.page);
        setLimit(response.data.pagination.limit);
        setTotalDatas(response.data.pagination.total);
        setTotalPages(response.data.pagination.pages);
      }
      setInvoices(response.data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
    }
  };

  useEffect(() => {
    if (invoiceType === 'quotation') {
      fetchQuotations();
    } else {
      fetchInvoices();
    }
  }, [currentPage, limit, sort, searchTerm, statusFilter, paymentFilter, invoiceType]);

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll({});
      const responseData = response.data as any;
      const customersData = responseData.customers || responseData || [];
      setCustomers(customersData);
      setAddresses(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchQuotations = async () => {
    setQuotationLoading(true);
    try {
      const response = await apiClientQuotation.quotations.getAll({
        page: currentPage,
        limit,
        sort,
        search: searchTerm,
      });

      const responseData = response.data as any;
      console.log("responseData123:", response);
      
      let quotationsData = [];
      if (responseData.pagination) {
        quotationsData = responseData.quotations || [];
        setCurrentPage(responseData.pagination.page);
        setLimit(responseData.pagination.limit);
        setTotalDatas(responseData.pagination.total);
        setTotalPages(responseData.pagination.pages);
      } else {
        quotationsData = responseData || [];
      }

      // Resolve address IDs to actual address text for existing quotations
      const resolvedQuotations = quotationsData.map((quotation: any) => {
        if (quotation.customer && quotation.customer.address) {
          // Check if the address is an ID (numeric string)
          if (!isNaN(parseInt(quotation.customer.address))) {
            // Find the customer to get their addresses
            const customer = customers.find(c => c._id === quotation.customer._id);
            if (customer && customer.addresses) {
              const addressId = parseInt(quotation.customer.address);
              const address = customer.addresses.find((a: any) => a.id === addressId);
              if (address) {
                // Update the quotation with the actual address text
                return {
                  ...quotation,
                  customer: {
                    ...quotation.customer,
                    address: address.address,
                    state: address.state,
                    district: address.district,
                    pincode: address.pincode,
                    addressId: address.id
                  }
                };
              }
            }
          }
        }
        return quotation;
      });

      setQuotations(resolvedQuotations);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      setQuotations([]);
    } finally {
      setQuotationLoading(false);
    }
  };

  const fetchProducts = async () => {
    console.log('🚀 Starting to fetch inventory items...');
    try {
      // Fetch from inventory/stock API instead of products API
      console.log('📡 Making API call to stock.getStock() for all inventory items...');
      const response = await apiClient.stock.getStock({ limit: 10000, page: 1 });
      console.log('✅ Full inventory response received:', response);

      const responseData = response.data as any;
      console.log('📦 Response data structure:', responseData);

      // Extract stock levels which contain product information
      let productsData = [];
      if (responseData.stockLevels && Array.isArray(responseData.stockLevels)) {
        console.log('📋 Data found in responseData.stockLevels');
        // Map stock levels to product format for the dropdown
        productsData = responseData.stockLevels.map((stock: any) => ({
          _id: stock.product?._id || stock.productId,
          name: stock.product?.name || stock.productName || 'Unknown Product',
          price: stock.product?.price || 0,
          gst: stock.product?.gst || 0,
          hsnNumber: stock.product?.hsnNumber || '',
          partNo: stock.product?.partNo || '',
          uom: stock.product?.uom ,
          category: stock.product?.category || 'N/A',
          brand: stock.product?.brand || 'N/A',
          availableQuantity: stock.availableQuantity || 0,
          // Include original stock data for reference
          stockData: stock
        }));
      } else if (Array.isArray(responseData)) {
        console.log('📋 Data is directly an array');
        productsData = responseData;
      } else {
        console.warn('⚠️ Unexpected response structure:', responseData);
        console.log('📊 Available keys:', Object.keys(responseData || {}));
        productsData = [];
      }

      setProducts(productsData);
      console.log(`✨ Successfully set ${productsData.length} inventory items for dropdown`);
      if (productsData.length > 0) {
        console.log('🔍 Sample inventory item:', productsData[0]);
      }
    } catch (error) {
      console.error('❌ Error fetching inventory:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
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

  const fetchGeneralSettings = async () => {
    try {
      const response = await apiClient.generalSettings.getAll();
      console.log("response=============:", response);
      if (response.success && response.data && response.data.companies && response.data.companies.length > 0) {
        // Get the first company settings (assuming single company setup)
        const companySettings = response.data.companies[0];

        setGeneralSettings(companySettings);

        // Auto-populate default values in newInvoice if it exists
        if (newInvoice) {
          console.log("companySettings11:", companySettings);
          setNewInvoice(prev => ({
            ...prev,
            pan: companySettings.companyPan || prev.pan,
            bankName: companySettings.companyBankDetails?.bankName || prev.bankName,
            bankAccountNo: companySettings.companyBankDetails?.accNo || prev.bankAccountNo,
            bankIFSC: companySettings.companyBankDetails?.ifscCode || prev.bankIFSC,
            bankBranch: companySettings.companyBankDetails?.branch || prev.bankBranch
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching general settings:', error);
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
          taxRate: 0,
          gstRate: 0,
          partNo: '',
          hsnSac: '',
          uom: 'pcs',
          discount: 0
        }
      ],
      discountAmount: 0,
      reduceStock: true,
      externalInvoiceNumber: '',
      externalInvoiceTotal: 0,
      referenceNo: '',
      referenceDate: '',
      buyersOrderNo: '',
      buyersOrderDate: '',
      dispatchDocNo: '',
      deliveryNoteDate: '',
      dispatchedThrough: '',
      destination: '',
      termsOfDelivery: '',
      sellerGSTIN: '',
      sellerState: '',
      sellerStateCode: '',
      buyerGSTIN: '',
      buyerState: '',
      buyerStateCode: '',
      pan: generalSettings?.companyPan || '',
      bankName: generalSettings?.companyBankDetails?.bankName || '',
      bankAccountNo: generalSettings?.companyBankDetails?.accNo || '',
      bankIFSC: generalSettings?.companyBankDetails?.ifscCode || '',
      bankBranch: generalSettings?.companyBankDetails?.branch || '',
      declaration: '',
      signature: ''
    });
    setStockValidation({});
    setFormErrors({});
    // Reset all dropdown states
    setShowCustomerDropdown(false);
    setShowLocationDropdown(false);
    setShowInvoiceTypeDropdown(false);
    setShowProductDropdowns({});
    setShowUomDropdowns({});
    setUomSearchTerms({});
    setShowCreateModal(true);
  };

  const handleViewInvoice = (invoice: Invoice) => {
    console.log("invoice12:", invoice);

    setSelectedInvoice(invoice);
    setOriginalInvoiceData(JSON.parse(JSON.stringify(invoice))); // Deep copy for backup
    setShowViewModal(true);
  };

  // Quotation handlers
  const handleCreateQuotation = () => {
    setSelectedQuotation(null);
    setModalMode('create');
    setShowQuotationForm(true);
  };

  const handleViewQuotation = (quotation: any) => {
    console.log("quotation123:", quotation);
    setSelectedQuotation(quotation);
    setShowQuotationViewModal(true);
  };

  const handleEditQuotation = (quotation: any) => {
    setSelectedQuotation(quotation);
    setModalMode('edit');
    setShowQuotationForm(true);
  };

  const handleDeleteQuotation = async (quotation: any) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      try {
        await apiClientQuotation.quotations.delete(quotation._id);
        toast.success('Quotation deleted successfully');
        fetchQuotations();
      } catch (error) {
        console.error('Error deleting quotation:', error);
        toast.error('Failed to delete quotation');
      }
    }
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

    // Clear any existing form errors
    setFormErrors({});

    // Smart defaults based on current payment status
    let defaultPaymentStatus = 'paid';
    let defaultPaidAmount = invoice.remainingAmount;

    if (invoice.paymentStatus === 'pending') {
      defaultPaymentStatus = 'partial';
      defaultPaidAmount = Math.round(invoice.remainingAmount * 0.5); // Default to 50% for partial
    } else if (invoice.paymentStatus === 'partial') {
      defaultPaymentStatus = 'paid';
      // For existing partial payments, suggest paying the remaining amount
      const remainingAmount = invoice.remainingAmount || (invoice.remainingAmount - (invoice.paidAmount || 0));
      defaultPaidAmount = invoice.remainingAmount;
    }

    setPaymentUpdate({
      paymentStatus: defaultPaymentStatus,
      paymentMethod: '',
      paymentDate: new Date().toISOString().split('T')[0],
      paidAmount: defaultPaidAmount,
      notes: '',
      useRazorpay: false
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
      toast.success('Invoice status updated successfully!');
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPaymentUpdate = async () => {
    if (!selectedInvoice) return;

    // Validate payment form
    if (!validatePaymentForm()) {
      return;
    }

    setSubmitting(true);
    try {
      if (paymentUpdate.useRazorpay) {
        // Handle Razorpay payment
        await processRazorpayPayment();
      } else {
        // Handle manual payment
        await processManualPayment();
      }
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Process Razorpay payment
  const processRazorpayPayment = async () => {
    if (!selectedInvoice) return;

    try {
      // Check if Razorpay is loaded
      if (typeof (window as any).Razorpay === 'undefined') {
        throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.');
      }

      // Create Razorpay order
      const orderResponse = await apiClient.payments.createRazorpayOrder({
        invoiceId: selectedInvoice._id,
        amount: paymentUpdate.paidAmount,
        currency: 'INR'
      });

      if (!orderResponse.success) {
        throw new Error('Failed to create Razorpay order');
      }

      const { orderId, paymentId } = orderResponse.data;

      // Initialize Razorpay
      const options = {
        key: 'rzp_test_vlWs0Sr2LECorO', // Replace with your key
        amount: Math.round(paymentUpdate.paidAmount * 100), // Amount in paise
        currency: 'INR',
        name: 'Sun Power Services',
        description: `Payment for Invoice ${selectedInvoice.invoiceNumber}`,
        order_id: orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verificationResponse = await apiClient.payments.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId: paymentId
            });

            if (verificationResponse.success) {
              await fetchInvoices();
              await fetchStats();
              setShowPaymentModal(false);
              setPaymentUpdate({ paymentStatus: '', paymentMethod: '', paymentDate: '', paidAmount: 0, notes: '', useRazorpay: false });
              toast.success('Payment processed successfully!');
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (error) {
            console.error('Payment verification error:', error);
            console.error('Error details:', {
              message: error instanceof Error ? error.message : 'Unknown error',
              stack: error instanceof Error ? error.stack : undefined
            });
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: selectedInvoice.customer?.name || '',
          email: selectedInvoice.customer?.email || '',
          contact: selectedInvoice.customer?.phone || ''
        },
        theme: {
          color: '#3B82F6'
        }
      };

      // Check if Razorpay is loaded
      if (typeof (window as any).Razorpay === 'undefined') {
        throw new Error('Razorpay SDK not loaded. Please refresh the page and try again.');
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error('Razorpay payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate payment. Please try again.';
      toast.error(errorMessage);
    }
  };

  // Process manual payment
  const processManualPayment = async () => {
    if (!selectedInvoice) return;

    try {
      const response = await apiClient.payments.processManualPayment({
        invoiceId: selectedInvoice._id,
        amount: paymentUpdate.paidAmount,
        paymentMethod: paymentUpdate.paymentMethod,
        paymentDate: paymentUpdate.paymentDate,
        notes: paymentUpdate.notes,
        currency: 'INR'
      });

      if (response.success) {
        await fetchInvoices();
        await fetchStats();
        setShowPaymentModal(false);
        setPaymentUpdate({ paymentStatus: '', paymentMethod: '', paymentDate: '', paidAmount: 0, notes: '', useRazorpay: false });
        toast.success('Payment processed successfully!');
      } else {
        throw new Error('Failed to process payment');
      }
    } catch (error) {
      console.error('Manual payment error:', error);
      toast.error('Failed to process payment. Please try again.');
    }
  };

  // Quick actions
  const quickSendInvoice = async (invoice: Invoice) => {
    try {
      // Send invoice email with payment link
      const response = await apiClient.invoices.sendEmail(invoice._id);

      if (response.success) {
        toast.success(response.message || `Invoice email sent successfully!`);
        await fetchInvoices();
        await fetchStats();
      } else {
        toast.error(response.message || 'Failed to send invoice email');
      }
    } catch (error) {
      console.error('Error sending invoice email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invoice email. Please try again.';
      toast.error(errorMessage);
    }
  };

  const sendPaymentReminder = async (invoice: Invoice) => {
    try {
      const response = await apiClient.invoices.sendReminder(invoice._id);

      if (response.success) {
        toast.success('Payment reminder sent successfully!');
        await fetchInvoices();
        await fetchStats();
      } else {
        toast.error('Failed to send payment reminder');
      }
    } catch (error) {
      console.error('Error sending payment reminder:', error);
      toast.error('Failed to send payment reminder. Please try again.');
    }
  };

  const quickMarkPaid = async (invoice: Invoice) => {
    await handlePaymentUpdateQuick(invoice._id, {
      paymentStatus: 'paid',
      paymentDate: new Date().toISOString(),
      paidAmount: invoice.totalAmount
    });
  };

  const quickCancelInvoice = async (invoice: Invoice) => {
    if (window.confirm('Are you sure you want to cancel this invoice?')) {
      await handleUpdateStatusQuick(invoice._id, 'cancelled');
    }
  };

  const handleUpdateStatusQuick = async (invoiceId: string, status: string) => {
    try {
      await apiClient.invoices.update(invoiceId, { status });
      await fetchInvoices();
      await fetchStats();
      toast.success(`Invoice ${status} successfully!`);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast.error('Failed to update invoice status. Please try again.');
    }
  };

  const handlePaymentUpdateQuick = async (invoiceId: string, paymentData: any) => {
    try {
      await apiClient.invoices.update(invoiceId, paymentData);
      await fetchInvoices();
      await fetchStats();
      toast.success('Payment updated successfully!');
    } catch (error) {
      console.error('Error updating payment:', error);
      toast.error('Failed to update payment. Please try again.');
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

    // Only show payment-related actions for sales invoices
    if (invoice.invoiceType === 'sale') {

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

      // Email actions
      if (invoice.status === 'draft') {
        actions.push({
          icon: <Send className="w-4 h-4" />,
          label: 'Send Email',
          action: () => quickSendInvoice(invoice),
          color: 'text-orange-600 hover:text-orange-900 hover:bg-orange-50'
        });
      }

      if (invoice.status === 'sent' && (invoice.paymentStatus === 'pending' || invoice.paymentStatus === 'partial')) {
        actions.push({
          icon: <Send className="w-4 h-4" />,
          label: 'Send Reminder',
          action: () => sendPaymentReminder(invoice),
          color: 'text-yellow-600 hover:text-yellow-900 hover:bg-yellow-50'
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
    } else {
      // For non-sales invoices, only show basic actions
      if (invoice.status !== 'cancelled') {
        actions.push({
          icon: <Edit className="w-4 h-4" />,
          label: 'Edit Status',
          action: () => handleUpdateStatus(invoice, invoice.status),
          color: 'text-purple-600 hover:text-purple-900 hover:bg-purple-50'
        });
      }

      if (invoice.status !== 'cancelled') {
        actions.push({
          icon: <X className="w-4 h-4" />,
          label: 'Cancel',
          action: () => quickCancelInvoice(invoice),
          color: 'text-red-600 hover:text-red-900 hover:bg-red-50'
        });
      }
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
          taxRate: 0,
          gstRate: 0,
          partNo: '',
          hsnSac: '',
          uom: 'pcs',
          discount: 0
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

  const extractGSTRate = (gst: string | number | undefined): number => {
    if (!gst) return 0;
    if (typeof gst === 'number') return gst;
    const match = gst.match(/(\d+(\.\d+)?)/); // Extracts number like 18 or 18.5
    return match ? parseFloat(match[1]) : 0;
  };
  

  const updateInvoiceItem = (index: number, field: keyof NewInvoiceItem, value: any) => {
    setNewInvoice(prev => {
      const updatedItems = [...prev.items];
      console.log("updatedItems:", updatedItems);
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      // Auto-populate price, description, gst, hsnNumber, and partNo when product is selected
      if (field === 'product') {
        const productObj = products.find(p => p._id === value);
        console.log("productObj:", productObj);

        

        if (productObj) {
          updatedItems[index].unitPrice = productObj.price;
          updatedItems[index].description = productObj.name;
          updatedItems[index].gst = productObj.gst;
          updatedItems[index].taxRate =  extractGSTRate(productObj.gst);
          updatedItems[index].partNo = productObj.partNo;
          updatedItems[index].hsnNumber = productObj.hsnNumber;
          updatedItems[index].uom = productObj.uom;
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

      console.log("stockItem-3:", response);


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

      console.log("stockItem-1:", stockItem);
      console.log("stockItem-2:", quantity, available);


      const isValid = quantity <= available && available > 0;
      const message = available === 0
        ? `Out of stock`
        : !isValid
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
      if (newInvoice.reduceStock && stockValidation[index]) {
        const stockInfo = stockValidation[index];
        if (!stockInfo.isValid || stockInfo.available === 0) {
          errors[`item_${index}_stock`] = stockInfo.message;
        }
        if (item.quantity > stockInfo.available) {
          errors[`item_${index}_stock`] = `Cannot sell ${item.quantity} units. Only ${stockInfo.available} available.`;
        }
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate payment form
  const validatePaymentForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedInvoice) {
      errors.general = 'No invoice selected';
      return false;
    }

    // Calculate remaining amount
    const remainingAmount = selectedInvoice.remainingAmount || (selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0));

    // Validate payment amount
    if (!paymentUpdate.paidAmount || paymentUpdate.paidAmount <= 0) {
      errors.paidAmount = 'Payment amount must be greater than 0';
    } else if (paymentUpdate.paidAmount > remainingAmount) {
      errors.paidAmount = `Payment amount cannot exceed remaining amount (₹${remainingAmount.toLocaleString()})`;
    }

    // Validate payment status logic
    if (paymentUpdate.paymentStatus === 'paid' && paymentUpdate.paidAmount < remainingAmount) {
      errors.paymentStatus = 'Payment status cannot be "Paid" when amount is less than remaining balance';
    } else if (paymentUpdate.paymentStatus === 'partial' && paymentUpdate.paidAmount >= remainingAmount) {
      errors.paymentStatus = 'Payment status should be "Paid" when paying full remaining amount';
    } else if (paymentUpdate.paymentStatus === 'pending' && paymentUpdate.paidAmount > 0) {
      errors.paymentStatus = 'Payment status cannot be "Pending" when amount is greater than 0';
    }

    // Validate payment method for manual payments
    if (!paymentUpdate.useRazorpay && !paymentUpdate.paymentMethod) {
      errors.paymentMethod = 'Payment method is required for manual payments';
    }

    // Validate payment date
    if (!paymentUpdate.paymentDate) {
      errors.paymentDate = 'Payment date is required';
    } else {
      const paymentDate = new Date(paymentUpdate.paymentDate);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (paymentDate > today) {
        errors.paymentDate = 'Payment date cannot be in the future';
      }
    }

    // Validate Razorpay configuration
    if (paymentUpdate.useRazorpay) {
      const razorpayKey = "rzp_test_vlWs0Sr2LECorO";

      if (!razorpayKey) {
        errors.razorpay = 'Razorpay key not configured. Please check environment variables.';
      }
    }

    // Validate invoice status
    if (selectedInvoice.status === 'cancelled') {
      errors.general = 'Cannot process payment for cancelled invoice';
    } else if (selectedInvoice.status === 'draft') {
      errors.general = 'Cannot process payment for draft invoice. Please send the invoice first.';
    }

    // Validate if invoice is already fully paid
    if (remainingAmount <= 0) {
      errors.general = 'Invoice is already fully paid';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Check if payment form is valid for enabling submit button
  const isPaymentFormValid = (): boolean => {
    if (!selectedInvoice) return false;

    const remainingAmount = selectedInvoice.remainingAmount || (selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0));

    // Basic validation checks
    const hasValidAmount = paymentUpdate.paidAmount > 0 && paymentUpdate.paidAmount <= remainingAmount;
    const hasValidStatus = Boolean(paymentUpdate.paymentStatus && paymentUpdate.paymentStatus !== '');
    const hasValidDate = Boolean(paymentUpdate.paymentDate && paymentUpdate.paymentDate !== '');
    const hasValidMethod = paymentUpdate.useRazorpay || Boolean(paymentUpdate.paymentMethod && paymentUpdate.paymentMethod !== '');

    // Check invoice status
    const isInvoiceValid = selectedInvoice.status !== 'cancelled' && selectedInvoice.status !== 'draft' && remainingAmount > 0;

    return hasValidAmount && hasValidStatus && hasValidDate && hasValidMethod && isInvoiceValid;
  };

  const calculateItemTotal = (item: any) => {
    const subtotal = item.quantity * item.unitPrice || 0;
    const itemDiscount = (item.discount || 0) * subtotal / 100; // Calculate discount amount
    return subtotal - itemDiscount;
  };

  const calculateSubtotal = () => {
    return newInvoice.items.reduce((sum, item) => sum + calculateItemTotal(item), 0) || 0;
  };

  const calculateTotalTax = () => {
    const totalTax = newInvoice.items.reduce((sum, item) => {
      const itemTotal = calculateItemTotal(item);
      return sum + (itemTotal * (item.taxRate || 0) / 100);
    }, 0);

    return parseFloat(totalTax.toFixed(2)) || 0;
  };

  const calculateItemDiscounts = () => {
    const itemDiscounts = newInvoice.items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice || 0;
      const itemDiscount = (item.discount || 0) * subtotal / 100;
      return sum + itemDiscount;
    }, 0);
    return parseFloat(itemDiscounts.toFixed(2)) || 0;
  };

  const calculateTotalDiscount = () => {
    const itemDiscounts = calculateItemDiscounts();
    // const invoiceDiscount = newInvoice.discountAmount || 0;
    return parseFloat((itemDiscounts).toFixed(2)) || 0;
  };


  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTotalTax();
    // const invoiceDiscount = newInvoice.discountAmount || 0;
    return subtotal + tax;
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

      // Get selected customer details
      const selectedCustomer = customers.find(c => c._id === newInvoice.customer);
      const selectedAddress = addresses.find(a => a.id === parseInt(newInvoice.address || '0'));

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
        // Bank details and PAN from general settings
        pan: newInvoice.pan || '',
        bankName: newInvoice.bankName || '',
        bankAccountNo: newInvoice.bankAccountNo || '',
        bankIFSC: newInvoice.bankIFSC || '',
        bankBranch: newInvoice.bankBranch || '',
        // Customer address details
        customerAddress: selectedAddress ? {
          address: selectedAddress.address,
          state: selectedAddress.state,
          district: selectedAddress.district,
          pincode: selectedAddress.pincode
        } : null,
        // Additional invoice fields
        referenceNo: newInvoice.referenceNo || '',
        referenceDate: newInvoice.referenceDate || '',
        buyersOrderNo: newInvoice.buyersOrderNo || '',
        buyersOrderDate: newInvoice.buyersOrderDate || '',
        dispatchDocNo: newInvoice.dispatchDocNo || '',
        deliveryNoteDate: newInvoice.deliveryNoteDate || '',
        dispatchedThrough: newInvoice.dispatchedThrough || '',
        destination: newInvoice.destination || '',
        termsOfDelivery: newInvoice.termsOfDelivery || '',
        sellerGSTIN: newInvoice.sellerGSTIN || '',
        sellerState: newInvoice.sellerState || '',
        sellerStateCode: newInvoice.sellerStateCode || '',
        buyerGSTIN: newInvoice.buyerGSTIN || '',
        buyerState: newInvoice.buyerState || '',
        buyerStateCode: newInvoice.buyerStateCode || '',
        declaration: newInvoice.declaration || '',
        signature: newInvoice.signature || '',
        items: newInvoice.items.map(item => ({
          product: item.product,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate || 0),
          discount: Number(item.discount || 0),
          uom: item.uom || 'pcs',
          partNo: item.partNo || '',
          hsnSac: item.hsnSac || ''
        }))
      };

      await apiClient.invoices.create(invoiceData);
      await fetchInvoices();
      await fetchStats();
      setShowCreateModal(false);
      setStockValidation({}); // Clear stock validation
      setFormErrors({}); // Clear form errors
      toast.success('Invoice created successfully!');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice. Please try again.');
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
      invoice?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice?.supplierName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || invoice.paymentStatus === paymentFilter;
    const matchesType = invoice.invoiceType === invoiceType;
    return matchesSearch && matchesStatus && matchesPayment && matchesType;
  });




  const getStatusIcon = (status: string) => {
    const icons: any = {
      completed: <CheckCircle className="w-4 h-4" />,
      cancelled: <XCircle className="w-4 h-4" />,
      pending: <Clock className="w-4 h-4" />,
      overdue: <AlertCircle className="w-4 h-4" />,
      received: <CheckCircle className="w-4 h-4" />
    };
    return icons[status];
  };

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
      { value: 'quotation', label: 'Quotation', icon: <FileText /> },
      { value: 'sale', label: 'Sales Invoice', icon: <TrendingUp /> },
      { value: 'purchase', label: 'Purchase Invoice', icon: <TrendingDown /> },
      { value: 'challan', label: 'Delivery Challan', icon: <Package /> },
    ];
    return options.find(opt => opt.value === value)?.label || 'Sales Invoices';
  };

  const getProductLabel = (value: string) => {
    if (!value) return 'Select product';
    const product = products.find(p => p._id === value);
    return product ? `${product?.name} - ₹${product?.price?.toLocaleString()}` : 'Select product';
  };

  const getAddressLabel = (value: string | undefined) => {
    if (!value) return 'Select address';
    const address = addresses.find(a => a.id === parseInt(value));
    return address ? `${address.address} (${address.district}, ${address.pincode})` : 'Unknown address';
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

  // Add this import at the top of your file
  // import jsPDF from 'jspdf';
  // import 'jspdf-autotable';

  // PDF Generation Function
  const generatePDF = () => {
    if (!selectedInvoice) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 12;

    // Header: Company Info
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(generalSettings?.companyName || 'Sun Power Services', 10, y);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    y += 5;
    doc.text(generalSettings?.companyAddress || '', 10, y);
    y += 5;
    doc.text(`GSTIN: ${generalSettings?.companyGSTIN || ''}`, 10, y);
    y += 5;
    doc.text(`Contact: ${generalSettings?.companyPhone || ''}  Email: ${generalSettings?.companyEmail || ''}`, 10, y);
    y += 8;

    // Invoice Details Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Sales Invoice', pageWidth / 2, y, { align: 'center' });
    doc.setFontSize(9);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: ${selectedInvoice.invoiceNumber || ''}`, 10, y);
    doc.text(`Dated: ${new Date(selectedInvoice.issueDate).toLocaleDateString()}`, 80, y);
    doc.text(`Mode/Terms of Payment: ${selectedInvoice.termsOfDelivery || ''}`, 150, y);
    y += 5;
    doc.text(`Reference No. & Date: ${selectedInvoice.referenceNo || ''} ${selectedInvoice.referenceDate || ''}`, 10, y);
    doc.text(`Buyer's Order No: ${selectedInvoice.buyersOrderNo || ''}`, 80, y);
    doc.text(`Dispatch Doc No: ${selectedInvoice.dispatchDocNo || ''}`, 150, y);
    y += 5;
    doc.text(`Delivery Note Date: ${selectedInvoice.deliveryNoteDate || ''}`, 10, y);
    doc.text(`Dispatched Through: ${selectedInvoice.dispatchedThrough || ''}`, 80, y);
    doc.text(`Destination: ${selectedInvoice.destination || ''}`, 150, y);
    y += 8;

    // Buyer/Consignee Details
    doc.setFont('helvetica', 'bold');
    doc.text('Buyer:', 10, y);
    doc.setFont('helvetica', 'normal');
    doc.text(selectedInvoice.customer?.name || '', 30, y);
    y += 5;
    doc.text(selectedInvoice.customer?.email || '', 30, y);
    y += 5;
    doc.text(selectedInvoice.customer?.phone || '', 30, y);
    y += 5;
    doc.text(`GSTIN: ${selectedInvoice.customer?.gstNumber || ''}`, 30, y);
    y += 5;
    doc.text(`State Name: ${selectedInvoice.customer?.state || ''}, Code: ${selectedInvoice.customer?.stateCode || ''}`, 30, y);
    y += 8;

    // Items Table
    const tableHead = [[
      'S.No', 'Description of Goods and Services', 'HSN/SAC', 'GST Rate', 'Part No.', 'Quantity', 'UOM', 'Rate', 'per', 'Disc. %', 'Amount'
    ]];
    const tableBody = selectedInvoice.items.map((item: any, idx: number) => [
      (idx + 1).toString(),
      item.description || '',
      item.hsnSac || '',
      (item.taxRate || 0) + '%',
      item.partNo || '',
      item.quantity?.toFixed(2) || '',
      item.uom || '',
      item.unitPrice?.toFixed(2) || '',
      item.uom || '',
      (item.discount || 0).toString(),
      ((item.quantity * item.unitPrice - ((item.discount || 0) * item.quantity * item.unitPrice / 100) + ((item.quantity * item.unitPrice - ((item.discount || 0) * item.quantity * item.unitPrice / 100)) * (item.taxRate || 0) / 100)).toFixed(2))
    ]);
    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 220, 220], textColor: 0 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 50 },
        2: { cellWidth: 18 },
        3: { cellWidth: 14 },
        4: { cellWidth: 18 },
        5: { cellWidth: 14 },
        6: { cellWidth: 12 },
        7: { cellWidth: 16 },
        8: { cellWidth: 12 },
        9: { cellWidth: 12 },
        10: { cellWidth: 22 }
      }
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 4;

    // Output IGST, Round Off, Total
    const subtotal = selectedInvoice.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = selectedInvoice.items.reduce((sum: number, item: any) => sum + ((item.quantity * item.unitPrice - ((item.discount || 0) * item.quantity * item.unitPrice / 100)) * (item.taxRate || 0) / 100), 0);
    const totalDiscount = selectedInvoice.items.reduce((sum: number, item: any) => sum + ((item.discount || 0) * item.quantity * item.unitPrice / 100), 0);
    const grandTotal = subtotal - totalDiscount + totalTax;
    doc.setFont('helvetica', 'bold');
    doc.text(`Output IGST:`, 150, y);
    doc.text(`${totalTax.toFixed(2)}`, 180, y);
    y += 5;
    doc.text(`Round Off:`, 150, y);
    doc.text(`${(Math.round(grandTotal) - grandTotal).toFixed(2)}`, 180, y);
    y += 5;
    doc.text(`Total:`, 150, y);
    doc.text(`${Math.round(grandTotal).toFixed(2)}`, 180, y);
    y += 8;

    // Amount in Words
    doc.setFont('helvetica', 'normal');
    doc.text(`Amount Chargeable (in words):`, 10, y);
    doc.setFont('helvetica', 'bold');
    doc.text(`${numberToWords(Math.round(grandTotal))} Only`, 70, y);
    y += 8;

    // Tax Summary Table
    doc.setFont('helvetica', 'normal');
    autoTable(doc, {
      head: [['Taxable Value', 'Integrated Tax Rate', 'Integrated Tax Amount', 'Total']],
      body: [[
        subtotal.toFixed(2),
        (selectedInvoice.items[0]?.taxRate || 0) + '%',
        totalTax.toFixed(2),
        (subtotal + totalTax).toFixed(2)
      ]],
      startY: y,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [220, 220, 220], textColor: 0 }
    });
    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 8;

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.text('Declaration:', 10, y);
    doc.setFont('helvetica', 'italic');
    doc.text(selectedInvoice.declaration || '', 30, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.text('For ' + (generalSettings?.companyName || 'Sun Power Services'), 150, y);
    y += 8;
    doc.text('Authorised Signatory', 150, y);

    doc.save(`Invoice_${selectedInvoice.invoiceNumber}.pdf`);
  };

  // Helper function to convert number to words (simple, for INR)
  function numberToWords(num: number): string {
    // ... (implement or use a library for number to words)
    // For now, just return the number as string
    return num.toLocaleString('en-IN');
  }

  // Update printInvoice function
  const printInvoice = () => {
    if (!selectedInvoice) return;
    const printContent = `
    <html>
      <head>
        <title>Invoice ${selectedInvoice.invoiceNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .invoice-details, .buyer-details { width: 100%; margin-bottom: 10px; }
          .invoice-details td, .buyer-details td { padding: 2px 6px; font-size: 12px; }
          table.items { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
          table.items th, table.items td { border: 1px solid #333; padding: 4px; font-size: 11px; }
          table.items th { background: #eee; }
          .summary-table { width: 100%; margin-top: 10px; }
          .summary-table td { font-size: 12px; padding: 2px 6px; }
          .footer { margin-top: 30px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${generalSettings?.companyName || 'Sun Power Services'}</h2>
          <div>${generalSettings?.companyAddress || ''}</div>
          <div>GSTIN: ${generalSettings?.companyGSTIN || ''}</div>
          <div>Contact: ${generalSettings?.companyPhone || ''}  Email: ${generalSettings?.companyEmail || ''}</div>
        </div>
        <table class="invoice-details">
          <tr><td>Invoice No:</td><td>${selectedInvoice.invoiceNumber || ''}</td><td>Dated:</td><td>${new Date(selectedInvoice.issueDate).toLocaleDateString()}</td></tr>
          <tr><td>Mode/Terms of Payment:</td><td>${selectedInvoice.termsOfDelivery || ''}</td><td>Reference No. & Date:</td><td>${selectedInvoice.referenceNo || ''} ${selectedInvoice.referenceDate || ''}</td></tr>
          <tr><td>Buyer's Order No:</td><td>${selectedInvoice.buyersOrderNo || ''}</td><td>Dispatch Doc No:</td><td>${selectedInvoice.dispatchDocNo || ''}</td></tr>
          <tr><td>Delivery Note Date:</td><td>${selectedInvoice.deliveryNoteDate || ''}</td><td>Dispatched Through:</td><td>${selectedInvoice.dispatchedThrough || ''}</td></tr>
          <tr><td>Destination:</td><td>${selectedInvoice.destination || ''}</td></tr>
        </table>
        <table class="buyer-details">
          <tr><td>Buyer:</td><td>${selectedInvoice.customer?.name || ''}</td></tr>
          <tr><td>Email:</td><td>${selectedInvoice.customer?.email || ''}</td></tr>
          <tr><td>Phone:</td><td>${selectedInvoice.customer?.phone || ''}</td></tr>
          <tr><td>GSTIN:</td><td>${selectedInvoice.customer?.gstNumber || ''}</td></tr>
          <tr><td>State Name:</td><td>${selectedInvoice.customer?.state || ''}, Code: ${selectedInvoice.customer?.stateCode || ''}</td></tr>
        </table>
        <table class="items">
          <thead>
            <tr>
              <th>S.No</th><th>Description</th><th>HSN/SAC</th><th>GST Rate</th><th>Part No.</th><th>Quantity</th><th>UOM</th><th>Rate</th><th>per</th><th>Disc. %</th><th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${(selectedInvoice.items as any[]).map((item: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.description || ''}</td>
                <td>${item.hsnSac || ''}</td>
                <td>${item.taxRate || 0}%</td>
                <td>${item.partNo || ''}</td>
                <td>${item.quantity?.toFixed(2) || ''}</td>
                <td>${item.uom || ''}</td>
                <td>${item.unitPrice?.toFixed(2) || ''}</td>
                <td>${item.uom || ''}</td>
                <td>${item.discount || 0}</td>
                <td>${(item.quantity * item.unitPrice - ((item.discount || 0) * item.quantity * item.unitPrice / 100) + ((item.quantity * item.unitPrice - ((item.discount || 0) * item.quantity * item.unitPrice / 100)) * (item.taxRate || 0) / 100)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <table class="summary-table">
          <tr><td>Output IGST:</td><td>${totalTax(selectedInvoice).toFixed(2)}</td></tr>
          <tr><td>Round Off:</td><td>${(Math.round(grandTotal(selectedInvoice)) - grandTotal(selectedInvoice)).toFixed(2)}</td></tr>
          <tr><td>Total:</td><td>${Math.round(grandTotal(selectedInvoice)).toFixed(2)}</td></tr>
        </table>
        <div><strong>Amount Chargeable (in words):</strong> ${numberToWords(Math.round(grandTotal(selectedInvoice)))} Only</div>
        <table class="summary-table">
          <tr><td>Taxable Value</td><td>Integrated Tax Rate</td><td>Integrated Tax Amount</td><td>Total</td></tr>
          <tr><td>${subtotal(selectedInvoice).toFixed(2)}</td><td>${selectedInvoice.items[0]?.taxRate || 0}%</td><td>${totalTax(selectedInvoice).toFixed(2)}</td><td>${(subtotal(selectedInvoice) + totalTax(selectedInvoice)).toFixed(2)}</td></tr>
        </table>
        <div class="footer">
          <div>Declaration: ${selectedInvoice.declaration || ''}</div>
          <div style="margin-top: 30px;">For ${generalSettings?.companyName || 'Sun Power Services'}</div>
          <div style="margin-top: 30px;">Authorised Signatory</div>
        </div>
      </body>
    </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Helper functions for print
  function subtotal(inv: any) {
    return inv.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
  }
  function totalTax(inv: any) {
    return inv.items.reduce((sum: number, item: any) => sum + ((item.quantity * item.unitPrice - ((item.discount || 0) * item.quantity * item.unitPrice / 100)) * (item.taxRate || 0) / 100), 0);
  }
  function grandTotal(inv: any) {
    const sub = subtotal(inv);
    const tax = totalTax(inv);
    const disc = inv.items.reduce((sum: number, item: any) => sum + ((item.discount || 0) * item.quantity * item.unitPrice / 100), 0);
    return sub - disc + tax;
  }

  // Print quotation function
  const printQuotation = (quotation: any) => {
    const printContent = `
    <html>
      <head>
        <title>Quotation ${quotation.quotationNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.6;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .company-info, .customer-info { 
            width: 100%; 
            margin-bottom: 20px; 
          }
          .company-info td, .customer-info td { 
            padding: 5px 10px; 
            font-size: 12px; 
            vertical-align: top;
          }
          .quotation-details {
            margin-bottom: 20px;
            padding: 10px;
            background-color: #f9f9f9;
            border-radius: 5px;
          }
          table.items { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px; 
          }
          table.items th, table.items td { 
            border: 1px solid #333; 
            padding: 8px; 
            font-size: 11px; 
            text-align: left;
          }
          table.items th { 
            background: #eee; 
            font-weight: bold;
          }
          .summary-table { 
            width: 100%; 
            margin-top: 20px; 
          }
          .summary-table td { 
            font-size: 12px; 
            padding: 5px 10px; 
          }
          .footer { 
            margin-top: 30px; 
            font-size: 12px; 
          }
          .total-row {
            font-weight: bold;
            background-color: #f0f0f0;
          }
          .notes-section {
            margin-top: 20px;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${quotation.company?.name || 'Sun Power Services'}</h1>
          <div>${quotation.company?.address || ''}</div>
          <div>Phone: ${quotation.company?.phone || ''} | Email: ${quotation.company?.email || ''}</div>
          <div>PAN: ${quotation.company?.pan || ''}</div>
        </div>

        <div class="quotation-details">
          <h2>QUOTATION</h2>
          <table class="quotation-details" style="width: 100%; border-collapse: collapse; border: 1px solid #333; border-radius: 5px; padding: 10px; margin-bottom: 20px;">
            <tr>
              <td><strong>Quotation No:</strong></td>
              <td>${quotation.quotationNumber}</td>
              <td><strong>Issue Date:</strong></td>
              <td>${quotation.issueDate ? new Date(quotation.issueDate).toLocaleDateString() : ''}</td>
            </tr>
            <tr>
              <td><strong>Valid Until:</strong></td>
              <td>${quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : ''}</td>
              <td><strong>Validity Period:</strong></td>
              <td>${quotation.validityPeriod || 30} days</td>
            </tr>
          </table>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
          <div style="width: 48%;">
            <h3>From:</h3>
            <div>
              <strong>${quotation.company?.name || 'Sun Power Services'}</strong><br>
              ${quotation.company?.address || ''}<br>
              Phone: ${quotation.company?.phone || 'N/A'}<br>
              Email: ${quotation.company?.email || 'N/A'}<br>
              PAN: ${quotation.company?.pan || 'N/A'}
            </div>
          </div>
          <div style="width: 48%;">
            <h3>To:</h3>
            <div>
              <strong>${quotation.customer?.name || 'N/A'}</strong><br>
              Email: ${quotation.customer?.email || 'N/A'}<br>
              Phone: ${quotation.customer?.phone || 'N/A'}<br>
              Address: ${`${quotation.customer?.address} (${quotation.customer?.district}, ${quotation.customer?.state}, ${quotation.customer?.pincode})` || 'N/A'}
            </div>
          </div>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Description</th>
              <th>HSN Code</th>
              <th>Qty</th>
              <th>UOM</th>
              <th>Part No</th>
              <th>Unit Price</th>
              <th>Discount</th>
              <th>Tax Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${(quotation.items || []).map((item: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.description || ''}</td>
                <td>${item.hsnCode || 'N/A'}</td>
                <td>${item.quantity || 0}</td>
                <td>${item.uom || 'pcs'}</td>
                <td>${item.partNo || 'N/A'}</td>
                <td>₹${item.unitPrice?.toLocaleString() || '0'}</td>
                <td>${item.discount || 0}%</td>
                <td>${item.taxRate || 0}%</td>
                <td>₹${(item.unitPrice * item.quantity * (1 - item.discount / 100) * (1 + item.taxRate / 100)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table class="summary-table" style="float: right; width: 300px;">
          <tr>
            <td><strong>Subtotal:</strong></td>
            <td>₹${quotation.subtotal?.toLocaleString() || '0'}</td>
          </tr>
          <tr>
            <td><strong>Total Discount:</strong></td>
            <td>-₹${quotation.totalDiscount?.toFixed(2) || '0'}</td>
          </tr>
          <tr>
            <td><strong>Total Tax:</strong></td>
            <td>₹${quotation.totalTax?.toFixed(2) || '0'}</td>
          </tr>
          <tr class="total-row">
            <td><strong>Grand Total:</strong></td>
            <td><strong>₹${quotation.grandTotal?.toFixed(2) || '0'}</strong></td>
          </tr>
        </table>

        ${(quotation.notes || quotation.terms) ? `
        <div class="notes-section">
          ${quotation.notes ? `
          <div style="margin-bottom: 15px;">
            <strong>Notes:</strong><br>
            ${quotation.notes}
          </div>
          ` : ''}
          ${quotation.terms ? `
          <div>
            <strong>Terms & Conditions:</strong><br>
            ${quotation.terms}
          </div>
          ` : ''}
        </div>
        ` : ''}

        <div class="footer">
          <div style="margin-top: 50px; text-align: center;">
            <div style="margin-bottom: 30px;">For ${quotation.company?.name || 'Sun Power Services'}</div>
            <div>Authorised Signatory</div>
          </div>
        </div>
      </body>
    </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      <PageHeader
        title="Billing"
        subtitle="Create and manage customer invoices"
      >
        {(invoiceType === 'sale' || invoiceType === 'challan') && (
          <Button
            onClick={handleCreateInvoice}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>
              {invoiceType === 'sale' ? 'Create Invoice' :
                invoiceType === 'challan' ? 'Create Challan' : 'Create Invoice'}
            </span>
          </Button>
        )}
        {invoiceType === 'quotation' && (
          <Button
            onClick={handleCreateQuotation}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quotation</span>
          </Button>
        )}
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
        <div className="flex flex-col justify-between md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex gap-4 ">
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
          {/* Invoice Type Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
          {INVOICE_TYPES.map(type => (
  <button
    key={type.value}
    onClick={() => {
      const selectedType = type.value as 'quotation' | 'sale' | 'purchase' | 'challan';
      setInvoiceType(selectedType);
      setNewInvoice(prev => ({ ...prev, invoiceType: selectedType }));
      setShowInvoiceTypeDropdown(false); // optional: close dropdown if open
    }}
    className={`px-3 py-2.5 rounded text-sm font-medium flex items-center space-x-1.5 transition-all duration-200 ${
      invoiceType === type.value
        ? 'bg-white text-blue-700 shadow-sm'
        : 'text-gray-600 hover:text-blue-700 hover:bg-gray-50'
    }`}
  >
    <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center">{type.icon}</span>
    <span className="whitespace-nowrap">{type.label}</span>
  </button>
))}

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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {invoiceType === 'quotation' ? 'Quotation No' :
                    invoiceType === 'challan' ? 'Challan No' :
                      'Invoice No'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {invoiceType === 'purchase' ? 'Supplier' : 'Customer'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                {invoiceType === 'sale' && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>}
                {invoiceType === 'sale' && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>}
                {<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>}
                {invoiceType === 'sale' && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(invoiceType === 'quotation' ? quotationLoading : loading) ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span>Loading {invoiceType === 'quotation' ? 'quotations' : 'invoices'}...</span>
                    </div>
                  </td>
                </tr>
              ) : (invoiceType === 'quotation' ? quotations : filteredInvoices).length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    <div className="text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No {invoiceType === 'quotation' ? 'quotations' : 'invoices'} found</p>
                      <p className="text-gray-500">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : invoiceType === 'quotation' ? (
                quotations.map((quotation) => (
                  <tr key={quotation._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {quotation.quotationNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {quotation.customer?.name || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {quotation.customer?.email || ''}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ₹{quotation.grandTotal?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Quotation
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
  {quotation.validUntil
    ? new Date(quotation.validUntil).toLocaleDateString('en-GB') // => 17/07/2025
    : 'N/A'}
</td>

                    <td className="px-4 py-3 text-sm font-medium">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleViewQuotation(quotation)}
                          className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded transition-colors duration-200"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditQuotation(quotation)}
                          className="text-purple-600 hover:text-purple-900 p-1.5 hover:bg-purple-50 rounded transition-colors duration-200"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuotation(quotation)}
                          className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded transition-colors duration-200"
                          title="Delete"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredInvoices.map((invoice) => (
                  <tr key={invoice._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoiceType === 'purchase' ? invoice.supplierName : invoice.customer?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {invoiceType === 'purchase' ? invoice.supplierEmail : invoice.customer?.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ₹{invoice.totalAmount.toFixed(2)}
                    </td>
                    {invoiceType === 'sale' && <td className="px-4 py-3 text-sm font-medium text-green-600">
                      ₹{(invoice.paidAmount || 0).toLocaleString()}
                    </td>}
                    {invoiceType === 'sale' && <td className="px-4 py-3 text-sm font-medium text-red-600">
                      ₹{(invoice.remainingAmount.toFixed(2) || invoice.totalAmount - (invoice.paidAmount || 0)).toLocaleString()}
                    </td>}
                    {invoice.invoiceType === 'sale' ? <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(invoice.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>
                    </td> : <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(invoice.status)}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${(invoice.externalInvoiceTotal?.toFixed(1) === invoice.totalAmount?.toFixed(1))
                          ? "bg-green-100 text-green-800" : invoice.externalInvoiceTotal === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          {invoice.externalInvoiceTotal?.toFixed(1) === invoice.totalAmount?.toFixed(1) ? "Not Mismatch" : invoice.externalInvoiceTotal === 0 ? "Not Mismatch" : "Amount Mismatch"}
                        </span>
                      </div>
                    </td>}
                    {invoiceType === 'sale' && <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                        {invoice.paymentStatus.charAt(0).toUpperCase() + invoice.paymentStatus.slice(1)}
                      </span>
                    </td>}
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {getAvailableActions(invoice).map((action, index) => (
                          <button
                            key={index}
                            onClick={action.action}
                            className={`${action.color} p-2 rounded-lg transition-colors hover:shadow-md`}
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalDatas}
        itemsPerPage={limit}
      />

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {invoiceType === 'quotation'
                  ? 'Create New Quotation'
                  : invoiceType === 'sale'
                    ? 'Create New Sales Invoice'
                    : invoiceType === 'purchase'
                      ? 'Create New Purchase Invoice'
                      : 'Create New Delivery Challan'}
              </h2>
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    From Location *
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
                            setNewInvoice({ ...newInvoice, customer: '', address: '' });
                            setShowCustomerDropdown(false);
                            setAddresses([]);
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
                              setNewInvoice({ ...newInvoice, customer: customer._id, address: '' });
                              setShowCustomerDropdown(false);
                              setAddresses(customer.addresses || []);
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
                    Delivery Address
                  </label>
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                      disabled={!newInvoice.customer}
                      className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${!newInvoice.customer ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'}`}
                    >
                      <span className="text-gray-700 truncate mr-1">{getAddressLabel(newInvoice.address)}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showAddressDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showAddressDropdown && newInvoice.customer && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                        <button
                          onClick={() => {
                            setNewInvoice({ ...newInvoice, address: '' });
                            setShowAddressDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!newInvoice.address ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          Select address
                        </button>
                        {addresses.map(address => (
                          <button
                            key={address.id}
                            onClick={() => {
                              setNewInvoice({ ...newInvoice, address: address.id.toString() });
                              setShowAddressDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${newInvoice.address === address.id.toString() ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                          >
                            <div>
                              <div className="font-medium">{address.address}</div>
                              <div className="text-xs text-gray-500">{address.district}, {address.pincode}</div>
                              {address.isPrimary && (
                                <div className="text-xs text-blue-600 font-medium">Primary</div>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
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

                {/* Reference No. & Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference No
                  </label>
                  <input
                    type="text"
                    placeholder='Reference No'
                    value={newInvoice.referenceNo}
                    onChange={e => setNewInvoice({ ...newInvoice, referenceNo: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.referenceNo ? 'border-red-500' : 'border-gray-300'
                      }`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700">Reference Date</label>
                  <input
                    type="date"
                    value={newInvoice.referenceDate}
                    onChange={e => setNewInvoice({ ...newInvoice, referenceDate: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.referenceDate ? 'border-red-500' : 'border-gray-300'
                      }`} />
                </div>
                <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Type</label>
  <div className="relative dropdown-container">
    <button
      onClick={() => {
        if (invoiceType !== 'challan') {
          setShowInvoiceTypeDropdown(prev => !prev);
        }
      }}
      disabled={invoiceType === 'challan'}
      className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg transition-colors ${
        invoiceType === 'challan'
          ? 'bg-gray-100 cursor-not-allowed border-gray-300'
          : 'bg-white border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
      }`}
    >
      <span className="text-gray-700 truncate mr-1">
        {getInvoiceTypeLabel(invoiceType)} {/* Use invoiceType here */}
      </span>
      <ChevronDown
        className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
          showInvoiceTypeDropdown ? 'rotate-180' : ''
        }`}
      />
    </button>

    {showInvoiceTypeDropdown && (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
        {INVOICE_TYPES.map(option => (
          <button
            key={option.value}
            onClick={() => {
              setInvoiceType(option.value as any);
              setNewInvoice(prev => ({ ...prev, invoiceType: option.value as any }));
              setShowInvoiceTypeDropdown(false);
            }}
            className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${
              invoiceType === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                  {newInvoice.items.map((item, index) => {
                    const stockInfo = stockValidation[index];
                    let cardBg = 'bg-white';
                    if (stockInfo) {
                      if (stockInfo.available === 0) cardBg = 'bg-red-100';
                      else if (stockInfo.isValid) cardBg = 'bg-green-50';
                      else cardBg = 'bg-red-50';
                    }
                    return (
                      <div key={index} className={`border rounded-lg p-4 ${cardBg}`}>
                        {/* Row 1: Product Selection and Description */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Product *
                            </label>
                            <div className="relative dropdown-container">
                              <button
                                onClick={() => setShowProductDropdowns({
                                  ...showProductDropdowns,
                                  [index]: !showProductDropdowns[index]
                                })}
                                className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors[`item_${index}_product`] ? 'border-red-500' : 'border-gray-300'} hover:border-gray-400`}
                              >
                                <span className="text-gray-700 truncate mr-1">{getProductLabel(item.product)}</span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showProductDropdowns[index] ? 'rotate-180' : ''}`} />
                              </button>
                              {showProductDropdowns[index] && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-hidden flex flex-col">
                                  <div className="p-2 border-b border-gray-200">
                                    <input
                                      type="text"
                                      placeholder="Search products..."
                                      value={productSearchTerms[index] || ''}
                                      onChange={(e) => updateProductSearchTerm(index, e.target.value)}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="overflow-y-auto max-h-60 py-0.5">
                                    <button
                                      onClick={() => {
                                        updateInvoiceItem(index, 'product', '');
                                        setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                        updateProductSearchTerm(index, '');
                                      }}
                                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!item.product ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                    >
                                      Select product
                                    </button>
                                    {getFilteredProducts(productSearchTerms[index] || '').length === 0 ? (
                                      <div className="px-3 py-2 text-sm text-gray-500">No products found</div>
                                    ) : (
                                      getFilteredProducts(productSearchTerms[index] || '').map(product => (
                                        <button
                                          key={product._id}
                                          onClick={() => {
                                            updateInvoiceItem(index, 'product', product._id);
                                            setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                            updateProductSearchTerm(index, '');
                                          }}
                                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${item.product === product._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                        >
                                          <div>
                                            <div className="font-medium">{product?.name}</div>
                                            <div className="text-xs text-gray-500">₹{product?.price?.toLocaleString()} • {product?.category}</div>
                                          </div>
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            {formErrors[`item_${index}_product`] && (
                              <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_product`]}</p>
                            )}
                          </div>

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
                            {/* Show available stock info below description */}
                            {stockInfo && (
                              <div className="text-xs mt-1">
                                <span className={stockInfo.available === 0 ? 'text-red-600 font-bold' : stockInfo.isValid ? 'text-gray-500' : 'text-red-600 font-semibold'}>
                                  Available: {stockInfo.available} units
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 2: HSN/SAC, GST, Part No, Quantity, UOM */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              HSN/SAC
                            </label>
                            <input
                              type="text"
                              value={item.hsnNumber || ''}
                              onChange={(e) => updateInvoiceItem(index, 'hsnNumber', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="HSN/SAC"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              GST %
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.gst || ''}
                              onChange={(e) => updateInvoiceItem(index, 'gst', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Part No
                            </label>
                            <input
                              type="text"
                              value={item.partNo || ''}
                              onChange={(e) => updateInvoiceItem(index, 'partNo', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Part number"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              min="1"
                              max={stockInfo?.available || undefined}
                              value={item.quantity}
                              onChange={(e) => updateInvoiceItem(index, 'quantity', parseFloat(e.target.value))}
                              disabled={stockInfo?.available === 0}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`item_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'} ${stockInfo?.available === 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                            />
                            {formErrors[`item_${index}_quantity`] && (
                              <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_quantity`]}</p>
                            )}
                            {formErrors[`item_${index}_stock`] && (
                              <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_stock`]}</p>
                            )}
                          </div>

                          <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              UOM
                            </label>
                            <div className="relative">
                              <button
                                onClick={() => setShowUomDropdowns({
                                  ...showUomDropdowns,
                                  [index]: !showUomDropdowns[index]
                                })}
                                className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400"
                              >
                                <span className="text-gray-700">{item.uom || 'pcs'}</span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showUomDropdowns[index] ? 'rotate-180' : ''}`} />
                              </button>
                              {showUomDropdowns[index] && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-hidden flex flex-col">
                                  <div className="p-2 border-b border-gray-200">
                                    <input
                                      type="text"
                                      placeholder="Search UOM..."
                                      value={uomSearchTerms[index] || ''}
                                      onChange={(e) => updateUomSearchTerm(index, e.target.value)}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="overflow-y-auto max-h-48 py-0.5">
                                    {getFilteredUomOptions(uomSearchTerms[index] || '').length === 0 ? (
                                      <div className="px-3 py-2 text-sm text-gray-500">No UOM found</div>
                                    ) : (
                                      getFilteredUomOptions(uomSearchTerms[index] || '').map(uomOption => (
                                        <button
                                          key={uomOption}
                                          onClick={() => {
                                            updateInvoiceItem(index, 'uom', uomOption);
                                            setShowUomDropdowns({ ...showUomDropdowns, [index]: false });
                                            updateUomSearchTerm(index, '');
                                          }}
                                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${item.uom === uomOption ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                        >
                                          {uomOption}
                                        </button>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Row 3: Unit Price, Discount, Total, Remove Button */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Unit Price (₹) *
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value))}
                              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'}`}
                              placeholder="0.00"
                            />
                            {formErrors[`item_${index}_price`] && (
                              <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_price`]}</p>
                            )}
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Discount (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              value={item.discount || ''}
                              onChange={(e) => {
                                updateInvoiceItem(index, 'discount', parseFloat(e.target.value) || 0);
                                // Auto-calculate discountAmount based on item discounts
                                const updatedItems = [...newInvoice.items];
                                updatedItems[index] = { ...updatedItems[index], discount: parseFloat(e.target.value) || 0 };

                                const totalItemDiscounts = updatedItems.reduce((sum, item) => {
                                  const subtotal = item.quantity * item.unitPrice || 0;
                                  const itemDiscount = (item.discount || 0) * subtotal / 100;
                                  return sum + itemDiscount;
                                }, 0);

                                setNewInvoice(prev => ({
                                  ...prev,
                                  discountAmount: totalItemDiscounts
                                }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total (₹)
                            </label>
                            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium">
                              ₹{calculateItemTotal(item).toLocaleString() || 0}
                            </div>
                          </div>

                          <div>
                            {newInvoice.items.length > 1 && (
                              <button
                                onClick={() => removeInvoiceItem(index)}
                                type="button"
                                className="w-full p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                              >
                                <X className="w-4 h-4 mx-auto" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                <div className="flex justify-end">

                  {/* <div className=''>
                    <div className="flex items-center space-x-2 mb-4">
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
                  </div> */}

                  <div className="w-80 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{calculateSubtotal().toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Tax:</span>
                      <span className="font-medium">₹{calculateTotalTax().toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Discount:</span>
                      <span className="font-medium text-green-600">-₹{calculateTotalDiscount().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-3">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">₹{calculateGrandTotal().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amount in Words:</span>
                      <span>{/* TODO: Convert to words */}</span>
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
                      <span>
                        {invoiceType === 'quotation' ? 'Create Quotation' :
                          invoiceType === 'sale' ? 'Create Invoice' :
                            invoiceType === 'purchase' ? 'Create Purchase' :
                              invoiceType === 'challan' ? 'Create Challan' : 'Create Invoice'}
                      </span>
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


        // Updated Modal Component with Print Options
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Invoice - {selectedInvoice.invoiceNumber ?? ''}</h2>
              <div className="flex items-center space-x-2">
                {/* Print Options */}
                <button
                  onClick={generatePDF}
                  className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
                <button
                  onClick={printInvoice}
                  className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    setEditMode(false);
                    setOriginalInvoiceData(null); // Clear backup data
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6">
              {/* Rest of your existing modal content remains the same */}
              {/* Invoice Header */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Invoice #{selectedInvoice.invoiceNumber ?? ''}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Issue Date: {selectedInvoice.issueDate ? new Date(selectedInvoice.issueDate).toLocaleDateString() : ''}
                    </p>
                    <p className="text-sm text-gray-600">
                      Due Date: {selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : ''}
                    </p>
                    {selectedInvoice.poNumber && <p className="text-sm text-black-600 mt-1 font-medium">
                    PONumber: {selectedInvoice.poNumber ? selectedInvoice.poNumber : ''}
                    </p>}
                  </div>
                  <div className="text-right">
                    <div className="flex space-x-2 mb-2">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedInvoice.status ?? '')}`}>
                        {(selectedInvoice.status ?? '').charAt(0).toUpperCase() + (selectedInvoice.status ?? '').slice(1)}
                      </span>
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(selectedInvoice.paymentStatus ?? '')}`}>
                        {(selectedInvoice.paymentStatus ?? '').charAt(0).toUpperCase() + (selectedInvoice.paymentStatus ?? '').slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Bill To:</h4>
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{selectedInvoice?.customerAddress ? selectedInvoice?.customerAddress.address : selectedInvoice?.supplierAddress ?? ''}</p>
                  <p className="font-medium">{selectedInvoice?.customerAddress ? selectedInvoice?.customerAddress.district : selectedInvoice?.supplierDistrict ?? ''}</p>
                  <p className="font-medium">{selectedInvoice?.customerAddress ? selectedInvoice?.customerAddress.state : selectedInvoice?.supplierState ?? ''}</p>
                  <p className="font-medium">{selectedInvoice?.customerAddress ? selectedInvoice?.customerAddress.pincode : selectedInvoice?.supplierPincode ?? ''}</p>
                  <p>{selectedInvoice?.customer ? selectedInvoice?.customer.email : selectedInvoice?.supplierEmail ?? ''}</p>
                  <p>{selectedInvoice?.customer ? selectedInvoice?.customer.phone : ''}</p>
                </div>
              </div>

              {/* Total Amount Mismatch Warning */}
              {selectedInvoice?.externalInvoiceTotal !== 0 && selectedInvoice?.totalAmount !== selectedInvoice?.externalInvoiceTotal && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-yellow-800">Amount Mismatch Detected</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Calculated Total: ₹{(selectedInvoice?.totalAmount ?? 0).toFixed(2)} |
                        External Total: ₹{(selectedInvoice?.externalInvoiceTotal ?? 0).toFixed(2)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        // Create a backup of current state when entering edit mode
                        if (selectedInvoice && !originalInvoiceData) {
                          setOriginalInvoiceData(JSON.parse(JSON.stringify(selectedInvoice)));
                        }
                        setEditMode(true);
                      }}
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
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tax</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        {editMode && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(selectedInvoice.items || []).map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item?.product?.partNo}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {editMode ? (
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => handleItemEdit(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                onBlur={() => recalculateItem(index)}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="1"
                              />
                            ) : (
                              `₹${(item.unitPrice ?? 0).toLocaleString()}`
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {editMode ? (
                              <input
                                type="number"
                                value={item.taxRate}
                                onChange={(e) => handleItemEdit(index, 'taxRate', parseFloat(e.target.value) || 0)}
                                onBlur={() => recalculateItem(index)}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="1"
                                min="0"
                                max="100"
                              />
                            ) : (
                              `${item.taxRate ?? 0}%`
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">₹{((item.quantity ?? 0) * (item.unitPrice ?? 0) + ((item.quantity ?? 0) * (item.unitPrice ?? 0) * (item.taxRate || 0) / 100)).toFixed(2)}</td>
                          {editMode && item.quantity !== 0 && (
                            <td className="px-4 py-2 flex text-sm">
                              <button
                                onClick={autoAdjustTaxRates}
                                className="ml-3 bg-indigo-600 text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-700"
                              >
                                Auto Adjust Tax
                              </button>
                              <button
                                onClick={autoAdjustUnitPrice}
                                className="ml-3 bg-indigo-600 text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-700"
                              >
                                Auto Adjust Price</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>



              {/* Edit Mode Actions */}
              {editMode && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <p>Make adjustments to unit prices and tax rates to match the external total.</p>
                      <p className="font-medium mt-1">Target Total: ₹{(selectedInvoice?.externalInvoiceTotal ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          // Restore original values when canceling
                          if (originalInvoiceData) {
                            setSelectedInvoice(JSON.parse(JSON.stringify(originalInvoiceData)));
                          }
                          setEditMode(false);
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          await handleSaveChanges();
                          // Update the original data after successful save
                          if (selectedInvoice) {
                            setOriginalInvoiceData(JSON.parse(JSON.stringify(selectedInvoice)));
                          }
                        }}
                        disabled={savingChanges}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingChanges ? (
                          <div className="flex items-center">
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                            Saving...
                          </div>
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Total */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 text-right">
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{(selectedInvoice.items || []).reduce((sum: number, item: any) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0)), 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Tax:</span>
                        <span>₹{(selectedInvoice.items || []).reduce((sum: number, item: any) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0) * (item.taxRate ?? 0) / 100), 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Items Count:</span>
                        <span>{(selectedInvoice.items || []).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Quantity:</span>
                        <span>{(selectedInvoice.items || []).reduce((sum: number, item: any) => sum + (item.quantity ?? 0), 0)}</span>
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Amount:</span>
                        <span className={selectedInvoice?.externalInvoiceTotal !== 0 && selectedInvoice?.totalAmount !== selectedInvoice?.externalInvoiceTotal ? 'text-red-600' : 'text-gray-900'}>
                          ₹{safeToFixed(selectedInvoice?.totalAmount)}
                        </span>
                      </div>
                      {selectedInvoice?.externalInvoiceTotal !== 0 && selectedInvoice?.totalAmount !== selectedInvoice?.externalInvoiceTotal && (
                        <div className="flex justify-between text-sm text-gray-600 mt-1">
                          <span>External Total:</span>
                          <span>₹{safeToFixed(selectedInvoice?.externalInvoiceTotal)}</span>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
            {/* Fixed Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Update Payment</h2>
                <p className="text-sm text-gray-600 mt-1">Process payment for invoice #{selectedInvoice.invoiceNumber}</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="px-6 pt-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Left Column - Invoice Summary & Payment Info */}
                <div className="space-y-6">
                  {/* Invoice Summary Card */}
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-bold text-sm">₹</span>
                      </div>
                      Invoice Summary
                    </h3>

                    <div className="text-sm text-gray-600 mb-4">
                      Invoice: <span className="font-medium text-gray-900">{selectedInvoice.invoiceNumber}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <span className="text-gray-500 text-sm">Total Amount</span>
                        <div className="text-2xl font-bold text-gray-900">₹{selectedInvoice.totalAmount.toLocaleString()}</div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <span className="text-gray-500 text-sm">Already Paid</span>
                        <div className="text-2xl font-bold text-green-600">₹{(selectedInvoice.paidAmount || 0).toLocaleString()}</div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <span className="text-gray-500 text-sm">Remaining</span>
                        <div className="text-2xl font-bold text-red-600">₹{(selectedInvoice.remainingAmount || selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <span className="text-sm text-gray-500">Payment Status:</span>
                      <span className={`ml-2 inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(selectedInvoice.paymentStatus)}`}>
                        {selectedInvoice.paymentStatus.charAt(0).toUpperCase() + selectedInvoice.paymentStatus.slice(1)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Gateway Selection */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                      <CreditCard className="w-5 h-5 mr-3" />
                      Payment Gateway
                    </h3>

                    <div className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="manual-payment"
                            name="payment-gateway"
                            checked={!paymentUpdate.useRazorpay}
                            onChange={() => setPaymentUpdate({ ...paymentUpdate, useRazorpay: false })}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor="manual-payment" className="text-sm font-medium text-blue-800">
                            Manual Payment Entry
                          </label>
                        </div>
                        <p className="text-xs text-blue-600 mt-2 ml-7">Record payment received through other means</p>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-3">
                          <input
                            type="radio"
                            id="razorpay-payment"
                            name="payment-gateway"
                            checked={paymentUpdate.useRazorpay}
                            onChange={() => setPaymentUpdate({ ...paymentUpdate, useRazorpay: true })}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <label htmlFor="razorpay-payment" className="text-sm font-medium text-blue-800">
                            Razorpay Gateway
                          </label>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Secure</span>
                        </div>

                        {paymentUpdate.useRazorpay && (
                          <div className="mt-3 space-y-2">
                            <div className="flex items-center space-x-2 text-xs text-blue-700">
                              <CheckCircle className="w-3 h-3" />
                              <span>Secure payment page redirect</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-blue-700">
                              <CheckCircle className="w-3 h-3" />
                              <span>UPI, Cards, Net Banking, Wallets</span>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-blue-700">
                              <CheckCircle className="w-3 h-3" />
                              <span>Real-time verification</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary */}
                  {paymentUpdate.paidAmount > 0 && (
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-200 shadow-sm">
                      <h3 className="text-lg font-semibold text-yellow-800 mb-4 flex items-center">
                        <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-yellow-600 font-bold text-sm">Σ</span>
                        </div>
                        Payment Summary
                      </h3>

                      <div className="space-y-3">
                        {selectedInvoice.paymentStatus === 'partial' && (
                          <div className="flex justify-between items-center py-2 border-b border-yellow-200">
                            <span className="text-yellow-700">Previously Paid:</span>
                            <span className="font-semibold text-yellow-800">₹{(selectedInvoice.paidAmount || 0).toLocaleString()}</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center py-2 border-b border-yellow-200">
                          <span className="text-yellow-700">New Payment:</span>
                          <span className="font-semibold text-yellow-800">₹{paymentUpdate.paidAmount.toLocaleString()}</span>
                        </div>

                        {paymentUpdate.paidAmount < selectedInvoice.totalAmount && (
                          <div className="flex justify-between items-center py-2">
                            <span className="text-yellow-700">Remaining Balance:</span>
                            <span className="font-semibold text-red-600">₹{(selectedInvoice.remainingAmount - paymentUpdate.paidAmount).toLocaleString()}</span>
                          </div>
                        )}

                        {paymentUpdate.paidAmount >= selectedInvoice.totalAmount && (
                          <div className="bg-green-100 p-3 rounded-lg">
                            <div className="flex items-center text-green-800">
                              <CheckCircle className="w-5 h-5 mr-2" />
                              <span className="font-semibold">Invoice will be marked as PAID</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column - Payment Form */}
                <div className="space-y-6">

                  {/* Payment Amount */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-green-600 font-bold text-sm">₹</span>
                      </div>
                      Payment Amount
                    </h3>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {selectedInvoice.paymentStatus === 'partial' ? 'Additional Payment Amount (₹) *' : 'Payment Amount (₹) *'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-3 text-gray-500">₹</span>
                        <input
                          type="number"
                          min="0"
                          max={selectedInvoice.remainingAmount}
                          step="1"
                          value={paymentUpdate.paidAmount}
                          onChange={(e) => {
                            const amount = parseFloat(e.target.value) || 0;
                            const remainingAmount = selectedInvoice.remainingAmount || (selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0));

                            let newPaymentStatus = paymentUpdate.paymentStatus;
                            if (amount >= remainingAmount) {
                              newPaymentStatus = 'paid';
                            } else if (amount > 0) {
                              newPaymentStatus = 'partial';
                            } else {
                              newPaymentStatus = 'pending';
                            }

                            setPaymentUpdate({
                              ...paymentUpdate,
                              paidAmount: amount,
                              paymentStatus: newPaymentStatus
                            });

                            if (formErrors.paidAmount && amount > 0 && amount <= remainingAmount) {
                              setFormErrors(prev => ({ ...prev, paidAmount: '' }));
                            }
                          }}
                          className={`w-full pl-8 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-semibold ${formErrors.paidAmount ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="0"
                        />
                      </div>
                      {formErrors.paidAmount && (
                        <p className="text-red-500 text-sm mt-2">{formErrors.paidAmount}</p>
                      )}
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      {selectedInvoice.paymentStatus === 'partial' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setPaymentUpdate({
                              ...paymentUpdate,
                              paidAmount: Math.round((selectedInvoice.remainingAmount || selectedInvoice.remainingAmount - (selectedInvoice.paidAmount || 0)) * 0.5),
                              paymentStatus: 'partial'
                            })}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                          >
                            Half Remaining
                            <div className="text-xs">₹{Math.round(((selectedInvoice.remainingAmount || selectedInvoice.remainingAmount - (selectedInvoice.paidAmount || 0)) * 0.5)).toLocaleString()}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentUpdate({
                              ...paymentUpdate,
                              paidAmount: selectedInvoice.remainingAmount,
                              paymentStatus: 'paid'
                            })}
                            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                          >
                            Full Remaining
                            <div className="text-xs">₹{(selectedInvoice.remainingAmount || selectedInvoice.totalAmount - (selectedInvoice.paidAmount || 0)).toLocaleString()}</div>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setPaymentUpdate({
                              ...paymentUpdate,
                              paidAmount: Math.round(selectedInvoice.remainingAmount * 0.5),
                              paymentStatus: 'partial'
                            })}
                            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                          >
                            50% Payment
                            <div className="text-xs">₹{Math.round(selectedInvoice.remainingAmount * 0.5).toLocaleString()}</div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPaymentUpdate({
                              ...paymentUpdate,
                              paidAmount: selectedInvoice.remainingAmount,
                              paymentStatus: 'paid'
                            })}
                            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                          >
                            Full Amount
                            <div className="text-xs">₹{selectedInvoice.remainingAmount.toLocaleString()}</div>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-purple-600 font-bold text-sm">i</span>
                      </div>
                      Payment Details
                    </h3>

                    <div className="space-y-4">
                      {/* Payment Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Status
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => setShowPaymentStatusDropdown(!showPaymentStatusDropdown)}
                            className="flex items-center justify-between w-full px-4 py-3 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 bg-gray-50"
                          >
                            <span className="text-gray-700 font-medium">{getPaymentStatusLabel(paymentUpdate.paymentStatus)}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPaymentStatusDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          {formErrors.paymentStatus && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.paymentStatus}</p>
                          )}
                          {showPaymentStatusDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                              {[
                                { value: 'pending', label: 'Pending', color: 'text-yellow-600' },
                                { value: 'partial', label: 'Partial Payment', color: 'text-blue-600' },
                                { value: 'paid', label: 'Paid in Full', color: 'text-green-600' },
                                { value: 'failed', label: 'Payment Failed', color: 'text-red-600' }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    let newPaidAmount = paymentUpdate.paidAmount;
                                    if (option.value === 'partial' && paymentUpdate.paidAmount === 0) {
                                      newPaidAmount = Math.round(selectedInvoice.remainingAmount * 0.5);
                                    } else if (option.value === 'paid') {
                                      newPaidAmount = selectedInvoice.remainingAmount;
                                    }

                                    setPaymentUpdate({
                                      ...paymentUpdate,
                                      paidAmount: newPaidAmount,
                                      paymentStatus: option.value
                                    });
                                    setShowPaymentStatusDropdown(false);

                                    if (formErrors.paymentStatus) {
                                      setFormErrors(prev => ({ ...prev, paymentStatus: '' }));
                                    }
                                  }}
                                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${option.color} ${paymentUpdate.paymentStatus === option.value ? 'bg-blue-50' : ''
                                    }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => setShowPaymentMethodDropdown(!showPaymentMethodDropdown)}
                            className="flex items-center justify-between w-full px-4 py-3 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 bg-gray-50"
                          >
                            <span className="text-gray-700 font-medium">{getPaymentMethodLabel(paymentUpdate.paymentMethod)}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showPaymentMethodDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          {formErrors.paymentMethod && (
                            <p className="text-red-500 text-sm mt-1">{formErrors.paymentMethod}</p>
                          )}
                          {showPaymentMethodDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
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

                                    if (formErrors.paymentMethod && option.value) {
                                      setFormErrors(prev => ({ ...prev, paymentMethod: '' }));
                                    }
                                  }}
                                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${paymentUpdate.paymentMethod === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                    }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Payment Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          value={paymentUpdate.paymentDate}
                          onChange={(e) => {
                            setPaymentUpdate({ ...paymentUpdate, paymentDate: e.target.value });

                            if (formErrors.paymentDate && e.target.value) {
                              const paymentDate = new Date(e.target.value);
                              const today = new Date();
                              today.setHours(23, 59, 59, 999);
                              if (paymentDate <= today) {
                                setFormErrors(prev => ({ ...prev, paymentDate: '' }));
                              }
                            }
                          }}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 ${formErrors.paymentDate ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {formErrors.paymentDate && (
                          <p className="text-red-500 text-sm mt-1">{formErrors.paymentDate}</p>
                        )}
                      </div>

                      {/* Payment Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Notes
                        </label>
                        <textarea
                          value={paymentUpdate.notes}
                          onChange={(e) => setPaymentUpdate({ ...paymentUpdate, notes: e.target.value })}
                          rows={4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-50"
                          placeholder="Transaction ID, reference number, or other payment details..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Messages */}
              {(formErrors.general || formErrors.razorpay || Object.keys(formErrors).length > 0) && (
                <div className="mt-6 space-y-4">
                  {formErrors.general && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-red-600 font-bold text-sm">!</span>
                        </div>
                        <div>
                          <div className="font-medium text-red-800">Error</div>
                          <div className="text-red-700">{formErrors.general}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {formErrors.razorpay && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                          <CreditCard className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium text-red-800">Razorpay Configuration Error</div>
                          <div className="text-red-700">{formErrors.razorpay}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fixed Bottom Action Buttons */}
              <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 mt-5 z-10">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitPaymentUpdate}
                    disabled={!isPaymentFormValid() || submitting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg"
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      paymentUpdate.useRazorpay ? 'Proceed to Payment' : 'Update Payment'
                    )}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Quotation Modal */}
      {showQuotationForm && (
        <QuotationForm
          isOpen={showQuotationForm}
          onClose={() => setShowQuotationForm(false)}
          onSuccess={() => {
            setShowQuotationForm(false);
            fetchQuotations();
          }}
          customers={customers}
          products={products}
          mode={modalMode}
          generalSettings={generalSettings}
          initialData={selectedQuotation}
          quotationId={selectedQuotation?._id}
        />
      )}

      {/* Quotation View Modal */}
      {showQuotationViewModal && selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Quotation {selectedQuotation.quotationNumber}</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => printQuotation(selectedQuotation)}
                  className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <button
                  onClick={() => setShowQuotationViewModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Quotation Header */}
              <div className="border-b border-gray-200 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Quotation #{selectedQuotation.quotationNumber}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Issue Date: {selectedQuotation.issueDate ? new Date(selectedQuotation.issueDate).toLocaleDateString() : ''}
                    </p>
                    <p className="text-sm text-gray-600">
                      Valid Until: {selectedQuotation.validUntil ? new Date(selectedQuotation.validUntil).toLocaleDateString() : ''}
                    </p>
                    <p className="text-sm text-gray-600">
                      Validity Period: {selectedQuotation.validityPeriod || 30} days
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">
                      Quotation
                    </span>
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">From:</h4>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{selectedQuotation.company?.name || 'Sun Power Services'}</p>
                    <p>{selectedQuotation.company?.address || ''}</p>
                    <p>Phone: {selectedQuotation.company?.phone || 'N/A'}</p>
                    <p>Email: {selectedQuotation.company?.email || 'N/A'}</p>
                    <p>PAN: {selectedQuotation.company?.pan || 'N/A'}</p>
                    {/* {selectedQuotation.company?.bankDetails && (
                      <div className="mt-2">
                        <p className="font-medium text-gray-700">Bank Details:</p>
                        <p>Bank: {selectedQuotation.company.bankDetails.bankName || 'N/A'}</p>
                        <p>Account: {selectedQuotation.company.bankDetails.accountNo || 'N/A'}</p>
                        <p>IFSC: {selectedQuotation.company.bankDetails.ifsc || 'N/A'}</p>
                        <p>Branch: {selectedQuotation.company.bankDetails.branch || 'N/A'}</p>
                      </div>
                    )} */}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">To:</h4>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{selectedQuotation.customer?.name || 'N/A'}</p>
                    <p>Email: {selectedQuotation.customer?.email || 'N/A'}</p>
                    <p>Phone: {selectedQuotation.customer?.phone || 'N/A'}</p>
                    {/* <p>PAN: {selectedQuotation.customer?.pan || 'N/A'}</p> */}
                    <p>Address: {`${selectedQuotation.customer?.address} (${selectedQuotation.customer?.district}, ${selectedQuotation.customer?.state}, ${selectedQuotation.customer?.pincode})` || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Quotation Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Items:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">HSN Code</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tax Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(selectedQuotation.items || []).map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.hsnCode || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.uom}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.partNo || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">₹{item.unitPrice?.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.discount || 0}%</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.taxRate || 0}%</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900"> ₹{(item.unitPrice * item.quantity * (1 - item.discount / 100) * (1 + item.taxRate / 100)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quotation Summary */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2 text-right">
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>₹{selectedQuotation.subtotal?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Discount:</span>
                        <span className="text-green-600">-₹{selectedQuotation.totalDiscount?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Tax:</span>
                        <span>₹{selectedQuotation.totalTax?.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Grand Total:</span>
                        <span className="text-blue-600">₹{selectedQuotation.grandTotal?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes and Terms */}
              {(selectedQuotation.notes || selectedQuotation.terms) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedQuotation.notes && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Notes:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {selectedQuotation.notes}
                      </p>
                    </div>
                  )}
                  {selectedQuotation.terms && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Terms & Conditions:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {selectedQuotation.terms}
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
     
    </div>
  );
};

export default InvoiceManagement; 