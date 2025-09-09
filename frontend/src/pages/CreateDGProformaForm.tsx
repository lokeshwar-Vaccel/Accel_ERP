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
interface ProformaItem {
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  uom: string;
  discount: number;
  discountedAmount: number;
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

interface ProformaFormData {
  proformaNumber?: string;
  customer: string;
  customerEmail: string;
  customerAddress?: CustomerAddress;
  billingAddress?: CustomerAddress;
  shippingAddress?: CustomerAddress;
  quotationNumber?: string;
  poNumber?: string;
  proformaDate: string;
  validUntil: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
  paymentStatus: 'Pending' | 'Partial' | 'Paid' | 'Overdue';
  paymentTerms: 'Net 15' | 'Net 30' | 'Net 45' | 'Immediate' | 'Custom';
  notes?: string;
  items: ProformaItem[];
  proformaPdf?: File | string | null;
  additionalCharges: {
    freight: number;
    insurance: number;
    packing: number;
    other: number;
  };
  dgEnquiry: string;
  // Legacy fields for compatibility
  expectedDeliveryDate?: string;
  department?: string;
  priority?: string;
  poPdf?: File | string | null;
  // GST fields at Proforma level
  subtotal: number;
  totalDiscount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

interface CreateDGProformaFormProps {
  // Props for modal-based editing
  selectedProforma?: any;
  formMode?: 'create' | 'edit' | 'view';
  onSuccess?: () => void;
  onClose?: () => void;
}

const CreateDGProformaForm: React.FC<CreateDGProformaFormProps> = ({ 
  selectedProforma, 
  formMode, 
  onSuccess, 
  onClose 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get ID from location state, URL params, or props
  const proformaId = selectedProforma?._id || location.state?.proformaId || location.pathname.split('/').pop();

  // Check if we're in edit mode or view mode - prioritize props over URL detection
  const isEditMode = formMode === 'edit' || (Boolean(proformaId) && location.pathname.includes('/edit/'));
  const isViewMode = formMode === 'view' || (Boolean(proformaId) && location.pathname.includes('/proforma/') && !location.pathname.includes('/edit/') && !location.pathname.includes('/create'));
  const isCreateMode = formMode === 'create' || location.pathname.includes('/create');

  // State management
  const [formData, setFormData] = useState<ProformaFormData>({
    proformaNumber: '',
    customer: '',
    customerEmail: '',
    customerAddress: {
      id: 0,
      address: '',
      state: '',
      district: '',
      pincode: ''
    },
    billingAddress: {
      id: 0,
      address: '',
      state: '',
      district: '',
      pincode: ''
    },
    shippingAddress: {
      id: 0,
      address: '',
      state: '',
      district: '',
      pincode: ''
    },
    quotationNumber: '',
    poNumber: '',
    proformaDate: new Date().toISOString().split('T')[0], // Current date
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    status: 'Draft',
    paymentStatus: 'Pending',
    paymentTerms: 'Net 30',
    notes: '',
    items: [{
      product: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      uom: 'nos',
      discount: 0,
      discountedAmount: 0,
      kva: '',
      phase: '',
      annexureRating: '',
      dgModel: '',
      numberOfCylinders: 0,
      subject: '',
      isActive: true,
      hsnNumber: ''
    }],
    proformaPdf: null,
    additionalCharges: {
      freight: 0,
      insurance: 0,
      packing: 0,
      other: 0
    },
    dgEnquiry: '',
    // GST fields at Proforma level
    subtotal: 0,
    totalDiscount: 0,
    taxRate: 18,
    taxAmount: 0,
    totalAmount: 0
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [poFromCustomers, setPoFromCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPO, setEditingPO] = useState<any>(null);
  const [dgProducts, setDgProducts] = useState<any[]>([]);
  const [showDgProductSelector, setShowDgProductSelector] = useState(false);
  const [dgProductSearchTerm, setDgProductSearchTerm] = useState('');
  const [showProductDescriptionDropdown, setShowProductDescriptionDropdown] = useState<Record<number, boolean>>({});
  const [productDescriptionSearchTerm, setProductDescriptionSearchTerm] = useState<Record<number, string>>({});

  // Dropdown states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showQuotationDropdown, setShowQuotationDropdown] = useState(false);
  const [showPODropdown, setShowPODropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});

  // Search states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [addressSearchTerm, setAddressSearchTerm] = useState('');
  const [quotationSearchTerm, setQuotationSearchTerm] = useState('');
  const [poSearchTerm, setPoSearchTerm] = useState('');
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});

  // Keyboard navigation states
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
  const [highlightedAddressIndex, setHighlightedAddressIndex] = useState(-1);
  const [highlightedQuotationIndex, setHighlightedQuotationIndex] = useState(-1);
  const [highlightedPOIndex, setHighlightedPOIndex] = useState(-1);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState<Record<number, number>>({});

  // Refs for keyboard navigation
  const customerInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const quotationInputRef = useRef<HTMLInputElement>(null);
  const poInputRef = useRef<HTMLInputElement>(null);

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
        setShowAddressDropdown(false);
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

  // Fetch Proforma data if in edit or view mode (only if not using props)
  useEffect(() => {
    if ((isEditMode || isViewMode) && proformaId && !isCreateMode && !selectedProforma) {
      fetchProformaData();
    }
  }, [isEditMode, isViewMode, proformaId, isCreateMode, selectedProforma]);

  // Load data from props if provided (for modal-based editing)
  useEffect(() => {
    if (selectedProforma && (isEditMode || isViewMode)) {
      setLoading(false); // Set loading to false since we have the data
      loadProformaFromProps(selectedProforma);
    }
  }, [selectedProforma, isEditMode, isViewMode]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (poInputRef.current && !poInputRef.current.contains(event.target as Node)) {
        setShowPODropdown(false);
        setHighlightedPOIndex(-1);
      }
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
      const response = await apiClient.dgSales.quotations.getAll({
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

  const fetchProformaData = async () => {
    if (!proformaId) return;

    try {
      setLoading(true);
      const response = await apiClient.dgSales.dgProformas.getById(proformaId);

      if (response.success && response.data) {
        const po = response.data;
        setEditingPO(po);
        loadProformaData(po);
      }
    } catch (error) {
      console.error('Error fetching DG PO data:', error);
      toast.error('Failed to load DG PO from customer data');
      if (!onClose) { // Only navigate if not in modal mode
        navigate('/dg-sales');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadProformaFromProps = (proforma: any) => {
    setEditingPO(proforma);
    loadProformaData(proforma);
  };

  const loadProformaData = (proforma: any) => {
        // Map Proforma data to form data
        const mappedFormData: ProformaFormData = {
          proformaNumber: proforma.proformaNumber || '',
          customer: typeof proforma.customer === 'string' ? proforma.customer : (proforma.customer?._id || proforma.customer || ''),
          customerEmail: proforma.customerEmail,
          customerAddress: proforma.customerAddress,
          billingAddress: proforma.billingAddress,
          shippingAddress: proforma.shippingAddress,
      quotationNumber: typeof (proforma.dgQuotationNumber || proforma.quotationNumber) === 'string' 
        ? (proforma.dgQuotationNumber || proforma.quotationNumber) 
        : ((proforma.dgQuotationNumber || proforma.quotationNumber)?._id || ''),
          poNumber: proforma.poNumber || '',
          proformaDate: proforma.proformaDate ? proforma.proformaDate.split('T')[0] : new Date().toISOString().split('T')[0],
          validUntil: proforma.validUntil ? proforma.validUntil.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: proforma.status || 'Draft',
          paymentStatus: proforma.paymentStatus || 'Pending',
          paymentTerms: proforma.paymentTerms || 'Net 30',
          notes: proforma.notes || '',
          items: proforma.items.map((item: any) => ({
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
            hsnNumber: item.hsnNumber || 'N/A'
          })),
          proformaPdf: proforma.proformaPdf || null,
          additionalCharges: proforma.additionalCharges || {
            freight: 0,
            insurance: 0,
            packing: 0,
            other: 0
          },
          dgEnquiry: typeof proforma.dgEnquiry === 'string' ? proforma.dgEnquiry : (proforma.dgEnquiry?._id || ''),
          // GST fields at Proforma level
          subtotal: proforma.subtotal || 0,
          totalDiscount: proforma.totalDiscount || 0,
          taxRate: proforma.taxRate || 18,
          taxAmount: proforma.taxAmount || 0,
          totalAmount: proforma.totalAmount || 0
        };

        setFormData(mappedFormData);

        // Set customer search term
        if (typeof proforma.customer === 'object') {
          setCustomerSearchTerm(proforma.customer.name);
        }

        // Set addresses for dropdown
        if (typeof proforma.customer === 'object' && proforma.customer.addresses) {
          setAddresses(proforma.customer.addresses);
        }

        // Set address search term if we have customerAddress
        if (proforma.customerAddress) {
          setAddressSearchTerm(`${proforma.customerAddress.address}, ${proforma.customerAddress.district}, ${proforma.customerAddress.state} - ${proforma.customerAddress.pincode}`);
        }

        // Set quotation search term if we have quotationNumber
    if (proforma.dgQuotationNumber || proforma.quotationNumber) {
      const quotation = proforma.dgQuotationNumber || proforma.quotationNumber;
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

  // Form handlers
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    setFormData(prev => ({
      ...prev,
      customer: customerId,
      customerEmail: customer?.email || '',
      customerAddress: undefined,
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
      setAddresses(customer.addresses);
    } else {
      setAddresses([]);
    }

    // Auto-focus on address field after customer selection
    setTimeout(() => {
      addressInputRef.current?.focus();
      setShowAddressDropdown(true);
    }, 50);
  };

  const handleAddressSelect = (addressId: number) => {
    const address = addresses.find(a => a.id === addressId);
    setFormData(prev => ({
      ...prev,
      customerAddress: address
    }));
    setShowAddressDropdown(false);
    setAddressSearchTerm(address ? `${address.address}, ${address.district}, ${address.state} - ${address.pincode}` : ''); // Set the address as search term
    setHighlightedAddressIndex(-1);
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
      const response = await apiClient.dgSales.quotations.getById(quotationId) as any;
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
              kva: item.kva || '',
              phase: item.phase || '',
              annexureRating: item.annexureRating || '',
              dgModel: item.dgModel || '',
              numberOfCylinders: item.numberOfCylinders || item.cylinder || 0,
              subject: item.subject || '',
              isActive: item.isActive !== undefined ? item.isActive : true,
              hsnNumber: item.hsnNumber || 'N/A'
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
    }
  };

  // Calculate GST at PO level
  const calculateGST = (items: ProformaItem[], taxRate: number) => {
    let subtotal = 0;
    let totalDiscount = 0;
    
    items.forEach(item => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscountedAmount = item.discountedAmount || 0;
      const itemTotalPrice = itemSubtotal - itemDiscountedAmount;
      
      subtotal += itemTotalPrice;
      totalDiscount += itemDiscountedAmount;
    });
    
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    
    return { subtotal, totalDiscount, taxAmount, totalAmount };
  };

  // Handle tax rate change
  const handleTaxRateChange = (newTaxRate: number) => {
    setFormData(prev => {
      const { subtotal, totalDiscount, taxAmount, totalAmount } = calculateGST(prev.items, newTaxRate);
      
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

  const updateItem = (index: number, field: keyof ProformaItem, value: any) => {
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

          // Auto-calculate total price
          if (field === 'quantity' || field === 'unitPrice' || field === 'product') {
            const quantity = Number(field === 'quantity' ? value : (updatedItem.quantity || item.quantity)) || 0;
            const unitPrice = Number(field === 'unitPrice' ? value : (updatedItem.unitPrice || item.unitPrice)) || 0;
            updatedItem.totalPrice = quantity * unitPrice;
          }

          return updatedItem;
        }
        return item;
      });

      // Calculate GST at PO level
      const { subtotal, totalDiscount, taxAmount, totalAmount } = calculateGST(updatedItems, prev.taxRate);

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

  // Function to get filtered PO from customers
  const getFilteredPOFromCustomers = (searchTerm: string) => {
    return poFromCustomers.filter(po =>
      !searchTerm ||
      po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
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
        customerAddress: po.customerAddress || prev.customerAddress,
        billingAddress: po.billingAddress || po.customerAddress || prev.billingAddress,
        shippingAddress: po.shippingAddress || po.customerAddress || prev.shippingAddress,
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

    // Update search terms to show selected values
    setPoSearchTerm(po.poNumber || '');
    
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

    // Close dropdowns
    setShowPODropdown(false);
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
    if (!formData.poNumber) {
      newErrors.push('PO number is required');
    }
    // Customer email is now optional - removed validation
    if (!formData.customerAddress?.address) {
      newErrors.push('Customer address is required');
    }
    if (!formData.expectedDeliveryDate) {
      newErrors.push('Expected delivery date is required');
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

  const handleSubmitProforma = async () => {
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

      if (cleanedItems.length === 0) {
        toast.error('Please add at least one item to the DG Proforma');
        setSubmitting(false);
        return;
      }

      // Recalculate GST for cleaned items
      const { subtotal, totalDiscount, taxAmount, totalAmount } = calculateGST(cleanedItems, formData.taxRate);

      // Handle PDF file - use existing URL or upload new file
      let fileUrl = formData.poPdf;
      if (formData.poPdf && formData.poPdf instanceof File) {
        // New file upload - upload the file and get URL
        // Check if user is authenticated
        const token = localStorage.getItem('authToken');
        if (!token) {
          toast.error('Please log in to upload files.');
          setSubmitting(false);
          return;
        }

        try {
          console.log('Uploading file:', formData.poPdf, 'Size:', formData.poPdf.size);
          const uploadResponse = await apiClient.poFiles.upload(formData.poPdf);
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
      // If formData.poPdf is a string, it's an existing URL and we use it directly

      const proformaData = {
        proformaNumber: formData.proformaNumber || undefined, // Only include if provided
        customer: formData.customer,
        customerEmail: formData.customerEmail,
        customerAddress: formData.customerAddress,
        billingAddress: formData.billingAddress,
        shippingAddress: formData.shippingAddress,
        dgQuotationNumber: formData.quotationNumber || undefined, // Only include if provided
        poNumber: formData.poNumber || undefined,
        items: cleanedItems,
        subtotal,
        totalDiscount,
        taxRate: formData.taxRate,
        taxAmount,
        totalAmount,
        proformaDate: formData.proformaDate,
        validUntil: formData.validUntil,
        status: formData.status,
        paymentStatus: formData.paymentStatus,
        paymentTerms: formData.paymentTerms,
        additionalCharges: formData.additionalCharges,
        notes: formData.notes,
        proformaPdf: fileUrl, // Use uploaded file URL or existing URL
        dgEnquiry: formData.dgEnquiry || editingPO?.dgEnquiry || undefined,
        createdBy: user?.id
      };

      let response;
      if (isEditMode && editingPO) {
        // Update existing DG PO from customer
        response = await apiClient.dgSales.dgProformas.update(editingPO._id, proformaData);
        toast.success('DG Proforma updated successfully!');
      } else {
        // Create new DG Proforma
        response = await apiClient.dgSales.dgProformas.create(proformaData);
        toast.success('DG Proforma created successfully!');
      }

      // Handle success - either navigate or call callback
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/dg-sales');
      }
    } catch (error: any) {
      console.error('Error saving DG PO from customer:', error);
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} DG PO from customer`);
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
          isViewMode ? `View DG Proforma - ${editingPO?.proformaNumber || ''}` :
          isEditMode ? `Edit DG Proforma - ${editingPO?.proformaNumber || ''}` :
          isCreateMode ? "Create DG Proforma" :
          "Create DG Proforma"
        }
        subtitle={
          isViewMode ? "View DG Proforma details" :
          isEditMode ? "Edit existing DG Proforma" :
          isCreateMode ? "Create a new DG Proforma" :
          "Create a new DG Proforma"
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
              onClick={() => navigate(`/dg-proforma/edit/${proformaId}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Proforma</span>
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
            {/* Proforma Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proforma Number
              </label>
              <input
                type="text"
                value={formData.proformaNumber || ''}
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
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={formData.poNumber || poSearchTerm}
                  onChange={(e) => {
                    setPoSearchTerm(e.target.value);
                    if (!showPODropdown) setShowPODropdown(true);
                    
                    // If user clears the input, clear the selected PO
                    if (e.target.value === '') {
                      setFormData(prev => ({
                        ...prev,
                        poNumber: ''
                      }));
                    }
                  }}
                  onFocus={() => setShowPODropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightedPOIndex(prev => 
                        prev < getFilteredPOFromCustomers(poSearchTerm).length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightedPOIndex(prev => 
                        prev > 0 ? prev - 1 : getFilteredPOFromCustomers(poSearchTerm).length - 1
                      );
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      const filteredPOs = getFilteredPOFromCustomers(poSearchTerm);
                      if (filteredPOs[highlightedPOIndex]) {
                        handlePOSelect(filteredPOs[highlightedPOIndex]);
                      }
                    } else if (e.key === 'Escape') {
                      setShowPODropdown(false);
                      setHighlightedPOIndex(-1);
                    }
                  }}
                  ref={poInputRef}
                  placeholder="Search PO number..."
                  disabled={isViewMode}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
                
                {showPODropdown && !isViewMode && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    {getFilteredPOFromCustomers(poSearchTerm).length === 0 ? (
                      <div className="p-3 text-gray-500 text-sm">No PO found</div>
                    ) : (
                      getFilteredPOFromCustomers(poSearchTerm).map((po, index) => (
                        <div
                          key={po._id}
                          onClick={() => handlePOSelect(po)}
                          className={`p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                            index === highlightedPOIndex ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900">{po.poNumber}</div>
                          <div className="text-sm text-gray-600">
                            {po.customer?.name} - {po.customerEmail}
                          </div>
                          <div className="text-xs text-gray-500">
                            {po.items?.length || 0} item(s) - {formatCurrency(po.totalAmount || 0)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Proforma Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proforma Date *
              </label>
              <input
                type="date"
                value={formData.proformaDate}
                onChange={(e) => setFormData({ ...formData, proformaDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Until *
              </label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Proforma Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proforma Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Draft">Draft</option>
                <option value="Sent">Sent</option>
                <option value="Accepted">Accepted</option>
                <option value="Rejected">Rejected</option>
                <option value="Expired">Expired</option>
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
              <select
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Immediate">Immediate</option>
                <option value="Custom">Custom</option>
              </select>
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
                        customerAddress: undefined,
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
                      setAddresses([]);
                      
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
                          customerAddress: undefined,
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
                            taxRate: 0,
                            taxAmount: 0,
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
                        setAddresses([]);
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

            {/* Customer Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Address *
              </label>
              <div className="relative dropdown-container">
                <input
                  ref={addressInputRef}
                  type="text"
                  value={addressSearchTerm}
                  onChange={(e) => {
                    setAddressSearchTerm(e.target.value);
                    if (!showAddressDropdown) setShowAddressDropdown(true);
                    setHighlightedAddressIndex(-1);
                    
                    // If user clears the input, clear the selected address
                    if (e.target.value === '') {
                      setFormData(prev => ({
                        ...prev,
                        customerAddress: undefined
                      }));
                    }
                  }}
                  onFocus={() => {
                    if (!formData.customer) {
                      toast.error('Please select a customer first');
                      return;
                    }
                    setShowAddressDropdown(true);
                    setHighlightedAddressIndex(-1);
                  }}
                  disabled={!formData.customer}
                  placeholder={!formData.customer ? 'Select customer first' : 'Search address or press ↓ to open'}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${!formData.customer ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'
                    }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.customerAddress && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          customerAddress: undefined
                        }));
                        setAddressSearchTerm('');
                        setShowAddressDropdown(false);
                      }}
                      className="mr-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear address selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAddressDropdown ? 'rotate-180' : ''} pointer-events-none`} />
                </div>
                {showAddressDropdown && formData.customer && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {addresses.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No addresses found for this customer
                      </div>
                    ) : (
                      addresses
                        .filter(address =>
                          addressSearchTerm === '' ||
                          address.address.toLowerCase().includes(addressSearchTerm.toLowerCase()) ||
                          address.district.toLowerCase().includes(addressSearchTerm.toLowerCase()) ||
                          address.state.toLowerCase().includes(addressSearchTerm.toLowerCase())
                        )
                        .map((address, index) => (
                          <button
                            key={address.id}
                            onClick={() => handleAddressSelect(address.id)}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.customerAddress?.id === address.id ? 'bg-blue-100 text-blue-800' :
                              highlightedAddressIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <div className="font-medium text-gray-900">{address.address}</div>
                            <div className="text-xs text-gray-500">
                              {address.district}, {address.state} - {address.pincode}
                              {address.isPrimary && (
                                <span className="ml-2 bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                                  Primary
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                    )}
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
                    <th className="border border-gray-300 p-3 text-center font-semibold">Quantity</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">Basic Unit Price (INR)</th>
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
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full text-center border-none focus:outline-none bg-transparent"
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
                          className="w-full text-center border-none focus:outline-none bg-transparent"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="border border-gray-300 p-3 text-center font-medium">
                        ₹{item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

                  {/* Tax Row */}
                  <tr>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3 text-center font-semibold" colSpan={2}>
                      CGST/SGST/IGST ({formData.taxRate}%)
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-medium">
                      ₹{formData.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Sub Total Row */}
                  <tr>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3 text-center font-semibold" colSpan={2}>
                      Sub Total (In Rupees)
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold">
                      ₹{formData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
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
                      ₹{formData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
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
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>
                      Tax Amount (₹)
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold" colSpan={2}>
                      ₹{formData.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>
                      Grand Total (In Rupees)
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold" colSpan={2}>
                      ₹{formData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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

          {/* PDF Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              PO PDF Upload (Optional)
            </label>
            
            {/* Show existing PDF if available */}
            {formData.poPdf && typeof formData.poPdf === 'string' && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Current PDF Document</p>
                      <p className="text-xs text-gray-500">Click to view or replace</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <a
                      href={formData.poPdf.startsWith('http') ? formData.poPdf : `${window.location.origin}${formData.poPdf}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof formData.poPdf === 'string' && formData.poPdf) {
                          const pdfUrl = formData.poPdf.startsWith('http') ? formData.poPdf : `${window.location.origin}${formData.poPdf}`;
                          const newWindow = window.open(pdfUrl, '_blank');
                          if (newWindow) {
                            newWindow.focus();
                          }
                        }
                      }}
                      className="text-green-600 hover:text-green-800 text-sm font-medium ml-2"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, poPdf: null })}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Show new file if selected */}
            {formData.poPdf && typeof formData.poPdf === 'object' && (
              <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-gray-900">New File Selected</p>
                      <p className="text-xs text-gray-500">{formData.poPdf.name}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, poPdf: null })}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {/* Upload area */}
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="pdf-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>{formData.poPdf ? 'Replace PDF' : 'Upload a PDF or image file'}</span>
                    <input
                      id="pdf-upload"
                      name="pdf-upload"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg"
                      className="sr-only"
                      disabled={isViewMode}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setFormData({ ...formData, poPdf: file });
                        }
                      }}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PDF and image files only, up to 10MB</p>
              </div>
            </div>
          </div>

          {/* Additional Charges */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Charges</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Freight (₹)
                </label>
                <input
                  type="number"
                  value={formData.additionalCharges.freight}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    additionalCharges: { ...prev.additionalCharges, freight: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance (₹)
                </label>
                <input
                  type="number"
                  value={formData.additionalCharges.insurance}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    additionalCharges: { ...prev.additionalCharges, insurance: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Packing (₹)
                </label>
                <input
                  type="number"
                  value={formData.additionalCharges.packing}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    additionalCharges: { ...prev.additionalCharges, packing: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Other (₹)
                </label>
                <input
                  type="number"
                  value={formData.additionalCharges.other}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    additionalCharges: { ...prev.additionalCharges, other: parseFloat(e.target.value) || 0 }
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={isViewMode}
                />
              </div>
            </div>
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
                onClick={handleSubmitProforma}
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <Save className="w-5 h-5" />
                <span className="font-medium">{submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Proforma' : 'Create Proforma')}</span>
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

export default CreateDGProformaForm;
