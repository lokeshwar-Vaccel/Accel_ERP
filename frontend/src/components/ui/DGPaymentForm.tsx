import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Botton';

interface DGPaymentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoice?: any;
  customer?: any;
  mode?: 'create' | 'edit';
  initialData?: any;
}

const DGPaymentForm: React.FC<DGPaymentFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoice,
  customer,
  mode = 'create',
  initialData
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerId: customer?._id || invoice?.customer?._id || '',
    dgInvoiceId: invoice?._id || '',
    amount: invoice?.balanceAmount || 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank_transfer',
    paymentReference: '',
    bankDetails: {
      bankName: '',
      accountNo: '',
      ifsc: '',
      chequeNumber: '',
      ddNumber: '',
      utrNumber: ''
    },
    paymentType: 'partial',
    notes: '',
    status: 'pending'
  });

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        ...initialData,
        paymentDate: initialData.paymentDate ? new Date(initialData.paymentDate).toISOString().split('T')[0] : ''
      });
    }
  }, [initialData, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let endpoint = '/dg-payments';
      let method = 'POST';

      if (mode === 'edit' && initialData) {
        endpoint = `/dg-payments/${initialData._id}`;
        method = 'PUT';
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save payment');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving Payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentMethodOptions = [
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'upi', label: 'UPI' },
    { value: 'card', label: 'Card' },
    { value: 'dd', label: 'Demand Draft' },
    { value: 'rtgs', label: 'RTGS' },
    { value: 'neft', label: 'NEFT' }
  ];

  const paymentTypeOptions = [
    { value: 'advance', label: 'Advance Payment' },
    { value: 'partial', label: 'Partial Payment' },
    { value: 'full', label: 'Full Payment' },
    { value: 'final', label: 'Final Payment' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending Verification' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'bounced', label: 'Bounced' }
  ];

  const showBankDetails = ['bank_transfer', 'cheque', 'dd', 'rtgs', 'neft'].includes(formData.paymentMethod);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${mode === 'edit' ? 'Edit' : 'Record'} Payment`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Invoice Information */}
        {invoice && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Invoice Details</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Invoice Number:</span>
                <div className="font-medium">{invoice.invoiceNumber}</div>
              </div>
              <div>
                <span className="text-blue-700">Total Amount:</span>
                <div className="font-medium">₹{invoice.totalAmount?.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-blue-700">Paid Amount:</span>
                <div className="font-medium">₹{invoice.paidAmount?.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-blue-700">Balance Amount:</span>
                <div className="font-medium text-red-600">₹{invoice.balanceAmount?.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Payment Amount"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
            min="0"
            max={invoice?.balanceAmount || undefined}
            step="0.01"
            required
          />
          <Input
            label="Payment Date"
            type="date"
            value={formData.paymentDate}
            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            required
          />
          <Select
            label="Payment Method"
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            options={paymentMethodOptions}
            required
          />
          <Select
            label="Payment Type"
            value={formData.paymentType}
            onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
            options={paymentTypeOptions}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Payment Reference"
            value={formData.paymentReference}
            onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
            placeholder="Reference number or transaction ID"
            required
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={statusOptions}
            required
          />
        </div>

        {/* Bank Details (conditional) */}
        {showBankDetails && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                value={formData.bankDetails.bankName}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                })}
              />
              <Input
                label="Account Number"
                value={formData.bankDetails.accountNo}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: { ...formData.bankDetails, accountNo: e.target.value }
                })}
              />
              <Input
                label="IFSC Code"
                value={formData.bankDetails.ifsc}
                onChange={(e) => setFormData({
                  ...formData,
                  bankDetails: { ...formData.bankDetails, ifsc: e.target.value }
                })}
              />
              {formData.paymentMethod === 'cheque' && (
                <Input
                  label="Cheque Number"
                  value={formData.bankDetails.chequeNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, chequeNumber: e.target.value }
                  })}
                />
              )}
              {formData.paymentMethod === 'dd' && (
                <Input
                  label="DD Number"
                  value={formData.bankDetails.ddNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, ddNumber: e.target.value }
                  })}
                />
              )}
              {['rtgs', 'neft', 'bank_transfer'].includes(formData.paymentMethod) && (
                <Input
                  label="UTR Number"
                  value={formData.bankDetails.utrNumber}
                  onChange={(e) => setFormData({
                    ...formData,
                    bankDetails: { ...formData.bankDetails, utrNumber: e.target.value }
                  })}
                />
              )}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional notes about the payment..."
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            {mode === 'edit' ? 'Update' : 'Record'} Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DGPaymentForm; 