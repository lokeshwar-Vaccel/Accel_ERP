import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Botton';
import { Select } from './Select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface OEMFormData {
  companyName: string;
  alias?: string;
  gstDetails?: string;
  panNumber?: string;
  contactPersonName?: string;
  designation?: string;
  mobileNo?: string;
  email?: string;
  addresses: Array<{
    address: string;
    district: string;
    state: string;
    pincode: string;
  }>;
  bankDetails: Array<{
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch?: string;
    isDefault: boolean;
  }>;
  status: 'active' | 'inactive';
  notes?: string;
}

interface OEMCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (oemData: OEMFormData) => Promise<void>;
  initialData?: Partial<OEMFormData>;
}

const OEMCreateModal: React.FC<OEMCreateModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData
}) => {
  const [formData, setFormData] = useState<OEMFormData>({
    companyName: '',
    alias: '',
    gstDetails: '',
    panNumber: '',
    contactPersonName: '',
    designation: '',
    mobileNo: '',
    email: '',
    addresses: [{
      address: '',
      district: '',
      state: '',
      pincode: ''
    }],
    bankDetails: [{
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branch: '',
      isDefault: true
    }],
    status: 'active',
    notes: '',
    ...initialData
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setFormData({
      companyName: '',
      alias: '',
      gstDetails: '',
      panNumber: '',
      contactPersonName: '',
      designation: '',
      mobileNo: '',
      email: '',
      addresses: [{
        address: '',
        district: '',
        state: '',
        pincode: ''
      }],
      bankDetails: [{
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        branch: '',
        isDefault: true
      }],
      status: 'active',
      notes: ''
    });
  };

  // Update form data when initialData changes or modal opens (for edit mode)
  useEffect(() => {
    if (isOpen && initialData) {
      console.log('Updating form data with initialData:', initialData);
      setFormData({
        companyName: initialData.companyName || '',
        alias: initialData.alias || '',
        gstDetails: initialData.gstDetails || '',
        panNumber: initialData.panNumber || '',
        contactPersonName: initialData.contactPersonName || '',
        designation: initialData.designation || '',
        mobileNo: initialData.mobileNo || '',
        email: initialData.email || '',
        addresses: initialData.addresses || [{
          address: '',
          district: '',
          state: '',
          pincode: ''
        }],
        bankDetails: initialData.bankDetails || [{
          bankName: '',
          accountNumber: '',
          ifscCode: '',
          branch: '',
          isDefault: true
        }],
        status: initialData.status || 'active',
        notes: initialData.notes || ''
      });
    } else if (isOpen && !initialData) {
      // Reset form for create mode
      resetForm();
    }
  }, [isOpen, initialData]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error: any) {
      console.error('Failed to save OEM:', error);
      
      if (error.response?.data?.error === 'ValidationError') {
        const validationErrors = error.response.data.errors;
        const errorMessages = Object.values(validationErrors).join(', ');
        toast.error(`Validation failed: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to save OEM');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const addAddress = () => {
    setFormData({
      ...formData,
      addresses: [...formData.addresses, { address: '', district: '', state: '', pincode: '' }]
    });
  };

  const removeAddress = (index: number) => {
    if (formData.addresses.length > 1) {
      const newAddresses = formData.addresses.filter((_, i) => i !== index);
      setFormData({ ...formData, addresses: newAddresses });
    }
  };

  const updateAddress = (index: number, field: string, value: string) => {
    const newAddresses = [...formData.addresses];
    newAddresses[index] = { ...newAddresses[index], [field]: value };
    setFormData({ ...formData, addresses: newAddresses });
  };

  const addBankDetail = () => {
    setFormData({
      ...formData,
      bankDetails: [...formData.bankDetails, { bankName: '', accountNumber: '', ifscCode: '', branch: '', isDefault: false }]
    });
  };

  const removeBankDetail = (index: number) => {
    const newBankDetails = formData.bankDetails.filter((_, i) => i !== index);
    setFormData({ ...formData, bankDetails: newBankDetails });
  };

  const updateBankDetail = (index: number, field: string, value: string | boolean) => {
    const newBankDetails = [...formData.bankDetails];
    newBankDetails[index] = { ...newBankDetails[index], [field]: value };
    
    // If setting as default, unset other defaults
    if (field === 'isDefault' && value === true) {
      newBankDetails.forEach((bank, i) => {
        if (i !== index) bank.isDefault = false;
      });
    }
    
    setFormData({ ...formData, bankDetails: newBankDetails });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialData ? "Edit OEM" : "Add New OEM"}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name *
            </label>
            <Input
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="Enter company name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alias
            </label>
            <Input
              value={formData.alias || ''}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              placeholder="Enter company alias"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST Details
            </label>
            <Input
              value={formData.gstDetails || ''}
              onChange={(e) => setFormData({ ...formData, gstDetails: e.target.value })}
              placeholder="Enter GST number (e.g., 22ABCDE1234F1Z5)"
            />
            <p className="text-xs text-gray-500 mt-1">Format: 2 digits + 5 letters + 4 digits + 1 letter + 1 letter + 1 letter + 1 alphanumeric</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              PAN Number
            </label>
            <Input
              value={formData.panNumber || ''}
              onChange={(e) => setFormData({ ...formData, panNumber: e.target.value.toUpperCase() })}
              placeholder="Enter PAN number (e.g., ABCDE1234F)"
            />
            <p className="text-xs text-gray-500 mt-1">Format: 5 letters + 4 digits + 1 letter</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Person Name
            </label>
            <Input
              value={formData.contactPersonName || ''}
              onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
              placeholder="Enter contact person name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Designation
            </label>
            <Input
              value={formData.designation || ''}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="Enter designation"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Number
            </label>
            <Input
              value={formData.mobileNo || ''}
              onChange={(e) => setFormData({ ...formData, mobileNo: e.target.value })}
              placeholder="Enter mobile number (e.g., 9876543210)"
            />
            <p className="text-xs text-gray-500 mt-1">Format: 10 digits starting with 6-9</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <Select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
            />
          </div>
        </div>

        {/* Addresses */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Addresses</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addAddress}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Address
            </Button>
          </div>
          {formData.addresses.map((address, index) => (
            <div key={index} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-700">Address {index + 1}</h4>
                {formData.addresses.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeAddress(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address *
                  </label>
                  <Input
                    value={address.address}
                    onChange={(e) => updateAddress(index, 'address', e.target.value)}
                    placeholder="Enter address"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    District *
                  </label>
                  <Input
                    value={address.district}
                    onChange={(e) => updateAddress(index, 'district', e.target.value)}
                    placeholder="Enter district"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <Input
                    value={address.state}
                    onChange={(e) => updateAddress(index, 'state', e.target.value)}
                    placeholder="Enter state"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode *
                  </label>
                  <Input
                    value={address.pincode}
                    onChange={(e) => updateAddress(index, 'pincode', e.target.value)}
                    placeholder="Enter pincode"
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bank Details */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Bank Details</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBankDetail}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Detail
            </Button>
          </div>
          {formData.bankDetails.map((bank, index) => (
            <div key={index} className="border rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-700">Bank Detail {index + 1}</h4>
                <div className="flex items-center gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={bank.isDefault}
                      onChange={(e) => updateBankDetail(index, 'isDefault', e.target.checked)}
                      className="mr-2"
                    />
                    Default
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeBankDetail(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bank Name *
                  </label>
                  <Input
                    value={bank.bankName}
                    onChange={(e) => updateBankDetail(index, 'bankName', e.target.value)}
                    placeholder="Enter bank name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number *
                  </label>
                  <Input
                    value={bank.accountNumber}
                    onChange={(e) => updateBankDetail(index, 'accountNumber', e.target.value)}
                    placeholder="Enter account number (9-18 digits)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 9-18 digits only</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IFSC Code *
                  </label>
                  <Input
                    value={bank.ifscCode}
                    onChange={(e) => updateBankDetail(index, 'ifscCode', e.target.value.toUpperCase())}
                    placeholder="Enter IFSC code (e.g., SBIN0001234)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: 4 letters + 0 + 6 alphanumeric (11 characters total)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch
                  </label>
                  <Input
                    value={bank.branch || ''}
                    onChange={(e) => updateBankDetail(index, 'branch', e.target.value)}
                    placeholder="Enter branch name"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter additional notes (optional)"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (initialData ? 'Update OEM' : 'Save OEM')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default OEMCreateModal;
