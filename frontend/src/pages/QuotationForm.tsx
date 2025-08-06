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
    CheckCircle
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
    getFieldErrorMessage,
    type QuotationData,
    type QuotationItem,
    type ValidationError,
    validateQuotationData
} from '../utils/quotationUtils';
import { numberToWords } from '../utils';
import { createPortal } from 'react-dom';

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

const QuotationFormPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const currentUser = useSelector((state: RootState) => state.auth.user);

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

    // Custom dropdown states
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [showBillToAddressDropdown, setShowBillToAddressDropdown] = useState(false);
    const [showShipToAddressDropdown, setShowShipToAddressDropdown] = useState(false);
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);
    const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
    const [showUomDropdowns, setShowUomDropdowns] = useState<Record<number, boolean>>({});

    // Form states
    const [formData, setFormData] = useState<Partial<QuotationData>>(getDefaultQuotationData());
    const [errors, setErrors] = useState<ValidationError[]>([]);
    
    // 🚀 STOCK DISPLAY STATES (Read-only for quotations)
    const [productStockCache, setProductStockCache] = useState<Record<string, any>>({});
    const [stockValidation, setStockValidation] = useState<Record<number, any>>({});

    // Search states
    const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});
    const [uomSearchTerms, setUomSearchTerms] = useState<Record<number, string>>({});
    const [highlightedProductIndex, setHighlightedProductIndex] = useState<Record<number, number>>({});

    // Excel-like navigation states for dropdown fields
    const [highlightedLocationIndex, setHighlightedLocationIndex] = useState(-1);
    const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
    const [highlightedBillToAddressIndex, setHighlightedBillToAddressIndex] = useState(-1);
    const [highlightedShipToAddressIndex, setHighlightedShipToAddressIndex] = useState(-1);
    const [highlightedEngineerIndex, setHighlightedEngineerIndex] = useState(-1);
    const [locationSearchTerm, setLocationSearchTerm] = useState('');
    const [engineerSearchTerm, setEngineerSearchTerm] = useState('');

    // UOM options
    const UOM_OPTIONS = [
        'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos'
    ];

    // Portal dropdown position tracking
    const [dropdownPosition, setDropdownPosition] = useState<{
        top: number;
        left: number;
        width: number;
        rowIndex: number;
    } | null>(null);



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
                setDropdownPosition(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    console.log("formData.location:", formData.location);
    

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

    // 🚀 LOAD STOCK WHEN LOCATION IS SET (WORKS FOR BOTH CREATE AND EDIT MODE)
    useEffect(() => {
        if (formData.location && Object.keys(productStockCache).length === 0) {
            loadAllStockForLocation();
        }
    }, [formData.location, productStockCache]);
      
    

    const fetchAllData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchCustomers(),
                fetchProducts(),
                fetchLocations(),
                fetchGeneralSettings(),
                fetchFieldOperators()
            ]);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const setFormDataFromQuotation = (quotation: any) => {
        try {
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
                customer: quotation.customer ? {
                    _id: quotation.customer._id || '',
                    name: quotation.customer.name || '',
                    email: quotation.customer.email || '',
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
                notes: quotation.notes || '',
                terms: quotation.terms || '',
                billToAddress: quotation.billToAddress ? {
                    address: quotation.billToAddress.address || '',
                    state: quotation.billToAddress.state || '',
                    district: quotation.billToAddress.district || '',
                    pincode: quotation.billToAddress.pincode || '',
                    ...(matchingBillToAddressId && { addressId: matchingBillToAddressId })
                } : {
                    address: '',
                    state: '',
                    district: '',
                    pincode: ''
                },
                shipToAddress: quotation.shipToAddress ? {
                    address: quotation.shipToAddress.address || '',
                    state: quotation.shipToAddress.state || '',
                    district: quotation.shipToAddress.district || '',
                    pincode: quotation.shipToAddress.pincode || '',
                    ...(matchingShipToAddressId && { addressId: matchingShipToAddressId })
                } : {
                    address: '',
                    state: '',
                    district: '',
                    pincode: ''
                }
            };

            setFormData(formDataToSet);

        } catch (formError) {
            console.error('Error setting form data:', formError);
            toast.error('Error processing quotation data. Some fields may not load correctly.');
            // Set minimal fallback data
            setFormData(getDefaultQuotationData());
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await apiClient.customers.getAll({ limit: 100, page: 1 });
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
            console.log(`Loaded ${productsData.length} unique products`); // Debug log
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

    const fetchFieldOperators = async () => {
        try {
            const response = await apiClient.users.getFieldOperators();
            if (response.success) {
                setFieldOperators(response.data.fieldOperators);
            }
        } catch (error) {
            console.error('Error fetching field operators:', error);
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

    // Calculate dropdown position for portal rendering
    const calculateDropdownPosition = (inputElement: HTMLElement, rowIndex: number) => {
        const rect = inputElement.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
        
        setDropdownPosition({
            top: rect.bottom + scrollTop,
            left: rect.left + scrollLeft,
            width: rect.width,
            rowIndex
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

    const getEngineerLabel = (value: string) => {
        const engineer = fieldOperators.find(e => e._id === value);
        return engineer ? engineer.name : '';
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
                setDropdownPosition(null);
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
                setDropdownPosition(null);

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

                // Scroll to highlighted item in portal dropdown
                setTimeout(() => {
                    const highlightedElement = document.querySelector(`[data-product-index="${newIndex}"]`);
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

                // Scroll to highlighted item in portal dropdown
                setTimeout(() => {
                    const highlightedElement = document.querySelector(`[data-product-index="${newIndex}"]`);
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
            setDropdownPosition(null);
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
            
            // 🚨 ALLOW INCREASING QUANTITY UP TO AVAILABLE STOCK
            if (currentItem?.product && formData.location && productStockCache[currentItem.product]) {
                const stockInfo = productStockCache[currentItem.product];
                if (stockInfo.available === 0) {
                    newQuantity = 0; // Keep at 0 for out-of-stock products
                    toast.error('Cannot increase quantity - product is out of stock', { duration: 2000 });
                } else if (newQuantity > stockInfo.available) {
                    // Allow increasing up to available stock, but show warning if exceeding
                    newQuantity = stockInfo.available;
                    toast.error(`Maximum available quantity is ${stockInfo.available}`, { duration: 2000 });
                }
            }
            
            updateQuotationItem(rowIndex, 'quantity', newQuantity);

        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            let newQuantity = Math.max(1, currentQuantity - 1); // Minimum quantity is 1
            
            // 🚨 FORCE TO 0 FOR OUT-OF-STOCK PRODUCTS
            if (currentItem?.product && formData.location && productStockCache[currentItem.product]) {
                const stockInfo = productStockCache[currentItem.product];
                if (stockInfo.available === 0) {
                    newQuantity = 0; // Force to 0 for out-of-stock products
                }
            }
            
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
                        ...(selectedAddress.id && { addressId: selectedAddress.id })
                    } as any
                });
                setShowBillToAddressDropdown(false);
                setHighlightedBillToAddressIndex(-1);

                // Move to next field (ship to address) and open dropdown
                setTimeout(() => {
                    const shipToAddressInput = document.querySelector('[data-field="ship-to-address"]') as HTMLInputElement;
                    if (shipToAddressInput) {
                        shipToAddressInput.focus();
                        setShowShipToAddressDropdown(true);
                    }
                }, 50);
            } else if (!showBillToAddressDropdown) {
                // If no dropdown open, just move to next field (ship to address) and open dropdown
                setTimeout(() => {
                    const shipToAddressInput = document.querySelector('[data-field="ship-to-address"]') as HTMLInputElement;
                    if (shipToAddressInput) {
                        shipToAddressInput.focus();
                        setShowShipToAddressDropdown(true);
                    }
                }, 50);
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

    // 🚀 STOCK DISPLAY FUNCTIONS (Read-only for quotations)
    const loadAllStockForLocation = async () => {
        if (!formData.location) return;

        try {
            const response = await apiClient.stock.getStock({
                location: formData.location,
                limit: 10000
            });

            let stockData: any[] = [];
            if (response.data?.stockLevels && Array.isArray(response.data.stockLevels)) {
                stockData = response.data.stockLevels;
            }

            const newStockCache: any = {};
            stockData.forEach(stock => {
                const productId = stock.product?._id || stock.product;
                if (productId) {
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

            setProductStockCache(newStockCache);
        } catch (error) {
            console.error('Error loading stock for location:', error);
        }
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
                
                // Load stock information for display (read-only)
                validateStockForItem(index, value, updatedItems[index].quantity);
            }

            if (field === 'quantity') {
                validateStockForItem(index, updatedItems[index].product, value);
            }

            // Recalculate totals
            const calculationResult = calculateQuotationTotals(updatedItems, prev.overallDiscount || 0);

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
        
        // 🚨 FILTER OUT QUANTITY VALIDATION FOR OUT-OF-STOCK PRODUCTS
        let filteredErrors = validation.errors;
        
        if (formData.location) {
            // Filter out "Quantity must be greater than 0" errors for out-of-stock products
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

    const handleSubmit = async () => {
        if (!validateForm()) {
            toast.error('Please fix the validation errors');
            return;
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

    // Portal-based Product Dropdown Component
    const ProductDropdownPortal = () => {
        if (!dropdownPosition || !showProductDropdowns[dropdownPosition.rowIndex]) {
            return null;
        }

        const currentRowIndex = dropdownPosition.rowIndex;
        const searchTerm = productSearchTerms[currentRowIndex] || '';

        return createPortal(
            <div
                className="fixed bg-white border border-gray-300 rounded-md shadow-lg z-[9999] max-h-[400px] overflow-hidden"
                style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: '450px',
                    minWidth: '450px'
                }}
            >
                <div className="p-2 border-b border-gray-200 bg-gray-50">
                    <div className="text-xs text-gray-600">
                        {getFilteredProducts(searchTerm).length} products found
                        {searchTerm && (
                            <span className="ml-2 text-blue-600 font-medium">
                                for "{searchTerm}"
                            </span>
                        )}
                    </div>
                </div>

                <div className="overflow-y-auto max-h-96">
                    {getFilteredProducts(searchTerm).length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-gray-500">
                            <div>No products found</div>
                            <div className="text-xs mt-1">Try different search terms</div>
                        </div>
                    ) : (
                        getFilteredProducts(searchTerm).map((product, productIndex) => {
                            const currentItem = formData.items?.[currentRowIndex];
                            return (
                                <button
                                    key={product._id}
                                    data-product-index={productIndex}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        updateQuotationItem(currentRowIndex, 'product', product._id);
                                        setShowProductDropdowns({ ...showProductDropdowns, [currentRowIndex]: false });
                                        updateProductSearchTerm(currentRowIndex, '');
                                        setHighlightedProductIndex({ ...highlightedProductIndex, [currentRowIndex]: -1 });
                                        setDropdownPosition(null);
                                        setTimeout(() => {
                                            const quantityInput = document.querySelector(`[data-row="${currentRowIndex}"][data-field="quantity"]`) as HTMLInputElement;
                                            if (quantityInput) {
                                                quantityInput.focus();
                                                quantityInput.select();
                                            }
                                        }, 50);
                                    }}
                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${currentItem?.product === product._id ? 'bg-blue-100 text-blue-800' :
                                            highlightedProductIndex[currentRowIndex] === productIndex ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                                'text-gray-700'
                                        } ${productIndex === 0 && searchTerm && highlightedProductIndex[currentRowIndex] === -1 ? 'bg-yellow-50 border-l-4 border-l-blue-500' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="font-medium text-gray-900 mb-1 flex items-center">
                                                <div><span className="font-medium">Part No:</span>{product?.partNo}</div>
                                                {highlightedProductIndex[currentRowIndex] === productIndex && (
                                                    <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                                        Selected - Press Enter
                                                    </span>
                                                )}
                                                {productIndex === 0 && searchTerm && highlightedProductIndex[currentRowIndex] === -1 && (
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
                                                
                                                {/* Stock Display in Product Details */}
                                                {formData.location && (
                                                    (() => {
                                                        const stockInfo = productStockCache[product._id];
                                                        if (stockInfo) {
                                                            return (
                                                                <div className="mt-1 flex items-center">
                                                                    <span className="font-medium text-gray-700">Stock Available:</span>
                                                                    <span className={`ml-2 px-2 py-0.5 rounded-md text-xs font-bold ${stockInfo.available === 0
                                                                            ? 'bg-red-100 text-red-800 border border-red-300' 
                                                                            : stockInfo.available <= 5
                                                                                ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                                                                : 'bg-green-100 text-green-800 border border-green-300'
                                                                    }`}>
                                                                        {stockInfo.available === 0 ? '❌ OUT OF STOCK' : `✅ ${stockInfo.available} units`}
                                                                    </span>
                                                                </div>
                                                            );
                                                        }
                                                        // Show loading state when stock info is not yet available
                                                        return (
                                                            <div className="mt-1 flex items-center">
                                                                <span className="font-medium text-gray-500">Stock Available:</span>
                                                                <span className="ml-2 px-2 py-0.5 rounded-md text-xs bg-gray-100 text-gray-600 border border-gray-300">
                                                                    Loading...
                                                                </span>
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0 ml-4">
                                            <div className="font-bold text-lg text-green-600">₹{product?.price?.toLocaleString()}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">per unit</div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Tab/Enter</kbd> Select → Set Qty → Tab/Enter Add Row •
                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Shift+Tab</kbd> Previous •
                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                </div>
            </div>,
            document.body
        );
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
            {/* Portal-based Product Dropdown */}
            <ProductDropdownPortal />
            
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

            {/* 🚀 EXCEL-LIKE NAVIGATION GUIDE */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                    <span className="text-lg">⚡</span>
                    <h3 className="text-sm font-semibold text-blue-900 ml-2">Excel-Like Navigation Enabled!</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-800">
                    <div>
                        <p className="font-medium mb-1">🎯 Complete Form Navigation:</p>
                        <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Tab/Enter</kbd> Move forward</p>
                        {/* <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Shift+Tab</kbd> Move backward</p> */}
                        <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">↑↓</kbd> Navigate dropdowns</p>
                    </div>
                    <div>
                        <p className="font-medium mb-1">🔥 Super Fast Flow:</p>
                        <p>Location → Customer → Address → Validity Period → Valid Until → Products</p>
                        <p><strong>Products:</strong> Search → Select → Quantity → Tab (Next Row) → Enter (Notes)</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        // Clear search term to show current selection when focusing
                                        if (!locationSearchTerm && formData.location) {
                                          setLocationSearchTerm('');
                                        }
                                        
                                        // Auto-scroll to selected location within dropdown container only
                                        setTimeout(() => {
                                          const selectedLocationIndex = locations.findIndex(loc => loc._id === formData.location);
                                          if (selectedLocationIndex >= 0) {
                                            // Find the dropdown container first
                                            const dropdownContainer = document.querySelector('.dropdown-container .max-h-60');
                                            const selectedElement = document.querySelector(`[data-location-index="${selectedLocationIndex}"]`);
                                            
                                            if (selectedElement && dropdownContainer) {
                                              // Calculate scroll position relative to dropdown container
                                              const containerRect = dropdownContainer.getBoundingClientRect();
                                              const elementRect = selectedElement.getBoundingClientRect();
                                              const containerScrollTop = dropdownContainer.scrollTop;
                                              
                                              // Calculate the position of element relative to container
                                              const elementTop = elementRect.top - containerRect.top + containerScrollTop;
                                              const elementHeight = elementRect.height;
                                              const containerHeight = containerRect.height;
                                              
                                              // Calculate ideal scroll position to center the element
                                              const idealScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2);
                                              
                                              // Smooth scroll within the dropdown container only
                                              dropdownContainer.scrollTo({
                                                top: Math.max(0, idealScrollTop),
                                                behavior: 'smooth'
                                              });
                                            }
                                          }
                                        }, 150);
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
                                        {(() => {
                                            const filteredLocations = locations.filter(location =>
                                                location.name.toLowerCase().includes(locationSearchTerm.toLowerCase()) ||
                                                location.type.toLowerCase().includes(locationSearchTerm.toLowerCase())
                                            );

                                            return (
                                                <>
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

                                                    {filteredLocations.map((location, index) => (
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

                                                    {filteredLocations.length === 0 && locationSearchTerm && (
                                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                            No locations found for "{locationSearchTerm}"
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
                                        {(() => {
                                            const filteredCustomers = customers.filter(customer =>
                                                customer.type === 'customer' && (
                                                    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                                    customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                                    customer.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                                                )
                                            );

                                            return (
                                                <>
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
                                                                billToAddress: { address: '', state: '', district: '', pincode: '' },
                                                                shipToAddress: { address: '', state: '', district: '', pincode: '' }
                                                            });
                                                            setShowCustomerDropdown(false);
                                                            setCustomerSearchTerm('');
                                                            setAddresses([]);
                                                        }}
                                                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.customer?._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                                    >
                                                        Select customer
                                                    </button>

                                                    {filteredCustomers.map((customer, index) => (
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
                                                                    },
                                                                    billToAddress: { address: '', state: '', district: '', pincode: '' },
                                                                    shipToAddress: { address: '', state: '', district: '', pincode: '' }
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

                                                    {filteredCustomers.length === 0 && customerSearchTerm && (
                                                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                            No customers found for "{customerSearchTerm}"
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
                                    value={getAddressLabel((formData.billToAddress as any)?.addressId?.toString())}
                                    readOnly
                                    disabled={!formData.customer?._id}
                                    onFocus={() => {
                                        if (formData.customer?._id) {
                                            setShowBillToAddressDropdown(true);
                                            setHighlightedBillToAddressIndex(-1);
                                        }
                                    }}
                                    onKeyDown={handleBillToAddressKeyDown}
                                    placeholder={!formData.customer?._id ? "Select customer first" : "Press ↓ to open address list"}
                                    data-field="bill-to-address"
                                    className={`w-full px-3 py-2 pr-10 border rounded-lg transition-colors ${!formData.customer?._id
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
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
                                            Select bill to address
                                        </button>

                                        {addresses.map((address, index) => (
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
                                                            ...(address.id && { addressId: address.id })
                                                        } as any
                                                    });
                                                    setShowBillToAddressDropdown(false);
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
                                                </div>
                                            </button>
                                        ))}

                                        {addresses.length === 0 && (
                                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                No addresses found for this customer
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ship To Address *
                            </label>
                            <div className="relative dropdown-container">
                                <input
                                    type="text"
                                    value={getAddressLabel((formData.shipToAddress as any)?.addressId?.toString())}
                                    readOnly
                                    disabled={!formData.customer?._id}
                                    onFocus={() => {
                                        if (formData.customer?._id) {
                                            setShowShipToAddressDropdown(true);
                                            setHighlightedShipToAddressIndex(-1);
                                        }
                                    }}
                                    onKeyDown={handleShipToAddressKeyDown}
                                    placeholder={!formData.customer?._id ? "Select customer first" : "Press ↓ to open address list"}
                                    data-field="ship-to-address"
                                    className={`w-full px-3 py-2 pr-10 border rounded-lg transition-colors ${!formData.customer?._id
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                                        }`}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
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
                                            Select ship to address
                                        </button>

                                        {addresses.map((address, index) => (
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
                                                            ...(address.id && { addressId: address.id })
                                                        } as any
                                                    });
                                                    setShowShipToAddressDropdown(false);
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
                                                </div>
                                            </button>
                                        ))}

                                        {addresses.length === 0 && (
                                            <div className="px-3 py-2 text-sm text-gray-500 text-center">
                                                No addresses found for this customer
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
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
                                value={formData.validityPeriod || 30}
                                onChange={(e) => {
                                    const validityPeriod = parseInt(e.target.value) || 30;
                                    const issueDate = formData.issueDate || new Date();
                                    const validUntil = new Date(issueDate);
                                    validUntil.setDate(validUntil.getDate() + validityPeriod);

                                    setFormData({
                                        ...formData,
                                        validityPeriod,
                                        validUntil
                                    });
                                }}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
                                        e.preventDefault();
                                        // Move to Valid Until field
                                        setTimeout(() => {
                                            const validUntilInput = document.querySelector('[data-field="valid-until"]') as HTMLInputElement;
                                            if (validUntilInput) validUntilInput.focus();
                                        }, 50);
                                    } else if (e.key === 'Tab' && e.shiftKey) {
                                        e.preventDefault();
                                        // Move back to customer address field
                                        setTimeout(() => {
                                            const addressInput = document.querySelector('[data-field="customer-address"]') as HTMLInputElement;
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
                            Assign to Engineer
                        </label>
                        <div className="relative dropdown-container">
                            <input
                                type="text"
                                value={engineerSearchTerm || getEngineerLabel(formData.assignedEngineer || '')}
                                onChange={(e) => {
                                    setEngineerSearchTerm(e.target.value);
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
                                        if (showEngineerDropdown && highlightedEngineerIndex >= 0) {
                                            const selectedEngineer = fieldOperators[highlightedEngineerIndex];
                                            setFormData({ ...formData, assignedEngineer: selectedEngineer._id });
                                            setShowEngineerDropdown(false);
                                            setEngineerSearchTerm('');
                                            setHighlightedEngineerIndex(-1);
                                        } else if (showEngineerDropdown && fieldOperators.length === 1) {
                                            const selectedEngineer = fieldOperators[0];
                                            setFormData({ ...formData, assignedEngineer: selectedEngineer._id });
                                            setShowEngineerDropdown(false);
                                            setEngineerSearchTerm('');
                                            setHighlightedEngineerIndex(-1);
                                        }
                                    } else if (e.key === 'Escape') {
                                        setShowEngineerDropdown(false);
                                        setHighlightedEngineerIndex(-1);
                                    } else if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
                                        e.preventDefault();
                                        // Move to first product field in the list
                                        setTimeout(() => {
                                            const firstProductInput = document.querySelector(`[data-row="0"][data-field="product"]`) as HTMLInputElement;
                                            if (firstProductInput) firstProductInput.focus();
                                        }, 50);
                                    } else if (e.key === 'Tab' && e.shiftKey) {
                                        e.preventDefault();
                                        // Move back to Valid Until field
                                        setTimeout(() => {
                                            const validUntilInput = document.querySelector('[data-field="valid-until"]') as HTMLInputElement;
                                            if (validUntilInput) validUntilInput.focus();
                                        }, 50);
                                    }
                                }}
                                autoComplete="off"
                                placeholder="Search engineer or press ↓ to open"
                                data-field="engineer"
                                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showEngineerDropdown ? 'rotate-180' : ''}`} />
                    </div>
                            {showEngineerDropdown && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                                    {(() => {
                                        const filteredEngineers = fieldOperators.filter(engineer =>
                                            engineer.name.toLowerCase().includes(engineerSearchTerm.toLowerCase()) ||
                                            (engineer.firstName && engineer.firstName.toLowerCase().includes(engineerSearchTerm.toLowerCase())) ||
                                            (engineer.lastName && engineer.lastName.toLowerCase().includes(engineerSearchTerm.toLowerCase())) ||
                                            (engineer.email && engineer.email.toLowerCase().includes(engineerSearchTerm.toLowerCase()))
                                        );

                                        return (
                                            <>
                                                <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                                                </div>

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
                </div>



                    {/* Excel-Style Items Table */}
                    <div>
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

                        {/* Desktop Table View */}
                        <div className="hidden lg:block border border-gray-300 rounded-lg bg-white shadow-sm overflow-x-auto">
                            {/* Table Header */}
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
                            <div className="divide-y divide-gray-200 min-w-[1200px]">
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

                                        {/* Product Code - Enhanced with portal dropdown */}
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
                                                    // Reset highlighted index when typing
                                                    setHighlightedProductIndex({
                                                        ...highlightedProductIndex,
                                                        [index]: -1
                                                    });
                                                }}
                                                onFocus={(e) => {
                                                    if (!productSearchTerms[index] && !item.product) {
                                                        updateProductSearchTerm(index, '');
                                                    }
                                                    setShowProductDropdowns({
                                                        ...showProductDropdowns,
                                                        [index]: true
                                                    });

                                                    // Calculate dropdown position for portal
                                                    calculateDropdownPosition(e.target, index);

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
                                                        setDropdownPosition(null);
                                                    }, 200);
                                                }}
                                                onKeyDown={(e) => handleProductKeyDown(e, index)}
                                                data-row={index}
                                                data-field="product"
                                                className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                                                placeholder="Type to search..."
                                                autoComplete="off"
                                            />
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
                                                
                                                {/* Stock Badge in Product Name Field */}
                                                {formData.location && item.product && productStockCache[item.product] && (
                                                    <div className="flex-shrink-0">
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
                                                    </div>
                                                )}
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
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    let newQuantity = parseFloat(e.target.value) || 1;
                                                    
                                                    // If product is selected and out of stock, force quantity to 0
                                                    if (item.product && formData.location && productStockCache[item.product]) {
                                                        const stockInfo = productStockCache[item.product];
                                                        if (stockInfo.available === 0) {
                                                            if (newQuantity > 0) {
                                                                toast.error('This product is out of stock. Quantity set to 0.', { duration: 2000 });
                                                            }
                                                            newQuantity = 0;
                                                        } else if (newQuantity > stockInfo.available) {
                                                            // Allow increasing up to available stock, but show warning if exceeding
                                                            newQuantity = stockInfo.available;
                                                            toast.error(`Maximum available quantity is ${stockInfo.available}`, { duration: 2000 });
                                                        }
                                                    }

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
                                                step="0.01"
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
                            <div className="bg-gray-50 border-t border-gray-200 p-3 text-center min-w-[1200px]">
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
                            </div>
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
                                                            if (formData.location && Object.keys(productStockCache).length === 0) {
                                                                loadAllStockForLocation();
                                                            }
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
                                                            if (item.product && formData.location && productStockCache[item.product]) {
                                                                const stockInfo = productStockCache[item.product];
                                                                if (stockInfo.available === 0) {
                                                                    if (newQuantity > 0) {
                                                                        toast.error('This product is out of stock. Quantity set to 0.', { duration: 2000 });
                                                                    }
                                                                    newQuantity = 0;
                                                                } else if (newQuantity > stockInfo.available) {
                                                                    newQuantity = stockInfo.available;
                                                                    toast.error(`Maximum available quantity is ${stockInfo.available}`, { duration: 2000 });
                                                                }
                                                            }
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

                    {/* Notes and Terms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                        console.log('QuotationForm: Overall discount changed to:', value);
                                        setFormData(prev => {
                                            const calculationResult = calculateQuotationTotals(prev.items || [], value);
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
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Overall Discount:</span>
                                <span className="font-medium text-green-600">-{formData.overallDiscount || 0}% (-₹{formData.overallDiscountAmount?.toFixed(2) || '0.00'})</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-3">
                                    <span>Grand Total:</span>
                                    <span className="text-blue-600">₹{formData.grandTotal?.toFixed(2) || '0.00'}</span>
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