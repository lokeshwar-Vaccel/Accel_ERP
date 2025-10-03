import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Botton';
import { apiClient } from '../../utils/api';
import toast from 'react-hot-toast';

interface DGInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrder?: any;
  DGProformaInvoiceData?: any;
  customer?: any;
  mode?: 'create' | 'edit' | 'from-po' | 'from-proforma';
  initialData?: any;
}

const DGInvoiceForm: React.FC<DGInvoiceFormProps> = ({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrder,
  DGProformaInvoiceData,
  customer,
  mode = 'create',
  initialData
}) => {
  const [loading, setLoading] = useState(false);
  const sourceDoc = purchaseOrder || DGProformaInvoiceData;
  const [formData, setFormData] = useState({
    customerId: customer?._id || sourceDoc?.customer?._id || '',
    dgPurchaseOrderId: purchaseOrder?._id || '',
    proformaInvoiceId: DGProformaInvoiceData?._id || '',
    quotationId: sourceDoc?.quotation || '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: sourceDoc?.items?.map((item: any) => ({
      description: item.description,
      specifications: item.specifications,
      kva: item.kva,
      phase: item.phase,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate || 18,
      taxAmount: item.taxAmount || (item.unitPrice * item.quantity * 18) / 100,
      totalPrice: item.totalPrice,
      serialNumbers: []
    })) || [{
      description: '',
      specifications: '',
      kva: '',
      phase: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      taxAmount: 0,
      totalPrice: 0,
      serialNumbers: []
    }],
    subtotal: sourceDoc?.subtotal || 0,
    totalTax: sourceDoc?.totalTax || sourceDoc?.taxAmount || 0,
    totalDiscount: 0,
    totalAmount: sourceDoc?.totalAmount || 0,
    paidAmount: sourceDoc?.advanceAmount || 0,
    balanceAmount: (sourceDoc?.totalAmount || 0) - (sourceDoc?.advanceAmount || 0),
    customerAddress: {
      address: sourceDoc?.customerAddress?.address || customer?.address || '',
      state: sourceDoc?.customerAddress?.state || customer?.state || '',
      district: sourceDoc?.customerAddress?.district || customer?.district || '',
      pincode: sourceDoc?.customerAddress?.pincode || customer?.pincode || ''
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
    terms: sourceDoc?.terms || 'Standard payment terms apply',
    notes: sourceDoc?.notes || '',
    status: 'draft',
    paymentStatus: 'pending',
    deliveryStatus: 'pending',
    installationDate: '',
    commissioningDate: '',
    warrantyPeriod: 12,
    warrantyStartDate: ''
  });

  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        ...initialData,
        issueDate: initialData.issueDate ? new Date(initialData.issueDate).toISOString().split('T')[0] : '',
        dueDate: initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : '',
        installationDate: initialData.installationDate ? new Date(initialData.installationDate).toISOString().split('T')[0] : '',
        commissioningDate: initialData.commissioningDate ? new Date(initialData.commissioningDate).toISOString().split('T')[0] : '',
        warrantyStartDate: initialData.warrantyStartDate ? new Date(initialData.warrantyStartDate).toISOString().split('T')[0] : ''
      });
    }
  }, [initialData, mode]);

  const calculateTotals = (items: any[]) => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + totalTax - formData.totalDiscount;
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
      balanceAmount: totals.totalAmount - formData.paidAmount
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
        totalPrice: 0,
        serialNumbers: []
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
      balanceAmount: totals.totalAmount - formData.paidAmount
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'from-po' && purchaseOrder) {
        await apiClient.dgSales.invoices.createFromPO(purchaseOrder._id, formData);
      } else if (mode === 'edit' && initialData) {
        await apiClient.dgSales.invoices.update(initialData._id, formData);
      } else {
        await apiClient.dgSales.invoices.create(formData);
      }

      onSuccess();
      onClose();
      toast.success(`DG Invoice ${mode === 'edit' ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Error saving DG Invoice:', error);
      toast.error(`Failed to ${mode === 'edit' ? 'update' : 'create'} DG invoice. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const paymentStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Paid' },
    { value: 'overdue', label: 'Overdue' }
  ];

  const deliveryStatusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'installed', label: 'Installed' },
    { value: 'commissioned', label: 'Commissioned' }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${mode === 'edit' ? 'Edit' : 'Create'} DG Invoice`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            required
          />
          <Input
            label="Warranty Period (Months)"
            type="number"
            value={formData.warrantyPeriod}
            onChange={(e) => setFormData({ ...formData, warrantyPeriod: Number(e.target.value) })}
            min="0"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            options={statusOptions}
            required
          />
          <Select
            label="Payment Status"
            value={formData.paymentStatus}
            onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
            options={paymentStatusOptions}
            required
          />
          <Select
            label="Delivery Status"
            value={formData.deliveryStatus}
            onChange={(e) => setFormData({ ...formData, deliveryStatus: e.target.value })}
            options={deliveryStatusOptions}
            required
          />
        </div>

        {/* Installation and Commissioning Dates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Installation Date"
            type="date"
            value={formData.installationDate}
            onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
          />
          <Input
            label="Commissioning Date"
            type="date"
            value={formData.commissioningDate}
            onChange={(e) => setFormData({ ...formData, commissioningDate: e.target.value })}
          />
          <Input
            label="Warranty Start Date"
            type="date"
            value={formData.warrantyStartDate}
            onChange={(e) => setFormData({ ...formData, warrantyStartDate: e.target.value })}
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

        {/* Payment Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Total Discount"
            type="number"
            value={formData.totalDiscount}
            onChange={(e) => setFormData({ 
              ...formData, 
              totalDiscount: Number(e.target.value),
              balanceAmount: formData.totalAmount - Number(e.target.value) - formData.paidAmount
            })}
            min="0"
            step="0.01"
          />
          <Input
            label="Paid Amount"
            type="number"
            value={formData.paidAmount}
            onChange={(e) => setFormData({ 
              ...formData, 
              paidAmount: Number(e.target.value),
              balanceAmount: formData.totalAmount - Number(e.target.value)
            })}
            min="0"
            step="0.01"
          />
          <Input
            label="Balance Amount"
            type="number"
            value={formData.balanceAmount}
            readOnly
            className="bg-gray-50"
          />
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Subtotal:</span>
              <div className="font-medium">₹{formData.subtotal.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-600">Total Tax:</span>
              <div className="font-medium">₹{formData.totalTax.toLocaleString()}</div>
            </div>
            <div>
              <span className="text-gray-600">Discount:</span>
              <div className="font-medium">₹{formData.totalDiscount.toLocaleString()}</div>
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
            {mode === 'edit' ? 'Update' : 'Create'} Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DGInvoiceForm; 