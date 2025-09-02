import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Package, Truck, User, MapPin, Calendar, FileText, Save, Printer, Send, ArrowLeft } from 'lucide-react';
import PageHeader from './ui/PageHeader';
import { Button } from './ui/Botton';

// Types
interface DeliveryChallanItem {
  slNo: number;
  description: string;
  partNo: string;
  hsnSac: string;
  quantity: number;
}

interface DeliveryChallan {
  _id?: string;
  challanNumber: string;
  dated: string;
  modeOfPayment: string;
  department: string;
  referenceNo: string;
  otherReferenceNo: string;
  buyersOrderNo: string;
  buyersOrderDate: string;
  dispatchDocNo: string;
  destination: string;
  dispatchedThrough: string;
  termsOfDelivery: string;
  consignee: string;
  customer: string;
  supplier: string;
  spares: DeliveryChallanItem[];
  services: DeliveryChallanItem[];
  status: 'draft' | 'sent' | 'delivered' | 'cancelled';
  notes?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  addresses?: Array<{
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
  }>;
}

interface Product {
  _id: string;
  name: string;
  partNo?: string;
  hsnNumber?: string;
  category: string;
  brand: string;
}

interface StockLocationData {
  _id: string;
  name: string;
  address: string;
  type: string;
}

const DeliveryChallanForm: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const isEditMode = Boolean(id);

  // State management
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocationData[]>([]);
  const [departments] = useState([
    'Retail', 'Corporate', 'Industrial Marine', 'Others'
  ]);
  
  const [formData, setFormData] = useState<DeliveryChallan>({
    challanNumber: '',
    dated: new Date().toISOString().split('T')[0],
    modeOfPayment: '',
    department: '',
    referenceNo: '',
    otherReferenceNo: '',
    buyersOrderNo: '',
    buyersOrderDate: '',
    dispatchDocNo: '',
    destination: '',
    dispatchedThrough: '',
    termsOfDelivery: '',
    consignee: '',
    customer: '',
    supplier: '',
    spares: [{ slNo: 1, description: '', partNo: '', hsnSac: '', quantity: 0 }],
    services: [{ slNo: 1, description: '', partNo: '', hsnSac: '', quantity: 0 }],
    status: 'draft',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown states
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<string, boolean>>({});
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [productSearchTerms, setProductSearchTerms] = useState<Record<string, string>>({});

  // Refs for click outside handling
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchCustomers(),
        fetchProducts(),
        fetchLocations()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch required data');
    }
  };

  const fetchCustomers = async () => {
    try {
      // Mock data for now - replace with actual API call
      setCustomers([
        { _id: '1', name: 'Sample Customer', email: 'customer@example.com', phone: '1234567890' }
      ]);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      // Mock data for now - replace with actual API call
      setProducts([
        { _id: '1', name: 'Sample Product', partNo: 'SP001', hsnNumber: '12345678', category: 'Spares', brand: 'Brand' }
      ]);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      // Mock data for now - replace with actual API call
      setLocations([
        { _id: '1', name: 'Main Warehouse', address: 'Chennai', type: 'Warehouse' }
      ]);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  // Form handlers
  const updateField = (field: keyof DeliveryChallan, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const updateSpareItem = (index: number, field: keyof DeliveryChallanItem, value: any) => {
    const updatedSpares = [...formData.spares];
    updatedSpares[index] = { ...updatedSpares[index], [field]: value };
    setFormData(prev => ({ ...prev, spares: updatedSpares }));
  };

  const updateServiceItem = (index: number, field: keyof DeliveryChallanItem, value: any) => {
    const updatedServices = [...formData.services];
    updatedServices[index] = { ...updatedServices[index], [field]: value };
    setFormData(prev => ({ ...prev, services: updatedServices }));
  };

  const addSpareItem = () => {
    const newSlNo = formData.spares.length + 1;
    setFormData(prev => ({
      ...prev,
      spares: [...prev.spares, { slNo: newSlNo, description: '', partNo: '', hsnSac: '', quantity: 0 }]
    }));
  };

  const removeSpareItem = (index: number) => {
    if (formData.spares.length > 1) {
      const updatedSpares = formData.spares.filter((_, i) => i !== index);
      // Reorder sl numbers
      updatedSpares.forEach((item, i) => { item.slNo = i + 1; });
      setFormData(prev => ({ ...prev, spares: updatedSpares }));
    }
  };

  const addServiceItem = () => {
    const newSlNo = formData.services.length + 1;
    setFormData(prev => ({
      ...prev,
      services: [...prev.services, { slNo: newSlNo, description: '', partNo: '', hsnSac: '', quantity: 0 }]
    }));
  };

  const removeServiceItem = (index: number) => {
    if (formData.services.length > 1) {
      const updatedServices = formData.services.filter((_, i) => i !== index);
      // Reorder sl numbers
      updatedServices.forEach((item, i) => { item.slNo = i + 1; });
      setFormData(prev => ({ ...prev, services: updatedServices }));
    }
  };

  // Customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setFormData(prev => ({ ...prev, customer: customer._id }));
    setShowCustomerDropdown(false);
    setCustomerSearchTerm(customer.name);
  };

  const getFilteredCustomers = () => {
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase())
    );
  };

  // Product selection for spares
  const handleProductSelect = (product: Product, itemIndex: number, type: 'spares' | 'services') => {
    if (type === 'spares') {
      updateSpareItem(itemIndex, 'description', product.name);
      updateSpareItem(itemIndex, 'partNo', product.partNo || '');
      updateSpareItem(itemIndex, 'hsnSac', product.hsnNumber || '');
    } else {
      updateServiceItem(itemIndex, 'description', product.name);
      updateServiceItem(itemIndex, 'partNo', product.partNo || '');
      updateServiceItem(itemIndex, 'hsnSac', product.hsnNumber || '');
    }
    
    setShowProductDropdowns(prev => ({ ...prev, [`${type}-${itemIndex}`]: false }));
  };

  const getFilteredProducts = (searchTerm: string = '') => {
    return products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.partNo && product.partNo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer) newErrors.customer = 'Customer is required';
    if (!formData.department) newErrors.department = 'Department is required';
    if (!formData.destination) newErrors.destination = 'Destination is required';
    if (!formData.dispatchedThrough) newErrors.dispatchedThrough = 'Dispatched through is required';

    // Validate spares
    formData.spares.forEach((item, index) => {
      if (!item.description) newErrors[`spare-${index}-description`] = 'Description is required';
      if (item.quantity <= 0) newErrors[`spare-${index}-quantity`] = 'Quantity must be greater than 0';
    });

    // Validate services
    formData.services.forEach((item, index) => {
      if (!item.description) newErrors[`service-${index}-description`] = 'Description is required';
      if (item.quantity <= 0) newErrors[`service-${index}-quantity`] = 'Quantity must be greater than 0';
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setSubmitting(true);
    try {
      // Mock API call for now - replace with actual API integration
      console.log('Submitting delivery challan:', formData);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(isEditMode ? 'Delivery Challan updated successfully' : 'Delivery Challan created successfully');
      navigate('/delivery-challans');
    } catch (error: any) {
      console.error('Error saving delivery challan:', error);
      toast.error(error.response?.data?.message || 'Failed to save delivery challan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      <PageHeader
        title={isEditMode ? 'Edit Delivery Challan' : 'Create New Delivery Challan'}
        subtitle="Create a delivery challan for goods and services"
      >
        <div className="flex items-center space-x-3">
          <Button
            onClick={() => navigate('/billing')}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Billing</span>
          </Button>
          <Button
            type="submit"
            form="delivery-challan-form"
            disabled={submitting}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : 'Save Challan'}</span>
          </Button>
        </div>
      </PageHeader>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <form id="delivery-challan-form" onSubmit={handleSubmit}>
          {/* Header Section */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">DELIVERY NOTE</h2>
            </div>
          </div>

          {/* Company Information */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sun Power Services */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Sun Power Services</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>D No.53, Plot No.4, 4th Street, Phase-1 Extension,</p>
                  <p>Annai Velankanni Nagar, Madhananthapuram, Porur,</p>
                  <p>Chennai - 600116</p>
                  <p>Contact: 044-24828218, 9176660123</p>
                  <p>GSTIN/UIN: 33BLFPS9951M1ZC</p>
                  <p>State: Tamil Nadu, Code: 33</p>
                  <p>Email: sunpowerservices@gmail.com</p>
                </div>
              </div>

              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Buyer (Bill to)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer *
                    </label>
                    <div className="relative" ref={customerDropdownRef}>
                      <input
                        type="text"
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        onFocus={() => setShowCustomerDropdown(true)}
                        placeholder="Search customer..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {showCustomerDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                          {getFilteredCustomers().map((customer) => (
                            <div
                              key={customer._id}
                              onClick={() => handleCustomerSelect(customer)}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-gray-500">{customer.email}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {errors.customer && <p className="text-red-500 text-sm mt-1">{errors.customer}</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delivery Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Delivery Note No.
                  </label>
                  <input
                    type="text"
                    value={formData.challanNumber}
                    onChange={(e) => updateField('challanNumber', e.target.value)}
                    placeholder="Auto Update"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dated
                  </label>
                  <input
                    type="date"
                    value={formData.dated}
                    onChange={(e) => updateField('dated', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mode/Terms of Payment
                  </label>
                  <input
                    type="text"
                    value={formData.modeOfPayment}
                    onChange={(e) => updateField('modeOfPayment', e.target.value)}
                    placeholder="Manual Entry (Alpha Numeric with sp)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => updateField('department', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  {errors.department && <p className="text-red-500 text-sm mt-1">{errors.department}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference No
                  </label>
                  <input
                    type="text"
                    value={formData.referenceNo}
                    onChange={(e) => updateField('referenceNo', e.target.value)}
                    placeholder="Manual Entry (Alpha Numeric with sp)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Reference No
                  </label>
                  <input
                    type="text"
                    value={formData.otherReferenceNo}
                    onChange={(e) => updateField('otherReferenceNo', e.target.value)}
                    placeholder="Manual Entry (Alpha Numeric with sp)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buyer's Order No.
                  </label>
                  <input
                    type="text"
                    value={formData.buyersOrderNo}
                    onChange={(e) => updateField('buyersOrderNo', e.target.value)}
                    placeholder="Manual Entry"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dated (for Buyer's Order)
                  </label>
                  <input
                    type="date"
                    value={formData.buyersOrderDate}
                    onChange={(e) => updateField('buyersOrderDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dispatch Doc No.
                  </label>
                  <input
                    type="text"
                    value={formData.dispatchDocNo}
                    onChange={(e) => updateField('dispatchDocNo', e.target.value)}
                    placeholder="Manual Entry"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Destination *
                  </label>
                  <input
                    type="text"
                    value={formData.destination}
                    onChange={(e) => updateField('destination', e.target.value)}
                    placeholder="Manual Entry"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.destination && <p className="text-red-500 text-sm mt-1">{errors.destination}</p>}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dispatched through *
                  </label>
                  <input
                    type="text"
                    value={formData.dispatchedThrough}
                    onChange={(e) => updateField('dispatchedThrough', e.target.value)}
                    placeholder="Manual Entry"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.dispatchedThrough && <p className="text-red-500 text-sm mt-1">{errors.dispatchedThrough}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Terms of Delivery
                  </label>
                  <input
                    type="text"
                    value={formData.termsOfDelivery}
                    onChange={(e) => updateField('termsOfDelivery', e.target.value)}
                    placeholder="Manual Entry"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Consignee (Ship to)
              </label>
              <input
                type="text"
                value={formData.consignee}
                onChange={(e) => updateField('consignee', e.target.value)}
                placeholder="Same As Buyer or Manual Typing"
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Spares Table */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Spares</h3>
              <button
                type="button"
                onClick={addSpareItem}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Add Item
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sl No</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description of Goods</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part No.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN/SAC</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.spares.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{item.slNo}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="relative">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateSpareItem(index, 'description', e.target.value)}
                            placeholder="Type & Search"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          {errors[`spare-${index}-description`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`spare-${index}-description`]}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.partNo}
                          onChange={(e) => updateSpareItem(index, 'partNo', e.target.value)}
                          placeholder="Type & Search"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.hsnSac}
                          onChange={(e) => updateSpareItem(index, 'hsnSac', e.target.value)}
                          placeholder="Auto select"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateSpareItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {errors[`spare-${index}-quantity`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`spare-${index}-quantity`]}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formData.spares.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSpareItem(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Services Table */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Service</h3>
              <button
                type="button"
                onClick={addServiceItem}
                className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
              >
                Add Service
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sl No</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description of Goods</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part No.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HSN/SAC</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.services.map((item, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{item.slNo}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="relative">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateServiceItem(index, 'description', e.target.value)}
                            placeholder="Manual (For service purpose)"
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          {errors[`service-${index}-description`] && (
                            <p className="text-red-500 text-xs mt-1">{errors[`service-${index}-description`]}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.partNo}
                          onChange={(e) => updateServiceItem(index, 'partNo', e.target.value)}
                          placeholder="Manual"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input
                          type="text"
                          value={item.hsnSac}
                          onChange={(e) => updateServiceItem(index, 'hsnSac', e.target.value)}
                          placeholder="Manual"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateServiceItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          min="0"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {errors[`service-${index}-quantity`] && (
                          <p className="text-red-500 text-xs mt-1">{errors[`service-${index}-quantity`]}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formData.services.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeServiceItem(index)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={3}
                  placeholder="Additional notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-end justify-end">
                <div className="text-sm text-gray-600">
                  <p>Company's PAN: BLFPS9951M</p>
                  <p className="mt-2">Recd. in Good Condition: _________________</p>
                  <p className="mt-4 text-right">E & OE</p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeliveryChallanForm; 