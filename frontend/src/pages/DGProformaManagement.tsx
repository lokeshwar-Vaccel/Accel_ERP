import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  Trash2, 
  Send, 
  Download, 
  FileText,
  Calendar,
  DollarSign,
  User,
  Building,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  Mail,
  Printer,
  IndianRupee
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Botton';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Card } from '../components/ui/Card';
import { apiClient } from '../utils/api';

// Types and Interfaces
type ProformaStatus = 'draft' | 'sent' | 'approved' | 'used' | 'expired';
type ProformaPurpose = 'loan' | 'finance' | 'advance' | 'other';

interface ProformaItem {
  productId?: string;
  description: string;
  specifications: string;
  kva: string;
  phase: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
}

interface Product {
  _id: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  specifications?: Record<string, any>;
  price: number;
  gst?: number;
  productType1?: string;
  productType2?: string;
  productType3?: string;
  partNo: string;
  make?: string;
}

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone: string;
  pan?: string;
  corporateName?: string;
  address?: string;
  pinCode?: string;
  tehsil?: string;
  district?: string;
}

interface DGPurchaseOrder {
  _id: string;
  poNumber: string;
  customer: Customer;
  totalAmount: number;
  items: any[];
  status: string;
}

interface DGQuotation {
  _id: string;
  quotationNumber: string;
  customer: Customer;
  grandTotal: number;
  status: string;
}

interface ProformaInvoice {
  _id: string;
  invoiceNumber: string;
  customer: Customer;
  dgPurchaseOrder?: DGPurchaseOrder;
  quotation?: DGQuotation;
  issueDate: string;
  dueDate: string;
  validUntil: string;
  items: ProformaItem[];
  subtotal: number;
  totalTax: number;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  customerAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  companyDetails: {
    name: string;
    address: string;
    phone: string;
    email: string;
    pan: string;
    gst: string;
    bankDetails: {
      bankName: string;
      accountNo: string;
      ifsc: string;
      branch: string;
    };
  };
  terms: string;
  notes: string;
  status: ProformaStatus;
  purpose: ProformaPurpose;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProformaFormData {
  customerId: string;
  dgPurchaseOrderId?: string;
  quotationId?: string;
  issueDate: string;
  dueDate: string;
  validUntil: string;
  items: ProformaItem[];
  subtotal: number;
  totalTax: number;
  totalAmount: number;
  advanceAmount: number;
  balanceAmount: number;
  customerAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
  };
  companyDetails: {
    name: string;
    address: string;
    phone: string;
    email: string;
    pan: string;
    gst: string;
    bankDetails: {
      bankName: string;
      accountNo: string;
      ifsc: string;
      branch: string;
    };
  };
  terms: string;
  notes: string;
  purpose: ProformaPurpose;
}

interface FormErrors {
  customerId?: string;
  issueDate?: string;
  dueDate?: string;
  validUntil?: string;
  items?: string;
  customerAddress?: string;
  companyDetails?: string;
  purpose?: string;
  [key: string]: string | undefined;
}

const DGProformaManagement: React.FC = () => {
  // State Management
  const [proformaInvoices, setProformaInvoices] = useState<ProformaInvoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<DGPurchaseOrder[]>([]);
  const [quotations, setQuotations] = useState<DGQuotation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [gensetProducts, setGensetProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Product search states
  const [productSearchTerms, setProductSearchTerms] = useState<{ [key: number]: string }>({});
  const [showProductDropdowns, setShowProductDropdowns] = useState<{ [key: number]: boolean }>({});
  const [highlightedProductIndex, setHighlightedProductIndex] = useState<{ [key: number]: number }>({});

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [editingProforma, setEditingProforma] = useState<ProformaInvoice | null>(null);
  const [selectedProforma, setSelectedProforma] = useState<ProformaInvoice | null>(null);

  // Form States
  const [formData, setFormData] = useState<ProformaFormData>({
    customerId: '',
    dgPurchaseOrderId: '',
    quotationId: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{
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
    subtotal: 0,
    totalTax: 0,
    totalAmount: 0,
    advanceAmount: 0,
    balanceAmount: 0,
    customerAddress: {
      address: 'Address will be filled when customer is selected',
      state: 'State will be filled when customer is selected',
      district: 'District will be filled when customer is selected',
      pincode: '000000'
    },
    companyDetails: {
      name: 'Sun Power Solutions',
      address: '123 Business Park, Industrial Area, City - 123456',
      phone: '+91 98765 43210',
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
    terms: '',
    notes: '',
    purpose: 'loan'
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch data when page changes
  useEffect(() => {
    fetchProformaInvoices();
  }, [currentPage, searchTerm]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCustomers(),
        fetchPurchaseOrders(),
        fetchQuotations(),
        fetchProducts()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProformaInvoices = async () => {
    try {
      const params = {
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm
      };
      const response = await apiClient.dgSales.proformaInvoices.getAll(params);
      setProformaInvoices(response.data || []);
      setTotalItems(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error('Error fetching proforma invoices:', error);
      setProformaInvoices([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll({});
      let customersData: Customer[] = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          customersData = response.data;
        } else if ((response.data as any).customers && Array.isArray((response.data as any).customers)) {
          customersData = (response.data as any).customers;
        }
      }
      
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      const response = await apiClient.dgSales.purchaseOrders.getAll();
      setPurchaseOrders(response.data || []);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrders([]);
    }
  };

  const fetchQuotations = async () => {
    try {
      const response = await apiClient.dgSales.quotations.getAll();
      setQuotations(response.data || []);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      setQuotations([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll({limit: 100});
      let productsData: Product[] = [];
      
      if (response.data) {
        if (Array.isArray(response.data)) {
          productsData = response.data;
        } else if ((response.data as any).products && Array.isArray((response.data as any).products)) {
          productsData = (response.data as any).products;
        }
      }

      console.log("productsData:",productsData);
      
      
      setProducts(productsData);
      
      // Filter genset products
      const gensetItems = productsData.filter(product => 
        product.category === 'genset'
        // product.productType1?.toLowerCase().includes('genset') ||
        // product.productType2?.toLowerCase().includes('genset') ||
        // product.productType3?.toLowerCase().includes('genset') ||
        // product.name?.toLowerCase().includes('genset')
      );

      console.log("gensetItems:",gensetItems);
      
      setGensetProducts(gensetItems);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
      setGensetProducts([]);
    }
  };

  // Form handling functions
  const handleCreateProforma = () => {
    setFormData({
      customerId: '',
      dgPurchaseOrderId: '',
      quotationId: '',
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [{
        productId: '',
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
      subtotal: 0,
      totalTax: 0,
      totalAmount: 0,
      advanceAmount: 0,
      balanceAmount: 0,
      customerAddress: {
        address: 'Address will be filled when customer is selected',
        state: 'State will be filled when customer is selected',
        district: 'District will be filled when customer is selected',
        pincode: '000000'
      },
      companyDetails: {
        name: 'Sun Power Solutions',
        address: '123 Business Park, Industrial Area, City - 123456',
        phone: '+91 98765 43210',
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
      terms: '',
      notes: '',
      purpose: 'loan'
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleEditProforma = (proforma: ProformaInvoice) => {
    setEditingProforma(proforma);
    setFormData({
      customerId: proforma.customer._id,
      dgPurchaseOrderId: proforma.dgPurchaseOrder?._id || '',
      quotationId: proforma.quotation?._id || '',
      issueDate: proforma.issueDate.split('T')[0],
      dueDate: proforma.dueDate.split('T')[0],
      validUntil: proforma.validUntil.split('T')[0],
      items: proforma.items,
      subtotal: proforma.subtotal,
      totalTax: proforma.totalTax,
      totalAmount: proforma.totalAmount,
      advanceAmount: proforma.advanceAmount,
      balanceAmount: proforma.balanceAmount,
      customerAddress: proforma.customerAddress,
      companyDetails: proforma.companyDetails,
      terms: proforma.terms || '',
      notes: proforma.notes || '',
      purpose: proforma.purpose
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleViewProforma = (proforma: ProformaInvoice) => {
    setSelectedProforma(proforma);
    setShowViewModal(true);
  };

  const handleSendProforma = (proforma: ProformaInvoice) => {
    setSelectedProforma(proforma);
    setShowSendModal(true);
  };

  // Validation function
  const validateForm = (): boolean => {
    console.log('🔍 Starting form validation...');
    const errors: FormErrors = {};

    // Check customer
    if (!formData.customerId) {
      console.log('❌ Customer validation failed');
      errors.customerId = 'Customer is required';
    } else {
      console.log('✅ Customer validation passed');
    }

    // Check issue date
    if (!formData.issueDate) {
      console.log('❌ Issue date validation failed');
      errors.issueDate = 'Issue date is required';
    } else {
      console.log('✅ Issue date validation passed');
    }

    // Due date is optional for proforma invoice
    // if (!formData.dueDate) {
    //   errors.dueDate = 'Due date is required';
    // }

    // Check valid until date
    if (!formData.validUntil) {
      console.log('❌ Valid until date validation failed');
      errors.validUntil = 'Valid until date is required';
    } else {
      console.log('✅ Valid until date validation passed');
    }

    // Check purpose
    if (!formData.purpose) {
      console.log('❌ Purpose validation failed');
      errors.purpose = 'Purpose is required';
    } else {
      console.log('✅ Purpose validation passed');
    }

    // Customer address validation - required by backend
    const isPlaceholderAddress = formData.customerAddress.address.includes('will be filled when customer is selected');
    const isPlaceholderState = formData.customerAddress.state.includes('will be filled when customer is selected');
    const isPlaceholderDistrict = formData.customerAddress.district.includes('will be filled when customer is selected');
    
    if (!formData.customerAddress.address || formData.customerAddress.address.trim() === '' || isPlaceholderAddress) {
      console.log('❌ Customer address validation failed');
      errors.customerAddress = 'Please select a customer or enter valid address details';
    }
    if (!formData.customerAddress.state || formData.customerAddress.state.trim() === '' || isPlaceholderState) {
      console.log('❌ Customer state validation failed');
      errors.customerAddress = 'Please select a customer or enter valid address details';
    }
    if (!formData.customerAddress.district || formData.customerAddress.district.trim() === '' || isPlaceholderDistrict) {
      console.log('❌ Customer district validation failed');
      errors.customerAddress = 'Please select a customer or enter valid address details';
    }
    if (!formData.customerAddress.pincode || formData.customerAddress.pincode.trim() === '' || formData.customerAddress.pincode === '000000' || formData.customerAddress.pincode === '123456') {
      console.log('❌ Customer pincode validation failed');
      errors.customerAddress = 'Please select a customer or enter valid pincode';
    }
    if (!errors.customerAddress) {
      console.log('✅ Customer address validation passed');
    }

    // Company details should have defaults so this should not fail
    if (!formData.companyDetails.name) {
      console.log('❌ Company details validation failed');
      errors.companyDetails = 'Company name is required';
    } else {
      console.log('✅ Company details validation passed');
    }

    // Validate items
    console.log('🔍 Validating items:', formData.items);
    if (formData.items.length === 0) {
      console.log('❌ Items validation failed - no items');
      errors.items = 'At least one item is required';
    } else {
      let hasValidItem = false;
      formData.items.forEach((item, index) => {
        console.log(`🔍 Validating item ${index + 1}:`, item);
        
        if (!item.description || item.description.trim() === '') {
          console.log(`❌ Item ${index + 1} description validation failed`);
          errors[`item_${index}_description`] = 'Item description is required';
        }
        if (item.quantity <= 0) {
          console.log(`❌ Item ${index + 1} quantity validation failed:`, item.quantity);
          errors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
        }
        if (item.unitPrice <= 0) {
          console.log(`❌ Item ${index + 1} unit price validation failed:`, item.unitPrice);
          errors[`item_${index}_unitPrice`] = 'Unit price must be greater than 0';
        }
        
        if (!errors[`item_${index}_description`] && 
            !errors[`item_${index}_quantity`] && 
            !errors[`item_${index}_unitPrice`]) {
          console.log(`✅ Item ${index + 1} validation passed`);
          hasValidItem = true;
        }
      });
      
      if (!hasValidItem && formData.items.length > 0) {
        console.log('❌ No valid items found');
        errors.items = 'At least one valid item with description, quantity > 0, and price > 0 is required';
      }
    }

    console.log('📋 Final validation errors:', errors);
    setFormErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    console.log('🎯 Validation result:', isValid);
    return isValid;
  };

  // Calculate totals
  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = formData.items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + totalTax;
    const balanceAmount = totalAmount - formData.advanceAmount;

    setFormData(prev => ({
      ...prev,
      subtotal,
      totalTax,
      totalAmount,
      balanceAmount
    }));
  };

  // Recalculate totals when items change (but avoid infinite loops)
  useEffect(() => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = formData.items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + totalTax;
    const balanceAmount = totalAmount - formData.advanceAmount;

    // Only update if values have actually changed
    if (formData.subtotal !== subtotal || formData.totalTax !== totalTax || 
        formData.totalAmount !== totalAmount || formData.balanceAmount !== balanceAmount) {
      setFormData(prev => ({
        ...prev,
        subtotal,
        totalTax,
        totalAmount,
        balanceAmount
      }));
    }
  }, [formData.items, formData.advanceAmount]);

  // Product search utilities
  const updateProductSearchTerm = (index: number, term: string) => {
    setProductSearchTerms(prev => ({ ...prev, [index]: term }));
  };

  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm.trim()) return gensetProducts;
    
    const term = searchTerm.toLowerCase();
    return gensetProducts.filter(product =>
      product.name?.toLowerCase().includes(term) ||
      product.partNo?.toLowerCase().includes(term) ||
      product.brand?.toLowerCase().includes(term) ||
      product.modelNumber?.toLowerCase().includes(term) ||
      product.category?.toLowerCase().includes(term)
    );
  };

  const getProductName = (productId: string) => {
    const product = gensetProducts.find(p => p._id === productId);
    return product?.name || '';
  };

  const getProductPartNo = (productId: string) => {
    const product = gensetProducts.find(p => p._id === productId);
    return product?.partNo || '';
  };

  // Add new item
  const addProformaItem = () => {
    const newItem: ProformaItem = {
      productId: '',
      description: '',
      specifications: '',
      kva: '',
      phase: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      taxAmount: 0,
      totalPrice: 0
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  // Remove item
  const removeProformaItem = (index: number) => {
    if (formData.items.length <= 1) return;
    
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Update item field
  const updateProformaItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    
    if (field === 'product') {
      const selectedProduct = gensetProducts.find(p => p._id === value);
      if (selectedProduct) {
        console.log('Auto-filling product:', selectedProduct);
        
        // Build comprehensive description with product details
        let productDescription = selectedProduct.name;
        if (selectedProduct.brand) {
          productDescription += ` - ${selectedProduct.brand}`;
        }
        if (selectedProduct.modelNumber) {
          productDescription += ` ${selectedProduct.modelNumber}`;
        }
        if (selectedProduct.make && selectedProduct.make !== selectedProduct.brand) {
          productDescription += ` (${selectedProduct.make})`;
        }

        // Build detailed specifications
        let detailedSpecs = selectedProduct.description || '';
        if (selectedProduct.specifications) {
          const specs = selectedProduct.specifications;
          const specParts = [];
          
          if (specs.kva) specParts.push(`KVA: ${specs.kva}`);
          if (specs.phase) specParts.push(`Phase: ${specs.phase}`);
          if (specs.power) specParts.push(`Power: ${specs.power}`);
          if (specs.voltage) specParts.push(`Voltage: ${specs.voltage}`);
          if (specs.frequency) specParts.push(`Frequency: ${specs.frequency}`);
          if (specs.fuelType) specParts.push(`Fuel: ${specs.fuelType}`);
          if (specs.engineModel) specParts.push(`Engine: ${specs.engineModel}`);
          if (specs.alternatorModel) specParts.push(`Alternator: ${specs.alternatorModel}`);
          
          if (specParts.length > 0) {
            if (detailedSpecs) {
              detailedSpecs += ' | ' + specParts.join(', ');
            } else {
              detailedSpecs = specParts.join(', ');
            }
          }
        }

        // Extract KVA and Phase with enhanced logic
        let kvaValue = '';
        let phaseValue = '';
        
        if (selectedProduct.specifications) {
          kvaValue = selectedProduct.specifications.kva || 
                    selectedProduct.specifications.rating || 
                    selectedProduct.specifications.capacity || '';
          phaseValue = selectedProduct.specifications.phase || 
                      selectedProduct.specifications.phaseType || '';
        }
        
        // Try to extract KVA from product name if not in specifications
        if (!kvaValue && selectedProduct.name) {
          const kvaMatch = selectedProduct.name.match(/(\d+)\s*kva/i);
          if (kvaMatch) {
            kvaValue = `${kvaMatch[1]} KVA`;
          }
        }
        
        // Set default phase if not specified
        if (!phaseValue) {
          // Try to detect from name or default to common genset configuration
          if (selectedProduct.name?.toLowerCase().includes('single')) {
            phaseValue = 'Single Phase';
          } else if (selectedProduct.name?.toLowerCase().includes('three')) {
            phaseValue = 'Three Phase';
          } else {
            phaseValue = 'Three Phase'; // Default for most gensets
          }
        }

        // Auto-fill all relevant fields
        newItems[index] = {
          ...newItems[index],
          productId: selectedProduct._id,
          description: productDescription,
          specifications: detailedSpecs,
          unitPrice: selectedProduct.price || 0,
          taxRate: selectedProduct.gst || 18,
          kva: kvaValue,
          phase: phaseValue
        };

        console.log('Auto-filled item data:', {
          productName: selectedProduct.name,
          description: productDescription,
          specifications: detailedSpecs,
          unitPrice: selectedProduct.price,
          taxRate: selectedProduct.gst,
          kva: kvaValue,
          phase: phaseValue
        });

        // Show success toast notification
        toast.success(`✅ Auto-filled: ${selectedProduct.name} - ₹${(selectedProduct.price || 0).toLocaleString()}`, {
          duration: 3000,
          position: 'top-right',
          style: {
            background: '#10B981',
            color: 'white',
          },
        });
      }
    } else {
      (newItems[index] as any)[field] = value;
    }

    // Recalculate for this item
    const item = newItems[index];
    item.taxAmount = (item.quantity * item.unitPrice * item.taxRate) / 100;
    item.totalPrice = (item.quantity * item.unitPrice) + item.taxAmount;

    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // Keyboard navigation handlers
  const handleProductKeyDown = (e: React.KeyboardEvent, index: number) => {
    const filteredProducts = getFilteredProducts(productSearchTerms[index] || '');
    const currentHighlighted = highlightedProductIndex[index] || -1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentHighlighted < filteredProducts.length - 1 ? currentHighlighted + 1 : 0;
        setHighlightedProductIndex(prev => ({ ...prev, [index]: nextIndex }));
        break;

      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentHighlighted > 0 ? currentHighlighted - 1 : filteredProducts.length - 1;
        setHighlightedProductIndex(prev => ({ ...prev, [index]: prevIndex }));
        break;

      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (currentHighlighted >= 0 && filteredProducts[currentHighlighted]) {
          updateProformaItem(index, 'product', filteredProducts[currentHighlighted]._id);
          setShowProductDropdowns(prev => ({ ...prev, [index]: false }));
          updateProductSearchTerm(index, '');
          setHighlightedProductIndex(prev => ({ ...prev, [index]: -1 }));
          
          // Focus next field
          setTimeout(() => {
            const quantityInput = document.querySelector(`[data-row="${index}"][data-field="quantity"]`) as HTMLInputElement;
            if (quantityInput) {
              quantityInput.focus();
              quantityInput.select();
            }
          }, 50);
        }
        break;

      case 'Escape':
        setShowProductDropdowns(prev => ({ ...prev, [index]: false }));
        updateProductSearchTerm(index, '');
        break;
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, index: number, field: string) => {
    switch (e.key) {
      case 'Tab':
        if (!e.shiftKey && field === 'totalPrice') {
          e.preventDefault();
          addProformaItem();
          setTimeout(() => {
            const nextProductInput = document.querySelector(`[data-row="${index + 1}"][data-field="product"]`) as HTMLInputElement;
            if (nextProductInput) {
              nextProductInput.focus();
            }
          }, 50);
        }
        break;

      case 'Enter':
        e.preventDefault();
        if (field === 'totalPrice') {
          addProformaItem();
          setTimeout(() => {
            const nextProductInput = document.querySelector(`[data-row="${index + 1}"][data-field="product"]`) as HTMLInputElement;
            if (nextProductInput) {
              nextProductInput.focus();
            }
          }, 50);
        }
        break;
    }
  };

  // Handle product selection (Legacy function - now uses updateProformaItem)
  const handleProductSelect = (index: number, productId: string) => {
    console.log('handleProductSelect called for product:', productId);
    updateProformaItem(index, 'product', productId);
  };

  // Update item calculations (kept for backward compatibility)
  const updateItemCalculations = (index: number) => {
    const newItems = [...formData.items];
    const item = newItems[index];
    item.taxAmount = (item.quantity * item.unitPrice * item.taxRate) / 100;
    item.totalPrice = (item.quantity * item.unitPrice) + item.taxAmount;
    
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  // Form submission
  const handleFormSubmit = async () => {
    console.log('🚀 Form submission started');
    console.log('📋 Current form data:', formData);
    
    const isValid = validateForm();
    console.log('✅ Validation result:', isValid);
    console.log('❌ Form errors:', formErrors);
    
    if (!isValid) {
      console.log('🛑 Form validation failed, stopping submission');
      toast.error('Please fix the validation errors before submitting', {
        duration: 4000,
        position: 'top-right',
      });
      return;
    }

    setSubmitting(true);
    console.log('🔄 Starting API call...');
    
    try {
      const submitData = {
        ...formData,
        customerId: formData.customerId,
        dgPurchaseOrderId: formData.dgPurchaseOrderId || undefined,
        quotationId: formData.quotationId || undefined
      };

      console.log('📤 Submitting data:', submitData);

      if (editingProforma) {
        console.log('📝 Updating existing proforma:', editingProforma._id);
        await (apiClient as any).dgSales.proformaInvoices.update(editingProforma._id, submitData);
        toast.success('✅ Proforma invoice updated successfully!');
      } else {
        console.log('🆕 Creating new proforma');
        const response = await (apiClient as any).dgSales.proformaInvoices.create(submitData);
        console.log('✅ Create response:', response);
        toast.success('✅ Proforma invoice created successfully!');
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingProforma(null);
      fetchProformaInvoices();
    } catch (error: any) {
      console.error('💥 Error saving proforma invoice:', error);
      toast.error(`❌ Error: ${error?.message || 'Failed to save proforma invoice'}`, {
        duration: 5000,
        position: 'top-right',
      });
    } finally {
      setSubmitting(false);
      console.log('✅ Form submission completed');
    }
  };

  // Status management
  const handleStatusUpdate = async (proformaId: string, newStatus: ProformaStatus) => {
    try {
      await apiClient.dgSales.proformaInvoices.updateStatus(proformaId, newStatus);
      fetchProformaInvoices();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Delete proforma
  const handleDeleteProforma = async (proformaId: string) => {
    if (window.confirm('Are you sure you want to delete this proforma invoice?')) {
      try {
        await apiClient.dgSales.proformaInvoices.delete(proformaId);
        fetchProformaInvoices();
      } catch (error) {
        console.error('Error deleting proforma invoice:', error);
      }
    }
  };

  // Send proforma to customer
  const handleSendToCustomer = async () => {
    if (!selectedProforma) return;

    setSubmitting(true);
    try {
      await apiClient.dgSales.proformaInvoices.updateStatus(selectedProforma._id, 'sent');
      setShowSendModal(false);
      fetchProformaInvoices();
      // Here you would typically integrate with email service
      alert('Proforma invoice sent to customer successfully!');
    } catch (error) {
      console.error('Error sending proforma invoice:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Utility functions
  const getStatusColor = (status: ProformaStatus) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'used': return 'bg-purple-100 text-purple-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPurposeColor = (purpose: ProformaPurpose) => {
    switch (purpose) {
      case 'loan': return 'bg-blue-100 text-blue-800';
      case 'finance': return 'bg-green-100 text-green-800';
      case 'advance': return 'bg-yellow-100 text-yellow-800';
      case 'other': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">DG Proforma Invoices</h2>
              <p className="text-gray-600 mt-1">Manage proforma invoices for financing and advance payments</p>
            </div>
            <Button onClick={handleCreateProforma} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Proforma Invoice
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by invoice number, customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" onClick={fetchProformaInvoices}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Proforma</p>
                <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(proformaInvoices.reduce((sum, pi) => sum + pi.totalAmount, 0))}
                </p>
              </div>
              <IndianRupee className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Approval</p>
                <p className="text-2xl font-bold text-gray-900">
                  {proformaInvoices.filter(pi => pi.status === 'sent').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-gray-900">
                  {proformaInvoices.filter(pi => pi.status === 'expired').length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </Card>
        </div>
      </div>

      {/* Proforma Invoices Table */}
      <div className="bg-white rounded-lg shadow">
        <Table
          columns={[
            { key: 'invoiceNumber', title: 'Invoice Number', sortable: true },
            { key: 'customer', title: 'Customer' },
            { key: 'issueDate', title: 'Issue Date', sortable: true },
            { key: 'validUntil', title: 'Valid Until', sortable: true },
            { key: 'totalAmount', title: 'Amount', sortable: true },
            { key: 'purpose', title: 'Purpose' },
            { key: 'status', title: 'Status' },
            { key: 'actions', title: 'Actions' }
          ]}
          data={proformaInvoices.map(pi => ({
            invoiceNumber: (
              <div className="font-medium text-gray-900">
                {pi.invoiceNumber}
              </div>
            ),
            customer: (
              <div>
                <div className="font-medium text-gray-900">{pi.customer.name}</div>
                <div className="text-sm text-gray-500">{pi.customer.email}</div>
              </div>
            ),
            issueDate: formatDate(pi.issueDate),
            validUntil: formatDate(pi.validUntil),
            totalAmount: (
              <div className="font-medium text-gray-900">
                {formatCurrency(pi.totalAmount)}
              </div>
            ),
            purpose: (
              <Badge className={getPurposeColor(pi.purpose)}>
                {pi.purpose.charAt(0).toUpperCase() + pi.purpose.slice(1)}
              </Badge>
            ),
            status: (
              <Badge className={getStatusColor(pi.status)}>
                {pi.status.charAt(0).toUpperCase() + pi.status.slice(1)}
              </Badge>
            ),
            actions: (
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewProforma(pi)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {/* {pi.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditProforma(pi)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )} */}
                {pi.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => handleSendProforma(pi)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
                {pi.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteProforma(pi._id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )
          }))}
          loading={loading}
          pagination={{
            page: currentPage,
            pages: totalPages,
            total: totalItems,
            limit: itemsPerPage
          }}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Create/Edit Proforma Modal */}
      {(showCreateModal || showEditModal) && (
        <Modal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setEditingProforma(null);
          }}
          size="xl"
        >
          <div className="">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {showCreateModal ? 'Create Proforma Invoice' : 'Edit Proforma Invoice'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {showCreateModal ? 'Create a new proforma invoice for financing purposes' : `Editing: ${editingProforma?.invoiceNumber}`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setEditingProforma(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.customerId}
                      onChange={(e) => {
                        const customer = customers.find(c => c._id === e.target.value);
                        console.log('Selected customer:', customer);
                        
                        if (customer) {
                          // Build comprehensive customer address with fallbacks
                          const customerAddress = {
                            address: customer.address || customer.corporateName || `${customer.name} Office Address`,
                            state: customer.district || customer.tehsil || 'Unknown State', 
                            district: customer.district || customer.tehsil || 'Unknown District',
                            pincode: customer.pinCode || '123456' // Use a valid-looking default
                          };
                          
                          console.log('Setting customer address:', customerAddress);
                          
                          setFormData(prev => ({
                            ...prev,
                            customerId: e.target.value,
                            customerAddress: customerAddress
                          }));
                          
                          // Show appropriate toast based on address quality
                          if (customer.address && customer.pinCode) {
                            toast.success(`✅ Customer & Address auto-filled: ${customer.name}`, {
                              duration: 2000,
                              position: 'top-right',
                            });
                          } else {
                            toast(`⚠️ Customer selected: ${customer.name}. Please verify address details.`, {
                              duration: 3000,
                              position: 'top-right',
                              style: {
                                background: '#F59E0B',
                                color: 'white',
                              },
                            });
                          }
                        } else {
                          setFormData(prev => ({
                            ...prev,
                            customerId: e.target.value,
                            customerAddress: {
                              address: 'Please enter customer address',
                              state: 'Please enter state',
                              district: 'Please enter district',
                              pincode: '123456'
                            }
                          }));
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.customerId ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="">Select customer...</option>
                      {!Array.isArray(customers) || customers.length === 0 ? (
                        <option value="" disabled>Loading customers...</option>
                      ) : (
                        customers?.map(customer => (
                          <option key={customer._id} value={customer._id}>
                            {customer.name} - {customer.email}
                          </option>
                        ))
                      )}
                    </select>
                    {formErrors.customerId && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.customerId}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purchase Order
                    </label>
                    <select
                      value={formData.dgPurchaseOrderId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, dgPurchaseOrderId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select purchase order...</option>
                      {!Array.isArray(purchaseOrders) || purchaseOrders.length === 0 ? (
                        <option value="" disabled>Loading purchase orders...</option>
                      ) : (
                        purchaseOrders.map(po => (
                          <option key={po._id} value={po._id}>
                            {po.poNumber} - {po.customer.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quotation
                    </label>
                    <select
                      value={formData.quotationId || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, quotationId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select quotation...</option>
                      {!Array.isArray(quotations) || quotations.length === 0 ? (
                        <option value="" disabled>Loading quotations...</option>
                      ) : (
                        quotations.map(quote => (
                          <option key={quote._id} value={quote._id}>
                            {quote.quotationNumber} - {quote.customer.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Issue Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.issueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.issueDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.issueDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.issueDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valid Until <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData(prev => ({ ...prev, validUntil: e.target.value }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.validUntil ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.validUntil && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.validUntil}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Purpose <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.purpose}
                      onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value as ProformaPurpose }))}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.purpose ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <option value="loan">Loan</option>
                      <option value="finance">Finance</option>
                      <option value="advance">Advance Payment</option>
                      <option value="other">Other</option>
                    </select>
                    {formErrors.purpose && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.purpose}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Customer Address Section */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Address <span className="text-red-500">*</span></h3>
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    💡 Auto-filled when customer is selected
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.customerAddress.address}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        customerAddress: { ...prev.customerAddress, address: e.target.value }
                      }))}
                      rows={3}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.customerAddress ? 'border-red-500' : 'border-gray-300'}`}
                      placeholder="Enter customer address"
                    />
                    {formErrors.customerAddress && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.customerAddress}</p>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.customerAddress.state}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customerAddress: { ...prev.customerAddress, state: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter state"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        District <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.customerAddress.district}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customerAddress: { ...prev.customerAddress, district: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter district"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pin Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.customerAddress.pincode}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          customerAddress: { ...prev.customerAddress, pincode: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter pin code"
                        maxLength={6}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Proforma Items</h3>
                  <Button
                    onClick={addProformaItem}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Row</span>
                  </Button>
                </div>

                {formErrors.items && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{formErrors.items}</p>
                  </div>
                )}

                {/* Desktop Table View */}
                <div className="hidden lg:block border border-gray-300 rounded-lg bg-white shadow-sm overflow-x-auto">
                  {/* Table Header */}
                  <div className="bg-gray-100 border-b border-gray-300 min-w-[1000px]">
                    <div className="grid text-xs font-bold text-gray-800 uppercase tracking-wide"
                         style={{ gridTemplateColumns: '60px 150px 1fr 100px 80px 100px 80px 100px 60px' }}>
                      <div className="p-3 border-r border-gray-300 text-center bg-gray-200">S.No</div>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">Product Code</div>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">Product Name</div>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">Quantity</div>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">GST(%)</div>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">Unit Price</div>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">Tax Amount</div>
                      <div className="p-3 border-r border-gray-300 bg-gray-200">Total</div>
                      <div className="p-3 text-center bg-gray-200 font-medium"></div>
                    </div>
                  </div>

                  {/* Table Body */}
                  <div className="divide-y divide-gray-200 min-w-[1000px]">
                    {formData.items.map((item, index) => {
                      const rowBg = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                      return (
                        <div key={index} className={`grid group hover:bg-blue-50 transition-colors ${rowBg}`}
                             style={{ gridTemplateColumns: '60px 150px 1fr 100px 80px 100px 80px 100px 60px' }}>
                          
                          {/* S.No */}
                          <div className="p-2 border-r border-gray-200 text-center text-sm font-medium text-gray-600 flex items-center justify-center">
                            {index + 1}
                          </div>

                          {/* Product Code with Enhanced Search */}
                          <div className="p-1 border-r border-gray-200 relative">
                            <input
                              type="text"
                              value={productSearchTerms[index] || getProductPartNo(item.productId || '')}
                              onChange={(e) => {
                                updateProductSearchTerm(index, e.target.value);
                                setShowProductDropdowns({
                                  ...showProductDropdowns,
                                  [index]: true
                                });
                                setHighlightedProductIndex({
                                  ...highlightedProductIndex,
                                  [index]: -1
                                });
                              }}
                              onFocus={() => {
                                if (!productSearchTerms[index] && !item.productId) {
                                  updateProductSearchTerm(index, '');
                                }
                                setShowProductDropdowns({
                                  ...showProductDropdowns,
                                  [index]: true
                                });
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setShowProductDropdowns({
                                    ...showProductDropdowns,
                                    [index]: false
                                  });
                                }, 200);
                              }}
                              onKeyDown={(e) => handleProductKeyDown(e, index)}
                              data-row={index}
                              data-field="product"
                              className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                              placeholder="Type to search..."
                              autoComplete="off"
                            />
                            {showProductDropdowns[index] && (
                              <div
                                className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-[400px] overflow-hidden"
                                style={{ width: '450px', minWidth: '450px' }}
                              >
                                <div className="p-2 border-b border-gray-200 bg-gray-50">
                                  <div className="text-xs text-gray-600">
                                    {getFilteredProducts(productSearchTerms[index] || '').length} products found
                                    {productSearchTerms[index] && (
                                      <span className="ml-2 text-blue-600 font-medium">
                                        for "{productSearchTerms[index]}"
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="overflow-y-auto max-h-96">
                                  {getFilteredProducts(productSearchTerms[index] || '').length === 0 ? (
                                    <div className="px-3 py-4 text-center text-sm text-gray-500">
                                      <div>No genset products found</div>
                                      <div className="text-xs mt-1">Try different search terms</div>
                                    </div>
                                  ) : (
                                    getFilteredProducts(productSearchTerms[index] || '').map((product, productIndex) => (
                                      <button
                                        key={product._id}
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          updateProformaItem(index, 'product', product._id);
                                          setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                          updateProductSearchTerm(index, '');
                                          setHighlightedProductIndex({ ...highlightedProductIndex, [index]: -1 });
                                          setTimeout(() => {
                                            const quantityInput = document.querySelector(`[data-row="${index}"][data-field="quantity"]`) as HTMLInputElement;
                                            if (quantityInput) {
                                              quantityInput.focus();
                                              quantityInput.select();
                                            }
                                          }, 50);
                                        }}
                                        className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${
                                          item.productId === product._id ? 'bg-blue-100 text-blue-800' :
                                          highlightedProductIndex[index] === productIndex ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                          'text-gray-700'
                                        }`}
                                      >
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1 min-w-0 pr-4">
                                            <div className="font-medium text-gray-900 mb-1 flex items-center">
                                              <div><span className="font-medium">Part No:</span> {product?.partNo}</div>
                                              {highlightedProductIndex[index] === productIndex && (
                                                <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                                  Selected - Press Enter
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-0.5">
                                              <div><span className="font-medium">Name:</span> {product?.name || 'N/A'}</div>
                                              <div>
                                                <span className="font-medium">Brand:</span> {product?.brand || 'N/A'} •
                                                <span className="font-medium"> Category:</span> {product?.category || 'N/A'}
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right flex-shrink-0 ml-4">
                                            <div className="font-bold text-lg text-green-600">₹{product?.price?.toLocaleString() || '0'}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">per unit</div>
                                          </div>
                                        </div>
                                      </button>
                                    ))
                                  )}
                                </div>

                                <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Tab/Enter</kbd> Select •
                                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Product Name */}
                          <div className="p-1 border-r border-gray-200">
                            <input
                              type="text"
                              value={item.productId ? getProductName(item.productId) : (item.description || '')}
                              onChange={(e) => updateProformaItem(index, 'description', e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, index, 'description')}
                              data-row={index}
                              data-field="description"
                              className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500"
                              placeholder="Product Name"
                            />
                          </div>

                          {/* Quantity */}
                          <div className="p-1 border-r border-gray-200">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={(e) => updateProformaItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              onKeyDown={(e) => handleCellKeyDown(e, index, 'quantity')}
                              data-row={index}
                              data-field="quantity"
                              className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                              placeholder="1"
                            />
                          </div>

                          {/* GST */}
                          <div className="p-1 border-r border-gray-200">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.taxRate || 0}
                              onChange={(e) => updateProformaItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => handleCellKeyDown(e, index, 'taxRate')}
                              data-row={index}
                              data-field="taxRate"
                              className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                              placeholder="18"
                            />
                          </div>

                          {/* Unit Price */}
                          <div className="p-1 border-r border-gray-200">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice.toFixed(2)}
                              onChange={(e) => updateProformaItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              onKeyDown={(e) => handleCellKeyDown(e, index, 'unitPrice')}
                              data-row={index}
                              data-field="unitPrice"
                              className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 text-right"
                              placeholder="0.00"
                            />
                          </div>

                          {/* Tax Amount */}
                          <div className="p-1 border-r border-gray-200">
                            <div className="p-2 text-sm text-right text-gray-600">
                              ₹{item.taxAmount?.toFixed(2) || '0.00'}
                            </div>
                          </div>

                          {/* Total */}
                          <div className="p-1 border-r border-gray-200">
                            <div 
                              className="p-2 text-sm text-right font-bold text-blue-600"
                              data-row={index}
                              data-field="totalPrice"
                              tabIndex={0}
                              onKeyDown={(e) => handleCellKeyDown(e, index, 'totalPrice')}
                            >
                              ₹{item.totalPrice?.toFixed(2) || '0.00'}
                            </div>
                          </div>

                          {/* Remove Button */}
                          <div className="p-0 h-full">
                            <button
                              onClick={() => removeProformaItem(index)}
                              className="w-full h-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center justify-center border-0 hover:bg-red-100 bg-transparent"
                              title="Remove this item"
                              disabled={formData.items.length <= 1}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Navigation Hints */}
                  <div className="bg-gray-50 border-t border-gray-200 p-3 text-center min-w-[1000px]">
                    <div className="text-sm text-gray-600 mb-1 mt-20">
                      <strong>🚀 Excel-Like Proforma Items:</strong> Search → Select → Set Quantity → Tab → Next Row
                    </div>
                    <div className="text-xs text-gray-500  mb-10">
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded">Type</kbd> Search Product →
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">↑↓</kbd> Navigate →
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Enter</kbd> Select →
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Tab</kbd> Next Field →
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Enter on Total</kbd> Add Row
                    </div>
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                        <button
                          onClick={() => removeProformaItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                          title="Remove this item"
                          disabled={formData.items.length <= 1}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Product Selection */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={productSearchTerms[index] || getProductPartNo(item.productId || '')}
                              onChange={(e) => {
                                updateProductSearchTerm(index, e.target.value);
                                setShowProductDropdowns({
                                  ...showProductDropdowns,
                                  [index]: true
                                });
                              }}
                              onFocus={() => {
                                setShowProductDropdowns({
                                  ...showProductDropdowns,
                                  [index]: true
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Search genset product..."
                              autoComplete="off"
                            />
                            {showProductDropdowns[index] && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                {getFilteredProducts(productSearchTerms[index] || '').map((product) => (
                                  <button
                                    key={product._id}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      updateProformaItem(index, 'product', product._id);
                                      setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                      updateProductSearchTerm(index, '');
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0"
                                  >
                                    <div className="font-medium">{product.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {product.partNo} • ₹{product.price?.toLocaleString()}
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateProformaItem(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Item description"
                          />
                        </div>

                        {/* Quantity and Unit Price */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateProformaItem(index, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice.toFixed(2)}
                              onChange={(e) => updateProformaItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                        </div>

                        {/* Tax Rate */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.taxRate}
                            onChange={(e) => updateProformaItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="18"
                          />
                        </div>

                        {/* Total */}
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="text-sm font-medium text-gray-700">Total:</span>
                          <span className="text-lg font-bold text-blue-600">
                            ₹{item.totalPrice?.toFixed(2) || '0.00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">Financial Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium">Subtotal</div>
                    <div className="text-lg font-bold text-blue-900">
                      {formatCurrency(formData.subtotal)}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium">Tax Amount</div>
                    <div className="text-lg font-bold text-blue-900">
                      {formatCurrency(formData.totalTax)}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium">Advance Amount</div>
                    <input
                      type="number"
                      value={formData.advanceAmount}
                      onChange={(e) => {
                        const advanceAmount = parseFloat(e.target.value) || 0;
                        setFormData(prev => ({
                          ...prev,
                          advanceAmount,
                          balanceAmount: prev.totalAmount - advanceAmount
                        }));
                      }}
                      min="0"
                      step="0.01"
                      className="w-full text-lg font-bold text-blue-900 bg-transparent border border-blue-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 font-medium">Balance Amount</div>
                    <div className="text-xl font-bold text-blue-900">
                      {formatCurrency(formData.balanceAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes and Terms */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes & Terms</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter any additional notes..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Terms & Conditions
                    </label>
                    <textarea
                      value={formData.terms}
                      onChange={(e) => setFormData(prev => ({ ...prev, terms: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter terms and conditions..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setEditingProforma(null);
                }}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleFormSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? 'Saving...' : (editingProforma ? 'Update Proforma Invoice' : 'Create Proforma Invoice')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Proforma Modal */}
      {showViewModal && selectedProforma && (
        <Modal
          isOpen={showViewModal}
          onClose={() => setShowViewModal(false)}
          size="6xl"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Proforma Invoice Details</h2>
                <p className="text-gray-600 mt-1">
                  Invoice: <span className="font-semibold">{selectedProforma.invoiceNumber}</span>
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedProforma.invoiceNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Issue Date</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedProforma.issueDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Valid Until</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(selectedProforma.validUntil)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(selectedProforma.totalAmount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <Badge className={getStatusColor(selectedProforma.status)}>
                      {selectedProforma.status.charAt(0).toUpperCase() + selectedProforma.status.slice(1)}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purpose</label>
                    <Badge className={getPurposeColor(selectedProforma.purpose)}>
                      {selectedProforma.purpose.charAt(0).toUpperCase() + selectedProforma.purpose.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedProforma.customer.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedProforma.customer.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedProforma.customer.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PAN</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedProforma.customer.pan || 'Not provided'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedProforma.customerAddress.address && (
                        <>
                          {selectedProforma.customerAddress.address}
                          {selectedProforma.customerAddress.state && `, ${selectedProforma.customerAddress.state}`}
                          {selectedProforma.customerAddress.district && `, ${selectedProforma.customerAddress.district}`}
                          {selectedProforma.customerAddress.pincode && `, ${selectedProforma.customerAddress.pincode}`}
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
                <div className="space-y-4">
                  {selectedProforma.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Description</label>
                          <p className="mt-1 text-sm text-gray-900">{item.description}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Specifications</label>
                          <p className="mt-1 text-sm text-gray-900">{item.specifications || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">KVA Rating</label>
                          <p className="mt-1 text-sm text-gray-900">{item.kva || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Phase</label>
                          <p className="mt-1 text-sm text-gray-900">{item.phase || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Quantity</label>
                          <p className="mt-1 text-sm text-gray-900">{item.quantity}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                          <p className="mt-1 text-sm text-gray-900">{formatCurrency(item.unitPrice)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Tax Rate</label>
                          <p className="mt-1 text-sm text-gray-900">{item.taxRate}%</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Tax Amount</label>
                          <p className="mt-1 text-sm text-gray-900">{formatCurrency(item.taxAmount)}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Total Price</label>
                          <p className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(item.totalPrice)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes and Terms */}
              {(selectedProforma.notes || selectedProforma.terms) && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes & Terms</h3>
                  {selectedProforma.notes && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedProforma.notes}</p>
                    </div>
                  )}
                  {selectedProforma.terms && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedProforma.terms}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge className={getStatusColor(selectedProforma.status)}>
                  {selectedProforma.status.charAt(0).toUpperCase() + selectedProforma.status.slice(1)}
                </Badge>
              </div>
              <div className="flex items-center space-x-3">
                {selectedProforma.status === 'draft' && (
                  <Button
                    onClick={() => handleSendProforma(selectedProforma)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send to Customer
                  </Button>
                )}
                <Button
                  onClick={() => setShowViewModal(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Send Proforma Modal */}
      {showSendModal && selectedProforma && (
        <Modal
          isOpen={showSendModal}
          onClose={() => setShowSendModal(false)}
          size="md"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Send Proforma Invoice</h2>
              <button
                onClick={() => setShowSendModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Mail className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-800">Send to Customer</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      This will send the proforma invoice to {selectedProforma.customer.name} and update the status to "Sent".
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Proforma Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invoice Number:</span>
                    <span className="font-medium">{selectedProforma.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{selectedProforma.customer.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium">{formatCurrency(selectedProforma.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valid Until:</span>
                    <span className="font-medium">{formatDate(selectedProforma.validUntil)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
              <Button
                onClick={() => setShowSendModal(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendToCustomer}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {submitting ? 'Sending...' : 'Send Proforma Invoice'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DGProformaManagement; 