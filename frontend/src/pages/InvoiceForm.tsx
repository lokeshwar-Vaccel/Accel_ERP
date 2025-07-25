import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Plus,
  Search,
  X,
  ChevronDown,
  ArrowLeft,
  Save,
  Eye,
  FileText,
  CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import PageHeader from '../components/ui/PageHeader';
import { apiClient } from '../utils/api';
import { RootState } from '../redux/store';
import toast from 'react-hot-toast';

// Types (same as in InvoiceManagement)
interface InvoiceItem {
  product: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
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
  type: string;
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
  availableQuantity?: number;
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
  pan?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankIFSC?: string;
  bankBranch?: string;
  declaration?: string;
  signature?: string;
}

const InvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  
  // Determine if this is edit mode
  const isEditMode = Boolean(id);
  const initialInvoiceType = location.state?.invoiceType || 'sale';
  
  // State management
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocationData[]>([]);
  const [generalSettings, setGeneralSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Custom dropdown states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showInvoiceTypeDropdown, setShowInvoiceTypeDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
  const [showUomDropdowns, setShowUomDropdowns] = useState<Record<number, boolean>>({});

  // Form states
  const [newInvoice, setNewInvoice] = useState<NewInvoice>({
    customer: '',
    dueDate: '',
    invoiceType: initialInvoiceType,
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
  });

  // Stock validation states
  const [stockValidation, setStockValidation] = useState<Record<number, {
    available: number;
    isValid: boolean;
    message: string;
  }>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Search states
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});
  const [uomSearchTerms, setUomSearchTerms] = useState<Record<number, string>>({});

  // UOM options
  const UOM_OPTIONS = [
    'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos'
  ];

  // Invoice types
  const INVOICE_TYPES = [
    { value: 'quotation', label: 'Quotation' },
    { value: 'sale', label: 'Sales Invoice' },
    { value: 'purchase', label: 'Purchase Invoice' },
    { value: 'challan', label: 'Delivery Challan' },
  ];

  // Initialize data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Load invoice data if editing
//   useEffect(() => {
//     if (isEditMode && id) {
//       fetchInvoiceForEdit(id);
//     }
//   }, [isEditMode, id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowCustomerDropdown(false);
        setShowLocationDropdown(false);
        setShowInvoiceTypeDropdown(false);
        setShowProductDropdowns({});
        setShowUomDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCustomers(),
        fetchProducts(),
        fetchLocations(),
        fetchGeneralSettings()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

//   const fetchInvoiceForEdit = async (invoiceId: string) => {
//     try {
//       const response = await apiClient.invoices.getById(invoiceId);
//       const invoice = response.data;
      
//       // Populate form with existing invoice data
//       setNewInvoice({
//         customer: invoice.customer._id,
//         address: invoice.customerAddress?.addressId?.toString() || '',
//         dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
//         invoiceType: invoice.invoiceType,
//         location: invoice.location._id,
//         notes: invoice.notes || '',
//         items: invoice.items.map((item: any) => ({
//           product: item.product._id,
//           description: item.description,
//           quantity: item.quantity,
//           unitPrice: item.unitPrice,
//           taxRate: item.taxRate,
//           gstRate: item.gstRate,
//           partNo: item.partNo,
//           hsnSac: item.hsnSac,
//           uom: item.uom,
//           discount: item.discount || 0,
//           hsnNumber: item.product.hsnNumber,
//           gst: item.product.gst
//         })),
//         discountAmount: invoice.discountAmount || 0,
//         externalInvoiceNumber: invoice.externalInvoiceNumber || '',
//         externalInvoiceTotal: invoice.externalInvoiceTotal || 0,
//         reduceStock: invoice.reduceStock !== false,
//         referenceNo: invoice.referenceNo || '',
//         referenceDate: invoice.referenceDate ? new Date(invoice.referenceDate).toISOString().split('T')[0] : '',
//         pan: invoice.pan || '',
//         bankName: invoice.bankName || '',
//         bankAccountNo: invoice.bankAccountNo || '',
//         bankIFSC: invoice.bankIFSC || '',
//         bankBranch: invoice.bankBranch || '',
//         declaration: invoice.declaration || '',
//       });

//       // Set customer addresses if available
//       if (invoice.customer.addresses) {
//         setAddresses(invoice.customer.addresses);
//       }
//     } catch (error) {
//       console.error('Error fetching invoice for edit:', error);
//       toast.error('Failed to load invoice data');
//       navigate('/billing');
//     }
//   };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll({});
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
      }

      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
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
      if (!isEditMode) {
        const mainOffice = locationsData.find(loc => loc.name === "Main Office");
        if (mainOffice) {
          setNewInvoice(prev => ({ ...prev, location: mainOffice._id }));
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  const fetchGeneralSettings = async () => {
    try {
      const response = await apiClient.generalSettings.getAll();
      if (response.success && response.data && response.data.companies && response.data.companies.length > 0) {
        const companySettings = response.data.companies[0];
        setGeneralSettings(companySettings);

        // Auto-populate default values if not in edit mode
        if (!isEditMode) {
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

  // Helper functions
  const getFilteredProducts = (searchTerm: string = '') => {
    if (!searchTerm) return products;
    return products.filter(product =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.partNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFilteredUomOptions = (searchTerm: string = '') => {
    if (!searchTerm.trim()) return UOM_OPTIONS;
    const term = searchTerm.toLowerCase();
    return UOM_OPTIONS.filter(uom => uom.toLowerCase().includes(term));
  };

  const updateProductSearchTerm = (itemIndex: number, searchTerm: string) => {
    setProductSearchTerms(prev => ({ ...prev, [itemIndex]: searchTerm }));
  };

  const updateUomSearchTerm = (itemIndex: number, searchTerm: string) => {
    setUomSearchTerms(prev => ({
      ...prev,
      [itemIndex]: searchTerm
    }));
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

  const extractGSTRate = (gst: string | number | undefined): number => {
    if (!gst) return 0;
    if (typeof gst === 'number') return gst;
    const match = gst.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
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
        validateStockForItem(index, value, updatedItems[index].quantity);
      }
      
      if (field === 'quantity') {
        validateStockForItem(index, updatedItems[index].product, value);
      }
      
      return { ...prev, items: updatedItems };
    });
  };

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

  const calculateItemTotal = (item: any) => {
    const subtotal = item.quantity * item.unitPrice || 0;
    const itemDiscount = (item.discount || 0) * subtotal / 100;
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

  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTotalTax();
    return subtotal + tax;
  };

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

  const handleSubmit = async () => {
    if (!validateInvoiceForm()) return;

    setSubmitting(true);
    try {
      const grandTotal = calculateGrandTotal();
      const totalAmount = Number(isNaN(grandTotal) ? 0 : grandTotal);

      // Get selected customer details
      const selectedCustomer = customers.find(c => c._id === newInvoice.customer);
      const selectedAddress = addresses.find(a => a.id === parseInt(newInvoice.address || '0'));

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
        pan: newInvoice.pan || '',
        bankName: newInvoice.bankName || '',
        bankAccountNo: newInvoice.bankAccountNo || '',
        bankIFSC: newInvoice.bankIFSC || '',
        bankBranch: newInvoice.bankBranch || '',
        customerAddress: selectedAddress ? {
          address: selectedAddress.address,
          state: selectedAddress.state,
          district: selectedAddress.district,
          pincode: selectedAddress.pincode
        } : null,
        referenceNo: newInvoice.referenceNo || '',
        referenceDate: newInvoice.referenceDate || '',
        declaration: newInvoice.declaration || '',
        items: newInvoice.items.map(item => ({
          product: item.product,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate || 0),
          discount: Number(item.discount || 0),
          uom: item.uom || 'nos',
          partNo: item.partNo || '',
          hsnSac: item.hsnSac || ''
        }))
      };

      if (isEditMode) {
        await apiClient.invoices.update(id!, invoiceData);
        toast.success('Invoice updated successfully!');
      } else {
        await apiClient.invoices.create(invoiceData);
        toast.success('Invoice created successfully!');
      }
      
      navigate('/billing');
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} invoice. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to safely format numbers
  function numberToWords(num: number): string {
    // Simplified number to words conversion
    if (num === 0) return 'Zero Rupees Only';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    // Simple conversion for demo - you can expand this
    if (num < 10) return ones[num] + ' Rupees Only';
    if (num < 20) return teens[num - 10] + ' Rupees Only';
    if (num < 100) return tens[Math.floor(num / 10)] + ' ' + ones[num % 10] + ' Rupees Only';
    
    return `${num} Rupees Only`;
  }

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
        title={isEditMode ? 'Edit Invoice' : 'Create Invoice'}
        subtitle={isEditMode ? 'Modify invoice details' : 'Create a new customer invoice'}
      >
        <div className="flex space-x-3">
          <Button
            onClick={() => navigate('/billing')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Billing</span>
          </Button>
          
          {isEditMode && (
            <Button
              onClick={() => navigate(`/billing/view/${id}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>View Invoice</span>
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Form Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
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
                  className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.location ? 'border-red-500' : 'border-gray-300'} hover:border-gray-400`}
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
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!newInvoice.location ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
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
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${newInvoice.location === location._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
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
                  className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.customer ? 'border-red-500' : 'border-gray-300'} hover:border-gray-400`}
                >
                  <span className="text-gray-700 truncate mr-1">{getCustomerLabel(newInvoice.customer)}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {customers.filter(customer => customer.type === 'customer').length > 0 && (
                      <div className="p-2 border-b border-gray-200">
                        <input
                          type="text"
                          placeholder="Search customers..."
                          value={customerSearchTerm}
                          onChange={e => setCustomerSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                        />
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setNewInvoice({ ...newInvoice, customer: '', address: '' });
                        setShowCustomerDropdown(false);
                        setAddresses([]);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!newInvoice.customer ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      Select customer
                    </button>
                    {customers.filter(customer =>
                      customer.type === 'customer' && (
                        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        customer.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                    ).map(customer => (
                      <button
                        key={customer._id}
                        onClick={() => {
                          setNewInvoice({ ...newInvoice, customer: customer._id, address: '' });
                          setShowCustomerDropdown(false);
                          setAddresses(customer.addresses || []);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${newInvoice.customer === customer._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
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
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!newInvoice.address ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
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
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${newInvoice.address === address.id.toString() ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.dueDate ? 'border-red-500' : 'border-gray-300'}`}
                required
              />
              {formErrors.dueDate && (
                <p className="text-red-500 text-xs mt-1">{formErrors.dueDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference No
              </label>
              <input
                type="text"
                placeholder='Reference No'
                value={newInvoice.referenceNo}
                onChange={e => setNewInvoice({ ...newInvoice, referenceNo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Date</label>
              <input
                type="date"
                value={newInvoice.referenceDate}
                onChange={e => setNewInvoice({ ...newInvoice, referenceDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
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
                    {/* Product and Description Row */}
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
                                        <div className="text-xs text-gray-500">₹{`${product?.price?.toLocaleString()} • Part No: ${product?.partNo || ''}`}</div>
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
                        {stockInfo && (
                          <div className="text-xs mt-1">
                            <span className={stockInfo.available === 0 ? 'text-red-600 font-bold' : stockInfo.isValid ? 'text-gray-500' : 'text-red-600 font-semibold'}>
                              Available: {stockInfo.available} units
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details Row */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">HSN/SAC</label>
                        <input
                          type="text"
                          value={item.hsnNumber || ''}
                          onChange={(e) => updateInvoiceItem(index, 'hsnNumber', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="HSN/SAC"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Part No</label>
                        <input
                          type="text"
                          value={item.partNo || ''}
                          onChange={(e) => updateInvoiceItem(index, 'partNo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Part number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">UOM</label>
                        <div className="relative">
                          <button
                            onClick={() => setShowUomDropdowns({
                              ...showUomDropdowns,
                              [index]: !showUomDropdowns[index]
                            })}
                            className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400"
                          >
                            <span className="text-gray-700">{item.uom || 'nos'}</span>
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

                    {/* Price Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={item.discount || ''}
                          onChange={(e) => updateInvoiceItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total (₹)</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
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
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{calculateSubtotal().toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Tax:</span>
                  <span className="font-medium">₹{calculateTotalTax().toLocaleString() || 0}</span>
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
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="flex flex-col gap-2">
            <div className="text-sm text-gray-600">
              <span className='text-md font-bold text-gray-900'>Amount in Words: </span>
              <span className="text-sm text-gray-700 font-medium max-w-xs text-right">
                {calculateGrandTotal() ? numberToWords(calculateGrandTotal()) : 'Zero Rupees Only'}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              {newInvoice.items.length} item(s) • Total: ₹{calculateGrandTotal().toLocaleString()}
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => navigate('/billing')}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isEditMode ? 'Update Invoice' : 'Create Invoice'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm; 