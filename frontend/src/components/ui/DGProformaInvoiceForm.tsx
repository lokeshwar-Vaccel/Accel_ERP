import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Botton';

interface DGProformaInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrder?: any;
  customer?: any;
  mode?: 'create' | 'edit' | 'from-po';
  initialData?: any;
}

const DGProformaInvoiceForm: React.FC<DGProformaInvoiceFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrder,
  customer,
  mode = 'create',
  initialData
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    customerId: customer?._id || purchaseOrder?.customer?._id || '',
    dgPurchaseOrderId: purchaseOrder?._id || '',
    quotationId: purchaseOrder?.quotation || '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: purchaseOrder?.items?.map((item: any) => ({
      description: item.description,
      specifications: item.specifications,
      kva: item.kva,
      phase: item.phase,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: 18,
      taxAmount: (item.unitPrice * item.quantity * 18) / 100,
      totalPrice: item.totalPrice
    })) || [{
      description: '',
      specifications: '',
      kva: '',
      phase: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      taxAmount: 0,
      totalPrice: 0
    }],
    subtotal: purchaseOrder?.subtotal || 0,
    totalTax: purchaseOrder?.taxAmount || 0,
    totalAmount: purchaseOrder?.totalAmount || 0,
    advanceAmount: purchaseOrder?.advanceAmount || 0,
    balanceAmount: purchaseOrder?.balanceAmount || 0,
    customerAddress: {
      address: purchaseOrder?.deliveryAddress?.address || customer?.address || '',
      state: purchaseOrder?.deliveryAddress?.state || customer?.state || '',
      district: purchaseOrder?.deliveryAddress?.district || customer?.district || '',
      pincode: purchaseOrder?.deliveryAddress?.pincode || customer?.pincode || ''
    },
    companyDetails: {
      name: 'Sun Power Solutions',
      address: 'Business Address',
      phone: '+91-XXXXXXXXXX',
      email: 'info@sunpowersolutions.com',
      pan: 'ABCDE1234F',
      gst: '12ABCDE1234F1Z5',
      bankDetails: {
        bankName: 'State Bank of India',
        accountNo: '1234567890',
        ifsc: 'SBIN0001234',
        branch: 'Main Branch'
      }
    },
    terms: purchaseOrder?.terms || 'Standard payment terms apply',
    notes: purchaseOrder?.notes || '',
    purpose: 'loan',
    status: 'draft'
  });

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        ...initialData,
        issueDate: initialData.issueDate ? new Date(initialData.issueDate).toISOString().split('T')[0] : '',
        dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
        validUntil: initialData.validUntil ? new Date(initialData.validUntil).toISOString().split('T')[0] : ''
      });
    }
  }, [initialData, mode]);

  const calculateTotals = (items: any[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + totalTax;
    return { subtotal, totalTax, totalAmount };
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
      const item = newItems[index];
      item.taxAmount = (item.unitPrice * item.quantity * item.taxRate) / 100;
      item.totalPrice = (item.unitPrice * item.quantity) + item.taxAmount;
    }

    const totals = calculateTotals(newItems);
    setFormData({
      ...formData,
      items: newItems,
      ...totals,
      balanceAmount: totals.totalAmount - formData.advanceAmount
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, {
        description: '',
        specifications: '',
        kva: '',
        phase: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 18,
        taxAmount: 0,
        totalPrice: 0
      }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_: any, i: number) => i !== index);
    const totals = calculateTotals(newItems);
    setFormData({
      ...formData,
      items: newItems,
      ...totals,
      balanceAmount: totals.totalAmount - formData.advanceAmount
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let endpoint = '/dg-proforma-invoices';
      let method = 'POST';

      if (mode === 'from-po' && purchaseOrder) {
        endpoint = `/dg-proforma-invoices/from-po/${purchaseOrder._id}`;
      } else if (mode === 'edit' && initialData) {
        endpoint = `/dg-proforma-invoices/${initialData._id}`;
        method = 'PUT';
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          ...formData,
          items: formData.items.map((item: any) => {
            const { _id, ...itemWithoutId } = item;
            return itemWithoutId;
          })
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save proforma invoice');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving Proforma Invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'approved', label: 'Approved' },
    { value: 'used', label: 'Used' },
    { value: 'expired', label: 'Expired' }
  ];

  const purposeOptions = [
    { value: 'loan', label: 'Loan Application' },
    { value: 'finance', label: 'Finance Approval' },
    { value: 'advance', label: 'Advance Payment' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${mode === 'edit' ? 'Edit' : 'Create'} Proforma Invoice`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Issue Date"
            type="date"
            value={formData.issueDate}
            onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
            required
          />
          <Input
            label="Due Date"
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
          <Input
            label="Valid Until"
            type="date"
            value={formData.validUntil}
            onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
            required
          />
          <Select
            label="Purpose"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            options={purposeOptions}
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

        {/* Items Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Items</h3>
            <Button type="button" onClick={addItem} variant="outline" size="sm">
              Add Item
            </Button>
          </div>

          {formData.items.map((item: any, index: number) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Item {index + 1}</span>
                {formData.items.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeItem(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Description"
                  value={item.description}
                  onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                  required
                />
                <Input
                  label="Specifications"
                  value={item.specifications}
                  onChange={(e) => handleItemChange(index, 'specifications', e.target.value)}
                />
                <Input
                  label="KVA"
                  value={item.kva}
                  onChange={(e) => handleItemChange(index, 'kva', e.target.value)}
                />
                <Input
                  label="Phase"
                  value={item.phase}
                  onChange={(e) => handleItemChange(index, 'phase', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <Input
                  label="Quantity"
                  type="number"
                  value={item.quantity}
                  onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                  min="1"
                  required
                />
                <Input
                  label="Unit Price"
                  type="number"
                  value={item.unitPrice}
                  onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                  min="0"
                  step="0.01"
                  required
                />
                <Input
                  label="Tax Rate (%)"
                  type="number"
                  value={item.taxRate}
                  onChange={(e) => handleItemChange(index, 'taxRate', Number(e.target.value))}
                  min="0"
                  max="100"
                  required
                />
                <Input
                  label="Tax Amount"
                  type="number"
                  value={item.taxAmount}
                  readOnly
                  className="bg-gray-50"
                />
                <Input
                  label="Total Price"
                  type="number"
                  value={item.totalPrice}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Customer Address */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Customer Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Address"
                value={formData.customerAddress.address}
                onChange={(e) => setFormData({
                  ...formData,
                  customerAddress: { ...formData.customerAddress, address: e.target.value }
                })}
                required
              />
            </div>
            <Input
              label="State"
              value={formData.customerAddress.state}
              onChange={(e) => setFormData({
                ...formData,
                customerAddress: { ...formData.customerAddress, state: e.target.value }
              })}
              required
            />
            <Input
              label="District"
              value={formData.customerAddress.district}
              onChange={(e) => setFormData({
                ...formData,
                customerAddress: { ...formData.customerAddress, district: e.target.value }
              })}
              required
            />
            <Input
              label="Pincode"
              value={formData.customerAddress.pincode}
              onChange={(e) => setFormData({
                ...formData,
                customerAddress: { ...formData.customerAddress, pincode: e.target.value }
              })}
              required
            />
          </div>
        </div>

        {/* Terms and Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Terms</label>
            <textarea
              rows={3}
              value={formData.terms}
              onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Subtotal:</span>
              <div className="font-medium">₹{formData.subtotal.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-600">Total Tax:</span>
              <div className="font-medium">₹{formData.totalTax.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-600">Total Amount:</span>
              <div className="font-medium">₹{formData.totalAmount.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-600">Balance:</span>
              <div className="font-medium text-red-600">₹{formData.balanceAmount.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            {mode === 'edit' ? 'Update' : 'Create'} Proforma Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DGProformaInvoiceForm; 