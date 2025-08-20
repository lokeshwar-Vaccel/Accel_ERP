import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
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
  TrendingDown,
  IndianRupee,
  Printer,
  Receipt,
  Calculator
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import { Modal } from '../components/ui/Modal';
import PageHeader from '../components/ui/PageHeader';
import { Tooltip } from '../components/ui/Tooltip';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { apiClient } from '../utils/api';
import { RootState } from '../redux/store';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { Pagination } from 'components/ui/Pagination';
import apiClientQuotation from '../utils/api';
import UpdatePaymentModal from '../components/UpdatePaymentModal';


// Types
interface Invoice {
  _id: string;
  invoiceNumber: string;
  customer: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    addresses?: Array<{
      id: number;
      address: string;
      state: string;
      district: string;
      pincode: string;
      isPrimary: boolean;
      gstNumber?: string;
    }>;
  };
  user?: {
    firstName?: string;
    email?: string;
  };
  issueDate: string;
  dueDate: string;
  supplier: {
    _id: string;
    name: string;
    email: string;
    addresses: Array<{
      id: number;
      address: string;
      state: string;
      district: string;
      pincode: string;
      isPrimary: boolean;
      gstNumber?: string;
    }>;
  };
  supplierEmail: string;
  externalInvoiceNumber: string;
  externalInvoiceTotal: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  discountAmount?: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
  invoiceType: 'quotation' | 'sale' | 'purchase' | 'challan';
  items: InvoiceItem[];
  referenceNo?: string;
  referenceDate?: string;
  buyersOrderNo?: string;
  buyersOrderDate?: string;
  poNumber?: string;
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
  // New detailed address fields
  customerAddress?: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
  billToAddress?: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
  shipToAddress?: {
    id: number;
    address: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
  supplierAddress?: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
  sourceQuotation?: {
    _id: string;
    quotationNumber: string;
    customer: {
      _id: string;
      name: string;
      email: string;
      phone: string;
      addresses?: Array<{
        id: number;
        address: string;
        state: string;
        district: string;
        pincode: string;
        isPrimary: boolean;
        gstNumber?: string;
      }>;
    };
    issueDate: string;
    validUntil: string;
    validityPeriod: number;
    grandTotal: number;
    paidAmount: number;
    remainingAmount: number;
    paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
    paymentMethod?: string;
    paymentDate?: string;
    notes?: string;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
    items: any[];
    company?: any;
    location?: any;
    assignedEngineer?: any;
    billToAddress?: any;
    shipToAddress?: any;
    terms?: string;
    subtotal?: number;
    totalTax?: number;
    totalDiscount?: number;
    overallDiscount?: number;
    overallDiscountAmount?: number;
    paymentDetails?: {
      paidAmount: number;
      remainingAmount: number;
    };
  };
  quotationPaymentDetails?: {
    paidAmount: number;
    remainingAmount: number;
  };
}

interface InvoiceItem {
  product: string; // Use string for product id in form state
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  // totalPrice and taxAmount are calculated, not needed in form state
  hsnNumber?: string;
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
  type: string;
  addresses?: Array<{
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
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
  // hsnSac?: string;
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
  poNumber?: string;
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
  // New detailed address fields
  customerAddress?: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
  billToAddress?: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
  shipToAddress?: {
    id: number;
    address: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
  supplierAddress?: {
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  };
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

// Add advance payment fields to the quotation interface
interface Quotation {
  _id: string;
  quotationNumber: string;
  customer: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    addresses?: Array<{
      id: number;
      address: string;
      state: string;
      district: string;
      pincode: string;
      isPrimary: boolean;
      gstNumber?: string;
    }>;
  };
  issueDate: string;
  validUntil: string;
  validityPeriod: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
  paymentMethod?: string;
  paymentDate?: string;
  notes?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  items: any[];
  company?: any;
  location?: any;
  assignedEngineer?: any;
  billToAddress?: any;
  shipToAddress?: any;
  terms?: string;
  subtotal?: number;
  totalTax?: number;
  totalDiscount?: number;
  overallDiscount?: number;
  overallDiscountAmount?: number;
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
  // Navigation hook
  const navigate = useNavigate();

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
  const [searchQuotationTerm, setSearchQuotationTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [quotations, setQuotations] = useState<any[]>([]);
  const [quotationLoading, setQuotationLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDatas, setTotalDatas] = useState(0);
  const [sort, setSort] = useState('-createdAt');



  // Custom dropdown states
  const [showStatusFilterDropdown, setShowStatusFilterDropdown] = useState(false);
  const [showPaymentFilterDropdown, setShowPaymentFilterDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showInvoiceTypeDropdown, setShowInvoiceTypeDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
  const [showStatusUpdateDropdown, setShowStatusUpdateDropdown] = useState(false);
  const [showPaymentStatusDropdown, setShowPaymentStatusDropdown] = useState(false);
  const [showPaymentMethodDropdown, setShowPaymentMethodDropdown] = useState(false);



  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  // Initialize invoiceType from localStorage or default to 'quotation'
  const [invoiceType, setInvoiceType] = useState<'quotation' | 'sale' | 'purchase' | 'challan'>(() => {
    const savedInvoiceType = localStorage.getItem('selectedInvoiceType');
    return (savedInvoiceType as 'quotation' | 'sale' | 'purchase' | 'challan') || 'quotation';
  });

  console.log("selectedInvoice123:",selectedInvoice);
  

  // Custom setter function that updates both state and localStorage
  const updateInvoiceType = (newType: 'quotation' | 'sale' | 'purchase' | 'challan') => {
    setInvoiceType(newType);
    localStorage.setItem('selectedInvoiceType', newType);
  };

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
        hsnNumber: '',
        uom: 'nos',
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
    // Initialize new detailed address fields
    customerAddress: undefined,
    billToAddress: undefined,
    shipToAddress: undefined,
    supplierAddress: undefined,
  });

  // Stock validation states
  const [stockValidation, setStockValidation] = useState<Record<number, {
    available: number;
    isValid: boolean;
    message: string;
  }>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});



  const [editMode, setEditMode] = useState(false);
  const [editModeChanges, setEditModeChanges] = useState(true);

  // Helper function to check if there's a real amount mismatch that allows editing
  const [originalInvoiceData, setOriginalInvoiceData] = useState<any>(null);
  const [savingChanges, setSavingChanges] = useState(false);

  const hasAmountMismatch = (invoice: any) => {
    if (!invoice) return false;

    const externalTotal = invoice.externalInvoiceTotal ?? 0;
    const calculatedTotal = invoice.totalAmount ?? 0;

    // Only allow editing if:
    // 1. External total is not empty/zero
    // 2. External total is different from calculated total
    return externalTotal !== 0 &&
      calculatedTotal !== 0 &&
      externalTotal.toFixed(2) !== calculatedTotal.toFixed(2);
  };

  // Auto-exit edit mode when amount mismatch conditions are no longer met
  // But only if we're not in the middle of saving changes
  useEffect(() => {
    if (editMode && selectedInvoice && !hasAmountMismatch(selectedInvoice) && !savingChanges) {
      // Don't auto-exit if we're saving changes
      // This allows users to save their corrected amounts
    }
  }, [editMode, selectedInvoice, savingChanges]);

  // Add search state for product dropdowns
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});

  // Add search state for UOM dropdowns
  const [uomSearchTerms, setUomSearchTerms] = useState<Record<number, string>>({});
  const [showUomDropdowns, setShowUomDropdowns] = useState<Record<number, boolean>>({});

  // Quotation-specific state
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [showQuotationViewModal, setShowQuotationViewModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  } | null>(null);

  // Old advance payment states removed - now using unified UpdatePaymentModal
  const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
  const [selectedQuotationForPayment, setSelectedQuotationForPayment] = useState<Quotation | null>(null);

  console.log("selectedInvoice", selectedInvoice);


  // Filter products based on search term
  const getFilteredProducts = (searchTerm: string = '') => {
    if (!searchTerm) return products;
    return products.filter(product =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.partNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Update product search term
  const updateProductSearchTerm = (itemIndex: number, searchTerm: string) => {
    setProductSearchTerms(prev => ({ ...prev, [itemIndex]: searchTerm }));
  };

  // UOM options
  const UOM_OPTIONS = [
    'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos'
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

  const toFixedNumber = (value: number, decimals = 2) =>
    Number(value.toFixed(decimals));


  const calculateAdjustedTaxRate = (unitPrice: number, quantity: number, targetTotal: number): number => {
    if (unitPrice === 0 || quantity === 0) return 0;
    const base = unitPrice * quantity;
    const tax = targetTotal - base;
    const taxRate = (tax / base) * 100;
    return Math.max(0, Math.min(100, toFixedNumber(taxRate))); // Ensure 0–100
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

      if (quantity === 0 || unitPrice === 0) return item;

      const base = unitPrice * quantity;
      const share = subtotal > 0 ? base / subtotal : 0;
      const targetItemTotal = share * targetTotal;

      const adjustedTaxRate = calculateAdjustedTaxRate(unitPrice, quantity, targetItemTotal);
      const taxAmount = toFixedNumber((base * adjustedTaxRate) / 100);
      const totalPrice = toFixedNumber(base + taxAmount);

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
      subtotal: toFixedNumber(subtotal),
      taxAmount: toFixedNumber(taxAmount),
      totalAmount: toFixedNumber(totalAmount),
      remainingAmount: toFixedNumber(totalAmount - (prev.paidAmount ?? 0)),
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

      if (quantity === 0) return item;

      const itemBase = (item.unitPrice ?? 0) * quantity;
      const itemShare = currentTotal > 0 ? (itemBase + (itemBase * taxRate) / 100) / currentTotal : 0;
      const targetItemTotal = itemShare * targetTotal;

      const adjustedUnitPrice = toFixedNumber((targetItemTotal / quantity) / (1 + taxRate / 100));
      const basePrice = adjustedUnitPrice * quantity;
      const taxAmount = toFixedNumber((basePrice * taxRate) / 100);
      const totalPrice = toFixedNumber(basePrice + taxAmount);

      return {
        ...item,
        unitPrice: adjustedUnitPrice,
        taxAmount,
        totalPrice,
      };
    });

    const subtotal = adjustedItems.reduce((sum: number, item: any) => sum + ((item.unitPrice ?? 0) * (item.quantity ?? 0)), 0);
    const taxAmount = adjustedItems.reduce((sum: number, item: any) => sum + (item.taxAmount ?? 0), 0);
    const totalAmount = toFixedNumber(subtotal + taxAmount);
    const paidAmount = selectedInvoice.paidAmount ?? 0;
    const remainingAmount = toFixedNumber(totalAmount - paidAmount);

    setSelectedInvoice((prev: any) => ({
      ...prev,
      items: adjustedItems,
      subtotal: toFixedNumber(subtotal),
      taxAmount: toFixedNumber(taxAmount),
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

  const handleSaveChanges = async () => {
    setSavingChanges(true);
    try {
      if (!selectedInvoice) return false;

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
        setSelectedInvoice(updatedInvoice);

        // Update the invoice in the main invoices list
        setInvoices(prevInvoices =>
          prevInvoices.map(invoice =>
            invoice._id === selectedInvoice._id ? updatedInvoice : invoice
          )
        );

        // Update stats
        await fetchStats();

        toast.success('Invoice updated successfully!');
        return true;
      } else {
        throw new Error('Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice items:', error);
      toast.error('Failed to update invoice. Please try again.');
      return false;
    } finally {
      setSavingChanges(false);
    }
  };



  // Initialize data
  useEffect(() => {
    fetchAllData();
  }, []);

  // 🚀 KEYBOARD SHORTCUTS FOR QUICK INVOICE CREATION
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only trigger shortcuts when not typing in input fields
      const activeElement = document.activeElement;
      const isInputField = activeElement?.tagName === 'INPUT' ||
        activeElement?.tagName === 'TEXTAREA' ||
        activeElement?.tagName === 'SELECT' ||
        (activeElement as HTMLElement)?.contentEditable === 'true';

      if (isInputField) return;

      // Ctrl/Cmd + Number shortcuts for different invoice types
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            handleCreateInvoice('quotation');
            toast.success('Creating Quotation...', { duration: 2000 });
            break;
          case '2':
            event.preventDefault();
            handleCreateInvoice('sale');
            toast.success('Creating Sales Invoice...', { duration: 2000 });
            break;
          case '3':
            event.preventDefault();
            handleCreateInvoice('challan');
            toast.success('Creating Delivery Challan...', { duration: 2000 });
            break;
          case 'n':
            event.preventDefault();
            handleCreateInvoice();
            toast.success(`Creating ${getInvoiceTypeLabel(invoiceType)}...`, { duration: 2000 });
            break;
          case 'r':
            event.preventDefault();
            fetchAllData();
            toast.success('Refreshing data...', { duration: 1500 });
            break;
          case 'f':
            event.preventDefault();
            const searchInput = document.querySelector('[data-field="search"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [invoiceType]); // Re-run when invoiceType changes

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

      console.log("response123:", response);


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
  }, [currentPage, limit, sort, searchTerm, statusFilter, paymentFilter, invoiceType, searchQuotationTerm]);



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
        search: searchQuotationTerm,
      });

      const responseData = response.data as any;
      console.log("responseData:", responseData);


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
    try {
      const response = await apiClient.stock.getStock({ limit: 10000, page: 1 });

      const responseData = response.data as any;
      let productsData = [];
      if (responseData.stockLevels && Array.isArray(responseData.stockLevels)) {
        productsData = responseData.stockLevels.map((stock: any) => ({
          _id: stock.product?._id || stock.productId,
          name: stock.product?.name || stock.productName || 'Unknown Product',
          price: stock.product?.price || 0,
          gst: stock.product?.gst || 0,
          hsnNumber: stock.product?.hsnNumber || '',
          partNo: stock.product?.partNo || '',
          uom: stock.product?.uom,
          category: stock.product?.category || 'N/A',
          brand: stock.product?.brand || 'N/A',
          availableQuantity: stock.availableQuantity || 0,
          stockData: stock
        }));
      } else if (Array.isArray(responseData)) {
        productsData = responseData;
      } else {
        console.warn('⚠️ Unexpected response structure:', responseData);
        productsData = [];
      }

      setProducts(productsData);
      if (productsData.length > 0) {
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

      // Set "Main Office" as default if not already selected
      const mainOffice = locationsData.find(loc => loc.name === "Main Office");
      // if (mainOffice && !newInvoice.location) {
      setNewInvoice(prev => ({ ...prev, location: mainOffice?._id }));
      // }

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
      if (response.success && response.data && response.data.companies && response.data.companies.length > 0) {
        // Get the first company settings (assuming single company setup)
        const companySettings = response.data.companies[0];

        setGeneralSettings(companySettings);

        // Auto-populate default values in newInvoice if it exists
        if (newInvoice) {
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

  const handleCreateInvoice = (specificType?: 'quotation' | 'sale' | 'purchase' | 'challan') => {
    const typeToUse = specificType || invoiceType;
    console.log("typeToUse:", typeToUse);

    const path = typeToUse === 'quotation'
      ? '/billing/quotation/create'
      : '/billing/create';

    navigate(path, {
      state: { invoiceType: typeToUse }
    });
  };


  const handleCreateInvoiceClick = () => {
    handleCreateInvoice();
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setOriginalInvoiceData(JSON.parse(JSON.stringify(invoice))); // Deep copy for backup
    setShowViewModal(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    navigate(`/billing/edit/${invoice._id}`);
  };

  // Quotation handlers
  const handleCreateQuotation = () => {
    navigate('/billing/quotation/create');
  };

  // Purchase Invoice handlers
  const handleCreatePurchaseInvoice = () => {
    navigate('/billing/create', { state: { invoiceType: 'purchase' } });
  };

  const handleViewQuotation = (quotation: any) => {
    console.log("quotation123:", quotation);
    console.log("assignedEngineer:", quotation.assignedEngineer);

    setSelectedQuotation(quotation);
    setShowQuotationViewModal(true);
  };

  const handleEditQuotation = (quotation: any) => {
    console.log('Editing quotation:', quotation);
    console.log('Quotation ID:', quotation._id);

    if (!quotation._id) {
      console.error('No _id found in quotation object!');
      toast.error('Cannot edit quotation: ID not found');
      return;
    }

    navigate('/billing/quotation/edit', {
      state: {
        quotation: quotation,
        mode: 'edit'
      }
    });
  };

  const handleDeleteQuotation = async (quotation: any) => {
    setConfirmationData({
      title: 'Delete Quotation',
      message: `Are you sure you want to delete quotation "${quotation.quotationNumber}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await apiClientQuotation.quotations.delete(quotation._id);
          toast.success('Quotation deleted successfully');
          fetchQuotations();
          setShowConfirmationModal(false);
        } catch (error) {
          console.error('Error deleting quotation:', error);
          toast.error('Failed to delete quotation');
        }
      },
      type: 'danger'
    });
    setShowConfirmationModal(true);
  };

  const handleCreateInvoiceFromQuotation = async (quotation: any) => {
    try {
      console.log('Preparing to create invoice from quotation:', quotation);

      // Close the quotation view modal
      setShowQuotationViewModal(false);

      // Prepare quotation data with proper structure for InvoiceFormPage
      const quotationData = {
        customer: quotation.customer,
        billToAddress: quotation.billToAddress ? {
          id: quotation.billToAddress.id || quotation.billToAddress.addressId || 0,
          address: quotation.billToAddress.address || '',
          state: quotation.billToAddress.state || '',
          district: quotation.billToAddress.district || '',
          pincode: quotation.billToAddress.pincode || '',
          isPrimary: quotation.billToAddress.isPrimary || false,
          gstNumber: quotation.billToAddress.gstNumber || ''
        } : null,
        shipToAddress: quotation.shipToAddress ? {
          id: quotation.shipToAddress.id || quotation.shipToAddress.addressId || 0,
          address: quotation.shipToAddress.address || '',
          district: quotation.shipToAddress.district || '',
          pincode: quotation.shipToAddress.pincode || '',
          isPrimary: quotation.shipToAddress.isPrimary || false,
          gstNumber: quotation.shipToAddress.gstNumber || ''
        } : null,
        assignedEngineer: quotation.assignedEngineer?._id || quotation.assignedEngineer,
        items: quotation.items?.map((item: any) => ({
          product: item.product?._id || item.product,
          description: item.description || '',
          quantity: item.quantity || 0,
          unitPrice: item.unitPrice || 0,
          taxRate: item.taxRate || 0,
          hsnNumber: item.hsnNumber || item.hsnSac || '',
          partNo: item.partNo || '',
          uom: item.uom || 'nos',
          discount: item.discount || 0
        })) || [],
        overallDiscount: quotation.overallDiscount || 0,
        overallDiscountAmount: quotation.overallDiscountAmount || 0,
        notes: quotation.notes || '',
        terms: quotation.terms || '',
        location: quotation.location?._id || quotation.location,
        dueDate: quotation.validUntil ? new Date(quotation.validUntil).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        // Quotation reference information
        sourceQuotation: quotation._id,
        quotationNumber: quotation.quotationNumber,
        quotationPaymentDetails: {
          paidAmount: quotation.paidAmount || 0,
          remainingAmount: quotation.remainingAmount || 0,
          paymentStatus: quotation.paymentStatus || 'pending'
        }
      };

      console.log('Prepared quotation data for InvoiceFormPage:', quotationData);

      // Navigate to create invoice page with quotation data
      navigate('/billing/create', {
        state: {
          invoiceType: 'sale',
          quotationData: quotationData,
          fromQuotation: true
        }
      });
    } catch (error: any) {
      console.error('Error preparing invoice from quotation:', error);
      toast.error('Failed to prepare invoice from quotation');
    }
  };

  // Handle sending quotation email
  const handleSendQuotationEmail = async (quotation: any) => {
    try {
      // Check if customer has email
      if (!quotation.customer?.email) {
        toast.error('Customer email not available for this quotation');
        return;
      }

      // Draft quotations can be sent via email - this will update their status to 'sent'

      // Show loading state
      toast.loading('Sending quotation email...', { id: 'quotation-email' });

      // Send the email
      const response = await apiClient.quotations.sendEmail(quotation._id);

      if (response.success) {
        toast.success(`Quotation email sent successfully to ${quotation.customer.email}. Status updated to 'sent'.`, { id: 'quotation-email' });
        
        // Refresh quotations to get updated status
        fetchQuotations();
      } else {
        toast.error(response.message || 'Failed to send quotation email', { id: 'quotation-email' });
      }
    } catch (error: any) {
      console.error('Error sending quotation email:', error);
      toast.error('Failed to send quotation email', { id: 'quotation-email' });
    }
  };

  // Status management functions
  const handleUpdateStatus = (invoice: Invoice, newStatus: string) => {
    setSelectedInvoice(invoice);
    setStatusUpdate({ status: invoice.status, notes: '' }); // Pre-select current status
    setShowStatusUpdateDropdown(false); // Reset dropdown state
    setShowStatusModal(true);
  };

  const handleUpdatePayment = (item: Invoice | Quotation, itemType: 'invoice' | 'quotation' = 'invoice') => {
    if (itemType === 'invoice') {
      const invoice = item as Invoice;
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
    } else {
      const quotation = item as Quotation;
      setSelectedQuotationForPayment(quotation);
      setShowAdvancePaymentModal(true);
    }
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
    setConfirmationData({
      title: 'Cancel Invoice',
      message: `Are you sure you want to cancel invoice "${invoice.invoiceNumber}"? This action cannot be undone.`,
      onConfirm: async () => {
        await handleUpdateStatusQuick(invoice._id, 'cancelled');
        setShowConfirmationModal(false);
      },
      type: 'danger'
    });
    setShowConfirmationModal(true);
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
    if (invoice.invoiceType === 'sale' || invoice.invoiceType === 'purchase') {

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
      if (invoice.status !== 'cancelled' && invoice.status !== 'draft' || invoice.invoiceType === 'purchase') {
        actions.push({
          icon: <IndianRupee className="w-4 h-4" />,
          label: 'Update Payment',
          action: () => handleUpdatePayment(invoice),
          color: 'text-green-600 hover:text-green-900 hover:bg-green-50'
        });
      }

      // Payment Receipt Actions - Available for invoices with payments
      if (invoice.paidAmount > 0) {

        actions.push({
          icon: <Printer className="w-4 h-4" />,
          label: 'Print Receipt',
          action: () => printPaymentReceipt(invoice),
          color: 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        });
      }

      // Email actions
      if (invoice.status === 'draft' && invoice.invoiceType === 'sale') {
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

      if (invoice.status === 'sent' && invoice.paymentStatus === 'pending' || invoice.invoiceType === 'purchase' && invoice.paymentStatus === 'pending') {
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
          hsnNumber: '',
          uom: 'nos',
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
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      // Auto-populate price, description, gst, hsnNumber, and partNo when product is selected
      if (field === 'product') {
        const productObj = products.find(p => p._id === value);

        if (productObj) {
          updatedItems[index].unitPrice = productObj.price;
          updatedItems[index].description = productObj.name;
          updatedItems[index].gst = productObj.gst;
          updatedItems[index].taxRate = extractGSTRate(productObj.gst);
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
    } else if (selectedInvoice.status === 'draft' && invoiceType === 'sale') {
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
          id: selectedAddress.id,
          address: selectedAddress.address,
          state: selectedAddress.state,
          district: selectedAddress.district,
          pincode: selectedAddress.pincode,
          isPrimary: selectedAddress.isPrimary || false,
          gstNumber: selectedAddress.gstNumber
        } : null,
        // New detailed address fields
        billToAddress: newInvoice.billToAddress || null,
        shipToAddress: newInvoice.shipToAddress || null,
        supplierAddress: newInvoice.supplierAddress || null,
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
          uom: item.uom || 'nos',
          partNo: item.partNo || '',
          hsnNumber: item.hsnNumber || ''
        }))
      };

      await apiClient.invoices.create(invoiceData);
      await fetchInvoices();
      await fetchStats();
      toast.success('Invoice created successfully!');
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice. Please try again.');
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
      invoice?.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (invoiceType === 'purchase' && invoice?.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || invoice.paymentStatus === paymentFilter;
    const matchesType = invoice.invoiceType === invoiceType;
    return matchesSearch && matchesStatus && matchesPayment && matchesType;
  });

  console.log("filteredInvoices:", filteredInvoices);

  const filteredQuotations = quotations.filter(quotation => {
    const matchesSearch =
      quotation?.quotationNumber?.toLowerCase().includes(searchQuotationTerm.toLowerCase()) ||
      quotation?.customer?.name?.toLowerCase().includes(searchQuotationTerm.toLowerCase())
    return matchesSearch;
  });

  console.log("filteredQuotations:", filteredQuotations);



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
      icon: <IndianRupee className="w-6 h-6" />,
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
      item.hsnNumber || '',
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
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const thousands = ['', 'Thousand', 'Lakh', 'Crore'];

    const convertLessThanOneThousand = (num: number): string => {
      if (num === 0) return '';

      let result = '';

      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }

      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      } else if (num >= 10) {
        result += teens[num - 10] + ' ';
        return result;
      }

      if (num > 0) {
        result += ones[num] + ' ';
      }

      return result;
    };

    const convertToWords = (num: number): string => {
      if (num === 0) return 'Zero';

      let result = '';
      let groupIndex = 0;

      while (num > 0) {
        const group = num % 1000;
        if (group !== 0) {
          const groupWords = convertLessThanOneThousand(group);
          if (groupIndex > 0) {
            result = groupWords + thousands[groupIndex] + ' ' + result;
          } else {
            result = groupWords;
          }
        }
        num = Math.floor(num / 1000);
        groupIndex++;
      }

      return result.trim();
    };

    // Handle decimal part (paise)
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let result = convertToWords(rupees) + ' Rupees';

    if (paise > 0) {
      result += ' and ' + convertToWords(paise) + ' Paise';
    }

    return result + ' Only';
  }

  // Update printInvoice function
  const printInvoice = () => {
    if (!selectedInvoice) return;
    const printContent = `
    <html>
      <head>
        <title>Invoice ${selectedInvoice.invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 0.5in; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; line-height: 1.4; color: #000; font-size: 12px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .header h1 { margin: 0 0 8px 0; font-size: 22px; font-weight: bold; color: #000; }
          .header div { margin: 3px 0; font-size: 11px; }
          .invoice-details { margin-bottom: 15px; }
          .invoice-details h2 { margin: 0 0 10px 0; text-align: center; font-size: 20px; font-weight: bold; border: 2px solid #000; padding: 8px; display: inline-block; width: 200px; margin-left: calc(50% - 100px); }
          .details-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .details-table td { padding: 6px 10px; font-size: 11px; border: 1px solid #000; }
          .details-table td:first-child { font-weight: bold; background-color: #f5f5f5; width: 20%; }
          .engineer-date-section { display: flex; gap: 15px; margin-bottom: 15px; }
          .engineer-box, .date-box { flex: 1; border: 1px solid #000; padding: 8px; background-color: #f9f9f9; }
          .engineer-box h4, .date-box h4 { margin: 0 0 5px 0; font-size: 12px; font-weight: bold; }
          .from-to-section { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 15px; }
          .from-to-box { flex: 1; min-width: 200px; padding: 10px; border: 1px solid #000; }
          .from-to-box h3 { margin: 0 0 8px 0; font-size: 12px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; }
          .from-to-box div { font-size: 10px; line-height: 1.3; }
          .from-to-box strong { color: #000; }
          table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10px; }
          table.items th, table.items td { border: 1px solid #000; padding: 5px 4px; text-align: center; vertical-align: middle; }
          table.items th { background: #f0f0f0; font-weight: bold; font-size: 9px; }
          table.items .description-col { text-align: left; max-width: 150px; }
          .summary-section { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 20px; }
          .notes-box { flex: 1; padding: 10px; border: 1px solid #000; min-height: 120px; }
          .notes-box h4 { margin: 0 0 8px 0; font-size: 12px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; }
          .notes-box div { font-size: 10px; line-height: 1.3; }
          .summary-box { flex: 1; padding: 10px; border: 1px solid #000; min-height: 120px; }
          .summary-table { width: 100%; border-collapse: collapse; }
          .summary-table td { padding: 5px 8px; font-size: 11px; border-bottom: 1px solid #ccc; }
          .summary-table td:first-child { font-weight: bold; }
          .summary-table .total-row { font-weight: bold; background-color: #f0f0f0; border-top: 2px solid #000; font-size: 12px; }
          .summary-table .amount-words { border-top: 1px solid #000; font-size: 9px; line-height: 1.2; word-wrap: break-word; max-width: 180px; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; }
          .footer div { margin: 8px 0; }
          @media print { body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none; } .invoice-details { border: none !important; background: none !important; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${selectedInvoice.company?.name || generalSettings?.companyName || 'Sun Power Services'}</h1>
          ${selectedInvoice.company?.address || generalSettings?.companyAddress ? `<div>${selectedInvoice.company?.address || generalSettings?.companyAddress || ''}</div>` : ''}
          ${selectedInvoice.company?.phone || generalSettings?.companyPhone ? `<div>Phone: ${selectedInvoice.company?.phone || generalSettings?.companyPhone || ''} | Email: ${selectedInvoice.company?.email || generalSettings?.companyEmail || ''}</div>` : ''}
          ${selectedInvoice.company?.pan || generalSettings?.companyPAN ? `<div>PAN: ${selectedInvoice.company?.pan || generalSettings?.companyPAN || ''} | GSTIN: ${selectedInvoice.company?.gstin || generalSettings?.companyGSTIN || ''}</div>` : ''}
        </div>
        <div class="invoice-details">
          <h2>INVOICE</h2>
          <table class="details-table">
            <tr>
              <td>Invoice No:</td>
              <td>${selectedInvoice.invoiceNumber}</td>
              <td><strong>Issue Date:</strong></td>
              <td>${selectedInvoice.issueDate ? new Date(selectedInvoice.issueDate).toLocaleDateString() : ''}</td>
            </tr>
            <tr>
              <td><strong>Due Date:</strong></td>
              <td>${selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : ''}</td>
              <td>Status:</td>
              <td>${selectedInvoice.status ? selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1) : ''}</td>
            </tr>
            ${selectedInvoice.poNumber ? `
            <tr>
              <td>PO Number:</td>
              <td>${selectedInvoice.poNumber}</td>
              <td>Payment Status:</td>
              <td>${selectedInvoice.paymentStatus ? selectedInvoice.paymentStatus.charAt(0).toUpperCase() + selectedInvoice.paymentStatus.slice(1) : ''}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        <div class="engineer-date-section">
          <div class="engineer-box">
            <h4>Assigned Engineer:</h4>
            <div>
              <strong>Name:</strong> ${selectedInvoice.assignedEngineer ? `${selectedInvoice.assignedEngineer.firstName || ''} ${selectedInvoice.assignedEngineer.lastName || ''}`.trim() : 'Not Assigned'}<br>
              ${selectedInvoice.assignedEngineer?.phone ? `<strong>Phone:</strong> ${selectedInvoice.assignedEngineer.phone}<br>` : ''}
              ${selectedInvoice.assignedEngineer?.email ? `<strong>Email:</strong> ${selectedInvoice.assignedEngineer.email}` : ''}
            </div>
          </div>
          <div class="date-box">
            <h4>Important Dates:</h4>
            <div>
              <strong>Issue Date:</strong> ${selectedInvoice.issueDate ? new Date(selectedInvoice.issueDate).toLocaleDateString() : 'Not Set'}<br>
              <strong>Due Date:</strong> ${selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString() : 'Not Set'}<br>
              <strong>Status:</strong> ${selectedInvoice.status ? selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1) : 'Draft'}
            </div>
          </div>
        </div>
        <div class="from-to-section">
          <div class="from-to-box">
            <h3>From:</h3>
            ${selectedInvoice.invoiceType === 'purchase' ?
        `<div>
              <strong>${selectedInvoice.customer?.name ? selectedInvoice.customer?.name : selectedInvoice?.supplier?.name || 'N/A'}</strong><br>
              ${selectedInvoice.customer?.email ? `Email: ${selectedInvoice.customer?.email}<br>` : ''}
              ${selectedInvoice.customer?.phone ? `Phone: ${selectedInvoice.customer?.phone}<br>` : ''}
              ${selectedInvoice.invoiceType === 'purchase' ?
          `${selectedInvoice.supplierAddress ? `<br><strong>Address:</strong><br>${selectedInvoice.supplierAddress.address || 'N/A'}<br>${selectedInvoice.supplierAddress.district && selectedInvoice.supplierAddress.pincode ? `${selectedInvoice.supplierAddress.district}, ${selectedInvoice.supplierAddress.pincode}<br>` : ''}${selectedInvoice.supplierAddress.state || 'N/A'}<br>${selectedInvoice.supplierAddress.gstNumber ? `<strong>GST:</strong> ${selectedInvoice.supplierAddress.gstNumber}<br>` : ''}${selectedInvoice.supplierAddress.isPrimary ? '<strong>Primary Address</strong>' : ''}` : ''}` :
          `${selectedInvoice.billToAddress ? `<br><strong>Address:</strong><br>${selectedInvoice.billToAddress.address || 'N/A'}<br>${selectedInvoice.billToAddress.district && selectedInvoice.billToAddress.pincode ? `${selectedInvoice.billToAddress.district}, ${selectedInvoice.billToAddress.pincode}<br>` : ''}${selectedInvoice.billToAddress.state || 'N/A'}<br>${selectedInvoice.billToAddress.gstNumber ? `<strong>GST:</strong> ${selectedInvoice.billToAddress.gstNumber}<br>` : ''}${selectedInvoice.billToAddress.isPrimary ? '<strong>Primary Address</strong>' : ''}` : ''}`}          
                </div> `: `
            <div>
              <strong>${selectedInvoice.company?.name || generalSettings?.companyName || 'Sun Power Services'}</strong><br>
              ${selectedInvoice.company?.phone || generalSettings?.companyPhone ? `Phone: ${selectedInvoice.company?.phone || generalSettings?.companyPhone}<br>` : ''}
              ${selectedInvoice.company?.email || generalSettings?.companyEmail ? `Email: ${selectedInvoice.company?.email || generalSettings?.companyEmail}<br>` : ''}
              ${selectedInvoice.company?.pan || generalSettings?.companyPAN ? `PAN: ${selectedInvoice.company?.pan || generalSettings?.companyPAN}<br>` : ''}
              ${selectedInvoice.location ? `<br><strong>Address:</strong><br>${selectedInvoice.location.name || 'N/A'}<br>${selectedInvoice.location.address || 'N/A'}` : ''}
            </div>`}
          </div>
          <div class="from-to-box">
          <h3>${selectedInvoice.invoiceType === 'purchase' ? 'To' : 'Bill To'}:</h3>
          ${selectedInvoice.invoiceType === 'purchase' ? `
            <div>
              <strong>${selectedInvoice.company?.name || generalSettings?.companyName || 'Sun Power Services'}</strong><br>
              ${selectedInvoice.company?.phone || generalSettings?.companyPhone ? `Phone: ${selectedInvoice.company?.phone || generalSettings?.companyPhone}<br>` : ''}
              ${selectedInvoice.company?.email || generalSettings?.companyEmail ? `Email: ${selectedInvoice.company?.email || generalSettings?.companyEmail}<br>` : ''}
              ${selectedInvoice.company?.pan || generalSettings?.companyPAN ? `PAN: ${selectedInvoice.company?.pan || generalSettings?.companyPAN}<br>` : ''}
              ${selectedInvoice.location ? `<br><strong>Address:</strong><br>${selectedInvoice.location.name || 'N/A'}<br>${selectedInvoice.location.address || 'N/A'}` : ''}
            </div>` : `
            <div>
              <strong>${selectedInvoice.customer?.name ? selectedInvoice.customer?.name : selectedInvoice?.supplier?.name || 'N/A'}</strong><br>
              ${selectedInvoice.customer?.email ? `Email: ${selectedInvoice.customer?.email}<br>` : ''}
              ${selectedInvoice.customer?.phone ? `Phone: ${selectedInvoice.customer?.phone}<br>` : ''}
              ${selectedInvoice.invoiceType === 'purchase' ?
        `${selectedInvoice.supplierAddress ? `<br><strong>Address:</strong><br>${selectedInvoice.supplierAddress.address || 'N/A'}<br>${selectedInvoice.supplierAddress.district && selectedInvoice.supplierAddress.pincode ? `${selectedInvoice.supplierAddress.district}, ${selectedInvoice.supplierAddress.pincode}<br>` : ''}${selectedInvoice.supplierAddress.state || 'N/A'}<br>${selectedInvoice.supplierAddress.gstNumber ? `<strong>GST:</strong> ${selectedInvoice.supplierAddress.gstNumber}<br>` : ''}${selectedInvoice.supplierAddress.isPrimary ? '<strong>Primary Address</strong>' : ''}` : ''}` :
        `${selectedInvoice.billToAddress ? `<br><strong>Address:</strong><br>${selectedInvoice.billToAddress.address || 'N/A'}<br>${selectedInvoice.billToAddress.district && selectedInvoice.billToAddress.pincode ? `${selectedInvoice.billToAddress.district}, ${selectedInvoice.billToAddress.pincode}<br>` : ''}${selectedInvoice.billToAddress.state || 'N/A'}<br>${selectedInvoice.billToAddress.gstNumber ? `<strong>GST:</strong> ${selectedInvoice.billToAddress.gstNumber}<br>` : ''}${selectedInvoice.billToAddress.isPrimary ? '<strong>Primary Address</strong>' : ''}` : ''}`}          
                </div> `} 
          </div>
          ${selectedInvoice.invoiceType === 'purchase' ? '' : `
          <div class="from-to-box">
            <h3>Ship To:</h3>
            <div>
              <strong>${selectedInvoice.customer?.name || 'N/A'}</strong><br>
              ${selectedInvoice.shipToAddress ? `<br><strong>Address:</strong><br>${selectedInvoice.shipToAddress.address || 'N/A'}<br>${selectedInvoice.shipToAddress.district && selectedInvoice.shipToAddress.pincode ? `${selectedInvoice.shipToAddress.district}, ${selectedInvoice.shipToAddress.pincode}<br>` : ''}${selectedInvoice.shipToAddress.gstNumber ? `<strong>GST:</strong> ${selectedInvoice.shipToAddress.gstNumber}<br>` : ''}${selectedInvoice.shipToAddress.isPrimary ? '<strong>Primary Address</strong>' : ''}` : ''}
            </div>
          </div>`}
        </div>
        <table class="items">
          <thead>
            <tr>
              <th style="width: 30px;">S.No</th>
              <th class="description-col">Description</th>
              <th style="width: 80px;">HSN Number</th>
              <th style="width: 40px;">Qty</th>
              <th style="width: 40px;">UOM</th>
              <th style="width: 80px;">Part No</th>
              <th style="width: 70px;">Unit Price</th>
              <th style="width: 50px;">Discount</th>
              <th style="width: 50px;">Tax Rate</th>
              <th style="width: 80px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(selectedInvoice.items || []).map((item: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td class="description-col">${item.description || ''}</td>
                <td>${item.hsnNumber || item?.product?.hsnNumber || 'N/A'}</td>
                <td>${item.quantity || 0}</td>
                <td>${item.uom || 'nos'}</td>
                <td>${item.partNo || item?.product?.partNo || 'N/A'}</td>
                <td>₹${item.unitPrice?.toLocaleString() || '0'}</td>
                <td>${item.discount || 0}%</td>
                <td>${item.taxRate || 0}%</td>
                <td>₹${(item.unitPrice * item.quantity * (1 - (item.discount || 0) / 100) * (1 + (item.taxRate || 0) / 100)).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="summary-section">
          ${(selectedInvoice.notes || selectedInvoice.terms) ? `
          <div class="notes-box">
            ${selectedInvoice.notes ? `
              <h4>Notes:</h4>
              <div>${selectedInvoice.notes}</div>
            ` : ''}
            ${selectedInvoice.terms ? `
              <h4 ${selectedInvoice.notes ? 'style="margin-top: 15px;"' : ''}>Terms & Conditions:</h4>
              <div>${selectedInvoice.terms}</div>
            ` : ''}
          </div>
          ` : `
          <div class="notes-box">
            <h4>Standard Terms & Conditions:</h4>
            <div>
              • Payment: 100% advance payment along with P.O.<br>
              • Ordering: In Favour of Sun Power Services<br>
              • Delivery: Within One Month after your P.O.<br>
              • Prices are subject to change without prior notice<br>
              • All disputes subject to Chennai jurisdiction
            </div>
          </div>
          `}
          <div class="summary-box">
            <table class="summary-table">
              <tr>
                <td>Subtotal:</td>
                <td>₹${(selectedInvoice.items || []).reduce((sum: number, item: any) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0)), 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Total Tax:</td>
                <td>₹${(selectedInvoice.items || []).reduce((sum: number, item: any) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0) * (item.taxRate ?? 0) / 100), 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Total Discount:</td>
                <td>-₹${(selectedInvoice.discountAmount || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td>Overall Discount:</td>
                <td>-${selectedInvoice.overallDiscount || 0}% (-₹${selectedInvoice.overallDiscountAmount?.toFixed(2) || '0.00'})</td>
              </tr>
              <tr class="total-row">
                <td>Grand Total:</td>
                <td><strong>₹${selectedInvoice.totalAmount?.toFixed(2) || '0'}</strong></td>
              </tr>
              <tr>
                <td>Amount in Words:</td>
                <td class="amount-words">
                  ${selectedInvoice.totalAmount ? numberToWords(selectedInvoice.totalAmount) : 'Zero Rupees Only'}
                </td>
              </tr>
            </table>
          </div>
        </div>
        <div class="footer">
          <div><strong>For ${selectedInvoice.company?.name || generalSettings?.companyName || 'Sun Power Services'}</strong></div>
          <br><br>
          <div><strong>Authorized Signatory</strong></div>
          <div style="margin-top: 20px; font-size: 9px; border-top: 1px solid #000; padding-top: 10px;">
            <strong>Address:</strong> Plot no 1, Phase 1, 4th Street, Annai velankani nagar, Madhananthapuram, porur, chennai 600116<br>
            <strong>Mobile:</strong> +91 9176660123 | <strong>GSTIN:</strong> 33BLFPS9951M1ZC | <strong>Email:</strong> 24x7powerolservice@gmail.com
          </div>
        </div>
      </body>
    </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = function () {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    }
  };

  // Payment Receipt Generation Function
  const generatePaymentReceipt = (invoice: Invoice) => {
    if (!invoice) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    // Header: Company Info
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT RECEIPT', pageWidth / 2, y, { align: 'center' });
    y += 10;

    doc.setFontSize(13);
    doc.text(generalSettings?.companyName || 'Sun Power Services', pageWidth / 2, y, { align: 'center' });
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(generalSettings?.companyAddress || '', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text(`GSTIN: ${generalSettings?.companyGSTIN || ''}`, pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text(`Contact: ${generalSettings?.companyPhone || ''}  Email: ${generalSettings?.companyEmail || ''}`, pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Draw line
    doc.line(10, y, pageWidth - 10, y);
    y += 8;

    // Receipt Details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Receipt Details:', 10, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text(`Receipt Date: ${new Date().toLocaleDateString()}`, 10, y);
    doc.text(`Receipt Time: ${new Date().toLocaleTimeString()}`, 120, y);
    y += 5;
    doc.text(`Invoice Number: ${invoice.invoiceNumber}`, 10, y);
    doc.text(`Invoice Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 120, y);
    y += 5;
    doc.text(`Payment Status: ${invoice.paymentStatus.toUpperCase()}`, 10, y);
    y += 8;

    // Customer Details
    doc.setFont('helvetica', 'bold');
    doc.text('Customer Details:', 10, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${invoice.customer?.name || 'N/A'}`, 10, y);
    y += 5;
    doc.text(`Email: ${invoice.customer?.email || 'N/A'}`, 10, y);
    y += 5;
    doc.text(`Phone: ${invoice.customer?.phone || 'N/A'}`, 10, y);
    y += 8;

    // Payment Summary Table
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Summary:', 10, y);
    y += 8;

    // Create payment summary table
    const summaryData = [
      ['Description', 'Amount'],
      ['Invoice Total', `₹${invoice.totalAmount?.toFixed(2)}`],
      ['Amount Paid', `₹${invoice.paidAmount?.toFixed(2)}`],
      ['Remaining Amount', `₹${invoice.remainingAmount?.toFixed(2)}`]
    ];

    autoTable(doc, {
      startY: y,
      head: [summaryData[0]],
      body: summaryData.slice(1),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'right' }
      }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Payment History (if available)
    if (invoice.paidAmount > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Payment History:', 10, y);
      y += 8;

      // Sample payment history - you might want to fetch actual payment records
      const paymentHistory = [
        ['Date', 'Method', 'Amount', 'Status'],
        [new Date().toLocaleDateString(), 'Online/Cash', `₹${invoice.paidAmount?.toFixed(2)}`, 'Completed']
      ];

      autoTable(doc, {
        startY: y,
        head: [paymentHistory[0]],
        body: paymentHistory.slice(1),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
      });

      y = (doc as any).lastAutoTable.finalY + 10;
    }

    // Amount in Words
    if (invoice.paidAmount > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Amount Paid (in words):', 10, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(numberToWords(invoice.paidAmount), 10, y, { maxWidth: pageWidth - 20 });
      y += 10;
    }

    // Footer
    y += 15;
    doc.line(10, y, pageWidth - 10, y);
    y += 8;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer generated receipt and does not require signature.', pageWidth / 2, y, { align: 'center' });
    y += 4;
    doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });

    // Save the PDF
    doc.save(`Payment_Receipt_${invoice.invoiceNumber}_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`);
  };

  // Print Payment Receipt Function
  const printPaymentReceipt = (invoice: any) => {
    console.log("invoice:", invoice);

    if (!invoice) return;

    const printContent = `
    <html>
      <head>
        <title>Payment Receipt - ${invoice.invoiceNumber}</title>
        <style>
          @page { size: A4; margin: 0.5in; }
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; line-height: 1.6; color: #000; font-size: 12px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .header h1 { margin: 0 0 10px 0; font-size: 24px; font-weight: bold; color: #000; }
          .header h2 { margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: #000; }
          .header div { margin: 3px 0; font-size: 11px; }
          .receipt-details { margin-bottom: 20px; background-color: #f9f9f9; padding: 15px; border: 1px solid #ddd; }
          .receipt-details h3 { margin: 0 0 10px 0; font-size: 14px; font-weight: bold; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .details-grid div { font-size: 11px; }
          .customer-section { margin-bottom: 20px; border: 1px solid #000; padding: 15px; }
          .customer-section h3 { margin: 0 0 10px 0; font-size: 14px; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; }
          .payment-summary { margin-bottom: 20px; }
          .payment-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          .payment-table th, .payment-table td { border: 1px solid #000; padding: 8px; text-align: left; }
          .payment-table th { background-color: #f0f0f0; font-weight: bold; }
          .payment-table .amount { text-align: right; font-weight: bold; }
          .amount-words { margin: 15px 0; padding: 10px; border: 1px solid #000; background-color: #f9f9f9; }
          .amount-words strong { font-weight: bold; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; border-top: 1px solid #000; padding-top: 15px; }
          @media print { body { margin: 0; -webkit-print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PAYMENT RECEIPT</h1>
          <h2>${generalSettings?.companyName || 'Sun Power Services'}</h2>
          <div>${generalSettings?.companyAddress || ''}</div>
          <div>GSTIN: ${generalSettings?.companyGSTIN || ''}</div>
          <div>Contact: ${generalSettings?.companyPhone || ''} | Email: ${generalSettings?.companyEmail || ''}</div>
        </div>

        <div class="receipt-details">
          <h3>Receipt Details</h3>
          <div class="details-grid">
            <div><strong>Receipt Date:</strong> ${new Date().toLocaleDateString()}</div>
            <div><strong>Receipt Time:</strong> ${new Date().toLocaleTimeString()}</div>
            <div><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</div>
            <div><strong>Invoice Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString()}</div>
            <div><strong>Payment Status:</strong> ${invoice.paymentStatus.toUpperCase()}</div>
            <div><strong>Invoice Type:</strong> ${invoice.invoiceType.toUpperCase()}</div>
          </div>
        </div>

        <div class="customer-section">
          <h3>Customer Details</h3>
          <div><strong>Name:</strong> ${invoice.customer?.name || 'N/A'}</div>
          <div><strong>Email:</strong> ${invoice.customer?.email || 'N/A'}</div>
          <div><strong>Phone:</strong> ${invoice.customer?.phone || 'N/A'}</div>
        </div>

        <div class="payment-summary">
          <h3>Invoice Items</h3>
          <table class="payment-table">
            <thead>
              <tr>
                <th>Sr. No.</th>
                <th>Product/Description</th>
                <th>Part No.</th>
                <th>HSN Code</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Tax Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map((item: any, index: number) => {
      const subtotal = item.quantity * item.unitPrice;
      const discountAmount = subtotal * ((item.discount || 0) / 100);
      const amountAfterDiscount = subtotal - discountAmount;
      const taxAmount = amountAfterDiscount * ((item.taxRate || 0) / 100);
      const totalAmount = amountAfterDiscount + taxAmount;

      return `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.description || 'N/A'}</td>
                    <td>${item.product?.partNo || 'N/A'}</td>
                    <td>${item.product?.hsnNumber || 'N/A'}</td>
                    <td>${item.quantity}</td>
                    <td class="amount">₹${item.unitPrice?.toFixed(2)}</td>
                    <td class="amount">${item.discount ? `${item.discount}% (₹${discountAmount.toFixed(2)})` : 0}</td>
                    <td>${item.taxRate || 0}%</td>
                    <td class="amount">₹${totalAmount.toFixed(2)}</td>
                  </tr>
                `;
    }).join('') || '<tr><td colspan="9" style="text-align: center;">No items found</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="payment-summary">
          <h3>Payment Summary</h3>
          <table class="payment-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Subtotal</td>
                <td class="amount">₹${(invoice.items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0).toFixed(2) || 0)}</td>
              </tr>
              <tr>
                <td>Total Tax</td>
                <td class="amount">₹${(invoice.items)?.reduce((sum: number, item: any) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0) * (item.taxRate ?? 0) / 100), 0).toFixed(2) || 0}</td>
              </tr>
              ${invoice.overallDiscountAmount && invoice.overallDiscountAmount > 0 ? `
              <tr>
                <td>Overall Discount</td>
                <td class="amount">-${invoice.overallDiscount}% -₹${invoice.overallDiscountAmount?.toFixed(2)}</td>
              </tr>
              ` : ''}
              <tr>
                <td>Invoice Total</td>
                <td class="amount">₹${invoice.totalAmount?.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Amount Paid</td>
                <td class="amount">₹${invoice.paidAmount?.toFixed(2)}</td>
              </tr>
              <tr style="background-color: #f0f0f0;">
                <td><strong>Remaining Amount</strong></td>
                <td class="amount"><strong>₹${invoice.remainingAmount?.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        ${invoice.paidAmount > 0 ? `
        <div class="amount-words">
          <strong>Amount Paid (in words):</strong> ${numberToWords(invoice.paidAmount)}
        </div>
        ` : ''}

        <div class="footer">
          <div><em>This is a computer generated receipt and does not require signature.</em></div>
          <div><strong>Thank you for your business!</strong></div>
          <div>Generated on: ${new Date().toLocaleString()}</div>
        </div>
      </body>
    </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
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
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Service Quotation</title>
        <style>
          @media print {
            @page {
              margin: 0.5in;
              size: A4;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 20px;
            background: white;
          }
          
          .quotation-container {
            width: 100%;
            max-width: 210mm;
            margin: 0 auto;
            background: white;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          
          .quotation-title {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0;
            text-align: center;
          }
          
          .info-section {
            display: table;
            width: 100%;
            margin-bottom: 20px;
          }
          
          .info-row {
            display: table-row;
          }
          
          .info-cell {
            display: table-cell;
            padding: 3px 5px;
            vertical-align: top;
            border: none;
          }
          
          .info-left {
            width: 50%;
            padding-right: 20px;
          }
          
          .info-right {
            width: 50%;
            padding-left: 20px;
          }
          
          .subject-line {
            font-weight: bold;
            margin: 20px 0 10px 0;
            font-size: 13px;
          }
          
          .greeting {
            margin: 15px 0 5px 0;
          }
          
          .intro-text {
            margin: 5px 0 20px 0;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
          }
          
          .items-table th,
          .items-table td {
            border: 1px solid #333;
            padding: 4px 6px;
            text-align: left;
          }
          
          .items-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            text-align: center;
          }
          
          .items-table .number-cell {
            text-align: right;
          }
          
          .items-table .center-cell {
            text-align: center;
          }
          
          .totals-row {
            font-weight: bold;
            background-color: #f9f9f9;
          }
          
          .grand-total-row {
            font-weight: bold;
            background-color: #e9e9e9;
            font-size: 12px;
          }
          
          .terms-section {
            margin: 20px 0;
          }
          
          .terms-title {
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          .terms-table {
            width: 100%;
            margin-bottom: 20px;
          }
          
          .terms-table td {
            padding: 3px 0;
            vertical-align: top;
          }
          
          .terms-number {
            width: 20px;
            text-align: left;
          }
          
          .terms-label {
            width: 150px;
            text-align: left;
          }
          
          .terms-colon {
            width: 15px;
            text-align: left;
          }
          
          .terms-value {
            text-align: left;
          }
          
          .closing-text {
            margin: 15px 0;
            line-height: 1.4;
          }
          
          .footer-section {
            display: table;
            width: 100%;
            margin-top: 30px;
            border-top: 1px solid #ddd;
            padding-top: 15px;
          }
          
          .footer-left {
            display: table-cell;
            width: 40%;
            vertical-align: top;
            padding-right: 20px;
          }
          
          .footer-center {
            display: table-cell;
            width: 20%;
            text-align: center;
            vertical-align: top;
          }
          
          .footer-right {
            display: table-cell;
            width: 40%;
            text-align: center;
            vertical-align: top;
          }
          
          .signature-line {
            margin-top: 40px;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 5px;
            width: 200px;
            margin-left: auto;
            margin-right: auto;
          }
          
          .company-details {
            font-size: 10px;
            line-height: 1.3;
          }
        </style>
      </head>
      <body>
        <div class="quotation-container">
          <div class="quotation-title">QUOTATION</div>
          
          <div class="info-section">
            <div class="info-row">
              <div class="info-cell info-left">
                <strong>Ref:</strong> ${quotation.quotationNumber || 'N/A'}
              </div>
              <div class="info-cell info-right">
                <strong>Date:</strong> ${quotation.issueDate ? new Date(quotation.issueDate).toLocaleDateString() : 'N/A'}
              </div>
            </div>
            <div class="info-row">
              <div class="info-cell info-left">
                <strong>Reference:</strong> ${quotation.reference || 'Customer Request'}
              </div>
              <div class="info-cell info-right">
                <strong>Engineer Name:</strong> ${quotation.assignedEngineer ? `${quotation.assignedEngineer.firstName || ''} ${quotation.assignedEngineer.lastName || ''}`.trim() : 'N/A'}
              </div>
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <div class="info-cell info-left">
                <strong>Customer Billing Address:</strong><br>
                ${quotation.customer?.name || 'N/A'}<br>
                ${quotation.billToAddress ? `${quotation.billToAddress.address || ''}<br>${quotation.billToAddress.district || ''}, ${quotation.billToAddress.pincode || ''}<br>${quotation.billToAddress.state || ''}` : 'Same as billing address'}
              </div>
              <div class="info-cell info-right">
                <strong>Customer Delivery Address:</strong><br>
                ${quotation.shipToAddress ? `${quotation.shipToAddress.address || ''}<br>${quotation.shipToAddress.district || ''}, ${quotation.shipToAddress.pincode || ''}<br>${quotation.shipToAddress.state || ''}` : 'Same as billing address'}
              </div>
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-row">
              <div class="info-cell info-left">
                <strong>ESN:</strong> ${quotation.esn || 'N/A'}
              </div>
              <div class="info-cell info-right">
                <strong>Last Service Done Date:</strong> ${quotation.lastServiceDate || 'N/A'}
              </div>
            </div>
            <div class="info-row">
              <div class="info-cell info-left">
                <strong>DG Rating:</strong> ${quotation.dgRating || 'N/A'}
              </div>
              <div class="info-cell info-right">
                <strong>Last Service Done HMR:</strong> ${quotation.lastServiceHMR || 'N/A'}
              </div>
            </div>
          </div>
          
          <div class="subject-line">
            Sub: ${quotation.subject || 'SPARES QUOTATION FOR DG SET'}
          </div>
          
          <div class="greeting">Dear Sir,</div>
          <div class="intro-text">
            With reference to the subject D.G. set we are here by furnishing our offer for Spares
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 6%;">Sr.No</th>
                <th style="width: 15%;">Part No</th>
                <th style="width: 25%;">Description</th>
                <th style="width: 8%;">HSN Code</th>
                <th style="width: 6%;">UOM</th>
                <th style="width: 5%;">Qty</th>
                <th style="width: 10%;">Basic Amount</th>
                <th style="width: 8%;">Discount %</th>
                <th style="width: 9%;">Total Basic</th>
                <th style="width: 5%;">GST</th>
                <th style="width: 9%;">GST Amount</th>
                <th style="width: 10%;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${(quotation.items || []).map((item: any, idx: number) => {
                const basicAmount = item.unitPrice || 0;
                const discountPercent = item.discount || 0;
                const totalBasic = basicAmount * (1 - discountPercent / 100);
                const gstRate = item.taxRate || 0;
                const gstAmount = totalBasic * (gstRate / 100);
                const totalAmount = totalBasic + gstAmount;
                
                return `
                  <tr>
                    <td class="center-cell">${idx + 1}</td>
                    <td>${item.partNo || '-'}</td>
                    <td>${item.description || ''}</td>
                    <td class="center-cell">${item.hsnNumber || '-'}</td>
                    <td class="center-cell">${item.uom || 'NOS'}</td>
                    <td class="center-cell">${item.quantity || 0}</td>
                    <td class="number-cell">${basicAmount.toFixed(2)}</td>
                    <td class="center-cell">${discountPercent}%</td>
                    <td class="number-cell">${totalBasic.toFixed(2)}</td>
                    <td class="center-cell">${gstRate}%</td>
                    <td class="number-cell">${gstAmount.toFixed(2)}</td>
                    <td class="number-cell">${totalAmount.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
              <tr class="totals-row">
                <td colspan="8" style="text-align: left; font-weight: bold;">Total Amount</td>
                <td class="number-cell">${(quotation.items || []).reduce((sum: number, item: any) => {
                  const basicAmount = item.unitPrice || 0;
                  const discountPercent = item.discount || 0;
                  return sum + (basicAmount * (1 - discountPercent / 100));
                }, 0).toFixed(2)}</td>
                <td></td>
                <td class="number-cell">${(quotation.items || []).reduce((sum: number, item: any) => {
                  const basicAmount = item.unitPrice || 0;
                  const discountPercent = item.discount || 0;
                  const totalBasic = basicAmount * (1 - discountPercent / 100);
                  const gstRate = item.taxRate || 0;
                  return sum + (totalBasic * (gstRate / 100));
                }, 0).toFixed(2)}</td>
                <td class="number-cell">${(quotation.items || []).reduce((sum: number, item: any) => {
                  const basicAmount = item.unitPrice || 0;
                  const discountPercent = item.discount || 0;
                  const totalBasic = basicAmount * (1 - discountPercent / 100);
                  const gstRate = item.taxRate || 0;
                  const gstAmount = totalBasic * (gstRate / 100);
                  return sum + (totalBasic + gstAmount);
                }, 0).toFixed(2)}</td>
              </tr>
              <tr class="grand-total-row">
                <td colspan="11" style="text-align: right; padding-right: 20px;">Grand Total</td>
                <td class="number-cell">${(quotation.items || []).reduce((sum: number, item: any) => {
                  const basicAmount = item.unitPrice || 0;
                  const discountPercent = item.discount || 0;
                  const totalBasic = basicAmount * (1 - discountPercent / 100);
                  const gstRate = item.taxRate || 0;
                  const gstAmount = totalBasic * (gstRate / 100);
                  return sum + (totalBasic + gstAmount);
                }, 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          
          <div class="terms-section">
            <div class="terms-title">TERMS & CONDITIONS:-</div>
            <table class="terms-table">
              <tr>
                <td class="terms-number">1</td>
                <td class="terms-label">Payment Terms</td>
                <td class="terms-colon">:</td>
                <td class="terms-value">100% advance payment alongwith PO.</td>
              </tr>
              <tr>
                <td class="terms-number">2</td>
                <td class="terms-label">Ordering and Payment</td>
                <td class="terms-colon">:</td>
                <td class="terms-value">In Favour of Sun Power Services.</td>
              </tr>
              <tr>
                <td class="terms-number">3</td>
                <td class="terms-label">Delivery</td>
                <td class="terms-colon">:</td>
                <td class="terms-value">With in One Month after your P.O.</td>
              </tr>
              <tr>
                <td class="terms-number">4</td>
                <td class="terms-label">Note</td>
                <td class="terms-colon">:</td>
                <td class="terms-value">Quality assured spares only</td>
              </tr>
              <tr>
                <td class="terms-number">5</td>
                <td class="terms-label">Quote Validity</td>
                <td class="terms-colon">:</td>
                <td class="terms-value">30 days from quote date</td>
              </tr>
            </table>
          </div>
          
          <div class="closing-text">
            Hope the above offer will meet your requirement and we will be expecting your valuable order at the earliest.
          </div>
          
          <div class="closing-text">
            Thanking you and assuring you our best and prompt services at all time.
          </div>
          
          <div class="footer-section">
            <div class="footer-left">
              <div style="font-weight: bold;">Sun Power Bank Details: -</div>
              <div class="company-details">
                Plot no 1, Phase 1, 4th Street, Annai velankani nagar, Madhananthapuram, porur, chennai 600116<br>
                Mobile: +91 9176660123<br>
                GSTIN: 33BLFPS9951M1ZC<br>
                Mail Id: sm@sunpowerservices.in / service@sunpowerservices.in
              </div>
            </div>
            <div class="footer-center">
              <div style="border: 1px solid #333; padding: 20px; margin: 10px;">
                QR Code<br>
                Scanner
              </div>
            </div>
            <div class="footer-right">
              <div style="margin-bottom: 10px; font-weight: bold;">For Sun Power Services</div>
              <div class="signature-line">Authorised Signature</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();

      // Wait for content to load, then print
      printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };
};



  // Submit advance payment
  // const submitAdvancePayment = async () => {
  //   if (!selectedQuotationForPayment) return;

  //   // Validate form before submission
  //   const errors: Record<string, string> = {};

  //   if (!advancePaymentData.amount || advancePaymentData.amount <= 0) {
  //     errors.amount = 'Payment amount must be greater than 0';
  //   }

  //   if (advancePaymentData.amount > (selectedQuotationForPayment.grandTotal || 0)) {
  //     errors.amount = 'Payment amount cannot exceed quotation total';
  //   }

  //   if (!advancePaymentData.paymentMethod) {
  //     errors.paymentMethod = 'Payment method is required';
  //   }

  //   if (!advancePaymentData.paymentDate) {
  //     errors.paymentDate = 'Payment date is required';
  //   }

  //   if (Object.keys(errors).length > 0) {
  //     setFormErrors(errors);
  //     toast.error('Please fix the errors before submitting');
  //     return;
  //   }

  //   try {
  //     setSubmitting(true);
  //     setFormErrors({}); // Clear any previous errors

  //     const response = await apiClient.quotations.updatePayment(selectedQuotationForPayment._id, {
  //       paidAmount: advancePaymentData.amount,
  //       paymentMethod: advancePaymentData.paymentMethod,
  //       paymentDate: advancePaymentData.paymentDate,
  //       notes: advancePaymentData.notes
  //     });

  //     if (response.success) {
  //       toast.success('Payment updated successfully');
  //       setShowAdvancePaymentModal(false);
  //       setSelectedQuotationForPayment(null);
  //       fetchQuotations(); // Refresh quotations
  //     }
  //   } catch (error: any) {
  //     console.error('Error updating payment:', error);
  //     toast.error('Failed to update payment');
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };





  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      <PageHeader
        title="Billing"
        subtitle="Create and manage customer invoices"
      >
        {(invoiceType === 'sale' || invoiceType === 'challan') && (
          <Button
            onClick={handleCreateInvoiceClick}
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
        {invoiceType === 'purchase' && (
          <Button
            onClick={handleCreatePurchaseInvoice}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Invoice</span>
          </Button>
        )}
      </PageHeader>

      {/* 🚀 KEYBOARD SHORTCUTS GUIDE */}
      {/* <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4 mb-4">
        <div className="flex items-center mb-2">
          <span className="text-lg">⚡</span>
          <h3 className="text-sm font-semibold text-purple-900 ml-2">Keyboard Shortcuts Available!</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-purple-800">
          <div>
            <p className="font-medium mb-1">🎯 Quick Create:</p>
            <p><kbd className="px-1 py-0.5 bg-purple-200 rounded text-xs">Ctrl+1</kbd> Create Quotation</p>
            <p><kbd className="px-1 py-0.5 bg-purple-200 rounded text-xs">Ctrl+2</kbd> Create Sales Invoice</p>
            <p><kbd className="px-1 py-0.5 bg-purple-200 rounded text-xs">Ctrl+3</kbd> Create Delivery Challan</p>
            <p className="text-gray-500 italic">Purchase Invoice: View/Edit only (no create)</p>
          </div>
          <div>
            <p className="font-medium mb-1">🔧 General Actions:</p>
            <p><kbd className="px-1 py-0.5 bg-purple-200 rounded text-xs">Ctrl+N</kbd> Create Current Type</p>
            <p><kbd className="px-1 py-0.5 bg-purple-200 rounded text-xs">Ctrl+R</kbd> Refresh Data</p>
            <p><kbd className="px-1 py-0.5 bg-purple-200 rounded text-xs">Ctrl+F</kbd> Focus Search</p>
          </div>
          <div>
            <p className="font-medium mb-1">💡 Pro Tips:</p>
            <p>• Shortcuts work when not typing in input fields</p>
            <p>• Works on both Windows (Ctrl) and Mac (Cmd)</p>
            <p>• Current type: <span className="font-bold text-purple-900">{getInvoiceTypeLabel(invoiceType)}</span></p>
          </div>
        </div>
      </div> */}

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
                placeholder={invoiceType === 'quotation' ? "Search quotations..." : "Search invoices, PO numbers..."}
                value={invoiceType === 'quotation' ? searchQuotationTerm : searchTerm}
                onChange={(e) => {
                  if (invoiceType === 'quotation') {
                    setSearchQuotationTerm(e.target.value);
                  } else {
                    setSearchTerm(e.target.value);
                  }
                }}
                data-field="search"
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter Custom Dropdown */}
            {invoiceType !== 'quotation' && <div className="relative dropdown-container">
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
            </div>}

            {/* Payment Filter Custom Dropdown */}
            {invoiceType !== 'quotation' && <div className="relative dropdown-container">
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
            </div>}
          </div>
          {/* Invoice Type Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {INVOICE_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => {
                  const selectedType = type.value as 'quotation' | 'sale' | 'purchase' | 'challan';
                  updateInvoiceType(selectedType);
                  setNewInvoice(prev => ({ ...prev, invoiceType: selectedType }));
                  setShowInvoiceTypeDropdown(false); // optional: close dropdown if open
                }}
                className={`px-3 py-2.5 rounded text-sm font-medium flex items-center space-x-1.5 transition-all duration-200 ${invoiceType === type.value
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
            Showing {invoiceType === 'quotation' ? filteredQuotations.length : filteredInvoices.length} of {invoiceType === 'quotation' ? quotations.length : invoices.length} {invoiceType === 'quotation' ? 'quotations' : 'invoices'}
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
                {/* {invoiceType === 'sale' && 
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quotation Ref</th>
                } */}
                {invoiceType === 'purchase' && 
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO No</th>
                }
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {invoiceType === 'purchase' ? 'Supplier' : 'Customer'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {invoiceType === 'quotation' ? 'Total Amount' : 'Amount'}
                </th>
                {(invoiceType === 'sale' || invoiceType === 'purchase' || invoiceType === 'quotation') && 
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                }
                {(invoiceType === 'sale' || invoiceType === 'purchase' || invoiceType === 'quotation') && 
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                }
                {(invoiceType === 'sale' || invoiceType === 'quotation' || invoiceType === 'purchase' || invoiceType === 'challan') && 
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                }
                {(invoiceType === 'sale' || invoiceType === 'quotation' || invoiceType === 'purchase') && 
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                }
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {invoiceType === 'quotation' ? 'Valid Until' : 'Due Date'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(invoiceType === 'quotation' ? quotationLoading : loading) ? (
                <tr>
                  <td colSpan={invoiceType === 'quotation' ? 9 : 10} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span>Loading {invoiceType === 'quotation' ? 'quotations' : 'invoices'}...</span>
                    </div>
                  </td>
                </tr>
              ) : (invoiceType === 'quotation' ? filteredQuotations : filteredInvoices).length === 0 ? (
                <tr>
                  <td colSpan={invoiceType === 'quotation' ? 9 : 10} className="px-6 py-8 text-center text-gray-500">
                    <div className="text-center">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No {invoiceType === 'quotation' ? 'quotations' : 'invoices'} found</p>
                      <p className="text-gray-500">Try adjusting your search or filters</p>
                    </div>
                  </td>
                </tr>
              ) : invoiceType === 'quotation' ? (
                filteredQuotations.map((quotation) => (
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
                    <td className="px-4 py-3 text-sm font-medium text-green-600">
                      ₹{(quotation.paidAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-red-600">
                      ₹{(quotation.remainingAmount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          quotation.status === 'draft' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : quotation.status === 'sent'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {quotation.status?.charAt(0).toUpperCase() + quotation.status?.slice(1) || 'Draft'}
                        </span>
                        {quotation.status === 'draft' && (
                          <span className="text-xs text-gray-500">
                            Send email to enable payments
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(quotation.paymentStatus || 'pending')}`}>
                          {getPaymentStatusLabel(quotation.paymentStatus || 'pending')}
                        </span>
                        {quotation.status === 'draft' && (
                          <span className="text-xs text-gray-500">
                            Not available for draft
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {quotation.validUntil
                        ? new Date(quotation.validUntil).toLocaleDateString('en-GB') // => 17/07/2025
                        : 'N/A'}
                    </td>

                    <td className="px-4 py-3 text-sm font-medium">
                      <div className="flex items-center space-x-1">
                        <Tooltip content="View" position="top">
                          <button
                            onClick={() => handleViewQuotation(quotation)}
                            className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded transition-colors duration-200"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Edit" position="top">
                          <button
                            onClick={() => handleEditQuotation(quotation)}
                            className="text-purple-600 hover:text-purple-900 p-1.5 hover:bg-purple-50 rounded transition-colors duration-200"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Update Payment" position="top">
                          <button
                            onClick={() => handleUpdatePayment(quotation, 'quotation')}
                            disabled={quotation.status === 'draft'}
                            className={`p-1.5 rounded transition-colors duration-200 ${
                              quotation.status !== 'draft'
                                ? 'text-green-600 hover:text-green-900 hover:bg-green-50'
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                            title={
                              quotation.status === 'draft' 
                                ? 'Send quotation via email first to enable payments' 
                                : 'Update payment for this quotation'
                            }
                          >
                            <IndianRupee className="w-4 h-4" />
                          </button>
                        </Tooltip>
                        <Tooltip content="Send Email" position="top">
                          <button
                            onClick={() => handleSendQuotationEmail(quotation)}
                            disabled={!quotation.customer?.email}
                            className={`p-1.5 rounded transition-colors duration-200 ${
                              quotation.customer?.email
                                ? 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                            title={
                              !quotation.customer?.email 
                                ? 'Customer email not available' 
                                : 'Send quotation to customer email (will update status to sent)'
                            }
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </Tooltip>
                        <Tooltip content="Delete" position="top">
                          <button
                            onClick={() => handleDeleteQuotation(quotation)}
                            className="text-red-600 hover:text-red-900 p-1.5 hover:bg-red-50 rounded transition-colors duration-200"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </Tooltip>
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
                    {/* {invoiceType === 'sale' && 
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {invoice.sourceQuotation ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-blue-600 font-medium">
                              From: {invoice.quotationPaymentDetails ? 'Quotation' : 'Quotation'}
                            </span>
                            {invoice.quotationPaymentDetails && (
                              <div className="text-xs text-gray-500 mt-1">
                                <div>Paid: ₹{invoice.quotationPaymentDetails.paidAmount?.toFixed(2) || '0.00'}</div>
                                <div>Remaining: ₹{invoice.quotationPaymentDetails.remainingAmount?.toFixed(2) || '0.00'}</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    } */}
                    {invoiceType === 'purchase' && 
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {invoice.poNumber ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-blue-600 font-medium">
                              {invoice.poNumber}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    }
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {invoiceType === 'purchase' ? invoice?.supplier?.name : invoice.customer?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {invoiceType === 'purchase' ? invoice.supplierEmail : invoice.customer?.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      ₹{(invoice.totalAmount || 0).toFixed(2)}
                    </td>
                    {(invoiceType === 'sale' || invoiceType === 'purchase') && <td className="px-4 py-3 text-sm font-medium text-green-600">
                      ₹{(invoice.paidAmount || 0).toLocaleString()}
                    </td>}
                    {(invoiceType === 'sale' || invoiceType === 'purchase') && <td className="px-4 py-3 text-sm font-medium text-red-600">
                      ₹{((invoice.remainingAmount || 0).toFixed(2) || (invoice.totalAmount || 0) - (invoice.paidAmount || 0)).toLocaleString()}
                    </td>}
                    {(invoice.invoiceType === 'sale') ? <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        {/* {getStatusIcon(invoice.status)} */}
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </div>
                    </td>
                      : <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          {/* {getStatusIcon(invoice.status)} */}
                          {invoice.status === 'cancelled' ? <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span> :  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${((invoice.externalInvoiceTotal || 0).toFixed(2) === (invoice.totalAmount || 0).toFixed(2))
                            ? "bg-green-100 text-green-800" : (invoice.externalInvoiceTotal || 0) === 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {(invoice.externalInvoiceTotal || 0).toFixed(2) === (invoice.totalAmount || 0).toFixed(2) ? "Matched" : (invoice.externalInvoiceTotal || 0) === 0 ? "Matched" : "Mismatch"}
                          </span>}
                        </div>
                      </td>}
                    {(invoiceType === 'sale' || invoiceType === 'purchase') && <td className="px-4 py-3">
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
                          <Tooltip key={index} content={action.label} position="top">
                            <button
                              onClick={action.action}
                              className={`${action.color} p-2 rounded-lg transition-colors hover:shadow-md`}
                            >
                              {action.icon}
                            </button>
                          </Tooltip>
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

                {/* Payment Receipt Buttons - Show only if there are payments */}
                {/* {selectedInvoice.paidAmount > 0 && (
                  <>
                    <button
                      onClick={() => generatePaymentReceipt(selectedInvoice)}
                      className="flex items-center px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      <Receipt className="w-4 h-4 mr-1" />
                      Receipt PDF
                    </button>
                    <button
                      onClick={() => printPaymentReceipt(selectedInvoice)}
                      className="flex items-center px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
                    >
                      <Printer className="w-4 h-4 mr-1" />
                      Print Receipt
                    </button>
                  </>
                )} */}
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

            <div className="p-6 space-y-6">
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
                    {selectedInvoice.poNumber && <p className="text-sm text-gray-600 mt-1">
                      PO Number: {selectedInvoice.poNumber}
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

              {/* Company Information */}
              <div className={`grid grid-cols-1 gap-6 ${selectedInvoice?.assignedEngineer ? 'md:grid-cols-4' : selectedInvoice?.invoiceType === 'purchase' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">From:</h4>
                  {selectedInvoice?.invoiceType === 'purchase' ? (
                    // For purchase invoices: Show supplier
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">{selectedInvoice?.supplier?.name || 'N/A'}</p>
                      {selectedInvoice?.supplierEmail && <p>Email: {selectedInvoice?.supplierEmail}</p>}
                      {selectedInvoice?.supplierAddress && (
                        <>
                          <p className="mt-2 font-medium text-gray-700">Address:</p>
                          {selectedInvoice?.supplierAddress?.address && <p>{selectedInvoice?.supplierAddress?.address}</p>}
                          {selectedInvoice?.supplierAddress?.district && selectedInvoice?.supplierAddress?.pincode && (
                            <p>{selectedInvoice?.supplierAddress?.district}, {selectedInvoice?.supplierAddress?.pincode}</p>
                          )}
                          {selectedInvoice?.supplierAddress?.state && <p>{selectedInvoice?.supplierAddress?.state}</p>}
                          {selectedInvoice?.supplierAddress?.gstNumber && (
                            <p className="text-sm text-gray-600">GST: {selectedInvoice?.supplierAddress?.gstNumber}</p>
                          )}
                          {selectedInvoice?.supplierAddress?.isPrimary && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mt-1">
                              Primary Address
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    // For regular invoices: Show company
                    <div className="text-sm text-gray-600">
                      <p className="font-medium">{selectedInvoice?.company?.name || 'Sun Power Services'}</p>
                      {selectedInvoice?.company?.phone && <p>Phone: {selectedInvoice?.company?.phone}</p>}
                      {selectedInvoice?.company?.email && <p>Email: {selectedInvoice?.company?.email}</p>}
                      {selectedInvoice?.company?.pan && <p>PAN: {selectedInvoice?.company?.pan}</p>}
                      {selectedInvoice?.location && (
                        <>
                          <p className="mt-2 font-medium text-gray-700">Address:</p>
                          {selectedInvoice?.location?.name && <p>{selectedInvoice?.location?.name}</p>}
                          {selectedInvoice?.location?.address && <p>{selectedInvoice?.location?.address}</p>}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  {selectedInvoice?.invoiceType === 'purchase' ? (
                    // For purchase invoices: Show company
                    <div className="text-sm text-gray-600">
                      <h4 className="font-medium text-gray-900 mb-2">To:</h4>
                      <p className="font-medium">{selectedInvoice?.company?.name || 'Sun Power Services'}</p>
                      {selectedInvoice?.company?.phone && <p>Phone: {selectedInvoice?.company?.phone}</p>}
                      {selectedInvoice?.company?.email && <p>Email: {selectedInvoice?.company?.email}</p>}
                      {selectedInvoice?.company?.pan && <p>PAN: {selectedInvoice?.company?.pan}</p>}
                      {selectedInvoice?.location && (
                        <>
                          <p className="mt-2 font-medium text-gray-700">Address:</p>
                          {selectedInvoice?.location?.name && <p>{selectedInvoice?.location?.name}</p>}
                          {selectedInvoice?.location?.address && <p>{selectedInvoice?.location?.address}</p>}
                        </>
                      )}
                    </div>
                  ) : (
                    // For regular invoices: Show customer
                    <div className="text-sm text-gray-600">
                      <h4 className="font-medium text-gray-900 mb-2">Bill To:</h4>
                      <p className="font-medium">{selectedInvoice?.customer?.name || 'N/A'}</p>
                      {selectedInvoice?.customer?.email && <p>Email: {selectedInvoice?.customer?.email}</p>}
                      {selectedInvoice?.customer?.phone && <p>Phone: {selectedInvoice?.customer?.phone}</p>}
                      {selectedInvoice?.billToAddress && (
                        <>
                          <p className="mt-2 font-medium text-gray-700">Address:</p>
                          {selectedInvoice?.billToAddress?.address && <p>{selectedInvoice?.billToAddress?.address}</p>}
                          {selectedInvoice?.billToAddress?.district && selectedInvoice?.billToAddress?.pincode && (
                            <p>{selectedInvoice?.billToAddress?.district}, {selectedInvoice?.billToAddress?.pincode}</p>
                          )}
                          {selectedInvoice?.billToAddress?.state && <p>{selectedInvoice?.billToAddress?.state}</p>}
                          {selectedInvoice?.billToAddress?.gstNumber && (
                            <p className="text-sm text-gray-600">GST: {selectedInvoice?.billToAddress?.gstNumber}</p>
                          )}
                          {selectedInvoice?.billToAddress?.isPrimary && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mt-1">
                              Primary Address
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  {selectedInvoice?.invoiceType === 'purchase' ? (
                    <></>
                    // For purchase invoices: Show company
                    // <div className="text-sm text-gray-600">
                    //   <h4 className="font-medium text-gray-900 mb-2">To:</h4>
                    //   <p className="font-medium">{selectedInvoice?.company?.name || 'Sun Power Services'}</p>
                    //   {selectedInvoice?.location && (
                    //     <>
                    //       <p className="mt-2 font-medium text-gray-700">Address:</p>
                    //       {selectedInvoice?.location?.name && <p>{selectedInvoice?.location?.name}</p>}
                    //       {selectedInvoice?.location?.address && <p>{selectedInvoice?.location?.address}</p>}
                    //     </>
                    //   )}
                    // </div>
                  ) : (
                    // For regular invoices: Show customer
                    <div className="text-sm text-gray-600">
                      <h4 className="font-medium text-gray-900 mb-2">Ship To:</h4>
                      <p className="font-medium">{selectedInvoice?.customer?.name || 'N/A'}</p>
                      {selectedInvoice?.shipToAddress && (
                        <>
                          <p className="mt-2 font-medium text-gray-700">Address:</p>
                          {selectedInvoice?.shipToAddress?.address && <p>{selectedInvoice?.shipToAddress?.address}</p>}
                          {selectedInvoice?.shipToAddress?.district && selectedInvoice?.shipToAddress?.pincode && (
                            <p>{selectedInvoice?.shipToAddress?.district}, {selectedInvoice?.shipToAddress?.pincode}</p>
                          )}
                          {selectedInvoice?.shipToAddress?.state && <p>{selectedInvoice?.shipToAddress?.state}</p>}
                          {selectedInvoice?.shipToAddress?.gstNumber && (
                            <p className="text-sm text-gray-600">GST: {selectedInvoice?.shipToAddress?.gstNumber}</p>
                          )}
                          {selectedInvoice?.shipToAddress?.isPrimary && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mt-1">
                              Primary Address
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {selectedInvoice?.assignedEngineer && <div>
                  <h4 className="font-medium text-gray-900 mb-2">Assigned Engineer:</h4>
                  <div className="text-sm text-gray-600">
                    {selectedInvoice?.assignedEngineer ? (
                      <>
                        <p className="font-medium">{selectedInvoice.assignedEngineer?.firstName} {selectedInvoice.assignedEngineer?.lastName}</p>
                        {selectedInvoice.assignedEngineer?.email && <p>Email: {selectedInvoice.assignedEngineer?.email}</p>}
                        {selectedInvoice.assignedEngineer?.phone && <p>Phone: {selectedInvoice.assignedEngineer?.phone}</p>}
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Field Operator
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 italic">No engineer assigned</p>
                    )}
                  </div>
                </div>}
              </div>

              {/* Total Amount Mismatch Warning */}
              {hasAmountMismatch(selectedInvoice) && (
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
                        // Only allow edit if there's a real amount mismatch
                        if (hasAmountMismatch(selectedInvoice)) {
                          // Create a backup of current state when entering edit mode
                          if (selectedInvoice && !originalInvoiceData) {
                            setOriginalInvoiceData(JSON.parse(JSON.stringify(selectedInvoice)));
                          }
                          setEditMode(true);
                        }
                      }}
                      className={`ml-3 px-3 py-1 rounded-md text-sm transition-colors ${hasAmountMismatch(selectedInvoice)
                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      disabled={!hasAmountMismatch(selectedInvoice)}
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
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">HSN Number</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part No</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tax Rate</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        {editMode && hasAmountMismatch(selectedInvoice) && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(selectedInvoice.items || []).map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.hsnNumber || item?.product?.hsnNumber || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.uom || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.partNo || item?.product?.partNo || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {editMode && hasAmountMismatch(selectedInvoice) ? (
                              <input
                                type="number"
                                placeholder="₹0.00"
                                value={item.unitPrice === null || item.unitPrice === 0 ? '' : item.unitPrice}
                                onChange={(e) => handleItemEdit(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                onBlur={() => recalculateItem(index)}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                step="1"
                              />
                            ) : (
                              `₹${(item.unitPrice ?? 0).toFixed(2)}`
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.discount || 0}%</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {editMode && hasAmountMismatch(selectedInvoice) ? (
                              <input
                                type="number"
                                value={item.taxRate === null || item.taxRate === 0 ? '' : item.taxRate}
                                placeholder="0 - 100%"
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const num = parseFloat(value);
                                  if (value === '') {
                                    handleItemEdit(index, 'taxRate', null); // Allow clearing
                                  } else if (!isNaN(num) && num >= 0 && num <= 100) {
                                    handleItemEdit(index, 'taxRate', num);
                                  }
                                }}
                                className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            ) : (
                              `${(item.taxRate || 0).toFixed(2)}%`
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">₹{(item.unitPrice * item.quantity * (1 - (item.discount || 0) / 100) * (1 + (item.taxRate || 0) / 100)).toFixed(2)}</td>
                          {editMode && hasAmountMismatch(selectedInvoice) && item.quantity !== 0 && (
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
                      <p>Make adjustments to unit prices and tax rates.</p>
                      {hasAmountMismatch(selectedInvoice) && (
                        <p className="font-medium mt-1">Target Total: ₹{(selectedInvoice?.externalInvoiceTotal ?? 0).toFixed(2)}</p>
                      )}
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
                          const success = await handleSaveChanges();
                          if (success) {
                            // Update the original data after successful save
                            if (selectedInvoice) {
                              setOriginalInvoiceData(JSON.parse(JSON.stringify(selectedInvoice)));
                            }
                            setEditMode(false);
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

              {/* Notes and Terms */}
              {(selectedInvoice.notes || selectedInvoice.terms) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {selectedInvoice.notes && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Notes:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {selectedInvoice.notes}
                      </p>
                    </div>
                  )}
                  {selectedInvoice.terms && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Terms & Conditions:</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {selectedInvoice.terms}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Invoice Summary */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-3 text-right">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{(selectedInvoice.items || []).reduce((sum: number, item: any) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0)), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Tax:</span>
                      <span className="font-medium">₹{(selectedInvoice.items || []).reduce((sum: number, item: any) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0) * (item.taxRate ?? 0) / 100), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Discount:</span>
                      <span className="font-medium text-green-600">-₹{(selectedInvoice.discountAmount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Overall Discount:</span>
                      <span className="font-medium text-green-600">-{selectedInvoice.overallDiscount || 0}% (-₹{selectedInvoice.overallDiscountAmount?.toFixed(2) || '0.00'})</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-3">
                      <span>Grand Total:</span>
                      <span className={hasAmountMismatch(selectedInvoice) ? 'text-red-600' : 'text-blue-600'}>
                        ₹{safeToFixed(selectedInvoice?.totalAmount)}
                      </span>
                    </div>
                    {hasAmountMismatch(selectedInvoice) && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>External Total:</span>
                        <span>₹{safeToFixed(selectedInvoice?.externalInvoiceTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs pt-2 border-t">
                      <span className="text-gray-600">Amount in Words:</span>
                      <span className="font-medium text-gray-700 max-w-xs text-right">{selectedInvoice?.totalAmount ? numberToWords(selectedInvoice.totalAmount) : 'Zero Rupees Only'}</span>
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
                            className={`flex items-center justify-between w-full px-4 py-3 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 bg-gray-50 ${formErrors.paymentStatus ? 'border-red-500' : 'border-gray-300'}`}
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
                            className={`flex items-center justify-between w-full px-4 py-3 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 bg-gray-50 ${formErrors.paymentMethod ? 'border-red-500' : 'border-gray-300'}`}
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
                    // disabled={!isPaymentFormValid() || submitting || invoiceType === 'purchase'}
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







      {/* Quotation View Modal */}
      {showQuotationViewModal && selectedQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Quotation - {selectedQuotation.quotationNumber}</h2>
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
                    <div className="flex space-x-2 mb-2">
                      <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                        selectedQuotation.status === 'draft' 
                          ? 'bg-yellow-100 text-yellow-800' 
                          : selectedQuotation.status === 'sent'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedQuotation.status === 'draft' ? 'Draft' : 
                         selectedQuotation.status === 'sent' ? 'Sent' : 
                         selectedQuotation.status}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCreateInvoiceFromQuotation(selectedQuotation)}
                        className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Create Invoice
                      </button>
                      <button
                        onClick={() => handleSendQuotationEmail(selectedQuotation)}
                        disabled={!selectedQuotation.customer?.email}
                        className={`flex items-center px-3 py-1 text-sm rounded-md ${
                          selectedQuotation.customer?.email 
                            ? 'bg-green-600 text-white hover:bg-green-700' 
                            : 'bg-gray-400 text-white cursor-not-allowed'
                        }`}
                        title={selectedQuotation.customer?.email ? 'Send quotation to customer email (will update status to sent)' : 'Customer email not available'}
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Send Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div className={`grid grid-cols-1 gap-6 ${selectedQuotation?.assignedEngineer ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">From:</h4>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{selectedQuotation?.company?.name || 'Sun Power Services'}</p>
                    {selectedQuotation?.company?.phone && <p>Phone: {selectedQuotation?.company?.phone}</p>}
                    {selectedQuotation?.company?.email && <p>Email: {selectedQuotation?.company?.email}</p>}
                    {selectedQuotation?.company?.pan && <p>PAN: {selectedQuotation?.company?.pan}</p>}
                    {selectedQuotation?.location && (
                      <>
                        <p className="mt-2 font-medium text-gray-700">Address:</p>
                        {selectedQuotation?.location?.name && <p>{selectedQuotation?.location?.name}</p>}
                        {selectedQuotation?.location?.address && <p>{selectedQuotation?.location?.address}</p>}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">
                    <h4 className="font-medium text-gray-900 mb-2">Bill To:</h4>
                    <p className="font-medium">{selectedQuotation?.customer?.name || 'N/A'}</p>
                    {selectedQuotation?.customer?.email && <p>Email: {selectedQuotation?.customer?.email}</p>}
                    {selectedQuotation?.customer?.phone && <p>Phone: {selectedQuotation?.customer?.phone}</p>}
                    {selectedQuotation?.billToAddress && (
                      <>
                        <p className="mt-2 font-medium text-gray-700">Address:</p>
                        {selectedQuotation?.billToAddress?.address && <p>{selectedQuotation?.billToAddress?.address}</p>}
                        {selectedQuotation?.billToAddress?.district && selectedQuotation?.billToAddress?.pincode && (
                          <p>{selectedQuotation?.billToAddress?.district}, {selectedQuotation?.billToAddress?.pincode}</p>
                        )}
                        {selectedQuotation?.billToAddress?.state && <p>{selectedQuotation?.billToAddress?.state}</p>}
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-600">
                    <h4 className="font-medium text-gray-900 mb-2">Ship To:</h4>
                    <p className="font-medium">{selectedQuotation?.customer?.name || 'N/A'}</p>
                    {selectedQuotation?.shipToAddress && (
                      <>
                        <p className="mt-2 font-medium text-gray-700">Address:</p>
                        {selectedQuotation?.shipToAddress?.address && <p>{selectedQuotation?.shipToAddress?.address}</p>}
                        {selectedQuotation?.shipToAddress?.district && selectedQuotation?.shipToAddress?.pincode && (
                          <p>{selectedQuotation?.shipToAddress?.district}, {selectedQuotation?.shipToAddress?.pincode}</p>
                        )}
                        {selectedQuotation?.shipToAddress?.state && <p>{selectedQuotation?.shipToAddress?.state}</p>}
                      </>
                    )}
                  </div>
                </div>

                {selectedQuotation?.assignedEngineer && <div>
                  <h4 className="font-medium text-gray-900 mb-2">Assigned Engineer:</h4>
                  <div className="text-sm text-gray-600">
                    {selectedQuotation?.assignedEngineer ? (
                      <>
                        <p className="font-medium">{selectedQuotation.assignedEngineer?.firstName} {selectedQuotation.assignedEngineer?.lastName}</p>
                        {selectedQuotation.assignedEngineer?.email && <p>Email: {selectedQuotation.assignedEngineer?.email}</p>}
                        {selectedQuotation.assignedEngineer?.phone && <p>Phone: {selectedQuotation.assignedEngineer?.phone}</p>}
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                            Field Operator
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500 italic">No engineer assigned</p>
                    )}
                  </div>
                </div>}
              </div>

              {/* Quotation Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Items:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">HSN Number</th>
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
                          <td className="px-4 py-2 text-sm text-gray-900">{item.hsnNumber || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.uom}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.partNo || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">₹{item.unitPrice?.toLocaleString()}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.discount || 0}%</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.taxRate || 0}%</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">₹{(item.unitPrice * item.quantity * (1 - item.discount / 100) * (1 + item.taxRate / 100)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

              {/* Quotation Summary */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-end">
                  <div className="w-80 space-y-3 text-right">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">₹{(selectedQuotation.items || []).reduce((sum: number, item: any) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0)), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Tax:</span>
                      <span className="font-medium">₹{(selectedQuotation.items || []).reduce((sum: number, item: any) => sum + ((item.quantity ?? 0) * (item.unitPrice ?? 0) * (item.taxRate ?? 0) / 100), 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Discount:</span>
                      <span className="font-medium text-green-600">-₹{(selectedQuotation.totalDiscount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Overall Discount:</span>
                      <span className="font-medium text-green-600">-{selectedQuotation.overallDiscount || 0}% (-₹{selectedQuotation.overallDiscountAmount?.toFixed(2) || '0.00'})</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg border-t pt-3">
                      <span>Grand Total:</span>
                      <span className="text-blue-600">₹{selectedQuotation.grandTotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs pt-2 border-t">
                      <span className="text-gray-600">Amount in Words:</span>
                      <span className="font-medium text-gray-700 max-w-xs text-right">{selectedQuotation?.grandTotal ? numberToWords(selectedQuotation.grandTotal) : 'Zero Rupees Only'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && confirmationData && (
        <ConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          onConfirm={confirmationData.onConfirm}
          title={confirmationData.title}
          message={confirmationData.message}
          type={confirmationData.type}
          confirmText="Confirm"
          cancelText="Cancel"
        />
      )}

      {/* Unified Update Payment Modal */}
      <UpdatePaymentModal
        isOpen={showAdvancePaymentModal}
        onClose={() => setShowAdvancePaymentModal(false)}
        item={selectedQuotationForPayment}
        itemType="quotation"
        onSubmit={async (paymentData) => {
          try {
            setSubmitting(true);
            const response = await apiClient.quotations.updatePayment(selectedQuotationForPayment!._id, {
              paidAmount: paymentData.paidAmount,
              paymentMethod: paymentData.paymentMethod,
              paymentDate: paymentData.paymentDate,
              notes: paymentData.notes
            });

            if (response.success) {
              toast.success('Payment updated successfully');
              setShowAdvancePaymentModal(false);
              setSelectedQuotationForPayment(null);
              fetchQuotations();
            }
          } catch (error: any) {
            console.error('Error updating payment:', error);
            toast.error('Failed to update payment');
          } finally {
            setSubmitting(false);
          }
        }}
        submitting={submitting}
      />

    </div>
  );
};

export default InvoiceManagement;