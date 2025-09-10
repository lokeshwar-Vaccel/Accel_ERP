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
    DollarSign
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
        discountPercentage: 0
    });
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [productSearchTerms, setProductSearchTerms] = useState<{ [key: number]: string }>({});
    const [uomSearchTerms, setUomSearchTerms] = useState<{ [key: number]: string }>({});
    const [showLocationDropdown, setShowLocationDropdown] = useState(false);
    const [locationSearchTerm, setLocationSearchTerm] = useState('');

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
                customersData = response.data.map((customer: any) => ({
                    _id: customer._id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    address: customer.address || '',
                    type: customer.type || 'customer',
                    addresses: customer.addresses || []
                }));
            }
            setCustomers(customersData);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchProducts = async () => {
        try {
            const response = await apiClient.stock.getStock({ limit: 10000, page: 1 });
            const responseData = response.data as any;
            let productsData: Product[] = [];
            if (response.success && responseData && responseData.stock) {
                productsData = responseData.stock.map((item: any) => ({
                    _id: item.product._id,
                    name: item.product.name,
                    price: item.product.price || 0,
                    category: item.product.category || '',
                    brand: item.product.brand || '',
                    gst: item.product.gst,
                    partNo: item.product.partNo,
                    hsnNumber: item.product.hsnNumber,
                    uom: item.product.uom,
                    availableQuantity: item.availableQuantity || 0
                }));
            }
            setProducts(productsData);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchLocations = async () => {
        try {
            const response = await apiClient.stock.getLocations();
            let locationsData: StockLocationData[] = [];
            if (response.success && response.data) {
                locationsData = response.data.map((location: any) => ({
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
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
            customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase())
        );
    };

    const getFilteredProducts = (searchTerm: string = '') => {
        return products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.partNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.brand.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const getFilteredLocations = () => {
        return locations.filter(location =>
            location.name.toLowerCase().includes(locationSearchTerm.toLowerCase()) ||
            location.address.toLowerCase().includes(locationSearchTerm.toLowerCase())
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
        <div className="p-6">
            {/* Save Button */}
            <div className="flex justify-end mb-6">
                <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center space-x-2"
                >
                    <Save className="w-4 h-4" />
                    <span>{submitting ? 'Saving...' : 'Save Quotation'}</span>
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Customer & AMC Details */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Customer Selection */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Customer *
                                </label>
                                <div className="relative" ref={customerDropdownRef}>
                                    <input
                                        type="text"
                                        value={quotationData.customer.name || customerSearchTerm}
                                        onChange={(e) => {
                                            setCustomerSearchTerm(e.target.value);
                                            setShowCustomerDropdown(true);
                                        }}
                                        onFocus={() => setShowCustomerDropdown(true)}
                                        placeholder="Search and select customer"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                                    
                                    {showCustomerDropdown && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                                            {getFilteredCustomers().map((customer) => (
                                                <div
                                                    key={customer._id}
                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                                    onClick={() => {
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
                                                        setCustomerSearchTerm('');
                                                        setShowCustomerDropdown(false);
                                                    }}
                                                >
                                                    <div className="font-medium">{customer.name}</div>
                                                    <div className="text-sm text-gray-500">{customer.email}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {validationErrors.find(error => error.field === 'customer') && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.find(error => error.field === 'customer')?.message}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AMC Contract Details */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">AMC Contract Details</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    AMC Type *
                                </label>
                                <select
                                    value={quotationData.amcType}
                                    onChange={(e) => handleInputChange('amcType', e.target.value as 'AMC' | 'CAMC')}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="AMC">AMC (Annual Maintenance Contract)</option>
                                    <option value="CAMC">CAMC (Comprehensive Annual Maintenance Contract)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contract Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={quotationData.contractStartDate ? new Date(quotationData.contractStartDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleInputChange('contractStartDate', new Date(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Contract End Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={quotationData.contractEndDate ? new Date(quotationData.contractEndDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleInputChange('contractEndDate', new Date(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contract Duration (Months)
                                </label>
                                <input
                                    type="number"
                                    value={quotationData.contractDuration}
                                    onChange={(e) => handleInputChange('contractDuration', parseInt(e.target.value) || 12)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Billing Cycle *
                                </label>
                                <select
                                    value={quotationData.billingCycle}
                                    onChange={(e) => handleInputChange('billingCycle', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="half-yearly">Half-Yearly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Number of Visits
                                    </label>
                                    <input
                                        type="number"
                                        value={quotationData.numberOfVisits}
                                        onChange={(e) => handleInputChange('numberOfVisits', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Oil Services
                                    </label>
                                    <input
                                        type="number"
                                        value={quotationData.numberOfOilServices}
                                        onChange={(e) => handleInputChange('numberOfOilServices', parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Response Time (Hours)
                                </label>
                                <input
                                    type="number"
                                    value={quotationData.responseTime}
                                    onChange={(e) => handleInputChange('responseTime', parseInt(e.target.value) || 24)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Coverage Area
                                </label>
                                <input
                                    type="text"
                                    value={quotationData.coverageArea}
                                    onChange={(e) => handleInputChange('coverageArea', e.target.value)}
                                    placeholder="e.g., Within 50km radius"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Emergency Contact Hours
                                </label>
                                <input
                                    type="text"
                                    value={quotationData.emergencyContactHours}
                                    onChange={(e) => handleInputChange('emergencyContactHours', e.target.value)}
                                    placeholder="e.g., 24/7 or 9 AM - 6 PM"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quotation Details */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quotation Details</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subject *
                                </label>
                                <input
                                    type="text"
                                    value={quotationData.subject || ''}
                                    onChange={(e) => handleInputChange('subject', e.target.value)}
                                    placeholder="AMC quotation subject"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {validationErrors.find(error => error.field === 'subject') && (
                                    <p className="mt-1 text-sm text-red-600">{validationErrors.find(error => error.field === 'subject')?.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Issue Date *
                                    </label>
                                    <input
                                        type="date"
                                        value={quotationData.issueDate ? new Date(quotationData.issueDate).toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleInputChange('issueDate', new Date(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Valid Until *
                                    </label>
                                    <input
                                        type="date"
                                        value={quotationData.validUntil ? new Date(quotationData.validUntil).toISOString().split('T')[0] : ''}
                                        onChange={(e) => handleInputChange('validUntil', new Date(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Validity Period (Days)
                                </label>
                                <input
                                    type="number"
                                    value={quotationData.validityPeriod || 30}
                                    onChange={(e) => handleInputChange('validityPeriod', parseInt(e.target.value) || 30)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Items */}
                <div className="lg:col-span-2">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">AMC Service Items</h3>
                            <Button
                                onClick={addItem}
                                className="flex items-center space-x-2"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Item</span>
                            </Button>
                        </div>

                        <div className="space-y-4">
                            {quotationData.items.map((item, index) => (
                                <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Service/Product
                                            </label>
                                            <input
                                                type="text"
                                                value={item.product}
                                                onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                                                placeholder="Enter service or product name"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Description
                                            </label>
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                placeholder="Service description"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Quantity
                                            </label>
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Unit Price
                                            </label>
                                            <input
                                                type="number"
                                                value={item.unitPrice}
                                                onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Discount (%)
                                            </label>
                                            <input
                                                type="number"
                                                value={item.discount || 0}
                                                onChange={(e) => handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Tax Rate (%)
                                            </label>
                                            <input
                                                type="number"
                                                value={item.taxRate || 18}
                                                onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 18)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Total Price
                                            </label>
                                            <input
                                                type="number"
                                                value={item.totalPrice || 0}
                                                readOnly
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                                            />
                                        </div>

                                        <div className="flex items-end">
                                            <Button
                                                onClick={() => removeItem(index)}
                                                variant="outline"
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totals */}
                        <div className="mt-6 bg-white rounded-lg p-4 border border-gray-200">
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-700">Subtotal:</span>
                                    <span className="text-sm font-medium">₹{quotationData.subtotal?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-700">Total Tax:</span>
                                    <span className="text-sm font-medium">₹{quotationData.totalTax?.toFixed(2) || '0.00'}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2">
                                    <span className="text-lg font-bold text-gray-900">Grand Total:</span>
                                    <span className="text-lg font-bold">₹{quotationData.grandTotal?.toFixed(2) || '0.00'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="mt-6 bg-gray-50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms & Conditions</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Warranty Terms
                                </label>
                                <textarea
                                    value={quotationData.warrantyTerms}
                                    onChange={(e) => handleInputChange('warrantyTerms', e.target.value)}
                                    placeholder="Enter warranty terms and conditions"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Terms
                                </label>
                                <textarea
                                    value={quotationData.paymentTerms}
                                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                                    placeholder="Enter payment terms and conditions"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Renewal Terms
                                </label>
                                <textarea
                                    value={quotationData.renewalTerms}
                                    onChange={(e) => handleInputChange('renewalTerms', e.target.value)}
                                    placeholder="Enter renewal terms and conditions"
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AMCQuotationForm;
