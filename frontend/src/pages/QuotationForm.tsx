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
    QrCode
} from 'lucide-react';
import { Button } from '../components/ui/Botton';
import PageHeader from '../components/ui/PageHeader';
import { apiClient } from '../utils/api';
import { RootState } from '../store';
import toast from 'react-hot-toast';
import {
    calculateQuotationTotals,
    sanitizeQuotationData,
    getDefaultQuotationData,
    getFieldErrorMessage,
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
    isPrimary: boolean;
}



interface QuotationFormPageProps {
    showHeader?: boolean;
    selectedType?: string;
}

const QuotationFormPage: React.FC<QuotationFormPageProps> = ({ showHeader = true ,selectedType}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = useSelector((state: RootState) => state.auth.user);
    const tableContainerRef = useRef(null);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    // Get quotation data from location state
    const quotationFromState = (location.state as any)?.quotation;
    const mode = (location.state as any)?.mode;

    // Determine if this is edit mode
    const isEditMode = mode === 'edit' && Boolean(quotationFromState);

    // State management
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [addresses, setAddresses] = useState<any[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [locations, setLocations] = useState<StockLocationData[]>([]);
    const [fieldOperators, setFieldOperators] = useState<any[]>([]);
    const [generalSettings, setGeneralSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    console.log("fieldOperators13:", fieldOperators);

    // Custom dropdown states
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState<string | undefined>(undefined);
    const [isCustomerSearchMode, setIsCustomerSearchMode] = useState(false);
    const [showBillToAddressDropdown, setShowBillToAddressDropdown] = useState(false);
    const [billToAddressSearchTerm, setBillToAddressSearchTerm] = useState<string | undefined>(undefined);
    const [showShipToAddressDropdown, setShowShipToAddressDropdown] = useState(false);
    const [shipToAddressSearchTerm, setShipToAddressSearchTerm] = useState<string | undefined>(undefined);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);
    const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
    const [showUomDropdowns, setShowUomDropdowns] = useState<Record<number, boolean>>({});

    // Form states
    const [formData, setFormData] = useState<Partial<QuotationData>>(getDefaultQuotationData());
    const [errors, setErrors] = useState<ValidationError[]>([]);
    console.log('Initial form data12:', formData);
    // Debug: Log initial form data
    useEffect(() => {
        console.log('Initial form data:', formData);
        console.log('Valid until date:', formData.validUntil);
    }, []);

    console.log("customers13:", customers);


    // Update remaining amount when grand total changes
    useEffect(() => {
        if (formData.grandTotal !== undefined) {
            setFormData(prev => ({
                ...prev,
                remainingAmount: prev.grandTotal || 0
            }));
        }
    }, [formData.grandTotal]);

    // 🚀 STOCK DISPLAY STATES (Read-only for quotations)
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
    const [stockValidation, setStockValidation] = useState<Record<number, {
        available: number;
        isValid: boolean;
        message: string;
    }>>({});

    // Search states
    const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});
    const [uomSearchTerms, setUomSearchTerms] = useState<Record<number, string>>({});
    const [highlightedProductIndex, setHighlightedProductIndex] = useState<Record<number, number>>({});

    console.log("productStockCache:", Object.keys(productStockCache).length);

    // Excel-like navigation states for dropdown fields
    const [highlightedLocationIndex, setHighlightedLocationIndex] = useState(-1);
    const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
    const [highlightedBillToAddressIndex, setHighlightedBillToAddressIndex] = useState(-1);
    const [highlightedShipToAddressIndex, setHighlightedShipToAddressIndex] = useState(-1);
    const [highlightedEngineerIndex, setHighlightedEngineerIndex] = useState(-1);
    const [locationSearchTerm, setLocationSearchTerm] = useState<string | undefined>(undefined);
    const [engineerSearchTerm, setEngineerSearchTerm] = useState<string | undefined>('');


    // UOM options
    const UOM_OPTIONS = [
        'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos'
    ];

    // ServiceTicket related state
    const [dgDetailsWithServiceData, setDgDetailsWithServiceData] = useState<any[]>([]);
    const [showEngineSerialDropdown, setShowEngineSerialDropdown] = useState(false);
    const [engineSerialSearchTerm, setEngineSerialSearchTerm] = useState<string | undefined>('');
    const [highlightedEngineSerialIndex, setHighlightedEngineSerialIndex] = useState(-1);

    // QR Code upload states
    const [qrCodeImage, setQrCodeImage] = useState<File | null>(null);
    const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);



    // Helper function to get primary address email
    const getPrimaryAddressEmail = (customer: any): string | null => {
        if (!customer?.addresses || !Array.isArray(customer.addresses)) {
            return null;
        }
        
        // Find primary address
        const primaryAddress = customer.addresses.find((addr: any) => addr.isPrimary);
        if (primaryAddress?.email) {
            return primaryAddress.email;
        }
        
        // If no primary address with email, return null
        return null;
    };

    // Initialize data
    useEffect(() => {
        fetchAllData();
    }, []);

    // Load quotation data if editing (wait for customers to be loaded first)
    useEffect(() => {
        if (isEditMode && quotationFromState && customers.length > 0) {
            setFormDataFromQuotation(quotationFromState);
        } else if (isEditMode && !quotationFromState) {
            // If in edit mode but no quotation data, redirect back to billing
            toast.error('No quotation data found. Please try again.');
            navigate('/billing');
        }
    }, [isEditMode, quotationFromState, customers, navigate]);

    // Handle QR code image when editing existing quotation
    useEffect(() => {
        if (isEditMode && formData.qrCodeImage && typeof formData.qrCodeImage === 'string') {
            // If QR code is a string (base64 or URL), set it as preview
            setQrCodePreview(formData.qrCodeImage);
            setQrCodeImage(null); // Clear the file since we're showing the existing image
        }
    }, [isEditMode, formData.qrCodeImage]);

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
                setShowEngineSerialDropdown(false);
                setHighlightedEngineSerialIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    console.log("formData.location:", formData.location);

    // Payment helper functions
    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'paid':
                return 'text-green-600';
            case 'partial':
                return 'text-yellow-600';
            case 'gst_pending':
                return 'text-orange-600';
            case 'pending':
            default:
                return 'text-gray-600';
        }
    };

    const getPaymentStatusLabel = (status: string) => {
        switch (status) {
            case 'paid':
                return 'Paid';
            case 'partial':
                return 'Partial';
            case 'gst_pending':
                return 'GST Pending';
            case 'pending':
            default:
                return 'Pending';
        }
    };

    const getPaymentMethodLabel = (value: string) => {
        switch (value) {
            case 'cash':
                return 'Cash';
            case 'cheque':
                return 'Cheque';
            case 'bank_transfer':
                return 'Bank Transfer';
            case 'upi':
                return 'UPI';
            case 'card':
                return 'Credit/Debit Card';
            case 'razorpay':
                return 'Razorpay';
            case 'other':
                return 'Other';
            default:
                return 'Not specified';
        }
    };


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

    // 🚀 WATCH FOR LOCATION CHANGES AND LOAD STOCK
    useEffect(() => {
        if (formData.location && Object.keys(productStockCache).length === 0) {
            loadAllStockForLocation();
        }
    }, [formData.location]);

    // 🚀 CLEAR STOCK CACHE AND REFRESH PRODUCTS WHEN LOCATION CHANGES
    useEffect(() => {
        if (formData.location) {
            // Clear stock cache when location changes to force reload
            setProductStockCache({});
            setStockValidation({});
            // Load new stock data
            loadAllStockForLocation();
            // Refresh products with location-specific stock
            fetchProducts();
        } else {
            // If no location selected, refresh products with all stock
            fetchProducts();
        }
    }, [formData.location]);





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

    const setFormDataFromQuotation = (quotation: any) => {
        try {
            console.log('Quotation data received:', quotation);
            console.log('assignedEngineer from backend:', quotation.assignedEngineer, typeof quotation.assignedEngineer);

            // Find the customer in the customers list to get full customer data
            const fullCustomer = customers.find(c => c._id === quotation.customer?._id) || quotation.customer;

            // Get customer addresses - try multiple sources
            let customerAddresses = [];
            if (fullCustomer?.addresses) {
                customerAddresses = fullCustomer.addresses;
            } else if (quotation.customer?.addresses) {
                customerAddresses = quotation.customer.addresses;
            }

            // Set customer addresses first
            if (customerAddresses.length > 0) {
                setAddresses(customerAddresses);
            }

            // Fetch service tickets for the existing customer
            if (quotation.customer?._id) {
                fetchCustomerDgDetails(quotation.customer._id);
            }

            // Find matching address ID for the quotation's addresses
            let matchingBillToAddressId = quotation.billToAddress?.addressId;
            let matchingShipToAddressId = quotation.shipToAddress?.addressId;

            if (!matchingBillToAddressId && quotation.billToAddress && customerAddresses.length > 0) {
                // Try to find matching address by comparing address details
                const matchingAddress = customerAddresses.find((addr: any) =>
                    addr.address === quotation.billToAddress.address &&
                    addr.district === quotation.billToAddress.district &&
                    addr.pincode === quotation.billToAddress.pincode
                );

                if (matchingAddress) {
                    matchingBillToAddressId = matchingAddress.id;
                }
            }

            if (!matchingShipToAddressId && quotation.shipToAddress && customerAddresses.length > 0) {
                // Try to find matching address by comparing address details
                const matchingAddress = customerAddresses.find((addr: any) =>
                    addr.address === quotation.shipToAddress.address &&
                    addr.district === quotation.shipToAddress.district &&
                    addr.pincode === quotation.shipToAddress.pincode
                );

                if (matchingAddress) {
                    matchingShipToAddressId = matchingAddress.id;
                }
            }

            // Safely populate form with existing quotation data
            const formDataToSet = {
                ...quotation,
                subject: quotation.subject || '',
                customer: quotation.customer ? {
                    _id: quotation.customer._id || '',
                    name: quotation.customer.name || '',
                    email: getPrimaryAddressEmail(fullCustomer) || quotation.customer.email || '',
                    phone: quotation.customer.phone || '',
                    pan: quotation.customer.pan || ''
                } : {
                    _id: '',
                    name: '',
                    email: '',
                    phone: '',
                    pan: ''
                },
                location: quotation.location?._id || quotation.location || '',
                issueDate: quotation.issueDate ? new Date(quotation.issueDate) : new Date(),
                validUntil: quotation.validUntil ? new Date(quotation.validUntil) : new Date(),
                validityPeriod: quotation.validityPeriod || 30,
                // Service Ticket related fields
                engineSerialNumber: quotation.engineSerialNumber || '',
                kva: quotation.kva || '',
                hourMeterReading: quotation.hourMeterReading || '',
                serviceRequestDate: quotation.serviceRequestDate ? new Date(quotation.serviceRequestDate) : undefined,
                // Engineer assignment - ensure we only store the ID, not the full object
                assignedEngineer: quotation.assignedEngineer ?
                    (typeof quotation.assignedEngineer === 'string' ? quotation.assignedEngineer : quotation.assignedEngineer._id || quotation.assignedEngineer.id || '')
                    : '',
                // QR Code image
                qrCodeImage: quotation.qrCodeImage || undefined,
                items: (quotation.items || []).map((item: any) => ({
                    product: item.product?._id || item.product || '',
                    description: item.description || '',
                    quantity: item.quantity || 0,
                    unitPrice: item.unitPrice || 0,
                    taxRate: item.taxRate || 0,
                    discount: item.discount || 0,
                    partNo: item.partNo || '',
                    hsnNumber: item.hsnNumber || '',
                    uom: item.uom || 'nos',
                    discountedAmount: item.discountedAmount || 0,
                    taxAmount: item.taxAmount || 0,
                    totalPrice: item.totalPrice || 0
                })),
                // New fields for service charges and battery buy back
                serviceCharges: (quotation.serviceCharges || []).map((service: any) => ({
                    description: service.description || '',
                    hsnNumber: service.hsnNumber || '',
                    quantity: service.quantity || 0,
                    unitPrice: service.unitPrice || 0,
                    discount: service.discount || 0,
                    discountedAmount: service.discountedAmount || 0,
                    taxRate: service.taxRate || 18,
                    taxAmount: service.taxAmount || 0,
                    totalPrice: service.totalPrice || 0
                })),
                batteryBuyBack: quotation.batteryBuyBack ? {
                    description: quotation.batteryBuyBack.description || 'Battery Buy Back',
                    hsnNumber: quotation.batteryBuyBack.hsnNumber || '',
                    quantity: quotation.batteryBuyBack.quantity || 0,
                    unitPrice: quotation.batteryBuyBack.unitPrice || 0,
                    discount: quotation.batteryBuyBack.discount || 0,
                    discountedAmount: quotation.batteryBuyBack.discountedAmount || 0,
                    taxRate: 0,
                    taxAmount: quotation.batteryBuyBack.taxAmount || 0,
                    totalPrice: quotation.batteryBuyBack.totalPrice || 0
                } : {
                    description: 'Battery Buy Back',
                    hsnNumber: '',
                    quantity: 0,
                    unitPrice: 0,
                    discount: 0,
                    discountedAmount: 0,
                    taxRate: 0,
                    taxAmount: 0,
                    totalPrice: 0
                },
                notes: quotation.notes || '',
                terms: quotation.terms || '',
                billToAddress: quotation.billToAddress ? {
                    address: quotation.billToAddress.address || '',
                    state: quotation.billToAddress.state || '',
                    district: quotation.billToAddress.district || '',
                    pincode: quotation.billToAddress.pincode || '',
                    gstNumber: quotation.billToAddress.gstNumber || '',
                    ...(matchingBillToAddressId && { addressId: matchingBillToAddressId })
                } : {
                    address: '',
                    state: '',
                    district: '',
                    pincode: '',
                    gstNumber: ''
                },
                shipToAddress: quotation.shipToAddress ? {
                    address: quotation.shipToAddress.address || '',
                    state: quotation.shipToAddress.state || '',
                    district: quotation.shipToAddress.district || '',
                    pincode: quotation.shipToAddress.pincode || '',
                    gstNumber: quotation.shipToAddress.gstNumber || '',
                    ...(matchingShipToAddressId && { addressId: matchingShipToAddressId })
                } : {
                    address: '',
                    state: '',
                    district: '',
                    pincode: '',
                    gstNumber: ''
                }
            };

            setFormData(formDataToSet);

            // Reset search terms to show selected values properly
            setEngineerSearchTerm(undefined);
            setEngineSerialSearchTerm(undefined);

            // 🚀 LOAD STOCK DATA FOR EXISTING QUOTATION LOCATION
            if (formDataToSet.location) {
                setTimeout(() => {
                    loadAllStockForLocation();
                }, 100);
            }

        } catch (formError) {
            console.error('Error setting form data:', formError);
            toast.error('Error processing quotation data. Some fields may not load correctly.');
            // Set minimal fallback data
            setFormData(getDefaultQuotationData());
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

    // Fixed fetchProducts function with deduplication
    const fetchProducts = async () => {
        try {
            // If location is selected, filter stock by location; otherwise get all stock
            const queryParams = formData.location 
                ? { limit: 10000, page: 1, location: formData.location }
                : { limit: 10000, page: 1 };
            
            const response = await apiClient.stock.getStock(queryParams);
            const responseData = response.data as any;

            // Use Map to deduplicate products by ID and aggregate stock
            const uniqueProducts = new Map();
            const stockAggregation = new Map(); // Map to aggregate stock by product ID

            if (responseData.stockLevels && Array.isArray(responseData.stockLevels)) {
                responseData.stockLevels.forEach((stock: any) => {
                    const productId = stock.product?._id || stock.productId;
                    if (productId) {
                        // Only process stock for the selected location
                        if (formData.location && stock.location?._id !== formData.location) {
                            return; // Skip this stock item if it's not from the selected location
                        }

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

            console.log(`Loaded ${productsData.length} unique products with aggregated stock`); // Debug log
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

            // Set primary location as default if not already selected
            if (!isEditMode) {
                const primaryLocation = locationsData.find(loc => loc.isPrimary === true);
                if (primaryLocation) {
                    setFormData(prev => ({ ...prev, location: primaryLocation._id }));

                    // 🚀 LOAD STOCK DATA FOR DEFAULT LOCATION
                    setTimeout(() => {
                        loadAllStockForLocation();
                    }, 100);
                } else {
                    // Fallback to "Main Office" if no primary location is set
                    const mainOffice = locationsData.find(loc => loc.name === "Main Office");
                    if (mainOffice) {
                        setFormData(prev => ({ ...prev, location: mainOffice._id }));

                        // 🚀 LOAD STOCK DATA FOR DEFAULT LOCATION
                        setTimeout(() => {
                            loadAllStockForLocation();
                        }, 100);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching locations:', error);
            setLocations([]);
        }
    };

    // Fetch customer's DG details and service ticket data
    const fetchCustomerDgDetails = async (customerId: string) => {
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

                // Now fetch service tickets filtered by customer
                console.log('Fetching service tickets with params:', {
                    limit: 1000,
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
        }
    };

    // Enhanced getFilteredProducts function with deduplication and location-based stock filtering
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

    const updateProductSearchTerm = (itemIndex: number, searchTerm: string | undefined) => {
        setProductSearchTerms(prev => {
            const updated = { ...prev };
            if (typeof searchTerm === 'undefined') {
                delete updated[itemIndex];
            } else {
                updated[itemIndex] = searchTerm;
            }
            return updated;
        });
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
        const email = customer ? (getPrimaryAddressEmail(customer) || customer.email || '') : '';
        return customer ? `${customer.name} - ${email}` : 'Select customer';
    };

    // QR Code handling functions
    const handleQrCodeUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            processQrCodeFile(file);
        }
    };

    const processQrCodeFile = (file: File) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please select a valid image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image size should be less than 5MB');
            return;
        }

        setQrCodeImage(file);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            setQrCodePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
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
            processQrCodeFile(files[0]);
        }
    };

    const removeQrCode = () => {
        setQrCodeImage(null);
        setQrCodePreview(null);
        // Also clear from form data if it exists
        setFormData(prev => ({ ...prev, qrCodeImage: undefined }));
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

        return 'Select address';
    };

    const getProductCode = (productId: string) => {
        if (!productId) return '';
        const product = products.find(p => p._id === productId);
        return product?.partNo || product?.name || '';
    };

    const getProductName = (productId: string) => {
        if (!productId) return '';
        const product = products.find(p => p._id === productId);
        return product?.name || '';
    };

    const getProductPartNo = (productId: string) => {
        if (!productId) return '';
        const product = products.find(p => p._id === productId);
        return product?.partNo || '';
    };

    type EngineerValue = string | { id: string };

    const getEngineerLabel = (value: EngineerValue) => {

        // if (!value) return "Select engineer";

        // Extract ID whether it's a string or object
        const id = typeof value === "string" ? value : value?.id;

        const engineer = fieldOperators.find(e => e._id === id);

        return engineer ? (engineer.name || engineer.label || "Unknown Engineer") : "";
    };


    // 🚀 STOCK VALIDATION FUNCTIONS
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

        // If no stock cache loaded yet, load all stock for location
        if (Object.keys(productStockCache).length === 0) {
            await loadAllStockForLocation();
            return productStockCache[productId] || { available: 0, isValid: false, message: 'Unable to check stock' };
        }

        return productStockCache[productId] || { available: 0, isValid: false, message: 'Unable to check stock' };
    };

    // Get stock issues for validation
    const getStockIssues = (): { hasIssues: boolean; issueCount: number } => {
        if (!formData.location || !formData.items) return { hasIssues: false, issueCount: 0 };

        let issueCount = 0;
        formData.items.forEach(item => {
            if (item.product && item.quantity > 0) {
                const stockInfo = productStockCache[item.product];
                if (stockInfo && (!stockInfo.isValid || Number(item.quantity) > stockInfo.available)) {
                    issueCount++;
                }
            }
        });

        return { hasIssues: issueCount > 0, issueCount };
    };



    // Enhanced Excel-like keyboard navigation
    const handleProductKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
        const searchTerm = productSearchTerms[rowIndex] || '';
        const matchingProducts = getFilteredProducts(searchTerm);
        const currentHighlighted = highlightedProductIndex[rowIndex] ?? -1;

        // Ctrl+Delete or Command+Delete: Remove current row
        if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
            e.preventDefault();
            removeQuotationItem(rowIndex);
            return;
        }

        if (e.key === 'Tab') {
            e.preventDefault();

            if (e.shiftKey) {
                // Shift+Tab: Move to previous row's quantity field
                if (rowIndex > 0) {
                    const prevQuantityInput = document.querySelector(`[data-row="${rowIndex - 1}"][data-field="quantity"]`) as HTMLInputElement;
                    if (prevQuantityInput) {
                        prevQuantityInput.focus();
                        prevQuantityInput.select();
                    }
                }
                // If first row, stay in same field (no previous row)
                return;
            }

            // Auto-select highlighted product or first match if there's a search term
            if (matchingProducts.length > 0) {
                const selectedProduct = currentHighlighted >= 0 && currentHighlighted < matchingProducts.length
                    ? matchingProducts[currentHighlighted]
                    : matchingProducts[0];
                updateQuotationItem(rowIndex, 'product', selectedProduct._id);
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
                updateQuotationItem(rowIndex, 'product', selectedProduct._id);
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
                // If no search term, move to Notes field
                setTimeout(() => {
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

        // Ctrl+Delete or Command+Delete: Remove current row
        if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
            e.preventDefault();
            removeQuotationItem(rowIndex);
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            let newQuantity = currentQuantity + 1;
            updateQuotationItem(rowIndex, 'quantity', newQuantity);

        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            let newQuantity = Math.max(1, currentQuantity - 1); // Minimum quantity is 1
            updateQuotationItem(rowIndex, 'quantity', newQuantity);

            updateQuotationItem(rowIndex, 'quantity', newQuantity);

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
                addQuotationItem();
            }

            // Tab: Move to next row's product field
            const nextRowIndex = rowIndex + 1;
            setTimeout(() => {
                const nextInput = document.querySelector(`[data-row="${nextRowIndex}"][data-field="product"]`) as HTMLInputElement;
                if (nextInput) nextInput.focus();
            }, 100);

        } else if (e.key === 'Enter') {
            e.preventDefault();

            // Move to Notes field when Enter is pressed
            setTimeout(() => {
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
            removeQuotationItem(rowIndex);
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
                        // If at first row, first field, move to Valid Until field
                        setTimeout(() => {
                            const validUntilInput = document.querySelector('[data-field="valid-until"]') as HTMLInputElement;
                            if (validUntilInput) validUntilInput.focus();
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

            // Enter: Always move to Notes field
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
                    const validUntilInput = document.querySelector('[data-field="valid-until"]') as HTMLInputElement;
                    if (validUntilInput) validUntilInput.focus();
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

    const extractGSTRate = (gst: string | number | undefined): number => {
        if (!gst) return 0;
        if (typeof gst === 'number') return gst;
        const match = gst.match(/(\d+(\.\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    };

    // Safe date conversion helper to prevent "Invalid time value" errors
    const formatDateForInput = (dateValue: any): string => {
        if (!dateValue) return '';

        try {
            const date = new Date(dateValue);
            // Check if the date is valid
            if (isNaN(date.getTime())) return '';

            // Format as YYYY-MM-DD for date input
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return '';
        }
    };

    // 🚀 EXCEL-LIKE DROPDOWN NAVIGATION FUNCTIONS

    // Location dropdown keyboard navigation
    const handleLocationKeyDown = (e: React.KeyboardEvent) => {
        const filteredLocations = locations.filter(location =>
            location.name.toLowerCase().includes(locationSearchTerm?.toLowerCase() || '')
            // location.type.toLowerCase().includes(locationSearchTerm.toLowerCase())
        );

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!showLocationDropdown) {
                setShowLocationDropdown(true);
                // Find and highlight currently selected location, or start at 0
                const currentLocationIndex = filteredLocations.findIndex(loc => loc._id === formData.location);
                const startIndex = currentLocationIndex >= 0 ? currentLocationIndex : 0;
                setHighlightedLocationIndex(startIndex);

                // Scroll to highlighted item
                setTimeout(() => {
                    const highlightedElement = document.querySelector(`[data-location-index="${startIndex}"]`);
                    if (highlightedElement) {
                        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 10);
            } else {
                const newIndex = highlightedLocationIndex < filteredLocations.length - 1 ? highlightedLocationIndex + 1 : 0;
                setHighlightedLocationIndex(newIndex);

                // Scroll to highlighted item
                setTimeout(() => {
                    const highlightedElement = document.querySelector(`[data-location-index="${newIndex}"]`);
                    if (highlightedElement) {
                        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 10);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!showLocationDropdown) {
                setShowLocationDropdown(true);
                // Find and highlight currently selected location, or start at last
                const currentLocationIndex = filteredLocations.findIndex(loc => loc._id === formData.location);
                const startIndex = currentLocationIndex >= 0 ? currentLocationIndex : filteredLocations.length - 1;
                setHighlightedLocationIndex(startIndex);

                // Scroll to highlighted item
                setTimeout(() => {
                    const highlightedElement = document.querySelector(`[data-location-index="${startIndex}"]`);
                    if (highlightedElement) {
                        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 10);
            } else {
                const newIndex = highlightedLocationIndex > 0 ? highlightedLocationIndex - 1 : filteredLocations.length - 1;
                setHighlightedLocationIndex(newIndex);

                // Scroll to highlighted item
                setTimeout(() => {
                    const highlightedElement = document.querySelector(`[data-location-index="${newIndex}"]`);
                    if (highlightedElement) {
                        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 10);
            }
        } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
            e.preventDefault();

            // FIXED: Only process selection if dropdown is open AND location is highlighted
            if (showLocationDropdown && highlightedLocationIndex >= 0 && filteredLocations[highlightedLocationIndex]) {
                const selectedLocation = filteredLocations[highlightedLocationIndex];
                setFormData({ ...formData, location: selectedLocation._id });
                setShowLocationDropdown(false);
                setHighlightedLocationIndex(-1);
                setLocationSearchTerm('');

                // 🚀 LOAD STOCK DATA FOR NEW LOCATION
                setTimeout(() => {
                    loadAllStockForLocation();
                }, 100);
            }

            // FIXED: Always move to next field regardless of dropdown state
            setTimeout(() => {
                const customerInput = document.querySelector('[data-field="customer"]') as HTMLInputElement;
                if (customerInput) customerInput.focus();
            }, 50);

        } else if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            // Location is first field, so Shift+Tab doesn't move anywhere
            // Could add focus to a "Back" button or form title if needed
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
            return (
                (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
                (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
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

                // Scroll to highlighted item
                setTimeout(() => {
                    const highlightedElement = document.querySelector(`[data-customer-index="${newIndex}"]`);
                    if (highlightedElement) {
                        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 10);
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (!showCustomerDropdown) {
                setShowCustomerDropdown(true);
                setHighlightedCustomerIndex(filteredCustomers.length - 1);
            } else {
                const newIndex = highlightedCustomerIndex > 0 ? highlightedCustomerIndex - 1 : filteredCustomers.length - 1;
                setHighlightedCustomerIndex(newIndex);

                // Scroll to highlighted item
                setTimeout(() => {
                    const highlightedElement = document.querySelector(`[data-customer-index="${newIndex}"]`);
                    if (highlightedElement) {
                        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                }, 10);
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
            // Move back to location field
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
        } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
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
                        gstNumber: selectedAddress.gstNumber || '',
                        ...(selectedAddress.id && { addressId: selectedAddress.id })
                    } as any
                });
                setShowBillToAddressDropdown(false);
                setHighlightedBillToAddressIndex(-1);

                // Note: Removed automatic focus to Ship To Address to allow independent selection
            } else if (!showBillToAddressDropdown) {
                // Note: Removed automatic focus to Ship To Address to allow independent selection
            }
        } else if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            // Move back to customer field
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
        } else if (e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
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
                        gstNumber: selectedAddress.gstNumber || '',
                        ...(selectedAddress.id && { addressId: selectedAddress.id })
                    } as any
                });
                setShowShipToAddressDropdown(false);
                setHighlightedShipToAddressIndex(-1);

                // Move to next field (validity period)
                setTimeout(() => {
                    const validityInput = document.querySelector('[data-field="validity-period"]') as HTMLInputElement;
                    if (validityInput) validityInput.focus();
                }, 50);
            } else if (!showShipToAddressDropdown) {
                // If no dropdown open, just move to next field
                setTimeout(() => {
                    const validityInput = document.querySelector('[data-field="validity-period"]') as HTMLInputElement;
                    if (validityInput) validityInput.focus();
                }, 50);
            }
        } else if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            // Move back to bill to address field
            setTimeout(() => {
                const billToAddressInput = document.querySelector('[data-field="bill-to-address"]') as HTMLInputElement;
                if (billToAddressInput) billToAddressInput.focus();
            }, 50);
        } else if (e.key === 'Escape') {
            setShowShipToAddressDropdown(false);
            setHighlightedShipToAddressIndex(-1);
        }
    };



    const addQuotationItem = () => {
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
                    hsnNumber: '',
                    uom: 'nos',
                    discountedAmount: 0,
                    taxAmount: 0,
                    totalPrice: 0
                }
            ]
        }));
    };

    const removeQuotationItem = (index: number) => {
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
    };

    const updateQuotationItem = (index: number, field: keyof QuotationItem, value: any) => {
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
                if (formData.location && productStockCache[value]) {
                    const stockInfo = productStockCache[value];
                    if (stockInfo.available === 0) {
                        updatedItems[index].quantity = 0;
                        // toast.error(`${productObj?.name || 'Product'} is out of stock. Quantity set to 0.`, { duration: 3000 });
                    }
                }

                // 🚀 VALIDATE STOCK FOR NEW PRODUCT
                if (value && formData.location) {
                    validateStockForItem(index, value, updatedItems[index].quantity);
                }
            }

            // 🚀 VALIDATE STOCK WHEN QUANTITY CHANGES
            if (field === 'quantity' && updatedItems[index].product && formData.location) {
                validateStockForItem(index, updatedItems[index].product, value);
            }

            // Recalculate totals
            const calculationResult = calculateQuotationTotals(updatedItems, prev.serviceCharges || [], prev.batteryBuyBack || null, prev.overallDiscount || 0);

            return {
                ...prev,
                items: calculationResult.items,
                subtotal: calculationResult.subtotal,
                totalDiscount: calculationResult.totalDiscount,
                overallDiscount: calculationResult.overallDiscount,
                totalTax: calculationResult.totalTax,
                grandTotal: calculationResult.grandTotal,
                roundOff: calculationResult.roundOff
            };
        });

        // Note: Auto-row addition is now handled by Tab/Enter in quantity field for deliberate control
    };



    const validateForm = (): boolean => {
        const validation = validateQuotationData(formData);
        setErrors(validation.errors);

        // 🚀 CHECK FOR STOCK ISSUES
        const stockIssues = getStockIssues();
        if (stockIssues.hasIssues) {
            toast.error(`⚠️ Stock Issues: ${stockIssues.issueCount} item(s) have insufficient stock or are out of stock`, { duration: 5000 });
        }

        return validation.errors.length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            toast.error('Please fix the validation errors');
            return;
        }

        setSubmitting(true);
        try {
            let qrCodeImageUrl = formData.qrCodeImage;

            // If there's a new QR code image file, upload it first
            if (qrCodeImage && qrCodeImage instanceof File) {
                try {
                    const uploadResponse = await apiClient.qrCode.upload(qrCodeImage);
                    if (uploadResponse.success) {
                        qrCodeImageUrl = uploadResponse.data.url;
                    }
                } catch (uploadError) {
                    console.error('Error uploading QR code:', uploadError);
                    toast.error('Failed to upload QR code image. Please try again.');
                    setSubmitting(false);
                    return;
                }
            }

            // Ensure company information is included
            const submissionData = {
                ...formData,
                qrCodeImage: qrCodeImageUrl, // Use uploaded URL or existing URL
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

            // Sanitize data before sending
            const sanitizedData = sanitizeQuotationData(submissionData);

            if (isEditMode && quotationFromState?._id) {
                await apiClient.quotations.update(quotationFromState._id, sanitizedData);
                toast.success('Quotation updated successfully');
            } else {
                await apiClient.quotations.create(sanitizedData);
                toast.success('Quotation created successfully');
            }

            navigate('/billing');
        } catch (error) {
            console.error('Error saving quotation:', error);
            toast.error(`Failed to ${isEditMode ? 'update' : 'create'} quotation. Please try again.`);
        } finally {
            setSubmitting(false);
        }
    };

    // Handle customer selection
    const handleCustomerSelect = (customerId: string) => {
        const customer = customers.find(c => c._id === customerId);
        if (customer) {
            // Check if this is a different customer than currently selected
            const isDifferentCustomer = formData.customer?._id !== customer._id;

            if (isDifferentCustomer) {
                // Different customer - clear addresses and engine-related fields
                setFormData({
                    ...formData,
                    customer: {
                        _id: customer._id, // Store customer ID
                        name: customer.name,
                        email: getPrimaryAddressEmail(customer) || customer.email || '',
                        phone: customer.phone || '',
                        pan: '' // Reset pan when customer changes
                    },
                    customerAddress: undefined, // Clear customer address when customer changes
                    // Clear Bill To and Ship To addresses when customer changes
                    billToAddress: {
                        address: '',
                        state: '',
                        district: '',
                        pincode: '',
                        gstNumber: ''
                    },
                    shipToAddress: {
                        address: '',
                        state: '',
                        district: '',
                        pincode: '',
                        gstNumber: ''
                    },
                    // Clear engine-related fields when customer changes
                    engineSerialNumber: '',
                    kva: '',
                    hourMeterReading: '',
                    serviceRequestDate: undefined
                });
                setAddresses(customer.addresses || []);

                // Fetch service tickets for the new customer
                fetchCustomerDgDetails(customerId);
            } else {
                // Same customer - just update customer data without clearing addresses/engine fields
                setFormData({
                    ...formData,
                    customer: {
                        _id: customer._id,
                        name: customer.name,
                        email: getPrimaryAddressEmail(customer) || customer.email || '',
                        phone: customer.phone || '',
                        pan: formData.customer?.pan || '' // Keep existing pan if same customer
                    }
                });
                // Ensure addresses are still available (in case they weren't loaded)
                if (addresses.length === 0) {
                    setAddresses(customer.addresses || []);
                }
            }

            setShowCustomerDropdown(false);

            // Exit search mode and clear search term
            setIsCustomerSearchMode(false);
            setCustomerSearchTerm(undefined);
        }
    };

    // Handle engine serial dropdown keyboard navigation
    const handleEngineSerialKeyDown = (e: React.KeyboardEvent) => {
        if (!showEngineSerialDropdown) return;

        // If no DG details available, only handle Escape key
        if (dgDetailsWithServiceData.length === 0) {
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowEngineSerialDropdown(false);
                setHighlightedEngineSerialIndex(-1);
            }
            return;
        }

        const filteredTickets = dgDetailsWithServiceData.filter(ticket =>
            ticket.engineSerialNumber &&
            engineSerialSearchTerm &&
            ticket.engineSerialNumber.toLowerCase().includes(engineSerialSearchTerm?.toLowerCase())
        );

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (filteredTickets.length > 0) {
                    setHighlightedEngineSerialIndex(prev =>
                        prev < filteredTickets.length - 1 ? prev + 1 : 0
                    );
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (filteredTickets.length > 0) {
                    setHighlightedEngineSerialIndex(prev =>
                        prev > 0 ? prev - 1 : filteredTickets.length - 1
                    );
                }
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedEngineSerialIndex >= 0 && highlightedEngineSerialIndex < filteredTickets.length) {
                    const selectedTicket = filteredTickets[highlightedEngineSerialIndex];
                    setFormData({
                        ...formData,
                        engineSerialNumber: selectedTicket.engineSerialNumber || '',
                        kva: selectedTicket.dgRatingKVA ? String(selectedTicket.dgRatingKVA) : '',
                        hourMeterReading: selectedTicket.HourMeterReading || '',
                        serviceRequestDate: selectedTicket.ServiceRequestDate ? new Date(selectedTicket.ServiceRequestDate) : undefined
                    });
                    setShowEngineSerialDropdown(false);
                    setEngineSerialSearchTerm('');
                    setHighlightedEngineSerialIndex(-1);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setShowEngineSerialDropdown(false);
                setHighlightedEngineSerialIndex(-1);
                break;
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
            {showHeader && (
                <PageHeader
                    title={isEditMode ? 'Edit Quotation' : 'Create Quotation'}
                    subtitle={isEditMode ? 'Modify quotation details' : 'Create a new customer quotation'}
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
            )}



            {/* 🚀 EXCEL-LIKE NAVIGATION GUIDE */}
            {/* <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                    <span className="text-lg">⚡</span>
                    <h3 className="text-sm font-semibold text-blue-900 ml-2">Excel-Like Navigation Enabled!</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-800">
                    <div>
                        <p className="font-medium mb-1">🎯 Complete Form Navigation:</p>
                        <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Tab/Enter</kbd> Move forward</p>
                        <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Shift+Tab</kbd> Move backward</p>
                        <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">↑↓</kbd> Navigate dropdowns</p>
                    </div>
                    <div>
                        <p className="font-medium mb-1">🔥 Super Fast Flow:</p>
                        <p>Location → Customer → Address → Validity Period → Valid Until → Products</p>
                        <p><strong>Products:</strong> Search → Select → Quantity → Tab (Next Row) → Enter (Notes)</p>
                    </div>
                </div>
            </div> */}

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

                    {/* 🚀 Stock Warning Banner */}
                    {formData.location && getStockIssues().hasIssues && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-yellow-800">
                                        Stock Warning: {getStockIssues().issueCount} item(s) have stock issues
                                    </h3>
                                    <div className="mt-2 text-sm text-yellow-700">
                                        <p>Some products in your quotation have insufficient stock or are out of stock. Please review the items below:</p>
                                        <ul className="mt-2 space-y-1">
                                            {(formData.items || []).map((item, index) => {
                                                if (item.product && item.quantity > 0 && productStockCache[item.product]) {
                                                    const stockInfo = productStockCache[item.product];
                                                    if (!stockInfo.isValid || Number(item.quantity) > stockInfo.available) {
                                                        return (
                                                            <li key={index} className="flex items-center justify-between">
                                                                <span>• {getProductName(item.product)} (Qty: {item.quantity})</span>
                                                                <span className="font-medium">
                                                                    {stockInfo.available === 0
                                                                        ? '❌ Out of stock'
                                                                        : `⚠️ Only ${stockInfo.available} available`
                                                                    }
                                                                </span>
                                                            </li>
                                                        );
                                                    }
                                                }
                                                return null;
                                            })}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Customer and Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                From Location *
                            </label>

                            {/* 🚀 Stock Loading Indicator */}
                            {/* {formData.location && Object.keys(productStockCache).length === 0 && (
        <div className="mb-2 flex items-center text-xs text-blue-600">
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
            <span>Loading stock data for this location...</span>
        </div>
    )} */}

                            <div className="relative dropdown-container">
                                <input
                                    type="text"
                                    value={locationSearchTerm !== undefined ? locationSearchTerm : getLocationLabel(formData.location || '')}
                                    onChange={(e) => {
                                        setLocationSearchTerm(e.target.value);
                                        if (!showLocationDropdown) setShowLocationDropdown(true);
                                        setHighlightedLocationIndex(-1);
                                        // Clear the selected location when user starts typing
                                        if (e.target.value === '') {
                                            setFormData({ ...formData, location: '' });
                                            // Clear stock cache when location changes
                                            setProductStockCache({});
                                            setStockValidation({});
                                        }
                                    }}
                                    onFocus={() => {
                                        setShowLocationDropdown(true);

                                        // Auto-select primary location if no location is selected
                                        if (!formData.location) {
                                            const primaryLocation = locations.find(loc => loc.isPrimary === true);
                                            if (primaryLocation) {
                                                setFormData({ ...formData, location: primaryLocation._id });
                                                // Clear stock cache when location changes
                                                setProductStockCache({});
                                                setStockValidation({});
                                            } else {
                                                // Fallback to Main Office if no primary location is set
                                                const mainOffice = locations.find(loc =>
                                                    loc.name.toLowerCase().includes('main office') ||
                                                    loc.name.toLowerCase() === 'main office'
                                                );
                                                if (mainOffice) {
                                                    setFormData({ ...formData, location: mainOffice._id });
                                                    // Clear stock cache when location changes
                                                    setProductStockCache({});
                                                    setStockValidation({});
                                                }
                                            }
                                        }

                                        setHighlightedLocationIndex(-1);
                                        // Initialize search term for editing
                                        if (locationSearchTerm === undefined && formData.location) {
                                            setLocationSearchTerm(getLocationLabel(formData.location));
                                        } else if (!locationSearchTerm && !formData.location) {
                                            setLocationSearchTerm('');
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        const filteredLocations = locations.filter(location => {
                                            const searchTerm = (locationSearchTerm || '').toLowerCase();
                                            return (
                                                location.name.toLowerCase().includes(searchTerm) ||
                                                location.type.toLowerCase().includes(searchTerm)
                                            );
                                        });

                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setShowLocationDropdown(true);
                                            setHighlightedLocationIndex(prev =>
                                                prev < filteredLocations.length - 1 ? prev + 1 : 0
                                            );
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setShowLocationDropdown(true);
                                            setHighlightedLocationIndex(prev =>
                                                prev > 0 ? prev - 1 : filteredLocations.length - 1
                                            );
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (showLocationDropdown && highlightedLocationIndex >= 0 && filteredLocations.length > 0) {
                                                const selectedLocation = filteredLocations[highlightedLocationIndex];
                                                setFormData({ ...formData, location: selectedLocation._id });
                                                setShowLocationDropdown(false);
                                                setLocationSearchTerm(undefined); // Reset to show selected location name
                                                setHighlightedLocationIndex(-1);
                                                // Clear stock cache when location changes
                                                setProductStockCache({});
                                                setStockValidation({});
                                            } else if (showLocationDropdown && filteredLocations.length === 1) {
                                                const selectedLocation = filteredLocations[0];
                                                setFormData({ ...formData, location: selectedLocation._id });
                                                setShowLocationDropdown(false);
                                                setLocationSearchTerm(undefined); // Reset to show selected location name
                                                setHighlightedLocationIndex(-1);
                                                // Clear stock cache when location changes
                                                setProductStockCache({});
                                                setStockValidation({});
                                            }
                                        } else if (e.key === 'Escape') {
                                            setShowLocationDropdown(false);
                                            setHighlightedLocationIndex(-1);
                                            setLocationSearchTerm(undefined); // Reset search term
                                        } else if ((e.key === 'Tab' && !e.shiftKey)) {
                                            e.preventDefault();
                                            setShowLocationDropdown(false);
                                            // Move to next field (customize as needed)
                                            setTimeout(() => {
                                                const nextInput = document.querySelector('[data-field="next-field"]') as HTMLInputElement;
                                                if (nextInput) nextInput.focus();
                                            }, 50);
                                        } else if (e.key === 'Tab' && e.shiftKey) {
                                            e.preventDefault();
                                            setShowLocationDropdown(false);
                                            // Move back to previous field (customize as needed)
                                            setTimeout(() => {
                                                const prevInput = document.querySelector('[data-field="prev-field"]') as HTMLInputElement;
                                                if (prevInput) prevInput.focus();
                                            }, 50);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // Delay hiding dropdown to allow for clicks
                                        setTimeout(() => {
                                            setShowLocationDropdown(false);
                                            setHighlightedLocationIndex(-1);
                                            // If no location selected and search term exists, clear it
                                            if (!formData.location && locationSearchTerm) {
                                                setLocationSearchTerm(undefined);
                                            }
                                        }, 150);
                                    }}
                                    autoComplete="off"
                                    placeholder="Search location or press ↓ to open"
                                    data-field="location"
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                                </div>

                                {/* Clear button - only show when there's a search term or selected location */}
                                {(locationSearchTerm || formData.location) && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData({ ...formData, location: '' });
                                            setLocationSearchTerm('');
                                            setShowLocationDropdown(false);
                                            setHighlightedLocationIndex(-1);
                                            // Clear stock cache when location changes
                                            setProductStockCache({});
                                            setStockValidation({});
                                            // Refocus the input
                                            setTimeout(() => {
                                                const input = document.querySelector('[data-field="location"]') as HTMLInputElement;
                                                if (input) input.focus();
                                            }, 10);
                                        }}
                                        className="absolute inset-y-0 right-8 flex items-center pr-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}

                                {showLocationDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                                        {(() => {
                                            const filteredLocations = locations.filter(location => {
                                                const searchTerm = (locationSearchTerm || '').toLowerCase();
                                                return (
                                                    location.name.toLowerCase().includes(searchTerm) ||
                                                    location.type.toLowerCase().includes(searchTerm)
                                                );
                                            });

                                            return (
                                                <>
                                                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, location: '' });
                                                            setShowLocationDropdown(false);
                                                            setLocationSearchTerm(undefined);
                                                            setHighlightedLocationIndex(-1);
                                                            // Clear stock cache when location changes
                                                            setProductStockCache({});
                                                            setStockValidation({});
                                                        }}
                                                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.location ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                                    >
                                                        Select location
                                                    </button>

                                                    {filteredLocations.map((location, index) => (
                                                        <button
                                                            key={location._id}
                                                            type="button"
                                                            data-location-index={index}
                                                            onClick={() => {
                                                                setFormData({ ...formData, location: location._id });
                                                                setShowLocationDropdown(false);
                                                                setLocationSearchTerm(undefined); // Reset to show selected name
                                                                setHighlightedLocationIndex(-1);
                                                                // Clear stock cache when location changes
                                                                setProductStockCache({});
                                                                setStockValidation({});
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

                                                    {filteredLocations.length === 0 && (
                                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                            No locations found
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
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
                                    value={customerSearchTerm !== undefined ? customerSearchTerm : getCustomerLabel(formData.customer?._id || '')}
                                    onChange={(e) => {
                                        setCustomerSearchTerm(e.target.value);
                                        if (!showCustomerDropdown) setShowCustomerDropdown(true);
                                        setHighlightedCustomerIndex(-1);

                                        // Clear the selected customer when user starts typing
                                        if (e.target.value === '') {
                                            setFormData({
                                                ...formData,
                                                customer: { _id: '', name: '', email: '', phone: '', pan: '' },
                                                billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
                                                shipToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
                                                engineSerialNumber: '',
                                                kva: '',
                                                hourMeterReading: '',
                                                serviceRequestDate: undefined
                                            });
                                            setAddresses([]);
                                            setDgDetailsWithServiceData([]);
                                        }
                                    }}
                                    onFocus={() => {
                                        setShowCustomerDropdown(true);
                                        setHighlightedCustomerIndex(-1);
                                        // Initialize search term for editing
                                        if (customerSearchTerm === undefined && formData.customer?._id) {
                                            setCustomerSearchTerm(getCustomerLabel(formData.customer._id));
                                        } else if (!customerSearchTerm && !formData.customer?._id) {
                                            setCustomerSearchTerm(undefined);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        const filteredCustomers = customers.filter(customer => {
                                            if (customer.type !== 'customer') return false;
                                            const searchTerm = (customerSearchTerm || '').toLowerCase();
                                            const primaryEmail = getPrimaryAddressEmail(customer);
                                            return (
                                                (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
                                                (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
                                                (primaryEmail && primaryEmail.toLowerCase().includes(searchTerm)) ||
                                                (customer.phone && customer.phone.toLowerCase().includes(searchTerm))
                                            );
                                        });

                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setShowCustomerDropdown(true);
                                            setHighlightedCustomerIndex(prev =>
                                                prev < filteredCustomers.length - 1 ? prev + 1 : 0
                                            );
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setShowCustomerDropdown(true);
                                            setHighlightedCustomerIndex(prev =>
                                                prev > 0 ? prev - 1 : filteredCustomers.length - 1
                                            );
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (showCustomerDropdown && highlightedCustomerIndex >= 0 && filteredCustomers.length > 0) {
                                                const selectedCustomer = filteredCustomers[highlightedCustomerIndex];
                                                handleCustomerSelect(selectedCustomer._id);
                                                setShowCustomerDropdown(false);
                                                setCustomerSearchTerm(undefined); // Reset to show selected customer name
                                                setHighlightedCustomerIndex(-1);
                                            } else if (showCustomerDropdown && filteredCustomers.length === 1) {
                                                const selectedCustomer = filteredCustomers[0];
                                                handleCustomerSelect(selectedCustomer._id);
                                                setShowCustomerDropdown(false);
                                                setCustomerSearchTerm(undefined); // Reset to show selected customer name
                                                setHighlightedCustomerIndex(-1);
                                            }
                                        } else if (e.key === 'Escape') {
                                            setShowCustomerDropdown(false);
                                            setHighlightedCustomerIndex(-1);
                                            setCustomerSearchTerm(undefined); // Reset search term
                                        } else if ((e.key === 'Tab' && !e.shiftKey)) {
                                            e.preventDefault();
                                            setShowCustomerDropdown(false);
                                            // Move to next field (you can customize this based on your form structure)
                                            setTimeout(() => {
                                                const nextInput = document.querySelector('[data-field="next-field"]') as HTMLInputElement;
                                                if (nextInput) nextInput.focus();
                                            }, 50);
                                        } else if (e.key === 'Tab' && e.shiftKey) {
                                            e.preventDefault();
                                            setShowCustomerDropdown(false);
                                            // Move back to previous field (customize as needed)
                                            setTimeout(() => {
                                                const prevInput = document.querySelector('[data-field="prev-field"]') as HTMLInputElement;
                                                if (prevInput) prevInput.focus();
                                            }, 50);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // Delay hiding dropdown to allow for clicks
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
                                    placeholder="Search customer or press ↓ to open"
                                    data-field="customer"
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                                </div>

                                {/* Clear button - only show when there's a search term or selected customer */}
                                {(customerSearchTerm || formData.customer?._id) && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData({
                                                ...formData,
                                                customer: { _id: '', name: '', email: '', phone: '', pan: '' },
                                                billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
                                                shipToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
                                                engineSerialNumber: '',
                                                kva: '',
                                                hourMeterReading: '',
                                                serviceRequestDate: undefined
                                            });
                                            setAddresses([]);
                                            setDgDetailsWithServiceData([]);
                                            setCustomerSearchTerm(undefined);
                                            setShowCustomerDropdown(false);
                                            setHighlightedCustomerIndex(-1);
                                            // Refocus the input
                                            setTimeout(() => {
                                                const input = document.querySelector('[data-field="customer"]') as HTMLInputElement;
                                                if (input) input.focus();
                                            }, 10);
                                        }}
                                        className="absolute inset-y-0 right-8 flex items-center pr-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}

                                {showCustomerDropdown && (
                                    <div
                                        ref={customerDropdownRef}
                                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto"
                                    >
                                        {(() => {
                                            const filteredCustomers = customers.filter(customer => {
                                                if (customer.type !== 'customer') return false;
                                                const searchTerm = (customerSearchTerm || '').toLowerCase();
                                                const primaryEmail = getPrimaryAddressEmail(customer);
                                                return (
                                                    (customer.name && customer.name.toLowerCase().includes(searchTerm)) ||
                                                    (customer.email && customer.email.toLowerCase().includes(searchTerm)) ||
                                                    (primaryEmail && primaryEmail.toLowerCase().includes(searchTerm)) ||
                                                    (customer.phone && customer.phone.toLowerCase().includes(searchTerm))
                                                );
                                            });

                                            return (
                                                <>
                                                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                customer: { _id: '', name: '', email: '', phone: '', pan: '' },
                                                                billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
                                                                shipToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
                                                                engineSerialNumber: '',
                                                                kva: '',
                                                                hourMeterReading: '',
                                                                serviceRequestDate: undefined
                                                            });
                                                            setAddresses([]);
                                                            setDgDetailsWithServiceData([]);
                                                            setShowCustomerDropdown(false);
                                                            setCustomerSearchTerm(undefined);
                                                            setHighlightedCustomerIndex(-1);
                                                        }}
                                                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.customer?._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                                    >
                                                        Select customer
                                                    </button>

                                                    {filteredCustomers.map((customer, index) => (
                                                        <button
                                                            key={customer._id}
                                                            type="button"
                                                            data-customer-index={index}
                                                            onClick={() => {
                                                                handleCustomerSelect(customer._id);
                                                                setShowCustomerDropdown(false);
                                                                setCustomerSearchTerm(undefined); // Reset to show selected name
                                                                setHighlightedCustomerIndex(-1);
                                                            }}
                                                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.customer?._id === customer._id ? 'bg-blue-100 text-blue-800' :
                                                                highlightedCustomerIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                                                    'text-gray-700 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            <div>
                                                                <div className="font-medium">{customer.name}</div>
                                                                <div className="text-xs text-gray-500">
                                                                    {getPrimaryAddressEmail(customer) || customer.email}
                                                                </div>
                                                            </div>
                                                        </button>
                                                    ))}

                                                    {filteredCustomers.length === 0 && (
                                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                            No customers found
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bill To and Ship To Addresses */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bill To Address *
                            </label>
                            <div className="relative dropdown-container">
                                <input
                                    type="text"
                                    value={billToAddressSearchTerm !== undefined ? billToAddressSearchTerm : (() => {
                                        // If we have a direct address object, use it
                                        if (formData.billToAddress && formData.billToAddress.address) {
                                            return `${formData.billToAddress.address} (${formData.billToAddress.district}, ${formData.billToAddress.pincode})`;
                                        }
                                        // Otherwise, try to find by addressId with specific address type
                                        return getAddressLabel((formData.billToAddress as any)?.addressId?.toString(), 'billTo');
                                    })()}
                                    onChange={(e) => {
                                        setBillToAddressSearchTerm(e.target.value);
                                        if (!showBillToAddressDropdown) setShowBillToAddressDropdown(true);
                                        setHighlightedBillToAddressIndex(-1);
                                        // Clear the selected address when user starts typing
                                        if (e.target.value === '') {
                                            setFormData({
                                                ...formData,
                                                billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
                                            });
                                        }
                                    }}
                                    onFocus={() => {
                                        if (formData.customer?._id) {
                                            setShowBillToAddressDropdown(true);
                                            setHighlightedBillToAddressIndex(-1);
                                            // Initialize search term for editing
                                            if (billToAddressSearchTerm === undefined && (formData.billToAddress as any)?.addressId) {
                                                setBillToAddressSearchTerm(getAddressLabel((formData.billToAddress as any).addressId.toString(), 'billTo'));
                                            } else if (!billToAddressSearchTerm && !(formData.billToAddress as any)?.addressId) {
                                                setBillToAddressSearchTerm(undefined);
                                            }
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (!formData.customer?._id) return;

                                        const filteredAddresses = addresses.filter(address => {
                                            const searchTerm = (billToAddressSearchTerm || '').toLowerCase();
                                            return (
                                                (address.address && address.address.toLowerCase().includes(searchTerm)) ||
                                                (address.district && address.district.toLowerCase().includes(searchTerm)) ||
                                                (address.pincode && address.pincode.toLowerCase().includes(searchTerm)) ||
                                                (address.gstNumber && address.gstNumber.toLowerCase().includes(searchTerm))
                                            );
                                        });

                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setShowBillToAddressDropdown(true);
                                            setHighlightedBillToAddressIndex(prev =>
                                                prev < filteredAddresses.length - 1 ? prev + 1 : 0
                                            );
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setShowBillToAddressDropdown(true);
                                            setHighlightedBillToAddressIndex(prev =>
                                                prev > 0 ? prev - 1 : filteredAddresses.length - 1
                                            );
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (showBillToAddressDropdown && highlightedBillToAddressIndex >= 0 && filteredAddresses.length > 0) {
                                                const selectedAddress = filteredAddresses[highlightedBillToAddressIndex];
                                                setFormData({
                                                    ...formData,
                                                    billToAddress: {
                                                        address: selectedAddress.address,
                                                        state: selectedAddress.state,
                                                        district: selectedAddress.district,
                                                        pincode: selectedAddress.pincode,
                                                        gstNumber: selectedAddress.gstNumber || '',
                                                        ...(selectedAddress.id && { addressId: selectedAddress.id })
                                                    } as any
                                                });
                                                setShowBillToAddressDropdown(false);
                                                setBillToAddressSearchTerm(undefined);
                                                setHighlightedBillToAddressIndex(-1);
                                            } else if (showBillToAddressDropdown && filteredAddresses.length === 1) {
                                                const selectedAddress = filteredAddresses[0];
                                                setFormData({
                                                    ...formData,
                                                    billToAddress: {
                                                        address: selectedAddress.address,
                                                        state: selectedAddress.state,
                                                        district: selectedAddress.district,
                                                        pincode: selectedAddress.pincode,
                                                        gstNumber: selectedAddress.gstNumber || '',
                                                        ...(selectedAddress.id && { addressId: selectedAddress.id })
                                                    } as any
                                                });
                                                setShowBillToAddressDropdown(false);
                                                setBillToAddressSearchTerm(undefined);
                                                setHighlightedBillToAddressIndex(-1);
                                            }
                                        } else if (e.key === 'Escape') {
                                            setShowBillToAddressDropdown(false);
                                            setHighlightedBillToAddressIndex(-1);
                                            setBillToAddressSearchTerm(undefined);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        setTimeout(() => {
                                            setShowBillToAddressDropdown(false);
                                            setHighlightedBillToAddressIndex(-1);
                                            if (!(formData.billToAddress as any)?.addressId && billToAddressSearchTerm) {
                                                setBillToAddressSearchTerm(undefined);
                                            }
                                        }, 150);
                                    }}
                                    disabled={!formData.customer?._id}
                                    autoComplete="off"
                                    placeholder={!formData.customer?._id ? "Select customer first" : "Search address or press ↓ to open"}
                                    data-field="bill-to-address"
                                    className={`w-full px-3 py-2 pr-10 border rounded-lg transition-colors ${!formData.customer?._id
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"}
                                        `}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBillToAddressDropdown ? 'rotate-180' : ''}`} />
                                </div>

                                {/* Clear button */}
                                {(billToAddressSearchTerm || (formData.billToAddress as any)?.addressId) && formData.customer?._id && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData({
                                                ...formData,
                                                billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
                                            });
                                            setBillToAddressSearchTerm(undefined);
                                            setShowBillToAddressDropdown(false);
                                            setHighlightedBillToAddressIndex(-1);
                                            setTimeout(() => {
                                                const input = document.querySelector('[data-field="bill-to-address"]') as HTMLInputElement;
                                                if (input) input.focus();
                                            }, 10);
                                        }}
                                        className="absolute inset-y-0 right-8 flex items-center pr-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}

                                {showBillToAddressDropdown && formData.customer?._id && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                                        {(() => {
                                            const filteredAddresses = addresses.filter(address => {
                                                const searchTerm = (billToAddressSearchTerm || '').toLowerCase();
                                                return (
                                                    (address.address && address.address.toLowerCase().includes(searchTerm)) ||
                                                    (address.district && address.district.toLowerCase().includes(searchTerm)) ||
                                                    (address.pincode && address.pincode.toLowerCase().includes(searchTerm)) ||
                                                    (address.gstNumber && address.gstNumber.toLowerCase().includes(searchTerm))
                                                );
                                            });

                                            return (
                                                <>
                                                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
                                                            });
                                                            setShowBillToAddressDropdown(false);
                                                            setBillToAddressSearchTerm(undefined);
                                                            setHighlightedBillToAddressIndex(-1);
                                                        }}
                                                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!(formData.billToAddress as any)?.addressId ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                                    >
                                                        Select bill to address
                                                    </button>

                                                    {filteredAddresses.map((address, index) => (
                                                        <button
                                                            key={address.id}
                                                            type="button"
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
                                                                setBillToAddressSearchTerm(undefined);
                                                                setHighlightedBillToAddressIndex(-1);
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
                                                                {address.gstNumber && (
                                                                    <div className="text-xs text-gray-500">GST: {address.gstNumber}</div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}

                                                    {filteredAddresses.length === 0 && (
                                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                            No addresses found
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                            {/* {getFieldErrorMessage('billToAddress.address') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldErrorMessage('billToAddress.address')}</p>
                            )} */}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ship To Address *
                            </label>
                            <div className="relative dropdown-container">
                                <input
                                    type="text"
                                    value={shipToAddressSearchTerm !== undefined ? shipToAddressSearchTerm : (() => {
                                        // If we have a direct address object, use it
                                        if (formData.shipToAddress && formData.shipToAddress.address) {
                                            return `${formData.shipToAddress.address} (${formData.shipToAddress.district}, ${formData.shipToAddress.pincode})`;
                                        }
                                        // Otherwise, try to find by addressId with specific address type
                                        return getAddressLabel((formData.shipToAddress as any)?.addressId?.toString(), 'shipTo');
                                    })()}
                                    onChange={(e) => {
                                        setShipToAddressSearchTerm(e.target.value);
                                        if (!showShipToAddressDropdown) setShowShipToAddressDropdown(true);
                                        setHighlightedShipToAddressIndex(-1);
                                        // Clear the selected address when user starts typing
                                        if (e.target.value === '') {
                                            setFormData({
                                                ...formData,
                                                shipToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
                                            });
                                        }
                                    }}
                                    onFocus={() => {
                                        if (formData.customer?._id) {
                                            setShowShipToAddressDropdown(true);
                                            setHighlightedShipToAddressIndex(-1);
                                            // Initialize search term for editing
                                            if (shipToAddressSearchTerm === undefined && (formData.shipToAddress as any)?.addressId) {
                                                setShipToAddressSearchTerm(getAddressLabel((formData.shipToAddress as any).addressId.toString(), 'shipTo'));
                                            } else if (!shipToAddressSearchTerm && !(formData.shipToAddress as any)?.addressId) {
                                                setShipToAddressSearchTerm(undefined);
                                            }
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (!formData.customer?._id) return;

                                        const filteredAddresses = addresses.filter(address => {
                                            const searchTerm = (shipToAddressSearchTerm || '').toLowerCase();
                                            return (
                                                (address.address && address.address.toLowerCase().includes(searchTerm)) ||
                                                (address.district && address.district.toLowerCase().includes(searchTerm)) ||
                                                (address.pincode && address.pincode.toLowerCase().includes(searchTerm)) ||
                                                (address.gstNumber && address.gstNumber.toLowerCase().includes(searchTerm))
                                            );
                                        });

                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setShowShipToAddressDropdown(true);
                                            setHighlightedShipToAddressIndex(prev =>
                                                prev < filteredAddresses.length - 1 ? prev + 1 : 0
                                            );
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setShowShipToAddressDropdown(true);
                                            setHighlightedShipToAddressIndex(prev =>
                                                prev > 0 ? prev - 1 : filteredAddresses.length - 1
                                            );
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (showShipToAddressDropdown && highlightedShipToAddressIndex >= 0 && filteredAddresses.length > 0) {
                                                const selectedAddress = filteredAddresses[highlightedShipToAddressIndex];
                                                setFormData({
                                                    ...formData,
                                                    shipToAddress: {
                                                        address: selectedAddress.address,
                                                        state: selectedAddress.state,
                                                        district: selectedAddress.district,
                                                        pincode: selectedAddress.pincode,
                                                        gstNumber: selectedAddress.gstNumber || '',
                                                        ...(selectedAddress.id && { addressId: selectedAddress.id })
                                                    } as any
                                                });
                                                setShowShipToAddressDropdown(false);
                                                setShipToAddressSearchTerm(undefined);
                                                setHighlightedShipToAddressIndex(-1);
                                            } else if (showShipToAddressDropdown && filteredAddresses.length === 1) {
                                                const selectedAddress = filteredAddresses[0];
                                                setFormData({
                                                    ...formData,
                                                    shipToAddress: {
                                                        address: selectedAddress.address,
                                                        state: selectedAddress.state,
                                                        district: selectedAddress.district,
                                                        pincode: selectedAddress.pincode,
                                                        gstNumber: selectedAddress.gstNumber || '',
                                                        ...(selectedAddress.id && { addressId: selectedAddress.id })
                                                    } as any
                                                });
                                                setShowShipToAddressDropdown(false);
                                                setShipToAddressSearchTerm(undefined);
                                                setHighlightedShipToAddressIndex(-1);
                                            }
                                        } else if (e.key === 'Escape') {
                                            setShowShipToAddressDropdown(false);
                                            setHighlightedShipToAddressIndex(-1);
                                            setShipToAddressSearchTerm(undefined);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        setTimeout(() => {
                                            setShowShipToAddressDropdown(false);
                                            setHighlightedShipToAddressIndex(-1);
                                            if (!(formData.shipToAddress as any)?.addressId && shipToAddressSearchTerm) {
                                                setShipToAddressSearchTerm(undefined);
                                            }
                                        }, 150);
                                    }}
                                    disabled={!formData.customer?._id}
                                    autoComplete="off"
                                    placeholder={!formData.customer?._id ? "Select customer first" : "Search address or press ↓ to open"}
                                    data-field="ship-to-address"
                                    className={`w-full px-3 py-2 pr-10 border rounded-lg transition-colors ${!formData.customer?._id
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showShipToAddressDropdown ? 'rotate-180' : ''}`} />
                                </div>

                                {/* Clear button */}
                                {(shipToAddressSearchTerm || (formData.shipToAddress as any)?.addressId) && formData.customer?._id && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData({
                                                ...formData,
                                                shipToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
                                            });
                                            setShipToAddressSearchTerm(undefined);
                                            setShowShipToAddressDropdown(false);
                                            setHighlightedShipToAddressIndex(-1);
                                            setTimeout(() => {
                                                const input = document.querySelector('[data-field="ship-to-address"]') as HTMLInputElement;
                                                if (input) input.focus();
                                            }, 10);
                                        }}
                                        className="absolute inset-y-0 right-8 flex items-center pr-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}

                                {showShipToAddressDropdown && formData.customer?._id && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                                        {(() => {
                                            const filteredAddresses = addresses.filter(address => {
                                                const searchTerm = (shipToAddressSearchTerm || '').toLowerCase();
                                                return (
                                                    (address.address && address.address.toLowerCase().includes(searchTerm)) ||
                                                    (address.district && address.district.toLowerCase().includes(searchTerm)) ||
                                                    (address.pincode && address.pincode.toLowerCase().includes(searchTerm)) ||
                                                    (address.gstNumber && address.gstNumber.toLowerCase().includes(searchTerm))
                                                );
                                            });

                                            return (
                                                <>
                                                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({
                                                                ...formData,
                                                                shipToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
                                                            });
                                                            setShowShipToAddressDropdown(false);
                                                            setShipToAddressSearchTerm(undefined);
                                                            setHighlightedShipToAddressIndex(-1);
                                                        }}
                                                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!(formData.shipToAddress as any)?.addressId ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                                    >
                                                        Select ship to address
                                                    </button>

                                                    {filteredAddresses.map((address, index) => (
                                                        <button
                                                            key={address.id}
                                                            type="button"
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
                                                                setShipToAddressSearchTerm(undefined);
                                                                setHighlightedShipToAddressIndex(-1);
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
                                                                {address.gstNumber && (
                                                                    <div className="text-xs text-gray-500">GST: {address.gstNumber}</div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}

                                                    {filteredAddresses.length === 0 && (
                                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                            No addresses found
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                            {/* {getFieldErrorMessage('shipToAddress.address') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldErrorMessage('shipToAddress.address')}</p>
                            )} */}
                        </div>
                    </div>



                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Validity Period (Days)
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={formData.validityPeriod ?? ""}
                                onChange={(e) => {
                                    const rawValue = e.target.value;

                                    if (rawValue === "") {
                                        // Allow empty input
                                        setFormData({
                                            ...formData,
                                            validityPeriod: undefined,
                                            validUntil: undefined,
                                        });
                                        return;
                                    }

                                    const validityPeriod = parseInt(rawValue, 10);
                                    const issueDate = formData.issueDate || new Date();
                                    const validUntil = new Date(issueDate);
                                    validUntil.setDate(validUntil.getDate() + validityPeriod);

                                    setFormData({
                                        ...formData,
                                        validityPeriod,
                                        validUntil,
                                    });
                                }}
                                onKeyDown={(e) => {
                                    if ((e.key === "Tab" && !e.shiftKey) || e.key === "Enter") {
                                        e.preventDefault();
                                        setTimeout(() => {
                                            const validUntilInput = document.querySelector(
                                                '[data-field="valid-until"]'
                                            ) as HTMLInputElement;
                                            if (validUntilInput) validUntilInput.focus();
                                        }, 50);
                                    } else if (e.key === "Tab" && e.shiftKey) {
                                        e.preventDefault();
                                        setTimeout(() => {
                                            const addressInput = document.querySelector(
                                                '[data-field="customer-address"]'
                                            ) as HTMLInputElement;
                                            if (addressInput) addressInput.focus();
                                        }, 50);
                                    }
                                }}
                                data-field="validity-period"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="30"
                                title="Tab/Enter: Move to Valid Until | Shift+Tab: Back to address"
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
                                        const issueDate = new Date(e.target.value);
                                        const validityPeriod = formData.validityPeriod || 30;
                                        const validUntil = new Date(issueDate);
                                        validUntil.setDate(validUntil.getDate() + validityPeriod);

                                        setFormData({
                                            ...formData,
                                            issueDate,
                                            validUntil
                                        });
                                    } else {
                                        setFormData({
                                            ...formData,
                                            issueDate: undefined,
                                            validUntil: undefined
                                        });
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Valid Until
                            </label>
                            <input
                                type="date"
                                value={formatDateForInput(formData.validUntil)}
                                // Debug: Log the formatted date value
                                onFocus={() => console.log('Valid until field focused, value:', formatDateForInput(formData.validUntil), 'raw:', formData.validUntil)}
                                onChange={(e) => {
                                    console.log('Valid until changed to:', e.target.value);
                                    if (e.target.value) {
                                        setFormData({ ...formData, validUntil: new Date(e.target.value) });
                                    } else {
                                        setFormData({ ...formData, validUntil: undefined });
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
                                        e.preventDefault();
                                        // Move to engineer field
                                        setTimeout(() => {
                                            const engineerInput = document.querySelector('[data-field="engineer"]') as HTMLInputElement;
                                            if (engineerInput) engineerInput.focus();
                                        }, 50);
                                    } else if (e.key === 'Tab' && e.shiftKey) {
                                        e.preventDefault();
                                        // Move back to validity period field
                                        setTimeout(() => {
                                            const validityInput = document.querySelector('[data-field="validity-period"]') as HTMLInputElement;
                                            if (validityInput) validityInput.focus();
                                        }, 50);
                                    }
                                }}
                                data-field="valid-until"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                title="Tab/Enter: Move to engineer field | Shift+Tab: Back to validity period"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Referred By
                            </label>
                            <div className="relative dropdown-container">
                                <input
                                    type="text"
                                    value={engineerSearchTerm !== undefined ? engineerSearchTerm : getEngineerLabel(formData.assignedEngineer || '')}
                                    onChange={(e) => {
                                        setEngineerSearchTerm(e.target.value);
                                        if (!showEngineerDropdown) setShowEngineerDropdown(true);
                                        setHighlightedEngineerIndex(-1);
                                        // Clear the selected engineer when user starts typing
                                        if (e.target.value === '') {
                                            setFormData({ ...formData, assignedEngineer: '' });
                                        }
                                    }}
                                    onFocus={() => {
                                        setShowEngineerDropdown(true);
                                        setHighlightedEngineerIndex(-1);
                                        // Initialize search term for editing
                                        if (engineerSearchTerm === undefined && formData.assignedEngineer) {
                                            setEngineerSearchTerm(getEngineerLabel(formData.assignedEngineer));
                                        } else if (!engineerSearchTerm && !formData.assignedEngineer) {
                                            setEngineerSearchTerm(undefined);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        const filteredEngineers = fieldOperators.filter(engineer => {
                                            const searchTerm = (engineerSearchTerm || '').toLowerCase();
                                            return (
                                                (engineer.name && engineer.name.toLowerCase().includes(searchTerm)) ||
                                                (engineer.label && engineer.label.toLowerCase().includes(searchTerm)) ||
                                                (engineer.firstName && engineer.firstName.toLowerCase().includes(searchTerm)) ||
                                                (engineer.lastName && engineer.lastName.toLowerCase().includes(searchTerm)) ||
                                                (engineer.email && engineer.email.toLowerCase().includes(searchTerm))
                                            );
                                        });

                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setShowEngineerDropdown(true);
                                            setHighlightedEngineerIndex(prev =>
                                                prev < filteredEngineers.length - 1 ? prev + 1 : 0
                                            );
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setShowEngineerDropdown(true);
                                            setHighlightedEngineerIndex(prev =>
                                                prev > 0 ? prev - 1 : filteredEngineers.length - 1
                                            );
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (showEngineerDropdown && highlightedEngineerIndex >= 0 && filteredEngineers.length > 0) {
                                                const selectedEngineer = filteredEngineers[highlightedEngineerIndex];
                                                setFormData({ ...formData, assignedEngineer: selectedEngineer._id });
                                                setShowEngineerDropdown(false);
                                                setEngineerSearchTerm(undefined); // Reset to show selected engineer name
                                                setHighlightedEngineerIndex(-1);
                                            } else if (showEngineerDropdown && filteredEngineers.length === 1) {
                                                const selectedEngineer = filteredEngineers[0];
                                                setFormData({ ...formData, assignedEngineer: selectedEngineer._id });
                                                setShowEngineerDropdown(false);
                                                setEngineerSearchTerm(undefined); // Reset to show selected engineer name
                                                setHighlightedEngineerIndex(-1);
                                            }
                                        } else if (e.key === 'Escape') {
                                            setShowEngineerDropdown(false);
                                            setHighlightedEngineerIndex(-1);
                                            setEngineerSearchTerm(undefined); // Reset search term
                                        } else if ((e.key === 'Tab' && !e.shiftKey)) {
                                            e.preventDefault();
                                            setShowEngineerDropdown(false);
                                            // Move to first product field in the list
                                            setTimeout(() => {
                                                const firstProductInput = document.querySelector(`[data-row="0"][data-field="product"]`) as HTMLInputElement;
                                                if (firstProductInput) firstProductInput.focus();
                                            }, 50);
                                        } else if (e.key === 'Tab' && e.shiftKey) {
                                            e.preventDefault();
                                            setShowEngineerDropdown(false);
                                            // Move back to Valid Until field
                                            setTimeout(() => {
                                                const validUntilInput = document.querySelector('[data-field="valid-until"]') as HTMLInputElement;
                                                if (validUntilInput) validUntilInput.focus();
                                            }, 50);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // Delay hiding dropdown to allow for clicks
                                        setTimeout(() => {
                                            setShowEngineerDropdown(false);
                                            setHighlightedEngineerIndex(-1);
                                            // If no engineer selected and search term exists, clear it
                                            if (!formData.assignedEngineer && engineerSearchTerm) {
                                                setEngineerSearchTerm(undefined);
                                            }
                                        }, 150);
                                    }}
                                    autoComplete="off"
                                    placeholder="Search Referred By or press ↓ to open"
                                    data-field="engineer"
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showEngineerDropdown ? 'rotate-180' : ''}`} />
                                </div>
                                {/* Clear button - only show when there's a search term or selected engineer */}
                                {(engineerSearchTerm || formData.assignedEngineer) && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData({ ...formData, assignedEngineer: '' });
                                            setEngineerSearchTerm('');
                                            setShowEngineerDropdown(false);
                                            setHighlightedEngineerIndex(-1);
                                            // Refocus the input
                                            setTimeout(() => {
                                                const input = document.querySelector('[data-field="engineer"]') as HTMLInputElement;
                                                if (input) input.focus();
                                            }, 10);
                                        }}
                                        className="absolute inset-y-0 right-8 flex items-center pr-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                {showEngineerDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                                        {(() => {
                                            const filteredEngineers = fieldOperators.filter(engineer => {
                                                const searchTerm = (engineerSearchTerm || '').toLowerCase();
                                                return (
                                                    (engineer.name && engineer.name.toLowerCase().includes(searchTerm)) ||
                                                    (engineer.label && engineer.label.toLowerCase().includes(searchTerm)) ||
                                                    (engineer.firstName && engineer.firstName.toLowerCase().includes(searchTerm)) ||
                                                    (engineer.lastName && engineer.lastName.toLowerCase().includes(searchTerm)) ||
                                                    (engineer.email && engineer.email.toLowerCase().includes(searchTerm))
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
                                                        type="button"
                                                        onClick={() => {
                                                            setFormData({ ...formData, assignedEngineer: '' });
                                                            setShowEngineerDropdown(false);
                                                            setEngineerSearchTerm(undefined);
                                                            setHighlightedEngineerIndex(-1);
                                                        }}
                                                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.assignedEngineer ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                                    >
                                                        Select Referred By
                                                    </button>

                                                    {filteredEngineers.map((engineer, index) => (
                                                        <button
                                                            key={engineer._id}
                                                            type="button"
                                                            onClick={() => {
                                                                setFormData({ ...formData, assignedEngineer: engineer._id });
                                                                setShowEngineerDropdown(false);
                                                                setEngineerSearchTerm(undefined); // Reset to show selected name
                                                                setHighlightedEngineerIndex(-1);
                                                            }}
                                                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.assignedEngineer === engineer._id ? 'bg-blue-100 text-blue-800' :
                                                                highlightedEngineerIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                                                    'text-gray-700 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            <div>
                                                                <div className="font-medium">{engineer.name}</div>
                                                                <div className="text-xs text-gray-500">{engineer.email}</div>
                                                                {engineer.phone && (
                                                                    <div className="text-xs text-gray-500">{engineer.phone}</div>
                                                                )}
                                                            </div>
                                                        </button>
                                                    ))}

                                                    {filteredEngineers.length === 0 && (
                                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                            No engineers found
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                            {/* {getFieldErrorMessage('assignedEngineer') && (
        <p className="mt-1 text-sm text-red-600">{getFieldErrorMessage('assignedEngineer')}</p>
    )} */}
                        </div>
                    </div>
                    {/* Service Ticket Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Engine Serial Number
                            </label>
                            <div className="relative dropdown-container">
                                <input
                                    type="text"
                                    value={engineSerialSearchTerm !== undefined ? engineSerialSearchTerm : formData.engineSerialNumber || ''}
                                    onChange={(e) => {
                                        setEngineSerialSearchTerm(e.target.value);
                                        if (!showEngineSerialDropdown) setShowEngineSerialDropdown(true);
                                        setHighlightedEngineSerialIndex(-1);
                                        // Clear the selected engine serial when user starts typing
                                        if (e.target.value === '') {
                                            setFormData({
                                                ...formData,
                                                engineSerialNumber: '',
                                                kva: '',
                                                hourMeterReading: '',
                                                serviceRequestDate: undefined
                                            });
                                        }
                                    }}
                                    onFocus={() => {
                                        setShowEngineSerialDropdown(true);
                                        setHighlightedEngineSerialIndex(-1);
                                        // Initialize search term for editing
                                        if (engineSerialSearchTerm === undefined && formData.engineSerialNumber) {
                                            setEngineSerialSearchTerm(formData.engineSerialNumber);
                                        } else if (!engineSerialSearchTerm && !formData.engineSerialNumber) {
                                            setEngineSerialSearchTerm('');
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        const filteredTickets = dgDetailsWithServiceData.filter(ticket =>
                                            ticket.engineSerialNumber &&
                                            ticket.engineSerialNumber.toLowerCase().includes((engineSerialSearchTerm || '').toLowerCase())
                                        );

                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setShowEngineSerialDropdown(true);
                                            setHighlightedEngineSerialIndex(prev =>
                                                prev < filteredTickets.length - 1 ? prev + 1 : 0
                                            );
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setShowEngineSerialDropdown(true);
                                            setHighlightedEngineSerialIndex(prev =>
                                                prev > 0 ? prev - 1 : filteredTickets.length - 1
                                            );
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (showEngineSerialDropdown && highlightedEngineSerialIndex >= 0 && filteredTickets.length > 0) {
                                                const selectedTicket = filteredTickets[highlightedEngineSerialIndex];
                                                setFormData({
                                                    ...formData,
                                                    engineSerialNumber: selectedTicket.engineSerialNumber || '',
                                                    kva: selectedTicket.kva ? String(selectedTicket.kva) : '',
                                                    hourMeterReading: selectedTicket.HourMeterReading || '',
                                                    serviceRequestDate: selectedTicket.ServiceRequestDate ? new Date(selectedTicket.ServiceRequestDate) : undefined
                                                });
                                                setShowEngineSerialDropdown(false);
                                                setEngineSerialSearchTerm(undefined); // Reset to show selected serial number
                                                setHighlightedEngineSerialIndex(-1);
                                            } else if (showEngineSerialDropdown && filteredTickets.length === 1) {
                                                const selectedTicket = filteredTickets[0];
                                                setFormData({
                                                    ...formData,
                                                    engineSerialNumber: selectedTicket.engineSerialNumber || '',
                                                    kva: selectedTicket.kva ? String(selectedTicket.kva) : '',
                                                    hourMeterReading: selectedTicket.HourMeterReading || '',
                                                    serviceRequestDate: selectedTicket.ServiceRequestDate ? new Date(selectedTicket.ServiceRequestDate) : undefined
                                                });
                                                setShowEngineSerialDropdown(false);
                                                setEngineSerialSearchTerm(undefined); // Reset to show selected serial number
                                                setHighlightedEngineSerialIndex(-1);
                                            }
                                        } else if (e.key === 'Escape') {
                                            setShowEngineSerialDropdown(false);
                                            setHighlightedEngineSerialIndex(-1);
                                            setEngineSerialSearchTerm(undefined); // Reset search term
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // Delay hiding dropdown to allow for clicks
                                        setTimeout(() => {
                                            setShowEngineSerialDropdown(false);
                                            setHighlightedEngineSerialIndex(-1);
                                            // If no engine serial selected and search term exists, clear it
                                            if (!formData.engineSerialNumber && engineSerialSearchTerm) {
                                                setEngineSerialSearchTerm(undefined);
                                            }
                                        }, 150);
                                    }}
                                    autoComplete="off"
                                    data-field="engine-serial-number"
                                    placeholder="Search engine serial number or press ↓ to open"
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showEngineSerialDropdown ? 'rotate-180' : ''}`} />
                                </div>

                                {/* Clear button - only show when there's a search term or selected engine serial */}
                                {(engineSerialSearchTerm || formData.engineSerialNumber) && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFormData({
                                                ...formData,
                                                engineSerialNumber: '',
                                                kva: '',
                                                hourMeterReading: '',
                                                serviceRequestDate: undefined
                                            });
                                            setEngineSerialSearchTerm('');
                                            setShowEngineSerialDropdown(false);
                                            setHighlightedEngineSerialIndex(-1);
                                            // Refocus the input
                                            setTimeout(() => {
                                                const input = document.querySelector('[data-field="engine-serial-number"]') as HTMLInputElement;
                                                if (input) input.focus();
                                            }, 10);
                                        }}
                                        className="absolute inset-y-0 right-8 flex items-center pr-1 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}

                                {showEngineSerialDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                                        {dgDetailsWithServiceData.length === 0 ? (
                                            <div className="px-3 py-2 text-sm text-gray-500 text-center bg-gray-50">
                                                Engine Serial Number is not available
                                            </div>
                                        ) : (
                                            <>
                                                <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData({
                                                            ...formData,
                                                            engineSerialNumber: '',
                                                            kva: '',
                                                            hourMeterReading: '',
                                                            serviceRequestDate: undefined
                                                        });
                                                        setShowEngineSerialDropdown(false);
                                                        setEngineSerialSearchTerm(undefined);
                                                        setHighlightedEngineSerialIndex(-1);
                                                    }}
                                                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.engineSerialNumber ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                                >
                                                    Select engine serial number
                                                </button>

                                                {(() => {
                                                    const filteredTickets = dgDetailsWithServiceData.filter(ticket =>
                                                        ticket.engineSerialNumber &&
                                                        ticket.engineSerialNumber.toLowerCase().includes((engineSerialSearchTerm || '').toLowerCase())
                                                    );

                                                    return (
                                                        <>
                                                            {filteredTickets.map((ticket, index) => (
                                                                <button
                                                                    key={ticket._id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setFormData({
                                                                            ...formData,
                                                                            engineSerialNumber: ticket.engineSerialNumber || '',
                                                                            kva: ticket.kva ? String(ticket.kva) : '',
                                                                            hourMeterReading: ticket.HourMeterReading || '',
                                                                            serviceRequestDate: ticket.ServiceRequestDate ? new Date(ticket.ServiceRequestDate) : undefined
                                                                        });
                                                                        setShowEngineSerialDropdown(false);
                                                                        setEngineSerialSearchTerm(undefined); // Reset to show selected name
                                                                        setHighlightedEngineSerialIndex(-1);
                                                                    }}
                                                                    className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.engineSerialNumber === ticket.engineSerialNumber ? 'bg-blue-100 text-blue-800' :
                                                                        highlightedEngineSerialIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
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

                                                            {filteredTickets.length === 0 && (
                                                                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                                    No engine serial numbers found
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </>
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
                                value={formData.serviceRequestDate ? new Date(formData.serviceRequestDate).toISOString().split('T')[0] : ''}
                                onChange={(e) => setFormData({ ...formData, serviceRequestDate: e.target.value ? new Date(e.target.value) : undefined })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors bg-gray-50"
                                disabled
                            />
                        </div>
                    </div>

                    {/* Subject Field */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subject (Sub)
                                </label>
                                <input
                                    type="text"
                                    value={formData.subject || ''}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    placeholder="Enter quotation subject..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-medium"
                                    style={{ fontSize: '1.1rem' }}
                                />
                                <p className="text-sm text-gray-500 mt-2">
                                    This will appear as the main heading of your quotation (e.g., "SPARES QUOTATION FOR 125KVA DG SET")
                                </p>
                            </div>
                        </div>
                    </div>

                    
                </div>



                {/* Excel-Style Items Table */}
                {selectedType !== 'service' && <div className="mb-10 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Quotation Items</h3>
                        <button
                            onClick={addQuotationItem}
                            type="button"
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Row</span>
                        </button>
                    </div>

                    {/* Table Container - allows bottom overflow */}
                    <div
                        ref={tableContainerRef}
                        className="border border-gray-300 rounded-lg bg-white shadow-sm relative"
                        style={{
                            overflow: 'visible',
                            zIndex: 1
                        }}
                    >
                        {/* Inner scrollable container */}
                        <div className="overflow-x-auto">                        {/* Table Header */}
                            <div className="bg-gray-100 border-b border-gray-300 min-w-[1200px]">
                                <div className="grid text-xs font-bold text-gray-800 uppercase tracking-wide"
                                    style={{ gridTemplateColumns: '60px 150px 1fr 90px 80px 100px 60px 120px 100px 80px 60px' }}>
                                    <div className="p-3 border-r border-gray-300 text-center bg-gray-200">S.No</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Product Code</div>
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
                            <div className="divide-y divide-gray-200 min-w-[1200px] mb-60 border-b border-gray-200 rounded-lg">
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

                                            {/* Product Code - Enhanced with fixed dropdown */}
                                            <div className="p-1 border-r border-gray-200 relative">
                                                <input
                                                    type="text"
                                                    value={productSearchTerms[index] !== undefined ? productSearchTerms[index] : getProductPartNo(item.product)}
                                                    onChange={(e) => {
                                                        updateProductSearchTerm(index, e.target.value);
                                                        if (e.target.value === '') {
                                                            setFormData({
                                                                ...formData,
                                                                items: formData.items?.map((item, i) => i === index ? { ...item, product: '', description: '', hsnNumber: '', taxRate: 0, quantity: 0, unitPrice: 0, uom: 'nos' } : item)
                                                            })
                                                        }
                                                        setShowProductDropdowns({
                                                            ...showProductDropdowns,
                                                            [index]: true
                                                        });
                                                        setHighlightedProductIndex({
                                                            ...highlightedProductIndex,
                                                            [index]: -1
                                                        });
                                                        // Clear the selected product when user starts typing
                                                        if (e.target.value === '') {
                                                            updateQuotationItem(index, 'product', '');
                                                        }
                                                    }}
                                                    onFocus={() => {
                                                        setShowProductDropdowns({
                                                            ...showProductDropdowns,
                                                            [index]: true
                                                        });
                                                        setHighlightedProductIndex({
                                                            ...highlightedProductIndex,
                                                            [index]: -1
                                                        });
                                                        // Initialize search term for editing
                                                        if (productSearchTerms[index] === undefined && item.product) {
                                                            updateProductSearchTerm(index, getProductPartNo(item.product));
                                                        } else if (!productSearchTerms[index] && !item.product) {
                                                            updateProductSearchTerm(index, '');
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        setTimeout(() => {
                                                            setShowProductDropdowns({
                                                                ...showProductDropdowns,
                                                                [index]: false
                                                            });
                                                            setHighlightedProductIndex({
                                                                ...highlightedProductIndex,
                                                                [index]: -1
                                                            });
                                                            // If no product selected and search term exists, clear it
                                                            if (!item.product && productSearchTerms[index]) {
                                                                updateProductSearchTerm(index, undefined);
                                                            }
                                                        }, 200);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        const filteredProducts = getFilteredProducts(productSearchTerms[index] || '');

                                                        if (e.key === 'ArrowDown') {
                                                            e.preventDefault();
                                                            setShowProductDropdowns({
                                                                ...showProductDropdowns,
                                                                [index]: true
                                                            });
                                                            setHighlightedProductIndex({
                                                                ...highlightedProductIndex,
                                                                [index]: highlightedProductIndex[index] < filteredProducts.length - 1
                                                                    ? highlightedProductIndex[index] + 1
                                                                    : 0
                                                            });
                                                        } else if (e.key === 'ArrowUp') {
                                                            e.preventDefault();
                                                            setShowProductDropdowns({
                                                                ...showProductDropdowns,
                                                                [index]: true
                                                            });
                                                            setHighlightedProductIndex({
                                                                ...highlightedProductIndex,
                                                                [index]: highlightedProductIndex[index] > 0
                                                                    ? highlightedProductIndex[index] - 1
                                                                    : filteredProducts.length - 1
                                                            });
                                                        } else if (e.key === 'Enter' || e.key === 'Tab') {
                                                            e.preventDefault();
                                                            if (showProductDropdowns[index] && highlightedProductIndex[index] >= 0 && filteredProducts.length > 0) {
                                                                const selectedProduct = filteredProducts[highlightedProductIndex[index]];
                                                                updateQuotationItem(index, 'product', selectedProduct._id);
                                                                setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                                                updateProductSearchTerm(index, undefined); // Reset to show selected product
                                                                setHighlightedProductIndex({ ...highlightedProductIndex, [index]: -1 });
                                                                setTimeout(() => {
                                                                    const quantityInput = document.querySelector(`[data-row="${index}"][data-field="quantity"]`) as HTMLInputElement;
                                                                    if (quantityInput) {
                                                                        quantityInput.focus();
                                                                        quantityInput.select();
                                                                    }
                                                                }, 50);
                                                            } else if (showProductDropdowns[index] && filteredProducts.length === 1) {
                                                                const selectedProduct = filteredProducts[0];
                                                                updateQuotationItem(index, 'product', selectedProduct._id);
                                                                setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                                                updateProductSearchTerm(index, undefined); // Reset to show selected product
                                                                setHighlightedProductIndex({ ...highlightedProductIndex, [index]: -1 });
                                                                setTimeout(() => {
                                                                    const quantityInput = document.querySelector(`[data-row="${index}"][data-field="quantity"]`) as HTMLInputElement;
                                                                    if (quantityInput) {
                                                                        quantityInput.focus();
                                                                        quantityInput.select();
                                                                    }
                                                                }, 50);
                                                            }
                                                        } else if (e.key === 'Escape') {
                                                            setShowProductDropdowns({
                                                                ...showProductDropdowns,
                                                                [index]: false
                                                            });
                                                            setHighlightedProductIndex({
                                                                ...highlightedProductIndex,
                                                                [index]: -1
                                                            });
                                                            updateProductSearchTerm(index, undefined); // Reset search term
                                                        }
                                                    }}
                                                    data-row={index}
                                                    data-field="product"
                                                    className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                                                    placeholder="Type to search..."
                                                    autoComplete="off"
                                                />

                                                {/* Clear button - only show when there's a search term or selected product */}
                                                {(productSearchTerms[index] || item.product) && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setFormData({ ...formData, items: formData.items?.map((item, i) => i === index ? { ...item, product: '', description: '', hsnNumber: '', taxRate: 0, quantity: 0, unitPrice: 0, uom: 'nos' } : item) })
                                                            updateQuotationItem(index, 'product', '');
                                                            updateProductSearchTerm(index, '');
                                                            setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                                            setHighlightedProductIndex({ ...highlightedProductIndex, [index]: -1 });
                                                            // Refocus the input
                                                            setTimeout(() => {
                                                                const input = document.querySelector(`[data-row="${index}"][data-field="product"]`) as HTMLInputElement;
                                                                if (input) input.focus();
                                                            }, 10);
                                                        }}
                                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}

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
                                                            {(() => {
                                                                const filteredProducts = getFilteredProducts(productSearchTerms[index] || '');

                                                                return (
                                                                    <>
                                                                        {/* Select product option */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => {
                                                                                updateQuotationItem(index, 'product', '');
                                                                                setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                                                                updateProductSearchTerm(index, undefined);
                                                                                setHighlightedProductIndex({ ...highlightedProductIndex, [index]: -1 });
                                                                            }}
                                                                            className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors text-sm border-b border-gray-100 ${!item.product ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                                                        >
                                                                            Select product
                                                                        </button>

                                                                        {filteredProducts.length === 0 ? (
                                                                            <div className="px-3 py-4 text-center text-sm text-gray-500">
                                                                                <div>No products found</div>
                                                                                <div className="text-xs mt-1">Try different search terms</div>
                                                                            </div>
                                                                        ) : (
                                                                            filteredProducts.map((product, productIndex) => (
                                                                                <button
                                                                                    key={product._id}
                                                                                    type="button"
                                                                                    data-product-index={productIndex}
                                                                                    onMouseDown={(e) => {
                                                                                        e.preventDefault();
                                                                                        updateQuotationItem(index, 'product', product._id);
                                                                                        setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                                                                        updateProductSearchTerm(index, undefined); // Reset to show selected name
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
                                                                                                <div><span className="font-medium">Part No:</span> {product?.partNo || 'N/A'}</div>
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
                                                                                                    <span className="font-medium">Category:</span> {product?.category || 'N/A'}
                                                                                                </div> */}

                                                                                                {/* Aggregated Stock Display */}
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
                                                                    </>
                                                                );
                                                            })()}
                                                        </div>

                                                        {/* <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Tab/Enter</kbd> Select → Set Qty → Tab/Enter Add Row •
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Shift+Tab</kbd> Previous •
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
            </div> */}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Product Name */}
                                            <div className="p-1 border-r border-gray-200">
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="text"
                                                        value={item.product ? getProductName(item.product) : (item.description || '')}
                                                        onChange={(e) => updateQuotationItem(index, 'description', e.target.value)}
                                                        onKeyDown={(e) => handleCellKeyDown(e, index, 'description')}
                                                        data-row={index}
                                                        data-field="description"
                                                        className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                                                        placeholder="Product Name"
                                                        disabled={true}
                                                    />

                                                    {/* Aggregated Stock Badge in Product Name Field */}
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
                                                    onChange={(e) => updateQuotationItem(index, 'hsnNumber', e.target.value)}
                                                    onKeyDown={(e) => handleCellKeyDown(e, index, 'hsnNumber')}
                                                    data-row={index}
                                                    data-field="hsnNumber"
                                                    className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                                                    placeholder="HSN"
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
                                                    onChange={(e) => updateQuotationItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                                                    onKeyDown={(e) => handleCellKeyDown(e, index, 'taxRate')}
                                                    data-row={index}
                                                    data-field="taxRate"
                                                    className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                                                    placeholder="0.00"
                                                    disabled={true}
                                                />
                                            </div>

                                            {/* Part No */}
                                            {/* <div className="p-1 border-r border-gray-200">
                      <input
                        type="text"
                        value={item.partNo || ''}
                        onChange={(e) => updateQuotationItem(index, 'partNo', e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, index, 'partNo')}
                        data-row={index}
                        data-field="partNo"
                        className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50"
                        placeholder="Part No"
                        disabled={true}
                      />
                    </div> */}

                                            {/* Quantity */}
                                            <div className="p-1 border-r border-gray-200 relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    value={item.quantity || ''}
                                                    onChange={(e) => {
                                                        let newQuantity = parseFloat(e.target.value) || '';
                                                        updateQuotationItem(index, 'quantity', newQuantity);
                                                    }}
                                                    onKeyDown={(e) => handleQuantityKeyDown(e, index)}
                                                    data-row={index}
                                                    data-field="quantity"
                                                    className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right ${item.product && formData.location && productStockCache[item.product] ? (
                                                        productStockCache[item.product].available === 0
                                                            ? 'bg-red-50 text-red-600 font-bold cursor-not-allowed'
                                                            : item.quantity > 0 && Number(item.quantity) > productStockCache[item.product].available
                                                                ? 'text-red-600 font-bold'
                                                                : ''
                                                    ) : ''
                                                        }`}
                                                    placeholder="1.00"
                                                    title={
                                                        item.product && formData.location && productStockCache[item.product]?.available === 0
                                                            ? "Product is out of stock - quantity locked at 0"
                                                            : "Tab/Enter here adds new row | ↑↓ arrows: adjust quantity | Shift+Tab: back to product"
                                                    }
                                                />

                                                {/* Warning: Quantity exceeds available stock */}
                                                {item.product &&
                                                    item.quantity > 0 &&
                                                    formData.location &&
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
                                                    value={item.uom || 'Nos'}
                                                    onClick={() => setShowUomDropdowns({
                                                        ...showUomDropdowns,
                                                        [index]: !showUomDropdowns[index]
                                                    })}
                                                    onKeyDown={(e) => handleCellKeyDown(e, index, 'uom')}
                                                    data-row={index}
                                                    data-field="uom"
                                                    className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                                    disabled={true}
                                                />
                                                {showUomDropdowns[index] && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                                                        {['Nos', 'Kg', 'Ltr', 'Mtr', 'Sq.Mtr', 'Pieces'].map(uomOption => (
                                                            <button
                                                                key={uomOption}
                                                                onClick={() => {
                                                                    updateQuotationItem(index, 'uom', uomOption);
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
                                                    step="1"
                                                    value={item.unitPrice.toFixed(2)}
                                                    onChange={(e) => updateQuotationItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    onKeyDown={(e) => handleCellKeyDown(e, index, 'unitPrice')}
                                                    data-row={index}
                                                    data-field="unitPrice"
                                                    className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                                                    placeholder="0.00"
                                                    disabled={true}
                                                />
                                            </div>

                                            {/* Discount */}
                                            <div className="p-1 border-r border-gray-200">
                                                <input
                                                    type="number"
                                                    step="1"
                                                    inputMode='decimal'
                                                    value={item.discount === 0 ? '' : item.discount}
                                                    onChange={(e) => updateQuotationItem(index, 'discount', parseFloat(e.target.value) || 0)}
                                                    onKeyDown={(e) => handleCellKeyDown(e, index, 'discount')}
                                                    data-row={index}
                                                    data-field="discount"
                                                    className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                                                    placeholder="0.00"
                                                />
                                            </div>

                                            {/* Total */}
                                            <div className="p-1 border-r border-gray-200">
                                                <div className="p-2 text-sm text-right font-bold text-blue-600">
                                                    ₹{item.totalPrice?.toFixed(2) || '0.00'}
                                                </div>
                                                {/* {(formData.items || []).length > 1 && (
                                                <button
                                                    onClick={() => removeQuotationItem(index)}
                                                    className="absolute top-1 right-1 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )} */}
                                            </div>
                                            <div className="p-0 h-full">
                                                <button
                                                    onClick={() => removeQuotationItem(index)}
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

                            {/* Navigation Hints */}
                            {/* <div className="bg-gray-50 border-t border-gray-200 p-3 text-center min-w-[1200px]">
                                <div className="text-sm text-gray-600 mb-1 mt-16">
                                    <strong>🚀 Excel-Like Quotation Items:</strong> Search → Select → Set Quantity → Tab → Next Row | Enter → Notes
                                </div>
                                <div className="text-xs text-gray-500 mb-1">
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded">Type</kbd> Search Product →
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">↑↓</kbd> Navigate List →
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Enter</kbd> Select →
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Set</kbd> Quantity →
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Tab</kbd> Next Row →
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Enter</kbd> Go to Notes
                                </div>
                                <div className="text-xs text-gray-400 mb-5">
                                    ⚡ <strong>Complete Excel-like quotation form navigation!</strong> • Stock validation enabled for accurate quotations
                                </div>
                            </div> */}
                        </div>

                        {/* Mobile Card View */}
                        <div className="lg:hidden space-y-4">
                            {(formData.items || []).map((item, index) => {
                                const stockInfo = stockValidation[index];
                                let cardBg = 'bg-white';
                                if (stockInfo) {
                                    if (stockInfo.available === 0) cardBg = 'bg-red-50';
                                    else if (!stockInfo.isValid) cardBg = 'bg-yellow-50';
                                    else if (stockInfo.available > 0) cardBg = 'bg-green-50';
                                }

                                return (
                                    <div key={index} className={`${cardBg} border border-gray-200 rounded-lg p-4 shadow-sm`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center space-x-2">
                                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                                                    #{index + 1}
                                                </span>
                                                {formData.location && item.product && productStockCache[item.product] && (
                                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${productStockCache[item.product].available === 0
                                                        ? 'bg-red-100 text-red-800'
                                                        : productStockCache[item.product].available <= 5
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-green-100 text-green-800'
                                                        }`}>
                                                        {productStockCache[item.product].available === 0
                                                            ? '❌ Out of Stock'
                                                            : `📦 ${productStockCache[item.product].available} in stock`}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => removeQuotationItem(index)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                                                title="Remove this item"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Product Selection */}
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                                                <div className="relative">
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
                                                        }}
                                                        onFocus={() => {
                                                            if (!productSearchTerms[index] && !item.product) {
                                                                updateProductSearchTerm(index, '');
                                                            }
                                                            setShowProductDropdowns({
                                                                ...showProductDropdowns,
                                                                [index]: true
                                                            });

                                                        }}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="Search product..."
                                                        autoComplete="off"
                                                    />
                                                    {showProductDropdowns[index] && (
                                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                                            {getFilteredProducts(productSearchTerms[index] || '').map((product, productIndex) => (
                                                                <button
                                                                    key={product._id}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        updateQuotationItem(index, 'product', product._id);
                                                                        setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                                                        updateProductSearchTerm(index, '');
                                                                        setHighlightedProductIndex({ ...highlightedProductIndex, [index]: -1 });
                                                                    }}
                                                                    className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${item.product === product._id ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
                                                                        }`}
                                                                >
                                                                    <div className="font-medium">{product.name}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {product.partNo} • ₹{product.price?.toLocaleString()}
                                                                        {formData.location && productStockCache[product._id] && (
                                                                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                                                                                {productStockCache[product._id].available} in stock
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quantity and Price Row */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            let newQuantity = parseFloat(e.target.value) || 1;
                                                            updateQuotationItem(index, 'quantity', newQuantity);
                                                        }}
                                                        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${item.product && formData.location && productStockCache[item.product]?.available === 0
                                                            ? 'bg-red-50 text-red-600' : ''
                                                            }`}
                                                        placeholder="1"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={item.unitPrice.toFixed(2)}
                                                        onChange={(e) => updateQuotationItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                        placeholder="0.00"
                                                        disabled={true}
                                                    />
                                                </div>
                                            </div>

                                            {/* Discount Row */}
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">Discount (%)</label>
                                                <input
                                                    type="number"
                                                    step="1"
                                                    value={item.discount === 0 ? '' : item.discount}
                                                    onChange={(e) => updateQuotationItem(index, 'discount', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="0"
                                                />
                                            </div>

                                            {/* Total */}
                                            <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                                <span className="text-sm font-medium text-gray-700">Total:</span>
                                                <span className="text-lg font-bold text-blue-600">
                                                    ₹{item.totalPrice?.toFixed(2) || '0.00'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>}

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
                                            quantity: 0,
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
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">HSN/SAC</div>
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
                                                className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                                                placeholder="Service description..."
                                            />
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
                                                className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                                                placeholder="HSN Code"
                                            />
                                        </div>

                                        {/* Quantity */}
                                        <div className="p-2 border-r border-gray-200">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={service.quantity || ''}
                                                onChange={(e) => {
                                                    const newServiceCharges = [...(formData.serviceCharges || [])];
                                                    const quantity = parseFloat(e.target.value) || 0;
                                                    const unitPrice = newServiceCharges[index].unitPrice || 0;
                                                    const discount = newServiceCharges[index].discount || 0;
                                                    const taxRate = newServiceCharges[index].taxRate || 18;

                                                    // Calculate the derived fields
                                                    const itemSubtotal = quantity * unitPrice;
                                                    const discountAmount = (discount / 100) * itemSubtotal;
                                                    const discountedAmount = itemSubtotal - discountAmount;
                                                    const taxAmount = (taxRate / 100) * discountedAmount;
                                                    const totalPrice = discountedAmount + taxAmount;

                                                    newServiceCharges[index] = {
                                                        ...newServiceCharges[index],
                                                        quantity,
                                                        discountedAmount: Math.round(discountAmount * 100) / 100,
                                                        taxAmount: Math.round(taxAmount * 100) / 100,
                                                        totalPrice: Math.round(totalPrice * 100) / 100
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
                                                className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                                placeholder="0"
                                            />
                                        </div>

                                        {/* Unit Price */}
                                        <div className="p-2 border-r border-gray-200">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={service.unitPrice || ''}
                                                onChange={(e) => {
                                                    const newServiceCharges = [...(formData.serviceCharges || [])];
                                                    const unitPrice = parseFloat(e.target.value) || 0;
                                                    const quantity = newServiceCharges[index].quantity || 0;
                                                    const discount = newServiceCharges[index].discount || 0;
                                                    const taxRate = newServiceCharges[index].taxRate || 18;

                                                    // Calculate the derived fields
                                                    const itemSubtotal = quantity * unitPrice;
                                                    const discountAmount = (discount / 100) * itemSubtotal;
                                                    const discountedAmount = itemSubtotal - discountAmount;
                                                    const taxAmount = (taxRate / 100) * discountedAmount;
                                                    const totalPrice = discountedAmount + taxAmount;

                                                    newServiceCharges[index] = {
                                                        ...newServiceCharges[index],
                                                        unitPrice,
                                                        discountedAmount: Math.round(discountAmount * 100) / 100,
                                                        taxAmount: Math.round(taxAmount * 100) / 100,
                                                        totalPrice: Math.round(totalPrice * 100) / 100
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
                                                className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        {/* Discount */}
                                        <div className="p-2 border-r border-gray-200">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={service.discount || ''}
                                                onChange={(e) => {
                                                    const newServiceCharges = [...(formData.serviceCharges || [])];
                                                    const discount = parseFloat(e.target.value) || 0;
                                                    const quantity = newServiceCharges[index].quantity || 0;
                                                    const unitPrice = newServiceCharges[index].unitPrice || 0;
                                                    const taxRate = newServiceCharges[index].taxRate || 18;

                                                    // Calculate the derived fields
                                                    const itemSubtotal = quantity * unitPrice;
                                                    const discountAmount = (discount / 100) * itemSubtotal;
                                                    const discountedAmount = itemSubtotal - discountAmount;
                                                    const taxAmount = (taxRate / 100) * discountedAmount;
                                                    const totalPrice = discountedAmount + taxAmount;

                                                    newServiceCharges[index] = {
                                                        ...newServiceCharges[index],
                                                        discount,
                                                        discountedAmount: Math.round(discountAmount * 100) / 100,
                                                        taxAmount: Math.round(taxAmount * 100) / 100,
                                                        totalPrice: Math.round(totalPrice * 100) / 100
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
                                                className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                                placeholder="0.00"
                                            />
                                        </div>

                                        {/* GST */}
                                        <div className="p-2 border-r border-gray-200">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="1"
                                                value={service.taxRate || ''}
                                                onChange={(e) => {
                                                    const newServiceCharges = [...(formData.serviceCharges || [])];
                                                    const taxRate = parseFloat(e.target.value) || 0;
                                                    const quantity = newServiceCharges[index].quantity || 0;
                                                    const unitPrice = newServiceCharges[index].unitPrice || 0;
                                                    const discount = newServiceCharges[index].discount || 0;

                                                    // Calculate the derived fields
                                                    const itemSubtotal = quantity * unitPrice;
                                                    const discountAmount = (discount / 100) * itemSubtotal;
                                                    const discountedAmount = itemSubtotal - discountAmount;
                                                    const taxAmount = (taxRate / 100) * discountedAmount;
                                                    const totalPrice = discountedAmount + taxAmount;

                                                    newServiceCharges[index] = {
                                                        ...newServiceCharges[index],
                                                        taxRate,
                                                        discountedAmount: Math.round(discountAmount * 100) / 100,
                                                        taxAmount: Math.round(taxAmount * 100) / 100,
                                                        totalPrice: Math.round(totalPrice * 100) / 100
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
                                                className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                                                placeholder="18.00"
                                            />
                                        </div>

                                        {/* Total */}
                                        <div className="p-2 text-center border-r border-gray-200">
                                            <div className="text-sm font-bold text-blue-600">
                                                {(() => {
                                                    const qty = Number(service.quantity) || 0;
                                                    const unit = Number(service.unitPrice) || 0;
                                                    const disc = Number(service.discount) || 0;
                                                    const gst = Number(service.taxRate) || 0;
                                                    const calc = (qty * unit) * (1 - disc / 100) * (1 + gst / 100);
                                                    const total = typeof service.totalPrice === 'number' && !isNaN(service.totalPrice) ? service.totalPrice : calc;
                                                    return `₹${total.toFixed(2)}`;
                                                })()}
                                            </div>
                                        </div>

                                        {/* Remove Button */}
                                        <div className="p-2 text-center">
                                            <button
                                                onClick={() => {
                                                    const newServiceCharges = (formData.serviceCharges || []).filter((_, i) => i !== index);
                                                    setFormData(prev => {
                                                        // Recalculate totals after removing service charge
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
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Battery Buy Back (Deduction from Total)</h3>

                    <div className="border border-gray-300 rounded-lg bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <div className="bg-gray-100 border-b border-gray-300 min-w-[1200px]">
                                <div className="grid text-xs font-bold text-gray-800 uppercase tracking-wide"
                                    style={{ gridTemplateColumns: '1fr 120px 100px 120px 80px 80px 60px' }}>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Description</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">HSN</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Quantity</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Unit Price</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Discount %</div>
                                    <div className="p-3 text-center border-r border-gray-300 bg-gray-200">Total</div>
                                    <div className="p-3 text-center bg-gray-200">Action</div>
                                </div>
                            </div>

                            <div className="bg-white">
                                <div className="grid group hover:bg-blue-50 transition-colors"
                                    style={{ gridTemplateColumns: '1fr 120px 100px 120px 80px 80px 60px' }}>

                                    {/* Description */}
                                    <div className="p-2 border-r border-gray-200">
                                        <input
                                            type="text"
                                            value={formData.batteryBuyBack?.description || 'Battery Buy Back'}
                                            onChange={(e) => {
                                                setFormData(prev => {
                                                    const updatedData = {
                                                        ...prev,
                                                        batteryBuyBack: {
                                                            description: e.target.value,
                                                            hsnNumber: prev.batteryBuyBack?.hsnNumber || '',
                                                            quantity: prev.batteryBuyBack?.quantity || 0,
                                                            unitPrice: prev.batteryBuyBack?.unitPrice || 0,
                                                            discount: prev.batteryBuyBack?.discount || 0,
                                                            discountedAmount: 0,
                                                            taxRate: 0,
                                                            taxAmount: 0,
                                                            totalPrice: 0
                                                        }
                                                    };

                                                    // Recalculate totals including battery buy back
                                                    const calculationResult = calculateQuotationTotals(
                                                        updatedData.items || [],
                                                        updatedData.serviceCharges || [],
                                                        updatedData.batteryBuyBack,
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
                                            className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                                            placeholder="Battery Buy Back"
                                        />
                                    </div>

                                    {/* HSN */}
                                    <div className="p-2 border-r border-gray-200">
                                        <input
                                            type="text"
                                            value={formData.batteryBuyBack?.hsnNumber || ''}
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
                                            min="0"
                                            step="1"
                                            value={formData.batteryBuyBack?.quantity || ''}
                                            onChange={(e) => {
                                                const quantity = parseFloat(e.target.value) || 0;
                                                const unitPrice = formData.batteryBuyBack?.unitPrice || 0;
                                                const discount = formData.batteryBuyBack?.discount || 0;

                                                setFormData(prev => {
                                                    const updatedData = {
                                                        ...prev,
                                                        batteryBuyBack: {
                                                            description: prev.batteryBuyBack?.description || 'Battery Buy Back',
                                                            hsnNumber: prev.batteryBuyBack?.hsnNumber || '',
                                                            quantity,
                                                            unitPrice,
                                                            discount,
                                                            discountedAmount: 0,
                                                            taxRate: 0,
                                                            taxAmount: 0,
                                                            totalPrice: 0
                                                        }
                                                    };

                                                    // Recalculate totals including battery buy back
                                                    const calculationResult = calculateQuotationTotals(
                                                        updatedData.items || [],
                                                        updatedData.serviceCharges || [],
                                                        updatedData.batteryBuyBack,
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
                                            className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                                            placeholder="1"
                                        />
                                    </div>

                                    {/* Unit Price (negative value for deduction) */}
                                    <div className="p-2 border-r border-gray-200">
                                        <input
                                            type="number"
                                            step="1"
                                            value={formData.batteryBuyBack?.unitPrice || ''}
                                            onChange={(e) => {
                                                const unitPrice = parseFloat(e.target.value) || 0;
                                                const quantity = formData.batteryBuyBack?.quantity || 0;
                                                const discount = formData.batteryBuyBack?.discount || 0;

                                                setFormData(prev => {
                                                    const updatedData = {
                                                        ...prev,
                                                        batteryBuyBack: {
                                                            description: prev.batteryBuyBack?.description || 'Battery Buy Back',
                                                            hsnNumber: prev.batteryBuyBack?.hsnNumber || '',
                                                            quantity,
                                                            unitPrice,
                                                            discount,
                                                            discountedAmount: 0,
                                                            taxRate: 0,
                                                            taxAmount: 0,
                                                            totalPrice: 0
                                                        }
                                                    };

                                                    // Recalculate totals including battery buy back
                                                    const calculationResult = calculateQuotationTotals(
                                                        updatedData.items || [],
                                                        updatedData.serviceCharges || [],
                                                        updatedData.batteryBuyBack,
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
                                            className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none text-right"
                                            placeholder="0.00"
                                        />
                                    </div>

                                    {/* Discount */}
                                    <div className="p-2 border-r border-gray-200">
                                        <input
                                            type="number"
                                            // min="0"
                                            max="100"
                                            step="1"
                                            value={formData.batteryBuyBack?.discount || ''}
                                            onChange={(e) => {
                                                const discount = parseFloat(e.target.value) || 0;
                                                const quantity = formData.batteryBuyBack?.quantity || 0;
                                                const unitPrice = formData.batteryBuyBack?.unitPrice || 0;

                                                setFormData(prev => {
                                                    const updatedData = {
                                                        ...prev,
                                                        batteryBuyBack: {
                                                            description: prev.batteryBuyBack?.description || 'Battery Buy Back',
                                                            hsnNumber: prev.batteryBuyBack?.hsnNumber || '',
                                                            quantity,
                                                            unitPrice,
                                                            discount,
                                                            discountedAmount: 0,
                                                            taxRate: 0,
                                                            taxAmount: 0,
                                                            totalPrice: 0
                                                        }
                                                    };

                                                    // Recalculate totals including battery buy back
                                                    const calculationResult = calculateQuotationTotals(
                                                        updatedData.items || [],
                                                        updatedData.serviceCharges || [],
                                                        updatedData.batteryBuyBack,
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
                                            className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                                            placeholder="0.00"
                                        />
                                    </div>



                                    {/* Total */}
                                    <div className="p-2 text-center border-r border-gray-200">
                                        <div className="text-sm font-bold text-red-600">
                                            - ₹{((formData.batteryBuyBack?.quantity || 0) * (formData.batteryBuyBack?.unitPrice || 0) * (1 - (formData.batteryBuyBack?.discount || 0) / 100)).toFixed(2)}
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
                    <p className="text-sm text-gray-600 mt-2">
                        💡 <strong>Note:</strong> Battery Buy Back is a deduction from the total. Use negative values (e.g., -500) to reduce the grand total.
                    </p>
                </div>

                {/* Company Information Section */}
                <div className="p-5 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>


                    {/* Bank Details Section */}
                    <div className="border-t border-gray-200 pt-4 flex flex-col gap-4">
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
                        {/* QR Code Upload Field */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    QR Code Image <span className="text-gray-400 font-normal">(Optional)</span>
                                </label>

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
                                        <div className="text-sm text-gray-600">
                                            <strong>File:</strong> {qrCodeImage?.name}
                                            <br />
                                            <strong>Size:</strong> {qrCodeImage?.size ? (qrCodeImage.size / 1024 / 1024).toFixed(2) : '0'} MB
                                        </div>
                                    </div>
                                )}

                                <p className="text-sm text-gray-500 mt-2">
                                    Upload a QR code image that will be included in the quotation
                                </p>
                            </div>
                        </div>
                    </div>
                    </div>
                    
                </div>

                {/* Notes and Terms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2 p-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            onKeyDown={(e) => {
                                if (e.key === 'Tab' && e.shiftKey) {
                                    e.preventDefault();
                                    // Move back to last product's quantity field
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
                            // onKeyDown={(e) => {
                            //     if (e.key === 'Tab' && e.shiftKey) {
                            //         e.preventDefault();
                            //         // Move back to Notes field
                            //         setTimeout(() => {
                            //             const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
                            //             if (notesInput) notesInput.focus();
                            //         }, 50);
                            //     } else if (e.key === 'Tab' && !e.shiftKey) {
                            //         e.preventDefault();
                            //         // Move to Create Quotation button
                            //         setTimeout(() => {
                            //             // Find the enabled Create/Update Quotation button
                            //             const createBtn = document.querySelector('button.px-6.py-2.bg-blue-600:not([disabled])') as HTMLButtonElement;
                            //             if (createBtn) createBtn.focus();
                            //         }, 50);
                            //     }
                            // }}
                            rows={3}
                            data-field="terms"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            placeholder="Terms and conditions..."
                        />
                    </div>
                </div>

                {/* Overall Discount */}
                {/* <div className="border-t border-gray-200 p-4">
                    <div className="flex justify-end">
                        <div className="w-80">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-medium text-gray-700">Overall Discount (%):</label>
                                <input
                                    type="number"
                                    value={formData.overallDiscount || 0}
                                    onChange={(e) => {
                                        const value = parseFloat(e.target.value) || 0;
                                        console.log('QuotationForm: Overall discount changed to:', value);
                                        setFormData(prev => {
                                            const calculationResult = calculateQuotationTotals(prev.items || [], prev.serviceCharges || [], prev.batteryBuyBack || null, value);
                                            console.log('QuotationForm: Calculation result:', calculationResult);
                                            const updatedData = {
                                                ...prev,
                                                overallDiscount: value,
                                                overallDiscountAmount: calculationResult.overallDiscountAmount,
                                                totalDiscount: calculationResult.totalDiscount,
                                                totalTax: calculationResult.totalTax,
                                                grandTotal: calculationResult.grandTotal,
                                                roundOff: calculationResult.roundOff
                                            };
                                            console.log('QuotationForm: Updated form data:', updatedData);
                                            return updatedData;
                                        });
                                    }}
                                    min="0"
                                    max="100"
                                    step="0.01"
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>
                </div> */}

                {/* Totals */}
                <div className="border-t border-gray-200 pt-4 m-4">
                    <div className="flex justify-end">
                        <div className="w-80 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-medium">₹{formData.subtotal?.toFixed(2) || '0.00'}</span>
                            </div>

                            {/* Service Charges Breakdown */}
                            {formData.serviceCharges && formData.serviceCharges.length > 0 && formData.serviceCharges.some(service => service.totalPrice > 0) && (
                                <div className="border-t border-gray-100 pt-2">
                                    <div className="text-xs text-gray-500 mb-1">Service Charges:</div>
                                    {formData.serviceCharges.map((service, index) => (
                                        service.totalPrice > 0 && (
                                            <div key={index} className="flex justify-between text-xs text-gray-600 mb-1">
                                                <span className="truncate max-w-32">{service.description}</span>
                                                <span className="font-medium">+₹{service.totalPrice?.toFixed(2) || '0.00'}</span>
                                            </div>
                                        )
                                    ))}
                                    <div className="flex justify-between text-sm text-gray-700 border-t border-gray-100 pt-1 mt-1">
                                        <span>Total Service Charges:</span>
                                        <span className="font-medium">+₹{(formData.serviceCharges || []).reduce((sum, service) => sum + (service.totalPrice || 0), 0).toFixed(2)}</span>
                                    </div>
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
                            {/* <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Overall Discount:</span>
                                <span className="font-medium text-green-600">-{formData.overallDiscount || 0}% (-₹{formData.overallDiscountAmount?.toFixed(2) || '0.00'})</span>
                            </div> */}

                            {/* Battery Buy Back Breakdown */}
                            {formData.batteryBuyBack && formData.batteryBuyBack.totalPrice > 0 && (
                                <div className="border-t border-gray-100 pt-2">
                                    <div className="text-xs text-gray-500 mb-1">Battery Buy Back (Deduction):</div>
                                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                                        <span className="truncate max-w-32">{formData.batteryBuyBack.description}</span>
                                        <span className="font-medium text-red-600">-₹{formData.batteryBuyBack.totalPrice?.toFixed(2) || '0.00'}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-red-600 border-t border-gray-100 pt-1 mt-1">
                                        <span>Total Deduction:</span>
                                        <span className="font-medium">-₹{formData.batteryBuyBack.totalPrice?.toFixed(2) || '0.00'}</span>
                                    </div>
                                </div>
                            )}

                            {/* Net Amount Before Grand Total */}
                            {/* <div className="flex justify-between text-sm text-gray-700 border-t border-gray-200 pt-2">
                                <span>Net Amount:</span>
                                <span className="font-medium">₹{(() => {
                                    let netAmount = (formData.subtotal || 0) - (formData.totalDiscount || 0) + (formData.totalTax || 0);
                                    // Add service charges
                                    if (formData.serviceCharges) {
                                        netAmount += formData.serviceCharges.reduce((sum, service) => sum + (service.totalPrice || 0), 0);
                                    }
                                    // Subtract overall discount
                                    if (formData.overallDiscountAmount) {
                                        netAmount -= formData.overallDiscountAmount;
                                    }
                                    return netAmount.toFixed(2);
                                })()}</span>
                            </div> */}

                            <div className="flex justify-between font-bold text-lg border-t pt-3">
                                <span>Grand Total:</span>
                                <span className="text-blue-600">₹{formData.grandTotal?.toFixed(2) || '0.00'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Information */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Remaining Amount */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Remaining Amount</h3>
                        <div className="text-2xl font-bold text-blue-600">
                            ₹{formData.remainingAmount?.toFixed(2) || formData.grandTotal?.toFixed(2) || '0.00'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Total amount to be paid
                        </p>
                    </div>

                    {/* Payment Status */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Status</h3>
                        <div className={`text-lg font-semibold ${getPaymentStatusColor(formData.paymentStatus || 'pending')}`}>
                            {getPaymentStatusLabel(formData.paymentStatus || 'pending')}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {formData.paymentStatus === 'paid' ? 'Full payment received' :
                                formData.paymentStatus === 'partial' ? 'Partial payment received' :
                                    'No payments received yet'}
                        </p>
                    </div>

                    {/* Payment Method */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Payment Method</h3>
                        <div className="text-lg font-semibold text-gray-900">
                            {formData.paymentMethod ? getPaymentMethodLabel(formData.paymentMethod) : 'Not specified'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {formData.paymentMethod ? 'Payment method selected' : 'Will be set during payment'}
                        </p>
                    </div>

                    {/* Paid Amount */}
                    <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Paid Amount</h3>
                        <div className="text-lg font-semibold text-green-600">
                            ₹{formData.paidAmount?.toFixed(2) || '0.00'}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {formData.paidAmount && formData.paidAmount > 0 ? 'Payment received' : 'No payments yet'}
                        </p>
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
                                <span>{isEditMode ? 'Update Quotation' : 'Create Quotation'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default QuotationFormPage;