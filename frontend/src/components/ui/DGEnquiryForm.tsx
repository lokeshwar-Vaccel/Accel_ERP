import React, { useState, useEffect } from 'react';
import { X, Save, User, Building, Phone, Mail, MapPin, Settings, FileText } from 'lucide-react';
import { Button } from './Botton';
import { Input } from './Input';
import { Select } from './Select';
import { toast } from 'react-hot-toast';
import apiClient from '../../utils/api';

interface DGEnquiryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
  mode: 'create' | 'edit';
}

interface EnquiryFormData {
  // Basic Information
  enquiryNo: string;
  enquiryDate: string;
  enquiryStatus: string;
  enquiryType: string;
  enquiryStage: string;
  source: string;
  
  // Customer Information
  customerType: string;
  corporateName: string;
  customerName: string;
  phoneNumber: string;
  email: string;
  
  // Address Information
  address: string;
  pincode: string;
  tehsil: string;
  district: string;
  state: string;
  
  // DG Requirements
  kva: string;
  phase: string;
  quantity: string;
  segment: string;
  subSegment: string;
  dgOwnership: string;
  financeRequired: boolean;
  financeCompany: string;
  
  // Employee Information
  assignedEmployeeCode: string;
  assignedEmployeeName: string;
  employeeStatus: string;
  referenceEmployeeName: string;
  referenceEmployeeMobileNumber: string;
  referredBy: string;
  
  // Additional Information
  events: string;
  remarks: string;
}

const initialFormData: EnquiryFormData = {
  // Basic Information
  enquiryNo: '',
  enquiryDate: new Date().toISOString().split('T')[0],
  enquiryStatus: 'Open',
  enquiryType: 'New',
  enquiryStage: 'Initial',
  source: 'Website',
  
  // Customer Information
  customerType: 'Retail',
  corporateName: '',
  customerName: '',
  phoneNumber: '',
  email: '',
  
  // Address Information
  address: '',
  pincode: '',
  tehsil: '',
  district: '',
  state: '',
  
  // DG Requirements
  kva: '',
      phase: 'Three Phase',
    quantity: '1',
    segment: 'Manufacturing',
    subSegment: '',
  dgOwnership: 'NOT_OWNED',
  financeRequired: false,
  financeCompany: '',
  
  // Employee Information
  assignedEmployeeCode: '',
  assignedEmployeeName: '',
  employeeStatus: '',
  referenceEmployeeName: '',
  referenceEmployeeMobileNumber: '',
  referredBy: '',
  
  // Additional Information
  events: '',
  remarks: ''
};

export default function DGEnquiryForm({ isOpen, onClose, onSuccess, initialData, mode }: DGEnquiryFormProps) {
  const [formData, setFormData] = useState<EnquiryFormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<EnquiryFormData>>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  console.log('formData3434', formData);

  useEffect(() => {
    if (initialData && mode === 'edit') {
      console.log('Setting form data for edit mode:', initialData);
      
      // Handle date conversion properly
      let enquiryDate = new Date().toISOString().split('T')[0];
      if (initialData.enquiryDate) {
        try {
          const date = new Date(initialData.enquiryDate);
          if (!isNaN(date.getTime())) {
            enquiryDate = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Invalid enquiry date:', initialData.enquiryDate);
        }
      }

      setFormData({
        enquiryNo: initialData.enquiryNo || '',
        enquiryDate: enquiryDate,
        enquiryStatus: initialData.enquiryStatus || 'Open',
        enquiryType: initialData.enquiryType || 'New',
        enquiryStage: initialData.enquiryStage || 'Initial',
        source: initialData.source || 'Website',
        customerType: initialData.customerType || 'Retail',
        corporateName: initialData.corporateName || '',
        customerName: initialData.customerName || '',
        phoneNumber: initialData.phoneNumber || '',
        email: initialData.email || '',
        address: initialData.address || '',
        pincode: initialData.pincode || '',
        tehsil: initialData.tehsil || '',
        district: initialData.district || '',
        state: initialData.state || '',
        kva: initialData.kva ? String(initialData.kva) : '',
        phase: initialData.phase || 'Three Phase',
        quantity: initialData.quantity ? String(initialData.quantity) : '1',
        segment: initialData.segment || 'Manufacturing',
        subSegment: initialData.subSegment || '',
        dgOwnership: initialData.dgOwnership || 'NOT_OWNED',
        financeRequired: Boolean(initialData.financeRequired),
        financeCompany: initialData.financeCompany || '',
        assignedEmployeeCode: initialData.assignedEmployeeCode || '',
        assignedEmployeeName: initialData.assignedEmployeeName || '',
        employeeStatus: initialData.employeeStatus || '',
        referenceEmployeeName: initialData.referenceEmployeeName || '',
        referenceEmployeeMobileNumber: initialData.referenceEmployeeMobileNumber || '',
        referredBy: initialData.referredBy || '',
        events: initialData.events || '',
        remarks: initialData.remarks || ''
      });
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [initialData, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<EnquiryFormData> = {};

    // Basic Information Validation
    if (!formData.enquiryNo.trim()) {
      newErrors.enquiryNo = 'Enquiry number is required';
    }

    if (!formData.enquiryDate) {
      newErrors.enquiryDate = 'Enquiry date is required';
    }

    // For edit mode, don't validate enquiry number if it's the same as original
    if (mode === 'edit' && initialData?.enquiryNo === formData.enquiryNo) {
      delete newErrors.enquiryNo;
    }

    // Customer Information Validation
    if (formData.customerType === 'Corporate' && !formData.corporateName.trim()) {
      newErrors.corporateName = 'Corporate name is required for corporate customers';
    }

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(formData.phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Address Validation
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    // if (!formData.pincode.trim()) {
    //   newErrors.pincode = 'Pincode is required';
    // } else if (!/^\d{6}$/.test(formData.pincode)) {
    //   newErrors.pincode = 'Pincode must be 6 digits';
    // }

    if (!formData.district.trim()) {
      newErrors.district = 'District is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    // DG Requirements Validation
    if (!formData.kva.trim()) {
      newErrors.kva = 'KVA is required';
    } else if (!/^\d+$/.test(formData.kva)) {
      newErrors.kva = 'KVA must be a number';
    }

    if (!formData.quantity.trim()) {
      newErrors.quantity = 'Quantity is required';
    } else if (!/^\d+$/.test(formData.quantity)) {
      newErrors.quantity = 'Quantity must be a number';
    }

    // if (formData.financeRequired && !formData.financeCompany.trim()) {
    //   newErrors.financeCompany = 'Finance company is required when finance is needed';
    // }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) {
      return;
    }
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoading(true);
    try {
      // Prepare the payload with proper data transformation
      const payload = {
        // Basic Information
        enquiryNo: formData.enquiryNo.trim(),
        enquiryDate: new Date(formData.enquiryDate), // Convert to Date object
        enquiryStatus: formData.enquiryStatus,
        enquiryType: formData.enquiryType,
        enquiryStage: formData.enquiryStage,
        source: formData.source,
        
        // Customer Information
        customerType: formData.customerType,
        corporateName: formData.corporateName.trim() || undefined,
        customerName: formData.customerName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        email: formData.email.trim() || undefined,
        
        // Address Information
        address: formData.address.trim(),
        pincode: formData.pincode.trim(),
        tehsil: formData.tehsil.trim() || undefined,
        district: formData.district.trim(),
        state: formData.state.trim(),
        
        // DG Requirements
        kva: parseInt(formData.kva) || 0,
        phase: formData.phase || 'Three Phase',
        quantity: parseInt(formData.quantity) || 1,
        segment: formData.segment || 'Manufacturing',
        subSegment: formData.subSegment.trim() || undefined,
        dgOwnership: formData.dgOwnership,
        financeRequired: Boolean(formData.financeRequired),
        financeCompany: formData.financeCompany.trim() || undefined,
        
        // Employee Information
        assignedEmployeeCode: formData.assignedEmployeeCode.trim() || undefined,
        assignedEmployeeName: formData.assignedEmployeeName.trim() || undefined,
        employeeStatus: formData.employeeStatus || undefined,
        referenceEmployeeName: formData.referenceEmployeeName.trim() || undefined,
        referenceEmployeeMobileNumber: formData.referenceEmployeeMobileNumber.trim() || undefined,
        referredBy: formData.referredBy.trim() || undefined,
        
        // Additional Information
        events: formData.events.trim() || undefined,
        remarks: formData.remarks.trim() || undefined
      };

      let response;
      
      if (mode === 'create') {
        // Create new enquiry
        console.log('Creating new enquiry with payload:', payload);
        response = await apiClient.dgSales.enquiries.create(payload);
        console.log('Create response:', response);
        
        if (response.success) {
          toast.success('Enquiry created successfully!');
        } else {
          throw new Error('Failed to create enquiry');
        }
      } else {
        // Update existing enquiry
        if (!initialData?._id) {
          console.error('No enquiry ID found in initialData:', initialData);
          throw new Error('Enquiry ID is required for update');
        }
        console.log('Updating enquiry with ID:', initialData._id, 'payload:', payload);
        response = await apiClient.dgSales.enquiries.update(initialData._id, payload);
        console.log('Update response:', response);
        
        if (response.success) {
          toast.success('Enquiry updated successfully!');
        } else {
          throw new Error('Failed to update enquiry');
        }
      }

      // Close modal and refresh data
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Error saving enquiry:', error);
      
      // Handle different types of errors
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.message || 
                           error.response.data?.error || 
                           `Server error: ${error.response.status}`;
        toast.error(errorMessage);
        
        // Handle validation errors from server
        if (error.response.data?.errors) {
          const serverErrors = error.response.data.errors;
          const newErrors: Partial<EnquiryFormData> = {};
          
          // Map server errors to form fields
          Object.keys(serverErrors).forEach(field => {
            const formField = field as keyof EnquiryFormData;
            if (serverErrors[field] && Array.isArray(serverErrors[field])) {
              newErrors[formField] = serverErrors[field][0];
            }
          });
          
          setErrors(newErrors);
        }
      } else if (error.request) {
        // Network error
        toast.error('Network error. Please check your connection and try again.');
      } else {
        // Other errors
        toast.error(error.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof EnquiryFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'customer', label: 'Customer', icon: User },
    { id: 'address', label: 'Address', icon: MapPin },
    { id: 'dg-requirements', label: 'DG Requirements', icon: Settings },
    { id: 'employee', label: 'Employee', icon: User },
    { id: 'additional', label: 'Additional', icon: FileText }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {mode === 'create' ? 'Create New DG Enquiry' : 'Edit DG Enquiry'}
            </h2>
            <p className="text-gray-600 mt-1">
              {mode === 'create' ? 'Add a new enquiry to the system' : 'Update enquiry information'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 px-6">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className="w-4 h-4 inline mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[60vh]">
          <div className="p-6">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enquiry Number *
                    </label>
                    <Input
                      value={formData.enquiryNo}
                      onChange={(e) => handleInputChange('enquiryNo', e.target.value)}
                      placeholder="Enter enquiry number"
                      error={errors.enquiryNo}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enquiry Date *
                    </label>
                    <Input
                      type="date"
                      value={formData.enquiryDate}
                      onChange={(e) => handleInputChange('enquiryDate', e.target.value)}
                      error={errors.enquiryDate}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enquiry Status
                    </label>
                    <Select
                      value={formData.enquiryStatus}
                      onChange={(value) => handleInputChange('enquiryStatus', value)}
                      options={[
                        { value: 'Open', label: 'Open' },
                        { value: 'In Progress', label: 'In Progress' },
                        { value: 'Closed', label: 'Closed' },
                        { value: 'Cancelled', label: 'Cancelled' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enquiry Type
                    </label>
                    <Select
                      value={formData.enquiryType}
                      onChange={(value) => handleInputChange('enquiryType', value)}
                      options={[
                        { value: 'New', label: 'New' },
                        { value: 'Follow Up', label: 'Follow Up' },
                        { value: 'Renewal', label: 'Renewal' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enquiry Stage
                    </label>
                    <Select
                      value={formData.enquiryStage}
                      onChange={(value) => handleInputChange('enquiryStage', value)}
                      options={[
                        { value: 'Initial', label: 'Initial' },
                        { value: 'Quotation', label: 'Quotation' },
                        { value: 'Negotiation', label: 'Negotiation' },
                        { value: 'Order', label: 'Order' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source
                    </label>
                    <Select
                      value={formData.source}
                      onChange={(value) => handleInputChange('source', value)}
                      options={[
                        { value: 'Website', label: 'Website' },
                        { value: 'Referral', label: 'Referral' },
                        { value: 'Cold Call', label: 'Cold Call' },
                        { value: 'Social Media', label: 'Social Media' },
                        { value: 'Other', label: 'Other' }
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Customer Information Tab */}
            {activeTab === 'customer' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Type
                    </label>
                    <Select
                      value={formData.customerType}
                      onChange={(value) => handleInputChange('customerType', value)}
                      options={[
                        { value: 'Retail', label: 'Retail' },
                        { value: 'Corporate', label: 'Corporate' }
                      ]}
                    />
                  </div>

                  {formData.customerType === 'Corporate' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Corporate Name *
                      </label>
                      <Input
                        value={formData.corporateName}
                        onChange={(e) => handleInputChange('corporateName', e.target.value)}
                        placeholder="Enter corporate name"
                        error={errors.corporateName}
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name *
                    </label>
                    <Input
                      value={formData.customerName}
                      onChange={(e) => handleInputChange('customerName', e.target.value)}
                      placeholder="Enter customer name"
                      error={errors.customerName}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <Input
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      placeholder="Enter phone number"
                      error={errors.phoneNumber}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Enter email address"
                      error={errors.email}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Address Information Tab */}
            {activeTab === 'address' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address *
                    </label>
                    <textarea
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Enter complete address"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.address ? 'border-red-500' : 'border-gray-300'
                      }`}
                      rows={3}
                    />
                    {errors.address && (
                      <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pincode *
                    </label>
                    <Input
                      value={formData.pincode}
                      onChange={(e) => handleInputChange('pincode', e.target.value)}
                      placeholder="Enter pincode"
                      error={errors.pincode}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tehsil
                    </label>
                    <Input
                      value={formData.tehsil}
                      onChange={(e) => handleInputChange('tehsil', e.target.value)}
                      placeholder="Enter tehsil"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      District *
                    </label>
                    <Input
                      value={formData.district}
                      onChange={(e) => handleInputChange('district', e.target.value)}
                      placeholder="Enter district"
                      error={errors.district}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      State *
                    </label>
                    <Input
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="Enter state"
                      error={errors.state}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DG Requirements Tab */}
            {activeTab === 'dg-requirements' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">DG Requirements</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      KVA *
                    </label>
                    <Input
                      value={formData.kva}
                      onChange={(e) => handleInputChange('kva', e.target.value)}
                      placeholder="Enter KVA"
                      error={errors.kva}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phase
                    </label>
                    <Select
                      value={formData.phase}
                      onChange={(value) => handleInputChange('phase', value)}
                      options={[
                        { value: 'Single Phase', label: 'Single Phase' },
                        { value: 'Three Phase', label: 'Three Phase' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity *
                    </label>
                    <Input
                      value={formData.quantity}
                      onChange={(e) => handleInputChange('quantity', e.target.value)}
                      placeholder="Enter quantity"
                      error={errors.quantity}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Segment
                    </label>
                    <Select
                      value={formData.segment}
                      onChange={(value) => handleInputChange('segment', value)}
                      options={[
                        { value: 'Manufacturing', label: 'Manufacturing' },
                        { value: 'IT/Office', label: 'IT/Office' },
                        { value: 'Healthcare', label: 'Healthcare' },
                        { value: 'Education', label: 'Education' },
                        { value: 'Retail', label: 'Retail' },
                        { value: 'Other', label: 'Other' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sub Segment
                    </label>
                    <Input
                      value={formData.subSegment}
                      onChange={(e) => handleInputChange('subSegment', e.target.value)}
                      placeholder="Enter sub segment"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      DG Ownership
                    </label>
                    <Select
                      value={formData.dgOwnership}
                      onChange={(value) => handleInputChange('dgOwnership', value)}
                      options={[
                        { value: 'NOT_OWNED', label: 'Not Owned' },
                        { value: 'OWNED', label: 'Owned' },
                        { value: 'RENTED', label: 'Rented' }
                      ]}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.financeRequired}
                        onChange={(e) => handleInputChange('financeRequired', e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Finance Required
                      </span>
                    </label>
                  </div>

                  {formData.financeRequired && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Finance Company *
                      </label>
                      <Input
                        value={formData.financeCompany}
                        onChange={(e) => handleInputChange('financeCompany', e.target.value)}
                        placeholder="Enter finance company"
                        error={errors.financeCompany}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Employee Information Tab */}
            {activeTab === 'employee' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Employee Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Employee Code
                    </label>
                    <Input
                      value={formData.assignedEmployeeCode}
                      onChange={(e) => handleInputChange('assignedEmployeeCode', e.target.value)}
                      placeholder="Enter employee code"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Employee Name
                    </label>
                    <Input
                      value={formData.assignedEmployeeName}
                      onChange={(e) => handleInputChange('assignedEmployeeName', e.target.value)}
                      placeholder="Enter employee name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee Status
                    </label>
                    <Select
                      value={formData.employeeStatus}
                      onChange={(value) => handleInputChange('employeeStatus', value)}
                      options={[
                        { value: 'Active', label: 'Active' },
                        { value: 'Inactive', label: 'Inactive' },
                        { value: 'On Leave', label: 'On Leave' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Employee Name
                    </label>
                    <Input
                      value={formData.referenceEmployeeName}
                      onChange={(e) => handleInputChange('referenceEmployeeName', e.target.value)}
                      placeholder="Enter reference employee name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reference Employee Mobile
                    </label>
                    <Input
                      value={formData.referenceEmployeeMobileNumber}
                      onChange={(e) => handleInputChange('referenceEmployeeMobileNumber', e.target.value)}
                      placeholder="Enter reference employee mobile"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Referred By
                    </label>
                    <Input
                      value={formData.referredBy}
                      onChange={(e) => handleInputChange('referredBy', e.target.value)}
                      placeholder="Enter referral source"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Information Tab */}
            {activeTab === 'additional' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Events
                    </label>
                    <textarea
                      value={formData.events}
                      onChange={(e) => handleInputChange('events', e.target.value)}
                      placeholder="Enter any events or special requirements"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Remarks
                    </label>
                    <textarea
                      value={formData.remarks}
                      onChange={(e) => handleInputChange('remarks', e.target.value)}
                      placeholder="Enter any additional remarks"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex space-x-2">
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-xs rounded-full ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={loading}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? 'Create Enquiry' : 'Update Enquiry'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 