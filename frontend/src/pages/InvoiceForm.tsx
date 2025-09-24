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
  Package,
  QrCode
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import PageHeader from '../components/ui/PageHeader';
import { apiClient } from '../utils/api';
import { RootState } from 'store';
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
import { Address } from '../types';

// Types
interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  type: string;
  addresses?: Address[];
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
  aggregatedStock?: {
    totalAvailable: number;
    totalQuantity: number;
    totalReserved: number;
    stockDetails: Array<{
      location: string;
      room: string;
      rack: string;
      available: number;
    }>;
  };
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

  // 🎯 HANDLE QUOTATION DATA FROM LOCATION STATE
  const quotationData = location.state?.quotationData;

  console.log("quotationData:",quotationData);
  
  // 🎯 CHECK IF INVOICE IS FROM QUOTATION
  const isFromQuotation = quotationData?.sourceQuotation ? true : false;

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

  // Engine serial number dropdown states
  const [showEngineSerialDropdown, setShowEngineSerialDropdown] = useState(false);
  const [engineSerialSearchTerm, setEngineSerialSearchTerm] = useState('');
  const [highlightedEngineSerialIndex, setHighlightedEngineSerialIndex] = useState(-1);
  const [dgDetailsWithServiceData, setDgDetailsWithServiceData] = useState<any[]>([]);

  // Custom dropdown states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string | undefined>(undefined);
  const [isCustomerSearchMode, setIsCustomerSearchMode] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showBillToAddressDropdown, setShowBillToAddressDropdown] = useState(false);
  const [showShipToAddressDropdown, setShowShipToAddressDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);
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
    terms: '',
    // New fields from quotation
    subject: '',
    engineSerialNumber: '',
    kva: '',
    hourMeterReading: '',
    serviceRequestDate: undefined,
    qrCodeImage: '',
    serviceCharges: [],
    batteryBuyBack: {
      description: '',
      quantity: 0,
      unitPrice: 0,
      discount: 0,
      discountedAmount: 0,
      taxRate: 0,
      taxAmount: 0,
      totalPrice: 0
    }
    // Note: Quotation data will be set in useEffect after loading
  });
  const [errors, setErrors] = useState<ValidationError[]>([]);

  console.log("formData:",formData);
  
  // Excel-like navigation states for dropdown fields
  const [highlightedLocationIndex, setHighlightedLocationIndex] = useState(-1);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
  const [highlightedAddressIndex, setHighlightedAddressIndex] = useState(-1);
  const [highlightedBillToAddressIndex, setHighlightedBillToAddressIndex] = useState(-1);
  const [highlightedShipToAddressIndex, setHighlightedShipToAddressIndex] = useState(-1);
  const [highlightedEngineerIndex, setHighlightedEngineerIndex] = useState(-1);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState<Record<number, number>>({});
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const [engineerSearchTerm, setEngineerSearchTerm] = useState('');

  // Search states
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});
  const [uomSearchTerms, setUomSearchTerms] = useState<Record<number, string>>({});
  
  // Address search terms
  const [billToAddressSearchTerm, setBillToAddressSearchTerm] = useState('');
  const [shipToAddressSearchTerm, setShipToAddressSearchTerm] = useState('');

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
    totalQuantity?: number;
    reservedQuantity?: number;
    stockDetails?: Array<{
      location: string;
      room: string;
      rack: string;
      available: number;
    }>;
  }>>({});

  // Stock loading state
  const [stockLoading, setStockLoading] = useState(false);
  
  // Stock cache version to force re-rendering when cache changes
  const [stockCacheVersion, setStockCacheVersion] = useState(0);

      // Field engineers for sales invoices
  const [fieldOperators, setFieldOperators] = useState<any[]>([]);

  // Invoice specific state - Conditional based on invoice type
  const [reduceStock, setReduceStock] = useState(!isDeliveryChallan); // Don't reduce stock for delivery challan

  // UOM options
  const UOM_OPTIONS = [
    'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos'
  ];

  // QR Code states
  const [qrCodePreview, setQrCodePreview] = useState<string>('');
  const [qrCodeImage, setQrCodeImage] = useState<File | null>(null);

  // QR Code handlers
  const handleQrCodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setQrCodeImage(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setQrCodePreview(result);
        setFormData({ ...formData, qrCodeImage: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleQrCodeDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
  };

  const handleQrCodeDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
  };

  const handleQrCodeDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        setQrCodeImage(file);
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          setQrCodePreview(result);
          setFormData({ ...formData, qrCodeImage: result });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeQrCode = () => {
    setQrCodeImage(null);
    setQrCodePreview('');
    setFormData({ ...formData, qrCodeImage: '' });
  };

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

    // Helper function to map quotation addresses to customer addresses
  const mapQuotationAddressesToCustomerAddresses = (quotationData: any, customerAddresses: any[]) => {
    if (!quotationData.billToAddress || !quotationData.shipToAddress) return {};

    const billToAddress = quotationData.billToAddress;
    const shipToAddress = quotationData.shipToAddress;

    // Find matching addresses in customer addresses
    const billToMatch = customerAddresses.find(addr => 
      addr.address === billToAddress.address &&
      addr.district === billToAddress.district &&
      addr.pincode === billToAddress.pincode
    );

    const shipToMatch = customerAddresses.find(addr => 
      addr.address === shipToAddress.address &&
      addr.district === shipToAddress.district &&
      addr.pincode === shipToAddress.pincode
    );

    return {
      billToAddress: billToMatch ? {
        address: billToMatch.address,
        state: billToMatch.state,
        district: billToMatch.district,
        pincode: billToMatch.pincode,
        gstNumber: billToMatch.gstNumber || '',
        addressId: billToMatch.id
      } : billToAddress,
      shipToAddress: shipToMatch ? {
        address: shipToMatch.address,
        state: shipToMatch.state,
        district: shipToMatch.district,
        pincode: shipToMatch.pincode,
        gstNumber: shipToMatch.gstNumber || '',
        addressId: shipToMatch.id
      } : shipToAddress
    };
  };

  // Handle quotation data initialization
  useEffect(() => {
    if (quotationData && !loading) {
      console.log('InvoiceForm: Received quotation data:', quotationData);
      
      // Check if this is from a quotation (has sourceQuotation field)
      const isFromQuotation = quotationData.sourceQuotation;
      
      // Recalculate totals when quotation data is loaded
      const recalculatedData = calculateQuotationTotals(
        quotationData.items || [], 
        quotationData.serviceCharges || [], 
        quotationData.batteryBuyBack || null,
        quotationData.overallDiscount || 0
      );
      
      console.log('InvoiceForm: Original quotation items:', quotationData.items);
      console.log('InvoiceForm: Recalculated data:', recalculatedData);
      
      setFormData(prev => {
        const updatedData = {
          ...prev,
          customer: quotationData.customer ? (typeof quotationData.customer === 'string' ? { 
            _id: quotationData.customer,
            name: '',
            email: '',
            phone: ''
          } : {
            _id: quotationData.customer._id || quotationData.customer,
            name: quotationData.customer.name || '',
            email: quotationData.customer.email || '', // This will be updated when addresses are loaded
            phone: quotationData.customer.phone || '',
            pan: quotationData.customer.pan || ''
          }) : undefined,
          billToAddress: quotationData.billToAddress,
          shipToAddress: quotationData.shipToAddress,
          assignedEngineer: quotationData.assignedEngineer,
          items: recalculatedData.items, // Use recalculated items with proper totals
          overallDiscount: quotationData.overallDiscount || 0,
          overallDiscountAmount: recalculatedData.overallDiscountAmount || 0,
          notes: quotationData.notes || '',
          terms: quotationData.terms || '',
          location: quotationData.location,
          validUntil: quotationData.dueDate ? new Date(quotationData.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal: recalculatedData.subtotal,
          totalDiscount: recalculatedData.totalDiscount,
          totalTax: recalculatedData.totalTax,
          grandTotal: recalculatedData.grandTotal,
          roundOff: recalculatedData.roundOff,
          // New fields from quotation
          subject: quotationData.subject || '',
          engineSerialNumber: quotationData.engineSerialNumber || '',
          kva: quotationData.kva || '',
          hourMeterReading: quotationData.hourMeterReading || '',
          serviceRequestDate: quotationData.serviceRequestDate ? new Date(quotationData.serviceRequestDate) : undefined,
          qrCodeImage: quotationData.qrCodeImage || '',
          serviceCharges: quotationData.serviceCharges || [],
          batteryBuyBack: quotationData.batteryBuyBack || {
            description: '',
            quantity: 0,
            unitPrice: 0,
            discount: 0,
            discountedAmount: 0,
            taxRate: 0,
            taxAmount: 0,
            totalPrice: 0
          },
          // Add quotation reference fields if this is from a quotation
          ...(isFromQuotation && {
            sourceQuotation: quotationData.sourceQuotation,
            quotationNumber: quotationData.quotationNumber,
            quotationPaymentDetails: quotationData.quotationPaymentDetails
          }),
          // Add PO From Customer data if available
          ...(quotationData.poFromCustomer && {
            poFromCustomer: quotationData.poFromCustomer
          })
        };
        
        console.log('InvoiceForm: Updated form data:', updatedData);
        return updatedData;
      });

      // Load customer addresses if customer is provided
      if (quotationData.customer && customers.length > 0) {
        const customerId = typeof quotationData.customer === 'string' ? quotationData.customer : quotationData.customer._id;
        if (customerId) {
          console.log('InvoiceForm: Loading addresses for customer:', customerId);
          loadCustomerAddresses(customerId);
        }
      }

      // Load stock data if location is available
      if (quotationData.location) {
        console.log('InvoiceForm: Loading stock for location from quotation data:', quotationData.location);
        setTimeout(() => {
          loadAllStockForLocation(quotationData.location);
        }, 500);
      }

      // Initialize QR Code preview if available from quotation
      if (quotationData.qrCodeImage) {
        setQrCodePreview(quotationData.qrCodeImage);
        // Note: We can't restore the original file, but we can show the preview
        console.log('InvoiceForm: QR Code image loaded from quotation');
      }
    }
  }, [quotationData, loading, customers, addresses]);

  // Load addresses when customers are loaded and we have quotation data
  useEffect(() => {
    if (quotationData && customers.length > 0 && !loading) {
      const customerId = typeof quotationData.customer === 'string' ? quotationData.customer : quotationData.customer?._id;
      if (customerId) {
        console.log('InvoiceForm: Loading addresses after customers loaded for customer:', customerId);
        loadCustomerAddresses(customerId);
      }
    }
  }, [customers, quotationData, loading]);

  // Map quotation addresses to customer addresses after addresses are loaded
  useEffect(() => {
    if (quotationData && addresses.length > 0 && !loading) {
      console.log('InvoiceForm: Mapping quotation addresses to customer addresses');
      
      const mappedAddresses = mapQuotationAddressesToCustomerAddresses(quotationData, addresses);
      
      if (Object.keys(mappedAddresses).length > 0) {
        setFormData(prev => ({
          ...prev,
          billToAddress: mappedAddresses.billToAddress || prev.billToAddress,
          shipToAddress: mappedAddresses.shipToAddress || prev.shipToAddress
        }));
        
        console.log('InvoiceForm: Addresses mapped successfully:', mappedAddresses);
      }
      
      // Update customer email to use primary address email
      if (formData.customer?._id && addresses.length > 0) {
        const customer = customers.find(c => c._id === formData.customer?._id);
        if (customer) {
          const primaryAddress = customer.addresses?.find(addr => addr.isPrimary);
          const primaryEmail = primaryAddress?.email || customer.email || '';
          
          if (primaryEmail !== formData.customer?.email) {
            setFormData(prev => ({
              ...prev,
              customer: prev.customer ? {
                ...prev.customer,
                email: primaryEmail
              } : prev.customer
            }));
          }
        }
      }
    }
  }, [addresses, quotationData, loading]);

  // Ensure totals are properly calculated when form data changes
  useEffect(() => {
    if (formData.items && formData.items.length > 0 && !loading) {
      console.log('InvoiceForm: Recalculating totals for current items:', formData.items);
      
      const recalculatedData = calculateQuotationTotals(
        formData.items, 
        formData.serviceCharges || [], 
        formData.batteryBuyBack || null,
        formData.overallDiscount || 0
      );
      
      // Only update if there are significant differences to avoid infinite loops
      if (
        Math.abs((recalculatedData.subtotal || 0) - (formData.subtotal || 0)) > 0.01 ||
        Math.abs((recalculatedData.totalTax || 0) - (formData.totalTax || 0)) > 0.01 ||
        Math.abs((recalculatedData.grandTotal || 0) - (formData.grandTotal || 0)) > 0.01
      ) {
        console.log('InvoiceForm: Updating totals with recalculated data:', recalculatedData);
        setFormData(prev => ({
          ...prev,
          subtotal: recalculatedData.subtotal,
          totalDiscount: recalculatedData.totalDiscount,
          totalTax: recalculatedData.totalTax,
          grandTotal: recalculatedData.grandTotal,
          overallDiscountAmount: recalculatedData.overallDiscountAmount,
          roundOff: recalculatedData.roundOff
        }));
      }
    }
  }, [formData.items, formData.serviceCharges, formData.batteryBuyBack, formData.overallDiscount, loading]);

  // Load stock data when location is available and products are loaded
  useEffect(() => {
    if (formData.location && products.length > 0 && !loading && Object.keys(productStockCache).length === 0) {
      console.log('InvoiceForm: Auto-loading stock for location:', formData.location);
      setTimeout(() => {
        loadAllStockForLocation(formData.location);
      }, 300);
    }
  }, [formData.location, products, loading, productStockCache]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowCustomerDropdown(false);
        setShowLocationDropdown(false);
        setShowProductDropdowns({});
        setShowUomDropdowns({});
        setShowBillToAddressDropdown(false);
        setShowShipToAddressDropdown(false);
        setShowEngineerDropdown(false);
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
        fetchGeneralSettings(),
        fetchFieldEngineers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      // Use non-paginated API to fetch all customers for dropdown
      const response = await apiClient.customers.getAllForDropdown({ type: 'customer' });

      let customersData: Customer[] = [];
      if (response.success && response.data && Array.isArray(response.data)) {
        customersData = response.data as any;
      } else {
        // Fallback to previous shape if needed
        const responseData = response.data as any;
        customersData = (responseData?.customers || responseData || []) as any;
      }

      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  // Fixed fetchProducts function with deduplication and stock aggregation
  const fetchProducts = async (locationId?: string) => {
    try {
      // If location is selected, filter stock by location; otherwise get all stock
      const currentLocation = locationId || formData.location;
      const queryParams = currentLocation 
        ? { limit: 10000, page: 1, location: currentLocation }
        : { limit: 10000, page: 1 };
      
      console.log('🔍 Fetching products with params:', queryParams);
      const response = await apiClient.stock.getStock(queryParams);
      const responseData = response.data as any;

      // Use Map to deduplicate products by ID and aggregate stock
      const uniqueProducts = new Map();
      const stockAggregation = new Map(); // Map to aggregate stock by product ID
      let processedCount = 0;
      let skippedCount = 0;

      if (responseData.stockLevels && Array.isArray(responseData.stockLevels)) {
        console.log(`📦 Processing ${responseData.stockLevels.length} stock levels`);
        responseData.stockLevels.forEach((stock: any) => {
          const productId = stock.product?._id || stock.productId;
          if (productId) {
            // Only process stock for the selected location
            if (currentLocation && stock.location?._id !== currentLocation) {
              skippedCount++;
              return; // Skip this stock item if it's not from the selected location
            }
            
            processedCount++;

            // Aggregate stock data
            if (!stockAggregation.has(productId)) {
              stockAggregation.set(productId, {
                totalAvailable: 0,
                totalQuantity: 0,
                totalReserved: 0,
                stockDetails: []
              });
            }
            
            const aggregatedStock = stockAggregation.get(productId);
            const availableQty = Number(stock.availableQuantity) || 0;
            const totalQty = Number(stock.quantity) || 0;
            const reservedQty = Number(stock.reservedQuantity) || 0;
            
            aggregatedStock.totalAvailable += availableQty;
            aggregatedStock.totalQuantity += totalQty;
            aggregatedStock.totalReserved += reservedQty;
            
            // Store detailed stock info for each location
            if (availableQty > 0) {
              aggregatedStock.stockDetails.push({
                location: stock.location?.name || 'Unknown Location',
                room: stock.room?.name || '',
                rack: stock.rack?.name || '',
                available: availableQty
              });
            }

            // Set product data (only once per product)
            if (!uniqueProducts.has(productId)) {
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
                availableQuantity: 0, // Will be updated with aggregated data
                stockData: stock
              });
            }
          }
        });
      } else if (Array.isArray(responseData)) {
        responseData.forEach(product => {
          if (product._id && !uniqueProducts.has(product._id)) {
            uniqueProducts.set(product._id, product);
          }
        });
      }

      // Update products with aggregated stock data
      const productsData = Array.from(uniqueProducts.values()).map(product => {
        const aggregatedStock = stockAggregation.get(product._id);
        if (aggregatedStock) {
          return {
            ...product,
            availableQuantity: aggregatedStock.totalAvailable,
            aggregatedStock: aggregatedStock
          };
        }
        return product;
      });

      console.log(`📊 Results: Processed ${processedCount} stock items, skipped ${skippedCount} items`);
      console.log(`Loaded ${productsData.length} unique products with aggregated stock${currentLocation ? ` for location: ${currentLocation}` : ' (all locations)'}`);
      setProducts(productsData);

      // Pre-load stock info for all products if location is selected
      if (currentLocation && productsData.length > 0) {
        // Load ALL stock for this location - much faster
        setTimeout(() => {
          loadAllStockForLocation(currentLocation);
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
          
          // Auto-load stock for the default location after a short delay
          setTimeout(() => {
            console.log('InvoiceForm: Auto-loading stock for default location:', mainOffice._id);
            loadAllStockForLocation(mainOffice._id);
          }, 500);
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

  const fetchFieldEngineers = async () => {
    try {
      const response = await apiClient.users.getAllForDropdown();
      
      if (response.success && response.data) {
          const fieldEngineers = response.data.map((engineer: any) => ({
              _id: engineer._id || engineer.id,
              value: engineer._id || engineer.id,
              name: engineer.name || `${engineer.firstName || ''} ${engineer.lastName || ''}`.trim(),
              label: engineer.name || `${engineer.firstName || ''} ${engineer.lastName || ''}`.trim(),
              email: engineer.email,
              phone: engineer.phone,
              firstName: engineer.firstName,
              lastName: engineer.lastName
          }));
          setFieldOperators(fieldEngineers);
      }
    } catch (error) {
      console.error('Error fetching field engineers:', error);
      setFieldOperators([]);
    }
  };



  // Fetch DG details for the selected customer
  const fetchDgDetailsForCustomer = async (customerId: string) => {
    try {
      console.log('Fetching DG details for customer:', customerId);

      // Fetch customer's dgDetails for engine information
      const dgResponse = await apiClient.services.getCustomerEngines(customerId);
      console.log('Full DG Response:', dgResponse);
      const dgData = dgResponse.data as any;
      console.log('DG Data:', dgData);
      const dgDetails = dgData.engines || dgData || [];
      console.log('DG Details array:', dgDetails);
      console.log('DG Details length:', dgDetails.length);

      // Log basic info for debugging
      if (dgDetails.length > 0) {
        console.log('DG Details found:', dgDetails.length);
        console.log('Sample DG detail:', {
          engineSerialNumber: dgDetails[0].engineSerialNumber,
          kva: dgDetails[0].kva
        });
      }

      // If no DG details found, set empty data and return early
      if (!dgDetails || dgDetails.length === 0) {
        console.log('No DG details found for customer');
        setDgDetailsWithServiceData([]);
        return;
      }

      try {
        // Fetch service tickets filtered by customer
        console.log('Fetching service tickets with params:', {
          limit: 100,
          page: 1,
          customer: customerId
        });

        const serviceResponse = await apiClient.services.getAll({
          limit: 100,
          page: 1,
          customer: customerId
        });

        const serviceData = serviceResponse.data as any;
        const customerServiceTickets = serviceData.tickets || serviceData || [];
        console.log('Service tickets found:', customerServiceTickets.length);

        // Combine dgDetails with service ticket data
        const combinedData = dgDetails.map((dg: any) => {
          // Find matching service ticket for this engine
          const matchingServiceTicket = customerServiceTickets.find((ticket: any) =>
            ticket.EngineSerialNumber === dg.engineSerialNumber
          );

          return {
            ...dg,
            // Service ticket data if available
            HourMeterReading: matchingServiceTicket?.HourMeterReading || '',
            ServiceRequestDate: matchingServiceTicket?.ServiceRequestDate || null
          };
        });

        console.log('Combined data ready:', combinedData.length, 'items');
        setDgDetailsWithServiceData(combinedData);
      } catch (serviceError) {
        console.warn('Could not fetch service tickets, using only DG details:', serviceError);
        // If service tickets fail, still show DG details without service data
        const dgOnlyData = dgDetails.map((dg: any) => ({
          ...dg,
          HourMeterReading: '',
          ServiceRequestDate: null
        }));
        setDgDetailsWithServiceData(dgOnlyData);
      }
    } catch (error) {
      console.error('Error fetching customer DG details:', error);
      setDgDetailsWithServiceData([]);
    }
  };

  const loadCustomerAddresses = (customerId: string) => {
    console.log('Loading addresses for customer ID:', customerId);
    const customer = customers.find(c => c._id === customerId);
    if (customer && customer.addresses) {
      console.log('Found customer addresses:', customer.addresses);
      setAddresses(customer.addresses);
    } else {
      console.log('No addresses found for customer:', customerId);
      setAddresses([]);
    }
  };

  // Enhanced getFilteredProducts function with deduplication
  const getFilteredProducts = (searchTerm: string = '') => {
    const term = searchTerm.toLowerCase().trim();

    // Create a Map to deduplicate products by _id (additional safety)
    const uniqueProducts = new Map();

    products.forEach(product => {
      if (!uniqueProducts.has(product._id)) {
        uniqueProducts.set(product._id, product);
      }
    });

    // Convert back to array and filter
    let filteredProducts = Array.from(uniqueProducts.values());

    // If location is selected, filter by stock availability
    if (formData.location && Object.keys(productStockCache).length > 0) {
      filteredProducts = filteredProducts.filter(product => {
        const stockInfo = productStockCache[product._id];
        // Only show products that have stock available at the selected location
        return stockInfo && stockInfo.available > 0;
      });
    }

    // If no search term, return all filtered products
    if (!term) return filteredProducts;

    // Apply search term filtering
    filteredProducts = filteredProducts.filter(product => {
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
    });

    // Sort results
    return filteredProducts.sort((a, b) => {
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
    if (!customer) return 'Select customer';
    
    // Get primary address email if available
    const primaryAddress = customer.addresses?.find(addr => addr.isPrimary);
    const displayEmail = primaryAddress?.email || customer.email || '';
    
    return `${customer.name} - ${displayEmail}`;
  };

  const getLocationLabel = (value: string) => {
    if (!value) return 'Select location';
    const location = locations.find(l => l._id === value);
    return location ? `${location.name}` : 'Select location';
  };

  const getProductLabel = (value: string) => {
    if (!value) return 'Select product';
    const product = products.find(p => p._id === value);
    if (!product) return 'Select product';
    
    const partNo = product.partNo || 'N/A';
    const stockInfo = product.aggregatedStock;
    const totalAvailable = stockInfo?.totalAvailable || 0;
    const locationText = formData.location ? 'at location' : 'total';
    
    return `${partNo} - ${product.name} - ₹${product?.price?.toLocaleString()} (${totalAvailable} ${locationText})`;
  };

  const getAddressLabel = (value: string | undefined, addressType?: 'billTo' | 'shipTo') => {
    if (!value) {
      // If addressType is specified, only return that specific address type
      if (addressType === 'billTo' && formData.billToAddress && formData.billToAddress.address) {
        return `${formData.billToAddress.address} (${formData.billToAddress.district}, ${formData.billToAddress.pincode})`;
      }
      if (addressType === 'shipTo' && formData.shipToAddress && formData.shipToAddress.address) {
        return `${formData.shipToAddress.address} (${formData.shipToAddress.district}, ${formData.shipToAddress.pincode})`;
      }
      
      // Legacy behavior for backwards compatibility when no addressType is specified
      if (!addressType) {
        if (formData.billToAddress && formData.billToAddress.address) {
          return `${formData.billToAddress.address} (${formData.billToAddress.district}, ${formData.billToAddress.pincode})`;
        }
        if (formData.shipToAddress && formData.shipToAddress.address) {
          return `${formData.shipToAddress.address} (${formData.shipToAddress.district}, ${formData.shipToAddress.pincode})`;
        }
      }
      
      return 'Select address';
    }
    
    const address = addresses.find(a => a.id === parseInt(value));
    if (address) {
      return `${address.address} (${address.district}, ${address.pincode})`;
    }
    
    // Fallback to direct address objects only if addressType matches
    if (addressType === 'billTo' && formData.billToAddress && formData.billToAddress.address) {
      return `${formData.billToAddress.address} (${formData.billToAddress.district}, ${formData.billToAddress.pincode})`;
    }
    if (addressType === 'shipTo' && formData.shipToAddress && formData.shipToAddress.address) {
      return `${formData.shipToAddress.address} (${formData.shipToAddress.district}, ${formData.shipToAddress.pincode})`;
    }
    
    // Legacy fallback when no addressType is specified
    if (!addressType) {
      if (formData.billToAddress && formData.billToAddress.address) {
        return `${formData.billToAddress.address} (${formData.billToAddress.district}, ${formData.billToAddress.pincode})`;
      }
      if (formData.shipToAddress && formData.shipToAddress.address) {
        return `${formData.shipToAddress.address} (${formData.shipToAddress.district}, ${formData.shipToAddress.pincode})`;
      }
    }
    
    return 'Unknown address';
  };

  const getProductPartNo = (productId: string) => {
    if (!productId) return '';
    const product = products.find(p => p._id === productId);
    return product?.partNo || '';
  };

  const getEngineerLabel = (value: string) => {
    if (!value) return '';
    const engineer = fieldOperators.find(e => e._id === value);
    return engineer ? `${engineer.firstName} ${engineer.lastName}` : '';
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

    // Initialize stock validation for the new item if stock data is available
    setTimeout(() => {
      const newItemIndex = (formData.items || []).length;
      if (formData.location && Object.keys(productStockCache).length > 0) {
        setStockValidation(prev => ({
          ...prev,
          [newItemIndex]: { available: 0, isValid: true, message: '' }
        }));
      }
    }, 100);
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

      // Recalculate totals with current overall discount
      const calculationResult = calculateQuotationTotals(
        newItems, 
        prev.serviceCharges || [], 
        prev.batteryBuyBack || null,
        prev.overallDiscount || 0
      );

      return {
        ...prev,
        items: newItems,
        subtotal: calculationResult.subtotal,
        totalDiscount: calculationResult.totalDiscount,
        totalTax: calculationResult.totalTax,
        grandTotal: calculationResult.grandTotal,
        overallDiscountAmount: calculationResult.overallDiscountAmount,
        roundOff: calculationResult.roundOff
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

      // Recalculate totals with current overall discount
      const calculationResult = calculateQuotationTotals(
        updatedItems, 
        prev.serviceCharges || [], 
        prev.batteryBuyBack || null,
        prev.overallDiscount || 0
      );

      return {
        ...prev,
        items: calculationResult.items,
        subtotal: calculationResult.subtotal,
        totalDiscount: calculationResult.totalDiscount,
        totalTax: calculationResult.totalTax,
        grandTotal: calculationResult.grandTotal,
        overallDiscountAmount: calculationResult.overallDiscountAmount,
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
  const loadAllStockForLocation = async (locationId?: string) => {
    const currentLocation = locationId || formData.location;
    if (!currentLocation) return;

    setStockLoading(true);
    try {
      // Get ALL stock data for this location in ONE API call - no limits
      const response = await apiClient.stock.getStock({
        location: currentLocation,
        limit: 10000 // Get all stock items for this location
      });

      // Parse the stock data correctly from API response
      let stockData: any[] = [];
      if (response.data?.stockLevels && Array.isArray(response.data.stockLevels)) {
        stockData = response.data.stockLevels;
      }

      console.log('✅ Loaded stock data for location:', stockData.length, 'items');

      // Create complete stock cache for ALL products at this location
      // Aggregate stock across all rooms and racks within the location
      const newStockCache: any = {};
      const stockAggregation = new Map(); // Map to aggregate stock by product ID
      
      stockData.forEach(stock => {
        const productId = stock.product?._id || stock.product;
        if (productId) {
          // Calculate available quantity correctly
          const totalQuantity = Number(stock.quantity) || 0;
          const reservedQuantity = Number(stock.reservedQuantity) || 0;
          const available = Math.max(0, totalQuantity - reservedQuantity);

          // Initialize aggregation for this product if not exists
          if (!stockAggregation.has(productId)) {
            stockAggregation.set(productId, {
              totalAvailable: 0,
              totalQuantity: 0,
              totalReserved: 0,
              stockDetails: []
            });
          }
          
          const aggregatedStock = stockAggregation.get(productId);
          
          // Aggregate quantities across all rooms and racks
          aggregatedStock.totalAvailable += available;
          aggregatedStock.totalQuantity += totalQuantity;
          aggregatedStock.totalReserved += reservedQuantity;
          
          // Store detailed stock info for each room/rack
          if (available > 0) {
            aggregatedStock.stockDetails.push({
              location: stock.location?.name || 'Unknown Location',
              room: stock.room?.name || '',
              rack: stock.rack?.name || '',
              available: available
            });
          }
        }
      });
      
      // Convert aggregated data to stock cache format
      stockAggregation.forEach((aggregatedStock, productId) => {
        newStockCache[productId] = {
          available: aggregatedStock.totalAvailable,
          isValid: aggregatedStock.totalAvailable > 0,
          message: aggregatedStock.totalAvailable === 0 ? 'Out of stock' : `${aggregatedStock.totalAvailable} available`,
          totalQuantity: aggregatedStock.totalQuantity,
          reservedQuantity: aggregatedStock.totalReserved,
          stockDetails: aggregatedStock.stockDetails
        };
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
      setStockCacheVersion(prev => prev + 1); // Force re-render of product dropdowns
      console.log('✅ Stock cache updated for', Object.keys(newStockCache).length, 'products');

      // Also update stockValidation for all existing items to ensure consistency
      setStockValidation(prev => {
        const newValidation = { ...prev };
        (formData.items || []).forEach((item, index) => {
          if (item.product && newStockCache[item.product]) {
            const stockInfo = newStockCache[item.product];
            const quantity = item.quantity || 0;
            
            newValidation[index] = {
              available: stockInfo.available,
              isValid: quantity <= stockInfo.available && stockInfo.available > 0,
              message: stockInfo.available === 0 
                ? 'Out of stock' 
                : quantity > stockInfo.available 
                  ? `Only ${stockInfo.available} units available`
                  : `${stockInfo.available} units available`
            };
          }
        });
        return newValidation;
      });

      // Refresh stock validation for all items to ensure consistency
      setTimeout(() => {
        refreshStockValidationForAllItems();
      }, 100);

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
      setStockCacheVersion(prev => prev + 1); // Force re-render of product dropdowns
    } finally {
      setStockLoading(false);
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
      await loadAllStockForLocation(formData.location);
    }
    return productStockCache[productId] || { available: 0, isValid: false, message: 'Unable to check stock' };
  };

  // Helper function to refresh stock validation for all items
  const refreshStockValidationForAllItems = () => {
    if (!formData.items || formData.items.length === 0) return;

    setStockValidation(prev => {
      const newValidation = { ...prev };
      (formData.items || []).forEach((item, index) => {
        if (item.product && productStockCache[item.product]) {
          const stockInfo = productStockCache[item.product];
          const quantity = item.quantity || 0;
          
          newValidation[index] = {
            available: stockInfo.available,
            isValid: quantity <= stockInfo.available && stockInfo.available > 0,
            message: stockInfo.available === 0 
              ? 'Out of stock' 
              : quantity > stockInfo.available 
                ? `Only ${stockInfo.available} units available`
                : `${stockInfo.available} units available`
          };
        }
      });
      return newValidation;
    });
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      // Check if this is a different customer than currently selected
      const isDifferentCustomer = formData.customer?._id !== customer._id;

      // Get primary address email if available
      const primaryAddress = customer.addresses?.find(addr => addr.isPrimary);
      const primaryEmail = primaryAddress?.email || customer.email || '';
      
      setFormData(prev => ({
        ...prev,
        customer: {
          _id: customer._id,
          name: customer.name,
          email: primaryEmail,
          phone: customer.phone,
          pan: ''
        }
      }));

      // Load customer addresses if different customer
      if (isDifferentCustomer) {
        loadCustomerAddresses(customer._id);
      }

      setShowCustomerDropdown(false);

      // Exit search mode and clear search term
      setIsCustomerSearchMode(false);
      setCustomerSearchTerm(undefined);
    }
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
        terms: sanitizedData.terms || '',
        // New fields from quotation
        subject: sanitizedData.subject || '',
        engineSerialNumber: sanitizedData.engineSerialNumber || '',
        kva: sanitizedData.kva || '',
        hourMeterReading: sanitizedData.hourMeterReading || '',
        serviceRequestDate: sanitizedData.serviceRequestDate ? new Date(sanitizedData.serviceRequestDate).toISOString() : undefined,
        qrCodeImage: sanitizedData.qrCodeImage || '',
        serviceCharges: sanitizedData.serviceCharges || [],
        batteryBuyBack: sanitizedData.batteryBuyBack || {
          description: '',
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          discountedAmount: 0,
          taxRate: 0,
          taxAmount: 0,
          totalPrice: 0
        },
        items: (sanitizedData.items || []).map((item: any) => ({
          product: item.product,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate || 0),
          discount: Number(item.discount || 0),
          uom: item.uom || 'nos',
          partNo: item.partNo || '',
          hsnNumber: item.hsnNumber || item.hsnSac
        })),
        billToAddress: sanitizedData.billToAddress,
        shipToAddress: sanitizedData.shipToAddress,
        // Include company information with bank details
        ...(sanitizedData.company && { company: sanitizedData.company }),
        ...(sanitizedData.assignedEngineer && sanitizedData.assignedEngineer.trim() !== '' && { assignedEngineer: sanitizedData.assignedEngineer }),
        overallDiscount: sanitizedData.overallDiscount || 0,
        overallDiscountAmount: sanitizedData.overallDiscountAmount || 0,
        reduceStock: reduceStock,
        // Include quotation reference fields if this is from a quotation
        ...(sanitizedData.sourceQuotation && {
          sourceQuotation: sanitizedData.sourceQuotation,
          quotationNumber: sanitizedData.quotationNumber,
          quotationPaymentDetails: sanitizedData.quotationPaymentDetails
        }),
        // Include PO From Customer data if available
        ...(sanitizedData.poFromCustomer && {
          poFromCustomer: sanitizedData.poFromCustomer._id,
          poNumber: sanitizedData.poFromCustomer.poNumber,
          poPdf: sanitizedData.poFromCustomer.pdfFile
        })
      };

      console.log('Submitting invoice data:', invoiceData);
      console.log('Overall discount amount being sent:', invoiceData.overallDiscountAmount);
      console.log('Quotation reference fields being sent:', {
        sourceQuotation: invoiceData.sourceQuotation,
        quotationNumber: invoiceData.quotationNumber,
        quotationPaymentDetails: invoiceData.quotationPaymentDetails
      });
      console.log('PO From Customer fields being sent:', {
        poFromCustomer: invoiceData.poFromCustomer,
        poNumber: invoiceData.poNumber,
        poPdf: invoiceData.poPdf
      });
      console.log('Both IDs being stored in invoice:', {
        quotationId: invoiceData.sourceQuotation,
        poFromCustomerId: invoiceData.poFromCustomer
      });

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
    } else if (e.key === 'Enter') {
      e.preventDefault();

      if (showLocationDropdown && highlightedLocationIndex >= 0 && filteredLocations[highlightedLocationIndex]) {
        const selectedLocation = filteredLocations[highlightedLocationIndex];
        console.log(`🔄 Location changed from ${formData.location} to ${selectedLocation._id} (${selectedLocation.name})`);
        setFormData({ ...formData, location: selectedLocation._id });
        setShowLocationDropdown(false);
        setHighlightedLocationIndex(-1);
        setLocationSearchTerm('');
        // Clear stock cache when location changes
        setProductStockCache({});
        setStockValidation({});

        // Refresh products for the new location
        setTimeout(() => {
          fetchProducts(selectedLocation._id);
        }, 100);

        setTimeout(() => {
          const customerInput = document.querySelector('[data-field="customer"]') as HTMLInputElement;
          if (customerInput) customerInput.focus();
        }, 50);
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      
      // Always close dropdown on Tab
      if (showLocationDropdown) {
        if (highlightedLocationIndex >= 0 && filteredLocations[highlightedLocationIndex]) {
          const selectedLocation = filteredLocations[highlightedLocationIndex];
          console.log(`🔄 Location changed from ${formData.location} to ${selectedLocation._id} (${selectedLocation.name})`);
          setFormData({ ...formData, location: selectedLocation._id });
          // Clear stock cache when location changes
          setProductStockCache({});
          setStockValidation({});

          // Refresh products for the new location
          setTimeout(() => {
            fetchProducts(selectedLocation._id);
          }, 100);
        }
        setShowLocationDropdown(false);
        setHighlightedLocationIndex(-1);
        setLocationSearchTerm('');
      }
      
      // Move to next field
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
    const filteredCustomers = customers.filter(customer => {
      if (customer.type !== 'customer') return false;

      // If in search mode and no search term, show all customers
      if (isCustomerSearchMode && (!customerSearchTerm || customerSearchTerm.trim() === '')) {
        return true;
      }

      // If not in search mode, show all customers (for arrow key navigation)
      if (!isCustomerSearchMode) {
        return true;
      }

      if (!customerSearchTerm) return false;
      const searchTerm = customerSearchTerm?.toLowerCase();
      
      // Get primary address email for search
      const primaryAddress = customer.addresses?.find(addr => addr.isPrimary);
      const primaryEmail = primaryAddress?.email || '';
      
      return (
        (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
        (primaryEmail && primaryEmail.toLowerCase().includes(searchTerm)) ||
        (customer.phone && customer.phone.toLowerCase().includes(searchTerm))
      );
    });

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

        // Use the handleCustomerSelect function to maintain consistency
        handleCustomerSelect(selectedCustomer._id);
        setHighlightedCustomerIndex(-1);

        // Move to next field (Bill To Address) and open dropdown
        setTimeout(() => {
          const billToAddressInput = document.querySelector('[data-field="bill-to-address"]') as HTMLInputElement;
          if (billToAddressInput) {
            billToAddressInput.focus();
            setShowBillToAddressDropdown(true);
          }
        }, 50);
      } else if (!showCustomerDropdown) {
        // If no dropdown open, just move to next field (Bill To Address) and open dropdown
        setTimeout(() => {
          const billToAddressInput = document.querySelector('[data-field="bill-to-address"]') as HTMLInputElement;
          if (billToAddressInput) {
            billToAddressInput.focus();
            setShowBillToAddressDropdown(true);
          }
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
      setIsCustomerSearchMode(false);
      setCustomerSearchTerm(undefined);
    }
  };



  // Bill To Address dropdown keyboard navigation
  const handleBillToAddressKeyDown = (e: React.KeyboardEvent) => {
    if (!formData.customer?._id) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showBillToAddressDropdown) {
        setShowBillToAddressDropdown(true);
        setHighlightedBillToAddressIndex(0);
      } else {
        const newIndex = highlightedBillToAddressIndex < addresses.length - 1 ? highlightedBillToAddressIndex + 1 : 0;
        setHighlightedBillToAddressIndex(newIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showBillToAddressDropdown) {
        setShowBillToAddressDropdown(true);
        setHighlightedBillToAddressIndex(addresses.length - 1);
      } else {
        const newIndex = highlightedBillToAddressIndex > 0 ? highlightedBillToAddressIndex - 1 : addresses.length - 1;
        setHighlightedBillToAddressIndex(newIndex);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showBillToAddressDropdown && highlightedBillToAddressIndex >= 0 && addresses[highlightedBillToAddressIndex]) {
        const selectedAddress = addresses[highlightedBillToAddressIndex];
        setFormData({
          ...formData,
          billToAddress: {
            address: selectedAddress.address,
            state: selectedAddress.state,
            district: selectedAddress.district,
            pincode: selectedAddress.pincode,
            ...(selectedAddress.id && { addressId: selectedAddress.id })
          } as any
        });
        setShowBillToAddressDropdown(false);
        setHighlightedBillToAddressIndex(-1);

        setTimeout(() => {
          const shipToAddressInput = document.querySelector('[data-field="ship-to-address"]') as HTMLInputElement;
          if (shipToAddressInput && !shipToAddressInput.disabled) {
            shipToAddressInput.focus();
          }
        }, 50);
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      
      // Always close dropdown on Tab
      if (showBillToAddressDropdown) {
        if (highlightedBillToAddressIndex >= 0 && addresses[highlightedBillToAddressIndex]) {
          // If dropdown is open and an item is highlighted, select it first
          const selectedAddress = addresses[highlightedBillToAddressIndex];
          setFormData({
            ...formData,
            billToAddress: {
              address: selectedAddress.address,
              state: selectedAddress.state,
              district: selectedAddress.district,
              pincode: selectedAddress.pincode,
              ...(selectedAddress.id && { addressId: selectedAddress.id })
            } as any
          });
        }
        setShowBillToAddressDropdown(false);
        setHighlightedBillToAddressIndex(-1);
      }
      
      // Move to next field
      setTimeout(() => {
        const shipToAddressInput = document.querySelector('[data-field="ship-to-address"]') as HTMLInputElement;
        if (shipToAddressInput && !shipToAddressInput.disabled) {
          shipToAddressInput.focus();
        }
      }, 50);
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      setTimeout(() => {
        const customerInput = document.querySelector('[data-field="customer"]') as HTMLInputElement;
        if (customerInput) customerInput.focus();
      }, 50);
    } else if (e.key === 'Escape') {
      setShowBillToAddressDropdown(false);
      setHighlightedBillToAddressIndex(-1);
    }
  };

  // Ship To Address dropdown keyboard navigation
  const handleShipToAddressKeyDown = (e: React.KeyboardEvent) => {
    if (!formData.customer?._id) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!showShipToAddressDropdown) {
        setShowShipToAddressDropdown(true);
        setHighlightedShipToAddressIndex(0);
      } else {
        const newIndex = highlightedShipToAddressIndex < addresses.length - 1 ? highlightedShipToAddressIndex + 1 : 0;
        setHighlightedShipToAddressIndex(newIndex);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!showShipToAddressDropdown) {
        setShowShipToAddressDropdown(true);
        setHighlightedShipToAddressIndex(addresses.length - 1);
      } else {
        const newIndex = highlightedShipToAddressIndex > 0 ? highlightedShipToAddressIndex - 1 : addresses.length - 1;
        setHighlightedShipToAddressIndex(newIndex);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showShipToAddressDropdown && highlightedShipToAddressIndex >= 0 && addresses[highlightedShipToAddressIndex]) {
        const selectedAddress = addresses[highlightedShipToAddressIndex];
        setFormData({
          ...formData,
          shipToAddress: {
            address: selectedAddress.address,
            state: selectedAddress.state,
            district: selectedAddress.district,
            pincode: selectedAddress.pincode,
            ...(selectedAddress.id && { addressId: selectedAddress.id })
          } as any
        });
        setShowShipToAddressDropdown(false);
        setHighlightedShipToAddressIndex(-1);

        setTimeout(() => {
          const dueDateInput = document.querySelector('[data-field="due-date"]') as HTMLInputElement;
          if (dueDateInput) dueDateInput.focus();
        }, 50);
      }
    } else if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      
      // Always close dropdown on Tab
      if (showShipToAddressDropdown) {
        if (highlightedShipToAddressIndex >= 0 && addresses[highlightedShipToAddressIndex]) {
          // If dropdown is open and an item is highlighted, select it first
          const selectedAddress = addresses[highlightedShipToAddressIndex];
          setFormData({
            ...formData,
            shipToAddress: {
              address: selectedAddress.address,
              state: selectedAddress.state,
              district: selectedAddress.district,
              pincode: selectedAddress.pincode,
              ...(selectedAddress.id && { addressId: selectedAddress.id })
            } as any
          });
        }
        setShowShipToAddressDropdown(false);
        setHighlightedShipToAddressIndex(-1);
      }
      
      // Move to next field
      setTimeout(() => {
        const dueDateInput = document.querySelector('[data-field="due-date"]') as HTMLInputElement;
        if (dueDateInput) dueDateInput.focus();
      }, 50);
    } else if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      setTimeout(() => {
        const billToAddressInput = document.querySelector('[data-field="bill-to-address"]') as HTMLInputElement;
        if (billToAddressInput) billToAddressInput.focus();
      }, 50);
    } else if (e.key === 'Escape') {
      setShowShipToAddressDropdown(false);
      setHighlightedShipToAddressIndex(-1);
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

      {/* Quotation Reference Banner */}
      {formData.sourceQuotation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">
                  Creating Invoice from Quotation
                </h3>
                <p className="text-xs text-blue-700">
                  Quotation: {formData.quotationNumber} • 
                  {formData.quotationPaymentDetails && (
                    <span className="ml-2">
                      Payment Status: {formData.quotationPaymentDetails.paymentStatus} • 
                      Paid: ₹{formData.quotationPaymentDetails.paidAmount?.toFixed(2) || '0.00'} • 
                      Remaining: ₹{formData.quotationPaymentDetails.remainingAmount?.toFixed(2) || '0.00'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              Pre-filled from Quotation
            </div>
          </div>
        </div>
      )}

      {/* PO From Customer Banner */}
      {formData.poFromCustomer && (() => {
        console.log('PO From Customer data in form:', formData.poFromCustomer);
        return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-900">
                  PO From Customer Details
                </h3>
                <p className="text-xs text-green-700">
                  PO Number: {formData.poFromCustomer.poNumber} • 
                  Status: {formData.poFromCustomer.status} • 
                  Amount: ₹{formData.poFromCustomer.totalAmount?.toFixed(2) || '0.00'} • 
                  Order Date: {formData.poFromCustomer.orderDate ? new Date(formData.poFromCustomer.orderDate).toLocaleDateString() : 'N/A'}
                  {formData.poFromCustomer.expectedDeliveryDate && (
                    <span className="ml-2">
                      • Expected Delivery: {new Date(formData.poFromCustomer.expectedDeliveryDate).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {formData.poFromCustomer?.pdfFile && (
                <button
                  onClick={() => window.open(formData.poFromCustomer?.pdfFile, '_blank')}
                  className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full hover:bg-green-200 transition-colors"
                >
                  View PDF
                </button>
              )}
              <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                Auto-filled from PO
              </div>
            </div>
          </div>
        </div>
        );
      })()}

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
                  value={locationSearchTerm || (formData.location ? getLocationLabel(formData.location) : '')}
                  onChange={(e) => {
                    if (isFromQuotation) return; // Disable editing when from quotation
                    const value = e.target.value;
                    setLocationSearchTerm(value);
                    
                    // If input is cleared, clear the location selection
                    if (!value) {
                      setFormData(prev => ({ ...prev, location: '' }));
                    }
                    
                    if (!showLocationDropdown) setShowLocationDropdown(true);
                    setHighlightedLocationIndex(-1);
                  }}
                  onFocus={() => {
                    if (isFromQuotation) return; // Disable dropdown when from quotation
                    setShowLocationDropdown(true);
                    setHighlightedLocationIndex(-1);
                  }}
                  autoComplete="off"
                  onKeyDown={isFromQuotation ? undefined : handleLocationKeyDown}
                  placeholder="Search location or press ↓ to open"
                  data-field="location"
                  disabled={isFromQuotation}
                  className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg transition-colors ${
                    isFromQuotation 
                      ? 'bg-gray-100 text-gray-600 cursor-not-allowed' 
                      : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.location && !locationSearchTerm && !isFromQuotation && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, location: '' }));
                        setLocationSearchTerm('');
                      }}
                      className="text-gray-400 hover:text-gray-600 mr-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showLocationDropdown && !isFromQuotation && (
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
                          console.log(`🔄 Location changed from ${formData.location} to ${location._id} (${location.name})`);
                          setFormData({ ...formData, location: location._id });
                          setShowLocationDropdown(false);
                          setLocationSearchTerm('');
                          setHighlightedLocationIndex(-1);
                          // Clear stock cache when location changes
                          setProductStockCache({});
                          setStockValidation({});

                          // Refresh products for the new location
                          setTimeout(() => {
                            fetchProducts(location._id);
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
              {/* {isFromQuotation && (
                <p className="mt-1 text-sm text-blue-600 bg-blue-50 p-2 rounded-md border border-blue-200">
                  ℹ️ Location field is locked because this invoice is being created from a quotation. 
                  The location cannot be changed.
                </p>
              )} */}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isPurchaseInvoice ? 'Supplier *' : 'Customer *'}
              </label>
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={customerSearchTerm !== undefined ? customerSearchTerm : (formData.customer?._id ? getCustomerLabel(formData.customer._id) : '')}
                  onChange={(e) => {
                    if (isFromQuotation) return; // Disable editing when from quotation
                    const value = e.target.value;
                    setCustomerSearchTerm(value);
                    
                    // If input is cleared, clear the customer selection
                    if (!value) {
                      setFormData(prev => ({
                        ...prev,
                        customer: { _id: '', name: '', email: '', phone: '', pan: '' },
                        billToAddress: { address: '', state: '', district: '', pincode: '' },
                        shipToAddress: { address: '', state: '', district: '', pincode: '' }
                      }));
                      setAddresses([]);
                    }
                    
                    if (!showCustomerDropdown) setShowCustomerDropdown(true);
                    setHighlightedCustomerIndex(-1);
                  }}
                  onFocus={() => {
                    if (isFromQuotation) return; // Disable dropdown when from quotation
                    setShowCustomerDropdown(true);
                    setHighlightedCustomerIndex(-1);
                    // Initialize search term for editing
                    if (customerSearchTerm === undefined && formData.customer?._id) {
                      setCustomerSearchTerm(getCustomerLabel(formData.customer._id));
                    } else if (!customerSearchTerm && !formData.customer?._id) {
                      setCustomerSearchTerm(undefined);
                    }
                  }}
                  onKeyDown={isFromQuotation ? undefined : handleCustomerKeyDown}
                  onBlur={() => {
                    // Delay to allow click events to fire
                    setTimeout(() => {
                      setShowCustomerDropdown(false);
                      setHighlightedCustomerIndex(-1);
                      // If no customer selected and search term exists, clear it
                      if (!formData.customer?._id && customerSearchTerm) {
                        setCustomerSearchTerm(undefined);
                      }
                    }, 150);
                  }}
                  autoComplete="off"
                  placeholder={isPurchaseInvoice ? "Search supplier or press ↓ to open" : "Search customer or press ↓ to open"}
                  data-field="customer"
                  disabled={isFromQuotation}
                  className={`w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg transition-colors ${
                    isFromQuotation 
                      ? 'bg-gray-100 text-gray-600 cursor-not-allowed' 
                      : 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                </div>

                {/* Clear button - only show when there's a selected customer and no search term */}
                {formData.customer?._id && !customerSearchTerm && !isFromQuotation && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData(prev => ({
                        ...prev,
                        customer: { _id: '', name: '', email: '', phone: '', pan: '' },
                        billToAddress: { address: '', state: '', district: '', pincode: '' },
                        shipToAddress: { address: '', state: '', district: '', pincode: '' }
                      }));
                      setAddresses([]);
                      setCustomerSearchTerm(undefined);
                      setShowCustomerDropdown(false);
                      setHighlightedCustomerIndex(-1);
                      // Refocus the input
                      setTimeout(() => {
                        const input = document.querySelector('[data-field="customer"]') as HTMLInputElement;
                        if (input) input.focus();
                      }, 50);
                    }}
                    className="absolute inset-y-0 right-8 flex items-center pr-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {showCustomerDropdown && !isFromQuotation && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                    </div>

                    {(() => {
                      const filteredCustomers = customers.filter(customer => {
                        if (isPurchaseInvoice ? customer.type !== 'supplier' : customer.type !== 'customer') return false;
                        const searchTerm = (customerSearchTerm || '').toLowerCase();
                        return (
                          (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
                          (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
                          (customer.phone && customer.phone.toLowerCase().includes(searchTerm))
                        );
                      });

                      return filteredCustomers.map((customer, index) => (
                        <button
                          key={customer._id}
                          data-customer-index={index}
                          onClick={() => {
                            handleCustomerSelect(customer._id);
                            setShowCustomerDropdown(false);
                            setCustomerSearchTerm(undefined); // Reset to show selected customer name
                            setHighlightedCustomerIndex(-1);
                            
                            // Fetch DG details for the selected customer
                            fetchDgDetailsForCustomer(customer._id);
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.customer?._id === customer._id ? 'bg-blue-100 text-blue-800' :
                            highlightedCustomerIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-gray-500">
                              {(() => {
                                const primaryAddress = customer.addresses?.find(addr => addr.isPrimary);
                                return primaryAddress?.email || customer.email || '';
                              })()}
                            </div>
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
              {/* {isFromQuotation && (
                <p className="mt-1 text-sm text-blue-600 bg-blue-50 p-2 rounded-md border border-blue-200">
                  ℹ️ Customer field is locked because this invoice is being created from a quotation. 
                  The customer cannot be changed.
                </p>
              )} */}
            </div>

            {/* Bill To and Ship To Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isPurchaseInvoice ? 'Supplier Address *' : 'Bill To Address *'}
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={billToAddressSearchTerm || (formData.billToAddress?.address ? getAddressLabel((formData.billToAddress as any)?.addressId?.toString(), 'billTo') : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBillToAddressSearchTerm(value);
                      
                      // If input is cleared, clear the address selection
                      if (!value) {
                        setFormData(prev => ({
                          ...prev,
                          billToAddress: { address: '', state: '', district: '', pincode: '' }
                        }));
                      }
                      
                      if (!showBillToAddressDropdown) setShowBillToAddressDropdown(true);
                      setHighlightedBillToAddressIndex(-1);
                    }}
                    onFocus={() => {
                      if (formData.customer?._id) {
                        setShowBillToAddressDropdown(true);
                        setHighlightedBillToAddressIndex(-1);
                      }
                    }}
                    autoComplete="off"
                    onKeyDown={handleBillToAddressKeyDown}
                    disabled={!formData.customer?._id || !formData?.customer}
                    placeholder={!formData.customer?._id ? (isPurchaseInvoice ? "Select supplier first" : "Select customer first") : "Search address or press ↓ to open"}
                    data-field="bill-to-address"
                    className={`w-full px-3 py-2 pr-10 border rounded-lg transition-colors ${!formData.customer?._id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.billToAddress?.address && !billToAddressSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            billToAddress: { address: '', state: '', district: '', pincode: '' }
                          }));
                          setBillToAddressSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBillToAddressDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showBillToAddressDropdown && formData.customer?._id && (
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
                            billToAddress: { address: '', state: '', district: '', pincode: '' }
                          });
                          setShowBillToAddressDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.billToAddress?.address ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        {isPurchaseInvoice ? 'Select supplier address' : 'Select bill to address'}
                      </button>

                      {addresses
                        .filter(address =>
                          !billToAddressSearchTerm ||
                          address.address.toLowerCase().includes(billToAddressSearchTerm.toLowerCase()) ||
                          address.district.toLowerCase().includes(billToAddressSearchTerm.toLowerCase()) ||
                          address.state.toLowerCase().includes(billToAddressSearchTerm.toLowerCase()) ||
                          address.pincode.includes(billToAddressSearchTerm)
                        )
                        .map((address, index) => (
                        <button
                          key={address.id}
                          data-address-index={index}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              billToAddress: {
                                address: address.address,
                                state: address.state,
                                district: address.district,
                                pincode: address.pincode,
                                gstNumber: address.gstNumber || '',
                                ...(address.id && { addressId: address.id })
                              } as any
                            });
                            setShowBillToAddressDropdown(false);
                            setHighlightedBillToAddressIndex(-1);
                            setBillToAddressSearchTerm('');
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${(formData.billToAddress as any)?.addressId === address.id ? 'bg-blue-100 text-blue-800' :
                            highlightedBillToAddressIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
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

                      {addresses.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          {isPurchaseInvoice ? 'No addresses found for this supplier' : 'No addresses found for this customer'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isPurchaseInvoice ? 'Company Address' : 'Ship To Address *'}
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={shipToAddressSearchTerm || (formData.shipToAddress?.address ? getAddressLabel((formData.shipToAddress as any)?.addressId?.toString(), 'shipTo') : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setShipToAddressSearchTerm(value);
                      
                      // If input is cleared, clear the address selection
                      if (!value) {
                        setFormData(prev => ({
                          ...prev,
                          shipToAddress: { address: '', state: '', district: '', pincode: '' }
                        }));
                      }
                      
                      if (!showShipToAddressDropdown) setShowShipToAddressDropdown(true);
                      setHighlightedShipToAddressIndex(-1);
                    }}
                    onFocus={() => {
                      if (formData.customer?._id) {
                        setShowShipToAddressDropdown(true);
                        setHighlightedShipToAddressIndex(-1);
                      }
                    }}
                    autoComplete="off"
                    onKeyDown={handleShipToAddressKeyDown}
                    disabled={!formData.customer?._id}
                    placeholder={!formData.customer?._id ? (isPurchaseInvoice ? "Select supplier first" : "Select customer first") : "Search address or press ↓ to open"}
                    data-field="ship-to-address"
                    className={`w-full px-3 py-2 pr-10 border rounded-lg transition-colors ${!formData.customer?._id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.shipToAddress?.address && !shipToAddressSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            shipToAddress: { address: '', state: '', district: '', pincode: '' }
                          }));
                          setShipToAddressSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showShipToAddressDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showShipToAddressDropdown && formData.customer?._id && (
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
                            shipToAddress: { address: '', state: '', district: '', pincode: '' }
                          });
                          setShowShipToAddressDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.shipToAddress?.address ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        {isPurchaseInvoice ? 'Select company address' : 'Select ship to address'}
                      </button>

                      {addresses
                        .filter(address =>
                          !shipToAddressSearchTerm ||
                          address.address.toLowerCase().includes(shipToAddressSearchTerm.toLowerCase()) ||
                          address.district.toLowerCase().includes(shipToAddressSearchTerm.toLowerCase()) ||
                          address.state.toLowerCase().includes(shipToAddressSearchTerm.toLowerCase()) ||
                          address.pincode.includes(shipToAddressSearchTerm)
                        )
                        .map((address, index) => (
                        <button
                          key={address.id}
                          data-address-index={index}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              shipToAddress: {
                                address: address.address,
                                state: address.state,
                                district: address.district,
                                pincode: address.pincode,
                                gstNumber: address.gstNumber || '',
                                ...(address.id && { addressId: address.id })
                              } as any
                            });
                            setShowShipToAddressDropdown(false);
                            setHighlightedShipToAddressIndex(-1);
                            setShipToAddressSearchTerm('');
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${(formData.shipToAddress as any)?.addressId === address.id ? 'bg-blue-100 text-blue-800' :
                            highlightedShipToAddressIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
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

                      {addresses.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          {isPurchaseInvoice ? 'No addresses found for this supplier' : 'No addresses found for this customer'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                    // Move to issue date field
                    setTimeout(() => {
                      const issueDateInput = document.querySelector('[data-field="issue-date"]') as HTMLInputElement;
                      if (issueDateInput) issueDateInput.focus();
                    }, 50);
                  } else if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    // Move back to ship to address field
                    setTimeout(() => {
                      const shipToAddressInput = document.querySelector('[data-field="ship-to-address"]') as HTMLInputElement;
                      if (shipToAddressInput) shipToAddressInput.focus();
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
                onKeyDown={(e) => {
                  if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
                    e.preventDefault();
                    // Move to engineer field if it exists, otherwise to first product field
                    setTimeout(() => {
                      if (isSalesInvoice) {
                        const engineerInput = document.querySelector('[data-field="engineer"]') as HTMLInputElement;
                        if (engineerInput) engineerInput.focus();
                      } else {
                        const firstProductInput = document.querySelector(`[data-row="0"][data-field="product"]`) as HTMLInputElement;
                        if (firstProductInput) firstProductInput.focus();
                      }
                    }, 50);
                  } else if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    // Move back to due date field
                    setTimeout(() => {
                      const dueDateInput = document.querySelector('[data-field="due-date"]') as HTMLInputElement;
                      if (dueDateInput) dueDateInput.focus();
                    }, 50);
                  }
                }}
                data-field="issue-date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Referred By - Only for Sales Invoices */}
            {isSalesInvoice && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referred By
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={engineerSearchTerm || (formData.assignedEngineer ? getEngineerLabel(formData.assignedEngineer) : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setEngineerSearchTerm(value);
                      
                      // If input is cleared, clear the engineer selection
                      if (!value) {
                        setFormData(prev => ({
                          ...prev,
                          assignedEngineer: ''
                        }));
                      }
                      
                      if (!showEngineerDropdown) setShowEngineerDropdown(true);
                      setHighlightedEngineerIndex(-1);
                    }}
                    onFocus={() => {
                      setShowEngineerDropdown(true);
                      setHighlightedEngineerIndex(-1);
                      if (!engineerSearchTerm && formData.assignedEngineer) {
                        setEngineerSearchTerm('');
                      }
                    }}
                    onBlur={() => {
                      // Delay to allow click events to fire
                      setTimeout(() => {
                        setShowEngineerDropdown(false);
                        setHighlightedEngineerIndex(-1);
                        // If no engineer selected and search term exists, clear it
                        if (!formData.assignedEngineer && engineerSearchTerm) {
                          setEngineerSearchTerm('');
                        }
                      }, 150);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setShowEngineerDropdown(true);
                        setHighlightedEngineerIndex(prev =>
                          prev < fieldOperators.length - 1 ? prev + 1 : 0
                        );
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setShowEngineerDropdown(true);
                        setHighlightedEngineerIndex(prev =>
                          prev > 0 ? prev - 1 : fieldOperators.length - 1
                        );
                      } else if (e.key === 'Enter') {
                        e.preventDefault();
                        const filteredEngineers = fieldOperators.filter(engineer => {
                          const searchTerm = (engineerSearchTerm || '').toLowerCase();
                          const fullName = engineer.name || `${engineer.firstName} ${engineer.lastName}`;
                          return (
                            fullName.toLowerCase().includes(searchTerm) ||
                            (engineer.email && engineer.email.toLowerCase().includes(searchTerm)) ||
                            (engineer.phone && engineer.phone.toLowerCase().includes(searchTerm))
                          );
                        });
                        
                        if (showEngineerDropdown && highlightedEngineerIndex >= 0 && filteredEngineers[highlightedEngineerIndex]) {
                          const selectedEngineer = filteredEngineers[highlightedEngineerIndex];
                          setFormData({ ...formData, assignedEngineer: selectedEngineer._id });
                          setShowEngineerDropdown(false);
                          setEngineerSearchTerm('');
                          setHighlightedEngineerIndex(-1);
                        } else if (showEngineerDropdown && filteredEngineers.length === 1) {
                          const selectedEngineer = filteredEngineers[0];
                          setFormData({ ...formData, assignedEngineer: selectedEngineer._id });
                          setShowEngineerDropdown(false);
                          setEngineerSearchTerm('');
                          setHighlightedEngineerIndex(-1);
                        }
                      } else if (e.key === 'Escape') {
                        setShowEngineerDropdown(false);
                        setHighlightedEngineerIndex(-1);
                      } else if (e.key === 'Tab' && !e.shiftKey) {
                        e.preventDefault();
                        
                        // Always close dropdown on Tab
                        if (showEngineerDropdown) {
                          const filteredEngineers = fieldOperators.filter(engineer => {
                            const searchTerm = (engineerSearchTerm || '').toLowerCase();
                            const fullName = engineer.name || `${engineer.firstName} ${engineer.lastName}`;
                            return (
                              fullName.toLowerCase().includes(searchTerm) ||
                              (engineer.email && engineer.email.toLowerCase().includes(searchTerm)) ||
                              (engineer.phone && engineer.phone.toLowerCase().includes(searchTerm))
                            );
                          });
                          
                          if (highlightedEngineerIndex >= 0 && filteredEngineers[highlightedEngineerIndex]) {
                            const selectedEngineer = filteredEngineers[highlightedEngineerIndex];
                            setFormData({ ...formData, assignedEngineer: selectedEngineer._id });
                          } else if (filteredEngineers.length === 1) {
                            const selectedEngineer = filteredEngineers[0];
                            setFormData({ ...formData, assignedEngineer: selectedEngineer._id });
                          }
                          setShowEngineerDropdown(false);
                          setEngineerSearchTerm('');
                          setHighlightedEngineerIndex(-1);
                        }
                        
                        // Move to first product field in the list
                        setTimeout(() => {
                          const firstProductInput = document.querySelector(`[data-row="0"][data-field="product"]`) as HTMLInputElement;
                          if (firstProductInput) firstProductInput.focus();
                        }, 50);
                      } else if (e.key === 'Tab' && e.shiftKey) {
                        e.preventDefault();
                        // Move back to Issue Date field
                        setTimeout(() => {
                          const issueDateInput = document.querySelector('[data-field="issue-date"]') as HTMLInputElement;
                          if (issueDateInput) issueDateInput.focus();
                        }, 50);
                      }
                    }}
                    autoComplete="off"
                    placeholder="Search Referred By or press ↓ to open"
                    data-field="engineer"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showEngineerDropdown ? 'rotate-180' : ''}`} />
                  </div>

                  {/* Clear button - only show when there's a selected engineer and no search term */}
                  {formData.assignedEngineer && !engineerSearchTerm && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => ({
                          ...prev,
                          assignedEngineer: ''
                        }));
                        setEngineerSearchTerm('');
                        setShowEngineerDropdown(false);
                        setHighlightedEngineerIndex(-1);
                        // Refocus the input
                        setTimeout(() => {
                          const input = document.querySelector('[data-field="engineer"]') as HTMLInputElement;
                          if (input) input.focus();
                        }, 50);
                      }}
                      className="absolute inset-y-0 right-8 flex items-center pr-2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {showEngineerDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      {(() => {
                        const filteredEngineers = fieldOperators.filter(engineer => {
                          const searchTerm = (engineerSearchTerm || '').toLowerCase();
                          const fullName = engineer.name || `${engineer.firstName} ${engineer.lastName}`;
                          return (
                            fullName.toLowerCase().includes(searchTerm) ||
                            (engineer.email && engineer.email.toLowerCase().includes(searchTerm)) ||
                            (engineer.phone && engineer.phone.toLowerCase().includes(searchTerm))
                          );
                        });

                        return (
                          <>
                            {/* <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                              <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                              <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                              <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                            </div> */}

                            <button
                              onClick={() => {
                                setFormData({ ...formData, assignedEngineer: '' });
                                setShowEngineerDropdown(false);
                                setEngineerSearchTerm('');
                              }}
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.assignedEngineer ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                            >
                              Select engineer
                            </button>

                            {filteredEngineers.map((engineer, index) => (
                              <button
                                key={engineer._id}
                                onClick={() => {
                                  setFormData({ ...formData, assignedEngineer: engineer._id });
                                  setShowEngineerDropdown(false);
                                  setEngineerSearchTerm('');
                                  setHighlightedEngineerIndex(-1);
                                }}
                                className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.assignedEngineer === engineer._id ? 'bg-blue-100 text-blue-800' :
                                  highlightedEngineerIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                    'text-gray-700 hover:bg-gray-50'
                                  }`}
                              >
                                <div>
                                  <div className="font-medium">{engineer.name || `${engineer.firstName} ${engineer.lastName}`}</div>
                                  <div className="text-xs text-gray-500">{engineer.email}</div>
                                  <div className="text-xs text-gray-500">{engineer.phone}</div>
                                </div>
                              </button>
                            ))}

                            {filteredEngineers.length === 0 && engineerSearchTerm && (
                              <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                No engineers found for "{engineerSearchTerm}"
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* New Quotation Fields */}
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={formData.subject || ''}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Enter invoice subject"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            

<div className='grid grid-cols-1 md:grid-cols-4 gap-4'>

<div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Engine Serial Number
              </label>
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={engineSerialSearchTerm || (formData.engineSerialNumber ? formData.engineSerialNumber : '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEngineSerialSearchTerm(value);
                    
                    // If input is cleared, clear the engine serial number selection
                    if (!value) {
                      setFormData(prev => ({
                        ...prev,
                        engineSerialNumber: '',
                        kva: '',
                        hourMeterReading: '',
                        serviceRequestDate: undefined
                      }));
                    }
                    
                    if (!showEngineSerialDropdown) setShowEngineSerialDropdown(true);
                    setHighlightedEngineSerialIndex(-1);
                  }}
                  onFocus={() => {
                    if (dgDetailsWithServiceData.length > 0) {
                      setShowEngineSerialDropdown(true);
                      setHighlightedEngineSerialIndex(-1);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (!showEngineSerialDropdown) {
                        setShowEngineSerialDropdown(true);
                        setHighlightedEngineSerialIndex(0);
                      } else {
                        const newIndex = highlightedEngineSerialIndex < dgDetailsWithServiceData.length - 1 ? highlightedEngineSerialIndex + 1 : 0;
                        setHighlightedEngineSerialIndex(newIndex);
                      }
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (!showEngineSerialDropdown) {
                        setShowEngineSerialDropdown(true);
                        setHighlightedEngineSerialIndex(dgDetailsWithServiceData.length - 1);
                      } else {
                        const newIndex = highlightedEngineSerialIndex > 0 ? highlightedEngineSerialIndex - 1 : dgDetailsWithServiceData.length - 1;
                        setHighlightedEngineSerialIndex(newIndex);
                      }
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (showEngineSerialDropdown && highlightedEngineSerialIndex >= 0 && dgDetailsWithServiceData[highlightedEngineSerialIndex]) {
                        const selectedTicket = dgDetailsWithServiceData[highlightedEngineSerialIndex];
                        setFormData({
                          ...formData,
                          engineSerialNumber: selectedTicket.engineSerialNumber || '',
                          kva: selectedTicket.kva ? String(selectedTicket.kva) : '',
                          hourMeterReading: selectedTicket.HourMeterReading || '',
                          serviceRequestDate: selectedTicket.ServiceRequestDate ? new Date(selectedTicket.ServiceRequestDate) : undefined
                        });
                        setShowEngineSerialDropdown(false);
                        setEngineSerialSearchTerm('');
                        setHighlightedEngineSerialIndex(-1);
                      }
                    } else if (e.key === 'Escape') {
                      setShowEngineSerialDropdown(false);
                      setHighlightedEngineSerialIndex(-1);
                    }
                  }}
                  placeholder="Select engine serial number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.engineSerialNumber && !engineSerialSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          engineSerialNumber: '',
                          kva: '',
                          hourMeterReading: '',
                          serviceRequestDate: undefined
                        }));
                        setEngineSerialSearchTerm('');
                      }}
                      className="text-gray-400 hover:text-gray-600 mr-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showEngineSerialDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showEngineSerialDropdown && dgDetailsWithServiceData.length > 0 && (
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
                          engineSerialNumber: '',
                          kva: '',
                          hourMeterReading: '',
                          serviceRequestDate: undefined
                        });
                        setShowEngineSerialDropdown(false);
                        setEngineSerialSearchTerm('');
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm text-gray-700"
                    >
                      Clear selection
                    </button>
                    {dgDetailsWithServiceData
                      .filter(ticket =>
                        ticket.engineSerialNumber &&
                        ticket.engineSerialNumber.toLowerCase().includes(engineSerialSearchTerm.toLowerCase())
                      )
                      .map((ticket, index) => (
                        <button
                          key={ticket._id}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              engineSerialNumber: ticket.engineSerialNumber || '',
                              kva: ticket.kva ? String(ticket.kva) : '',
                              hourMeterReading: ticket.HourMeterReading || '',
                              serviceRequestDate: ticket.ServiceRequestDate ? new Date(ticket.ServiceRequestDate) : undefined
                            });
                            setShowEngineSerialDropdown(false);
                            setEngineSerialSearchTerm('');
                            setHighlightedEngineSerialIndex(-1);
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${highlightedEngineSerialIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                            'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium">{ticket.engineSerialNumber}</div>
                          <div className="text-xs text-gray-500">
                            {ticket.kva && `KVA: ${ticket.kva}`}
                            {ticket.HourMeterReading && ` • HMR: ${ticket.HourMeterReading}`}
                            {ticket.ServiceRequestDate && ` • Date: ${new Date(ticket.ServiceRequestDate).toLocaleDateString()}`}
                          </div>
                        </button>
                      ))}

                    {dgDetailsWithServiceData.length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No DG details found for this customer
                      </div>
                    )}

                    {dgDetailsWithServiceData.length > 0 && dgDetailsWithServiceData.filter(ticket =>
                      ticket.engineSerialNumber &&
                      ticket.engineSerialNumber.toLowerCase().includes(engineSerialSearchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No engine serial numbers match your search
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Select an engine serial number from customer's DG details to auto-populate KVA, Hour Meter Reading, and Service Done Date
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                KVA Rating
              </label>
              <input
                type="text"
                value={formData.kva || ''}
                onChange={(e) => setFormData({ ...formData, kva: e.target.value })}
                placeholder="Auto-populated from service ticket"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hour Meter Reading
              </label>
              <input
                type="text"
                value={formData.hourMeterReading || ''}
                onChange={(e) => setFormData({ ...formData, hourMeterReading: e.target.value })}
                placeholder="Auto-populated from service ticket"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Done Date
              </label>
              <input
                type="date"
                value={formatDateForInput(formData.serviceRequestDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    setFormData({ ...formData, serviceRequestDate: new Date(e.target.value) });
                  } else {
                    setFormData({ ...formData, serviceRequestDate: undefined });
                  }
                }}
                placeholder="Auto-populated from service ticket"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                disabled
              />
            </div>
            </div>

            
          </div>

          {/* Stock Reduction Option - Conditional based on invoice type */}
          {/* {!isDeliveryChallan && (
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
          )} */}

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

            {/* Stock Loading Indicator */}
            {stockLoading && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-blue-700">Loading stock information for selected location...</span>
                </div>
              </div>
            )}

            {/* Excel-style Table */}
            <div className="hidden lg:block border border-gray-300 rounded-lg bg-white shadow-sm overflow-x-auto">
              {/* Table Header */}
              <div className="bg-gray-100 border-b border-gray-300 min-w-[1200px]">
                <div className="grid text-xs font-bold text-gray-800 uppercase tracking-wide"
                  style={{ gridTemplateColumns: '60px 150px 1fr 90px 80px 100px 60px 120px 100px 80px 60px' }}>
                  <div className="p-3 border-r border-gray-300 text-center bg-gray-200">S.No</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">Part No</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">Product Name</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">HSC/SAC</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">GST(%)</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">Quantity</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">UOM</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">Unit Price</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">Discount</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">Total</div>
                  <div className="p-3 text-center bg-gray-200 font-medium"></div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200 min-w-[1200px] mb-60 border-b border-gray-300">
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
                      style={{ gridTemplateColumns: '60px 150px 1fr 90px 80px 100px 60px 120px 100px 80px 60px' }}>
                      {/* S.No */}
                      <div className="p-2 border-r border-gray-200 text-center text-sm font-medium text-gray-600 flex items-center justify-center">
                        {index + 1}
                      </div>

                      {/* Product */}
                      <div className="p-1 border-r border-gray-200 relative">
                        <div className="relative">
                          <input
                            type="text"
                            value={productSearchTerms[index] || (item.product ? getProductPartNo(item.product) : '')}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateProductSearchTerm(index, value);
                              
                            // If input is cleared, clear all fields in this row
                            if (!value) {
                              updateInvoiceItem(index, 'product', '');
                              updateInvoiceItem(index, 'partNo', '');
                              updateInvoiceItem(index, 'quantity', 0);
                              updateInvoiceItem(index, 'unitPrice', 0);
                              updateInvoiceItem(index, 'uom', 'nos');
                              updateInvoiceItem(index, 'description', '');
                              updateInvoiceItem(index, 'hsnNumber', '');
                              updateInvoiceItem(index, 'discount', 0);
                              updateInvoiceItem(index, 'taxRate', 0);
                              updateInvoiceItem(index, 'totalPrice', 0);
                            }
                              
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
                                loadAllStockForLocation(formData.location);
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
                                loadAllStockForLocation(formData.location);
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
                            className="w-full p-2 pr-8 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50"
                            placeholder="Type to search..."
                            autoComplete="off"
                          />
                          {item.product && !productSearchTerms[index] && (
                            <button
                              type="button"
                              onClick={() => {
                                updateInvoiceItem(index, 'product', '');
                                updateInvoiceItem(index, 'partNo', '');
                                updateInvoiceItem(index, 'quantity', 0);
                                updateInvoiceItem(index, 'unitPrice', 0);
                                updateInvoiceItem(index, 'uom', 'nos');
                                updateInvoiceItem(index, 'description', '');
                                updateInvoiceItem(index, 'hsnNumber', '');
                                updateInvoiceItem(index, 'discount', 0);
                                updateInvoiceItem(index, 'taxRate', 0);
                                updateInvoiceItem(index, 'totalPrice', 0);
                                updateProductSearchTerm(index, '');
                              }}
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {showProductDropdowns[index] && (
                          <div
                            className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-[400px] overflow-hidden"
                            data-dropdown={index}
                            style={{ width: '450px', minWidth: '450px' }}
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
                                          {/* <div>
                                            <span className="font-medium">Brand:</span> {product?.brand || 'N/A'} •
                                            <span className="font-medium">Category:</span> {product?.category || 'N/A'}
                                          </div> */}

                                          {/* Stock Display - Location-specific when location is selected */}
                                          {(() => {
                                            // Use location-specific stock if location is selected and stock cache is available
                                            if (formData.location && productStockCache[product._id]) {
                                              const stockInfo = productStockCache[product._id];
                                              const available = stockInfo.available;
                                              
                                              // Show detailed breakdown if we have stock details
                                              if (stockInfo.stockDetails && stockInfo.stockDetails.length > 0) {
                                                return (
                                                  <div className="mt-1">
                                                    <div className="flex items-center mb-1">
                                                      <span className="font-medium text-gray-700">Location Stock:</span>
                                                      <span className={`ml-2 px-2 py-0.5 rounded-md text-xs font-bold ${available === 0
                                                        ? 'bg-red-100 text-red-800 border border-red-300'
                                                        : available <= 5
                                                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                                          : 'bg-green-100 text-green-800 border border-green-300'
                                                        }`}>
                                                        {available === 0 ? 'OUT OF STOCK' : `${available} available`}
                                                      </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 space-y-0.5">
                                                      {stockInfo.stockDetails.map((detail: any, detailIndex: number) => (
                                                        <div key={detailIndex} className="flex items-center">
                                                          <span className="font-medium">•</span>
                                                          <span className="ml-1">
                                                            {detail.location}
                                                            {detail.room && ` – ${detail.room}`}
                                                          {detail.rack && ` – ${detail.rack}`}
                                                          <span className="font-medium text-gray-700"> – {detail.available} available</span>
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              );
                                            }
                                            
                                            // Simple display if no detailed breakdown
                                            return (
                                              <div className="mt-1 flex items-center">
                                                <span className="font-medium text-gray-700">Stock:</span>
                                                <span className={`ml-2 px-2 py-0.5 rounded-md text-xs font-bold ${available === 0
                                                  ? 'bg-red-100 text-red-800 border border-red-300'
                                                  : available <= 5
                                                    ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                                    : 'bg-green-100 text-green-800 border border-green-300'
                                                  }`}>
                                                  {available === 0 ? 'OUT OF STOCK' : `${available} available`}
                                                </span>
                                              </div>
                                            );
                                          }
                                          
                                          // Fallback to aggregated stock for all locations
                                          const stockInfo = product.aggregatedStock;
                                          if (stockInfo && stockInfo.stockDetails.length > 0) {
                                            const totalAvailable = stockInfo.totalAvailable;
                                            return (
                                              <div className="mt-1">
                                                <div className="flex items-center mb-1">
                                                  <span className="font-medium text-gray-700">
                                                    {formData.location ? 'Location Stock:' : 'Total Stock:'}
                                                  </span>
                                                  <span className={`ml-2 px-2 py-0.5 rounded-md text-xs font-bold ${totalAvailable === 0
                                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                                    : totalAvailable <= 5
                                                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                                      : 'bg-green-100 text-green-800 border border-green-300'
                                                    }`}>
                                                    {totalAvailable === 0 ? 'OUT OF STOCK' : `${totalAvailable} available`}
                                                  </span>
                                                </div>
                                                <div className="text-xs text-gray-500 space-y-0.5">
                                                  {stockInfo.stockDetails.map((detail: any, detailIndex: number) => (
                                                    <div key={detailIndex} className="flex items-center">
                                                      <span className="font-medium">•</span>
                                                      <span className="ml-1">
                                                        {detail.location}
                                                        {detail.room && ` – ${detail.room}`}
                                                        {detail.rack && ` – ${detail.rack}`}
                                                        <span className="font-medium text-gray-700"> – {detail.available} available</span>
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          }
                                          return (
                                            <div className="mt-1 flex items-center">
                                              <span className="font-medium text-gray-700">Stock:</span>
                                              <span className="ml-2 px-2 py-0.5 rounded-md text-xs font-bold bg-red-100 text-red-600 border border-red-300">
                                                OUT OF STOCK
                                              </span>
                                            </div>
                                          );
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
                          {item.product && (() => {
                            const product = products.find(p => p._id === item.product);
                            const stockInfo = product?.aggregatedStock;
                            const totalAvailable = stockInfo?.totalAvailable || 0;
                            
                            if (stockInfo && stockInfo.stockDetails.length > 0) {
                              return (
                                <div className="flex-shrink-0">
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${totalAvailable === 0
                                    ? 'bg-red-100 text-red-800'
                                    : totalAvailable <= 5
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-green-100 text-green-800'
                                    }`}>
                                    {totalAvailable === 0
                                      ? '❌ Out of Stock'
                                      : `📦 ${totalAvailable} ${formData.location ? 'at location' : 'total'}`}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div className="flex-shrink-0">
                                <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                                  📦 No stock data
                                </span>
                              </div>
                            );
                          })()}
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
                          value={item.quantity || ''}
                          onChange={(e) => {
                            let newQuantity = parseFloat(e.target.value) || '' || 0;

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
                          placeholder="0"
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
                            {['nos', 'kg', 'litre', 'meter', 'sq.ft', 'pieces', 'eu'].map(uomOption => (
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

                      <div className="p-0 h-full">
                        <button
                          onClick={() => removeInvoiceItem(index)}
                          className="w-full h-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center justify-center border-0 hover:bg-red-100 bg-transparent"
                          title="Remove this item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Stock Status Summary */}
            {/* {formData.location && Object.keys(productStockCache).length > 0 && !stockLoading && (
              <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-gray-700">Stock Status:</span>
                    {(() => {
                      const totalProducts = Object.keys(productStockCache).length;
                      const inStock = Object.values(productStockCache).filter(stock => stock.available > 0).length;
                      const outOfStock = Object.values(productStockCache).filter(stock => stock.available === 0).length;
                      
                      return (
                        <div className="flex items-center space-x-3 text-xs">
                          <span className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-green-700">{inStock} in stock</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-red-700">{outOfStock} out of stock</span>
                          </span>
                          <span className="text-gray-500">• Total: {totalProducts} products</span>
                          {Object.keys(stockValidation).length > 0 && (
                            <span className="text-blue-600">• {Object.keys(stockValidation).length} items validated</span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={refreshStockValidationForAllItems}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                      title="Refresh stock validation for all items"
                    >
                      Refresh Validation
                    </button>
                    <button
                      onClick={loadAllStockForLocation}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                      title="Refresh stock information"
                    >
                      Refresh Stock
                    </button>
                  </div>
                </div>
              </div>
            )} */}

            {/* Excel-style Table */}
          </div>

          {/* Service Charges Section */}
          <div className="p-5 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Service Charges</h3>
              <button
                onClick={() => {
                  setFormData(prev => {
                    const newServiceCharges = [
                      ...(prev.serviceCharges || []),
                      {
                        description: '',
                        hsnNumber: '', // Add HSN field for new service charges
                        quantity: 1,
                        unitPrice: 0,
                        discount: 0,
                        discountedAmount: 0,
                        taxRate: 18, // Default GST rate
                        taxAmount: 0,
                        totalPrice: 0
                      }
                    ];
                    
                    // Recalculate totals including new service charge
                    const calculationResult = calculateQuotationTotals(
                      prev.items || [],
                      newServiceCharges,
                      prev.batteryBuyBack || null,
                      prev.overallDiscount || 0
                    );
                    
                    return {
                      ...prev,
                      serviceCharges: newServiceCharges,
                      subtotal: calculationResult.subtotal,
                      totalDiscount: calculationResult.totalDiscount,
                      totalTax: calculationResult.totalTax,
                      grandTotal: calculationResult.grandTotal
                    };
                  });
                }}
                type="button"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Service Charge</span>
              </button>
            </div>

            {/* Service Charges Table */}
            <div className="border border-gray-300 rounded-lg bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <div className="bg-gray-100 border-b border-gray-300 min-w-[1200px]">
                  <div className="grid text-xs font-bold text-gray-800 uppercase tracking-wide"
                    style={{ gridTemplateColumns: '1fr 120px 100px 120px 80px 100px 80px 60px' }}>
                    <div className="p-3 border-r border-gray-300 bg-gray-200">Description</div>
                    <div className="p-3 border-r border-gray-300 bg-gray-200">HSN</div>
                    <div className="p-3 border-r border-gray-300 bg-gray-200">Quantity</div>
                    <div className="p-3 border-r border-gray-300 bg-gray-200">Unit Price</div>
                    <div className="p-3 border-r border-gray-300 bg-gray-200">Discount %</div>
                    <div className="p-3 border-r border-gray-300 bg-gray-200">GST %</div>
                    <div className="p-3 text-center border-r border-gray-300 bg-gray-200">Total</div>
                    <div className="p-3 text-center bg-gray-200">Action</div>
                  </div>
                </div>

                <div className="divide-y divide-gray-200 min-w-[1200px]">
                  {(formData.serviceCharges || []).map((service, index) => (
                    <div key={index} className="grid group hover:bg-blue-50 transition-colors bg-white"
                      style={{ gridTemplateColumns: '1fr 120px 100px 120px 80px 100px 80px 60px' }}>
                      
                      {/* Description */}
                      <div className="p-2 border-r border-gray-200">
                        <input
                          type="text"
                          value={service.description}
                          onChange={(e) => {
                            const newServiceCharges = [...(formData.serviceCharges || [])];
                            newServiceCharges[index].description = e.target.value;
                            setFormData(prev => {
                              const updatedData = { ...prev, serviceCharges: newServiceCharges };
                              // Recalculate totals including service charges
                              const calculationResult = calculateQuotationTotals(
                                updatedData.items || [],
                                newServiceCharges,
                                updatedData.batteryBuyBack || null,
                                updatedData.overallDiscount || 0
                              );
                              return {
                                ...updatedData,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 ${
                            errors.find(error => error.field === `serviceCharges[${index}].description`)
                              ? 'bg-red-50 focus:bg-red-50 focus:ring-red-500 border border-red-300'
                              : 'focus:bg-blue-50 focus:ring-blue-500'
                          }`}
                          placeholder="Service description..."
                        />
                        {errors.find(error => error.field === `serviceCharges[${index}].description`) && (
                          <div className="mt-1 text-xs text-red-600">
                            {errors.find(error => error.field === `serviceCharges[${index}].description`)?.message}
                          </div>
                        )}
                      </div>

                      {/* HSN */}
                      <div className="p-2 border-r border-gray-200">
                        <input
                          type="text"
                          value={service.hsnNumber || ''}
                          onChange={(e) => {
                            const newServiceCharges = [...(formData.serviceCharges || [])];
                            newServiceCharges[index].hsnNumber = e.target.value;
                            setFormData(prev => ({ ...prev, serviceCharges: newServiceCharges }));
                          }}
                          className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 ${
                            errors.find(error => error.field === `serviceCharges[${index}].hsnNumber`)
                              ? 'bg-red-50 focus:bg-red-50 focus:ring-red-500 border border-red-300'
                              : 'focus:bg-blue-50 focus:ring-blue-500'
                          }`}
                          placeholder="HSN Code"
                        />
                        {errors.find(error => error.field === `serviceCharges[${index}].hsnNumber`) && (
                          <div className="mt-1 text-xs text-red-600">
                            {errors.find(error => error.field === `serviceCharges[${index}].hsnNumber`)?.message}
                          </div>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="p-2 border-r border-gray-200">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={service.quantity || ''}
                          onChange={(e) => {
                            const newServiceCharges = [...(formData.serviceCharges || [])];
                            const quantity = parseFloat(e.target.value) || 1;
                            const unitPrice = newServiceCharges[index].unitPrice || 0;
                            const discount = newServiceCharges[index].discount || 0;
                            const taxRate = newServiceCharges[index].taxRate || 0;
                            
                            // Calculate new totals
                            const itemSubtotal = quantity * unitPrice;
                            const discountAmount = (discount / 100) * itemSubtotal;
                            const discountedAmount = itemSubtotal - discountAmount;
                            const taxAmount = (taxRate / 100) * discountedAmount;
                            const totalPrice = discountedAmount + taxAmount;
                            
                            newServiceCharges[index] = {
                              ...newServiceCharges[index],
                              quantity,
                              discountedAmount: discountAmount,
                              taxAmount: taxAmount,
                              totalPrice: totalPrice
                            };
                            
                            setFormData(prev => {
                              const updatedData = { ...prev, serviceCharges: newServiceCharges };
                              // Recalculate totals including service charges
                              const calculationResult = calculateQuotationTotals(
                                updatedData.items || [],
                                newServiceCharges,
                                updatedData.batteryBuyBack || null,
                                updatedData.overallDiscount || 0
                              );
                              return {
                                ...updatedData,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 text-right ${
                            errors.find(error => error.field === `serviceCharges[${index}].quantity`)
                              ? 'bg-red-50 focus:bg-red-50 focus:ring-red-500 border border-red-300'
                              : 'focus:bg-blue-50 focus:ring-blue-500'
                          }`}
                        />
                        {errors.find(error => error.field === `serviceCharges[${index}].quantity`) && (
                          <div className="mt-1 text-xs text-red-600">
                            {errors.find(error => error.field === `serviceCharges[${index}].quantity`)?.message}
                          </div>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div className="p-2 border-r border-gray-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={service.unitPrice || ''}
                          onChange={(e) => {
                            const newServiceCharges = [...(formData.serviceCharges || [])];
                            const unitPrice = parseFloat(e.target.value) || 0;
                            const quantity = newServiceCharges[index].quantity || 1;
                            const discount = newServiceCharges[index].discount || 0;
                            const taxRate = newServiceCharges[index].taxRate || 0;
                            
                            // Calculate new totals
                            const itemSubtotal = quantity * unitPrice;
                            const discountAmount = (discount / 100) * itemSubtotal;
                            const discountedAmount = itemSubtotal - discountAmount;
                            const taxAmount = (taxRate / 100) * discountedAmount;
                            const totalPrice = discountedAmount + taxAmount;
                            
                            newServiceCharges[index] = {
                              ...newServiceCharges[index],
                              unitPrice,
                              discountedAmount: discountAmount,
                              taxAmount: taxAmount,
                              totalPrice: totalPrice
                            };
                            
                            setFormData(prev => {
                              const updatedData = { ...prev, serviceCharges: newServiceCharges };
                              // Recalculate totals including service charges
                              const calculationResult = calculateQuotationTotals(
                                updatedData.items || [],
                                newServiceCharges,
                                updatedData.batteryBuyBack || null,
                                updatedData.overallDiscount || 0
                              );
                              return {
                                ...updatedData,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 text-right ${
                            errors.find(error => error.field === `serviceCharges[${index}].unitPrice`)
                              ? 'bg-red-50 focus:bg-red-50 focus:ring-red-500 border border-red-300'
                              : 'focus:bg-blue-50 focus:ring-blue-500'
                          }`}
                        />
                        {errors.find(error => error.field === `serviceCharges[${index}].unitPrice`) && (
                          <div className="mt-1 text-xs text-red-600">
                            {errors.find(error => error.field === `serviceCharges[${index}].unitPrice`)?.message}
                          </div>
                        )}
                      </div>

                      {/* Discount */}
                      <div className="p-2 border-r border-gray-200">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={service.discount || ''}
                          onChange={(e) => {
                            const newServiceCharges = [...(formData.serviceCharges || [])];
                            const discount = parseFloat(e.target.value) || 0;
                            const quantity = newServiceCharges[index].quantity || 1;
                            const unitPrice = newServiceCharges[index].unitPrice || 0;
                            const taxRate = newServiceCharges[index].taxRate || 0;
                            
                            // Calculate new totals
                            const itemSubtotal = quantity * unitPrice;
                            const discountAmount = (discount / 100) * itemSubtotal;
                            const discountedAmount = itemSubtotal - discountAmount;
                            const taxAmount = (taxRate / 100) * discountedAmount;
                            const totalPrice = discountedAmount + taxAmount;
                            
                            newServiceCharges[index] = {
                              ...newServiceCharges[index],
                              discount,
                              discountedAmount: discountAmount,
                              taxAmount: taxAmount,
                              totalPrice: totalPrice
                            };
                            
                            setFormData(prev => {
                              const updatedData = { ...prev, serviceCharges: newServiceCharges };
                              // Recalculate totals including service charges
                              const calculationResult = calculateQuotationTotals(
                                updatedData.items || [],
                                newServiceCharges,
                                updatedData.batteryBuyBack || null,
                                updatedData.overallDiscount || 0
                              );
                              return {
                                ...updatedData,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 text-right ${
                            errors.find(error => error.field === `serviceCharges[${index}].discount`)
                              ? 'bg-red-50 focus:bg-red-50 focus:ring-red-500 border border-red-300'
                              : 'focus:bg-blue-50 focus:ring-blue-500'
                          }`}
                        />
                        {errors.find(error => error.field === `serviceCharges[${index}].discount`) && (
                          <div className="mt-1 text-xs text-red-600">
                            {errors.find(error => error.field === `serviceCharges[${index}].discount`)?.message}
                          </div>
                        )}
                      </div>

                      {/* Tax Rate */}
                      <div className="p-2 border-r border-gray-200">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={service.taxRate || ''}
                          onChange={(e) => {
                            const newServiceCharges = [...(formData.serviceCharges || [])];
                            const taxRate = parseFloat(e.target.value) || 0;
                            const quantity = newServiceCharges[index].quantity || 1;
                            const unitPrice = newServiceCharges[index].unitPrice || 0;
                            const discount = newServiceCharges[index].discount || 0;
                            
                            // Calculate new totals
                            const itemSubtotal = quantity * unitPrice;
                            const discountAmount = (discount / 100) * itemSubtotal;
                            const discountedAmount = itemSubtotal - discountAmount;
                            const taxAmount = (taxRate / 100) * discountedAmount;
                            const totalPrice = discountedAmount + taxAmount;
                            
                            newServiceCharges[index] = {
                              ...newServiceCharges[index],
                              taxRate,
                              taxAmount: taxAmount,
                              totalPrice: totalPrice
                            };
                            
                            setFormData(prev => {
                              const updatedData = { ...prev, serviceCharges: newServiceCharges };
                              // Recalculate totals including service charges
                              const calculationResult = calculateQuotationTotals(
                                updatedData.items || [],
                                newServiceCharges,
                                updatedData.batteryBuyBack || null,
                                updatedData.overallDiscount || 0
                              );
                              return {
                                ...updatedData,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 text-right ${
                            errors.find(error => error.field === `serviceCharges[${index}].taxRate`)
                              ? 'bg-red-50 focus:bg-red-50 focus:ring-red-500 border border-red-300'
                              : 'focus:bg-blue-50 focus:ring-blue-500'
                          }`}
                        />
                        {errors.find(error => error.field === `serviceCharges[${index}].taxRate`) && (
                          <div className="mt-1 text-xs text-red-600">
                            {errors.find(error => error.field === `serviceCharges[${index}].taxRate`)?.message}
                          </div>
                        )}
                      </div>

                      {/* Total */}
                      <div className="p-2 text-center border-r border-gray-200">
                        <div className="text-sm font-medium text-blue-600">
                          ₹{service.totalPrice?.toFixed(2) || '0.00'}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <div className="p-2 text-center">
                        <button
                          onClick={() => {
                            setFormData(prev => {
                              const newServiceCharges = (prev.serviceCharges || []).filter((_, i) => i !== index);
                              
                              // Recalculate totals excluding removed service charge
                              const calculationResult = calculateQuotationTotals(
                                prev.items || [],
                                newServiceCharges,
                                prev.batteryBuyBack || null,
                                prev.overallDiscount || 0
                              );
                              
                              return {
                                ...prev,
                                serviceCharges: newServiceCharges,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className="w-full h-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center justify-center border-0 hover:bg-red-100 bg-transparent"
                          title="Remove this service charge"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Battery Buy Back Section */}
          <div className="p-5 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Battery Buy Back (Deduction from Total)</h3>
              <button
                onClick={() => {
                  setFormData(prev => {
                    const newBatteryBuyBack = {
                      description: prev.batteryBuyBack?.description || 'Battery Buy Back',
                      hsnNumber: prev.batteryBuyBack?.hsnNumber || '', // Add HSN field for battery buy back
                      quantity: 1,
                      unitPrice: 0,
                      discount: 0,
                      discountedAmount: 0,
                      taxRate: 18, // Default GST rate
                      taxAmount: 0,
                      totalPrice: 0
                    };
                    
                    // Recalculate totals including battery buy back
                    const calculationResult = calculateQuotationTotals(
                      prev.items || [],
                      prev.serviceCharges || [],
                      newBatteryBuyBack,
                      prev.overallDiscount || 0
                    );
                    
                    return {
                      ...prev,
                      batteryBuyBack: newBatteryBuyBack,
                      subtotal: calculationResult.subtotal,
                      totalDiscount: calculationResult.totalDiscount,
                      totalTax: calculationResult.totalTax,
                      grandTotal: calculationResult.grandTotal
                    };
                  });
                }}
                type="button"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Battery Buy Back</span>
              </button>
            </div>

            {/* Battery Buy Back Table */}
            {formData.batteryBuyBack && formData.batteryBuyBack.description ? (
              <div className="border border-gray-300 rounded-lg bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="bg-gray-100 border-b border-gray-300 min-w-[1200px]">
                    <div className="grid text-xs font-bold text-gray-800 uppercase tracking-wide"
                      style={{ gridTemplateColumns: '1fr 120px 100px 120px 80px 100px 60px' }}>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">Description</div>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">HSN</div>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">Quantity</div>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">Unit Price</div>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">Discount %</div>
                      {/* <div className="p-3 border-r border-gray-300 bg-gray-200">GST %</div> */}
                      <div className="p-3 text-center border-r border-gray-300 bg-gray-200">Total</div>
                      <div className="p-3 text-center bg-gray-200">Action</div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-200 min-w-[1200px]">
                    <div className="grid group hover:bg-blue-50 transition-colors bg-white"
                      style={{ gridTemplateColumns: '1fr 120px 100px 120px 80px 100px 60px' }}>
                      
                      {/* Description */}
                      <div className="p-2 border-r border-gray-200">
                        <input
                          type="text"
                          value={formData.batteryBuyBack.description}
                          onChange={(e) => {
                            setFormData(prev => {
                              const newBatteryBuyBack = {
                                ...prev.batteryBuyBack!,
                                description: e.target.value
                              };
                              
                              // Recalculate totals including battery buy back
                              const calculationResult = calculateQuotationTotals(
                                prev.items || [],
                                prev.serviceCharges || [],
                                newBatteryBuyBack,
                                prev.overallDiscount || 0
                              );
                              
                              return {
                                ...prev,
                                batteryBuyBack: newBatteryBuyBack,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                          placeholder="Battery Buy Back"
                        />
                      </div>

                      {/* HSN */}
                      <div className="p-2 border-r border-gray-200">
                        <input
                          type="text"
                          value={formData.batteryBuyBack.hsnNumber || ''}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              batteryBuyBack: {
                                ...prev.batteryBuyBack!,
                                hsnNumber: e.target.value
                              }
                            }));
                          }}
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                          placeholder="HSN Code"
                        />
                      </div>

                      {/* Quantity */}
                      <div className="p-2 border-r border-gray-200">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={formData.batteryBuyBack.quantity || ''}
                          onChange={(e) => {
                            setFormData(prev => {
                              const quantity = parseFloat(e.target.value) || 1;
                              const unitPrice = prev.batteryBuyBack?.unitPrice || 0;
                              const discount = prev.batteryBuyBack?.discount || 0;
                              const taxRate = prev.batteryBuyBack?.taxRate || 0;
                              
                              // Calculate new totals
                              const itemSubtotal = quantity * unitPrice;
                              const discountAmount = (discount / 100) * itemSubtotal;
                              const discountedAmount = itemSubtotal - discountAmount;
                              const taxAmount = (taxRate / 100) * discountedAmount;
                              const totalPrice = discountedAmount + taxAmount;
                              
                              const newBatteryBuyBack = {
                                ...prev.batteryBuyBack!,
                                quantity,
                                discountedAmount: discountAmount,
                                taxAmount: taxAmount,
                                totalPrice: totalPrice
                              };
                              
                              // Recalculate totals including battery buy back
                              const calculationResult = calculateQuotationTotals(
                                prev.items || [],
                                prev.serviceCharges || [],
                                newBatteryBuyBack,
                                prev.overallDiscount || 0
                              );
                              
                              return {
                                ...prev,
                                batteryBuyBack: newBatteryBuyBack,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="p-2 border-r border-gray-200">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.batteryBuyBack.unitPrice || ''}
                          onChange={(e) => {
                            setFormData(prev => {
                              const unitPrice = parseFloat(e.target.value) || 0;
                              const quantity = prev.batteryBuyBack?.quantity || 1;
                              const discount = prev.batteryBuyBack?.discount || 0;
                              const taxRate = prev.batteryBuyBack?.taxRate || 0;
                              
                              // Calculate new totals
                              const itemSubtotal = quantity * unitPrice;
                              const discountAmount = (discount / 100) * itemSubtotal;
                              const discountedAmount = itemSubtotal - discountAmount;
                              const taxAmount = (taxRate / 100) * discountedAmount;
                              const totalPrice = discountedAmount + taxAmount;
                              
                              const newBatteryBuyBack = {
                                ...prev.batteryBuyBack!,
                                unitPrice,
                                discountedAmount: discountAmount,
                                taxAmount: taxAmount,
                                totalPrice: totalPrice
                              };
                              
                              // Recalculate totals including battery buy back
                              const calculationResult = calculateQuotationTotals(
                                prev.items || [],
                                prev.serviceCharges || [],
                                newBatteryBuyBack,
                                prev.overallDiscount || 0
                              );
                              
                              return {
                                ...prev,
                                batteryBuyBack: newBatteryBuyBack,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </div>

                      {/* Discount */}
                      <div className="p-2 border-r border-gray-200">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.batteryBuyBack.discount || ''}
                          onChange={(e) => {
                            setFormData(prev => {
                              const discount = parseFloat(e.target.value) || 0;
                              const quantity = prev.batteryBuyBack?.quantity || 1;
                              const unitPrice = prev.batteryBuyBack?.unitPrice || 0;
                              const taxRate = prev.batteryBuyBack?.taxRate || 0;
                              
                              // Calculate new totals
                              const itemSubtotal = quantity * unitPrice;
                              const discountAmount = (discount / 100) * itemSubtotal;
                              const discountedAmount = itemSubtotal - discountAmount;
                              const taxAmount = (taxRate / 100) * discountedAmount;
                              const totalPrice = discountedAmount + taxAmount;
                              
                              const newBatteryBuyBack = {
                                ...prev.batteryBuyBack!,
                                discount,
                                discountedAmount: discountAmount,
                                taxAmount: taxAmount,
                                totalPrice: totalPrice
                              };
                              
                              // Recalculate totals including battery buy back
                              const calculationResult = calculateQuotationTotals(
                                prev.items || [],
                                prev.serviceCharges || [],
                                newBatteryBuyBack,
                                prev.overallDiscount || 0
                              );
                              
                              return {
                                ...prev,
                                batteryBuyBack: newBatteryBuyBack,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </div>

                      {/* Tax Rate */}
                      {/* <div className="p-2 border-r border-gray-200">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={formData.batteryBuyBack.taxRate}
                          onChange={(e) => {
                            setFormData(prev => {
                              const taxRate = parseFloat(e.target.value) || 0;
                              const quantity = prev.batteryBuyBack?.quantity || 1;
                              const unitPrice = prev.batteryBuyBack?.unitPrice || 0;
                              const discount = prev.batteryBuyBack?.discount || 0;
                              
                              // Calculate new totals
                              const itemSubtotal = quantity * unitPrice;
                              const discountAmount = (discount / 100) * itemSubtotal;
                              const discountedAmount = itemSubtotal - discountAmount;
                              const taxAmount = (taxRate / 100) * discountedAmount;
                              const totalPrice = discountedAmount + taxAmount;
                              
                              const newBatteryBuyBack = {
                                ...prev.batteryBuyBack!,
                                taxRate,
                                taxAmount: taxAmount,
                                totalPrice: totalPrice
                              };
                              
                              // Recalculate totals including battery buy back
                              const calculationResult = calculateQuotationTotals(
                                prev.items || [],
                                prev.serviceCharges || [],
                                newBatteryBuyBack,
                                prev.overallDiscount || 0
                              );
                              
                              return {
                                ...prev,
                                batteryBuyBack: newBatteryBuyBack,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                        />
                      </div> */}

                      {/* Total */}
                      <div className="p-2 text-center border-r border-gray-200">
                        <div className="text-sm font-medium text-red-600">
                          ₹{formData.batteryBuyBack.totalPrice?.toFixed(2) || '0.00'}
                        </div>
                      </div>

                      {/* Remove Button */}
                      <div className="p-2 text-center">
                        <button
                          onClick={() => {
                            setFormData(prev => {
                              // Remove battery buy back by setting it to null
                              const calculationResult = calculateQuotationTotals(
                                prev.items || [],
                                prev.serviceCharges || [],
                                null, // Set battery buy back to null
                                prev.overallDiscount || 0
                              );
                              
                              return {
                                ...prev,
                                batteryBuyBack: undefined,
                                subtotal: calculationResult.subtotal,
                                totalDiscount: calculationResult.totalDiscount,
                                totalTax: calculationResult.totalTax,
                                grandTotal: calculationResult.grandTotal
                              };
                            });
                          }}
                          className="w-full h-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center justify-center border-0 hover:bg-red-100 bg-transparent"
                          title="Remove battery buy back"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                <p>No battery buy back added yet</p>
                <p className="text-sm">Click "Add Battery Buy Back" to add battery buy back item</p>
              </div>
            )}


            {/* Note about Battery Buy Back */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Note:</strong> Battery Buy Back is a deduction from the total. Use negative values (e.g., -500) to reduce the grand total.
              </p>
            </div>
          </div>

          {/* Company Information Section */}
          <div className="p-5 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
            
            {/* Bank Details Section */}
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-md font-semibold text-gray-800 mb-3">Bank Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={formData.company?.bankDetails?.bankName || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      company: {
                        ...prev.company!,
                        bankDetails: {
                          ...prev.company!.bankDetails!,
                          bankName: e.target.value
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter bank name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    value={formData.company?.bankDetails?.accountNo || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      company: {
                        ...prev.company!,
                        bankDetails: {
                          ...prev.company!.bankDetails!,
                          accountNo: e.target.value
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    value={formData.company?.bankDetails?.ifsc || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      company: {
                        ...prev.company!,
                        bankDetails: {
                          ...prev.company!.bankDetails!,
                          ifsc: e.target.value
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter IFSC code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Branch</label>
                  <input
                    type="text"
                    value={formData.company?.bankDetails?.branch || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      company: {
                        ...prev.company!,
                        bankDetails: {
                          ...prev.company!.bankDetails!,
                          branch: e.target.value
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter bank branch"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">
                QR Code Image <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <div className="space-y-3">
                {!qrCodePreview ? (
                  <div
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
                    onDragOver={handleQrCodeDragOver}
                    onDragLeave={handleQrCodeDragLeave}
                    onDrop={handleQrCodeDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleQrCodeUpload}
                      className="hidden"
                      id="qr-code-upload"
                    />
                    <label
                      htmlFor="qr-code-upload"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <QrCode className="w-12 h-12 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        <span className="font-medium text-blue-600 hover:text-blue-500">
                          Click to upload
                        </span>{' '}
                        or drag and drop
                      </div>
                      <div className="text-xs text-gray-500">
                        PNG, JPG, JPEG up to 5MB
                      </div>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative inline-block">
                      <img
                        src={qrCodePreview}
                        alt="QR Code Preview"
                        className="max-w-xs max-h-64 rounded-lg border border-gray-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={removeQrCode}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        title="Remove QR Code"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {qrCodeImage && <div className="text-sm text-gray-600">
                      <strong>File:</strong> {qrCodeImage?.name}
                      <br />
                      <strong>Size:</strong> {qrCodeImage?.size ? (qrCodeImage.size / 1024 / 1024).toFixed(2) : '0'} MB
                    </div>}
                  </div>
                )}

                <p className="text-sm text-gray-500 mt-2">
                  Upload a QR code image that will be included in the invoice
                </p>
              </div>
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
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
                    // Move to Terms field
                    setTimeout(() => {
                      const termsInput = document.querySelector('[data-field="terms"]') as HTMLTextAreaElement;
                      if (termsInput) termsInput.focus();
                    }, 50);
                  }
                }}
                rows={3}
                data-field="notes"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Additional notes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions (Optional)</label>
              <textarea
                value={formData.terms || ''}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    // Move back to Notes field
                    setTimeout(() => {
                      const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
                      if (notesInput) notesInput.focus();
                    }, 50);
                  } else if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    setTimeout(() => {
                      if (isSalesInvoice) {
                        const overallDiscountInput = document.querySelector('[data-field="overall-discount"]') as HTMLInputElement;
                        if (overallDiscountInput) overallDiscountInput.focus();
                      } else {
                        const createButton = document.querySelector('[data-action="create"]') as HTMLButtonElement;
                        if (createButton) createButton.focus();
                      }
                    }, 50);
                  }
                }}
                rows={3}
                data-field="terms"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Terms and conditions..."
              />
            </div>
          </div>
          

          {/* Overall Discount - Only for Sales Invoices */}
          {/* {isSalesInvoice && (
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-end">
                <div className="w-80">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Overall Discount (%):</label>
                    <input
                      type="number"
                      value={formData.overallDiscount || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        console.log('Overall discount changed to:', value);
                        setFormData(prev => {
                          // Calculate totals with the new overall discount
                          const calculationResult = calculateQuotationTotals(
                            prev.items || [], 
                            prev.serviceCharges || [], 
                            prev.batteryBuyBack || null,
                            value
                          );
                          console.log('Calculation result:', calculationResult);
                          const updatedData = {
                            ...prev,
                            overallDiscount: value,
                            overallDiscountAmount: calculationResult.overallDiscountAmount,
                            subtotal: calculationResult.subtotal,
                            totalDiscount: calculationResult.totalDiscount,
                            totalTax: calculationResult.totalTax,
                            grandTotal: calculationResult.grandTotal,
                            roundOff: calculationResult.roundOff
                          };
                          console.log('Updated form data:', updatedData);
                          return updatedData;
                        });
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
                          e.preventDefault();
                          setTimeout(() => {
                            const createButton = document.querySelector('[data-action="create"]') as HTMLButtonElement;
                            if (createButton) createButton.focus();
                          }, 50);
                        } else if (e.key === 'Tab' && e.shiftKey) {
                          e.preventDefault();
                          setTimeout(() => {
                            const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
                            if (notesInput) notesInput.focus();
                          }, 50);
                        }
                      }}
                      min="0"
                      max="100"
                      step="0.01"
                      data-field="overall-discount"
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>
          )} */}

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{formData.subtotal?.toFixed(2) || '0.00'}</span>
                </div>
                
                {/* Service Charges Subtotal */}
                {formData.serviceCharges && formData.serviceCharges.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service Charges:</span>
                    <span className="font-medium">₹{(() => {
                      const serviceTotal = (formData.serviceCharges || []).reduce((sum, service) => sum + (service.totalPrice || 0), 0);
                      return serviceTotal.toFixed(2);
                    })()}</span>
                  </div>
                )}
                
                {/* Battery Buy Back Subtotal */}
                {formData.batteryBuyBack && formData.batteryBuyBack.description && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Battery Buy Back (Deduction):</span>
                    <span className="font-medium text-red-600">-₹{(formData.batteryBuyBack.totalPrice || 0).toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Tax:</span>
                  <span className="font-medium">₹{formData.totalTax?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Discount:</span>
                  <span className="font-medium text-green-600">-₹{formData.totalDiscount?.toFixed(2) || '0.00'}</span>
                </div>
                {/* {isSalesInvoice && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Overall Discount:</span>
                    <span className="font-medium text-green-600">-{formData.overallDiscount || 0}% (-₹{formData.overallDiscountAmount?.toFixed(2) || '0.00'})</span>
                  </div>
                )} */}
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
                onKeyDown={(e) => {
                  if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    setTimeout(() => {
                      if (isSalesInvoice) {
                        const overallDiscountInput = document.querySelector('[data-field="overall-discount"]') as HTMLInputElement;
                        if (overallDiscountInput) overallDiscountInput.focus();
                      } else {
                        const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
                        if (notesInput) notesInput.focus();
                      }
                    }, 50);
                  }
                }}
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