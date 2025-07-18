import React, { useState, useEffect } from 'react';
import { Eye, FileText, Printer, Edit, Trash, Plus, X, Save, Calculator, ChevronDown, Package } from 'lucide-react';
import apiClient from '../utils/api';
import QuotationForm from '../components/QuotationForm';

// Define Quotation type (simplified for frontend usage)
interface QuotationItem {
  srNo: number;
  partNo: string;
  hsnCode: string;
  description: string;
  quantity: number;
  uom: string;
  basicAmount: number;
  discount: number;
  tax: number;
  totalBasic?: number;
  discountAmount?: number;
  afterDiscValue?: number;
  gstAmount?: number;
  totalAmount?: number;
}

interface Quotation {
  _id?: string;
  invoiceNumber: string;
  customer: {
    name: string;
    address: string;
  };
  date: string;
  dgRating: string;
  modelNumber: string;
  subject: string;
  items: QuotationItem[];
  validityPeriod: number;
  terms: { term: string; description: string }[];
  notes: string;
  signature: string;
  companyDetails: {
    address: string;
    mobile: string;
    gstin: string;
    email: string;
  };
  totalAmount?: number;
  status?: string;
}

const QuotationSystem = () => {
  // --- State for quotations list ---
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // --- State for modal form (mirroring InvoiceManagement) ---
  const [newInvoice, setNewInvoice] = useState<any>({
    customer: '',
    address: '',
    items: [
      {
        product: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 18,
        hsnSac: '',
        partNo: '',
        uom: 'nos',
        discount: 0,
      },
    ],
    discountAmount: 0,
    reduceStock: false,
    location: '',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
  const [stockValidation, setStockValidation] = useState<Record<number, { available: number; isValid: boolean; message: string }>>({});

  // --- State for QuotationForm ---
  const [isQuotationFormOpen, setQuotationFormOpen] = useState(false);
  const [quotationFormMode, setQuotationFormMode] = useState<'create' | 'edit' | 'view'>('create');
  const [quotationFormInitialData, setQuotationFormInitialData] = useState<any | undefined>(undefined);
  const [quotationFormId, setQuotationFormId] = useState<string | undefined>(undefined);
console.log("quotationFormMode",quotationFormMode);

  // --- Fetch customers and products on mount ---
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await apiClient.customers.getAll({});
        setCustomers(res.data.customers || res.data || []);
      } catch {
        setCustomers([]);
      }
    };
    const fetchProducts = async () => {
      try {
        const res = await apiClient.products.getAll();
        let productsArr: any[] = [];
        if (res.data && typeof res.data === 'object' && !Array.isArray(res.data) && Array.isArray((res.data as any).products)) {
          productsArr = (res.data as any).products;
        } else if (Array.isArray(res.data)) {
          productsArr = res.data;
        }
        setProducts(productsArr);
      } catch {
        setProducts([]);
      }
    };
    fetchCustomers();
    fetchProducts();
  }, []);

  // --- Utility functions for dropdown labels ---
  const getCustomerLabel = (value: string) => {
    if (!value) return 'Select customer';
    const customer = customers.find((c) => c._id === value);
    return customer ? `${customer.name} - ${customer.email}` : 'Select customer';
  };
  const getProductLabel = (value: string) => {
    if (!value) return 'Select product';
    const product = products.find((p) => p._id === value);
    return product ? `${product.name} - ₹${product.price?.toLocaleString()}` : 'Select product';
  };
  const getAddressLabel = (value: string | undefined) => {
    if (!value) return 'Select address';
    const address = addresses.find((a) => a.id?.toString() === value);
    return address ? `${address.address} (${address.district}, ${address.pincode})` : 'Unknown address';
  };

  // --- Calculation utilities (mirroring InvoiceManagement) ---
  const calculateItemTotal = (item: any) => {
    const subtotal = item.quantity * item.unitPrice || 0;
    const itemDiscount = (item.discount || 0) * subtotal / 100;
    return subtotal - itemDiscount;
  };
  const calculateSubtotal = () => {
    return newInvoice.items.reduce((sum: number, item: any) => sum + calculateItemTotal(item), 0) || 0;
  };
  const calculateTotalTax = () => {
    const totalTax = newInvoice.items.reduce((sum: number, item: any) => {
      const itemTotal = calculateItemTotal(item);
      return sum + (itemTotal * (item.taxRate || 0) / 100);
    }, 0);
    return parseFloat(totalTax.toFixed(2)) || 0;
  };
  const calculateItemDiscounts = () => {
    const itemDiscounts = newInvoice.items.reduce((sum: number, item: any) => {
      const subtotal = item.quantity * item.unitPrice || 0;
      const itemDiscount = (item.discount || 0) * subtotal / 100;
      return sum + itemDiscount;
    }, 0);
    return parseFloat(itemDiscounts.toFixed(2)) || 0;
  };
  const calculateTotalDiscount = () => {
    const itemDiscounts = calculateItemDiscounts();
    return parseFloat((itemDiscounts).toFixed(2)) || 0;
  };
  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTotalTax();
    return subtotal + tax;
  };

  // --- Handlers for items (mirroring InvoiceManagement) ---
  const addInvoiceItem = () => {
    setNewInvoice((prev: any) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 18,
          hsnSac: '',
          partNo: '',
          uom: 'nos',
          discount: 0,
        },
      ],
    }));
  };
  const removeInvoiceItem = (index: number) => {
    setNewInvoice((prev: any) => ({
      ...prev,
      items: prev.items.filter((_: any, i: number) => i !== index),
    }));
  };
  const updateInvoiceItem = (index: number, field: string, value: any) => {
    setNewInvoice((prev: any) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      // Auto-populate price, description, gst, and partNo when product is selected
      if (field === 'product') {
        const productObj = products.find((p) => p._id === value);
        if (productObj) {
          updatedItems[index].unitPrice = productObj.price;
          updatedItems[index].description = productObj.name;
          updatedItems[index].taxRate = productObj.gst;
          updatedItems[index].partNo = productObj.partNo;
          updatedItems[index].hsnSac = productObj.hsnNumber;
          updatedItems[index].uom = productObj.uom || 'nos';
        }
      }
      return { ...prev, items: updatedItems };
    });
  };

  // Fetch quotations from API
  const fetchQuotations = async (pageNum = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.quotations.getAll({ page: pageNum, limit });
      setQuotations(res.data as Quotation[]);
      setTotalPages(res.totalPages || 1);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch quotations');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchQuotations(page);
    // eslint-disable-next-line
  }, [page]);

  // Modal component
  const QuotationModal: React.FC<{
    open: boolean;
    onClose: () => void;
    mode: 'create' | 'edit' | 'view';
    quotation: Quotation | null;
  }> = ({ open, onClose, mode, quotation }) => {
    const [form, setForm] = useState<Quotation>({
      invoiceNumber: '',
      customer: {
        name: '',
        address: ''
      },
      date: new Date().toISOString().split('T')[0],
      dgRating: '',
      modelNumber: '',
      subject: '',
      items: [{
        srNo: 1,
        partNo: '',
        hsnCode: '',
        description: '',
        quantity: 1,
        uom: 'Nos',
        basicAmount: 0,
        discount: 0,
        tax: 18
      }],
      validityPeriod: 30,
      terms: [
        { term: 'Payment Terms', description: '100% advance payment alongwith P.O.' },
        { term: 'Ordering and Payment', description: 'In Favour of Sun Power Services.' },
        { term: 'Delivery', description: 'With in One Month after your P.O.' }
      ],
      notes: '',
      signature: 'For Sun Power Services',
      companyDetails: {
        address: 'Plot no 1, Phase 1, 4th Street, Annai velankani nagar, Madhananthapuram, porur, chennai 600116.',
        mobile: '+91 9176660123',
        gstin: '33BLFPS9951M1ZC',
        email: '24x7powerolservice@gmail.com'
      }
    });

    useEffect(() => {
      if ((mode === 'edit' || mode === 'view') && quotation) {
        // Ensure all numeric fields are numbers
        setForm({
          ...quotation,
          validityPeriod: Number(quotation.validityPeriod),
          items: quotation.items.map(item => ({
            ...item,
            quantity: Number(item.quantity),
            basicAmount: Number(item.basicAmount),
            discount: Number(item.discount),
            tax: Number(item.tax),
            srNo: Number(item.srNo),
          }))
        });
      } else if (mode === 'create') {
        setForm({
          invoiceNumber: '',
          customer: { name: '', address: '' },
          date: new Date().toISOString().split('T')[0],
          dgRating: '',
          modelNumber: '',
          subject: '',
          items: [{
            srNo: 1,
            partNo: '',
            hsnCode: '',
            description: '',
            quantity: 1,
            uom: 'Nos',
            basicAmount: 0,
            discount: 0,
            tax: 18
          }],
          validityPeriod: 30,
          terms: [
            { term: 'Payment Terms', description: '100% advance payment alongwith P.O.' },
            { term: 'Ordering and Payment', description: 'In Favour of Sun Power Services.' },
            { term: 'Delivery', description: 'With in One Month after your P.O.' }
          ],
          notes: '',
          signature: 'For Sun Power Services',
          companyDetails: {
            address: 'Plot no 1, Phase 1, 4th Street, Annai velankani nagar, Madhananthapuram, porur, chennai 600116.',
            mobile: '+91 9176660123',
            gstin: '33BLFPS9951M1ZC',
            email: '24x7powerolservice@gmail.com'
          }
        });
      }
    }, [mode, quotation]);

    const calculateItemTotal = (item: QuotationItem) => {
      const totalBasic = item.basicAmount * item.quantity;
      const discountAmount = (totalBasic * item.discount) / 100;
      const afterDiscValue = totalBasic - discountAmount;
      const gstAmount = (afterDiscValue * item.tax) / 100;
      const totalAmount = afterDiscValue + gstAmount;
      return {
        totalBasic,
        discountAmount,
        afterDiscValue,
        gstAmount,
        totalAmount
      };
    };

    const handleItemChange = (index: number, field: keyof QuotationItem, value: any) => {
      const newItems = [...form.items];
      newItems[index] = { ...newItems[index], [field]: Number(value) };
      setForm({ ...form, items: newItems });
    };

    const addItem = () => {
      setForm({
        ...form,
        items: [...form.items, {
          srNo: form.items.length + 1,
          partNo: '',
          hsnCode: '',
          description: '',
          quantity: 1,
          uom: 'Nos',
          basicAmount: 0,
          discount: 0,
          tax: 18
        }]
      });
    };

    const removeItem = (index: number) => {
      const newItems = form.items.filter((_, i) => i !== index);
      setForm({ ...form, items: newItems });
    };

    // --- Transform form data to backend Quotation schema ---
    const transformToQuotationPayload = (form: any) => {
      // Calculate summary fields
      const subtotal = form.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0);
      const totalDiscount = form.items.reduce((sum: number, item: any) => sum + ((item.discount || 0) * item.quantity * item.unitPrice / 100), 0);
      const totalTax = form.items.reduce((sum: number, item: any) => {
        const discounted = item.quantity * item.unitPrice - ((item.discount || 0) * item.quantity * item.unitPrice / 100);
        return sum + (discounted * (item.taxRate || 0) / 100);
      }, 0);
      const grandTotal = subtotal - totalDiscount + totalTax;
      const roundOff = +(grandTotal - Math.floor(grandTotal)).toFixed(2);
      // Flatten terms array to string
      let termsString = '';
      if (Array.isArray(form.terms)) {
        termsString = form.terms.map((t: any, idx: number) => `${idx + 1}. ${t.term}: ${t.description}`).join('\n');
      } else if (typeof form.terms === 'string') {
        termsString = form.terms;
      }
      // Map items
      const items = (form.items || []).map((item: any) => {
        const discountedAmount = ((item.discount || 0) * item.quantity * item.unitPrice / 100);
        const discounted = item.quantity * item.unitPrice - discountedAmount;
        const taxAmount = discounted * (item.taxRate || 0) / 100;
        const totalPrice = discounted + taxAmount;
        return {
          product: item.product || item.partNo || '',
          description: item.description || '',
          hsnCode: item.hsnCode || item.hsnSac || '',
          quantity: item.quantity,
          uom: item.uom || 'nos',
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          discountedAmount,
          taxRate: item.taxRate || 0,
          taxAmount,
          totalPrice,
        };
      });
      // Map company
      const company = {
        name: form.companyDetails?.name || 'Sun Power Services',
        address: form.companyDetails?.address || 'Plot no 1, Phase 1, 4th Street, Annai velankani nagar, Madhananthapuram, porur, chennai 600116.',
        phone: form.companyDetails?.mobile || '+91 9176660123',
        email: form.companyDetails?.email || '24x7powerolservice@gmail.com',
      };
      // Map customer
      const customer = {
        name: form.customer?.name || '',
        address: form.customer?.address || '',
      };
      // Dates
      const today = new Date();
      const issueDate = today.toISOString();
      const validUntil = new Date(today.getTime() + (form.validityPeriod || 30) * 24 * 60 * 60 * 1000).toISOString();
      return {
        quotationNumber: form.invoiceNumber || '',
        issueDate,
        validUntil,
        customer,
        company,
        items,
        subtotal: +subtotal.toFixed(2),
        totalDiscount: +totalDiscount.toFixed(2),
        totalTax: +totalTax.toFixed(2),
        grandTotal: +grandTotal.toFixed(2),
        roundOff,
        notes: form.notes || '',
        terms: termsString,
        validityPeriod: form.validityPeriod || 30,
      };
    };

    // --- Validation function for Quotation form ---
    const validateQuotationForm = (form: any) => {
      const errors: string[] = [];
      // Customer
      // if (!form.customer?.name || !form.customer?.address) {
      //   errors.push('Customer name and address are required.');
      // }
      // Items
      if (!form.items || !form.items.length) {
        errors.push('At least one item is required.');
      } else {
        form.items.forEach((item: any, idx: number) => {
          // if (!item.product || !item.description) {
          //   errors.push(`Item ${idx + 1}: Product and description are required.`);
          // }
          // if (item.unitPrice == null || isNaN(item.unitPrice)) {
          //   errors.push(`Item ${idx + 1}: Unit price is required.`);
          // }
        });
      }
      // Quotation number
      if (!form.invoiceNumber) {
        errors.push('Reference Number is required.');
      }
      // Validity period
      if (!form.validityPeriod || isNaN(form.validityPeriod)) {
        errors.push('Validity period is required.');
      }
      return errors;
    };

    const handleSubmit = async () => {
      setLoading(true);
      setError('');
      console.log('Submit handler called');
      try {
        // Validate form before transforming
        const validationErrors = validateQuotationForm(form);
        console.log('Validation errors:', validationErrors);
        if (validationErrors.length > 0) {
          setError(validationErrors.join(' '));
          setLoading(false);
          return;
        }
        const payload = transformToQuotationPayload(form);
        console.log('Payload to send:', payload);
        // Check for any null/NaN in summary fields or items
        // if (
        //   !payload.customer.name ||
        //   !payload.customer.address ||
        //   !payload.items.length ||
        //   payload.items.some((item: any) => !item.product || !item.description || item.unitPrice == null || isNaN(item.unitPrice)) ||
        //   payload.subtotal == null || isNaN(payload.subtotal) ||
        //   payload.totalDiscount == null || isNaN(payload.totalDiscount) ||
        //   payload.totalTax == null || isNaN(payload.totalTax) ||
        //   payload.grandTotal == null || isNaN(payload.grandTotal) ||
        //   payload.roundOff == null || isNaN(payload.roundOff)
        // ) {
        //   setError('Please fill all required fields and ensure all calculations are valid.');
        //   setLoading(false);
        //   return;
        // }
        if (mode === 'create') {
          console.log('Calling API: create');
          await apiClient.quotations.create(payload);
        } else if (quotation && quotation._id) {
          console.log('Calling API: update');
          await apiClient.quotations.update(quotation._id, payload);
        }
        console.log('API call successful');
        fetchQuotations(page);
        onClose();
      } catch (e: any) {
        console.log('Error in catch:', e);
        setError(e.message || 'Error saving quotation');
      }
      setLoading(false);
    };

    if (!open) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">
                {mode === 'create' ? 'Create Quotation' : mode === 'edit' ? 'Edit Quotation' : 'View Quotation'}
              </h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
          {/* Error message display */}
          {error && (
            <div className="px-6 pt-4 text-red-600 font-semibold">{error}</div>
          )}

          <div className="p-6 space-y-6">
            {/* Header Information */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference Number</label>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="SPS/SER/CHE/QTN/25-26"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Customer Information */}
            <div className="grid grid-cols-2 gap-6">
              {/* <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                <input
                  type="text"
                  value={form.customer.name}
                  onChange={(e) => setForm({...form, customer: {...form.customer, name: e.target.value}})}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Address</label>
                <textarea
                  value={form.customer.address}
                  onChange={(e) => setForm({...form, customer: {...form.customer, address: e.target.value}})}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div> */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                    className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.customer ? 'border-red-500' : 'border-gray-300'
                      } hover:border-gray-400`}
                  >
                    <span className="text-gray-700 truncate mr-1">{getCustomerLabel(newInvoice.customer)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showCustomerDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      <button
                        onClick={() => {
                          setNewInvoice({ ...newInvoice, customer: '', address: '' });
                          setShowCustomerDropdown(false);
                          setAddresses([]);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!newInvoice.customer ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                      >
                        Select customer
                      </button>
                      {customers.map(customer => (
                        <button
                          key={customer._id}
                          onClick={() => {
                            setNewInvoice({ ...newInvoice, customer: customer._id, address: '' });
                            setShowCustomerDropdown(false);
                            setAddresses(customer.addresses || []);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${newInvoice.customer === customer._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-xs text-gray-500">{customer.email}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {formErrors.customer && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.customer}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Address
                </label>
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                    disabled={!newInvoice.customer}
                    className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${!newInvoice.customer ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400'}`}
                  >
                    <span className="text-gray-700 truncate mr-1">{getAddressLabel(newInvoice.address)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showAddressDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showAddressDropdown && newInvoice.customer && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      <button
                        onClick={() => {
                          setNewInvoice({ ...newInvoice, address: '' });
                          setShowAddressDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!newInvoice.address ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                      >
                        Select address
                      </button>
                      {addresses.map(address => (
                        <button
                          key={address.id}
                          onClick={() => {
                            setNewInvoice({ ...newInvoice, address: address.id.toString() });
                            setShowAddressDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${newInvoice.address === address.id.toString() ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          <div>
                            <div className="font-medium">{address.address}</div>
                            <div className="text-xs text-gray-500">{address.district}, {address.pincode}</div>
                            {address.isPrimary && (
                              <div className="text-xs text-blue-600 font-medium">Primary</div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* DG Information */}
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">DG Rating</label>
                <input
                  type="text"
                  value={form.dgRating}
                  onChange={(e) => setForm({ ...form, dgRating: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="62.5Kva"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Model Number</label>
                <input
                  type="text"
                  value={form.modelNumber}
                  onChange={(e) => setForm({ ...form, modelNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="4905GMA-C2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Validity Period (days)</label>
                <input
                  type="number"
                  value={typeof form.validityPeriod === 'number' ? form.validityPeriod : Number(form.validityPeriod) || 0}
                  onChange={(e) => setForm({ ...form, validityPeriod: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="QUOTATION FOR SPARES OF YOUR 62.5KVA DG SET"
              />
            </div>

            {/* Items Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Invoice Items</h3>
                <button
                  onClick={addInvoiceItem}
                  type="button"
                  className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-4">
                {newInvoice.items.map((item: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-3">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            onClick={() => setShowProductDropdowns({
                              ...showProductDropdowns,
                              [index]: !showProductDropdowns[index]
                            })}
                            className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors[`item_${index}_product`] ? 'border-red-500' : 'border-gray-300'
                              } hover:border-gray-400`}
                          >
                            <span className="text-gray-700 truncate mr-1">{getProductLabel(item.product)}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showProductDropdowns[index] ? 'rotate-180' : ''}`} />
                          </button>
                          {showProductDropdowns[index] && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                              <button
                                onClick={() => {
                                  updateInvoiceItem(index, 'product', '');
                                  setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!item.product ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                  }`}
                              >
                                Select product
                              </button>
                              {products.map(product => (
                                <button
                                  key={product._id}
                                  onClick={() => {
                                    updateInvoiceItem(index, 'product', product._id);
                                    setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                  }}
                                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${item.product === product._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                    }`}
                                >
                                  <div>
                                    <div className="font-medium">{product?.name}</div>
                                    <div className="text-xs text-gray-500">₹{product?.price?.toLocaleString()} • {product?.category}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {formErrors[`item_${index}_product`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_product`]}</p>
                        )}
                      </div>


                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          HSN/SAC
                        </label>
                        <input
                          type="text"
                          value={item.hsnSac}
                          placeholder='0'
                          onChange={(e) => updateInvoiceItem(index, 'hsnSac', parseFloat(e.target.value))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {formErrors[`item_${index}_price`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_price`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          GST %
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.taxRate}
                          placeholder='0.00%'
                          onChange={(e) => updateInvoiceItem(index, 'taxRate', parseFloat(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Part No
                        </label>
                        <input
                          type="text"
                          value={item.partNo}
                          placeholder='0'
                          onChange={(e) => updateInvoiceItem(index, 'partNo', parseFloat(e.target.value))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {formErrors[`item_${index}_price`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_price`]}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quantity
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          placeholder='0'
                          onChange={(e) => updateInvoiceItem(index, 'quantity', parseInt(e.target.value))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`item_${index}_quantity`] || formErrors[`item_${index}_stock`] ? 'border-red-500' :
                            stockValidation[index] && !stockValidation[index].isValid ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {formErrors[`item_${index}_quantity`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_quantity`]}</p>
                        )}
                        {formErrors[`item_${index}_stock`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_stock`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          UOM
                        </label>
                        <select
                          value={item.uom || 'nos'}
                          onChange={(e) => updateInvoiceItem(index, 'uom', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="kg">kg</option>
                          <option value="litre">litre</option>
                          <option value="meter">meter</option>
                          <option value="sq.ft">sq.ft</option>
                          <option value="hour">hour</option>
                          <option value="set">set</option>
                          <option value="box">box</option>
                          <option value="can">can</option>
                          <option value="roll">roll</option>
                          <option value="nos">nos</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Unit Price (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          placeholder='0'
                          onChange={(e) => updateInvoiceItem(index, 'unitPrice', parseFloat(e.target.value))}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {formErrors[`item_${index}_price`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_price`]}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Discount (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"

                          step="1"
                          value={item.discount}
                          placeholder='0.00%'
                          onChange={(e) => {
                            updateInvoiceItem(index, 'discount', parseFloat(e.target.value));
                            // Auto-calculate discountAmount based on item discounts
                            const updatedItems = [...newInvoice.items];
                            updatedItems[index] = { ...updatedItems[index], discount: parseFloat(e.target.value) || 0 };

                            const totalItemDiscounts = updatedItems.reduce((sum, item) => {
                              const subtotal = item.quantity * item.unitPrice || 0;
                              const itemDiscount = (item.discount || 0) * subtotal / 100;
                              return sum + itemDiscount;
                            }, 0);

                            setNewInvoice((prev: any) => ({
                              ...prev,
                              discountAmount: totalItemDiscounts
                            }));
                          }}

                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`item_${index}_price`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                        />
                        {formErrors[`item_${index}_price`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_price`]}</p>
                        )}
                      </div>


                      <div className="flex items-end">
                        <div className="w-full">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total
                          </label>
                          <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-medium">
                            ₹{(() => {
                              const discountedAmount = ((item.discount || 0) * item.quantity * item.unitPrice / 100);
                              const discounted = item.quantity * item.unitPrice - discountedAmount;
                              const taxAmount = discounted * (item.taxRate || 0) / 100;
                              const totalPrice = discounted + taxAmount;
                              return totalPrice.toLocaleString();
                            })()}
                          </div>
                        </div>
                        {newInvoice.items.length > 1 && (
                          <button
                            onClick={() => removeInvoiceItem(index)}
                            type="button"
                            className="ml-2 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stock Status Display */}
                    {newInvoice.reduceStock && newInvoice.location && item.product && (
                      <div className={`mt-3 p-3 rounded-lg border ${stockValidation[index]
                        ? stockValidation[index].isValid
                          ? 'bg-green-50 border-green-200'
                          : 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                        }`}>
                        <div className="flex items-center space-x-2 text-sm">
                          <Package className="w-4 h-4" />
                          <span className="font-medium">Stock Status:</span>
                          {stockValidation[index] ? (
                            <span className={stockValidation[index].isValid ? 'text-green-700' : 'text-red-700'}>
                              {stockValidation[index].message}
                            </span>
                          ) : (
                            <span className="text-gray-500">Checking...</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Item description"
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* --- ITEMS TABLE SECTION --- */}
              {/* <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-bold text-lg mb-2">Goods and Services</h3>
                <table className="w-full border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border px-2 py-1 text-xs">No.</th>
                      <th className="border px-2 py-1 text-xs">Description</th>
                      <th className="border px-2 py-1 text-xs">HSN/SAC</th>
                      <th className="border px-2 py-1 text-xs">GST %</th>
                      <th className="border px-2 py-1 text-xs">Part No.</th>
                      <th className="border px-2 py-1 text-xs">Quantity</th>
                      <th className="border px-2 py-1 text-xs">Rate</th>
                      <th className="border px-2 py-1 text-xs">Disc. %</th>
                      <th className="border px-2 py-1 text-xs">Amount</th>
                      <th className="border px-2 py-1 text-xs">Location</th>
                      <th className="border px-2 py-1"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {newInvoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border px-2 py-1 text-xs">{idx + 1}</td>
                        <td className="border px-2 py-1"><input type="text" value={item.description} onChange={e => updateInvoiceItem(idx, 'description', e.target.value)} className="w-full px-1 py-0.5 border rounded" /></td>
                        <td className="border px-2 py-1"><input type="text" value={item.hsnSac || ''} onChange={e => updateInvoiceItem(idx, 'hsnSac', e.target.value)} className="w-full px-1 py-0.5 border rounded" /></td>
                        <td className="border px-2 py-1"><input type="number" value={item.gstRate || ''} onChange={e => updateInvoiceItem(idx, 'gstRate', Number(e.target.value))} className="w-full px-1 py-0.5 border rounded" /></td>
                        <td className="border px-2 py-1"><input type="text" value={item.partNo || ''} onChange={e => updateInvoiceItem(idx, 'partNo', e.target.value)} className="w-full px-1 py-0.5 border rounded" /></td>
                        <td className="border px-2 py-1"><input type="number" value={item.quantity} onChange={e => updateInvoiceItem(idx, 'quantity', Number(e.target.value))} className="w-full px-1 py-0.5 border rounded" /></td>
                        <td className="border px-2 py-1"><input type="number" value={item.unitPrice} onChange={e => updateInvoiceItem(idx, 'unitPrice', Number(e.target.value))} className="w-full px-1 py-0.5 border rounded" /></td>
                        <td className="border px-2 py-1"><input type="number" value={item.discount || ''} onChange={e => updateInvoiceItem(idx, 'discount', Number(e.target.value))} className="w-full px-1 py-0.5 border rounded" /></td>
                        <td className="border px-2 py-1">₹{calculateItemTotal(item).toLocaleString()}</td>
                        <td className="border px-2 py-1"><input type="text" value={item.location || ''} onChange={e => updateInvoiceItem(idx, 'location', e.target.value)} className="w-full px-1 py-0.5 border rounded" /></td>
                        <td className="border px-2 py-1"><button onClick={() => removeInvoiceItem(idx)} className="text-red-500">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button onClick={addInvoiceItem} className="mt-2 px-3 py-1 bg-blue-600 text-white rounded">Add Item</button>
              </div> */}
            </div>

            {/* Terms & Conditions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions</label>
              <div className="space-y-2">
                {form.terms.map((term, index) => (
                  <div key={index} className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={term.term}
                      onChange={(e) => {
                        const newTerms = [...form.terms];
                        newTerms[index] = { ...newTerms[index], term: e.target.value };
                        setForm({ ...form, terms: newTerms });
                      }}
                      className="border border-gray-300 rounded px-3 py-2"
                      placeholder="Term"
                    />
                    <input
                      type="text"
                      value={term.description}
                      onChange={(e) => {
                        const newTerms = [...form.terms];
                        newTerms[index] = { ...newTerms[index], description: e.target.value };
                        setForm({ ...form, terms: newTerms });
                      }}
                      className="col-span-2 border border-gray-300 rounded px-3 py-2"
                      placeholder="Description"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={form.notes as string}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-end">


              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{calculateSubtotal().toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Tax:</span>
                  <span className="font-medium">₹{calculateTotalTax().toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Discount:</span>
                  <span className="font-medium text-green-600">-₹{calculateTotalDiscount().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-3">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">₹{calculateGrandTotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Amount in Words:</span>
                  <span>{/* TODO: Convert to words */}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 p-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              disabled={loading}
            >
              <Save className="w-4 h-4" />
              {mode === 'create' ? 'Create Quotation' : 'Update Quotation'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const handleView = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setModalMode('view');
    setShowModal(true);
  };

  const handleEdit = (quotation: any) => {
    setQuotationFormInitialData(quotation);
    setQuotationFormMode('edit');
    setModalMode('edit');
    setQuotationFormId(quotation._id);
    setQuotationFormOpen(true);
  };

  const handleCreate = () => {
    setQuotationFormInitialData(undefined);
    setQuotationFormMode('create');
    setModalMode('create');
    setQuotationFormId(undefined);
    setQuotationFormOpen(true);
  };

  const handleDelete = async (quotation: Quotation) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      setLoading(true);
      setError('');
      try {
        if (quotation._id) {
          await apiClient.quotations.delete(quotation._id);
          fetchQuotations(page);
        }
      } catch (e: any) {
        setError(e.message || 'Error deleting quotation');
      }
      setLoading(false);
    }
  };

  const handlePrint = (quotation: Quotation) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const printContent = `
      <html>
        <head>
          <title>Quotation - ${quotation.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .company-info { margin-bottom: 20px; }
            .quotation-details { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            .total { font-weight: bold; }
            .terms { margin-top: 20px; }
            .signature { margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Sun Power Services</h1>
            <h2>QUOTATION</h2>
          </div>
          <div class="quotation-details">
            <p><strong>Ref:</strong> ${quotation.invoiceNumber}</p>
            <p><strong>Date:</strong> ${quotation.date}</p>
            <p><strong>Customer:</strong> ${quotation.customer.name}</p>
            <p><strong>Subject:</strong> ${quotation.subject}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Sr.No</th>
                <th>Part No</th>
                <th>HSN Code</th>
                <th>Description</th>
                <th>Qty</th>
                <th>UOM</th>
                <th>Basic Amount</th>
                <th>Total Basic</th>
                <th>Discount%</th>
                <th>After Disc.</th>
                <th>Tax%</th>
                <th>GST Amount</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${quotation.items.map(item => `
                <tr>
                  <td>${item.srNo}</td>
                  <td>${item.partNo}</td>
                  <td>${item.hsnCode}</td>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>${item.uom}</td>
                  <td>₹${item.basicAmount}</td>
                  <td>₹${item.totalBasic}</td>
                  <td>${item.discount}%</td>
                  <td>₹${item.afterDiscValue}</td>
                  <td>${item.tax}%</td>
                  <td>₹${item.gstAmount}</td>
                  <td>₹${item.totalAmount}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            <p><strong>Grand Total: ₹${quotation.totalAmount?.toFixed(2) || '0.00'}</strong></p>
          </div>
          <div class="terms">
            <h3>Terms & Conditions:</h3>
            ${quotation.terms.map((term, index) => `
              <p><strong>${index + 1}. ${term.term}:</strong> ${term.description}</p>
            `).join('')}
          </div>
          <div class="signature">
            <p>${quotation.signature}</p>
          </div>
        </body>
      </html>
    `;
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quotation Management</h1>
              <p className="text-gray-600 mt-1">Create and manage your quotations</p>
            </div>
            <button
              onClick={handleCreate}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Quotation
            </button>
          </div>
        </div>

        {/* Quotations List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quotation Number
                  </th>
                  {/* <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th> */}
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Validity Period
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  {/* <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th> */}
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      Loading quotations...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No quotations found. Create your first quotation!
                    </td>
                  </tr>
                ) : (
                  quotations.map((quotation:any) => (
                    <tr key={quotation?._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">
                          {quotation?.quotationNumber}
                        </div>
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{quotation.customer.name}</div>
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{quotation?.validUntil}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{quotation?.validityPeriod}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          ₹{quotation?.totalAmount?.toLocaleString() || '0.00'}
                        </div>
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          quotation.status === 'Draft' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {quotation.status}
                        </span>
                      </td> */}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(quotation)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded"
                            title="View"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(quotation)}
                            className="text-purple-500 hover:text-purple-700 p-1 rounded"
                            title="Edit"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(quotation)}
                            className="text-red-600 hover:text-red-800 p-1 rounded"
                            title="Delete"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination Controls */}
          <div className="flex justify-end items-center gap-2 p-4">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
        {/* Modal */}
        {showModal && (
          <QuotationModal
            open={showModal}
            onClose={() => setShowModal(false)}
            mode={modalMode}
            quotation={selectedQuotation}
          />
        )}
        {/* QuotationForm Modal for Create/Edit */}
        <QuotationForm
          isOpen={isQuotationFormOpen}
          onClose={() => setQuotationFormOpen(false)}
          onSuccess={() => fetchQuotations(page)}
          customers={customers}
          products={products}
          generalSettings={{}}
          initialData={quotationFormInitialData}
          mode={quotationFormMode}
          quotationId={quotationFormId}
        />
      </div>
    </div>
  );
};

export default QuotationSystem;