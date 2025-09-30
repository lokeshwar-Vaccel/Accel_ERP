import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
    Plus,
    Search,
    X,
    ChevronDown,
    Save,
    Eye,
    Edit,
    FileText,
    CheckCircle,
    QrCode,
    Settings,
    Calendar,
    Clock,
    DollarSign,
    Trash2,
    ArrowLeft
} from 'lucide-react';
import { Button } from '../ui/Botton';
import { apiClient } from '../../utils/api';
import { RootState } from '../../store';
import toast from 'react-hot-toast';
import {
    calculateQuotationTotals,
    sanitizeQuotationData,
    getDefaultQuotationData,
    getFieldErrorMessage,
    type QuotationData,
    type QuotationItem,
    type ValidationError,
    type BatteryBuyBack,
    validateQuotationData
} from '../../utils/quotationUtils';
import { numberToWords } from '../../utils';

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

interface AMCOfferItem {
    make: string;
    engineSlNo: string;
    dgRatingKVA?: number;
    typeOfVisits?: number;
    qty?: number;
    amcCostPerDG?: number;
    totalAMCAmountPerDG: number;
    gst18: number;
    totalAMCCost: number;
}

interface AMCSpareItem {
    srNo: number;
    partNo: string;
    description: string;
    hsnCode: string;
    qty: number;
    productId?: string;
    uom?: string;
    unitPrice?: number;
    gstRate?: number;
    discount?: number;
    discountedAmount?: number;
    taxAmount?: number;
    totalPrice?: number;
    availableQuantity?: number;
}

interface AMCQuotationData extends Omit<QuotationData, 'batteryBuyBack'> {
    // AMC-specific fields
    amcType: 'AMC' | 'CAMC';
    contractDuration: number; // in months
    contractStartDate: Date;
    contractEndDate: Date;
    billingCycle: 'monthly' | 'quarterly' | 'half-yearly' | 'yearly';
    numberOfVisits: number;
    numberOfOilServices: number;
    responseTime: number; // in hours
    coverageArea: string;
    emergencyContactHours: string;
    exclusions: string[];
    performanceMetrics: {
        avgResponseTime: number;
        customerSatisfaction: number;
        issueResolutionRate: number;
    };
    warrantyTerms: string;
    paymentTerms: string;
    renewalTerms: string;
    discountPercentage: number;
    // Override batteryBuyBack to allow null
    batteryBuyBack: BatteryBuyBack | null;
    // New AMC Offer specific fields
    offerItems: AMCOfferItem[];
    sparesItems: AMCSpareItem[];
    selectedCustomerDG: any;
    subject?: string;
    refOfQuote: string;
    paymentTermsText: string;
    validityText: string;
    amcPeriodFrom: Date;
    amcPeriodTo: Date;
    gstIncluded: boolean;
    selectedAddressId?: string;
}

const AMCQuotationForm: React.FC = () => {
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

    // Form state
    const [quotationData, setQuotationData] = useState<AMCQuotationData>({
        ...getDefaultQuotationData() as QuotationData,
        amcType: 'AMC',
        contractDuration: 12,
        contractStartDate: new Date(),
        contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        billingCycle: 'yearly',
        numberOfVisits: 12,
        numberOfOilServices: 4,
        responseTime: 24,
        coverageArea: '',
        emergencyContactHours: '24/7',
        exclusions: [],
        performanceMetrics: {
            avgResponseTime: 4,
            customerSatisfaction: 95,
            issueResolutionRate: 98
        },
        warrantyTerms: '',
        paymentTerms: '',
        renewalTerms: '',
        discountPercentage: 0,
        // New AMC Offer specific fields
        offerItems: [{
            make: '',
            engineSlNo: '',
            dgRatingKVA: undefined,
            typeOfVisits: undefined,
            qty: 1,
            amcCostPerDG: undefined,
            totalAMCAmountPerDG: 0,
            gst18: 0,
            totalAMCCost: 0
        }],
        sparesItems: [],
        selectedCustomerDG: null,
        subject: '',
        refOfQuote: '',
        paymentTermsText: '',
        validityText: '',
        amcPeriodFrom: new Date(),
        amcPeriodTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        gstIncluded: true,
        selectedAddressId: undefined
    });
    console.log("quotationData:",quotationData);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState<string | undefined>(undefined);
    const [productSearchTerms, setProductSearchTerms] = useState<{ [key: number]: string }>({});
    const [uomSearchTerms, setUomSearchTerms] = useState<{ [key: number]: string }>({});
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [locationSearchTerm, setLocationSearchTerm] = useState('');
    const [customerDGDetails, setCustomerDGDetails] = useState<any[]>([]);
    const [dgRowSearchTerms, setDgRowSearchTerms] = useState<Record<number, string>>({});
    const [showDGRowDropdowns, setShowDGRowDropdowns] = useState<Record<number, boolean>>({});
    const [dgDropdownPosition, setDgDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
    const [activeDGRowIndex, setActiveDGRowIndex] = useState<number | null>(null);
    const [activeDGInputEl, setActiveDGInputEl] = useState<HTMLInputElement | null>(null);
    const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);
    const [engineerSearchTerm, setEngineerSearchTerm] = useState<string | undefined>(undefined);
    const [sparesProductSearchTerms, setSparesProductSearchTerms] = useState<Record<number, string>>({});
    const [showSparesProductDropdowns, setShowSparesProductDropdowns] = useState<Record<number, boolean>>({});
    const [showAddressDropdown, setShowAddressDropdown] = useState(false);
    const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

    // Load data on component mount
    useEffect(() => {
        loadData();
    }, []);

    // Close address dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Element;
            if (!target.closest('.address-dropdown-container')) {
                setShowAddressDropdown(false);
            }
        };

        if (showAddressDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showAddressDropdown]);

    // Helper function to safely convert date strings to Date objects
    const safeDateConversion = (dateValue: any): Date => {
        if (!dateValue) return new Date();
        if (dateValue instanceof Date) return dateValue;
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? new Date() : date;
    };

    // Load quotation data if in edit mode
    useEffect(() => {
        if (isEditMode && quotationFromState) {
            // Safely convert date fields
            const processedData = {
                ...quotationFromState,
                issueDate: safeDateConversion(quotationFromState.issueDate),
                contractStartDate: safeDateConversion(quotationFromState.contractStartDate),
                contractEndDate: safeDateConversion(quotationFromState.contractEndDate),
                amcPeriodFrom: safeDateConversion(quotationFromState.amcPeriodFrom),
                amcPeriodTo: safeDateConversion(quotationFromState.amcPeriodTo)
            };
            setQuotationData(processedData);
        }
    }, [isEditMode, quotationFromState]);

    const loadData = async () => {
        try {
            setLoading(true);
            await Promise.all([
                fetchCustomers(),
                fetchProducts(),
                fetchLocations(),
                fetchFieldOperators(),
                fetchGeneralSettings()
            ]);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await apiClient.customers.getAllForDropdown({ type: 'customer' });
            let customersData: Customer[] = [];
            if (response.success && response.data) {
                // Handle different response structures
                const customersArray = Array.isArray(response.data) ? response.data :
                    ((response.data as any).customers ? (response.data as any).customers : []);

                customersData = customersArray.map((customer: any) => ({
                    _id: customer._id || '',
                    name: customer.name || '',
                    email: customer.email || '',
                    phone: customer.phone || '',
                    address: customer.address || '',
                    type: customer.type || 'customer',
                    addresses: customer.addresses || []
                }));
            }
            setCustomers(customersData);
        } catch (error) {
            console.error('Error fetching customers:', error);
            setCustomers([]); // Set empty array on error
        }
    };

    const fetchProducts = async () => {
        try {
            let productsData: Product[] = [];

            // Try stock endpoint first (gives availability)
            try {
                const stockResp = await apiClient.stock.getStock({ limit: 10000, page: 1 });
                const stockData = (stockResp as any)?.data;
                const stockArray = stockResp.success && stockData && Array.isArray((stockData as any).stockLevels)
                    ? (stockData as any).stockLevels
                    : [];
                if (stockArray.length > 0) {
                    productsData = stockArray.map((item: any) => ({
                        _id: item?.product?._id,
                        name: item?.product?.name,
                        price: item?.product?.price || 0,
                        category: item?.product?.category || '',
                        brand: item?.product?.brand || '',
                        gst: item?.product?.gst,
                        partNo: item?.product?.partNo,
                        hsnNumber: item?.product?.hsnNumber,
                        uom: item?.product?.uom,
                        availableQuantity: item?.availableQuantity || 0
                    }));
                }
            } catch (e) {
                // ignore, fallback below
            }

            // Fallback to products list if stock is empty or failed
            if (productsData.length === 0) {
                try {
                    // Try getForDropdown first (simpler response)
                    let prodResp;
                    try {
                        prodResp = await apiClient.products.getForDropdown();
                    } catch (dropdownError) {
                        prodResp = await apiClient.products.getAll({ limit: 10000, page: 1 });
                    }
                    
                    const data = (prodResp as any)?.data;
                    const productsArray = Array.isArray(data)
                        ? data
                        : Array.isArray((data as any)?.products)
                            ? (data as any).products
                            : [];
                    productsData = productsArray.map((p: any) => ({
                        _id: p?._id,
                        name: p?.name,
                        price: p?.price || 0,
                        category: p?.category || '',
                        brand: p?.brand || '',
                        gst: typeof p?.gst === 'number' ? p.gst : undefined,
                        partNo: p?.partNo,
                        hsnNumber: p?.hsnNumber,
                        uom: p?.uom,
                        availableQuantity: typeof p?.availableQuantity === 'number' ? p.availableQuantity : 0
                    }));
                } catch (e) {
                    // still no products
                }
            }

            // If still no products, create some mock data for testing
            if (productsData.length === 0) {
                productsData = [
                    {
                        _id: 'mock1',
                        name: 'Engine Oil Filter',
                        price: 150,
                        category: 'Filters',
                        brand: 'Mahindra',
                        gst: 18,
                        partNo: 'FIL001',
                        hsnNumber: '84212300',
                        uom: 'nos',
                        availableQuantity: 50
                    },
                    {
                        _id: 'mock2',
                        name: 'Air Filter Element',
                        price: 200,
                        category: 'Filters',
                        brand: 'Mahindra',
                        gst: 18,
                        partNo: 'AIR002',
                        hsnNumber: '84212300',
                        uom: 'nos',
                        availableQuantity: 25
                    },
                    {
                        _id: 'mock3',
                        name: 'Fuel Filter',
                        price: 180,
                        category: 'Filters',
                        brand: 'Mahindra',
                        gst: 18,
                        partNo: 'FUEL003',
                        hsnNumber: '84212300',
                        uom: 'nos',
                        availableQuantity: 30
                    }
                ];
            }

            setProducts(productsData);
        } catch (error) {
            console.error('Error fetching products:', error);
            setProducts([]);
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await apiClient.stock.getLocations();
            let locationsData: StockLocationData[] = [];
            if (response.success && response.data) {
                // Handle different response structures
                const locationsArray = Array.isArray(response.data) ? response.data :
                    ((response.data as any).locations ? (response.data as any).locations : []);

                locationsData = locationsArray.map((location: any) => ({
                    _id: location._id,
                    name: location.name,
                    address: location.address,
                    type: location.type,
                    contactPerson: location.contactPerson,
                    phone: location.phone,
                    isActive: location.isActive
                }));
            }
            setLocations(locationsData);
        } catch (error) {
            console.error('Error fetching locations:', error);
            setLocations([]); // Set empty array on error
        }
    };

    const fetchFieldOperators = async () => {
        try {
            const response = await apiClient.users.getFieldEngineers();
            if (response.success && response.data.fieldEngineers) {
                const fieldEngineers = response.data.fieldEngineers.map((engineer: any) => ({
                    _id: engineer._id,
                    firstName: engineer.firstName,
                    lastName: engineer.lastName,
                    email: engineer.email,
                    phone: engineer.phone
                }));
                setFieldOperators(fieldEngineers);
            }
        } catch (error) {
            console.error('Error fetching field operators:', error);
        }
    };

    const fetchCustomerDGDetails = async (customerId: string) => {
        try {
            const response = await apiClient.services.getCustomerEngines(customerId);
            if (response.success && response.data && response.data.engines) {
                console.log('DG Details Response:', response.data.engines);
                setCustomerDGDetails(response.data.engines);
            }
        } catch (error) {
            console.error('Error fetching customer DG details:', error);
            setCustomerDGDetails([]);
        }
    };

    const fetchGeneralSettings = async () => {
        try {
            const response = await apiClient.generalSettings.getAll();
            if (response.success && response.data && response.data.companies && response.data.companies.length > 0) {
                const companySettings = response.data.companies[0];
                setGeneralSettings(companySettings);
            }
        } catch (error) {
            console.error('Error fetching general settings:', error);
        }
    };

    const handleInputChange = (field: keyof AMCQuotationData, value: any) => {
        setQuotationData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear validation error for this field
        setValidationErrors(prev => prev.filter(error => error.field !== field));
    };

    const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
        const updatedItems = [...quotationData.items];
        updatedItems[index] = {
            ...updatedItems[index],
            [field]: value
        };

        // Recalculate totals for this item
        const item = updatedItems[index];
        const discountedAmount = (item.quantity * item.unitPrice) - ((item.discount || 0) * item.quantity * item.unitPrice / 100);
        const taxAmount = discountedAmount * (item.taxRate || 0) / 100;
        const totalPrice = discountedAmount + taxAmount;

        updatedItems[index] = {
            ...item,
            discountedAmount,
            taxAmount,
            totalPrice
        };

        setQuotationData(prev => {
            const totals = calculateQuotationTotals(updatedItems, prev.serviceCharges, prev.batteryBuyBack, prev.overallDiscount || 0);
            return {
                ...prev,
                ...totals
            };
        });
    };

    const addItem = () => {
        const newItem: QuotationItem = {
            product: '',
            description: '',
            hsnCode: '',
            hsnNumber: '',
            partNo: '',
            quantity: 1,
            uom: 'nos',
            unitPrice: 0,
            discount: 0,
            discountedAmount: 0,
            taxRate: 18,
            taxAmount: 0,
            totalPrice: 0
        };

        setQuotationData(prev => ({
            ...prev,
            items: [...prev.items, newItem]
        }));
    };

    const removeItem = (index: number) => {
        const updatedItems = quotationData.items.filter((_, i) => i !== index);
        setQuotationData(prev => {
            const totals = calculateQuotationTotals(updatedItems, prev.serviceCharges, prev.batteryBuyBack, prev.overallDiscount || 0);
            return {
                ...prev,
                ...totals
            };
        });
    };

    // AMC Offer Item handlers
    const handleOfferItemChange = (index: number, field: keyof AMCOfferItem, value: any) => {
        const updatedItems = [...quotationData.offerItems];
        updatedItems[index] = {
            ...updatedItems[index],
            [field]: value
        };

        // Recalculate totals for this item
        const item = updatedItems[index];
        const safeQty = (item.qty !== undefined && item.qty !== null) ? Number(item.qty) : 0;
        const safeCost = (item.amcCostPerDG !== undefined && item.amcCostPerDG !== null) ? Number(item.amcCostPerDG) : 0;
        const totalAMCAmountPerDG = safeQty * safeCost;
        const gst18 = totalAMCAmountPerDG * 0.18;
        const totalAMCCost = totalAMCAmountPerDG + gst18;

        updatedItems[index] = {
            ...item,
            totalAMCAmountPerDG,
            gst18,
            totalAMCCost
        };

        // Calculate AMC totals
        const amcTotals = calculateAMCTotals(updatedItems, quotationData.gstIncluded);

        setQuotationData(prev => ({
            ...prev,
            offerItems: updatedItems,
            subtotal: amcTotals.subtotal,
            totalTax: amcTotals.totalTax,
            grandTotal: amcTotals.grandTotal
        }));
    };

    // Calculate AMC totals from offer items
    const calculateAMCTotals = (items: AMCOfferItem[], gstIncluded: boolean = true) => {
        let subtotal = 0;
        let totalTax = 0;
        let grandTotal = 0;

        items.forEach(item => {
            const qty = (item.qty !== undefined && item.qty !== null) ? Number(item.qty) : 0;
            const costPerDG = (item.amcCostPerDG !== undefined && item.amcCostPerDG !== null) ? Number(item.amcCostPerDG) : 0;
            const itemSubtotal = qty * costPerDG;
            
            let itemTax = 0;
            let itemTotal = itemSubtotal;
            
            if (gstIncluded) {
                // GST is included in the cost per DG
                itemTax = itemSubtotal * 0.18; // 18% GST
                itemTotal = itemSubtotal + itemTax;
            } else {
                // GST is not included, so the cost per DG is the final amount
                itemTotal = itemSubtotal;
            }

            subtotal += itemSubtotal;
            totalTax += itemTax;
            grandTotal += itemTotal;
        });

        return {
            subtotal: Math.round(subtotal * 100) / 100,
            totalTax: Math.round(totalTax * 100) / 100,
            grandTotal: Math.round(grandTotal * 100) / 100
        };
    };

    const addOfferItem = () => {
        const newItem: AMCOfferItem = {
            make: '',
            engineSlNo: '',
            dgRatingKVA: undefined,
            typeOfVisits: undefined,
            qty: undefined,
            amcCostPerDG: undefined,
            totalAMCAmountPerDG: 0,
            gst18: 0,
            totalAMCCost: 0
        };

        const updatedItems = [...quotationData.offerItems, newItem];
        const amcTotals = calculateAMCTotals(updatedItems, quotationData.gstIncluded);

        setQuotationData(prev => ({
            ...prev,
            offerItems: updatedItems,
            subtotal: amcTotals.subtotal,
            totalTax: amcTotals.totalTax,
            grandTotal: amcTotals.grandTotal
        }));
    };

    const removeOfferItem = (index: number) => {
        const updatedItems = quotationData.offerItems.filter((_, i) => i !== index);
        const amcTotals = calculateAMCTotals(updatedItems, quotationData.gstIncluded);

        setQuotationData(prev => ({
            ...prev,
            offerItems: updatedItems,
            subtotal: amcTotals.subtotal,
            totalTax: amcTotals.totalTax,
            grandTotal: amcTotals.grandTotal
        }));
    };

    // AMC Spare Item handlers
    const handleSpareItemChange = (index: number, field: keyof AMCSpareItem, value: any) => {
        const updatedItems = [...quotationData.sparesItems];
        updatedItems[index] = {
            ...updatedItems[index],
            [field]: value
        };

        setQuotationData(prev => ({
            ...prev,
            sparesItems: updatedItems
        }));
    };

    const handleSelectSpareProduct = (index: number, product: Product) => {
        const updatedItems = [...quotationData.sparesItems];
        const old = updatedItems[index] || {} as AMCSpareItem;
        const unitPrice = product.price || 0;
        const qty = old.qty || 1;
        const discount = old.discount || 0;
        const gstRate = typeof product.gst === 'number' ? product.gst : 0;
        const itemSubtotal = qty * unitPrice;
        const discountAmount = (discount / 100) * itemSubtotal;
        const discountedAmount = itemSubtotal - discountAmount;
        const taxAmount = (gstRate / 100) * discountedAmount;
        const totalPrice = discountedAmount + taxAmount;

        updatedItems[index] = {
            ...old,
            productId: product._id,
            partNo: product.partNo || '',
            // Auto-fill description from product name if not already set
            description: old.description || product.name || '',
            hsnCode: product.hsnNumber || '',
            uom: product.uom || 'nos',
            availableQuantity: product.availableQuantity || 0,
            unitPrice,
            gstRate,
            discountedAmount: Math.round(discountAmount * 100) / 100,
            taxAmount: Math.round(taxAmount * 100) / 100,
            totalPrice: Math.round(totalPrice * 100) / 100
        };
        setQuotationData(prev => ({
            ...prev,
            sparesItems: updatedItems
        }));
        setSparesProductSearchTerms(prev => ({ ...prev, [index]: product.partNo || product.name || '' }));
        setShowSparesProductDropdowns(prev => ({ ...prev, [index]: false }));
    };

    const recalcSpareRow = (row: AMCSpareItem): AMCSpareItem => {
        const qty = row.qty || 0;
        const unitPrice = row.unitPrice || 0;
        const discount = row.discount || 0;
        const gstRate = row.gstRate || 0;
        const itemSubtotal = qty * unitPrice;
        const discountAmount = (discount / 100) * itemSubtotal;
        const discountedAmount = itemSubtotal - discountAmount;
        const taxAmount = (gstRate / 100) * discountedAmount;
        const totalPrice = discountedAmount + taxAmount;
        return {
            ...row,
            discountedAmount: Math.round(discountAmount * 100) / 100,
            taxAmount: Math.round(taxAmount * 100) / 100,
            totalPrice: Math.round(totalPrice * 100) / 100
        };
    };

    const addSpareItem = () => {
        const newItem: AMCSpareItem = {
            srNo: quotationData.sparesItems.length + 1,
            partNo: '',
            description: '',
            hsnCode: '',
            qty: 1
        };

        setQuotationData(prev => ({
            ...prev,
            sparesItems: [...prev.sparesItems, newItem]
        }));
    };

    const removeSpareItem = (index: number) => {
        setQuotationData(prev => ({
            ...prev,
            sparesItems: prev.sparesItems.filter((_, i) => i !== index)
        }));
    };

    // AMC-specific validation function
    const validateAMCQuotationData = (data: AMCQuotationData): ValidationError[] => {
        const errors: ValidationError[] = [];

        // Customer validation
        if (!data.customer || !data.customer.name?.trim()) {
            errors.push({ field: 'customer.name', message: 'Customer name is required' });
        }

        // AMC Type validation
        if (!data.amcType || !['AMC', 'CAMC'].includes(data.amcType)) {
            errors.push({ field: 'amcType', message: 'AMC type must be either AMC or CAMC' });
        }

        // Contract duration validation
        if (!data.contractDuration || data.contractDuration <= 0) {
            errors.push({ field: 'contractDuration', message: 'Contract duration must be greater than 0 months' });
        }

        // Contract dates validation
        if (!data.contractStartDate) {
            errors.push({ field: 'contractStartDate', message: 'Contract start date is required' });
        }
        if (!data.contractEndDate) {
            errors.push({ field: 'contractEndDate', message: 'Contract end date is required' });
        }
        if (data.contractStartDate && data.contractEndDate && data.contractStartDate >= data.contractEndDate) {
            errors.push({ field: 'contractEndDate', message: 'Contract end date must be after start date' });
        }

        // AMC Period validation
        if (!data.amcPeriodFrom) {
            errors.push({ field: 'amcPeriodFrom', message: 'AMC period start date is required' });
        }
        if (!data.amcPeriodTo) {
            errors.push({ field: 'amcPeriodTo', message: 'AMC period end date is required' });
        }
        if (data.amcPeriodFrom && data.amcPeriodTo) {
            const startDate = new Date(data.amcPeriodFrom);
            const endDate = new Date(data.amcPeriodTo);
            
            // Check if dates are valid
            if (isNaN(startDate.getTime())) {
                errors.push({ field: 'amcPeriodFrom', message: 'AMC period start date is invalid' });
            }
            if (isNaN(endDate.getTime())) {
                errors.push({ field: 'amcPeriodTo', message: 'AMC period end date is invalid' });
            }
            
            // Check if end date is after start date
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate >= endDate) {
                errors.push({ field: 'amcPeriodTo', message: 'AMC period end date must be after start date' });
            }
            
            // Check if the period is reasonable (not more than 5 years)
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate > startDate) {
                const diffInYears = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
                if (diffInYears > 5) {
                    errors.push({ field: 'amcPeriodTo', message: 'AMC period cannot exceed 5 years' });
                }
            }
        }

        // Billing cycle validation
        if (!data.billingCycle || !['monthly', 'quarterly', 'half-yearly', 'yearly'].includes(data.billingCycle)) {
            errors.push({ field: 'billingCycle', message: 'Valid billing cycle is required' });
        }

        // Number of visits validation
        if (!data.numberOfVisits || data.numberOfVisits <= 0) {
            errors.push({ field: 'numberOfVisits', message: 'Number of visits must be greater than 0' });
        }

        // Number of oil services validation
        if (!data.numberOfOilServices || data.numberOfOilServices <= 0) {
            errors.push({ field: 'numberOfOilServices', message: 'Number of oil services must be greater than 0' });
        }

        // Response time validation
        if (!data.responseTime || data.responseTime <= 0) {
            errors.push({ field: 'responseTime', message: 'Response time must be greater than 0 hours' });
        }

        // Coverage area validation - Made optional
        // if (!data.coverageArea?.trim()) {
        //     errors.push({ field: 'coverageArea', message: 'Coverage area is required' });
        // }

        // Emergency contact hours validation
        if (!data.emergencyContactHours?.trim()) {
            errors.push({ field: 'emergencyContactHours', message: 'Emergency contact hours is required' });
        }

        // Offer items validation
        if (!data.offerItems || data.offerItems.length === 0) {
            errors.push({ field: 'offerItems', message: 'At least one DG set offer item is required' });
        } else {
            data.offerItems.forEach((item, index) => {
                if (!item.make?.trim()) {
                    errors.push({ field: `offerItems[${index}].make`, message: 'DG make is required' });
                }
                if (!item.engineSlNo?.trim()) {
                    errors.push({ field: `offerItems[${index}].engineSlNo`, message: 'Engine serial number is required' });
                }
                if (item.dgRatingKVA === undefined || item.dgRatingKVA === null || item.dgRatingKVA <= 0) {
                    errors.push({ field: `offerItems[${index}].dgRatingKVA`, message: 'DG rating must be greater than 0 KVA' });
                }
                if (item.typeOfVisits === undefined || item.typeOfVisits === null || item.typeOfVisits <= 0) {
                    errors.push({ field: `offerItems[${index}].typeOfVisits`, message: 'No of visits must be greater than 0' });
                }
                if (item.qty === undefined || item.qty === null || item.qty <= 0) {
                    errors.push({ field: `offerItems[${index}].qty`, message: 'Quantity must be greater than 0' });
                }
                if (item.amcCostPerDG === undefined || item.amcCostPerDG === null || item.amcCostPerDG <= 0) {
                    errors.push({ field: `offerItems[${index}].amcCostPerDG`, message: 'AMC cost per DG must be greater than 0' });
                }
            });
        }

        // CAMC spares validation (only if AMC type is CAMC)
        if (data.amcType === 'CAMC') {
            if (!data.sparesItems || data.sparesItems.length === 0) {
                errors.push({ field: 'sparesItems', message: 'At least one spare item is required for CAMC contract' });
            } else {
                data.sparesItems.forEach((item, index) => {
                    if (!item.partNo?.trim()) {
                        errors.push({ field: `sparesItems[${index}].partNo`, message: 'Part number is required' });
                    }
                    if (!item.description?.trim()) {
                        errors.push({ field: `sparesItems[${index}].description`, message: 'Description is required' });
                    }
                    if (!item.hsnCode?.trim()) {
                        errors.push({ field: `sparesItems[${index}].hsnCode`, message: 'HSN code is required' });
                    }
                    if (!item.qty || item.qty <= 0) {
                        errors.push({ field: `sparesItems[${index}].qty`, message: 'Quantity must be greater than 0' });
                    }
                });
            }
        }

        // Payment terms validation
        if (!data.paymentTermsText?.trim()) {
            errors.push({ field: 'paymentTermsText', message: 'Payment terms are required' });
        }

        // Validity validation
        if (!data.validityText?.trim()) {
            errors.push({ field: 'validityText', message: 'Validity terms are required' });
        }

        return errors;
    };

    const handleSubmit = async () => {
        try {
            // Validate AMC-specific data
            const amcValidationErrors = validateAMCQuotationData(quotationData);

            // Also validate basic quotation data
            const basicValidationResult = validateQuotationData(quotationData as Partial<QuotationData>);

            // Combine all validation errors
            const allErrors = [...amcValidationErrors, ...basicValidationResult.errors];

            // AMC-specific: ignore these generic quotation validations
            const ignoredFieldsForAMC = new Set([
                'billToAddress.address',
                'shipToAddress.address',
                'grandTotal'
            ]);
            const filteredErrors = allErrors.filter(err => !ignoredFieldsForAMC.has(err.field));

            if (filteredErrors.length > 0) {
                setValidationErrors(filteredErrors);
                toast.error(`Please fix ${filteredErrors.length} validation error(s)`);
                return;
            }

            setSubmitting(true);

            // Calculate AMC totals from offer items
            const amcTotals = calculateAMCTotals(quotationData.offerItems, quotationData.gstIncluded);

            // Sanitize data
            const sanitizedData = sanitizeQuotationData(quotationData);

            // Add AMC-specific fields with calculated totals
            const amcQuotationData = {
                ...sanitizedData,
                quotationType: 'amc',
                // AMC-specific fields
                amcType: quotationData.amcType,
                contractDuration: quotationData.contractDuration,
                contractStartDate: quotationData.contractStartDate,
                contractEndDate: quotationData.contractEndDate,
                billingCycle: quotationData.billingCycle,
                numberOfVisits: quotationData.numberOfVisits,
                numberOfOilServices: quotationData.numberOfOilServices,
                responseTime: quotationData.responseTime,
                coverageArea: quotationData.coverageArea,
                emergencyContactHours: quotationData.emergencyContactHours,
                exclusions: quotationData.exclusions,
                performanceMetrics: quotationData.performanceMetrics,
                warrantyTerms: quotationData.warrantyTerms,
                paymentTerms: quotationData.paymentTerms,
                renewalTerms: quotationData.renewalTerms,
                discountPercentage: quotationData.discountPercentage,
                offerItems: quotationData.offerItems,
                sparesItems: quotationData.sparesItems,
                selectedCustomerDG: quotationData.selectedCustomerDG,
                subject: quotationData.subject,
                refOfQuote: quotationData.refOfQuote,
                paymentTermsText: quotationData.paymentTermsText,
                validityText: quotationData.validityText,
                amcPeriodFrom: quotationData.amcPeriodFrom,
                amcPeriodTo: quotationData.amcPeriodTo,
                gstIncluded: quotationData.gstIncluded,
                selectedAddressId: quotationData.selectedAddressId,
                // Calculated totals
                subtotal: amcTotals.subtotal,
                totalTax: amcTotals.totalTax,
                grandTotal: amcTotals.grandTotal,
                totalDiscount: 0, // AMC doesn't use item-level discounts
                overallDiscount: 0,
                overallDiscountAmount: 0,
                roundOff: 0
            };

            console.log('Submitting AMC Quotation Data:', amcQuotationData);

            if (isEditMode && quotationFromState?._id) {
                await apiClient.amcQuotations.update(quotationFromState._id, amcQuotationData);
                toast.success('AMC quotation updated successfully');

            } else {
                await apiClient.amcQuotations.create(amcQuotationData);
                toast.success('AMC quotation created successfully');
            }
            navigate('/amc-quotations');
        } catch (error: any) {
            console.error('Error submitting quotation:', error);
            toast.error(error.response?.data?.message || 'Failed to submit quotation');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate('/amc-quotations');
    };

    const handleBack = () => {
        navigate('/amc-quotations');
    };

    const getFilteredCustomers = () => {
        const term = (customerSearchTerm || '').toLowerCase();
        return customers.filter(customer =>
            (customer.name && customer.name.toLowerCase().includes(term)) ||
            (customer.email && customer.email.toLowerCase().includes(term))
        );
    };

    const getFilteredProducts = (searchTerm: string = '') => {
        if (!searchTerm.trim()) {
            // Show all products when no search term
            return products;
        }
        
        const term = searchTerm.toLowerCase();
        return products.filter(product =>
            (product.name && product.name.toLowerCase().includes(term)) ||
            (product.partNo && product.partNo.toLowerCase().includes(term)) ||
            (product.brand && product.brand.toLowerCase().includes(term)) ||
            (product.category && product.category.toLowerCase().includes(term)) ||
            (product.hsnNumber && product.hsnNumber.toLowerCase().includes(term))
        );
    };

    const getFilteredLocations = () => {
        return locations.filter(location =>
            (location.name && location.name.toLowerCase().includes(locationSearchTerm.toLowerCase())) ||
            (location.address && location.address.toLowerCase().includes(locationSearchTerm.toLowerCase()))
        );
    };

    const getFilteredDGDetails = () => {
        return customerDGDetails;
    };

    const filterDGs = (term: string) => {
        const lowerTerm = (term || '').toLowerCase();
        return customerDGDetails.filter(dg => {
            const engineSerial = (dg.engineSerialNumber || dg.engineSlNo || dg.engineSerialNo || dg.engineNo || dg.engine || dg.serialNumber || dg.serialNo || dg.serial || '').toString();
            const make = dg.dgMake || dg.make || '';
            const model = dg.dgModel || dg.model || '';
            return (
                (engineSerial && engineSerial.toLowerCase().includes(lowerTerm)) ||
                (make && make.toLowerCase().includes(lowerTerm)) ||
                (model && model.toLowerCase().includes(lowerTerm))
            );
        });
    };

    const getDGEngineSerial = (dg: any): string => {
        const candidates = [
            dg?.engineSlNo,
            dg?.engineSerialNumber,
            dg?.engineSerialNo,
            dg?.engineNo,
            dg?.engine_serial_no,
            dg?.engine,
            dg?.serialNumber,
            dg?.serialNo,
            dg?.serial
        ];
        const val = candidates.find(v => v !== undefined && v !== null && String(v).trim() !== '');
        return val !== undefined && val !== null ? String(val) : '';
    };

    const getDGKVA = (dg: any): number => {
        const candidates = [dg?.dgRatingKVA, dg?.kva, dg?.rating, dg?.dgRating];
        const val = candidates.find(v => typeof v === 'number' && !isNaN(v));
        return typeof val === 'number' ? val : 0;
    };

    // Reposition DG dropdown on scroll/resize to follow the active input
    useEffect(() => {
        if (!activeDGInputEl || activeDGRowIndex === null || !showDGRowDropdowns[activeDGRowIndex]) {
            return;
        }
        const updatePosition = () => {
            const rect = activeDGInputEl.getBoundingClientRect();
            setDgDropdownPosition({ top: rect.bottom, left: rect.left, width: rect.width });
        };
        updatePosition();
        const opts: any = { capture: true, passive: true };
        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [activeDGInputEl, activeDGRowIndex, showDGRowDropdowns]);

    const getFilteredEngineers = () => {
        const term = (engineerSearchTerm || '').toLowerCase();
        return fieldOperators.filter((engineer: any) =>
            (engineer.firstName && engineer.firstName.toLowerCase().includes(term)) ||
            (engineer.lastName && engineer.lastName.toLowerCase().includes(term)) ||
            (engineer.email && engineer.email.toLowerCase().includes(term)) ||
            (engineer.name && engineer.name.toLowerCase().includes(term)) ||
            (engineer.label && engineer.label.toLowerCase().includes(term))
        );
    };

    const getFilteredAddresses = () => {
        if (!quotationData.customer._id) return [];
        
        const customer = customers.find(c => c._id === quotationData.customer._id);
        if (!customer || !customer.addresses) return [];
        
        return customer.addresses;
    };

    const getSelectedAddress = () => {
        const addresses = getFilteredAddresses();
        if (!quotationData.selectedAddressId) {
            // Return primary address if no address is selected
            return addresses.find(addr => addr.isPrimary) || addresses[0] || null;
        }
        return addresses.find(addr => addr.id.toString() === quotationData.selectedAddressId) || null;
    };

    // Helper function to get error message for a specific field
    const getFieldError = (field: string): string | undefined => {
        const error = validationErrors.find(err => err.field === field);
        return error?.message;
    };

    // Helper function to check if a field has an error
    const hasFieldError = (field: string): boolean => {
        return validationErrors.some(err => err.field === field);
    };

    // Helper function to get error class for styling
    const getErrorClass = (field: string): string => {
        return hasFieldError(field) ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white">
            {/* Header with Back Button */}
            <div className="mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {isEditMode ? 'Edit AMC Quotation' : 'Create AMC Quotation'}
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                {isEditMode ? 'Update existing AMC quotation details' : 'Fill in the details to create a new AMC quotation'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                    <Button
                            onClick={handleBack}
                            variant="outline"
                            className="flex items-center space-x-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Back</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Validation Errors Summary */}
            {validationErrors.length > 0 && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-center mb-2">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                Please fix the following {validationErrors.length} error(s):
                            </h3>
                        </div>
                    </div>
                    <div className="mt-2 text-sm text-red-700">
                        <ul className="list-disc list-inside space-y-1">
                            {validationErrors.map((error, index) => (
                                <li key={index}>{error.message}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Header with Logos */}
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-red-200">
                <div className="flex items-center">
                    <div className="text-red-600 font-bold text-2xl">powerol</div>
                    <div className="text-gray-600 text-sm ml-2">by Mahindra</div>
                </div>
                <div className="flex items-center">
                    <div className="text-red-600 font-semibold">Sun Power Services</div>
                </div>
            </div>

            {/* Document Title */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">ANNUAL MAINTENANCE ({quotationData.amcType}) OFFER</h1>
                <div className="flex justify-center items-center space-x-4">
                    <div className="flex items-center">
                        <select
                            value={quotationData.amcType}
                            onChange={(e) => {
                                const newAmcType = e.target.value as 'AMC' | 'CAMC';
                                handleInputChange('amcType', newAmcType);
                                
                                // If switching to CAMC and no spares items exist, add one
                                if (newAmcType === 'CAMC' && quotationData.sparesItems.length === 0) {
                                    addSpareItem();
                                }
                            }}
                            className={`px-4 py-2 border rounded-full font-medium ${hasFieldError('amcType') ? 'border-red-500 bg-red-50 text-red-700' : 'border-blue-300 bg-blue-50 text-blue-700'}`}
                        >
                            <option value="AMC">AMC</option>
                            <option value="CAMC">CAMC</option>
                        </select>
                        {getFieldError('amcType') && (
                            <p className="mt-1 text-sm text-red-600 text-center">{getFieldError('amcType')}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Customer and Subject Section */}
            <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-20">To, M/S</span>
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={customerSearchTerm !== undefined ? customerSearchTerm : (quotationData.customer.name || '')}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setCustomerSearchTerm(value);
                                        setShowCustomerDropdown(true);

                                        // If user clears the input, clear the selected customer
                                        if (!value) {
                                            setQuotationData(prev => ({
                                                ...prev,
                                                customer: {
                                                    _id: '',
                                                    name: '',
                                                    email: '',
                                                    phone: '',
                                                    pan: ''
                                                }
                                            }));
                                        }
                                    }}
                                    onFocus={() => {
                                        // Initialize search term with selected name to allow editing/backspace
                                        if (customerSearchTerm === undefined) {
                                            setCustomerSearchTerm(quotationData.customer.name || '');
                                        }
                                        setShowCustomerDropdown(true);
                                    }}
                                    onBlur={() => {
                                        // Delay closing to allow click on dropdown items
                                        setTimeout(() => setShowCustomerDropdown(false), 200);
                                    }}
                                    placeholder="From customer list Drop Down"
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${getErrorClass('customer.name')}`}
                                />
                                {getFieldError('customer.name') && (
                                    <p className="mt-1 text-sm text-red-600">{getFieldError('customer.name')}</p>
                                )}
                                {showCustomerDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                        {getFilteredCustomers().length > 0 ? (
                                            getFilteredCustomers().map((customer) => (
                                                <div
                                                    key={customer._id}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault(); // Prevent input blur
                                                        setQuotationData(prev => ({
                                                            ...prev,
                                                            customer: {
                                                                _id: customer._id,
                                                                name: customer.name,
                                                                email: customer.email,
                                                                phone: customer.phone,
                                                                pan: (customer as any).pan || ''
                                                            },
                                                            // Auto-select primary address when customer is selected
                                                            selectedAddressId: customer.addresses?.find((addr: any) => addr.isPrimary)?.id?.toString() || customer.addresses?.[0]?.id?.toString() || undefined
                                                        }));
                                                        // Reset search term to use selected value rendering
                                                        setCustomerSearchTerm(undefined);
                                                        setShowCustomerDropdown(false);
                                                        fetchCustomerDGDetails(customer._id);
                                                    }}
                                                >
                                                    <div className="font-medium">{customer.name}</div>
                                                    <div className="text-sm text-gray-500">{customer.email}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-gray-500 text-sm">
                                                No customers found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-20">Address</span>
                            <div className="relative flex-1 address-dropdown-container">
                                <div
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 cursor-pointer ${getErrorClass('selectedAddressId')}`}
                                    onClick={() => {
                                        if (quotationData.customer._id) {
                                            setShowAddressDropdown(!showAddressDropdown);
                                        }
                                    }}
                                >
                                    {(() => {
                                        const selectedAddress = getSelectedAddress();
                                        return selectedAddress ? (
                                            <div>
                                                <div className="font-medium">{selectedAddress.address}</div>
                                                <div className="text-sm text-gray-500">
                                                    {selectedAddress.district}, {selectedAddress.state} - {selectedAddress.pincode}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-gray-500">
                                                {quotationData.customer._id ? 'Select address' : 'Select customer first'}
                                            </span>
                                        );
                                    })()}
                                </div>
                                {getFieldError('selectedAddressId') && (
                                    <p className="mt-1 text-sm text-red-600">{getFieldError('selectedAddressId')}</p>
                                )}
                                {showAddressDropdown && quotationData.customer._id && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                        {getFilteredAddresses().length > 0 ? (
                                            getFilteredAddresses().map((address) => (
                                                <div
                                                    key={address.id}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => {
                                                        setQuotationData(prev => ({
                                                            ...prev,
                                                            selectedAddressId: address.id.toString()
                                                        }));
                                                        setShowAddressDropdown(false);
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <div className="font-medium">{address.address}</div>
                                                            <div className="text-sm text-gray-500">
                                                                {address.district}, {address.state} - {address.pincode}
                                                            </div>
                                                        </div>
                                                        {address.isPrimary && (
                                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                                Primary
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-gray-500 text-sm">
                                                No addresses found for this customer
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-20">Ref of quote</span>
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={engineerSearchTerm !== undefined ? engineerSearchTerm : (quotationData.refOfQuote || '')}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setEngineerSearchTerm(value);
                                        setShowEngineerDropdown(true);

                                        // If user clears the input, clear the selected engineer
                                        if (!value) {
                                            setQuotationData(prev => ({
                                                ...prev,
                                                refOfQuote: ''
                                            }));
                                        }
                                    }}
                                    onFocus={() => {
                                        if (engineerSearchTerm === undefined) {
                                            setEngineerSearchTerm(quotationData.refOfQuote || '');
                                        }
                                        setShowEngineerDropdown(true);
                                    }}
                                    onBlur={() => {
                                        setTimeout(() => setShowEngineerDropdown(false), 200);
                                    }}
                                    placeholder="Drop Down Engineer name"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {showEngineerDropdown && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                        {getFilteredEngineers().length > 0 ? (
                                            getFilteredEngineers().map((engineer) => (
                                                <div
                                                    key={engineer._id}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setQuotationData(prev => ({
                                                            ...prev,
                                                            refOfQuote: `${engineer.firstName} ${engineer.lastName}`
                                                        }));
                                                        setEngineerSearchTerm(undefined);
                                                        setShowEngineerDropdown(false);
                                                    }}
                                                >
                                                    <div className="font-medium">{engineer.firstName} {engineer.lastName}</div>
                                                    <div className="text-sm text-gray-500">{engineer.email}</div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-gray-500 text-sm">
                                                No engineers found
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-20">Subject</span>
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={quotationData.subject || ''}
                                    onChange={(e) => handleInputChange('subject' as any, e.target.value)}
                                    placeholder="Enter subject manually"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-20">Create Date</span>
                            <div className="flex-1">
                                <input
                                    type="date"
                                    value={quotationData.issueDate && !isNaN(new Date(quotationData.issueDate).getTime()) ? new Date(quotationData.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                                    onChange={(e) => handleInputChange('issueDate', new Date(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Offer Details Table */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Offer Details</h3>
                <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full border border-gray-300 overflow-visible">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border border-gray-300 px-4 py-2 text-left">Make</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Engine Sl.No</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">DG Rating in KVA</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">No Of Visits</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Qty</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">{quotationData.amcType} cost per DG</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Total {quotationData.amcType} Amount per DG</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">GST @ 18%</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Total {quotationData.amcType} Cost</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="overflow-visible">
                            {quotationData.offerItems.map((item, index) => (
                                <tr key={index}>
                                    <td className="border border-gray-300 px-4 py-2 relative overflow-visible z-10">
                                        <div className="relative z-50">
                                            <input
                                                type="text"
                                                value={dgRowSearchTerms[index] ?? item.make}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setDgRowSearchTerms(prev => ({ ...prev, [index]: value }));
                                                    setShowDGRowDropdowns(prev => ({ ...prev, [index]: true }));
                                                    handleOfferItemChange(index, 'make', value);
                                                }}
                                                onFocus={(e) => {
                                                    const rect = e.target.getBoundingClientRect();
                                                    setActiveDGInputEl(e.target as HTMLInputElement);
                                                    setDgDropdownPosition({
                                                        top: rect.bottom,
                                                        left: rect.left,
                                                        width: rect.width
                                                    });
                                                    setActiveDGRowIndex(index);
                                                    setDgRowSearchTerms(prev => ({ ...prev, [index]: item.make || '' }));
                                                    setShowDGRowDropdowns(prev => ({ ...prev, [index]: true }));
                                                }}
                                                onBlur={() => setTimeout(() => {
                                                    setShowDGRowDropdowns(prev => ({ ...prev, [index]: false }));
                                                    setDgDropdownPosition(null);
                                                    setActiveDGRowIndex(null);
                                                    setActiveDGInputEl(null);
                                                }, 200)}
                                                className={`w-full border-none focus:outline-none ${hasFieldError(`offerItems[${index}].make`) ? 'bg-red-50' : ''}`}
                                                placeholder="Search/select from customer DG list or type manually"
                                            />
                                            {getFieldError(`offerItems[${index}].make`) && (
                                                <p className="text-xs text-red-600 mt-1">{getFieldError(`offerItems[${index}].make`)}</p>
                                            )}
                                        </div>
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        <input
                                            type="text"
                                            value={item.engineSlNo}
                                            onChange={(e) => handleOfferItemChange(index, 'engineSlNo', e.target.value)}
                                            className={`w-full border-none focus:outline-none ${hasFieldError(`offerItems[${index}].engineSlNo`) ? 'bg-red-50' : ''}`}
                                            placeholder="Select from customer DG list"
                                        />
                                        {getFieldError(`offerItems[${index}].engineSlNo`) && (
                                            <p className="text-xs text-red-600 mt-1">{getFieldError(`offerItems[${index}].engineSlNo`)}</p>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        <input
                                            type="number"
                                            value={item.dgRatingKVA ?? ''}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                handleOfferItemChange(index, 'dgRatingKVA', v === '' ? undefined : parseFloat(v));
                                            }}
                                            className={`w-full border-none focus:outline-none ${hasFieldError(`offerItems[${index}].dgRatingKVA`) ? 'bg-red-50' : ''}`}
                                            placeholder="Auto Update"
                                        />
                                        {getFieldError(`offerItems[${index}].dgRatingKVA`) && (
                                            <p className="text-xs text-red-600 mt-1">{getFieldError(`offerItems[${index}].dgRatingKVA`)}</p>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        <input
                                            type="number"
                                            value={item.typeOfVisits || ''}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                handleOfferItemChange(index, 'typeOfVisits', v === '' ? undefined : parseInt(v));
                                            }}
                                            className={`w-full border-none focus:outline-none ${hasFieldError(`offerItems[${index}].typeOfVisits`) ? 'bg-red-50' : ''}`}
                                            placeholder="Enter number of visits"
                                        />
                                        {getFieldError(`offerItems[${index}].typeOfVisits`) && (
                                            <p className="text-xs text-red-600 mt-1">{getFieldError(`offerItems[${index}].typeOfVisits`)}</p>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        <input
                                            type="number"
                                            value={item.qty ?? ''}
                                            min={1}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                handleOfferItemChange(index, 'qty', v === '' ? undefined : parseInt(v));
                                            }}
                                            className={`w-full border-none focus:outline-none ${hasFieldError(`offerItems[${index}].qty`) ? 'bg-red-50' : ''}`}
                                            placeholder="Select Number"
                                        />
                                        {getFieldError(`offerItems[${index}].qty`) && (
                                            <p className="text-xs text-red-600 mt-1">{getFieldError(`offerItems[${index}].qty`)}</p>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        <input
                                            type="number"
                                            value={item.amcCostPerDG ?? ''}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                handleOfferItemChange(index, 'amcCostPerDG', v === '' ? undefined : parseFloat(v));
                                            }}
                                            className={`w-full border-none focus:outline-none ${hasFieldError(`offerItems[${index}].amcCostPerDG`) ? 'bg-red-50' : ''}`}
                                            placeholder="Manual Entry"
                                        />
                                        {getFieldError(`offerItems[${index}].amcCostPerDG`) && (
                                            <p className="text-xs text-red-600 mt-1">{getFieldError(`offerItems[${index}].amcCostPerDG`)}</p>
                                        )}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        <input
                                            type="number"
                                            value={item.totalAMCAmountPerDG}
                                            readOnly
                                            className="w-full border-none bg-gray-50"
                                            placeholder="Calculate"
                                        />
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        <input
                                            type="number"
                                            value={item.gst18}
                                            readOnly
                                            className="w-full border-none bg-gray-50"
                                            placeholder="Calculate"
                                        />
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        <input
                                            type="number"
                                            value={item.totalAMCCost}
                                            readOnly
                                            className="w-full border-none bg-gray-50"
                                            placeholder="Calculate"
                                        />
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                        <Button
                                            onClick={() => removeOfferItem(index)}
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4">
                    <Button
                        onClick={addOfferItem}
                        className="flex items-center space-x-2"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add DG Set</span>
                    </Button>
                </div>
            </div>

            {/* Terms & Conditions */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 underline">TERMS & CONDITIONS:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-24">PAYMENT:</span>
                            <input
                                type="text"
                                value={quotationData.paymentTermsText}
                                onChange={(e) => handleInputChange('paymentTermsText', e.target.value)}
                                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${getErrorClass('paymentTermsText')}`}
                                placeholder="Manual Entry"
                            />
                            {getFieldError('paymentTermsText') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('paymentTermsText')}</p>
                            )}
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-24">AMC Start Date:</span>
                            <input
                                type="date"
                                value={quotationData.amcPeriodFrom && !isNaN(new Date(quotationData.amcPeriodFrom).getTime()) ? new Date(quotationData.amcPeriodFrom).toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                    const newStartDate = new Date(e.target.value);
                                    handleInputChange('amcPeriodFrom', newStartDate);
                                    
                                    // If end date is before new start date, update end date to be 1 year after start date
                                    if (quotationData.amcPeriodTo && newStartDate >= quotationData.amcPeriodTo) {
                                        const newEndDate = new Date(newStartDate);
                                        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                                        handleInputChange('amcPeriodTo', newEndDate);
                                    }
                                }}
                                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${getErrorClass('amcPeriodFrom')}`}
                            />
                            {getFieldError('amcPeriodFrom') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('amcPeriodFrom')}</p>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-4">
                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-24">VALIDITY:</span>
                            <input
                                type="text"
                                value={quotationData.validityText}
                                onChange={(e) => handleInputChange('validityText', e.target.value)}
                                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${getErrorClass('validityText')}`}
                                placeholder="Manual Entry"
                            />
                            {getFieldError('validityText') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('validityText')}</p>
                            )}
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-24">AMC End Date:</span>
                            <input
                                type="date"
                                value={quotationData.amcPeriodTo && !isNaN(new Date(quotationData.amcPeriodTo).getTime()) ? new Date(quotationData.amcPeriodTo).toISOString().split('T')[0] : ''}
                                min={quotationData.amcPeriodFrom && !isNaN(new Date(quotationData.amcPeriodFrom).getTime()) ? new Date(quotationData.amcPeriodFrom).toISOString().split('T')[0] : ''}
                                onChange={(e) => {
                                    const newEndDate = new Date(e.target.value);
                                    handleInputChange('amcPeriodTo', newEndDate);
                                }}
                                className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${getErrorClass('amcPeriodTo')}`}
                            />
                            {getFieldError('amcPeriodTo') && (
                                <p className="mt-1 text-sm text-red-600">{getFieldError('amcPeriodTo')}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* GST Section */}
                <div className="mt-4">
                    <div className="flex items-center space-x-4">
                        <span className="font-medium w-24">GST:</span>
                        <select
                            value={quotationData.gstIncluded ? 'included' : 'not_included'}
                            onChange={(e) => {
                                const gstIncluded = e.target.value === 'included';
                                handleInputChange('gstIncluded', gstIncluded);
                                // Recalculate totals when GST setting changes
                                const amcTotals = calculateAMCTotals(quotationData.offerItems, gstIncluded);
                                setQuotationData(prev => ({
                                    ...prev,
                                    gstIncluded,
                                    subtotal: amcTotals.subtotal,
                                    totalTax: amcTotals.totalTax,
                                    grandTotal: amcTotals.grandTotal
                                }));
                            }}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="included">Included</option>
                            <option value="not_included">Not Included</option>
                        </select>
                    </div>
                </div>
            </div>


            {/* CAMC Spares Section */}
            {quotationData.amcType === 'CAMC' && (
                <div className="mb-6">
                    <div className="flex items-center space-x-4 mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Spares replaced in this periodical service One:</h3>
                        <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            Only for CAMC Contract
                        </div>
                    </div>
                    <div className="overflow-x-auto overflow-y-visible relative">
                        <table className="w-full border border-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Sr.No</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Part No</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">HSN Code</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Qty</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotationData.sparesItems.map((item, index) => (
                                    <tr key={index}>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{index + 1}</td>
                                        {/* Part No (searchable) */}
                                        <td className="border border-gray-300 px-4 py-2 relative">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    data-spare-index={index}
                                                    value={sparesProductSearchTerms[index] ?? item.partNo ?? ''}
                                                    onChange={(e) => {
                                                        setSparesProductSearchTerms(prev => ({ ...prev, [index]: e.target.value }));
                                                        setShowSparesProductDropdowns(prev => ({ ...prev, [index]: true }));
                                                        handleSpareItemChange(index, 'partNo', e.target.value);
                                                    }}
                                                    onFocus={() => {
                                                        // Initialize search term to empty to list all products
                                                        setSparesProductSearchTerms(prev => ({ ...prev, [index]: '' }));
                                                        setShowSparesProductDropdowns(prev => ({ ...prev, [index]: true }));
                                                    }}
                                                    onBlur={() => setTimeout(() => setShowSparesProductDropdowns(prev => ({ ...prev, [index]: false })), 200)}
                                                    placeholder="Search by part no or product name"
                                                    className={`w-full border-none focus:outline-none ${hasFieldError(`sparesItems[${index}].partNo`) ? 'bg-red-50' : ''}`}
                                                />
                                                {getFieldError(`sparesItems[${index}].partNo`) && (
                                                    <p className="text-xs text-red-600 mt-1">{getFieldError(`sparesItems[${index}].partNo`)}</p>
                                                )}
                                                {showSparesProductDropdowns[index] && createPortal(
                                                    <div className="fixed z-50 bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden" 
                                                         style={{
                                                             top: `${(document.querySelector(`input[data-spare-index="${index}"]`) as HTMLElement)?.getBoundingClientRect().bottom + window.scrollY + 4}px`,
                                                             left: `${(document.querySelector(`input[data-spare-index="${index}"]`) as HTMLElement)?.getBoundingClientRect().left + window.scrollX}px`,
                                                             width: `${(document.querySelector(`input[data-spare-index="${index}"]`) as HTMLElement)?.getBoundingClientRect().width}px`,
                                                             maxHeight: '400px'
                                                         }}>
                                                        <div className="px-3 py-2 text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
                                                            {getFilteredProducts(sparesProductSearchTerms[index] || '').length} products found
                                                            {!sparesProductSearchTerms[index]?.trim() && ' (showing all products)'}
                                                        </div>
                                                        <div className="max-h-80 overflow-auto">
                                                            <div
                                                                className={`px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!item.productId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    handleSpareItemChange(index, 'productId', '');
                                                                    handleSpareItemChange(index, 'partNo', '');
                                                                    handleSpareItemChange(index, 'description', '');
                                                                    handleSpareItemChange(index, 'hsnCode', '');
                                                                    handleSpareItemChange(index, 'unitPrice', 0);
                                                                    handleSpareItemChange(index, 'gstRate', 0);
                                                                    handleSpareItemChange(index, 'availableQuantity', 0 as any);
                                                                    setSparesProductSearchTerms(prev => ({ ...prev, [index]: '' }));
                                                                    setShowSparesProductDropdowns(prev => ({ ...prev, [index]: false }));
                                                                }}
                                                            >
                                                                <div className="flex items-center space-x-2">
                                                                    <span className="text-blue-600">✕</span>
                                                                    <span>Clear selection</span>
                                                                </div>
                                                            </div>
                                                            {getFilteredProducts(sparesProductSearchTerms[index] || '').map((p) => (
                                                                <div
                                                                    key={p._id}
                                                                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                                                                    onMouseDown={(e) => { e.preventDefault(); handleSelectSpareProduct(index, p); }}
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1">
                                                                            <div className="text-sm font-semibold text-gray-900">
                                                                                {p.partNo ? `Part No: ${p.partNo}` : 'No Part No'}
                                                                            </div>
                                                                            <div className="text-xs text-gray-600 mt-0.5">
                                                                                <strong>Name:</strong> {p.name || 'Unnamed Product'}
                                                                            </div>
                                                                            {/* <div className="text-xs text-gray-500">
                                                                                <strong>Category:</strong> {p.category || 'Uncategorized'}
                                                                            </div> */}
                                                                            {p.brand && (
                                                                                <div className="text-xs text-gray-500">
                                                                                    <strong>Brand:</strong> {p.brand}
                                                                                </div>
                                                                            )}
                                                                            <div className="mt-1 text-xs flex items-center space-x-2">
                                                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.availableQuantity && p.availableQuantity > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                                                                                    {p.availableQuantity && p.availableQuantity > 0 ? `${p.availableQuantity} in stock` : 'OUT OF STOCK'}
                                                                                </span>
                                                                                {p.hsnNumber && (
                                                                                    <span className="text-gray-500">HSN: {p.hsnNumber}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                        <div className="ml-3 text-right">
                                                                            <div className="text-green-600 font-bold text-sm">₹{(p.price || 0).toLocaleString()}</div>
                                                                            <div className="text-[10px] text-gray-500">per unit</div>
                                                                            {p.gst && (
                                                                                <div className="text-[10px] text-gray-500">GST: {p.gst}%</div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {getFilteredProducts(sparesProductSearchTerms[index] || '').length === 0 && (
                                                                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                                                                    No products found matching "{sparesProductSearchTerms[index]}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>,
                                                    document.body
                                                )}
                                            </div>
                                        </td>
                                        {/* Description (manual) */}
                                        <td className="border border-gray-300 px-4 py-2">
                                            <input
                                                type="text"
                                                value={item.description || ''}
                                                onChange={(e) => handleSpareItemChange(index, 'description', e.target.value)}
                                                placeholder="Enter description"
                                                className={`w-full border-none focus:outline-none ${hasFieldError(`sparesItems[${index}].description`) ? 'bg-red-50' : ''}`}
                                            />
                                            {getFieldError(`sparesItems[${index}].description`) && (
                                                <p className="text-xs text-red-600 mt-1">{getFieldError(`sparesItems[${index}].description`)}</p>
                                            )}
                                        </td>
                                        {/* HSN Code */}
                                        <td className="border border-gray-300 px-4 py-2">
                                            <input
                                                type="text"
                                                value={item.hsnCode || ''}
                                                onChange={(e) => handleSpareItemChange(index, 'hsnCode', e.target.value)}
                                                className={`w-full border-none focus:outline-none ${hasFieldError(`sparesItems[${index}].hsnCode`) ? 'bg-red-50' : ''}`}
                                            />
                                            {getFieldError(`sparesItems[${index}].hsnCode`) && (
                                                <p className="text-xs text-red-600 mt-1">{getFieldError(`sparesItems[${index}].hsnCode`)}</p>
                                            )}
                                        </td>
                                        {/* Qty */}
                                        <td className="border border-gray-300 px-4 py-2">
                                            <input
                                                type="number"
                                                min={0}
                                                step={1}
                                                value={item.qty || 0}
                                                onChange={(e) => {
                                                    const qty = parseFloat(e.target.value) || 0;
                                                    handleSpareItemChange(index, 'qty', qty);
                                                }}
                                                className={`w-full border-none focus:outline-none text-right ${hasFieldError(`sparesItems[${index}].qty`) ? 'bg-red-50' : ''}`}
                                            />
                                            {getFieldError(`sparesItems[${index}].qty`) && (
                                                <p className="text-xs text-red-600 mt-1">{getFieldError(`sparesItems[${index}].qty`)}</p>
                                            )}
                                        </td>
                                        {/* Actions */}
                                        <td className="border border-gray-300 px-4 py-2">
                                            <Button
                                                onClick={() => removeSpareItem(index)}
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4">
                        <Button
                            onClick={addSpareItem}
                            className="flex items-center space-x-2"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Spare Item</span>
                        </Button>
                    </div>
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                            <strong>Note:</strong> Any spares other than the above mentioned spares required for restoration of DG will be at extra cost.
                        </p>
                    </div>
                </div>
            )}

            {/* Financial Summary */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-sm text-gray-600">Subtotal</div>
                            <div className="text-lg font-semibold text-gray-900">
                                ₹{quotationData.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-gray-600">Total Tax (18%)</div>
                            <div className="text-lg font-semibold text-gray-900">
                                ₹{quotationData.totalTax?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-sm text-gray-600">Grand Total</div>
                            <div className="text-xl font-bold text-blue-600">
                                ₹{quotationData.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Closing Statement */}
            <div className="mb-6">
                <p className="text-gray-700 mb-4">
                    We trust that our offer is in line with your requirement and shall be glad to receive your valued Purchase Order.
                </p>
                <div className="text-right">
                    <p className="font-medium">Authorised Signatory</p>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center space-x-2"
                >
                    <Save className="w-4 h-4" />
                    <span>{submitting ? 'Saving...' : 'Save AMC Quotation'}</span>
                </Button>
            </div>

            {/* Portal-based DG Dropdown */}
            {dgDropdownPosition && activeDGRowIndex !== null && showDGRowDropdowns[activeDGRowIndex] && customerDGDetails.length > 0 && createPortal(
                <div
                    className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
                    style={{
                        top: dgDropdownPosition.top,
                        left: dgDropdownPosition.left,
                        width: dgDropdownPosition.width,
                        minWidth: '300px'
                    }}
                >
                    {filterDGs(dgRowSearchTerms[activeDGRowIndex] || '').length > 0 ? (
                        filterDGs(dgRowSearchTerms[activeDGRowIndex] || '').map((dg) => (
                            <div
                                key={dg._id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    const makeValue = dg.dgMake || dg.make || '';
                                    const engineValue = getDGEngineSerial(dg);
                                    const kvaValue = getDGKVA(dg);

                                    // Single atomic update to avoid race conditions
                                    setQuotationData(prev => ({
                                        ...prev,
                                        offerItems: prev.offerItems.map((item, i) =>
                                            i === (activeDGRowIndex ?? 0)
                                                ? {
                                                    ...item,
                                                    make: makeValue,
                                                    engineSlNo: engineValue,
                                                    dgRatingKVA: kvaValue
                                                }
                                                : item
                                        )
                                    }));

                                    setDgRowSearchTerms(prev => ({ ...prev, [activeDGRowIndex as number]: makeValue }));
                                    setShowDGRowDropdowns(prev => ({ ...prev, [activeDGRowIndex]: false }));
                                    setDgDropdownPosition(null);
                                    setActiveDGRowIndex(null);
                                }}
                            >
                                <div className="font-medium">{dg.dgMake || dg.make || 'N/A'} {dg.dgModel || dg.model || 'N/A'}</div>
                                <div className="text-sm text-gray-500">Engine: {getDGEngineSerial(dg) || 'N/A'} | {getDGKVA(dg) || 'N/A'} KVA</div>
                            </div>
                        ))
                    ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                            No DG sets found
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default AMCQuotationForm;
