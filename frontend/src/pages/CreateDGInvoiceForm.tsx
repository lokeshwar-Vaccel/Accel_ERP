import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import {
  Calendar,
  Package,
  Building2,
  Mail,
  Phone,
  MapPin,
  Plus,
  X,
  Save,
  ArrowLeft,
  ChevronDown,
  Search,
  Edit
} from 'lucide-react';
import { apiClient } from '../utils/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';
import { Button } from '../components/ui/Botton';

// Types
interface InvoiceItem {
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  uom: string;
  discount: number;
  discountedAmount: number;
  gstRate: number;
  gstAmount: number;
  // DG Product specific fields
  kva: string;
  phase: string;
  annexureRating: string;
  dgModel: string;
  numberOfCylinders: number;
  subject: string;
  isActive: boolean;
  hsnNumber: string;
}

interface CustomerAddress {
  id: number;
  address: string;
  state: string;
  district: string;
  pincode: string;
  addressId?: number;
  gstNumber?: string;
  isPrimary?: boolean;
}

interface Customer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  addresses?: CustomerAddress[];
  type?: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  gndp?: number;
  category: string;
  brand: string;
  gst?: number;
  partNo?: string;
  hsnNumber?: string;
  uom?: string;
  availableQuantity?: number;
}

interface Quotation {
  _id: string;
  quotationNumber: string;
  customer: string | Customer;
  issueDate: string;
  validUntil: string;
  grandTotal: number;
  status: string;
}

interface Enquiry {
  _id: string;
  enquiryNo: string;
  customerName: string;
  corporateName?: string;
  phoneNumber: string;
  email?: string;
}

interface InvoiceFormData {
  invoiceNumber?: string;
  customer: string;
  customerEmail: string;
  billingAddress?: CustomerAddress;
  shippingAddress?: CustomerAddress;
  quotationNumber?: string;
  poNumber?: string;
  poFromCustomer?: string;
  invoiceDate: string;
  dueDate: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
  paymentTerms: string;
  notes?: string;
  deliveryNotes?: string;
  referenceNumber?: string;
  referenceDate?: string;
  buyersOrderNumber?: string;
  buyersOrderDate?: string;
  dispatchDocNo?: string;
  dispatchDocDate?: string;
  destination?: string;
  deliveryNoteDate?: string;
  dispatchedThrough?: string;
  termsOfDelivery?: string;
  items: InvoiceItem[];
  invoicePdf?: File | string | null;
  irn?: string; // Invoice Reference Number
  ackNumber?: string; // Acknowledgement Number
  ackDate?: string; // Acknowledgement Date
  qrCodeInvoice?: File | string | null; // QR Code image
  additionalCharges: {
    freight: number;
    insurance: number;
    packing: number;
    other: number;
  };
  transportCharges: {
    amount: number;
    quantity: number;
    unitPrice: number;
    hsnNumber: string;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;
  };
  dgEnquiry: string;
  proformaReference?: string; // Reference to the DG Proforma used to create this invoice
  // Legacy fields for compatibility
  expectedDeliveryDate?: string;
  department?: string;
  priority?: string;
  poPdf?: File | string | null;
  // GST fields at Invoice level
  subtotal: number;
  totalDiscount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
}

interface CreateDGInvoiceFormProps {
  // Props for modal-based editing
  selectedInvoice?: any;
  formMode?: 'create' | 'edit' | 'view';
  onSuccess?: () => void;
  onClose?: () => void;
}

const CreateDGInvoiceForm: React.FC<CreateDGInvoiceFormProps> = ({ 
  selectedInvoice, 
  formMode, 
  onSuccess, 
  onClose 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get ID from location state, URL params, or props
  const invoiceId = selectedInvoice?._id || location.state?.invoiceId || location.pathname.split('/').pop();

  // Check if we're in edit mode or view mode - prioritize props over URL detection
  const isEditMode = formMode === 'edit' || (Boolean(invoiceId) && location.pathname.includes('/edit/'));
  const isViewMode = formMode === 'view' || (Boolean(invoiceId) && location.pathname.includes('/invoice/') && !location.pathname.includes('/edit/') && !location.pathname.includes('/create'));
  const isCreateMode = formMode === 'create' || location.pathname.includes('/create') || (!isEditMode && !isViewMode);


  // State management
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceNumber: '',
    customer: '',
    customerEmail: '',
    billingAddress: {
      id: 0,
      address: '',
      state: '',
      district: '',
      pincode: '',
      addressId: 0,
      gstNumber: ''
    },
    shippingAddress: {
      id: 0,
      address: '',
      state: '',
      district: '',
      pincode: '',
      addressId: 0,
      gstNumber: ''
    },
    quotationNumber: '',
    poNumber: '',
    poFromCustomer: '',
    invoiceDate: new Date().toISOString().split('T')[0], // Current date
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    status: 'Draft',
    paymentStatus: 'Pending',
    paymentTerms: '',
    notes: '',
    deliveryNotes: '',
    referenceNumber: '',
    referenceDate: '',
    buyersOrderNumber: '',
    buyersOrderDate: '',
    dispatchDocNo: '',
    dispatchDocDate: '',
    destination: '',
    deliveryNoteDate: '',
    dispatchedThrough: '',
    termsOfDelivery: '',
    items: [{
      product: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      uom: 'nos',
      discount: 0,
      discountedAmount: 0,
      gstRate: 18,
      gstAmount: 0,
      kva: '',
      phase: '',
      annexureRating: '',
      dgModel: '',
      numberOfCylinders: 0,
      subject: '',
      isActive: true,
      hsnNumber: ''
    }],
    invoicePdf: null,
    irn: '',
    ackNumber: '',
    ackDate: '',
    qrCodeInvoice: null,
    additionalCharges: {
      freight: 0,
      insurance: 0,
      packing: 0,
      other: 0
    },
    transportCharges: {
      amount: 0,
      quantity: 0,
      unitPrice: 0,
      hsnNumber: '',
      gstRate: 18,
      gstAmount: 0,
      totalAmount: 0
    },
    dgEnquiry: '',
    proformaReference: '',
    // GST fields at Invoice level
    subtotal: 0,
    totalDiscount: 0,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 0,
    paidAmount: 0,
    remainingAmount: 0
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [billingAddresses, setBillingAddresses] = useState<CustomerAddress[]>([]);
  const [shippingAddresses, setShippingAddresses] = useState<CustomerAddress[]>([]);
  const [poFromCustomers, setPoFromCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [dgProducts, setDgProducts] = useState<any[]>([]);
  const [showDgProductSelector, setShowDgProductSelector] = useState(false);
  const [dgProductSearchTerm, setDgProductSearchTerm] = useState('');
  const [showProductDescriptionDropdown, setShowProductDescriptionDropdown] = useState<Record<number, boolean>>({});
  const [productDescriptionSearchTerm, setProductDescriptionSearchTerm] = useState<Record<number, string>>({});

  // Dropdown states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showEnquiryDropdown, setShowEnquiryDropdown] = useState(false);
  const [showBillingAddressDropdown, setShowBillingAddressDropdown] = useState(false);
  const [showShippingAddressDropdown, setShowShippingAddressDropdown] = useState(false);
  const [showQuotationDropdown, setShowQuotationDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});

  // Search states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [enquirySearchTerm, setEnquirySearchTerm] = useState('');
  const [billingAddressSearchTerm, setBillingAddressSearchTerm] = useState('');
  const [shippingAddressSearchTerm, setShippingAddressSearchTerm] = useState('');
  const [quotationSearchTerm, setQuotationSearchTerm] = useState('');
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});

  // Keyboard navigation states
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
  const [highlightedEnquiryIndex, setHighlightedEnquiryIndex] = useState(-1);
  const [highlightedBillingAddressIndex, setHighlightedBillingAddressIndex] = useState(-1);
  const [highlightedShippingAddressIndex, setHighlightedShippingAddressIndex] = useState(-1);
  const [highlightedQuotationIndex, setHighlightedQuotationIndex] = useState(-1);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState<Record<number, number>>({});

  // Refs for keyboard navigation
  const customerInputRef = useRef<HTMLInputElement>(null);
  const enquiryInputRef = useRef<HTMLInputElement>(null);
  const billingAddressInputRef = useRef<HTMLInputElement>(null);
  const shippingAddressInputRef = useRef<HTMLInputElement>(null);
  const quotationInputRef = useRef<HTMLInputElement>(null);

  // Utility function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Auto-focus on customer field when component mounts
  useEffect(() => {
    if (!loading && customerInputRef.current) {
      setTimeout(() => {
        customerInputRef.current?.focus();
        setShowCustomerDropdown(true);
      }, 100);
    }
  }, [loading]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowCustomerDropdown(false);
        setShowEnquiryDropdown(false);
        setShowBillingAddressDropdown(false);
        setShowShippingAddressDropdown(false);
        setShowQuotationDropdown(false);
        setShowProductDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch Invoice data if in edit or view mode (only if not using props)
  useEffect(() => {
    if ((isEditMode || isViewMode) && invoiceId && !isCreateMode && !selectedInvoice) {
      fetchInvoiceData();
    }
  }, [isEditMode, isViewMode, invoiceId, isCreateMode, selectedInvoice]);

  // Load data from props if provided (for modal-based editing)
  useEffect(() => {
    if (selectedInvoice && (isEditMode || isViewMode)) {
      setLoading(false); // Set loading to false since we have the data
      loadInvoiceFromProps(selectedInvoice);
    }
  }, [selectedInvoice, isEditMode, isViewMode]);

  // Load proforma data if coming from proforma
  useEffect(() => {
    if (location.state?.fromProforma && location.state?.proformaData && !loading) {
      setLoading(false); // Set loading to false since we have the data
      loadProformaData(location.state.proformaData);
    }
  }, [location.state, loading, customers, enquiries, quotations]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // API functions
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCustomers(),
        fetchProducts(),
        fetchQuotations(),
        fetchEnquiries(),
        fetchPOFromCustomers(),
        fetchDGProducts()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll({
        type: 'customer',
        limit: 100
      });

      let customersData: Customer[] = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          customersData = response.data as Customer[];
        } else if (typeof response.data === 'object' && Array.isArray((response.data as any).customers)) {
          customersData = (response.data as { customers: Customer[] }).customers;
        } else if (response.success && response.data && Array.isArray(response.data)) {
          customersData = response.data as Customer[];
        } else if (response.success && response.data && typeof response.data === 'object' && (response.data as any).customers) {
          customersData = (response.data as any).customers as Customer[];
        }
      }
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
      setCustomers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.dgProducts.getAll({ limit: 100, page: 1 });
      const responseData = response.data as any;

      // Use Map to deduplicate products by ID
      const uniqueProducts = new Map();

      if (Array.isArray(responseData)) {
        responseData.forEach((product: any) => {
          if (product._id && !uniqueProducts.has(product._id)) {
            uniqueProducts.set(product._id, {
              _id: product._id,
              name: product.name || 'Unknown Product',
              price: product.price || 0,
              gst: product.gst || 0,
              hsnNumber: product.hsnNumber || '',
              partNo: product.partNo || '',
              uom: product.uom || 'nos',
              category: product.category || 'N/A',
              brand: product.brand || 'N/A',
              availableQuantity: product.availableQuantity || 0
            });
          }
        });
      }

      const productsData = Array.from(uniqueProducts.values());
      console.log(`Loaded ${productsData.length} unique DG products`); // Debug log
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching DG products:', error);
      toast.error('Failed to load DG products');
      setProducts([]);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await apiClient.dgSales.dgQuotations.getAll({
        limit: 100,
        page: 1
      });

      let quotationsData: Quotation[] = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          quotationsData = (response.data as any[]).filter((quotation: any) => quotation && quotation._id) as Quotation[];
        } else if (response.success && response.data && Array.isArray(response.data)) {
          quotationsData = (response.data as any[]).filter((quotation: any) => quotation && quotation._id) as Quotation[];
        }
      }
      setQuotations(quotationsData);
    } catch (error) {
      console.error('Error fetching DG quotations:', error);
      toast.error('Failed to load DG quotations');
      setQuotations([]);
    }
  };

  const fetchEnquiries = async () => {
    try {
      const response = await apiClient.dgSales.enquiries.getAll({
        limit: 100,
        page: 1
      });

      let enquiriesData: Enquiry[] = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          enquiriesData = (response.data as any[]).filter((enquiry: any) => enquiry && enquiry._id) as Enquiry[];
        } else if (response.success && response.data && Array.isArray(response.data)) {
          enquiriesData = (response.data as any[]).filter((enquiry: any) => enquiry && enquiry._id) as Enquiry[];
        }
      }
      setEnquiries(enquiriesData);
    } catch (error) {
      console.error('Error fetching DG enquiries:', error);
      toast.error('Failed to load DG enquiries');
      setEnquiries([]);
    }
  };

  const fetchPOFromCustomers = async () => {
    try {
      const response = await apiClient.dgSales.dgPoFromCustomers.getAll({
        limit: 100,
        page: 1
      });

      let poData: any[] = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          poData = response.data.filter((po: any) => po && po._id);
        } else if (response.success && response.data && Array.isArray(response.data)) {
          poData = (response.data as any[]).filter((po: any) => po && po._id);
        }
      }
      setPoFromCustomers(poData);
    } catch (error) {
      console.error('Error fetching PO from customers:', error);
      toast.error('Failed to load PO from customers');
      setPoFromCustomers([]);
    }
  };

  const fetchDGProducts = async () => {
    try {
      const response = await apiClient.dgProducts.getAll({ limit: 100 });
      if (response.success && response.data) {
        const responseData = response.data as any;
        const products = responseData.products || responseData;
        setDgProducts(Array.isArray(products) ? products : []);
      }
    } catch (error) {
      console.error('Error fetching DG products:', error);
      toast.error('Failed to load DG products');
      setDgProducts([]);
    }
  };

  const fetchInvoiceData = async () => {
    if (!invoiceId) return;

    try {
      setLoading(true);
      const response = await apiClient.dgInvoices.getById(invoiceId);

      if (response.success && response.data) {
        const invoice = response.data.invoice || response.data;
        setEditingInvoice(invoice);
        loadInvoiceData(invoice);
      }
    } catch (error) {
      console.error('Error fetching DG Invoice data:', error);
      toast.error('Failed to load DG Invoice data');
      if (!onClose) { // Only navigate if not in modal mode
        navigate('/dg-sales');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceFromProps = (invoice: any) => {
    setEditingInvoice(invoice);
    loadInvoiceData(invoice);
  };

  const loadInvoiceData = (invoice: any) => {
        // Map Invoice data to form data
        const mappedFormData: InvoiceFormData = {
          invoiceNumber: invoice.invoiceNumber || '',
          customer: typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer?._id || invoice.customer || ''),
          customerEmail: invoice.customerEmail,
          billingAddress: invoice.billingAddress,
          shippingAddress: invoice.shippingAddress,
          quotationNumber: typeof (invoice.dgQuotationNumber || invoice.quotationNumber) === 'string' 
            ? (invoice.dgQuotationNumber || invoice.quotationNumber) 
            : ((invoice.dgQuotationNumber || invoice.quotationNumber)?._id || ''),
          poNumber: invoice.poNumber || '',
          poFromCustomer: typeof invoice.poFromCustomer === 'string' ? invoice.poFromCustomer : (invoice.poFromCustomer?._id || ''),
          invoiceDate: invoice.invoiceDate ? invoice.invoiceDate.split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: invoice.dueDate ? invoice.dueDate.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: invoice.status || 'Draft',
          paymentStatus: invoice.paymentStatus || 'Pending',
          paymentTerms: invoice.paymentTerms || '',
          notes: invoice.notes || '',
          deliveryNotes: invoice.deliveryNotes || '',
          referenceNumber: invoice.referenceNumber || '',
          referenceDate: invoice.referenceDate ? invoice.referenceDate.split('T')[0] : '',
          buyersOrderNumber: invoice.buyersOrderNumber || '',
          buyersOrderDate: invoice.buyersOrderDate ? invoice.buyersOrderDate.split('T')[0] : '',
          dispatchDocNo: invoice.dispatchDocNo || '',
          dispatchDocDate: invoice.dispatchDocDate ? invoice.dispatchDocDate.split('T')[0] : '',
          destination: invoice.destination || '',
          deliveryNoteDate: invoice.deliveryNoteDate ? invoice.deliveryNoteDate.split('T')[0] : '',
          dispatchedThrough: invoice.dispatchedThrough || '',
          termsOfDelivery: invoice.termsOfDelivery || '',
          items: invoice.items.map((item: any) => ({
            product: typeof item.product === 'string' ? item.product : (item.product?._id || item.product || ''),
            description: item.description || '',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            uom: item.uom || 'nos',
            discount: item.discount || 0,
            discountedAmount: item.discountedAmount || 0,
            kva: item.kva || '',
            phase: item.phase || '',
            annexureRating: item.annexureRating || '',
            dgModel: item.dgModel || '',
            numberOfCylinders: item.numberOfCylinders || 0,
            subject: item.subject || '',
            isActive: item.isActive !== undefined ? item.isActive : true,
            hsnNumber: item.hsnNumber || '',
            gstRate: item.gstRate || 18,
            gstAmount: item.gstAmount || 0
          })),
          invoicePdf: invoice.invoicePdf || null,
          irn: invoice.irn || '',
          ackNumber: invoice.ackNumber || '',
          ackDate: invoice.ackDate ? invoice.ackDate.split('T')[0] : '',
          qrCodeInvoice: invoice.qrCodeInvoice || null,
          additionalCharges: invoice.additionalCharges || {
            freight: 0,
            insurance: 0,
            packing: 0,
            other: 0
          },
          transportCharges: invoice.transportCharges || {
            amount: 0,
            quantity: 0,
            unitPrice: 0,
            hsnNumber: '',
            gstRate: 18,
            gstAmount: 0,
            totalAmount: 0
          },
          dgEnquiry: typeof invoice.dgEnquiry === 'string' ? invoice.dgEnquiry : (invoice.dgEnquiry?._id || ''),
          proformaReference: typeof invoice.proformaReference === 'string' ? invoice.proformaReference : (invoice.proformaReference?._id || ''),
          // GST fields at Invoice level
          subtotal: invoice.subtotal || 0,
          totalDiscount: invoice.totalDiscount || 0,
          taxRate: invoice.taxRate || 0,
          taxAmount: invoice.taxAmount || 0,
          totalAmount: invoice.totalAmount || 0,
          paidAmount: invoice.paidAmount || 0,
          remainingAmount: invoice.remainingAmount || 0
        };

        setFormData(mappedFormData);

        // Set customer search term
        if (typeof invoice.customer === 'object') {
          setCustomerSearchTerm(invoice.customer.name);
        }

        // Set addresses for dropdown
        if (typeof invoice.customer === 'object' && invoice.customer.addresses) {
          setBillingAddresses(invoice.customer.addresses);
          setShippingAddresses(invoice.customer.addresses);
        }

        // Set address search terms if we have addresses
        if (invoice.billingAddress) {
          setBillingAddressSearchTerm(`${invoice.billingAddress.address}, ${invoice.billingAddress.district}, ${invoice.billingAddress.state} - ${invoice.billingAddress.pincode}`);
        }
        if (invoice.shippingAddress) {
          setShippingAddressSearchTerm(`${invoice.shippingAddress.address}, ${invoice.shippingAddress.district}, ${invoice.shippingAddress.state} - ${invoice.shippingAddress.pincode}`);
        }

        // Set quotation search term if we have quotationNumber
    if (invoice.dgQuotationNumber || invoice.quotationNumber) {
      const quotation = invoice.dgQuotationNumber || invoice.quotationNumber;
      if (typeof quotation === 'object') {
        setQuotationSearchTerm(quotation.quotationNumber);
      } else if (typeof quotation === 'string') {
        // If quotation is a string ID, we need to find the quotation object
        const quotationObj = quotations.find(q => q._id === quotation);
        if (quotationObj) {
          setQuotationSearchTerm(quotationObj.quotationNumber);
        }
      }
    }
  };

  const loadProformaData = (proformaData: any) => {
    console.log("proformaData:",proformaData);
    
    // Helper function to format date for HTML date input
    const formatDateForInput = (dateString: string) => {
      if (!dateString) return '';
      try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      } catch (error) {
        console.error('Error formatting date:', dateString, error);
        return '';
      }
    };
    
    // Map proforma data to form data
    const mappedFormData: InvoiceFormData = {
      invoiceNumber: '', // Will be auto-generated
      customer: proformaData.customer || '',
      customerEmail: proformaData.customerEmail || '',
      billingAddress: proformaData.billingAddress || {
        id: 0,
        address: '',
        state: '',
        district: '',
        pincode: '',
        addressId: 0,
        gstNumber: ''
      },
      shippingAddress: proformaData.shippingAddress || {
        id: 0,
        address: '',
        state: '',
        district: '',
        pincode: '',
        addressId: 0,
        gstNumber: ''
      },
      quotationNumber: proformaData.quotationNumber || '',
      poNumber: proformaData.poNumber || '',
      poFromCustomer: proformaData.poFromCustomer || '',
      invoiceDate: new Date().toISOString().split('T')[0], // Current date
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
      status: 'Draft',
      paymentStatus: 'Pending',
      paymentTerms: proformaData.paymentTerms || '',
      notes: proformaData.notes || '',
      deliveryNotes: proformaData.deliveryNotes || '',
      referenceNumber: proformaData.referenceNumber || '',
      referenceDate: formatDateForInput(proformaData.referenceDate),
      buyersOrderNumber: proformaData.buyersOrderNumber || '',
      buyersOrderDate: formatDateForInput(proformaData.buyersOrderDate),
      dispatchDocNo: proformaData.dispatchDocNo || '',
      dispatchDocDate: formatDateForInput(proformaData.dispatchDocDate),
      destination: proformaData.destination || '',
      deliveryNoteDate: formatDateForInput(proformaData.deliveryNoteDate),
      dispatchedThrough: proformaData.dispatchedThrough || '',
      termsOfDelivery: proformaData.termsOfDelivery || '',
      items: proformaData.items?.map((item: any) => ({
        product: item.product || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        uom: item.uom || 'nos',
        discount: item.discount || 0,
        discountedAmount: item.discountedAmount || 0,
        gstRate: item.gstRate || 18,
        gstAmount: item.gstAmount || 0,
        kva: item.kva || '',
        phase: item.phase || '',
        annexureRating: item.annexureRating || '',
        dgModel: item.dgModel || '',
        numberOfCylinders: item.numberOfCylinders || 0,
        subject: item.subject || '',
        isActive: item.isActive !== undefined ? item.isActive : true,
        hsnNumber: item.hsnNumber || ''
      })) || [{
        product: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        uom: 'nos',
        discount: 0,
        discountedAmount: 0,
        gstRate: 18,
        gstAmount: 0,
        kva: '',
        phase: '',
        annexureRating: '',
        dgModel: '',
        numberOfCylinders: 0,
        subject: '',
        isActive: true,
        hsnNumber: ''
      }],
      invoicePdf: null,
      irn: '',
      ackNumber: '',
      ackDate: '',
      qrCodeInvoice: null,
      additionalCharges: {
        freight: 0,
        insurance: 0,
        packing: 0,
        other: 0
      },
      transportCharges: proformaData.transportCharges || {
        amount: 0,
        quantity: 0,
        unitPrice: 0,
        hsnNumber: '',
        gstRate: 18,
        gstAmount: 0,
        totalAmount: 0
      },
      dgEnquiry: proformaData.dgEnquiry || proformaData.dgEnquiry?._id || '',
      proformaReference: location.state?.proformaId || '', // Store the proforma ID that was used to create this invoice
      expectedDeliveryDate: formatDateForInput(proformaData.expectedDeliveryDate),
      department: proformaData.department || '',
      priority: proformaData.priority || '',
      // GST fields at Invoice level
      subtotal: proformaData.subtotal || 0,
      totalDiscount: proformaData.totalDiscount || 0,
      taxRate: 0, // Will be calculated from items
      taxAmount: proformaData.taxAmount || 0,
      totalAmount: proformaData.totalAmount || 0,
      paidAmount: 0,
      remainingAmount: proformaData.totalAmount || 0
    };

    setFormData(mappedFormData);

    // Set customer search term
    if (proformaData.customer) {
      const customer = customers.find(c => c._id === proformaData.customer);
      if (customer) {
        setCustomerSearchTerm(customer.name);
      }
    }

    // Set addresses for dropdown
    if (proformaData.customer) {
      const customer = customers.find(c => c._id === proformaData.customer);
      if (customer && customer.addresses) {
        setBillingAddresses(customer.addresses);
        setShippingAddresses(customer.addresses);
      }
    }

    // Set address search terms if we have addresses
    if (proformaData.billingAddress) {
      setBillingAddressSearchTerm(`${proformaData.billingAddress.address}, ${proformaData.billingAddress.district}, ${proformaData.billingAddress.state} - ${proformaData.billingAddress.pincode}`);
    }
    if (proformaData.shippingAddress) {
      setShippingAddressSearchTerm(`${proformaData.shippingAddress.address}, ${proformaData.shippingAddress.district}, ${proformaData.shippingAddress.state} - ${proformaData.shippingAddress.pincode}`);
    }

    // Set quotation search term if we have quotationNumber
    if (proformaData.quotationNumber) {
      const quotation = quotations.find(q => q._id === proformaData.quotationNumber);
      if (quotation) {
        setQuotationSearchTerm(quotation.quotationNumber);
      }
    }

    // Set enquiry search term if we have dgEnquiry
    if (proformaData.dgEnquiry) {
      console.log("Setting enquiry search term for:", proformaData.dgEnquiry);
      console.log("Available enquiries:", enquiries.length);
      const enquiry = enquiries.find(e => e._id === proformaData.dgEnquiry);
      console.log("Found enquiry:", enquiry);
      if (enquiry) {
        setEnquirySearchTerm(enquiry.enquiryNo);
        console.log("Set enquiry search term to:", enquiry.enquiryNo);
      } else {
        console.log("Enquiry not found in enquiries list");
      }
    }

    // Debug date fields
    console.log("Date fields from proforma:");
    console.log("referenceDate:", proformaData.referenceDate, "->", formatDateForInput(proformaData.referenceDate));
    console.log("buyersOrderDate:", proformaData.buyersOrderDate, "->", formatDateForInput(proformaData.buyersOrderDate));
    console.log("dispatchDocDate:", proformaData.dispatchDocDate, "->", formatDateForInput(proformaData.dispatchDocDate));
    console.log("deliveryNoteDate:", proformaData.deliveryNoteDate, "->", formatDateForInput(proformaData.deliveryNoteDate));
    console.log("expectedDeliveryDate:", proformaData.expectedDeliveryDate, "->", formatDateForInput(proformaData.expectedDeliveryDate));

    // Show success message
    toast.success(`Invoice form auto-filled from proforma ${location.state?.proformaNumber || ''}`);
  };

  // Form handlers
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    setFormData(prev => ({
      ...prev,
      customer: customerId,
      customerEmail: customer?.email || '',
      quotationNumber: '', // Clear quotation selection when customer changes
      items: [{
        product: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        uom: 'nos',
        discount: 0,
        discountedAmount: 0,
        gstRate: 18,
        gstAmount: 0,
        kva: '',
        phase: '',
        annexureRating: '',
        dgModel: '',
        numberOfCylinders: 0,
        subject: '',
        isActive: true,
        hsnNumber: ''
      }],
      // Reset GST calculations
      subtotal: 0,
      totalDiscount: 0,
      taxAmount: 0,
      totalAmount: 0
    }));
    setShowCustomerDropdown(false);
    setCustomerSearchTerm(customer?.name || ''); // Set the customer name as search term
    setHighlightedCustomerIndex(-1);
    
    // Clear quotation search term and close dropdown
    setQuotationSearchTerm('');
    setShowQuotationDropdown(false);
    setHighlightedQuotationIndex(-1);

    // Load addresses for the selected customer
    if (customer && customer.addresses && customer.addresses.length > 0) {
      setBillingAddresses(customer.addresses);
      setShippingAddresses(customer.addresses);
    } else {
      setBillingAddresses([]);
      setShippingAddresses([]);
    }
  };

  const handleEnquirySelect = (enquiryId: string) => {
    const enquiry = enquiries.find(e => e._id === enquiryId);
    setFormData(prev => ({
      ...prev,
      dgEnquiry: enquiryId
    }));
    setShowEnquiryDropdown(false);
    setEnquirySearchTerm(enquiry?.enquiryNo || '');
    setHighlightedEnquiryIndex(-1);
  };

  const handleBillingAddressSelect = (addressId: number) => {
    const address = billingAddresses.find(a => a.id === addressId);
    setFormData(prev => ({
      ...prev,
      billingAddress: address
    }));
    setShowBillingAddressDropdown(false);
    setBillingAddressSearchTerm(address ? `${address.address}, ${address.district}, ${address.state} - ${address.pincode}` : '');
    setHighlightedBillingAddressIndex(-1);
  };

  const handleShippingAddressSelect = (addressId: number) => {
    const address = shippingAddresses.find(a => a.id === addressId);
    setFormData(prev => ({
      ...prev,
      shippingAddress: address
    }));
    setShowShippingAddressDropdown(false);
    setShippingAddressSearchTerm(address ? `${address.address}, ${address.district}, ${address.state} - ${address.pincode}` : '');
    setHighlightedShippingAddressIndex(-1);
  };

  const handleQuotationSelect = async (quotationId: string) => {
    const quotation = quotations.find(q => q._id === quotationId);
    console.log('Selected quotation ID:', quotationId); // Debug log
    console.log('Found quotation:', quotation); // Debug log
    setFormData(prev => ({
      ...prev,
      quotationNumber: quotationId
    }));
    setShowQuotationDropdown(false);
    setQuotationSearchTerm(quotation?.quotationNumber || ''); // Set the quotation number as search term
    setHighlightedQuotationIndex(-1);

    // Fetch full quotation details to get items
    try {
      const response = await apiClient.dgSales.dgQuotations.getById(quotationId) as any;
      console.log('DG Quotation response:', response); // Debug log
      if (response && response.success) {
        const quotationData = response.data;
        console.log('DG Quotation data:', quotationData); // Debug log
        console.log('DG Quotation dgItems:', quotationData.dgItems); // Debug log
        console.log('DG Quotation items:', quotationData.items); // Debug log
        
        // Auto-fill items from quotation - check both 'items' and 'dgItems'
        const quotationItems = quotationData.dgItems || quotationData.items;
        if (quotationItems && Array.isArray(quotationItems) && quotationItems.length > 0) {
          const mappedItems = quotationItems.map((item: any) => {
            console.log('Mapping DG quotation item:', item); // Debug log
            
            const mappedItem = {
              product: typeof item.product === 'string' ? item.product : item.product?._id || '',              description: item.description || `Supply of ${item.kva || ''} kVA ${item.phase === 'single' || item.phase === 'Single Phase' ? '1 phase' : '3 phase'}, Mahindra CPCB IV+ compliant, Prime Rated, radiator cooled, powered by Mahindra engine, electronic ${item.numberOfCylinders || item.cylinder || 0} cylinder engine, model ${item.dgModel || ''}, coupled with ${item.kva || ''} KVA alternator, Standard control panel with ASAS Controller with battery charger, Silencer, Anti-Vibration mountings, exhaust flexible connector, Batteries with cables, fuel tank.`,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || 0,
              totalPrice: item.totalPrice || 0,
              uom: item.uom || 'nos',
              discount: item.discount || 0,
              discountedAmount: item.discountedAmount || 0,
              gstRate: item.gstRate || item.gst || 18,
              gstAmount: item.gstAmount || 0,
              kva: item.kva || '',
              phase: item.phase || '',
              annexureRating: item.annexureRating || '',
              dgModel: item.dgModel || '',
              numberOfCylinders: item.numberOfCylinders || item.cylinder || 0,
              subject: item.subject || '',
              isActive: item.isActive !== undefined ? item.isActive : true,
              hsnNumber: item.hsnNumber || ''
            };
            console.log('Mapped DG item:', mappedItem); // Debug log
            return mappedItem;
          });

          setFormData(prev => {
            // Calculate GST for the auto-filled items
            const { subtotal, totalDiscount, taxAmount, totalAmount } = calculateGST(mappedItems, prev.taxRate);
            
            return {
              ...prev,
              items: mappedItems,
              subtotal,
              totalDiscount,
              taxAmount,
              totalAmount
            };
          });

          toast.success(`Auto-filled ${mappedItems.length} DG items from quotation`);
        } else {
          toast('No items found in the selected quotation', { icon: 'ℹ️' });
        }
      } else {
        console.error('Failed to fetch quotation details:', response);
        toast.error('Failed to load quotation details');
      }
    } catch (error) {
      console.error('Error fetching quotation details:', error);
      toast.error('Failed to load quotation details');
    }
  };

  // Handle transport charges update
  const updateTransportCharges = (field: string, value: any) => {
    setFormData(prev => {
      const updatedTransportCharges = { ...prev.transportCharges, [field]: value };
      
      // Auto-calculate transport charges
      if (field === 'quantity' || field === 'unitPrice' || field === 'gstRate') {
        const quantity = Number(field === 'quantity' ? value : updatedTransportCharges.quantity) || 0;
        const unitPrice = Number(field === 'unitPrice' ? value : updatedTransportCharges.unitPrice) || 0;
        const gstRate = Number(field === 'gstRate' ? value : updatedTransportCharges.gstRate) || 0;
        
        const amount = quantity * unitPrice;
        const gstAmount = (amount * gstRate) / 100;
        const totalAmount = amount + gstAmount;
        
        updatedTransportCharges.amount = amount;
        updatedTransportCharges.gstAmount = gstAmount;
        updatedTransportCharges.totalAmount = totalAmount;
      }
      
      // Recalculate total with updated transport charges
      const { subtotal, totalDiscount, taxAmount, totalAmount } = calculateGST(prev.items, prev.taxRate, updatedTransportCharges);
      
      return {
        ...prev,
        transportCharges: updatedTransportCharges,
        subtotal,
        totalDiscount,
        taxAmount,
        totalAmount
      };
    });
  };


  const addItem = () => {
    setFormData(prev => {
      const newItems = [...prev.items, {
        product: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        uom: 'nos',
        discount: 0,
        discountedAmount: 0,
        gstRate: 18,
        gstAmount: 0,
        kva: '',
        phase: '',
        annexureRating: '',
        dgModel: '',
        numberOfCylinders: 0,
        subject: '',
        isActive: true,
        hsnNumber: ''
      }];
      
      // Calculate GST at PO level
      const { subtotal, totalDiscount, taxAmount, totalAmount } = calculateGST(newItems, prev.taxRate);
      
      return {
        ...prev,
        items: newItems,
        subtotal,
        totalDiscount,
        taxAmount,
        totalAmount
      };
    });
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => {
        const newItems = prev.items.filter((_, i) => i !== index);
        
        // Calculate GST at PO level
        const { subtotal, totalDiscount, taxAmount, totalAmount } = calculateGST(newItems, prev.taxRate, prev.transportCharges);
        
        return {
          ...prev,
          items: newItems,
          subtotal,
          totalDiscount,
          taxAmount,
          totalAmount
        };
      });
    }
  };

  // Calculate GST at PO level using item-level GST calculations
  const calculateGST = (items: InvoiceItem[], taxRate: number, transportCharges?: any) => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxAmount = 0;
    
    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountRate = item.discount || 0;
      const itemDiscountAmount = (itemSubtotal * discountRate) / 100;
      const itemNetPrice = itemSubtotal - itemDiscountAmount;
      
      // Use item-level GST calculations
      const itemGstRate = item.gstRate || 18;
      const itemTaxAmount = item.gstAmount || (itemNetPrice * itemGstRate) / 100;
      
      subtotal += itemNetPrice;
      totalDiscount += itemDiscountAmount;
      totalTaxAmount += itemTaxAmount;
    });
    
    // Add transport charges if provided
    let transportTotal = 0;
    if (transportCharges && transportCharges.unitPrice > 0) {
      const transportSubtotal = transportCharges.quantity * transportCharges.unitPrice;
      const transportGstAmount = (transportSubtotal * transportCharges.gstRate) / 100;
      transportTotal = transportSubtotal + transportGstAmount;
    }
    
    const totalAmount = subtotal + totalTaxAmount + transportTotal;
    
    return { subtotal, totalDiscount, taxAmount: totalTaxAmount, totalAmount };
  };

  // Handle tax rate change
  const handleTaxRateChange = (newTaxRate: number) => {
    setFormData(prev => {
      const { subtotal, totalDiscount, taxAmount, totalAmount } = calculateGST(prev.items, newTaxRate, prev.transportCharges);
      
      return {
        ...prev,
        taxRate: newTaxRate,
        subtotal,
        totalDiscount,
        taxAmount,
        totalAmount
      };
    });
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData(prev => {
      const updatedItems = prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };

          // Auto-populate product fields when product is selected
          if (field === 'product') {
            const productObj = products.find(p => p._id === value);
            if (productObj) {
              updatedItem.unitPrice = productObj.gndp || productObj.price || 0;
              updatedItem.hsnNumber = productObj.hsnNumber || '';
              updatedItem.uom = productObj.uom || 'nos';
              updatedItem.description = productObj.name || ''; // Use product name as description
              
              // Set the product search term to the selected product's part number
              setProductSearchTerms(prev => ({
                ...prev,
                [index]: productObj.partNo || ''
              }));
            }
          }

          // Auto-calculate total price, discount, and GST
          if (field === 'quantity' || field === 'unitPrice' || field === 'product' || field === 'gstRate' || field === 'discount') {
            const quantity = Number(field === 'quantity' ? value : (updatedItem.quantity || item.quantity)) || 0;
            const unitPrice = Number(field === 'unitPrice' ? value : (updatedItem.unitPrice || item.unitPrice)) || 0;
            const discountRate = Number(field === 'discount' ? value : (updatedItem.discount || item.discount)) || 0;
            const gstRate = Number(field === 'gstRate' ? value : (updatedItem.gstRate || item.gstRate)) || 18;
            
            const subtotal = quantity * unitPrice;
            const discountAmount = (subtotal * discountRate) / 100;
            const discountedAmount = subtotal - discountAmount;
            const gstAmount = (discountedAmount * gstRate) / 100;
            
            updatedItem.discountedAmount = discountAmount;
            updatedItem.gstRate = gstRate;
            updatedItem.gstAmount = gstAmount;
            updatedItem.totalPrice = discountedAmount + gstAmount;
          }

          return updatedItem;
        }
        return item;
      });

      // Calculate GST at PO level
      const { subtotal, totalDiscount, taxAmount, totalAmount } = calculateGST(updatedItems, prev.taxRate, prev.transportCharges);

      return {
        ...prev,
        items: updatedItems,
        subtotal,
        totalDiscount,
        taxAmount,
        totalAmount
      };
    });
  };

  // DG Product handling functions
  const handleProductDescriptionSelect = (itemIndex: number, dgProduct: any) => {
    const description = dgProduct.description || `Supply of ${dgProduct.kva} kVA ${dgProduct.phase === 'single' ? '1 phase' : '3 phase'}, Mahindra CPCB IV+ compliant, Prime Rated, radiator cooled, powered by Mahindra engine, electronic ${dgProduct.numberOfCylinders} cylinder engine, model ${dgProduct.dgModel}, coupled with ${dgProduct.kva} KVA alternator, Standard control panel with ASAS Controller with battery charger, Silencer, Anti-Vibration mountings, exhaust flexible connector, Batteries with cables, fuel tank.`;

    updateItem(itemIndex, 'description', description);
    updateItem(itemIndex, 'product', dgProduct._id || '');
    updateItem(itemIndex, 'kva', dgProduct.kva || '');
    updateItem(itemIndex, 'phase', dgProduct.phase || '');
    updateItem(itemIndex, 'annexureRating', dgProduct.annexureRating || '');
    updateItem(itemIndex, 'dgModel', dgProduct.dgModel || '');
    updateItem(itemIndex, 'numberOfCylinders', dgProduct.numberOfCylinders || 0);
    updateItem(itemIndex, 'subject', dgProduct.subject || '');
    updateItem(itemIndex, 'unitPrice', dgProduct.price || 0);

    setShowProductDescriptionDropdown(prev => ({ ...prev, [itemIndex]: false }));
    setProductDescriptionSearchTerm(prev => ({ ...prev, [itemIndex]: '' }));
  };

  // Function to get filtered DG products for description dropdown
  const getFilteredDGProductsForDescription = (searchTerm: string) => {
    return dgProducts.filter(product =>
      !searchTerm ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.kva?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.dgModel?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };


  // Handle PO selection and auto-fill
  const handlePOSelect = (po: any) => {
    console.log('Selected PO:', po);
    
    // Auto-fill items from PO
    let mappedItems = [];
    if (po.items && Array.isArray(po.items)) {
      mappedItems = po.items.map((item: any) => ({
        product: item.product?._id || item.product || '',
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || 0,
        totalPrice: item.totalPrice || 0,
        uom: item.uom || 'PCS',
        discount: item.discount || 0,
        discountedAmount: item.discountedAmount || 0,
        kva: item.kva || '',
        phase: item.phase || '',
        annexureRating: item.annexureRating || '',
        dgModel: item.dgModel || '',
        numberOfCylinders: item.numberOfCylinders || 0,
        subject: item.subject || '',
        isActive: item.isActive !== false,
        hsnNumber: item.hsnNumber || 'N/A'
      }));
    }

    // Update all form data in a single call to avoid race conditions
    setFormData(prev => {
      const newFormData = {
        ...prev,
        // Customer information
        customer: po.customer?._id || po.customer || prev.customer,
        customerEmail: po.customerEmail || po.customer?.email || prev.customerEmail,
        billingAddress: po.billingAddress || prev.billingAddress,
        shippingAddress: po.shippingAddress || prev.shippingAddress,
        // Quotation information
        quotationNumber: po.dgQuotationNumber?._id || po.dgQuotationNumber || prev.quotationNumber,
        // PO information
        poNumber: po.poNumber || prev.poNumber,
        dgEnquiry: po.dgEnquiry || prev.dgEnquiry,
        // Items
        items: mappedItems.length > 0 ? mappedItems : prev.items
      };
      
      // Recalculate GST after auto-filling items
      if (mappedItems.length > 0) {
        calculateGST(mappedItems, newFormData.taxRate);
      }
      
      return newFormData;
    });

    // Update customer search term if customer is linked
    if (po.customer) {
      const customerName = po.customer?.name || po.customer;
      setCustomerSearchTerm(customerName || '');
    }
    
    // Update quotation search term if quotation is linked
    if (po.dgQuotationNumber) {
      const quotationNumber = po.dgQuotationNumber?.quotationNumber || po.dgQuotationNumber;
      setQuotationSearchTerm(quotationNumber || '');
    }

    // Close quotation dropdown
    setShowQuotationDropdown(false);
  };

  const getFilteredProducts = (searchTerm: string = '') => {
    console.log('getFilteredProducts called with searchTerm:', searchTerm);
    console.log('Total products available:', products.length);
    console.log('Products sample:', products.slice(0, 3));
    
    const filtered = products.filter(product =>
      searchTerm === '' ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.partNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    console.log('Filtered products:', filtered.length);
    return filtered;
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p._id === productId);
    return product?.name || '';
  };

  const getProductPartNo = (productId: string) => {
    const product = products.find(p => p._id === productId);
    return product?.partNo || '';
  };

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    return customer?.name || '';
  };

  const getQuotationNumber = (quotationId: string) => {
    const quotation = quotations.find(q => q._id === quotationId);
    return quotation?.quotationNumber || '';
  };

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.customer) {
      newErrors.push('Customer is required');
    }
    // if (!formData.customerEmail) {
    //   newErrors.push('Customer email is required');
    // }
    if (!formData.invoiceDate) {
      newErrors.push('Invoice date is required');
    }
    if (!formData.dueDate) {
      newErrors.push('Due date is required');
    }

    // Check if we have at least one valid item
    const validItems = formData.items.filter(item => 
      item.product && item.quantity > 0 && item.unitPrice > 0
    );

    if (validItems.length === 0) {
      newErrors.push('At least one item is required');
    }

    formData.items.forEach((item, index) => {
      if (!item.product) {
        newErrors.push(`Product selection is required for item ${index + 1}`);
      }
      if (!item.quantity || item.quantity <= 0) {
        newErrors.push(`Quantity must be greater than 0 for item ${index + 1}`);
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        newErrors.push(`Unit price must be greater than 0 for item ${index + 1}`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const user = useSelector((state: RootState) => state.auth.user);

  const handleSubmitInvoice = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      // Remove empty rows before processing
      const cleanedItems = formData.items.filter(item => 
        item.product && item.quantity > 0 && item.unitPrice > 0
      );

      console.log('cleanedItems:', cleanedItems);
      console.log('HSN Numbers in cleanedItems:', cleanedItems.map(item => ({ hsnNumber: item.hsnNumber, product: item.product })));
      console.log('Transport Charges in payload:', formData.transportCharges);

      if (cleanedItems.length === 0) {
        toast.error('Please add at least one item to the DG Invoice');
        setSubmitting(false);
        return;
      }

      // Recalculate GST for cleaned items including transport charges
      const { subtotal, totalDiscount, taxAmount, totalAmount } = calculateGST(cleanedItems, formData.taxRate, formData.transportCharges);

      // Handle PDF file - use existing URL or upload new file
      let fileUrl = formData.invoicePdf;
      if (formData.invoicePdf && formData.invoicePdf instanceof File) {
        // New file upload - upload the file and get URL
        // Check if user is authenticated
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
          toast.error('Please log in to upload files.');
          setSubmitting(false);
          return;
        }

        try {
          console.log('Uploading file:', formData.invoicePdf, 'Size:', formData.invoicePdf.size);
          const uploadResponse = await apiClient.poFiles.upload(formData.invoicePdf);
          if (uploadResponse.success) {
            fileUrl = uploadResponse.data.url;
            toast.success('File uploaded successfully!');
          }
        } catch (error: any) {
          console.error('Error uploading file:', error);
          if (error.message?.includes('Not authorized')) {
            toast.error('Please log in again to upload files.');
            // Optionally redirect to login
            // window.location.href = '/login';
          } else {
            toast.error('File upload failed. Please try again.');
          }
          setSubmitting(false);
          return;
        }
      }
      // If formData.invoicePdf is a string, it's an existing URL and we use it directly

      // Handle QR Code file - use existing URL or upload new file
      let qrCodeUrl: string | undefined = undefined;
      if (formData.qrCodeInvoice) {
        if (typeof formData.qrCodeInvoice === 'string') {
          // Existing URL
          qrCodeUrl = formData.qrCodeInvoice;
        } else if (formData.qrCodeInvoice instanceof File) {
          // New file upload - upload the file and get URL
          // Check if user is authenticated
          const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
          if (!token) {
            toast.error('Please log in to upload files.');
            setSubmitting(false);
            return;
          }

          try {
            console.log('Uploading QR Code file:', formData.qrCodeInvoice, 'Size:', formData.qrCodeInvoice.size);
            const uploadResponse = await apiClient.poFiles.upload(formData.qrCodeInvoice);
            if (uploadResponse.success) {
              qrCodeUrl = uploadResponse.data.url;
              toast.success('QR Code uploaded successfully!');
            } else {
              console.error('QR Code upload failed:', uploadResponse);
              toast.error('QR Code upload failed. Please try again.');
              setSubmitting(false);
              return;
            }
          } catch (error: any) {
            console.error('Error uploading QR Code file:', error);
            if (error.message?.includes('Not authorized')) {
              toast.error('Please log in again to upload files.');
            } else {
              toast.error('QR Code upload failed. Please try again.');
            }
            setSubmitting(false);
            return;
          }
        }
      }

      const invoiceData = {
        invoiceNumber: formData.invoiceNumber || undefined, // Only include if provided
        customer: formData.customer,
        customerEmail: formData.customerEmail || '',
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress,
        dgQuotationNumber: formData.quotationNumber || '', // Required field
        poNumber: formData.poNumber || undefined,
        poFromCustomer: formData.poFromCustomer || undefined,
        items: cleanedItems,
        subtotal,
        totalDiscount,
        taxRate: formData.taxRate,
        taxAmount,
        totalAmount,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        paymentTerms: formData.paymentTerms || null,
        additionalCharges: formData.additionalCharges,
        transportCharges: formData.transportCharges,
        notes: formData.notes,
        deliveryNotes: formData.deliveryNotes,
        referenceNumber: formData.referenceNumber,
        referenceDate: formData.referenceDate || null,
        buyersOrderNumber: formData.buyersOrderNumber,
        buyersOrderDate: formData.buyersOrderDate || null,
        dispatchDocNo: formData.dispatchDocNo,
        dispatchDocDate: formData.dispatchDocDate || null,
        destination: formData.destination,
        deliveryNoteDate: formData.deliveryNoteDate || null,
        dispatchedThrough: formData.dispatchedThrough,
        termsOfDelivery: formData.termsOfDelivery,
        invoicePdf: fileUrl, // Use uploaded file URL or existing URL
        irn: formData.irn || undefined,
        ackNumber: formData.ackNumber || undefined,
        ackDate: formData.ackDate || undefined,
        qrCodeInvoice: qrCodeUrl, // Already ensured to be string or undefined
        dgEnquiry: formData.dgEnquiry || editingInvoice?.dgEnquiry || '',
        proformaReference: formData.proformaReference || undefined,
        createdBy: user?.id
      };

      let response;
      if (isEditMode && editingInvoice) {
        // Update existing DG Invoice
        response = await apiClient.dgInvoices.update(editingInvoice._id, invoiceData);
        toast.success('DG Invoice updated successfully!');
      } else {
        // Create new DG Invoice
        response = await apiClient.dgInvoices.create(invoiceData);
        toast.success('DG Invoice created successfully!');
      }

      // Handle success - either navigate or call callback
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dg-sales');
      }
    } catch (error: any) {
      console.error('Error saving DG Invoice:', error);
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} DG Invoice`);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = () => {
    return formData.totalAmount;
  };

  if (loading) {
    return (
      <div className="pl-2 pr-6 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      <PageHeader
        title={
          isViewMode ? `View DG Invoice - ${editingInvoice?.invoiceNumber || ''}` :
          isEditMode ? `Edit DG Invoice - ${editingInvoice?.invoiceNumber || ''}` :
          location.state?.fromProforma ? `Create DG Invoice from Proforma ${location.state?.proformaNumber || ''}` :
          isCreateMode ? "Create DG Invoice" :
          "Create DG Invoice"
        }
        subtitle={
          isViewMode ? "View DG Invoice details" :
          isEditMode ? "Edit existing DG Invoice" :
          location.state?.fromProforma ? "Create invoice from proforma details" :
          isCreateMode ? "Create a new DG Invoice" :
          "Create a new DG Invoice"
        }
      >
        <div className="flex space-x-3">
          <button
            onClick={() => {
              if (onClose) {
                onClose();
              } else {
                navigate('/dg-sales');
              }
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to DG Sales</span>
          </button>
          {isViewMode && (
            <button
              onClick={() => navigate(`/dg-invoice/edit/${invoiceId}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Invoice</span>
            </button>
          )}
        </div>
      </PageHeader>

      {/* Form Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Form Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm font-medium mb-2">Please fix the following errors:</p>
              <ul className="text-red-600 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                value={formData.invoiceNumber || ''}
                disabled
                placeholder="Auto-generated"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated sequence</p>
            </div>

            {/* PO Number (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Number (Optional)
              </label>
              <select
                value={(() => {
                  // Find the PO ID that matches the current poNumber
                  if (formData.poNumber) {
                    const matchingPO = poFromCustomers.find(po => po.poNumber === formData.poNumber);
                    return matchingPO ? matchingPO._id : '';
                  }
                  return '';
                })()}
                onChange={(e) => {
                  const selectedPOId = e.target.value;
                  if (selectedPOId === '') {
                    // Clear selection
                    setFormData(prev => ({
                      ...prev,
                      poNumber: '',
                      items: [{
                        product: '',
                        description: '',
                        quantity: 1,
                        unitPrice: 0,
                        totalPrice: 0,
                        uom: 'nos',
                        discount: 0,
                        discountedAmount: 0,
                        gstRate: 18,
                        gstAmount: 0,
                        gst: 18, // Legacy field
                        kva: '',
                        phase: '',
                        annexureRating: '',
                        dgModel: '',
                        numberOfCylinders: 0,
                        subject: '',
                        isActive: true,
                        hsnNumber: ''
                      }],
                      // Reset GST calculations
                      subtotal: 0,
                      totalDiscount: 0,
                      taxAmount: 0,
                      totalAmount: 0
                    }));
                  } else {
                    // Find and select the PO
                    const selectedPO = poFromCustomers.find(po => po._id === selectedPOId);
                    if (selectedPO) {
                      handlePOSelect(selectedPO);
                    }
                  }
                }}
                disabled={isViewMode}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <option value="">Select a PO Number</option>
                {poFromCustomers.map((po) => (
                  <option key={po._id} value={po._id}>
                    {po.poNumber} - {po.customer?.name} - {po.customerEmail}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Invoice Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Payment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Status *
              </label>
              <select
                value={formData.paymentStatus}
                onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>

            {/* Payment Terms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Terms *
              </label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value as any })}
                placeholder="e.g., Net 30, Net 15, Immediate, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* IRN (Invoice Reference Number) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IRN (Invoice Reference Number)
              </label>
              <input
                type="text"
                value={formData.irn || ''}
                onChange={(e) => setFormData({ ...formData, irn: e.target.value })}
                placeholder="Enter IRN if available"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">GST Invoice Reference Number</p>
            </div>

            {/* ACK Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ACK Number
              </label>
              <input
                type="text"
                value={formData.ackNumber || ''}
                onChange={(e) => setFormData({ ...formData, ackNumber: e.target.value })}
                placeholder="Enter ACK Number if available"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Acknowledgement Number</p>
            </div>

            {/* ACK Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ACK Date
              </label>
              <input
                type="date"
                value={formData.ackDate || ''}
                onChange={(e) => setFormData({ ...formData, ackDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Acknowledgement Date</p>
            </div>

            {/* QR Code Invoice Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                QR Code Invoice Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setFormData({ ...formData, qrCodeInvoice: file });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Upload QR Code image for invoice</p>
              {formData.qrCodeInvoice && (
                <div className="mt-3">
                  <p className="text-sm text-green-600 mb-2">
                    ✓ {typeof formData.qrCodeInvoice === 'string' ? 'Image uploaded' : formData.qrCodeInvoice.name}
                  </p>
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">QR Code Preview:</p>
                    <div className="flex justify-center">
                      <img
                        src={typeof formData.qrCodeInvoice === 'string' 
                          ? formData.qrCodeInvoice 
                          : URL.createObjectURL(formData.qrCodeInvoice)
                        }
                        alt="QR Code Preview"
                        className="max-w-32 max-h-32 border border-gray-300 rounded shadow-sm"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-sm text-gray-500 flex items-center justify-center max-w-32 max-h-32 border border-gray-300 rounded bg-gray-100">
                        Failed to load image
                      </div>
                    </div>
                    <div className="mt-2 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, qrCodeInvoice: null })}
                        className="text-sm text-red-600 hover:text-red-800 underline"
                      >
                        Remove QR Code
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Customer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Customer *
              </label>
              <div className="relative dropdown-container">
                <input
                  ref={customerInputRef}
                  type="text"
                  value={formData.customer ? customers.find(c => c._id === formData.customer)?.name || customerSearchTerm : customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    if (!showCustomerDropdown) setShowCustomerDropdown(true);
                    setHighlightedCustomerIndex(-1);
                    
                    // If user clears the input, clear the selected customer
                    if (e.target.value === '') {
                      setFormData(prev => ({
                        ...prev,
                        customer: '',
                        customerEmail: '',
                        quotationNumber: '', // Clear quotation selection when customer is cleared
                        items: [{
                          product: '',
                          description: '',
                          quantity: 1,
                          unitPrice: 0,
                          totalPrice: 0,
                          uom: 'nos',
                          discount: 0,
                          discountedAmount: 0,
                          gstRate: 18,
                          gstAmount: 0,
                          gst: 18, // Legacy field
                          kva: '',
                          phase: '',
                          annexureRating: '',
                          dgModel: '',
                          numberOfCylinders: 0,
                          subject: '',
                          isActive: true,
                          hsnNumber: ''
                        }],
                        // Reset GST calculations
                        subtotal: 0,
                        totalDiscount: 0,
                        taxAmount: 0,
                        totalAmount: 0
                      }));
                      setBillingAddresses([]);
                      setShippingAddresses([]);
                      
                      // Clear quotation search term and close dropdown
                      setQuotationSearchTerm('');
                      setShowQuotationDropdown(false);
                      setHighlightedQuotationIndex(-1);
                      setProductSearchTerms({});
                    }
                  }}
                  onFocus={() => {
                    setShowCustomerDropdown(true);
                    setHighlightedCustomerIndex(-1);
                  }}
                  placeholder="Search customer or press ↓ to open"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.customer && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          customer: '',
                          customerEmail: '',
                          quotationNumber: '', // Clear quotation selection when customer is cleared
                          items: [{
                            product: '',
                            description: '',
                            quantity: 1,
                            unitPrice: 0,
                            totalPrice: 0,
                            uom: 'nos',
                            discount: 0,
                            discountedAmount: 0,
                            gstRate: 18,
                            gstAmount: 0,
                            gst: 18, // Legacy field
                            kva: '',
                            phase: '',
                            annexureRating: '',
                            dgModel: '',
                            numberOfCylinders: 0,
                            subject: '',
                            isActive: true,
                            hsnNumber: ''
                          }]
                        }));
                        setCustomerSearchTerm('');
                        setBillingAddresses([]);
                        setShippingAddresses([]);
                        setShowCustomerDropdown(false);
                        
                        // Clear quotation search term and close dropdown
                        setQuotationSearchTerm('');
                        setShowQuotationDropdown(false);
                        setHighlightedQuotationIndex(-1);
                        setProductSearchTerms({});
                      }}
                      className="mr-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear customer selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-180' : ''} pointer-events-none`} />
                </div>
                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {customers
                      .filter(customer =>
                        customer.type === 'customer' && (
                          customerSearchTerm === '' || 
                          customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                          customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                        )
                      )
                      .map((customer, index) => (
                        <button
                          key={customer._id}
                          onClick={() => handleCustomerSelect(customer._id)}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.customer === customer._id ? 'bg-blue-100 text-blue-800' :
                            highlightedCustomerIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          {customer.email && (
                            <div className="text-xs text-gray-500">{customer.email}</div>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Enquiry Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enquiry Number
              </label>
              <div className="relative dropdown-container">
                <input
                  ref={enquiryInputRef}
                  type="text"
                  value={formData.dgEnquiry ? enquiries.find(e => e._id === formData.dgEnquiry)?.enquiryNo || enquirySearchTerm : enquirySearchTerm}
                  onChange={(e) => {
                    setEnquirySearchTerm(e.target.value);
                    if (!showEnquiryDropdown) setShowEnquiryDropdown(true);
                    setHighlightedEnquiryIndex(-1);
                    
                    // If user clears the input, clear the selected enquiry
                    if (e.target.value === '') {
                      setFormData(prev => ({
                        ...prev,
                        dgEnquiry: ''
                      }));
                    }
                  }}
                  onFocus={() => {
                    setShowEnquiryDropdown(true);
                    setHighlightedEnquiryIndex(-1);
                  }}
                  placeholder="Search enquiry number or press ↓ to open"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.dgEnquiry && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          dgEnquiry: ''
                        }));
                        setEnquirySearchTerm('');
                        setShowEnquiryDropdown(false);
                      }}
                      className="mr-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear enquiry selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showEnquiryDropdown ? 'rotate-180' : ''} pointer-events-none`} />
                </div>
                {showEnquiryDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {enquiries
                      .filter(enquiry =>
                        enquirySearchTerm === '' || 
                        enquiry.enquiryNo.toLowerCase().includes(enquirySearchTerm.toLowerCase()) ||
                        enquiry.customerName.toLowerCase().includes(enquirySearchTerm.toLowerCase())
                      )
                      .map((enquiry, index) => (
                        <button
                          key={enquiry._id}
                          onClick={() => handleEnquirySelect(enquiry._id)}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.dgEnquiry === enquiry._id ? 'bg-blue-100 text-blue-800' :
                            highlightedEnquiryIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <div className="font-medium text-gray-900">{enquiry.enquiryNo}</div>
                          <div className="text-xs text-gray-500">
                            {enquiry.customerName} • {enquiry.corporateName || ''} • {enquiry.phoneNumber}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quotation Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Quotation Number
              </label>
              <div className="relative dropdown-container">
                <input
                  ref={quotationInputRef}
                  type="text"
                  value={formData.quotationNumber ? quotations.find(q => q._id === formData.quotationNumber)?.quotationNumber || quotationSearchTerm : quotationSearchTerm}
                  onChange={(e) => {
                    setQuotationSearchTerm(e.target.value);
                    if (!showQuotationDropdown) setShowQuotationDropdown(true);
                    setHighlightedQuotationIndex(-1);
                    
                    // If user clears the input, clear the selected quotation
                    if (e.target.value === '') {
                      setFormData(prev => ({
                        ...prev,
                        quotationNumber: '',
                        items: [{
                          product: '',
                          description: '',
                          quantity: 1,
                          unitPrice: 0,
                          totalPrice: 0,
                          uom: 'nos',
                          discount: 0,
                          discountedAmount: 0,
                          gstRate: 18,
                          gstAmount: 0,
                          gst: 18, // Legacy field
                          kva: '',
                          phase: '',
                          annexureRating: '',
                          dgModel: '',
                          numberOfCylinders: 0,
                          subject: '',
                          isActive: true,
                          hsnNumber: ''
                        }],
                        // Reset GST calculations
                        subtotal: 0,
                        totalDiscount: 0,
                        taxAmount: 0,
                        totalAmount: 0
                      }));
                      setProductSearchTerms({});
                    }
                  }}
                  onFocus={() => {
                    if (!formData.customer) {
                      toast.error('Please select a customer first');
                      return;
                    }
                    setShowQuotationDropdown(true);
                    setHighlightedQuotationIndex(-1);
                  }}
                  disabled={!formData.customer}
                  placeholder={!formData.customer ? 'Select customer first' : 'Search quotation number or press ↓ to open'}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${!formData.customer ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.quotationNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          quotationNumber: '',
                          items: [{
                            product: '',
                            description: '',
                            quantity: 1,
                            unitPrice: 0,
                            totalPrice: 0,
                            uom: 'nos',
                            discount: 0,
                            discountedAmount: 0,
                            gstRate: 18,
                            gstAmount: 0,
                            gst: 18, // Legacy field
                            kva: '',
                            phase: '',
                            annexureRating: '',
                            dgModel: '',
                            numberOfCylinders: 0,
                            subject: '',
                            isActive: true,
                            hsnNumber: ''
                          }],
                          // Reset GST calculations
                          subtotal: 0,
                          totalDiscount: 0,
                          taxAmount: 0,
                          totalAmount: 0
                        }));
                        setQuotationSearchTerm('');
                        setShowQuotationDropdown(false);
                        setProductSearchTerms({});
                      }}
                      className="mr-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear quotation selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showQuotationDropdown ? 'rotate-180' : ''} pointer-events-none`} />
                </div>
                {showQuotationDropdown && formData.customer && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {(() => {
                      const filteredQuotations = quotations
                        .filter(quotation => quotation && quotation.quotationNumber)
                        .filter(quotation => {
                          // Filter by customer - check if quotation belongs to selected customer
                          const quotationCustomerId = typeof quotation.customer === 'string' 
                            ? quotation.customer 
                            : quotation.customer?._id;
                          return quotationCustomerId === formData.customer;
                        })
                        .filter(quotation =>
                          quotationSearchTerm === '' || 
                          quotation.quotationNumber.toLowerCase().includes(quotationSearchTerm.toLowerCase())
                        );
                      
                      if (filteredQuotations.length === 0) {
                        return (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            {quotations.filter(q => {
                              const quotationCustomerId = typeof q.customer === 'string' 
                                ? q.customer 
                                : q.customer?._id;
                              return quotationCustomerId === formData.customer;
                            }).length === 0 ? 'No quotations available for this customer' : 'No quotations found matching search'}
                          </div>
                        );
                      }
                      
                      return filteredQuotations.map((quotation, index) => (
                        <button
                          key={quotation._id}
                          onClick={() => handleQuotationSelect(quotation._id)}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.quotationNumber === quotation._id ? 'bg-blue-100 text-blue-800' :
                            highlightedQuotationIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <div className="font-medium text-gray-900">{quotation.quotationNumber}</div>
                          <div className="text-xs text-gray-500">
                            {typeof quotation.customer === 'object' && quotation.customer ? quotation.customer.name : 'Customer'} • 
                            ₹{quotation.grandTotal?.toLocaleString() || '0'} • 
                            {quotation.status}
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Billing Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Address *
              </label>
              <div className="relative dropdown-container">
                <input
                  ref={billingAddressInputRef}
                  type="text"
                  value={billingAddressSearchTerm}
                  onChange={(e) => {
                    setBillingAddressSearchTerm(e.target.value);
                    if (!showBillingAddressDropdown) setShowBillingAddressDropdown(true);
                    setHighlightedBillingAddressIndex(-1);
                    
                    // If user clears the input, clear the selected address
                    if (e.target.value === '') {
                      setFormData(prev => ({
                        ...prev,
                        billingAddress: { 
                          id: 0, 
                          address: '', 
                          state: '', 
                          district: '', 
                          pincode: '', 
                          addressId: 0, 
                          gstNumber: '' 
                        }
                      }));
                    }
                  }}
                  onFocus={() => {
                    if (!formData.customer) {
                      toast.error('Please select a customer first');
                      return;
                    }
                    setShowBillingAddressDropdown(true);
                    setHighlightedBillingAddressIndex(-1);
                  }}
                  disabled={!formData.customer || isViewMode}
                  placeholder={!formData.customer ? 'Select customer first' : 'Search address or press ↓ to open'}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${!formData.customer || isViewMode ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.billingAddress?.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          billingAddress: { 
                            id: 0, 
                            address: '', 
                            state: '', 
                            district: '', 
                            pincode: '', 
                            addressId: 0, 
                            gstNumber: '' 
                          }
                        }));
                        setBillingAddressSearchTerm('');
                        setShowBillingAddressDropdown(false);
                      }}
                      className="mr-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear address selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBillingAddressDropdown ? 'rotate-180' : ''} pointer-events-none`} />
                </div>
                {showBillingAddressDropdown && formData.customer && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {billingAddresses.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No addresses available for this customer
                      </div>
                    ) : (
                      billingAddresses
                        .filter(address =>
                          billingAddressSearchTerm === '' || 
                          address.address.toLowerCase().includes(billingAddressSearchTerm.toLowerCase()) ||
                          address.district.toLowerCase().includes(billingAddressSearchTerm.toLowerCase()) ||
                          address.state.toLowerCase().includes(billingAddressSearchTerm.toLowerCase())
                        )
                        .map((address, index) => (
                          <button
                            key={address.id}
                            onClick={() => handleBillingAddressSelect(address.id)}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.billingAddress?.id === address.id ? 'bg-blue-100 text-blue-800' :
                              highlightedBillingAddressIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <div className="font-medium text-gray-900">
                              {address.address}
                            </div>
                            <div className="text-xs text-gray-500">
                              {address.district}, {address.state} - {address.pincode}
                              {address.isPrimary && <span className="ml-2 text-blue-600 font-medium">(Primary)</span>}
                            </div>
                          </button>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Address *
              </label>
              <div className="relative dropdown-container">
                <input
                  ref={shippingAddressInputRef}
                  type="text"
                  value={shippingAddressSearchTerm}
                  onChange={(e) => {
                    setShippingAddressSearchTerm(e.target.value);
                    if (!showShippingAddressDropdown) setShowShippingAddressDropdown(true);
                    setHighlightedShippingAddressIndex(-1);
                    
                    // If user clears the input, clear the selected address
                    if (e.target.value === '') {
                      setFormData(prev => ({
                        ...prev,
                        shippingAddress: { 
                          id: 0,
                          address: '', 
                          state: '', 
                          district: '', 
                          pincode: '', 
                          addressId: 0, 
                          gstNumber: '' 
                        }
                      }));
                    }
                  }}
                  onFocus={() => {
                    if (!formData.customer) {
                      toast.error('Please select a customer first');
                      return;
                    }
                    setShowShippingAddressDropdown(true);
                    setHighlightedShippingAddressIndex(-1);
                  }}
                  disabled={!formData.customer || isViewMode}
                  placeholder={!formData.customer ? 'Select customer first' : 'Search address or press ↓ to open'}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${!formData.customer || isViewMode ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.shippingAddress?.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          shippingAddress: { 
                            id: 0, 
                            address: '', 
                            state: '', 
                            district: '', 
                            pincode: '', 
                            addressId: 0, 
                            gstNumber: '' 
                          }
                        }));
                        setShippingAddressSearchTerm('');
                        setShowShippingAddressDropdown(false);
                      }}
                      className="mr-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear address selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showShippingAddressDropdown ? 'rotate-180' : ''} pointer-events-none`} />
                </div>
                {showShippingAddressDropdown && formData.customer && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {shippingAddresses.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No addresses available for this customer
                      </div>
                    ) : (
                      shippingAddresses
                        .filter(address =>
                          shippingAddressSearchTerm === '' || 
                          address.address.toLowerCase().includes(shippingAddressSearchTerm.toLowerCase()) ||
                          address.district.toLowerCase().includes(shippingAddressSearchTerm.toLowerCase()) ||
                          address.state.toLowerCase().includes(shippingAddressSearchTerm.toLowerCase())
                        )
                        .map((address, index) => (
                          <button
                            key={address.id}
                            onClick={() => handleShippingAddressSelect(address.id)}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.shippingAddress?.id === address.id ? 'bg-blue-100 text-blue-800' :
                              highlightedShippingAddressIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <div className="font-medium text-gray-900">
                              {address.address}
                            </div>
                            <div className="text-xs text-gray-500">
                              {address.district}, {address.state} - {address.pincode}
                              {address.isPrimary && <span className="ml-2 text-blue-600 font-medium">(Primary)</span>}
                            </div>
                          </button>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Expected Delivery Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Delivery Date *
              </label>
              <input
                type="date"
                value={formData.expectedDeliveryDate}
                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="retail">Retail</option>
                <option value="corporate">Corporate</option>
                <option value="industrial_marine">Industrial & Marine</option>
                <option value="others">Others</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Delivery Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Notes
                </label>
                <textarea
                  value={formData.deliveryNotes || ''}
                  onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Delivery instructions or notes..."
                />
              </div>

              {/* Reference Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={formData.referenceNumber || ''}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Reference number..."
                />
              </div>

              {/* Reference Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Date
                </label>
                <input
                  type="date"
                  value={formData.referenceDate || ''}
                  onChange={(e) => setFormData({ ...formData, referenceDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Buyer's Order Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buyer's Order Number
                </label>
                <input
                  type="text"
                  value={formData.buyersOrderNumber || ''}
                  onChange={(e) => setFormData({ ...formData, buyersOrderNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Buyer's order number..."
                />
              </div>

              {/* Buyer's Order Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buyer's Order Date
                </label>
                <input
                  type="date"
                  value={formData.buyersOrderDate || ''}
                  onChange={(e) => setFormData({ ...formData, buyersOrderDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Dispatch Doc Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dispatch Doc Number
                </label>
                <input
                  type="text"
                  value={formData.dispatchDocNo || ''}
                  onChange={(e) => setFormData({ ...formData, dispatchDocNo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Dispatch document number..."
                />
              </div>

              {/* Dispatch Doc Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dispatch Doc Date
                </label>
                <input
                  type="date"
                  value={formData.dispatchDocDate || ''}
                  onChange={(e) => setFormData({ ...formData, dispatchDocDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Destination
                </label>
                <input
                  type="text"
                  value={formData.destination || ''}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Delivery destination..."
                />
              </div>

              {/* Delivery Note Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Note Date
                </label>
                <input
                  type="date"
                  value={formData.deliveryNoteDate || ''}
                  onChange={(e) => setFormData({ ...formData, deliveryNoteDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Dispatched Through */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dispatched Through
                </label>
                <input
                  type="text"
                  value={formData.dispatchedThrough || ''}
                  onChange={(e) => setFormData({ ...formData, dispatchedThrough: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Transportation method..."
                />
              </div>

              {/* Terms of Delivery */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms of Delivery
                </label>
                <input
                  type="text"
                  value={formData.termsOfDelivery || ''}
                  onChange={(e) => setFormData({ ...formData, termsOfDelivery: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Delivery terms..."
                />
              </div>

              {/* Proforma Reference */}
              {formData.proformaReference && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Created from Proforma
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-blue-50 text-blue-800 font-medium">
                    Proforma Reference: {formData.proformaReference? location.state?.proformaNumber : ''}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">This invoice was created from a proforma</p>
                </div>
              )}
            </div>
          </div>


          {/* Items */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Items</h2>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowDgProductSelector(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add DG Product
                </Button>
                <Button variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left font-semibold">Sr. No.</th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">Product Description</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">HSN Number</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">UOM</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">Quantity</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">Basic Unit Price (INR)</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">Discount %</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">GST %</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">GST Amount (INR)</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">Net Taxable Amt (INR)</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-3 text-center">{index + 1}</td>
                      <td className="border border-gray-300 p-3">
                        <div className="relative product-description-dropdown">
                          <textarea
                            value={item.description}
                              onChange={(e) => {
                              updateItem(index, 'description', e.target.value);
                              setProductDescriptionSearchTerm(prev => ({ ...prev, [index]: e.target.value }));
                              if (!showProductDescriptionDropdown[index]) {
                                setShowProductDescriptionDropdown(prev => ({ ...prev, [index]: true }));
                                }
                              }}
                              onFocus={() => {
                              setShowProductDescriptionDropdown(prev => ({ ...prev, [index]: true }));
                            }}
                            className="w-full border-none resize-none focus:outline-none bg-transparent"
                            rows={3}
                            placeholder="Product description"
                          />

                          {showProductDescriptionDropdown[index] && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                              <div className="p-2 border-b border-gray-200">
                                <input
                                  type="text"
                                  placeholder="Search DG products..."
                                  value={productDescriptionSearchTerm[index] || ''}
                                  onChange={(e) => setProductDescriptionSearchTerm(prev => ({ ...prev, [index]: e.target.value }))}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  autoFocus
                                />
                                    </div>
                              <div className="py-1">
                                {getFilteredDGProductsForDescription(productDescriptionSearchTerm[index] || '').length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-gray-500">No DG products found</div>
                                ) : (
                                  getFilteredDGProductsForDescription(productDescriptionSearchTerm[index] || '').map(product => (
                                  <button
                                    key={product._id}
                                      onClick={() => handleProductDescriptionSelect(index, product)}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="font-medium text-gray-900">
                                        {product.kva} KVA {product.phase === 'single' ? '1P' : '3P'} - {product.dgModel}
                                      </div>
                                      <div className="text-xs text-gray-600 truncate">
                                        {product.description || `Supply of ${product.kva} kVA ${product.phase === 'single' ? '1 phase' : '3 phase'}, Mahindra CPCB IV+ compliant...`}
                                    </div>
                                  </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <input
                          type="text"
                          value={item.hsnNumber || ''}
                          onChange={(e) => updateItem(index, 'hsnNumber', e.target.value)}
                          disabled={isViewMode}
                          className={`w-full text-center border-none focus:outline-none ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : 'bg-transparent'}`}
                          placeholder="HSN Code"
                        />
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <input
                          type="text"
                          value={item.uom || ''}
                          onChange={(e) => updateItem(index, 'uom', e.target.value)}
                          disabled={isViewMode}
                          className={`w-full text-center border-none focus:outline-none ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : 'bg-transparent'}`}
                          placeholder="UOM"
                        />
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          disabled={isViewMode}
                          className={`w-full text-center border-none focus:outline-none ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : 'bg-transparent'}`}
                          min="0"
                          step="1"
                        />
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <input
                          type="number"
                          value={item.unitPrice || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateItem(index, 'unitPrice', value);
                          }}
                          disabled={isViewMode}
                          className={`w-full text-center border-none focus:outline-none ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : 'bg-transparent'}`}
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <input
                          type="number"
                          value={item.discount || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateItem(index, 'discount', value);
                          }}
                          disabled={isViewMode}
                          className={`w-full text-center border-none focus:outline-none ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : 'bg-transparent'}`}
                          placeholder="0"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <input
                          type="number"
                          value={item.gstRate || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 18;
                            updateItem(index, 'gstRate', value);
                          }}
                          disabled={isViewMode}
                          className={`w-full text-center border-none focus:outline-none ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : 'bg-transparent'}`}
                          placeholder="18"
                          min="0"
                          max="100"
                          step="0.01"
                        />
                      </td>
                      <td className="border border-gray-300 p-3 text-center font-medium">
                        ₹{(item.gstAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="border border-gray-300 p-3 text-center font-medium">
                        ₹{(item.totalPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        {formData.items.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                          onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                          disabled={formData.items.length === 1}
                        >
                          <X className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Discount Row */}
                  <tr>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3 text-center font-semibold">
                      Total Discount
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-medium">
                      ₹{(formData.totalDiscount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Tax Row */}
                  <tr>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3 text-center font-semibold">
                      Total GST
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-medium">
                      ₹{(formData.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Sub Total Row */}
                  <tr>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3 text-center font-semibold">
                      Sub Total (In Rupees)
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold">
                      ₹{(formData.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Transport Charges Section */}
            <div className="mt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Transport Charges</h3>
              <div className="grid grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.transportCharges.quantity}
                    onChange={(e) => updateTransportCharges('quantity', parseFloat(e.target.value) || 0)}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="2.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.transportCharges.unitPrice}
                    onChange={(e) => updateTransportCharges('unitPrice', parseFloat(e.target.value) || 0)}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="35,000.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HSN Number
                  </label>
                  <input
                    type="text"
                    value={formData.transportCharges.hsnNumber}
                    onChange={(e) => updateTransportCharges('hsnNumber', e.target.value)}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="998399"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={formData.transportCharges.gstRate}
                    onChange={(e) => updateTransportCharges('gstRate', parseFloat(e.target.value) || 0)}
                    disabled={isViewMode}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount (₹)
                  </label>
                  <input
                    type="text"
                    value={`₹${(formData.transportCharges.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* GST and Total Section */}
            <div className="mt-4">
              <table className="w-full border border-gray-300">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>
                      Sub Total
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold" colSpan={2}>
                      ₹{(formData.subtotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>
                      Total Discount
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold" colSpan={2}>
                      ₹{(formData.totalDiscount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>
                      Transport Charges
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold" colSpan={2}>
                      ₹{(formData.transportCharges.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  {/* <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>
                      Tax Rate (%)
                    </td>
                    <td className="border border-gray-300 p-3 text-center" colSpan={2}>
                      <input
                        type="number"
                        value={formData.taxRate}
                        onChange={(e) => handleTaxRateChange(Number(e.target.value))}
                        className="w-20 text-center border border-gray-300 rounded px-2 py-1"
                        min="0"
                        max="100"
                        step="0.01"
                      />
                    </td>
                  </tr> */}
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>
                      Tax Amount (₹)
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold" colSpan={2}>
                      ₹{(formData.taxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>
                      Grand Total (In Rupees)
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold" colSpan={2}>
                      ₹{(formData.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Additional notes or specifications..."
            />
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between font-bold text-lg border-t pt-3">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {!isViewMode && (
            <div className="flex justify-end gap-5">
              <button
                onClick={() => {
                  if (onClose) {
                    onClose();
                  } else {
                    navigate('/dg-sales');
                  }
                }}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitInvoice}
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <Save className="w-5 h-5" />
                <span className="font-medium">{submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Invoice' : 'Create Invoice')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DG Product Selector Modal */}
      {showDgProductSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-y-auto m-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Select DG Product</h2>
              <button
                onClick={() => setShowDgProductSelector(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search DG products..."
                  value={dgProductSearchTerm}
                  onChange={(e) => setDgProductSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-3 text-left font-semibold">KVA</th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">Phase</th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">Model</th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">Price</th>
                      <th className="border border-gray-300 p-3 text-left font-semibold">Description</th>
                      <th className="border border-gray-300 p-3 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dgProducts
                      .filter(product =>
                        !dgProductSearchTerm ||
                        product.kva?.toLowerCase().includes(dgProductSearchTerm.toLowerCase()) ||
                        product.dgModel?.toLowerCase().includes(dgProductSearchTerm.toLowerCase()) ||
                        product.description?.toLowerCase().includes(dgProductSearchTerm.toLowerCase())
                      )
                      .map((product, index) => (
                        <tr key={product._id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-3">{product.kva}</td>
                          <td className="border border-gray-300 p-3">{product.phase === 'single' ? '1P' : '3P'}</td>
                          <td className="border border-gray-300 p-3">{product.dgModel}</td>
                          <td className="border border-gray-300 p-3">₹{product.price?.toLocaleString() || '0'}</td>
                          <td className="border border-gray-300 p-3 text-sm text-gray-600 max-w-xs truncate">
                            {product.description || `Supply of ${product.kva} kVA ${product.phase === 'single' ? '1 phase' : '3 phase'}, Mahindra CPCB IV+ compliant...`}
                          </td>
                          <td className="border border-gray-300 p-3 text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                addItem();
                                const newIndex = formData.items.length;
                                handleProductDescriptionSelect(newIndex, product);
                                setShowDgProductSelector(false);
                              }}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDgProductSelector(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    addItem();
                    setShowDgProductSelector(false);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Manual Item
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateDGInvoiceForm;
