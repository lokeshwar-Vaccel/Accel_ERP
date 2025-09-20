import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Plus,
  Search,
  Filter,
  Package,
  Calendar,
  CheckCircle,
  Clock,
  Truck,
  AlertTriangle,
  Edit,
  Eye,
  Send,
  X,
  FileText,
  Download,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Check,
  Ban,
  ChevronDown,
  Trash2,
  Users,
  IndianRupee
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import { Pagination } from 'components/ui/Pagination';
import toast from 'react-hot-toast';
import { PaymentMethodDetails } from '../types';

// Types matching backend structure
type PurchaseOrderStatus = 'approved_order_sent_sap' | 'credit_not_available' | 'fully_invoiced' | 'order_under_process' | 'partially_invoiced' | 'rejected';

interface POItem {
  product: string | {
    _id: string;
    name: string;
    category: string;
    brand?: string;
    modelNumber?: string;
    partNo?: string;
    hsnNumber?: string;
    uom?: string;
    price?: number;
    gst?: number;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  discountRate?: number; // Discount percentage (0-100)
  discountAmount?: number; // Calculated discount amount
  receivedQuantity?: number; // Track received quantities
  notes?: string;
}
interface POItem1 {

  product: string,
  description: string,
  quantity: number,
  unitPrice: number,
  taxRate: number

}

interface SupplierAddress {
  address: string;
  state: string;
  district: string;
  pincode: string;
  gstNumber?: string;
  id?: string; // for frontend keying
  isPrimary?: boolean;
}

interface Supplier {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  addresses?: SupplierAddress[];
  contactPerson?: string;
  type?: string;
}

interface StockLocation {
  _id: string;
  name: string;
  type: string;
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier: string | Supplier;
  supplierEmail: string | any;
  items: POItem[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  sourceType?: 'manual' | 'amc' | 'service' | 'inventory';
  sourceId?: string;
  department: 'retail' | 'corporate' | 'industrial_marine' | 'others'; // Department for this purchase order
  purchaseOrderType: 'commercial' | 'breakdown_order';
  notes?: string;
  attachments?: string[];
  approvedBy?: string;
  // Payment fields
  paidAmount?: number;
  remainingAmount?: number;
  paymentStatus?: 'pending' | 'partial' | 'paid' | 'failed';
  paymentMethod?: string;
  paymentMethodDetails?: PaymentMethodDetails;
  paymentDate?: string;
  createdBy: string | {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  deliveryStatus?: string;
  daysUntilDelivery?: number;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  partNo?: string;
  price?: number;
  gst?: number; // GST rate in percent
  minStockLevel?: number;
  currentStock?: number;
  specifications?: Record<string, any>;
}

interface ReceiveItemsData {
  receivedItems: Array<{
    productId: string;
    quantityReceived: number;
    condition: 'good' | 'damaged' | 'defective';
    batchNumber?: string;
    notes?: string;
  }>;
  items: POItem1[]; // <-- Add this line
  location: string;
  receiptDate: string;
  inspectedBy: string;
  notes?: string;
  supplier?: string;
  supplierEmail?: string;
  supplierAddress?: SupplierAddress;
  externalInvoiceTotal?: number;
  // Add totalAmount field for clarity - this will be the invoice total
  totalAmount?: number;
  // New shipping and documentation fields
  shipDate: string;
  docketNumber: string;
  noOfPackages: number;
  gstInvoiceNumber: string;
  invoiceDate: string;
  documentNumber: string;
  documentDate: string;
}

interface POFormData {
  supplier: string;
  supplierEmail: string;
  supplierAddress?: SupplierAddress; // now an object, not a string
  expectedDeliveryDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sourceType: 'manual' | 'amc' | 'service' | 'inventory';
  sourceId?: string;
  department?: 'retail' | 'corporate' | 'industrial_marine' | 'others'; // Department for this purchase order
  notes?: string;
  items: Array<{
    product: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    notes?: string;
  }>;
}

const PurchaseOrderManagement: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // Core state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  console.log("suppliers-99992:", suppliers);
  console.log("purchaseOrders-99992:", purchaseOrders);


  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showCreateSupplierDropdown, setShowCreateSupplierDropdown] = useState(false);
  const [showEditSupplierDropdown, setShowEditSupplierDropdown] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDatas, setTotalDatas] = useState(0);
  const [sort, setSort] = useState('-createdAt');

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Selected data
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  console.log("selectedPO--:",selectedPO);
  

  // Payment update state
  const [paymentUpdate, setPaymentUpdate] = useState({
    paidAmount: 0,
    paymentMethod: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
    paymentMethodDetails: {} as PaymentMethodDetails
  });
  const [showPaymentMethodDropdown, setShowPaymentMethodDropdown] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  const [totalPurchaseOrdersCount, setTotalPurchaseOrdersCount] = useState(0);
  const [pendingPurchaseOrdersCount, setPendingPurchaseOrdersCount] = useState(0);
  const [confirmedPurchaseOrdersCount, setConfirmedPurchaseOrdersCount] = useState(0);



  const [newInvoice, setNewInvoice] = useState({
    // customer: '',
    // dueDate: '',
    // invoiceType: 'sale',
    // location: '',
    // notes: '',
    items: [
      {
        product: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 0
      }
    ],
    // discountAmount: 0,

    // externalInvoiceTotal: 0,
    // reduceStock: true
  });


  // Add these state variables and refs at the top of your component
  const [debouncedExternalTotal, setDebouncedExternalTotal] = useState('');
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);


  // Modal search states
  const [detailsSearchTerm, setDetailsSearchTerm] = useState('');
  const [receiveSearchTerm, setReceiveSearchTerm] = useState('');



  const [receiveData, setReceiveData] = useState<ReceiveItemsData>({
    receivedItems: [],
    items: [], // <-- Add this line
    location: '',
    receiptDate: '',
    inspectedBy: '',
    supplier: '',
    supplierEmail: '',
    supplierAddress: {
      address: '',
      state: '',
      district: '',
      pincode: ''
    },
    externalInvoiceTotal: 0,
    notes: '',
    // New shipping and documentation fields
    shipDate: new Date().toISOString().split('T')[0],
    docketNumber: '',
    noOfPackages: 1,
    gstInvoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    documentNumber: '',
    documentDate: new Date().toISOString().split('T')[0],
  });

  console.log("receiveData-12:", receiveData);






  // Import state
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status dropdown state (still needed for filtering)
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Form errors (still needed for receive modal)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Add state for address dropdown and addresses
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [addresses, setAddresses] = useState<SupplierAddress[]>([]);
  console.log("addresses-12:", addresses);

  // Add state for GST Invoice Number validation
  const [gstInvoiceValidation, setGstInvoiceValidation] = useState<{
    isValidating: boolean;
    isDuplicate: boolean;
    message: string;
  }>({
    isValidating: false,
    isDuplicate: false,
    message: ''
  });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Debounced GST Invoice Number validation
  const validateGstInvoiceNumber = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return async (gstInvoiceNumber: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          if (!gstInvoiceNumber || gstInvoiceNumber.trim() === '') {
            setGstInvoiceValidation({
              isValidating: false,
              isDuplicate: false,
              message: ''
            });
            return;
          }

          setGstInvoiceValidation(prev => ({ ...prev, isValidating: true }));

          try {
            const response = await apiClient.purchaseOrders.checkGstInvoiceNumber(gstInvoiceNumber.trim());
            if (response.data.exists) {
              const foundIn = response.data.foundIn === 'purchase_order' ? 'Purchase Order' : 'Invoice';
              setGstInvoiceValidation({
                isValidating: false,
                isDuplicate: true,
                message: `GST Invoice Number already exists in ${foundIn}`
              });
            } else {
              setGstInvoiceValidation({
                isValidating: false,
                isDuplicate: false,
                message: ''
              });
            }
          } catch (error) {
            console.error('Error checking GST Invoice Number:', error);
            setGstInvoiceValidation({
              isValidating: false,
              isDuplicate: false,
              message: ''
            });
          }
        }, 500);
      };
    })(),
    []
  );

  // Cleanup function to clear validation timeout
  const clearGstInvoiceValidation = useCallback(() => {
    setGstInvoiceValidation({
      isValidating: false,
      isDuplicate: false,
      message: ''
    });
  }, []);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Check for URL parameters to auto-open create modal
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('action') === 'create') {
      handleCreatePO();
      // Clear the URL parameter
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location]);

  const quickActions = [
    {
      title: 'Create Supplier',
      route: '/lead-management',
      action: () => navigate('/lead-management?action=create-supplier')
    }
  ];

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPurchaseOrders(),
        fetchProducts(),
        fetchLocations(),
        fetchSuppliers()
      ]);
      // toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {

    const params: any = {
      page: currentPage,
      limit,
      sort,
      search: searchTerm,
      ...(statusFilter !== 'all' && { status: statusFilter }),
      // ...(leadSourceFilter && { leadSource: leadSourceFilter }),
      // ...(dateFrom && { dateFrom }),
      // ...(dateTo && { dateTo }),
      // ...(assignedToParam && { assignedTo: assignedToParam }),
    };

    try {
      const response = await apiClient.purchaseOrders.getAll(params);

      setCurrentPage(response.pagination.page);
      setLimit(response.pagination.limit);
      setTotalDatas(response.pagination.total);
      setTotalPages(response.pagination.pages);
      setTotalPurchaseOrdersCount(response.totalPurchaseOrdersCount || 0);
      setPendingPurchaseOrdersCount(response.pendingPurchaseOrdersCount || 0);
      setConfirmedPurchaseOrdersCount(response.confirmedPurchaseOrdersCount || 0);

      let ordersData: PurchaseOrder[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          ordersData = response.data;
        } else if ((response.data as any).orders && Array.isArray((response.data as any).orders)) {
          ordersData = (response.data as any).orders;
        }
      }

      setPurchaseOrders(ordersData);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrders([]);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [currentPage, limit, sort, searchTerm, statusFilter]);


  const fetchProducts = async () => {
    try {
      let allProducts: any[] = [];
      let page = 1;
      let hasMore = true;



      while (hasMore) {
        const response: any = await apiClient.products.getAll({ page, limit: 50 });
        let productsData: any[] = [];
        if (response?.data) {
          if (Array.isArray(response.data)) {
            productsData = response.data;
          } else if (response.data.products && Array.isArray(response.data.products)) {
            productsData = response.data.products;
          }
        }
        allProducts = allProducts.concat(productsData);

        // Check if there are more pages
        const pagination = response?.pagination || response?.data?.pagination;
        if (pagination && pagination.pages && page < pagination.pages) {
          page += 1;
        } else {
          hasMore = false;
        }
      }

      // Remove duplicates based on _id
      const uniqueProducts = allProducts.filter((product, index, self) =>
        index === self.findIndex(p => p._id === product._id)
      );

      setProducts(uniqueProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };


  const fetchLocations = async () => {
    try {
      const response = await apiClient.stock.getLocations();

      let locationsData: StockLocation[] = [];
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

  const fetchSuppliers = async () => {
    try {
      console.log('Fetching suppliers...');
      const response = await apiClient.customers.getAll({
        type: 'supplier',
        limit: 100 // Use valid limit
      });
      console.log('Suppliers API response:', response);

      let suppliersData: Supplier[] = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          suppliersData = response.data as Supplier[];
        } else if (typeof response.data === 'object' && Array.isArray((response.data as any).customers)) {
          suppliersData = (response.data as { customers: Supplier[] }).customers;
        } else if (response.success && response.data && Array.isArray(response.data)) {
          suppliersData = response.data as Supplier[];
        } else if (response.success && response.data && typeof response.data === 'object' && (response.data as any).customers) {
          suppliersData = (response.data as any).customers as Supplier[];
        }
      }
      console.log('Processed suppliers data:', suppliersData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };


  // Helper functions
  const getCreatedByName = (createdBy: string | { firstName: string; lastName: string; email: string }) => {
    if (typeof createdBy === 'string') return createdBy;
    if (createdBy && typeof createdBy === 'object') {
      return `${createdBy.firstName || ''} ${createdBy.lastName || ''}`.trim();
    }
  };

  const getProductName = (product: string | { name: string; partNo?: string }): string => {
    if (typeof product === 'string') {
      // If it's still a string (ObjectId), it means it wasn't populated
      // Try to find product details from our products list
      const foundProduct = products.find(p => p._id === product);
      if (foundProduct) {
        return foundProduct.name;
      }

      return `[${product.slice(-8)}]`; // Show last 8 chars of ObjectId
    }
    return product?.name || 'Unknown Product';
  };

  const getProductPartNo = (product: string | { name: string; partNo?: string }): string => {
    if (typeof product === 'string') {
      // Try to find product details from our products list
      const foundProduct = products.find(p => p._id === product);
      if (foundProduct && foundProduct.partNo) {
        return foundProduct.partNo;
      }
      return '-';
    }
    return product?.partNo || '-';
  };

  const handleCreatePO = async () => {
    navigate('/purchase-order-management/create');
  };

  const handleEditPO = async (po: PurchaseOrder) => {
    // Navigate to the edit page with state instead of query parameter
    navigate('/purchase-order-management/edit', { state: { poId: po._id } });
  };

  const openDetailsModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setDetailsSearchTerm(''); // Clear search when opening modal
    setShowDetailsModal(true);
    // Fetch payment history when opening details modal
    fetchPaymentHistory(po._id);
  };

  const openReceiveModal = (po: PurchaseOrder) => {
    console.log("po-12:", po);

    setSelectedPO(po);
    setReceiveSearchTerm(''); // Clear search when opening modal

    // Clear any existing form errors
    setFormErrors({});

    // Extract supplier name from purchase order
    const extractedSupplierName = typeof po.supplier === 'string' ? po.supplier : (po.supplier as Supplier)?.name || 'Unknown Supplier';
    const extractedSupplierEmail = typeof po.supplierEmail === 'string' ? po.supplierEmail : (po.supplierEmail as any)?.email || 'No Email';

    // Prefer the supplierAddress stored in the PO (from creation)
    let extractedSupplierAddress: SupplierAddress = {
      address: '',
      state: '',
      district: '',
      pincode: ''
    };
    if ((po as any).supplierAddress && (po as any).supplierAddress.address) {
      extractedSupplierAddress = (po as any).supplierAddress;
    } else if (po.supplier && typeof po.supplier !== 'string') {
      const supplier = po.supplier as Supplier;
      if (supplier?.addresses && Array.isArray(supplier.addresses) && supplier.addresses.length > 0) {
        extractedSupplierAddress = supplier.addresses[0];
      }
    }

    // Use the first available location or a default if none exist
    const defaultLocation = locations.length > 0 ? locations[0]._id : 'loc-main-warehouse';

    setReceiveData({
      receivedItems: po.items.map(item => ({
        productId: typeof item.product === 'string' ? item.product : item.product?._id,
        quantityReceived: 0,
        condition: 'good',
        batchNumber: '',
        notes: ''
      })),
      items: po.items.map(item => {
        const product = item.product;
        const productId = typeof product === 'string' ? product : product?._id;
        return {
          product: productId,
          description: '',
          quantity: 0,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate
        };
      }),
      location: defaultLocation,
      receiptDate: new Date().toISOString().split('T')[0],
      inspectedBy: 'Admin',
      supplier: extractedSupplierName, // Set supplier name from purchase order
      supplierEmail: extractedSupplierEmail,
      supplierAddress: extractedSupplierAddress,
      externalInvoiceTotal: 0,
      notes: '',
      // New shipping and documentation fields
      shipDate: new Date().toISOString().split('T')[0],
      docketNumber: '',
      noOfPackages: 1,
      gstInvoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      documentNumber: '',
      documentDate: new Date().toISOString().split('T')[0],
    });

    setShowReceiveModal(true);
    clearGstInvoiceValidation();
  };

  const openPaymentModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setPaymentUpdate({
      paidAmount: 0,
      paymentMethod: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
      paymentMethodDetails: {}
    });
    setShowPaymentModal(true);
  };

  // Fetch payment history for a purchase order
  const fetchPaymentHistory = async (poId: string) => {
    try {
      setLoadingPayments(true);
      const response = await apiClient.purchaseOrderPayments.getByPurchaseOrder(poId);
      if (response.success) {
        console.log("response.data:", response.data);

        setPaymentHistory(response.data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const validatePaymentForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!paymentUpdate.paidAmount || paymentUpdate.paidAmount <= 0) {
      errors.paidAmount = 'Payment amount must be greater than 0';
    }

    const remainingAmount = selectedPO?.remainingAmount || (selectedPO?.totalAmount || 0) - (selectedPO?.paidAmount || 0);
    if (paymentUpdate.paidAmount > remainingAmount) {
      errors.paidAmount = 'Payment amount cannot exceed remaining amount';
    }

    if (!paymentUpdate.paymentMethod) {
      errors.paymentMethod = 'Payment method is required';
    }

    if (!paymentUpdate.paymentDate) {
      errors.paymentDate = 'Payment date is required';
    }

    // Validate payment method details based on selected payment method
    if (paymentUpdate.paymentMethod) {
      const methodErrors = validatePaymentMethodDetails(paymentUpdate.paymentMethod, paymentUpdate.paymentMethodDetails);
      Object.assign(errors, methodErrors);
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return false;
    }

    return true;
  };

  // Helper function to validate payment method details
  const validatePaymentMethodDetails = (paymentMethod: string, details: PaymentMethodDetails): Record<string, string> => {
    const errors: Record<string, string> = {};

    switch (paymentMethod) {
      case 'cash':
        // Cash is simple, no required validation
        break;

      case 'cheque':
        if (!details.cheque?.chequeNumber) {
          errors.chequeNumber = 'Cheque number is required';
        }
        if (!details.cheque?.bankName) {
          errors.bankName = 'Bank name is required';
        }
        if (!details.cheque?.issueDate) {
          errors.issueDate = 'Issue date is required';
        }
        break;

      case 'bank_transfer':
        if (!details.bankTransfer?.bankName) {
          errors.bankName = 'Bank name is required';
        }
        if (!details.bankTransfer?.accountNumber) {
          errors.accountNumber = 'Account number is required';
        }
        if (!details.bankTransfer?.ifscCode) {
          errors.ifscCode = 'IFSC code is required';
        }
        if (!details.bankTransfer?.transactionId) {
          errors.transactionId = 'Transaction ID is required';
        }
        if (!details.bankTransfer?.transferDate) {
          errors.transferDate = 'Transfer date is required';
        }
        break;

      case 'upi':
        if (!details.upi?.upiId) {
          errors.upiId = 'UPI ID is required';
        }
        if (!details.upi?.transactionId) {
          errors.transactionId = 'Transaction ID is required';
        }
        break;

      case 'card':
        if (!details.card?.cardType) {
          errors.cardType = 'Card type is required';
        }
        if (!details.card?.cardNetwork) {
          errors.cardNetwork = 'Card network is required';
        }
        if (!details.card?.lastFourDigits) {
          errors.lastFourDigits = 'Last 4 digits are required';
        }
        if (!details.card?.transactionId) {
          errors.transactionId = 'Transaction ID is required';
        }
        break;

      case 'other':
        if (!details.other?.methodName) {
          errors.methodName = 'Method name is required';
        }
        break;

      default:
        errors.paymentMethod = 'Invalid payment method';
    }

    return errors;
  };

  const submitPaymentUpdate = async () => {
    if (!selectedPO) return;

    // Validate form before submission
    if (!validatePaymentForm()) {
      toast.error('Please fix the form errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      // Create a new payment record
      const paymentData = {
        purchaseOrderId: selectedPO._id,
        poNumber: selectedPO.poNumber,
        supplierId: typeof selectedPO.supplier === 'string' ? selectedPO.supplier : selectedPO.supplier._id,
        amount: paymentUpdate.paidAmount,
        currency: 'INR',
        paymentMethod: paymentUpdate.paymentMethod,
        paymentMethodDetails: paymentUpdate.paymentMethodDetails,
        paymentDate: paymentUpdate.paymentDate,
        notes: paymentUpdate.notes,
        paymentStatus: 'completed'
      };

      // Debug logging
      console.log('=== Frontend Payment Data Debug ===');
      console.log('Payment Method:', paymentUpdate.paymentMethod);
      console.log('Payment Method Details:', JSON.stringify(paymentUpdate.paymentMethodDetails, null, 2));
      console.log('===================================');

      await apiClient.purchaseOrderPayments.create(paymentData);

      // Refresh purchase orders and payment history
      await fetchPurchaseOrders();
      await fetchPaymentHistory(selectedPO._id);
      setShowPaymentModal(false);

      // Clear form errors
      setFormErrors({});

      toast.success('Payment recorded successfully!');
    } catch (error) {
      console.error('Error recording payment:', error);
      setFormErrors({ general: 'Failed to record payment. Please try again.' });
      toast.error('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (poId: string, newStatus: PurchaseOrderStatus) => {
    try {
      const response = await apiClient.purchaseOrders.updateStatus(poId, newStatus);

      // Use the updated purchase order from the backend response if available
      const updatedPO = response.data || { status: newStatus };

      setPurchaseOrders(purchaseOrders.map(po =>
        po._id === poId ? { ...po, ...updatedPO } : po
      ));

      // Update selectedPO if it's the one being updated
      if (selectedPO && selectedPO._id === poId) {
        setSelectedPO({ ...selectedPO, ...updatedPO });
      }

      // Show success toast based on status
      const statusMessages: Record<PurchaseOrderStatus, string> = {
        'order_under_process': 'Purchase Order is under process',
        'approved_order_sent_sap': 'Purchase Order approved and sent to SAP',
        'credit_not_available': 'Purchase Order marked as credit not available',
        'partially_invoiced': 'Purchase Order partially invoiced',
        'fully_invoiced': 'Purchase Order fully invoiced',
        'rejected': 'Purchase Order rejected'
      };

      toast.success(statusMessages[newStatus]);
    } catch (error) {
      console.error('Error updating PO status:', error);
      toast.error('Failed to update Purchase Order status');
    }
  };



  const handleReceiveItems = async () => {
    if (!selectedPO) return;

    // Clear any existing errors first
    setFormErrors({});

    // Collect ALL validation errors at once - this ensures all errors are shown together
    const allErrors: Record<string, string> = {};

    // Critical field validations
    if (!receiveData.gstInvoiceNumber || receiveData.gstInvoiceNumber.trim() === '') {
      allErrors.gstInvoiceNumber = 'GST Invoice Number is required for invoice creation';
    }

    if (!receiveData.location || receiveData.location.trim() === '') {
      allErrors.location = 'Delivery Location is required';
    }

    if (!receiveData.receiptDate || receiveData.receiptDate.trim() === '') {
      allErrors.receiptDate = 'Receipt Date is required';
    }

    if (!receiveData.shipDate || receiveData.shipDate.trim() === '') {
      allErrors.shipDate = 'Ship Date is required';
    }

    if (!receiveData.noOfPackages || receiveData.noOfPackages <= 0) {
      allErrors.noOfPackages = 'Number of Packages must be greater than 0';
    }

    if (!receiveData.invoiceDate || receiveData.invoiceDate.trim() === '') {
      allErrors.invoiceDate = 'Invoice Date is required';
    }

    // Validate external invoice total if provided
    if (receiveData.externalInvoiceTotal !== undefined && receiveData.externalInvoiceTotal !== null) {
      const externalTotal = parseFloat(receiveData.externalInvoiceTotal.toString());
      if (isNaN(externalTotal) || externalTotal < 0) {
        allErrors.externalInvoiceTotal = 'External Invoice Total must be a valid non-negative number';
      }
    }

    // Items validation - check if any items have quantity > 0
    const hasValidItems = receiveData.receivedItems.some(item => (item.quantityReceived || 0) > 0);
    if (!hasValidItems) {
      allErrors.items = 'Please select items to receive by entering quantities greater than 0';
    }

    // Check for duplicate GST Invoice Number if provided
    if (receiveData.gstInvoiceNumber && receiveData.gstInvoiceNumber.trim() !== '') {
      try {
        const response = await apiClient.purchaseOrders.checkGstInvoiceNumber(receiveData.gstInvoiceNumber.trim());
        if (response.data.exists) {
          const foundIn = response.data.foundIn === 'purchase_order' ? 'Purchase Order' : 'Invoice';
          allErrors.gstInvoiceNumber = `GST Invoice Number "${receiveData.gstInvoiceNumber}" already exists in ${foundIn}. Please use a different GST Invoice Number.`;
        }
      } catch (error) {
        console.error('Error checking GST Invoice Number:', error);
        // Don't block validation if the check fails
      }
    }

    // Filter out any empty error messages
    const validErrors = Object.fromEntries(
      Object.entries(allErrors).filter(([field, error]) => error && error.trim() !== '')
    );

    // If there are any valid errors, display them all and stop
    if (Object.keys(validErrors).length > 0) {
      setFormErrors(validErrors);
      toast.error(`Please fix ${Object.keys(validErrors).length} validation error(s)`);
      return;
    }

    // If we get here, all validations passed

    setSubmitting(true);
    console.log("receiveData:", receiveData);

    try {
      // Filter out items with zero or invalid quantities before sending
      const validReceivedItems = receiveData.receivedItems.filter(item => 
        item.quantityReceived && item.quantityReceived > 0
      );

      // Prepare the data to send to backend
      const dataToSend = {
        ...receiveData,
        receivedItems: validReceivedItems,
        // Ensure externalInvoiceTotal is properly set for invoice creation
        externalInvoiceTotal: receiveData.externalInvoiceTotal ? parseFloat(receiveData.externalInvoiceTotal.toString()) : 0,
        // Also set totalAmount for clarity (backend will use externalInvoiceTotal)
        totalAmount: receiveData.totalAmount ? parseFloat(receiveData.totalAmount.toString()) : 0,
        // Ensure numeric fields are properly formatted
        noOfPackages: parseInt(receiveData.noOfPackages.toString()) || 1
      };

      console.log("Sending data to backend:", dataToSend);

      const response = await apiClient.purchaseOrders.receiveItems(selectedPO._id, dataToSend);

      // Use the updated purchase order from the backend response
      const updatedPO = response.data.order;

      setPurchaseOrders(purchaseOrders.map(po =>
        po._id === selectedPO._id ? updatedPO : po
      ));

      // Update the selected PO as well for modal display
      setSelectedPO(updatedPO);

      // Reset receive data for next time
      setReceiveData({
        receivedItems: [],
        items: [],
        location: locations.length > 0 ? locations[0]._id : 'loc-main-warehouse',
        receiptDate: new Date().toISOString().split('T')[0],
        inspectedBy: 'Admin',
        supplier: '',
        supplierEmail: '',
        supplierAddress: {
          address: '',
          state: '',
          district: '',
          pincode: ''
        },
        externalInvoiceTotal: 0,
        notes: '',
        // New shipping and documentation fields
        shipDate: new Date().toISOString().split('T')[0],
        docketNumber: '',
        noOfPackages: 1,
        gstInvoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        documentNumber: '',
        documentDate: new Date().toISOString().split('T')[0],
      });

      setShowReceiveModal(false);
      clearGstInvoiceValidation();

      // Enhanced success message with invoice information
      if (response.data.invoice) {
        toast.success(`Items received successfully! Purchase invoice ${response.data.invoice.invoiceNumber} created with ${response.data.invoice.paymentStatus} payment status.`);
      } else {
        toast.success('Items received successfully');
      }
    } catch (error: any) {
      console.error('Error receiving items:', error);

      let errorMessage = 'Failed to receive items';
      let shouldShowValidationErrors = false;

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        
        // Check if this is a validation error that should be displayed in the form
        if (errorMessage.includes('No items selected') || 
            errorMessage.includes('quantity') || 
            errorMessage.includes('required')) {
          shouldShowValidationErrors = true;
          
          // Set form errors for validation issues
          if (errorMessage.includes('No items selected')) {
            setFormErrors({ items: 'Please select items to receive by entering quantities greater than 0' });
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Display error to user
      if (shouldShowValidationErrors) {
        toast.error('Please fix the validation errors below');
      } else {
        toast.error(`Error: ${errorMessage}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExportToExcel = async () => {
    try {
      // Show loading state
      toast.loading('Preparing export...', { id: 'export' });

      // Get all purchase orders from backend (not just filtered ones)
      const response = await apiClient.purchaseOrders.getAll({
        sort: '-createdAt'
      });

      let allPurchaseOrders: PurchaseOrder[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          allPurchaseOrders = response.data;
        } else if ((response.data as any).orders && Array.isArray((response.data as any).orders)) {
          allPurchaseOrders = (response.data as any).orders;
        }
      }

      // Prepare data for export - only required fields with complete data
      const exportData = allPurchaseOrders.map((po, index) => ({
        'Status': getStatusLabel(po.status),
        'Order Approval Date': po.approvedBy ? formatDate(po.updatedAt) : 'Not Approved',
        'Order No': po.poNumber,
        'Order Date': formatDate(po.orderDate),
        'Order Category': po.department ? getDepartmentLabel(po.department) : 'Not specified',
        'Order Type': getPurchaseOrderTypeLabel(po.purchaseOrderType),
        'Order Value': Number(po.totalAmount).toFixed(2) // Ensure 2 decimal places and convert to number first
      }));

      // Create Excel workbook with proper formatting
      const workbook = XLSX.utils.book_new();

      // Convert data to worksheet format
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths for better display
      const columnWidths = [
        { wch: 25 }, // Status - wide enough for long status text
        { wch: 20 }, // Order Approval Date
        { wch: 25 }, // Order No - wide enough for long PO numbers
        { wch: 15 }, // Order Date
        { wch: 25 }, // Order Category - wide enough for department names
        { wch: 25 }, // Order Type - wide enough for type names
        { wch: 15 }  // Order Value
      ];

      worksheet['!cols'] = columnWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Purchase Orders');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Download the file
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `purchase_orders_${new Date().toISOString().split('T')[0]}.xlsx`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Exported ${exportData.length} purchase orders to Excel`, { id: 'export' });
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export purchase orders. Please try again.', { id: 'export' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!allowedTypes.includes(file.type)) {
      const errorMessage = 'Please select a valid Excel (.xlsx, .xls) or CSV file.';
      setImportMessage({
        type: 'error',
        text: errorMessage
      });
      toast.error(errorMessage);
      return;
    }

    setImporting(true);
    setImportMessage(null);

    try {
      // First, get preview of what will be imported
      const response = await apiClient.purchaseOrders.previewImportFromFile(file);

      if (response.success) {
        setSelectedFile(file);
        setPreviewData(response.data);
        setShowPreviewModal(true);
        toast.success('File preview generated successfully');
      } else {
        const errorMessage = response.data.errors?.[0] || 'Preview failed. Please check your file format.';
        setImportMessage({
          type: 'error',
          text: errorMessage
        });
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      const errorMessage = error.message || 'Failed to preview file. Please try again.';
      setImportMessage({
        type: 'error',
        text: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setImporting(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setShowPreviewModal(false);

    try {
      const response = await apiClient.purchaseOrders.importFromFile(selectedFile);

      if (response.success) {
        if (response.data.summary.successful > 0) {
          const successMessage = `Successfully imported ${response.data.summary.successful} purchase orders from ${response.data.summary.totalRows} total rows!`;
          setImportMessage({
            type: 'success',
            text: successMessage
          });
          toast.success(successMessage);
        } else {
          // No orders were created - show errors
          const errorMessage = `Import failed! 0 orders created from ${response.data.summary.totalRows} rows. Errors: ${response.data.errors.join('; ')}`;
          setImportMessage({
            type: 'error',
            text: errorMessage
          });
          toast.error(errorMessage);
        }
        await fetchPurchaseOrders(); // Refresh the list
      } else {
        const errorMessage = response.data.errors?.[0] || 'Import failed. Please check your file format.';
        setImportMessage({
          type: 'error',
          text: errorMessage
        });
        toast.error(errorMessage);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      const errorMessage = error.message || 'Failed to import file. Please try again.';
      setImportMessage({
        type: 'error',
        text: errorMessage
      });
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





  const filteredPOs = purchaseOrders.filter(po => {
    const supplier = typeof po.supplier === 'string' ? po.supplier : (po.supplier as Supplier)?.name || 'Unknown Supplier';
    const matchesSearch = po.poNumber?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      supplier?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      po.purchaseOrderType?.toLowerCase().includes(searchTerm?.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchesSupplier = !supplierFilter || supplier?.toLowerCase().includes(supplierFilter?.toLowerCase());

    return matchesSearch && matchesStatus && matchesSupplier;
  });
  console.log("filteredPOs:", filteredPOs);


  // Filter items for Details Modal
  const filteredDetailsItems = selectedPO ? selectedPO.items.filter(item => {
    const productName = getProductName(item.product);
    const category = typeof item.product === 'object' ? item.product?.category : '';
    const brand = typeof item.product === 'object' ? item.product?.brand : '';
    const partNo = getProductPartNo(item.product);

    const searchLower = detailsSearchTerm.toLowerCase();
    return productName.toLowerCase().includes(searchLower) ||
      (category && category.toLowerCase().includes(searchLower)) ||
      (brand && brand.toLowerCase().includes(searchLower)) ||
      (partNo && partNo !== '-' && partNo.toLowerCase().includes(searchLower));
  }) : [];

  // Filter items for Receive Modal (only items with remaining quantity)
  const filteredReceiveItems = selectedPO ? selectedPO.items.filter(item => {
    const remainingQty = item.quantity - (item.receivedQuantity || 0);
    if (remainingQty <= 0) return false; // Hide fully received items

    const productName = getProductName(item.product);
    const category = typeof item.product === 'object' ? item.product?.category : '';
    const brand = typeof item.product === 'object' ? item.product?.brand : '';
    const partNo = getProductPartNo(item.product);

    const searchLower = receiveSearchTerm.toLowerCase();
    return productName.toLowerCase().includes(searchLower) ||
      (category && category.toLowerCase().includes(searchLower)) ||
      (brand && brand.toLowerCase().includes(searchLower)) ||
      (partNo && partNo !== '-' && partNo.toLowerCase().includes(searchLower));
  }) : [];




  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'order_under_process':
        return 'bg-gray-100 text-gray-800';
      case 'approved_order_sent_sap':
        return 'bg-blue-100 text-blue-800';
      case 'credit_not_available':
        return 'bg-yellow-100 text-yellow-800';
      case 'partially_invoiced':
        return 'bg-orange-100 text-orange-800';
      case 'fully_invoiced':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliveryStatusColor = (deliveryStatus: string | undefined) => {
    switch (deliveryStatus) {
      case 'on_time':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN');
  };

  // Statistics
  const stats = [
    {
      title: 'Total POs',
      value: totalPurchaseOrdersCount,
      action: () => {
        setStatusFilter('all');
      },
      icon: <Package className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Pending Approval',
      value: pendingPurchaseOrdersCount,
      action: () => {
        setStatusFilter('order_under_process');
      },
      icon: <Clock className="w-6 h-6" />,
      color: 'orange'
    },
    {
      title: 'Approved',
      value: confirmedPurchaseOrdersCount,
      action: () => {
        setStatusFilter('approved_order_sent_sap');
      },
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'Total Value',
      value: formatCurrency(purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)),
      icon: <IndianRupee className="w-6 h-6" />,
      color: 'purple'
    },
    // {
    //   title: 'Payment Status',
    //   value: `${purchaseOrders.filter(po => po.paymentStatus === 'paid').length} Paid / ${purchaseOrders.filter(po => po.paymentStatus === 'partial').length} Partial`,
    //   action: () => {
    //     // Could add payment status filter in the future
    //   },
    //   icon: <IndianRupee className="w-6 h-6" />,
    //   color: 'emerald'
    // }
  ];

  // Status options with labels
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'order_under_process', label: 'Order Under Process' },
    { value: 'approved_order_sent_sap', label: 'Approved & Order Sent to SAP' },
    { value: 'partially_invoiced', label: 'Partially Invoiced' },
    { value: 'fully_invoiced', label: 'Fully Invoiced' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'credit_not_available', label: 'Credit Not Available' }
  ];

  const getStatusLabel = (value: string) => {
    const option = statusOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Status';
  };

  const getSupplierLabel = (value: string) => {
    if (value === 'all') return 'All Suppliers';
    // Return the supplier name if you have supplier data
    return value || 'All Suppliers';
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

  // Helper function to handle PDF generation
  const handleGeneratePDF = async (paymentId: string) => {
    try {
      const response = await apiClient.purchaseOrderPayments.generatePDF(paymentId);

      // Create blob URL and trigger download
      const blob = new Blob([response], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment-receipt-${paymentId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Payment receipt PDF generated successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handlePrintPO = async () => {
    if (!selectedPO) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Fetch company information
    let companyInfo = {
      name: 'SUN POWER SERVICES',
      address: 'Company Address',
      phone: '',
      email: '',
      pan: ''
    };

    try {
      const response = await apiClient.generalSettings.getAll();
      if (response.success && response.data && response.data.companies && response.data.companies.length > 0) {
        const companySettings = response.data.companies[0];
        companyInfo = {
          name: companySettings.companyName || 'SUN POWER SERVICES',
          address: companySettings.companyAddress || 'Company Address',
          phone: companySettings.contactPhone || '',
          email: companySettings.contactEmail || '',
          pan: companySettings.companyPan || ''
        };
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
    }

    const supplierName = typeof selectedPO.supplier === 'string'
      ? selectedPO.supplier
      : (selectedPO.supplier as Supplier)?.name || 'Unknown Supplier';

    const supplierEmail = typeof selectedPO.supplierEmail === 'string'
      ? selectedPO.supplierEmail
      : (selectedPO.supplierEmail as any)?.email || 'No Email';

    // Extract supplier address
    let supplierAddress: SupplierAddress | null = null;
    if ((selectedPO as any).supplierAddress && (selectedPO as any).supplierAddress.address) {
      supplierAddress = (selectedPO as any).supplierAddress;
    } else if (selectedPO.supplier && typeof selectedPO.supplier !== 'string') {
      const supplier = selectedPO.supplier as Supplier;
      if (supplier?.addresses && Array.isArray(supplier.addresses) && supplier.addresses.length > 0) {
        supplierAddress = supplier.addresses[0];
      }
    }

    const createdByName = getCreatedByName(selectedPO.createdBy);

    // Calculate totals
    const totalOrdered = selectedPO.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalReceived = selectedPO.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);
    const totalRemaining = selectedPO.items.reduce((sum, item) => sum + (item.quantity - (item.receivedQuantity || 0)), 0);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Purchase Order - ${selectedPO.poNumber}</title>
        <style>
          @media print {
            @page {
              margin: 0.3in;
              size: A4;
            }
            body { margin: 0; }
            .no-print { display: none !important; }
          }
          
          body {
            font-family: Arial, sans-serif;
            line-height: 1.3;
            color: #000;
            margin: 0;
            padding: 0;
            background: white;
            font-size: 12px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 1px solid #000;
            padding-bottom: 10px;
            background: #fff;
          }
          
          .company-name {
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 5px;
            color: #000;
            letter-spacing: 0.5px;
          }
          
          .company-tagline {
            font-size: 12px;
            margin-bottom: 8px;
            color: #666;
            font-style: italic;
          }
          
          .company-address {
            font-size: 11px;
            margin-bottom: 10px;
            line-height: 1.3;
            color: #555;
          }
          
          .po-title {
            font-size: 18px;
            font-weight: bold;
            margin-top: 15px;
            text-decoration: underline;
            color: #000;
            letter-spacing: 1px;
          }
          
          .po-number {
            font-size: 14px;
            margin-bottom: 15px;
            color: #333;
            font-weight: 600;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          
          .info-section {
            border: 1px solid #ccc;
            padding: 8px;
            background: #f9f9f9;
          }
          
          .info-section h3 {
            margin: 0 0 8px 0;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 4px;
            text-align: center;
            letter-spacing: 0.5px;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 4px;
            font-size: 11px;
            padding: 2px 0;
          }
          
          .info-label {
            font-weight: bold;
            width: 35%;
            color: #333;
          }
          
          .info-value {
            width: 65%;
            text-align: right;
            color: #000;
            font-weight: 500;
          }
          
          .items-section {
            margin: 10px 0;
          }
          
          .items-title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 10px;
            text-align: center;
            border: 1px solid #000;
            padding: 6px;
            background: #f0f0f0;
            letter-spacing: 0.5px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 10px;
            border: 1px solid #000;
          }
          
          .items-table th {
            background: #e0e0e0;
            font-weight: bold;
            padding: 6px 3px;
            text-align: center;
            border: 1px solid #000;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          
          .items-table th:last-child {
            border-right: 1px solid #000;
          }
          
          .items-table td {
            padding: 4px 3px;
            border: 1px solid #000;
            font-size: 10px;
            vertical-align: middle;
          }
          
          .items-table td:last-child {
            border-right: 1px solid #000;
          }
          
          .product-name {
            font-weight: bold;
          }
          
          .product-part {
            font-family: monospace;
            font-size: 9px;
          }
          
          .quantity {
            text-align: center;
          }
          
          .price {
            text-align: right;
          }
          
          .total-row {
            background: #e0e0e0 !important;
            font-weight: bold;
          }
          
          .total-row td {
            border-top: 1px solid #000;
            border-right: 1px solid #000;
            padding: 5px 3px;
            font-size: 10px;
          }
          
          .total-row td:last-child {
            border-right: 1px solid #000;
          }
          
          .grand-total {
            background: #000 !important;
            color: white;
          }
          
          .grand-total td {
            border-top: 3px solid #000;
            font-size: 11px;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 15px;
            text-align: center;
            font-size: 10px;
            border-top: 1px solid #000;
            padding-top: 8px;
            color: #666;
            font-style: italic;
          }
          
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2563eb;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 1000;
          }
          
          .print-button:hover {
            background: #1d4ed8;
          }
        </style>
      </head>
      <body>
        <button class="print-button no-print" onclick="window.print()">🖨️ Print PO</button>
        
        <div class="header">
          <div class="company-name">${companyInfo.name}</div>
          <div class="company-address">
            ${companyInfo.address}<br/>
            ${companyInfo.phone ? `Phone: ${companyInfo.phone}` : ''}${companyInfo.phone && companyInfo.email ? ' | ' : ''}${companyInfo.email ? `Email: ${companyInfo.email}` : ''}<br/>
            ${companyInfo.pan ? `PAN: ${companyInfo.pan}` : ''}
          </div>
          <div class="po-title">PURCHASE ORDER</div>
          <div class="po-number">PO #${selectedPO.poNumber}</div>
        </div>
        
        <div class="info-grid">
          <div class="info-section">
            <h3>Order Information</h3>
            <div class="info-row">
              <span class="info-label">PO Number:</span>
              <span class="info-value">${selectedPO.poNumber}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Order Date:</span>
              <span class="info-value">${formatDate(selectedPO.orderDate)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Expected Delivery:</span>
              <span class="info-value">${selectedPO.expectedDeliveryDate ? formatDate(selectedPO.expectedDeliveryDate) : 'Not specified'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Order Type:</span>
              <span class="info-value">${getPurchaseOrderTypeLabel(selectedPO.purchaseOrderType)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Department:</span>
              <span class="info-value">${selectedPO.department ? getDepartmentLabel(selectedPO.department) : 'Not specified'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Priority:</span>
              <span class="info-value">${selectedPO.priority ? selectedPO.priority.charAt(0).toUpperCase() + selectedPO.priority.slice(1) : 'Medium'}</span>
            </div>
          </div>
          
          <div class="info-section">
            <h3>Supplier Information</h3>
            <div class="info-row">
              <span class="info-label">Supplier Name:</span>
              <span class="info-value">${supplierName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${supplierEmail}</span>
            </div>
            ${selectedPO.supplier && typeof selectedPO.supplier !== 'string' && (selectedPO.supplier as Supplier)?.phone ? `
            <div class="info-row">
              <span class="info-label">Phone:</span>
              <span class="info-value">${(selectedPO.supplier as Supplier).phone}</span>
            </div>
            ` : ''}
            ${supplierAddress && supplierAddress.address ? `
            <div class="info-row">
              <span class="info-label">Address:</span>
              <span class="info-value" style="text-align: left;">
                ${supplierAddress.address}<br/>
                ${supplierAddress.district ? supplierAddress.district + ', ' : ''}${supplierAddress.state ? supplierAddress.state : ''}<br/>
                ${supplierAddress.pincode ? 'PIN: ' + supplierAddress.pincode : ''}
              </span>
            </div>
            ` : ''}
            ${supplierAddress && supplierAddress.gstNumber ? `
            <div class="info-row">
              <span class="info-label">GST Number:</span>
              <span class="info-value">${supplierAddress.gstNumber}</span>
            </div>
            ` : ''}
          </div>
        </div>
        
        <div class="items-section">
          <div class="items-title">ITEMS ORDERED</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 8%;">S.No</th>
                <th style="width: 25%;">Product Name</th>
                <th style="width: 12%;">Part No</th>
                <th style="width: 8%;">HSN</th>
                <th style="width: 6%;">UOM</th>
                <th style="width: 8%;">Quantity</th>
                <th style="width: 8%;">Unit Price</th>
                <th style="width: 6%;">Tax %</th>
                <th style="width: 6%;">Tax Amt</th>
                <th style="width: 6%;">Disc %</th>
                <th style="width: 6%;">Disc Amt</th>
                <th style="width: 8%;">Total Price</th>
              </tr>
            </thead>
            <tbody>
              ${selectedPO.items.map((item, index) => {
          const receivedQty = item.receivedQuantity || 0;
          const remainingQty = item.quantity - receivedQty;
          const productName = getProductName(item.product);
          const partNo = getProductPartNo(item.product);
          const hsnNumber = (typeof item.product === 'object' && item.product?.hsnNumber) ? item.product.hsnNumber : '-';
          const uom = typeof item.product === 'object' ? (item.product as any)?.uom || 'nos' : 'nos';
          const taxAmount = (item.quantity * item.unitPrice * item.taxRate) / 100;
          const discountAmount = item.discountAmount || 0;

          return `
                  <tr>
                    <td class="quantity">${index + 1}</td>
                    <td>
                      <div class="product-name">${productName}</div>
                    </td>
                    <td>
                      <span class="product-part">${partNo}</span>
                    </td>
                    <td class="quantity">${hsnNumber}</td>
                    <td class="quantity">${uom}</td>
                    <td class="quantity">${item.quantity}</td>
                    <td class="price">${formatCurrency(item.unitPrice)}</td>
                    <td class="quantity">${item.taxRate}%</td>
                    <td class="price">${formatCurrency(taxAmount)}</td>
                    <td class="quantity">${item.discountRate || 0}%</td>
                    <td class="price">${formatCurrency(discountAmount)}</td>
                    <td class="price">${formatCurrency(item.totalPrice)}</td>
                  </tr>
                `;
        }).join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="5" style="text-align: right; font-weight: bold;">TOTALS:</td>
                <td class="quantity">${totalOrdered}</td>
                <td class="price">${formatCurrency(selectedPO.items.reduce((sum, item) => sum + item.unitPrice, 0))}</td>
                <td></td>
                <td class="price">${formatCurrency(selectedPO.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100, 0))}</td>
                <td></td>
                <td class="price">${formatCurrency(selectedPO.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0))}</td>
                <td class="price">${formatCurrency(selectedPO.totalAmount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        ${selectedPO.notes ? `
        <div class="info-section">
          <h3>Notes</h3>
          <p style="margin: 0; padding: 5px; font-style: italic;">
            ${selectedPO.notes}
          </p>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Auto-print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Helper function to render payment history
  const renderPaymentHistory = () => {
    if (loadingPayments) {
      return (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading payment history...</span>
        </div>
      );
    }

    if (paymentHistory.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No payment records found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {paymentHistory.map((payment, index) => (
          <div key={payment._id || index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${payment.paymentStatus === 'completed' ? 'bg-green-500' :
                    payment.paymentStatus === 'pending' ? 'bg-yellow-500' :
                      payment.paymentStatus === 'failed' ? 'bg-red-500' :
                        'bg-gray-500'
                  }`}></div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {getPaymentMethodLabel(payment.paymentMethod)} Payment
                  </h4>
                  <p className="text-xs text-gray-500">
                    {formatDate(payment.paymentDate)} • {payment.paymentStatus}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(payment.amount)}
                  </p>
                  {payment.receiptNumber && (
                    <p className="text-xs text-gray-500">Receipt: {payment.receiptNumber}</p>
                  )}
                </div>
                <button
                  onClick={() => handleGeneratePDF(payment._id)}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                  title="Generate PDF Receipt"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Payment Method Details */}
            {payment.paymentMethodDetails && Object.keys(payment.paymentMethodDetails).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {renderPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails)}
                </div>
              </div>
            )}

            {/* Payment Notes */}
            {payment.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Notes:</span> {payment.notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Helper function to render payment method details
  const renderPaymentMethodDetails = (paymentMethod: string, details: any) => {
    switch (paymentMethod) {
      case 'cash':
        return (
          <>
            {details.cash?.receivedBy && (
              <div>
                <span className="text-sm font-medium text-gray-600">Received By:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cash.receivedBy}</span>
              </div>
            )}
            {details.cash?.receiptNumber && (
              <div>
                <span className="text-sm font-medium text-gray-600">Receipt Number:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cash.receiptNumber}</span>
              </div>
            )}
          </>
        );

      case 'cheque':
        return (
          <>
            {details.cheque?.chequeNumber && (
              <div>
                <span className="text-sm font-medium text-gray-600">Cheque Number:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.cheque.chequeNumber}</span>
              </div>
            )}
            {details.cheque?.bankName && (
              <div>
                <span className="text-sm font-medium text-gray-600">Bank Name:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cheque.bankName}</span>
              </div>
            )}
            {details.cheque?.branchName && (
              <div>
                <span className="text-sm font-medium text-gray-600">Branch Name:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cheque.branchName}</span>
              </div>
            )}
            {details.cheque?.issueDate && (
              <div>
                <span className="text-sm font-medium text-gray-600">Issue Date:</span>
                <span className="ml-2 text-sm text-gray-900">{formatDate(details.cheque.issueDate)}</span>
              </div>
            )}
            {details.cheque?.accountHolderName && (
              <div>
                <span className="text-sm font-medium text-gray-600">Account Holder:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cheque.accountHolderName}</span>
              </div>
            )}
            {details.cheque?.accountNumber && (
              <div>
                <span className="text-sm font-medium text-gray-600">Account Number:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.cheque.accountNumber}</span>
              </div>
            )}
            {details.cheque?.ifscCode && (
              <div>
                <span className="text-sm font-medium text-gray-600">IFSC Code:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.cheque.ifscCode}</span>
              </div>
            )}
          </>
        );

      case 'bank_transfer':
        return (
          <>
            {details.bankTransfer?.bankName && (
              <div>
                <span className="text-sm font-medium text-gray-600">Bank Name:</span>
                <span className="ml-2 text-sm text-gray-900">{details.bankTransfer.bankName}</span>
              </div>
            )}
            {details.bankTransfer?.accountNumber && (
              <div>
                <span className="text-sm font-medium text-gray-600">Account Number:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.bankTransfer.accountNumber}</span>
              </div>
            )}
            {details.bankTransfer?.ifscCode && (
              <div>
                <span className="text-sm font-medium text-gray-600">IFSC Code:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.bankTransfer.ifscCode}</span>
              </div>
            )}
            {details.bankTransfer?.transactionId && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transaction ID:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.bankTransfer.transactionId}</span>
              </div>
            )}
            {details.bankTransfer?.transferDate && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transfer Date:</span>
                <span className="ml-2 text-sm text-gray-900">{formatDate(details.bankTransfer.transferDate)}</span>
              </div>
            )}
            {details.bankTransfer?.referenceNumber && (
              <div>
                <span className="text-sm font-medium text-gray-600">Reference Number:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.bankTransfer.referenceNumber}</span>
              </div>
            )}
          </>
        );

      case 'upi':
        return (
          <>
            {details.upi?.upiId && (
              <div>
                <span className="text-sm font-medium text-gray-600">UPI ID:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.upi.upiId}</span>
              </div>
            )}
            {details.upi?.transactionId && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transaction ID:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.upi.transactionId}</span>
              </div>
            )}
            {details.upi?.payerName && (
              <div>
                <span className="text-sm font-medium text-gray-600">Payer Name:</span>
                <span className="ml-2 text-sm text-gray-900">{details.upi.payerName}</span>
              </div>
            )}
            {details.upi?.payerPhone && (
              <div>
                <span className="text-sm font-medium text-gray-600">Payer Phone:</span>
                <span className="ml-2 text-sm text-gray-900">{details.upi.payerPhone}</span>
              </div>
            )}
          </>
        );

      case 'card':
        return (
          <>
            {details.card?.cardType && (
              <div>
                <span className="text-sm font-medium text-gray-600">Card Type:</span>
                <span className="ml-2 text-sm text-gray-900 capitalize">{details.card.cardType}</span>
              </div>
            )}
            {details.card?.cardNetwork && (
              <div>
                <span className="text-sm font-medium text-gray-600">Card Network:</span>
                <span className="ml-2 text-sm text-gray-900 capitalize">{details.card.cardNetwork}</span>
              </div>
            )}
            {details.card?.lastFourDigits && (
              <div>
                <span className="text-sm font-medium text-gray-600">Last 4 Digits:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">****{details.card.lastFourDigits}</span>
              </div>
            )}
            {details.card?.transactionId && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transaction ID:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.card.transactionId}</span>
              </div>
            )}
            {details.card?.cardHolderName && (
              <div>
                <span className="text-sm font-medium text-gray-600">Card Holder:</span>
                <span className="ml-2 text-sm text-gray-900">{details.card.cardHolderName}</span>
              </div>
            )}
            {details.card?.authorizationCode && (
              <div>
                <span className="text-sm font-medium text-gray-600">Authorization Code:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.card.authorizationCode}</span>
              </div>
            )}
          </>
        );

      case 'other':
        return (
          <>
            {details.other?.methodName && (
              <div>
                <span className="text-sm font-medium text-gray-600">Method Name:</span>
                <span className="ml-2 text-sm text-gray-900">{details.other.methodName}</span>
              </div>
            )}
            {details.other?.referenceNumber && (
              <div>
                <span className="text-sm font-medium text-gray-600">Reference Number:</span>
                <span className="ml-2 text-sm text-gray-900 font-mono">{details.other.referenceNumber}</span>
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  const getDepartmentLabel = (value: string) => {
    const options = [
      { value: 'retail', label: 'Retail' },
      { value: 'corporate', label: 'Corporate' },
      { value: 'industrial_marine', label: 'Industrial & Marine' },
      { value: 'others', label: 'Others' }
    ];
    return options.find(opt => opt.value === value)?.label || value;
  };

  const getPurchaseOrderTypeLabel = (value: string) => {
    const options = [
      { value: 'commercial', label: 'Commercial' },
      { value: 'breakdown_order', label: 'Breakdown Order' }
    ];
    return options.find(opt => opt.value === value)?.label || value;
  };

  // Helper function to update payment method details safely
  const updatePaymentMethodDetails = (method: string, field: string, value: string) => {
    setPaymentUpdate(prev => {
      const currentDetails = prev.paymentMethodDetails[method as keyof PaymentMethodDetails] || {};
      return {
        ...prev,
        paymentMethodDetails: {
          ...prev.paymentMethodDetails,
          [method]: {
            ...currentDetails,
            [field]: value
          }
        }
      };
    });
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {

        // setShowAddressDropdown(false);
        setShowCreateSupplierDropdown(false);
        setShowEditSupplierDropdown(false);
        setShowPaymentMethodDropdown(false);
        setSupplierSearchTerm('');

        // Close all product dropdowns

      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper to get GST for a product or productId
  const getProductGST = (product: Product | string): number => {
    if (typeof product === 'string') {
      const foundProduct = products.find(p => p._id === product);
      return foundProduct?.gst || 0;
    }
    return product?.gst || 0;
  };

  // Helper to calculate GST amount and total for an item
  const calculateItemTotal = (item: { quantity: number; unitPrice: number; gst?: number }) => {
    const subtotal = item.quantity * item.unitPrice;
    const gstRate = item.gst || 0;
    const gstAmount = subtotal * (gstRate / 100);
    return {
      subtotal,
      gstAmount,
      total: subtotal + gstAmount
    };
  };

  // Helper function to validate individual fields
  const validateField = (fieldName: string, value: any): string => {
    switch (fieldName) {
      case 'gstInvoiceNumber':
        if (!value || value.trim() === '') {
          return 'GST Invoice Number is required';
        }
        if (value.trim().length < 3) {
          return 'GST Invoice Number must be at least 3 characters long';
        }
        // Check for basic format validation (alphanumeric with common separators)
        const gstPattern = /^[A-Za-z0-9\/\-_\.\s]+$/;
        if (!gstPattern.test(value.trim())) {
          return 'GST Invoice Number contains invalid characters. Use only letters, numbers, spaces, and common separators (/, -, _, .)';
        }
        return '';
      case 'location':
        if (!value || value.trim() === '') {
          return 'Delivery Location is required';
        }
        return '';
      case 'receiptDate':
        if (!value || value.trim() === '') {
          return 'Receipt Date is required';
        }
        return '';
      case 'shipDate':
        if (!value || value.trim() === '') {
          return 'Ship Date is required';
        }
        return '';
      case 'noOfPackages':
        if (!value || value <= 0) {
          return 'Number of Packages must be greater than 0';
        }
        return '';
      case 'invoiceDate':
        if (!value || value.trim() === '') {
          return 'Invoice Date is required';
        }
        return '';
      default:
        return '';
    }
  };

  // Helper function to check if any items are selected for receiving
  const hasSelectedItems = (): boolean => {
    return receiveData.receivedItems.some(item => (item.quantityReceived || 0) > 0);
  };



  const hasActiveFilters = statusFilter !== ('all' as PurchaseOrderStatus | 'all') || searchTerm !== '';

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <PageHeader
        title="Purchase Order Management"
        subtitle="Manage procurement and purchase orders efficiently"
      >
        <div className="flex space-x-3">
          <button
            onClick={fetchAllData}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
          <button
            onClick={handleExportToExcel}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-purple-700 hover:to-purple-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Export Excel</span>
          </button>

          <button
            onClick={handleImportClick}
            disabled={importing}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className={`w-4 h-4 ${importing ? 'animate-pulse' : ''}`} />
            <span className="text-sm">{importing ? 'Importing...' : 'Import Excel'}</span>
          </button>
          <button
            onClick={handleCreatePO}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New Purchase Order</span>
          </button>
        </div>
      </PageHeader>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Import message */}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} onClick={stat.action} className={`bg-white p-4 hover:bg-gray-50 rounded-xl shadow-sm border border-gray-100 ${stat.title === 'Total Value' ? 'cursor-not-allowed' : 'cursor-pointer transform transition-transform duration-200 hover:scale-105 active:scale-95'}`}>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search purchase orders..."
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
              }}
              className="flex items-center justify-between w-full px-2 py-2 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
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
                      setStatusFilter(option.value as PurchaseOrderStatus | 'all');
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

          {/* Supplier Custom Dropdown */}
          {/* <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowSupplierDropdown(!showSupplierDropdown);
                setShowStatusDropdown(false);
              }}
              className="flex items-center justify-between w-full px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getSupplierLabel(supplierFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showSupplierDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showSupplierDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                <button
                  onClick={() => {
                    setSupplierFilter('all');
                    setShowSupplierDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${supplierFilter === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                >
                  All Suppliers
                </button>
              </div>
            )}
          </div> */}
        </div>

        {/* Active Filters Chips */}
        {hasActiveFilters && (
          <div className="mt-0 flex items-center justify-between">
            <span className="text-xs text-gray-600 pt-3">
              Showing {filteredPOs.length} of {totalDatas} purchase orders
            </span>
            <div className="px-4 pt-2 flex flex-wrap gap-2 items-center border-t border-gray-100">
              <span className="text-xs text-gray-500">Active filters:</span>
              {statusFilter !== ('all' as PurchaseOrderStatus | 'all') && (
                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs flex items-center">
                  {getStatusLabel(statusFilter)}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                    title="Clear status filter"
                  >×</button>
                </span>
              )}
              {/* Add more chips here for other filters if you add them in the future */}
              {searchTerm && (
                <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs flex items-center">
                  {searchTerm}
                  <button onClick={() => setSearchTerm('')} className="ml-1 text-gray-500 hover:text-gray-700">×</button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  S.No
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Purchase Order No.
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Date
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PO Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created By
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Delivery
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actual Delivery
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={18} className="px-6 py-8 text-center text-gray-500">Loading purchase orders...</td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={18} className="px-6 py-8 text-center text-gray-500">No purchase orders found</td>
                </tr>
              ) : (
                filteredPOs.map((po, index) => (
                  <tr key={po._id} className="hover:bg-gray-50">
                    {/* S.No */}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {((currentPage - 1) * limit) + index + 1}
                      </div>
                    </td>

                    {/* Supplier */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {typeof po.supplier === 'string' ? po.supplier : (po.supplier as Supplier)?.name || 'Unknown Supplier'}
                      </div>
                    </td>

                    {/* Purchase Order No. */}
                    <td className="px-4 py-3 whitespace-nowrap w-48">
                      <div className="text-sm font-medium text-blue-600">
                        {po.poNumber}
                      </div>
                    </td>

                    {/* Order Date */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(po.orderDate)}
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {po.department ? getDepartmentLabel(po.department) : 'Not specified'}
                      </div>
                    </td>

                    {/* PO Type */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${po.purchaseOrderType === 'commercial' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                        {getPurchaseOrderTypeLabel(po.purchaseOrderType)}
                      </span>
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₹{po.totalAmount.toFixed(2)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap w-48">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                        {getStatusLabel(po.status)}
                      </span>
                    </td>

                    {/* Payment */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ₹{(po.paidAmount || 0).toFixed(2)} / ₹{po.totalAmount.toFixed(2)}
                      </div>
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${po.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          po.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {(po.paymentStatus
                          ? po.paymentStatus.charAt(0).toUpperCase() + po.paymentStatus.slice(1)
                          : 'Pending')}
                      </span>
                    </td>

                    {/* Supplier Email */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs text-gray-600">
                        {typeof po.supplierEmail === 'string' ? po.supplierEmail : (po.supplierEmail as any)?.email || 'No Email'}
                      </div>
                    </td>

                    {/* Created By */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getCreatedByName(po.createdBy)}
                      </div>
                    </td>

                    {/* Items */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {po.items.length} item(s)
                      </div>
                    </td>

                    {/* Expected Delivery */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : 'Not set'}
                      </div>
                    </td>

                    {/* Actual Delivery */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {po.actualDeliveryDate ? formatDate(po.actualDeliveryDate) : 'Not delivered'}
                      </div>
                    </td>

                    {/* Delivery Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {po.deliveryStatus ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDeliveryStatusColor(po.deliveryStatus)}`}>
                          {po.deliveryStatus.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                          Not set
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openDetailsModal(po)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedPO(po);
                            handlePrintPO();
                          }}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                          title="Print PO"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                        {po.status === 'order_under_process' && (
                          <button
                            onClick={() => handleEditPO(po)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Edit PO"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {po.status === 'order_under_process' && (
                          <button
                            onClick={() => handleStatusUpdate(po._id, 'approved_order_sent_sap')}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="Approve PO"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {(po.status === 'approved_order_sent_sap' || po.status === 'partially_invoiced') && (
                          <button
                            onClick={() => openReceiveModal(po)}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                            title={po.status === 'partially_invoiced' ? 'Invoice More Items' : 'Invoice Items'}
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        )}
                        {/* {po.status === 'order_under_process' && (
                          <button
                            onClick={() => handleStatusUpdate(po._id, 'approved_order_sent_sap')}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            <span>Mark as Approved</span>
                          </button>
                        {/* Payment Update Button */}
                        {(po.status !== 'order_under_process') && (po.status !== 'rejected') && (
                          <button
                            onClick={() => openPaymentModal(po)}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Update Payment"
                          >
                            <IndianRupee className="w-4 h-4" />
                          </button>)}
                        {(po.status === 'order_under_process') && (
                          <button
                            onClick={() => handleStatusUpdate(po._id, 'rejected')}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            {/* <span>Reject PO</span> */}
                          </button>
                        )}
                        {/* Sync Payment Status Button */}
                        {/* <button
                          onClick={async () => {
                            try {
                              await apiClient.purchaseOrders.syncPaymentStatus(po._id);
                              await fetchPurchaseOrders();
                              toast.success('Payment status synced from invoices');
                            } catch (error) {
                              console.error('Error syncing payment status:', error);
                              toast.error('Failed to sync payment status');
                            }
                          }}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                          title="Sync Payment Status from Invoices"
                        >
                          <RefreshCw className="w-4 h-4" />
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalDatas}
        itemsPerPage={limit}
      />






      {/* PO Details Modal */}
      {showDetailsModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Purchase Order Details</h2>
                <p className="text-gray-600">{selectedPO.poNumber}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Basic Information</h3>
                  <div className="space-y-2">
                    <p><span className="text-xs text-gray-600">PO Number:</span> <span className="font-medium">{selectedPO.poNumber}</span></p>
                    <p><span className="text-xs text-gray-600">Purchase Order Type:</span> <span className="font-medium">{getPurchaseOrderTypeLabel(selectedPO.purchaseOrderType)}</span></p>
                    <p><span className="text-xs text-gray-600">Department:</span> <span className="font-medium">{selectedPO.department ? getDepartmentLabel(selectedPO.department) : 'Not specified'}</span></p>
                    <p><span className="text-xs text-gray-600">Supplier:</span> <span className="font-medium">{typeof selectedPO.supplier === 'string' ? selectedPO.supplier : (selectedPO.supplier as Supplier)?.name || 'Unknown Supplier'}</span></p>
                    <p><span className="text-xs text-gray-600">Total Amount:</span> <span className="font-medium">{formatCurrency(selectedPO.totalAmount)}</span></p>
                    <p><span className="text-xs text-gray-600">Status:</span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPO.status)}`}>
                        {getStatusLabel(selectedPO.status)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Dates</h3>
                  <div className="space-y-2">
                    <p><span className="text-xs text-gray-600">Order Date:</span> <span className="font-medium">{formatDate(selectedPO.orderDate)}</span></p>
                    {selectedPO.expectedDeliveryDate && (
                      <p><span className="text-xs text-gray-600">Expected Delivery:</span> <span className="font-medium">{formatDate(selectedPO.expectedDeliveryDate)}</span></p>
                    )}
                    {selectedPO.actualDeliveryDate && (
                      <p><span className="text-xs text-gray-600">Actual Delivery:</span> <span className="font-medium">{formatDate(selectedPO.actualDeliveryDate)}</span></p>
                    )}
                    {selectedPO.deliveryStatus && (
                      <p><span className="text-xs text-gray-600">Delivery Status:</span>
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDeliveryStatusColor(selectedPO.deliveryStatus)}`}>
                          {selectedPO.deliveryStatus.replace('_', ' ')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Created By</h3>
                  <div className="space-y-2">
                    <p><span className="text-xs text-gray-600">Name:</span> <span className="font-medium">{getCreatedByName(selectedPO.createdBy)}</span></p>
                    <p><span className="text-xs text-gray-600">Created:</span> <span className="font-medium">{formatDateTime(selectedPO.createdAt)}</span></p>
                    <p><span className="text-xs text-gray-600">Last Updated:</span> <span className="font-medium">{formatDateTime(selectedPO.updatedAt)}</span></p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Summary</h3>
                  <div className="space-y-2">
                    <p><span className="text-xs text-gray-600">Total Amount:</span> <span className="font-medium">{formatCurrency(selectedPO.totalAmount)}</span></p>
                    <p><span className="text-xs text-gray-600">Paid Amount:</span> <span className="font-medium text-green-600">{formatCurrency(selectedPO.paidAmount || 0)}</span></p>
                    <p><span className="text-xs text-gray-600">Remaining Amount:</span> <span className="font-medium text-orange-600">{formatCurrency(selectedPO.remainingAmount || (selectedPO.totalAmount - (selectedPO.paidAmount || 0)))}</span></p>
                    <p><span className="text-xs text-gray-600">Payment Status:</span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedPO.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                          selectedPO.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                        }`}>
                        {(selectedPO.paymentStatus
                          ? selectedPO.paymentStatus.charAt(0).toUpperCase() + selectedPO.paymentStatus.slice(1)
                          : 'Pending')}
                      </span>
                    </p>
                    {paymentHistory.length > 0 && (
                      <p><span className="text-xs text-gray-600">Payment Records:</span> <span className="font-medium">{paymentHistory.length} transaction{paymentHistory.length !== 1 ? 's' : ''}</span></p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
                  <button
                    onClick={() => fetchPaymentHistory(selectedPO._id)}
                    className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                    disabled={loadingPayments}
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingPayments ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  {renderPaymentHistory()}
                </div>
              </div>

              {/* Related Invoices */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Related Invoices</h3>
                  {/* <button
                    onClick={async () => {
                      try {
                        await apiClient.purchaseOrders.syncPaymentStatus(selectedPO._id);
                        await fetchPurchaseOrders();
                        toast.success('Payment status synced from invoices');
                      } catch (error) {
                        console.error('Error syncing payment status:', error);
                        toast.error('Failed to sync payment status');
                      }
                    }}
                    className="px-3 py-1 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Sync Payment Status</span>
                  </button> */}
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    Purchase invoices are automatically created when items are received.
                    Payment status is synchronized between PO and invoices.
                  </p>
                  <div className="mt-3 text-sm">
                    <span className="font-medium">Current PO Payment Status:</span>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedPO.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                        selectedPO.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                      }`}>
                      {(selectedPO.paymentStatus
                        ? selectedPO.paymentStatus.charAt(0).toUpperCase() + selectedPO.paymentStatus.slice(1)
                        : 'Pending')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Items Ordered</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={detailsSearchTerm}
                      onChange={(e) => setDetailsSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST (%)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GST Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount (%)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount (₹)</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDetailsItems.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-6 py-8 text-center text-gray-500">
                            {detailsSearchTerm ? 'No items match your search' : 'No items found'}
                          </td>
                        </tr>
                      ) : (
                        filteredDetailsItems.map((item, index) => {
                          const receivedQty = item.receivedQuantity || 0;
                          const remainingQty = item.quantity - receivedQty;
                          return (
                            <tr key={index}>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-xs font-medium text-gray-900">
                                    {getProductName(item.product)}
                                  </div>
                                  {typeof item.product === 'object' && item.product?.brand && (
                                    <div className="text-xs text-gray-500">Brand: {item.product?.brand}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                                <span className="font-mono font-medium text-blue-600">
                                  {getProductPartNo(item.product)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">
                                {typeof item.product === "object" && item.product?.category
                                  ? item.product.category
                                    .replace(/_/g, " ")        // replace underscores
                                    .replace(/\b\w/g, (c) => c.toUpperCase()) // capitalize each word
                                  : "-"}
                              </td>

                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                                <span className="font-medium">{item.quantity}</span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs">
                                <span className={`font-medium ${receivedQty > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                  {receivedQty}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs">
                                <span className={`font-medium ${remainingQty > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                  {remainingQty}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                                {formatCurrency(item.unitPrice)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-gray-900">
                                {item.taxRate}%
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-gray-900">
                                {formatCurrency(item.taxRate * item.unitPrice / 100)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-gray-900">
                                {(item.discountRate || 0)}%
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-green-600">
                                -{formatCurrency(item.discountAmount || 0)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-gray-900">
                                {formatCurrency(item.totalPrice)}
                              </td>
                            </tr>
                          );
                        }))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-xs font-medium text-gray-600">
                          Totals:
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-900">
                          {selectedPO.items.reduce((sum, item) => sum + item.quantity, 0)}
                          {detailsSearchTerm && (
                            <div className="text-xs text-gray-500 font-normal">
                              ({filteredDetailsItems.reduce((sum, item) => sum + item.quantity, 0)} filtered)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-green-600">
                          {selectedPO.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0)}
                          {detailsSearchTerm && (
                            <div className="text-xs text-gray-500 font-normal">
                              ({filteredDetailsItems.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0)} filtered)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-orange-600">
                          {selectedPO.items.reduce((sum, item) => sum + (item.quantity - (item.receivedQuantity || 0)), 0)}
                          {detailsSearchTerm && (
                            <div className="text-xs text-gray-500 font-normal">
                              ({filteredDetailsItems.reduce((sum, item) => sum + (item.quantity - (item.receivedQuantity || 0)), 0)} filtered)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-900">
                          {/* Average GST: */}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-900">
                          {/* Average Discount: */}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-green-600">
                          {/* -{formatCurrency(
                            selectedPO.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0)
                          )}
                          {detailsSearchTerm && (
                            <div className="text-xs text-gray-500 font-normal">
                              (-{formatCurrency(filteredDetailsItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0))} filtered)
                            </div>
                          )} */}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-900">
                          {/* {formatCurrency(
                            selectedPO.items.reduce((sum, item) => sum + (item.taxRate * item.unitPrice / 100), 0)
                          )}
                          {detailsSearchTerm && (
                            <div className="text-xs text-gray-500 font-normal">
                              ({formatCurrency(filteredDetailsItems.reduce((sum, item) => sum + (item.taxRate * item.unitPrice / 100), 0))} filtered)
                            </div>
                          )} */}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-gray-900">
                          {/* Total Amount: */}
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {/* {formatCurrency(selectedPO.totalAmount)} */}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  <div className=" border-gray-200 p-4">
                    <div className="flex flex-col items-end space-y-2">
                      {/* Subtotal */}
                      <div className="flex justify-between w-64">
                        <span className="text-sm font-medium text-gray-600">Subtotal:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(
                            selectedPO.items.reduce(
                              (sum, item) => sum + item.quantity * item.unitPrice,
                              0
                            )
                          )}
                        </span>
                      </div>

                      {/* GST */}
                      <div className="flex justify-between w-64">
                        <span className="text-sm font-medium text-gray-600">Total GST:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(
                            selectedPO.items.reduce(
                              (sum, item) => sum + (item.quantity * item.unitPrice * item.taxRate) / 100,
                              0
                            )
                          )}
                        </span>
                      </div>

                      {/* Discount */}
                      <div className="flex justify-between w-64">
                        <span className="text-sm font-medium text-gray-600">Total Discount:</span>
                        <span className="text-sm font-medium text-green-600">
                          -{formatCurrency(
                            selectedPO.items.reduce(
                              (sum, item) => sum + (item.discountAmount || 0),
                              0
                            )
                          )}
                        </span>
                      </div>

                      {/* Total */}
                      <div className="flex justify-between w-64 border-t border-gray-300 pt-2">
                        <span className="text-sm font-semibold text-gray-800">Total Amount:</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {formatCurrency(selectedPO.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  {selectedPO.status === 'order_under_process' && (
                    <>
                      <button
                        onClick={() => handleEditPO(selectedPO)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit PO</span>
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedPO._id, 'approved_order_sent_sap')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send to Supplier</span>
                      </button>
                    </>
                  )}
                  {/* {selectedPO.status === 'approved_order_sent_sap' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedPO._id, 'fully_invoiced')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark as Fully Invoiced</span>
                    </button>
                  )} */}
                  {(selectedPO.status === 'approved_order_sent_sap' || selectedPO.status === 'partially_invoiced') && (
                    <button
                      onClick={() => openReceiveModal(selectedPO)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      <span>
                        {selectedPO.status === 'partially_invoiced' ? 'Receive More Items' : 'Receive Items'}
                      </span>
                    </button>
                  )}
                  {(selectedPO.status === 'order_under_process') && (
                    <button
                      onClick={() => handleStatusUpdate(selectedPO._id, 'rejected')}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700 transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Reject PO</span>
                    </button>
                  )}
                  {/* Payment Update Button */}
                  <button
                    onClick={() => openPaymentModal(selectedPO)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                  >
                    <IndianRupee className="w-4 h-4" />
                    <span>Update Payment</span>
                  </button>
                  {/* Print Button */}
                  <button
                    onClick={handlePrintPO}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>Print PO</span>
                  </button>
                  {/* Sync Payment Status Button */}
                  {/* <button
                    onClick={async () => {
                      try {
                        await apiClient.purchaseOrders.syncPaymentStatus(selectedPO._id);
                        await fetchPurchaseOrders();
                        toast.success('Payment status synced from invoices');
                      } catch (error) {
                        console.error('Error syncing payment status:', error);
                        toast.error('Failed to sync payment status');
                      }
                    }}
                    className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                    title="Sync Payment Status from Invoices"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button> */}
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receive Items Modal */}
      {showReceiveModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPO.status === 'partially_invoiced' ? 'Receive More Items' : 'Receive Items'}
                </h2>
                <p className="text-gray-600 mt-1">
                  PO: <span className="font-semibold">{selectedPO.poNumber}</span>
                  {selectedPO.status === 'partially_invoiced' && (
                    <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      Partially Invoiced
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowReceiveModal(false);
                  setDebouncedExternalTotal('')
                  // setFormErrors({})
                  clearGstInvoiceValidation()
                  setReceiveData({
                    location: '',
                    receiptDate: '',
                    inspectedBy: '',
                    receivedItems: [],
                    items: [],
                    // New shipping and documentation fields
                    shipDate: new Date().toISOString().split('T')[0],
                    docketNumber: '',
                    noOfPackages: 1,
                    gstInvoiceNumber: '',
                    invoiceDate: new Date().toISOString().split('T')[0],
                    documentNumber: '',
                    documentDate: new Date().toISOString().split('T')[0],
                  });
                }}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Alert */}
              {selectedPO.status === 'partially_invoiced' ? (
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Package className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-orange-800">Receiving Additional Items</h3>
                      <p className="text-sm text-orange-700 mt-1">
                        Some items from this purchase order have already been received. You can receive additional quantities as they arrive.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Package className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-800">Receiving Items</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Review the quantities below and confirm receipt. This will update your inventory.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={receiveData.location}
                      onChange={(e) => setReceiveData({ ...receiveData, location: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.location ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Select location...</option>
                      {locations.length === 0 ? (
                        <option value="" disabled>Loading locations...</option>
                      ) : (
                        locations.map(location => (
                          <option key={location._id} value={location._id}>
                            {location.name} ({location.type})
                          </option>
                        ))
                      )}
                    </select>
                    {formErrors.location && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.location}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receipt Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={receiveData.receiptDate}
                      onChange={(e) => setReceiveData({ ...receiveData, receiptDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.receiptDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.receiptDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.receiptDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inspected By
                    </label>
                    <input
                      type="text"
                      value={receiveData.inspectedBy}
                      onChange={(e) => setReceiveData({ ...receiveData, inspectedBy: e.target.value })}
                      placeholder="Inspector name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>


                  {/* New Shipping and Documentation Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ship Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={receiveData.shipDate}
                      onChange={(e) => setReceiveData({ ...receiveData, shipDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.shipDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.shipDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.shipDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Docket Number
                    </label>
                    <input
                      type="text"
                      value={receiveData.docketNumber}
                      onChange={(e) => setReceiveData({ ...receiveData, docketNumber: e.target.value })}
                      placeholder="Docket Number"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors border-gray-300`}
                    />
                    {/* {formErrors.docketNumber && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.docketNumber}</p>
                    )} */}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Packages <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={receiveData.noOfPackages}
                      onChange={(e) => setReceiveData({ ...receiveData, noOfPackages: parseInt(e.target.value) || 1 })}
                      placeholder="1"
                      min="1"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.noOfPackages ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.noOfPackages && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.noOfPackages}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Invoice Number <span className="text-red-500">*</span>
                      <span className="text-xs text-gray-500 ml-2">(Required for invoice creation)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={receiveData.gstInvoiceNumber}
                        onChange={(e) => {
                          const value = e.target.value;
                          setReceiveData({ ...receiveData, gstInvoiceNumber: value });

                          // Clear form error when user starts typing
                          if (formErrors.gstInvoiceNumber) {
                            setFormErrors(prev => ({ ...prev, gstInvoiceNumber: '' }));
                          }

                          // Real-time validation
                          const error = validateField('gstInvoiceNumber', value);
                          if (error) {
                            setFormErrors(prev => ({ ...prev, gstInvoiceNumber: error }));
                          }

                          // Validate GST Invoice Number for duplicates
                          validateGstInvoiceNumber(value);
                        }}
                        onBlur={(e) => {
                          // Additional validation on blur
                          const value = e.target.value;
                          const error = validateField('gstInvoiceNumber', value);
                          if (error) {
                            setFormErrors(prev => ({ ...prev, gstInvoiceNumber: error }));
                          }
                        }}
                        placeholder="GST Invoice Number"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.gstInvoiceNumber || gstInvoiceValidation.isDuplicate ? 'border-red-500' :
                            gstInvoiceValidation.message && !gstInvoiceValidation.isDuplicate ? 'border-blue-300' : 'border-gray-300'
                          }`}
                      />
                      {gstInvoiceValidation.isValidating && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        </div>
                      )}
                    </div>
                    {formErrors.gstInvoiceNumber && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.gstInvoiceNumber}</p>
                    )}
                    {gstInvoiceValidation.message && !formErrors.gstInvoiceNumber && (
                      <p className={`text-xs mt-1 ${gstInvoiceValidation.isDuplicate ? 'text-red-500' : 'text-blue-600'
                        }`}>
                        {gstInvoiceValidation.message}
                      </p>
                    )}
                    {!gstInvoiceValidation.message && !formErrors.gstInvoiceNumber && receiveData.gstInvoiceNumber && receiveData.gstInvoiceNumber.trim() !== '' && (
                      <p className="text-xs mt-1 text-green-600">
                        ✓ GST Invoice Number format is valid
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={receiveData.invoiceDate}
                      onChange={(e) => setReceiveData({ ...receiveData, invoiceDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.invoiceDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.invoiceDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.invoiceDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Number
                    </label>
                    <input
                      type="text"
                      value={receiveData.documentNumber}
                      onChange={(e) => setReceiveData({ ...receiveData, documentNumber: e.target.value })}
                      placeholder="Document Number"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors border-gray-300`}
                    />
                    {/* {formErrors.documentNumber && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.documentNumber}</p>
                    )} */}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Date
                    </label>
                    <input
                      type="date"
                      value={receiveData.documentDate}
                      onChange={(e) => setReceiveData({ ...receiveData, documentDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.documentDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.documentDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.documentDate}</p>
                    )}
                  </div>

                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Notes
                  </label>
                  <textarea
                    value={receiveData.notes || ''}
                    onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                    rows={3}
                    placeholder="Any additional notes about the delivery..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Items to Receive */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-gray-900">Items to Receive</h3>
                    {hasSelectedItems() && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        {receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)} items selected
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={receiveSearchTerm}
                      onChange={(e) => setReceiveSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64 transition-colors"
                    />
                  </div>
                </div>

                {/* Items Validation Summary */}
                {formErrors.items && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="w-4 h-4 text-red-600 mr-2" />
                      <p className="text-red-600 text-sm font-medium">{formErrors.items}</p>
                    </div>
                  </div>
                )}

                {/* Warning when no items are selected */}
                {!hasSelectedItems() && !formErrors.items && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
                      <p className="text-yellow-600 text-sm font-medium">
                        Please select items to receive by entering quantities above
                      </p>
                    </div>
                  </div>
                )}

                {(() => {
                  const itemsWithRemainingQty = selectedPO.items.filter(item =>
                    (item.quantity - (item.receivedQuantity || 0)) > 0
                  );

                  if (itemsWithRemainingQty.length === 0) {
                    return (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                          <Package className="w-12 h-12 text-green-600" />
                        </div>
                        <h4 className="text-xl font-semibold text-green-800 mb-2">All Items Received</h4>
                        <p className="text-green-700">All items from this purchase order have been fully received.</p>
                      </div>
                    );
                  }

                  if (filteredReceiveItems.length === 0 && receiveSearchTerm) {
                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                          <Search className="w-12 h-12 text-gray-400" />
                        </div>
                        <h4 className="text-xl font-semibold text-gray-600 mb-2">No Items Found</h4>
                        <p className="text-gray-500">No items match your search criteria.</p>
                      </div>
                    );
                  }

                  // Calculate comprehensive totals
                  const calculateTotals = () => {
                    let totalSubtotal = 0;
                    let totalGST = 0;
                    let totalAmount = 0;

                    selectedPO.items.forEach((item, index) => {
                      const receivedItem = receiveData.receivedItems[index];
                      const quantityToReceive = receivedItem?.quantityReceived || 0;

                      if (quantityToReceive > 0) {
                        const gstRate = getProductGST(item.product);
                        const itemCalculation = calculateItemTotal({
                          quantity: quantityToReceive,
                          unitPrice: item.unitPrice,
                          gst: gstRate
                        });

                        totalSubtotal += itemCalculation.subtotal;
                        totalGST += itemCalculation.gstAmount;
                        totalAmount += itemCalculation.total;
                      }
                    });

                    return { totalSubtotal, totalGST, totalAmount };
                  };

                  const { totalSubtotal, totalGST, totalAmount } = calculateTotals();
                  const hasSelectedItems = receiveData.receivedItems.some(item => item?.quantityReceived > 0);

                  return (
                    <div className="space-y-4">
                      {filteredReceiveItems.map((item, index) => {
                        // Find the original index in selectedPO.items to maintain consistency with receiveData
                        const originalIndex = selectedPO.items.findIndex(originalItem =>
                          originalItem === item
                        );
                        const receivedItem = receiveData.receivedItems[originalIndex];
                        const remainingQty = item.quantity - (item.receivedQuantity || 0);

                        return (
                          <div key={originalIndex} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center mb-4">
                              <div className="md:col-span-2">
                                <div className="text-sm font-semibold text-gray-900">
                                  {getProductName(item.product)}
                                </div>
                                {getProductPartNo(item.product) !== '-' && (
                                  <div className="text-xs text-blue-600 font-mono font-medium mt-1">
                                    Part: {getProductPartNo(item.product)}
                                  </div>
                                )}
                                {typeof item.product === 'object' && item.product?.category && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Category: {item.product?.category}
                                  </div>
                                )}
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Ordered</div>
                                <div className="text-sm font-semibold text-gray-900">{item.quantity}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Already Received</div>
                                <div className="text-sm font-semibold text-green-600">{item.receivedQuantity || 0}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Remaining</div>
                                <div className="text-sm font-semibold text-orange-600">{remainingQty}</div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Receive Now</label>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    value={receivedItem?.quantityReceived}
                                    placeholder='0'
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value);

                                      // Clear items validation error when user starts selecting items
                                      if (formErrors.items && qty > 0) {
                                        setFormErrors(prev => ({ ...prev, items: '' }));
                                      }

                                      // Update receivedItems
                                      const newReceivedItems = [...receiveData.receivedItems];
                                      const existingItem = newReceivedItems[originalIndex] || {};
                                      newReceivedItems[originalIndex] = {
                                        ...existingItem,
                                        productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                        quantityReceived: qty,
                                        condition: existingItem.condition || 'good',
                                        batchNumber: existingItem.batchNumber || '',
                                        notes: existingItem.notes || ''
                                      };

                                      // Update items (quantity)
                                      const newItems = [...receiveData.items];
                                      if (newItems[originalIndex]) {
                                        newItems[originalIndex] = {
                                          ...newItems[originalIndex],
                                          quantity: qty
                                        };
                                      }

                                      setReceiveData({
                                        ...receiveData,
                                        receivedItems: newReceivedItems,
                                        items: newItems
                                      });
                                    }}

                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    min="0"
                                    max={remainingQty}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      // Clear items validation error when user selects max quantity
                                      if (formErrors.items && remainingQty > 0) {
                                        setFormErrors(prev => ({ ...prev, items: '' }));
                                      }

                                      const newReceivedItems = [...receiveData.receivedItems];
                                      const existingItem = newReceivedItems[originalIndex] || {};
                                      newReceivedItems[originalIndex] = {
                                        ...existingItem,
                                        productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                        quantityReceived: remainingQty,
                                        condition: existingItem.condition || 'good',
                                        batchNumber: existingItem.batchNumber || '',
                                        notes: existingItem.notes || ''
                                      };

                                      // Update items array too
                                      const newItems = [...receiveData.items];
                                      if (newItems[originalIndex]) {
                                        newItems[originalIndex] = {
                                          ...newItems[originalIndex],
                                          quantity: remainingQty
                                        };
                                      }

                                      setReceiveData({
                                        ...receiveData,
                                        receivedItems: newReceivedItems,
                                        items: newItems
                                      });
                                    }}
                                    className="px-3 py-2 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                                  >
                                    Max
                                  </button>

                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Condition</label>
                                <select
                                  value={receivedItem?.condition || 'good'}
                                  onChange={(e) => {
                                    const newReceivedItems = [...receiveData.receivedItems];
                                    const existingItem = newReceivedItems[originalIndex] || {};
                                    newReceivedItems[originalIndex] = {
                                      ...existingItem,
                                      productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                      condition: e.target.value as 'good' | 'damaged' | 'defective'
                                    };
                                    setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs transition-colors"
                                >
                                  <option value="good">Good</option>
                                  <option value="damaged">Damaged</option>
                                  <option value="defective">Defective</option>
                                </select>
                              </div>
                            </div>

                            {/* Item Financial Details */}
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Price (GNDP)</div>
                                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.unitPrice)}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">GST (%)</div>
                                  <div className="text-sm font-semibold text-gray-900">{getProductGST(item.product)}%</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">GST Amount</div>
                                  <div className="text-sm font-semibold text-green-600">
                                    {formatCurrency(calculateItemTotal({
                                      quantity: receivedItem?.quantityReceived || 0,
                                      unitPrice: item.unitPrice,
                                      gst: getProductGST(item.product)
                                    }).gstAmount)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Item Total</div>
                                  <div className="text-sm font-bold text-indigo-600">
                                    {formatCurrency(calculateItemTotal({
                                      quantity: receivedItem?.quantityReceived || 0,
                                      unitPrice: item.unitPrice,
                                      gst: getProductGST(item.product)
                                    }).total)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Additional Item Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Batch Number</label>
                                <input
                                  type="text"
                                  value={receivedItem?.batchNumber || ''}
                                  onChange={(e) => {
                                    const newReceivedItems = [...receiveData.receivedItems];
                                    const existingItem = newReceivedItems[originalIndex] || {};
                                    newReceivedItems[originalIndex] = {
                                      ...existingItem,
                                      productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                      batchNumber: e.target.value
                                    };
                                    setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                                  }}
                                  placeholder="Optional batch/lot number"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs transition-colors"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Item Notes</label>
                                <input
                                  type="text"
                                  value={receivedItem?.notes || ''}
                                  onChange={(e) => {
                                    const newReceivedItems = [...receiveData.receivedItems];
                                    const existingItem = newReceivedItems[originalIndex] || {};
                                    newReceivedItems[originalIndex] = {
                                      ...existingItem,
                                      productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                      notes: e.target.value
                                    };
                                    setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                                  }}
                                  placeholder="Notes about this item"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs transition-colors"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Invoice Creation Information */}
              {receiveData.gstInvoiceNumber && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    Purchase Invoice Creation
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">GST Invoice Number:</span>
                      <span className="font-semibold text-blue-900">{receiveData.gstInvoiceNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">Invoice Date:</span>
                      <span className="font-semibold text-blue-900">{receiveData.invoiceDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-blue-700 font-medium">Status:</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        Will be created automatically
                      </span>
                    </div>
                    <div className="text-sm text-blue-600 mt-3 p-3 bg-blue-50 rounded-lg">
                      <strong>Note:</strong> A purchase invoice will be automatically created when you receive these items.
                      The payment status will be synchronized with the PO payment status.
                    </div>
                    <div className="text-sm text-green-600 mt-2 p-3 bg-green-50 rounded-lg">
                      <strong>Payment Logic:</strong> The paid amount will reflect the actual amount you have already paid to the supplier
                      (₹{selectedPO?.paidAmount || 0}), not a proportional amount based on items received. This ensures accurate
                      financial tracking across partial receipts.
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Items Ordered Card (Left Side) */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-gray-600" />
                    Order Summary
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Items Ordered:</span>
                      <span className="font-semibold text-gray-900 text-lg">
                        {selectedPO.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Previously Received:</span>
                      <span className="font-semibold text-green-600 text-lg">
                        {selectedPO.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Receiving Now:</span>
                      <span className="font-semibold text-blue-600 text-lg">
                        {receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Will Remain:</span>
                      <span className="font-semibold text-orange-600 text-lg">
                        {selectedPO.items.reduce((sum, item) => sum + item.quantity, 0) -
                          selectedPO.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) -
                          receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}
                      </span>
                    </div>

                    <div className="border-t border-gray-300 pt-4 mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600">Receipt Date:</span>
                        <span className="font-semibold text-gray-900">
                          {receiveData.receiptDate
                            ? new Date(receiveData.receiptDate).toLocaleDateString()
                            : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600">Inspector:</span>
                        <span className="font-semibold text-gray-900">
                          {receiveData.inspectedBy || 'Not assigned'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-semibold text-gray-900">
                          {(() => {
                            const location = locations.find(loc => loc._id === receiveData.location);
                            return location ? `${location.name} (${location.type})` : 'Not selected';
                          })()}
                        </span>
                      </div>
                    </div>

                    {receiveData.notes && (
                      <div className="border-t border-gray-300 pt-4">
                        <span className="text-gray-600 text-sm">Notes:</span>
                        <div className="font-medium text-gray-900 text-sm italic mt-1">
                          {receiveData.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipt Summary Card (Right Side) */}


                {/* Receipt Summary Card (Right Side) */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-lg p-6 shadow-sm">
                  <div className='pb-4'>
                    <div className="flex items-center space-x-2 mb-4">
                      {/* <IndianRupee className="w-5 h-5 text-gray-600" /> */}
                      <h3 className="text-lg font-semibold text-gray-900">External Invoice details</h3>
                    </div>
                    <div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          External Invoice Total
                        </label>
                        <input
                          type="number"
                          value={receiveData.externalInvoiceTotal}
                          onChange={(e) => {
                            const value = e.target.value;
                            setReceiveData({ ...receiveData, externalInvoiceTotal: parseFloat(value) });

                            // Clear existing timeout
                            if (debounceTimeoutRef.current) {
                              clearTimeout(debounceTimeoutRef.current);
                            }

                            debounceTimeoutRef.current = setTimeout(() => {
                              setDebouncedExternalTotal(value);
                            }, 500); // 500ms delay
                          }}
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

                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Receipt Summary
                  </h4>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Items Count</div>
                      <div className="font-bold text-gray-900 text-xl">
                        {receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}
                      </div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Total GST</div>
                      <div className="font-bold text-green-700 text-lg">
                        {formatCurrency((() => {
                          let total = 0;
                          selectedPO.items.forEach((item, index) => {
                            const receivedItem = receiveData.receivedItems[index];
                            const quantityToReceive = receivedItem?.quantityReceived || 0;
                            if (quantityToReceive > 0) {
                              const gstRate = getProductGST(item.product);
                              const itemCalculation = calculateItemTotal({
                                quantity: quantityToReceive,
                                unitPrice: item.unitPrice,
                                gst: gstRate
                              });
                              total += itemCalculation.gstAmount;
                            }
                          });
                          return total;
                        })())}
                      </div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Subtotal</div>
                      <div className="font-bold text-blue-900 text-lg">
                        {formatCurrency((() => {
                          let total = 0;
                          selectedPO.items.forEach((item, index) => {
                            const receivedItem = receiveData.receivedItems[index];
                            const quantityToReceive = receivedItem?.quantityReceived || 0;
                            if (quantityToReceive > 0) {
                              total += quantityToReceive * item.unitPrice;
                            }
                          });
                          return total;
                        })())}
                      </div>
                    </div>
                  </div>

                  <div className="text-center w-full mt-4 bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-xs text-gray-600 mb-1">Grand Total</div>
                    <div className="font-bold text-indigo-900 text-xl">
                      {formatCurrency((() => {
                        let total = 0;
                        selectedPO.items.forEach((item, index) => {
                          const receivedItem = receiveData.receivedItems[index];
                          const quantityToReceive = receivedItem?.quantityReceived || 0;
                          if (quantityToReceive > 0) {
                            const gstRate = getProductGST(item.product);
                            const itemCalculation = calculateItemTotal({
                              quantity: quantityToReceive,
                              unitPrice: item.unitPrice,
                              gst: gstRate
                            });
                            total += itemCalculation.total;
                          }
                        });
                        return total;
                      })())}
                    </div>
                  </div>

                  {/* Amount Comparison Message */}
                  {debouncedExternalTotal && (
                    <div className="mt-4 rounded-lg border">
                      {(() => {
                        // Calculate Grand Total
                        let grandTotal = 0;
                        selectedPO.items.forEach((item, index) => {
                          const receivedItem = receiveData.receivedItems[index];
                          const quantityToReceive = receivedItem?.quantityReceived || 0;
                          if (quantityToReceive > 0) {
                            const gstRate = getProductGST(item.product);
                            const itemCalculation = calculateItemTotal({
                              quantity: quantityToReceive,
                              unitPrice: item.unitPrice,
                              gst: gstRate
                            });
                            grandTotal += itemCalculation.total;
                          }
                        });

                        // Compare amounts using debounced value
                        const externalTotal = parseFloat(debouncedExternalTotal);
                        console.log("externalTotal:", externalTotal);

                        //const isMatching = Math.abs(externalTotal - grandTotal) < 0.0001; // Allow small floating point differences
                        const isMatching = externalTotal.toFixed(2) === grandTotal.toFixed(2);

                        return isMatching ? (
                          <div className="flex items-center text-green-700 bg-green-50 p-2 rounded border border-green-300">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">Amounts match - Invoice is correct</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-700 p-2 rounded bg-gradient-to-r from-red-50 to-red-50 border border-red-300 ">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                              <span className="font-medium">Amount mismatch detected</span>
                              <div className="text-sm mt-1">
                                <div className="mt-2">
                                  <div className="flex justify-between">
                                    <span>External Invoice Total:</span>
                                    <span className="font-semibold">{formatCurrency(externalTotal)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Calculated Total:</span>
                                    <span className="font-semibold">{formatCurrency(grandTotal)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Difference:</span>
                                    <span className={`font-semibold ${Math.abs(externalTotal - grandTotal) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                      {formatCurrency(Math.abs(externalTotal - grandTotal))}
                                    </span>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs text-gray-600">
                                  <strong>Note:</strong> The External Invoice Total will be used as the final invoice amount.
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Validation Summary */}
              {formErrors && Object.keys(formErrors).length > 0 && Object.values(formErrors).some(error => error && error.trim() !== '') && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800 mb-2">Please fix the following errors:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                        {Object.entries(formErrors)
                          .filter(([field, error]) => error && error.trim() !== '') // Only show fields with actual error messages
                          .map(([field, error]) => (
                            <li key={field}>
                              <span className="font-medium">{field === 'gstInvoiceNumber' ? 'GST Invoice Number' :
                                field === 'location' ? 'Delivery Location' :
                                  field === 'receiptDate' ? 'Receipt Date' :
                                    field === 'shipDate' ? 'Ship Date' :
                                      field === 'noOfPackages' ? 'Number of Packages' :
                                        field === 'invoiceDate' ? 'Invoice Date' :
                                          field === 'items' ? 'Items' : field}:</span> {error}
                            </li>
                          ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowReceiveModal(false);
                    setDebouncedExternalTotal('')
                    setFormErrors({})
                    clearGstInvoiceValidation()
                    setReceiveData({
                      location: '',
                      receiptDate: '',
                      inspectedBy: '',
                      receivedItems: [],
                      items: [],
                      // New shipping and documentation fields
                      shipDate: new Date().toISOString().split('T')[0],
                      docketNumber: '',
                      noOfPackages: 1,
                      gstInvoiceNumber: '',
                      invoiceDate: new Date().toISOString().split('T')[0],
                      documentNumber: '',
                      documentDate: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleReceiveItems();
                  }}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? 'Receiving...' : 'Confirm Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Update Modal - Invoice Style */}
      {showPaymentModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            {/* Invoice Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                    <IndianRupee className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Payment Update</h2>
                    <p className="text-blue-100 mt-1">
                      Purchase Order: <span className="font-semibold">{selectedPO.poNumber}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-white hover:text-blue-100 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Invoice Information Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - PO Details */}
                <div className="lg:col-span-1 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Package className="w-5 h-5 mr-2 text-blue-600" />
                      Purchase Order Details
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">PO Number:</span>
                        <span className="font-semibold text-gray-900">{selectedPO.poNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Supplier:</span>
                        <span className="font-semibold text-gray-900">
                          {typeof selectedPO.supplier === 'string' ? selectedPO.supplier : (selectedPO.supplier as Supplier)?.name || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order Date:</span>
                        <span className="font-semibold text-gray-900">{formatDate(selectedPO.orderDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPO.status)}`}>
                          {selectedPO.status.charAt(0).toUpperCase() + selectedPO.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Summary Card */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                      <IndianRupee className="w-5 h-5 mr-2 text-green-600" />
                      Payment Summary
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-green-700 font-medium">Total Amount:</span>
                        <span className="text-xl font-bold text-green-900">{formatCurrency(selectedPO.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-green-700 font-medium">Paid Amount:</span>
                        <span className="text-lg font-semibold text-green-600">{formatCurrency(selectedPO.paidAmount || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-green-700 font-medium">Remaining:</span>
                        <span className="text-lg font-semibold text-orange-600">
                          {formatCurrency(selectedPO.remainingAmount || (selectedPO.totalAmount - (selectedPO.paidAmount || 0)))}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-green-200">
                        <div className="flex justify-between items-center">
                          <span className="text-green-700 font-medium">Payment Status:</span>
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${selectedPO.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                              selectedPO.paymentStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {(selectedPO.paymentStatus
                              ? selectedPO.paymentStatus.charAt(0).toUpperCase() + selectedPO.paymentStatus.slice(1)
                              : 'Pending')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Payment Form */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      {/* <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg> */}
                      Payment Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Payment Amount */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Amount (₹) <span className="text-red-500">*</span>
                        </label>

                        {/* Quick Payment Buttons */}
                        <div className="mb-2">
                          <div className="text-xs text-gray-500 mb-2">Quick Payment Options:</div>
                          <div className="flex space-x-3">
                            <button
                              type="button"
                              onClick={() => {
                                const halfAmount = Math.ceil((selectedPO.remainingAmount || (selectedPO.totalAmount - (selectedPO.paidAmount || 0))) / 2);
                                const roundedHalfAmount = Math.round(halfAmount * 100) / 100; // Ensure 2 decimal places
                                setPaymentUpdate({ ...paymentUpdate, paidAmount: roundedHalfAmount });
                                if (formErrors.paidAmount) {
                                  setFormErrors(prev => ({ ...prev, paidAmount: '' }));
                                }
                              }}
                              className="flex-1 px-4 py-2 bg-orange-100 text-orange-700 border border-orange-300 rounded-lg hover:bg-orange-200 transition-colors font-medium text-sm flex items-center justify-center"
                              title="Set payment amount to 50% of remaining balance"
                            >
                              <Clock className="w-4 h-4 mr-1" />
                              Half Payment
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const fullAmount = selectedPO.remainingAmount || (selectedPO.totalAmount - (selectedPO.paidAmount || 0));
                                const roundedFullAmount = Math.round(fullAmount * 100) / 100; // Ensure 2 decimal places
                                setPaymentUpdate({ ...paymentUpdate, paidAmount: roundedFullAmount });
                                if (formErrors.paidAmount) {
                                  setFormErrors(prev => ({ ...prev, paidAmount: '' }));
                                }
                              }}
                              className="flex-1 px-4 py-2 bg-green-100 text-green-700 border border-green-300 rounded-lg hover:bg-green-200 transition-colors font-medium text-sm flex items-center justify-center"
                              title="Set payment amount to 100% of remaining balance"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Full Payment
                            </button>
                          </div>
                        </div>

                        <div className="relative">
                          <span className="absolute left-3 top-3 text-gray-500 text-lg">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={selectedPO.remainingAmount || (selectedPO.totalAmount - (selectedPO.paidAmount || 0))}
                            step="1"
                            value={paymentUpdate.paidAmount === 0 ? '' : paymentUpdate.paidAmount}
                            onChange={(e) => {
                              const value = e.target.value;
                              const amount = value === '' ? 0 : parseFloat(value) || 0;
                              setPaymentUpdate({ ...paymentUpdate, paidAmount: amount });

                              if (formErrors.paidAmount && amount > 0 && amount <= (selectedPO.remainingAmount || (selectedPO.totalAmount - (selectedPO.paidAmount || 0)))) {
                                setFormErrors(prev => ({ ...prev, paidAmount: '' }));
                              }
                            }}
                            className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-lg ${formErrors.paidAmount ? 'border-red-500' : 'border-gray-300'
                              }`}
                            placeholder="0"
                          />
                          {paymentUpdate.paidAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentUpdate({ ...paymentUpdate, paidAmount: 0 });
                                if (formErrors.paidAmount) {
                                  setFormErrors(prev => ({ ...prev, paidAmount: '' }));
                                }
                              }}
                              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Clear field"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                        {formErrors.paidAmount && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.paidAmount}</p>
                        )}

                        {/* Amount Info */}
                        <div className="mt-2 text-xs text-gray-600">
                          <span className="font-medium">Remaining Amount:</span> {formatCurrency(selectedPO.remainingAmount || (selectedPO.totalAmount - (selectedPO.paidAmount || 0)))}
                        </div>

                        {/* Payment Type Indicator */}
                        {paymentUpdate.paidAmount > 0 && (
                          <div className="mt-2">
                            {paymentUpdate.paidAmount === (selectedPO.remainingAmount || (selectedPO.totalAmount - (selectedPO.paidAmount || 0))) ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                <Check className="w-3 h-3 mr-1" />
                                Full Payment
                              </span>
                            ) : paymentUpdate.paidAmount === Math.ceil((selectedPO.remainingAmount || (selectedPO.totalAmount - (selectedPO.paidAmount || 0))) / 2) ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                                <Clock className="w-3 h-3 mr-1" />
                                Half Payment
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                <Edit className="w-3 h-3 mr-1" />
                                Custom Amount
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Payment Method */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method <span className="text-red-500">*</span>
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => setShowPaymentMethodDropdown(!showPaymentMethodDropdown)}
                            className={`flex items-center justify-between w-full px-4 py-3 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 bg-gray-50 ${formErrors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                              }`}
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

                      {/* Dynamic Payment Method Details */}
                      {paymentUpdate.paymentMethod && paymentUpdate.paymentMethod !== '' && (
                        <div className="md:col-span-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
                            <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Payment Method Details - {getPaymentMethodLabel(paymentUpdate.paymentMethod)}
                          </h4>

                          {/* Cash Payment Details */}
                          {paymentUpdate.paymentMethod === 'cash' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Received By
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.cash?.receivedBy || ''}
                                  onChange={(e) => updatePaymentMethodDetails('cash', 'receivedBy', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Who received the cash?"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Receipt Number
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.cash?.receiptNumber || ''}
                                  onChange={(e) => setPaymentUpdate({
                                    ...paymentUpdate,
                                    paymentMethodDetails: {
                                      ...paymentUpdate.paymentMethodDetails,
                                      cash: {
                                        ...paymentUpdate.paymentMethodDetails?.cash,
                                        receiptNumber: e.target.value
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Receipt number (optional)"
                                />
                              </div>
                            </div>
                          )}

                          {/* Cheque Payment Details */}
                          {paymentUpdate.paymentMethod === 'cheque' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Cheque Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.cheque?.chequeNumber || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('cheque', 'chequeNumber', e.target.value);
                                    if (formErrors.chequeNumber) {
                                      setFormErrors(prev => ({ ...prev, chequeNumber: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.chequeNumber ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  placeholder="Enter cheque number"
                                  required
                                />
                                {formErrors.chequeNumber && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.chequeNumber}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Bank Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.cheque?.bankName || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('cheque', 'bankName', e.target.value);
                                    if (formErrors.bankName) {
                                      setFormErrors(prev => ({ ...prev, bankName: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.bankName ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  placeholder="Enter bank name"
                                  required
                                />
                                {formErrors.bankName && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.bankName}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Branch Name
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.cheque?.branchName || ''}
                                  onChange={(e) => setPaymentUpdate({
                                    ...paymentUpdate,
                                    paymentMethodDetails: {
                                      ...paymentUpdate.paymentMethodDetails,
                                      cheque: {
                                        ...paymentUpdate.paymentMethodDetails?.cheque,
                                        branchName: e.target.value
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter branch name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Issue Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  value={paymentUpdate.paymentMethodDetails?.cheque?.issueDate || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('cheque', 'issueDate', e.target.value);
                                    if (formErrors.issueDate) {
                                      setFormErrors(prev => ({ ...prev, issueDate: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.issueDate ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  required
                                />
                                {formErrors.issueDate && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.issueDate}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Account Holder Name
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.cheque?.accountHolderName || ''}
                                  onChange={(e) => setPaymentUpdate({
                                    ...paymentUpdate,
                                    paymentMethodDetails: {
                                      ...paymentUpdate.paymentMethodDetails,
                                      cheque: {
                                        ...paymentUpdate.paymentMethodDetails?.cheque,
                                        accountHolderName: e.target.value
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter account holder name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Account Number
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.cheque?.accountNumber || ''}
                                  onChange={(e) => setPaymentUpdate({
                                    ...paymentUpdate,
                                    paymentMethodDetails: {
                                      ...paymentUpdate.paymentMethodDetails,
                                      cheque: {
                                        ...paymentUpdate.paymentMethodDetails?.cheque,
                                        accountNumber: e.target.value
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter account number"
                                />
                              </div>
                            </div>
                          )}

                          {/* Bank Transfer Details */}
                          {paymentUpdate.paymentMethod === 'bank_transfer' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Bank Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.bankTransfer?.bankName || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('bankTransfer', 'bankName', e.target.value);
                                    if (formErrors.bankName) {
                                      setFormErrors(prev => ({ ...prev, bankName: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.bankName ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  placeholder="Enter bank name"
                                  required
                                />
                                {formErrors.bankName && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.bankName}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Account Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.bankTransfer?.accountNumber || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('bankTransfer', 'accountNumber', e.target.value);
                                    if (formErrors.accountNumber) {
                                      setFormErrors(prev => ({ ...prev, accountNumber: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.accountNumber ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  placeholder="Enter account number"
                                  required
                                />
                                {formErrors.accountNumber && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.accountNumber}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  IFSC Code <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.bankTransfer?.ifscCode || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('bankTransfer', 'ifscCode', e.target.value);
                                    if (formErrors.ifscCode) {
                                      setFormErrors(prev => ({ ...prev, ifscCode: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.ifscCode ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  placeholder="Enter IFSC code"
                                  required
                                />
                                {formErrors.ifscCode && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.ifscCode}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Transaction ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.bankTransfer?.transactionId || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('bankTransfer', 'transactionId', e.target.value);
                                    if (formErrors.transactionId) {
                                      setFormErrors(prev => ({ ...prev, transactionId: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.transactionId ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  placeholder="Enter transaction ID"
                                  required
                                />
                                {formErrors.transactionId && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.transactionId}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Transfer Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="date"
                                  value={paymentUpdate.paymentMethodDetails?.bankTransfer?.transferDate || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('bankTransfer', 'transferDate', e.target.value);
                                    if (formErrors.transferDate) {
                                      setFormErrors(prev => ({ ...prev, transferDate: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.transferDate ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  required
                                />
                                {formErrors.transferDate && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.transferDate}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Reference Number
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.bankTransfer?.referenceNumber || ''}
                                  onChange={(e) => setPaymentUpdate({
                                    ...paymentUpdate,
                                    paymentMethodDetails: {
                                      ...paymentUpdate.paymentMethodDetails,
                                      bankTransfer: {
                                        ...paymentUpdate.paymentMethodDetails?.bankTransfer,
                                        referenceNumber: e.target.value
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter reference number"
                                />
                              </div>
                            </div>
                          )}

                          {/* UPI Payment Details */}
                          {paymentUpdate.paymentMethod === 'upi' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  UPI ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.upi?.upiId || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('upi', 'upiId', e.target.value);
                                    if (formErrors.upiId) {
                                      setFormErrors(prev => ({ ...prev, upiId: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.upiId ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  placeholder="Enter UPI ID"
                                  required
                                />
                                {formErrors.upiId && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.upiId}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Transaction ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.upi?.transactionId || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('upi', 'transactionId', e.target.value);
                                    if (formErrors.transactionId) {
                                      setFormErrors(prev => ({ ...prev, transactionId: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.transactionId ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  placeholder="Enter transaction ID"
                                  required
                                />
                                {formErrors.transactionId && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.transactionId}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Payer Name
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.upi?.payerName || ''}
                                  onChange={(e) => setPaymentUpdate({
                                    ...paymentUpdate,
                                    paymentMethodDetails: {
                                      ...paymentUpdate.paymentMethodDetails,
                                      upi: {
                                        ...paymentUpdate.paymentMethodDetails?.upi,
                                        payerName: e.target.value
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter payer name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Payer Phone
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.upi?.payerPhone || ''}
                                  onChange={(e) => setPaymentUpdate({
                                    ...paymentUpdate,
                                    paymentMethodDetails: {
                                      ...paymentUpdate.paymentMethodDetails,
                                      upi: {
                                        ...paymentUpdate.paymentMethodDetails?.upi,
                                        payerPhone: e.target.value
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter payer phone"
                                />
                              </div>
                            </div>
                          )}

                          {/* Card Payment Details */}
                          {paymentUpdate.paymentMethod === 'card' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Card Type <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={paymentUpdate.paymentMethodDetails?.card?.cardType || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('card', 'cardType', e.target.value);
                                    if (formErrors.cardType) {
                                      setFormErrors(prev => ({ ...prev, cardType: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.cardType ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  required
                                >
                                  <option value="">Select card type</option>
                                  <option value="credit">Credit Card</option>
                                  <option value="debit">Debit Card</option>
                                  <option value="prepaid">Prepaid Card</option>
                                </select>
                                {formErrors.cardType && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.cardType}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Card Network <span className="text-red-500">*</span>
                                </label>
                                <select
                                  value={paymentUpdate.paymentMethodDetails?.card?.cardNetwork || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('card', 'cardNetwork', e.target.value);
                                    if (formErrors.cardNetwork) {
                                      setFormErrors(prev => ({ ...prev, cardNetwork: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.cardNetwork ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  required
                                >
                                  <option value="">Select card network</option>
                                  <option value="visa">Visa</option>
                                  <option value="mastercard">Mastercard</option>
                                  <option value="amex">American Express</option>
                                  <option value="rupay">RuPay</option>
                                  <option value="other">Other</option>
                                </select>
                                {formErrors.cardNetwork && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.cardNetwork}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Last 4 Digits <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  maxLength={4}
                                  value={paymentUpdate.paymentMethodDetails?.card?.lastFourDigits || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('card', 'lastFourDigits', e.target.value);
                                    if (formErrors.lastFourDigits) {
                                      setFormErrors(prev => ({ ...prev, lastFourDigits: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.lastFourDigits ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  placeholder="Last 4 digits"
                                  required
                                />
                                {formErrors.lastFourDigits && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.lastFourDigits}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Transaction ID <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.card?.transactionId || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('card', 'transactionId', e.target.value);
                                    if (formErrors.transactionId) {
                                      setFormErrors(prev => ({ ...prev, transactionId: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.transactionId ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  placeholder="Enter transaction ID"
                                  required
                                />
                                {formErrors.transactionId && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.transactionId}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Card Holder Name
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.card?.cardHolderName || ''}
                                  onChange={(e) => setPaymentUpdate({
                                    ...paymentUpdate,
                                    paymentMethodDetails: {
                                      ...paymentUpdate.paymentMethodDetails,
                                      card: {
                                        ...paymentUpdate.paymentMethodDetails?.card,
                                        cardHolderName: e.target.value
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter card holder name"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Authorization Code
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.card?.authorizationCode || ''}
                                  onChange={(e) => updatePaymentMethodDetails('card', 'authorizationCode', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter authorization code"
                                />
                              </div>
                            </div>
                          )}

                          {/* Other Payment Method Details */}
                          {paymentUpdate.paymentMethod === 'other' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Method Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.other?.methodName || ''}
                                  onChange={(e) => {
                                    updatePaymentMethodDetails('other', 'methodName', e.target.value);
                                    if (formErrors.methodName) {
                                      setFormErrors(prev => ({ ...prev, methodName: '' }));
                                    }
                                  }}
                                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.methodName ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                  placeholder="Enter payment method name"
                                  required
                                />
                                {formErrors.methodName && (
                                  <p className="text-red-500 text-xs mt-1">{formErrors.methodName}</p>
                                )}
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Reference Number
                                </label>
                                <input
                                  type="text"
                                  value={paymentUpdate.paymentMethodDetails?.other?.referenceNumber || ''}
                                  onChange={(e) => setPaymentUpdate({
                                    ...paymentUpdate,
                                    paymentMethodDetails: {
                                      ...paymentUpdate.paymentMethodDetails,
                                      other: {
                                        ...paymentUpdate.paymentMethodDetails?.other,
                                        referenceNumber: e.target.value
                                      }
                                    }
                                  })}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                  placeholder="Enter reference number"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Payment Date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={paymentUpdate.paymentDate}
                          onChange={(e) => setPaymentUpdate({ ...paymentUpdate, paymentDate: e.target.value })}
                          className={`w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.paymentDate ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {formErrors.paymentDate && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.paymentDate}</p>
                        )}
                      </div>

                      {/* Notes */}
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Notes
                        </label>
                        <textarea
                          value={paymentUpdate.notes}
                          onChange={(e) => setPaymentUpdate({ ...paymentUpdate, notes: e.target.value })}
                          rows={3}
                          placeholder="Any additional notes about the payment..."
                          className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Preview */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-3 flex items-center justify-between">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Payment Preview
                      </div>
                      {paymentUpdate.paymentMethod && paymentUpdate.paymentMethod !== '' && (
                        <div className="flex items-center">
                          <span className="text-xs text-blue-600 mr-2">Payment Method:</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            {getPaymentMethodLabel(paymentUpdate.paymentMethod)}
                          </span>
                        </div>
                      )}
                    </h4>

                    {/* Payment Options Summary */}
                    <div className="mb-3 p-3 bg-white rounded-lg border border-blue-200">
                      <div className="text-xs text-blue-700 mb-2 font-medium">Quick Payment Options:</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-blue-600">Half Payment:</span>
                          <span className="font-medium text-blue-900">
                            {formatCurrency(Math.ceil((selectedPO.remainingAmount || (selectedPO.totalAmount - (selectedPO.paidAmount || 0))) / 2))}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Full Payment:</span>
                          <span className="font-medium text-blue-900">
                            {formatCurrency(selectedPO.remainingAmount || (selectedPO.totalAmount - (selectedPO.paidAmount || 0)))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-600">Current Paid:</span>
                        <span className="ml-2 font-semibold text-blue-900">{formatCurrency(selectedPO.paidAmount || 0)}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">New Payment:</span>
                        <span className="ml-2 font-semibold text-blue-900">{formatCurrency(paymentUpdate.paidAmount || 0)}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Total After:</span>
                        <span className="ml-2 font-semibold text-blue-900">
                          {formatCurrency((selectedPO.paidAmount || 0) + (paymentUpdate.paidAmount || 0))}
                        </span>
                      </div>
                      <div>
                        <span className="text-blue-600">Remaining:</span>
                        <span className="ml-2 font-semibold text-blue-900">
                          {formatCurrency(selectedPO.totalAmount - ((selectedPO.paidAmount || 0) + (paymentUpdate.paidAmount || 0)))}
                        </span>
                      </div>
                    </div>

                    {/* Payment Method Details Summary */}
                    {paymentUpdate.paymentMethod && paymentUpdate.paymentMethod !== '' && (
                      <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                        <div className="text-xs text-blue-700 mb-3 font-medium flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Payment Method Details - {getPaymentMethodLabel(paymentUpdate.paymentMethod)}
                        </div>

                        {/* Cash Payment Details Summary */}
                        {paymentUpdate.paymentMethod === 'cash' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {paymentUpdate.paymentMethodDetails?.cash?.receivedBy && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Received By:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.cash.receivedBy}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.cash?.receiptNumber && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Receipt Number:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.cash.receiptNumber}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Cheque Payment Details Summary */}
                        {paymentUpdate.paymentMethod === 'cheque' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {paymentUpdate.paymentMethodDetails?.cheque?.chequeNumber && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Cheque Number:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.cheque.chequeNumber}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.cheque?.bankName && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Bank Name:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.cheque.bankName}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.cheque?.branchName && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Branch Name:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.cheque.branchName}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.cheque?.issueDate && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Issue Date:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.cheque.issueDate}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.cheque?.accountHolderName && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Account Holder:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.cheque.accountHolderName}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.cheque?.accountNumber && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Account Number:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.cheque.accountNumber}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Bank Transfer Details Summary */}
                        {paymentUpdate.paymentMethod === 'bank_transfer' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {paymentUpdate.paymentMethodDetails?.bankTransfer?.bankName && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Bank Name:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.bankTransfer.bankName}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.bankTransfer?.accountNumber && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Account Number:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.bankTransfer.accountNumber}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.bankTransfer?.ifscCode && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">IFSC Code:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.bankTransfer.ifscCode}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.bankTransfer?.transactionId && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Transaction ID:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.bankTransfer.transactionId}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.bankTransfer?.transferDate && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Transfer Date:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.bankTransfer.transferDate}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.bankTransfer?.referenceNumber && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Reference Number:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.bankTransfer.referenceNumber}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* UPI Payment Details Summary */}
                        {paymentUpdate.paymentMethod === 'upi' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {paymentUpdate.paymentMethodDetails?.upi?.upiId && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">UPI ID:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.upi.upiId}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.upi?.transactionId && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Transaction ID:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.upi.transactionId}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.upi?.payerName && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Payer Name:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.upi.payerName}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.upi?.payerPhone && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Payer Phone:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.upi.payerPhone}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Card Payment Details Summary */}
                        {paymentUpdate.paymentMethod === 'card' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {paymentUpdate.paymentMethodDetails?.card?.cardType && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Card Type:</span>
                                <span className="font-medium text-blue-900 capitalize">{paymentUpdate.paymentMethodDetails.card.cardType}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.card?.cardNetwork && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Card Network:</span>
                                <span className="font-medium text-blue-900 capitalize">{paymentUpdate.paymentMethodDetails.card.cardNetwork}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.card?.lastFourDigits && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Last 4 Digits:</span>
                                <span className="font-medium text-blue-900">****{paymentUpdate.paymentMethodDetails.card.lastFourDigits}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.card?.transactionId && (
                              <div className="flex justify-between">
                                <span className="text-blue-900">Transaction ID:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.card.transactionId}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.card?.cardHolderName && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Card Holder:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.card.cardHolderName}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.card?.authorizationCode && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Auth Code:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.card.authorizationCode}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Other Payment Method Details Summary */}
                        {paymentUpdate.paymentMethod === 'other' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {paymentUpdate.paymentMethodDetails?.other?.methodName && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Method Name:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.other.methodName}</span>
                              </div>
                            )}
                            {paymentUpdate.paymentMethodDetails?.other?.referenceNumber && (
                              <div className="flex justify-between">
                                <span className="text-blue-600">Reference Number:</span>
                                <span className="font-medium text-blue-900">{paymentUpdate.paymentMethodDetails.other.referenceNumber}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPaymentUpdate}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? 'Updating...' : 'Update Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Import Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Preview Excel Import</h2>
                <p className="text-gray-600 mt-1">
                  Review what will be imported before confirming
                </p>
              </div>
              <button
                onClick={closePreviewModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Purchase Orders</p>
                      <p className="text-2xl font-bold text-blue-900">{previewData.summary.uniqueOrders}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">New Products</p>
                      <p className="text-2xl font-bold text-green-900">{previewData.summary.newProducts}</p>
                    </div>
                    <Plus className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Existing Products</p>
                      <p className="text-2xl font-bold text-yellow-900">{previewData.summary.existingProducts}</p>
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

              {/* Errors Section */}
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

              {/* New Products Section */}
              {previewData.productsToCreate.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-green-900 mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Products to be Created ({previewData.productsToCreate.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-green-100 text-green-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Part No</th>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Department</th>
                          <th className="px-3 py-2 text-left font-medium">HSN</th>
                          <th className="px-3 py-2 text-left font-medium">Price</th>
                          <th className="px-3 py-2 text-left font-medium">GST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-200">
                        {previewData.productsToCreate.slice(0, 10).map((product: any, index: number) => (
                          <tr key={index} className="hover:bg-green-50">
                            <td className="px-3 py-2 font-mono text-xs">{product.partNo}</td>
                            <td className="px-3 py-2">{product.name}</td>
                            <td className="px-3 py-2">{product.dept}</td>
                            <td className="px-3 py-2">{product.hsnNumber}</td>
                            <td className="px-3 py-2">₹{product.price?.toLocaleString()}</td>
                            <td className="px-3 py-2">{product.gst}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.productsToCreate.length > 10 && (
                      <p className="text-sm text-green-600 mt-2 text-center">
                        ... and {previewData.productsToCreate.length - 10} more products
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Existing Products Section */}
              {previewData.existingProducts.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-yellow-900 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Existing Products ({previewData.existingProducts.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-yellow-100 text-yellow-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Part No</th>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Current Price</th>
                          <th className="px-3 py-2 text-left font-medium">Excel Price</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-yellow-200">
                        {previewData.existingProducts.slice(0, 5).map((product: any, index: number) => (
                          <tr key={index} className="hover:bg-yellow-50">
                            <td className="px-3 py-2 font-mono text-xs">{product.partNo}</td>
                            <td className="px-3 py-2">{product.name}</td>
                            <td className="px-3 py-2">₹{product.currentPrice?.toLocaleString() || 'N/A'}</td>
                            <td className="px-3 py-2">₹{product.excelPrice?.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Found
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.existingProducts.length > 5 && (
                      <p className="text-sm text-yellow-600 mt-2 text-center">
                        ... and {previewData.existingProducts.length - 5} more existing products
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Purchase Orders Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Purchase Orders to be Created ({previewData.ordersToCreate.length})
                </h3>
                <div className="space-y-4">
                  {previewData.ordersToCreate.slice(0, 5).map((order: any, index: number) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-blue-900">{order.poNumber}</h4>
                          <p className="text-sm text-blue-700">Supplier: {order.supplier}</p>
                          <p className="text-sm text-blue-600">
                            Expected Delivery: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-900">
                            ₹{order.totalAmount.toLocaleString()}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.priority === 'high' ? 'bg-red-100 text-red-800' :
                            order.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                            {order.priority}
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-blue-200 pt-3">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">Items ({order.items.length})</h5>
                        <div className="space-y-2">
                          {order.items.slice(0, 3).map((item: any, itemIndex: number) => (
                            <div key={itemIndex} className="flex justify-between items-center text-sm">
                              <div className="flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${item.exists ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}></span>
                                <span className="text-gray-900">{item.productName}</span>
                                <span className="text-gray-500 ml-2">({item.partNo})</span>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-900">{item.quantity} × ₹{item.unitPrice.toLocaleString()}</span>
                                <span className="text-blue-700 font-medium ml-2">
                                  = ₹{item.totalPrice.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-xs text-blue-600 text-center">
                              ... and {order.items.length - 3} more items
                            </p>
                          )}
                        </div>
                      </div>
                      {order.notes && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-xs text-blue-600">
                            <strong>Notes:</strong> {order.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  {previewData.ordersToCreate.length > 5 && (
                    <p className="text-sm text-blue-600 text-center">
                      ... and {previewData.ordersToCreate.length - 5} more purchase orders
                    </p>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    <span className="text-gray-600">New Product (will be created)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                    <span className="text-gray-600">Existing Product (will be used)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
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
                  `Confirm Import (${previewData.summary.uniqueOrders} Orders, ${previewData.summary.newProducts} New Products)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderManagement;


