import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Calendar, Package, User, MapPin, DollarSign } from 'lucide-react';
import { apiClient } from '../../utils/api';
import { Button } from './Botton';
import { Input } from './Input';
import { Select } from './Select';
import { Badge } from './Badge';
import TabbedNav from './TabbedNav';
import toast from 'react-hot-toast';

interface DGPurchaseOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dgQuotation?: any;
  dgCustomers?: any[];
  products?: any[];
  suppliers?: any[];
  initialData?: any;
  mode?: 'create' | 'edit' | 'view';
  purchaseOrderId?: string;
}

interface DGPurchaseOrderData {
  poNumber: string;
  dgQuotation?: string;
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
  supplier: string;
  supplierEmail: string;
  supplierAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  items: Array<{
    product: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    totalPrice: number;
    notes?: string;
  }>;
  totalAmount: number;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled' | 'partially_received';
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  shipDate?: string;
  docketNumber?: string;
  noOfPackages?: number;
  gstInvoiceNumber?: string;
  invoiceDate?: string;
  documentNumber?: string;
  documentDate?: string;
  notes?: string;
  terms?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const DGPurchaseOrderForm: React.FC<DGPurchaseOrderFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  dgQuotation,
  dgCustomers = [],
  products = [],
  suppliers = [],
  initialData,
  mode = 'create',
  purchaseOrderId
}) => {
  const [formData, setFormData] = useState<Partial<DGPurchaseOrderData>>({
    poNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    supplier: '',
    supplierEmail: '',
    supplierAddress: {
      address: '',
      state: '',
      district: '',
      pincode: ''
    },
    items: [],
    totalAmount: 0,
    status: 'draft',
    priority: 'medium',
    notes: '',
    terms: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Convert dates to string format for input fields
        const processedData = {
          ...initialData,
          orderDate: initialData.orderDate ? new Date(initialData.orderDate).toISOString().split('T')[0] : '',
          expectedDeliveryDate: initialData.expectedDeliveryDate ? new Date(initialData.expectedDeliveryDate).toISOString().split('T')[0] : '',
          actualDeliveryDate: initialData.actualDeliveryDate ? new Date(initialData.actualDeliveryDate).toISOString().split('T')[0] : '',
          shipDate: initialData.shipDate ? new Date(initialData.shipDate).toISOString().split('T')[0] : '',
          invoiceDate: initialData.invoiceDate ? new Date(initialData.invoiceDate).toISOString().split('T')[0] : '',
          documentDate: initialData.documentDate ? new Date(initialData.documentDate).toISOString().split('T')[0] : ''
        };
        setFormData(processedData);
      } else if (dgQuotation) {
        // Pre-fill with quotation data
        setFormData(prev => ({
          ...prev,
          dgQuotation: dgQuotation._id,
          customer: {
            _id: dgQuotation.customer?._id,
            name: dgQuotation.customer?.name || '',
            email: dgQuotation.customer?.email || '',
            phone: dgQuotation.customer?.phone || '',
            pan: dgQuotation.customer?.pan || '',
            corporateName: dgQuotation.customer?.corporateName || '',
            address: dgQuotation.customer?.address || '',
            pinCode: dgQuotation.customer?.pinCode || '',
            tehsil: dgQuotation.customer?.tehsil || '',
            district: dgQuotation.customer?.district || ''
          }
        }));
      }
    }
  }, [isOpen, initialData, dgQuotation]);

  // Generate PO number if creating new
  useEffect(() => {
    if (isOpen && mode === 'create' && !formData.poNumber) {
      generatePONumber();
    }
  }, [isOpen, mode]);

  const generatePONumber = async () => {
    try {
      const response = await apiClient.dgSales.purchaseOrders.generateNumber();
      if (response.success) {
        setFormData(prev => ({
          ...prev,
          poNumber: response.data.poNumber
        }));
      }
    } catch (error) {
      console.error('Error generating PO number:', error);
    }
  };

  const getFilteredCustomers = (searchTerm: string = '') => {
    return dgCustomers.filter(customer =>
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm)
    );
  };

  const getFilteredSuppliers = (searchTerm: string = '') => {
    return suppliers.filter(supplier =>
      supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFilteredProducts = (searchTerm: string = '') => {
    return products.filter(product =>
      (product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       product.category?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (product.category?.toLowerCase().includes('genset') || 
       product.category?.toLowerCase().includes('generator') ||
       product.name?.toLowerCase().includes('genset') ||
       product.name?.toLowerCase().includes('generator'))
    );
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = dgCustomers.find(c => c._id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer: {
          _id: customer._id,
          name: customer.name || '',
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

  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find(s => s._id === supplierId);
    if (supplier) {
      setFormData(prev => ({
        ...prev,
        supplier: supplier.name || '',
        supplierEmail: supplier.email || '',
        supplierAddress: {
          address: supplier.address || '',
          state: supplier.state || '',
          district: supplier.district || '',
          pincode: supplier.pincode || ''
        }
      }));
    }
    setShowSupplierDropdown(false);
    setSupplierSearchTerm('');
  };

  const handleProductSelect = (itemIndex: number, productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setFormData(prev => {
        const newItems = [...(prev.items || [])];
        newItems[itemIndex] = {
          ...newItems[itemIndex],
          product: product._id,
          description: product.name || '',
          unitPrice: product.price || 0,
          taxRate: product.gst || 18
        };
        return { ...prev, items: newItems };
      });
    }
    setShowProductDropdowns(prev => ({ ...prev, [itemIndex]: false }));
    setProductSearchTerms(prev => ({ ...prev, [itemIndex]: '' }));
  };

  const addItem = () => {
    const newItem = {
      product: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      totalPrice: 0,
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items && formData.items.length > 1) {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    if (formData.items) {
      const newItems = [...formData.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Calculate total price for the item
      if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
        const item = newItems[index];
        const subtotal = item.quantity * item.unitPrice;
        const taxAmount = (subtotal * item.taxRate) / 100;
        newItems[index].totalPrice = subtotal + taxAmount;
      }
      
      setFormData(prev => ({ ...prev, items: newItems }));
    }
  };

  const calculateTotals = () => {
    let totalAmount = 0;
    
    formData.items?.forEach(item => {
      totalAmount += item.totalPrice;
    });
    
    setFormData(prev => ({
      ...prev,
      totalAmount: Math.round(totalAmount * 100) / 100
    }));
  };

  // Recalculate totals whenever items change
  useEffect(() => {
    if (formData.items && formData.items.length > 0) {
      calculateTotals();
    }
  }, [formData.items]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validation
    if (!formData.poNumber?.trim()) {
      newErrors.poNumber = 'PO number is required';
    }
    if (!formData.orderDate) {
      newErrors.orderDate = 'Order date is required';
    }
    if (!formData.customer?.name?.trim()) {
      newErrors['customer.name'] = 'Customer name is required';
    }
    if (!formData.supplier?.trim()) {
      newErrors.supplier = 'Supplier is required';
    }
    if (!formData.items || formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

      const submitData = {
        ...cleanData(formData),
        orderDate: new Date(formData.orderDate!),
        expectedDeliveryDate: formData.expectedDeliveryDate ? new Date(formData.expectedDeliveryDate) : undefined,
        actualDeliveryDate: formData.actualDeliveryDate ? new Date(formData.actualDeliveryDate) : undefined,
        shipDate: formData.shipDate ? new Date(formData.shipDate) : undefined,
        invoiceDate: formData.invoiceDate ? new Date(formData.invoiceDate) : undefined,
        documentDate: formData.documentDate ? new Date(formData.documentDate) : undefined
      };

      let response;
      if (mode === 'create') {
        response = await apiClient.dgSales.purchaseOrders.create(submitData);
      } else {
        response = await apiClient.dgSales.purchaseOrders.update(purchaseOrderId!, submitData);
      }

      if (response.success) {
        toast.success(`DG Purchase Order ${mode === 'create' ? 'created' : 'updated'} successfully`);
        onSuccess();
        onClose();
      } else {
        toast.error(response.data?.message || `Failed to ${mode} DG Purchase Order`);
      }
    } catch (error: any) {
      console.error('Error saving DG Purchase Order:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(`Error ${mode === 'create' ? 'creating' : 'updating'} DG Purchase Order`);
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

  const tabs = [
    { key: 'basic', label: 'Basic Info', icon: <Package className="w-4 h-4" /> },
    { key: 'customer', label: 'Customer', icon: <User className="w-4 h-4" /> },
    { key: 'supplier', label: 'Supplier', icon: <MapPin className="w-4 h-4" /> },
    { key: 'items', label: 'Items', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'shipping', label: 'Shipping', icon: <Calendar className="w-4 h-4" /> },
    { key: 'notes', label: 'Notes & Terms', icon: <Package className="w-4 h-4" /> }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              {mode === 'create' ? 'Create DG Purchase Order' : 
               mode === 'edit' ? 'Edit DG Purchase Order' : 'View DG Purchase Order'}
            </h2>
            {formData.status && (
              <Badge variant={
                formData.status === 'draft' ? 'info' :
                formData.status === 'sent' ? 'warning' :
                formData.status === 'confirmed' ? 'success' :
                formData.status === 'received' ? 'success' :
                formData.status === 'cancelled' ? 'danger' : 'info'
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

        {/* Tabs */}
        <div className="px-6 pt-4">
          <TabbedNav
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="PO Number"
                  value={formData.poNumber || ''}
                  onChange={(e) => updateField('poNumber', e.target.value)}
                  error={getFieldError('poNumber')}
                  disabled={mode === 'edit'}
                />
                <Input
                  label="Order Date"
                  type="date"
                  value={formData.orderDate || ''}
                  onChange={(e) => updateField('orderDate', e.target.value)}
                  error={getFieldError('orderDate')}
                />
                <Input
                  label="Expected Delivery Date"
                  type="date"
                  value={formData.expectedDeliveryDate || ''}
                  onChange={(e) => updateField('expectedDeliveryDate', e.target.value)}
                />
                <Select
                  label="Priority"
                  value={formData.priority || 'medium'}
                  onChange={(e) => updateField('priority', e.target.value)}
                  options={[
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'urgent', label: 'Urgent' }
                  ]}
                />
              </div>
            </div>
          )}

          {activeTab === 'customer' && (
            <div className="space-y-6">
              <div className="relative">
                <Input
                  label="Customer"
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search customers..."
                />
                {showCustomerDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {getFilteredCustomers(customerSearchTerm).map(customer => (
                      <div
                        key={customer._id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleCustomerSelect(customer._id)}
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-600">{customer.email} • {customer.phone}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Customer Name"
                  value={formData.customer?.name || ''}
                  onChange={(e) => updateField('customer.name', e.target.value)}
                  error={getFieldError('customer.name')}
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.customer?.email || ''}
                  onChange={(e) => updateField('customer.email', e.target.value)}
                />
                <Input
                  label="Phone"
                  value={formData.customer?.phone || ''}
                  onChange={(e) => updateField('customer.phone', e.target.value)}
                />
                <Input
                  label="PAN"
                  value={formData.customer?.pan || ''}
                  onChange={(e) => updateField('customer.pan', e.target.value)}
                />
                <Input
                  label="Corporate Name"
                  value={formData.customer?.corporateName || ''}
                  onChange={(e) => updateField('customer.corporateName', e.target.value)}
                />
                <Input
                  label="Address"
                  value={formData.customer?.address || ''}
                  onChange={(e) => updateField('customer.address', e.target.value)}
                />
                <Input
                  label="Pin Code"
                  value={formData.customer?.pinCode || ''}
                  onChange={(e) => updateField('customer.pinCode', e.target.value)}
                />
                <Input
                  label="Tehsil"
                  value={formData.customer?.tehsil || ''}
                  onChange={(e) => updateField('customer.tehsil', e.target.value)}
                />
                <Input
                  label="District"
                  value={formData.customer?.district || ''}
                  onChange={(e) => updateField('customer.district', e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'supplier' && (
            <div className="space-y-6">
              <div className="relative">
                <Input
                  label="Supplier"
                  value={supplierSearchTerm}
                  onChange={(e) => setSupplierSearchTerm(e.target.value)}
                  onFocus={() => setShowSupplierDropdown(true)}
                  placeholder="Search suppliers..."
                />
                {showSupplierDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {getFilteredSuppliers(supplierSearchTerm).map(supplier => (
                      <div
                        key={supplier._id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleSupplierSelect(supplier._id)}
                      >
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-gray-600">{supplier.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Supplier Name"
                  value={formData.supplier || ''}
                  onChange={(e) => updateField('supplier', e.target.value)}
                  error={getFieldError('supplier')}
                />
                <Input
                  label="Supplier Email"
                  type="email"
                  value={formData.supplierEmail || ''}
                  onChange={(e) => updateField('supplierEmail', e.target.value)}
                />
                <Input
                  label="Address"
                  value={formData.supplierAddress?.address || ''}
                  onChange={(e) => updateField('supplierAddress.address', e.target.value)}
                />
                <Input
                  label="State"
                  value={formData.supplierAddress?.state || ''}
                  onChange={(e) => updateField('supplierAddress.state', e.target.value)}
                />
                <Input
                  label="District"
                  value={formData.supplierAddress?.district || ''}
                  onChange={(e) => updateField('supplierAddress.district', e.target.value)}
                />
                <Input
                  label="Pin Code"
                  value={formData.supplierAddress?.pincode || ''}
                  onChange={(e) => updateField('supplierAddress.pincode', e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'items' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Items</h3>
                <Button
                  onClick={addItem}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {formData.items?.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    {formData.items && formData.items.length > 1 && (
                      <Button
                        onClick={() => removeItem(index)}
                        variant="outline"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Input
                        label="Product"
                        value={productSearchTerms[index] || ''}
                        onChange={(e) => {
                          setProductSearchTerms(prev => ({ ...prev, [index]: e.target.value }));
                          setShowProductDropdowns(prev => ({ ...prev, [index]: true }));
                        }}
                        onFocus={() => setShowProductDropdowns(prev => ({ ...prev, [index]: true }))}
                        placeholder="Search products..."
                      />
                      {showProductDropdowns[index] && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {getFilteredProducts(productSearchTerms[index]).map(product => (
                            <div
                              key={product._id}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleProductSelect(index, product._id)}
                            >
                              <div className="font-medium">{product.name}</div>
                              <div className="text-sm text-gray-600">{product.category} • ₹{product.price}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Input
                      label="Description"
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                    />
                    <Input
                      label="Quantity"
                      type="number"
                      value={item.quantity || 1}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      min="1"
                    />
                    <Input
                      label="Unit Price"
                      type="number"
                      value={item.unitPrice || 0}
                      onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                    />
                    <Input
                      label="Tax Rate (%)"
                      type="number"
                      value={item.taxRate || 18}
                      onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                    />
                    <Input
                      label="Total Price"
                      type="number"
                      value={item.totalPrice || 0}
                      disabled
                    />
                    <Input
                      label="Notes"
                      value={item.notes || ''}
                      onChange={(e) => updateItem(index, 'notes', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <div className="border-t pt-4">
                <div className="text-right">
                  <div className="text-lg font-medium">
                    Total Amount: ₹{formData.totalAmount?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Ship Date"
                  type="date"
                  value={formData.shipDate || ''}
                  onChange={(e) => updateField('shipDate', e.target.value)}
                />
                <Input
                  label="Docket Number"
                  value={formData.docketNumber || ''}
                  onChange={(e) => updateField('docketNumber', e.target.value)}
                />
                <Input
                  label="Number of Packages"
                  type="number"
                  value={formData.noOfPackages || ''}
                  onChange={(e) => updateField('noOfPackages', parseInt(e.target.value) || 0)}
                  min="0"
                />
                <Input
                  label="GST Invoice Number"
                  value={formData.gstInvoiceNumber || ''}
                  onChange={(e) => updateField('gstInvoiceNumber', e.target.value)}
                />
                <Input
                  label="Invoice Date"
                  type="date"
                  value={formData.invoiceDate || ''}
                  onChange={(e) => updateField('invoiceDate', e.target.value)}
                />
                <Input
                  label="Document Number"
                  value={formData.documentNumber || ''}
                  onChange={(e) => updateField('documentNumber', e.target.value)}
                />
                <Input
                  label="Document Date"
                  type="date"
                  value={formData.documentDate || ''}
                  onChange={(e) => updateField('documentDate', e.target.value)}
                />
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter any additional notes..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms & Conditions
                </label>
                <textarea
                  value={formData.terms || ''}
                  onChange={(e) => updateField('terms', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter terms and conditions..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <Button
            onClick={onClose}
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {mode === 'create' ? 'Create' : 'Update'} Purchase Order
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DGPurchaseOrderForm; 