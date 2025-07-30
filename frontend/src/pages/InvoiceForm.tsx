import React, { useState, useEffect, useRef } from 'react';
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
  Edit,
  FileText,
  CheckCircle,
  Package
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import PageHeader from '../components/ui/PageHeader';
import { apiClient } from '../utils/api';
import { RootState } from '../redux/store';
import toast from 'react-hot-toast';
import {
  calculateQuotationTotals,
  sanitizeQuotationData,
  getDefaultQuotationData,
  type QuotationData,
  type QuotationItem,
  type ValidationError,
  validateQuotationData
} from '../utils/quotationUtils';
import { numberToWords } from '../utils';

// Types
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

const InvoiceFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Determine if this is edit mode
  const isEditMode = Boolean(id);

  // 🚀 INVOICE TYPE HANDLING - Get invoice type from location state or URL params
  const getInvoiceType = (): 'quotation' | 'sale' | 'purchase' | 'challan' => {
    // First check location state (from InvoiceManagement)
    if (location.state?.invoiceType) {
      return location.state.invoiceType;
    }

    // Check URL params for invoice type
    const urlParams = new URLSearchParams(window.location.search);
    const typeFromUrl = urlParams.get('type');
    if (typeFromUrl && ['quotation', 'sale', 'purchase', 'challan'].includes(typeFromUrl)) {
      return typeFromUrl as 'quotation' | 'sale' | 'purchase' | 'challan';
    }

    // Default to sale invoice
    return 'sale';
  };

  const invoiceType = getInvoiceType();

  // 🎯 CONDITIONAL LOGIC BASED ON INVOICE TYPE
  const isDeliveryChallan = invoiceType === 'challan';
  const isQuotation = invoiceType === 'quotation';
  const isSalesInvoice = invoiceType === 'sale';
  const isPurchaseInvoice = invoiceType === 'purchase';

  // 🎯 GET INVOICE TYPE TITLE FOR DISPLAY
  const getInvoiceTypeTitle = (): string => {
    switch (invoiceType) {
      case 'challan':
        return 'Delivery Challan';
      case 'quotation':
        return 'Quotation';
      case 'sale':
        return 'Sales Invoice';
      case 'purchase':
        return 'Purchase Invoice';
      default:
        return 'Invoice';
    }
  };

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
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
  const [showUomDropdowns, setShowUomDropdowns] = useState<Record<number, boolean>>({});

  // Form states - Using QuotationData structure adapted for invoices
  const [formData, setFormData] = useState<Partial<QuotationData>>({
    ...getDefaultQuotationData(),
    // Override with invoice-specific defaults
    issueDate: new Date(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    validityPeriod: 30,
    notes: '',
    terms: ''
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // Excel-like navigation states for dropdown fields
  const [highlightedLocationIndex, setHighlightedLocationIndex] = useState(-1);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
  const [highlightedAddressIndex, setHighlightedAddressIndex] = useState(-1);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState<Record<number, number>>({});
  const [locationSearchTerm, setLocationSearchTerm] = useState('');

  // Search states
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});
  const [uomSearchTerms, setUomSearchTerms] = useState<Record<number, string>>({});

  // Stock validation states
  const [stockValidation, setStockValidation] = useState<Record<number, {
    available: number;
    isValid: boolean;
    message: string;
  }>>({});

  // Product stock cache for dropdown display
  const [productStockCache, setProductStockCache] = useState<Record<string, {
    available: number;
    isValid: boolean;
    message: string;
  }>>({});

  // Invoice specific state - Conditional based on invoice type
  const [reduceStock, setReduceStock] = useState(!isDeliveryChallan); // Don't reduce stock for delivery challan

  // UOM options
  const UOM_OPTIONS = [
    'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos'
  ];

  // Initialize data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Auto-focus location field when form loads (Excel-like behavior)
  useEffect(() => {
    if (!loading) {
      const focusFields = () => {
        const locationInput = document.querySelector('[data-field="location"]') as HTMLInputElement | null;
        const customerInput = document.querySelector('[data-field="customer"]') as HTMLInputElement | null;

        if (locationInput) {
          if (locationInput.value.trim()) {
            // Location already selected, move focus to customer
            if (customerInput) {
              customerInput.focus();
              customerInput.select();
              return;
            }
          } else {
            // Location not selected, focus it
            locationInput.focus();
            locationInput.select();
            return;
          }
        }
      };

      // Try immediate
      focusFields();

      // Fallbacks to handle rendering delays
      setTimeout(focusFields, 50);
      setTimeout(focusFields, 200);
    }
  }, [loading]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowCustomerDropdown(false);
        setShowLocationDropdown(false);
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

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll({limit: 100, page: 1});
      const responseData = response.data as any;
      const customersData = responseData.customers || responseData || [];
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  // Fixed fetchProducts function with deduplication
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
      console.log(`Loaded ${productsData.length} unique products`);
      setProducts(productsData);

      // Pre-load stock info for all products if location is selected
      if (formData.location && productsData.length > 0) {
        // Load ALL stock for this location - much faster
        setTimeout(() => {
          loadAllStockForLocation();
        }, 200);
      }
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
          setFormData(prev => ({ ...prev, location: mainOffice._id }));
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

        // Auto-populate company settings if not in edit mode
        if (!isEditMode) {
          setFormData(prev => ({
            ...prev,
            company: {
              name: companySettings.companyName || 'Sun Power Services',
              address: companySettings.companyAddress || '',
              phone: companySettings.companyPhone || '',
              email: companySettings.companyEmail || '',
              pan: companySettings.companyPan || '',
              bankDetails: {
                bankName: companySettings.companyBankDetails?.bankName || '',
                accountNo: companySettings.companyBankDetails?.accNo || '',
                ifsc: companySettings.companyBankDetails?.ifscCode || '',
                branch: companySettings.companyBankDetails?.branch || ''
              }
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching general settings:', error);
    }
  };

  // Enhanced getFilteredProducts function with deduplication
  const getFilteredProducts = (searchTerm: string = '') => {
    if (!searchTerm || searchTerm.trim() === '') return products;

    const term = searchTerm.toLowerCase().trim();

    // Create a Map to deduplicate products by _id (additional safety)
    const uniqueProducts = new Map();

    products.forEach(product => {
      if (!uniqueProducts.has(product._id)) {
        uniqueProducts.set(product._id, product);
      }
    });

    // Convert back to array and filter
    const uniqueProductsArray = Array.from(uniqueProducts.values());

    return uniqueProductsArray.filter(product => {
      const name = product.name?.toLowerCase() || '';
      const partNo = product.partNo?.toLowerCase() || '';
      const category = product.category?.toLowerCase() || '';
      const brand = product.brand?.toLowerCase() || '';

      return name.includes(term) ||
        partNo.includes(term) ||
        category.includes(term) ||
        brand.includes(term) ||
        name.startsWith(term) ||
        partNo.startsWith(term);
    }).sort((a, b) => {
      // Prioritize exact matches and starts-with matches
      const aName = a.name?.toLowerCase() || '';
      const aPartNo = a.partNo?.toLowerCase() || '';
      const bName = b.name?.toLowerCase() || '';
      const bPartNo = b.partNo?.toLowerCase() || '';

      // Exact matches first
      if (aName === term && bName !== term) return -1;
      if (bName === term && aName !== term) return 1;
      if (aPartNo === term && bPartNo !== term) return -1;
      if (bPartNo === term && aPartNo !== term) return 1;

      // Then starts-with matches
      if (aName.startsWith(term) && !bName.startsWith(term)) return -1;
      if (bName.startsWith(term) && !aName.startsWith(term)) return 1;
      if (aPartNo.startsWith(term) && !bPartNo.startsWith(term)) return -1;
      if (bPartNo.startsWith(term) && !aPartNo.startsWith(term)) return 1;

      return aName.localeCompare(bName);
    });
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
    return customer ? `${customer.name} - ${customer.email || ''}` : 'Select customer';
  };

  const getLocationLabel = (value: string) => {
    if (!value) return 'Select location';
    const location = locations.find(l => l._id === value);
    return location ? `${location.name}` : 'Select location';
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

  const getProductPartNo = (productId: string) => {
    if (!productId) return '';
    const product = products.find(p => p._id === productId);
    return product?.partNo || '';
  };

  const addInvoiceItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          product: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 0,
          discount: 0,
          partNo: '',
          hsnCode: '',
          hsnNumber: '',
          uom: 'nos',
          discountedAmount: 0,
          taxAmount: 0,
          totalPrice: 0
        }
      ]
    }));
  };

  const removeInvoiceItem = (index: number) => {
    // setFormData(prev => {
    //   const currentItems = prev.items || [];

    //   // Don't allow removing the last item - always keep at least one
    //   if (currentItems.length <= 1) {
    //     toast.error('Cannot remove the last item. At least one item is required.', { duration: 3000 });
    //     return prev;
    //   }

    //   // Remove the item at the specified index
    //   const filteredItems = currentItems.filter((_, i) => i !== index);

    //   // Recalculate totals with the remaining items
    //   const calculationResult = calculateQuotationTotals(filteredItems);

    //   return {
    //     ...prev,
    //     items: calculationResult.items,
    //     subtotal: calculationResult.subtotal,
    //     totalDiscount: calculationResult.totalDiscount,
    //     totalTax: calculationResult.totalTax,
    //     grandTotal: calculationResult.grandTotal,
    //     roundOff: calculationResult.roundOff
    //   };
    // });
    setFormData(prev => {
      const currentItems = prev.items || [];
      const newItems = currentItems.filter((_, i) => i !== index);

      // If we're removing the last item, add a new empty row
      if (newItems.length === 0) {
        newItems.push({
          product: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 0,
          discount: 0,
          partNo: '',
          hsnCode: '',
          hsnNumber: '',
          uom: 'nos',
          discountedAmount: 0,
          taxAmount: 0,
          totalPrice: 0
        });
      }

      return {
        ...prev,
        items: newItems
      };
    });

    // Clear stock validation for the removed item and reindex remaining items
    setStockValidation(prev => {
      const newValidation: any = {};
      Object.keys(prev).forEach(key => {
        const itemIndex = parseInt(key);
        if (itemIndex < index) {
          // Keep items before the removed index
          newValidation[itemIndex] = prev[itemIndex];
        } else if (itemIndex > index) {
          // Shift items after the removed index down by 1
          newValidation[itemIndex - 1] = prev[itemIndex];
        }
        // Skip the removed item (itemIndex === index)
      });
      return newValidation;
    });

    // Success notification
    toast.success('Item removed successfully', { duration: 2000 });
  };

  const extractGSTRate = (gst: string | number | undefined): number => {
    if (!gst) return 0;
    if (typeof gst === 'number') return gst;
    const match = gst.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  const updateInvoiceItem = (index: number, field: keyof QuotationItem, value: any) => {
    setFormData(prev => {
      const updatedItems = [...(prev.items || [])];
      updatedItems[index] = { ...updatedItems[index], [field]: value };

      // Auto-populate price, description, etc. when product is selected
      if (field === 'product') {
        const productObj = products.find(p => p._id === value);
        if (productObj) {
          updatedItems[index].unitPrice = productObj.price;
          updatedItems[index].description = productObj.name;
          updatedItems[index].taxRate = extractGSTRate(productObj.gst);
          updatedItems[index].partNo = productObj.partNo || '';
          updatedItems[index].hsnNumber = productObj.hsnNumber || '';
          updatedItems[index].uom = productObj.uom || 'nos';
        }

        // 🚨 AUTO-SET QUANTITY TO 0 FOR OUT-OF-STOCK PRODUCTS
        if (productStockCache[value]) {
          const stockInfo = productStockCache[value];
          if (stockInfo.available === 0) {
            updatedItems[index].quantity = 0;
            if (isDeliveryChallan) {
              // toast.error(`${productObj?.name || 'Product'} is out of stock. Quantity set to 0 for delivery challan.`, { duration: 3000 });
            }
            // For other invoice types, the toast is handled elsewhere
          }
        }

        validateStockForItem(index, value, updatedItems[index].quantity);
      }

      if (field === 'quantity') {
        validateStockForItem(index, updatedItems[index].product, value);
      }

      // Recalculate totals
      const calculationResult = calculateQuotationTotals(updatedItems);

      return {
        ...prev,
        items: calculationResult.items,
        subtotal: calculationResult.subtotal,
        totalDiscount: calculationResult.totalDiscount,
        totalTax: calculationResult.totalTax,
        grandTotal: calculationResult.grandTotal,
        roundOff: calculationResult.roundOff
      };
    });
  };

  const validateStockForItem = async (itemIndex: number, productId: string, quantity: number) => {
    if (!productId || !formData.location || quantity <= 0) {
      setStockValidation(prev => ({
        ...prev,
        [itemIndex]: { available: 0, isValid: true, message: '' }
      }));
      return;
    }

    try {
      const response = await apiClient.stock.getStock({
        product: productId,
        location: formData.location
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

      // Also cache this stock info for dropdown display
      setProductStockCache(prev => ({
        ...prev,
        [productId]: { available, isValid: quantity <= available, message }
      }));
    } catch (error) {
      console.error('Error validating stock:', error);
      setStockValidation(prev => ({
        ...prev,
        [itemIndex]: { available: 0, isValid: false, message: 'Unable to check stock' }
      }));
    }
  };

  // Load ALL stock data for a location - FASTEST approach
  const loadAllStockForLocation = async () => {
    if (!formData.location) return;

    try {
      // Get ALL stock data for this location in ONE API call - no limits
      const response = await apiClient.stock.getStock({
        location: formData.location,
        limit: 10000 // Get all stock items for this location
      });

      // Parse the stock data correctly from API response
      let stockData: any[] = [];
      if (response.data?.stockLevels && Array.isArray(response.data.stockLevels)) {
        stockData = response.data.stockLevels;
      }

      console.log('✅ Loaded stock data for location:', stockData.length, 'items');

      // Create complete stock cache for ALL products at this location
      const newStockCache: any = {};
      stockData.forEach(stock => {
        const productId = stock.product?._id || stock.product;
        if (productId) {
          // Calculate available quantity correctly
          const totalQuantity = Number(stock.quantity) || 0;
          const reservedQuantity = Number(stock.reservedQuantity) || 0;
          const available = Math.max(0, totalQuantity - reservedQuantity);

          newStockCache[productId] = {
            available,
            isValid: available > 0,
            message: available === 0 ? 'Out of stock' : `${available} available`,
            totalQuantity,
            reservedQuantity
          };
        }
      });

      // For products not in stock at this location, set as out of stock
      products.forEach(product => {
        if (!newStockCache[product._id]) {
          newStockCache[product._id] = {
            available: 0,
            isValid: false,
            message: 'Out of stock',
            totalQuantity: 0,
            reservedQuantity: 0
          };
        }
      });

      // Update cache with complete stock data
      setProductStockCache(newStockCache);
      console.log('✅ Stock cache updated for', Object.keys(newStockCache).length, 'products');

    } catch (error) {
      console.error('❌ Error loading stock for location:', error);

      // Set all products as unable to check stock on error
      const errorStockCache: any = {};
      products.forEach(product => {
        errorStockCache[product._id] = {
          available: 0,
          isValid: false,
          message: 'Unable to check stock',
          totalQuantity: 0,
          reservedQuantity: 0
        };
      });
      setProductStockCache(errorStockCache);
    }
  };

  // Load stock for individual product (fallback for single product validation)
  const getProductStockInfo = async (productId: string) => {
    if (!productId || !formData.location) return null;

    // If already cached, return immediately
    if (productStockCache[productId]) {
      return productStockCache[productId];
    }

    // If stock cache is empty, load all stock for location
    if (Object.keys(productStockCache).length === 0) {
      await loadAllStockForLocation();
    }
    return productStockCache[productId] || { available: 0, isValid: false, message: 'Unable to check stock' };
  };

  const validateForm = (): boolean => {
    const validation = validateQuotationData(formData);

    // 🚨 FILTER OUT QUANTITY VALIDATION FOR OUT-OF-STOCK PRODUCTS
    let filteredErrors = validation.errors;

    if ((reduceStock || isDeliveryChallan) && formData.location) {
      filteredErrors = validation.errors.filter(error => {
        // Check if this is a quantity validation error
        if (error.field.includes('.quantity') && error.message.includes('Quantity must be greater than 0')) {
          // Extract the item index from the field name like "items[0].quantity"
          const match = error.field.match(/items\[(\d+)\]\.quantity/);
          if (match) {
            const itemIndex = parseInt(match[1]);
            const item = formData.items?.[itemIndex];

            if (item?.product) {
              const stockInfo = productStockCache[item.product];
              // If product is out of stock, ignore the quantity validation error
              if (stockInfo && stockInfo.available === 0 && item.quantity === 0) {
                return false; // Filter out this error
              }
            }
          }
        }
        return true; // Keep other errors
      });
    }

    setErrors(filteredErrors);
    return filteredErrors.length === 0;
  };

  // Helper function to check if there are any stock issues
  const getStockIssues = (): { hasIssues: boolean; issueCount: number } => {
    if (!reduceStock || !formData.location) return { hasIssues: false, issueCount: 0 };

    let issueCount = 0;
    for (const item of formData.items || []) {
      if (item.product && item.quantity > 0) {
        const stockInfo = productStockCache[item.product];
        if (stockInfo && Number(item.quantity) > stockInfo.available) {
          issueCount++;
        }
      }
    }

    return { hasIssues: issueCount > 0, issueCount };
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    // 🔍 STOCK VALIDATION: Check if stock reduction is enabled and validate stock availability
    if (reduceStock && formData.location) {
      const stockErrors: string[] = [];

      for (const item of formData.items || []) {
        if (item.product && item.quantity > 0) {
          const stockInfo = productStockCache[item.product];
          if (stockInfo) {
            const requestedQty = Number(item.quantity);
            const availableQty = stockInfo.available;

            if (requestedQty > availableQty) {
              const productName = products.find(p => p._id === item.product)?.name || 'Unknown Product';
              stockErrors.push(`${productName}: Requested ${requestedQty}, but only ${availableQty} available`);
            }
          }
        }
      }

      if (stockErrors.length > 0) {
        toast.error(
          `Insufficient stock for the following items:\n${stockErrors.join('\n')}\n\nPlease reduce quantities or uncheck "Reduce Stock from Inventory"`,
          { duration: 6000 }
        );
        setSubmitting(false);
        return;
      }
    }

    setSubmitting(true);
    try {
      // Ensure company information is included
      const submissionData = {
        ...formData,
        company: formData.company || {
          name: generalSettings?.companyName || 'Sun Power Services',
          address: generalSettings?.companyAddress || '',
          phone: generalSettings?.companyPhone || '',
          email: generalSettings?.companyEmail || '',
          pan: generalSettings?.companyPan || '',
          bankDetails: {
            bankName: generalSettings?.companyBankDetails?.bankName || '',
            accountNo: generalSettings?.companyBankDetails?.accNo || '',
            ifsc: generalSettings?.companyBankDetails?.ifscCode || '',
            branch: generalSettings?.companyBankDetails?.branch || ''
          }
        }
      };

      // Sanitize data before sending - converting to invoice format
      const sanitizedData = sanitizeQuotationData(submissionData);

      // Convert to invoice format with proper invoice type
      const invoiceData = {
        customer: sanitizedData.customer?._id || '',
        dueDate: sanitizedData.validUntil ? new Date(sanitizedData.validUntil).toISOString() : new Date().toISOString(),
        invoiceType: invoiceType, // Use the actual invoice type
        location: sanitizedData.location || '',
        notes: sanitizedData.notes || '',
        items: (sanitizedData.items || []).map((item: any) => ({
          product: item.product,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate || 0),
          discount: Number(item.discount || 0),
          uom: item.uom || 'nos',
          partNo: item.partNo || '',
          hsnSac: item.hsnNumber || ''
        })),
        customerAddress: sanitizedData.customerAddress,
        reduceStock: reduceStock
      };

      if (isEditMode) {
        await apiClient.invoices.update(id!, invoiceData);
        toast.success(`${getInvoiceTypeTitle()} updated successfully!`);
      } else {
        await apiClient.invoices.create(invoiceData);
        toast.success(`${getInvoiceTypeTitle()} created successfully!`);
      }

      navigate('/billing');
    } catch (error) {
      console.error(`Error saving ${getInvoiceTypeTitle().toLowerCase()}:`, error);
      toast.error(`Failed to ${isEditMode ? 'update' : 'create'} ${getInvoiceTypeTitle().toLowerCase()}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  // Safe date conversion helper to prevent "Invalid time value" errors
  const formatDateForInput = (dateValue: any): string => {
    if (!dateValue) return '';

    try {
      const date = new Date(dateValue);
      // Check if the date is valid
      if (isNaN(date.getTime())) return '';

      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  // 🚀 EXCEL-LIKE DROPDOWN NAVIGATION FUNCTIONS

  // Location dropdown keyboard navigation
  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    const filteredLocations = locations.filter(location =>
      location.name.toLowerCase().includes(locationSearchTerm.toLowerCase())
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showLocationDropdown) {
        setShowLocationDropdown(true);
        const currentLocationIndex = filteredLocations.findIndex(loc => loc._id === formData.location);
        const startIndex = currentLocationIndex >= 0 ? currentLocationIndex : 0;
        setHighlightedLocationIndex(startIndex);
      } else {
        const newIndex = highlightedLocationIndex < filteredLocations.length - 1 ? highlightedLocationIndex + 1 : 0;
        setHighlightedLocationIndex(newIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showLocationDropdown) {
        setShowLocationDropdown(true);
        const currentLocationIndex = filteredLocations.findIndex(loc => loc._id === formData.location);
        const startIndex = currentLocationIndex >= 0 ? currentLocationIndex : filteredLocations.length - 1;
        setHighlightedLocationIndex(startIndex);
      } else {
        const newIndex = highlightedLocationIndex > 0 ? highlightedLocationIndex - 1 : filteredLocations.length - 1;
        setHighlightedLocationIndex(newIndex);
      }
    } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();

      if (showLocationDropdown && highlightedLocationIndex >= 0 && filteredLocations[highlightedLocationIndex]) {
        const selectedLocation = filteredLocations[highlightedLocationIndex];
        setFormData({ ...formData, location: selectedLocation._id });
        setShowLocationDropdown(false);
        setHighlightedLocationIndex(-1);
        setLocationSearchTerm('');
        // Clear stock cache when location changes
        setProductStockCache({});
        setStockValidation({});

        // Load ALL stock for this location
        setTimeout(() => {
          loadAllStockForLocation();
        }, 100);
      }

      setTimeout(() => {
        const customerInput = document.querySelector('[data-field="customer"]') as HTMLInputElement;
        if (customerInput) customerInput.focus();
      }, 50);

    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      console.log('Location is the first field - nowhere to go back to');
    } else if (e.key === 'Escape') {
      setShowLocationDropdown(false);
      setHighlightedLocationIndex(-1);
    }
  };

  // Customer dropdown keyboard navigation
  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
    const filteredCustomers = customers.filter(customer =>
      customer.type === 'customer' && (
        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase())
      )
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showCustomerDropdown) {
        setShowCustomerDropdown(true);
        setHighlightedCustomerIndex(0);
      } else {
        const newIndex = highlightedCustomerIndex < filteredCustomers.length - 1 ? highlightedCustomerIndex + 1 : 0;
        setHighlightedCustomerIndex(newIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showCustomerDropdown) {
        setShowCustomerDropdown(true);
        setHighlightedCustomerIndex(filteredCustomers.length - 1);
      } else {
        const newIndex = highlightedCustomerIndex > 0 ? highlightedCustomerIndex - 1 : filteredCustomers.length - 1;
        setHighlightedCustomerIndex(newIndex);
      }
    } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (showCustomerDropdown && highlightedCustomerIndex >= 0 && filteredCustomers[highlightedCustomerIndex]) {
        const selectedCustomer = filteredCustomers[highlightedCustomerIndex];
        setFormData({
          ...formData,
          customer: {
            _id: selectedCustomer._id,
            name: selectedCustomer.name,
            email: selectedCustomer.email,
            phone: selectedCustomer.phone,
            pan: ''
          }
        });
        setShowCustomerDropdown(false);
        setHighlightedCustomerIndex(-1);
        setCustomerSearchTerm('');
        setAddresses(selectedCustomer.addresses || []);

        setTimeout(() => {
          const addressInput = document.querySelector('[data-field="customer-address"]') as HTMLInputElement;
          if (addressInput) addressInput.focus();
        }, 50);
      } else if (!showCustomerDropdown) {
        setTimeout(() => {
          const addressInput = document.querySelector('[data-field="customer-address"]') as HTMLInputElement;
          if (addressInput) addressInput.focus();
        }, 50);
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      setTimeout(() => {
        const locationInput = document.querySelector('[data-field="location"]') as HTMLInputElement;
        if (locationInput) locationInput.focus();
      }, 50);
    } else if (e.key === 'Escape') {
      setShowCustomerDropdown(false);
      setHighlightedCustomerIndex(-1);
    }
  };

  // Address dropdown keyboard navigation
  const handleAddressKeyDown = (e: React.KeyboardEvent) => {
    if (!formData.customer?._id) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showAddressDropdown) {
        setShowAddressDropdown(true);
        setHighlightedAddressIndex(0);
      } else {
        const newIndex = highlightedAddressIndex < addresses.length - 1 ? highlightedAddressIndex + 1 : 0;
        setHighlightedAddressIndex(newIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showAddressDropdown) {
        setShowAddressDropdown(true);
        setHighlightedAddressIndex(addresses.length - 1);
      } else {
        const newIndex = highlightedAddressIndex > 0 ? highlightedAddressIndex - 1 : addresses.length - 1;
        setHighlightedAddressIndex(newIndex);
      }
    } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault();
      if (showAddressDropdown && highlightedAddressIndex >= 0 && addresses[highlightedAddressIndex]) {
        const selectedAddress = addresses[highlightedAddressIndex];
        setFormData({
          ...formData,
          customerAddress: {
            address: selectedAddress.address,
            state: selectedAddress.state,
            district: selectedAddress.district,
            pincode: selectedAddress.pincode,
            ...(selectedAddress.id && { addressId: selectedAddress.id })
          } as any
        });
        setShowAddressDropdown(false);
        setHighlightedAddressIndex(-1);

        setTimeout(() => {
          const dueDateInput = document.querySelector('[data-field="due-date"]') as HTMLInputElement;
          if (dueDateInput) dueDateInput.focus();
        }, 50);
      } else if (!showAddressDropdown) {
        setTimeout(() => {
          const dueDateInput = document.querySelector('[data-field="due-date"]') as HTMLInputElement;
          if (dueDateInput) dueDateInput.focus();
        }, 50);
      }
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      setTimeout(() => {
        const customerInput = document.querySelector('[data-field="customer"]') as HTMLInputElement;
        if (customerInput) customerInput.focus();
      }, 50);
    } else if (e.key === 'Escape') {
      setShowAddressDropdown(false);
      setHighlightedAddressIndex(-1);
    }
  };

  // Enhanced Excel-like keyboard navigation for products
  const handleProductKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    const searchTerm = productSearchTerms[rowIndex] || '';
    const matchingProducts = getFilteredProducts(searchTerm);
    const currentHighlighted = highlightedProductIndex[rowIndex] ?? -1;

    // Ctrl+Delete or Command+Delete: Remove current row
    if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
      e.preventDefault();
      removeInvoiceItem(rowIndex);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Tab: Move to previous row's discount field
        if (rowIndex > 0) {
          const prevDiscountInput = document.querySelector(`[data-row="${rowIndex - 1}"][data-field="discount"]`) as HTMLInputElement;
          if (prevDiscountInput) {
            prevDiscountInput.focus();
            prevDiscountInput.select();
          }
        } else {
          // If first row, move to due date field
          setTimeout(() => {
            const dueDateInput = document.querySelector('[data-field="due-date"]') as HTMLInputElement;
            if (dueDateInput) dueDateInput.focus();
          }, 50);
        }
        return;
      }

      // Auto-select highlighted product or first match if there's a search term
      if (matchingProducts.length > 0) {
        const selectedProduct = currentHighlighted >= 0 && currentHighlighted < matchingProducts.length
          ? matchingProducts[currentHighlighted]
          : matchingProducts[0];
        updateInvoiceItem(rowIndex, 'product', selectedProduct._id);
        updateProductSearchTerm(rowIndex, '');
        setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });
      }

      // Move directly to quantity field
      setTimeout(() => {
        const quantityInput = document.querySelector(`[data-row="${rowIndex}"][data-field="quantity"]`) as HTMLInputElement;
        if (quantityInput) {
          quantityInput.focus();
          quantityInput.select();
        }
      }, 50);

    } else if (e.key === 'Enter') {
      e.preventDefault();

      // Auto-select highlighted product or first match if there's a search term
      if (matchingProducts.length > 0) {
        const selectedProduct = currentHighlighted >= 0 && currentHighlighted < matchingProducts.length
          ? matchingProducts[currentHighlighted]
          : matchingProducts[0];
        updateInvoiceItem(rowIndex, 'product', selectedProduct._id);
        updateProductSearchTerm(rowIndex, '');
        setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });

        // Move directly to quantity field in same row
        setTimeout(() => {
          const quantityInput = document.querySelector(`[data-row="${rowIndex}"][data-field="quantity"]`) as HTMLInputElement;
          if (quantityInput) {
            quantityInput.focus();
            quantityInput.select();
          }
        }, 100);
      } else {
        // If no search term, just move to next row
        const nextRowIndex = rowIndex + 1;
        setTimeout(() => {
          // const nextInput = document.querySelector(`[data-row="${nextRowIndex}"][data-field="product"]`) as HTMLInputElement;
          // if (nextInput) nextInput.focus();
          const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
          if (notesInput) notesInput.focus();
        }, 100);
      }

    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showProductDropdowns[rowIndex] && matchingProducts.length > 0) {
        const newIndex = currentHighlighted < 0 ? 0 : Math.min(currentHighlighted + 1, matchingProducts.length - 1);
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: newIndex });

        // Scroll to highlighted item
        setTimeout(() => {
          const highlightedElement = document.querySelector(`[data-dropdown="${rowIndex}"] [data-product-index="${newIndex}"]`);
          if (highlightedElement) {
            highlightedElement.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
            });
          }
        }, 10);
      }

    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showProductDropdowns[rowIndex] && matchingProducts.length > 0) {
        const newIndex = currentHighlighted < 0 ? 0 : Math.max(currentHighlighted - 1, 0);
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: newIndex });

        // Scroll to highlighted item
        setTimeout(() => {
          const highlightedElement = document.querySelector(`[data-dropdown="${rowIndex}"] [data-product-index="${newIndex}"]`);
          if (highlightedElement) {
            highlightedElement.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
            });
          }
        }, 10);
      }

    } else if (e.key === 'Escape') {
      setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
      updateProductSearchTerm(rowIndex, '');
      setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });
    }
  };

  // Quantity field keyboard navigation with arrow key increment/decrement
  const handleQuantityKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    const currentItem = formData.items?.[rowIndex];
    const currentQuantity = currentItem?.quantity || 1;

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      let newQuantity = currentQuantity + 1;

      // 🚨 PREVENT INCREASING QUANTITY FOR OUT-OF-STOCK PRODUCTS
      if (currentItem?.product && productStockCache[currentItem.product]) {
        const stockInfo = productStockCache[currentItem.product];
        if (stockInfo.available === 0) {
          newQuantity = 0; // Keep at 0 for out-of-stock products
          if (isDeliveryChallan) {
            toast.error('Cannot increase quantity - product is out of stock for delivery challan', { duration: 2000 });
          } else if (reduceStock) {
            toast.error('Cannot increase quantity - product is out of stock', { duration: 2000 });
          }
        } else if (newQuantity > stockInfo.available) {
          // Allow increasing up to available stock, but show warning if exceeding
          newQuantity = stockInfo.available;
          toast.error(`Maximum available quantity is ${stockInfo.available}`, { duration: 2000 });
        }
      }

      updateInvoiceItem(rowIndex, 'quantity', newQuantity);

    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      let newQuantity = Math.max(1, currentQuantity - 1); // Minimum quantity is 1

      // 🚨 FORCE TO 0 FOR OUT-OF-STOCK PRODUCTS
      if (currentItem?.product && productStockCache[currentItem.product]) {
        const stockInfo = productStockCache[currentItem.product];
        if (stockInfo.available === 0) {
          newQuantity = 0; // Force to 0 for out-of-stock products
        }
      }

      updateInvoiceItem(rowIndex, 'quantity', newQuantity);

    } else if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Tab: Move back to same row's product field
        setTimeout(() => {
          const productInput = document.querySelector(`[data-row="${rowIndex}"][data-field="product"]`) as HTMLInputElement;
          if (productInput) {
            productInput.focus();
            productInput.select();
          }
        }, 50);
        return;
      }

      // 🚀 AUTO-ROW FEATURE: Add new row when Tab is pressed on last row's quantity field
      if (rowIndex === (formData.items || []).length - 1) {
        addInvoiceItem();
      }

      // Tab: Move to next row's product field
      const nextRowIndex = rowIndex + 1;
      setTimeout(() => {
        const nextInput = document.querySelector(`[data-row="${nextRowIndex}"][data-field="product"]`) as HTMLInputElement;
        if (nextInput) nextInput.focus();
      }, 100);

    } else if (e.key === 'Enter') {
      e.preventDefault();

      // 🚀 AUTO-ROW FEATURE: Add new row when Enter is pressed on last row's quantity field
      // if (rowIndex === (formData.items || []).length - 1) {
      //   addInvoiceItem();
      // }

      // // Move to next row's product field
      // const nextRowIndex = rowIndex + 1;
      setTimeout(() => {
        // const nextInput = document.querySelector(`[data-row="${nextRowIndex}"][data-field="product"]`) as HTMLInputElement;
        // if (nextInput) nextInput.focus();
        const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
        if (notesInput) notesInput.focus();
      }, 100);
    }
  };

  // Enhanced cell navigation for Excel-like behavior
  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, field: string) => {
    const fields = ['product', 'description', 'hsnNumber', 'taxRate', 'quantity', 'uom', 'unitPrice', 'discount'];
    const currentFieldIndex = fields.indexOf(field);

    // Ctrl+Delete or Command+Delete: Remove current row
    if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
      e.preventDefault();
      removeInvoiceItem(rowIndex);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Tab: Move to previous field
        let prevFieldIndex = currentFieldIndex - 1;
        let targetRow = rowIndex;

        if (prevFieldIndex < 0) {
          // Move to last field of previous row
          if (rowIndex > 0) {
            prevFieldIndex = fields.length - 1;
            targetRow = rowIndex - 1;
          } else {
            // If at first row, first field, move to Due Date field
            setTimeout(() => {
              const dueDateInput = document.querySelector('[data-field="due-date"]') as HTMLInputElement;
              if (dueDateInput) dueDateInput.focus();
            }, 50);
            return;
          }
        }

        const prevField = fields[prevFieldIndex];
        setTimeout(() => {
          const prevInput = document.querySelector(`[data-row="${targetRow}"][data-field="${prevField}"]`) as HTMLInputElement;
          if (prevInput) prevInput.focus();
        }, 50);
      } else {
        // Tab: Move to next field
        let nextFieldIndex = currentFieldIndex + 1;
        let targetRow = rowIndex;

        if (nextFieldIndex >= fields.length) {
          // Move to first field of next row, or to Notes if last row
          if (targetRow === (formData.items || []).length - 1) {
            // Last row, last field - move to Notes
            setTimeout(() => {
              const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
              if (notesInput) notesInput.focus();
            }, 50);
            return;
          } else {
            nextFieldIndex = 0;
            targetRow = rowIndex + 1;
          }
        }

        const nextField = fields[nextFieldIndex];
        setTimeout(() => {
          const nextInput = document.querySelector(`[data-row="${targetRow}"][data-field="${nextField}"]`) as HTMLInputElement;
          if (nextInput) nextInput.focus();
        }, 50);
      }

    } else if (e.key === 'Enter') {
      e.preventDefault();

      // Enter: Move to same field in next row, or Notes if last row
      // if (rowIndex === (formData.items || []).length - 1) {
      //   // Last row - move to Notes
      //   setTimeout(() => {
      //     const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
      //     if (notesInput) notesInput.focus();
      //   }, 100);
      // } else {
      //   const nextRowIndex = rowIndex + 1;
      //   setTimeout(() => {
      //     const nextInput = document.querySelector(`[data-row="${nextRowIndex}"][data-field="${field}"]`) as HTMLInputElement;
      //     if (nextInput) nextInput.focus();
      //   }, 100);
      // }
      setTimeout(() => {
        const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
        if (notesInput) notesInput.focus();
      }, 100);

    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        const prevInput = document.querySelector(`[data-row="${rowIndex - 1}"][data-field="${field}"]`) as HTMLInputElement;
        if (prevInput) prevInput.focus();
      } else {
        // If at first row, move to corresponding header field
        if (field === 'product') {
          const dueDateInput = document.querySelector('[data-field="due-date"]') as HTMLInputElement;
          if (dueDateInput) dueDateInput.focus();
        }
      }

    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < (formData.items || []).length - 1) {
        const nextRowIndex = rowIndex + 1;
        setTimeout(() => {
          const nextInput = document.querySelector(`[data-row="${nextRowIndex}"][data-field="${field}"]`) as HTMLInputElement;
          if (nextInput) nextInput.focus();
        }, 100);
      } else {
        // If at last row, move to Notes
        setTimeout(() => {
          const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
          if (notesInput) notesInput.focus();
        }, 100);
      }
    }
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
        title={isEditMode ? `Edit ${getInvoiceTypeTitle()}` : `Create ${getInvoiceTypeTitle()}`}
        subtitle={isEditMode ? `Modify ${getInvoiceTypeTitle().toLowerCase()} details` : `Create a new ${getInvoiceTypeTitle().toLowerCase()}`}
      >
        <div className="flex space-x-3">
          <Button
            onClick={() => navigate('/billing')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Billing</span>
          </Button>
        </div>
      </PageHeader>

      {/* 🚀 EXCEL-LIKE NAVIGATION GUIDE */}
      <div className={`bg-gradient-to-r border rounded-lg p-4 ${isDeliveryChallan ? 'from-orange-50 to-amber-50 border-orange-200' :
        isQuotation ? 'from-blue-50 to-indigo-50 border-blue-200' :
          isSalesInvoice ? 'from-green-50 to-emerald-50 border-green-200' :
            'from-purple-50 to-violet-50 border-purple-200'
        }`}>
        <div className="flex items-center mb-2">
          <span className="text-lg">⚡</span>
          <h3 className={`text-sm font-semibold ml-2 ${isDeliveryChallan ? 'text-orange-900' :
            isQuotation ? 'text-blue-900' :
              isSalesInvoice ? 'text-green-900' :
                'text-purple-900'
            }`}>
            Excel-Like {getInvoiceTypeTitle()} Form Enabled!
          </h3>
        </div>
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 text-xs ${isDeliveryChallan ? 'text-orange-800' :
          isQuotation ? 'text-blue-800' :
            isSalesInvoice ? 'text-green-800' :
              'text-purple-800'
          }`}>
          <div>
            <p className="font-medium mb-1">🎯 Complete Form Navigation:</p>
            <p><kbd className={`px-1 py-0.5 rounded text-xs ${isDeliveryChallan ? 'bg-orange-200' :
              isQuotation ? 'bg-blue-200' :
                isSalesInvoice ? 'bg-green-200' :
                  'bg-purple-200'
              }`}>Tab/Enter</kbd> Move forward</p>
            {/* <p><kbd className={`px-1 py-0.5 rounded text-xs ${isDeliveryChallan ? 'bg-orange-200' :
                isQuotation ? 'bg-blue-200' :
                  isSalesInvoice ? 'bg-green-200' :
                    'bg-purple-200'
              }`}>Shift+Tab</kbd> Move backward</p> */}
            <p><kbd className={`px-1 py-0.5 rounded text-xs ${isDeliveryChallan ? 'bg-orange-200' :
              isQuotation ? 'bg-blue-200' :
                isSalesInvoice ? 'bg-green-200' :
                  'bg-purple-200'
              }`}>↑↓</kbd> Navigate dropdowns</p>
          </div>
          <div>
            <p className="font-medium mb-1">🔥 Super Fast {getInvoiceTypeTitle()} Flow:</p>
            <p>Location → Customer → Address → {isDeliveryChallan ? 'Delivery Date' : 'Due Date'} → {getInvoiceTypeTitle()} Items</p>
            <p><strong>{getInvoiceTypeTitle()} Items:</strong> Search → Select → Quantity → Auto Next Row</p>
            {isDeliveryChallan && (
              <p className="text-xs mt-1 font-medium">📦 <strong>Delivery Challan:</strong> No stock reduction, delivery tracking only</p>
            )}
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Form Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm font-medium mb-2">Please fix the following errors:</p>
              <ul className="text-red-600 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Customer and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Location *
              </label>
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={locationSearchTerm || getLocationLabel(formData.location || '')}
                  onChange={(e) => {
                    setLocationSearchTerm(e.target.value);
                    if (!showLocationDropdown) setShowLocationDropdown(true);
                    setHighlightedLocationIndex(-1);
                  }}
                  onFocus={() => {
                    setShowLocationDropdown(true);
                    setHighlightedLocationIndex(-1);
                    if (!locationSearchTerm && formData.location) {
                      setLocationSearchTerm('');
                    }
                  }}
                  autoComplete="off"
                  onKeyDown={handleLocationKeyDown}
                  placeholder="Search location or press ↓ to open"
                  data-field="location"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showLocationDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                    </div>

                    <button
                      onClick={() => {
                        setFormData({ ...formData, location: '' });
                        setShowLocationDropdown(false);
                        setLocationSearchTerm('');
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.location ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      Select location
                    </button>

                    {locations.filter(location =>
                      location.name.toLowerCase().includes(locationSearchTerm.toLowerCase())
                    ).map((location, index) => (
                      <button
                        key={location._id}
                        data-location-index={index}
                        onClick={() => {
                          setFormData({ ...formData, location: location._id });
                          setShowLocationDropdown(false);
                          setLocationSearchTerm('');
                          setHighlightedLocationIndex(-1);
                          // Clear stock cache when location changes
                          setProductStockCache({});
                          setStockValidation({});

                          // Load ALL stock for this location
                          setTimeout(() => {
                            loadAllStockForLocation();
                          }, 100);
                        }}
                        className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.location === location._id ? 'bg-blue-100 text-blue-800' :
                          highlightedLocationIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                            'text-gray-700 hover:bg-gray-50'
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer *
              </label>
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={customerSearchTerm || getCustomerLabel(formData.customer?._id || '')}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    if (!showCustomerDropdown) setShowCustomerDropdown(true);
                    setHighlightedCustomerIndex(-1);
                  }}
                  onFocus={() => {
                    setShowCustomerDropdown(true);
                    setHighlightedCustomerIndex(-1);
                  }}
                  onKeyDown={handleCustomerKeyDown}
                  placeholder="Search customer or press ↓ to open"
                  data-field="customer"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                    </div>

                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          customer: { _id: '', name: '', email: '', phone: '', pan: '' },
                          customerAddress: { address: '', state: '', district: '', pincode: '' }
                        });
                        setShowCustomerDropdown(false);
                        setCustomerSearchTerm('');
                        setAddresses([]);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.customer?._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      Select customer
                    </button>

                    {customers.filter(customer =>
                      customer.type === 'customer' && (
                        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                        customer.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                      )
                    ).map((customer, index) => (
                      <button
                        key={customer._id}
                        data-customer-index={index}
                        onClick={() => {
                          setFormData({
                            ...formData,
                            customer: {
                              _id: customer._id,
                              name: customer.name,
                              email: customer.email,
                              phone: customer.phone,
                              pan: ''
                            }
                          });
                          setShowCustomerDropdown(false);
                          setCustomerSearchTerm('');
                          setHighlightedCustomerIndex(-1);
                          setAddresses(customer.addresses || []);
                        }}
                        className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.customer?._id === customer._id ? 'bg-blue-100 text-blue-800' :
                          highlightedCustomerIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                            'text-gray-700 hover:bg-gray-50'
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer Address *
              </label>
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={getAddressLabel((formData.customerAddress as any)?.addressId?.toString())}
                  readOnly
                  disabled={!formData.customer?._id}
                  onFocus={() => {
                    if (formData.customer?._id) {
                      setShowAddressDropdown(true);
                      setHighlightedAddressIndex(-1);
                    }
                  }}
                  onKeyDown={handleAddressKeyDown}
                  placeholder={!formData.customer?._id ? "Select customer first" : "Press ↓ to open address list"}
                  data-field="customer-address"
                  className={`w-full px-3 py-2 pr-10 border rounded-lg transition-colors ${!formData.customer?._id
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                    }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAddressDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showAddressDropdown && formData.customer?._id && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          customerAddress: { address: '', state: '', district: '', pincode: '' }
                        });
                        setShowAddressDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.customerAddress?.address ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      Select address
                    </button>

                    {addresses.map((address, index) => (
                      <button
                        key={address.id}
                        onClick={() => {
                          setFormData({
                            ...formData,
                            customerAddress: {
                              address: address.address,
                              state: address.state,
                              district: address.district,
                              pincode: address.pincode,
                              ...(address.id && { addressId: address.id })
                            } as any
                          });
                          setShowAddressDropdown(false);
                          setHighlightedAddressIndex(-1);
                        }}
                        className={`w-full px-3 py-2 text-left transition-colors text-sm ${(formData.customerAddress as any)?.addressId === address.id ? 'bg-blue-100 text-blue-800' :
                          highlightedAddressIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                            'text-gray-700 hover:bg-gray-50'
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
                {isDeliveryChallan ? 'Delivery Date *' : 'Due Date *'}
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.validUntil)}
                onChange={(e) => {
                  if (e.target.value) {
                    setFormData({ ...formData, validUntil: new Date(e.target.value) });
                  } else {
                    setFormData({ ...formData, validUntil: undefined });
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
                    e.preventDefault();
                    // Move to first product field in the list
                    setTimeout(() => {
                      const firstProductInput = document.querySelector(`[data-row="0"][data-field="product"]`) as HTMLInputElement;
                      if (firstProductInput) firstProductInput.focus();
                    }, 50);
                  } else if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    // Move back to address field
                    setTimeout(() => {
                      const addressInput = document.querySelector('[data-field="customer-address"]') as HTMLInputElement;
                      if (addressInput) addressInput.focus();
                    }, 50);
                  }
                }}
                data-field="due-date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.issueDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setFormData({ ...formData, issueDate: new Date(e.target.value) });
                  } else {
                    setFormData({ ...formData, issueDate: undefined });
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Stock Reduction Option - Conditional based on invoice type */}
          {!isDeliveryChallan && (
            <div className={`border rounded-lg p-4 ${isQuotation ? 'bg-blue-50 border-blue-200' :
              isSalesInvoice ? 'bg-green-50 border-green-200' :
                'bg-purple-50 border-purple-200'
              }`}>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={reduceStock}
                  onChange={(e) => setReduceStock(e.target.checked)}
                  className={`w-4 h-4 border-gray-300 rounded focus:ring-2 ${isQuotation ? 'text-blue-600 focus:ring-blue-500' :
                    isSalesInvoice ? 'text-green-600 focus:ring-green-500' :
                      'text-purple-600 focus:ring-purple-500'
                    }`}
                />
                <div>
                  <div className={`text-sm font-medium ${isQuotation ? 'text-blue-900' :
                    isSalesInvoice ? 'text-green-900' :
                      'text-purple-900'
                    }`}>
                    {isQuotation ? 'Reduce inventory stock' : 'Reduce inventory stock'}
                  </div>
                  <div className={`text-xs ${isQuotation ? 'text-blue-700' :
                    isSalesInvoice ? 'text-green-700' :
                      'text-purple-700'
                    }`}>
                    {isQuotation
                      ? 'Automatically reduce stock quantities when quotation is converted to invoice'
                      : 'Automatically reduce stock quantities when invoice is created'
                    }
                  </div>
                </div>
              </label>

              {(() => {
                const { hasIssues, issueCount } = getStockIssues();
                if (hasIssues) {
                  return (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-red-700 font-medium">
                          ⚠️ Stock Warning: {issueCount} item{issueCount > 1 ? 's' : ''} exceed{issueCount === 1 ? 's' : ''} available inventory
                        </span>
                      </div>
                      <p className="text-xs text-red-600 mt-1">
                        Please reduce quantities or uncheck stock reduction to proceed.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          )}

          {/* Delivery Challan Info */}
          {isDeliveryChallan && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <Package className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-orange-900">Delivery Challan Mode</div>
                  <div className="text-xs text-orange-700">
                    📦 This is a delivery tracking document. Stock quantities will NOT be reduced from inventory.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Excel-Style Items Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{getInvoiceTypeTitle()} Items</h3>
              <button
                onClick={addInvoiceItem}
                type="button"
                className={`text-white px-4 py-2 rounded-lg transition-colors text-sm flex items-center space-x-2 ${isDeliveryChallan ? 'bg-orange-600 hover:bg-orange-700' :
                  isQuotation ? 'bg-blue-600 hover:bg-blue-700' :
                    isSalesInvoice ? 'bg-green-600 hover:bg-green-700' :
                      'bg-purple-600 hover:bg-purple-700'
                  }`}
              >
                <Plus className="w-4 h-4" />
                <span>Add Row</span>
              </button>
            </div>

            {/* Excel-style Table */}
            <div className="border border-gray-300 rounded-lg bg-white shadow-sm">
              {/* Table Header */}
              <div className="bg-gray-50 border-b border-gray-300">
                <div className="grid text-xs font-semibold text-gray-700 uppercase tracking-wide"
                  style={{ gridTemplateColumns: '60px 300px 1fr 100px 80px 100px 80px 120px 110px 120px 80px' }}>
                  <div className="p-3 border-r border-gray-300 text-center">S.No</div>
                  <div className="p-3 border-r border-gray-300">Product Code</div>
                  <div className="p-3 border-r border-gray-300">Product Name</div>
                  <div className="p-3 border-r border-gray-300">HSC/SAC</div>
                  <div className="p-3 border-r border-gray-300">GST(%)</div>
                  <div className="p-3 border-r border-gray-300">Quantity</div>
                  <div className="p-3 border-r border-gray-300">UOM</div>
                  <div className="p-3 border-r border-gray-300">Unit Price</div>
                  <div className="p-3 border-r border-gray-300">Discount(%)</div>
                  <div className="p-3 border-r border-gray-300">Total</div>
                  <div className="p-3 text-center">Remove</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {(formData.items || []).map((item, index) => {
                  const stockInfo = stockValidation[index];
                  let rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                  if (stockInfo) {
                    if (stockInfo.available === 0) rowBg = 'bg-red-100';
                    else if (!stockInfo.isValid) rowBg = 'bg-yellow-100';
                    else if (stockInfo.available > 0) rowBg = 'bg-green-50';
                  }

                  return (
                    <div key={index} className={`grid group hover:bg-blue-50 transition-colors ${rowBg}`}
                      style={{ gridTemplateColumns: '60px 300px 1fr 100px 80px 100px 80px 120px 110px 120px 80px' }}>
                      {/* S.No */}
                      <div className="p-2 border-r border-gray-200 text-center text-sm font-medium text-gray-600 flex items-center justify-center">
                        {index + 1}
                      </div>

                      {/* Product */}
                      <div className="p-1 border-r border-gray-200 relative">
                        <input
                          type="text"
                          value={productSearchTerms[index] || getProductPartNo(item.product)}
                          onChange={(e) => {
                            updateProductSearchTerm(index, e.target.value);
                            setShowProductDropdowns({
                              ...showProductDropdowns,
                              [index]: true
                            });
                            setHighlightedProductIndex({
                              ...highlightedProductIndex,
                              [index]: -1
                            });

                            // Load all stock for location if not already loaded
                            if (formData.location && Object.keys(productStockCache).length === 0) {
                              loadAllStockForLocation();
                            }
                          }}
                          onFocus={() => {
                            if (!productSearchTerms[index] && !item.product) {
                              updateProductSearchTerm(index, '');
                            }
                            setShowProductDropdowns({
                              ...showProductDropdowns,
                              [index]: true
                            });

                            // Load all stock for location if not already loaded
                            if (formData.location && Object.keys(productStockCache).length === 0) {
                              loadAllStockForLocation();
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              setShowProductDropdowns({
                                ...showProductDropdowns,
                                [index]: false
                              });
                            }, 200);
                          }}
                          onKeyDown={(e) => handleProductKeyDown(e, index)}
                          data-row={index}
                          data-field="product"
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50"
                          placeholder="Type to search..."
                          autoComplete="off"
                        />
                        {showProductDropdowns[index] && (
                          <div
                            className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-[400px] overflow-hidden"
                            data-dropdown={index}
                            style={{ width: '500px', minWidth: '500px' }}
                          >
                            <div className="p-2 border-b border-gray-200 bg-gray-50">
                              <div className="text-xs text-gray-600">
                                {getFilteredProducts(productSearchTerms[index] || '').length} products found
                                {productSearchTerms[index] && (
                                  <span className="ml-2 text-blue-600 font-medium">
                                    for "{productSearchTerms[index]}"
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="overflow-y-auto max-h-96">
                              {getFilteredProducts(productSearchTerms[index] || '').length === 0 ? (
                                <div className="px-3 py-4 text-center text-sm text-gray-500">
                                  <div>No products found</div>
                                  <div className="text-xs mt-1">Try different search terms</div>
                                </div>
                              ) : (
                                getFilteredProducts(productSearchTerms[index] || '').map((product, productIndex) => (
                                  <button
                                    key={product._id}
                                    data-product-index={productIndex}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      updateInvoiceItem(index, 'product', product._id);
                                      setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                      updateProductSearchTerm(index, '');
                                      setHighlightedProductIndex({ ...highlightedProductIndex, [index]: -1 });
                                      setTimeout(() => {
                                        const quantityInput = document.querySelector(`[data-row="${index}"][data-field="quantity"]`) as HTMLInputElement;
                                        if (quantityInput) {
                                          quantityInput.focus();
                                          quantityInput.select();
                                        }
                                      }, 50);
                                    }}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${item.product === product._id ? 'bg-blue-100 text-blue-800' :
                                      highlightedProductIndex[index] === productIndex ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                        'text-gray-700'
                                      } ${productIndex === 0 && productSearchTerms[index] && highlightedProductIndex[index] === -1 ? 'bg-yellow-50 border-l-4 border-l-blue-500' : ''}`}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1 min-w-0 pr-4">
                                        <div className="font-medium text-gray-900 mb-1 flex items-center">
                                          <div><span className="font-medium">Part No:</span> {product?.partNo}</div>
                                          {highlightedProductIndex[index] === productIndex && (
                                            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                              Selected - Press Enter
                                            </span>
                                          )}
                                          {productIndex === 0 && productSearchTerms[index] && highlightedProductIndex[index] === -1 && (
                                            <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                              Best match
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-600 space-y-0.5">
                                          <div><span className="font-medium">Product Name:</span> {product?.name || 'N/A'}</div>
                                          <div>
                                            <span className="font-medium">Brand:</span> {product?.brand || 'N/A'} •
                                            <span className="font-medium">Category:</span> {product?.category || 'N/A'}
                                          </div>
                                          {(() => {
                                            const productStock = productStockCache[product._id];
                                            if (productStock) {
                                              return (
                                                <div className="text-xs mt-1">
                                                  <span className={productStock.available === 0 ? 'text-red-600 font-bold' : productStock.isValid ? 'text-green-600' : 'text-yellow-600 font-semibold'}>
                                                    Stock: {productStock.available} available
                                                  </span>
                                                </div>
                                              );
                                            }
                                            // No loading indicator - stock loads quickly now
                                            return null;
                                          })()}
                                        </div>
                                      </div>
                                      <div className="text-right flex-shrink-0 ml-4">
                                        <div className="font-bold text-lg text-green-600">₹{product?.price?.toLocaleString()}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">per unit</div>
                                      </div>
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      <div className="p-1 border-r border-gray-200">
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, index, 'description')}
                            data-row={index}
                            data-field="description"
                            className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50"
                            placeholder="Description"
                            disabled={true}
                          />
                          {stockInfo && item.product && (
                            <div className="flex-shrink-0">
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${stockInfo.available === 0
                                ? 'bg-red-100 text-red-800'
                                : !stockInfo.isValid
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                                }`}>
                                {stockInfo.available === 0
                                  ? 'Out of Stock'
                                  : `${stockInfo.available} in stock`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* HSC/SAC */}
                      <div className="p-1 border-r border-gray-200">
                        <input
                          type="text"
                          value={item.hsnNumber || ''}
                          onChange={(e) => updateInvoiceItem(index, 'hsnNumber', e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'hsnNumber')}
                          data-row={index}
                          data-field="hsnNumber"
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50"
                          placeholder="HSN"
                          disabled={true}
                        />
                      </div>

                      {/* GST */}
                      <div className="p-1 border-r border-gray-200">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.taxRate || 0}
                          onChange={(e) => updateInvoiceItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'taxRate')}
                          data-row={index}
                          data-field="taxRate"
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 text-right"
                          placeholder="0.00"
                          disabled={true}
                        />
                      </div>

                      {/* Quantity */}
                      <div className="p-1 border-r border-gray-200 relative">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => {
                            let newQuantity = parseFloat(e.target.value) || 0;

                            if (item.product && productStockCache[item.product]) {
                              const stockInfo = productStockCache[item.product];
                              const available = stockInfo.available;

                              // Out of stock → quantity forced to 0
                              if (available === 0) {
                                if (newQuantity > 0) {
                                  if (isDeliveryChallan) {
                                    toast.error('This product is out of stock. Quantity set to 0 for delivery challan.', { duration: 2000 });
                                  } else if (reduceStock) {
                                    toast.error('This product is out of stock. Quantity set to 0.', { duration: 2000 });
                                  }
                                }
                                newQuantity = 0;
                              } else if (newQuantity > stockInfo.available) {
                                // Allow increasing up to available stock, but show warning if exceeding
                                newQuantity = stockInfo.available;
                                toast.error(`Maximum available quantity is ${stockInfo.available}`, { duration: 2000 });
                            }
                              // In stock → prevent quantity = 0 (only for stock-reducing invoices)
                              else if (reduceStock && newQuantity === 0) {
                                toast.error('Quantity cannot be zero for in-stock products.', { duration: 2000 });
                                return; // Don't update if invalid
                              }
                            }

                            updateInvoiceItem(index, 'quantity', newQuantity);
                          }}
                          onKeyDown={(e) => handleQuantityKeyDown(e, index)}
                          data-row={index}
                          data-field="quantity"
                          className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 text-right ${item.product && productStockCache[item.product] ? (
                            productStockCache[item.product].available === 0
                              ? 'bg-red-50 text-red-600 font-bold cursor-not-allowed'
                              : item.quantity > 0 && Number(item.quantity) > productStockCache[item.product].available
                                ? 'text-red-600 font-bold'
                                : ''
                          ) : ''
                            }`}
                          placeholder="1.00"
                          title={
                            item.product && productStockCache[item.product]?.available === 0
                              ? isDeliveryChallan
                                ? "Product is out of stock - quantity locked at 0 for delivery challan"
                                : "Product is out of stock - quantity locked at 0"
                              : "Tab/Enter adds new row | ↑↓ arrows: adjust quantity | Shift+Tab: back to product"
                          }
                        />

                        {/* Warning: Quantity exceeds available stock */}
                        {item.product &&
                          item.quantity > 0 &&
                          productStockCache[item.product] &&
                          Number(item.quantity) > productStockCache[item.product].available && (
                            <div
                              className="absolute -bottom-1 right-1 bg-red-500 text-white text-xs px-1 rounded"
                              title={`Only ${productStockCache[item.product].available} available`}
                            >
                              !
                            </div>
                          )}
                      </div>


                      {/* UOM */}
                      <div className="p-1 border-r border-gray-200 relative">
                        <input
                          type="text"
                          value={item.uom || 'nos'}
                          onClick={() => setShowUomDropdowns({
                            ...showUomDropdowns,
                            [index]: !showUomDropdowns[index]
                          })}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'uom')}
                          data-row={index}
                          data-field="uom"
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 cursor-pointer"
                          disabled={true}
                        />
                        {showUomDropdowns[index] && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                            {['nos', 'kg', 'litre', 'meter', 'sq.ft', 'pieces'].map(uomOption => (
                              <button
                                key={uomOption}
                                onClick={() => {
                                  updateInvoiceItem(index, 'uom', uomOption);
                                  setShowUomDropdowns({ ...showUomDropdowns, [index]: false });
                                }}
                                className="w-full px-3 py-2 text-left hover:bg-blue-50 text-sm"
                              >
                                {uomOption}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div className="p-1 border-r border-gray-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice.toFixed(2)}
                          onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'unitPrice')}
                          data-row={index}
                          data-field="unitPrice"
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 text-right"
                          placeholder="0.00"
                          disabled={true}
                        />
                      </div>

                      {/* Discount */}
                      <div className="p-1 border-r border-gray-200">
                        <input
                          type="number"
                          step="1"
                          value={item.discount === 0 ? '' : item.discount}
                          onChange={(e) => updateInvoiceItem(index, 'discount', parseFloat(e.target.value) || 0)}
                          // onKeyDown={(e) => handleCellKeyDown(e, index, 'discount')}
                          data-row={index}
                          data-field="discount"
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 text-right"
                          placeholder="0.00"
                        />
                      </div>

                      {/* Total */}
                      <div className="p-1 border-r border-gray-200">
                        <div className="p-2 text-sm text-right font-bold text-blue-600">
                          ₹{item.totalPrice?.toFixed(2) || '0.00'}
                        </div>
                      </div>

                      <div className="p-1 relative">
                        {/* {(formData.items || []).length > 1 ? (
                          <button
                            onClick={() => removeInvoiceItem(index)}
                            className="w-full h-full p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex items-center justify-center group"
                            title="Remove this item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        ) : (
                          <div className="w-full h-full p-2 text-gray-300 flex items-center justify-center" title="Cannot remove the last item">
                            <X className="w-4 h-4" />
                          </div>
                        )} */}
                        <button
                          onClick={() => removeInvoiceItem(index)}
                          className="w-full h-full p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors flex items-center justify-center group"
                          title="Remove this item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation Hints */}
              <div className="bg-gray-50 border-t border-gray-200 p-3 text-center">
                <div className="text-sm text-gray-600 mb-1">
                  <strong>🚀 Excel-Like {getInvoiceTypeTitle()} Items:</strong> Search → Select → Set Quantity → Tab/Enter → Auto Next Row
                </div>
                <div className="text-xs text-gray-500 mb-1">
                  <kbd className="px-1 py-0.5 bg-gray-200 rounded">Type</kbd> Search Product →
                  <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">↑↓</kbd> Navigate List →
                  <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Enter</kbd> Select →
                  <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Set</kbd> Quantity →
                  <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Tab/Enter</kbd> Auto Add Row
                </div>
                <div className="text-xs text-gray-400">
                  ⚡ <strong>Complete Excel-like {getInvoiceTypeTitle().toLowerCase()} form navigation!</strong>
                  {!isDeliveryChallan && ' • Stock validation enabled for accurate invoicing'}
                  {isDeliveryChallan && ' • Delivery tracking mode - no stock reduction'}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && e.shiftKey) {
                  e.preventDefault();
                  const lastRowIndex = (formData.items || []).length - 1;
                  setTimeout(() => {
                    const lastQuantityInput = document.querySelector(`[data-row="${lastRowIndex}"][data-field="quantity"]`) as HTMLInputElement;
                    if (lastQuantityInput) lastQuantityInput.focus();
                  }, 50);
                } else if (e.key === 'Tab' && !e.shiftKey) {
                  e.preventDefault();
                  setTimeout(() => {
                    const createButton = document.querySelector('[data-action="create"]') as HTMLButtonElement;
                    if (createButton) createButton.focus();
                  }, 50);
                }
              }}

              rows={3}
              data-field="notes"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Additional notes..."
            />
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{formData.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Tax:</span>
                  <span className="font-medium">₹{formData.totalTax?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Discount:</span>
                  <span className="font-medium text-green-600">-₹{formData.totalDiscount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-3">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">₹{formData.grandTotal?.toFixed(2) || '0.00'}</span>
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
                  {formData.grandTotal ? numberToWords(formData.grandTotal) : 'Zero Rupees Only'}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {(formData.items || []).length} item(s) • Total: ₹{formData.grandTotal?.toFixed(2) || '0.00'}
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
                data-action="create"
                className={`px-6 py-2 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2 ${isDeliveryChallan ? 'bg-orange-600 hover:bg-orange-700' :
                  isQuotation ? 'bg-blue-600 hover:bg-blue-700' :
                    isSalesInvoice ? 'bg-green-600 hover:bg-green-700' :
                      'bg-purple-600 hover:bg-purple-700'
                  }`}
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isEditMode ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEditMode ? `Update ${getInvoiceTypeTitle()}` : `Create ${getInvoiceTypeTitle()}`}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceFormPage; 