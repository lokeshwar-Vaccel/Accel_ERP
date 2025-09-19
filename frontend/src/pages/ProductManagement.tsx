import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, DollarSign, TrendingDown, TrendingUp, X, ChevronDown, Settings, MapPin, Hash, Filter, IndianRupee, Zap, Eye, Upload } from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import { RootState } from '../store';
import { useSelector } from 'react-redux';
import { Pagination } from 'components/ui/Pagination';
import toast from 'react-hot-toast';
import { DGProduct, ProductCategory } from '../types';
import DGProductFormModal from '../components/DGProductFormModal';
import DGProductImportModal from '../components/DGProductImportModal';

export interface Product {
  _id: string;
  name: string;
  description?: string;
  category: string; // Should be a value from ProductCategory enum
  brand?: string;
  modelNumber?: string;
  partNo: string;
  quantity: number;
  minStockLevel: number;
  isActive: boolean;
  location: string; // MongoDB ObjectId as string
  room: string;
  rack: string;
  hsnNumber?: string;
  productType1?: string;
  productType2?: string;
  productType3?: string;
  make?: string;
  gst?: number;
  gndp?: number;
  price?: number;
  stockUnit?: string;
  gndpTotal?: number;
  cpcbNo?: string; // Added
  uom?: string; // Added
  createdAt: string;
  updatedAt: string;
  createdBy?: string | { _id: string; firstName?: string; lastName?: string };
  maxStockLevel?: number; // Added
}

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  brand: string;
  modelNumber: string;
  specifications: Record<string, any>;
  price: number;
  minStockLevel: number;
}

const ProductManagement: React.FC = () => {
  // Active tab state
  const [activeTab, setActiveTab] = useState<'spare' | 'dg'>('spare');

  // Spare Products State
  const [products, setProducts] = useState<Product[]>([]); // paginated for table
  const [allProductsForAvg, setAllProductsForAvg] = useState<Product[]>([]); // all for avg price
  const [activeProducts, setActiveProducts] = useState<Product[]>([]); // all for avg price
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const currentUser = useSelector((state: RootState) => state.auth.user?.id);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDatas, setTotalDatas] = useState(0);
  const [sort, setSort] = useState('name');

  // DG Products State
  const [dgProducts, setDgProducts] = useState<DGProduct[]>([]);
  const [dgLoading, setDgLoading] = useState(false);
  const [dgSearchTerm, setDgSearchTerm] = useState('');
  const [dgStatusFilter, setDgStatusFilter] = useState('all');
  const [dgCurrentPage, setDgCurrentPage] = useState(1);
  const [dgLimit, setDgLimit] = useState(10);
  const [dgTotalPages, setDgTotalPages] = useState(0);
  const [dgTotalDatas, setDgTotalDatas] = useState(0);
  const [dgSort, setDgSort] = useState('createdAt');
  const [dgActiveCount, setDgActiveCount] = useState(0);

  // Custom dropdown states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Form dropdown states
  const [showFormCategoryDropdown, setShowFormCategoryDropdown] = useState(false);
  const [showFormUomDropdown, setShowFormUomDropdown] = useState(false);
  const [showFormLocationDropdown, setShowFormLocationDropdown] = useState(false);
  const [showFormRoomDropdown, setShowFormRoomDropdown] = useState(false);
  const [showFormRackDropdown, setShowFormRackDropdown] = useState(false);

  // Search states for enhanced dropdowns
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [uomSearchTerm, setUomSearchTerm] = useState('');

  // Keyboard navigation states
  const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState(-1);
  const [highlightedUomIndex, setHighlightedUomIndex] = useState(-1);

  // Refs for enhanced dropdowns
  const categoryInputRef = React.useRef<HTMLInputElement>(null);
  const uomInputRef = React.useRef<HTMLInputElement>(null);

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDGProductModal, setShowDGProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedDGProduct, setSelectedDGProduct] = useState<DGProduct | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | DGProduct | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [racks, setRacks] = useState<any[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]);
  const [filteredRacks, setFilteredRacks] = useState<any[]>([]);
  const [showViewProductModal, setShowViewProductModal] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<DGProduct | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    brand: '',
    modelNumber: '',
    partNo: '',
    quantity: 0,
    minStockLevel: 0,
    maxStockLevel: 0,
    isActive: true,
    location: '',
    room: '',
    rack: '',
    hsnNumber: '',
    productType1: '',
    productType2: '',
    productType3: '',
    make: '',
    gst: 0,
    gndp: 0,
    price: 0,
    uom: 'nos',
    gndpTotal: 0,
    cpcbNo: '', // Added
    createdBy: currentUser
  });

  // Removed location-related useEffect hooks since location is now optional

  const stockUnit = [
    'nos', 'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll', 'eu'
  ];

  const category = [
    'genset', 'spare_part', 'accessory'
  ];



  const handlePageChange = (page: number) => {
    if (activeTab === 'spare') {
      setCurrentPage(page);
    } else {
      setDgCurrentPage(page);
    }
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('asc');

  // Collapsible filter panel state
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (activeTab === 'spare') {
      fetchProducts();
    } else {
      fetchDGProducts();
    }
  }, [activeTab]);

  // Update sort param when sortField or sortOrder changes
  useEffect(() => {
    if (sortField === 'all' || sortOrder === 'all') {
      setSort('name'); // default sort
    } else {
      const sortParam = sortOrder === 'asc' ? sortField : `-${sortField}`;
      setSort(sortParam);
    }
  }, [sortField, sortOrder]);

  // Refetch DG products when pagination parameters change
  useEffect(() => {
    if (activeTab === 'dg') {
      fetchDGProducts();
    }
  }, [dgCurrentPage, dgLimit, dgSort, dgSearchTerm, dgStatusFilter]);

  // Filter rooms and racks based on selected location and room
  useEffect(() => {
    console.log('Filtering rooms - formData.location:', formData.location);
    console.log('All rooms:', rooms);
    
    if (formData.location) {
      const filtered = rooms.filter(room => {
        console.log('Room location:', room.location, 'Selected location:', formData.location);
        // Handle both populated location object and location ID string
        const roomLocationId = typeof room.location === 'object' && room.location?._id 
          ? room.location._id 
          : room.location;
        return roomLocationId === formData.location;
      });
      console.log('Filtered rooms:', filtered);
      setFilteredRooms(filtered);
      // Reset room and rack when location changes
      if (formData.room && !filtered.find(room => room._id === formData.room)) {
        setFormData(prev => ({ ...prev, room: '', rack: '' }));
      }
    } else {
      setFilteredRooms(rooms);
    }
  }, [formData.location, rooms]);

  useEffect(() => {
    console.log('Filtering racks - formData.room:', formData.room);
    console.log('All racks:', racks);
    
    if (formData.room) {
      const filtered = racks.filter(rack => {
        console.log('Rack room:', rack.room, 'Selected room:', formData.room);
        // Handle both populated room object and room ID string
        const rackRoomId = typeof rack.room === 'object' && rack.room?._id 
          ? rack.room._id 
          : rack.room;
        return rackRoomId === formData.room;
      });
      console.log('Filtered racks:', filtered);
      setFilteredRacks(filtered);
      // Reset rack when room changes
      if (formData.rack && !filtered.find(rack => rack._id === formData.rack)) {
        setFormData(prev => ({ ...prev, rack: '' }));
      }
    } else {
      setFilteredRacks(racks);
    }
  }, [formData.room, racks]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowCategoryDropdown(false);
        setShowStatusDropdown(false);
        setShowFormCategoryDropdown(false);
        setShowFormUomDropdown(false);
        setShowFormLocationDropdown(false);
        setShowFormRoomDropdown(false);
        setShowFormRackDropdown(false);
        // Reset search terms and highlights when closing dropdowns
        setCategorySearchTerm('');
        setUomSearchTerm('');
        setHighlightedCategoryIndex(-1);
        setHighlightedUomIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Modal handlers
  const openAddProductModal = () => {
    setIsEditing(false);
    setSelectedProduct(null);
    // Reset search terms and highlights
    setCategorySearchTerm('');
    setUomSearchTerm('');
    setHighlightedCategoryIndex(-1);
    setHighlightedUomIndex(-1);
    setFormData({
      name: '',
      description: '',
      category: '',
      brand: '',
      modelNumber: '',
      partNo: '',
      quantity: 0,
      minStockLevel: 0,
      maxStockLevel: 0,
      isActive: true,
      location: '',
      room: '',
      rack: '',
      hsnNumber: '',
      productType1: '',
      productType2: '',
      productType3: '',
      make: '',
      gst: 0,
      gndp: 0,
      price: 0,
      uom: 'nos',
      gndpTotal: 0,
      cpcbNo: '', // Added
      createdBy: currentUser
    });
    setFormErrors({});
    setShowProductModal(true);
  };

  const openAddDGProductModal = () => {
    setIsEditing(false);
    setSelectedDGProduct(null);
    setShowDGProductModal(true);
  };

  const openEditProductModal = (product: Product) => {
    setIsEditing(true);
    setSelectedProduct(product);
    // Reset search terms and highlights
    setCategorySearchTerm('');
    setUomSearchTerm('');
    setHighlightedCategoryIndex(-1);
    setHighlightedUomIndex(-1);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      brand: product.brand || '',
      modelNumber: product.modelNumber || '',
      partNo: product.partNo || '',
      quantity: product.quantity,
      minStockLevel: product.minStockLevel,
      maxStockLevel: product.maxStockLevel || 0,
      isActive: product.isActive ?? true,
      location: product.location || '',
      room: product.room || '',
      rack: product.rack || '',
      hsnNumber: product.hsnNumber || '',
      productType1: product.productType1 || '',
      productType2: product.productType2 || '',
      productType3: product.productType3 || '',
      make: product.make || '',
      gst: product.gst || 0,
      gndp: product.gndp || 0,
      price: product.price || 0,
      uom: product.uom || 'nos',
      gndpTotal: product.gndpTotal || 0,
      cpcbNo: product.cpcbNo || '', // Added
      createdBy: typeof product.createdBy === 'string' ? product.createdBy : product.createdBy?._id || ''
    });

    setFormErrors({});
    setShowProductModal(true);
  };

  const openEditDGProductModal = (product: DGProduct) => {
    setIsEditing(true);
    setSelectedDGProduct(product);
    setShowDGProductModal(true);
  };

  const openViewDGProductModal = (product: any | DGProduct) => {
    setViewingProduct(product);
    setShowViewProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
    // Close all form dropdowns
    setShowFormCategoryDropdown(false);
    setShowFormUomDropdown(false);
    setShowFormLocationDropdown(false);
    setShowFormRoomDropdown(false);
    setShowFormRackDropdown(false);
    // Reset search terms and highlights
    setCategorySearchTerm('');
    setUomSearchTerm('');
    setHighlightedCategoryIndex(-1);
    setHighlightedUomIndex(-1);
    setFormData({
      name: '',
      description: '',
      category: '',
      brand: '',
      modelNumber: '',
      partNo: '',
      quantity: 0,
      minStockLevel: 0,
      maxStockLevel: 0,
      isActive: true,
      location: '',
      room: '',
      rack: '',
      hsnNumber: '',
      productType1: '',
      productType2: '',
      productType3: '',
      make: '',
      gst: 0,
      gndp: 0,
      price: 0,
      uom: 'nos',
      gndpTotal: 0,
      cpcbNo: '', // Added
      createdBy: ''
    });
    setFormErrors({});
  };

  const closeDGProductModal = () => {
    setShowDGProductModal(false);
    setSelectedDGProduct(null);
  };

  const closeViewProductModal = () => {
    setShowViewProductModal(false);
    setViewingProduct(null);
  };

  const openDeleteConfirm = (product: Product | DGProduct) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  // DG Product handlers
  const handleDGProductSubmit = async (data: Partial<DGProduct>) => {
    setSubmitting(true);
    try {
      // Add createdBy field to the data
      const productData = {
        ...data,
        createdBy: currentUser
      };

      if (isEditing && selectedDGProduct) {
        await apiClient.dgProducts.update(selectedDGProduct._id, productData);
        toast.success('DG Product updated successfully');
      } else {
        await apiClient.dgProducts.create(productData);
        toast.success('DG Product created successfully');
      }

      await fetchDGProducts();
      closeDGProductModal();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save DG Product');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchDGProducts = async () => {
    const params: any = {
      page: dgCurrentPage,
      limit: dgLimit,
      sortBy: dgSort,
      search: dgSearchTerm,
      ...(dgStatusFilter !== 'all' && {
        isActive: dgStatusFilter === 'active' ? true : false,
      }),
    };

    try {
      setDgLoading(true);
      const response = await apiClient.dgProducts.getAll(params);

      // Handle new pagination structure
      if (response.success && response.data) {
        const responseData = response.data as any;
        const { products, pagination, stats } = responseData;

        // Update pagination state
        setDgCurrentPage(pagination.currentPage);
        setDgLimit(pagination.limit);
        setDgTotalDatas(pagination.totalCount);
        setDgTotalPages(pagination.totalPages);

        // Update active count from stats
        if (stats && typeof stats.activeCount === 'number') {
          setDgActiveCount(stats.activeCount);
        } else {
          // Fallback: calculate from current products if stats not available
          const activeCount = Array.isArray(products) ? products.filter(p => p.isActive).length : 0;
          setDgActiveCount(activeCount);
        }

        // Update products
        if (Array.isArray(products)) {
          setDgProducts(products);
        } else {
          setDgProducts([]);
        }
      } else {
        // Fallback for old response structure
        setDgCurrentPage(response.pagination?.page || 1);
        setDgLimit(response.pagination?.limit || 10);
        setDgTotalDatas(response.pagination?.total || 0);
        setDgTotalPages(response.pagination?.pages || 0);

        let products: any[] = [];
        if (response.data) {
          if (Array.isArray(response.data)) {
            products = response.data;
          } else if ((response.data as any).products && Array.isArray((response.data as any).products)) {
            products = (response.data as any).products;
          }
        }
        setDgProducts(products);
      }
    } catch (error) {
      console.error('Error fetching DG products:', error);
      setDgProducts([]);
    } finally {
      setDgLoading(false);
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Required field validations
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    } else if (formData.name.length < 3) {
      errors.name = 'Product name must be at least 3 characters long';
    }

    if (!formData.partNo.trim()) {
      errors.partNo = 'Part Number is required';
    } else if (formData.partNo.length < 2) {
      errors.partNo = 'Part Number must be at least 2 characters long';
    }

    // Uniqueness check (for create and edit)
    const isDuplicatePartNo = products.some(
      (p) =>
        p.partNo.trim().toLowerCase() === formData.partNo.trim().toLowerCase() &&
        (!isEditing || (selectedProduct && p._id !== selectedProduct._id))
    );
    if (isDuplicatePartNo) {
      errors.partNo = 'Part Number must be unique';
    }

    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }

    if (!formData.location.trim()) {
      errors.location = 'Location is required';
    }

    if (!formData.room.trim()) {
      errors.room = 'Room is required';
    }

    if (!formData.rack.trim()) {
      errors.rack = 'Rack is required';
    }

    if (!formData.uom.trim()) {
      errors.uom = 'Unit of Measure (UOM) is required';
    }

    // Numeric field validations
    if (formData.minStockLevel < 0) {
      errors.minStockLevel = 'Minimum stock level cannot be negative';
    }

    // Ensure minStockLevel is an integer
    if (formData.minStockLevel && !Number.isInteger(formData.minStockLevel)) {
      errors.minStockLevel = 'Minimum stock level must be a whole number';
    }

    // Max Stock Level validation
    if (formData.maxStockLevel < 0) {
      errors.maxStockLevel = 'Maximum stock level cannot be negative';
    }
    if (formData.maxStockLevel && !Number.isInteger(formData.maxStockLevel)) {
      errors.maxStockLevel = 'Maximum stock level must be a whole number';
    }
    if (
      formData.maxStockLevel &&
      formData.minStockLevel &&
      formData.maxStockLevel <= formData.minStockLevel
    ) {
      errors.maxStockLevel = 'Maximum stock level must be greater than or equal to minimum stock level';
    }

    if (!formData.maxStockLevel || formData.maxStockLevel <= 0) {
      errors.maxStockLevel = 'Max Stock Level must be greater than 0';
    }

    if (!formData.price || formData.price <= 0) {
      errors.price = 'UnitPrice must be greater than 0';
    }

    if (!formData.gndp || formData.gndp <= 0) {
      errors.gndp = 'GNDP Price must be greater than 0';
    }

    // HSN Number validation (if provided)
    if (formData.hsnNumber && !/^\d{4,8}$/.test(formData.hsnNumber)) {
      errors.hsnNumber = 'HSN Number must be 4-8 digits only (no decimals)';
    }

    // GST validation (if provided)
    if (formData.gst && (formData.gst < 0 || formData.gst > 100)) {
      errors.gst = 'GST rate must be between 0 and 100';
    }

    setFormErrors(errors);

    // If there are errors, show a summary message
    if (Object.keys(errors).length > 0) {
      const missingFields = Object.keys(errors).map(field => {
        switch (field) {
          case 'name': return 'Product Name';
          case 'partNo': return 'Part Number';
          case 'category': return 'Category';
          case 'location': return 'Location';
          case 'room': return 'Room';
          case 'rack': return 'Rack';
          case 'uom': return 'Unit of Measure';
          case 'price': return 'Unit Price';
          case 'gndp': return 'GNDP Price';
          case 'minStockLevel': return 'Min Stock Level';
          case 'maxStockLevel': return 'Max Stock Level';
          case 'hsnNumber': return 'HSN Number';
          case 'gst': return 'GST Rate';
          default: return field;
        }
      });

      if (missingFields.length > 1) {
        errors.general = `Please fill in the required fields: ${missingFields.join(', ')}`;
      } else {
        errors.general = `Please fix the error in: ${missingFields[0]}`;
      }
      setFormErrors(errors);
      toast.error(errors.general);
    }

    return Object.keys(errors).length === 0;
  };

  // CRUD operations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing && selectedProduct) {
        await apiClient.products.update(selectedProduct._id, formData);
      } else {
        await apiClient.products.create(formData);
      }

      await fetchProducts();
      closeProductModal();
      toast.success(isEditing ? 'Product updated successfully' : 'Product created successfully');
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.message) {
        if (
          err.response.data.message.includes('duplicate key') &&
          err.response.data.message.includes('partNo')
        ) {
          toast.error('Part Number must be unique');
          setFormErrors({ partNo: 'Part Number must be unique' });
        } else {
          toast.error(err.response.data.message);
        }
      } else {
        toast.error(isEditing ? 'Failed to update product' : 'Failed to create product');
      }
      setFormErrors({ general: isEditing ? 'Failed to update product' : 'Failed to create product' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    setSubmitting(true);
    try {
      if ('kva' in productToDelete) {
        // This is a DG Product
        await apiClient.dgProducts.delete(productToDelete._id);
        await fetchDGProducts();
        toast.success('DG Product deleted successfully');
      } else {
        // This is a regular Product
        await apiClient.products.delete(productToDelete._id);
        await fetchProducts();
        toast.success('Product deleted successfully');
      }
      closeDeleteConfirm();
    } catch (err: any) {
      console.error('Error deleting product:', err);
      if (err.response && err.response.data && err.response.data.message) {
        toast.error(err.response.data.message);
      } else {
        toast.error('Failed to delete product');
      }
      setFormErrors({ general: 'Failed to delete product' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? Number(value) :
        name === 'minStockLevel' ? parseInt(value, 10) :
          name === 'maxStockLevel' ? parseInt(value, 10) :
            value
    }));

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleDropdownChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Enhanced dropdown handlers
  const handleCategorySelect = (categoryValue: string) => {
    setFormData(prev => ({
      ...prev,
      category: categoryValue
    }));
    setShowFormCategoryDropdown(false);
    setCategorySearchTerm('');
    setHighlightedCategoryIndex(-1);

    // Clear error for this field
    if (formErrors.category) {
      setFormErrors(prev => ({
        ...prev,
        category: ''
      }));
    }
  };

  const handleUomSelect = (uomValue: string) => {
    setFormData(prev => ({
      ...prev,
      uom: uomValue
    }));
    setShowFormUomDropdown(false);
    setUomSearchTerm('');
    setHighlightedUomIndex(-1);

    // Clear error for this field
    if (formErrors.uom) {
      setFormErrors(prev => ({
        ...prev,
        uom: ''
      }));
    }
  };

  // Keyboard navigation handlers
  const handleCategoryKeyDown = (e: React.KeyboardEvent) => {
    const filteredCategories = formCategoryOptions.filter(option =>
      option.label.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(categorySearchTerm.toLowerCase())
    );

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (highlightedCategoryIndex >= 0 && filteredCategories[highlightedCategoryIndex]) {
          handleCategorySelect(filteredCategories[highlightedCategoryIndex].value);
        } else {
          setShowFormCategoryDropdown(false);
          setCategorySearchTerm('');
          setHighlightedCategoryIndex(-1);
          setTimeout(() => {
            uomInputRef.current?.focus();
          }, 50);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedCategoryIndex(prev =>
          prev < filteredCategories.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedCategoryIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedCategoryIndex >= 0 && filteredCategories[highlightedCategoryIndex]) {
          handleCategorySelect(filteredCategories[highlightedCategoryIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowFormCategoryDropdown(false);
        setCategorySearchTerm('');
        setHighlightedCategoryIndex(-1);
        break;
    }
  };

  const handleUomKeyDown = (e: React.KeyboardEvent) => {
    const filteredUoms = formUomOptions.filter(option =>
      option.label.toLowerCase().includes(uomSearchTerm.toLowerCase()) ||
      option.value.toLowerCase().includes(uomSearchTerm.toLowerCase())
    );

    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (highlightedUomIndex >= 0 && filteredUoms[highlightedUomIndex]) {
          handleUomSelect(filteredUoms[highlightedUomIndex].value);
        } else {
          setShowFormUomDropdown(false);
          setUomSearchTerm('');
          setHighlightedUomIndex(-1);
          setTimeout(() => {
            // Focus next field after UOM
            const nextField = document.querySelector('input[name="brand"]') as HTMLInputElement;
            nextField?.focus();
          }, 50);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedUomIndex(prev =>
          prev < filteredUoms.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedUomIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedUomIndex >= 0 && filteredUoms[highlightedUomIndex]) {
          handleUomSelect(filteredUoms[highlightedUomIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowFormUomDropdown(false);
        setUomSearchTerm('');
        setHighlightedUomIndex(-1);
        break;
    }
  };

  // Prepare dropdown options for form
  const formCategoryOptions = category.map(cat => ({
    value: cat,
    label: cat.replace('_', ' ').toUpperCase()
  }));

  const formUomOptions = ["nos", "kg", "litre", "meter", "sq.ft", "hour", "set", "box", "can", "roll", "eu"].sort().map(unit => ({
    value: unit,
    label: unit
  }));

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        // fetchProducts(),
        fetchLocations(),
        fetchRooms(),
        fetchRacks()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      console.log('Fetching locations...');
      const response = await apiClient.stock.getLocations();
      console.log('Locations response:', response);
      // Handle response format from backend - locations are nested in data.locations
      let locationsData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          locationsData = response.data;
        } else if ((response.data as any).locations && Array.isArray((response.data as any).locations)) {
          locationsData = (response.data as any).locations;
        }
      }
      console.log('Locations data:', locationsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  const fetchRooms = async () => {
    try {
      console.log('Fetching rooms...');
      const response = await apiClient.stock.getRooms();
      console.log('Rooms response:', response);
      
      let roomsData: any[] = [];
      if (response.data) {
        // Backend returns: { data: { rooms: [...] } }
        if ((response.data as any).rooms && Array.isArray((response.data as any).rooms)) {
          roomsData = (response.data as any).rooms;
        } else if (Array.isArray(response.data)) {
          roomsData = response.data;
        }
      }
      console.log('Rooms data:', roomsData);
      console.log('Sample room:', roomsData[0]);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    }
  };

  const fetchRacks = async () => {
    try {
      console.log('Fetching racks...');
      const response = await apiClient.stock.getRacks();
      console.log('Racks response:', response);
      
      let racksData: any[] = [];
      if (response.data) {
        // Backend returns: { data: { racks: [...] } }
        if ((response.data as any).racks && Array.isArray((response.data as any).racks)) {
          racksData = (response.data as any).racks;
        } else if (Array.isArray(response.data)) {
          racksData = response.data;
        }
      }
      console.log('Racks data:', racksData);
      console.log('Sample rack:', racksData[0]);
      setRacks(racksData);
    } catch (error) {
      console.error('Error fetching racks:', error);
      setRacks([]);
    }
  };

  const fetchProducts = async () => {
    const params: any = {
      page: currentPage,
      limit,
      sort,
      search: searchTerm,
      ...(categoryFilter !== 'all' && { category: categoryFilter }),
      ...(statusFilter !== 'all' && {
        isActive: statusFilter === 'active' ? true : false,
      }),
    };

    try {
      setLoading(true);
      const response = await apiClient.products.getAll(params);
      setCurrentPage(response.pagination.page);
      setLimit(response.pagination.limit);
      setTotalDatas(response.pagination.total);
      setTotalPages(response.pagination.pages);
      let products: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          products = response.data;
        } else if ((response.data as any).products && Array.isArray((response.data as any).products)) {
          products = (response.data as any).products;
        }
      }
      setProducts(products);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProductsForAvg = async () => {
    try {
      let allProducts: any[] = [];
      let page = 1;
      let hasMore = true;
      const limit = 100;

      while (hasMore) {
        const response: any = await apiClient.products.getAll({ page, limit });
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

      setAllProductsForAvg(allProducts);
      setActiveProducts(allProducts.filter(p => p.isActive));
    } catch (error) {
      setAllProductsForAvg([]);
      setActiveProducts([]);
    }
  };

  useEffect(() => {
    if (activeTab === 'spare') {
      fetchProducts();
      fetchAllProductsForAvg();
    }
  }, [currentPage, limit, sort, searchTerm, statusFilter, categoryFilter]);

  const filteredProducts = Array.isArray(products) ? products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.partNo && product.partNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && product.isActive) ||
      (statusFilter === 'inactive' && !product.isActive);

    return matchesSearch && matchesCategory && matchesStatus;
  }) : [];

  const categories = Array.isArray(products) ? [...new Set(products.map(p => p.category))] : [];

  // Category options with labels
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'genset', label: 'Generator Set' },
    { value: 'spare_part', label: 'Spare Part' },
    { value: 'accessory', label: 'Accessory' }
  ];

  // Status options with labels
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ];

  const getCategoryLabel = (value: string) => {
    const option = categoryOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Categories';
  };

  const getStatusLabel = (value: string) => {
    const option = statusOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Status';
  };

  // Clear all filters handler
  const clearAllFilters = () => {
    setShowFilters(false);
    setSearchTerm('');
    setSortField('all');
    setSortOrder('asc');
    setCategoryFilter('all');
    setStatusFilter('all');
  };

  const hasActiveFilters = categoryFilter !== 'all' || statusFilter !== 'all' || sortField !== 'all' || searchTerm;

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      <PageHeader
        title="Product Management"
        subtitle="Manage your product catalog and inventory"
      >
        <div className="flex space-x-2">
          {activeTab === 'spare' && <button
            onClick={openAddProductModal}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Package className="w-4 h-4" />
            <span className="text-sm">Add Spare Product</span>
          </button>}
          {activeTab === 'dg' && <button
            onClick={openAddDGProductModal}
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-orange-700 hover:to-orange-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Zap className="w-4 h-4" />
            <span className="text-sm">Add DG Product</span>
          </button>}
          {activeTab === 'dg' && <button
            onClick={() => setShowImportModal(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">Import Excel</span>
          </button>}
        </div>
      </PageHeader>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('spare')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'spare'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>Spare Products</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('dg')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'dg'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>DG Products</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'spare' ? (
            <SpareProductsTab
              products={products}
              loading={loading}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              currentPage={currentPage}
              totalPages={totalPages}
              locations={locations}
              totalDatas={totalDatas}
              filteredProducts={filteredProducts}
              openEditProductModal={openEditProductModal}
              openDeleteConfirm={openDeleteConfirm}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              sortField={sortField}
              setSortField={setSortField}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              categoryOptions={categoryOptions}
              statusOptions={statusOptions}
              getCategoryLabel={getCategoryLabel}
              getStatusLabel={getStatusLabel}
              hasActiveFilters={hasActiveFilters as boolean}
              clearAllFilters={clearAllFilters}
              handlePageChange={handlePageChange}
              limit={limit}
            />
          ) : (
            <DGProductsTab
              dgProducts={dgProducts}
              loading={dgLoading}
              searchTerm={dgSearchTerm}
              setSearchTerm={setDgSearchTerm}
              statusFilter={dgStatusFilter}
              setStatusFilter={setDgStatusFilter}
              currentPage={dgCurrentPage}
              totalPages={dgTotalPages}
              totalDatas={dgTotalDatas}
              openEditProductModal={openEditDGProductModal}
              openViewProductModal={openViewDGProductModal}
              openDeleteConfirm={openDeleteConfirm}
              handlePageChange={handlePageChange}
              limit={dgLimit}
              setShowImportModal={setShowImportModal}
              dgActiveCount={dgActiveCount}
            />
          )}
        </div>
      </div>

      {/* Product Form Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[1200px] h-[600px] m-4 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={closeProductModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* First Row: Basic Information on Left and Right */}
              <div className="flex flex-row space-x-4">
                <div className="w-1/2 border-r border-gray-200 flex flex-col">
                  {/* General Error */}
                  {formErrors.general && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-600 text-sm font-medium">{formErrors.general}</p>
                    </div>
                  )}

                  {/* Basic Information Section */}
                  <div className="flex-1 space-y-6 border-r border-gray-200 p-6">
                    <div className="flex items-center space-x-2 mb-6">
                      {/* <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div> */}
                      <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Product Name *
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            className={`w-full px-2 py-1.5 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm ${formErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                              }`}
                            placeholder="Enter product name"
                          />
                          {formErrors.name && (
                            <p className="text-red-500 text-xs mt-1 flex items-center">
                              <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                              {formErrors.name}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Part Number *
                          </label>
                          <input
                            type="text"
                            name="partNo"
                            value={formData.partNo}
                            onChange={handleInputChange}
                            className={`w-full px-2 py-1.5 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm ${formErrors.partNo ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                              }`}
                            placeholder="e.g., BRG-789X"
                          />
                          {formErrors.partNo && (
                            <p className="text-red-500 text-xs mt-1 flex items-center">
                              <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                              {formErrors.partNo}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Category *
                          </label>
                          <div className="relative dropdown-container">
                            <input
                              ref={categoryInputRef}
                              type="text"
                              value={categorySearchTerm || (formData.category ? formCategoryOptions.find(opt => opt.value === formData.category)?.label : '')}
                              onChange={(e) => {
                                const value = e.target.value;
                                setCategorySearchTerm(value);

                                // If input is cleared, clear the category selection
                                if (value === '') {
                                  setFormData(prev => ({
                                    ...prev,
                                    category: ''
                                  }));
                                }

                                if (!showFormCategoryDropdown) setShowFormCategoryDropdown(true);
                                setHighlightedCategoryIndex(-1);
                              }}
                              onFocus={() => {
                                setShowFormCategoryDropdown(true);
                                setHighlightedCategoryIndex(-1);
                                // Don't clear search term in edit mode
                                if (!categorySearchTerm && formData.category && !isEditing) {
                                  setCategorySearchTerm('');
                                }
                              }}
                              onKeyDown={handleCategoryKeyDown}
                              placeholder="Search category or press ↓ to open"
                              className={`w-full px-2 py-1.5 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${formErrors.category ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                              data-field="category"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                              {formData.category && !categorySearchTerm && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      category: ''
                                    }));
                                    setCategorySearchTerm('');
                                    setShowFormCategoryDropdown(false);
                                    setHighlightedCategoryIndex(-1);
                                    categoryInputRef.current?.focus();
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded-full transition-colors mr-1"
                                  title="Clear category"
                                >
                                  <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                                </button>
                              )}
                              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showFormCategoryDropdown ? 'rotate-180' : ''} pointer-events-none`} />
                            </div>
                            {showFormCategoryDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                                <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                                  <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                                </div>
                                {formCategoryOptions
                                  .filter(option =>
                                    option.label.toLowerCase().includes(categorySearchTerm.toLowerCase()) ||
                                    option.value.toLowerCase().includes(categorySearchTerm.toLowerCase())
                                  )
                                  .map((option, index) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => handleCategorySelect(option.value)}
                                      className={`w-full px-3 py-1.5 text-left transition-colors text-sm ${formData.category === option.value ? 'bg-blue-100 text-blue-800' :
                                        highlightedCategoryIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                          'text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                      <div className="font-medium text-gray-900">{option.label}</div>
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                          {formErrors.category && (
                            <p className="text-red-500 text-xs mt-1 flex items-center">
                              <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                              {formErrors.category}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Brand/Make
                          </label>
                          <input
                            type="text"
                            name="brand"
                            value={formData.brand}
                            onChange={handleInputChange}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200 text-sm"
                            placeholder="e.g., SKF"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Model Number
                          </label>
                          <input
                            type="text"
                            name="modelNumber"
                            value={formData.modelNumber}
                            onChange={handleInputChange}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200 text-sm"
                            placeholder="Enter model number"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={2}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200 resize-none text-sm"
                          placeholder="Enter product description"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-1/2 flex flex-col">
                  {/* Duplicate Basic Information Section for Right Side */}
                  <div className="flex-1 space-y-6 p-6">
                    <div className="flex items-center space-x-2 mb-4">
                      <IndianRupee className="w-5 h-5 text-gray-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Inventory & Pricing</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Min Stock Level *
                        </label>
                        <input
                          type="number"
                          name="minStockLevel"
                          value={formData.minStockLevel === 0 ? "" : formData.minStockLevel}
                          onChange={handleInputChange}
                          step="1"
                          inputMode="numeric"
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === ',') {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full px-2 py-1.5 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm ${formErrors.minStockLevel ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="0"
                        />
                        {formErrors.minStockLevel && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.minStockLevel}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Max Stock Level *
                        </label>
                        <input
                          type="number"
                          name="maxStockLevel"
                          value={formData.maxStockLevel === 0 ? "" : formData.maxStockLevel}
                          onChange={handleInputChange}
                          step="1"
                          inputMode="numeric"
                          onKeyDown={(e) => {
                            if (e.key === '.' || e.key === ',') {
                              e.preventDefault();
                            }
                          }}
                          className={`w-full px-2 py-1.5 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm ${formErrors.maxStockLevel ? 'border-red-500' : 'border-gray-300'}`}
                          placeholder="0"
                        />
                        {formErrors.maxStockLevel && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.maxStockLevel}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          GNDP Price (₹) *
                        </label>
                        <input
                          type="number"
                          name="gndp"
                          value={formData.gndp === 0 ? "" : formData.gndp}
                          onChange={handleInputChange}
                          // min="0"
                          step="0.01"
                          className={`w-full px-2 py-1.5 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm ${formErrors.gndp ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="0.00"
                        />
                        {formErrors.gndp && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.gndp}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit Price (₹) *
                        </label>
                        <input
                          type="number"
                          name="price"
                          value={formData.price === 0 ? "" : formData.price}
                          onChange={handleInputChange}
                          // min="0"
                          step="0.01"
                          inputMode="decimal"
                          className={`w-full px-2 py-1.5 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm ${formErrors.price ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="0.00"
                        />
                        {formErrors.price && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit of Measure (UOM) *
                        </label>
                        <div className="relative dropdown-container">
                          <input
                            ref={uomInputRef}
                            type="text"
                            value={uomSearchTerm || (formData.uom ? formUomOptions.find(opt => opt.value === formData.uom)?.label : '')}
                            onChange={(e) => {
                              const value = e.target.value;
                              setUomSearchTerm(value);

                              // If input is cleared, clear the UOM selection
                              if (value === '') {
                                setFormData(prev => ({
                                  ...prev,
                                  uom: ''
                                }));
                              }

                              if (!showFormUomDropdown) setShowFormUomDropdown(true);
                              setHighlightedUomIndex(-1);
                            }}
                            onFocus={() => {
                              setShowFormUomDropdown(true);
                              setHighlightedUomIndex(-1);
                              // Don't clear search term in edit mode
                              if (!uomSearchTerm && formData.uom && !isEditing) {
                                setUomSearchTerm('');
                              }
                            }}
                            onKeyDown={handleUomKeyDown}
                            placeholder="Search UOM or press ↓ to open"
                            className={`w-full px-2 py-1.5 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${formErrors.uom ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                            data-field="uom"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            {formData.uom && !uomSearchTerm && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    uom: ''
                                  }));
                                  setUomSearchTerm('');
                                  setShowFormUomDropdown(false);
                                  setHighlightedUomIndex(-1);
                                  uomInputRef.current?.focus();
                                }}
                                className="p-1 hover:bg-gray-100 rounded-full transition-colors mr-1"
                                title="Clear UOM"
                              >
                                <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                              </button>
                            )}
                            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showFormUomDropdown ? 'rotate-180' : ''} pointer-events-none`} />
                          </div>
                          {showFormUomDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                              <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                              </div>
                              {formUomOptions
                                .filter(option =>
                                  option.label.toLowerCase().includes(uomSearchTerm.toLowerCase()) ||
                                  option.value.toLowerCase().includes(uomSearchTerm.toLowerCase())
                                )
                                .map((option, index) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleUomSelect(option.value)}
                                    className={`w-full px-3 py-1.5 text-left transition-colors text-sm ${formData.uom === option.value ? 'bg-blue-100 text-blue-800' :
                                      highlightedUomIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                        'text-gray-700 hover:bg-gray-50'
                                      }`}
                                  >
                                    <div className="font-medium text-gray-900">{option.label}</div>
                                  </button>
                                ))}
                            </div>
                          )}
                        </div>
                        {formErrors.uom && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                            {formErrors.uom}
                          </p>
                        )}
                      </div>
                      {/* <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Location *
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setShowFormLocationDropdown(!showFormLocationDropdown);
                              setShowFormRoomDropdown(false);
                              setShowFormRackDropdown(false);
                            }}
                            className={`flex items-center justify-between w-full px-2 py-1.5 text-left border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${formErrors.location ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                          >
                            <span className={`text-gray-700 truncate mr-1 ${!formData.location ? 'text-gray-500' : ''}`}>
                              {formData.location ? locations.find((loc: any) => loc._id === formData.location)?.name : 'Select Location'}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showFormLocationDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          {showFormLocationDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                              {locations.map((location) => (
                                <button
                                  key={location._id}
                                  type="button"
                                  onClick={() => {
                                    handleDropdownChange('location', location._id);
                                    setShowFormLocationDropdown(false);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${formData.location === location._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                >
                                  {location.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {formErrors.location && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                            {formErrors.location}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Room
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setShowFormRoomDropdown(!showFormRoomDropdown);
                              setShowFormLocationDropdown(false);
                              setShowFormRackDropdown(false);
                            }}
                            disabled={!formData.location}
                            className={`flex items-center justify-between w-full px-2 py-1.5 text-left border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${formErrors.room ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'} ${!formData.location ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          >
                            <span className={`text-gray-700 truncate mr-1 ${!formData.room ? 'text-gray-500' : ''}`}>
                              {formData.room ? filteredRooms.find((room: any) => room._id === formData.room)?.name : 'Select Room'}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showFormRoomDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          {showFormRoomDropdown && formData.location && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                              {filteredRooms.map((room) => (
                                <button
                                  key={room._id}
                                  type="button"
                                  onClick={() => {
                                    handleDropdownChange('room', room._id);
                                    setShowFormRoomDropdown(false);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${formData.room === room._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                >
                                  {room.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {formErrors.room && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                            {formErrors.room}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Rack
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setShowFormRackDropdown(!showFormRackDropdown);
                              setShowFormLocationDropdown(false);
                              setShowFormRoomDropdown(false);
                            }}
                            disabled={!formData.room}
                            className={`flex items-center justify-between w-full px-2 py-1.5 text-left border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${formErrors.rack ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'} ${!formData.room ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                          >
                            <span className={`text-gray-700 truncate mr-1 ${!formData.rack ? 'text-gray-500' : ''}`}>
                              {formData.rack ? filteredRacks.find((rack: any) => rack._id === formData.rack)?.name : 'Select Rack'}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showFormRackDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          {showFormRackDropdown && formData.room && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                              {filteredRacks.map((rack) => (
                                <button
                                  key={rack._id}
                                  type="button"
                                  onClick={() => {
                                    handleDropdownChange('rack', rack._id);
                                    setShowFormRackDropdown(false);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${formData.rack === rack._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                >
                                  {rack.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {formErrors.rack && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                            {formErrors.rack}
                          </p>
                        )}
                      </div> */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          CPCB Number
                        </label>
                        <input
                          type="text"
                          name="cpcbNo"
                          value={formData.cpcbNo}
                          onChange={handleInputChange}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Enter CPCB Number"
                        />
                      </div>
                    </div>
                    {/* Tax Information Section */}
                    <div className="mb-8">
                      <div className="flex items-center space-x-2 mb-4">
                        <Hash className="w-5 h-5 text-gray-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Tax Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            HSN Number
                          </label>
                          <input
                            type="text"
                            name="hsnNumber"
                            value={formData.hsnNumber}
                            onChange={handleInputChange}
                            // pattern="^\\d{4,8}$"
                            inputMode="numeric"
                            className={`w-full px-2 py-1.5 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm ${formErrors.hsnNumber ? 'border-red-500' : 'border-gray-300'
                              }`}
                            placeholder="e.g., 84821000"
                          />
                          {formErrors.hsnNumber && (
                            <p className="text-red-500 text-xs mt-1">{formErrors.hsnNumber}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            GST Rate (%)
                          </label>
                          <input
                            type="number"
                            name="gst"
                            value={formData.gst === 0 ? "" : formData.gst}
                            onChange={handleInputChange}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                            placeholder="e.g., 18"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


              {/* Location Information Section */}
              <div className="flex-1 border-t border-gray-200 p-6">
                <div className="flex items-center space-x-2 mb-6">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Location Information</h3>
                </div>

                {/* Location Information Section */}
                <div className="mb-8">
                  {/* <h3 className="text-lg font-semibold text-gray-900">Location Information</h3> */}
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Location *</label>
                        <select
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors.location ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Location</option>
                          {locations.map(location => (
                            <option key={location._id} value={location._id}>
                              {location.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.location && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                            {formErrors.location}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Room *
                          {!formData.location && (
                            <span className="text-xs text-gray-500 ml-1">(Select location first)</span>
                          )}
                        </label>
                        <select
                          name="room"
                          value={formData.room}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors.room 
                              ? 'border-red-500 bg-red-50' 
                              : !formData.location 
                                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
                                : 'border-gray-300'
                          }`}
                          disabled={!formData.location}
                        >
                          <option value="">
                            {!formData.location ? 'Select location first' : 'Select Room'}
                          </option>
                          {filteredRooms.length > 0 ? filteredRooms.map(room => {
                            console.log('Rendering room:', room);
                            return typeof room === 'object' && room._id && room.name ? (
                              <option key={room._id} value={room._id}>
                                {room.name}
                              </option>
                            ) : null;
                          }) : formData.location ? (
                            <option disabled value="">No rooms available for this location</option>
                          ) : null}
                        </select>
                        {formErrors.room && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                            {formErrors.room}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rack *
                          {!formData.room && (
                            <span className="text-xs text-gray-500 ml-1">(Select room first)</span>
                          )}
                        </label>
                        <select
                          name="rack"
                          value={formData.rack}
                          onChange={handleInputChange}
                          disabled={!formData.room}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            formErrors.rack 
                              ? 'border-red-500 bg-red-50' 
                              : !formData.room 
                                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
                                : 'border-gray-300'
                          }`}
                        >
                          <option value="">
                            {!formData.room ? 'Select room first' : 'Select Rack'}
                          </option>
                          {filteredRacks.length > 0 ? (
                            filteredRacks.map(rack => {
                              console.log('Rendering rack:', rack);
                              return (
                                <option key={rack._id} value={rack._id}>
                                  {rack.name}
                                </option>
                              );
                            })
                          ) : formData.room ? (
                            <option disabled value="">
                              No racks available for this room
                            </option>
                          ) : null}
                        </select>
                        {formErrors.rack && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                            {formErrors.rack}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Classification Section */}
              <div className="w-full">{/* Optional Product Classification */}
                <div className="border-t border-gray-200 p-6">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Product Classification</h3>
                    <span className="text-xs text-gray-500">(Optional)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Product Type 1
                      </label>
                      <input
                        type="text"
                        name="productType1"
                        value={formData.productType1}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200 text-sm"
                        placeholder="Enter product type 1"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Product Type 2
                      </label>
                      <input
                        type="text"
                        name="productType2"
                        value={formData.productType2}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200 text-sm"
                        placeholder="Enter product type 2"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Product Type 3
                      </label>
                      <input
                        type="text"
                        name="productType3"
                        value={formData.productType3}
                        onChange={handleInputChange}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200 text-sm"
                        placeholder="Enter product type 3"
                      />
                    </div>
                  </div>
                </div>
              </div>


              {/* Footer with Action Buttons */}
              <div className="flex justify-end gap-4 items-center p-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    isEditing ? 'Update Product' : 'Create Product'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DG Product Form Modal */}
      {showDGProductModal && (
        <DGProductFormModal
          isOpen={showDGProductModal}
          onClose={closeDGProductModal}
          onSubmit={handleDGProductSubmit}
          product={selectedDGProduct}
          isEditing={isEditing}
        />
      )}

      {/* DG Product View Modal */}
      {showViewProductModal && viewingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[800px] max-h-[90vh] m-4 overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-200 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">DG Product Details</h2>
                  <p className="text-sm text-gray-500">View complete product information</p>
                </div>
              </div>
              <button
                onClick={closeViewProductModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Subject</label>
                    <p className="text-sm text-gray-900 font-medium">{viewingProduct.subject}</p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Status</label>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${viewingProduct.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-sm text-gray-900">{viewingProduct.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Created Date</label>
                  <p className="text-sm text-gray-900">{new Date(viewingProduct.createdAt).toLocaleDateString()}</p>
                </div>

                {viewingProduct.description && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Description</label>
                    <p className="text-sm text-gray-900 leading-relaxed">{viewingProduct.description}</p>
                  </div>
                )}
              </div>

              {/* DG Specifications */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Zap className="w-5 h-5 text-blue-600 mr-2" />
                  DG Specifications
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">KVA Rating</label>
                    <p className="text-sm text-gray-900 font-medium">{viewingProduct.kva}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phase</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${viewingProduct.phase === 'single'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                      }`}>
                      {viewingProduct.phase} Phase
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annexure Rating</label>
                    <p className="text-sm text-gray-900 font-medium">{viewingProduct.annexureRating}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DG Model</label>
                    <p className="text-sm text-gray-900 font-medium">{viewingProduct.dgModel}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Cylinders</label>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                      {viewingProduct.numberOfCylinders} {viewingProduct.numberOfCylinders === 1 ? 'Cylinder' : 'Cylinders'}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <p className="text-sm text-gray-900 font-medium">{viewingProduct.subject}</p>
                  </div>
                </div>
              </div>

              {/* Generated Specifications */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Settings className="w-5 h-5 text-green-600 mr-2" />
                  Complete Specifications
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      Offer for the Supply of {viewingProduct.kva} kVA ({viewingProduct.phase === 'single' ? '1P' : '3P'}) Genset confirming to latest CPCB IV+ emission norms.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Annexure Rating</label>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {viewingProduct.kva} Kva ({viewingProduct.phase === 'single' ? '1P' : '3P'})
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model & Cylinder</label>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {viewingProduct.dgModel} & CYL-{viewingProduct.numberOfCylinders}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Description</label>
                    <p className="text-sm text-gray-900 leading-relaxed">
                      {viewingProduct.description || `Supply of ${viewingProduct.kva} kVA ${viewingProduct.phase === 'single' ? '1 phase' : '3 phase'}, Mahindra CPCB IV+ compliant, Prime Rated, radiator cooled, powered by Mahindra engine, electronic ${viewingProduct.numberOfCylinders} cylinder engine, model ${viewingProduct.dgModel}, coupled with ${viewingProduct.kva} KVA alternator, Standard control panel with ASAS Controller with battery charger, Silencer, Anti-Vibration mountings, exhaust flexible connector, Batteries with cables, fuel tank.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeViewProductModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  closeViewProductModal();
                  openEditDGProductModal(viewingProduct);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm m-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete {('kva' in productToDelete) ? 'DG Product' : 'Product'}
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete <strong>{
                  'name' in productToDelete && productToDelete.name
                    ? productToDelete.name
                    : 'subject' in productToDelete && productToDelete.subject
                      ? productToDelete.subject
                      : 'DG Product'
                }</strong>?
                This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={closeDeleteConfirm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DG Product Import Modal */}
      <DGProductImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={() => {
          fetchDGProducts();
          setShowImportModal(false);
        }}
      />
    </div>
  );
};

// Spare Products Tab Component
const SpareProductsTab: React.FC<{
  products: Product[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  categoryFilter: string;
  setCategoryFilter: (filter: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  currentPage: number;
  totalPages: number;
  totalDatas: number;
  filteredProducts: Product[];
  openEditProductModal: (product: Product) => void;
  openDeleteConfirm: (product: Product) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  sortField: string;
  setSortField: (field: string) => void;
  locations: any[];
  sortOrder: string;
  setSortOrder: (order: string) => void;
  categoryOptions: { value: string; label: string }[];
  statusOptions: { value: string; label: string }[];
  getCategoryLabel: (value: string) => string;
  getStatusLabel: (value: string) => string;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
  handlePageChange: (page: number) => void;
  limit: number;
}> = ({
  products,
  loading,
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  locations,
  setStatusFilter,
  currentPage,
  totalPages,
  totalDatas,
  filteredProducts,
  openEditProductModal,
  openDeleteConfirm,
  showFilters,
  setShowFilters,
  sortField,
  setSortField,
  sortOrder,
  setSortOrder,
  categoryOptions,
  statusOptions,
  getCategoryLabel,
  getStatusLabel,
  hasActiveFilters,
  clearAllFilters,
  handlePageChange,
  limit
}) => {
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    const categories = Array.isArray(products) ? [...new Set(products.map(p => p.category))] : [];

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Spare Products</p>
                <p className="text-xl font-bold text-gray-900">{totalDatas}</p>
              </div>
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active Products</p>
                <p className="text-xl font-bold text-green-600">{totalDatas}</p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Categories</p>
                <p className="text-xl font-bold text-purple-600">{categories.length}</p>
              </div>
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Avg Price</p>
                <p className="text-xl font-bold text-orange-600">
                  ₹{products.length > 0
                    ? (products.reduce((acc, p) => acc + (p.price || 0), 0) / products.length).toFixed(2)
                    : 0}
                </p>
              </div>
              <IndianRupee className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-3 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search spare products..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors border border-blue-200 text-xs font-medium flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="px-6 py-6 bg-gray-50">
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Sort By</label>
                  <select
                    value={sortField}
                    onChange={e => setSortField(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  >
                    <option value="all">Select Field</option>
                    <option value="name">Product Name</option>
                    <option value="partNo">Part Number</option>
                    <option value="price">Unit Price</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Sort Order</label>
                  <select
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-colors"
                  >
                    <option value="asc">Ascending (A-Z)</option>
                    <option value="desc">Descending (Z-A)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => {
                        setShowCategoryDropdown(!showCategoryDropdown);
                        setShowStatusDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <span className="text-gray-700 truncate mr-1">{getCategoryLabel(categoryFilter)}</span>
                      <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showCategoryDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                        {categoryOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setCategoryFilter(option.value);
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${categoryFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <div className="relative dropdown-container">
                    <button
                      onClick={() => {
                        setShowStatusDropdown(!showStatusDropdown);
                        setShowCategoryDropdown(false);
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
                              setStatusFilter(option.value);
                              setShowStatusDropdown(false);
                            }}
                            className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${statusFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={clearAllFilters}
                    disabled={!hasActiveFilters}
                    className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${hasActiveFilters
                        ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                        : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      }`}
                  >
                    Clear All Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part No</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Stock</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UOM</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GNDP</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPCB No</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-8 text-center text-gray-500">Loading spare products...</td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-8 text-center text-gray-500">No spare products found</td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap uppercase">
                        <div>
                          <div className="text-xs font-medium text-gray-900">{product.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{product.partNo}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 uppercase">{product.category}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 uppercase">{product.brand || 'N/A'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {product.location ? locations.find((loc: any) => loc._id === product.location)?.name || 'N/A' : 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                        ₹{product?.price?.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {product.minStockLevel}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {product.maxStockLevel}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {product?.uom || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        ₹{product.gndp?.toFixed(2) || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                        {product.cpcbNo || 'N/A'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap uppercase">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditProductModal(product)}
                            className="text-blue-600 hover:text-blue-900 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(product)}
                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
      </div>
    );
  };

// DG Products Tab Component
const DGProductsTab: React.FC<{
  dgProducts: DGProduct[];
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (filter: string) => void;
  currentPage: number;
  totalPages: number;
  totalDatas: number;
  openEditProductModal: (product: DGProduct) => void;
  openViewProductModal: (product: any | DGProduct) => void;
  openDeleteConfirm: (product: DGProduct) => void;
  handlePageChange: (page: number) => void;
  limit: number;
  setShowImportModal: (show: boolean) => void;
  dgActiveCount: number;
}> = ({
  dgProducts,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  currentPage,
  totalPages,
  totalDatas,
  openEditProductModal,
  openViewProductModal,
  openDeleteConfirm,
  handlePageChange,
  limit,
  setShowImportModal,
  dgActiveCount
}) => {
    const filteredDGProducts = dgProducts.filter(product => {
      const matchesSearch = (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.subject && product.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.kva && product.kva.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.dgModel && product.dgModel.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && product.isActive) ||
        (statusFilter === 'inactive' && !product.isActive);

      return matchesSearch && matchesStatus;
    });

    const dgStatusOptions = [
      { value: 'all', label: 'All Status' },
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ];

    const getDGStatusLabel = (value: string) => {
      const option = dgStatusOptions.find(opt => opt.value === value);
      return option ? option.label : 'All Status';
    };

    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total DG Products</p>
                <p className="text-xl font-bold text-gray-900">{totalDatas}</p>
              </div>
              <Zap className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Active DG Products</p>
                <p className="text-xl font-bold text-green-600">
                  {dgActiveCount}
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>

          {/* <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Avg Price</p>
              <p className="text-xl font-bold text-orange-600">
                ₹{dgProducts.length > 0
                  ? (dgProducts.reduce((acc, p) => acc + (p.price || 0), 0) / dgProducts.length).toFixed(2)
                  : 0}
              </p>
            </div>
            <IndianRupee className="w-6 h-6 text-orange-600" />
          </div>
        </div> */}
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search DG products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                {dgStatusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DG Products Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">DG Products</h3>
                <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                  {filteredDGProducts.length} {filteredDGProducts.length === 1 ? 'product' : 'products'}
                </span>
              </div>
              <div className="flex items-center space-x-3">

                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>Showing</span>
                  <span className="font-medium text-gray-900">{filteredDGProducts.length}</span>
                  <span>of</span>
                  <span className="font-medium text-gray-900">{totalDatas}</span>
                  <span>DG products</span>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-300 w-16">
                    S.No
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-300 w-48">
                    Subject
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-300 w-32">
                    Annexure Rating
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-300 w-24">
                    KVA
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-300 w-20">
                    Phase
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-300 w-32">
                    Model & Cylinder
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-300 w-64">
                    Product Description
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-300 w-24">
                    Model
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-300 w-28">
                    Cylinders
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border border-gray-300 w-32">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500">Loading DG products...</td>
                  </tr>
                ) : filteredDGProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-8 text-center text-gray-500">No DG products found</td>
                  </tr>
                ) : (
                  filteredDGProducts.map((product, index) => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 border border-gray-300 text-xs font-medium text-gray-900 text-center">
                        {(currentPage - 1) * limit + index + 1}
                      </td>
                      <td className="px-3 py-3 border border-gray-300">
                        <div className="text-xs text-gray-900 font-medium leading-tight">
                          Offer for the Supply of {product.kva} kVA ({product.phase === 'single' ? '1P' : '3P'}) Genset confirming to latest CPCB IV+ emission norms.
                        </div>
                      </td>
                      <td className="px-3 py-3 border border-gray-300">
                        <div className="text-xs text-gray-900 font-medium leading-tight">
                          {product.kva} Kva ({product.phase === 'single' ? '1P' : '3P'})
                        </div>
                      </td>
                      <td className="px-3 py-3 border border-gray-300">
                        <div className="text-xs text-gray-900 font-medium text-center">
                          {product.kva}
                        </div>
                      </td>
                      <td className="px-3 py-3 border border-gray-300">
                        <div className="text-xs text-gray-900 font-medium text-center">
                          {product.phase === 'single' ? '1P' : '3P'}
                        </div>
                      </td>
                      <td className="px-3 py-3 border border-gray-300">
                        <div className="text-xs text-gray-900 font-medium leading-tight">
                          {product.dgModel} & CYL-{product.numberOfCylinders}
                        </div>
                      </td>
                      <td className="px-3 py-3 border border-gray-300">
                        <div className="text-xs text-gray-900 leading-tight max-w-xs">
                          {product.description || `Supply of ${product.kva} kVA ${product.phase === 'single' ? '1 phase' : '3 phase'}, Mahindra CPCB IV+ compliant, Prime Rated, radiator cooled, powered by Mahindra engine, electronic ${product.numberOfCylinders} cylinder engine, model ${product.dgModel}, coupled with ${product.kva} KVA alternator, Standard control panel with ASAS Controller with battery charger, Silencer, Anti-Vibration mountings, exhaust flexible connector, Batteries with cables, fuel tank.`}
                        </div>
                      </td>
                      <td className="px-3 py-3 border border-gray-300">
                        <div className="text-xs text-gray-900 font-medium text-center">
                          {product.dgModel}
                        </div>
                      </td>
                      <td className="px-3 py-3 border border-gray-300">
                        <div className="text-xs text-gray-900 font-medium text-center">
                          {product.numberOfCylinders}
                        </div>
                      </td>
                      <td className="px-3 py-3 border border-gray-300">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openViewProductModal(product)}
                            className="text-green-600 hover:text-green-900 p-1.5 rounded hover:bg-green-50 transition-colors"
                            title="View Product"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openEditProductModal(product)}
                            className="text-blue-600 hover:text-blue-900 p-1.5 rounded hover:bg-blue-50 transition-colors"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openDeleteConfirm(product)}
                            className="text-red-600 hover:text-red-900 p-1.5 rounded hover:bg-red-50 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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
      </div>
    );
  };

export default ProductManagement; 