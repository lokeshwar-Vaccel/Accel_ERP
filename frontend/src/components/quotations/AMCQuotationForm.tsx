import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
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
    Trash2
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
    dgRatingKVA: number;
    typeOfVisits: string;
    qty: number;
    amcCostPerDG: number;
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
    refOfQuote: string;
    paymentTermsText: string;
    validityText: string;
    amcPeriodFrom: Date;
    amcPeriodTo: Date;
    gstIncluded: boolean;
}

const AMCQuotationForm: React.FC = () => {
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
            dgRatingKVA: 0,
            typeOfVisits: '',
            qty: 1,
            amcCostPerDG: 0,
            totalAMCAmountPerDG: 0,
            gst18: 0,
            totalAMCCost: 0
        }],
        sparesItems: [],
        selectedCustomerDG: null,
        refOfQuote: '',
        paymentTermsText: '',
        validityText: '',
        amcPeriodFrom: new Date(),
        amcPeriodTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        gstIncluded: true
    });
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState<string | undefined>(undefined);
    const [productSearchTerms, setProductSearchTerms] = useState<{ [key: number]: string }>({});
    const [uomSearchTerms, setUomSearchTerms] = useState<{ [key: number]: string }>({});
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [locationSearchTerm, setLocationSearchTerm] = useState('');
    const [customerDGDetails, setCustomerDGDetails] = useState<any[]>([]);
    const [showDGDropdown, setShowDGDropdown] = useState(false);
    const [dgSearchTerm, setDgSearchTerm] = useState('');
    const [showEngineerDropdown, setShowEngineerDropdown] = useState(false);
    const [engineerSearchTerm, setEngineerSearchTerm] = useState<string | undefined>(undefined);
    const [sparesProductSearchTerms, setSparesProductSearchTerms] = useState<Record<number, string>>({});
    const [showSparesProductDropdowns, setShowSparesProductDropdowns] = useState<Record<number, boolean>>({});

    // Load data on component mount
    useEffect(() => {
        loadData();
    }, []);

    // Load quotation data if in edit mode
    useEffect(() => {
        if (isEditMode && quotationFromState) {
            setQuotationData(quotationFromState);
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
                const stockArray = stockResp.success && stockData && Array.isArray((stockData as any).stock)
                    ? (stockData as any).stock
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
                    const prodResp = await apiClient.products.getAll({ limit: 10000, page: 1 });
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
        const safeQty = (item.qty as unknown as number) || 0;
        const safeCost = (item.amcCostPerDG as unknown as number) || 0;
        const totalAMCAmountPerDG = safeQty * safeCost;
        const gst18 = totalAMCAmountPerDG * 0.18;
        const totalAMCCost = totalAMCAmountPerDG + gst18;

        updatedItems[index] = {
            ...item,
            totalAMCAmountPerDG,
            gst18,
            totalAMCCost
        };

        setQuotationData(prev => ({
            ...prev,
            offerItems: updatedItems
        }));
    };

    const addOfferItem = () => {
        const newItem: AMCOfferItem = {
            make: '',
            engineSlNo: '',
            dgRatingKVA: 0,
            typeOfVisits: '',
            qty: 1,
            amcCostPerDG: 0,
            totalAMCAmountPerDG: 0,
            gst18: 0,
            totalAMCCost: 0
        };

        setQuotationData(prev => ({
            ...prev,
            offerItems: [...prev.offerItems, newItem]
        }));
    };

    const removeOfferItem = (index: number) => {
        setQuotationData(prev => ({
            ...prev,
            offerItems: prev.offerItems.filter((_, i) => i !== index)
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
            // Keep description manual - do not override from product
            description: old.description || '',
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
        setSparesProductSearchTerms(prev => ({ ...prev, [index]: '' }));
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

    const handleSubmit = async () => {
        try {
            // Validate form
            const validationResult = validateQuotationData(quotationData as Partial<QuotationData>);
            if (!validationResult.isValid) {
                setValidationErrors(validationResult.errors);
                toast.error('Please fix the validation errors');
                return;
            }

            setSubmitting(true);

            // Sanitize data
            const sanitizedData = sanitizeQuotationData(quotationData);

            // Add AMC-specific fields
            const amcQuotationData = {
                ...sanitizedData,
                quotationType: 'amc',
                ...quotationData
            };

            if (isEditMode && quotationFromState?._id) {
                await apiClient.quotations.update(quotationFromState._id, amcQuotationData);
                toast.success('AMC quotation updated successfully');
            } else {
                await apiClient.quotations.create(amcQuotationData);
                toast.success('AMC quotation created successfully');
            }

            // Navigation will be handled by the parent component
        } catch (error: any) {
            console.error('Error submitting quotation:', error);
            toast.error(error.response?.data?.message || 'Failed to submit quotation');
        } finally {
            setSubmitting(false);
        }
    };

    const getFilteredCustomers = () => {
        const term = (customerSearchTerm || '').toLowerCase();
        return customers.filter(customer =>
            (customer.name && customer.name.toLowerCase().includes(term)) ||
            (customer.email && customer.email.toLowerCase().includes(term))
        );
    };

    const getFilteredProducts = (searchTerm: string = '') => {
        return products.filter(product =>
            (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (product.partNo && product.partNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    };

    const getFilteredLocations = () => {
        return locations.filter(location =>
            (location.name && location.name.toLowerCase().includes(locationSearchTerm.toLowerCase())) ||
            (location.address && location.address.toLowerCase().includes(locationSearchTerm.toLowerCase()))
        );
    };

    const getFilteredDGDetails = () => {
        return customerDGDetails.filter(dg => {
            const engineSerial = dg.engineSerialNumber || dg.engineSlNo || '';
            const make = dg.dgMake || dg.make || '';
            const model = dg.dgModel || dg.model || '';
            
            return (
                (engineSerial && engineSerial.toLowerCase().includes(dgSearchTerm.toLowerCase())) ||
                (make && make.toLowerCase().includes(dgSearchTerm.toLowerCase())) ||
                (model && model.toLowerCase().includes(dgSearchTerm.toLowerCase()))
            );
        });
    };

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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white">
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
                <h1 className="text-2xl font-bold text-gray-900 mb-2">ANNUAL MAINTENANCE (AMC) OFFER</h1>
                <div className="flex justify-center items-center space-x-4">
                    <div className="flex items-center">
                        <select
                            value={quotationData.amcType}
                            onChange={(e) => handleInputChange('amcType', e.target.value as 'AMC' | 'CAMC')}
                            className="px-4 py-2 border border-blue-300 rounded-full bg-blue-50 text-blue-700 font-medium"
                        >
                            <option value="AMC">AMC</option>
                            <option value="CAMC">CAMC</option>
                        </select>
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
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
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
                                                            }
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
                                    value={quotationData.selectedCustomerDG ? `Offer for AMC / CAMC for your DG set capacity - ${quotationData.selectedCustomerDG.dgMake || quotationData.selectedCustomerDG.make || 'N/A'} ${quotationData.selectedCustomerDG.dgModel || quotationData.selectedCustomerDG.model || 'N/A'} (${quotationData.selectedCustomerDG.dgRatingKVA || quotationData.selectedCustomerDG.kva || quotationData.selectedCustomerDG.rating || 'N/A'} KVA)` : dgSearchTerm}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setDgSearchTerm(value);
                                        setShowDGDropdown(true);
                                        
                                        // If user clears the input, clear the selected DG
                                        if (!value) {
                                            setQuotationData(prev => ({
                                                ...prev,
                                                selectedCustomerDG: null
                                            }));
                                        }
                                    }}
                                    onFocus={() => setShowDGDropdown(true)}
                                    onBlur={() => {
                                        setTimeout(() => setShowDGDropdown(false), 200);
                                    }}
                                    placeholder="Drop down from customer DG list"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                {showDGDropdown && customerDGDetails.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                        {getFilteredDGDetails().length > 0 ? (
                                            getFilteredDGDetails().map((dg) => (
                                                <div
                                                    key={dg._id}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setQuotationData(prev => ({
                                                            ...prev,
                                                            selectedCustomerDG: dg,
                                                            offerItems: prev.offerItems.map((item, index) => 
                                                                index === 0 ? {
                                                                    ...item,
                                                                    make: dg.dgMake || dg.make || '',
                                                                    engineSlNo: dg.engineSerialNumber || dg.engineSlNo || '',
                                                                    dgRatingKVA: dg.dgRatingKVA || dg.kva || dg.rating || 0
                                                                } : item
                                                            )
                                                        }));
                                                        setDgSearchTerm('');
                                                        setShowDGDropdown(false);
                                                    }}
                                                >
                                                    <div className="font-medium">{dg.dgMake || dg.make || 'N/A'} {dg.dgModel || dg.model || 'N/A'}</div>
                                                    <div className="text-sm text-gray-500">Engine: {dg.engineSerialNumber || dg.engineSlNo || 'N/A'} | {dg.dgRatingKVA || dg.kva || dg.rating || 'N/A'} KVA</div>
                                </div>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-gray-500 text-sm">
                                                No DG sets found
                                            </div>
                                        )}
                                    </div>
                                )}
                                </div>
                            </div>

                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-20">Create Date</span>
                            <div className="flex-1">
                                <input
                                    type="date"
                                    value={quotationData.issueDate ? new Date(quotationData.issueDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
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
                <div className="overflow-x-auto">
                    <table className="w-full border border-gray-300">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="border border-gray-300 px-4 py-2 text-left">Make</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Engine Sl.No</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">DG Rating in KVA</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Type Of Visits</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Qty</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">AMC/CAMC cost per DG</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Total AMC Amount per DG</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">GST @ 18%</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Total AMC Cost</th>
                                <th className="border border-gray-300 px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotationData.offerItems.map((item, index) => (
                                <tr key={index}>
                                    <td className="border border-gray-300 px-4 py-2">
                                    <input
                                            type="text"
                                            value={item.make}
                                            onChange={(e) => handleOfferItemChange(index, 'make', e.target.value)}
                                            className="w-full border-none focus:outline-none"
                                            placeholder="Select from customer DG list"
                                        />
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                    <input
                                            type="text"
                                            value={item.engineSlNo}
                                            onChange={(e) => handleOfferItemChange(index, 'engineSlNo', e.target.value)}
                                            className="w-full border-none focus:outline-none"
                                            placeholder="Select from customer DG list"
                                        />
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                <input
                                    type="number"
                                            value={item.dgRatingKVA ?? ''}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                handleOfferItemChange(index, 'dgRatingKVA', v === '' ? undefined : parseFloat(v));
                                            }}
                                            className="w-full border-none focus:outline-none"
                                            placeholder="Auto Update"
                                        />
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                <input
                                    type="text"
                                            value={item.typeOfVisits}
                                            onChange={(e) => handleOfferItemChange(index, 'typeOfVisits', e.target.value)}
                                            className="w-full border-none focus:outline-none"
                                            placeholder="Manual Typing"
                                        />
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                <input
                                            type="number"
                                            value={item.qty ?? ''}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                handleOfferItemChange(index, 'qty', v === '' ? undefined : parseInt(v));
                                            }}
                                            className="w-full border-none focus:outline-none"
                                            placeholder="Select Number"
                                        />
                                    </td>
                                    <td className="border border-gray-300 px-4 py-2">
                                <input
                                            type="number"
                                            value={item.amcCostPerDG ?? ''}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                handleOfferItemChange(index, 'amcCostPerDG', v === '' ? undefined : parseFloat(v));
                                            }}
                                            className="w-full border-none focus:outline-none"
                                            placeholder="Manual Entry"
                                        />
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
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Manual Entry"
                                            />
                                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-24">AMC Start Date:</span>
                                            <input
                                type="date"
                                value={quotationData.amcPeriodFrom ? new Date(quotationData.amcPeriodFrom).toISOString().split('T')[0] : ''}
                                onChange={(e) => handleInputChange('amcPeriodFrom', new Date(e.target.value))}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
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
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Manual Entry"
                                            />
                                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="font-medium w-24">AMC End Date:</span>
                                            <input
                                type="date"
                                value={quotationData.amcPeriodTo ? new Date(quotationData.amcPeriodTo).toISOString().split('T')[0] : ''}
                                onChange={(e) => handleInputChange('amcPeriodTo', new Date(e.target.value))}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                        </div>
                                        </div>

                {/* GST Section */}
                <div className="mt-4">
                    <div className="flex items-center space-x-4">
                        <span className="font-medium w-24">GST:</span>
                        <select
                            value={quotationData.gstIncluded ? 'included' : 'not_included'}
                            onChange={(e) => handleInputChange('gstIncluded', e.target.value === 'included')}
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
                    <div className="overflow-x-auto">
                        <table className="w-full border border-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Sr.No</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Part No</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">HSN Code</th>
                                    <th className="border border-gray-300 px-4 py-2 text-left">Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quotationData.sparesItems.map((item, index) => (
                                    <tr key={index}>
                                        <td className="border border-gray-300 px-4 py-2 text-center">{index + 1}</td>
                                        {/* Part No (searchable) */}
                                        <td className="border border-gray-300 px-4 py-2">
                                            <div className="relative">
                                                <input
                                                    type="text"
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
                                                    className="w-full border-none focus:outline-none"
                                                />
                                                {showSparesProductDropdowns[index] && (
                                                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden">
                                                        <div className="px-3 py-2 text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
                                                            {getFilteredProducts(sparesProductSearchTerms[index] || '').length} products found
                                                        </div>
                                                        <div className="max-h-72 overflow-auto">
                                                            <div
                                                                className={`px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer border-b border-gray-100 ${!item.productId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    handleSpareItemChange(index, 'productId', '');
                                                                    handleSpareItemChange(index, 'partNo', '');
                                                                    handleSpareItemChange(index, 'hsnCode', '');
                                                                    handleSpareItemChange(index, 'unitPrice', 0);
                                                                    handleSpareItemChange(index, 'gstRate', 0);
                                                                    handleSpareItemChange(index, 'availableQuantity', 0 as any);
                                                                    setSparesProductSearchTerms(prev => ({ ...prev, [index]: '' }));
                                                                    setShowSparesProductDropdowns(prev => ({ ...prev, [index]: false }));
                                                                }}
                                                            >
                                                                Select product
                                                            </div>
                                                            {getFilteredProducts(sparesProductSearchTerms[index] || '').map((p) => (
                                                                <div
                                                                    key={p._id}
                                                                    className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                                                                    onMouseDown={(e) => { e.preventDefault(); handleSelectSpareProduct(index, p); }}
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div>
                                                                            <div className="text-sm font-semibold text-gray-900">Part No:{p.partNo ? ` ${p.partNo}` : ' -'}</div>
                                                                            <div className="text-xs text-gray-600 mt-0.5">Product Name: {p.name || '-'}</div>
                                                                            <div className="text-xs text-gray-500">Category: {p.category || '-'}</div>
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
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
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
                                                className="w-full border-none focus:outline-none"
                                            />
                                        </td>
                                        {/* HSN Code */}
                                        <td className="border border-gray-300 px-4 py-2">
                                            <input
                                                type="text"
                                                value={item.hsnCode || ''}
                                                onChange={(e) => handleSpareItemChange(index, 'hsnCode', e.target.value)}
                                                className="w-full border-none focus:outline-none"
                                            />
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
                                                className="w-full border-none focus:outline-none text-right"
                                            />
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
        </div>
    );
};

export default AMCQuotationForm;
