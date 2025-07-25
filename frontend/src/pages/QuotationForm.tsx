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

  // Form states
  const [formData, setFormData] = useState<Partial<QuotationData>>(getDefaultQuotationData());
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // Search states
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});
  const [uomSearchTerms, setUomSearchTerms] = useState<Record<number, string>>({});

  // UOM options
  const UOM_OPTIONS = [
    'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'nos'
  ];

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

  const setFormDataFromQuotation = (quotation: any) => {
    try {
      // Find the customer in the customers list to get full customer data
      const fullCustomer = customers.find(c => c._id === quotation.customer?._id) || quotation.customer;
      
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
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          taxRate: item.taxRate || 0,
          discount: item.discount || 0,
          partNo: item.partNo || '',
          hsnCode: item.hsnCode || '',
          hsnNumber: item.hsnNumber || '',
          uom: item.uom || 'nos',
          discountedAmount: item.discountedAmount || 0,
          taxAmount: item.taxAmount || 0,
          totalPrice: item.totalPrice || 0
        })),
        notes: quotation.notes || '',
        terms: quotation.terms || '',
        customerAddress: quotation.customerAddress ? {
          address: quotation.customerAddress.address || '',
          state: quotation.customerAddress.state || '',
          district: quotation.customerAddress.district || '',
          pincode: quotation.customerAddress.pincode || '',
          ...(quotation.customerAddress.addressId && { addressId: quotation.customerAddress.addressId })
        } : {
          address: '',
          state: '',
          district: '',
          pincode: ''
        }
      };
      
      setFormData(formDataToSet);

      // Set customer addresses if available - try multiple sources
      let customerAddresses = [];
      if (fullCustomer?.addresses) {
        customerAddresses = fullCustomer.addresses;
      } else if (quotation.customer?.addresses) {
        customerAddresses = quotation.customer.addresses;
      }
      
      if (customerAddresses.length > 0) {
        setAddresses(customerAddresses);
      }
      
    } catch (formError) {
      console.error('Error setting form data:', formError);
      toast.error('Error processing quotation data. Some fields may not load correctly.');
      // Set minimal fallback data
      setFormData(getDefaultQuotationData());
    }
  };

  const fetchQuotationForEdit = async (quotationId: string) => {
    try {
      const response = await apiClient.quotations.getById(quotationId);
      
      // Handle different possible response structures
      let quotation;
      if (response?.data) {
        quotation = response.data;
      } else if (response) {
        // Sometimes the response itself is the quotation data
        quotation = response;
      } else {
        throw new Error('No quotation data received from server');
      }
      
      // Check if required quotation data exists
      if (!quotation) {
        throw new Error('Quotation data is empty');
      }
      
      // Safely populate form with existing quotation data
      try {
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
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            taxRate: item.taxRate || 0,
            discount: item.discount || 0,
            partNo: item.partNo || '',
            hsnCode: item.hsnCode || '',
            hsnNumber: item.hsnNumber || '',
            uom: item.uom || 'nos',
            discountedAmount: item.discountedAmount || 0,
            taxAmount: item.taxAmount || 0,
            totalPrice: item.totalPrice || 0
          })),
          notes: quotation.notes || '',
          terms: quotation.terms || '',
          customerAddress: quotation.customerAddress || {
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

      // Set customer addresses if available
      if (quotation.customer?.addresses) {
        setAddresses(quotation.customer.addresses);
      }
    } catch (error) {
      console.error('Error fetching quotation for edit:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load quotation data';
      toast.error(errorMessage);
      navigate('/billing');
    }
  };

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
          taxRate: 18,
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

  const removeQuotationItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: (prev.items || []).filter((_, i) => i !== index)
    }));
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

  const validateForm = (): boolean => {
    const validation = validateQuotationData(formData);
    setErrors(validation.errors);
    return validation.isValid;
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
                <button
                  onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                  className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400"
                >
                  <span className="text-gray-700 truncate mr-1">{getLocationLabel(formData.location || '')}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showLocationDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showLocationDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setFormData({ ...formData, location: '' });
                        setShowLocationDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.location ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      Select location
                    </button>
                    {locations.map((location) => (
                      <button
                        key={location._id}
                        onClick={() => {
                          setFormData({ ...formData, location: location._id });
                          setShowLocationDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${formData.location === location._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
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
                <button
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400"
                >
                  <span className="text-gray-700 truncate mr-1">{getCustomerLabel(formData.customer?._id || '')}</span>
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
                        setFormData({ 
                          ...formData, 
                          customer: { _id: '', name: '', email: '', phone: '', pan: '' },
                          customerAddress: { address: '', state: '', district: '', pincode: '' }
                        });
                        setShowCustomerDropdown(false);
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
                        customer.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase()))
                    ).map(customer => (
                      <button
                        key={customer._id}
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
                          setAddresses(customer.addresses || []);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${formData.customer?._id === customer._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
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
                <button
                  onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                  disabled={!formData.customer?._id}
                  className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg transition-colors ${!formData.customer?._id ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
                >
                  <span className="text-gray-700 truncate mr-1">{getAddressLabel((formData.customerAddress as any)?.addressId?.toString())}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showAddressDropdown ? 'rotate-180' : ''}`} />
                </button>
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
                    {addresses.map(address => (
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
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${(formData.customerAddress as any)?.addressId === address.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={formData.issueDate ? new Date(formData.issueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  const issueDate = new Date(e.target.value);
                  const validityPeriod = formData.validityPeriod || 30;
                  const validUntil = new Date(issueDate);
                  validUntil.setDate(validUntil.getDate() + validityPeriod);
                  
                  setFormData({ 
                    ...formData, 
                    issueDate,
                    validUntil
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={formData.validUntil ? new Date(formData.validUntil).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, validUntil: new Date(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Quotation Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Quotation Items</h3>
              <button
                onClick={addQuotationItem}
                type="button"
                className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-1"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-4">
              {(formData.items || []).map((item, index) => (
                <div key={index} className="border rounded-lg p-4 bg-white">
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
                          className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400"
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
                                  updateQuotationItem(index, 'product', '');
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
                                      updateQuotationItem(index, 'product', product._id);
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
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateQuotationItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Item description"
                      />
                    </div>
                  </div>

                  {/* Details Row */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">HSN Code</label>
                      <input
                        type="text"
                        value={item.hsnNumber || ''}
                        onChange={(e) => updateQuotationItem(index, 'hsnNumber', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="HSN Code"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Part No</label>
                      <input
                        type="text"
                        value={item.partNo || ''}
                        onChange={(e) => updateQuotationItem(index, 'partNo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Part number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateQuotationItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
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
                                      updateQuotationItem(index, 'uom', uomOption);
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.taxRate || 0}
                        onChange={(e) => updateQuotationItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="18"
                      />
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
                        onChange={(e) => updateQuotationItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Discount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        value={item.discount || 0}
                        onChange={(e) => updateQuotationItem(index, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total (₹)</label>
                      <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium">
                        ₹{item.totalPrice?.toFixed(2) || '0.00'}
                      </div>
                    </div>

                    <div>
                      {(formData.items || []).length > 1 && (
                        <button
                          onClick={() => removeQuotationItem(index)}
                          type="button"
                          className="w-full p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                        >
                          <X className="w-4 h-4 mx-auto" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes and Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Additional notes..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Terms & Conditions (Optional)</label>
              <textarea
                value={formData.terms || ''}
                onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Terms and conditions..."
              />
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
    </div>
  );
};

export default QuotationFormPage; 