import React, { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, MapPin, Settings, FileText, Plus, Trash2 } from 'lucide-react';
import { Button } from './Botton';
import { Input } from './Input';
import { Select } from './Select';
import { toast } from 'react-hot-toast';
import apiClient from '../../utils/api';
import CustomerSearchDropdown from './CustomerSearchDropdown';
import SalesEngineerSearchDropdown from './SalesEngineerSearchDropdown';

interface Customer {
  _id: string;
  name: string;
  alice?: string;
  designation?: string;
  contactPersonName?: string;
  email?: string;
  phone?: string;
  panNumber?: string;
  addresses: Array<{
    id: number;
    address: string;
    state: string;
    district: string;
    pincode: string;
    isPrimary: boolean;
    gstNumber?: string;
    contactPersonName?: string;
    email?: string;
    phone?: string;
    registrationStatus: 'registered' | 'non_registered';
  }>;
}

interface SalesEngineer {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  salesEmployeeCode: string;
  status: string;
}

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
  contactPersonName?: string;
  email?: string;
  phone?: string;
  registrationStatus: 'registered' | 'non_registered';
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
  customerName: string;
  alice?: string;
  designation?: string;
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
  customerName?: string;
  panNumber?: string;
  addresses?: string | Record<number, string>;
  addressFields?: Record<number, {
    address?: string;
    state?: string;
    district?: string;
    pincode?: string;
  }>;
  kva?: string;
  quantity?: string;
  phase?: string;
  dgOwnership?: string;
  segment?: string;
  employeeStatus?: string;
  gstNumber?: string | Record<number, string>;
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
  customerName: '',
  alice: '',
  designation: '',
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
    notes: '',
    contactPersonName: '',
    email: '',
    phone: '',
    registrationStatus: 'non_registered' as 'registered' | 'non_registered'
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSalesEngineer, setSelectedSalesEngineer] = useState<SalesEngineer | null>(null);

  // Validation functions
  const validatePAN = (pan: string): boolean => {
    // PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan);
  };

  const validateGST = (gst: string): boolean => {
    // GST format: 2 digits, 4 letters, 5 alphanumeric, 4 alphanumeric (e.g., 33AABCT3518Q1Z2)
    // Indian GST format: 2 digits (state code) + 4 letters (entity code) + 5 alphanumeric + 4 alphanumeric
    const gstRegex = /^[0-9]{2}[A-Z]{4}[A-Z0-9]{5}[A-Z0-9]{4}$/;
    return gstRegex.test(gst);
  };

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
              notes: addr.notes || '',
              contactPersonName: addr.contactPersonName || '',
              email: addr.email || '',
              phone: addr.phone || '',
              registrationStatus: addr.registrationStatus || 'non_registered'
            }))
          : [{
              id: 1,
              address: initialData.address || '',
              state: initialData.state || '',
              district: initialData.district || '',
              pincode: initialData.pincode || '',
              isPrimary: true,
              gstNumber: '',
              notes: '',
              contactPersonName: '',
              email: '',
              phone: '',
              registrationStatus: 'non_registered'
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
    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    // PAN Number Validation
    if (formData.panNumber && formData.panNumber.trim()) {
      if (!validatePAN(formData.panNumber.trim())) {
        newErrors.panNumber = 'PAN number must be in format ABCDE1234F (5 letters, 4 digits, 1 letter)';
      }
    }

    // Address Validation
    if (!formData.addresses.length) {
      newErrors.addresses = 'At least one address is required';
    } else {
      const addressErrors: Record<number, string> = {};
      const gstErrors: Record<number, string> = {};
      const addressFieldErrors: Record<number, {
        address?: string;
        state?: string;
        district?: string;
        pincode?: string;
      }> = {};
      let hasAddressErrors = false;
      let hasGstErrors = false;
      let hasFieldErrors = false;
      
      formData.addresses.forEach((addr, index) => {
        const addrErrors: string[] = [];
        const fieldErrors: {
          address?: string;
          state?: string;
          district?: string;
          pincode?: string;
        } = {};
        
        if (!addr.address.trim()) {
          addrErrors.push('Address is required');
          fieldErrors.address = 'Address is required';
        }
        if (!addr.state.trim()) {
          addrErrors.push('State is required');
          fieldErrors.state = 'State is required';
        }
        if (!addr.district.trim()) {
          addrErrors.push('District is required');
          fieldErrors.district = 'District is required';
        }
        if (!addr.pincode.trim()) {
          addrErrors.push('Pincode is required');
          fieldErrors.pincode = 'Pincode is required';
        } else if (!/^\d{6}$/.test(addr.pincode.trim())) {
          addrErrors.push('Pincode must be exactly 6 digits');
          fieldErrors.pincode = 'Pincode must be exactly 6 digits';
        }
        
        // GST Number Validation
        if (addr.gstNumber && addr.gstNumber.trim()) {
          if (!validateGST(addr.gstNumber.trim())) {
            gstErrors[addr.id] = 'GST number must be in format 33AABCT3518Q1Z2 (2 digits, 4 letters, 5 alphanumeric, 4 alphanumeric)';
            hasGstErrors = true;
          }
        }
        
        if (addrErrors.length > 0) {
          addressErrors[index] = addrErrors.join(', ');
          hasAddressErrors = true;
        }
        
        if (Object.keys(fieldErrors).length > 0) {
          addressFieldErrors[addr.id] = fieldErrors;
          hasFieldErrors = true;
        }
      });
      
      if (hasAddressErrors) {
        newErrors.addresses = addressErrors;
      }
      if (hasGstErrors) {
        newErrors.gstNumber = gstErrors;
      }
      if (hasFieldErrors) {
        newErrors.addressFields = addressFieldErrors;
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
        customerName: formData.customerName.trim(),
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
          registrationStatus: addr.registrationStatus,
          ...(addr.pincode?.trim() && { pincode: addr.pincode.trim() }),
          ...(addr.gstNumber?.trim() && { gstNumber: addr.gstNumber.trim() }),
          ...(addr.notes?.trim() && { notes: addr.notes.trim() }),
          ...(addr.contactPersonName?.trim() && { contactPersonName: addr.contactPersonName.trim() }),
          ...(addr.email?.trim() && { email: addr.email.trim() }),
          ...(addr.phone?.trim() && { phone: addr.phone.trim() })
        }))
      };

      // Add optional fields only if they have values
      if (formData.alice?.trim()) {
        payload.alice = formData.alice.trim();
      }
      if (formData.designation?.trim()) {
        payload.designation = formData.designation.trim();
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

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    
    // Auto-fill customer details
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      alice: customer.alice || '',
      designation: customer.designation || '',
      panNumber: customer.panNumber || '',
      // Update addresses with customer's addresses
      addresses: customer.addresses.length > 0 ? customer.addresses.map((addr, index) => ({
        id: addr.id || index + 1,
        address: addr.address || '',
        state: addr.state || '',
        district: addr.district || '',
        pincode: addr.pincode || '',
        isPrimary: addr.isPrimary || index === 0,
        gstNumber: addr.gstNumber || '',
        notes: '',
        contactPersonName: addr.contactPersonName || '',
        email: addr.email || '',
        phone: addr.phone || '',
        registrationStatus: addr.registrationStatus || 'non_registered'
      })) : prev.addresses
    }));
  };

  const handleSalesEngineerSelect = (salesEngineer: SalesEngineer) => {
    setSelectedSalesEngineer(salesEngineer);
    
    // Auto-fill employee details
    setFormData(prev => ({
      ...prev,
      assignedEmployeeCode: salesEngineer.salesEmployeeCode,
      assignedEmployeeName: salesEngineer.fullName,
      employeeStatus: salesEngineer.status === 'active' ? 'Active' : 'Inactive'
    }));
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
      notes: '',
      contactPersonName: '',
      email: '',
      phone: '',
      registrationStatus: 'non_registered'
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

    // Clear individual field errors when user starts typing
    if (typeof value === 'string' && value.trim()) {
      setErrors(prev => {
        if (prev.addressFields && prev.addressFields[addressId]) {
          const newAddressFields = { ...prev.addressFields };
          if (newAddressFields[addressId][field as keyof typeof newAddressFields[typeof addressId]]) {
            delete newAddressFields[addressId][field as keyof typeof newAddressFields[typeof addressId]];
            if (Object.keys(newAddressFields[addressId]).length === 0) {
              delete newAddressFields[addressId];
            }
            return {
              ...prev,
              addressFields: Object.keys(newAddressFields).length > 0 ? newAddressFields : undefined
            };
          }
        }
        return prev;
      });
    }
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
    { id: 'customer', label: 'Customer & Address', icon: User },
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

            {/* Customer & Address Information Tab */}
            {activeTab === 'customer' && (
              <div className="space-y-6">
                <div className="flex flex-col lg:flex-row">
                  {/* Left: Basic Information */}
                  <div className="w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r border-gray-200 flex flex-col p-6">
                    <div className="flex items-center justify-between mb-6">
                  <div>
                        <h3 className="text-xl font-bold text-gray-800">Basic Information</h3>
                        <p className="text-sm text-gray-600 mt-1">Customer details and contact information</p>
                  </div>
                    </div>
                  <div>
                      {/* Customer Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                    </label>
                        <CustomerSearchDropdown
                      value={formData.customerName}
                          onChange={(value) => handleInputChange('customerName', value)}
                          onCustomerSelect={handleCustomerSelect}
                          placeholder="Search customers or enter new name"
                      error={errors.customerName}
                    />
                        {selectedCustomer && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center">
                                <User className="h-4 w-4 text-green-600 mr-2" />
                                <span className="text-sm text-green-800">
                                  Customer selected: {selectedCustomer.name}
                                  {selectedCustomer.alice && ` (${selectedCustomer.alice})`}
                                </span>
                  </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCustomer(null);
                                  setFormData(prev => ({
                                    ...prev,
                                    customerName: '',
                                    alice: '',
                                    designation: '',
                                    panNumber: '',
                                    addresses: [{
                                      id: 1,
                                      address: '',
                                      state: '',
                                      district: '',
                                      pincode: '',
                                      isPrimary: true,
                                      gstNumber: '',
                                      notes: '',
                                      contactPersonName: '',
                                      email: '',
                                      phone: '',
                                      registrationStatus: 'non_registered'
                                    }]
                                  }));
                                }}
                                className="text-green-600 hover:text-green-800"
                              >
                                <X className="h-4 w-4" />
                              </button>
                  </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {/* Designation */}
                  <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                      Designation
                    </label>
                    <Input
                      value={formData.designation}
                      onChange={(e) => handleInputChange('designation', e.target.value)}
                      placeholder="Enter designation"
                    />
                  </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        PAN Number
                    </label>
                    <Input
                        value={formData.panNumber || ''}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
                          handleInputChange('panNumber', value);
                          
                          // Real-time validation
                          if (value.length === 10 && !validatePAN(value)) {
                            setErrors(prev => ({
                              ...prev,
                              panNumber: 'PAN number must be in format ABCDE1234F (5 letters, 4 digits, 1 letter)'
                            }));
                          } else if (value.length === 10 && validatePAN(value)) {
                            setErrors(prev => ({
                              ...prev,
                              panNumber: undefined
                            }));
                          }
                        }}
                        placeholder="Enter PAN number (e.g., ABCDE1234F)"
                        maxLength={10}
                        error={errors.panNumber}
                      />
                      {formData.panNumber && formData.panNumber.length === 10 && !errors.panNumber && (
                        <p className="mt-1 text-sm text-green-600">✓ Valid PAN format</p>
                      )}
                  </div>

                    <div className='mt-4'>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                    </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Additional notes"
                    />
                  </div>

                    {/* Alice (Alias) Field */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Alice
                    </label>
                    <Input
                        value={formData.alice || ''}
                        onChange={(e) => handleInputChange('alice', e.target.value)}
                        placeholder="Enter customer alias/short name"
                    />
                  </div>

                  </div>

                  {/* Right: Addresses */}
                  <div className="w-full lg:w-1/2 p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">Addresses</h3>
                        <button
                    type="button"
                    onClick={addAddress}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    Add Address
                        </button>
                </div>

                      {/* Scrollable container for address list */}
                      <div className="max-h-[600px] overflow-y-auto pr-1 space-y-2">
                {formData.addresses.map((address, index) => (
                          <div
                            key={address.id}
                            className="border rounded px-3 pb-3 pt-2 bg-white flex justify-between"
                          >
                            <div className='flex-1'>
                              <div className="flex justify-between my-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Address {index + 1} *{' '}
                                  {address.isPrimary && <span className="text-xs text-blue-600">(Primary)</span>}
                        </label>
                                {!address.isPrimary && (
                                  <button
                            type="button"
                                    onClick={() => setPrimaryAddress(address.id)}
                                    className="px-2 py-1 mb-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                          >
                                    Set as Primary
                                  </button>
                        )}
                      </div>
                        <textarea
                          value={address.address}
                          onChange={(e) => updateAddress(address.id, 'address', e.target.value)}
                                className={`w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm ${
                                  errors.addressFields && errors.addressFields[address.id]?.address 
                                    ? 'border-red-300' 
                                    : 'border-gray-300'
                                }`}
                                placeholder="Enter full address"
                          rows={3}
                        />
                        {errors.addressFields && errors.addressFields[address.id]?.address && (
                          <p className="text-red-500 text-xs mt-1">{errors.addressFields[address.id].address}</p>
                        )}
                              {/* Registration Status per address */}
                              <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Status *</label>
                                <select
                                  value={address.registrationStatus}
                                  onChange={(e) => updateAddress(address.id, 'registrationStatus', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm bg-white"
                                >
                                  <option value="registered">Registered</option>
                                  <option value="non_registered">Non Registered</option>
                                </select>
                      </div>
                              {/* GST Number per address */}
                              <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  GST Number
                                </label>
                                <input
                                  type="text"
                                  value={address.gstNumber || ''}
                                  onChange={(e) => {
                                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                                    updateAddress(address.id, 'gstNumber', value);
                                    
                                    // Real-time validation
                                    if (value.length === 15 && !validateGST(value)) {
                                      console.log('GST validation failed for address', address.id, 'value:', value);
                                      setErrors(prev => {
                                        const currentGstErrors = (prev.gstNumber as Record<number, string>) || {};
                                        return {
                                          ...prev,
                                          gstNumber: {
                                            ...currentGstErrors,
                                            [address.id]: 'GST number must be in format 33AABCT3518Q1Z2 (2 digits, 4 letters, 5 alphanumeric, 4 alphanumeric)'
                                          }
                                        };
                                      });
                                    } else if (value.length === 15 && validateGST(value)) {
                                      console.log('GST validation passed for address', address.id, 'value:', value);
                                      setErrors(prev => {
                                        const currentGstErrors = (prev.gstNumber as Record<number, string>) || {};
                                        const newGstErrors = { ...currentGstErrors };
                                        delete newGstErrors[address.id];
                                        return {
                                          ...prev,
                                          gstNumber: Object.keys(newGstErrors).length > 0 ? newGstErrors : undefined
                                        };
                                      });
                                    } else if (value.length < 15) {
                                      // Clear error if user is still typing
                                      setErrors(prev => {
                                        const currentGstErrors = (prev.gstNumber as Record<number, string>) || {};
                                        if (currentGstErrors[address.id]) {
                                          const newGstErrors = { ...currentGstErrors };
                                          delete newGstErrors[address.id];
                                          return {
                                            ...prev,
                                            gstNumber: Object.keys(newGstErrors).length > 0 ? newGstErrors : undefined
                                          };
                                        }
                                        return prev;
                                      });
                                    }
                                  }}
                                  className={`w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm ${
                                    errors.gstNumber && (errors.gstNumber as Record<number, string>)?.[address.id] 
                                      ? 'border-red-300' 
                                      : 'border-gray-300'
                                  }`}
                                  placeholder="GST Number (e.g., 33AABCT3518Q1Z2)"
                                  maxLength={15}
                                />
                                {address.registrationStatus === 'registered' && (!address.gstNumber || !address.gstNumber.trim()) && (
                                  <p className="text-red-500 text-xs mt-1">GST Number is required for Registered status</p>
                                )}
                                {errors.gstNumber && (errors.gstNumber as Record<number, string>)?.[address.id] && (
                                  <p className="text-red-500 text-xs mt-1">{(errors.gstNumber as Record<number, string>)[address.id]}</p>
                                )}
                                {address.gstNumber && address.gstNumber.length === 15 && !(errors.gstNumber as Record<number, string>)?.[address.id] && (
                                  <p className="text-green-600 text-xs mt-1">✓ Valid GST format</p>
                                )}
                              </div>
                              {/* Per-address contact details */}
                              <div className="grid grid-cols-1 gap-2 mt-2">
                      <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                  <input
                                    type="text"
                                    value={address.contactPersonName || ''}
                                    onChange={(e) => updateAddress(address.id, 'contactPersonName', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Contact person"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                  <input
                                    type="email"
                                    value={address.email || ''}
                                    onChange={(e) => updateAddress(address.id, 'email', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Email"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                  <input
                                    type="text"
                                    value={address.phone || ''}
                                    onChange={(e) => updateAddress(address.id, 'phone', e.target.value)}
                                    className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm"
                                    placeholder="Phone"
                                  />
                                </div>
                              </div>
                              {/* New fields for state, district, pincode */}
                              <div className="grid grid-cols-3 gap-2 mt-2">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                          State *
                        </label>
                                  <input
                                    type="text"
                          value={address.state}
                          onChange={(e) => updateAddress(address.id, 'state', e.target.value)}
                                    className={`w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm ${
                                      errors.addressFields && errors.addressFields[address.id]?.state 
                                        ? 'border-red-300' 
                                        : 'border-gray-300'
                                    }`}
                                    placeholder="State"
                        />
                        {errors.addressFields && errors.addressFields[address.id]?.state && (
                          <p className="text-red-500 text-xs mt-1">{errors.addressFields[address.id].state}</p>
                        )}
                      </div>
                      <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                          District *
                        </label>
                                  <input
                                    type="text"
                          value={address.district}
                          onChange={(e) => updateAddress(address.id, 'district', e.target.value)}
                                    className={`w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm ${
                                      errors.addressFields && errors.addressFields[address.id]?.district 
                                        ? 'border-red-300' 
                                        : 'border-gray-300'
                                    }`}
                                    placeholder="District"
                        />
                        {errors.addressFields && errors.addressFields[address.id]?.district && (
                          <p className="text-red-500 text-xs mt-1">{errors.addressFields[address.id].district}</p>
                        )}
                      </div>
                      <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Pincode *
                        </label>
                                  <input
                                    type="text"
                          value={address.pincode}
                                    onChange={(e) => {
                                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                      updateAddress(address.id, 'pincode', value);
                                    }}
                                    className={`w-full px-2 py-1 border rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400 text-sm ${
                                      errors.addressFields && errors.addressFields[address.id]?.pincode 
                                        ? 'border-red-300' 
                                        : 'border-gray-300'
                                    }`}
                                    placeholder="Pincode"
                                    pattern="[0-9]{6}"
                                    maxLength={6}
                        />
                        {errors.addressFields && errors.addressFields[address.id]?.pincode && (
                          <p className="text-red-500 text-xs mt-1">{errors.addressFields[address.id].pincode}</p>
                        )}
                      </div>
                      </div>
                              {formData.addresses.length > 1 && (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => removeAddress(address.id)}
                                    className="text-red-600 hover:text-red-700 text-sm"
                                  >
                                    <Trash2 className="w-4 h-4 inline mr-1" />
                                    Remove Address
                                  </button>
                                </div>
                              )}
                    </div>
                  </div>
                ))}
                      </div>
                    </div>
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
                
                {/* Sales Engineer Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Sales Engineer *
                  </label>
                  <SalesEngineerSearchDropdown
                    value={formData.assignedEmployeeName}
                    onChange={(value) => handleInputChange('assignedEmployeeName', value)}
                    onSalesEngineerSelect={handleSalesEngineerSelect}
                    placeholder="Search and select a sales engineer..."
                  />
                  {selectedSalesEngineer && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-blue-600 mr-2" />
                          <div>
                            <span className="text-sm font-medium text-blue-800">
                              {selectedSalesEngineer.fullName}
                            </span>
                            <div className="text-xs text-blue-600">
                              Code: {selectedSalesEngineer.salesEmployeeCode} • {selectedSalesEngineer.email}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSalesEngineer(null);
                            setFormData(prev => ({
                              ...prev,
                              assignedEmployeeCode: '',
                              assignedEmployeeName: '',
                              employeeStatus: 'Active'
                            }));
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Employee Code
                    </label>
                    <Input
                      value={formData.assignedEmployeeCode}
                      onChange={(e) => handleInputChange('assignedEmployeeCode', e.target.value)}
                      placeholder="Employee code (auto-filled)"
                      readOnly
                      className="bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assigned Employee Name
                    </label>
                    <Input
                      value={formData.assignedEmployeeName}
                      onChange={(e) => handleInputChange('assignedEmployeeName', e.target.value)}
                      placeholder="Employee name (auto-filled)"
                      readOnly
                      className="bg-gray-50"
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