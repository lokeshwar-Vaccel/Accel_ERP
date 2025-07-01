import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, DollarSign, TrendingDown, TrendingUp, X, ChevronDown, Settings, MapPin, Hash } from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import { RootState } from 'redux/store';
import { useSelector } from 'react-redux';

export interface Product {
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
  dept?: string;
  productType1?: string;
  productType2?: string;
  productType3?: string;
  make?: string;
  gst?: number;
  gndp?: number;
  price?: number;
  gndpTotal?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const currentUser = useSelector((state: RootState) => state.auth.user?.id);
  console.log("currentUser-products:",products);
  

  // Custom dropdown states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Modal states
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [racks, setRacks] = useState<any[]>([]);

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
    isActive: true,
    location: '',        
    room: '',            
    rack: '',            
    hsnNumber: '',
    dept: '',
    productType1: '',
    productType2: '',
    productType3: '',
    make: '',
    gst: 0,
    gndp: 0,
    price: 0,
    gndpTotal: 0,
    createdBy: currentUser        
  });

    const departments = [
    'RETAIL', 'INDUSTRIAL', 'TELECOM', 'EV', 'RET/TEL'
  ];
    const category = [
    'genset', 'spare_part', 'accessory'
  ];

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowCategoryDropdown(false);
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    isActive: true,
    location: '',        
    room: '',            
    rack: '',            
    hsnNumber: '',
    dept: '',
    productType1: '',
    productType2: '',
    productType3: '',
    make: '',
    gst: 0,
    gndp: 0,
    price: 0,
    gndpTotal: 0,
    createdBy: currentUser
    });
    setFormErrors({});
    setShowProductModal(true);
  };

  const openEditProductModal = (product: Product) => {
    console.log("product00000:",product);
    
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
      isActive: product.isActive ?? true,
      location: product.location || '',
      room: product.room || '',
      rack: product.rack || '',
      hsnNumber: product.hsnNumber || '',
      dept: product.dept || '',
      productType1: product.productType1 || '',
      productType2: product.productType2 || '',
      productType3: product.productType3 || '',
      make: product.make || '',
      gst: product.gst || 0,
      gndp: product.gndp || 0,
      price: product.price || 0,
      gndpTotal: product.gndpTotal || 0,
      createdBy: product.createdBy?._id || ''
    });

    setFormErrors({});
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
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
    isActive: true,
    location: '',        
    room: '',            
    rack: '',            
    hsnNumber: '',
    dept: '',
    productType1: '',
    productType2: '',
    productType3: '',
    make: '',
    gst: 0,
    gndp: 0,
    price: 0,
    gndpTotal: 0,
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

    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }

    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }

    if (formData.minStockLevel < 0) {
      errors.minStockLevel = 'Minimum stock level cannot be negative';
    }

    setFormErrors(errors);
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
    } catch (err) {
      console.error('Error saving product:', err);
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
    } catch (err) {
      console.error('Error deleting product:', err);
      setFormErrors({ general: 'Failed to delete product' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'minStockLevel' ? Number(value) : value
    }));

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

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
    try {
      setLoading(true);
      const response = await apiClient.products.getAll();

      // Handle different response formats: { data: { products: [...] } } or { data: [...] }
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
      // Set empty array on error instead of mock data to show real issue
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = Array.isArray(products) ? products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.productCode && product.productCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
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
              <p className="text-xl font-bold text-gray-900">{Array.isArray(products) ? products.length : 0}</p>
            </div>
            <Package className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Active Products</p>
              <p className="text-xl font-bold text-green-600">
                {Array.isArray(products) ? products.filter(p => p.isActive).length : 0}
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
                {/* ₹{Array.isArray(products) && products.length > 0 ? Math.round(products.reduce((acc, p) => acc + (p.price || 0), 0) / products.length).toLocaleString() : 0} */}
              </p>
            </div>
            <DollarSign className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowCategoryDropdown(!showCategoryDropdown);
                setShowStatusDropdown(false);
              }}
              className="flex items-center justify-between w-full md:w-32 px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
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

          {/* Status Custom Dropdown */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowCategoryDropdown(false);
              }}
              className="flex items-center justify-between w-full md:w-28 px-2 py-1 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
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
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">Loading products...</td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No products found</td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-xs font-medium text-gray-900">{product.name}</div>
                        {/* <div className="text-xs text-gray-500">Code: {product.productCode || 'N/A'}</div> */}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{product.category}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">{product.brand || 'N/A'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-gray-900">
                      ₹{product?.price?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-600">
                      {product.minStockLevel}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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

      {/* Product Form Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl m-4 max-h-[90vh] overflow-y-auto">
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

            {/* <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter product name"
                  />
                  {formErrors.name && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.category ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select Category</option>
                    <option value="genset">Generator Set</option>
                    <option value="spare_part">Spare Part</option>
                    <option value="accessory">Accessory</option>
                  </select>
                  {formErrors.category && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.category}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Brand
                  </label>
                  <input
                    type="text"
                    name="brand"
                    value={formData.brand}
                    onChange={handleInputChange}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter brand name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model Number
                  </label>
                  <input
                    type="text"
                    name="modelNumber"
                    value={formData.modelNumber}
                    onChange={handleInputChange}
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter model number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter product description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {formErrors.price && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Stock Level *
                  </label>
                  <input
                    type="number"
                    name="minStockLevel"
                    value={formData.minStockLevel}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      formErrors.minStockLevel ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0"
                  />
                  {formErrors.minStockLevel && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.minStockLevel}</p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeProductModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (isEditing ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form> */}
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                {/* General Error */}
                {formErrors.general && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm font-medium">{formErrors.general}</p>
                  </div>
                )}

                {/* Basic Information Section */}
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-6">
                    {/* <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-600" />
                  </div> */}
                    <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Part Number *
                        </label>
                        <input
                          type="text"
                          name="partNo"
                          value={formData.partNo}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.partNo ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Category *
                        </label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.category ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                        >
                          <option value="">Select Category</option>
                          {category.map(cat => (
                            <option key={cat} value={cat}>
                              {cat.replace('_', ' ').toUpperCase()}
                            </option>
                          ))}
                        </select>
                        {formErrors.category && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                            {formErrors.category}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Department *
                        </label>
                        <select
                          name="dept"
                          value={formData.dept}
                          onChange={handleInputChange}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${formErrors.dept ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                            }`}
                        >
                          <option value="">Select Department</option>
                          {departments.map(dept => (
                            <option key={dept} value={dept}>{dept}</option>
                          ))}
                        </select>
                        {formErrors.dept && (
                          <p className="text-red-500 text-xs mt-1 flex items-center">
                            <span className="w-1 h-1 bg-red-500 rounded-full mr-2"></span>
                            {formErrors.dept}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Brand/Make
                        </label>
                        <input
                          type="text"
                          name="brand"
                          value={formData.brand}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200"
                          placeholder="e.g., SKF"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Model Number
                        </label>
                        <input
                          type="text"
                          name="modelNumber"
                          value={formData.modelNumber}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200"
                          placeholder="Enter model number"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200 resize-none"
                        placeholder="Enter product description"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Classification Section */}
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Settings className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Product Classification</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Type 1
                        </label>
                        {/* <select
                          name="productType1"
                          value={formData.productType1}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200"
                        >
                          <option value="">Select Type 1</option>
                          {productTypes1.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select> */}
                        <input
                          type="text"
                          name="productType1"
                          value={formData.productType1}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200"
                          placeholder="Enter productType1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Type 2
                        </label>
                        {/* <select
                          name="productType2"
                          value={formData.productType2}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200"
                        >
                          <option value="">Select Type 2</option>
                          {productTypes2.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select> */}
                        <input
                          type="text"
                          name="productType2"
                          value={formData.productType2}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200"
                          placeholder="Enter productType2"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Product Type 3
                        </label>
                        {/* <select
                          name="productType3"
                          value={formData.productType3}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200"
                        >
                          <option value="">Select Type 3</option>
                          {productTypes3.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select> */}
                        <input
                          type="text"
                          name="productType3"
                          value={formData.productType3}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-all duration-200"
                          placeholder="Enter productType3"
                        />
                      </div>
                      <div></div>
                    </div>
                  </div>
                </div>

                {/* Location Information Section */}
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-6">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Location Information</h3>
                  </div>

                  {/* Location Information Section */}
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900">Location Information</h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Location ID</label>
                          <select
                            name="location"
                            value={formData.location}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Location</option>
                            {locations.map(location => (
                              <option key={location._id} value={location._id}>
                                {location.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Room ID</label>
                          <select
                            name="room"
                            value={formData.room}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Room</option>
                            {rooms.map(room => (
                              <option key={room._id} value={room._id}>
                                {room.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Rack ID</label>
                          <select
                            name="rack"
                            value={formData.rack}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select Rack</option>
                            {racks.map(rack => (
                              <option key={rack._id} value={rack._id}>
                                {rack.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inventory & Pricing Section */}
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <DollarSign className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Inventory & Pricing</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        min="0"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.quantity ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="0"
                      />
                      {formErrors.quantity && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Stock Level *
                      </label>
                      <input
                        type="number"
                        name="minStockLevel"
                        value={formData.minStockLevel}
                        onChange={handleInputChange}
                        min="0"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.minStockLevel ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="0"
                      />
                      {formErrors.minStockLevel && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.minStockLevel}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GNDP Price (₹) *
                      </label>
                      <input
                        type="number"
                        name="gndp"
                        value={formData.gndp}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.gndp ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="0.00"
                      />
                      {formErrors.gndp && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.gndp}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MRP (₹) *
                      </label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        min="0"
                        step="0.01"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.price ? 'border-red-500' : 'border-gray-300'
                          }`}
                        placeholder="0.00"
                      />
                      {formErrors.price && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tax Information Section */}
                <div className="mb-8">
                  <div className="flex items-center space-x-2 mb-4">
                    <Hash className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Tax Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        HSN Number
                      </label>
                      <input
                        type="text"
                        name="hsnNumber"
                        value={formData.hsnNumber}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="e.g., 8482.10.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GST Rate (%)
                      </label>
                      <input
                        type="text"
                        name="gst"
                        value={formData.gst}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="e.g., 8482.10.00"
                      />
                      {/* <select
                      name="gst"
                      value={formData.gst}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    >
                      <option value="">Select GST Rate</option>
                      {gstRates.map(rate => (
                        <option key={rate} value={rate}>{rate}%</option>
                      ))}
                    </select> */}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeProductModal}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type='submit'
                    // onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      isEditing ? 'Update Product' : 'Create Product'
                    )}
                  </button>
                </div>
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