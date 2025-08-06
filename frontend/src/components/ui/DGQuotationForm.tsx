import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, ChevronDown, Save, Eye, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../utils/api';
import { Button } from './Botton';
import { Input } from './Input';
import { Select } from './Select';
import { Badge } from './Badge';
import TabbedNav from './TabbedNav';

interface DGQuotationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dgEnquiry?: any;
  dgCustomers?: any[];
  products?: any[];
  generalSettings?: any;
  initialData?: any;
  mode?: 'create' | 'edit' | 'view';
  quotationId?: string;
}

interface DGQuotationData {
  quotationNumber: string;
  issueDate: string;
  validUntil: string;
  dgEnquiry?: string;
  customer: {
    _id?: string;
    name: string;
    email: string;
    phone: string;
    pan?: string;
    corporateName?: string;
    address?: string;
    pinCode?: string;
    tehsil?: string;
    district?: string;
  };
  company: {
    name?: string;
    logo?: string;
    address?: string;
    phone?: string;
    email?: string;
    pan?: string;
    bankDetails?: {
      bankName?: string;
      accountNo?: string;
      ifsc?: string;
      branch?: string;
    };
  };
  dgSpecifications: {
    kva: string;
    phase: string;
    quantity: number;
    fuelType?: string;
    engineModel?: string;
    alternatorModel?: string;
    fuelTankCapacity?: string;
    runtime?: string;
    noiseLevel?: string;
    emissionCompliance?: string;
  };
  items: Array<{
    product: string;
    description: string;
    hsnCode?: string;
    partNo?: string;
    quantity: number;
    uom: string;
    unitPrice: number;
    discount: number;
    discountedAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  }>;
  services: Array<{
    serviceName: string;
    description: string;
    quantity: number;
    uom: string;
    unitPrice: number;
    discount: number;
    discountedAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  notes?: string;
  terms?: string;
  validityPeriod: number;
  deliveryTerms?: string;
  paymentTerms?: string;
  warrantyTerms?: string;
  installationTerms?: string;
  commissioningTerms?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
}

const DGQuotationForm: React.FC<DGQuotationFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  dgEnquiry,
  dgCustomers = [],
  products = [],
  generalSettings,
  initialData,
  mode = 'create',
  quotationId
}) => {
  const [formData, setFormData] = useState<Partial<DGQuotationData>>({
    quotationNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dgEnquiry: dgEnquiry?._id || '',
    customer: {
      name: '',
      email: '',
      phone: '',
      pan: '',
      corporateName: '',
      address: '',
      pinCode: '',
      tehsil: '',
      district: ''
    },
    company: {
      name: 'Sun Power Services',
      address: '',
      phone: '',
      email: '',
      pan: '',
      bankDetails: {
        bankName: '',
        accountNo: '',
        ifsc: '',
        branch: ''
      }
    },
    dgSpecifications: {
      kva: '',
      phase: '',
      quantity: 1,
      fuelType: '',
      engineModel: '',
      alternatorModel: '',
      fuelTankCapacity: '',
      runtime: '',
      noiseLevel: '',
      emissionCompliance: ''
    },
    items: [],
    services: [],
    subtotal: 0,
    totalDiscount: 0,
    totalTax: 0,
    grandTotal: 0,
    roundOff: 0,
    notes: '',
    terms: '',
    validityPeriod: 30,
    deliveryTerms: '',
    paymentTerms: '',
    warrantyTerms: '',
    installationTerms: '',
    commissioningTerms: '',
    status: 'Draft'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Convert dates to string format for input fields
        const processedData = {
          ...initialData,
          issueDate: initialData.issueDate ? new Date(initialData.issueDate).toISOString().split('T')[0] : '',
          validUntil: initialData.validUntil ? new Date(initialData.validUntil).toISOString().split('T')[0] : ''
        };
        setFormData(processedData);
      } else if (dgEnquiry) {
        // Pre-fill with enquiry data
        setFormData(prev => ({
          ...prev,
          dgEnquiry: dgEnquiry._id,
          customer: {
            _id: dgEnquiry.customer?._id,
            name: dgEnquiry.customerName || '',
            email: dgEnquiry.email || '',
            phone: dgEnquiry.phoneNumber || '',
            pan: dgEnquiry.panNumber || '',
            corporateName: dgEnquiry.corporateName || '',
            address: dgEnquiry.address || '',
            pinCode: dgEnquiry.pinCode || '',
            tehsil: dgEnquiry.tehsil || '',
            district: dgEnquiry.district || ''
          },
          dgSpecifications: {
            kva: dgEnquiry.kva || '',
            phase: dgEnquiry.phase || '',
            quantity: dgEnquiry.quantity || 1,
            fuelType: '',
            engineModel: '',
            alternatorModel: '',
            fuelTankCapacity: '',
            runtime: '',
            noiseLevel: '',
            emissionCompliance: ''
          }
        }));
      }

      // Set company info from general settings
      if (generalSettings) {
        setFormData(prev => ({
          ...prev,
          company: {
            name: generalSettings.companyName || 'Sun Power Services',
            address: generalSettings.companyAddress || '',
            phone: generalSettings.companyPhone || '',
            email: generalSettings.companyEmail || '',
            pan: generalSettings.companyPan || '',
            bankDetails: {
              bankName: generalSettings.companyBankDetails?.bankName || '',
              accountNo: generalSettings.companyBankDetails?.accNo || '',
              ifsc: generalSettings.companyBankDetails?.ifscCode || '',
              branch: generalSettings.companyBankDetails?.branch || ''
            }
          }
        }));
      }
    }
  }, [isOpen, initialData, dgEnquiry, generalSettings]);

  // Generate quotation number if creating new
  useEffect(() => {
    if (isOpen && mode === 'create' && !formData.quotationNumber) {
      generateQuotationNumber();
    }
  }, [isOpen, mode]);

  // Recalculate totals whenever items or services change
  useEffect(() => {
    if ((formData.items && formData.items.length > 0) || (formData.services && formData.services.length > 0)) {
      calculateTotals();
    }
  }, [formData.items, formData.services]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (calculateTimeoutRef.current) {
        clearTimeout(calculateTimeoutRef.current);
      }
    };
  }, []);

  const generateQuotationNumber = async () => {
    try {
      const response = await apiClient.dgSales.quotations.generateNumber();
      if (response.success) {
        setFormData(prev => ({
          ...prev,
          quotationNumber: response.data.quotationNumber
        }));
      }
    } catch (error) {
      console.error('Error generating quotation number:', error);
    }
  };

  // Filter products to show only genset types
  const getFilteredProducts = (searchTerm: string = '') => {
    const gensetProducts = products?.filter(product => 
      product.category?.toLowerCase().includes('genset') ||
      product.name?.toLowerCase().includes('genset') ||
      product.category?.toLowerCase().includes('generator') ||
      product.name?.toLowerCase().includes('generator')
    );
    
    if (!searchTerm) return gensetProducts;
    return gensetProducts.filter(product =>
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.partNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Update product search term
  const updateProductSearchTerm = (itemIndex: number, searchTerm: string) => {
    setProductSearchTerms(prev => ({ ...prev, [itemIndex]: searchTerm }));
  };

  // Get product label for display
  const getProductLabel = (value: string) => {
    if (!value) return 'Select Genset Product';
    const product = products.find(p => p._id === value);
    return product ? `${product.name} - ₹${product.price?.toLocaleString()}` : 'Select Genset Product';
  };

  // Get customer label for display
  const getCustomerLabel = (value: string) => {
    if (!value) return 'Select Customer';
    const customer = dgCustomers.find(c => c._id === value);
    return customer ? `${customer.name} - ${customer.email || 'No email'}` : 'Select Customer';
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    const customer = dgCustomers.find(c => c._id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer: {
          _id: customer._id,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          pan: customer.pan || '',
          corporateName: customer.corporateName || '',
          address: customer.address || '',
          pinCode: customer.pinCode || '',
          tehsil: customer.tehsil || '',
          district: customer.district || ''
        }
      }));
    }
    setShowCustomerDropdown(false);
    setCustomerSearchTerm('');
  };

  // Handle product selection
  const handleProductSelect = (itemIndex: number, productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      const newItems = [...(formData.items || [])];
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        product: productId,
        description: product.name,
        unitPrice: product.price || 0,
        hsnCode: product.hsnNumber || '',
        partNo: product.partNo || '',
        uom: product.uom || 'nos'
      };
      setFormData(prev => ({ ...prev, items: newItems }));
    }
    setShowProductDropdowns(prev => ({ ...prev, [itemIndex]: false }));
    updateProductSearchTerm(itemIndex, '');
  };

  // Add new item
  const addItem = () => {
    const newItem = {
      product: '',
      description: '',
      hsnCode: '',
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
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  // Remove item
  const removeItem = (index: number) => {
    if (formData.items && formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  // Debounced calculation function
  const calculateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedCalculate = useCallback(() => {
    if (calculateTimeoutRef.current) {
      clearTimeout(calculateTimeoutRef.current);
    }
    calculateTimeoutRef.current = setTimeout(() => {
      calculateTotals();
    }, 150);
  }, []);

  // Update item field
  const updateItem = (index: number, field: string, value: any) => {
    if (formData.items && formData.items[index]) {
      const newItems = [...formData.items];
      
      // Ensure numeric fields are properly handled
      if (['quantity', 'unitPrice', 'discount', 'taxRate'].includes(field)) {
        value = Number(value) || 0;
      }
      
      newItems[index] = { ...newItems[index], [field]: value };
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.quotationNumber?.trim()) {
      newErrors.quotationNumber = 'Quotation number is required';
    }
    if (!formData.issueDate) {
      newErrors.issueDate = 'Issue date is required';
    }
    if (!formData.validUntil) {
      newErrors.validUntil = 'Valid until date is required';
    }
    if (!formData.customer?.name?.trim()) {
      newErrors['customer.name'] = 'Customer name is required';
    }
    if (!formData.dgSpecifications?.kva?.trim()) {
      newErrors['dgSpecifications.kva'] = 'KVA is required';
    }
    if (!formData.dgSpecifications?.phase?.trim()) {
      newErrors['dgSpecifications.phase'] = 'Phase is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    // Calculate items totals and update individual item fields
    const updatedItems = formData.items?.map(item => {
      const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
      const discountAmount = (itemTotal * (item.discount || 0)) / 100;
      const discountedAmount = itemTotal - discountAmount;
      const taxAmount = (discountedAmount * (item.taxRate || 0)) / 100;
      const totalPrice = discountedAmount + taxAmount;
      
      subtotal += itemTotal;
      totalDiscount += discountAmount;
      totalTax += taxAmount;

      return {
        ...item,
        discountedAmount: Math.round(discountAmount * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalPrice: Math.round(totalPrice * 100) / 100
      };
    }) || [];

    // Calculate services totals and update individual service fields
    const updatedServices = formData.services?.map(service => {
      const serviceTotal = (service.quantity || 0) * (service.unitPrice || 0);
      const discountAmount = (serviceTotal * (service.discount || 0)) / 100;
      const discountedAmount = serviceTotal - discountAmount;
      const taxAmount = (discountedAmount * (service.taxRate || 0)) / 100;
      const totalPrice = discountedAmount + taxAmount;
      
      subtotal += serviceTotal;
      totalDiscount += discountAmount;
      totalTax += taxAmount;

      return {
        ...service,
        discountedAmount: Math.round(discountAmount * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        totalPrice: Math.round(totalPrice * 100) / 100
      };
    }) || [];

    const grandTotal = subtotal - totalDiscount + totalTax;
    const roundOff = Math.round(grandTotal) - grandTotal;

    setFormData(prev => ({
      ...prev,
      items: updatedItems,
      services: updatedServices,
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      roundOff: Math.round(roundOff * 100) / 100
    }));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    // Ensure totals are calculated before submitting
    calculateTotals();

    setSubmitting(true);
    try {
      // Clean up empty strings and convert to proper format
      const cleanData = (obj: any): any => {
        if (typeof obj === 'string' && obj.trim() === '') {
          return undefined;
        }
        if (Array.isArray(obj)) {
          return obj.map(cleanData);
        }
        if (obj && typeof obj === 'object') {
          const cleaned: any = {};
          for (const [key, value] of Object.entries(obj)) {
            const cleanedValue = cleanData(value);
            if (cleanedValue !== undefined) {
              cleaned[key] = cleanedValue;
            }
          }
          return cleaned;
        }
        return obj;
      };

      // Remove _id fields from items and services arrays
      const cleanedFormData = cleanData(formData);
      
      // Clean items array - remove _id fields
      if (cleanedFormData.items) {
        cleanedFormData.items = cleanedFormData.items.map((item: any) => {
          const { _id, ...itemWithoutId } = item;
          return itemWithoutId;
        });
      }
      
      // Clean services array - remove _id fields
      if (cleanedFormData.services) {
        cleanedFormData.services = cleanedFormData.services.map((service: any) => {
          const { _id, ...serviceWithoutId } = service;
          return serviceWithoutId;
        });
      }

      // Remove MongoDB fields that shouldn't be sent in updates
      const { 
        _id, 
        createdBy, 
        createdAt, 
        updatedAt, 
        __v, 
        ...cleanedFormDataWithoutId 
      } = cleanedFormData;

      const submitData = {
        ...cleanedFormDataWithoutId,
        issueDate: new Date(formData.issueDate!),
        validUntil: new Date(formData.validUntil!)
      };

      let response;
      if (mode === 'create') {
        response = await apiClient.dgSales.quotations.create(submitData);
      } else {
        response = await apiClient.dgSales.quotations.update(quotationId!, submitData);
      }

      if (response.success) {
        toast.success(`DG Quotation ${mode === 'create' ? 'created' : 'updated'} successfully`);
        onSuccess();
        onClose();
      } else {
        toast.error(response.data?.message || `Failed to ${mode} DG Quotation`);
      }
    } catch (error: any) {
      console.error('Error saving DG Quotation:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(`Error ${mode === 'create' ? 'creating' : 'updating'} DG Quotation`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getFieldError = (field: string): string | undefined => {
    return errors[field];
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = field.split('.');
      let current: any = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newData;
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'create' ? 'Create DG Quotation' : 
               mode === 'edit' ? 'Edit DG Quotation' : 'View DG Quotation'}
            </h2>
            {formData.status && (
              <Badge variant={
                formData.status === 'Draft' ? 'info' :
                formData.status === 'Sent' ? 'warning' :
                formData.status === 'Accepted' ? 'success' :
                formData.status === 'Rejected' ? 'danger' : 'info'
              }>
                {formData.status}
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <TabbedNav
            tabs={[
              { key: 'basic', label: 'Basic Info', icon: '📋' },
              { key: 'customer', label: 'Customer', icon: '👤' },
              { key: 'dg-specs', label: 'DG Specifications', icon: '⚡' },
              { key: 'items', label: 'Items', icon: '📦' },
            //   { key: 'services', label: 'Services', icon: '🔧' },
              { key: 'terms', label: 'Terms & Notes', icon: '📝' }
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="mt-6">
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quotation Number *
                    </label>
                    <Input
                      value={formData.quotationNumber || ''}
                      onChange={(e) => updateField('quotationNumber', e.target.value)}
                      placeholder="Auto-generated"
                      disabled={mode === 'view'}
                      error={getFieldError('quotationNumber')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Date *
                    </label>
                    <Input
                      type="date"
                      value={formData.issueDate || ''}
                      onChange={(e) => updateField('issueDate', e.target.value)}
                      disabled={mode === 'view'}
                      error={getFieldError('issueDate')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valid Until *
                    </label>
                    <Input
                      type="date"
                      value={formData.validUntil || ''}
                      onChange={(e) => updateField('validUntil', e.target.value)}
                      disabled={mode === 'view'}
                      error={getFieldError('validUntil')}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'customer' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer *
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                        disabled={mode === 'view'}
                        className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${getFieldError('customer.name') ? 'border-red-500' : 'border-gray-300'} hover:border-gray-400 ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                      >
                        <span className="text-gray-700 truncate mr-1">
                          {getCustomerLabel(formData.customer?._id || '')}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                      </button>

                      {showCustomerDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
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
                          <button
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                customer: {
                                  _id: '',
                                  name: '',
                                  email: '',
                                  phone: '',
                                  pan: '',
                                  corporateName: '',
                                  address: '',
                                  pinCode: '',
                                  tehsil: '',
                                  district: ''
                                }
                              }));
                              setShowCustomerDropdown(false);
                              setCustomerSearchTerm('');
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.customer?._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                          >
                            Select customer
                          </button>
                          {dgCustomers.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              {!customerSearchTerm ? 'No customers found' : 'Loading customers...'}
                            </div>
                          ) : (
                            dgCustomers
                              .filter(customer =>
                                customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                                customer.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                              )
                              .map((customer) => (
                                <button
                                  key={customer._id}
                                  onClick={() => {
                                    handleCustomerSelect(customer._id);
                                  }}
                                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${formData.customer?._id === customer._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                >
                                  <div>
                                    <div className="font-medium">{customer.name}</div>
                                    <div className="text-xs text-gray-500">{customer.email}</div>
                                  </div>
                                </button>
                              ))
                          )}
                        </div>
                      )}
                    </div>
                    {getFieldError('customer.name') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('customer.name')}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.customer?.email || ''}
                      onChange={(e) => updateField('customer.email', e.target.value)}
                      placeholder="Enter email"
                      disabled={mode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <Input
                      value={formData.customer?.phone || ''}
                      onChange={(e) => updateField('customer.phone', e.target.value)}
                      placeholder="Enter phone number"
                      disabled={mode === 'view'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PAN Number
                    </label>
                    <Input
                      value={formData.customer?.pan || ''}
                      onChange={(e) => updateField('customer.pan', e.target.value)}
                      placeholder="Enter PAN number"
                      disabled={mode === 'view'}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    value={formData.customer?.address || ''}
                    onChange={(e) => updateField('customer.address', e.target.value)}
                    placeholder="Enter address"
                    disabled={mode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {activeTab === 'dg-specs' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      KVA *
                    </label>
                    <Input
                      value={formData.dgSpecifications?.kva || ''}
                      onChange={(e) => updateField('dgSpecifications.kva', e.target.value)}
                      placeholder="e.g., 62.5 KVA"
                      disabled={mode === 'view'}
                      error={getFieldError('dgSpecifications.kva')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phase *
                    </label>
                    <Select
                      value={formData.dgSpecifications?.phase || ''}
                      onChange={(e) => updateField('dgSpecifications.phase', e.target.value)}
                      disabled={mode === 'view'}
                      error={getFieldError('dgSpecifications.phase')}
                      options={[
                        { value: '', label: 'Select Phase' },
                        { value: 'Single Phase', label: 'Single Phase' },
                        { value: 'Three Phase', label: 'Three Phase' }
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      value={formData.dgSpecifications?.quantity || 1}
                      onChange={(e) => updateField('dgSpecifications.quantity', parseInt(e.target.value) || 1)}
                      min="1"
                      disabled={mode === 'view'}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'items' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Items</h3>
                  {mode !== 'view' && (
                    <Button
                      onClick={addItem}
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  )}
                </div>
                
                {formData.items?.map((item, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Genset Product
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowProductDropdowns(prev => ({
                              ...prev,
                              [index]: !prev[index]
                            }))}
                            disabled={mode === 'view'}
                            className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 text-sm ${mode === 'view' ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'}`}
                          >
                            <span className="text-gray-700 truncate mr-1">
                              {getProductLabel(item.product)}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showProductDropdowns[index] ? 'rotate-180' : ''}`} />
                          </button>

                          {showProductDropdowns[index] && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-hidden flex flex-col">
                              <div className="p-2 border-b border-gray-200">
                                <input
                                  type="text"
                                  placeholder="Search genset products..."
                                  value={productSearchTerms[index] || ''}
                                  onChange={(e) => updateProductSearchTerm(index, e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  autoFocus
                                />
                              </div>
                              <div className="overflow-y-auto max-h-60 py-0.5">
                                <button
                                  onClick={() => {
                                    updateItem(index, 'product', '');
                                    setShowProductDropdowns(prev => ({ ...prev, [index]: false }));
                                    updateProductSearchTerm(index, '');
                                  }}
                                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!item.product ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                >
                                  Select genset product
                                </button>
                                {getFilteredProducts(productSearchTerms[index] || '').length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-gray-500">No genset products found</div>
                                ) : (
                                  getFilteredProducts(productSearchTerms[index] || '').map(product => (
                                    <button
                                      key={product._id}
                                      onClick={() => handleProductSelect(index, product._id)}
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
                          Quantity
                        </label>
                        <Input
                          type="number"
                          name="quantity"
                          value={item.quantity}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value) || 0;
                            updateItem(index, 'quantity', newValue);
                            debouncedCalculate();
                          }}
                          min="0"
                          step="1"
                          // disabled={mode === 'view'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Price
                        </label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            updateItem(index, 'unitPrice', newValue);
                            debouncedCalculate();
                          }}
                          min="0"
                          step="0.01"
                          disabled={mode === 'view'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total
                        </label>
                        <Input
                          value={`₹${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}`}
                          disabled
                          className="bg-gray-50"
                        />
                      </div>
                    </div>
                    {mode !== 'view' && (
                      <Button
                        onClick={() => {
                          removeItem(index);
                          calculateTotals();
                        }}
                        variant="danger"
                        size="sm"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* {activeTab === 'services' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Services</h3>
                  {mode !== 'view' && (
                    <Button
                      onClick={() => {
                        const newService = {
                          serviceName: '',
                          description: '',
                          quantity: 1,
                          uom: 'Nos',
                          unitPrice: 0,
                          discount: 0,
                          discountedAmount: 0,
                          taxRate: 18,
                          taxAmount: 0,
                          totalPrice: 0
                        };
                        setFormData(prev => ({
                          ...prev,
                          services: [...(prev.services || []), newService]
                        }));
                      }}
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Service
                    </Button>
                  )}
                </div>
                
                {formData.services?.map((service, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Service Name
                        </label>
                        <Input
                          value={service.serviceName}
                          onChange={(e) => {
                            const newServices = [...(formData.services || [])];
                            newServices[index].serviceName = e.target.value;
                            setFormData(prev => ({ ...prev, services: newServices }));
                          }}
                          placeholder="Service name"
                          disabled={mode === 'view'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <Input
                          type="number"
                          value={service.quantity}
                          onChange={(e) => {
                            const newServices = [...(formData.services || [])];
                            newServices[index].quantity = parseFloat(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, services: newServices }));
                            debouncedCalculate();
                          }}
                          min="0"
                          step="0.01"
                          disabled={mode === 'view'}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Price
                        </label>
                        <Input
                          type="number"
                          value={service.unitPrice}
                          onChange={(e) => {
                            const newServices = [...(formData.services || [])];
                            newServices[index].unitPrice = parseFloat(e.target.value) || 0;
                            setFormData(prev => ({ ...prev, services: newServices }));
                            debouncedCalculate();
                          }}
                          min="0"
                          step="0.01"
                          disabled={mode === 'view'}
                        />
                      </div>
                    </div>
                    {mode !== 'view' && (
                      <Button
                        onClick={() => {
                          const newServices = formData.services?.filter((_, i) => i !== index) || [];
                          setFormData(prev => ({ ...prev, services: newServices }));
                          calculateTotals();
                        }}
                        variant="danger"
                        size="sm"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )} */}

            {activeTab === 'terms' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Enter additional notes"
                    disabled={mode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terms & Conditions
                  </label>
                  <textarea
                    value={formData.terms || ''}
                    onChange={(e) => updateField('terms', e.target.value)}
                    placeholder="Enter terms and conditions"
                    disabled={mode === 'view'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {formData.grandTotal && formData.grandTotal > 0 && (
              <span className="font-medium">
                Total: ₹{formData.grandTotal.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {mode !== 'view' && (
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="min-w-[100px]"
              >
                {submitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DGQuotationForm; 