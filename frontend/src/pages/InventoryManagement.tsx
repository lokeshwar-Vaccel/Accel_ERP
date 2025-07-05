import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Truck,
  RefreshCw,
  Edit,
  Trash2,
  ArrowUpDown,
  MapPin,
  Calendar,
  History,
  ChevronDown,
  X,
  Eye,
  Building,
  Archive,
  Edit2,
  Filter,
  Hash
} from 'lucide-react';
import { Table } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { Form } from '../components/ui/Form';
import { Button } from '../components/ui/Botton';
import { Stock, Product, StockLocation, TableColumn, FormField } from '../types';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';
import { Input } from 'components/ui/Input';
import { Select } from 'components/ui/Select';
import { Badge } from 'components/ui/Badge';
import { Pagination } from 'components/ui/Pagination';

// Types
interface ProductData {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  price: number;
  stockUnit: string;
  minStockLevel: number;
  partNo?: string;
  dept?: string;
  hsnNumber?: string;
  productType1?: string;
  productType2?: string;
  productType3?: string;
  make?: string;
  gst?: number;
}

interface StockLocationData {
  _id: string;
  name: string;
  address: string;
  type: string;
  contactPerson?: string;
  phone?: string;
  isActive: boolean;
}

interface StockItem {
  _id: string;
  product: ProductData;
  location: StockLocationData;
  room?: any;
  rack?: any;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastUpdated: string;
  gndp?: number;
}

interface StockTransaction {
  _id: string;
  type: 'add' | 'subtract' | 'set' | 'transfer_in' | 'transfer_out';
  quantity: number;
  reason?: string;
  notes?: string;
  date: string;
  user: string;
}

// Form data interfaces
interface LocationFormData {
  name: string;
  address: string;
  type: string;
  contactPerson: string;
  phone: string;
}

interface StockAdjustmentFormData {
  product: string;
  location: string;
  adjustmentType: string;
  quantity: number;
  reason: string;
  notes: string;
  reservationType?: string;
  referenceId?: string;
  reservedUntil?: string;
}

interface StockTransferFormData {
  product: string;
  fromLocation: string;
  fromRoom: string;
  fromRack: string;
  toLocation: string;
  toRoom: string;
  toRack: string;
  quantity: number;
  notes: string;
}

const InventoryManagement: React.FC = () => {
  // State management
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [locations, setLocations] = useState<StockLocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Custom dropdown states
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showLocationTypeDropdown, setShowLocationTypeDropdown] = useState(false);
  const [showToLocationDropdown, setShowToLocationDropdown] = useState(false);
  const [showAdjustmentTypeDropdown, setShowAdjustmentTypeDropdown] = useState(false);
  const [showReservationTypeDropdown, setShowReservationTypeDropdown] = useState(false);
  const [showDateRangeDropdown, setShowDateRangeDropdown] = useState(false);
  const [showTransactionTypeDropdown, setShowTransactionTypeDropdown] = useState(false);
  const [showLedgerLocationDropdown, setShowLedgerLocationDropdown] = useState(false);

  // Modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLedgerModal, setShowLedgerModal] = useState(false);

  //Location
  const [activeTab, setActiveTab] = useState<'locations' | 'rooms' | 'racks'>('locations');
  const [rooms, setRooms] = useState<any[]>([]);
  const [racks, setRacks] = useState<any[]>([]);
  const [roomErrors, setRoomErrors] = useState<any>({});
  const [rackErrors, setRackErrors] = useState<any>({});
  const [selectedRoom, setSelectedRoom] = useState<any | undefined>();
  const [selectedRack, setSelectedRack] = useState<any | undefined>();
  const [filteredRooms, setFilteredRooms] = useState<any[]>([]);


  // Form states
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [stockTransactions, setStockTransactions] = useState<any[]>([]);
  const [stockLedgerData, setStockLedgerData] = useState<any[]>([]);
  const [ledgerPagination, setLedgerPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [ledgerSummary, setLedgerSummary] = useState({
    totalInward: 0,
    totalOutward: 0,
    netMovement: 0,
    totalTransactions: 0
  });
  const [ledgerFilters, setLedgerFilters] = useState({
    search: '',
    location: '',
    transactionType: '',
    dateRange: '30' // Last 30 days
  });
  const [locationFormData, setLocationFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    type: 'warehouse',
    contactPerson: '',
    phone: ''
  });
  const [roomFormData, setRoomFormData] = useState({
    name: '',
    location: '',
    description: '',
    isActive: true
  });
  const [rackFormData, setRackFormData] = useState({
    name: '',
    room: '',
    location: '',
    description: '',
    isActive: true
  });
  const [adjustmentFormData, setAdjustmentFormData] = useState<StockAdjustmentFormData>({
    product: '',
    location: '',
    adjustmentType: 'add',
    quantity: 0,
    reason: '',
    notes: '',
    reservationType: 'service',
    referenceId: '',
    reservedUntil: ''
  });
  const [transferFormData, setTransferFormData] = useState<StockTransferFormData>({
    product: '',
    fromLocation: '',
    fromRoom: '',
    fromRack: '',
    toLocation: '',
    toRoom: '',
    toRack: '',
    quantity: 0,
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [filters, setFilters] = useState<any>({
    search: '',
    category: '',
    location: '',
    stockStatus: 'all'
  });

  const onFiltersChange = useCallback((newFilters: Partial<any>) => {
    setFilters((prev: any) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);

  const itemsPerPage = 10;

  const filteredInventory = React.useMemo(() => {
    let items = [...inventory];

    // Search filter
    if (filters.search) {
      items = items.filter(item =>
        (item.product?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
          item.product?.brand?.toLowerCase().includes(filters.search.toLowerCase()) ||
          item.product?.partNo?.toLowerCase().includes(filters.search.toLowerCase()) ||
          item.location?.name?.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }


    // Category filter
    if (filters.category && filters.category !== 'all') {
      items = items.filter(item => item.product?.category === filters.category);
    }

    // Location filter
    if (filters.location) {
      items = items.filter(item => item.location?._id === filters.location);
    }
    if (filters.room) {
      items = items.filter(item => item.room?._id === filters.room);
    }
    if (filters.rack) {
      items = items.filter(item => item.rack?._id === filters.rack);
    }

        if (filters.dept) {
      items = items.filter(item => item.product?.dept === filters.dept);
    }

    if (filters.brand) {
      items = items.filter(item => item.product?.brand === filters.brand);
    }

    // Stock status filter
    if (filters.stockStatus && filters.stockStatus !== 'all') {
      items = items.filter(item => {
        if (filters.stockStatus === 'low_stock') {
          return item.quantity <= (item.product?.minStockLevel || 0) && item.quantity > 0;
        }
        if (filters.stockStatus === 'out_of_stock') {
          return item.quantity === 0;
        }
        return true;
      });
    }


    return items;
  }, [inventory, filters]);

  const paginatedInventory = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredInventory.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredInventory, currentPage]);

  React.useEffect(() => {
    setTotalPages(Math.max(1, Math.ceil(filteredInventory.length / itemsPerPage)));
    setTotalItems(filteredInventory.length);
    if (currentPage > Math.ceil(filteredInventory.length / itemsPerPage)) {
      setCurrentPage(1);
    }
  }, [filteredInventory]);

  // Fix getStockStatusTable: remove maxStockLevel check
  const getStockStatusTable = (item: StockItem) => {
    if (item.quantity === 0) {
      return { label: 'Out of Stock', variant: 'danger' as const, icon: AlertTriangle };
    }
    if (item.quantity <= (item.product?.minStockLevel || 0)) {
      return { label: 'Low Stock', variant: 'warning' as const, icon: TrendingDown };
    }
    return { label: 'In Stock', variant: 'success' as const, icon: Package };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (true) {
      // fetchStockItems(page);
    } else {
      // fetchTransactions(page);
    }
  };

  const rackOptions = [
    { value: '', label: 'All Racks' },
    { value: 'A2', label: 'Rack A2' },
    { value: 'D2', label: 'Rack D2' },
    { value: 'D3', label: 'Rack D3' },
    { value: 'E1', label: 'Rack E1' },
    { value: 'E2', label: 'Rack E2' },
    { value: 'E3', label: 'Rack E3' },
    { value: 'E6', label: 'Rack E6' },
    { value: 'E7', label: 'Rack E7' },
    { value: 'P2', label: 'Rack P2' },
    { value: 'GD', label: 'Rack GD' }
  ];

  const stockStatusOptions = [
    { value: 'all', label: 'All Stock Levels' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'overstocked', label: 'Overstocked' }
  ];

  const deptOptions = [
    { value: '', label: 'All Departments' },
    { value: 'RETAIL', label: 'Retail' },
    { value: 'INDUSTRIAL', label: 'Industrial' },
    { value: 'TELECOM', label: 'Telecom' },
    { value: 'EV', label: 'EV' },
    { value: 'RET/TEL', label: 'Retail/Telecom' }
  ];

  const makeOptions = [
    { value: '', label: 'All Makes' },
    { value: 'MAHINDRA', label: 'Mahindra' },
    { value: 'KOEL', label: 'Koel' },
    { value: 'CUMMINS', label: 'Cummins' },
    { value: 'ASHOKLEYLAND', label: 'Ashok Leyland' },
    { value: 'PHFL', label: 'PHFL' },
    { value: 'EICHER', label: 'Eicher' }
  ];

  const handleRoomModalClose = () => {
    setRoomFormData({
      name: '',
      location: '',
      description: '',
      isActive: true
    });
    setRoomErrors({});
    setSelectedRoom(undefined);
  };

  const handleRackModalClose = () => {
    setRackFormData({
      name: '',
      location: '',
      room: '',
      description: '',
      isActive: true
    });
    setRackErrors({});
    setSelectedRack(undefined);
  };

  const locationOptions = [
    { value: '', label: 'Select a location' },
    ...locations.map(location => ({
      value: location._id,
      label: location.name
    }))
  ];

  const roomOptions = [
    { value: '', label: roomFormData.location ? 'Select a room' : 'Select location first' },
    ...filteredRooms.map(room => ({
      value: room._id,
      label: room.name
    }))
  ];
  const roomOptionsFilter = [
    { value: '', label: 'Select a room'},
    ...rooms.map(room => ({
      value: room._id,
      label: room.name
    }))
  ];
  const rackOptionsFilter = [
    { value: '', label: 'Select a rack'},
    ...racks.map(room => ({
      value: room._id,
      label: room.name
    }))
  ];

// Extract unique departments
const uniqueDepts = Array.from(
  new Set(inventory.map(item => item.product?.dept).filter(Boolean))
) as string[];

const deptOptionsFilter = [
  { value: '', label: 'Select a department' },
  ...uniqueDepts.map(dept => ({
    value: dept,
    label: dept
  }))
];

// Extract unique brands
const uniqueBrands = Array.from(
  new Set(inventory.map(item => item.product?.brand).filter(Boolean))
) as string[];

const brandOptionsFilter = [
  { value: '', label: 'Select a brand' },
  ...uniqueBrands.map(brand => ({
    value: brand,
    label: brand
  }))
];


  useEffect(() => {
    if (selectedRoom) {
      setRoomFormData({
        name: selectedRoom.name,
        location: selectedRoom.location._id,
        description: selectedRoom.description || '',
        isActive: selectedRoom.isActive
      });
    } else {
      setRoomFormData({
        name: '',
        location: '',
        description: '',
        isActive: true
      });
    }
  }, [selectedRoom]);

  useEffect(() => {
    if (selectedRack) {
      setRackFormData({
        name: selectedRack.name,
        room: selectedRack.room._id,
        location: selectedRack.location._id,
        description: selectedRack.description || '',
        isActive: selectedRack.isActive
      });
    } else {
      setRackFormData({
        name: '',
        room: '',
        location: '',
        description: '',
        isActive: true
      });
    }
  }, [selectedRack]);

  const validateRoomForm = (): boolean => {
    const newErrors: any = {};

    if (!roomFormData.name.trim()) {
      newErrors.name = 'Room name is required';
    }
    if (!roomFormData.location) {
      newErrors.location = 'Location is required';
    }

    setRoomErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateRackForm = (): boolean => {
    const newErrors: any = {};

    if (!rackFormData.name.trim()) {
      newErrors.name = 'Rack name is required';
    }
    if (!rackFormData.location) {
      newErrors.location = 'Location is required';
    }
    if (!rackFormData.room) {
      newErrors.room = 'Room is required';
    }

    setRackErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRoomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRoomForm()) return;

    try {
      setLoading(true);
      if (selectedRoom) {
        // Update existing location
        const response = await apiClient.stock.updateRoom(selectedRoom._id, roomFormData);
        const updatedRoom = (response.data as any).room || response.data;
        setRooms(rooms.map(loc =>
          loc._id === selectedRoom._id ? updatedRoom : loc
        ));
      } else {
        // Create new location
        const response = await apiClient.stock.createRoom(roomFormData);
        const newRoom = (response.data as any).room || response.data;
        setRooms([...rooms, newRoom]);
      }

      // setShowLocationModal(false);
      setRoomFormData({
        name: '',
        location: '',
        description: '',
        isActive: true
      });
      // setIsEditingLocation(false);
      // setEditingLocationId(null);
    } catch (error) {
      setRoomErrors({ submit: 'Failed to save room. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateRackForm()) return;

    try {
      setLoading(true);
      if (selectedRack) {
        // Update existing location
        const response = await apiClient.stock.updateRack(selectedRack._id, rackFormData);
        const updatedRack = (response.data as any).rack || response.data;

        setRacks(racks.map(loc =>
          loc._id === selectedRack._id ? updatedRack : loc
        ));
        fetchRacks();
      } else {
        // Create new location
        const response = await apiClient.stock.createRack(rackFormData);
        const newRack = (response.data as any).rack || response.data;
        setRacks([...racks, newRack]);
      }

      // setShowLocationModal(false);
      setRackFormData({
        name: '',
        location: '',
        room: '',
        description: '',
        isActive: true
      });
      // setIsEditingLocation(false);
      // setEditingLocationId(null);
    } catch (error) {
      setRackErrors({ submit: 'Failed to save room. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Initialize data
  useEffect(() => {
    fetchAllData();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container')) {
        setShowLocationDropdown(false);
        setShowStatusDropdown(false);
        setShowCategoryDropdown(false);
        setShowLocationTypeDropdown(false);
        setShowToLocationDropdown(false);
        setShowAdjustmentTypeDropdown(false);
        setShowReservationTypeDropdown(false);
        setShowDateRangeDropdown(false);
        setShowTransactionTypeDropdown(false);
        setShowLedgerLocationDropdown(false);
        // Filter dropdowns
        setShowCategoryFilterDropdown(false);
        setShowDeptFilterDropdown(false);
        setShowBrandFilterDropdown(false);
        setShowLocationFilterDropdown(false);
        setShowRoomFilterDropdown(false);
        setShowRackFilterDropdown(false);
        setShowStockStatusFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Data fetching functions
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchInventory(),
        fetchProducts(),
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

  const fetchInventory = async () => {
    try {
      const response = await apiClient.stock.getStock();
      // Handle different response formats from backend
      let stockData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          stockData = response.data;
        } else if (response.data.stockLevels && Array.isArray(response.data.stockLevels)) {
          stockData = response.data.stockLevels;
        }
      }
      setInventory(stockData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setInventory([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll();
      // Handle response format like in ProductManagement
      let productsData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          productsData = response.data;
        } else if ((response.data as any).products && Array.isArray((response.data as any).products)) {
          productsData = (response.data as any).products;
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


      // const roomsInLocation = roomsData.filter(room => room.location._id === racks.location._id);
      // setFilteredRooms(roomsInLocation);
      setRooms(roomsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setRooms([]);
    }
  };

  useEffect(() => {
    if (rackFormData.location) {
      const roomsInLocation = rooms.filter(room => room.location._id === rackFormData.location);
      setFilteredRooms(roomsInLocation);

      // Reset room selection if current room is not in the selected location
      if (rackFormData.room && !roomsInLocation.find(room => room._id === rackFormData.room)) {
        setRackFormData(prev => ({ ...prev, room: '' }));
      }
    } else {
      setFilteredRooms([]);
      setRackFormData(prev => ({ ...prev, room: '' }));
    }
  }, [rackFormData.location, rooms]);

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

  const handleCreateLocation = () => {
    setLocationFormData({
      name: '',
      address: '',
      type: 'warehouse',
      contactPerson: '',
      phone: ''
    });
    setIsEditingLocation(false);
    setEditingLocationId(null);
    setFormErrors({});
    setShowLocationTypeDropdown(false);
    setShowLocationModal(true);
  };

  const handleEditLocation = (location: StockLocationData) => {
    setLocationFormData({
      name: location.name,
      address: location.address,
      type: location.type,
      contactPerson: location.contactPerson || '',
      phone: location.phone || ''
    });
    setIsEditingLocation(true);
    setEditingLocationId(location._id);
    setFormErrors({});
    setShowLocationTypeDropdown(false);
    setShowLocationModal(true);
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.stock.deleteLocation(locationId);
      setLocations(locations.filter(loc => loc._id !== locationId));
      // Also refresh inventory since location might be used in stock items
      await fetchInventory();
    } catch (error: any) {
      console.error('Error deleting location:', error);
      alert(error.response?.data?.message || 'Failed to delete location');
    }
  };

  const handleUpdateStock = (stockItem: StockItem) => {
    setSelectedItem(stockItem);
    setAdjustmentFormData({
      product: typeof stockItem.product === 'string' ? stockItem.product : stockItem.product._id,
      location: typeof stockItem.location === 'string' ? stockItem.location : stockItem.location._id,
      adjustmentType: 'add',
      quantity: 1,
      reason: '',
      notes: '',
      reservationType: 'service',
      referenceId: '',
      reservedUntil: ''
    });
    setFormErrors({});
    setShowAdjustmentTypeDropdown(false);
    setShowAdjustmentModal(true);
  };

  const handleTransferStock = (stockItem: StockItem) => {
    setSelectedItem(stockItem); // Store the selected item for access to stock details

    // Calculate available quantity and set reasonable default
    const availableQty = stockItem.availableQuantity || (stockItem.quantity - (stockItem.reservedQuantity || 0));
    const defaultQty = availableQty <= 10 ? availableQty : 1;

    setTransferFormData({
      product: typeof stockItem.product === 'string' ? stockItem.product : stockItem.product._id,
      fromLocation: typeof stockItem.location === 'string' ? stockItem.location : stockItem.location._id,
      fromRoom: stockItem.room?._id || '',
      fromRack: stockItem.rack?._id || '',
      toLocation: '',
      toRoom: '',
      toRack: '',
      quantity: Math.max(1, defaultQty), // Ensure at least 1
      notes: ''
    });
    setFormErrors({});
    setShowToLocationDropdown(false);
    setShowTransferModal(true);
  };

  const validateLocationForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!locationFormData.name.trim()) {
      errors.name = 'Location name is required';
    }
    if (!locationFormData.address.trim()) {
      errors.address = 'Address is required';
    }
    if (!locationFormData.type) {
      errors.type = 'Location type is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitLocation = async () => {
    if (!validateLocationForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});

      if (isEditingLocation && editingLocationId) {
        // Update existing location
        const response = await apiClient.stock.updateLocation(editingLocationId, locationFormData);
        const updatedLocation = (response.data as any).location || response.data;
        setLocations(locations.map(loc =>
          loc._id === editingLocationId ? updatedLocation : loc
        ));
      } else {
        // Create new location
        const response = await apiClient.stock.createLocation(locationFormData);
        const newLocation = (response.data as any).location || response.data;
        setLocations([...locations, newLocation]);
      }

      setShowLocationModal(false);
      setLocationFormData({
        name: '',
        address: '',
        type: 'warehouse',
        contactPerson: '',
        phone: ''
      });
      setIsEditingLocation(false);
      setEditingLocationId(null);
    } catch (error: any) {
      console.error('Error saving location:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: isEditingLocation ? 'Failed to update location' : 'Failed to create location' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const validateStockForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!adjustmentFormData.product) {
      errors.product = 'Product is required';
    }
    if (!adjustmentFormData.location) {
      errors.location = 'Location is required';
    }
    if (!adjustmentFormData.adjustmentType) {
      errors.adjustmentType = 'Adjustment type is required';
    }

    // Quantity validation based on adjustment type
    if (adjustmentFormData.adjustmentType === 'set') {
      if (adjustmentFormData.quantity < 0) {
        errors.quantity = 'Stock level cannot be negative';
      }
    } else if (adjustmentFormData.adjustmentType === 'subtract') {
      if (adjustmentFormData.quantity <= 0) {
        errors.quantity = 'Quantity must be greater than 0';
      } else if (selectedItem && adjustmentFormData.quantity > selectedItem.quantity) {
        errors.quantity = `Cannot subtract more than current stock (${selectedItem.quantity})`;
      }
    } else if (adjustmentFormData.adjustmentType === 'reserve') {
      if (adjustmentFormData.quantity <= 0) {
        errors.quantity = 'Quantity must be greater than 0';
      } else if (selectedItem && adjustmentFormData.quantity > (selectedItem.availableQuantity || (selectedItem.quantity - selectedItem.reservedQuantity))) {
        const availableQty = selectedItem.availableQuantity || (selectedItem.quantity - selectedItem.reservedQuantity);
        errors.quantity = `Cannot reserve more than available stock (${availableQty})`;
      }
      if (!adjustmentFormData.reservationType) {
        errors.reservationType = 'Reservation type is required';
      }
    } else if (adjustmentFormData.adjustmentType === 'release') {
      if (adjustmentFormData.quantity <= 0) {
        errors.quantity = 'Quantity must be greater than 0';
      } else if (selectedItem && adjustmentFormData.quantity > selectedItem.reservedQuantity) {
        errors.quantity = `Cannot release more than reserved stock (${selectedItem.reservedQuantity})`;
      }
    } else if (adjustmentFormData.adjustmentType === 'add') {
      if (adjustmentFormData.quantity <= 0) {
        errors.quantity = 'Quantity must be greater than 0';
      }
    } else {
      if (adjustmentFormData.quantity <= 0) {
        errors.quantity = 'Quantity must be greater than 0';
      }
    }

    if (!adjustmentFormData.reason.trim()) {
      errors.reason = 'Reason is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateTransferForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!transferFormData.product) {
      errors.product = 'Product is required';
    }
    if (!transferFormData.fromLocation) {
      errors.fromLocation = 'Source location is required';
    }
    if (!transferFormData.toLocation) {
      errors.toLocation = 'Destination location is required';
    }
    
    // Check if transfer is to exact same location/room/rack
    if (transferFormData.fromLocation === transferFormData.toLocation &&
        transferFormData.fromRoom === transferFormData.toRoom &&
        transferFormData.fromRack === transferFormData.toRack) {
      errors.toLocation = 'Destination must be different from source (location, room, or rack)';
    }
    
    if (transferFormData.quantity <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }

    // Check available quantity
    if (selectedItem) {
      const availableQty = selectedItem.availableQuantity || (selectedItem.quantity - (selectedItem.reservedQuantity || 0));
      if (transferFormData.quantity > availableQty) {
        errors.quantity = `Cannot transfer more than available quantity (${availableQty})`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitStock = async () => {
    if (!validateStockForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      const { product, location, adjustmentType, quantity, reason, notes, reservationType, referenceId, reservedUntil } = adjustmentFormData;

      const adjustmentData: any = {
        product,
        location,
        adjustmentType,
        quantity,
        reason,
        notes
      };

      // Add reservation-specific fields when needed
      if (adjustmentType === 'reserve') {
        adjustmentData.reservationType = reservationType;
        if (referenceId) adjustmentData.referenceId = referenceId;
        if (reservedUntil) adjustmentData.reservedUntil = reservedUntil;
      }

      await apiClient.stock.adjustStock(adjustmentData);
      await fetchInventory(); // Refresh inventory
      setShowAdjustmentModal(false);
      setAdjustmentFormData({
        product: '',
        location: '',
        adjustmentType: 'add',
        quantity: 0,
        reason: '',
        notes: '',
        reservationType: 'service',
        referenceId: '',
        reservedUntil: ''
      });
    } catch (error: any) {
      console.error('Error updating stock:', error);
      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        setFormErrors({ general: 'Failed to adjust stock' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getCurrentStockStatus = async (productId: string, locationId: string) => {
    try {
      const response = await apiClient.stock.getStock({ product: productId, location: locationId });
      let stockData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          stockData = response.data;
        } else if (response.data.stockLevels && Array.isArray(response.data.stockLevels)) {
          stockData = response.data.stockLevels;
        }
      }
      return stockData.length > 0 ? stockData[0] : null;
    } catch (error) {
      console.error('Error fetching current stock status:', error);
      return null;
    }
  };

  const handleSubmitTransfer = async () => {
    if (!validateTransferForm()) return;

    setSubmitting(true);
    try {
      setFormErrors({});
      const { product, fromLocation, fromRoom, fromRack, toLocation, toRoom, toRack, quantity, notes } = transferFormData;

      // Get fresh stock data before transfer
      const currentStock = await getCurrentStockStatus(product, fromLocation);

      if (currentStock) {
        const availableQuantity = currentStock.availableQuantity || (currentStock.quantity - (currentStock.reservedQuantity || 0));

        // Validate available quantity
        if (quantity > availableQuantity) {
          setFormErrors({
            quantity: `Insufficient stock. Available: ${availableQuantity}, Requested: ${quantity}`
          });
          setSelectedItem(currentStock);
          return;
        }
      } else {
        setFormErrors({ general: 'Could not verify current stock levels. Please refresh and try again.' });
        return;
      }

      // Prepare transfer data with room and rack info
      const transferData: any = {
        product,
        fromLocation,
        toLocation,
        quantity,
        notes
      };

      // Add room and rack data if provided
      if (fromRoom) transferData.fromRoom = fromRoom;
      if (fromRack) transferData.fromRack = fromRack;
      if (toRoom) transferData.toRoom = toRoom;
      if (toRack) transferData.toRack = toRack;

      // Send transfer request
      await apiClient.stock.transferStock(transferData);

      await fetchInventory(); // Refresh inventory
      setShowTransferModal(false);
      setTransferFormData({
        product: '',
        fromLocation: '',
        fromRoom: '',
        fromRack: '',
        toLocation: '',
        toRoom: '',
        toRack: '',
        quantity: 0,
        notes: ''
      });
    } catch (error: any) {
      console.error('Error transferring stock:', error);

      if (error.response?.data?.errors) {
        setFormErrors(error.response.data.errors);
      } else {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to transfer stock';
        setFormErrors({ general: errorMessage });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const viewStockHistory = async (item: StockItem) => {
    setSelectedItem(item);
    try {
      const productId = typeof item.product === 'string' ? item.product : item.product._id;
      const locationId = typeof item.location === 'string' ? item.location : item.location._id;

      const response = await apiClient.stockLedger.getByProduct(productId, locationId, {
        sort: '-transactionDate',
        limit: 50
      });

      const transactions = response.data.ledgers.map((ledger: any) => ({
        _id: ledger._id,
        type: ledger.transactionType,
        quantity: ledger.quantity,
        date: ledger.transactionDate,
        reason: ledger.reason || getTransactionReason(ledger.referenceType),
        user: ledger.performedBy?.firstName && ledger.performedBy?.lastName
          ? `${ledger.performedBy.firstName} ${ledger.performedBy.lastName}`
          : 'System',
        reference: ledger.referenceId,
        referenceType: ledger.referenceType,
        notes: ledger.notes,
        resultingQuantity: ledger.resultingQuantity
      }));

      setStockTransactions(transactions);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error fetching stock history:', error);
      setStockTransactions([]);
      setShowHistoryModal(true);
    }
  };

  const getTransactionReason = (referenceType: string): string => {
    switch (referenceType) {
      case 'adjustment': return 'Stock Adjustment';
      case 'transfer': return 'Stock Transfer';
      case 'reservation': return 'Stock Reservation';
      case 'purchase_order': return 'Purchase Order';
      case 'service_ticket': return 'Service Ticket';
      case 'sale': return 'Sale';
      default: return 'System Transaction';
    }
  };

  const fetchStockLedger = async (page = 1, resetData = false) => {
    try {
      setLoading(true);
      const params = {
        page: page.toString(),
        limit: ledgerPagination.limit.toString(),
        sort: '-transactionDate',
        ...(ledgerFilters.search && { search: ledgerFilters.search }),
        ...(ledgerFilters.location && { location: ledgerFilters.location }),
        ...(ledgerFilters.transactionType && { transactionType: ledgerFilters.transactionType }),
        ...(ledgerFilters.dateRange && { dateRange: ledgerFilters.dateRange })
      };

      const response = await apiClient.stockLedger.getAll(params);

      const formattedLedger = response.data.ledgers.map((ledger: any) => ({
        _id: ledger._id,
        product: ledger.product,
        location: ledger.location,
        transactionType: ledger.transactionType,
        quantity: ledger.quantity,
        resultingQuantity: ledger.resultingQuantity,
        reason: ledger.reason || getTransactionReason(ledger.referenceType),
        notes: ledger.notes,
        referenceId: ledger.referenceId,
        referenceType: ledger.referenceType,
        transactionDate: ledger.transactionDate,
        performedBy: ledger.performedBy
      }));

      if (resetData) {
        setStockLedgerData(formattedLedger);
      } else {
        setStockLedgerData(prev => [...prev, ...formattedLedger]);
      }

      setLedgerPagination({
        page: response.pagination.page,
        limit: response.pagination.limit,
        total: response.pagination.total,
        pages: response.pagination.pages
      });

      // Calculate summary statistics
      if (resetData) {
        const summary = formattedLedger.reduce((acc, ledger) => {
          const quantity = Math.abs(ledger.quantity);

          if (ledger.transactionType === 'inward') {
            acc.totalInward += quantity;
          } else if (ledger.transactionType === 'outward') {
            acc.totalOutward += quantity;
          }

          acc.totalTransactions += 1;
          return acc;
        }, {
          totalInward: 0,
          totalOutward: 0,
          totalTransactions: 0,
          netMovement: 0
        });

        summary.netMovement = summary.totalInward - summary.totalOutward;
        setLedgerSummary(summary);
      }
    } catch (error) {
      console.error('Error fetching stock ledger:', error);
      setStockLedgerData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShowStockLedger = () => {
    setLedgerFilters({ search: '', location: '', transactionType: '', dateRange: '30' });
    setLedgerPagination(prev => ({ ...prev, page: 1 }));
    setShowLedgerModal(true);
    fetchStockLedger(1, true);
  };

  const getStockStatus = (item: StockItem) => {
    const product = typeof item.product === 'object' ? item.product : null;
    if (!product) return 'unknown';

    if (item.quantity <= 0) return 'out_of_stock';
    if (item.quantity <= product.minStockLevel) return 'low_stock';
    return 'in_stock';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'text-green-800 bg-green-100';
      case 'low_stock':
        return 'text-yellow-800 bg-yellow-100';
      case 'out_of_stock':
        return 'text-red-800 bg-red-100';
      default:
        return 'text-gray-800 bg-gray-100';
    }
  };

  const columns: TableColumn[] = [
    {
      key: 'product',
      title: 'Product',
      render: (value) => (
        <div>
          <div className="font-medium">{typeof value === 'object' ? value.name : value}</div>
          <div className="text-xs text-gray-500">{typeof value === 'object' ? value.category : ''}</div>
        </div>
      )
    },
    {
      key: 'location',
      title: 'Location',
      render: (value) => (
        <span>{typeof value === 'object' ? value.name : value}</span>
      )
    },
    {
      key: 'quantity',
      title: 'Available',
      render: (value, record) => (
        <div className="text-center">
          <div className="font-bold text-lg">{value}</div>
          <div className="text-xs text-gray-500">Reserved: {record.reservedQuantity}</div>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (value, record) => {
        const status = getStockStatus(record);
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {/* {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} */}
          </span>
        );
      }
    },
    {
      key: 'lastUpdated',
      title: 'Last Updated',
      render: (value) => new Date(value).toLocaleDateString()
    }
  ];

  const locationFields: FormField[] = [
    {
      name: 'name',
      label: 'Location Name',
      type: 'text',
      required: true
    },
    {
      name: 'address',
      label: 'Address',
      type: 'textarea',
      required: true
    },
    {
      name: 'type',
      label: 'Location Type',
      type: 'select',
      required: true,
      options: [
        { value: 'warehouse', label: 'Warehouse' },
        { value: 'store', label: 'Store' },
        { value: 'main_office', label: 'Main Office' },
        { value: 'service_center', label: 'Service Center' }
      ]
    },
    {
      name: 'contactPerson',
      label: 'Contact Person',
      type: 'text',
      required: true
    },
    {
      name: 'phone',
      label: 'Contact Phone',
      type: 'tel',
      required: true
    },
    {
      name: 'capacity',
      label: 'Storage Capacity',
      type: 'number',
      required: true
    }
  ];

  const stockFields: FormField[] = [
    {
      name: 'adjustmentType',
      label: 'Adjustment Type',
      type: 'select',
      required: true,
      options: [
        { value: 'inward', label: 'Stock In' },
        { value: 'outward', label: 'Stock Out' },
        { value: 'adjustment', label: 'Stock Adjustment' },
        { value: 'transfer', label: 'Stock Transfer' }
      ]
    },
    {
      name: 'adjustmentQuantity',
      label: 'Quantity',
      type: 'number',
      required: true
    },
    {
      name: 'notes',
      label: 'Notes',
      type: 'textarea',
      required: false
    }
  ];

  const stats = [
    {
      title: 'Total Products',
      value: Array.isArray(inventory) ? inventory.length.toString() : '0',
      icon: <Package className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Low Stock Items',
      value: Array.isArray(inventory) ? inventory.filter(item => getStockStatus(item) === 'low_stock').length.toString() : '0',
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'yellow'
    },
    {
      title: 'Out of Stock',
      value: Array.isArray(inventory) ? inventory.filter(item => getStockStatus(item) === 'out_of_stock').length.toString() : '0',
      icon: <TrendingDown className="w-6 h-6" />,
      color: 'red'
    },
    {
      title: 'Total Locations',
      value: Array.isArray(locations) ? locations.length.toString() : '0',
      icon: <Truck className="w-6 h-6" />,
      color: 'green'
    }
  ];

  // Category options with labels
  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'genset', label: 'Generator Set' },
    { value: 'spare_part', label: 'Spare Part' },
    { value: 'accessory', label: 'Accessory' }
  ];

  const getCategoryLabel = (value: string) => {
    const option = categoryOptions.find(opt => opt.value === value);
    return option ? option.label : 'All Categories';
  };

  // Location type options with labels
  const locationTypeOptions = [
    { value: 'warehouse', label: 'Warehouse' },
    { value: 'main_office', label: 'Main Office' },
    { value: 'service_center', label: 'Service Center' }
  ];

  const getLocationTypeLabel = (value: string) => {
    const option = locationTypeOptions.find(opt => opt.value === value);
    return option ? option.label : 'Select Type';
  };

  const getToLocationLabel = (value: string) => {
    if (!value) return 'Select destination location';
    const location = locations.find(loc => loc._id === value);
    return location ? location.name : 'Select destination location';
  };

  // Adjustment type options with descriptions
  const adjustmentTypeOptions = [
    {
      value: 'add',
      label: 'Add Stock',
      description: 'Increase stock quantity',
      icon: '➕',
      color: 'text-green-600'
    },
    {
      value: 'subtract',
      label: 'Remove Stock',
      description: 'Decrease stock quantity',
      icon: '➖',
      color: 'text-red-600'
    },
    {
      value: 'set',
      label: 'Set Stock Level',
      description: 'Set exact stock quantity',
      icon: '🎯',
      color: 'text-blue-600'
    },
    {
      value: 'reserve',
      label: 'Reserve Stock',
      description: 'Reserve stock for orders/services',
      icon: '🔒',
      color: 'text-orange-600'
    },
    {
      value: 'release',
      label: 'Release Reserved Stock',
      description: 'Release previously reserved stock',
      icon: '🔓',
      color: 'text-purple-600'
    }
  ];

  const getAdjustmentTypeLabel = (value: string) => {
    const option = adjustmentTypeOptions.find(opt => opt.value === value);
    return option ? option.label : 'Select adjustment type';
  };

  // Reservation type options
  const reservationTypeOptions = [
    { value: 'service', label: 'Service/Maintenance' },
    { value: 'sale', label: 'Sale/Order' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'other', label: 'Other' }
  ];

  const getReservationTypeLabel = (value: string) => {
    const option = reservationTypeOptions.find(opt => opt.value === value);
    return option ? option.label : 'Select reservation type';
  };

  const calculateResultingQuantity = () => {
    if (!selectedItem || !adjustmentFormData.quantity) return selectedItem?.quantity || 0;

    const currentQty = selectedItem.quantity;
    const currentReserved = selectedItem.reservedQuantity;
    const adjustQty = adjustmentFormData.quantity;

    switch (adjustmentFormData.adjustmentType) {
      case 'add':
        return currentQty + adjustQty;
      case 'subtract':
        return Math.max(0, currentQty - adjustQty);
      case 'set':
        return adjustQty;
      case 'reserve':
        return { quantity: currentQty, reserved: currentReserved + adjustQty };
      case 'release':
        return { quantity: currentQty, reserved: Math.max(0, currentReserved - adjustQty) };
      default:
        return currentQty;
    }
  };

  const getResultDisplayValue = () => {
    const result = calculateResultingQuantity();
    if (adjustmentFormData.adjustmentType === 'reserve' || adjustmentFormData.adjustmentType === 'release') {
      return typeof result === 'object' ? result.reserved : selectedItem?.reservedQuantity || 0;
    }
    return typeof result === 'number' ? result : selectedItem?.quantity || 0;
  };

  // Stock Ledger filter helper functions
  const getDateRangeLabel = (value: string) => {
    const options = [
      { value: '7', label: 'Last 7 days' },
      { value: '30', label: 'Last 30 days' },
      { value: '90', label: 'Last 3 months' },
      { value: '365', label: 'Last year' },
      { value: '', label: 'All time' }
    ];
    return options.find(opt => opt.value === value)?.label || 'Last 30 days';
  };

  const getTransactionTypeLabel = (value: string) => {
    const options = [
      { value: '', label: 'All Types' },
      { value: 'inward', label: 'Inward (Purchase)' },
      { value: 'outward', label: 'Outward (Sale)' },
      { value: 'transfer', label: 'Transfer (Location/Room/Rack)' },
      { value: 'adjustment', label: 'Adjustment' },
      { value: 'reservation', label: 'Reservation' },
      { value: 'release', label: 'Release' }
    ];
    return options.find(opt => opt.value === value)?.label || 'All Types';
  };

  const getLedgerLocationLabel = (value: string) => {
    if (!value) return 'All Locations';
    const location = locations.find(loc => loc._id === value);
    return location ? location.name : 'All Locations';
  };

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Custom dropdown states for filters
  const [showCategoryFilterDropdown, setShowCategoryFilterDropdown] = useState(false);
  const [showDeptFilterDropdown, setShowDeptFilterDropdown] = useState(false);
  const [showBrandFilterDropdown, setShowBrandFilterDropdown] = useState(false);
  const [showLocationFilterDropdown, setShowLocationFilterDropdown] = useState(false);
  const [showRoomFilterDropdown, setShowRoomFilterDropdown] = useState(false);
  const [showRackFilterDropdown, setShowRackFilterDropdown] = useState(false);
  const [showStockStatusFilterDropdown, setShowStockStatusFilterDropdown] = useState(false);

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      <PageHeader
        title="Inventory Management"
        subtitle="Track and manage stock across all locations"
      >
        <div className="flex space-x-3">
          <button
            onClick={handleCreateLocation}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <MapPin className="w-4 h-4" />
            <span className="text-sm">Add Location</span>
          </button>
          <button
            onClick={handleShowStockLedger}
            className="bg-gradient-to-r from-orange-600 to-orange-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-orange-700 hover:to-orange-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Package className="w-4 h-4" />
            <span className="text-sm">Stock Ledger</span>
          </button>
          <button
            onClick={fetchAllData}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </PageHeader>

      {/* Stats */}
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

      {/* Redesigned Search & Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        {/* Primary Search Bar */}
        <div className="p-3 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Main Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by product name, part number, brand, or location..."
                value={filters.search}
                onChange={(e) => onFiltersChange({ search: e.target.value })}
                className="pl-9 text-sm h-9"
              />
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onFiltersChange({ stockStatus: 'out_of_stock' })}
                className="px-3 py-1.5 bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors border border-red-200 text-xs font-medium"
              >
                Out of Stock
              </button>
              <button
                onClick={() => onFiltersChange({ stockStatus: 'low_stock' })}
                className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 transition-colors border border-yellow-200 text-xs font-medium"
              >
                Low Stock
              </button>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors border border-blue-200 text-xs font-medium flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Filters - Collapsible */}
        {showAdvancedFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                             {/* Product Filters */}
               <div className="space-y-3">
                 <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                   <Package className="w-4 h-4 mr-2 text-blue-500" />
                   Product Filters
                 </h4>
                 <div className="space-y-3">
                   {/* Category Dropdown */}
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                     <div className="relative dropdown-container">
                       <button
                         onClick={() => setShowCategoryFilterDropdown(!showCategoryFilterDropdown)}
                         className="flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                       >
                         <span className="text-gray-700 truncate mr-1">
                           {categoryOptions.find(opt => opt.value === (filters.category || ''))?.label || 'All Categories'}
                         </span>
                         <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showCategoryFilterDropdown ? 'rotate-180' : ''}`} />
                       </button>
                       {showCategoryFilterDropdown && (
                         <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                           {categoryOptions.map((option) => (
                             <button
                               key={option.value}
                               onClick={() => {
                                 onFiltersChange({ category: option.value === 'all' ? '' : option.value });
                                 setShowCategoryFilterDropdown(false);
                               }}
                               className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${
                                 (filters.category || 'all') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                               }`}
                             >
                               {option.label}
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>

                   {/* Department Dropdown */}
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                     <div className="relative dropdown-container">
                       <button
                         onClick={() => setShowDeptFilterDropdown(!showDeptFilterDropdown)}
                         className="flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                       >
                         <span className="text-gray-700 truncate mr-1">
                           {deptOptionsFilter.find(opt => opt.value === (filters.dept || ''))?.label || 'Select a department'}
                         </span>
                         <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showDeptFilterDropdown ? 'rotate-180' : ''}`} />
                       </button>
                       {showDeptFilterDropdown && (
                         <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                           {deptOptionsFilter.map((option) => (
                             <button
                               key={option.value}
                               onClick={() => {
                                 onFiltersChange({ dept: option.value });
                                 setShowDeptFilterDropdown(false);
                               }}
                               className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${
                                 (filters.dept || '') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                               }`}
                             >
                               {option.label}
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>

                   {/* Brand Dropdown */}
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                     <div className="relative dropdown-container">
                       <button
                         onClick={() => setShowBrandFilterDropdown(!showBrandFilterDropdown)}
                         className="flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                       >
                         <span className="text-gray-700 truncate mr-1">
                           {brandOptionsFilter.find(opt => opt.value === (filters.brand || ''))?.label || 'Select a brand'}
                         </span>
                         <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showBrandFilterDropdown ? 'rotate-180' : ''}`} />
                       </button>
                       {showBrandFilterDropdown && (
                         <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                           {brandOptionsFilter.map((option) => (
                             <button
                               key={option.value}
                               onClick={() => {
                                 onFiltersChange({ brand: option.value });
                                 setShowBrandFilterDropdown(false);
                               }}
                               className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${
                                 (filters.brand || '') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
               </div>

                             {/* Location Filters */}
               <div className="space-y-3">
                 <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                   <MapPin className="w-4 h-4 mr-2 text-green-500" />
                   Location Hierarchy
                 </h4>
                 <div className="space-y-3">
                   {/* Location Dropdown */}
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                     <div className="relative dropdown-container">
                       <button
                         onClick={() => setShowLocationFilterDropdown(!showLocationFilterDropdown)}
                         className="flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                       >
                         <span className="text-gray-700 truncate mr-1">
                           {locationOptions.find(opt => opt.value === (filters.location || ''))?.label || 'Select a location'}
                         </span>
                         <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showLocationFilterDropdown ? 'rotate-180' : ''}`} />
                       </button>
                       {showLocationFilterDropdown && (
                         <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                           {locationOptions.map((option) => (
                             <button
                               key={option.value}
                               onClick={() => {
                                 onFiltersChange({ location: option.value, room: '', rack: '' }); // Reset dependent filters
                                 setShowLocationFilterDropdown(false);
                               }}
                               className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${
                                 (filters.location || '') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                               }`}
                             >
                               {option.label}
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>

                   {/* Room Dropdown */}
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                     <div className="relative dropdown-container">
                       <button
                         onClick={() => !filters.location ? null : setShowRoomFilterDropdown(!showRoomFilterDropdown)}
                         disabled={!filters.location}
                         className={`flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md transition-colors text-sm ${
                           !filters.location 
                             ? 'cursor-not-allowed bg-gray-50 text-gray-400' 
                             : 'hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                         }`}
                       >
                         <span className="truncate mr-1">
                           {!filters.location 
                             ? 'Select location first'
                             : roomOptionsFilter.find(opt => opt.value === (filters.room || ''))?.label || 'Select a room'
                           }
                         </span>
                         <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showRoomFilterDropdown ? 'rotate-180' : ''}`} />
                       </button>
                       {showRoomFilterDropdown && filters.location && (
                         <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                           {roomOptionsFilter.map((option) => (
                             <button
                               key={option.value}
                               onClick={() => {
                                 onFiltersChange({ room: option.value, rack: '' }); // Reset dependent filter
                                 setShowRoomFilterDropdown(false);
                               }}
                               className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${
                                 (filters.room || '') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                               }`}
                             >
                               {option.label}
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>

                   {/* Rack Dropdown */}
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Rack</label>
                     <div className="relative dropdown-container">
                       <button
                         onClick={() => !filters.room ? null : setShowRackFilterDropdown(!showRackFilterDropdown)}
                         disabled={!filters.room}
                         className={`flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md transition-colors text-sm ${
                           !filters.room 
                             ? 'cursor-not-allowed bg-gray-50 text-gray-400' 
                             : 'hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                         }`}
                       >
                         <span className="truncate mr-1">
                           {!filters.room 
                             ? 'Select room first'
                             : rackOptionsFilter.find(opt => opt.value === (filters.rack || ''))?.label || 'Select a rack'
                           }
                         </span>
                         <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showRackFilterDropdown ? 'rotate-180' : ''}`} />
                       </button>
                       {showRackFilterDropdown && filters.room && (
                         <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                           {rackOptionsFilter.map((option) => (
                             <button
                               key={option.value}
                               onClick={() => {
                                 onFiltersChange({ rack: option.value });
                                 setShowRackFilterDropdown(false);
                               }}
                               className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${
                                 (filters.rack || '') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
               </div>

                             {/* Stock Status & Actions */}
               <div className="space-y-3">
                 <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                   <BarChart3 className="w-4 h-4 mr-2 text-purple-500" />
                   Stock Status
                 </h4>
                 <div className="space-y-3">
                   {/* Stock Level Dropdown */}
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Stock Level</label>
                     <div className="relative dropdown-container">
                       <button
                         onClick={() => setShowStockStatusFilterDropdown(!showStockStatusFilterDropdown)}
                         className="flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                       >
                         <span className="text-gray-700 truncate mr-1">
                           {stockStatusOptions.find(opt => opt.value === filters.stockStatus)?.label || 'All Stock Levels'}
                         </span>
                         <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showStockStatusFilterDropdown ? 'rotate-180' : ''}`} />
                       </button>
                       {showStockStatusFilterDropdown && (
                         <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                           {stockStatusOptions.map((option) => (
                             <button
                               key={option.value}
                               onClick={() => {
                                 onFiltersChange({ stockStatus: option.value });
                                 setShowStockStatusFilterDropdown(false);
                               }}
                               className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${
                                 filters.stockStatus === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                               }`}
                             >
                               {option.label}
                             </button>
                           ))}
                         </div>
                       )}
                     </div>
                   </div>

                   <div className="pt-2">
                     <button
                       onClick={() => {
                         onFiltersChange({
                           search: '',
                           category: '',
                           dept: '',
                           brand: '',
                           location: '',
                           room: '',
                           rack: '',
                           stockStatus: 'all'
                         });
                         setShowAdvancedFilters(false);
                         // Close all filter dropdowns
                         setShowCategoryFilterDropdown(false);
                         setShowDeptFilterDropdown(false);
                         setShowBrandFilterDropdown(false);
                         setShowLocationFilterDropdown(false);
                         setShowRoomFilterDropdown(false);
                         setShowRackFilterDropdown(false);
                         setShowStockStatusFilterDropdown(false);
                       }}
                       className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                     >
                       Clear All Filters
                     </button>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* Active Filters & Results Summary - Only show when filters are active */}
        {(filters.search || filters.category || filters.dept || filters.brand || filters.location || filters.room || filters.rack || filters.stockStatus !== 'all') && (
          <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">{filteredInventory.length}</span>
              <span className="mx-1">of</span>
              <span>{inventory.length}</span>
              <span className="ml-1">items found</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Active filters:</span>
              
              {filters.search && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  "{filters.search}"
                  <button
                    onClick={() => onFiltersChange({ search: '' })}
                    className="ml-1 text-blue-600 hover:text-blue-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
              
              {filters.category && (
                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {filters.category}
                  <button
                    onClick={() => onFiltersChange({ category: '' })}
                    className="ml-1 text-green-600 hover:text-green-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
              
              {filters.dept && (
                <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                  {filters.dept}
                  <button
                    onClick={() => onFiltersChange({ dept: '' })}
                    className="ml-1 text-purple-600 hover:text-purple-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
              
              {filters.location && (
                <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                  {locations.find(l => l._id === filters.location)?.name}
                  <button
                    onClick={() => onFiltersChange({ location: '' })}
                    className="ml-1 text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
              
              {filters.stockStatus !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                  {stockStatusOptions.find(s => s.value === filters.stockStatus)?.label}
                  <button
                    onClick={() => onFiltersChange({ stockStatus: 'all' })}
                    className="ml-1 text-orange-600 hover:text-orange-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed min-w-[1100px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-72">
                  Product Details
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                  Stock Levels
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                  Pricing
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-36">
                  Status & Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                  Technical Info
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">Loading inventory...</td>
                </tr>
              ) : paginatedInventory.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">No inventory items found</td>
                </tr>
              ) : (
                paginatedInventory.map((item, idx) => {
                  const status = getStockStatusTable(item);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={item._id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 w-72">
                        <div className="flex items-start">
                          <Package className="w-4 h-4 text-gray-400 mr-2 mt-1 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {item.product?.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.product?.partNo}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {item.product?.brand} • {item.product?.category}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 w-40">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <Building className="w-3 h-3 text-blue-500 mr-1" />
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {item.location?.name || <span className="text-red-500">Unassigned</span>}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Archive className="w-3 h-3 text-green-500 mr-1" />
                            <span className="text-xs text-gray-700 truncate">
                              {item.room?.name || <span className="text-red-500">Unassigned</span>}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="w-3 h-3 text-purple-500 mr-1" />
                            <span className="text-xs text-gray-600 truncate">
                              {item.rack?.name || <span className="text-red-500">Unassigned</span>}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 w-36">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Current:</span>
                            <span className="text-sm font-bold text-gray-900">{item.quantity}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Reserved:</span>
                            <span className="text-xs text-orange-600 font-medium">{item.reservedQuantity || 0}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Available:</span>
                            <span className="text-xs text-green-600 font-medium">{item.availableQuantity}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Stock Unit:</span>
                            <span className="text-xs text-green-600 font-medium">{item.product?.stockUnit}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 w-28">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-gray-900">
                            ₹{item.product?.price || 0}
                          </div>
                          <div className="text-xs text-gray-400">
                            GST: {item.product?.gst}%
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 w-36">
                        <div className="space-y-2">
                          <Badge variant={status.variant}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                          <div>
                            <Badge variant="default" size="sm">
                              {item.product?.dept}
                            </Badge>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 w-32">
                        <div className="space-y-1 text-xs text-gray-500">
                          <div>
                            HSN: {item.product?.hsnNumber}
                          </div>
                          <div>
                            {new Date(item?.lastUpdated).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {item.product?.productType2}
                          </div>
                        </div>
                      </td>
                         <td className="px-4 py-4 w-20 whitespace-nowrap text-sm font-medium">
                         <div className="flex items-center justify-center space-x-1">
                           <button
                            onClick={() => handleUpdateStock(item)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Adjust Stock"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => viewStockHistory(item)}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="View History"
                          >
                            <Package className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleTransferStock(item)}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                            title="Transfer Stock"
                          >
                            <ArrowUpDown className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>


        </div>
      </div>

      {/* Add Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[1200px] h-[600px] m-4 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditingLocation ? 'Edit Location' : 'Manage Stock Locations'}
              </h2>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setShowLocationTypeDropdown(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-1">
              {/* Left side - Location Form */}

              <div className="w-1/2 border-r border-gray-200 flex flex-col">
                {activeTab === 'locations' && <div className="p-4 overflow-y-auto flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {isEditingLocation ? 'Edit Location' : 'Add New Location'}
                  </h3>

                  <form onSubmit={(e) => { e.preventDefault(); handleSubmitLocation(); }} className="space-y-3">
                    {formErrors.general && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-red-600 text-sm">{formErrors.general}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={locationFormData.name}
                          onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.name ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Enter location name"
                        />
                        {formErrors.name && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location Type *
                        </label>
                        <div className="relative dropdown-container">
                          <button
                            type="button"
                            onClick={() => setShowLocationTypeDropdown(!showLocationTypeDropdown)}
                            className={`flex items-center justify-between w-full px-2.5 py-1.5 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.type ? 'border-red-500' : 'border-gray-300'
                              } hover:border-gray-400`}
                          >
                            <span className="text-gray-700 truncate mr-1">{getLocationTypeLabel(locationFormData.type)}</span>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showLocationTypeDropdown ? 'rotate-180' : ''}`} />
                          </button>
                          {showLocationTypeDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                              {locationTypeOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => {
                                    setLocationFormData({ ...locationFormData, type: option.value });
                                    setShowLocationTypeDropdown(false);
                                  }}
                                  className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${locationFormData.type === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                    }`}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {formErrors.type && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.type}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Address *
                        </label>
                        <textarea
                          name="address"
                          value={locationFormData.address}
                          onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                          rows={4}
                          className={`w-full px-2.5 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${formErrors.address ? 'border-red-500' : 'border-gray-300'
                            }`}
                          placeholder="Enter complete address"
                        />
                        {formErrors.address && (
                          <p className="text-red-500 text-xs mt-1">{formErrors.address}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Person
                          </label>
                          <input
                            type="text"
                            name="contactPerson"
                            value={locationFormData.contactPerson}
                            onChange={(e) => setLocationFormData({ ...locationFormData, contactPerson: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter contact person name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Phone
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={locationFormData.phone}
                            onChange={(e) => setLocationFormData({ ...locationFormData, phone: e.target.value })}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Enter phone number"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditingLocation) {
                            setIsEditingLocation(false);
                            setEditingLocationId(null);
                            setLocationFormData({
                              name: '',
                              address: '',
                              type: 'warehouse',
                              contactPerson: '',
                              phone: ''
                            });
                            setFormErrors({});
                            setShowLocationTypeDropdown(false);
                          } else {
                            setShowLocationModal(false);
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        {isEditingLocation ? 'Cancel Edit' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {submitting ? (isEditingLocation ? 'Updating...' : 'Creating...') : (isEditingLocation ? 'Update Location' : 'Create Location')}
                      </button>
                    </div>
                  </form>
                </div>}

                {activeTab === 'rooms' && <div className="p-4 overflow-y-auto flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {isEditingLocation ? 'Edit Location' : 'Add New Location'}
                  </h3>
                  <form onSubmit={handleRoomSubmit} className="space-y-4">
                    <Select
                      label="Location"
                      options={locationOptions}
                      value={roomFormData.location}
                      onChange={(e) => setRoomFormData(prev => ({ ...prev, location: e.target.value }))}
                      error={roomErrors.location}
                      required
                    />

                    <Input
                      label="Room Name"
                      value={roomFormData.name}
                      onChange={(e) => setRoomFormData(prev => ({ ...prev, name: e.target.value }))}
                      error={roomErrors.name}
                      placeholder="e.g., ROOM 1, GODOWN, STORAGE AREA"
                      required
                    />

                    <Input
                      label="Description (Optional)"
                      value={roomFormData.description}
                      onChange={(e) => setRoomFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the room"
                    />

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={roomFormData.isActive}
                        onChange={(e) => setRoomFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                        Active
                      </label>
                    </div>

                    {roomErrors.submit && (
                      <div className="text-red-600 text-sm">{roomErrors.submit}</div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button type="button" variant="outline" onClick={handleRoomModalClose}>
                        Cancel
                      </Button>
                      <Button type="submit" isLoading={loading}>
                        {selectedRoom ? 'Update' : 'Create'} Room
                      </Button>
                    </div>
                  </form>
                </div>}

                {activeTab === 'racks' && <div className="p-4 overflow-y-auto flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {isEditingLocation ? 'Edit Location' : 'Add New Location'}
                  </h3>
                  <form onSubmit={handleRackSubmit} className="space-y-4">
                    <Select
                      label="Location"
                      options={locationOptions}
                      value={rackFormData.location}
                      onChange={(e) => setRackFormData(prev => ({ ...prev, location: e.target.value }))}
                      error={rackErrors.location}
                      required
                    />

                    <Select
                      label="Room"
                      options={roomOptions}
                      value={rackFormData.room}
                      onChange={(e) => setRackFormData(prev => ({ ...prev, room: e.target.value }))}
                      error={rackErrors.room}
                      disabled={!rackFormData.location}
                      required
                    />

                    <Input
                      label="Rack Name"
                      value={rackFormData.name}
                      onChange={(e) => setRackFormData(prev => ({ ...prev, name: e.target.value }))}
                      error={rackErrors.name}
                      placeholder="e.g., A1, E2, GD, P2"
                      required
                    />

                    <Input
                      label="Description (Optional)"
                      value={rackFormData.description}
                      onChange={(e) => setRackFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the rack"
                    />

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={rackFormData.isActive}
                        onChange={(e) => setRackFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                        Active
                      </label>
                    </div>

                    {rackErrors.submit && (
                      <div className="text-red-600 text-sm">{rackErrors.submit}</div>
                    )}

                    <div className="flex justify-end space-x-3 pt-4">
                      <Button type="button" variant="outline" onClick={handleRackModalClose}>
                        Cancel
                      </Button>
                      <Button type="submit" isLoading={loading}>
                        {selectedRack ? 'Update' : 'Create'} Rack
                      </Button>
                    </div>
                  </form>
                </div>}

              </div>

              {/* Right side - Existing Locations */}
              <div className="w-1/2 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Existing Locations</h3>
                  <span className="text-sm text-gray-500">{locations.length} locations</span>
                </div>

                <div className="space-y-6">
                  {/* Tab Navigation */}
                  <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                      <button
                        onClick={() => setActiveTab('locations')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'locations'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        <Building className="w-4 h-4 inline mr-2" />
                        Locations ({locations.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('rooms')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'rooms'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        <Archive className="w-4 h-4 inline mr-2" />
                        Rooms ({rooms.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('racks')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'racks'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        <MapPin className="w-4 h-4 inline mr-2" />
                        Racks ({racks.length})
                      </button>
                    </nav>
                  </div>

                  {/* Locations Tab */}
                  {activeTab === 'locations' && (
                    <div className="space-y-4 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Manage Locations</h3>
                      </div>

                      <div className="grid gap-4">
                        {locations.map((location) => (
                          <div key={location._id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium text-gray-900">{location.name}</h4>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${location.isActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {location.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                                  <span className="capitalize">{location.type.replace('_', ' ')}</span>
                                  {location.contactPerson && (
                                    <span>👤 {location.contactPerson}</span>
                                  )}
                                  {location.phone && (
                                    <span>📞 {location.phone}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 ml-2">
                                <button
                                  onClick={() => handleEditLocation(location)}
                                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit Location"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteLocation(location._id)}
                                  className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Delete Location"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Rooms Tab */}
                  {activeTab === 'rooms' && (
                    <div className="space-y-4 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Manage Rooms</h3>
                      </div>

                      <div className="grid gap-4">
                        {rooms.map((room) => (
                          <div key={room._id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <Archive className="w-5 h-5 text-green-500 mr-2" />
                                  <h4 className="text-lg font-medium text-gray-900">{room.name}</h4>
                                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${room.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {room.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {/* Location: {getLocationName(room.locationId)} */}
                                </p>
                                {room.description && (
                                  <p className="text-sm text-gray-500 mt-1">{room.description}</p>
                                )}
                                <div className="mt-2">
                                  <span className="text-sm text-gray-600">
                                    {/* Racks: {getRacksForRoom(room.id).length} */}
                                  </span>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedRoom(room);
                                    // setShowRoomModal(true);
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Racks Tab */}
                  {activeTab === 'racks' && (
                    <div className="space-y-4 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-gray-900">Manage Racks</h3>
                      </div>

                      <div className="grid gap-4">
                        {racks.map((rack) => (
                          <div key={rack._id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <MapPin className="w-5 h-5 text-purple-500 mr-2" />
                                  <h4 className="text-lg font-medium text-gray-900">{rack.name}</h4>
                                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${rack.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {rack.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {/* Location: {getLocationName(rack.locationId)} → Room: {getRoomName(rack.roomId)} */}
                                </p>
                                {rack.description && (
                                  <p className="text-sm text-gray-500 mt-1">{rack.description}</p>
                                )}
                              </div>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedRack(rack);
                                    // setShowRackModal(true);
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* <div 
                  className="space-y-3 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden" 
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none'
                  }}
                >
                  {locations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No locations found</p>
                      <p className="text-xs">Create your first location using the form on the left</p>
                    </div>
                  ) : (
                    locations.map((location) => (
                      <div key={location._id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900">{location.name}</h4>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                location.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {location.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{location.address}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span className="capitalize">{location.type.replace('_', ' ')}</span>
                              {location.contactPerson && (
                                <span>👤 {location.contactPerson}</span>
                              )}
                              {location.phone && (
                                <span>📞 {location.phone}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <button
                              onClick={() => handleEditLocation(location)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Location"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteLocation(location._id)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Location"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div> */}

                {locations.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-700">
                      💡 <strong>Tip:</strong> You can edit any location by clicking the edit icon.
                      Locations with active stock cannot be deleted.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stock Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Transfer Stock</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Transfer items between different locations, rooms, and racks
                </p>
              </div>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setShowToLocationDropdown(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitTransfer(); }} className="p-6 space-y-6">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              {/* Product Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Product Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                    <div className="flex items-center p-3 bg-white border border-gray-200 rounded-lg">
                      <Package className="w-5 h-5 text-gray-400 mr-3" />
                      <div>
                        <div className="font-medium text-gray-900">
                          {products.find(p => p._id === transferFormData.product)?.name || 'Product'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Part: {products.find(p => p._id === transferFormData.product)?.partNo || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Current Stock Status */}
                  {selectedItem && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-blue-900">Current Stock Status</h4>
                        <button
                          type="button"
                          onClick={async () => {
                            const freshStock = await getCurrentStockStatus(transferFormData.product, transferFormData.fromLocation);
                            if (freshStock) {
                              setSelectedItem(freshStock);
                            }
                          }}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                        >
                          Refresh
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-xs">
                        <div className="text-center">
                          <p className="font-bold text-gray-900 text-lg">{selectedItem.quantity}</p>
                          <p className="text-gray-600">Total Stock</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-yellow-600 text-lg">{selectedItem.reservedQuantity || 0}</p>
                          <p className="text-gray-600">Reserved</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-green-600 text-lg">
                            {selectedItem.availableQuantity || (selectedItem.quantity - (selectedItem.reservedQuantity || 0))}
                          </p>
                          <p className="text-gray-600">Available</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* FROM - Source Location Hierarchy */}
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h3 className="text-lg font-medium text-red-900 mb-4 flex items-center">
                    <ArrowUpDown className="w-5 h-5 mr-2" />
                    From (Source)
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <div className="flex items-center p-3 bg-white border border-gray-200 rounded-lg">
                        <Building className="w-4 h-4 text-blue-500 mr-2" />
                        <span className="font-medium text-gray-900">
                          {locations.find(l => l._id === transferFormData.fromLocation)?.name || <span className="text-red-500">Not available</span>}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                      <div className="flex items-center p-3 bg-white border border-gray-200 rounded-lg">
                        <Archive className="w-4 h-4 text-green-500 mr-2" />
                        <span className="font-medium text-gray-700">
                          {rooms.find(r => r._id === transferFormData.fromRoom)?.name || <span className="text-red-500">Not available</span>}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rack</label>
                      <div className="flex items-center p-3 bg-white border border-gray-200 rounded-lg">
                        <MapPin className="w-4 h-4 text-purple-500 mr-2" />
                        <span className="font-medium text-gray-600">
                          {racks.find(rack => rack._id === transferFormData.fromRack)?.name || <span className="text-red-500">Not available</span>}
                        </span>
                      </div>
                    </div>
                    {(!transferFormData.fromLocation || !transferFormData.fromRoom || !transferFormData.fromRack) && (
                      <div className="bg-red-100 text-red-700 p-2 rounded mt-2 text-sm">
                        This item is not fully assigned to a location/room/rack. Please move it into a valid location before transferring.
                      </div>
                    )}
                  </div>
                </div>

                {/* TO - Destination Location Hierarchy */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="text-lg font-medium text-green-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    To (Destination)
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                      <select
                        value={transferFormData.toLocation}
                        onChange={(e) => setTransferFormData({ 
                          ...transferFormData, 
                          toLocation: e.target.value,
                          toRoom: '', // Reset room when location changes
                          toRack: ''  // Reset rack when location changes
                        })}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formErrors.toLocation ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select destination location</option>
                        {locations.map((location) => (
                          <option key={location._id} value={location._id}>
                            {location.name} ({location.type.replace('_', ' ')})
                          </option>
                        ))}
                      </select>
                      {formErrors.toLocation && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.toLocation}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room (Optional)</label>
                      <select
                        value={transferFormData.toRoom}
                        onChange={(e) => setTransferFormData({ 
                          ...transferFormData, 
                          toRoom: e.target.value,
                          toRack: '' // Reset rack when room changes
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={!transferFormData.toLocation}
                      >
                        <option value="">Select destination room</option>
                        {rooms.filter(room => room.location._id === transferFormData.toLocation).map(room => (
                          <option key={room._id} value={room._id}>{room.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rack (Optional)</label>
                      <select
                        value={transferFormData.toRack}
                        onChange={(e) => setTransferFormData({ ...transferFormData, toRack: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={!transferFormData.toRoom}
                      >
                        <option value="">Select destination rack</option>
                        {racks.filter(rack => rack.room._id === transferFormData.toRoom).map(rack => (
                          <option key={rack._id} value={rack._id}>{rack.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transfer Details */}
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="text-lg font-medium text-yellow-900 mb-4">Transfer Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity to Transfer *
                      {selectedItem && (
                        <span className="text-xs text-gray-500 ml-1">
                          (Max Available: {selectedItem.availableQuantity || (selectedItem.quantity - (selectedItem.reservedQuantity || 0))})
                        </span>
                      )}
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="number"
                        name="quantity"
                        value={transferFormData.quantity}
                        onChange={(e) => setTransferFormData({ ...transferFormData, quantity: Number(e.target.value) })}
                        min="1"
                        max={selectedItem ? (selectedItem.availableQuantity || (selectedItem.quantity - (selectedItem.reservedQuantity || 0))) : undefined}
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          formErrors.quantity ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter quantity to transfer"
                      />
                      {selectedItem && (
                        <button
                          type="button"
                          onClick={() => {
                            const maxQty = selectedItem.availableQuantity || (selectedItem.quantity - (selectedItem.reservedQuantity || 0));
                            setTransferFormData({ ...transferFormData, quantity: maxQty });
                          }}
                          className="px-3 py-2 text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Max ({selectedItem.availableQuantity || (selectedItem.quantity - (selectedItem.reservedQuantity || 0))})
                        </button>
                      )}
                    </div>
                    {formErrors.quantity && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Transfer Notes</label>
                    <textarea
                      name="notes"
                      value={transferFormData.notes}
                      onChange={(e) => setTransferFormData({ ...transferFormData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      placeholder="Reason for transfer (optional)"
                    />
                  </div>
                </div>

                {/* Transfer Summary */}
                {transferFormData.toLocation && transferFormData.quantity > 0 && (
                  <div className="mt-4 p-4 bg-white border border-yellow-300 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Transfer Summary</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <strong>Moving {transferFormData.quantity} units</strong> of{' '}
                        {products.find(p => p._id === transferFormData.product)?.name}
                      </p>
                      <div className="flex items-center justify-between">
                        <span>
                          From: {locations.find(l => l._id === transferFormData.fromLocation)?.name}
                          {transferFormData.fromRoom && rooms.find(r => r._id === transferFormData.fromRoom) && 
                            ` → ${rooms.find(r => r._id === transferFormData.fromRoom)?.name}`}
                          {transferFormData.fromRack && racks.find(r => r._id === transferFormData.fromRack) && 
                            ` → ${racks.find(r => r._id === transferFormData.fromRack)?.name}`}
                        </span>
                        <ArrowUpDown className="w-4 h-4 text-gray-400" />
                        <span>
                          To: {locations.find(l => l._id === transferFormData.toLocation)?.name}
                          {transferFormData.toRoom && rooms.find(r => r._id === transferFormData.toRoom) && 
                            ` → ${rooms.find(r => r._id === transferFormData.toRoom)?.name}`}
                          {transferFormData.toRack && racks.find(r => r._id === transferFormData.toRack) && 
                            ` → ${racks.find(r => r._id === transferFormData.toRack)?.name}`}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferFormData({
                      product: '',
                      fromLocation: '',
                      fromRoom: '',
                      fromRack: '',
                      toLocation: '',
                      toRoom: '',
                      toRack: '',
                      quantity: 0,
                      notes: ''
                    });
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !transferFormData.toLocation || transferFormData.quantity <= 0}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {submitting ? 'Transferring...' : 'Transfer Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustmentModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Adjust Stock</h2>
                <p className="text-sm text-gray-600">
                  {selectedItem.product.name} @ {selectedItem.location.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAdjustmentModal(false);
                  setShowAdjustmentTypeDropdown(false);
                  setShowReservationTypeDropdown(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitStock(); }} className="p-4 space-y-4">
              {formErrors.general && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{formErrors.general}</p>
                </div>
              )}

              {/* Current Stock Status */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Current Stock Status</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{selectedItem.quantity}</p>
                    <p className="text-xs text-gray-600">Total Stock</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-yellow-600">{selectedItem.reservedQuantity || 0}</p>
                    <p className="text-xs text-gray-600">Reserved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-green-600">
                      {selectedItem.availableQuantity || (selectedItem.quantity - (selectedItem.reservedQuantity || 0))}
                    </p>
                    <p className="text-xs text-gray-600">Available</p>
                  </div>
                </div>
              </div>

              {/* Adjustment Form */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adjustment Type *
                  </label>
                  <div className="relative dropdown-container">
                    <button
                      type="button"
                      onClick={() => setShowAdjustmentTypeDropdown(!showAdjustmentTypeDropdown)}
                      className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.adjustmentType ? 'border-red-500' : 'border-gray-300'
                        } hover:border-gray-400`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {adjustmentTypeOptions.find(opt => opt.value === adjustmentFormData.adjustmentType)?.icon}
                        </span>
                        <div>
                          <div className="font-medium text-gray-900">
                            {getAdjustmentTypeLabel(adjustmentFormData.adjustmentType)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {adjustmentTypeOptions.find(opt => opt.value === adjustmentFormData.adjustmentType)?.description}
                          </div>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showAdjustmentTypeDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showAdjustmentTypeDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                        {adjustmentTypeOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setAdjustmentFormData({ ...adjustmentFormData, adjustmentType: option.value });
                              setShowAdjustmentTypeDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors ${adjustmentFormData.adjustmentType === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                              }`}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">{option.icon}</span>
                              <div>
                                <div className="font-medium">{option.label}</div>
                                <div className="text-xs text-gray-500">{option.description}</div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {formErrors.adjustmentType && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.adjustmentType}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                    {adjustmentFormData.adjustmentType === 'set' && (
                      <span className="text-xs text-gray-500 ml-1">(Final stock level)</span>
                    )}
                    {adjustmentFormData.adjustmentType === 'reserve' && selectedItem && (
                      <span className="text-xs text-gray-500 ml-1">
                        (Max: {selectedItem.availableQuantity || (selectedItem.quantity - selectedItem.reservedQuantity)})
                      </span>
                    )}
                    {adjustmentFormData.adjustmentType === 'release' && selectedItem && (
                      <span className="text-xs text-gray-500 ml-1">
                        (Max: {selectedItem.reservedQuantity})
                      </span>
                    )}
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      name="quantity"
                      value={adjustmentFormData.quantity}
                      onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, quantity: Number(e.target.value) })}
                      min={adjustmentFormData.adjustmentType === 'set' ? '0' : '1'}
                      max={adjustmentFormData.adjustmentType === 'subtract' ? selectedItem.quantity : undefined}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.quantity ? 'border-red-500' : 'border-gray-300'
                        }`}
                      placeholder={
                        adjustmentFormData.adjustmentType === 'set'
                          ? 'Enter final stock level'
                          : adjustmentFormData.adjustmentType === 'reserve'
                            ? 'Enter quantity to reserve'
                            : adjustmentFormData.adjustmentType === 'release'
                              ? 'Enter quantity to release'
                              : `Enter quantity to ${adjustmentFormData.adjustmentType}`
                      }
                    />
                    {adjustmentFormData.adjustmentType === 'subtract' && (
                      <button
                        type="button"
                        onClick={() => setAdjustmentFormData({ ...adjustmentFormData, quantity: selectedItem.quantity })}
                        className="px-3 py-2 text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        All ({selectedItem.quantity})
                      </button>
                    )}
                    {adjustmentFormData.adjustmentType === 'set' && selectedItem.quantity > 0 && (
                      <button
                        type="button"
                        onClick={() => setAdjustmentFormData({ ...adjustmentFormData, quantity: selectedItem.quantity })}
                        className="px-3 py-2 text-xs bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Current ({selectedItem.quantity})
                      </button>
                    )}
                    {adjustmentFormData.adjustmentType === 'reserve' && selectedItem && (
                      <button
                        type="button"
                        onClick={() => {
                          const maxReservable = selectedItem.availableQuantity || (selectedItem.quantity - selectedItem.reservedQuantity);
                          setAdjustmentFormData({ ...adjustmentFormData, quantity: maxReservable });
                        }}
                        className="px-3 py-2 text-xs bg-orange-100 text-orange-700 border border-orange-300 rounded-lg hover:bg-orange-200 transition-colors"
                      >
                        All Available ({selectedItem.availableQuantity || (selectedItem.quantity - selectedItem.reservedQuantity)})
                      </button>
                    )}
                    {adjustmentFormData.adjustmentType === 'release' && selectedItem && selectedItem.reservedQuantity > 0 && (
                      <button
                        type="button"
                        onClick={() => setAdjustmentFormData({ ...adjustmentFormData, quantity: selectedItem.reservedQuantity })}
                        className="px-3 py-2 text-xs bg-purple-100 text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-200 transition-colors"
                      >
                        All Reserved ({selectedItem.reservedQuantity})
                      </button>
                    )}
                  </div>
                  {formErrors.quantity && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.quantity}</p>
                  )}
                </div>

                {/* Result Preview */}
                {adjustmentFormData.quantity > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">Result Preview:</span>
                      <div className="flex items-center space-x-2">
                        {adjustmentFormData.adjustmentType === 'reserve' || adjustmentFormData.adjustmentType === 'release' ? (
                          <div className="text-sm">
                            <div className="flex items-center space-x-2">
                              <span className="text-blue-700">Reserved: {selectedItem.reservedQuantity}</span>
                              <span className="text-blue-500">→</span>
                              <span className="text-lg font-bold text-blue-900">
                                {getResultDisplayValue()}
                              </span>
                              <span className="text-xs text-blue-600">
                                ({adjustmentFormData.adjustmentType === 'reserve' ? '+' : '-'}{adjustmentFormData.quantity})
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-blue-700">{selectedItem.quantity}</span>
                            <span className="text-blue-500">→</span>
                            <span className="text-lg font-bold text-blue-900">
                              {getResultDisplayValue()}
                            </span>
                            <span className="text-xs text-blue-600">
                              ({adjustmentFormData.adjustmentType === 'add' ? '+' :
                                adjustmentFormData.adjustmentType === 'subtract' ? '-' : '='}{adjustmentFormData.quantity})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason *
                  </label>
                  <input
                    type="text"
                    name="reason"
                    value={adjustmentFormData.reason}
                    onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, reason: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.reason ? 'border-red-500' : 'border-gray-300'
                      }`}
                    placeholder={
                      adjustmentFormData.adjustmentType === 'reserve'
                        ? "Enter reason for reservation (e.g., 'Service order #123', 'Customer quote')"
                        : adjustmentFormData.adjustmentType === 'release'
                          ? "Enter reason for release (e.g., 'Service completed', 'Order cancelled')"
                          : "Enter reason for adjustment (e.g., 'Damaged goods', 'Stock count correction')"
                    }
                  />
                  {formErrors.reason && (
                    <p className="text-red-500 text-xs mt-1">{formErrors.reason}</p>
                  )}
                </div>

                {/* Reservation-specific fields */}
                {adjustmentFormData.adjustmentType === 'reserve' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reservation Type *
                      </label>
                      <div className="relative dropdown-container">
                        <button
                          type="button"
                          onClick={() => setShowReservationTypeDropdown(!showReservationTypeDropdown)}
                          className={`flex items-center justify-between w-full px-3 py-2 text-left border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors.reservationType ? 'border-red-500' : 'border-gray-300'
                            } hover:border-gray-400`}
                        >
                          <span className="text-gray-700 truncate mr-1">{getReservationTypeLabel(adjustmentFormData.reservationType || '')}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showReservationTypeDropdown ? 'rotate-180' : ''}`} />
                        </button>
                        {showReservationTypeDropdown && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1">
                            {reservationTypeOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setAdjustmentFormData({ ...adjustmentFormData, reservationType: option.value });
                                  setShowReservationTypeDropdown(false);
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${adjustmentFormData.reservationType === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                  }`}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {formErrors.reservationType && (
                        <p className="text-red-500 text-xs mt-1">{formErrors.reservationType}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reference ID
                        </label>
                        <input
                          type="text"
                          name="referenceId"
                          value={adjustmentFormData.referenceId || ''}
                          onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, referenceId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Order/Service ID (optional)"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reserved Until
                        </label>
                        <input
                          type="datetime-local"
                          name="reservedUntil"
                          value={adjustmentFormData.reservedUntil || ''}
                          onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, reservedUntil: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={adjustmentFormData.notes}
                    onChange={(e) => setAdjustmentFormData({ ...adjustmentFormData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Additional notes (optional)"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustmentModal(false);
                    setShowAdjustmentTypeDropdown(false);
                    setShowReservationTypeDropdown(false);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Adjusting...' : 'Adjust Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock History Modal */}
      {showHistoryModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Stock History - {selectedItem.product.name} @ {selectedItem.location.name}
              </h2>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Current Stock Status</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-gray-900">{selectedItem.quantity}</p>
                    <p className="text-xs text-gray-600">Total Stock</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-yellow-600">{selectedItem.reservedQuantity}</p>
                    <p className="text-xs text-gray-600">Reserved</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-600">
                      {selectedItem.availableQuantity || (selectedItem.quantity - (selectedItem.reservedQuantity || 0))}
                    </p>
                    <p className="text-xs text-gray-600">Available</p>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {stockTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No transactions found</td>
                      </tr>
                    ) : (
                      stockTransactions.map((transaction) => (
                        <tr key={transaction._id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-xs text-gray-900">
                            {new Date(transaction.date).toLocaleDateString()}
                            <div className="text-xs text-gray-500">
                              {new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${transaction.type === 'inward' ? 'bg-green-100 text-green-800' :
                              transaction.type === 'outward' ? 'bg-red-100 text-red-800' :
                                transaction.type === 'transfer' ? 'bg-purple-100 text-purple-800' :
                                  transaction.type === 'reservation' ? 'bg-orange-100 text-orange-800' :
                                    transaction.type === 'release' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                              }`}>
                              {transaction.type === 'inward' ? '↗ Inward' :
                                transaction.type === 'outward' ? '↙ Outward' :
                                  transaction.type === 'transfer' ? '🔄 Transfer' :
                                    transaction.type === 'reservation' ? '🔒 Reserved' :
                                      transaction.type === 'release' ? '🔓 Released' :
                                        '⚡ Adjustment'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-medium">
                            <span className={`${transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                              {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-gray-900">
                            {transaction.resultingQuantity}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">
                            <div>{transaction.reason}</div>
                            {transaction.notes && (
                              <div className="text-xs text-gray-400 mt-1 italic">{transaction.notes}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            <div className="font-mono text-blue-600">{transaction.reference}</div>
                            {transaction.referenceType && (
                              <div className="text-xs text-gray-500 capitalize">{transaction.referenceType.replace('_', ' ')}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600">{transaction.user}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>


          </div>
        </div>
      )}

      {/* Stock Ledger Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Stock Ledger</h2>
                <p className="text-sm text-gray-600">Complete transaction history across all products and locations</p>
              </div>
              <button
                onClick={() => setShowLedgerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="p-4 bg-white border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-600 font-medium">Total Inward</p>
                      <p className="text-2xl font-bold text-green-700">{ledgerSummary.totalInward.toLocaleString()}</p>
                      <p className="text-xs text-green-600">Purchase & Stock In</p>
                    </div>
                    <div className="text-green-500">
                      <TrendingUp className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-600 font-medium">Total Outward</p>
                      <p className="text-2xl font-bold text-red-700">{ledgerSummary.totalOutward.toLocaleString()}</p>
                      <p className="text-xs text-red-600">Sales & Stock Out</p>
                    </div>
                    <div className="text-red-500">
                      <TrendingDown className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-blue-600 font-medium">Net Movement</p>
                      <p className={`text-2xl font-bold ${ledgerSummary.netMovement >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {ledgerSummary.netMovement >= 0 ? '+' : ''}{ledgerSummary.netMovement.toLocaleString()}
                      </p>
                      <p className="text-xs text-blue-600">Inward - Outward</p>
                    </div>
                    <div className="text-blue-500">
                      <BarChart3 className="w-8 h-8" />
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-orange-600 font-medium">Transactions</p>
                      <p className="text-2xl font-bold text-orange-700">{ledgerSummary.totalTransactions}</p>
                      <p className="text-xs text-orange-600">Total Movements</p>
                    </div>
                    <div className="text-orange-500">
                      <Package className="w-8 h-8" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    value={ledgerFilters.search}
                    onChange={(e) => {
                      setLedgerFilters({ ...ledgerFilters, search: e.target.value });
                      fetchStockLedger(1, true);
                    }}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Date Range Custom Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setShowDateRangeDropdown(!showDateRangeDropdown)}
                    className="flex items-center justify-between w-full px-3 py-1.5 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  >
                    <span className="text-gray-700 truncate mr-1">{getDateRangeLabel(ledgerFilters.dateRange)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showDateRangeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showDateRangeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                      {[
                        { value: '7', label: 'Last 7 days' },
                        { value: '30', label: 'Last 30 days' },
                        { value: '90', label: 'Last 3 months' },
                        { value: '365', label: 'Last year' },
                        { value: '', label: 'All time' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setLedgerFilters({ ...ledgerFilters, dateRange: option.value });
                            setShowDateRangeDropdown(false);
                            fetchStockLedger(1, true);
                          }}
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${ledgerFilters.dateRange === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Transaction Type Custom Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setShowTransactionTypeDropdown(!showTransactionTypeDropdown)}
                    className="flex items-center justify-between w-full px-3 py-1.5 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  >
                    <span className="text-gray-700 truncate mr-1">{getTransactionTypeLabel(ledgerFilters.transactionType)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showTransactionTypeDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showTransactionTypeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5">
                      {[
                        { value: '', label: 'All Types' },
                        { value: 'inward', label: 'Inward (Purchase)' },
                        { value: 'outward', label: 'Outward (Sale)' },
                        { value: 'transfer', label: 'Transfer (Location/Room/Rack)' },
                        { value: 'adjustment', label: 'Adjustment' },
                        { value: 'reservation', label: 'Reservation' },
                        { value: 'release', label: 'Release' }
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setLedgerFilters({ ...ledgerFilters, transactionType: option.value });
                            setShowTransactionTypeDropdown(false);
                            fetchStockLedger(1, true);
                          }}
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${ledgerFilters.transactionType === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location Custom Dropdown */}
                <div className="relative dropdown-container">
                  <button
                    onClick={() => setShowLedgerLocationDropdown(!showLedgerLocationDropdown)}
                    className="flex items-center justify-between w-full px-3 py-1.5 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  >
                    <span className="text-gray-700 truncate mr-1">{getLedgerLocationLabel(ledgerFilters.location)}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showLedgerLocationDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  {showLedgerLocationDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      <button
                        onClick={() => {
                          setLedgerFilters({ ...ledgerFilters, location: '' });
                          setShowLedgerLocationDropdown(false);
                          fetchStockLedger(1, true);
                        }}
                        className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${!ledgerFilters.location ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                      >
                        All Locations
                      </button>
                      {locations.map(location => (
                        <button
                          key={location._id}
                          onClick={() => {
                            setLedgerFilters({ ...ledgerFilters, location: location._id });
                            setShowLedgerLocationDropdown(false);
                            fetchStockLedger(1, true);
                          }}
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${ledgerFilters.location === location._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                            }`}
                        >
                          {location.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Showing {stockLedgerData.length} of {ledgerPagination.total} transactions</span>
                <span>Page {ledgerPagination.page} of {ledgerPagination.pages}</span>
              </div>
            </div>

            {/* Ledger Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading && stockLedgerData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading transactions...
                      </td>
                    </tr>
                  ) : stockLedgerData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p>No transactions found</p>
                        <p className="text-xs text-gray-400">Try adjusting your filters</p>
                      </td>
                    </tr>
                  ) : (
                    stockLedgerData.map((ledger) => (
                      <tr key={ledger._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-xs">
                          <div className="text-gray-900">{new Date(ledger.transactionDate).toLocaleDateString()}</div>
                          <div className="text-gray-500">{new Date(ledger.transactionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="font-medium text-gray-900">{ledger.product?.name || 'Unknown Product'}</div>
                          <div className="text-gray-500">{ledger.product?.category}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="font-medium text-gray-900">{ledger.location?.name || 'Unknown Location'}</div>
                          <div className="text-gray-500 capitalize">{ledger.location?.type?.replace('_', ' ')}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ledger.transactionType === 'inward' ? 'bg-green-100 text-green-800' :
                            ledger.transactionType === 'outward' ? 'bg-red-100 text-red-800' :
                              ledger.transactionType === 'transfer' ? 'bg-purple-100 text-purple-800' :
                                ledger.transactionType === 'reservation' ? 'bg-orange-100 text-orange-800' :
                                  ledger.transactionType === 'release' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                            }`}>
                            {ledger.transactionType === 'inward' ? '↗ Inward' :
                              ledger.transactionType === 'outward' ? '↙ Outward' :
                                ledger.transactionType === 'transfer' ? '🔄 Transfer' :
                                  ledger.transactionType === 'reservation' ? '🔒 Reserved' :
                                    ledger.transactionType === 'release' ? '🔓 Released' :
                                      '⚡ Adjustment'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-medium">
                          <span className={`${ledger.quantity > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {ledger.quantity > 0 ? '+' : ''}{ledger.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-900">
                          {ledger.resultingQuantity}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="font-mono text-blue-600">{ledger.referenceId}</div>
                          <div className="text-gray-500 capitalize">{ledger.referenceType?.replace('_', ' ')}</div>
                          {ledger.reason && <div className="text-gray-600 mt-1">{ledger.reason}</div>}
                          {ledger.notes && <div className="text-gray-400 mt-1 italic">{ledger.notes}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {ledger.performedBy?.firstName && ledger.performedBy?.lastName
                            ? `${ledger.performedBy.firstName} ${ledger.performedBy.lastName}`
                            : 'System'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {ledgerPagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => ledgerPagination.page > 1 && fetchStockLedger(ledgerPagination.page - 1, true)}
                    disabled={ledgerPagination.page <= 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {ledgerPagination.page} of {ledgerPagination.pages}
                  </span>
                  <button
                    onClick={() => ledgerPagination.page < ledgerPagination.pages && fetchStockLedger(ledgerPagination.page + 1, true)}
                    disabled={ledgerPagination.page >= ledgerPagination.pages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
            <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default InventoryManagement; 