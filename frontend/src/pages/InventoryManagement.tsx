import React, { useState, useEffect, useRef, useCallback } from 'react';
import Flatpickr from 'react-flatpickr';
import 'flatpickr/dist/themes/material_blue.css';
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
  Hash,
  HelpCircle,
  File,
  ArrowLeftRight,
  Settings
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
import toast from 'react-hot-toast';
import { saveAs } from 'file-saver';

// Types
interface ProductData {
  _id: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  price: number;
  uom?: string;
  minStockLevel: number;
  maxStockLevel?: number;
  partNo?: string;
  dept?: string;
  hsnNumber?: string;
  productType1?: string;
  productType2?: string;
  productType3?: string;
  make?: string;
  gst?: number;
  cpcbNo?: string;
  gndp?: number;
}

interface StockLocationData {
  _id: string;
  name: string;
  address: string;
  type: string;
  contactPerson?: string;
  phone?: string;
  isActive: boolean;
  createdAt?: string;
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
  stockId: string;
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
  stockId: string,
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [locations, setLocations] = useState<StockLocationData[]>([]);
  const [recentLocations, setRecentLocations] = useState<StockLocationData[]>([]);
  const [recentRooms, setRecentRooms] = useState<any[]>([]);
  const [recentRacks, setRecentRacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalStock, setTotalStock] = useState(0);
  const [totalLowStock, setTotalLowStock] = useState(0);
  const [totalOutOfStock, setTotalOutOfStock] = useState(0);
  const [totalOverStocked, setTotalOverStocked] = useState(0);
  const [totalInStock, setTotalInStock] = useState(0);

  console.log("recentRacks:", recentRacks);
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
  const [filteredStockTransactions, setFilteredStockTransactions] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<string>('all'); // 'all', 'inward', 'outward', 'transfer', 'reservation', 'release', 'adjustment'
  const [stockLedgerData, setStockLedgerData] = useState<any[]>([]);
  console.log("stockLedgerData:", stockLedgerData);
  const [ledgerPagination, setLedgerPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [ledgerSummary, setLedgerSummary] = useState({
    totalInwardCount: 0,
    totalOutwardCount: 0,
    totalAdjustmentCount: 0,
    totalTransferCount: 0,
    totalReservationCount: 0,
    totalReleaseCount: 0,
    totalInward: 0,
    totalOutward: 0,
    netMovement: 0,
    totalTransactions: 0
  });

  const [staticSummary, setStaticSummary] = useState({
    totalInwardCount: 0,
    totalOutwardCount: 0,
    totalAdjustmentCount: 0,
    totalTransferCount: 0,
    totalReservationCount: 0,
    totalReleaseCount: 0,
    totalInwardQuantity: 0,
    totalOutwardQuantity: 0
  });
  // Helper to format date without timezone issues
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to get default dates for last 30 days
  const getDefaultDates = () => {
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - 29); // Last 30 days (including today)
    return {
      fromDate: formatDateToString(fromDate),
      toDate: formatDateToString(toDate)
    };
  };

  // Handler to filter by transaction type when clicking summary cards
  const handleSummaryCardClick = (transactionType: string) => {
    setLedgerFilters(prev => ({
      ...prev,
      transactionType: transactionType
    }));
    setLedgerPagination(prev => ({ ...prev, page: 1 }));
  };

  // Handler for stock history filter clicks
  const handleHistoryFilterClick = (filterType: string) => {
    setHistoryFilter(filterType);
  };

  // Filter stock transactions based on selected filter
  const applyHistoryFilter = (transactions: any[], filter: string) => {
    if (filter === 'all') return transactions;
    return transactions.filter(transaction => {
      switch (filter) {
        case 'inward':
          return transaction.quantity > 0 && ['inward'].includes(transaction.type);
        case 'outward':
          return transaction.quantity < 0 && ['outward'].includes(transaction.type);
        case 'transfer':
          return transaction.type === 'transfer';
        case 'reservation':
          return transaction.type === 'reservation';
        case 'release':
          return transaction.type === 'release';
        case 'adjustment':
          return ['add', 'subtract', 'set', 'adjustment'].includes(transaction.type);
        default:
          return true;
      }
    });
  };

  // Calculate stats for stock history
  const calculateHistoryStats = (transactions: any[]) => {
    const stats = {
      total: transactions.length,
      inward: 0,
      outward: 0,
      transfer: 0,
      reservation: 0,
      release: 0,
      adjustment: 0,
      inwardQty: 0,
      outwardQty: 0
    };

    transactions.forEach(transaction => {
      if (transaction.type === 'inward') {
        stats.inward++;
        if (transaction.quantity > 0) {
          stats.inwardQty += transaction.quantity;
        }
      } else if (transaction.type === 'outward') {
        stats.outward++;
        if (transaction.quantity < 0) {
          stats.outwardQty += Math.abs(transaction.quantity);
        }
      } else if (transaction.type === 'transfer') {
        stats.transfer++;
      } else if (transaction.type === 'reservation') {
        stats.reservation++;
      } else if (transaction.type === 'release') {
        stats.release++;
      } else if (['add', 'subtract', 'set', 'adjustment'].includes(transaction.type)) {
        stats.adjustment++;
      }
    });

    return stats;
  };

  const [ledgerFilters, setLedgerFilters] = useState({
    search: '',
    location: '',
    transactionType: '',
    dateRange: '',
    fromDate: '',
    toDate: ''
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
    stockId: '',
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
    stockId: '',
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
  const [limit, setLimit] = useState(100);

  console.log("editingLocationId:", editingLocationId);


  // Ensure limit is never too small
  React.useEffect(() => {
    if (limit < 10) {
      setLimit(100);
    }
  }, [limit]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalDatas, setTotalDatas] = useState(0);


  // Update location paginatio

  const [filters, setFilters] = useState<any>({
    search: '',
    category: '',
    location: '',
    stockStatus: 'all',
    sortBy: 'product.name',
    sortOrder: 'asc'
  });

  const [importProgress, setImportProgress] = useState<number>(0); // percentage progress
  const [processing, setProcessing] = useState<boolean>(false); // backend processing stage

  const onFiltersChange = useCallback((newFilters: Partial<any>) => {
    setFilters((prev: any) => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  }, []);

  // Fix getStockStatusTable: remove maxStockLevel check
  const getStockStatusTable = (item: StockItem) => {
    const minStock = item.product?.minStockLevel ?? 0;
    const maxStock = item.product?.maxStockLevel ?? 0;

    if (item.quantity <= 0) {
      return { label: 'Out of Stock', variant: 'danger' as const, icon: AlertTriangle };
    }

    if (minStock > 0 && item.quantity < minStock) {
      return { label: 'Low Stock', variant: 'warning' as const, icon: TrendingDown };
    }

    if (maxStock > 0 && item.quantity > maxStock) {
      return { label: 'Overstocked', variant: 'info' as const, icon: TrendingUp };
    }

    if (
      (minStock === 0 || item.quantity >= minStock) &&
      (maxStock === 0 || item.quantity <= maxStock)
    ) {
      return { label: 'In Stock', variant: 'success' as const, icon: Package };
    }

    // fallback if somehow none of the conditions matched
    return { label: 'Unknown', variant: 'default' as const, icon: HelpCircle };
  };


  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };



  const stockStatusOptions = [
    { value: 'all', label: 'All Stock Levels' },
    { value: 'low_stock', label: 'Low Stock' },
    { value: 'out_of_stock', label: 'Out of Stock' },
    { value: 'overstocked', label: 'Overstocked' },
    { value: 'in_stock', label: 'In Stock' }
  ];

  const sortByOptions = [
    { value: 'product.name', label: 'Product Name' },
    { value: 'product.category', label: 'Category' },
    { value: 'product.brand', label: 'Brand' },
    { value: 'location.name', label: 'Location' },
    { value: 'quantity', label: 'Quantity' },
    { value: 'product.price', label: 'Price' },
    { value: 'lastUpdated', label: 'Last Updated' }
  ];

  const sortOrderOptions = [
    { value: 'asc', label: 'A-Z (Ascending)' },
    { value: 'desc', label: 'Z-A (Descending)' }
  ];

  const getSortByLabel = () => {
    const option = sortByOptions.find(opt => opt.value === filters.sortBy);
    return option ? option.label : 'Product Name';
  };

  const getSortOrderLabel = () => {
    const option = sortOrderOptions.find(opt => opt.value === filters.sortOrder);
    return option ? option.label : 'A-Z (Ascending)';
  };

  const handleRoomModalClose = () => {
    setRoomFormData({
      name: '',
      location: '',
      description: '',
      isActive: true
    });
    setRoomErrors({});
    setSelectedRoom(undefined);
    // setRecentRooms([]);
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
    // setRecentRacks([]);
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
    { value: '', label: 'Select a room' },
    ...rooms.map(room => ({
      value: room._id,
      label: room.name
    }))
  ];
  const rackOptionsFilter = [
    { value: '', label: 'Select a rack' },
    ...racks.map(room => ({
      value: room._id,
      label: room.name
    }))
  ];

  // Extract unique departments from all products
  const uniqueDepts = Array.from(
    new Set(products.map(product => product.dept).filter(Boolean))
  ) as string[];

  const deptOptionsFilter = [
    { value: '', label: 'Select a department' },
    ...uniqueDepts.map(dept => ({
      value: dept,
      label: dept
    }))
  ];

  // Extract unique brands from all products
  const uniqueBrands = Array.from(
    new Set(products.map(product => product.brand).filter(Boolean))
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
        location: typeof selectedRoom.location === "string" ? selectedRoom.location : selectedRoom.location._id,
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
        room: selectedRack.room?._id || selectedRack.room || '',
        location: selectedRack.location?._id || selectedRack.location || '',
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
        setRecentRooms(recentRooms.map(loc =>
          loc._id === selectedRoom._id ? updatedRoom : loc
        ));
        if (typeof selectedRoom.location !== "string") {
          setRooms(rooms.map(room =>
            room._id === selectedRoom._id ? updatedRoom : room
          ));
        }
        fetchLocations();
        setSelectedRoom(undefined);
        fetchRooms();
      } else {
        // Create new location
        const response = await apiClient.stock.createRoom(roomFormData);
        const newRoom = (response.data as any).room || response.data;
        // setRooms([...rooms, newRoom]);
        const updatedRecent = [newRoom, ...recentRooms];
        setRecentRooms(updatedRecent);
        fetchLocations();
        fetchRooms();
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

        setRecentRacks(recentRacks.map(loc =>
          loc._id === selectedRack._id ? updatedRack : loc
        ));
        if (typeof selectedRack.location !== "string") {
          setRacks(racks.map(rack =>
            rack._id === selectedRack._id ? updatedRack : rack
          ));
        }
        // fetchRacks();
        setSelectedRack(undefined);
        fetchLocations();
        fetchRooms();
      } else {
        // Create new location
        const response = await apiClient.stock.createRack(rackFormData);
        const newRack = (response.data as any).rack || response.data;
        // setRacks([...racks, newRack]);
        setRecentRacks([newRack, ...recentRacks]);
      }
      fetchLocations();
      fetchRooms();

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
        setShowSortFilterDropdown(false);
        setShowSortOrderFilterDropdown(false);
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
        fetchLocations(), // Use pagination function for initial load
        fetchRooms(), // Use pagination function for initial load
        fetchRacks() // Use pagination function for initial load
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    // Build sort parameter from filters
    const sortField = filters.sortBy || 'product.name';
    const sortDirection = filters.sortOrder === 'desc' ? '-' : '';
    const sortParam = `${sortDirection}${sortField}`;

    const params: any = {
      page: currentPage,
      limit,
      sort: sortParam,
      search: filters.search,
      ...(filters.category && { category: filters.category }),
      ...(filters.dept && { dept: filters.dept }),
      ...(filters.brand && { brand: filters.brand }),
      ...(filters.location && { location: filters.location }),
      ...(filters.room && { room: filters.room }),
      ...(filters.rack && { rack: filters.rack }),
      ...(filters.stockStatus === 'low_stock' && { lowStock: 'true' }),
      ...(filters.stockStatus === 'out_of_stock' && { outOfStock: 'true' }),
      ...(filters.stockStatus === 'overstocked' && { overStocked: 'true' }),
      ...(filters.stockStatus === 'in_stock' && { inStock: 'true' }),
    };

    try {
      const response = await apiClient.stock.getStock(params);

      setCurrentPage(response.pagination.page);
      setTotalStock(response.totalStock);
      setTotalLowStock(response.totalLowStock);
      setTotalOutOfStock(response.totalOutOfStock);
      setTotalOverStocked(response.totalOverStocked);
      setTotalInStock(response.totalInStock);
      // Don't override limit from backend - keep frontend control
      // setLimit(response.pagination.limit);
      setTotalDatas(response.pagination.total);
      setTotalPages(response.pagination.pages);
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
      // Scroll to top after data is loaded
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setInventory([]);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [currentPage, limit, filters]);

  useEffect(() => {
    fetchStockLedger();
  }, [ledgerPagination.page, ledgerPagination.limit, ledgerFilters]);

  // Apply history filter whenever stockTransactions or historyFilter changes
  useEffect(() => {
    const filtered = applyHistoryFilter(stockTransactions, historyFilter);
    setFilteredStockTransactions(filtered);
  }, [stockTransactions, historyFilter]);

  const fetchProducts = async () => {
    try {
      let allProducts: any[] = [];
      let page = 1;
      let hasMore = true;



      while (hasMore) {
        const response: any = await apiClient.products.getAll({ page, limit: 100 });
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

      setProducts(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]);
    }
  };

  const fetchLocations = async (page: number = 1) => {
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
      // Sort ascending by createdAt (oldest first)
      locationsData = locationsData.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      });
      setLocations(locationsData);
      // setRecentLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setLocations([]);
    }
  };

  const fetchRooms = async (page: number = 1) => {
    try {
      const response = await apiClient.stock.getRooms();
      let roomsData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          roomsData = response.data;
        } else if ((response.data as any).rooms && Array.isArray((response.data as any).rooms)) {
          roomsData = (response.data as any).rooms;
        }
      }
      // Sort ascending by createdAt (oldest first)
      roomsData = roomsData.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      });
      // 3. Set the remaining rooms
      setRooms(roomsData);
      console.log("rooms-99992:", rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
    }
  };

  useEffect(() => {
    if (rackFormData.location) {
      const roomsInLocation = rooms.filter(room => room.location && room.location._id === rackFormData.location);
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

  const fetchRacks = async (page: number = 1) => {
    try {
      const response = await apiClient.stock.getRacks();
      let racksData: any[] = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          racksData = response.data;
        } else if ((response.data as any).racks && Array.isArray((response.data as any).racks)) {
          racksData = (response.data as any).racks;
        }
      }
      // Sort ascending by createdAt (oldest first)
      racksData = racksData.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      });
      setRacks(racksData);
    } catch (error) {
      console.error('Error fetching racks:', error);
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
    console.log("location-------:", location);

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
      stockId: stockItem._id,
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
      stockId: stockItem._id,
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
    // if (!locationFormData.type) {
    //   errors.type = 'Location type is required';
    // }

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
        setRecentLocations(recentLocations.map(loc =>
          loc._id === editingLocationId ? updatedLocation : loc
        ));
        if (recentLocations.some(loc => loc._id !== editingLocationId)) {
          setLocations(locations.map(loc =>
            loc._id === editingLocationId ? updatedLocation : loc
          ));
        }
        fetchLocations();
      } else {
        // Create new location
        const response = await apiClient.stock.createLocation(locationFormData);
        const newLocation = (response.data as any).location || response.data;
        setRecentLocations([newLocation, ...recentLocations]);
        // setLocations([newLocation, ...locations]); // Add new location at the top
        fetchLocations(); // Optionally, you can skip await fetchLocations(); here to avoid re-sorting
      }

      // setShowLocationModal(false);
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
      const { stockId, product, location, adjustmentType, quantity, reason, notes, reservationType, referenceId, reservedUntil } = adjustmentFormData;

      const adjustmentData: any = {
        stockId,
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
        stockId: '',
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

  const getCurrentStockStatus = async (stockId: string, productId: string, locationId: string) => {
    try {
      const response = await apiClient.stock.getStock({ stockId: stockId, product: productId, location: locationId });

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
      const { stockId, product, fromLocation, fromRoom, fromRack, toLocation, toRoom, toRack, quantity, notes } = transferFormData;
      // Get fresh stock data before transfer
      const currentStock = await getCurrentStockStatus(stockId, product, fromLocation);

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
        stockId,
        product,
        fromLocation,
        fromRoom: fromRoom || null,
        fromRack: fromRack || null,
        toLocation,
        toRoom: toRoom || null,
        toRack: toRack || null,
        quantity,
        notes
      };

      // Send transfer request
      await apiClient.stock.transferStock(transferData);

      await fetchInventory(); // Refresh inventory
      setShowTransferModal(false);
      setTransferFormData({
        stockId: '',
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
    setHistoryFilter('all'); // Reset filter when opening modal
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
      case 'delivery_challan': return 'Delivery Challan';
      default: return 'System Transaction';
    }
  };

  const fetchStockLedger = async () => {
    try {
      setLoading(true);
      const params = {
        page: ledgerPagination.page.toString(),
        limit: ledgerPagination.limit.toString(),
        sort: '-transactionDate',
        ...(ledgerFilters.search && { search: ledgerFilters.search }),
        ...(ledgerFilters.location && { locationId: ledgerFilters.location }),
        ...(ledgerFilters.transactionType && { type: ledgerFilters.transactionType }),
        ...(ledgerFilters.fromDate && { fromDate: ledgerFilters.fromDate }),
        ...(ledgerFilters.toDate && { toDate: ledgerFilters.toDate }),
        // Only use dateRange if custom dates are not set
        ...(!ledgerFilters.fromDate && !ledgerFilters.toDate && getDateRangeParams(ledgerFilters.dateRange)),
      };

      const response = await apiClient.stockLedger.getAll(params);

      const formattedLedger = response.data.ledgers.map((ledger: any) => ({
        _id: ledger._id,
        product: ledger.product,
        location: ledger.location,
        transactionType: ledger.transactionType,
        quantity: ledger.quantity,
        resultingQuantity: ledger.resultingQuantity,
        previousQuantity: ledger.previousQuantity,
        reason: ledger.reason || getTransactionReason(ledger.referenceType),
        notes: ledger.notes,
        referenceId: ledger.referenceId,
        referenceType: ledger.referenceType,
        transactionDate: ledger.transactionDate,
        performedBy: ledger.performedBy
      }));

      if (ledgerPagination.page === 1) {
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
      if (ledgerPagination.page === 1) {
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
        setLedgerSummary({
          ...summary, 
          totalInwardCount: (response.data as any).totalInward || 0,
          totalOutwardCount: (response.data as any).totalOutward || 0,
          totalAdjustmentCount: (response.data as any).totalAdjustment || 0,
          totalTransferCount: (response.data as any).totalTransfer || 0,
          totalReservationCount: (response.data as any).totalReservation || 0,
          totalReleaseCount: (response.data as any).totalRelease || 0
        });

        // Set static summary (only once, not dependent on filters)
        if ((response.data as any).staticSummary) {
          setStaticSummary((response.data as any).staticSummary);
        }
      }

      // Scroll to top after data is loaded
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error fetching stock ledger:', error);
      setStockLedgerData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleShowStockLedger = () => {
    setLedgerFilters({ 
      search: '', 
      location: '', 
      transactionType: '', 
      dateRange: '', 
      fromDate: '', 
      toDate: '' 
    });
    setLedgerPagination(prev => ({ ...prev, page: 1 }));
    setShowLedgerModal(true);
  };

  const getStockStatus = (item: StockItem) => {
    const product = typeof item.product === 'object' ? item.product : null;
    if (!product) return 'unknown';
    const minStock = product.minStockLevel ?? 0;
    const maxStock = product.maxStockLevel ?? 0;
    if (item.quantity <= 0) return 'out_of_stock';
    if (minStock > 0 && item.quantity < minStock) return 'low_stock';
    if (maxStock > 0 && item.quantity > maxStock) return 'overstocked';
    if (minStock === 0 && maxStock === 0) return 'in_stock';
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
      case 'overstocked':
        return 'text-blue-800 bg-blue-100';
      case 'in_stock':
        return 'text-green-800 bg-green-100';
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
          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
            {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
      action: () => {
        clearAllFilters();
      },
      value: totalStock,
      icon: <Package className="w-6 h-6" />,
      color: 'blue'
    },
    {
      title: 'Low Stock Items',
      action: () => {
        onFiltersChange({ stockStatus: 'low_stock' });
      },
      value: totalLowStock,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'yellow'
    },
    {
      title: 'Out of Stock',
      action: () => {
        onFiltersChange({ stockStatus: 'out_of_stock' });
      },
      value: totalOutOfStock,
      icon: <TrendingDown className="w-6 h-6" />,
      color: 'red'
    },
    {
      title: 'Overstocked',
      action: () => {
        onFiltersChange({ stockStatus: 'overstocked' });
      },
      value: totalOverStocked,
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'purple'
    },
    {
      title: 'In Stock',
      action: () => {
        onFiltersChange({ stockStatus: 'in_stock' });
      },
      value: totalInStock,
      icon: <Package className="w-6 h-6" />,
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

  const clearAllFilters = () => {
    onFiltersChange({
      search: '',
      category: '',
      dept: '',
      brand: '',
      location: '',
      room: '',
      rack: '',
      stockStatus: 'all',
      sortBy: 'product.name',
      sortOrder: 'asc'
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
    setShowSortFilterDropdown(false);
    setShowSortOrderFilterDropdown(false);
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
  const [showSortFilterDropdown, setShowSortFilterDropdown] = useState(false);
  const [showSortOrderFilterDropdown, setShowSortOrderFilterDropdown] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  const duplicateGroupsScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const checkScrollable = () => {
      const element = duplicateGroupsScrollRef.current;
      if (element) {
        const isScrollable = element.scrollHeight > element.clientHeight;
        setShowScrollIndicator(isScrollable);
      }
    };

    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [previewData?.duplicateGroups]);

    // Export inventory as Excel
    const handleExportExcel = async () => {
      try {
        const blob = await apiClient.inventory.exportExcel();
        saveAs(blob, 'inventory-export.xlsx');
        toast.success('Inventory exported successfully!');
      } catch (error: any) {
        toast.error('Failed to export inventory: ' + (error.message || error));
      }
    };

  // Helper to convert dateRange string to fromDate/toDate
  const getDateRangeParams = (dateRange: string) => {
    if (!dateRange) return {};
    const days = parseInt(dateRange, 10);
    if (isNaN(days)) return {};
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(toDate.getDate() - days + 1);
    return {
      fromDate: fromDate.toISOString().slice(0, 10),
      toDate: toDate.toISOString().slice(0, 10)
    };
  };

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
            onClick={() => setShowImportModal(true)}
            className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <Archive className="w-4 h-4" />
            <span className="text-sm">Import Excel</span>
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
          <button
            onClick={handleExportExcel}
            className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-yellow-700 hover:to-yellow-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
          >
            <File className="w-4 h-4" />
            <span className="text-sm">Export Excel</span>
          </button>
        </div>
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, index) => (
          <div
            onClick={stat.action}
            key={index}
            className="bg-white cursor-pointer p-4 rounded-xl shadow-sm border border-gray-100 transform transition-transform duration-200 hover:scale-105 active:scale-95"
          >
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
              {/* <button
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
                onClick={() => onFiltersChange({ stockStatus: 'overstocked' })}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 transition-colors border border-purple-200 text-xs font-medium"
              >
                Overstocked
              </button> */}
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
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${(filters.category || 'all') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${(filters.dept || '') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${(filters.brand || '') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${(filters.location || '') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                        className={`flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md transition-colors text-sm ${!filters.location
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
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${(filters.room || '') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                        className={`flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md transition-colors text-sm ${!filters.room
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
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${(filters.rack || '') === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                  Stock Status & Sort
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
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${filters.stockStatus === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sort By Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setShowSortFilterDropdown(!showSortFilterDropdown)}
                        className="flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                      >
                        <span className="text-gray-700 truncate mr-1">
                          {getSortByLabel()}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showSortFilterDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showSortFilterDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                          {sortByOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                onFiltersChange({
                                  sortBy: option.value
                                });
                                setShowSortFilterDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${filters.sortBy === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                                }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sort Order Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                    <div className="relative dropdown-container">
                      <button
                        onClick={() => setShowSortOrderFilterDropdown(!showSortOrderFilterDropdown)}
                        className="flex items-center justify-between w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                      >
                        <span className="text-gray-700 truncate mr-1">
                          {getSortOrderLabel()}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${showSortOrderFilterDropdown ? 'rotate-180' : ''}`} />
                      </button>
                      {showSortOrderFilterDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 max-h-48 overflow-y-auto">
                          {sortOrderOptions.map((option) => (
                            <button
                              key={option.value}
                              onClick={() => {
                                onFiltersChange({
                                  sortOrder: option.value
                                });
                                setShowSortOrderFilterDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${filters.sortOrder === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
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
                      onClick={clearAllFilters}
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
        {(filters.search || filters.category || filters.dept || filters.brand || filters.location || filters.room || filters.rack || filters.stockStatus !== 'all' || filters.sortBy !== 'product.name' || filters.sortOrder !== 'asc') && (
          <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-t border-gray-100">
            <div className="flex items-center text-sm text-gray-600">
              <span className="font-medium">{totalDatas}</span>
              <span className="mx-1">of</span>
              <span>{totalDatas}</span>
              <span className="ml-1">items found</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Active filters:</span>

              {filters.search && (
                <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
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
                <span className="inline-flex items-center px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">
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
                <span className="inline-flex items-center px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">
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
                <span className="inline-flex items-center px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full">
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
                <span className="inline-flex items-center px-1.5 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                  {stockStatusOptions.find(s => s.value === filters.stockStatus)?.label}
                  <button
                    onClick={() => onFiltersChange({ stockStatus: 'all' })}
                    className="ml-1 text-orange-600 hover:text-orange-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}

              {(filters.sortBy !== 'product.name' || filters.sortOrder !== 'asc') && (
                <span className="inline-flex items-center px-1.5 py-0.5 bg-indigo-100 text-indigo-800 text-xs rounded-full">
                  {getSortByLabel()} - {getSortOrderLabel()}
                  <button
                    onClick={() => onFiltersChange({ sortBy: 'product.name', sortOrder: 'asc' })}
                    className="ml-1 text-indigo-600 hover:text-indigo-800 font-bold"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Force scrollbar visibility CSS */}
      <style>{`
        .inventory-scroll::-webkit-scrollbar {
          -webkit-appearance: none;
          height: 15px;
          background: #f1f1f1;
        }
        .inventory-scroll::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        .inventory-scroll::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
      `}</style>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-scroll">
        <div
          className="overflow-x-scroll inventory-scroll h-[560px]"
          style={{
            scrollbarWidth: 'thin',
            scrollbarGutter: 'stable both-edges',
            WebkitOverflowScrolling: 'touch',
            msOverflowStyle: 'scrollbar',
            overflowX: 'scroll !important' as any
          }}
        >
          <table className="w-full min-w-[2400px] table-fixed">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Product Name</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Part No</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Category</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Brand</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Department</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Current Qty</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Reserved Qty</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Available Qty</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Location</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Room</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Rack</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">UOM</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Unit Price</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">GST %</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">GNDP</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">CPCB No</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">HSN Number</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Status</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">Last Updated</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 overflow-y-scroll">
              {loading ? (
                <tr>
                  <td colSpan={20} className="px-6 py-8 text-center text-gray-500">Loading inventory...</td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={20} className="px-6 py-8 text-center text-gray-500">No inventory items found</td>
                </tr>
              ) : (
                inventory.map((item, idx) => {
                  const status = getStockStatusTable(item);
                  const StatusIcon = status.icon;
                  return (
                    <tr key={item._id || idx} className="hover:bg-gray-50 transition-colors">
                      {/* Product Name */}
                      <td className="px-3 py-3 text-sm font-medium text-gray-900 break-words">
                        {item.product?.name || 'N/A'}
                      </td>
                      
                      {/* Part No */}
                      <td className="px-3 py-3 text-xs font-bold text-black font-mono">
                        {item.product?.partNo || 'N/A'}
                      </td>
                      
                      {/* Category */}
                      <td className="px-3 py-3 text-xs text-gray-700 capitalize">
                        {item.product?.category || 'N/A'}
                      </td>
                      
                      {/* Brand */}
                      <td className="px-3 py-3 text-xs text-gray-700">
                        {item.product?.brand || 'N/A'}
                      </td>
                      
                      {/* Department */}
                      <td className="px-3 py-3 text-xs text-gray-700 uppercase">
                        {item.product?.dept || 'N/A'}
                      </td>
                      
                      {/* Current Quantity */}
                      <td className="px-3 py-3 text-sm font-bold text-gray-900 text-center">
                        {item.quantity}
                      </td>
                      
                      {/* Reserved Quantity */}
                      <td className="px-3 py-3 text-sm font-medium text-orange-600 text-center">
                        {item.reservedQuantity || 0}
                      </td>
                      
                      {/* Available Quantity */}
                      <td className="px-3 py-3 text-sm font-medium text-green-600 text-center">
                        {item.availableQuantity}
                      </td>
                      
                      {/* Location */}
                      <td className="px-3 py-3 text-xs text-gray-900">
                        {item.location?.name || <span className="text-red-500">Unassigned</span>}
                      </td>
                      
                      {/* Room */}
                      <td className="px-3 py-3 text-xs text-gray-700">
                        {item.room?.name || <span className="text-red-500">Unassigned</span>}
                      </td>
                      
                      {/* Rack */}
                      <td className="px-3 py-3 text-xs text-gray-600">
                        {item.rack?.name || <span className="text-red-500">Unassigned</span>}
                      </td>
                      
                      {/* UOM */}
                      <td className="px-3 py-3 text-xs text-gray-700">
                        {item.product?.uom || 'N/A'}
                      </td>
                      
                      {/* Unit Price */}
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">
                        {item.product?.price !== undefined ? `₹${item.product.price.toFixed(2)}` : 'N/A'}
                      </td>
                      
                      {/* GST % */}
                      <td className="px-3 py-3 text-xs text-gray-700">
                        {item.product?.gst || 0}%
                      </td>
                      
                      {/* GNDP */}
                      <td className="px-3 py-3 text-sm font-medium text-gray-900">
                        ₹{(item.product?.gndp || 0).toFixed(2)}
                      </td>
                      
                      {/* CPCB No */}
                      <td className="px-3 py-3 text-xs text-gray-700">
                        {item.product?.cpcbNo || 'N/A'}
                      </td>
                      
                      {/* HSN Number */}
                      <td className="px-3 py-3 text-xs text-gray-700">
                        {item.product?.hsnNumber || 'N/A'}
                      </td>
                      
                      {/* Status */}
                      <td className="px-3 py-3">
                        <Badge variant={status.variant} size="xs">
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </td>
                      
                      {/* Last Updated */}
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {new Date(item?.lastUpdated).toLocaleDateString()}
                      </td>
                      
                      {/* Actions */}
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleUpdateStock(item)}
                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                            title="Adjust Stock"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => viewStockHistory(item)}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 transition-colors"
                            title="View History"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleTransferStock(item)}
                            className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                            title="Transfer Stock"
                          >
                            <ArrowUpDown className="w-4 h-4" />
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

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        totalItems={totalDatas}
        itemsPerPage={limit}
      />

      {/* Add Location Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-[1200px] h-[600px] m-4 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditingLocation ? 'Edit Location' : 'Manage Stock Locations'}
              </h2>
              <button
                onClick={() => {
                  setShowLocationModal(false);
                  setShowLocationTypeDropdown(false);
                  setRecentLocations([]);
                  setRecentRooms([]);
                  setRecentRacks([]);
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
                            onChange={(e) => {
                              const value = e.target.value;
                              // Allow only "+" at the start and digits
                              if (/^$|^\+?[0-9]*$/.test(value)) {
                                setLocationFormData({ ...locationFormData, phone: value });
                              }
                            }}
                            maxLength={15}
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g. +1234567890"
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
                            setRecentLocations([]);
                            setRecentRooms([]);
                            setRecentRacks([]);
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
                    {isEditingLocation ? 'Edit Room' : 'Add New Room'}
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

                    {/* <div className="flex items-center">
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
                    </div> */}

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

                    {/* <div className="flex items-center">
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
                    </div> */}

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
                  <span className="text-sm text-gray-500">{activeTab === 'locations' ? locations.length : activeTab === 'rooms' ? rooms.length : racks.length + recentRacks.length} {activeTab === 'locations' ? 'locations' : activeTab === 'rooms' ? 'rooms' : 'racks'}</span>
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
                        Locations ({locations.filter(
                          (location) => !recentLocations.some((recent) => recent._id === location._id)
                        ).length + recentLocations.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('rooms')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'rooms'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        <Archive className="w-4 h-4 inline mr-2" />
                        Rooms ({rooms.filter(
                          (room) => !recentRooms.some((recent) => recent._id === room._id)
                        ).length + recentRooms.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('racks')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'racks'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                      >
                        <MapPin className="w-4 h-4 inline mr-2" />
                        Racks ({racks.length + recentRacks.length})
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
                        {/* Recent Locations */}
                        {recentLocations.map((location) => (
                          <div key={location._id} className="border border-gray-200 bg-green-100 hover:bg-green-50 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium text-gray-900">{location.name}</h4>
                                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${location.isActive
                                    ? 'bg-green-200 text-green-800'
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

                        {/* All Locations with Pagination */}
                        {locations.filter(
                          (location) => !recentLocations.some((recent) => recent._id === location._id)
                        ).sort((a, b) => a.name.localeCompare(b.name))
                          .map((location) => (
                            <div key={location._id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-gray-900">{location.name}</h4>
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${location.isActive
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
                        {recentRooms.map((room) => (
                          <div key={room._id} className="border border-gray-200 bg-green-100 hover:bg-green-50 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <Archive className="w-4 h-4 text-green-500 mr-2" />
                                  <h4 className="font-medium text-gray-900">{room.name}</h4>
                                  <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full ${room.isActive ? 'bg-green-200 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {room.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                  <span className="text-sm ml-4 text-gray-600">
                                    Racks Count: {racks.filter(rack => rack.room && rack.room._id === room._id).length}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  Location: {
                                    locations.find(loc => loc._id === room.location)?.name || 'Unknown'
                                  }
                                </p>
                                {room.description && (
                                  <p className="text-xs text-gray-500 mt-1">{room.description}</p>
                                )}
                                {/* <div className="mt-1">
                                  <span className="text-sm text-gray-600">
                                    Racks: {racks.filter(rack => rack.room._id === room._id).length}
                                  </span>
                                </div> */}
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
                        {rooms.filter(
                          (room) => !recentRooms.some((recent) => recent._id === room._id)
                        ).sort((a, b) => a.name.localeCompare(b.name)).map((room) => (
                          <div key={room._id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <Archive className="w-4 h-4 text-green-500 mr-2" />
                                  <h4 className="font-medium text-gray-900">{room.name}</h4>
                                  <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full ${room.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {room.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                  <span className="text-sm ml-4 text-gray-600">
                                    Racks Count: {racks.filter(rack => rack.room && rack.room._id === room._id).length}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  Location: {
                                    locations.find(loc => loc._id === (room.location?._id || room.location))?.name || 'Unknown'
                                  }
                                </p>
                                {room.description && (
                                  <p className="text-xs text-gray-500 mt-1">{room.description}</p>
                                )}
                                {/* <div className="mt-1">
                                  <span className="text-sm text-gray-600">
                                    Racks: {racks.filter(rack => rack.room._id === room._id).length}
                                  </span>
                                </div> */}
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
                        {recentRacks.map((rack) => (
                          <div key={rack._id} className="border border-gray-200 bg-green-100 hover:bg-green-50 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 text-purple-500 mr-2" />
                                  <h4 className="font-medium text-gray-900">{rack.name}</h4>
                                  <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full ${rack.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {rack.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  Location: {
                                    locations.find(loc => loc._id === rack.location)?.name || 'Unknown'
                                  } &rarr; Room: {
                                    rooms.find(room => room._id === rack.room)?.name || 'Unknown'
                                  }
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
                        {racks.sort((a, b) => a.name.localeCompare(b.name)).map((rack) => (
                          <div key={rack._id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 text-purple-500 mr-2" />
                                  <h4 className="font-medium text-gray-900">{rack.name}</h4>
                                  <span className={`ml-2 px-1.5 py-0.5 text-xs font-medium rounded-full ${rack.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {rack.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  Location: {
                                    locations.find(loc => loc._id === (rack.location?._id || rack.location))?.name || 'Unknown'
                                  } &rarr; Room: {
                                    rooms.find(room => room._id === (rack.room?._id || rack.room))?.name || 'Unknown'
                                  }
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
                                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
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
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg">
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
                            const freshStock = await getCurrentStockStatus(transferFormData.stockId, transferFormData.product, transferFormData.fromLocation);
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
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.toLocation ? 'border-red-500' : 'border-gray-300'
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
                        {rooms.filter(room => room.location && room.location._id === transferFormData.toLocation).map(room => (
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
                        {racks.filter(rack => rack.room && rack.room._id === transferFormData.toRoom).map(rack => (
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
                        className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${formErrors.quantity ? 'border-red-500' : 'border-gray-300'
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
                      stockId: '',
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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Stock History - {selectedItem.product.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  @ {selectedItem.location.name} • Complete transaction history for this item
                </p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Current Stock Status */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Current Stock Status</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                  <div className="flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-600 mr-2" />
                    <p className="text-2xl font-bold text-gray-900">{selectedItem.quantity}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Total Stock</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                  <div className="flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                    <p className="text-2xl font-bold text-yellow-600">{selectedItem.reservedQuantity}</p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Reserved</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200 text-center">
                  <div className="flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                    <p className="text-2xl font-bold text-green-600">
                      {selectedItem.availableQuantity || (selectedItem.quantity - (selectedItem.reservedQuantity || 0))}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Available</p>
                </div>
              </div>
            </div>

            {/* Transaction Stats Cards */}
            <div className="p-4 bg-white border-b border-gray-200">
              {(() => {
                const stats = calculateHistoryStats(stockTransactions);
                return (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div 
                      className={`cursor-pointer transition-all hover:scale-105 border rounded-lg p-3 ${
                        historyFilter === 'all' 
                          ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-200' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => handleHistoryFilterClick('all')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 font-medium">All Transactions</p>
                          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                        </div>
                        <Package className="w-6 h-6 text-gray-500" />
                      </div>
                    </div>

                    <div 
                      className={`cursor-pointer transition-all hover:scale-105 border rounded-lg p-3 ${
                        historyFilter === 'inward' 
                          ? 'bg-green-100 border-green-300 ring-2 ring-green-200' 
                          : 'bg-green-50 border-green-200 hover:bg-green-100'
                      }`}
                      onClick={() => handleHistoryFilterClick('inward')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-green-600 font-medium">Inward</p>
                          <p className="text-xl font-bold text-green-700">{stats.inward}</p>
                          <p className="text-xs text-green-600">+{stats.inwardQty}</p>
                        </div>
                        <TrendingUp className="w-6 h-6 text-green-500" />
                      </div>
                    </div>

                    <div 
                      className={`cursor-pointer transition-all hover:scale-105 border rounded-lg p-3 ${
                        historyFilter === 'outward' 
                          ? 'bg-red-100 border-red-300 ring-2 ring-red-200' 
                          : 'bg-red-50 border-red-200 hover:bg-red-100'
                      }`}
                      onClick={() => handleHistoryFilterClick('outward')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-red-600 font-medium">Outward</p>
                          <p className="text-xl font-bold text-red-700">{stats.outward}</p>
                          <p className="text-xs text-red-600">-{stats.outwardQty}</p>
                        </div>
                        <TrendingDown className="w-6 h-6 text-red-500" />
                      </div>
                    </div>

                    <div 
                      className={`cursor-pointer transition-all hover:scale-105 border rounded-lg p-3 ${
                        historyFilter === 'transfer' 
                          ? 'bg-purple-100 border-purple-300 ring-2 ring-purple-200' 
                          : 'bg-purple-50 border-purple-200 hover:bg-purple-100'
                      }`}
                      onClick={() => handleHistoryFilterClick('transfer')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-purple-600 font-medium">Transfers</p>
                          <p className="text-xl font-bold text-purple-700">{stats.transfer}</p>
                        </div>
                        <ArrowLeftRight className="w-6 h-6 text-purple-500" />
                      </div>
                    </div>

                    <div 
                      className={`cursor-pointer transition-all hover:scale-105 border rounded-lg p-3 ${
                        historyFilter === 'reservation' 
                          ? 'bg-orange-100 border-orange-300 ring-2 ring-orange-200' 
                          : 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                      }`}
                      onClick={() => handleHistoryFilterClick('reservation')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-orange-600 font-medium">Reservations</p>
                          <p className="text-xl font-bold text-orange-700">{stats.reservation}</p>
                        </div>
                        <AlertTriangle className="w-6 h-6 text-orange-500" />
                      </div>
                    </div>

                    <div 
                      className={`cursor-pointer transition-all hover:scale-105 border rounded-lg p-3 ${
                        historyFilter === 'release' 
                          ? 'bg-blue-100 border-blue-300 ring-2 ring-blue-200' 
                          : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                      }`}
                      onClick={() => handleHistoryFilterClick('release')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-600 font-medium">Releases</p>
                          <p className="text-xl font-bold text-blue-700">{stats.release}</p>
                        </div>
                        <RefreshCw className="w-6 h-6 text-blue-500" />
                      </div>
                    </div>

                    <div 
                      className={`cursor-pointer transition-all hover:scale-105 border rounded-lg p-3 ${
                        historyFilter === 'adjustment' 
                          ? 'bg-gray-100 border-gray-300 ring-2 ring-gray-200' 
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => handleHistoryFilterClick('adjustment')}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 font-medium">Adjustments</p>
                          <p className="text-xl font-bold text-gray-700">{stats.adjustment}</p>
                        </div>
                        <Settings className="w-6 h-6 text-gray-500" />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Active Filter Indicator */}
            {historyFilter !== 'all' && (
              <div className="px-4 py-2 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                <div className="flex items-center text-sm text-blue-800">
                  <span className="font-medium">Filtered by:</span>
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                    {historyFilter}
                  </span>
                  <span className="ml-2 text-blue-600">
                    ({filteredStockTransactions.length} of {stockTransactions.length} transactions)
                  </span>
                </div>
                <button
                  onClick={() => handleHistoryFilterClick('all')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Clear Filter
                </button>
              </div>
            )}

            {/* Transaction History Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
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
                  {filteredStockTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        {historyFilter === 'all' ? 'No transactions found' : `No ${historyFilter} transactions found`}
                      </td>
                    </tr>
                  ) : (
                    filteredStockTransactions.map((transaction) => (
                      <tr key={transaction._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-xs text-gray-900">
                          {new Date(transaction.date).toLocaleDateString()}
                          <div className="text-xs text-gray-500">
                            {new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${transaction.type === 'inward' ? 'bg-green-100 text-green-800' :
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
      )}

      {/* Stock Ledger Modal */}
      {showLedgerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[95vw] m-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Stock Ledger - Detailed Report</h2>
                <p className="text-sm text-gray-600">Complete inventory movement with opening, inwards, outwards, and closing balances</p>
              </div>
              <button
                onClick={() => setShowLedgerModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filters */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                <div className="relative">
                  <label className="block text-xs text-gray-600 mb-1">Search</label>
                  <Search className="absolute mt-2 pt-1 left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={ledgerFilters.search}
                    onChange={(e) => {
                      setLedgerFilters({ ...ledgerFilters, search: e.target.value });
                      setLedgerPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                {/* Date Range Custom Dropdown */}
                <div className="relative dropdown-container">
                  <label className="block text-xs text-gray-600 mb-1">Date Range</label>
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
                            let newDates = { fromDate: '', toDate: '' };
                            if (option.value) {
                              const days = parseInt(option.value, 10);
                              const toDate = new Date();
                              const fromDate = new Date();
                              fromDate.setDate(toDate.getDate() - days + 1);
                              
                              newDates = {
                                fromDate: formatDateToString(fromDate),
                                toDate: formatDateToString(toDate)
                              };
                            }
                            setLedgerFilters({ ...ledgerFilters, dateRange: option.value, ...newDates });
                            setShowDateRangeDropdown(false);
                            setLedgerPagination(prev => ({ ...prev, page: 1 }));
                          }}
                          className={`w-full px-3 py-1.5 text-left hover:bg-gray-50 transition-colors text-sm ${ledgerFilters.dateRange === option.value ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* From Date input */}
                <div className="relative">
                  <label className="block text-xs text-gray-600 mb-1">From Date</label>
                  <Flatpickr
                    value={ledgerFilters.fromDate}
                    onChange={(dates) => {
                      const fromDate = dates[0] ? formatDateToString(dates[0]) : '';
                      setLedgerFilters({ ...ledgerFilters, fromDate, dateRange: '' });
                      setLedgerPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    options={{
                      dateFormat: 'd/m/Y',
                      altInput: true,
                      altFormat: 'd/m/Y',
                      allowInput: true,
                      time_24hr: true,
                      parseDate: (datestr) => {
                        const parts = datestr.split('/');
                        if (parts.length === 3) {
                          const day = parseInt(parts[0], 10);
                          const month = parseInt(parts[1], 10) - 1;
                          const year = parseInt(parts[2], 10);
                          const date = new Date(year, month, day, 12, 0, 0);
                          return date;
                        }
                        return new Date(datestr);
                      },
                      maxDate: ledgerFilters.toDate ? new Date(ledgerFilters.toDate) : new Date(),
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="From date"
                  />
                </div>

                {/* To Date input */}
                <div className="relative">
                  <label className="block text-xs text-gray-600 mb-1">To Date</label>
                  <Flatpickr
                    value={ledgerFilters.toDate}
                    onChange={(dates) => {
                      const toDate = dates[0] ? formatDateToString(dates[0]) : '';
                      setLedgerFilters({ ...ledgerFilters, toDate, dateRange: '' });
                      setLedgerPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    options={{
                      dateFormat: 'd/m/Y',
                      altInput: true,
                      altFormat: 'd/m/Y',
                      allowInput: true,
                      time_24hr: true,
                      parseDate: (datestr) => {
                        const parts = datestr.split('/');
                        if (parts.length === 3) {
                          const day = parseInt(parts[0], 10);
                          const month = parseInt(parts[1], 10) - 1;
                          const year = parseInt(parts[2], 10);
                          const date = new Date(year, month, day, 12, 0, 0);
                          return date;
                        }
                        return new Date(datestr);
                      },
                      minDate: ledgerFilters.fromDate ? new Date(ledgerFilters.fromDate) : undefined,
                      maxDate: new Date(),
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="To date"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Showing {stockLedgerData.length} of {ledgerPagination.total} products</span>
                <span>Page {ledgerPagination.page} of {ledgerPagination.pages}</span>
              </div>
            </div>

            {/* Detailed Ledger Table */}
            <div className="flex-1 overflow-auto">
              <div className="min-w-full">
                <table className="w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100 sticky top-0">
                                         <tr>
                       <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Description</th>
                       <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Part Number</th>
                       
                       {/* Opening Balance */}
                       <th colSpan={3} className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                         Opening Balance
                       </th>
                       
                       {/* Inwards */}
                       <th colSpan={3} className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                         Inwards
                       </th>
                       
                       {/* Outwards */}
                       <th colSpan={6} className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                         Outwards
                       </th>
                       
                       {/* Closing Balance */}
                       <th colSpan={3} className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                         Closing Balance
                       </th>
                     </tr>
                     <tr>
                       <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"></th>
                       <th className="border border-gray-300 px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"></th>
                       
                       {/* Opening Balance sub-headers */}
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</th>
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Rate</th>
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Value</th>
                       
                       {/* Inwards sub-headers */}
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</th>
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Rate</th>
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Value</th>
                       
                       {/* Outwards sub-headers */}
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</th>
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Rate</th>
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Value</th>
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Consumption</th>
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Gross Profit</th>
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Perc %</th>
                       
                       {/* Closing Balance sub-headers */}
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</th>
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Rate</th>
                       <th className="border border-gray-300 px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">Value</th>
                     </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading && stockLedgerData.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="px-4 py-8 text-center text-gray-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Loading ledger data...
                        </td>
                      </tr>
                    ) : stockLedgerData.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="px-4 py-8 text-center text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p>No ledger data found</p>
                          <p className="text-xs text-gray-400">Try adjusting your filters</p>
                        </td>
                      </tr>
                    ) : (
                      stockLedgerData.map((ledger, index) => {
                        // Calculate values for the detailed format
                        const openingQty = ledger.previousQuantity || 0;
                        const openingRate = ledger.product?.price || 100; // Default price if not set
                        const openingValue = openingQty * openingRate;
                        
                        const inwardsQty = ledger.transactionType === 'inward' ? ledger.quantity : 0;
                        const inwardsRate = ledger.product?.price || 100; // Default price if not set
                        const inwardsValue = inwardsQty * inwardsRate;
                        
                        // For outward quantity, we need to show the actual outward quantity from the transaction
                        // Outward transactions typically have negative quantities, so we take the absolute value
                        const outwardsQty = ledger.transactionType === 'outward' ? Math.abs(ledger.quantity) : 0;
                        const outwardsRate = ledger.product?.price || 100; // Default price if not set
                        const outwardsValue = outwardsQty * outwardsRate;
                        
                        // Formula: Consumption = Value of Opening Stock + Inward Value - Outward Value
                        const consumption = openingValue + inwardsValue - outwardsValue;
                        
                        // Formula: Gross Profit = Value of Outward - Value of Consumption
                        const grossProfit = outwardsValue - consumption;
                        const profitPercentage = consumption > 0 ? (grossProfit / consumption) * 100 : 0;
                        
                        const closingQty = ledger.resultingQuantity || 0;
                        const closingRate = ledger.product?.price || 100; // Default price if not set
                        const closingValue = closingQty * closingRate;
                        
                        return (
                          <tr key={ledger._id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900">
                              {ledger.product?.name || 'Unknown Product'}
                            </td>
                            <td className="border border-gray-300 px-3 py-2 text-xs text-gray-600 font-mono">
                              {ledger.product?.partNo || 'N/A'}
                            </td>
                            
                                                         {/* Opening Balance */}
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                               {openingQty.toFixed(2)} {ledger.product?.uom || 'Nos.'}
                             </td>
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                               ₹{openingRate.toFixed(2)}
                             </td>
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center font-medium">
                               ₹{openingValue.toFixed(2)}
                             </td>
                             
                             {/* Inwards */}
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                               {inwardsQty.toFixed(2)} {ledger.product?.uom || 'Nos.'}
                             </td>
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                               ₹{inwardsRate.toFixed(2)}
                             </td>
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center font-medium">
                               ₹{inwardsValue.toFixed(2)}
                             </td>
                             
                             {/* Outwards */}
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                               {outwardsQty.toFixed(2)} {ledger.product?.uom || 'Nos.'}
                             </td>
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                               ₹{outwardsRate.toFixed(2)}
                             </td>
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center font-medium">
                               ₹{outwardsValue.toFixed(2)}
                             </td>
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                               ₹{consumption.toFixed(2)}
                             </td>
                             <td className={`border border-gray-300 px-3 py-2 text-xs text-center font-medium ${grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                               ₹{grossProfit.toFixed(2)}
                             </td>
                             <td className={`border border-gray-300 px-3 py-2 text-xs text-center font-medium ${profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                               {profitPercentage.toFixed(2)}%
                             </td>
                             
                             {/* Closing Balance */}
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                               {closingQty.toFixed(2)} {ledger.product?.uom || 'Nos.'}
                             </td>
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center">
                               ₹{closingRate.toFixed(2)}
                             </td>
                             <td className="border border-gray-300 px-3 py-2 text-xs text-center font-medium">
                               ₹{closingValue.toFixed(2)}
                             </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {ledgerPagination.pages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setLedgerPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={ledgerPagination.page <= 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {ledgerPagination.page} of {ledgerPagination.pages}
                  </span>
                  <button
                    onClick={() => setLedgerPagination(prev => ({ ...prev, page: prev.page + 1 }))}
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

      {/* Import Excel Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Import Inventory from Excel</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-6">
                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Import Instructions</h3>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Download the template file to see the required format</li>
                    <li>• Fill in your inventory data following the column headers</li>
                    <li>• Products will be created/updated automatically</li>
                    <li>• Stock levels will be set based on QTY column</li>
                  </ul>
                </div>

                {/* Template Download */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Excel Template</h4>
                    <p className="text-sm text-gray-600">Download the template with sample data</p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('authToken');

                        const blob = await apiClient.inventory.downloadTemplate();

                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'inventory-template.xlsx';
                        link.click();
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error('❌ Template download error:', error);
                        const errorMessage = error instanceof Error ? error.message : 'Network error';
                        alert(`Failed to download template: ${errorMessage}`);
                      }
                    }}
                    className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Download Template
                  </button>
                </div>

                {/* File Upload */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-900">Upload Excel File</h4>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setSelectedFile(file);
                      }}
                      className="hidden"
                      id="import-file"
                    />
                    <label
                      htmlFor="import-file"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <Archive className="w-12 h-12 text-gray-400" />
                      <div className="text-sm text-gray-600">
                        <span className="text-blue-600 hover:text-blue-700 font-medium">
                          Click to upload
                        </span>{' '}
                        or drag and drop
                      </div>
                      <div className="text-xs text-gray-500">
                        Excel (.xlsx, .xls) or CSV files only
                      </div>
                    </label>
                  </div>
                </div>

                {/* Selected File Display */}
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Archive className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-900">{selectedFile.name}</p>
                        <p className="text-xs text-green-700">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!selectedFile) {
                      console.error('❌ No file selected for import');
                      return;
                    }

                    setImporting(true);
                    try {
                      const result = await apiClient.inventory.previewImport(selectedFile);

                      setPreviewData(result.data);
                      setShowPreviewModal(true);
                      setShowImportModal(false);
                      toast.success(result.message || 'Preview successful');
                    } catch (error) {
                      console.error('❌ Preview error:', error);
                      const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.';
                      //  alert(`Preview failed: ${errorMessage}`);
                      toast.error(`Preview failed: ${errorMessage}`);
                    } finally {
                      setImporting(false);
                    }
                  }}
                  disabled={!selectedFile || importing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Generating Preview...' : 'Preview Import'}
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
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewData(null);
                  setSelectedFile(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Rows</p>
                      <p className="text-2xl font-bold text-blue-900">{previewData.summary?.totalRows || 0}</p>
                    </div>
                    <Package className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">New Products</p>
                      <p className="text-2xl font-bold text-green-900">{previewData.summary?.newProducts || 0}</p>
                    </div>
                    <Plus className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Stock Updates</p>
                      <p className="text-2xl font-bold text-yellow-900">{previewData.summary?.stockUpdates || 0}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-yellow-600" />
                  </div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">Errors</p>
                      <p className="text-2xl font-bold text-red-900">{previewData.errors?.length || 0}</p>
                    </div>
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                </div>
                {/* Duplicate Rows Card */}
                <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-700 font-medium">Duplicate Rows</p>
                      <p className="text-2xl font-bold text-yellow-900">{previewData.duplicateGroups ? previewData.duplicateGroups.length : 0}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-yellow-700" />
                  </div>
                </div>
              </div>


              {/* Errors Section */}
              {previewData.errors && previewData.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Import Errors</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <ul className="list-disc list-inside space-y-1">
                          {previewData.errors.slice(0, 10).map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                        {previewData.errors.length > 10 && (
                          <p className="mt-2 text-red-600 font-medium">
                            ... and {previewData.errors.length - 10} more errors
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Sample Data Preview */}
              {previewData.sample && previewData.sample.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Sample Data (First 5 rows)</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 text-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Part No</th>
                          <th className="px-3 py-2 text-left font-medium">Description</th>
                          <th className="px-3 py-2 text-left font-medium">Department</th>
                          <th className="px-3 py-2 text-left font-medium">Quantity</th>
                          <th className="px-3 py-2 text-left font-medium">Unit Price</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {previewData.sample.slice(0, 5).map((item: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-xs">{item['PART NO']}</td>
                            <td className="px-3 py-2">{item.DESCRIPTION}</td>
                            <td className="px-3 py-2">{item.DEPT}</td>
                            <td className="px-3 py-2">{item.QTY}</td>
                            <td className="px-3 py-2">₹{item.MRP?.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${item.status === 'new' ? 'bg-green-100 text-green-800' :
                                item.status === 'existing' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                {item.status || 'Unknown'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Duplicate Rows Card */}
              <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-300 shadow-sm mx-auto">
                <h3 className="text-xl font-semibold text-yellow-900 mb-4 text-left">
                  Duplicate Groups (by Part No)
                </h3>

                <div className="relative">
                  <div
                    ref={duplicateGroupsScrollRef}
                    className="overflow-y-auto max-h-96 pr-2 space-y-4"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#fbbf24 #fef3c7' }}
                  >
                    {previewData?.duplicateGroups?.length > 0 ? (
                      previewData.duplicateGroups.map((group: any, groupIdx: number) => (
                        <div key={groupIdx} className="border border-yellow-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                          {/* Group Header */}
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-yellow-100">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-semibold bg-yellow-200 px-3 py-1 rounded-md text-yellow-900 text-sm">
                                {group.key}
                              </span>
                              <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                                {group.rows.length} rows
                              </span>
                            </div>
                          </div>

                          {/* Data Table */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-yellow-100 border-b border-yellow-200">
                                  <th className="w-1/4 px-4 py-2 text-left font-semibold text-yellow-900 rounded-tl-md">
                                    Part No
                                  </th>
                                  <th className="w-1/4 px-4 py-2 text-left font-semibold text-yellow-900">
                                    Room
                                  </th>
                                  <th className="w-1/4 px-4 py-2 text-left font-semibold text-yellow-900">
                                    Rack
                                  </th>
                                  <th className="w-1/4 px-4 py-2 text-left font-semibold text-yellow-900 rounded-tr-md">
                                    Quantity
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.rows.map((row: any, idx: number) => (
                                  <tr
                                    key={idx}
                                    className={`
                            border-b border-yellow-100 transition-colors duration-150
                            ${idx % 2 === 0 ? 'bg-yellow-25 hover:bg-yellow-50' : 'bg-white hover:bg-yellow-25'}
                          `}
                                  >
                                    <td className="px-4 py-2 font-mono text-gray-800">
                                      {row['PART NO']}
                                    </td>
                                    <td className="px-4 py-2 text-gray-700 font-medium">
                                      {row.ROOM || row.Room || row.room}
                                    </td>
                                    <td className="px-4 py-2 text-gray-700 font-medium">
                                      {row.RACK || row.Rack || row.rack}
                                    </td>
                                    <td className="px-4 py-2 text-gray-800 font-semibold">
                                      {row.QTY}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-yellow-700 text-center py-8">
                        <div className="text-lg font-medium mb-2">No duplicate groups found</div>
                        <div className="text-sm text-yellow-600">All part numbers are unique in your inventory</div>
                      </div>
                    )}
                  </div>

                  {/* Scroll Indicator */}
                  {showScrollIndicator && (
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-2 pointer-events-none flex justify-center">
                      <ChevronDown className="w-7 h-7 text-yellow-500 opacity-70 animate-bounce" />
                    </div>
                  )}
                </div>

                {/* Summary Footer */}
                {previewData?.duplicateGroups?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-yellow-200 flex justify-between items-center text-sm text-yellow-700">
                    <span>
                      Total duplicate groups: <strong>{previewData.duplicateGroups.length}</strong>
                    </span>
                    <span>
                      Total affected items: <strong>
                        {previewData.duplicateGroups.reduce((sum: number, group: any) => sum + group.rows.length, 0)}
                      </strong>
                    </span>
                  </div>
                )}
              </div>


              {/* Duplicate Rows Section */}
              {/* {previewData.duplicateRows && previewData.duplicateRows.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
                  <h3 className="text-lg font-medium text-yellow-900 mb-2">Duplicate Rows Detected</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-yellow-100 text-yellow-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Part No</th>
                          <th className="px-3 py-2 text-left font-medium">Room</th>
                          <th className="px-3 py-2 text-left font-medium">Rack</th>
                          <th className="px-3 py-2 text-left font-medium">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-yellow-200">
                        {previewData.duplicateRows.map((row: any, idx: number) => (
                          <tr key={idx} className="hover:bg-yellow-50">
                            <td className="px-3 py-2 font-mono text-xs">{row['PART NO']}</td>
                            <td className="px-3 py-2">{row.ROOM || row.Room || row.room}</td>
                            <td className="px-3 py-2">{row.RACK || row.Rack || row.rack}</td>
                            <td className="px-3 py-2">{row.QTY}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-yellow-700 text-sm">
                    {previewData.duplicateRows.length} duplicate row(s) found. These rows have the same Part No, Room, and Rack as another row in your file.
                  </p>
                  {previewData.duplicatesFileUrl && (
                    <a
                      href={previewData.duplicatesFileUrl}
                      className="inline-block mt-2 text-yellow-800 underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Download Duplicates as Excel
                    </a>
                  )}
                </div>
              )} */}


            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowPreviewModal(false);
                  setPreviewData(null);
                  setSelectedFile(null);
                }}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel Import
              </button>
              <button
                onClick={async () => {
                  if (!selectedFile) return;
                  setImporting(true);
                  setImportProgress(0);
                  setProcessing(false);
                  setShowPreviewModal(false);
                  try {
                    const formData = new FormData();
                    formData.append('file', selectedFile);
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', '/api/v1/inventory/import', true);
                    // Add Authorization header from localStorage
                    const token = localStorage.getItem('authToken');
                    if (token) {
                      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                    }
                    xhr.upload.onprogress = (event) => {
                      if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        setImportProgress(percent);
                        if (percent === 100) {
                          setProcessing(true); // switch to processing stage
                        }
                      }
                    };

                    xhr.onload = async function () {
                      setImporting(false);
                      setProcessing(false);
                      setImportProgress(100);
                      if (xhr.status === 200) {
                        const result = JSON.parse(xhr.responseText);
                        toast.success(`Import completed! ${result.data.successful} items imported successfully.`);
                        setSelectedFile(null);
                        setPreviewData(null);
                        fetchAllData();
                      } else {
                        toast.error('Import failed. Please try again.');
                      }
                    };
                    xhr.onerror = function () {
                      setImporting(false);
                      setProcessing(false);
                      toast.error('Failed to import file. Please try again.');
                    };
                    xhr.send(formData);
                  } catch (error) {
                    setImporting(false);
                    setProcessing(false);
                    toast.error('Failed to import file. Please try again.');
                  }
                }}
                disabled={importing || (previewData.errors && previewData.errors.length > 0)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {importing ? (
                  <span className="flex items-center justify-center">
                    <RefreshCw className="animate-spin w-5 h-5 mr-2" />
                    {processing ? 'Processing file, please wait...' : `Importing... ${importProgress}%`}
                  </span>
                ) : (
                  `Confirm Import (${previewData.summary?.totalRows || 0} rows)`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {importing && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl w-[90%] max-w-md space-y-6">
            <div className="flex items-center space-x-3">
              <RefreshCw className="animate-spin w-6 h-6 text-green-600" />
              <span className="text-base font-semibold text-green-700">
                {processing ? 'Processing file, please wait...' : 'Uploading file...'}
              </span>
            </div>

            {/* Progress bar wrapper */}
            <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${importProgress}%` }}
              ></div>
            </div>

            {/* Percentage */}
            {processing && (
              <div className="text-sm text-right font-medium text-gray-700">{importProgress}%</div>
            )}
          </div>
        </div>
      )}


    </div>
  );
};

export default InventoryManagement; 