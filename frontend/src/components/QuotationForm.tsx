import React, { useState, useEffect } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../utils/api';
import { 
  calculateQuotationTotals, 
  sanitizeQuotationData,
  getDefaultQuotationData,
  type QuotationData,
  type QuotationItem,
  type ValidationError,
  validateQuotationData
} from '../utils/quotationUtils';

interface QuotationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  customers: any[];
  products: any[];
  generalSettings?: any;
  initialData?: Partial<QuotationData>;
  mode?: 'create' | 'edit' | 'view';
  quotationId?: string;
}

const QuotationForm: React.FC<QuotationFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  customers,
  products,
  generalSettings,
  initialData,
  mode,
  quotationId
}) => {
  const [formData, setFormData] = useState<Partial<QuotationData>>(
    initialData || getDefaultQuotationData()
  );

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});
  const [addresses, setAddresses] = useState<any[]>([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      const defaultData = getDefaultQuotationData();
      // Include company information from general settings
      if (generalSettings) {
        defaultData.company = {
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
        };
      }
      
      // If editing existing quotation, load customer and address data
      if (initialData) {
        // Load customer addresses if customer ID exists
        if (initialData.customer?._id) {
          const customer = customers.find(c => c._id === initialData.customer?._id);
          if (customer) {
            setAddresses(customer.addresses || []);
            
            // If there's an address ID in the initial data, convert it to address text
            if (initialData.customer?.address && typeof initialData.customer.address === 'string') {
              const addressId = parseInt(initialData.customer.address);
              const address = customer.addresses?.find((a: any) => a.id === addressId);
              if (address) {
                // Update the initial data to include the actual address text
                initialData.customer.address = address.address;
              }
            }
          }
        }
      }
      
      setFormData(initialData || defaultData);
      setErrors([]);
      setProductSearchTerms({});
    }
  }, [isOpen, initialData, generalSettings, customers]);

  // Calculate totals whenever items change
  useEffect(() => {
    if (formData.items && formData.items.length > 0) {
      const calculationResult = calculateQuotationTotals(formData.items);
      setFormData(prev => ({
        ...prev,
        subtotal: calculationResult.subtotal,
        totalDiscount: calculationResult.totalDiscount,
        totalTax: calculationResult.totalTax,
        grandTotal: calculationResult.grandTotal,
        roundOff: calculationResult.roundOff
        // Do NOT update items here to avoid infinite update loop
      }));
    }
  }, [formData.items]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       const target = event.target as HTMLElement;
//       if (!target.closest('.dropdown-container')) {
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, []);

  // Filter products based on search term
  const getFilteredProducts = (searchTerm: string = '') => {
    if (!searchTerm) return products;
    return products.filter(product =>
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
    if (!value) return 'Select Product';
    const product = products.find(p => p._id === value);
    return product ? `${product.name} - ₹${product.price?.toLocaleString()}` : 'Select Product';
  };

  // Get customer label for display
  const getCustomerLabel = (value: string) => {
    if (!value) return 'Select Customer';
    const customer = customers.find(c => c._id === value);
    return customer ? `${customer.name} - ${customer.email || 'No email'}` : 'Select Customer';
  };

  // Get address label for display
  const getAddressLabel = (value: string | undefined) => {
    if (!value) return 'Select address';
    
    // If the value looks like an ID (numeric), try to find the address in addresses array
    if (!isNaN(parseInt(value))) {
      const address = addresses.find(a => a.id === parseInt(value));
      return address ? `${address.address} (${address.district}, ${address.pincode})` : 'Select address';
    }
    
    // If the value is already an address text, return it directly
    return value;
  };

  // Validate form data
  const validateForm = (): boolean => {
    const validationResult = validateQuotationData(formData);
    setErrors(validationResult.errors);
    return validationResult.isValid;
    return true;
  };

  // Handle customer selection
  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer: {
          _id: customer._id, // Store customer ID
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          address: '', // Reset address when customer changes
          addressId: '', // Reset addressId when customer changes
          pan: customer.pan || ''
        }
      }));
      setAddresses(customer.addresses || []);
    }
    setShowCustomerDropdown(false);
  };

  // Handle address selection
  const handleAddressSelect = (addressId: string) => {
    const address = addresses.find(a => a.id === parseInt(addressId));
    if (address) {
      setFormData(prev => ({
        ...prev,
        customer: {
          ...prev.customer!,
          address: address.address, // Store the actual address text
          addressId: addressId // Store the address ID for reference
        }
      }));
    }
    setShowAddressDropdown(false);
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
        hsnNumber: product.hsnNumber || '', // Added hsnNumber field
        partNo: product.partNo || '', // Added partNo field
        uom: product.uom || 'pcs'
      };
      setFormData(prev => ({ ...prev, items: newItems }));
    }
    setShowProductDropdowns(prev => ({ ...prev, [itemIndex]: false }));
    updateProductSearchTerm(itemIndex, '');
  };

  // Add new item
  const addItem = () => {
    const newItem: QuotationItem = {
      product: '',
      description: '',
      hsnCode: '',
      hsnNumber: '', // Added hsnNumber field
      partNo: '', // Added partNo field
      quantity: 1,
      uom: 'pcs',
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

  // Update item field
  const updateItem = (index: number, field: keyof QuotationItem, value: any) => {
    if (formData.items) {
      const newItems = [...formData.items];
      newItems[index] = { ...newItems[index], [field]: value };
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  // Handle form submission
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
      
      if (mode === 'edit' && quotationId) {
        await apiClient.quotations.update(quotationId, sanitizedData);
        toast.success('Quotation updated successfully');
      } else {
        await apiClient.quotations.create(sanitizedData);
        toast.success('Quotation created successfully');
      }
      onSuccess();
      onClose();
      
      // Reset form
      setFormData(getDefaultQuotationData());
      setErrors([]);
    } catch (error: any) {
      console.error('Error creating quotation:', error);
      
      if (error.message && error.message.includes('Validation failed')) {
        toast.error('Please check the form for errors');
      } else {
        toast.error(error.message || 'Failed to create quotation');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Get error for specific field
  const getFieldError = (field: string): string | undefined => {
    return errors.find(error => error.field === field)?.message;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'edit' ? 'Edit Quotation' : 'Create New Quotation'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* General Errors */}
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
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Customer *
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    getFieldError('customer') ? 'border-red-500' : 'border-gray-300'
                  } hover:border-gray-400`}
                >
                  <span className="text-gray-700 truncate mr-1">
                    {getCustomerLabel(formData.customer?._id || '')}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                    showCustomerDropdown ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {showCustomerDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          customer: {
                            _id: '',
                            name: '',
                            email: '',
                            phone: '',
                            address: '',
                            pan: ''
                          }
                        }));
                        setShowCustomerDropdown(false);
                        setAddresses([]);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.customer?._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      Select customer
                    </button>
                    {customers.map((customer) => (
                      <button
                        key={customer._id}
                        onClick={() => handleCustomerSelect(customer._id)}
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
              {getFieldError('customer.name') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('customer.name')}</p>
              )}
            </div>

            {/* Customer Address Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Address *
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                  disabled={!formData.customer?._id}
                  className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                    !formData.customer?._id ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <span className="text-gray-700 truncate mr-1">
                    {getAddressLabel(formData.customer?.address || '')}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                    showAddressDropdown ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {showAddressDropdown && formData.customer?._id && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          customer: {
                            ...prev.customer!,
                            address: ''
                          }
                        }));
                        setShowAddressDropdown(false);
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.customer?.address ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      Select address
                    </button>
                    {addresses.map((address) => (
                      <button
                        key={address.id}
                        onClick={() => handleAddressSelect(address.id.toString())}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${formData.customer?.address === address.id.toString() ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
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
              {getFieldError('customer.address') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('customer.address')}</p>
              )}
            </div>

            {/* Issue Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date *
              </label>
              <input
                type="date"
                value={formData.issueDate ? new Date(formData.issueDate).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  issueDate: e.target.value ? new Date(e.target.value) : undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Validity Period */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Validity Period (Days)
              </label>
              <input
                type="number"
                value={formData.validityPeriod || 30}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  validityPeriod: parseInt(e.target.value) || 30 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="365"
              />
              {getFieldError('validityPeriod') && (
                <p className="mt-1 text-sm text-red-600">{getFieldError('validityPeriod')}</p>
              )}
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Items</h3>
              <button
                onClick={addItem}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 flex items-center space-x-1.5 text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/5">Product</th>
                      {/* <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">Description</th> */}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">HSN</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Part No</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Unit Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Disc %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Tax %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Total</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {formData.items?.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        {/* Product Selection */}
                        <td className="px-4 py-3">
                          <div className="relative">
                            <button
                              onClick={() => setShowProductDropdowns(prev => ({ 
                                ...prev, 
                                [index]: !prev[index] 
                              }))}
                              className="flex items-center justify-between w-full px-3 py-2 text-left border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors hover:border-gray-400 text-sm"
                            >
                              <span className="text-gray-700 truncate mr-1">
                                {getProductLabel(item.product)}
                              </span>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${
                                showProductDropdowns[index] ? 'rotate-180' : ''
                              }`} />
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
                                      updateItem(index, 'product', '');
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
                                        onClick={() => handleProductSelect(index, product._id)}
                                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${item.product === product._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                      >
                                        <div>
                                          <div className="font-medium">{product?.name}</div>
                                          <div className="text-xs text-gray-500">₹{product?.price?.toLocaleString()} • {product?.category}</div>
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* HSN */}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.hsnCode || ''}
                            onChange={(e) => updateItem(index, 'hsnCode', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="HSN Code"
                          />
                        </td>

                        {/* Part No */}
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={item.partNo || ''}
                            onChange={(e) => updateItem(index, 'partNo', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="Part Number"
                          />
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            min="0"
                            step="1"
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            min="0"
                            step="1"
                          />
                        </td>

                        {/* Discount */}
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            min="0"
                            max="100"
                            step="1"
                          />
                        </td>

                        {/* Tax Rate */}
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            min="0"
                            step="1"
                          />
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          ₹{(item.unitPrice * item.quantity * (1 - item.discount / 100) * (1 + item.taxRate / 100)).toFixed(2)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded transition-colors"
                            disabled={formData.items && formData.items.length === 1}
                            title="Remove item"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {getFieldError('items.product') && (
            <p className="mt-1 text-sm text-red-600">{getFieldError('items.product')}</p>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Additional notes or terms..."
            />
          </div>

          {/* Terms */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Terms & Conditions
            </label>
            <textarea
              value={formData.terms || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Payment terms, delivery terms, etc..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Total: </span>
            <span className="text-lg font-bold text-gray-900">
              ₹{formData.grandTotal?.toFixed(2) || '0.00'}
            </span>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : mode === 'edit' ? 'Update Quotation' : 'Create Quotation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuotationForm; 