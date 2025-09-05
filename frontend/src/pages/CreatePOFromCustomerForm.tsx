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

// Types
interface POFromCustomerItem {
  product: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  description?: string;
  uom?: string;
  hsnNumber?: string;
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

interface POFromCustomerFormData {
  poNumber?: string;
  customer: string;
  customerEmail: string;
  customerAddress?: CustomerAddress;
  quotationNumber?: string;
  poDate: string;
  status: 'draft' | 'sent_to_customer' | 'customer_approved' | 'in_production' | 'ready_for_delivery' | 'delivered' | 'cancelled';
  expectedDeliveryDate: string;
  department: 'retail' | 'corporate' | 'industrial_marine' | 'others';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  items: POFromCustomerItem[];
  poPdf?: File | string | null;
}

const CreatePOFromCustomerForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get ID from location state or URL params
  const poId = location.state?.poId || location.pathname.split('/').pop();

  // Check if we're in edit mode or view mode
  const isEditMode = Boolean(poId) && location.pathname.includes('/edit/');
  const isViewMode = Boolean(poId) && location.pathname.includes('/po-from-customer/') && !location.pathname.includes('/edit/') && !location.pathname.includes('/create');
  const isCreateMode = location.pathname.includes('/create');

  // State management
  const [formData, setFormData] = useState<POFromCustomerFormData>({
    poNumber: '',
    customer: '',
    customerEmail: '',
    customerAddress: {
      id: 0,
      address: '',
      state: '',
      district: '',
      pincode: ''
    },
    quotationNumber: '',
    poDate: new Date().toISOString().split('T')[0], // Current date
    status: 'draft',
    expectedDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    department: 'retail',
    priority: 'medium',
    notes: '',
    items: [{
      product: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      taxRate: 0,
      description: '',
      uom: 'nos',
      hsnNumber: ''
    }],
    poPdf: null
  });

  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPO, setEditingPO] = useState<any>(null);

  // Dropdown states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showQuotationDropdown, setShowQuotationDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});

  // Search states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [addressSearchTerm, setAddressSearchTerm] = useState('');
  const [quotationSearchTerm, setQuotationSearchTerm] = useState('');
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});

  // Keyboard navigation states
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
  const [highlightedAddressIndex, setHighlightedAddressIndex] = useState(-1);
  const [highlightedQuotationIndex, setHighlightedQuotationIndex] = useState(-1);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState<Record<number, number>>({});

  // Refs for keyboard navigation
  const customerInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const quotationInputRef = useRef<HTMLInputElement>(null);

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

  // Fetch PO data if in edit or view mode
  useEffect(() => {
    if ((isEditMode || isViewMode) && poId && !isCreateMode) {
      fetchPOData();
    }
  }, [isEditMode, isViewMode, poId, isCreateMode]);

  // API functions
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCustomers(),
        fetchProducts(),
        fetchQuotations()
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
      const response = await apiClient.stock.getStock({ limit: 10000, page: 1 });
      const responseData = response.data as any;

      // Use Map to deduplicate products by ID
      const uniqueProducts = new Map();

      if (responseData.stockLevels && Array.isArray(responseData.stockLevels)) {
        responseData.stockLevels.forEach((stock: any) => {
          const productId = stock.product?._id || stock.productId;
          if (productId && !uniqueProducts.has(productId)) {
            uniqueProducts.set(productId, {
              _id: productId,
              name: stock.product?.name || stock.productName || 'Unknown Product',
              price: stock.product?.price || 0,
              gst: stock.product?.gst || 0,
              hsnNumber: stock.product?.hsnNumber || '',
              partNo: stock.product?.partNo || '',
              uom: stock.product?.uom || 'nos',
              category: stock.product?.category || 'N/A',
              brand: stock.product?.brand || 'N/A',
              availableQuantity: stock.availableQuantity || 0,
              stockData: stock
            });
          }
        });
      } else if (Array.isArray(responseData)) {
        responseData.forEach(product => {
          if (product._id && !uniqueProducts.has(product._id)) {
            uniqueProducts.set(product._id, product);
          }
        });
      }

      const productsData = Array.from(uniqueProducts.values());
      console.log(`Loaded ${productsData.length} unique products`); // Debug log
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Failed to load products');
      setProducts([]);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await apiClient.quotations.getAll({
        limit: 1000,
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
      console.error('Error fetching quotations:', error);
      toast.error('Failed to load quotations');
      setQuotations([]);
    }
  };

  const fetchPOData = async () => {
    if (!poId) return;

    try {
      setLoading(true);
      const response = await apiClient.poFromCustomers.getById(poId);

      if (response.success && response.data) {
        const po = response.data;
        setEditingPO(po);

        // Map PO data to form data
        const mappedFormData: POFromCustomerFormData = {
          poNumber: po.poNumber || '',
          customer: typeof po.customer === 'string' ? po.customer : po.customer._id,
          customerEmail: po.customerEmail,
          customerAddress: po.customerAddress,
          quotationNumber: po.quotationNumber || '',
          poDate: po.orderDate ? po.orderDate.split('T')[0] : new Date().toISOString().split('T')[0],
          status: po.status || 'draft',
          expectedDeliveryDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          department: po.department || 'retail',
          priority: po.priority || 'medium',
          notes: po.notes || '',
          items: po.items.map((item: any) => ({
            product: typeof item.product === 'string' ? item.product : item.product._id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            taxRate: item.taxRate,
            description: item.description || '',
            uom: item.uom || 'nos',
            hsnNumber: item.hsnNumber || ''
          })),
          poPdf: po.poPdf || null
        };

        setFormData(mappedFormData);

        // Set customer search term
        if (typeof po.customer === 'object') {
          setCustomerSearchTerm(po.customer.name);
        }

        // Set addresses for dropdown
        if (typeof po.customer === 'object' && po.customer.addresses) {
          setAddresses(po.customer.addresses);
        }

        // Set address search term if we have customerAddress
        if (po.customerAddress) {
          setAddressSearchTerm(`${po.customerAddress.address}, ${po.customerAddress.district}, ${po.customerAddress.state} - ${po.customerAddress.pincode}`);
        }

        // Set quotation search term if we have quotationNumber
        if (po.quotationNumber) {
          if (typeof po.quotationNumber === 'object') {
            setQuotationSearchTerm(po.quotationNumber.quotationNumber);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching PO data:', error);
      toast.error('Failed to load PO from customer data');
      navigate('/po-from-customer-management');
    } finally {
      setLoading(false);
    }
  };

  // Form handlers
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    setFormData(prev => ({
      ...prev,
      customer: customerId,
      customerEmail: customer?.email || '',
      customerAddress: undefined
    }));
    setShowCustomerDropdown(false);
    setCustomerSearchTerm(customer?.name || ''); // Set the customer name as search term
    setHighlightedCustomerIndex(-1);

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

  const handleQuotationSelect = (quotationId: string) => {
    const quotation = quotations.find(q => q._id === quotationId);
    setFormData(prev => ({
      ...prev,
      quotationNumber: quotationId
    }));
    setShowQuotationDropdown(false);
    setQuotationSearchTerm(quotation?.quotationNumber || ''); // Set the quotation number as search term
    setHighlightedQuotationIndex(-1);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product: '',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        taxRate: 0,
        description: '',
        uom: 'nos',
        hsnNumber: ''
      }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index: number, field: keyof POFromCustomerItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };

          // Auto-populate product fields when product is selected
          if (field === 'product') {
            const productObj = products.find(p => p._id === value);
            if (productObj) {
              updatedItem.unitPrice = productObj.gndp || productObj.price || 0;
              updatedItem.taxRate = productObj.gst || 0;
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
          if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate' || field === 'product') {
            const quantity = Number(field === 'quantity' ? value : (updatedItem.quantity || item.quantity)) || 0;
            const unitPrice = Number(field === 'unitPrice' ? value : (updatedItem.unitPrice || item.unitPrice)) || 0;
            const taxRate = Number(field === 'taxRate' ? value : (updatedItem.taxRate || item.taxRate)) || 0;
            const subtotal = quantity * unitPrice;
            updatedItem.totalPrice = subtotal * (1 + taxRate / 100);
          }

          return updatedItem;
        }
        return item;
      })
    }));
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

  const handleSubmitPO = async () => {
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

      if (cleanedItems.length === 0) {
        toast.error('Please add at least one item to the PO from customer');
        setSubmitting(false);
        return;
      }

      // Calculate total amount
      const totalAmount = cleanedItems.reduce((sum, item) => sum + item.totalPrice, 0);

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

      const poData = {
        poNumber: formData.poNumber || undefined, // Only include if provided
        customer: formData.customer,
        customerEmail: formData.customerEmail,
        customerAddress: formData.customerAddress,
        quotationNumber: formData.quotationNumber || undefined, // Only include if provided
        items: cleanedItems,
        totalAmount,
        remainingAmount: totalAmount,
        poDate: formData.poDate,
        status: formData.status,
        expectedDeliveryDate: formData.expectedDeliveryDate,
        department: formData.department,
        priority: formData.priority,
        notes: formData.notes,
        poPdf: fileUrl, // Use uploaded file URL or existing URL
        createdBy: user?.id
      };

      let response;
      if (isEditMode && editingPO) {
        // Update existing PO from customer
        response = await apiClient.poFromCustomers.update(editingPO._id, poData);
        toast.success('PO from customer updated successfully!');
      } else {
        // Create new PO from customer
        response = await apiClient.poFromCustomers.create(poData);
        toast.success('PO from customer created successfully!');
      }

      navigate('/po-from-customer-management');
    } catch (error: any) {
      console.error('Error saving PO from customer:', error);
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} PO from customer`);
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
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
          isViewMode ? `View PO From Customer - ${editingPO?.poNumber || ''}` :
          isEditMode ? `Edit PO From Customer - ${editingPO?.poNumber || ''}` :
          isCreateMode ? "Create PO From Customer" :
          "Create PO From Customer"
        }
        subtitle={
          isViewMode ? "View PO from customer details" :
          isEditMode ? "Edit existing PO from customer" :
          isCreateMode ? "Create a new PO from customer" :
          "Create a new PO from customer"
        }
      >
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/po-from-customer-management')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Management</span>
          </button>
          {isViewMode && (
            <button
              onClick={() => navigate(`/po-from-customer/edit/${poId}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit PO</span>
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
            {/* PO Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Number *
              </label>
              <input
                type="text"
                value={formData.poNumber || ''}
                onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                placeholder="Enter PO number"
                disabled={isViewMode}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isViewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              />
              {/* <p className="text-xs text-gray-500 mt-1">Leave empty for auto-generation</p> */}
            </div>

            {/* PO Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Date *
              </label>
              <input
                type="date"
                value={formData.poDate}
                onChange={(e) => setFormData({ ...formData, poDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* PO Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PO Status *
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="draft">Draft</option>
                <option value="sent_to_customer">Sent to Customer</option>
                <option value="customer_approved">Customer Approved</option>
                <option value="in_production">In Production</option>
                <option value="ready_for_delivery">Ready for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
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
                  value={customerSearchTerm}
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
                        customerAddress: undefined
                      }));
                      setAddresses([]);
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
                          customerAddress: undefined
                        }));
                        setCustomerSearchTerm('');
                        setAddresses([]);
                        setShowCustomerDropdown(false);
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
                  value={quotationSearchTerm}
                  onChange={(e) => {
                    setQuotationSearchTerm(e.target.value);
                    if (!showQuotationDropdown) setShowQuotationDropdown(true);
                    setHighlightedQuotationIndex(-1);
                    
                    // If user clears the input, clear the selected quotation
                    if (e.target.value === '') {
                      setFormData(prev => ({
                        ...prev,
                        quotationNumber: ''
                      }));
                    }
                  }}
                  onFocus={() => {
                    setShowQuotationDropdown(true);
                    setHighlightedQuotationIndex(-1);
                  }}
                  placeholder="Search quotation number or press ↓ to open"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.quotationNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          quotationNumber: ''
                        }));
                        setQuotationSearchTerm('');
                        setShowQuotationDropdown(false);
                      }}
                      className="mr-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Clear quotation selection"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showQuotationDropdown ? 'rotate-180' : ''} pointer-events-none`} />
                </div>
                {showQuotationDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {(() => {
                      const filteredQuotations = quotations
                        .filter(quotation => quotation && quotation.quotationNumber)
                        .filter(quotation =>
                          quotationSearchTerm === '' || 
                          quotation.quotationNumber.toLowerCase().includes(quotationSearchTerm.toLowerCase())
                        );
                      
                      if (filteredQuotations.length === 0) {
                        return (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            {quotations.length === 0 ? 'No quotations available' : 'No quotations found matching search'}
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

          {/* Items Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">PO Items</h3>
              <button
                onClick={addItem}
                type="button"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            <div className=" relative">
              <table className="min-w-full border border-gray-300 rounded-lg bg-white shadow-sm">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wide">S.No</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wide">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wide">Description</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wide">HSN/SAC</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wide">UOM</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wide">Quantity</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wide">Unit Price</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wide">GST %</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wide">Total</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-800 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {formData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 relative">
                      <td className="px-3 py-2 text-center text-sm font-medium text-gray-600">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative dropdown-container">
                          <div className="relative">
                            <input
                              type="text"
                              value={productSearchTerms[index] || ''}
                              onChange={(e) => {
                                setProductSearchTerms(prev => ({ ...prev, [index]: e.target.value }));
                                setShowProductDropdowns(prev => ({ ...prev, [index]: true }));
                                setHighlightedProductIndex(prev => ({ ...prev, [index]: -1 }));
                                
                                // If user clears the input, clear the selected product
                                if (e.target.value === '') {
                                  updateItem(index, 'product', '');
                                }
                              }}
                              onFocus={() => {
                                setShowProductDropdowns(prev => ({ ...prev, [index]: true }));
                                setHighlightedProductIndex(prev => ({ ...prev, [index]: -1 }));
                              }}
                              className="w-full px-2 py-1 pr-8 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Search product..."
                              autoComplete="off"
                            />
                            {item.product && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateItem(index, 'product', '');
                                  setProductSearchTerms(prev => ({ ...prev, [index]: '' }));
                                  setShowProductDropdowns(prev => ({ ...prev, [index]: false }));
                                }}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title="Clear product selection"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {showProductDropdowns[index] && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-xl z-[9999] max-h-60 overflow-y-auto"
                                 style={{ 
                                   position: 'absolute',
                                   zIndex: 9999,
                                   minWidth: '300px',
                                   maxHeight: '240px',
                                   boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                                 }}>
                              {(() => {
                                const filteredProducts = getFilteredProducts(productSearchTerms[index] || '');
                                console.log(`Product dropdown ${index} - showing ${filteredProducts} products`);
                                
                                if (filteredProducts.length === 0) {
                                  return (
                                    <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                      {products.length === 0 ? 'No products available' : 'No products found matching search'}
                                    </div>
                                  );
                                }
                                
                                return filteredProducts.map((product, productIndex) => (
                                  <button
                                    key={product._id}
                                    onClick={() => {
                                      updateItem(index, 'product', product._id);
                                      setShowProductDropdowns(prev => ({ ...prev, [index]: false }));
                                      setProductSearchTerms(prev => ({ ...prev, [index]: '' }));
                                      setHighlightedProductIndex(prev => ({ ...prev, [index]: -1 }));
                                    }}
                                    className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${item.product === product._id ? 'bg-blue-100 text-blue-800' : 'text-gray-700'}`}
                                  >
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {product.partNo} • ₹{product?.price?.toLocaleString()}
                                    </div>
                                  </button>
                                ));
                              })()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description || ''}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Description"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.hsnNumber || ''}
                          onChange={(e) => updateItem(index, 'hsnNumber', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="HSN/SAC"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.uom || 'nos'}
                          onChange={(e) => updateItem(index, 'uom', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="UOM"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                          placeholder="1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.taxRate}
                          onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-bold text-blue-600">
                        ₹{item.totalPrice?.toFixed(2) || '0.00'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => removeItem(index)}
                          disabled={formData.items.length === 1}
                          className="text-red-500 hover:text-red-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                          title={formData.items.length === 1 ? "Cannot remove the only item" : "Remove item"}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
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
                onClick={() => navigate('/po-from-customer-management')}
                disabled={submitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitPO}
                disabled={submitting}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <Save className="w-5 h-5" />
                <span className="font-medium">{submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update PO' : 'Create PO')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatePOFromCustomerForm;
