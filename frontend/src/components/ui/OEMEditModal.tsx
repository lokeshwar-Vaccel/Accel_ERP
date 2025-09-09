import React from 'react';
import OEMCreateModal from './OEMCreateModal';

interface OEM {
  _id: string;
  oemCode: string;
  companyName: string;
  alias?: string;
  gstDetails?: string;
  panNumber?: string;
  contactPersonName?: string;
  designation?: string;
  mobileNo?: string;
  email?: string;
  addresses?: Array<{
    address: string;
    district: string;
    state: string;
    pincode: string;
  }>;
  bankDetails?: Array<{
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch?: string;
    isDefault: boolean;
  }>;
  status: 'active' | 'inactive';
  notes?: string;
}

interface OEMEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (oemData: any) => Promise<void>;
  oem: OEM | null;
}

const OEMEditModal: React.FC<OEMEditModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  oem
}) => {
  console.log('OEMEditModal - OEM data:', oem);
  const initialData = oem ? {
    companyName: oem.companyName,
    alias: oem.alias || '',
    gstDetails: oem.gstDetails || '',
    panNumber: oem.panNumber || '',
    contactPersonName: oem.contactPersonName || '',
    designation: oem.designation || '',
    mobileNo: oem.mobileNo || '',
    email: oem.email || '',
    addresses: oem.addresses || [{
      address: '',
      district: '',
      state: '',
      pincode: ''
    }],
    bankDetails: oem.bankDetails || [{
      bankName: '',
      accountNumber: '',
      ifscCode: '',
      branch: '',
      isDefault: true
    }],
    status: oem.status,
    notes: oem.notes || ''
  } : undefined;

  console.log('OEMEditModal - initialData:', initialData);

  return (
    <OEMCreateModal
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={onSubmit}
      initialData={initialData}
    />
  );
};

export default OEMEditModal;
