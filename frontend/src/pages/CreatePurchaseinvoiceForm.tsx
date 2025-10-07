import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import {
  Calendar,
  Package,
  Building2,
  Mail,
  Phone,
  MapPin,
  Plus,
  X,
  Save,
  ArrowLeft,
  ChevronDown,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  Search
} from 'lucide-react';
import { apiClient } from '../utils/api';
import toast from 'react-hot-toast';
import PageHeader from '../components/ui/PageHeader';

// Types
type PurchaseOrderStatus = 'approved_order_sent_sap' | 'credit_not_available' | 'fully_invoiced' | 'order_under_process' | 'partially_invoiced' | 'rejected';

interface POItem {
  product: string;
  quantity: number;
  gndp: number;
  totalPrice: number;
  taxRate: number;
  notes?: string;
  name?: string; // Product name field
  description?: string; // Separate description field
  hsnNumber?: string;
  uom?: string;
  isNewProduct?: boolean; // Flag to mark if this is a new product to be created
  partNo?: string; // For new products
  brand?: string; // For new products
  category?: string; // For new products
  stockId?: string; // Stock ID for inventory tracking
  stockLocation?: {
    location: string;
    room: string;
    rack: string;
  };
}

interface SupplierAddress {
  address: string;
  state: string;
  district: string;
  pincode: string;
  id?: string;
  isPrimary?: boolean;
}

interface Supplier {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  addresses?: SupplierAddress[];
  contactPerson?: string;
  type?: string;
}

interface Product {
  _id: string;
  name: string;
  price: number;
  gndp?: number;
  category: string;
  brand: string;
  gst?: number;
  partNo?: string;
  hsnNumber?: string;
  uom?: string;
  availableQuantity?: number;
}

interface StockProduct {
  _id: string; // Stock ID
  product: {
    _id: string;
    name: string;
    partNo?: string;
    brand: string;
    category: string;
    hsnNumber?: string;
    gst?: number;
    gndp?: number;
    price: number;
    uom?: string;
  };
  location: {
    _id: string;
    name: string;
  };
  room?: {
    _id: string;
    name: string;
  };
  rack?: {
    _id: string;
    name: string;
  };
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  stockLocation: {
    location: string;
    room: string;
    rack: string;
  };
}

interface PurchaseOrder {
  _id: string;
  poNumber: string;
  supplier: string | Supplier;
  supplierEmail: string | any;
  items: Array<{
    product: string | {
      _id: string;
      name: string;
      partNo?: string;
      hsnNumber?: string;
      brand?: string;
      category?: string;
      gst?: number;
      price?: number;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate: number;
    receivedQuantity?: number;
    notes?: string;
  }>;
  totalAmount: number;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  sourceType?: 'manual' | 'amc' | 'service' | 'inventory';
  sourceId?: string;
  department?: string;
  purchaseOrderType: 'commercial' | 'breakdown_order';
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
  supplierAddress?: SupplierAddress;
}

interface POFormData {
  supplier: string;
  supplierEmail: string;
  supplierAddress?: SupplierAddress;
  location: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  sourceId?: string;
  department: 'retail' | 'corporate' | 'industrial_marine' | 'others';
  notes?: string;
  items: POItem[];
}

const CreatePurchaseInvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get ID from location state
  const poId = location.state?.poId;

  // Check if we're in edit mode
  const isEditMode = Boolean(poId);

  // Redirect if trying to edit without PO ID
  useEffect(() => {
    if (location.pathname === '/purchase-order-management/edit' && !poId) {
      navigate('/billing');
    }
  }, [location.pathname, poId, navigate]);

  // State management
  const [formData, setFormData] = useState<POFormData>({
    supplier: '',
    supplierEmail: '',
    supplierAddress: {
      address: '',
      state: '',
      district: '',
      pincode: ''
    },
    location: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
    department: 'retail',
    notes: '',
    items: [{
      product: '',
      quantity: 1,
      gndp: 0,
      totalPrice: 0,
      taxRate: 0,
      name: '',
      description: '',
      hsnNumber: '',
      uom: 'nos'
    }]
  });

  console.log("formData000:", formData);


  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [addresses, setAddresses] = useState<SupplierAddress[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');

  // Dropdown states
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});
  const [showCategoryDropdowns, setShowCategoryDropdowns] = useState<Record<number, boolean>>({});
  const [showUomDropdowns, setShowUomDropdowns] = useState<Record<number, boolean>>({});
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [showSourceTypeDropdown, setShowSourceTypeDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);

  // Search states
  const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
  const [addressSearchTerm, setAddressSearchTerm] = useState('');
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});
  const [categorySearchTerms, setCategorySearchTerms] = useState<Record<number, string>>({});
  const [uomSearchTerms, setUomSearchTerms] = useState<Record<number, string>>({});
  const [prioritySearchTerm, setPrioritySearchTerm] = useState('');
  const [sourceTypeSearchTerm, setSourceTypeSearchTerm] = useState('');
  const [departmentSearchTerm, setDepartmentSearchTerm] = useState('');

  // Search helper functions
  const updateProductSearchTerm = (itemIndex: number, searchTerm: string) => {
    setProductSearchTerms(prev => ({ ...prev, [itemIndex]: searchTerm }));
  };

  const updateCategorySearchTerm = (itemIndex: number, searchTerm: string) => {
    setCategorySearchTerms(prev => ({ ...prev, [itemIndex]: searchTerm }));
  };

  const updateUomSearchTerm = (itemIndex: number, searchTerm: string) => {
    setUomSearchTerms(prev => ({ ...prev, [itemIndex]: searchTerm }));
  };

  // Keyboard navigation states
  const [highlightedSupplierIndex, setHighlightedSupplierIndex] = useState(-1);
  const [highlightedAddressIndex, setHighlightedAddressIndex] = useState(-1);
  const [highlightedLocationIndex, setHighlightedLocationIndex] = useState(-1);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState<Record<number, number>>({});
  const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState<Record<number, number>>({});
  const [highlightedUomIndex, setHighlightedUomIndex] = useState<Record<number, number>>({});
  const [highlightedPriorityIndex, setHighlightedPriorityIndex] = useState(-1);
  const [highlightedSourceTypeIndex, setHighlightedSourceTypeIndex] = useState(-1);
  const [highlightedDepartmentIndex, setHighlightedDepartmentIndex] = useState(-1);
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);

  // Refs for keyboard navigation
  const formRef = useRef<HTMLFormElement>(null);
  const supplierInputRef = useRef<HTMLInputElement>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const deliveryDateInputRef = useRef<HTMLInputElement>(null);
  const prioritySelectRef = useRef<HTMLInputElement>(null);
  const sourceTypeSelectRef = useRef<HTMLInputElement>(null);
  const departmentSelectRef = useRef<HTMLInputElement>(null);
  const createPOButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus on supplier field when component mounts
  useEffect(() => {
    if (!loading && supplierInputRef.current) {
      setTimeout(() => {
        supplierInputRef.current?.focus();
        setShowSupplierDropdown(true);
      }, 100);
    }
  }, [loading]);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Don't close dropdowns if we're in a tab transition
      if (isTabTransitioning) {
        return;
      }

      // Close all dropdowns
      if (!target.closest('.dropdown-container')) {
        setShowSupplierDropdown(false);
        setShowAddressDropdown(false);
        setShowLocationDropdown(false);
        setShowPriorityDropdown(false);
        setShowSourceTypeDropdown(false);
        setShowDepartmentDropdown(false);
        // Close product, category, and UOM dropdowns for all rows
        setShowProductDropdowns({});
        setShowCategoryDropdowns({});
        setShowUomDropdowns({});
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch PO data if in edit mode
  useEffect(() => {
    if (isEditMode && poId) {
      fetchPOData();
    }
  }, [isEditMode, poId]);

  // Keyboard navigation handler
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 's':
          e.preventDefault();
          handleSubmitPO();
          break;
        case 'Enter':
          e.preventDefault();
          addItem();
          break;
      }
    } else {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          navigate('/billing');
          break;
      }
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // API functions
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSuppliers(),
        fetchProducts(),
        fetchLocations()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load initial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.customers.getAll({
        type: 'supplier',
        limit: 100
      });

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
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
      setSuppliers([]);
    }
  };

  const fetchProducts = async () => {
    try {
      let allProducts: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const response: any = await apiClient.products.getAll({ page, limit: 50 });
        let productsData: any[] = [];
        if (response?.data) {
          if (Array.isArray(response.data)) {
            productsData = response.data;
          } else if (response.data.products && Array.isArray(response.data.products)) {
            productsData = response.data.products;
          }
        }
        allProducts = allProducts.concat(productsData);

        // Check if there are more pages
        const pagination = response?.pagination || response?.data?.pagination;
        if (pagination && pagination.pages && page < pagination.pages) {
          page += 1;
        } else {
          hasMore = false;
        }
      }

      // Remove duplicates based on _id
      const uniqueProducts = allProducts.filter((product, index, self) =>
        index === self.findIndex(p => p._id === product._id)
      );

      setProducts(uniqueProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
      setProducts([]);
    }
  };

  const fetchProductsByLocation = async (locationId: string, searchTerm?: string) => {
    try {
      // Fetch all products without pagination limit
      const params: any = { limit: 10000 }; // Set a very high limit to get all products
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await apiClient.stock.getProductsByLocation(locationId, params);
      
      if (response.success && response.data?.products) {
        setStockProducts(response.data.products);
        setSelectedLocationId(locationId);
      } else {
        setStockProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products by location:', error);
      toast.error('Failed to load products for selected location');
      setStockProducts([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await apiClient.stock.getLocations();
      let locationsData: any[] = [];

      if (response.data) {
        if (Array.isArray(response.data)) {
          locationsData = response.data;
        } else if ((response.data as any).locations && Array.isArray((response.data as any).locations)) {
          locationsData = (response.data as any).locations;
        }
      }

      setLocations(locationsData);

      // Set primary location as default if not already selected
      if (!isEditMode) {
        const primaryLocation = locationsData.find(loc => loc.isPrimary === true);
        if (primaryLocation) {
          setFormData(prev => ({ ...prev, location: primaryLocation._id }));
          setLocationSearchTerm(primaryLocation.name);
          setSelectedLocationId(primaryLocation._id);
          
          // Auto-load products for the primary location
          setTimeout(() => {
            console.log('CreatePurchaseinvoiceForm: Auto-loading products for primary location:', primaryLocation._id);
            fetchProductsByLocation(primaryLocation._id);
          }, 500);
        } else {
          // Fallback to "Main Office" if no primary location is set
          const mainOffice = locationsData.find(loc => loc.name === "Main Office");
          if (mainOffice) {
            setFormData(prev => ({ ...prev, location: mainOffice._id }));
            setLocationSearchTerm(mainOffice.name);
            setSelectedLocationId(mainOffice._id);
            
            // Auto-load products for the fallback location
            setTimeout(() => {
              console.log('CreatePurchaseinvoiceForm: Auto-loading products for fallback location:', mainOffice._id);
              fetchProductsByLocation(mainOffice._id);
            }, 500);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  const fetchPOData = async () => {
    if (!poId) return;

    try {
      setLoading(true);
      const response = await apiClient.purchaseOrders.getById(poId);

      if (response.success && response.data?.order) {
        const po = response.data.order as PurchaseOrder;
        console.log('Fetched PO data:', response.data);
        setEditingPO(po);

        // Extract supplier address from the PO
        let supplierAddress: SupplierAddress | undefined = undefined;
        if (po.supplierAddress) {
          supplierAddress = po.supplierAddress;
        }

        // Map PO data to form data
        const mappedFormData: POFormData = {
          supplier: typeof po.supplier === 'string' ? po.supplier : po.supplier._id,
          supplierEmail: typeof po.supplierEmail === 'string' ? po.supplierEmail : (po.supplierEmail as any)?.email || '',
          supplierAddress,
          location: '', // Default empty location for now
          invoiceNumber: po.poNumber || '',
          invoiceDate: po.orderDate ? po.orderDate.split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          sourceId: po.sourceId || '',
          department: (po.department as 'retail' | 'corporate' | 'industrial_marine' | 'others') || 'retail',
          notes: po.notes || '',
          items: po.items.map(item => ({
            product: typeof item.product === 'string' ? item.product : item.product._id,
            quantity: item.quantity,
            gndp: item.unitPrice, // Map unitPrice to gndp
            totalPrice: item.totalPrice,
            taxRate: item.taxRate,
            // Map additional product fields if product is populated
            name: typeof item.product === 'string' ? undefined : item.product.name,
            hsnNumber: typeof item.product === 'string' ? undefined : item.product.hsnNumber,
            uom: typeof item.product === 'string' ? undefined : (item.product as any).uom,
            partNo: typeof item.product === 'string' ? undefined : item.product.partNo,
            brand: typeof item.product === 'string' ? undefined : item.product.brand,
            category: typeof item.product === 'string' ? undefined : item.product.category
          }))
        };

        console.log('Mapped form data:', mappedFormData);
        console.log('Original PO items:', po.items);
        setFormData(mappedFormData);

        // Fetch supplier details to get addresses and set search terms
        if (typeof po.supplier === 'string') {
          try {
            const supplierResponse = await apiClient.customers.getById(po.supplier);
            if (supplierResponse.success && supplierResponse.data?.customer) {
              const supplier = supplierResponse.data.customer;
              console.log('Fetched supplier data:', supplier);

              // Set supplier search term
              setSupplierSearchTerm(supplier.name);

              // Set addresses for dropdown
              if (supplier.addresses && Array.isArray(supplier.addresses)) {
                setAddresses(supplier.addresses);
              }

              // Set address search term if we have supplierAddress
              if (supplierAddress) {
                setAddressSearchTerm(`${supplierAddress.address}, ${supplierAddress.district}, ${supplierAddress.state} - ${supplierAddress.pincode}`);
              }
            }
          } catch (supplierError) {
            console.error('Error fetching supplier data:', supplierError);
            // Still set the supplier search term from the PO data
            setSupplierSearchTerm(po.supplier);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching PO data:', error);
      toast.error('Failed to load purchase invoice data');
      navigate('/billing');
    } finally {
      setLoading(false);
    }
  };

  // Form handlers
  const handleSupplierSelect = (supplierId: string) => {
    const supplier = suppliers.find(s => s._id === supplierId);
    setFormData(prev => ({
      ...prev,
      supplier: supplierId,
      supplierEmail: supplier?.email || '',
      supplierAddress: undefined
    }));
    setShowSupplierDropdown(false);
    setSupplierSearchTerm('');
    setHighlightedSupplierIndex(-1);

    // Load addresses for the selected supplier
    if (supplier && supplier.addresses && supplier.addresses.length > 0) {
      setAddresses(supplier.addresses);
    } else {
      setAddresses([]);
    }

    // Auto-focus on invoice number field after supplier selection
    setTimeout(() => {
      const invoiceNumberInput = document.querySelector('[data-field="invoice-number"]') as HTMLInputElement;
      if (invoiceNumberInput) invoiceNumberInput.focus();
    }, 50);
  };

  const handleAddressSelect = (addressId: string) => {
    const address = addresses.find(a => a.id === addressId);
    setFormData(prev => ({
      ...prev,
      supplierAddress: address
    }));
    setShowAddressDropdown(false);
    setAddressSearchTerm('');
    setHighlightedAddressIndex(-1);

            // Auto-focus on invoice date field after address selection
        setTimeout(() => {
          const invoiceDateInput = document.querySelector('[data-field="invoice-date"]') as HTMLInputElement;
          if (invoiceDateInput) invoiceDateInput.focus();
        }, 50);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product: '',
        quantity: 1,
        gndp: 0,
        totalPrice: 0,
        taxRate: 0,
        name: '',
        description: '',
        hsnNumber: '',
        uom: 'nos'
      }]
    }));
  };

  const removeItem = (index: number) => {
    // Allow deleting even the last row
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));

    // If all items are deleted, add a new empty item
    if (formData.items.length === 1) {
      setTimeout(() => {
        addItem();
      }, 100);
    }
  };

  const clearProductFields = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          return {
            ...item,
            product: '',
            name: '',
            partNo: '',
            gndp: 0,
            taxRate: 0,
            hsnNumber: '',
            uom: '',
            totalPrice: 0,
            isNewProduct: false
          };
        }
        return item;
      })
    }));
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => {
        if (i === index) {
          const updatedItem = { ...item, [field]: value };

          // Auto-populate product fields when stock is selected
          if (field === 'stockId') {
            const stockProduct = stockProducts.find(sp => sp._id === value);
            if (stockProduct) {
              updatedItem.product = stockProduct.product._id; // Set the product ID
              updatedItem.gndp = stockProduct.product.gndp || stockProduct.product.price || 0;
              updatedItem.name = stockProduct.product.name;
              updatedItem.taxRate = stockProduct.product.gst || 0;
              updatedItem.hsnNumber = stockProduct.product.hsnNumber || '';
              updatedItem.uom = stockProduct.product.uom || 'nos';
              updatedItem.stockId = stockProduct._id;
              updatedItem.stockLocation = stockProduct.stockLocation;
              
              // Debug log to ensure stock ID is being set correctly
              console.log(`Selected stock for product ${stockProduct.product.name}:`, {
                productId: stockProduct.product._id,
                stockId: stockProduct._id,
                location: stockProduct.stockLocation.location,
                room: stockProduct.stockLocation.room,
                rack: stockProduct.stockLocation.rack,
                availableQuantity: stockProduct.availableQuantity
              });
            }
          }

          // Auto-calculate total price
          if (field === 'quantity' || field === 'gndp' || field === 'taxRate' || field === 'product' || field === 'stockId') {
            const quantity = Number(field === 'quantity' ? value : (updatedItem.quantity || item.quantity)) || 0;
            const gndp = Number(field === 'gndp' ? value : (updatedItem.gndp || item.gndp)) || 0;
            const taxRate = Number(field === 'taxRate' ? value : (updatedItem.taxRate || item.taxRate)) || 0;
            const subtotal = quantity * gndp;
            updatedItem.totalPrice = subtotal * (1 + taxRate / 100);

          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const getFilteredProducts = (searchTerm: string = '') => {
    // If no location is selected, return empty array
    if (!selectedLocationId) {
      return [];
    }
    
    return stockProducts.filter(stockProduct =>
      stockProduct.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockProduct.product.partNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockProduct.product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stockProduct.product.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getProductName = (productId: string) => {
    const stockProduct = stockProducts.find(sp => sp.product._id === productId);
    return stockProduct?.product.name || '';
  };

  const getProductPartNo = (productId: string) => {
    const stockProduct = stockProducts.find(sp => sp.product._id === productId);
    return stockProduct?.product.partNo || '';
  };

  const getStockProductByProductId = (productId: string) => {
    return stockProducts.find(sp => sp.product._id === productId);
  };

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliers.find(s => s._id === supplierId);
    return supplier?.name || '';
  };

  const getLocationLabel = (locationId: string) => {
    const location = locations.find(l => l._id === locationId);
    return location?.name || '';
  };

  // const getAddressLabel = (addressId: string) => {
  //     const address = addresses.find(a => a.id === addressId);
  //     if (!address) return '';
  //     return `${address.address}, ${address.district}, ${address.state} - ${address.pincode}`;
  // };

  const getAddressLabel = (addressId?: string) => {
    if (!addressId) return '';

    // If in edit mode and formData already has full object
    if (typeof addressId !== 'string' && typeof addressId === 'object') {
      const addr = addressId;
      return formatAddressString(addr);
    }

    // Otherwise, find by ID from addresses list
    const address = addresses.find(a => a.id === addressId);
    if (!address) return '';

    return formatAddressString(address);
  };

  // Small helper to avoid repeating string concatenation
  const formatAddressString = (addr: any) => {
    const parts = [
      addr.address,
      addr.district,
      addr.state && `- ${addr.state}`,
      addr.pincode && `${addr.pincode}`
    ].filter(Boolean);

    return parts.join(', ');
  };


  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.supplier) {
      newErrors.push('Supplier is required');
    }
    if (!formData.invoiceNumber) {
      newErrors.push('Invoice number is required');
    }
    if (!formData.location) {
      newErrors.push('To address is required');
    }
    if (!formData.dueDate) {
      newErrors.push('Due date is required');
    }
    if (!formData.supplierAddress?.address) {
      newErrors.push('Supplier address is required');
    }

    // Check if we have at least one valid item
    const validItems = formData.items.filter(item => {
      if (item.product && item.product !== '') {
        return true; // Existing product selected
      }
      if (item.isNewProduct && item.name && item.partNo && item.gndp > 0) {
        return true; // New product with required fields
      }
      return false; // Empty or incomplete item
    });

    if (validItems.length === 0) {
      newErrors.push('At least one item is required');
    }

    formData.items.forEach((item, index) => {
      if (item.isNewProduct) {
        // Validation for new products
        if (!item.name?.trim()) {
          newErrors.push(`Product name is required for new product in item ${index + 1}`);
        }
        if (!item.partNo?.trim()) {
          newErrors.push(`Part number is required for new product in item ${index + 1}`);
        }
        if (!item.category?.trim()) {
          newErrors.push(`Category is required for new product in item ${index + 1}`);
        }

        if (!item.hsnNumber?.trim()) {
          newErrors.push(`HSN/SAC is required for new product in item ${index + 1}`);
        }
        if (!item.gndp || item.gndp <= 0) {
          newErrors.push(`GNDP price must be greater than 0 for new product in item ${index + 1}`);
        }
        if (!item.uom?.trim()) {
          newErrors.push(`UOM is required for new product in item ${index + 1}`);
        }
        if (item.taxRate === undefined || item.taxRate < 0) {
          newErrors.push(`GST rate is required for new product in item ${index + 1}`);
        }
      } else {
        // Validation for existing products
        if (!item.product) {
          newErrors.push(`Product selection is required for item ${index + 1}`);
        }
      }

      // Common validations
      if (!item.quantity || item.quantity <= 0) {
        newErrors.push(`Quantity must be greater than 0 for item ${index + 1}`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleCreateProduct = async () => {
    // This function is no longer needed - removing it
  };

  const user = useSelector((state: RootState) => state.auth.user);

  // Dropdown data arrays
  const priorityOptions = [
    { value: 'low', label: 'Low Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'high', label: 'High Priority' },
    { value: 'urgent', label: 'Urgent' }
  ];

  const sourceTypeOptions = [
    { value: 'manual', label: 'Manual Purchase' },
    { value: 'amc', label: 'AMC Requirement' },
    { value: 'service', label: 'Service Request' },
    { value: 'inventory', label: 'Inventory Replenishment' }
  ];

  const categoryOptions = [
    { value: 'spare_part', label: 'Spare Part' },
    { value: 'accessory', label: 'Accessory' },
    { value: 'genset', label: 'Genset' }
  ];

  const uomOptions = [
    { value: 'nos', label: 'Nos' },
    { value: 'kg', label: 'Kg' },
    { value: 'litre', label: 'Litre' },
    { value: 'meter', label: 'Meter' },
    { value: 'sq.ft', label: 'Sq.Ft' },
    { value: 'hour', label: 'Hour' },
    { value: 'set', label: 'Set' },
    { value: 'box', label: 'Box' },
    { value: 'can', label: 'Can' },
    { value: 'roll', label: 'Roll' }
  ];

  const departmentOptions = [
    { value: 'retail', label: 'Retail' },
    { value: 'corporate', label: 'Corporate' },
    { value: 'industrial_marine', label: 'Industrial & Marine' },
    { value: 'others', label: 'Others' }
  ];

  // Helper functions for dropdown options
  const getFilteredPriorities = (searchTerm: string = '') => {
    return priorityOptions.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFilteredSourceTypes = (searchTerm: string = '') => {
    return sourceTypeOptions.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFilteredCategories = (searchTerm: string = '') => {
    return categoryOptions.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFilteredUomOptions = (searchTerm: string = '') => {
    return uomOptions.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getFilteredDepartments = (searchTerm: string = '') => {
    return departmentOptions.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getCategoryLabel = (value: string) => {
    const option = categoryOptions.find(opt => opt.value === value);
    return option?.label || '';
  };

  const getUomLabel = (value: string) => {
    const option = uomOptions.find(opt => opt.value === value);
    return option?.label || '';
  };

  const getPriorityLabel = (value: string) => {
    const option = priorityOptions.find(opt => opt.value === value);
    return option?.label || '';
  };

  const getSourceTypeLabel = (value: string) => {
    const option = sourceTypeOptions.find(opt => opt.value === value);
    return option?.label || '';
  };

  const getDepartmentLabel = (value: string) => {
    const option = departmentOptions.find(opt => opt.value === value);
    return option?.label || '';
  };

  // Handler functions for dropdown selections
  const handlePrioritySelect = (value: string) => {
    setFormData(prev => ({ ...prev, priority: value as any }));
    setShowPriorityDropdown(false);
    setPrioritySearchTerm('');
    setHighlightedPriorityIndex(-1);

    // Auto-focus on source type field after priority selection
    setTimeout(() => {
      sourceTypeSelectRef.current?.focus();
      setShowSourceTypeDropdown(true);
    }, 50);
  };

  const handleSourceTypeSelect = (value: string) => {
    setFormData(prev => ({ ...prev, sourceType: value as any }));
    setShowSourceTypeDropdown(false);
    setSourceTypeSearchTerm('');
    setHighlightedSourceTypeIndex(-1);

    // Auto-focus on department field after source type selection
    setTimeout(() => {
      departmentSelectRef.current?.focus();
      setShowDepartmentDropdown(true);
    }, 50);
  };

  const handleDepartmentSelect = (value: string) => {
    setFormData(prev => ({ ...prev, department: value as 'retail' | 'corporate' | 'industrial_marine' | 'others' }));
    setShowDepartmentDropdown(false);
    setDepartmentSearchTerm('');
    setHighlightedDepartmentIndex(-1);

    // Auto-focus on first product field after department selection
    setTimeout(() => {
      const firstProductInput = document.querySelector(`[data-row="0"][data-field="partNo"]`) as HTMLInputElement;
      if (firstProductInput) {
        firstProductInput.focus();
        // Also open the product dropdown for better UX
        setShowProductDropdowns({ ...showProductDropdowns, 0: true });
      }
    }, 50);
  };

  const handleSubmitPO = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      // Remove empty rows before processing
      const cleanedItems = formData.items.filter(item => {
        if (item.product && item.product !== '') {
          return true; // Existing product selected
        }
        if (item.isNewProduct && item.name && item.partNo && item.gndp > 0) {
          return true; // New product with required fields
        }
        return false; // Empty or incomplete item
      });

      if (cleanedItems.length === 0) {
        toast.error('Please add at least one item to the purchase invoice');
        setSubmitting(false);
        return;
      }

      // First, create any new products that are marked as new
      const updatedItems = [];

      for (const item of cleanedItems) {
        if (item.isNewProduct) {
          // Create the new product
          const productData = {
            name: item.name || item.partNo || 'New Product', // Use dedicated name field
            partNo: item.partNo || `AUTO-${Date.now()}`,
            category: item.category || 'spare_part',
            brand: 'Generic', // Default brand since it's not required
            gndp: item.gndp,
            price: item.gndp, // Use GNDP as price for now
            gst: item.taxRate || 0,
            hsnNumber: item.hsnNumber || '',
            uom: (item.uom || 'nos').toLowerCase(), // Convert to lowercase to match backend enum
            description: item.name || item.description || '', // Use name as description if no description provided
            minStockLevel: 0,
            maxStockLevel: 0,
            isActive: true,
            createdBy: user?.id || '507f1f77bcf86cd799439011' // Use actual user ID or fallback
          };

          const productResponse = await apiClient.products.create(productData);

          if (productResponse.success) {
            // Update the item to reference the new product
            updatedItems.push({
              ...item,
              product: productResponse.data?.product?._id,
              isNewProduct: false,
              totalPrice: item.quantity * item.gndp * (1 + (item.taxRate || 0) / 100)
            });
          } else {
            throw new Error(`Failed to create product: ${item.partNo}`);
          }
        } else {
          // Regular item, just calculate total price
          updatedItems.push({
            ...item,
            totalPrice: item.quantity * item.gndp * (1 + (item.taxRate || 0) / 100)
          });
        }
      }

      // Update stock quantities for items with stock information
      for (const item of updatedItems) {
        if (item.stockId && item.quantity > 0) {
          try {
            console.log(`Updating stock for item:`, {
              productName: item.name,
              productId: item.product,
              stockId: item.stockId,
              quantity: item.quantity,
              stockLocation: item.stockLocation,
              formDataLocation: formData.location
            });
            
            const stockAdjustmentData = {
              stockId: item.stockId,
              product: item.product,
              location: formData.location,
              adjustmentType: 'add',
              quantity: item.quantity,
              reason: `Purchase Invoice - Added ${item.quantity} units`,
              notes: `Purchase invoice created with ${item.quantity} units added to stock at ${item.stockLocation?.location} → ${item.stockLocation?.room} → ${item.stockLocation?.rack}`
            };
            
            console.log('Stock adjustment data being sent:', stockAdjustmentData);
            
            await apiClient.stock.adjustStock(stockAdjustmentData);
            
            console.log(`Successfully updated stock for ${item.name}`);
          } catch (error) {
            console.error('Error updating stock:', error);
            // Don't fail the entire operation for stock update errors
            toast.error(`Failed to update stock for ${item.name || 'product'}`);
          }
        } else {
          console.log(`Skipping stock update for item:`, {
            productName: item.name,
            hasStockId: !!item.stockId,
            quantity: item.quantity,
            reason: !item.stockId ? 'No stock ID' : 'Zero quantity'
          });
        }
      }

      console.log("updatedItems:", updatedItems);

      // Filter out empty items and map our frontend fields to backend expected fields
      const mappedItems = updatedItems
        .filter(item => {
          // Keep items that have a valid product ID (either existing or newly created)
          return item.product && item.product !== '' && !item.product.startsWith('temp-');
        })
        .map(item => ({
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.gndp, // Map gndp to unitPrice
          totalPrice: item.totalPrice,
          taxRate: item.taxRate || 0,
          taxAmount: (item.quantity * item.gndp * (item.taxRate || 0)) / 100,
          description: item.name || item.description || '', // Use name as description
          uom: item.uom || 'nos'
        }));

      console.log("mappedItems:", mappedItems);
      // Validate that we have at least one valid item
      if (mappedItems.length === 0) {
        toast.error('Please add at least one item to the purchase invoice');
        return;
      }

      const invoiceData = {
        invoiceType: 'purchase',
        user: user?.id || '507f1f77bcf86cd799439011', // Required by Invoice model
        customer: formData.supplier, // For purchase invoices, customer is the supplier
        supplier: formData.supplier,
        supplierEmail: formData.supplierEmail,
        supplierAddress: formData.supplierAddress,
        location: formData.location,
        invoiceNumber: formData.invoiceNumber,
        issueDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        poNumber: formData.invoiceNumber, // Use the manual invoice number as PO number
        items: mappedItems,
        subtotal: calculateSubtotal(),
        taxAmount: calculateTotalTax(),
        discountAmount: calculateTotalDiscount(),
        totalAmount: calculateTotal(),
        paidAmount: 0,
        remainingAmount: calculateTotal(),
        status: 'draft',
        paymentStatus: 'pending',
        notes: formData.notes,
        createdBy: user?.id || '507f1f77bcf86cd799439011'
      };

      let response;
              if (isEditMode && editingPO) {
                  // Update existing purchase invoice
        response = await apiClient.invoices.update(editingPO._id, invoiceData);
        toast.success('Purchase Invoice updated successfully!');
        } else {
                  // Create new purchase invoice
        response = await apiClient.invoices.create(invoiceData);
        toast.success('Purchase Invoice created successfully!');
      }

      navigate('/billing');
    } catch (error: any) {
      console.error('Error saving purchase invoice:', error);
      toast.error(error.message || `Failed to ${isEditMode ? 'update' : 'create'} purchase invoice`);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) =>
      sum + (item.quantity * item.gndp), 0
    );
  };

  const calculateTotalDiscount = () => {
    return 0; // No discount in Purchase Invoices
  };

  const calculateTotalTax = () => {
    return formData.items.reduce((sum, item) => {
      const subtotal = item.quantity * item.gndp;
      const taxAmount = subtotal * ((item.taxRate || 0) / 100);
      return sum + taxAmount;
    }, 0);
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => {
      const subtotal = item.quantity * item.gndp;
      const totalWithTax = subtotal * (1 + (item.taxRate || 0) / 100);
      return sum + totalWithTax;
    }, 0);
  };

  // Keyboard handlers
  const handleAddressKeyDown = (e: React.KeyboardEvent) => {
    const filteredAddresses = addresses.filter(address =>
      address.address.toLowerCase().includes(addressSearchTerm.toLowerCase()) ||
      address.district.toLowerCase().includes(addressSearchTerm.toLowerCase()) ||
      address.state.toLowerCase().includes(addressSearchTerm.toLowerCase())
    );

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: Move back to supplier field
          setShowAddressDropdown(false);
          setAddressSearchTerm('');
          setHighlightedAddressIndex(-1);
          setTimeout(() => {
            supplierInputRef.current?.focus();
            setShowSupplierDropdown(true);
          }, 50);
        } else {
          // Tab: Move to next field (To Address)
          if (highlightedAddressIndex >= 0 && filteredAddresses[highlightedAddressIndex]) {
            handleAddressSelect(filteredAddresses[highlightedAddressIndex].id || '');
          } else {
            setShowAddressDropdown(false);
            setAddressSearchTerm('');
            setHighlightedAddressIndex(-1);
            setTimeout(() => {
              locationInputRef.current?.focus();
              setShowLocationDropdown(true);
            }, 50);
          }
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedAddressIndex(prev =>
          prev < filteredAddresses.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedAddressIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedAddressIndex >= 0 && filteredAddresses[highlightedAddressIndex]) {
          handleAddressSelect(filteredAddresses[highlightedAddressIndex].id || '');
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowAddressDropdown(false);
        setAddressSearchTerm('');
        setHighlightedAddressIndex(-1);
        break;
    }
  };

  const handleLocationSelect = (locationId: string) => {
    setFormData(prev => ({ ...prev, location: locationId }));
    setShowLocationDropdown(false);
    setLocationSearchTerm('');
    setHighlightedLocationIndex(-1);
    
    // Fetch products for the selected location
    fetchProductsByLocation(locationId);
    
    // Auto-focus on invoice date field after location selection
    setTimeout(() => {
      const invoiceDateInput = document.querySelector('[data-field="invoice-date"]') as HTMLInputElement;
      if (invoiceDateInput) invoiceDateInput.focus();
    }, 50);
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    const filteredLocations = locations.filter(location =>
      location.name.toLowerCase().includes(locationSearchTerm.toLowerCase())
    );

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: Move back to supplier address field
          setShowLocationDropdown(false);
          setLocationSearchTerm('');
          setHighlightedLocationIndex(-1);
          setTimeout(() => {
            addressInputRef.current?.focus();
            setShowAddressDropdown(true);
          }, 50);
        } else {
          // Tab: Move to next field (Invoice Date)
          if (highlightedLocationIndex >= 0 && filteredLocations[highlightedLocationIndex]) {
            handleLocationSelect(filteredLocations[highlightedLocationIndex]._id);
          } else {
            setShowLocationDropdown(false);
            setLocationSearchTerm('');
            setHighlightedLocationIndex(-1);
            setTimeout(() => {
              const invoiceDateInput = document.querySelector('[data-field="invoice-date"]') as HTMLInputElement;
              if (invoiceDateInput) invoiceDateInput.focus();
            }, 50);
          }
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedLocationIndex(prev =>
          prev < filteredLocations.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedLocationIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedLocationIndex >= 0 && filteredLocations[highlightedLocationIndex]) {
          handleLocationSelect(filteredLocations[highlightedLocationIndex]._id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowLocationDropdown(false);
        setLocationSearchTerm('');
        setHighlightedLocationIndex(-1);
        break;
    }
  };

  const handleSupplierKeyDown = (e: React.KeyboardEvent) => {
    const filteredSuppliers = suppliers.filter(supplier =>
      supplier.type === 'supplier' && (
        supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
      )
    );

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: Move to previous field (if any)
          setShowSupplierDropdown(false);
          setSupplierSearchTerm('');
          setHighlightedSupplierIndex(-1);
          setTimeout(() => {
            // Check if address field is disabled (no supplier selected)
            if (!formData.supplier) {
              // Address is disabled, stay in supplier field
              supplierInputRef.current?.focus();
              setShowSupplierDropdown(true);
            } else {
              // Address is enabled, check if it has a value
              const addressValue = addressInputRef.current?.value?.trim();
              console.log("addressValue:", addressValue);

              if (addressValue) {
                addressInputRef.current?.focus();
                setShowAddressDropdown(true);
              } else {
                supplierInputRef.current?.focus();
                setShowSupplierDropdown(true);
              }
            }
          }, 50);
        } else {
          // Tab: Move to next field (Address or Delivery Date if address is disabled)
          if (highlightedSupplierIndex >= 0 && filteredSuppliers[highlightedSupplierIndex]) {
            handleSupplierSelect(filteredSuppliers[highlightedSupplierIndex]._id);
          } else {
            setShowSupplierDropdown(false);
            setSupplierSearchTerm('');
            setHighlightedSupplierIndex(-1);
                        setTimeout(() => {
              // Go to invoice number field
              const invoiceNumberInput = document.querySelector('[data-field="invoice-number"]') as HTMLInputElement;
              if (invoiceNumberInput) invoiceNumberInput.focus();
            }, 50);
          }
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedSupplierIndex(prev =>
          prev < filteredSuppliers.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedSupplierIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedSupplierIndex >= 0 && filteredSuppliers[highlightedSupplierIndex]) {
          handleSupplierSelect(filteredSuppliers[highlightedSupplierIndex]._id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSupplierDropdown(false);
        setSupplierSearchTerm('');
        setHighlightedSupplierIndex(-1);
        break;
    }
  };

  const handlePriorityKeyDown = (e: React.KeyboardEvent) => {
    const filteredPriorities = getFilteredPriorities(prioritySearchTerm);

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: Move back to delivery date field
          setShowPriorityDropdown(false);
          setPrioritySearchTerm('');
          setHighlightedPriorityIndex(-1);
          setTimeout(() => {
            deliveryDateInputRef.current?.focus();
          }, 50);
        } else {
          // Tab: Move to next field (Source Type)
          if (highlightedPriorityIndex >= 0 && filteredPriorities[highlightedPriorityIndex]) {
            handlePrioritySelect(filteredPriorities[highlightedPriorityIndex].value);
          } else {
            setShowPriorityDropdown(false);
            setPrioritySearchTerm('');
            setHighlightedPriorityIndex(-1);
            setTimeout(() => {
              sourceTypeSelectRef.current?.focus();
              setShowSourceTypeDropdown(true);
            }, 50);
          }
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedPriorityIndex(prev =>
          prev < filteredPriorities.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedPriorityIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedPriorityIndex >= 0 && filteredPriorities[highlightedPriorityIndex]) {
          handlePrioritySelect(filteredPriorities[highlightedPriorityIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowPriorityDropdown(false);
        setPrioritySearchTerm('');
        setHighlightedPriorityIndex(-1);
        break;
    }
  };

  const handleSourceTypeKeyDown = (e: React.KeyboardEvent) => {
    const filteredSourceTypes = getFilteredSourceTypes(sourceTypeSearchTerm);

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: Move back to priority field
          setShowSourceTypeDropdown(false);
          setSourceTypeSearchTerm('');
          setHighlightedSourceTypeIndex(-1);
          setTimeout(() => {
            prioritySelectRef.current?.focus();
            setShowPriorityDropdown(true);
          }, 50);
        } else {
          // Tab: Move to next field (Department)
          if (highlightedSourceTypeIndex >= 0 && filteredSourceTypes[highlightedSourceTypeIndex]) {
            handleSourceTypeSelect(filteredSourceTypes[highlightedSourceTypeIndex].value);
          } else {
            setShowSourceTypeDropdown(false);
            setSourceTypeSearchTerm('');
            setHighlightedSourceTypeIndex(-1);
            setTimeout(() => {
              departmentSelectRef.current?.focus();
              setShowDepartmentDropdown(true);
            }, 50);
          }
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedSourceTypeIndex(prev =>
          prev < filteredSourceTypes.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedSourceTypeIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedSourceTypeIndex >= 0 && filteredSourceTypes[highlightedSourceTypeIndex]) {
          handleSourceTypeSelect(filteredSourceTypes[highlightedSourceTypeIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSourceTypeDropdown(false);
        setSourceTypeSearchTerm('');
        setHighlightedSourceTypeIndex(-1);
        break;
    }
  };

  const handleDepartmentKeyDown = (e: React.KeyboardEvent) => {
    const filteredDepartments = getFilteredDepartments(departmentSearchTerm);

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab: Move back to source type field
          setShowDepartmentDropdown(false);
          setDepartmentSearchTerm('');
          setHighlightedDepartmentIndex(-1);
          setTimeout(() => {
            sourceTypeSelectRef.current?.focus();
            setShowSourceTypeDropdown(true);
          }, 50);
        } else {
          // Tab: Move to first product field
          if (highlightedDepartmentIndex >= 0 && filteredDepartments[highlightedDepartmentIndex]) {
            handleDepartmentSelect(filteredDepartments[highlightedDepartmentIndex].value);
          } else {
            setShowDepartmentDropdown(false);
            setDepartmentSearchTerm('');
            setHighlightedDepartmentIndex(-1);
            setTimeout(() => {
              const firstProductInput = document.querySelector(`[data-row="0"][data-field="partNo"]`) as HTMLInputElement;
              if (firstProductInput) {
                firstProductInput.focus();
                // Also open the product dropdown for better UX
                setShowProductDropdowns({ ...showProductDropdowns, 0: true });
              }
            }, 50);
          }
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedDepartmentIndex(prev =>
          prev < filteredDepartments.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedDepartmentIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedDepartmentIndex >= 0 && filteredDepartments[highlightedDepartmentIndex]) {
          handleDepartmentSelect(filteredDepartments[highlightedDepartmentIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDepartmentDropdown(false);
        setDepartmentSearchTerm('');
        setHighlightedDepartmentIndex(-1);
        break;
    }
  };

  const handleUomKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    const searchTerm = uomSearchTerms[rowIndex] || '';
    const matchingUoms = getFilteredUomOptions(searchTerm);
    const currentHighlighted = highlightedUomIndex[rowIndex] ?? -1;

    // Ctrl+Delete or Command+Delete: Remove current row
    if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
      e.preventDefault();
      removeItem(rowIndex);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Tab: Move back to GST field
        setTimeout(() => {
          const prevInput = document.querySelector(`[data-row="${rowIndex}"][data-field="taxRate"]`) as HTMLInputElement;
          if (prevInput) prevInput.focus();
        }, 50);
        return;
      }

      // Tab: Move to next field (GNDP Price)
      setTimeout(() => {
        const nextInput = document.querySelector(`[data-row="${rowIndex}"][data-field="gndp"]`) as HTMLInputElement;
        if (nextInput) nextInput.focus();
      }, 50);

    } else if (e.key === 'Enter') {
      e.preventDefault();

      // Auto-select highlighted UOM or first match if there's a search term
      if (matchingUoms.length > 0) {
        const selectedUom = currentHighlighted >= 0 && currentHighlighted < matchingUoms.length
          ? matchingUoms[currentHighlighted]
          : matchingUoms[0];
        updateItem(rowIndex, 'uom', selectedUom.value);
        updateUomSearchTerm(rowIndex, '');
        setShowUomDropdowns({ ...showUomDropdowns, [rowIndex]: false });
        setHighlightedUomIndex({ ...highlightedUomIndex, [rowIndex]: -1 });

        // Move to next field (GNDP Price)
        setTimeout(() => {
          const nextInput = document.querySelector(`[data-row="${rowIndex}"][data-field="gndp"]`) as HTMLInputElement;
          if (nextInput) nextInput.focus();
        }, 100);
      }

    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showUomDropdowns[rowIndex] && matchingUoms.length > 0) {
        const newIndex = currentHighlighted < 0 ? 0 : Math.min(currentHighlighted + 1, matchingUoms.length - 1);
        setHighlightedUomIndex({ ...highlightedUomIndex, [rowIndex]: newIndex });
      }

    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showUomDropdowns[rowIndex] && matchingUoms.length > 0) {
        const newIndex = currentHighlighted < 0 ? 0 : Math.max(currentHighlighted - 1, 0);
        setHighlightedUomIndex({ ...highlightedUomIndex, [rowIndex]: newIndex });
      }

    } else if (e.key === 'Escape') {
      setShowUomDropdowns({ ...showUomDropdowns, [rowIndex]: false });
      updateUomSearchTerm(rowIndex, '');
      setHighlightedUomIndex({ ...highlightedUomIndex, [rowIndex]: -1 });
    }
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    const searchTerm = categorySearchTerms[rowIndex] || '';
    const matchingCategories = getFilteredCategories(searchTerm);
    const currentHighlighted = highlightedCategoryIndex[rowIndex] ?? -1;

    // Ctrl+Delete or Command+Delete: Remove current row
    if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
      e.preventDefault();
      removeItem(rowIndex);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Tab: Move to previous field (Product Name)
        setTimeout(() => {
          const prevInput = document.querySelector(`[data-row="${rowIndex}"][data-field="name"]`) as HTMLInputElement;
          if (prevInput) prevInput.focus();
        }, 50);
        return;
      }

      // Tab: Move to next field (HSN/SAC)
      setTimeout(() => {
        const nextInput = document.querySelector(`[data-row="${rowIndex}"][data-field="hsnNumber"]`) as HTMLInputElement;
        if (nextInput) nextInput.focus();
      }, 50);

    } else if (e.key === 'Enter') {
      e.preventDefault();

      // Auto-select highlighted category or first match if there's a search term
      if (matchingCategories.length > 0) {
        const selectedCategory = currentHighlighted >= 0 && currentHighlighted < matchingCategories.length
          ? matchingCategories[currentHighlighted]
          : matchingCategories[0];
        updateItem(rowIndex, 'category', selectedCategory.value);
        updateCategorySearchTerm(rowIndex, '');
        setShowCategoryDropdowns({ ...showCategoryDropdowns, [rowIndex]: false });
        setHighlightedCategoryIndex({ ...highlightedCategoryIndex, [rowIndex]: -1 });

        // Move to next field (HSN/SAC)
        setTimeout(() => {
          const nextInput = document.querySelector(`[data-row="${rowIndex}"][data-field="hsnNumber"]`) as HTMLInputElement;
          if (nextInput) nextInput.focus();
        }, 100);
      }

    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showCategoryDropdowns[rowIndex] && matchingCategories.length > 0) {
        const newIndex = currentHighlighted < 0 ? 0 : Math.min(currentHighlighted + 1, matchingCategories.length - 1);
        setHighlightedCategoryIndex({ ...highlightedCategoryIndex, [rowIndex]: newIndex });
      }

    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showCategoryDropdowns[rowIndex] && matchingCategories.length > 0) {
        const newIndex = currentHighlighted < 0 ? 0 : Math.max(currentHighlighted - 1, 0);
        setHighlightedCategoryIndex({ ...highlightedCategoryIndex, [rowIndex]: newIndex });
      }

    } else if (e.key === 'Escape') {
      setShowCategoryDropdowns({ ...showCategoryDropdowns, [rowIndex]: false });
      updateCategorySearchTerm(rowIndex, '');
      setHighlightedCategoryIndex({ ...highlightedCategoryIndex, [rowIndex]: -1 });
    }
  };

  const handleProductKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    const searchTerm = productSearchTerms[rowIndex] || '';
    const matchingProducts = getFilteredProducts(searchTerm);
    const currentHighlighted = highlightedProductIndex[rowIndex] ?? -1;

    // Ctrl+Delete or Command+Delete: Remove current row
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      removeItem(rowIndex);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Tab: Move to previous row's quantity field
        if (rowIndex > 0) {
          const prevQuantityInput = document.querySelector(`[data-row="${rowIndex - 1}"][data-field="quantity"]`) as HTMLInputElement;
          if (prevQuantityInput) {
            prevQuantityInput.focus();
            prevQuantityInput.select();
          }
        } else {
          setTimeout(() => {
            const departmentInput = document.querySelector('[data-field="department"]') as HTMLInputElement;
            if (departmentInput) {
              departmentInput.focus();
              setShowDepartmentDropdown(true);
            }
          }, 50);
        }
        // If first row, stay in same field (no previous row)
        return;
      }

      // Check if no products found and search term exists - auto-create new product
      if (matchingProducts.length === 0 && searchTerm.trim()) {
        // Auto-create new product with the search term
        handleCreateNewProductInline(rowIndex, searchTerm);
        return;
      }

      // Check if user has interacted (searched or navigated)
      const currentItem = formData.items[rowIndex];
      const hasUserInteracted = searchTerm.trim() || currentHighlighted >= 0;
      const isProductAlreadySelected = currentItem && currentItem.product && currentItem.product !== `temp-${Date.now()}`;

      if (hasUserInteracted && matchingProducts.length > 0) {
        // User has searched or navigated, update to new selection
        const selectedStockProduct = currentHighlighted >= 0 && currentHighlighted < matchingProducts.length
          ? matchingProducts[currentHighlighted]
          : matchingProducts[0]; // Select first product if no highlighted one
        updateItem(rowIndex, 'stockId', selectedStockProduct._id);
        updateProductSearchTerm(rowIndex, '');
        setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });
      } else if (isProductAlreadySelected) {
        // No interaction, keep already selected product
        setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });
      } else if (matchingProducts.length > 0) {
        // No product selected and no interaction, select first product
        const selectedStockProduct = matchingProducts[0];
        updateItem(rowIndex, 'stockId', selectedStockProduct._id);
        updateProductSearchTerm(rowIndex, '');
        setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });
      } else {
        // If no products found, just close dropdown and clear search
        setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });
      }

      // Move directly to quantity field
      setTimeout(() => {
        const quantityInput = document.querySelector(`[data-row="${rowIndex}"][data-field="quantity"]`) as HTMLInputElement;
        if (quantityInput) {
          quantityInput.focus();
          quantityInput.select();
        }
      }, 50);

    } else if (e.key === 'Enter') {
      e.preventDefault();

      // Check if no products found and search term exists - auto-create new product
      if (matchingProducts.length === 0 && searchTerm.trim()) {
        // Auto-create new product with the search term
        handleCreateNewProductInline(rowIndex, searchTerm);
        return;
      }

      // Check if user has interacted (searched or navigated)
      const currentItem = formData.items[rowIndex];
      const hasUserInteracted = searchTerm.trim() || currentHighlighted >= 0;
      const isProductAlreadySelected = currentItem && currentItem.product && currentItem.product !== `temp-${Date.now()}`;

      if (hasUserInteracted && matchingProducts.length > 0) {
        // User has searched or navigated, update to new selection
        const selectedStockProduct = currentHighlighted >= 0 && currentHighlighted < matchingProducts.length
          ? matchingProducts[currentHighlighted]
          : matchingProducts[0]; // Select first product if no highlighted one
        updateItem(rowIndex, 'stockId', selectedStockProduct._id);
        updateProductSearchTerm(rowIndex, '');
        setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });

        // Move directly to quantity field in same row
        setTimeout(() => {
          const quantityInput = document.querySelector(`[data-row="${rowIndex}"][data-field="quantity"]`) as HTMLInputElement;
          if (quantityInput) {
            quantityInput.focus();
            quantityInput.select();
          }
        }, 100);
      } else if (isProductAlreadySelected) {
        // No interaction, keep already selected product
        setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });

        // Move directly to quantity field in same row
        setTimeout(() => {
          const quantityInput = document.querySelector(`[data-row="${rowIndex}"][data-field="quantity"]`) as HTMLInputElement;
          if (quantityInput) {
            quantityInput.focus();
            quantityInput.select();
          }
        }, 100);
      } else if (matchingProducts.length > 0) {
        // No product selected and no interaction, select first product
        const selectedStockProduct = matchingProducts[0];
        updateItem(rowIndex, 'stockId', selectedStockProduct._id);
        updateProductSearchTerm(rowIndex, '');
        setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });

        // Move directly to quantity field in same row
        setTimeout(() => {
          const quantityInput = document.querySelector(`[data-row="${rowIndex}"][data-field="quantity"]`) as HTMLInputElement;
          if (quantityInput) {
            quantityInput.focus();
            quantityInput.select();
          }
        }, 100);
      } else {
        // If no products found, just close dropdown and clear search
        setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });

        // If no search term, move to Notes field
        if (!searchTerm.trim()) {
          setTimeout(() => {
            const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
            if (notesInput) notesInput.focus();
          }, 100);
        }
      }

    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (showProductDropdowns[rowIndex] && matchingProducts.length > 0) {
        const newIndex = currentHighlighted < 0 ? 0 : Math.min(currentHighlighted + 1, matchingProducts.length - 1);
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: newIndex });

        // Scroll to highlighted item
        setTimeout(() => {
          const highlightedElement = document.querySelector(`[data-dropdown="${rowIndex}"] [data-product-index="${newIndex}"]`);
          if (highlightedElement) {
            highlightedElement.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
            });
          }
        }, 10);
      }

    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (showProductDropdowns[rowIndex] && matchingProducts.length > 0) {
        const newIndex = currentHighlighted < 0 ? 0 : Math.max(currentHighlighted - 1, 0);
        setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: newIndex });

        // Scroll to highlighted item
        setTimeout(() => {
          const highlightedElement = document.querySelector(`[data-dropdown="${rowIndex}"] [data-product-index="${newIndex}"]`);
          if (highlightedElement) {
            highlightedElement.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
            });
          }
        }, 10);
      }

    } else if (e.key === 'Escape') {
      setShowProductDropdowns({ ...showProductDropdowns, [rowIndex]: false });
      updateProductSearchTerm(rowIndex, '');
      setHighlightedProductIndex({ ...highlightedProductIndex, [rowIndex]: -1 });
    }
  };

  // Quantity field keyboard navigation with arrow key increment/decrement
  const handleQuantityKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    const currentItem = formData.items?.[rowIndex];
    const currentQuantity = currentItem?.quantity || 1;

    // Ctrl+Delete or Command+Delete: Remove current row
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
      e.preventDefault();
      removeItem(rowIndex);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      let newQuantity = currentQuantity + 1;
      updateItem(rowIndex, 'quantity', newQuantity);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      let newQuantity = Math.max(1, currentQuantity - 1); // Minimum quantity is 1
      updateItem(rowIndex, 'quantity', newQuantity);
    } else if (e.key === 'Tab') {
      e.preventDefault();

      if (e.shiftKey) {
        // Shift+Tab: Move back based on whether it's a new product or existing product
        const currentItem = formData.items[rowIndex];
        const isNewProduct = currentItem?.isNewProduct;

        if (isNewProduct) {
          // For new products: Quantity → GNDP Price
          setTimeout(() => {
            const gndpInput = document.querySelector(`[data-row="${rowIndex}"][data-field="gndp"]`) as HTMLInputElement;
            if (gndpInput) {
              gndpInput.focus();
              gndpInput.select();
            }
          }, 50);
        } else {
          // For existing products: Quantity → Part No
          setTimeout(() => {
            const partNoInput = document.querySelector(`[data-row="${rowIndex}"][data-field="partNo"]`) as HTMLInputElement;
            if (partNoInput) {
              partNoInput.focus();
              partNoInput.select();
            }
          }, 50);
        }
        return;
      }

      // 🚀 AUTO-ROW FEATURE: Add new row when Tab is pressed on last row's quantity field
      if (rowIndex === formData.items.length - 1) {
        addItem();
      }

      // Tab: Move to next row's product field
      const nextRowIndex = rowIndex + 1;
      setTimeout(() => {
        const nextInput = document.querySelector(`[data-row="${nextRowIndex}"][data-field="partNo"]`) as HTMLInputElement;
        if (nextInput) nextInput.focus();
      }, 100);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Move to Notes field when Enter is pressed
      setTimeout(() => {
        const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
        if (notesInput) notesInput.focus();
      }, 100);
    }
  };

  // Enhanced cell navigation for Excel-like behavior
  const handleCellKeyDown = (e: React.KeyboardEvent, rowIndex: number, field: string) => {
    const currentItem = formData.items[rowIndex];
    const isNewProduct = currentItem?.isNewProduct;

    // Define fields based on whether it's a new product or existing product
    const fields = isNewProduct
      ? ['partNo', 'name', 'category', 'hsnNumber', 'taxRate', 'uom', 'gndp', 'quantity']
      : ['partNo', 'quantity']; // For existing products, only Part No and Quantity are editable

    const currentFieldIndex = fields.indexOf(field);
    console.log("currentFieldIndex:", currentFieldIndex, rowIndex, field);

    // Ctrl+Delete or Command+Delete: Remove current row
    if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
      e.preventDefault();
      removeItem(rowIndex);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();


      if (e.shiftKey) {
        // Shift+Tab: Move to previous field
        let prevFieldIndex = currentFieldIndex - 1;
        let targetRow = rowIndex;

        console.log("prevFieldIndex", prevFieldIndex, currentFieldIndex, rowIndex);


        if (prevFieldIndex < 0) {
          // Move to last field of previous row
          if (rowIndex > 0) {
            prevFieldIndex = fields.length - 1;
            targetRow = rowIndex - 1;
          } else {
            // If at first row, first field, move to department field
            setTimeout(() => {
              const departmentInput = document.querySelector('[data-field="department"]') as HTMLInputElement;
              if (departmentInput) {
                departmentInput.focus();
                setShowDepartmentDropdown(true);
              }
            }, 50);
            return;
          }
        }

        const prevField = fields[prevFieldIndex];
        setTimeout(() => {
          const prevInput = document.querySelector(`[data-row="${targetRow}"][data-field="${prevField}"]`) as HTMLInputElement;
          if (prevInput) prevInput.focus();
        }, 50);
      } else {
        // Tab: Move to next field
        let nextFieldIndex = currentFieldIndex + 1;
        let targetRow = rowIndex;

        if (nextFieldIndex >= fields.length) {
          // Move to first field of next row, or to Notes if last row
          if (targetRow === formData.items.length - 1) {
            // Last row, last field - move to Notes
            setTimeout(() => {
              const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
              if (notesInput) notesInput.focus();
            }, 50);
            return;
          } else {
            nextFieldIndex = 0;
            targetRow = rowIndex + 1;
          }
        }

        const nextField = fields[nextFieldIndex];
        setTimeout(() => {
          const nextInput = document.querySelector(`[data-row="${targetRow}"][data-field="${nextField}"]`) as HTMLInputElement;
          if (nextInput) nextInput.focus();
        }, 50);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      // Enter: Always move to Notes field
      setTimeout(() => {
        const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
        if (notesInput) notesInput.focus();
      }, 100);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        const prevInput = document.querySelector(`[data-row="${rowIndex - 1}"][data-field="${field}"]`) as HTMLInputElement;
        if (prevInput) prevInput.focus();
      } else {
        // If at first row, move to corresponding header field
        if (field === 'product') {
          const departmentInput = document.querySelector('[data-field="department"]') as HTMLSelectElement;
          if (departmentInput) departmentInput.focus();
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIndex < formData.items.length - 1) {
        const nextRowIndex = rowIndex + 1;
        setTimeout(() => {
          const nextInput = document.querySelector(`[data-row="${nextRowIndex}"][data-field="${field}"]`) as HTMLInputElement;
          if (nextInput) nextInput.focus();
        }, 100);
      } else {
        // If at last row, move to Notes
        setTimeout(() => {
          const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
          if (notesInput) notesInput.focus();
        }, 100);
      }
    }
  };

  const handleCreateNewProductInline = (index: number, searchTerm: string) => {
    console.log("Creating new product with searchTerm:", searchTerm);

    // Create a new product item inline in the row
    updateItem(index, 'isNewProduct', true);
    updateItem(index, 'partNo', searchTerm);
    updateItem(index, 'category', 'spare_part'); // Default category
    updateItem(index, 'uom', 'nos'); // Default UOM
    updateItem(index, 'name', ''); // Default UOM
    updateItem(index, 'product', `temp-${Date.now()}`); // Temporary ID
    updateItem(index, 'gndp', 0); // Reset GNDP price
    updateItem(index, 'taxRate', 0); // Reset tax rate
    updateItem(index, 'quantity', 1); // Reset quantity

    // Close the product dropdown
    setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
    updateProductSearchTerm(index, '');

    // Focus on the Product Name field after a short delay
    setTimeout(() => {
      const productNameInput = document.querySelector(`[data-row="${index}"][data-field="name"]`) as HTMLInputElement;
      if (productNameInput) {
        productNameInput.focus();
        productNameInput.select();
      }
    }, 100);

    toast.success('New product added to row! Fill in required fields and submit PO to create it.', { duration: 4000 });
  };

  if (loading) {
    return (
      <div className="pl-2 pr-6 py-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      <PageHeader
        title={isEditMode ? `Edit Purchase Invoice - ${editingPO?.poNumber || ''}` : "Create Purchase Invoice"}
        subtitle={isEditMode ? "Edit existing purchase invoice" : "Create a new purchase invoice with Excel-like navigation"}
      >
        <div className="flex space-x-3">
          <button
            onClick={() => navigate('/billing')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Billing</span>
          </button>
        </div>
      </PageHeader>

      {/* 🚀 EXCEL-LIKE NAVIGATION GUIDE */}
      {/* <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                    <span className="text-lg">⚡</span>
                    <h3 className="text-sm font-semibold text-blue-900 ml-2">Excel-Like Navigation Enabled!</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-800">
                    <div>
                        <p className="font-medium mb-1">🎯 Complete Form Navigation:</p>
                        <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Tab/Enter</kbd> Move forward</p>
                        <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">↑↓</kbd> Navigate dropdowns</p>
                    </div>
                    <div>
                        <p className="font-medium mb-1">🔥 Super Fast Flow:</p>
                        <p><strong>Auto-start:</strong> Page loads → Supplier dropdown opens → Select → Auto-focus Address</p>
                        <p><strong>Address:</strong> Select supplier → Auto-focus → Search/Select address → Auto-focus Date</p>
                    </div>
                </div>
            </div> */}

      {/* Form Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          {/* Form Errors */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm font-medium mb-2">Please fix the following errors:</p>
              <ul className="text-red-600 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Supplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Supplier *
              </label>
              <div className="relative dropdown-container">
                <div className="relative">
                  <input
                    ref={supplierInputRef}
                    type="text"
                    value={supplierSearchTerm || getSupplierName(formData.supplier)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSupplierSearchTerm(value);
                      if (!value) { // If input is cleared, clear the supplier selection
                        setFormData(prev => ({
                          ...prev,
                          supplier: '',
                          supplierEmail: '',
                          supplierAddress: undefined
                        }));
                      }
                      if (!showSupplierDropdown) setShowSupplierDropdown(true);
                      setHighlightedSupplierIndex(-1);
                    }}
                    onFocus={() => {
                      setShowSupplierDropdown(true);
                      setHighlightedSupplierIndex(-1);
                      // Don't clear search term in edit mode
                      if (!supplierSearchTerm && formData.supplier && !isEditMode) {
                        setSupplierSearchTerm('');
                      }
                    }}
                    onKeyDown={handleSupplierKeyDown}
                    placeholder="Search supplier or press ↓ to open"
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    data-field="supplier"
                    autoComplete="off"
                  />
                  {formData.supplier && !supplierSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          supplier: '',
                          supplierEmail: '',
                          supplierAddress: undefined
                        }));
                        setSupplierSearchTerm('');
                      }}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSupplierDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showSupplierDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                    </div>
                    {suppliers
                      .filter(supplier =>
                        supplier.type === 'supplier' && (
                          supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                          supplier.email?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
                        )
                      )
                      .map((supplier, index) => (
                        <button
                          key={supplier._id}
                          onClick={() => handleSupplierSelect(supplier._id)}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.supplier === supplier._id ? 'bg-blue-100 text-blue-800' :
                            highlightedSupplierIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <div className="font-medium text-gray-900">{supplier.name}</div>
                          {supplier.email && (
                            <div className="text-xs text-gray-500">{supplier.email}</div>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>


            {/* Supplier Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier Address *
              </label>
              <div className="relative dropdown-container">
                <div className="relative">
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={addressSearchTerm || (formData.supplier ? (formData.supplierAddress ? `${formData.supplierAddress.address}, ${formData.supplierAddress.district}, ${formData.supplierAddress.state} - ${formData.supplierAddress.pincode}` : '') : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setAddressSearchTerm(value);
                      if (!value) { // If input is cleared, clear the address selection
                        setFormData(prev => ({
                          ...prev,
                          supplierAddress: undefined
                        }));
                      }
                      if (!showAddressDropdown) setShowAddressDropdown(true);
                      setHighlightedAddressIndex(-1);
                    }}
                    onFocus={() => {
                      if (!formData.supplier) {
                        toast.error('Please select a supplier first');
                        return;
                      }
                      setShowAddressDropdown(true);
                      setHighlightedAddressIndex(-1);
                      // Don't clear search term in edit mode
                      if (!addressSearchTerm && formData.supplierAddress && !isEditMode) {
                        setAddressSearchTerm('');
                      }
                    }}
                    onKeyDown={handleAddressKeyDown}
                    disabled={!formData.supplier}
                    placeholder={!formData.supplier ? 'Select supplier first' : 'Search address or press ↓ to open'}
                    className={`w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${!formData.supplier ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'
                      }`}
                    data-field="address"
                    autoComplete="off"
                  />
                  {formData.supplierAddress && !addressSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          supplierAddress: undefined
                        }));
                        setAddressSearchTerm('');
                      }}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAddressDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showAddressDropdown && formData.supplier && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                    </div>
                    {addresses.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No addresses found for this supplier
                      </div>
                    ) : (
                      addresses
                        .filter(address =>
                          address.address.toLowerCase().includes(addressSearchTerm.toLowerCase()) ||
                          address.district.toLowerCase().includes(addressSearchTerm.toLowerCase()) ||
                          address.state.toLowerCase().includes(addressSearchTerm.toLowerCase())
                        )
                        .map((address, index) => (
                          <button
                            key={address.id || index}
                            onClick={() => handleAddressSelect(address.id || '')}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.supplierAddress?.id === address.id ? 'bg-blue-100 text-blue-800' :
                              highlightedAddressIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <div className="font-medium text-gray-900">{address.address}</div>
                            <div className="text-xs text-gray-500">
                              {address.district}, {address.state} - {address.pincode}
                              {address.isPrimary && (
                                <span className="ml-2 bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">
                                  Primary
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* To Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Address *
              </label>
              <div className="relative dropdown-container">
                <div className="relative">
                  <input
                    ref={locationInputRef}
                    type="text"
                    value={locationSearchTerm || getLocationLabel(formData.location || '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocationSearchTerm(value);
                      if (!value) { // If input is cleared, clear the location selection
                        setFormData(prev => ({
                          ...prev,
                          location: ''
                        }));
                      }
                      if (!showLocationDropdown) setShowLocationDropdown(true);
                      setHighlightedLocationIndex(-1);
                    }}
                    onFocus={() => {
                      setShowLocationDropdown(true);
                      setHighlightedLocationIndex(-1);
                      if (!locationSearchTerm && formData.location) {
                        setLocationSearchTerm('');
                      }
                    }}
                    autoComplete="off"
                    onKeyDown={handleLocationKeyDown}
                    placeholder="Search location or press ↓ to open"
                    data-field="location"
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  {formData.location && !locationSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          location: ''
                        }));
                        setLocationSearchTerm('');
                      }}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showLocationDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                    </div>

                    <button
                      onClick={() => {
                        setFormData({ ...formData, location: '' });
                        setShowLocationDropdown(false);
                        setLocationSearchTerm('');
                        setStockProducts([]);
                        setSelectedLocationId('');
                      }}
                      className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.location ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                    >
                      Select location
                    </button>

                    {locations.filter(location =>
                      location.name.toLowerCase().includes(locationSearchTerm.toLowerCase())
                    ).map((location, index) => (
                      <button
                        key={location._id}
                        data-location-index={index}
                        onClick={() => handleLocationSelect(location._id)}
                        className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.location === location._id ? 'bg-blue-100 text-blue-800' :
                          highlightedLocationIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                            'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <div>
                          <div className="font-medium">{location.name}</div>
                          <div className="text-xs text-gray-500 capitalize">{location.type.replace('_', ' ')}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>


            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <div className="relative dropdown-container">
                <div className="relative">
                  <input
                    ref={departmentSelectRef}
                    type="text"
                    value={departmentSearchTerm || getDepartmentLabel(formData.department || '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDepartmentSearchTerm(value);
                      if (!value) { // If input is cleared, clear the department selection
                        setFormData(prev => ({
                          ...prev,
                          department: 'retail' // Reset to default
                        }));
                      }
                      if (!showDepartmentDropdown) setShowDepartmentDropdown(true);
                      setHighlightedDepartmentIndex(-1);
                    }}
                    onFocus={() => {
                      setShowDepartmentDropdown(true);
                      setHighlightedDepartmentIndex(-1);
                      if (!departmentSearchTerm && formData.department) {
                        setDepartmentSearchTerm('');
                      }
                    }}
                    onKeyDown={handleDepartmentKeyDown}
                    placeholder="Search department or press ↓ to open"
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    data-field="department"
                    autoComplete="off"
                  />
                  {formData.department && formData.department !== 'retail' && !departmentSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          department: 'retail' // Reset to default
                        }));
                        setDepartmentSearchTerm('');
                      }}
                      className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDepartmentDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showDepartmentDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                    </div>
                    {getFilteredDepartments(departmentSearchTerm).map((option, index) => (
                      <button
                        key={option.value}
                        onClick={() => handleDepartmentSelect(option.value)}
                        className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.department === option.value ? 'bg-blue-100 text-blue-800' :
                          highlightedDepartmentIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                            'text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <div className="font-medium text-gray-900">{option.label}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>


            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Number *
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      // Shift+Tab: Move back to supplier field
                      setTimeout(() => {
                        supplierInputRef.current?.focus();
                        setShowSupplierDropdown(true);
                      }, 50);
                    } else {
                      // Tab: Move to supplier address field
                      setTimeout(() => {
                        addressInputRef.current?.focus();
                        setShowAddressDropdown(true);
                      }, 50);
                    }
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => {
                      addressInputRef.current?.focus();
                      setShowAddressDropdown(true);
                    }, 50);
                  }
                }}
                placeholder="Enter invoice number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                data-field="invoice-number"
                autoComplete="off"
                required
              />
            </div>

            {/* Invoice Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-field="invoice-date"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Due Date *
              </label>
              <input
                ref={deliveryDateInputRef}
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    if (e.shiftKey) {
                      // Shift+Tab: Move back to invoice date field
                      setTimeout(() => {
                        const invoiceDateInput = document.querySelector('[data-field="invoice-date"]') as HTMLInputElement;
                        if (invoiceDateInput) invoiceDateInput.focus();
                      }, 50);
                    } else {
                      // Tab: Move to department field
                      setTimeout(() => {
                        departmentSelectRef.current?.focus();
                        setShowDepartmentDropdown(true);
                      }, 50);
                    }
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    setTimeout(() => {
                      departmentSelectRef.current?.focus();
                      setShowDepartmentDropdown(true);
                    }, 50);
                  }
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-field="delivery-date"
              />
            </div>





          </div>


          {/* Excel-Style Items Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Purchase Invoice Items</h3>
              <button
                onClick={addItem}
                type="button"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Row</span>
              </button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block border border-gray-300 rounded-lg bg-white shadow-sm overflow-x-auto">
              {/* Table Header */}
              <div className="bg-gray-100 border-b border-gray-300 min-w-[1200px]">
                <div className="grid text-xs font-bold text-gray-800 uppercase tracking-wide"
                  style={{ gridTemplateColumns: '60px 150px 1fr 100px 90px 100px 80px 120px 90px 100px 40px' }}>
                  <div className="p-3 border-r border-gray-300 text-center bg-gray-200">S.No</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">Part No</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">Product Name</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">Category</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">HSN/SAC</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">GST(%)</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">UOM</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">GNDP Price</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">Quantity</div>
                  <div className="p-3 border-r border-gray-300 bg-gray-200">Total</div>
                  <div className="p-3 text-center bg-gray-200 font-medium"></div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200 min-w-[1200px] mb-60 border-b border-gray-200 rounded-lg">
                {(formData.items || []).map((item, index) => (
                  <div key={index} className={`grid group hover:bg-blue-50 transition-colors ${item.isNewProduct ? 'bg-green-50 border-l-green-500' :
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                    style={{ gridTemplateColumns: '60px 150px 1fr 100px 90px 100px 80px 120px 90px 100px 40px' }}>

                    {/* S.No */}
                    <div className="p-2 border-r border-gray-200 text-center text-sm font-medium text-gray-600 flex items-center justify-center">
                      {item.isNewProduct ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-green-600 font-bold">NEW {`${index + 1}`}</span>
                        </div>
                      ) : (
                        index + 1
                      )}
                    </div>

                    {/* Part No */}
                    <div className="p-1 border-r border-gray-200 relative">
                      {item.isNewProduct ? (
                        <input
                          type="text"
                          value={item.partNo || ''}
                          onChange={(e) => updateItem(index, 'partNo', e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'partNo')}
                          data-row={index}
                          data-field="partNo"
                          className="w-full p-2 border border-green-300 bg-green-50 text-sm focus:outline-none focus:bg-green-100 focus:ring-1 focus:ring-green-500 rounded"
                          placeholder="Part No *"
                          autoComplete="off"
                          required
                        />
                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            value={productSearchTerms[index] || getProductPartNo(item.product)}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateProductSearchTerm(index, value);
                              if (!value) { // If input is cleared, clear the product selection
                                updateItem(index, 'product', '');
                                updateItem(index, 'name', '');
                                updateItem(index, 'partNo', '');
                                updateItem(index, 'gndp', 0);
                                updateItem(index, 'taxRate', 0);
                                updateItem(index, 'totalPrice', 0);
                                updateItem(index, 'hsnNumber', '');
                                updateItem(index, 'uom', 'nos');
                                updateItem(index, 'description', '');
                              }
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
                              if (!productSearchTerms[index] && !item.product) {
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
                            data-field="partNo"
                            className="w-full p-2 pr-8 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-blue-50"
                            placeholder="Type to search..."
                            autoComplete="off"
                          />
                          {item.product && !productSearchTerms[index] && (
                            <button
                              type="button"
                              onClick={() => {
                                updateItem(index, 'product', '');
                                updateItem(index, 'name', '');
                                updateItem(index, 'partNo', '');
                                updateItem(index, 'gndp', 0);
                                updateItem(index, 'taxRate', 0);
                                updateItem(index, 'totalPrice', 0);
                                updateItem(index, 'hsnNumber', '');
                                updateItem(index, 'uom', 'nos');
                                updateItem(index, 'description', '');
                                updateProductSearchTerm(index, '');
                              }}
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                      {showProductDropdowns[index] && !item.isNewProduct && (
                        <div
                          className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-[400px] overflow-hidden"
                          data-dropdown={index}
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
                                <div>No products found</div>
                                <div className="text-xs mt-1">
                                  {!selectedLocationId ? 'Please select a location first' : 'Try different search terms'}
                                </div>
                                {selectedLocationId && (
                                  <button
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleCreateNewProductInline(index, productSearchTerms[index] || '');
                                    }}
                                    className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                                  >
                                    + Create New Product
                                  </button>
                                )}
                              </div>
                            ) : (
                              getFilteredProducts(productSearchTerms[index] || '').map((stockProduct, productIndex) => (
                                <button
                                  key={`${stockProduct.product._id}-${stockProduct._id}`}
                                  data-product-index={productIndex}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    updateItem(index, 'stockId', stockProduct._id);
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
                                  className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${item.stockId === stockProduct._id ? 'bg-blue-100 text-blue-800' :
                                    highlightedProductIndex[index] === productIndex ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                      'text-gray-700'
                                    } ${productIndex === 0 && productSearchTerms[index] && highlightedProductIndex[index] === -1 ? 'bg-yellow-50 border-l-4 border-l-blue-500' : ''}`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1 min-w-0 pr-4">
                                      <div className="font-medium text-gray-900 mb-1 flex items-center">
                                        <div><span className="font-medium">Part No:</span>{stockProduct.product?.partNo}</div>
                                        {highlightedProductIndex[index] === productIndex && (
                                          <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">
                                            Selected - Press Enter
                                          </span>
                                        )}
                                        {productIndex === 0 && productSearchTerms[index] && highlightedProductIndex[index] === -1 && (
                                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                            Best match
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-600 space-y-0.5">
                                        <div><span className="font-medium">Product Name:</span> {stockProduct.product?.name || 'N/A'}</div>
                                        {/* <div><span className="font-medium">Category:</span> {stockProduct.product?.category || 'N/A'}</div> */}
                                        <div className="text-blue-600 font-medium">
                                          📍 {stockProduct.stockLocation.location} → {stockProduct.stockLocation.room} → {stockProduct.stockLocation.rack}
                                        </div>
                                        <div className="text-green-600 font-medium">
                                          📦 Available: {stockProduct.availableQuantity} units
                                        </div>
                                        {/* <div className="text-purple-600 font-medium text-xs">
                                          🏷️ Stock ID: {stockProduct._id.slice(-8)}
                                        </div> */}
                                      </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                      <div className="font-bold text-lg text-green-600">₹{stockProduct.product?.gndp?.toLocaleString() || stockProduct.product?.price?.toLocaleString() || 0}</div>
                                      <div className="text-xs text-gray-500 mt-0.5">GNDP</div>
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>

                          <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Tab/Enter</kbd> Select •
                            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Tab/Enter</kbd> No Results = Create New •
                            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Shift+Tab</kbd> Previous •
                            <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product Name */}
                    <div className="p-1 border-r border-gray-200 relative">
                      <input
                        type="text"
                        value={item.isNewProduct ? (item.name || '') : (item.product ? getProductName(item.product) : '')}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, index, 'name')}
                        data-row={index}
                        data-field="name"
                        className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${item.isNewProduct
                          ? 'bg-green-50 focus:bg-green-100 focus:ring-green-500 border border-green-300 rounded'
                          : 'focus:bg-blue-50'
                          }`}
                        placeholder={item.isNewProduct ? "Product Name *" : "Product Name"}
                        disabled={!!(item.product && !item.isNewProduct)}
                        required={item.isNewProduct}
                      />
                      {item.stockLocation && (
                        <div className="absolute top-0 right-0 flex flex-col gap-1">
                          <div className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded text-center font-medium">
                            📍 {item.stockLocation.room} → {item.stockLocation.rack}
                          </div>
                          {/* {(() => {
                            // Find the stock product to get available quantity
                            const stockProduct = stockProducts.find(sp => sp._id === item.stockId);
                            if (stockProduct) {
                              return (
                                <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded text-center font-medium">
                                  📦 {stockProduct.availableQuantity} units
                                </div>
                              );
                            }
                            return null;
                          })()} */}
                        </div>
                      )}
                    </div>



                    {/* Category */}
                    <div className="p-1 border-r border-gray-200 relative">
                      {item.isNewProduct ? (
                        <>
                          <div className="relative">
                            <input
                              type="text"
                              value={categorySearchTerms[index] || getCategoryLabel(item.category || 'spare_part')}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateCategorySearchTerm(index, value);
                                if (!value) { // If input is cleared, clear the category selection
                                  updateItem(index, 'category', 'spare_part'); // Reset to default
                                }
                                setShowCategoryDropdowns({
                                  ...showCategoryDropdowns,
                                  [index]: true
                                });
                                setHighlightedCategoryIndex({
                                  ...highlightedCategoryIndex,
                                  [index]: -1
                                });
                              }}
                              onFocus={() => {
                                setShowCategoryDropdowns({
                                  ...showCategoryDropdowns,
                                  [index]: true
                                });
                                setHighlightedCategoryIndex({
                                  ...highlightedCategoryIndex,
                                  [index]: -1
                                });
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setShowCategoryDropdowns({
                                    ...showCategoryDropdowns,
                                    [index]: false
                                  });
                                }, 200);
                              }}
                              onKeyDown={(e) => handleCategoryKeyDown(e, index)}
                              data-row={index}
                              data-field="category"
                              className="w-full p-2 pr-8 border border-green-300 bg-green-50 text-sm focus:outline-none focus:bg-green-100 focus:ring-1 focus:ring-green-500 rounded"
                              placeholder="Search category..."
                              autoComplete="off"
                              required
                            />
                            {item.category && item.category !== 'spare_part' && !categorySearchTerms[index] && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateItem(index, 'category', 'spare_part'); // Reset to default
                                  updateCategorySearchTerm(index, '');
                                }}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {showCategoryDropdowns[index] && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">

                              {getFilteredCategories(categorySearchTerms[index] || '').map((option, optionIndex) => (
                                <button
                                  key={option.value}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    updateItem(index, 'category', option.value);
                                    setShowCategoryDropdowns({ ...showCategoryDropdowns, [index]: false });
                                    updateCategorySearchTerm(index, '');
                                    setHighlightedCategoryIndex({ ...highlightedCategoryIndex, [index]: -1 });
                                    setTimeout(() => {
                                      const nextInput = document.querySelector(`[data-row="${index}"][data-field="hsnNumber"]`) as HTMLInputElement;
                                      if (nextInput) nextInput.focus();
                                    }, 50);
                                  }}
                                  className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${item.category === option.value ? 'bg-blue-100 text-blue-800' :
                                    highlightedCategoryIndex[index] === optionIndex ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                      'text-gray-700'
                                    }`}
                                >
                                  <div className="font-medium text-gray-900">{option.label}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <input
                          type="text"
                          value={item.product ? (products.find(p => p._id === item.product)?.category || '') : ''}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'category')}
                          data-row={index}
                          data-field="category"
                          placeholder="Category"
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          disabled
                        />
                      )}
                    </div>



                    {/* HSN/SAC */}
                    <div className="p-1 border-r border-gray-200">
                      <input
                        type="text" // not "number", to control input better
                        inputMode="numeric" // shows numeric keyboard on mobile
                        pattern="\d{8}" // optional: HTML5 pattern
                        maxLength={8} // hard limit to 8 digits
                        value={item.hsnNumber || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d{0,8}$/.test(val)) {
                            updateItem(index, 'hsnNumber', val);
                          }
                        }}
                        onKeyDown={(e) => handleCellKeyDown(e, index, 'hsnNumber')}
                        data-row={index}
                        data-field="hsnNumber"
                        className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${item.isNewProduct
                          ? 'bg-green-50 focus:bg-green-100 focus:ring-green-500 border border-green-300 rounded'
                          : 'focus:bg-blue-50'
                          }`}
                        placeholder={item.isNewProduct ? "HSN/SAC *" : "HSN/SAC"}
                        disabled={!!(item.product && !item.isNewProduct)}
                        required={item.isNewProduct}
                      />

                    </div>

                    {/* GST */}
                    <div className="p-1 border-r border-gray-200">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.taxRate || ''}
                        onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => handleCellKeyDown(e, index, 'taxRate')}
                        data-row={index}
                        data-field="taxRate"
                        className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right ${item.isNewProduct
                          ? 'bg-green-50 focus:bg-green-100 focus:ring-green-500 border border-green-300 rounded'
                          : 'focus:bg-blue-50'
                          }`}
                        placeholder={item.isNewProduct ? "GST % *" : "0.00"}
                        disabled={!!(item.product && !item.isNewProduct)}
                        required={item.isNewProduct}
                      />
                    </div>

                    {/* UOM */}
                    <div className="p-1 border-r border-gray-200 relative">
                      {item.isNewProduct ? (
                        <>
                          <div className="relative">
                            <input
                              type="text"
                              value={uomSearchTerms[index] || getUomLabel(item.uom || 'nos')}
                              onChange={(e) => {
                                const value = e.target.value;
                                updateUomSearchTerm(index, value);
                                if (!value) { // If input is cleared, clear the UOM selection
                                  updateItem(index, 'uom', 'nos'); // Reset to default
                                }
                                setShowUomDropdowns({
                                  ...showUomDropdowns,
                                  [index]: true
                                });
                                setHighlightedUomIndex({
                                  ...highlightedUomIndex,
                                  [index]: -1
                                });
                              }}
                              onFocus={() => {
                                setShowUomDropdowns({
                                  ...showUomDropdowns,
                                  [index]: true
                                });
                                setHighlightedUomIndex({
                                  ...highlightedUomIndex,
                                  [index]: -1
                                });
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  setShowUomDropdowns({
                                    ...showUomDropdowns,
                                    [index]: false
                                  });
                                }, 200);
                              }}
                              onKeyDown={(e) => handleUomKeyDown(e, index)}
                              data-row={index}
                              data-field="uom"
                              className="w-full p-2 pr-8 border border-green-300 bg-green-50 text-sm focus:outline-none focus:bg-green-100 focus:ring-1 focus:ring-green-500 rounded"
                              placeholder="Search UOM..."
                              autoComplete="off"
                              required
                            />
                            {item.uom && item.uom !== 'nos' && !uomSearchTerms[index] && (
                              <button
                                type="button"
                                onClick={() => {
                                  updateItem(index, 'uom', 'nos'); // Reset to default
                                  updateUomSearchTerm(index, '');
                                }}
                                className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                          {showUomDropdowns[index] && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">

                              {getFilteredUomOptions(uomSearchTerms[index] || '').map((option, optionIndex) => (
                                <button
                                  key={option.value}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    updateItem(index, 'uom', option.value);
                                    setShowUomDropdowns({ ...showUomDropdowns, [index]: false });
                                    updateUomSearchTerm(index, '');
                                    setHighlightedUomIndex({ ...highlightedUomIndex, [index]: -1 });
                                    setTimeout(() => {
                                      const nextInput = document.querySelector(`[data-row="${index}"][data-field="gndp"]`) as HTMLInputElement;
                                      if (nextInput) nextInput.focus();
                                    }, 50);
                                  }}
                                  className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${item.uom === option.value ? 'bg-blue-100 text-blue-800' :
                                    highlightedUomIndex[index] === optionIndex ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                      'text-gray-700'
                                    }`}
                                >
                                  <div className="font-medium text-gray-900">{option.label}</div>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <input
                          type="text"
                          value={item.uom || 'nos'}
                          onKeyDown={(e) => handleCellKeyDown(e, index, 'uom')}
                          data-row={index}
                          data-field="uom"
                          className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          disabled
                        />
                      )}
                    </div>

                    {/* GNDP Price */}
                    <div className="p-1 border-r border-gray-200">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.gndp || ''}
                        onChange={(e) => updateItem(index, 'gndp', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => handleCellKeyDown(e, index, 'gndp')}
                        data-row={index}
                        data-field="gndp"
                        className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right ${item.isNewProduct
                          ? 'bg-green-50 focus:bg-green-100 focus:ring-green-500 border border-green-300 rounded'
                          : 'focus:bg-blue-50'
                          }`}
                        placeholder={item.isNewProduct ? "GNDP Price *" : "0.00"}
                        disabled={!!(item.product && !item.isNewProduct)}
                        required={item.isNewProduct}
                      />
                    </div>


                    {/* Quantity */}
                    <div className="p-1 border-r border-gray-200 relative">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={item.quantity || ''}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => handleQuantityKeyDown(e, index)}
                        data-row={index}
                        data-field="quantity"
                        className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right ${item.isNewProduct
                          ? 'bg-green-50 focus:bg-green-100 focus:ring-green-500'
                          : 'focus:bg-blue-50'
                          }`}
                        placeholder="0"
                      />
                    </div>

                    {/* Total */}
                    <div className="p-1 border-r border-gray-200">
                      <div className="p-2 text-sm text-right font-bold text-blue-600">
                        ₹{item.totalPrice?.toFixed(2) || '0.00'}
                      </div>
                    </div>

                    <div className="p-0 h-full">
                      <button
                        onClick={() => {
                          // If only one row, clear fields. If multiple rows, delete the row
                          if (formData.items.length === 1) {
                            clearProductFields(index);
                          } else {
                            removeItem(index);
                          }
                        }}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && (e.key === 'Delete' || e.key === 'Backspace')) {
                            e.preventDefault();
                            if (formData.items.length === 1) {
                              clearProductFields(index);
                            } else {
                              removeItem(index);
                            }
                          }
                        }}
                        className="w-full h-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center justify-center border-0 hover:bg-red-100 bg-transparent"
                        title={formData.items.length === 1 ? "Clear product fields" : "Remove this item"}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Navigation Hints */}
              {/* <div className="bg-gray-50 border-t border-gray-200 p-3 text-center min-w-[1200px]">
                                <div className="text-sm text-gray-600 mb-1 mt-16">
                                    <strong>🚀 Excel-Like Purchase Order Items:</strong> Search → Select → Set Quantity → Tab → Next Row | Enter → Notes
                                </div>
                                <div className="text-xs text-gray-500 mb-1">
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded mr-2">NEW</span> New Product Row •
                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded ml-2 mr-2">EMPTY</span> Empty Row (will be ignored)
                                </div>
                                <div className="text-xs text-gray-500 mb-1">
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded">Type</kbd> Search Product →
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">↑↓</kbd> Navigate List →
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Enter</kbd> Select →
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Set</kbd> Quantity →
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Tab</kbd> Next Row →
                                    <kbd className="px-1 py-0.5 bg-gray-200 rounded ml-1">Enter</kbd> Go to Notes
                                </div>
                                <div className="text-xs text-gray-400 mb-5">
                                    ⚡ <strong>Complete Excel-like purchase order form navigation!</strong>
                                </div>
                            </div> */}
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                        #{index + 1}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        // If only one row, clear fields. If multiple rows, delete the row
                        if (formData.items.length === 1) {
                          clearProductFields(index);
                        } else {
                          removeItem(index);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                      title={formData.items.length === 1 ? "Clear product fields" : "Remove this item"}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Product Selection */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                      <div className="relative">
                        <div className="relative">
                          <input
                            type="text"
                            value={productSearchTerms[index] || getProductPartNo(item.product)}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateProductSearchTerm(index, value);
                              if (!value) { // If input is cleared, clear the product selection
                                updateItem(index, 'product', '');
                                updateItem(index, 'name', '');
                                updateItem(index, 'partNo', '');
                                updateItem(index, 'gndp', 0);
                                updateItem(index, 'taxRate', 0);
                                updateItem(index, 'totalPrice', 0);
                                updateItem(index, 'hsnNumber', '');
                                updateItem(index, 'uom', 'nos');
                                updateItem(index, 'description', '');
                              }
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
                              if (!productSearchTerms[index] && !item.product) {
                                updateProductSearchTerm(index, '');
                              }
                              setShowProductDropdowns({
                                ...showProductDropdowns,
                                [index]: true
                              });
                            }}
                            className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Search product..."
                            autoComplete="off"
                          />
                          {item.product && !productSearchTerms[index] && (
                            <button
                              type="button"
                              onClick={() => {
                                updateItem(index, 'product', '');
                                updateItem(index, 'name', '');
                                updateItem(index, 'partNo', '');
                                updateItem(index, 'gndp', 0);
                                updateItem(index, 'taxRate', 0);
                                updateItem(index, 'totalPrice', 0);
                                updateItem(index, 'hsnNumber', '');
                                updateItem(index, 'uom', 'nos');
                                updateItem(index, 'description', '');
                                updateProductSearchTerm(index, '');
                              }}
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        {showProductDropdowns[index] && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                            {getFilteredProducts(productSearchTerms[index] || '').map((stockProduct, productIndex) => (
                              <button
                                key={`${stockProduct.product._id}-${stockProduct._id}`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  updateItem(index, 'stockId', stockProduct._id);
                                  setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                  updateProductSearchTerm(index, '');
                                  setHighlightedProductIndex({ ...highlightedProductIndex, [index]: -1 });
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${item.stockId === stockProduct._id ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
                                  }`}
                              >
                                <div className="font-medium">{stockProduct.product.name}</div>
                                <div className="text-xs text-gray-500">
                                  {stockProduct.product.partNo} • ₹{stockProduct.product.gndp?.toLocaleString() || stockProduct.product.price?.toLocaleString()}
                                </div>
                                <div className="text-xs text-blue-600">
                                  📍 {stockProduct.stockLocation.location} → {stockProduct.stockLocation.room} → {stockProduct.stockLocation.rack}
                                </div>
                                <div className="text-xs text-green-600">
                                  📦 Available: {stockProduct.availableQuantity} units
                                </div>
                                <div className="text-xs text-purple-600">
                                  🏷️ Stock ID: {stockProduct._id.slice(-8)}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantity and Price Row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">GNDP Price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.gndp.toFixed(2)}
                          onChange={(e) => updateItem(index, 'gndp', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="0.00"
                        />
                      </div>
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


          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  if (e.shiftKey) {
                    // Shift+Tab: Move back to last product's quantity field
                    const lastRowIndex = formData.items.length - 1;
                    setTimeout(() => {
                      const lastQuantityInput = document.querySelector(`[data-row="${lastRowIndex}"][data-field="quantity"]`) as HTMLInputElement;
                      if (lastQuantityInput) lastQuantityInput.focus();
                    }, 50);
                  } else {
                    // Tab: Move to Create PO button
                    setTimeout(() => {
                      createPOButtonRef.current?.focus();
                    }, 50);
                  }
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  // Enter: Move to Create PO button
                  setTimeout(() => {
                    createPOButtonRef.current?.focus();
                  }, 50);
                }
              }}
              rows={3}
              data-field="notes"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Additional notes or specifications..."
            />
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-end">
              <div className="w-80 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Tax:</span>
                  <span className="font-medium">₹{calculateTotalTax().toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-3">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">₹{calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div className="flex space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{formData.items.length}</div>
                  <div className="text-sm text-blue-700">Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {formData.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </div>
                  <div className="text-sm text-blue-700">Total Quantity</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-700 font-medium">Total Amount</div>
                <div className="text-3xl font-bold text-blue-900">
                  {formatCurrency(calculateTotal())}
                </div>
              </div>
            </div>
          </div>
          {/* Create PO Button - Bottom Right */}
          <div className="flex justify-end gap-5">
            <button
              onClick={() => navigate('/billing')}
              disabled={submitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              ref={createPOButtonRef}
              onClick={handleSubmitPO}
              disabled={submitting}
              onKeyDown={(e) => {
                if (e.key === 'Tab' && e.shiftKey) {
                  e.preventDefault();
                  // Shift+Tab: Move back to notes field
                  setTimeout(() => {
                    const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
                    if (notesInput) notesInput.focus();
                  }, 50);
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmitPO();
                }
              }}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Save className="w-5 h-5" />
              <span className="font-medium">{submitting ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Invoice' : 'Create Invoice')}</span>
            </button>
          </div>
        </div>
      </div>



    </div>
  );
};

export default CreatePurchaseInvoiceForm; 