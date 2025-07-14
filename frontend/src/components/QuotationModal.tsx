import React, { useState, useEffect } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Botton';
import { apiClient } from '../utils/api';
import toast from 'react-hot-toast';

interface QuotationModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  quotation?: any;
  onSaved?: () => void;
}

const QuotationModal: React.FC<QuotationModalProps> = ({ open, onClose, mode, quotation, onSaved }) => {
  const [form, setForm] = useState<any>({
    customer: '',
    items: [{ product: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, uom: 'pcs' }],
    validityPeriod: 30,
    notes: '',
    terms: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && quotation) {
      setForm({ ...quotation });
    } else {
      setForm({
        customer: '',
        items: [{ product: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, uom: 'pcs' }],
        validityPeriod: 30,
        notes: '',
        terms: '',
      });
    }
  }, [mode, quotation]);

  const handleChange = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    setForm((prev: any) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev: any) => ({
      ...prev,
      items: [...prev.items, { product: '', description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, uom: 'pcs' }],
    }));
  };

  const removeItem = (idx: number) => {
    setForm((prev: any) => ({
      ...prev,
      items: prev.items.filter((_: any, i: number) => i !== idx),
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (mode === 'create') {
        await apiClient.invoices.create({ ...form, invoiceType: 'quotation' });
        toast.success('Quotation created');
      } else if (mode === 'edit' && quotation) {
        await apiClient.invoices.update(quotation._id, form);
        toast.success('Quotation updated');
      }
      onClose();
      onSaved && onSaved();
    } catch (error) {
      toast.error('Failed to save quotation');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Modal isOpen={open} onClose={onClose} title={mode === 'create' ? 'Create Quotation' : mode === 'edit' ? 'Edit Quotation' : 'View Quotation'} size="lg">
      <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Customer</label>
            {mode === 'view' ? (
              <div className="mt-1 p-2 bg-gray-100 rounded">{form.customer}</div>
            ) : (
              <input
                type="text"
                className="mt-1 block w-full border border-gray-300 rounded px-3 py-2"
                value={form.customer}
                onChange={e => handleChange('customer', e.target.value)}
                disabled={submitting}
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Validity Period (days)</label>
            {mode === 'view' ? (
              <div className="mt-1 p-2 bg-gray-100 rounded">{form.validityPeriod}</div>
            ) : (
              <input type="number" value={form.validityPeriod} onChange={e => handleChange('validityPeriod', Number(e.target.value))} className="w-full border rounded px-3 py-2" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            {mode === 'view' ? (
              <div className="mt-1 p-2 bg-gray-100 rounded">{form.notes}</div>
            ) : (
              <textarea value={form.notes} onChange={e => handleChange('notes', e.target.value)} className="w-full border rounded px-3 py-2" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Terms</label>
            {mode === 'view' ? (
              <div className="mt-1 p-2 bg-gray-100 rounded">{form.terms}</div>
            ) : (
              <textarea value={form.terms} onChange={e => handleChange('terms', e.target.value)} className="w-full border rounded px-3 py-2" />
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Items</label>
            <div className="space-y-2">
              {form.items.map((item: any, idx: number) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input type="text" placeholder="Product" value={item.product} onChange={e => handleItemChange(idx, 'product', e.target.value)} className="border rounded px-2 py-1 w-32" />
                  <input type="text" placeholder="Description" value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} className="border rounded px-2 py-1 w-32" />
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} className="border rounded px-2 py-1 w-16" />
                  <input type="number" placeholder="Unit Price" value={item.unitPrice} onChange={e => handleItemChange(idx, 'unitPrice', Number(e.target.value))} className="border rounded px-2 py-1 w-20" />
                  <input type="number" placeholder="Tax %" value={item.taxRate} onChange={e => handleItemChange(idx, 'taxRate', Number(e.target.value))} className="border rounded px-2 py-1 w-16" />
                  <input type="number" placeholder="Discount %" value={item.discount} onChange={e => handleItemChange(idx, 'discount', Number(e.target.value))} className="border rounded px-2 py-1 w-16" />
                  <input type="text" placeholder="UOM" value={item.uom} onChange={e => handleItemChange(idx, 'uom', e.target.value)} className="border rounded px-2 py-1 w-16" />
                  <button onClick={() => removeItem(idx)} className="text-red-600">Remove</button>
                </div>
              ))}
              <Button onClick={addItem} className="mt-2 bg-blue-600 text-white px-3 py-1 rounded">Add Item</Button>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-6 gap-2">
          <Button onClick={onClose} className="border px-4 py-2 rounded">{mode === 'view' ? 'Close' : 'Cancel'}</Button>
          {mode !== 'view' && (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 text-white px-4 py-2 rounded">
              {submitting ? 'Saving...' : (mode === 'create' ? 'Create Quotation' : 'Save Changes')}
            </Button>
          )}
        </div>
      {/* </div> */}
    </Modal>
  );
};

export default QuotationModal; 