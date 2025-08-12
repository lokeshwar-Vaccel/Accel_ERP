import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, DollarSign, TrendingDown, TrendingUp, X, ChevronDown, Settings, MapPin, Hash, Filter, IndianRupee } from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import { RootState } from 'redux/store';
import { useSelector } from 'react-redux';
import { Pagination } from 'components/ui/Pagination';
import toast from 'react-hot-toast';

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

  // Custom dropdown states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Form dropdown states
  const [showFormCategoryDropdown, setShowFormCategoryDropdown] = useState(false);
  const [showFormUomDropdown, setShowFormUomDropdown] = useState(false);

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [racks, setRacks] = useState<any[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]);
  const [filteredRacks, setFilteredRacks] = useState<any[]>([]);

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
    'nos', 'kg', 'litre', 'meter', 'sq.ft', 'hour', 'set', 'box', 'can', 'roll'
  ];

  const category = [
    'genset', 'spare_part', 'accessory'
  ];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Sorting state
  const [sortField, setSortField] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');

  // Collapsible filter panel state
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Update sort param when sortField or sortOrder changes
  useEffect(() => {
    if (sortField === 'all' || sortOrder === 'all') {
      setSort('name'); // default sort
    } else {
      const sortParam = sortOrder === 'asc' ? sortField : `-${sortField}`;
      setSort(sortParam);
    }
  }, [sortField, sortOrder]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowCategoryDropdown(false);
        setShowStatusDropdown(false);
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

  const openEditProductModal = (product: Product) => {
    setIsEditing(true);
    setSelectedProduct(product);
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

  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
    // Close all form dropdowns
    setShowFormCategoryDropdown(false);
    setShowFormUomDropdown(false);
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

  const openDeleteConfirm = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setProductToDelete(null);
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
      await apiClient.products.delete(productToDelete._id);
      await fetchProducts();
      closeDeleteConfirm();
      toast.success('Product deleted successfully');
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

  // Prepare dropdown options for form
  const formCategoryOptions = category.map(cat => ({
    value: cat,
    label: cat.replace('_', ' ').toUpperCase()
  }));

  const formUomOptions = ["nos", "kg", "litre", "meter", "sq.ft", "hour", "set", "box", "can", "roll"].sort().map(unit => ({
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
      const response = await apiClient.stock.getLocations();
      // Handle response format from backend - locations are nested in data.locations
      let locationsData: any[] = [];
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

  const fetchRooms = async () => {
    try {
      const response = await apiClient.stock.getRooms();
      // Handle response format from backend - locations are nested in data.locations
      let roomsData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          roomsData = response.data;
        } else if ((response.data as any).rooms && Array.isArray((response.data as any).rooms)) {
          roomsData = (response.data as any).rooms;
        }
      }

      setRooms(roomsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setRooms([]);
    }
  };


  const fetchRacks = async () => {
    try {
      const response = await apiClient.stock.getRacks();
      // Handle response format from backend - locations are nested in data.locations
      let racksData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          racksData = response.data;
        } else if ((response.data as any).racks && Array.isArray((response.data as any).racks)) {
          racksData = (response.data as any).racks;
        }
      }
      setRacks(racksData);
    } catch (error) {
      console.error('Error fetching locations:', error);
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
    fetchProducts();
    fetchAllProductsForAvg();
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
        <button
          onClick={openAddProductModal}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Add Product</span>
        </button>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Products</p>
              <p className="text-xl font-bold text-gray-900">{totalDatas}</p>
            </div>
            <Package className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Active Products</p>
              <p className="text-xl font-bold text-green-600">
              {totalDatas}
                {/* {Array.isArray(products) ? products.filter(p => p.isActive).length : 0} */}
              </p>
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
                ₹{allProductsForAvg.length > 0
                  ? (allProductsForAvg.reduce((acc, p) => acc + (p.price || 0), 0) / allProductsForAvg.length).toFixed(2)
                  : 0}
              </p>
            </div>
            <IndianRupee className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters Button */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        {/* Primary Search Bar */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(v => !v)}
              className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors border border-blue-200 text-xs font-medium flex items-center gap-1.5"
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="px-6 py-6 bg-gray-50">
            {/* Main Filter Controls */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              {/* Sort By */}
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

              {/* Sort Order */}
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
                {/* Category Custom Dropdown */}
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
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${categoryFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
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
                {/* Status Custom Dropdown */}
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
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${statusFilter === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
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
                className={`w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  hasActiveFilters
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
        {/* Active Filters Chips */}
        {hasActiveFilters && (
          <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-600">
              {/* <span className="font-medium">{filteredProducts.length}</span>
              <span className="mx-1">of</span>
              <span>{filteredProducts.length}</span>
              <span className="ml-1">items found</span> */}
            </div>
          <div className="mt-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500">Active filters:</span>
          {categoryFilter !== 'all' && (
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs flex items-center">
              {getCategoryLabel(categoryFilter)}
              <button onClick={() => setCategoryFilter('all')} className="ml-1 text-purple-500 hover:text-purple-700">×</button>
            </span>
          )}
          {statusFilter !== 'all' && (
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs flex items-center">
              {getStatusLabel(statusFilter)}
              <button onClick={() => setStatusFilter('all')} className="ml-1 text-blue-500 hover:text-blue-700">×</button>
            </span>
          )}
          {sortField !== 'all' && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs flex items-center">
              {(() => {
                let label = '';
                if (sortField === 'name') label = 'Product Name';
                else if (sortField === 'partNo') label = 'Part No';
                else if (sortField === 'price') label = 'Price';
                return `${label} - ${sortOrder === 'asc' ? 'A-Z (Ascending)' : 'Z-A (Descending)'}`;
              })()}
              <button onClick={() => setSortField('all')} className="ml-1 text-green-500 hover:text-green-700">×</button>
            </span>
          )}
          {searchTerm && (
            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs flex items-center">
              {`Search: "${searchTerm}"`}
              <button onClick={() => setSearchTerm('')} className="ml-1 text-yellow-500 hover:text-yellow-700">×</button>
            </span>
          )}
        </div>
        </div>)
        }
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
                  <td colSpan={11} className="px-6 py-8 text-center text-gray-500">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-8 text-center text-gray-500">No products found</td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap uppercase">
                      <div>
                        <div className="text-xs font-medium text-gray-900">{product.name}</div>
                        {/* <div className="text-xs text-gray-500">Code: {product.productCode || 'N/A'}</div> */}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{product.partNo}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 uppercase">{product.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600 uppercase">{product.brand || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                      ₹{product?.price?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                      {product.minStockLevel}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                      {product.maxStockLevel  }
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${product.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
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
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setShowFormCategoryDropdown(!showFormCategoryDropdown);
                                setShowFormUomDropdown(false);
                              }}
                              className={`flex items-center justify-between w-full px-2 py-1.5 text-left border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${formErrors.category ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                            >
                              <span className={`text-gray-700 truncate mr-1 ${!formData.category ? 'text-gray-500' : ''}`}>
                                {formData.category ? formCategoryOptions.find(opt => opt.value === formData.category)?.label : 'Select Category'}
                              </span>
                              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showFormCategoryDropdown ? 'rotate-180' : ''}`} />
                            </button>
                            {showFormCategoryDropdown && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                                {formCategoryOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      handleDropdownChange('category', option.value);
                                      setShowFormCategoryDropdown(false);
                                    }}
                                    className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${formData.category === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                  >
                                    {option.label}
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
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => {
                              setShowFormUomDropdown(!showFormUomDropdown);
                              setShowFormCategoryDropdown(false);
                            }}
                            className={`flex items-center justify-between w-full px-2 py-1.5 text-left border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm ${formErrors.uom ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}`}
                          >
                            <span className={`text-gray-700 truncate mr-1 ${!formData.uom ? 'text-gray-500' : ''}`}>
                              {formData.uom ? formUomOptions.find(opt => opt.value === formData.uom)?.label : 'Select UOM'}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform flex-shrink-0 ${showFormUomDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          {showFormUomDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                              {formUomOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    handleDropdownChange('uom', option.value);
                                    setShowFormUomDropdown(false);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${formData.uom === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                                >
                                  {option.label}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && productToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm m-4">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Product
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Are you sure you want to delete <strong>{productToDelete.name}</strong>?
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
                  {submitting ? 'Deleting...' : 'Delete Product'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement; 