import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  Package,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  Truck,
  AlertTriangle,
  Edit,
  Eye,
  Send,
  X,
  FileText,
  Download,
  RefreshCw,
  User,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Check,
  Ban,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import { Pagination } from 'components/ui/Pagination';

// Types matching backend structure
type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled';

interface POItem {
  product: string | {
    _id: string;
    name: string;
    category: string;
    brand?: string;
    modelNumber?: string;
    partNo?: string;
    price?: number;
    gst?: number;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRate: number;
  receivedQuantity?: number; // Track received quantities
  notes?: string;
}
interface POItem1 {

  product: string,
  description: string,
  quantity: number,
  unitPrice: number,
  taxRate: number

}

interface Supplier {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
}

interface StockLocation {
  _id: string;
  name: string;
  type: string;
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier: string | Supplier;
  supplierEmail: string | any;
  items: POItem[];
  totalAmount: number;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  sourceType?: 'manual' | 'amc' | 'service' | 'inventory';
  sourceId?: string;
  notes?: string;
  attachments?: string[];
  approvedBy?: string;
  createdBy: string | {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  // Virtual fields
  deliveryStatus?: string;
  daysUntilDelivery?: number;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  partNo?: string;
  price?: number;
  gst?: number; // GST rate in percent
  minStockLevel?: number;
  currentStock?: number;
  specifications?: Record<string, any>;
}

interface ReceiveItemsData {
  receivedItems: Array<{
    productId: string;
    quantityReceived: number;
    condition: 'good' | 'damaged' | 'defective';
    batchNumber?: string;
    notes?: string;
  }>;
  items: POItem1[]; // <-- Add this line
  location: string;
  receiptDate: string;
  inspectedBy: string;
  notes?: string;
  supplierName?: string;
  supplierEmail?: string;
  externalInvoiceTotal?: number;
  // New shipping and documentation fields
  shipDate: string;
  docketNumber: string;
  noOfPackages: number;
  gstInvoiceNumber: string;
  invoiceDate: string;
  documentNumber: string;
  documentDate: string;
}

interface POFormData {
  supplier: string;
  supplierEmail: string;
  expectedDeliveryDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sourceType: 'manual' | 'amc' | 'service' | 'inventory';
  sourceId?: string;
  notes?: string;
  items: Array<{
    product: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    notes?: string;
  }>;
}

const PurchaseOrderManagement: React.FC = () => {
  // Core state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [showCreateSupplierDropdown, setShowCreateSupplierDropdown] = useState(false);
  const [showEditSupplierDropdown, setShowEditSupplierDropdown] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDatas, setTotalDatas] = useState(0);
  const [sort, setSort] = useState('-createdAt');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Selected data
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);



  const [newInvoice, setNewInvoice] = useState({
    // customer: '',
    // dueDate: '',
    // invoiceType: 'sale',
    // location: '',
    // notes: '',
    items: [
      {
        product: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxRate: 18
      }
    ],
    // discountAmount: 0,

    // externalInvoiceTotal: 0,
    // reduceStock: true
  });


  // Add these state variables and refs at the top of your component
  const [debouncedExternalTotal, setDebouncedExternalTotal] = useState('');
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);


  // Modal search states
  const [detailsSearchTerm, setDetailsSearchTerm] = useState('');
  const [receiveSearchTerm, setReceiveSearchTerm] = useState('');

  // Form data
  const [formData, setFormData] = useState<POFormData>({
    supplier: '',
    supplierEmail: '',
    expectedDeliveryDate: '',
    priority: 'low',
    sourceType: 'manual',
    sourceId: '',
    notes: '',
    items: [{ product: '', quantity: 1, unitPrice: 0, taxRate: 0 }]
  });

  const [receiveData, setReceiveData] = useState<ReceiveItemsData>({
    receivedItems: [],
    items: [], // <-- Add this line
    location: '',
    receiptDate: '',
    inspectedBy: '',
    supplierName: '',
    supplierEmail: '',
    externalInvoiceTotal: 0,
    notes: '',
    // New shipping and documentation fields
    shipDate: new Date().toISOString().split('T')[0],
    docketNumber: '',
    noOfPackages: 1,
    gstInvoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    documentNumber: '',
    documentDate: new Date().toISOString().split('T')[0],
  });



  // Form errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Dropdown state
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPurchaseOrders(),
        fetchProducts(),
        fetchLocations(),
        fetchSuppliers()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {

    const params: any = {
      page: currentPage,
      limit,
      sort,
      search: searchTerm,
      ...(statusFilter !== 'all' && { status: statusFilter }),
      // ...(leadSourceFilter && { leadSource: leadSourceFilter }),
      // ...(dateFrom && { dateFrom }),
      // ...(dateTo && { dateTo }),
      // ...(assignedToParam && { assignedTo: assignedToParam }),
    };

    try {
      const response = await apiClient.purchaseOrders.getAll(params);

      setCurrentPage(response.pagination.page);
      setLimit(response.pagination.limit);
      setTotalDatas(response.pagination.total);
      setTotalPages(response.pagination.pages);

      let ordersData: PurchaseOrder[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          ordersData = response.data;
        } else if ((response.data as any).orders && Array.isArray((response.data as any).orders)) {
          ordersData = (response.data as any).orders;
        }
      }

      setPurchaseOrders(ordersData);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrders([]);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, [currentPage, limit, sort, searchTerm, statusFilter]);


  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll();

      let productsData: Product[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          productsData = response.data.map((product: any) => ({
            ...product,
            gst: typeof product.gst === 'number' ? product.gst : 0
          }));
        } else if ((response.data as any).products && Array.isArray((response.data as any).products)) {
          productsData = (response.data as any).products.map((product: any) => ({
            ...product,
            gst: typeof product.gst === 'number' ? product.gst : 0
          }));
        }
      }

      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };


  const fetchLocations = async () => {
    try {
      const response = await apiClient.stock.getLocations();

      let locationsData: StockLocation[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          locationsData = response.data;
        } else if ((response.data as any).locations && Array.isArray((response.data as any).locations)) {
          locationsData = (response.data as any).locations;
        }
      }

      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  const fetchSuppliers = async () => {
    try {
      console.log('Fetching suppliers...');
      const response = await apiClient.customers.getAll({ 
        type: 'supplier',
        limit: 100 // Use valid limit
      });
      console.log('Suppliers API response:', response);
      
      let suppliersData: Supplier[] = [];
      if (response && response.data) {
        if (Array.isArray(response.data)) {
          suppliersData = response.data as Supplier[];
        } else if (typeof response.data === 'object' && Array.isArray((response.data as any).customers)) {
          suppliersData = (response.data as { customers: Supplier[] }).customers;
        } else if (response.success && response.data && Array.isArray(response.data)) {
          suppliersData = response.data as Supplier[];
        } else if (response.success && response.data && typeof response.data === 'object' && (response.data as any).customers) {
          suppliersData = (response.data as any).customers as Supplier[];
        }
      }
      console.log('Processed suppliers data:', suppliersData);
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    }
  };


  // Helper functions
  const getCreatedByName = (createdBy: string | { firstName: string; lastName: string; email: string }) => {
    if (typeof createdBy === 'string') return createdBy;
    if (createdBy && typeof createdBy === 'object') {
      return `${createdBy.firstName || ''} ${createdBy.lastName || ''}`.trim();
    }
  };

  const getProductName = (product: string | { name: string; partNo?: string }): string => {
    if (typeof product === 'string') {
      // If it's still a string (ObjectId), it means it wasn't populated
      // Try to find product details from our products list
      const foundProduct = products.find(p => p._id === product);
      if (foundProduct) {
        return foundProduct.name;
      }

      return `[${product.slice(-8)}]`; // Show last 8 chars of ObjectId
    }
    return product?.name || 'Unknown Product';
  };

  const getProductPartNo = (product: string | { name: string; partNo?: string }): string => {
    if (typeof product === 'string') {
      // Try to find product details from our products list
      const foundProduct = products.find(p => p._id === product);
      if (foundProduct && foundProduct.partNo) {
        return foundProduct.partNo;
      }
      return '-';
    }
    return product?.partNo || '-';
  };

  const handleCreatePO = async () => {
    setFormData({
      supplier: '',
      supplierEmail: '',
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'low',
      sourceType: 'manual',
      sourceId: '',
      notes: '',
      items: [{ product: '', quantity: 1, unitPrice: 0, taxRate: 0 }]
    });
    setFormErrors({});

    // Ensure products and suppliers are loaded when modal opens
    if (products.length === 0) {
      await fetchProducts();
    }
    if (suppliers.length === 0) {
      console.log('No suppliers found, fetching...');
      await fetchSuppliers();
      console.log('Suppliers after fetch:', suppliers);
    }

    setShowCreateModal(true);
  };

  const handleEditPO = async (po: PurchaseOrder) => {
    setEditingPO(po);

    setFormData({
      supplier: typeof po.supplier === 'string' ? po.supplier : (po.supplier as Supplier)._id,
      supplierEmail: typeof po.supplierEmail === 'string' ? po.supplierEmail : (po.supplierEmail as any)._id,
      expectedDeliveryDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.split('T')[0] : '',
      priority: po.priority || 'low',
      sourceType: po.sourceType || 'manual',
      sourceId: po.sourceId || '',
      notes: po.notes || '',
      items: po.items.map(item => ({
        product: typeof item.product === 'string' ? item.product : item.product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate
      }))
    });
    setFormErrors({});

    // Ensure suppliers are loaded when editing
    if (suppliers.length === 0) {
      await fetchSuppliers();
    }

    setShowEditModal(true);
  };

  const openDetailsModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setDetailsSearchTerm(''); // Clear search when opening modal
    setShowDetailsModal(true);
  };

  const openReceiveModal = (po: PurchaseOrder) => {

    setSelectedPO(po);
    setReceiveSearchTerm(''); // Clear search when opening modal

    // Extract supplier name from purchase order
    const extractedSupplierName = typeof po.supplier === 'string' ? po.supplier : (po.supplier as Supplier).name;
    const extractedSupplierEmail = typeof po.supplierEmail === 'string' ? po.supplierEmail : (po.supplierEmail as any);

    // Use the first available location or a default if none exist
    const defaultLocation = locations.length > 0 ? locations[0]._id : 'loc-main-warehouse';

    setReceiveData({
      receivedItems: po.items.map(item => ({
        productId: typeof item.product === 'string' ? item.product : item.product?._id,
        quantityReceived: 0,
        condition: 'good',
        batchNumber: '',
        notes: ''
      })),
      items: po.items.map(item => {
        const product = item.product;
        const productId = typeof product === 'string' ? product : product?._id;
        // const unitPrice = typeof product === 'object' && product?.price ? product.price : 0;
        // const taxRate = typeof product === 'object' && product?.gst ? product.gst : 0;

        return {
          product: productId,
          description: '',
          quantity: 0,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate
        };
      }),
      location: defaultLocation,
      receiptDate: new Date().toISOString().split('T')[0],
      inspectedBy: 'Admin',
      supplierName: extractedSupplierName, // Set supplier name from purchase order
      supplierEmail: extractedSupplierEmail,
      externalInvoiceTotal: 0,
      notes: '',
      // New shipping and documentation fields
      shipDate: new Date().toISOString().split('T')[0],
      docketNumber: '',
      noOfPackages: 1,
      gstInvoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      documentNumber: '',
      documentDate: new Date().toISOString().split('T')[0],
    });

    setShowReceiveModal(true);
  };

  const validatePOForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.supplier) {
      errors.supplier = 'Please select a supplier';
    }
    if (!formData.expectedDeliveryDate) {
      errors.expectedDeliveryDate = 'Expected delivery date is required';
    }
    if (formData.items.length === 0) {
      errors.items = 'At least one item is required';
    }

    formData.items.forEach((item, index) => {
      if (!item.product) {
        errors[`items.${index}.product`] = 'Product is required';
      }
      if (item.quantity <= 0) {
        errors[`items.${index}.quantity`] = 'Quantity must be greater than 0';
      }
      if (item.unitPrice < 0) {
        errors[`items.${index}.unitPrice`] = 'Unit price cannot be negative';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitPO = async () => {
    if (!validatePOForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});

const totalAmount = formData.items.reduce(
  (sum, item) =>
    sum + (item.quantity * item.unitPrice * (1 + (item.taxRate || 0) / 100)),
  0
);

      const poData = {
        ...formData,
        totalAmount,
        items: formData.items.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice
        }))
      };

      const response = await apiClient.purchaseOrders.create(poData);

      setPurchaseOrders([response.data, ...purchaseOrders]);
      setShowCreateModal(false);
      resetPOForm();
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to create purchase order' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePO = async () => {
    if (!validatePOForm() || !editingPO) return;

    setSubmitting(true);
    try {
      setFormErrors({});

      const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

      const poData = {
        ...formData,
        totalAmount,
        items: formData.items.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice
        }))
      };

      const response = await apiClient.purchaseOrders.update(editingPO._id, poData);

      setPurchaseOrders(purchaseOrders.map(po => po._id === editingPO._id ? response.data?.order : po));
      setShowEditModal(false);
      setEditingPO(null);
      resetPOForm();
    } catch (error: any) {
      console.error('Error updating purchase order:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to update purchase order' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (poId: string, newStatus: PurchaseOrderStatus) => {
    try {
      const response = await apiClient.purchaseOrders.updateStatus(poId, newStatus);

      // Use the updated purchase order from the backend response if available
      const updatedPO = response.data || { status: newStatus };

      setPurchaseOrders(purchaseOrders.map(po =>
        po._id === poId ? { ...po, ...updatedPO } : po
      ));

      // Update selectedPO if it's the one being updated
      if (selectedPO && selectedPO._id === poId) {
        setSelectedPO({ ...selectedPO, ...updatedPO });
      }
    } catch (error) {
      console.error('Error updating PO status:', error);
    }
  };

  // Add validation for Receive Items form
  const validateReceiveForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!receiveData.shipDate || receiveData.shipDate.trim() === '') {
      errors.shipDate = 'Ship Date is required';
    }
    if (!receiveData.docketNumber || receiveData.docketNumber.trim() === '') {
      errors.docketNumber = 'Docket Number is required';
    }
    if (!receiveData.noOfPackages || receiveData.noOfPackages <= 0) {
      errors.noOfPackages = 'Number of Packages must be greater than 0';
    }
    if (!receiveData.gstInvoiceNumber || receiveData.gstInvoiceNumber.trim() === '') {
      errors.gstInvoiceNumber = 'GST Invoice Number is required';
    }
    if (!receiveData.invoiceDate || receiveData.invoiceDate.trim() === '') {
      errors.invoiceDate = 'Invoice Date is required';
    }
    if (!receiveData.documentNumber || receiveData.documentNumber.trim() === '') {
      errors.documentNumber = 'Document Number is required';
    }
    if (!receiveData.documentDate || receiveData.documentDate.trim() === '') {
      errors.documentDate = 'Document Date is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReceiveItems = async () => {
    if (!selectedPO) return;

    // Validate form before submitting
    if (!validateReceiveForm()) return;

    setSubmitting(true);
    try {
      const response = await apiClient.purchaseOrders.receiveItems(selectedPO._id, receiveData);

      // Use the updated purchase order from the backend response
      const updatedPO = response.data.order;

      setPurchaseOrders(purchaseOrders.map(po =>
        po._id === selectedPO._id ? updatedPO : po
      ));

      // Update the selected PO as well for modal display
      setSelectedPO(updatedPO);

      // Reset receive data for next time
      setReceiveData({
        receivedItems: [],
        items: [],
        location: locations.length > 0 ? locations[0]._id : 'loc-main-warehouse',
        receiptDate: new Date().toISOString().split('T')[0],
        inspectedBy: 'Admin',
        supplierName: '',
        supplierEmail: '',
        externalInvoiceTotal: 0,
        notes: '',
        // New shipping and documentation fields
        shipDate: new Date().toISOString().split('T')[0],
        docketNumber: '',
        noOfPackages: 1,
        gstInvoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        documentNumber: '',
        documentDate: new Date().toISOString().split('T')[0],
      });

      setShowReceiveModal(false);
    } catch (error: any) {
      console.error('Error receiving items:', error);

      let errorMessage = 'Failed to receive items';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Display error to user
      alert(`Error: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!allowedTypes.includes(file.type)) {
      setImportMessage({
        type: 'error',
        text: 'Please select a valid Excel (.xlsx, .xls) or CSV file.'
      });
      return;
    }

    setImporting(true);
    setImportMessage(null);

    try {
      // First, get preview of what will be imported
      const response = await apiClient.purchaseOrders.previewImportFromFile(file);

      if (response.success) {
        setSelectedFile(file);
        setPreviewData(response.data);
        setShowPreviewModal(true);
      } else {
        setImportMessage({
          type: 'error',
          text: response.data.errors?.[0] || 'Preview failed. Please check your file format.'
        });
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      setImportMessage({
        type: 'error',
        text: error.message || 'Failed to preview file. Please try again.'
      });
    } finally {
      setImporting(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    setShowPreviewModal(false);

    try {
      const response = await apiClient.purchaseOrders.importFromFile(selectedFile);

      if (response.success) {
        if (response.data.summary.successful > 0) {
          setImportMessage({
            type: 'success',
            text: `Successfully imported ${response.data.summary.successful} purchase orders from ${response.data.summary.totalRows} total rows!`
          });
        } else {
          // No orders were created - show errors
          setImportMessage({
            type: 'error',
            text: `Import failed! 0 orders created from ${response.data.summary.totalRows} rows. Errors: ${response.data.errors.join('; ')}`
          });
        }
        await fetchPurchaseOrders(); // Refresh the list
      } else {
        setImportMessage({
          type: 'error',
          text: response.data.errors?.[0] || 'Import failed. Please check your file format.'
        });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      setImportMessage({
        type: 'error',
        text: error.message || 'Failed to import file. Please try again.'
      });
    } finally {
      setImporting(false);
      setSelectedFile(null);
      setPreviewData(null);
    }
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setSelectedFile(null);
    setPreviewData(null);
  };

  const resetPOForm = () => {
    setFormData({
      supplier: '',
      supplierEmail: '',
      expectedDeliveryDate: '',
      priority: 'low',
      sourceType: 'manual',
      sourceId: '',
      notes: '',
      items: [{ product: '', quantity: 1, unitPrice: 0, taxRate: 0 }]
    });
    setFormErrors({});
    setShowSupplierDropdown(false);
    setShowCreateSupplierDropdown(false);
    setShowEditSupplierDropdown(false);
    setSupplierSearchTerm('');
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: 1, unitPrice: 0, taxRate: 0 }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, updates: Record<string, any>) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    setFormData({ ...formData, items: updatedItems });
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const supplierName = typeof po.supplier === 'string' ? po.supplier : po.supplier?.name;
    const matchesSearch = po.poNumber?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
      supplierName?.toLowerCase().includes(searchTerm?.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchesSupplier = !supplierFilter || supplierName?.toLowerCase().includes(supplierFilter?.toLowerCase());

    return matchesSearch && matchesStatus && matchesSupplier;
  });

  // Filter items for Details Modal
  const filteredDetailsItems = selectedPO ? selectedPO.items.filter(item => {
    const productName = getProductName(item.product);
    const category = typeof item.product === 'object' ? item.product?.category : '';
    const brand = typeof item.product === 'object' ? item.product?.brand : '';
    const partNo = getProductPartNo(item.product);

    const searchLower = detailsSearchTerm.toLowerCase();
    return productName.toLowerCase().includes(searchLower) ||
      (category && category.toLowerCase().includes(searchLower)) ||
      (brand && brand.toLowerCase().includes(searchLower)) ||
      (partNo && partNo !== '-' && partNo.toLowerCase().includes(searchLower));
  }) : [];

  // Filter items for Receive Modal (only items with remaining quantity)
  const filteredReceiveItems = selectedPO ? selectedPO.items.filter(item => {
    const remainingQty = item.quantity - (item.receivedQuantity || 0);
    if (remainingQty <= 0) return false; // Hide fully received items

    const productName = getProductName(item.product);
    const category = typeof item.product === 'object' ? item.product?.category : '';
    const brand = typeof item.product === 'object' ? item.product?.brand : '';
    const partNo = getProductPartNo(item.product);

    const searchLower = receiveSearchTerm.toLowerCase();
    return productName.toLowerCase().includes(searchLower) ||
      (category && category.toLowerCase().includes(searchLower)) ||
      (brand && brand.toLowerCase().includes(searchLower)) ||
      (partNo && partNo !== '-' && partNo.toLowerCase().includes(searchLower));
  }) : [];




  const getStatusColor = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-yellow-100 text-yellow-800';
      case 'partially_received':
        return 'bg-orange-100 text-orange-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeliveryStatusColor = (deliveryStatus: string | undefined) => {
    switch (deliveryStatus) {
      case 'on_time':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'delivered':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN');
  };

  // Statistics
  const stats = [
    {
      title: 'Total POs',
      value: purchaseOrders.length.toString(),
      icon: <Package className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Pending Approval',
      value: purchaseOrders.filter(po => po.status === 'draft' || po.status === 'sent').length.toString(),
      icon: <Clock className="w-6 h-6" />,
      color: 'orange'
    },
    {
      title: 'Confirmed',
      value: purchaseOrders.filter(po => po.status === 'confirmed').length.toString(),
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'green'
    },
    {
      title: 'Total Value',
      value: formatCurrency(purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0)),
      icon: <DollarSign className="w-6 h-6" />,
      color: 'purple'
    }
  ];

  // Status options with labels
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'received', label: 'Received' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const getStatusLabel = (value: string) => {
    const option = statusOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Status';
  };

  const getSupplierLabel = (value: string) => {
    if (value === 'all') return 'All Suppliers';
    // Return the supplier name if you have supplier data
    return value || 'All Suppliers';
  };

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowStatusDropdown(false);
        setShowSupplierDropdown(false);
        setShowCreateSupplierDropdown(false);
        setShowEditSupplierDropdown(false);
        setSupplierSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Helper to get GST for a product or productId
  const getProductGST = (product: Product | string): number => {
    if (typeof product === 'string') {
      const foundProduct = products.find(p => p._id === product);
      return foundProduct?.gst || 0;
    }
    return product.gst || 0;
  };

  // Helper to calculate GST amount and total for an item
  const calculateItemTotal = (item: { quantity: number; unitPrice: number; gst?: number }) => {
    const subtotal = item.quantity * item.unitPrice;
    const gstRate = item.gst || 0;
    const gstAmount = subtotal * (gstRate / 100);
    return {
      subtotal,
      gstAmount,
      total: subtotal + gstAmount
    };
  };

  return (
    <div className="p-4 space-y-3">
      {/* Header */}
      <PageHeader
        title="Purchase Order Management"
        subtitle="Manage procurement and purchase orders efficiently"
      >
        <div className="flex space-x-3">
          <button
            onClick={fetchAllData}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className={`w-4 h-4 ${importing ? 'animate-pulse' : ''}`} />
            <span className="text-sm">{importing ? 'Importing...' : 'Import Excel'}</span>
          </button>
          <button
            onClick={handleCreatePO}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New Purchase Order</span>
          </button>
        </div>
      </PageHeader>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {/* Import message */}
      {importMessage && (
        <div className={`p-4 rounded-lg border ${importMessage.type === 'success'
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-red-50 border-red-200 text-red-800'
          }`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{importMessage.text}</p>
            <button
              onClick={() => setImportMessage(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">{stat.title}</p>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg bg-${stat.color}-100 text-${stat.color}-600`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search purchase orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowSupplierDropdown(false);
              }}
              className="flex items-center justify-between w-full px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getStatusLabel(statusFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showStatusDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showStatusDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setStatusFilter(option.value as PurchaseOrderStatus | 'all');
                      setShowStatusDropdown(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${statusFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Supplier Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowSupplierDropdown(!showSupplierDropdown);
                setShowStatusDropdown(false);
              }}
              className="flex items-center justify-between w-full px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
            >
              <span className="text-gray-700 truncate mr-1">{getSupplierLabel(supplierFilter)}</span>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showSupplierDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showSupplierDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                <button
                  onClick={() => {
                    setSupplierFilter('all');
                    setShowSupplierDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${supplierFilter === 'all' ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                    }`}
                >
                  All Suppliers
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-gray-600">
            Showing {filteredPOs.length} of {purchaseOrders.length} purchase orders
          </span>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Order
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supplier
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount & Items
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Delivery
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading purchase orders...</td>
                </tr>
              ) : filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No purchase orders found</td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-blue-600">{po.poNumber}</div>
                        <div className="text-xs text-gray-600">
                          Created: {formatDate(po.orderDate)}
                        </div>
                        <div className="text-xs text-gray-500">
                          By: {getCreatedByName(po.createdBy)}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-xs font-medium text-gray-900">{typeof po.supplier === 'string' ? po.supplier : (po.supplier as Supplier).name}</div>
                      <div className="text-xs font-medium text-gray-500">{typeof po.supplierEmail === 'string' ? po.supplierEmail : (po.supplierEmail as any)}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-gray-900">{formatCurrency(po.totalAmount)}</div>
                        <div className="text-xs text-gray-600">{po.items.length} item(s)</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(po.status)}`}>
                        {po.status.charAt(0).toUpperCase() + po.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        {po.expectedDeliveryDate && (
                          <div className="text-xs text-gray-600">
                            Expected: {formatDate(po.expectedDeliveryDate)}
                          </div>
                        )}
                        {po.actualDeliveryDate && (
                          <div className="text-xs text-gray-600">
                            Delivered: {formatDate(po.actualDeliveryDate)}
                          </div>
                        )}
                        {po.deliveryStatus && (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDeliveryStatusColor(po.deliveryStatus)}`}>
                            {po.deliveryStatus.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openDetailsModal(po)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {po.status === 'draft' && (
                          <button
                            onClick={() => handleEditPO(po)}
                            className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50 transition-colors"
                            title="Edit PO"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {po.status === 'draft' && (
                          <button
                            onClick={() => handleStatusUpdate(po._id, 'sent')}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="Send PO"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                        {(po.status === 'confirmed' || po.status === 'partially_received') && (
                          <button
                            onClick={() => openReceiveModal(po)}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                            title={po.status === 'partially_received' ? 'Receive More Items' : 'Receive Items'}
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        )}
                        {po.status === 'sent' && (
                          <button
                            onClick={() => handleStatusUpdate(po._id, 'confirmed')}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                            {/* <span>Mark as Confirmed</span> */}
                          </button>
                        )}
                        {(po.status === 'draft' || po.status === 'sent') && (
                          <button
                            onClick={() => handleStatusUpdate(po._id, 'cancelled')}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                            {/* <span>Cancel PO</span> */}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalDatas}
        itemsPerPage={limit}
      />

      {/* Create PO Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Create Purchase Order</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitPO(); }} className="p-4 space-y-3">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Supplier *
                  </label>
                  <div className="relative dropdown-container">
                    <button
                      type="button"
                      onClick={() => {
                        if (suppliers.length === 0) {
                          fetchSuppliers();
                        }
                        setShowSupplierDropdown(!showSupplierDropdown);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-left bg-white border rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.supplier ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <span className="text-gray-700 truncate mr-1">
                        {formData.supplier ? 
                          suppliers.find(s => s._id === formData.supplier)?.name || 'Select Supplier' :
                          'Select Supplier'
                        }
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showSupplierDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showSupplierDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                        {/* Search Input */}
                        <div className="px-3 py-2 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Search suppliers..."
                            value={supplierSearchTerm}
                            onChange={(e) => setSupplierSearchTerm(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {/* Supplier List */}
                        <div className="max-h-48 overflow-y-auto">
                          {suppliers.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              {supplierSearchTerm ? 'No suppliers found' : 'Loading suppliers...'}
                            </div>
                          ) : (
                            suppliers
                              .filter(supplier => 
                                supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                                supplier.email?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
                              )
                              .map(supplier => (
                                <button
                                  key={supplier._id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      supplier: supplier._id,
                                      supplierEmail: supplier.email || ''
                                    });
                                    setShowSupplierDropdown(false);
                                    setSupplierSearchTerm('');
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm"
                                >
                                  <div className="font-medium text-gray-900">{supplier.name}</div>
                                  {supplier.email && (
                                    <div className="text-xs text-gray-500">{supplier.email}</div>
                                  )}
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {formErrors.supplier && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.supplier}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.expectedDeliveryDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {formErrors.expectedDeliveryDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.expectedDeliveryDate}</p>
                  )}
                </div>
              </div>

              {/* Advanced Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' | 'urgent' })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source Type
                  </label>
                  <select
                    value={formData.sourceType}
                    onChange={(e) => setFormData({ ...formData, sourceType: e.target.value as 'manual' | 'amc' | 'service' | 'inventory' })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="manual">Manual Purchase</option>
                    <option value="amc">AMC Requirement</option>
                    <option value="service">Service Request</option>
                    <option value="inventory">Inventory Replenishment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference ID
                  </label>
                  <input
                    type="text"
                    value={formData.sourceId || ''}
                    onChange={(e) => setFormData({ ...formData, sourceId: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={
                      formData.sourceType === 'amc' ? 'AMC Contract Number' :
                        formData.sourceType === 'service' ? 'Service Ticket Number' :
                          formData.sourceType === 'inventory' ? 'Stock Request ID' :
                            'Reference ID (optional)'
                    }
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Additional notes or specifications..."
                />
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Items</h3>
                  <div className="flex items-center space-x-2">
                    {products.length === 0 && (
                      <span className="text-xs text-orange-600 mr-2">⚠️ No products loaded</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (products.length === 0) {
                          fetchProducts();
                        }
                        addItem();
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Item</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-start p-4 bg-gray-50 rounded-lg">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                        {/* <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label> */}
                        <select
                          value={item.product}
                          onChange={(e) => {
                            const selectedProductId = e.target.value;
                            const selectedProduct = products.find(p => p._id === selectedProductId);

                            const updates = {
                              product: selectedProductId,
                              // Auto-populate unit price if product has a default price
                              ...(selectedProduct?.price && item.unitPrice === 0 && {
                                unitPrice: selectedProduct.price
                              }),
                              // Auto-populate GST if product has a default GST rate
                              ...(selectedProduct?.gst && item.taxRate === 0 && {
                                taxRate: selectedProduct.gst
                              })
                            };

                            updateItem(index, updates);
                          }}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.product`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                        >
                          <option value="">
                            {products.length === 0 ? 'Loading products...' : 'Select Product'}
                          </option>
                          {products.length > 0 && products.map(product => (
                            <option key={product._id} value={product._id}>
                              {product.name}
                              {product.partNo && ` - ${product.partNo}`}
                              {product.brand && ` (${product.brand})`}
                            </option>
                          ))}
                          {products.length === 0 && (
                            <option value="" disabled>
                              No Products Available
                            </option>
                          )}
                        </select>

                        {/* Fixed height container for error message */}
                        <div className="h-5 mt-1">
                          {formErrors[`items.${index}.product`] && (
                            <p className="text-red-500 text-xs">{formErrors[`items.${index}.product`]}</p>
                          )}
                        </div>
                        {products.length === 0 && (
                          <button
                            type="button"
                            onClick={fetchProducts}
                            className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                          >
                            🔄 Refresh Products
                          </button>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                        <input
                          type="number"
                          value={item.quantity}
                          placeholder='0'
                          onChange={(e) => {
                            const quantity = parseInt(e.target.value);
                            const updates = {
                              quantity: quantity
                            };
                            updateItem(index, updates);
                          }}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.quantity`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min="1"
                        />
                        {/* Fixed height container for error message */}
                        <div className="h-5 mt-1">
                          {formErrors[`items.${index}.quantity`] && (
                            <p className="text-red-500 text-xs">{formErrors[`items.${index}.quantity`]}</p>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const unitPrice = parseFloat(e.target.value);
                            const updates = {
                              unitPrice: unitPrice
                            };
                            updateItem(index, updates);
                          }}
                          disabled
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.unitPrice`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min="0"
                          placeholder='0'
                          step="0.01"
                        />
                        {/* Fixed height container for error message */}
                        <div className="h-5 mt-1">
                          {formErrors[`items.${index}.unitPrice`] && (
                            <p className="text-red-500 text-xs">{formErrors[`items.${index}.unitPrice`]}</p>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax *</label>
                        <input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => {
                            const taxRate = parseFloat(e.target.value);
                            const updates = {
                              taxRate: taxRate
                            };
                            updateItem(index, updates);
                          }}
                          disabled
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.unitPrice`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min="0"
                          placeholder='0'
                          step="0.01"
                        />
                        {/* Fixed height container for error message */}
                        <div className="h-5 mt-1">
                          {formErrors[`items.${index}.unitPrice`] && (
                            <p className="text-red-500 text-xs">{formErrors[`items.${index}.unitPrice`]}</p>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm font-bold text-gray-900 mb-1">
                          Total: {formatCurrency((item.quantity * item.unitPrice || 0) * (1 + (item.taxRate || 0) / 100))}
                        </div>

                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 pt-3 text-xs flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                        {/* Fixed height container to match other columns */}
                        <div className="h-5 mt-1"></div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Notes</label>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => {
                            const notes = e.target.value;
                            const updates = {
                              notes: notes
                            };
                            updateItem(index, updates);
                          }}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                          placeholder="Specifications..."
                        />
                        {/* Fixed height container to match other columns */}
                        <div className="h-5 mt-1"></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Summary */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-blue-700">
                      {formData.items.length} item(s) • {formData.items.reduce((sum, item) => sum + item.quantity, 0)} total quantity
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-700">Subtotal</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatCurrency(
                          formData.items.reduce(
                            (sum, item) =>
                              sum + (item.quantity * item.unitPrice * (1 + (item.taxRate || 0) / 100)),
                            0
                          ) || 0
                        )}
                      </p>

                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || formData.items.length === 0}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit PO Modal */}
      {showEditModal && editingPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Purchase Order - {editingPO.poNumber}</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleUpdatePO(); }} className="p-4 space-y-3">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Supplier *
                  </label>
                  <div className="relative dropdown-container">
                    <button
                      type="button"
                      onClick={() => {
                        if (suppliers.length === 0) {
                          fetchSuppliers();
                        }
                        setShowSupplierDropdown(!showSupplierDropdown);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-left bg-white border rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.supplier ? 'border-red-500' : 'border-gray-300'}`}
                    >
                      <span className="text-gray-700 truncate mr-1">
                        {formData.supplier ? 
                          suppliers.find(s => s._id === formData.supplier)?.name || 'Select Supplier' :
                          'Select Supplier'
                        }
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showSupplierDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showSupplierDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
                        {/* Search Input */}
                        <div className="px-3 py-2 border-b border-gray-200">
                          <input
                            type="text"
                            placeholder="Search suppliers..."
                            value={supplierSearchTerm}
                            onChange={(e) => setSupplierSearchTerm(e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        {/* Supplier List */}
                        <div className="max-h-48 overflow-y-auto">
                          {suppliers.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              {supplierSearchTerm ? 'No suppliers found' : 'Loading suppliers...'}
                            </div>
                          ) : (
                            suppliers
                              .filter(supplier => 
                                supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                                supplier.email?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
                              )
                              .map(supplier => (
                                <button
                                  key={supplier._id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      supplier: supplier._id,
                                      supplierEmail: supplier.email || ''
                                    });
                                    setShowSupplierDropdown(false);
                                    setSupplierSearchTerm('');
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm"
                                >
                                  <div className="font-medium text-gray-900">{supplier.name}</div>
                                  {supplier.email && (
                                    <div className="text-xs text-gray-500">{supplier.email}</div>
                                  )}
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {formErrors.supplier && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.supplier}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expected Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.expectedDeliveryDate ? 'border-red-500' : 'border-gray-300'
                      }`}
                  />
                  {formErrors.expectedDeliveryDate && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.expectedDeliveryDate}</p>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Items</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (products.length === 0) {
                        fetchProducts();
                      }
                      addItem();
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-start p-4 bg-gray-50 rounded-lg">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                        <select
                          value={item.product}
                          onChange={(e) => {
                            const selectedProductId = e.target.value;
                            const selectedProduct = products.find(p => p._id === selectedProductId);

                            const updates = {
                              product: selectedProductId,
                              // Auto-populate unit price if product has a default price
                              ...(selectedProduct?.price && item.unitPrice === 0 && {
                                unitPrice: selectedProduct.price
                              })
                            };

                            updateItem(index, updates);
                          }}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.product`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                        >
                          <option value="">
                            {products.length === 0 ? 'Loading products...' : 'Select Product'}
                          </option>
                          {products.map(product => (
                            <option key={product._id} value={product._id}>
                              {product.name}
                              {product.partNo && ` - ${product.partNo}`}
                              {product.brand && ` (${product.brand})`}
                            </option>
                          ))}
                        </select>
                        {/* Fixed height container for error message */}
                        <div className="h-5 mt-1">
                          {formErrors[`items.${index}.product`] && (
                            <p className="text-red-500 text-xs">{formErrors[`items.${index}.product`]}</p>
                          )}
                        </div>
                        {products.length === 0 && (
                          <button
                            type="button"
                            onClick={fetchProducts}
                            className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                          >
                            🔄 Refresh Products
                          </button>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const quantity = parseInt(e.target.value) || 0;
                            const updates = {
                              quantity: quantity
                            };
                            updateItem(index, updates);
                          }}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.quantity`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min="1"
                        />
                        {/* Fixed height container for error message */}
                        <div className="h-5 mt-1">
                          {formErrors[`items.${index}.quantity`] && (
                            <p className="text-red-500 text-xs">{formErrors[`items.${index}.quantity`]}</p>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const unitPrice = parseFloat(e.target.value) || 0;
                            const updates = {
                              unitPrice: unitPrice
                            };
                            updateItem(index, updates);
                          }}
                          disabled
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.unitPrice`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min="0"
                          step="0.01"
                        />
                        {/* Fixed height container for error message */}
                        <div className="h-5 mt-1">
                          {formErrors[`items.${index}.unitPrice`] && (
                            <p className="text-red-500 text-xs">{formErrors[`items.${index}.unitPrice`]}</p>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tax *</label>
                        <input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => {
                            const taxRate = parseFloat(e.target.value);
                            const updates = {
                              taxRate: taxRate
                            };
                            updateItem(index, updates);
                          }}
                          disabled
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.unitPrice`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min="0"
                          placeholder='0'
                          step="0.01"
                        />
                        {/* Fixed height container for error message */}
                        <div className="h-5 mt-1">
                          {formErrors[`items.${index}.unitPrice`] && (
                            <p className="text-red-500 text-xs">{formErrors[`items.${index}.unitPrice`]}</p>
                          )}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs font-medium text-gray-900 mb-1">
                          Total: {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 text-xs flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                        {/* Fixed height container to match other columns */}
                        <div className="h-5 mt-1"></div>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Notes</label>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => {
                            const notes = e.target.value;
                            const updates = {
                              notes: notes
                            };
                            updateItem(index, updates);
                          }}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                          placeholder="Specifications..."
                        />
                        {/* Fixed height container to match other columns */}
                        <div className="h-5 mt-1"></div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Summary */}
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-blue-700">
                      {formData.items.length} item(s) • {formData.items.reduce((sum, item) => sum + item.quantity, 0)} total quantity
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-blue-700">Subtotal</p>
                      <p className="text-xl font-bold text-blue-900">
                        {formatCurrency(formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Updating...' : 'Update Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO Details Modal */}
      {showDetailsModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[50]">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Purchase Order Details</h2>
                <p className="text-gray-600">{selectedPO.poNumber}</p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Header Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Basic Information</h3>
                  <div className="space-y-2">
                    <p><span className="text-xs text-gray-600">PO Number:</span> <span className="font-medium">{selectedPO.poNumber}</span></p>
                    <p><span className="text-xs text-gray-600">Supplier:</span> <span className="font-medium">{typeof selectedPO.supplier === 'string' ? selectedPO.supplier : (selectedPO.supplier as Supplier).name}</span></p>
                    <p><span className="text-xs text-gray-600">Total Amount:</span> <span className="font-medium">{formatCurrency(selectedPO.totalAmount)}</span></p>
                    <p><span className="text-xs text-gray-600">Status:</span>
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPO.status)}`}>
                        {selectedPO.status.charAt(0).toUpperCase() + selectedPO.status.slice(1)}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Dates</h3>
                  <div className="space-y-2">
                    <p><span className="text-xs text-gray-600">Order Date:</span> <span className="font-medium">{formatDate(selectedPO.orderDate)}</span></p>
                    {selectedPO.expectedDeliveryDate && (
                      <p><span className="text-xs text-gray-600">Expected Delivery:</span> <span className="font-medium">{formatDate(selectedPO.expectedDeliveryDate)}</span></p>
                    )}
                    {selectedPO.actualDeliveryDate && (
                      <p><span className="text-xs text-gray-600">Actual Delivery:</span> <span className="font-medium">{formatDate(selectedPO.actualDeliveryDate)}</span></p>
                    )}
                    {selectedPO.deliveryStatus && (
                      <p><span className="text-xs text-gray-600">Delivery Status:</span>
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDeliveryStatusColor(selectedPO.deliveryStatus)}`}>
                          {selectedPO.deliveryStatus.replace('_', ' ')}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Created By</h3>
                  <div className="space-y-2">
                    <p><span className="text-xs text-gray-600">Name:</span> <span className="font-medium">{getCreatedByName(selectedPO.createdBy)}</span></p>
                    <p><span className="text-xs text-gray-600">Created:</span> <span className="font-medium">{formatDateTime(selectedPO.createdAt)}</span></p>
                    <p><span className="text-xs text-gray-600">Last Updated:</span> <span className="font-medium">{formatDateTime(selectedPO.updatedAt)}</span></p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Items Ordered</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={detailsSearchTerm}
                      onChange={(e) => setDetailsSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Number</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredDetailsItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                            {detailsSearchTerm ? 'No items match your search' : 'No items found'}
                          </td>
                        </tr>
                      ) : (
                        filteredDetailsItems.map((item, index) => {
                          const receivedQty = item.receivedQuantity || 0;
                          const remainingQty = item.quantity - receivedQty;
                          return (
                            <tr key={index}>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-xs font-medium text-gray-900">
                                    {getProductName(item.product)}
                                  </div>
                                  {typeof item.product === 'object' && item.product?.brand && (
                                    <div className="text-xs text-gray-500">Brand: {item.product?.brand}</div>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                                <span className="font-mono font-medium text-blue-600">
                                  {getProductPartNo(item.product)}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                                {typeof item.product === 'object' ? item.product?.category : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                                <span className="font-medium">{item.quantity}</span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs">
                                <span className={`font-medium ${receivedQty > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                  {receivedQty}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs">
                                <span className={`font-medium ${remainingQty > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                  {remainingQty}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-900">
                                {formatCurrency(item.unitPrice)}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-xs font-medium text-gray-900">
                                {formatCurrency(item.totalPrice)}
                              </td>
                            </tr>
                          );
                        }))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-xs font-medium text-gray-600">
                          Totals:
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-900">
                          {selectedPO.items.reduce((sum, item) => sum + item.quantity, 0)}
                          {detailsSearchTerm && (
                            <div className="text-xs text-gray-500 font-normal">
                              ({filteredDetailsItems.reduce((sum, item) => sum + item.quantity, 0)} filtered)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-green-600">
                          {selectedPO.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0)}
                          {detailsSearchTerm && (
                            <div className="text-xs text-gray-500 font-normal">
                              ({filteredDetailsItems.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0)} filtered)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-orange-600">
                          {selectedPO.items.reduce((sum, item) => sum + (item.quantity - (item.receivedQuantity || 0)), 0)}
                          {detailsSearchTerm && (
                            <div className="text-xs text-gray-500 font-normal">
                              ({filteredDetailsItems.reduce((sum, item) => sum + (item.quantity - (item.receivedQuantity || 0)), 0)} filtered)
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-gray-900">
                          Total Amount:
                        </td>
                        <td className="px-4 py-3 text-sm font-bold text-gray-900">
                          {formatCurrency(selectedPO.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="flex space-x-3">
                  {selectedPO.status === 'draft' && (
                    <>
                      <button
                        onClick={() => handleEditPO(selectedPO)}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-indigo-700 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit PO</span>
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedPO._id, 'sent')}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-green-700 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send to Supplier</span>
                      </button>
                    </>
                  )}
                  {selectedPO.status === 'sent' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedPO._id, 'confirmed')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark as Confirmed</span>
                    </button>
                  )}
                  {(selectedPO.status === 'confirmed' || selectedPO.status === 'partially_received') && (
                    <button
                      onClick={() => openReceiveModal(selectedPO)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-purple-700 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      <span>
                        {selectedPO.status === 'partially_received' ? 'Receive More Items' : 'Receive Items'}
                      </span>
                    </button>
                  )}
                  {(selectedPO.status === 'draft' || selectedPO.status === 'sent') && (
                    <button
                      onClick={() => handleStatusUpdate(selectedPO._id, 'cancelled')}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700 transition-colors"
                    >
                      <Ban className="w-4 h-4" />
                      <span>Cancel PO</span>
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receive Items Modal */}
      {showReceiveModal && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedPO.status === 'partially_received' ? 'Receive More Items' : 'Receive Items'}
                </h2>
                <p className="text-gray-600 mt-1">
                  PO: <span className="font-semibold">{selectedPO.poNumber}</span>
                  {selectedPO.status === 'partially_received' && (
                    <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                      Partially Received
                    </span>
                  )}
                </p>
              </div>
                              <button
                  onClick={() => {
                    setShowReceiveModal(false);
                    setDebouncedExternalTotal('')
                    setReceiveData({
                      location: '',
                      receiptDate: '',
                      inspectedBy: '',
                      receivedItems: [],
                      items: [],
                      // New shipping and documentation fields
                      shipDate: new Date().toISOString().split('T')[0],
                      docketNumber: '',
                      noOfPackages: 1,
                      gstInvoiceNumber: '',
                      invoiceDate: new Date().toISOString().split('T')[0],
                      documentNumber: '',
                      documentDate: new Date().toISOString().split('T')[0],
                    });
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Alert */}
              {selectedPO.status === 'partially_received' ? (
                <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Package className="w-5 h-5 text-orange-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-orange-800">Receiving Additional Items</h3>
                      <p className="text-sm text-orange-700 mt-1">
                        Some items from this purchase order have already been received. You can receive additional quantities as they arrive.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Package className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="text-sm font-semibold text-blue-800">Receiving Items</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Review the quantities below and confirm receipt. This will update your inventory.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Receipt Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Location <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={receiveData.location}
                      onChange={(e) => setReceiveData({ ...receiveData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select location...</option>
                      {locations.length === 0 ? (
                        <option value="" disabled>Loading locations...</option>
                      ) : (
                        locations.map(location => (
                          <option key={location._id} value={location._id}>
                            {location.name} ({location.type})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Receipt Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={receiveData.receiptDate}
                      onChange={(e) => setReceiveData({ ...receiveData, receiptDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Inspected By
                    </label>
                    <input
                      type="text"
                      value={receiveData.inspectedBy}
                      onChange={(e) => setReceiveData({ ...receiveData, inspectedBy: e.target.value })}
                      placeholder="Inspector name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>


                  {/* New Shipping and Documentation Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ship Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={receiveData.shipDate}
                      onChange={(e) => setReceiveData({ ...receiveData, shipDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.shipDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.shipDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.shipDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Docket Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={receiveData.docketNumber}
                      onChange={(e) => setReceiveData({ ...receiveData, docketNumber: e.target.value })}
                      placeholder="Docket Number"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.docketNumber ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.docketNumber && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.docketNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Packages <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={receiveData.noOfPackages}
                      onChange={(e) => setReceiveData({ ...receiveData, noOfPackages: parseInt(e.target.value) || 1 })}
                      placeholder="1"
                      min="1"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.noOfPackages ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.noOfPackages && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.noOfPackages}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Invoice Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={receiveData.gstInvoiceNumber}
                      onChange={(e) => setReceiveData({ ...receiveData, gstInvoiceNumber: e.target.value })}
                      placeholder="GST Invoice Number"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.gstInvoiceNumber ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.gstInvoiceNumber && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.gstInvoiceNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invoice Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={receiveData.invoiceDate}
                      onChange={(e) => setReceiveData({ ...receiveData, invoiceDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.invoiceDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.invoiceDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.invoiceDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={receiveData.documentNumber}
                      onChange={(e) => setReceiveData({ ...receiveData, documentNumber: e.target.value })}
                      placeholder="Document Number"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.documentNumber ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.documentNumber && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.documentNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Document Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={receiveData.documentDate}
                      onChange={(e) => setReceiveData({ ...receiveData, documentDate: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.documentDate ? 'border-red-500' : 'border-gray-300'}`}
                    />
                    {formErrors.documentDate && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.documentDate}</p>
                    )}
                  </div>

                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Notes
                  </label>
                  <textarea
                    value={receiveData.notes || ''}
                    onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                    rows={3}
                    placeholder="Any additional notes about the delivery..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                  />
                </div>
              </div>

              {/* Items to Receive */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Items to Receive</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={receiveSearchTerm}
                      onChange={(e) => setReceiveSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64 transition-colors"
                    />
                  </div>
                </div>

                {(() => {
                  const itemsWithRemainingQty = selectedPO.items.filter(item =>
                    (item.quantity - (item.receivedQuantity || 0)) > 0
                  );

                  if (itemsWithRemainingQty.length === 0) {
                    return (
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                          <Package className="w-12 h-12 text-green-600" />
                        </div>
                        <h4 className="text-xl font-semibold text-green-800 mb-2">All Items Received</h4>
                        <p className="text-green-700">All items from this purchase order have been fully received.</p>
                      </div>
                    );
                  }

                  if (filteredReceiveItems.length === 0 && receiveSearchTerm) {
                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                        <div className="flex items-center justify-center mb-3">
                          <Search className="w-12 h-12 text-gray-400" />
                        </div>
                        <h4 className="text-xl font-semibold text-gray-600 mb-2">No Items Found</h4>
                        <p className="text-gray-500">No items match your search criteria.</p>
                      </div>
                    );
                  }

                  // Calculate comprehensive totals
                  const calculateTotals = () => {
                    let totalSubtotal = 0;
                    let totalGST = 0;
                    let totalAmount = 0;

                    selectedPO.items.forEach((item, index) => {
                      const receivedItem = receiveData.receivedItems[index];
                      const quantityToReceive = receivedItem?.quantityReceived || 0;

                      if (quantityToReceive > 0) {
                        const gstRate = getProductGST(item.product);
                        const itemCalculation = calculateItemTotal({
                          quantity: quantityToReceive,
                          unitPrice: item.unitPrice,
                          gst: gstRate
                        });

                        totalSubtotal += itemCalculation.subtotal;
                        totalGST += itemCalculation.gstAmount;
                        totalAmount += itemCalculation.total;
                      }
                    });

                    return { totalSubtotal, totalGST, totalAmount };
                  };

                  const { totalSubtotal, totalGST, totalAmount } = calculateTotals();
                  const hasSelectedItems = receiveData.receivedItems.some(item => item?.quantityReceived > 0);

                  return (
                    <div className="space-y-4">
                      {filteredReceiveItems.map((item, index) => {
                        // Find the original index in selectedPO.items to maintain consistency with receiveData
                        const originalIndex = selectedPO.items.findIndex(originalItem =>
                          originalItem === item
                        );
                        const receivedItem = receiveData.receivedItems[originalIndex];
                        const remainingQty = item.quantity - (item.receivedQuantity || 0);

                        return (
                          <div key={originalIndex} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center mb-4">
                              <div className="md:col-span-2">
                                <div className="text-sm font-semibold text-gray-900">
                                  {getProductName(item.product)}
                                </div>
                                {getProductPartNo(item.product) !== '-' && (
                                  <div className="text-xs text-blue-600 font-mono font-medium mt-1">
                                    Part: {getProductPartNo(item.product)}
                                  </div>
                                )}
                                {typeof item.product === 'object' && item.product?.category && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    Category: {item.product?.category}
                                  </div>
                                )}
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Ordered</div>
                                <div className="text-sm font-semibold text-gray-900">{item.quantity}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Already Received</div>
                                <div className="text-sm font-semibold text-green-600">{item.receivedQuantity || 0}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500 mb-1">Remaining</div>
                                <div className="text-sm font-semibold text-orange-600">{remainingQty}</div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Receive Now</label>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    value={receivedItem?.quantityReceived}
                                    placeholder='0'
                                    onChange={(e) => {
                                      const qty = parseInt(e.target.value);

                                      // Update receivedItems
                                      const newReceivedItems = [...receiveData.receivedItems];
                                      const existingItem = newReceivedItems[originalIndex] || {};
                                      newReceivedItems[originalIndex] = {
                                        ...existingItem,
                                        productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                        quantityReceived: qty,
                                        condition: existingItem.condition || 'good',
                                        batchNumber: existingItem.batchNumber || '',
                                        notes: existingItem.notes || ''
                                      };

                                      // Update items (quantity)
                                      const newItems = [...receiveData.items];
                                      if (newItems[originalIndex]) {
                                        newItems[originalIndex] = {
                                          ...newItems[originalIndex],
                                          quantity: qty
                                        };
                                      }

                                      setReceiveData({
                                        ...receiveData,
                                        receivedItems: newReceivedItems,
                                        items: newItems
                                      });
                                    }}

                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    min="0"
                                    max={remainingQty}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newReceivedItems = [...receiveData.receivedItems];
                                      const existingItem = newReceivedItems[originalIndex] || {};
                                      newReceivedItems[originalIndex] = {
                                        ...existingItem,
                                        productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                        quantityReceived: remainingQty,
                                        condition: existingItem.condition || 'good',
                                        batchNumber: existingItem.batchNumber || '',
                                        notes: existingItem.notes || ''
                                      };
                                      setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                                    }}
                                    className="px-3 py-2 bg-blue-500 text-white text-xs font-medium rounded-lg hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors"
                                  >
                                    Max
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Condition</label>
                                <select
                                  value={receivedItem?.condition || 'good'}
                                  onChange={(e) => {
                                    const newReceivedItems = [...receiveData.receivedItems];
                                    const existingItem = newReceivedItems[originalIndex] || {};
                                    newReceivedItems[originalIndex] = {
                                      ...existingItem,
                                      productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                      condition: e.target.value as 'good' | 'damaged' | 'defective'
                                    };
                                    setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                                  }}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs transition-colors"
                                >
                                  <option value="good">Good</option>
                                  <option value="damaged">Damaged</option>
                                  <option value="defective">Defective</option>
                                </select>
                              </div>
                            </div>

                            {/* Item Financial Details */}
                            <div className="bg-gray-50 rounded-lg p-3 mb-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Unit Price</div>
                                  <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.unitPrice)}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">GST (%)</div>
                                  <div className="text-sm font-semibold text-gray-900">{getProductGST(item.product)}%</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">GST Amount</div>
                                  <div className="text-sm font-semibold text-green-600">
                                    {formatCurrency(calculateItemTotal({
                                      quantity: receivedItem?.quantityReceived || 0,
                                      unitPrice: item.unitPrice,
                                      gst: getProductGST(item.product)
                                    }).gstAmount)}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Item Total</div>
                                  <div className="text-sm font-bold text-indigo-600">
                                    {formatCurrency(calculateItemTotal({
                                      quantity: receivedItem?.quantityReceived || 0,
                                      unitPrice: item.unitPrice,
                                      gst: getProductGST(item.product)
                                    }).total)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Additional Item Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Batch Number</label>
                                <input
                                  type="text"
                                  value={receivedItem?.batchNumber || ''}
                                  onChange={(e) => {
                                    const newReceivedItems = [...receiveData.receivedItems];
                                    const existingItem = newReceivedItems[originalIndex] || {};
                                    newReceivedItems[originalIndex] = {
                                      ...existingItem,
                                      productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                      batchNumber: e.target.value
                                    };
                                    setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                                  }}
                                  placeholder="Optional batch/lot number"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs transition-colors"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1 font-medium">Item Notes</label>
                                <input
                                  type="text"
                                  value={receivedItem?.notes || ''}
                                  onChange={(e) => {
                                    const newReceivedItems = [...receiveData.receivedItems];
                                    const existingItem = newReceivedItems[originalIndex] || {};
                                    newReceivedItems[originalIndex] = {
                                      ...existingItem,
                                      productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                      notes: e.target.value
                                    };
                                    setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                                  }}
                                  placeholder="Notes about this item"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs transition-colors"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Enhanced Summary Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Items Ordered Card (Left Side) */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-100 border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="w-5 h-5 mr-2 text-gray-600" />
                    Order Summary
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Items Ordered:</span>
                      <span className="font-semibold text-gray-900 text-lg">
                        {selectedPO.items.reduce((sum, item) => sum + item.quantity, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Previously Received:</span>
                      <span className="font-semibold text-green-600 text-lg">
                        {selectedPO.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Receiving Now:</span>
                      <span className="font-semibold text-blue-600 text-lg">
                        {receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Will Remain:</span>
                      <span className="font-semibold text-orange-600 text-lg">
                        {selectedPO.items.reduce((sum, item) => sum + item.quantity, 0) -
                          selectedPO.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) -
                          receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}
                      </span>
                    </div>

                    <div className="border-t border-gray-300 pt-4 mt-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600">Receipt Date:</span>
                        <span className="font-semibold text-gray-900">
                          {receiveData.receiptDate
                            ? new Date(receiveData.receiptDate).toLocaleDateString()
                            : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-gray-600">Inspector:</span>
                        <span className="font-semibold text-gray-900">
                          {receiveData.inspectedBy || 'Not assigned'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-semibold text-gray-900">
                          {(() => {
                            const location = locations.find(loc => loc._id === receiveData.location);
                            return location ? `${location.name} (${location.type})` : 'Not selected';
                          })()}
                        </span>
                      </div>
                    </div>

                    {receiveData.notes && (
                      <div className="border-t border-gray-300 pt-4">
                        <span className="text-gray-600 text-sm">Notes:</span>
                        <div className="font-medium text-gray-900 text-sm italic mt-1">
                          {receiveData.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Receipt Summary Card (Right Side) */}


                {/* Receipt Summary Card (Right Side) */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 rounded-lg p-6 shadow-sm">
                  <div className='pb-4'>
                    <div className="flex items-center space-x-2 mb-4">
                      {/* <DollarSign className="w-5 h-5 text-gray-600" /> */}
                      <h3 className="text-lg font-semibold text-gray-900">External Invoice details</h3>
                    </div>
                    <div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          External Invoice Total
                        </label>
                        <input
                          type="number"
                          value={receiveData.externalInvoiceTotal}
                          onChange={(e) => {
                            const value = e.target.value;
                            setReceiveData({ ...receiveData, externalInvoiceTotal: parseFloat(value) });

                            // Clear existing timeout
                            if (debounceTimeoutRef.current) {
                              clearTimeout(debounceTimeoutRef.current);
                            }

                            debounceTimeoutRef.current = setTimeout(() => {
                              setDebouncedExternalTotal(value);
                            }, 500); // 500ms delay
                          }}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.externalInvoiceTotal ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="External Invoice Total"
                        />
                        {formErrors.externalInvoiceTotal && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.externalInvoiceTotal}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <h4 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Receipt Summary
                  </h4>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Items Count</div>
                      <div className="font-bold text-gray-900 text-xl">
                        {receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}
                      </div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Total GST</div>
                      <div className="font-bold text-green-700 text-lg">
                        {formatCurrency((() => {
                          let total = 0;
                          selectedPO.items.forEach((item, index) => {
                            const receivedItem = receiveData.receivedItems[index];
                            const quantityToReceive = receivedItem?.quantityReceived || 0;
                            if (quantityToReceive > 0) {
                              const gstRate = getProductGST(item.product);
                              const itemCalculation = calculateItemTotal({
                                quantity: quantityToReceive,
                                unitPrice: item.unitPrice,
                                gst: gstRate
                              });
                              total += itemCalculation.gstAmount;
                            }
                          });
                          return total;
                        })())}
                      </div>
                    </div>
                    <div className="text-center bg-white rounded-lg p-3 shadow-sm">
                      <div className="text-xs text-gray-600 mb-1">Subtotal</div>
                      <div className="font-bold text-blue-900 text-lg">
                        {formatCurrency((() => {
                          let total = 0;
                          selectedPO.items.forEach((item, index) => {
                            const receivedItem = receiveData.receivedItems[index];
                            const quantityToReceive = receivedItem?.quantityReceived || 0;
                            if (quantityToReceive > 0) {
                              total += quantityToReceive * item.unitPrice;
                            }
                          });
                          return total;
                        })())}
                      </div>
                    </div>
                  </div>

                  <div className="text-center w-full mt-4 bg-white rounded-lg p-3 shadow-sm">
                    <div className="text-xs text-gray-600 mb-1">Grand Total</div>
                    <div className="font-bold text-indigo-900 text-xl">
                      {formatCurrency((() => {
                        let total = 0;
                        selectedPO.items.forEach((item, index) => {
                          const receivedItem = receiveData.receivedItems[index];
                          const quantityToReceive = receivedItem?.quantityReceived || 0;
                          if (quantityToReceive > 0) {
                            const gstRate = getProductGST(item.product);
                            const itemCalculation = calculateItemTotal({
                              quantity: quantityToReceive,
                              unitPrice: item.unitPrice,
                              gst: gstRate
                            });
                            total += itemCalculation.total;
                          }
                        });
                        return total;
                      })())}
                    </div>
                  </div>

                  {/* Amount Comparison Message */}
                  {debouncedExternalTotal && (
                    <div className="mt-4 rounded-lg border">
                      {(() => {
                        // Calculate Grand Total
                        let grandTotal = 0;
                        selectedPO.items.forEach((item, index) => {
                          const receivedItem = receiveData.receivedItems[index];
                          const quantityToReceive = receivedItem?.quantityReceived || 0;
                          if (quantityToReceive > 0) {
                            const gstRate = getProductGST(item.product);
                            const itemCalculation = calculateItemTotal({
                              quantity: quantityToReceive,
                              unitPrice: item.unitPrice,
                              gst: gstRate
                            });
                            grandTotal += itemCalculation.total;
                          }
                        });

                        // Compare amounts using debounced value
                        const externalTotal = parseFloat(debouncedExternalTotal);
                        const isMatching = Math.abs(externalTotal - grandTotal) < 0.01; // Allow small floating point differences

                        return isMatching ? (
                          <div className="flex items-center text-green-700 bg-green-50 p-2 rounded border border-green-300">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">Amounts match - Invoice is correct</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-700 p-2 rounded bg-gradient-to-r from-red-50 to-red-50 border border-red-300 ">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <div>
                              <span className="font-medium">Amount mismatch detected</span>
                              <div className="text-sm mt-1">
                                External Invoice: {formatCurrency(externalTotal)} | Grand Total: {formatCurrency(grandTotal)}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                  setShowReceiveModal(false);
                  setDebouncedExternalTotal('')
                  setReceiveData({
                    location: '',
                    receiptDate: '',
                    inspectedBy: '',
                    receivedItems: [],
                    items: [],
                    // New shipping and documentation fields
                    shipDate: new Date().toISOString().split('T')[0],
                    docketNumber: '',
                    noOfPackages: 1,
                    gstInvoiceNumber: '',
                    invoiceDate: new Date().toISOString().split('T')[0],
                    documentNumber: '',
                    documentDate: new Date().toISOString().split('T')[0],
                  });
                }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiveItems}
                  disabled={submitting || receiveData.receivedItems.every(item => (item.quantityReceived || 0) === 0)}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? 'Receiving...' : 'Confirm Receipt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Import Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Preview Excel Import</h2>
                <p className="text-gray-600 mt-1">
                  Review what will be imported before confirming
                </p>
              </div>
              <button
                onClick={closePreviewModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Purchase Orders</p>
                      <p className="text-2xl font-bold text-blue-900">{previewData.summary.uniqueOrders}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">New Products</p>
                      <p className="text-2xl font-bold text-green-900">{previewData.summary.newProducts}</p>
                    </div>
                    <Plus className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Existing Products</p>
                      <p className="text-2xl font-bold text-yellow-900">{previewData.summary.existingProducts}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Total Rows</p>
                      <p className="text-2xl font-bold text-purple-900">{previewData.summary.totalRows}</p>
                    </div>
                    <FileText className="w-8 h-8 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Errors Section */}
              {previewData.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Import Errors</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <ul className="list-disc list-inside space-y-1">
                          {previewData.errors.map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* New Products Section */}
              {previewData.productsToCreate.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-green-900 mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2" />
                    Products to be Created ({previewData.productsToCreate.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-green-100 text-green-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Part No</th>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Department</th>
                          <th className="px-3 py-2 text-left font-medium">HSN</th>
                          <th className="px-3 py-2 text-left font-medium">Price</th>
                          <th className="px-3 py-2 text-left font-medium">GST</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-200">
                        {previewData.productsToCreate.slice(0, 10).map((product: any, index: number) => (
                          <tr key={index} className="hover:bg-green-50">
                            <td className="px-3 py-2 font-mono text-xs">{product.partNo}</td>
                            <td className="px-3 py-2">{product.name}</td>
                            <td className="px-3 py-2">{product.dept}</td>
                            <td className="px-3 py-2">{product.hsnNumber}</td>
                            <td className="px-3 py-2">₹{product.price?.toLocaleString()}</td>
                            <td className="px-3 py-2">{product.gst}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.productsToCreate.length > 10 && (
                      <p className="text-sm text-green-600 mt-2 text-center">
                        ... and {previewData.productsToCreate.length - 10} more products
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Existing Products Section */}
              {previewData.existingProducts.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-yellow-900 mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Existing Products ({previewData.existingProducts.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-yellow-100 text-yellow-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Part No</th>
                          <th className="px-3 py-2 text-left font-medium">Name</th>
                          <th className="px-3 py-2 text-left font-medium">Current Price</th>
                          <th className="px-3 py-2 text-left font-medium">Excel Price</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-yellow-200">
                        {previewData.existingProducts.slice(0, 5).map((product: any, index: number) => (
                          <tr key={index} className="hover:bg-yellow-50">
                            <td className="px-3 py-2 font-mono text-xs">{product.partNo}</td>
                            <td className="px-3 py-2">{product.name}</td>
                            <td className="px-3 py-2">₹{product.currentPrice?.toLocaleString() || 'N/A'}</td>
                            <td className="px-3 py-2">₹{product.excelPrice?.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                Found
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.existingProducts.length > 5 && (
                      <p className="text-sm text-yellow-600 mt-2 text-center">
                        ... and {previewData.existingProducts.length - 5} more existing products
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Purchase Orders Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  Purchase Orders to be Created ({previewData.ordersToCreate.length})
                </h3>
                <div className="space-y-4">
                  {previewData.ordersToCreate.slice(0, 5).map((order: any, index: number) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-blue-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-blue-900">{order.poNumber}</h4>
                          <p className="text-sm text-blue-700">Supplier: {order.supplier}</p>
                          <p className="text-sm text-blue-600">
                            Expected Delivery: {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-900">
                            ₹{order.totalAmount.toLocaleString()}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${order.priority === 'high' ? 'bg-red-100 text-red-800' :
                            order.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                            {order.priority}
                          </span>
                        </div>
                      </div>
                      <div className="border-t border-blue-200 pt-3">
                        <h5 className="text-sm font-medium text-blue-800 mb-2">Items ({order.items.length})</h5>
                        <div className="space-y-2">
                          {order.items.slice(0, 3).map((item: any, itemIndex: number) => (
                            <div key={itemIndex} className="flex justify-between items-center text-sm">
                              <div className="flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2 ${item.exists ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}></span>
                                <span className="text-gray-900">{item.productName}</span>
                                <span className="text-gray-500 ml-2">({item.partNo})</span>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-900">{item.quantity} × ₹{item.unitPrice.toLocaleString()}</span>
                                <span className="text-blue-700 font-medium ml-2">
                                  = ₹{item.totalPrice.toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <p className="text-xs text-blue-600 text-center">
                              ... and {order.items.length - 3} more items
                            </p>
                          )}
                        </div>
                      </div>
                      {order.notes && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <p className="text-xs text-blue-600">
                            <strong>Notes:</strong> {order.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                  {previewData.ordersToCreate.length > 5 && (
                    <p className="text-sm text-blue-600 text-center">
                      ... and {previewData.ordersToCreate.length - 5} more purchase orders
                    </p>
                  )}
                </div>
              </div>

              {/* Legend */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    <span className="text-gray-600">New Product (will be created)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></span>
                    <span className="text-gray-600">Existing Product (will be used)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closePreviewModal}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel Import
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={importing || previewData.errors.length > 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {importing ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                  </span>
                ) : (
                  `Confirm Import (${previewData.summary.uniqueOrders} Orders, ${previewData.summary.newProducts} New Products)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrderManagement; 