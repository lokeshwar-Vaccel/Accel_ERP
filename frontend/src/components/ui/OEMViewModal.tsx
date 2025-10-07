import React from 'react';
import { Modal } from './Modal';
import { Button } from './Botton';
import { Badge } from './Badge';

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
    _id?: string;
    address: string;
    district: string;
    state: string;
    pincode: string;
  }>;
  bankDetails?: Array<{
    _id?: string;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    branch?: string;
    isDefault: boolean;
  }>;
  status: 'active' | 'inactive';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface OEMViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  oem: OEM | null;
  onEdit: (oem: OEM) => void;
}

const OEMViewModal: React.FC<OEMViewModalProps> = ({
  isOpen,
  onClose,
  oem,
  onEdit
}) => {
  if (!oem) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="OEM Details"
      size="xl"
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">OEM Code</label>
            <p className="text-gray-900 font-medium">{oem.oemCode}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
            <p className="text-gray-900">{oem.companyName}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alias</label>
            <p className="text-gray-900">{oem.alias || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">GST Details</label>
            <p className="text-gray-900">{oem.gstDetails || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number</label>
            <p className="text-gray-900">{oem.panNumber || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person Name</label>
            <p className="text-gray-900">{oem.contactPersonName || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
            <p className="text-gray-900">{oem.designation || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
            <p className="text-gray-900">{oem.mobileNo || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <p className="text-gray-900">{oem.email || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <Badge variant={oem.status === 'active' ? 'success' : 'warning'}>
              {oem.status}
            </Badge>
          </div>
        </div>

        {/* Addresses */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Addresses ({oem.addresses?.length || 0})</h3>
          {oem.addresses && oem.addresses.length > 0 ? (
            <div className="space-y-4">
              {oem.addresses.map((address, index) => (
                <div key={address._id || index} className="bg-gray-50 p-4 rounded-md">
                  <h4 className="text-md font-medium text-gray-700 mb-2">Address {index + 1}</h4>
                  <p className="text-gray-900">
                    {address.address}, {address.district}, {address.state} - {address.pincode}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No addresses available</p>
          )}
        </div>

        {/* Bank Details */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Bank Details ({oem.bankDetails?.length || 0})</h3>
          {oem.bankDetails && oem.bankDetails.length > 0 ? (
            <div className="space-y-4">
              {oem.bankDetails.map((bank, index) => (
                <div key={bank._id || index} className="bg-gray-50 p-4 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-md font-medium text-gray-700">Bank Detail {index + 1}</h4>
                    {bank.isDefault && (
                      <Badge variant="success">Default</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                      <p className="text-gray-900">{bank.bankName}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                      <p className="text-gray-900">{bank.accountNumber}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                      <p className="text-gray-900">{bank.ifscCode}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                      <p className="text-gray-900">{bank.branch || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No bank details available</p>
          )}
        </div>

        {/* Notes */}
        {oem.notes && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{oem.notes}</p>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
          <Button
            onClick={() => {
              onClose();
              onEdit(oem);
            }}
          >
            Edit OEM
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default OEMViewModal;
