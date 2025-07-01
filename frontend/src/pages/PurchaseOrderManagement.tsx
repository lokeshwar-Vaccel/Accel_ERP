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
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity?: number; // Track received quantities
  notes?: string;
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
  location: string;
  receiptDate: string;
  inspectedBy: string;
  notes?: string;
}

interface POFormData {
  supplier: string;
  expectedDeliveryDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sourceType: 'manual' | 'amc' | 'service' | 'inventory';
  sourceId?: string;
  notes?: string;
  items: Array<{
    product: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
}

const PurchaseOrderManagement: React.FC = () => {
  // Core state
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | 'all'>('all');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Selected data
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  // Modal search states
  const [detailsSearchTerm, setDetailsSearchTerm] = useState('');
  const [receiveSearchTerm, setReceiveSearchTerm] = useState('');

  // Form data
  const [formData, setFormData] = useState<POFormData>({
    supplier: '',
    expectedDeliveryDate: '',
    priority: 'low',
    sourceType: 'manual',
    sourceId: '',
    notes: '',
    items: [{ product: '', quantity: 1, unitPrice: 0 }]
  });

  const [receiveData, setReceiveData] = useState<ReceiveItemsData>({
    receivedItems: [],
    location: 'main-warehouse',
    receiptDate: '',
    inspectedBy: ''
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

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchPurchaseOrders(),
        fetchProducts(),
        fetchLocations()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      console.log('Fetching purchase orders...');
      const response = await apiClient.purchaseOrders.getAll();
      console.log('Purchase orders response:', response);

      let ordersData: PurchaseOrder[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          ordersData = response.data;
        } else if ((response.data as any).orders && Array.isArray((response.data as any).orders)) {
          ordersData = (response.data as any).orders;
        }
        console.log('Found purchase orders:', ordersData.length);
        
        // Debug: Check if products are properly populated
        if (ordersData.length > 0 && ordersData[0].items.length > 0) {
          console.log('First item product data:', ordersData[0].items[0].product);
          console.log('Product type:', typeof ordersData[0].items[0].product);
        }
      }

      // Set fallback data if no real data
      if (ordersData.length === 0) {
        ordersData = [
          {
            _id: '1',
            poNumber: 'PO-202412-0001',
            supplier: 'ABC Motors Ltd',
            items: [
              {
                product: {
                  _id: 'p1',
                  name: '250 KVA Generator Parts Kit',
                  category: 'spare_part',
                  brand: 'Cummins',
                  partNo: 'CUM-GEN-KIT-250'
                },
                quantity: 2,
                unitPrice: 15000,
                totalPrice: 30000
              },
              {
                product: {
                  _id: 'p2',
                  name: 'Oil Filter Set',
                  category: 'spare_part',
                  brand: 'Cummins',
                  partNo: 'CUM-OF-SET-001'
                },
                quantity: 10,
                unitPrice: 500,
                totalPrice: 5000
              }
            ],
            totalAmount: 35000,
            status: 'confirmed',
            orderDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'medium',
            sourceType: 'amc',
            sourceId: 'AMC-2024-0001',
            notes: 'Parts required for scheduled AMC maintenance',
            createdBy: {
              _id: 'u1',
              firstName: 'Admin',
              lastName: 'User',
              email: 'admin@sunpower.com'
            },
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            deliveryStatus: 'on_time',
            daysUntilDelivery: 2
          },
          {
            _id: '2',
            poNumber: 'PO-202412-0002',
            supplier: 'TechParts Supplies',
            items: [
              {
                product: {
                  _id: 'p3',
                  name: '500 KVA Control Panel',
                  category: 'accessory',
                  brand: 'Caterpillar',
                  partNo: 'CAT-CP-500KVA'
                },
                quantity: 1,
                unitPrice: 45000,
                totalPrice: 45000
              }
            ],
            totalAmount: 45000,
            status: 'sent',
            orderDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'high',
            sourceType: 'service',
            sourceId: 'SRV-2024-0123',
            notes: 'Urgent replacement for customer service request',
            createdBy: {
              _id: 'u1',
              firstName: 'Admin',
              lastName: 'User',
              email: 'admin@sunpower.com'
            },
            createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
            deliveryStatus: 'pending',
            daysUntilDelivery: 7
          },
          {
            _id: '3',
            poNumber: 'PO-202412-0003',
            supplier: 'PowerGen Components',
            items: [
              {
                product: {
                  _id: 'p4',
                  name: 'Fuel Injection System',
                  category: 'spare_part',
                  brand: 'Perkins',
                  partNo: 'PER-FIS-V8-001'
                },
                quantity: 1,
                unitPrice: 25000,
                totalPrice: 25000
              }
            ],
            totalAmount: 25000,
            status: 'received',
            orderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            expectedDeliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            actualDeliveryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 'low',
            sourceType: 'inventory',
            notes: 'Regular inventory replenishment',
            createdBy: {
              _id: 'u1',
              firstName: 'Admin',
              lastName: 'User',
              email: 'admin@sunpower.com'
            },
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            deliveryStatus: 'delivered'
          }
        ];
      }

      setPurchaseOrders(ordersData);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      setPurchaseOrders([]);
    }
  };

  const fetchProducts = async () => {
    try {
      console.log('Fetching products from API...');
      const response = await apiClient.products.getAll();
      console.log('Products API Response:', response);
      
      let productsData: Product[] = [];
      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          productsData = response.data;
        } else if ((response.data as any).products && Array.isArray((response.data as any).products)) {
          productsData = (response.data as any).products;
        }
        console.log('Found products:', productsData.length);
      } else if (Array.isArray(response.data)) {
        // Fallback for different response format
        productsData = response.data;
        console.log('Found products (fallback format):', productsData.length);
      } else {
        console.log('No product data found in response');
      }
      
      setProducts(productsData);
      
      // If still no products, try to fetch them without pagination/limits
      if (productsData.length === 0) {
        console.log('No products found, trying alternative fetch...');
        try {
          const alternativeResponse = await fetch('/api/v1/products?limit=1000', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          });
          const altData = await alternativeResponse.json();
          if (altData.success && altData.data) {
            if (Array.isArray(altData.data)) {
              productsData = altData.data;
            } else if (altData.data.products) {
              productsData = altData.data.products;
                       }
           console.log('Found products via alternative fetch:', productsData.length);
           setProducts(productsData);
         }
       } catch (error) {
         console.warn('Alternative product fetch failed:', error);
       }
     }

     // If still no products, show some mock data for development
     if (productsData.length === 0) {
        console.log('No products found, using mock data for development');
        const mockProducts: Product[] = [
          {
            _id: 'mock-1',
            name: '250 KVA Generator Set',
            category: 'genset',
            brand: 'Cummins',
            modelNumber: 'C250D5',
            partNo: 'C250-GEN-001',
            price: 850000,
            minStockLevel: 1,
            currentStock: 3
          },
          {
            _id: 'mock-2',
            name: 'Oil Filter - Heavy Duty',
            category: 'spare_part',
            brand: 'Cummins',
            modelNumber: 'LF9009',
            partNo: 'CUM-OF-LF9009',
            price: 1500,
            minStockLevel: 10,
            currentStock: 25
          },
          {
            _id: 'mock-3',
            name: 'Air Filter Assembly',
            category: 'spare_part',
            brand: 'Caterpillar',
            modelNumber: 'AF25550',
            partNo: 'CAT-AF-25550',
            price: 2800,
            minStockLevel: 5,
            currentStock: 12
          },
          {
            _id: 'mock-4',
            name: 'Control Panel - Digital',
            category: 'accessory',
            brand: 'Comap',
            modelNumber: 'InteliLite NT',
            partNo: 'COM-CTRL-INT',
            price: 45000,
            minStockLevel: 2,
            currentStock: 4
          },
          {
            _id: 'mock-5',
            name: 'Fuel Injection Pump',
            category: 'spare_part',
            brand: 'Perkins',
            modelNumber: 'DELPHI-9520A',
            partNo: 'PER-FIP-9520A',
            price: 28000,
            minStockLevel: 1,
            currentStock: 2
          }
        ];
        setProducts(mockProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchLocations = async () => {
    try {
      console.log('Fetching locations from API...');
      const response = await apiClient.stock.getLocations();
      console.log('Locations API Response:', response);
      
      let locationsData: StockLocation[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          locationsData = response.data;
        } else if ((response.data as any).locations && Array.isArray((response.data as any).locations)) {
          locationsData = (response.data as any).locations;
        }
        console.log('Found locations:', locationsData.length);
      }
      
      setLocations(locationsData);
      
      // If no locations found, create some mock data
      if (locationsData.length === 0) {
        console.log('No locations found, using fallback data');
        const mockLocations: StockLocation[] = [
          {
            _id: 'loc-main-warehouse',
            name: 'Main Warehouse',
            type: 'warehouse'
          },
          {
            _id: 'loc-secondary-warehouse',
            name: 'Secondary Warehouse', 
            type: 'warehouse'
          },
          {
            _id: 'loc-field-office',
            name: 'Field Office',
            type: 'office'
          }
        ];
        setLocations(mockLocations);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      // Set default locations on error
      const defaultLocations: StockLocation[] = [
        {
          _id: 'loc-main-warehouse',
          name: 'Main Warehouse',
          type: 'warehouse'
        },
        {
          _id: 'loc-secondary-warehouse',
          name: 'Secondary Warehouse',
          type: 'warehouse'
        },
        {
          _id: 'loc-field-office',
          name: 'Field Office',
          type: 'office'
        }
      ];
      setLocations(defaultLocations);
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
      console.warn('Product not populated, showing ObjectId:', product);
      
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
      expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      priority: 'low',
      sourceType: 'manual',
      sourceId: '',
      notes: '',
      items: [{ product: '', quantity: 1, unitPrice: 0 }]
    });
    setFormErrors({});
    
    // Ensure products are loaded when modal opens
    if (products.length === 0) {
      console.log('No products loaded, fetching products...');
      await fetchProducts();
    }
    
    setShowCreateModal(true);
  };

  const handleEditPO = (po: PurchaseOrder) => {
    setEditingPO(po);
          setFormData({
        supplier: typeof po.supplier === 'string' ? po.supplier : (po.supplier as Supplier)._id,
        expectedDeliveryDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.split('T')[0] : '',
        priority: po.priority || 'low',
        sourceType: po.sourceType || 'manual',
        sourceId: po.sourceId || '',
        notes: po.notes || '',
        items: po.items.map(item => ({
          product: typeof item.product === 'string' ? item.product : item.product._id,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      });
    setFormErrors({});
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
    
    // Use the first available location or a default if none exist
    const defaultLocation = locations.length > 0 ? locations[0]._id : 'loc-main-warehouse';
    
    setReceiveData({
      receivedItems: po.items.map(item => ({
        productId: typeof item.product === 'string' ? item.product : item.product?._id,
        quantityReceived: 0, // Start with 0, user must enter quantity
        condition: 'good',
        batchNumber: '',
        notes: ''
      })),
      location: defaultLocation,
      receiptDate: new Date().toISOString().split('T')[0], // Set today's date
      inspectedBy: 'Admin' // Default inspector
    });
    setShowReceiveModal(true);
  };

  const validatePOForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.supplier.trim()) {
      errors.supplier = 'Supplier is required';
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

      const totalAmount = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

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
      setPurchaseOrders(purchaseOrders.map(po => po._id === editingPO._id ? response.data : po));
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

  const handleReceiveItems = async () => {
    if (!selectedPO) return;

    setSubmitting(true);
    try {
      console.log('Sending receive data:', receiveData);
      const response = await apiClient.purchaseOrders.receiveItems(selectedPO._id, receiveData);
      
      // Use the updated purchase order from the backend response
      const updatedPO = response.data.order;
      console.log('Updated PO from backend:', updatedPO);
      
      setPurchaseOrders(purchaseOrders.map(po =>
        po._id === selectedPO._id ? updatedPO : po
      ));
      
      // Update the selected PO as well for modal display
      setSelectedPO(updatedPO);
      
      // Reset receive data for next time
      setReceiveData({
        receivedItems: [],
        location: locations.length > 0 ? locations[0]._id : 'loc-main-warehouse',
        receiptDate: new Date().toISOString().split('T')[0],
        inspectedBy: 'Admin'
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
      expectedDeliveryDate: '',
      priority: 'low',
      sourceType: 'manual',
      sourceId: '',
      notes: '',
      items: [{ product: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setFormData({ ...formData, items: updatedItems });
  };

  const filteredPOs = purchaseOrders.filter(po => {
    const supplierName = typeof po.supplier === 'string' ? po.supplier : po.supplier.name;
    const matchesSearch = po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplierName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    const matchesSupplier = !supplierFilter || supplierName.toLowerCase().includes(supplierFilter.toLowerCase());

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        <div className={`p-4 rounded-lg border ${
          importMessage.type === 'success' 
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
                {/* Add actual suppliers here when available */}
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
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier *
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.supplier ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter supplier name"
                  />
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
                    <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg">
                      <div className="col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                        <select
                          value={item.product}
                          onChange={(e) => {
                            updateItem(index, 'product', e.target.value);
                            // Auto-populate unit price if product has a default price
                            const selectedProduct = products.find(p => p._id === e.target.value);
                            if (selectedProduct?.price && item.unitPrice === 0) {
                              updateItem(index, 'unitPrice', selectedProduct.price);
                            }
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
                        {formErrors[`items.${index}.product`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.product`]}</p>
                        )}
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
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.quantity`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min="1"
                        />
                        {formErrors[`items.${index}.quantity`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.quantity`]}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.unitPrice`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min="0"
                          step="0.01"
                        />
                        {formErrors[`items.${index}.unitPrice`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.unitPrice`]}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs font-medium text-gray-900">
                          Total: {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 text-xs mt-1 flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Notes</label>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => updateItem(index, 'notes', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                          placeholder="Specifications..."
                        />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
                    Supplier *
                  </label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.supplier ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder="Enter supplier name"
                  />
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
                    <div key={index} className="grid grid-cols-12 gap-3 items-end p-4 bg-gray-50 rounded-lg">
                      <div className="col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                        <select
                          value={item.product}
                          onChange={(e) => {
                            updateItem(index, 'product', e.target.value);
                            // Auto-populate unit price if product has a default price
                            const selectedProduct = products.find(p => p._id === e.target.value);
                            if (selectedProduct?.price && item.unitPrice === 0) {
                              updateItem(index, 'unitPrice', selectedProduct.price);
                            }
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
                        {formErrors[`items.${index}.product`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.product`]}</p>
                        )}
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
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.quantity`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min="1"
                        />
                        {formErrors[`items.${index}.quantity`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.quantity`]}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹) *</label>
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors[`items.${index}.unitPrice`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          min="0"
                          step="0.01"
                        />
                        {formErrors[`items.${index}.unitPrice`] && (
                          <p className="text-red-500 text-xs mt-1">{formErrors[`items.${index}.unitPrice`]}</p>
                        )}
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs font-medium text-gray-900">
                          Total: {formatCurrency(item.quantity * item.unitPrice)}
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-700 text-xs mt-1 flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Item Notes</label>
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => updateItem(index, 'notes', e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                          placeholder="Specifications..."
                        />
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedPO.status === 'partially_received' ? 'Receive More Items' : 'Receive Items'}
                </h2>
                <p className="text-gray-600">
                  PO: {selectedPO.poNumber}
                  {selectedPO.status === 'partially_received' && 
                    <span className="ml-2 text-orange-600 text-sm">(Partially Received)</span>
                  }
                </p>
              </div>
              <button
                onClick={() => setShowReceiveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {selectedPO.status === 'partially_received' ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex">
                    <Package className="w-5 h-5 text-orange-600 mr-2 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-orange-800">Receiving Additional Items</h3>
                      <p className="text-sm text-orange-700 mt-1">
                        Some items from this purchase order have already been received. You can receive additional quantities as they arrive.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <Package className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">Receiving Items</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Review the quantities below and confirm receipt. This will update your inventory.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Location *
                  </label>
                  <select
                    value={receiveData.location}
                    onChange={(e) => setReceiveData({ ...receiveData, location: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {locations.length === 0 ? (
                      <option value="">Loading locations...</option>
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
                    Receipt Date *
                  </label>
                  <input
                    type="date"
                    value={receiveData.receiptDate}
                    onChange={(e) => setReceiveData({ ...receiveData, receiptDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Receipt Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Receipt Notes
                </label>
                <textarea
                  value={receiveData.notes || ''}
                  onChange={(e) => setReceiveData({ ...receiveData, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes about the delivery..."
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Items to Receive */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Items to Receive</h3>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search items..."
                      value={receiveSearchTerm}
                      onChange={(e) => setReceiveSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
                    />
                  </div>
                </div>
                {(() => {
                  const itemsWithRemainingQty = selectedPO.items.filter(item => 
                    (item.quantity - (item.receivedQuantity || 0)) > 0
                  );
                  
                  if (itemsWithRemainingQty.length === 0) {
                    return (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Package className="w-8 h-8 text-green-600" />
                        </div>
                        <h4 className="text-lg font-medium text-green-800 mb-1">All Items Received</h4>
                        <p className="text-green-700">All items from this purchase order have been fully received.</p>
                      </div>
                    );
                  }

                  if (filteredReceiveItems.length === 0 && receiveSearchTerm) {
                    return (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <div className="flex items-center justify-center mb-2">
                          <Search className="w-8 h-8 text-gray-400" />
                        </div>
                        <h4 className="text-lg font-medium text-gray-600 mb-1">No Items Found</h4>
                        <p className="text-gray-500">No items match your search criteria.</p>
                      </div>
                    );
                  }
                  
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
                          <div key={originalIndex} className="p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center mb-3">
                          <div className="md:col-span-2">
                            <div className="text-xs font-medium text-gray-900">
                              {getProductName(item.product)}
                            </div>
                            {getProductPartNo(item.product) !== '-' && (
                              <div className="text-xs text-blue-600 font-mono font-medium">Part: {getProductPartNo(item.product)}</div>
                            )}
                            {typeof item.product === 'object' && item.product?.category && (
                              <div className="text-xs text-gray-500">Category: {item.product?.category}</div>
                            )}
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-600">Ordered</div>
                            <div className="text-sm font-medium">{item.quantity}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-600">Already Received</div>
                            <div className="text-sm font-medium text-green-600">{item.receivedQuantity || 0}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-600">Remaining</div>
                            <div className="text-sm font-medium text-orange-600">{item.quantity - (item.receivedQuantity || 0)}</div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Receive Now</label>
                            <input
                              type="number"
                              value={receivedItem?.quantityReceived || 0}
                              onChange={(e) => {
                                const newReceivedItems = [...receiveData.receivedItems];
                                
                                // Ensure we maintain the productId when updating quantity
                                const existingItem = newReceivedItems[originalIndex] || {};
                                newReceivedItems[originalIndex] = {
                                  ...existingItem,
                                  productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                  quantityReceived: parseInt(e.target.value) || 0,
                                  condition: existingItem.condition || 'good',
                                  batchNumber: existingItem.batchNumber || '',
                                  notes: existingItem.notes || ''
                                };
                                setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                              }}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              min="0"
                              max={item.quantity - (item.receivedQuantity || 0)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Condition</label>
                            <select
                              value={receivedItem?.condition || 'good'}
                              onChange={(e) => {
                                const newReceivedItems = [...receiveData.receivedItems];
                                
                                // Ensure we maintain the productId when updating condition
                                const existingItem = newReceivedItems[originalIndex] || {};
                                newReceivedItems[originalIndex] = {
                                  ...existingItem,
                                  productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                  condition: e.target.value as 'good' | 'damaged' | 'defective'
                                };
                                setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                              }}
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs"
                            >
                              <option value="good">Good</option>
                              <option value="damaged">Damaged</option>
                              <option value="defective">Defective</option>
                            </select>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-gray-600">Unit Price</div>
                            <div className="text-sm font-medium">{formatCurrency(item.unitPrice)}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Batch Number</label>
                            <input
                              type="text"
                              value={receivedItem?.batchNumber || ''}
                              onChange={(e) => {
                                const newReceivedItems = [...receiveData.receivedItems];
                                
                                // Ensure we maintain the productId when updating batch number
                                const existingItem = newReceivedItems[originalIndex] || {};
                                newReceivedItems[originalIndex] = {
                                  ...existingItem,
                                  productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                  batchNumber: e.target.value
                                };
                                setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                              }}
                              placeholder="Optional batch/lot number"
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Item Notes</label>
                            <input
                              type="text"
                              value={receivedItem?.notes || ''}
                              onChange={(e) => {
                                const newReceivedItems = [...receiveData.receivedItems];
                                
                                // Ensure we maintain the productId when updating notes
                                const existingItem = newReceivedItems[originalIndex] || {};
                                newReceivedItems[originalIndex] = {
                                  ...existingItem,
                                  productId: existingItem.productId || (typeof item.product === 'string' ? item.product : item.product?._id),
                                  notes: e.target.value
                                };
                                setReceiveData({ ...receiveData, receivedItems: newReceivedItems });
                              }}
                              placeholder="Notes about this item"
                              className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs"
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

              {/* Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-xs font-medium text-gray-900 mb-2">Receipt Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Items Ordered:</span>
                    <div className="font-medium">{selectedPO.items.reduce((sum, item) => sum + item.quantity, 0)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Previously Received:</span>
                    <div className="font-medium text-green-600">{selectedPO.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Receiving Now:</span>
                    <div className="font-medium text-blue-600">{receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Will Remain:</span>
                    <div className="font-medium text-orange-600">
                      {selectedPO.items.reduce((sum, item) => sum + item.quantity, 0) - 
                       selectedPO.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0) - 
                       receiveData.receivedItems.reduce((sum, item) => sum + (item.quantityReceived || 0), 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Receipt Date:</span>
                    <div className="font-medium">{receiveData.receiptDate ? new Date(receiveData.receiptDate).toLocaleDateString() : 'Not set'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-gray-600">Inspector:</span>
                    <div className="font-medium">{receiveData.inspectedBy || 'Not assigned'}</div>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-gray-600">Location:</span>
                  <span className="ml-2 font-medium">
                    {(() => {
                      const location = locations.find(loc => loc._id === receiveData.location);
                      return location ? `${location.name} (${location.type})` : receiveData.location;
                    })()}
                  </span>
                </div>
                {receiveData.notes && (
                  <div className="mt-2">
                    <span className="text-gray-600">Notes:</span>
                    <div className="font-medium italic">{receiveData.notes}</div>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowReceiveModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReceiveItems}
                  disabled={submitting || receiveData.receivedItems.every(item => (item.quantityReceived || 0) === 0)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
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
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.priority === 'high' ? 'bg-red-100 text-red-800' :
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
                                <span className={`w-2 h-2 rounded-full mr-2 ${
                                  item.exists ? 'bg-yellow-500' : 'bg-green-500'
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