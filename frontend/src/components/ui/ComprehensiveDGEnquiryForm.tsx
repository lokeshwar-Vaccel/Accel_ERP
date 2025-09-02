import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Settings, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from './Botton';
import { Input } from './Input';
import { Select } from './Select';
import { toast } from 'react-hot-toast';
import apiClient from '../../utils/api';

interface ComprehensiveDGEnquiryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
  mode: 'create' | 'edit';
}

interface Address {
  id: number;
  address: string;
  state: string;
  district: string;
  pincode: string;
  isPrimary: boolean;
  gstNumber?: string;
  notes?: string;
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
  alice?: string;
  designation?: string;
  contactPersonName: string;
  phoneNumber: string;
  email: string;
  panNumber: string;
  
  // Address Information
  addresses: Address[];
  
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
  notes: string;
}

interface EnquiryFormErrors {
  enquiryNo?: string;
  enquiryDate?: string;
  enquiryStatus?: string;
  enquiryType?: string;
  enquiryStage?: string;
  source?: string;
  customerType?: string;
  corporateName?: string;
  customerName?: string;
  phoneNumber?: string;
  addresses?: string | Record<number, string>;
  kva?: string;
  quantity?: string;
  phase?: string;
  dgOwnership?: string;
  segment?: string;
  employeeStatus?: string;
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
  alice: '',
  designation: '',
  contactPersonName: '',
  phoneNumber: '',
  email: '',
  panNumber: '',
  
  // Address Information
  addresses: [{
    id: 1,
    address: '',
    state: '',
    district: '',
    pincode: '',
    isPrimary: true,
    gstNumber: '',
    notes: ''
  }],
  
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
  employeeStatus: 'Active',
  referenceEmployeeName: '',
  referenceEmployeeMobileNumber: '',
  referredBy: '',
  
  // Additional Information
  events: '',
  remarks: '',
  notes: '',
};

export default function ComprehensiveDGEnquiryForm({ isOpen, onClose, onSuccess, initialData, mode }: ComprehensiveDGEnquiryFormProps) {
  const [formData, setFormData] = useState<EnquiryFormData>(initialFormData);
  const [errors, setErrors] = useState<EnquiryFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  useEffect(() => {
    if (initialData && mode === 'edit') {
      console.log('Edit mode - initial data:', initialData);
      
      // Handle edit mode data population
      const editFormData = {
        ...initialFormData,
        ...initialData,
        // Handle addresses properly for edit mode
        addresses: initialData.addresses && initialData.addresses.length > 0 
          ? initialData.addresses.map((addr: any, index: number) => ({
              id: addr.id || index + 1,
              address: addr.address || '',
              state: addr.state || '',
              district: addr.district || '',
              pincode: addr.pincode || '',
              isPrimary: addr.isPrimary || index === 0,
              gstNumber: addr.gstNumber || '',
              notes: addr.notes || ''
            }))
          : [{
              id: 1,
              address: initialData.address || '',
              state: initialData.state || '',
              district: initialData.district || '',
              pincode: initialData.pincode || '',
              isPrimary: true,
              gstNumber: '',
              notes: ''
            }],
        // Ensure required fields have fallback values
        enquiryStatus: initialData.enquiryStatus || 'Open',
        enquiryType: initialData.enquiryType || 'New',
        enquiryStage: initialData.enquiryStage || 'Initial',
        source: initialData.source || 'Website',
        customerType: initialData.customerType || 'Retail',
        phase: initialData.phase || 'Three Phase',
        dgOwnership: initialData.dgOwnership || 'NOT_OWNED',
        segment: initialData.segment || 'Manufacturing',
        employeeStatus: initialData.employeeStatus || 'Active',
        // Ensure numeric fields are strings for form handling
        kva: String(initialData.kva || ''),
        quantity: String(initialData.quantity || '1'),
        // Handle enquiry date properly for HTML date input
        enquiryDate: initialData.enquiryDate ? 
          (typeof initialData.enquiryDate === 'string' ? 
            initialData.enquiryDate.split('T')[0] : 
            new Date(initialData.enquiryDate).toISOString().split('T')[0]
          ) : 
          new Date().toISOString().split('T')[0]
      };
      
      console.log('Edit mode - processed form data:', editFormData);
      console.log('Initial enquiryDate:', initialData.enquiryDate, 'type:', typeof initialData.enquiryDate);
      console.log('Processed enquiryDate:', editFormData.enquiryDate, 'type:', typeof editFormData.enquiryDate);
      setFormData(editFormData);
    } else {
      setFormData(initialFormData);
    }
    setErrors({});
  }, [initialData, mode, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: EnquiryFormErrors = {};

    // Basic Information Validation
    if (!formData.enquiryNo.trim()) {
      newErrors.enquiryNo = 'Enquiry number is required';
    }

    if (!formData.enquiryDate) {
      newErrors.enquiryDate = 'Enquiry date is required';
    }

    // Validate required enum fields
    if (!formData.enquiryStatus || !['Open', 'In Progress', 'Closed', 'Cancelled', 'Qualified'].includes(formData.enquiryStatus)) {
      newErrors.enquiryStatus = 'Valid enquiry status is required';
    }

    if (!formData.enquiryType || !['New', 'Follow Up', 'Renewal'].includes(formData.enquiryType)) {
      newErrors.enquiryType = 'Valid enquiry type is required';
    }

    if (!formData.enquiryStage || !['Initial', 'Quotation', 'Negotiation', 'Order'].includes(formData.enquiryStage)) {
      newErrors.enquiryStage = 'Valid enquiry stage is required';
    }

    if (!formData.source || !['Website', 'Referral', 'Cold Call', 'Social Media', 'Other'].includes(formData.source)) {
      newErrors.source = 'Valid source is required';
    }

    if (!formData.customerType || !['Retail', 'Corporate'].includes(formData.customerType)) {
      newErrors.customerType = 'Valid customer type is required';
    }

    if (!formData.phase || !['Single Phase', 'Three Phase'].includes(formData.phase)) {
      newErrors.phase = 'Valid phase is required';
    }

    if (!formData.dgOwnership || !['NOT_OWNED', 'OWNED', 'RENTED'].includes(formData.dgOwnership)) {
      newErrors.dgOwnership = 'Valid DG ownership is required';
    }

    if (!formData.segment || !['Manufacturing', 'IT/Office', 'Healthcare', 'Education', 'Retail', 'Other'].includes(formData.segment)) {
      newErrors.segment = 'Valid segment is required';
    }

    if (!formData.employeeStatus || !['Active', 'Inactive', 'On Leave'].includes(formData.employeeStatus)) {
      newErrors.employeeStatus = 'Valid employee status is required';
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
    }

    // Address Validation
    if (!formData.addresses.length) {
      newErrors.addresses = 'At least one address is required';
    } else {
      const addressErrors: Record<number, string> = {};
      let hasAddressErrors = false;
      
      formData.addresses.forEach((addr, index) => {
        const addrErrors: string[] = [];
        
        if (!addr.address.trim()) {
          addrErrors.push('Address is required');
        }
        if (!addr.state.trim()) {
          addrErrors.push('State is required');
        }
        if (!addr.district.trim()) {
          addrErrors.push('District is required');
        }
        
        if (addrErrors.length > 0) {
          addressErrors[index] = addrErrors.join(', ');
          hasAddressErrors = true;
        }
      });
      
      if (hasAddressErrors) {
        newErrors.addresses = addressErrors;
      }
    }

    // DG Requirements Validation
    if (!formData.kva || !String(formData.kva).trim()) {
      newErrors.kva = 'KVA is required';
    } else if (!/^\d+$/.test(String(formData.kva))) {
      newErrors.kva = 'KVA must be a number';
    }

    if (!formData.quantity || !String(formData.quantity).trim()) {
      newErrors.quantity = 'Quantity is required';
    } else if (!/^\d+$/.test(String(formData.quantity))) {
      newErrors.quantity = 'Quantity must be a number';
    }

    console.log('Validation errors found:', newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const testFormData = () => {
    console.log('=== FORM DATA TEST ===');
    console.log('Mode:', mode);
    console.log('Initial Data:', initialData);
    console.log('Current Form Data:', formData);
    console.log('Form Errors:', errors);
    console.log('enquiryStatus:', formData.enquiryStatus, 'type:', typeof formData.enquiryStatus);
    console.log('enquiryDate:', formData.enquiryDate, 'type:', typeof formData.enquiryDate);
    console.log('segment:', formData.segment, 'type:', typeof formData.segment);
    console.log('enquiryType:', formData.enquiryType, 'type:', typeof formData.enquiryType);
    console.log('enquiryStage:', formData.enquiryStage, 'type:', typeof formData.enquiryStage);
    console.log('source:', formData.source, 'type:', typeof formData.source);
    console.log('customerType:', formData.customerType, 'type:', typeof formData.customerType);
    console.log('phase:', formData.phase, 'type:', typeof formData.phase);
    console.log('dgOwnership:', formData.dgOwnership, 'type:', typeof formData.dgOwnership);
    console.log('employeeStatus:', formData.employeeStatus, 'type:', typeof formData.employeeStatus);
    console.log('kva:', formData.kva, 'type:', typeof formData.kva);
    console.log('quantity:', formData.quantity, 'type:', typeof formData.quantity);
    console.log('Addresses:', formData.addresses);
    console.log('=== END TEST ===');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setLoading(true);
    try {
      // Transform form data and handle optional fields
      const payload: any = {
        enquiryNo: formData.enquiryNo.trim(),
        enquiryDate: new Date(formData.enquiryDate),
        enquiryStatus: formData.enquiryStatus || 'Open',
        enquiryType: formData.enquiryType || 'New',
        enquiryStage: formData.enquiryStage || 'Initial',
        source: formData.source || 'Website',
        customerType: formData.customerType || 'Retail',
        customerName: formData.customerName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        kva: parseInt(formData.kva) || 0,
        quantity: parseInt(formData.quantity) || 1,
        phase: formData.phase || 'Three Phase',
        dgOwnership: formData.dgOwnership || 'NOT_OWNED',
        financeRequired: Boolean(formData.financeRequired),
        numberOfDG: 1,
        addresses: formData.addresses.map(addr => ({
          id: addr.id,
          address: addr.address.trim(),
          state: addr.state.trim(),
          district: addr.district.trim(),
          isPrimary: addr.isPrimary,
          ...(addr.pincode?.trim() && { pincode: addr.pincode.trim() }),
          ...(addr.gstNumber?.trim() && { gstNumber: addr.gstNumber.trim() }),
          ...(addr.notes?.trim() && { notes: addr.notes.trim() })
        }))
      };

      // Add optional fields only if they have values
      if (formData.corporateName?.trim()) {
        payload.corporateName = formData.corporateName.trim();
      }
      if (formData.alice?.trim()) {
        payload.alice = formData.alice.trim();
      }
      if (formData.designation?.trim()) {
        payload.designation = formData.designation.trim();
      }
      if (formData.contactPersonName?.trim()) {
        payload.contactPersonName = formData.contactPersonName.trim();
      }
      if (formData.email?.trim()) {
        payload.email = formData.email.trim();
      }
      if (formData.panNumber?.trim()) {
        payload.panNumber = formData.panNumber.trim();
      }
      payload.segment = formData.segment || 'Manufacturing';
      if (formData.subSegment?.trim()) {
        payload.subSegment = formData.subSegment.trim();
      }
      if (formData.financeCompany?.trim()) {
        payload.financeCompany = formData.financeCompany.trim();
      }
      if (formData.assignedEmployeeCode?.trim()) {
        payload.assignedEmployeeCode = formData.assignedEmployeeCode.trim();
      }
      if (formData.assignedEmployeeName?.trim()) {
        payload.assignedEmployeeName = formData.assignedEmployeeName.trim();
      }
      payload.employeeStatus = formData.employeeStatus || 'Active';
      if (formData.referenceEmployeeName?.trim()) {
        payload.referenceEmployeeName = formData.referenceEmployeeName.trim();
      }
      if (formData.referenceEmployeeMobileNumber?.trim()) {
        payload.referenceEmployeeMobileNumber = formData.referenceEmployeeMobileNumber.trim();
      }
      if (formData.referredBy?.trim()) {
        payload.referredBy = formData.referredBy.trim();
      }
      if (formData.events?.trim()) {
        payload.events = formData.events.trim();
      }
      if (formData.remarks?.trim()) {
        payload.remarks = formData.remarks.trim();
      }
      if (formData.notes?.trim()) {
        payload.notes = formData.notes.trim();
      }

      // Debug logging
      console.log('Form Data:', formData);
      console.log('Payload being sent:', payload);
      console.log('enquiryStatus type:', typeof payload.enquiryStatus, 'value:', payload.enquiryStatus);
      console.log('segment type:', typeof payload.segment, 'value:', payload.segment);
      console.log('enquiryType type:', typeof payload.enquiryType, 'value:', payload.enquiryType);
      console.log('enquiryStage type:', typeof payload.enquiryStage, 'value:', payload.enquiryStage);
      console.log('source type:', typeof payload.source, 'value:', payload.source);
      console.log('customerType type:', typeof payload.customerType, 'value:', payload.customerType);
      console.log('phase type:', typeof payload.phase, 'value:', payload.phase);
      console.log('dgOwnership type:', typeof payload.dgOwnership, 'value:', payload.dgOwnership);
      console.log('employeeStatus type:', typeof payload.employeeStatus, 'value:', payload.employeeStatus);

      let response;
      
      if (mode === 'create') {
        console.log('Creating new DG Enquiry...');
        response = await apiClient.dgSales.enquiries.create(payload);
        if (response.success) {
          toast.success('DG Enquiry and Customer created successfully!');
        }
      } else {
        console.log('Updating existing DG Enquiry...');
        console.log('Enquiry ID:', initialData?._id);
        console.log('Update payload:', payload);
        
        if (!initialData?._id) {
          throw new Error('Enquiry ID is required for update');
        }
        
        try {
          response = await apiClient.dgSales.enquiries.update(initialData._id, payload);
          console.log('Update response:', response);
          
          if (response.success) {
            toast.success('Enquiry updated successfully!');
          } else {
            console.error('Update failed:', response);
            toast.error('Failed to update enquiry');
          }
        } catch (updateError: any) {
          console.error('Update API error:', updateError);
          throw updateError;
        }
      }

      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error('Error saving enquiry:', error);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('An unexpected error occurred. Please try again.');
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
    
    // Clear error when user starts typing - only for fields that exist in errors
    if (errors[field as keyof EnquiryFormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field as keyof EnquiryFormErrors]: undefined
      }));
    }
  };

  const addAddress = () => {
    const newAddress: Address = {
      id: Date.now(),
      address: '',
      state: '',
      district: '',
      pincode: '',
      isPrimary: false,
      gstNumber: '',
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      addresses: [...prev.addresses, newAddress]
    }));
  };

  const removeAddress = (addressId: number) => {
    if (formData.addresses.length === 1) return;
    const updatedAddresses = formData.addresses.filter(addr => addr.id !== addressId);
    if (formData.addresses.find(addr => addr.id === addressId)?.isPrimary) {
      updatedAddresses[0].isPrimary = true;
    }
    setFormData(prev => ({
      ...prev,
      addresses: updatedAddresses
    }));
  };

  const updateAddress = (addressId: number, field: keyof Address, value: string | boolean) => {
    const updatedAddresses = formData.addresses.map(addr => {
      if (addr.id === addressId) {
        return { ...addr, [field]: value };
      }
      return addr;
    });
    setFormData(prev => ({
      ...prev,
      addresses: updatedAddresses
    }));
  };

  const setPrimaryAddress = (addressId: number) => {
    const updatedAddresses = formData.addresses.map(addr => ({
      ...addr,
      isPrimary: addr.id === addressId
    }));
    setFormData(prev => ({
      ...prev,
      addresses: updatedAddresses
    }));
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl m-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {mode === 'create' ? 'Create New DG Enquiry & Customer' : 'Edit DG Enquiry'}
            </h2>
            <p className="text-gray-600 mt-1">
              {mode === 'create' ? 'Add a new enquiry and create customer in the system' : 'Update enquiry information'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-1 px-6 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
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
          {/* Validation Error Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Please fix the following errors before submitting:
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {Object.entries(errors).map(([field, error]) => (
                        <li key={field}>
                          {field}: {typeof error === 'string' ? error : 'Please check this field'}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          
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
                      onChange={(e) => handleInputChange('enquiryStatus', e.target.value)}
                      options={[
                        { value: 'Open', label: 'Open' },
                        { value: 'In Progress', label: 'In Progress' },
                        { value: 'Closed', label: 'Closed' },
                        { value: 'Cancelled', label: 'Cancelled' },
                        { value: 'Qualified', label: 'Qualified' }
                      ]}
                      error={errors.enquiryStatus}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enquiry Type
                    </label>
                    <Select
                      value={formData.enquiryType}
                      onChange={(e) => handleInputChange('enquiryType', e.target.value)}
                      options={[
                        { value: 'New', label: 'New' },
                        { value: 'Follow Up', label: 'Follow Up' },
                        { value: 'Renewal', label: 'Renewal' }
                      ]}
                      error={errors.enquiryType}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enquiry Stage
                    </label>
                    <Select
                      value={formData.enquiryStage}
                      onChange={(e) => handleInputChange('enquiryStage', e.target.value)}
                      options={[
                        { value: 'Initial', label: 'Initial' },
                        { value: 'Quotation', label: 'Quotation' },
                        { value: 'Negotiation', label: 'Negotiation' },
                        { value: 'Order', label: 'Order' }
                      ]}
                      error={errors.enquiryStage}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Source
                    </label>
                    <Select
                      value={formData.source}
                      onChange={(e) => handleInputChange('source', e.target.value)}
                      options={[
                        { value: 'Website', label: 'Website' },
                        { value: 'Referral', label: 'Referral' },
                        { value: 'Cold Call', label: 'Cold Call' },
                        { value: 'Social Media', label: 'Social Media' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      error={errors.source}
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
                      onChange={(e) => handleInputChange('customerType', e.target.value)}
                      options={[
                        { value: 'Retail', label: 'Retail' },
                        { value: 'Corporate', label: 'Corporate' }
                      ]}
                      error={errors.customerType}
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
                      Alias
                    </label>
                    <Input
                      value={formData.alice}
                      onChange={(e) => handleInputChange('alice', e.target.value)}
                      placeholder="Enter alias"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Designation
                    </label>
                    <Input
                      value={formData.designation}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                      placeholder="Enter designation"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contact Person Name
                    </label>
                    <Input
                      value={formData.contactPersonName}
                      onChange={(e) => handleInputChange('contactPersonName', e.target.value)}
                      placeholder="Enter contact person name"
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
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PAN Number
                    </label>
                    <Input
                      value={formData.panNumber}
                      onChange={(e) => handleInputChange('panNumber', e.target.value)}
                      placeholder="Enter PAN number"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Address Information Tab */}
            {activeTab === 'address' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Address Information</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAddress}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Address
                  </Button>
                </div>

                {formData.addresses.map((address, index) => (
                  <div key={address.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-medium text-gray-700">
                        Address {index + 1}
                      </h4>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="primaryAddress"
                            checked={address.isPrimary}
                            onChange={() => setPrimaryAddress(address.id)}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-600">Primary</span>
                        </label>
                        {formData.addresses.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeAddress(address.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Address *
                        </label>
                        <textarea
                          value={address.address}
                          onChange={(e) => updateAddress(address.id, 'address', e.target.value)}
                          placeholder="Enter complete address"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          State *
                        </label>
                        <Input
                          value={address.state}
                          onChange={(e) => updateAddress(address.id, 'state', e.target.value)}
                          placeholder="Enter state"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          District *
                        </label>
                        <Input
                          value={address.district}
                          onChange={(e) => updateAddress(address.id, 'district', e.target.value)}
                          placeholder="Enter district"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Pincode
                        </label>
                        <Input
                          value={address.pincode}
                          onChange={(e) => updateAddress(address.id, 'pincode', e.target.value)}
                          placeholder="Enter pincode"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          GST Number
                        </label>
                        <Input
                          value={address.gstNumber}
                          onChange={(e) => updateAddress(address.id, 'gstNumber', e.target.value)}
                          placeholder="Enter GST number"
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
                      onChange={(e) => handleInputChange('phase', e.target.value)}
                      options={[
                        { value: 'Single Phase', label: 'Single Phase' },
                        { value: 'Three Phase', label: 'Three Phase' }
                      ]}
                      error={errors.phase}
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
                      onChange={(e) => handleInputChange('segment', e.target.value)}
                      options={[
                        { value: 'Manufacturing', label: 'Manufacturing' },
                        { value: 'IT/Office', label: 'IT/Office' },
                        { value: 'Healthcare', label: 'Healthcare' },
                        { value: 'Education', label: 'Education' },
                        { value: 'Retail', label: 'Retail' },
                        { value: 'Other', label: 'Other' }
                      ]}
                      error={errors.segment}
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
                      onChange={(e) => handleInputChange('dgOwnership', e.target.value)}
                      options={[
                        { value: 'NOT_OWNED', label: 'Not Owned' },
                        { value: 'OWNED', label: 'Owned' },
                        { value: 'RENTED', label: 'Rented' }
                      ]}
                      error={errors.dgOwnership}
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
                        Finance Company
                      </label>
                      <Input
                        value={formData.financeCompany}
                        onChange={(e) => handleInputChange('financeCompany', e.target.value)}
                        placeholder="Enter finance company"
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
                      onChange={(e) => handleInputChange('employeeStatus', e.target.value)}
                      options={[
                        { value: 'Active', label: 'Active' },
                        { value: 'Inactive', label: 'Inactive' },
                        { value: 'On Leave', label: 'On Leave' }
                      ]}
                      error={errors.employeeStatus}
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
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Enter any additional notes"
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
              onClick={testFormData}
              disabled={loading}
            >
              Test Data
            </Button>
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
            //   disabled={loading || Object.keys(errors).length > 0}
            //   className={Object.keys(errors).length > 0 ? 'opacity-50 cursor-not-allowed' : ''}
            >
              <Save className="w-4 h-4 mr-2" />
              {mode === 'create' ? 'Create Enquiry & Customer' : 'Update Enquiry'}
              {Object.keys(errors).length > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                  {Object.keys(errors).length} error{Object.keys(errors).length > 1 ? 's' : ''}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 