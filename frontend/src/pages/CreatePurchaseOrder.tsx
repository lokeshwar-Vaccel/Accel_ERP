import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
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
type PurchaseOrderStatus = 'draft' | 'sent' | 'confirmed' | 'partially_received' | 'received' | 'cancelled';

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



interface POFormData {
    supplier: string;
    supplierEmail: string;
    supplierAddress?: SupplierAddress;
    expectedDeliveryDate: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    sourceType: 'manual' | 'amc' | 'service' | 'inventory';
    sourceId?: string;
    department?: string;
    notes?: string;
    items: POItem[];
}

const CreatePurchaseOrder: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

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
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        priority: 'low',
        sourceType: 'manual',
        sourceId: '',
        department: '',
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

    const [errors, setErrors] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [addresses, setAddresses] = useState<SupplierAddress[]>([]);
    const [loading, setLoading] = useState(true);

    // Dropdown states
    const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
    const [showAddressDropdown, setShowAddressDropdown] = useState(false);
    const [showProductDropdowns, setShowProductDropdowns] = useState<Record<number, boolean>>({});

    // Search states
    const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
    const [addressSearchTerm, setAddressSearchTerm] = useState('');
    const [productSearchTerms, setProductSearchTerms] = useState<Record<number, string>>({});

    // Search helper functions
    const updateProductSearchTerm = (itemIndex: number, searchTerm: string) => {
        setProductSearchTerms(prev => ({ ...prev, [itemIndex]: searchTerm }));
    };

    // Keyboard navigation states
    const [highlightedSupplierIndex, setHighlightedSupplierIndex] = useState(-1);
    const [highlightedAddressIndex, setHighlightedAddressIndex] = useState(-1);
    const [highlightedProductIndex, setHighlightedProductIndex] = useState<Record<number, number>>({});

    // Refs for keyboard navigation
    const formRef = useRef<HTMLFormElement>(null);
    const supplierInputRef = useRef<HTMLInputElement>(null);
    const addressInputRef = useRef<HTMLInputElement>(null);
    const deliveryDateInputRef = useRef<HTMLInputElement>(null);
    const prioritySelectRef = useRef<HTMLSelectElement>(null);
    const sourceTypeSelectRef = useRef<HTMLSelectElement>(null);
    const departmentSelectRef = useRef<HTMLSelectElement>(null);

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

            // Close supplier dropdown
            if (!target.closest('.dropdown-container')) {
                setShowSupplierDropdown(false);
                setShowAddressDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch data on component mount
    useEffect(() => {
        fetchAllData();
    }, []);

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
                    navigate('/purchase-order-management');
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
                fetchProducts()
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

        // Auto-focus on address field after supplier selection
        setTimeout(() => {
            addressInputRef.current?.focus();
            setShowAddressDropdown(true);
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

        // Auto-focus on delivery date field after address selection
        setTimeout(() => {
            deliveryDateInputRef.current?.focus();
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
        if (formData.items.length > 1) {
            setFormData(prev => ({
                ...prev,
                items: prev.items.filter((_, i) => i !== index)
            }));
        }
    };

    const updateItem = (index: number, field: keyof POItem, value: any) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.map((item, i) => {
                if (i === index) {
                    const updatedItem = { ...item, [field]: value };

                    // Auto-populate product fields when product is selected
                    if (field === 'product') {
                        const productObj = products.find(p => p._id === value);
                        if (productObj) {
                            updatedItem.gndp = productObj.gndp || 0;
                            updatedItem.name = productObj.name;
                            updatedItem.taxRate = productObj.gst || 0;
                            updatedItem.hsnNumber = (productObj as any).hsnNumber || '';
                            updatedItem.uom = (productObj as any).uom || 'Nos';
                        }
                    }

                    // Auto-calculate total price
                    if (field === 'quantity' || field === 'gndp' || field === 'taxRate') {
                        const quantity = field === 'quantity' ? value : item.quantity;
                        const gndp = field === 'gndp' ? value : item.gndp;
                        const taxRate = field === 'taxRate' ? value : item.taxRate;
                        const subtotal = quantity * gndp;
                        updatedItem.totalPrice = subtotal * (1 + (taxRate || 0) / 100);
                    }
                    return updatedItem;
                }
                return item;
            })
        }));
    };

    const getFilteredProducts = (searchTerm: string = '') => {
        return products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.partNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.brand?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    };

    const getProductName = (productId: string) => {
        const product = products.find(p => p._id === productId);
        return product?.name || '';
    };

    const getProductPartNo = (productId: string) => {
        const product = products.find(p => p._id === productId);
        return product?.partNo || '';
    };

    const getSupplierName = (supplierId: string) => {
        const supplier = suppliers.find(s => s._id === supplierId);
        return supplier?.name || '';
    };

    const getAddressLabel = (addressId: string) => {
        const address = addresses.find(a => a.id === addressId);
        if (!address) return '';
        return `${address.address}, ${address.district}, ${address.state} - ${address.pincode}`;
    };

    const validateForm = (): boolean => {
        const newErrors: string[] = [];

        if (!formData.supplier) {
            newErrors.push('Supplier is required');
        }
        if (!formData.expectedDeliveryDate) {
            newErrors.push('Expected delivery date is required');
        }
        if (!formData.supplierAddress?.address) {
            newErrors.push('Delivery address is required');
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
                if (!item.brand?.trim()) {
                    newErrors.push(`Brand is required for new product in item ${index + 1}`);
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
                toast.error('Please add at least one item to the purchase order');
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
                        brand: item.brand || 'Generic',
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

            console.log("updatedItems:",updatedItems);
            
            
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
                description: item.name || item.description || '', // Use name as description
                receivedQuantity: 0
            }));
            
            console.log("mappedItems:",mappedItems);
            // Validate that we have at least one valid item
            if (mappedItems.length === 0) {
                toast.error('Please add at least one item to the purchase order');
                return;
            }

            // Now create the purchase order with mapped items
            const response = await apiClient.purchaseOrders.create({
                supplier: formData.supplier,
                supplierEmail: formData.supplierEmail,
                supplierAddress: formData.supplierAddress,
                expectedDeliveryDate: formData.expectedDeliveryDate,
                priority: formData.priority,
                sourceType: formData.sourceType,
                sourceId: formData.sourceId,
                department: formData.department,
                notes: formData.notes,
                items: mappedItems,
                totalAmount: calculateTotal()
            });

            toast.success('Purchase Order created successfully!');
            navigate('/purchase-order-management');
        } catch (error: any) {
            console.error('Error creating purchase order:', error);
            toast.error(error.message || 'Failed to create purchase order');
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
        return 0; // No discount in Purchase Orders
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

    const handleSupplierKeyDown = (e: React.KeyboardEvent) => {
        const filteredSuppliers = suppliers.filter(supplier =>
            supplier.type === 'supplier' && (
                supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                supplier.email?.toLowerCase().includes(supplierSearchTerm.toLowerCase())
            )
        );

        switch (e.key) {
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

    const handleProductKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
        const searchTerm = productSearchTerms[rowIndex] || '';
        const matchingProducts = getFilteredProducts(searchTerm);
        const currentHighlighted = highlightedProductIndex[rowIndex] ?? -1;

        // Ctrl+Delete or Command+Delete: Remove current row
        if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
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
                }
                // If first row, stay in same field (no previous row)
                return;
            }

            // Auto-select highlighted product or first match if there's a search term
            if (matchingProducts.length > 0) {
                const selectedProduct = currentHighlighted >= 0 && currentHighlighted < matchingProducts.length
                    ? matchingProducts[currentHighlighted]
                    : matchingProducts[0];
                updateItem(rowIndex, 'product', selectedProduct._id);
                updateProductSearchTerm(rowIndex, '');
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

            // Auto-select highlighted product or first match if there's a search term
            if (matchingProducts.length > 0) {
                const selectedProduct = currentHighlighted >= 0 && currentHighlighted < matchingProducts.length
                    ? matchingProducts[currentHighlighted]
                    : matchingProducts[0];
                updateItem(rowIndex, 'product', selectedProduct._id);
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
                // If no search term, move to Notes field
                setTimeout(() => {
                    const notesInput = document.querySelector('[data-field="notes"]') as HTMLTextAreaElement;
                    if (notesInput) notesInput.focus();
                }, 100);
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
        if ((e.ctrlKey || e.metaKey) && e.key === 'Delete') {
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
                // Shift+Tab: Move back to same row's product field
                setTimeout(() => {
                    const productInput = document.querySelector(`[data-row="${rowIndex}"][data-field="product"]`) as HTMLInputElement;
                    if (productInput) {
                        productInput.focus();
                        productInput.select();
                    }
                }, 50);
                return;
            }

            // 🚀 AUTO-ROW FEATURE: Add new row when Tab is pressed on last row's quantity field
            if (rowIndex === formData.items.length - 1) {
                addItem();
            }

            // Tab: Move to next row's product field
            const nextRowIndex = rowIndex + 1;
            setTimeout(() => {
                const nextInput = document.querySelector(`[data-row="${nextRowIndex}"][data-field="product"]`) as HTMLInputElement;
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
        const fields = ['product', 'name', 'description', 'category', 'brand', 'hsnNumber', 'taxRate', 'quantity', 'uom', 'gndp'];
        const currentFieldIndex = fields.indexOf(field);

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

                if (prevFieldIndex < 0) {
                    // Move to last field of previous row
                    if (rowIndex > 0) {
                        prevFieldIndex = fields.length - 1;
                        targetRow = rowIndex - 1;
                    } else {
                        // If at first row, first field, move to department field
                        setTimeout(() => {
                            const departmentInput = document.querySelector('[data-field="department"]') as HTMLSelectElement;
                            if (departmentInput) departmentInput.focus();
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
        console.log("searchTerm:",searchTerm);
        
        // Create a new product item inline in the row
        updateItem(index, 'isNewProduct', true);
        updateItem(index, 'partNo', searchTerm);
        // updateItem(index, 'name', searchTerm); // Use dedicated name field
        // updateItem(index, 'description', searchTerm); // Use search term as default description
        updateItem(index, 'category', 'spare_part'); // Default category
        updateItem(index, 'brand', 'Generic'); // Default brand
        updateItem(index, 'uom', 'nos'); // Default UOM
        updateItem(index, 'product', `temp-${Date.now()}`); // Temporary ID
        setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
        updateProductSearchTerm(index, '');

        toast('New product added to row. Fill in required fields (Name, Part No, Category, Brand, HSN/SAC, GST, GNDP Price, UOM) and submit PO to create it.', { duration: 4000 });
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
                title="Create Purchase Order"
                subtitle="Create a new purchase order with Excel-like navigation"
            >
                <div className="flex space-x-3">
                    <button
                        onClick={() => navigate('/purchase-order-management')}
                        className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back to Purchase Orders</span>
                    </button>
                    <button
                        onClick={handleSubmitPO}
                        disabled={submitting}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        <span>{submitting ? 'Creating...' : 'Create PO'}</span>
                    </button>
                </div>
            </PageHeader>

            {/* 🚀 EXCEL-LIKE NAVIGATION GUIDE */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                    <span className="text-lg">⚡</span>
                    <h3 className="text-sm font-semibold text-blue-900 ml-2">Excel-Like Navigation Enabled!</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-blue-800">
                    <div>
                        <p className="font-medium mb-1">🎯 Complete Form Navigation:</p>
                        <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Tab/Enter</kbd> Move forward</p>
                        <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">↑↓</kbd> Navigate dropdowns</p>
                        <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Ctrl+S</kbd> Save</p>
                        <p><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Auto-focus</kbd> Supplier field opens on page load</p>
                    </div>
                    <div>
                        <p className="font-medium mb-1">🔥 Super Fast Flow:</p>
                        <p><strong>Auto-start:</strong> Page loads → Supplier dropdown opens → Select → Auto-focus Address</p>
                        <p><strong>Address:</strong> Select supplier → Auto-focus → Search/Select address → Auto-focus Date</p>
                        <p><strong>Products:</strong> Search → Select → Quantity → Tab (Next Field) → Enter (Next Row)</p>
                    </div>
                </div>
            </div>

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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Supplier */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Supplier *
                            </label>
                            <div className="relative dropdown-container">
                                <input
                                    ref={supplierInputRef}
                                    type="text"
                                    value={supplierSearchTerm || getSupplierName(formData.supplier)}
                                    onChange={(e) => {
                                        setSupplierSearchTerm(e.target.value);
                                        if (!showSupplierDropdown) setShowSupplierDropdown(true);
                                        setHighlightedSupplierIndex(-1);
                                    }}
                                    onFocus={() => {
                                        setShowSupplierDropdown(true);
                                        setHighlightedSupplierIndex(-1);
                                        if (!supplierSearchTerm && formData.supplier) {
                                            setSupplierSearchTerm('');
                                        }
                                    }}
                                    onKeyDown={handleSupplierKeyDown}
                                    placeholder="Search supplier or press ↓ to open"
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    data-field="supplier"
                                />
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

                        {/* Delivery Address */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Delivery Address *
                            </label>
                            <div className="relative dropdown-container">
                                <input
                                    ref={addressInputRef}
                                    type="text"
                                    value={addressSearchTerm || (formData.supplierAddress ? getAddressLabel(formData.supplierAddress.id || '') : '')}
                                    onChange={(e) => {
                                        setAddressSearchTerm(e.target.value);
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
                                        if (!addressSearchTerm && formData.supplierAddress) {
                                            setAddressSearchTerm('');
                                        }
                                    }}
                                    onKeyDown={handleAddressKeyDown}
                                    disabled={!formData.supplier}
                                    placeholder={!formData.supplier ? 'Select supplier first' : 'Search address or press ↓ to open'}
                                    className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${!formData.supplier ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-gray-300'
                                        }`}
                                    data-field="address"
                                />
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

                        {/* Expected Delivery Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Expected Delivery Date *
                            </label>
                            <input
                                ref={deliveryDateInputRef}
                                type="date"
                                value={formData.expectedDeliveryDate}
                                onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
                                        e.preventDefault();
                                        setTimeout(() => {
                                            prioritySelectRef.current?.focus();
                                        }, 50);
                                    }
                                }}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                data-field="delivery-date"
                            />
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Priority
                            </label>
                            <select
                                ref={prioritySelectRef}
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
                                        e.preventDefault();
                                        setTimeout(() => {
                                            sourceTypeSelectRef.current?.focus();
                                        }, 50);
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                data-field="priority"
                            >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>

                        {/* Source Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Source Type
                            </label>
                            <select
                                ref={sourceTypeSelectRef}
                                value={formData.sourceType}
                                onChange={(e) => setFormData({ ...formData, sourceType: e.target.value as any })}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
                                        e.preventDefault();
                                        setTimeout(() => {
                                            departmentSelectRef.current?.focus();
                                        }, 50);
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                data-field="source-type"
                            >
                                <option value="manual">Manual Purchase</option>
                                <option value="amc">AMC Requirement</option>
                                <option value="service">Service Request</option>
                                <option value="inventory">Inventory Replenishment</option>
                            </select>
                        </div>

                        {/* Department */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Department
                            </label>
                            <select
                                ref={departmentSelectRef}
                                value={formData.department || ''}
                                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                onKeyDown={(e) => {
                                    if ((e.key === 'Tab' && !e.shiftKey) || e.key === 'Enter') {
                                        e.preventDefault();
                                        // Move to first product field in the table
                                        setTimeout(() => {
                                            const firstProductInput = document.querySelector(`[data-row="0"][data-field="product"]`) as HTMLInputElement;
                                            if (firstProductInput) {
                                                firstProductInput.focus();
                                            }
                                        }, 50);
                                    }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                data-field="department"
                            >
                                <option value="">Select Department</option>
                                <option value="RETAIL">RETAIL</option>
                                <option value="INDUSTRIAL">INDUSTRIAL</option>
                                <option value="IE">IE</option>
                                <option value="TELECOM">TELECOM</option>
                                <option value="EV">EV</option>
                                <option value="RET/TEL">RET/TEL</option>
                            </select>
                        </div>
                    </div>


                    {/* Excel-Style Items Table */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">Purchase Order Items</h3>
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
                            <div className="bg-gray-100 border-b border-gray-300 min-w-[1400px]">
                                <div className="grid text-xs font-bold text-gray-800 uppercase tracking-wide"
                                    style={{ gridTemplateColumns: '60px 150px 1fr 120px 100px 80px 80px 100px 60px 120px 80px 60px 40px' }}>
                                    <div className="p-3 border-r border-gray-300 text-center bg-gray-200">S.No</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Part No</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Product Name</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Description</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Category</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Brand</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">HSC/SAC</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">GST(%)</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Quantity</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">UOM</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">GNDP Price</div>
                                    <div className="p-3 border-r border-gray-300 bg-gray-200">Total</div>
                                    <div className="p-3 text-center bg-gray-200 font-medium"></div>
                                </div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-gray-200 min-w-[1400px]">
                                {(formData.items || []).map((item, index) => (
                                    <div key={index} className={`grid group hover:bg-blue-50 transition-colors ${
                                        item.isNewProduct ? 'bg-green-50 border-l-green-500' : 
                                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                    }`}
                                        style={{ gridTemplateColumns: '60px 150px 1fr 120px 100px 80px 80px 100px 60px 120px 80px 60px 40px' }}>

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
                                                <input
                                                    type="text"
                                                    value={productSearchTerms[index] || getProductPartNo(item.product)}
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
                                                    className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-blue-50"
                                                    placeholder="Type to search..."
                                                    autoComplete="off"
                                                />
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
                                                                <div className="text-xs mt-1">Try different search terms</div>
                                                                <button
                                                                    onClick={() => handleCreateNewProductInline(index, productSearchTerms[index] || '')}
                                                                    className="mt-2 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs"
                                                                >
                                                                    + Create New Product
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            getFilteredProducts(productSearchTerms[index] || '').map((product, productIndex) => (
                                                                <button
                                                                    key={product._id}
                                                                    data-product-index={productIndex}
                                                                    onMouseDown={(e) => {
                                                                        e.preventDefault();
                                                                        updateItem(index, 'product', product._id);
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
                                                                    className={`w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${item.product === product._id ? 'bg-blue-100 text-blue-800' :
                                                                        highlightedProductIndex[index] === productIndex ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                                                            'text-gray-700'
                                                                        } ${productIndex === 0 && productSearchTerms[index] && highlightedProductIndex[index] === -1 ? 'bg-yellow-50 border-l-4 border-l-blue-500' : ''}`}
                                                                >
                                                                    <div className="flex justify-between items-start">
                                                                        <div className="flex-1 min-w-0 pr-4">
                                                                            <div className="font-medium text-gray-900 mb-1 flex items-center">
                                                                                <div><span className="font-medium">Part No:</span>{product?.partNo}</div>
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
                                                                                <div><span className="font-medium">Product Name:</span> {product?.name || 'N/A'}</div>
                                                                                <div>
                                                                                    <span className="font-medium">Brand:</span> {product?.brand || 'N/A'} •
                                                                                    <span className="font-medium">Category:</span> {product?.category || 'N/A'}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right flex-shrink-0 ml-4">
                                                                            <div className="font-bold text-lg text-green-600">₹{product?.price?.toLocaleString()}</div>
                                                                            <div className="text-xs text-gray-500 mt-0.5">per unit</div>
                                                                        </div>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>

                                                    <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Tab/Enter</kbd> Select → Set Qty → Tab/Enter Add Row •
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Shift+Tab</kbd> Previous •
                                                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Product Name */}
                                        <div className="p-1 border-r border-gray-200">
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
                                        </div>

                                        {/* Description */}
                                        <div className="p-1 border-r border-gray-200">
                                            <input
                                                type="text"
                                                value={item.description || ''}
                                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                onKeyDown={(e) => handleCellKeyDown(e, index, 'description')}
                                                data-row={index}
                                                data-field="description"
                                                className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${item.isNewProduct
                                                    ? 'bg-green-50 focus:bg-green-100 focus:ring-green-500 border border-green-300 rounded'
                                                    : 'focus:bg-blue-50'
                                                    }`}
                                                placeholder="Description"
                                            />
                                        </div>

                                        {/* Category */}
                                        <div className="p-1 border-r border-gray-200">
                                            {item.isNewProduct ? (
                                                <select
                                                    value={item.category || 'spare_part'}
                                                    onChange={(e) => updateItem(index, 'category', e.target.value)}
                                                    onKeyDown={(e) => handleCellKeyDown(e, index, 'category')}
                                                    data-row={index}
                                                    data-field="category"
                                                    className="w-full p-2 border border-green-300 bg-green-50 text-sm focus:outline-none focus:bg-green-100 focus:ring-1 focus:ring-green-500 rounded"
                                                    required
                                                >
                                                    <option value="spare_part">Spare Part</option>
                                                    <option value="equipment">Equipment</option>
                                                    <option value="consumable">Consumable</option>
                                                    <option value="tool">Tool</option>
                                                    <option value="accessory">Accessory</option>
                                                    <option value="service">Service</option>
                                                </select>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={item.product ? (products.find(p => p._id === item.product)?.category || '') : ''}
                                                    onKeyDown={(e) => handleCellKeyDown(e, index, 'category')}
                                                    data-row={index}
                                                    data-field="category"
                                                    className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                                    disabled
                                                />
                                            )}
                                        </div>

                                        {/* Brand */}
                                        <div className="p-1 border-r border-gray-200">
                                            {item.isNewProduct ? (
                                                <input
                                                    type="text"
                                                    value={item.brand || ''}
                                                    onChange={(e) => updateItem(index, 'brand', e.target.value)}
                                                    onKeyDown={(e) => handleCellKeyDown(e, index, 'brand')}
                                                    data-row={index}
                                                    data-field="brand"
                                                    className="w-full p-2 border border-green-300 bg-green-50 text-sm focus:outline-none focus:bg-green-100 focus:ring-1 focus:ring-green-500 rounded"
                                                    placeholder="Brand *"
                                                    required
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={item.product ? (products.find(p => p._id === item.product)?.brand || '') : ''}
                                                    onKeyDown={(e) => handleCellKeyDown(e, index, 'brand')}
                                                    data-row={index}
                                                    data-field="brand"
                                                    className="w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                                    disabled
                                                />
                                            )}
                                        </div>

                                        {/* HSN/SAC */}
                                        <div className="p-1 border-r border-gray-200">
                                            <input
                                                type="text"
                                                value={item.hsnNumber || ''}
                                                onChange={(e) => updateItem(index, 'hsnNumber', e.target.value)}
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

                                        {/* Quantity */}
                                        <div className="p-1 border-r border-gray-200 relative">
                                            <input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                                                onKeyDown={(e) => handleQuantityKeyDown(e, index)}
                                                data-row={index}
                                                data-field="quantity"
                                                className={`w-full p-2 border-0 bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 text-right ${item.isNewProduct
                                                    ? 'bg-green-50 focus:bg-green-100 focus:ring-green-500'
                                                    : 'focus:bg-blue-50'
                                                    }`}
                                                placeholder="1.00"
                                            />
                                        </div>

                                        {/* UOM */}
                                        <div className="p-1 border-r border-gray-200 relative">
                                            {item.isNewProduct ? (
                                                <select
                                                    value={item.uom || 'nos'}
                                                    onChange={(e) => updateItem(index, 'uom', e.target.value)}
                                                    onKeyDown={(e) => handleCellKeyDown(e, index, 'uom')}
                                                    data-row={index}
                                                    data-field="uom"
                                                    className="w-full p-2 border border-green-300 bg-green-50 text-sm focus:outline-none focus:bg-green-100 focus:ring-1 focus:ring-green-500 rounded"
                                                    required
                                                >
                                                    <option value="nos">Nos</option>
                                                    <option value="kg">Kg</option>
                                                    <option value="litre">Litre</option>
                                                    <option value="meter">Meter</option>
                                                    <option value="sq.ft">Sq.Ft</option>
                                                    <option value="hour">Hour</option>
                                                    <option value="set">Set</option>
                                                    <option value="box">Box</option>
                                                    <option value="can">Can</option>
                                                    <option value="roll">Roll</option>
                                                </select>
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

                                        {/* Total */}
                                        <div className="p-1 border-r border-gray-200">
                                            <div className="p-2 text-sm text-right font-bold text-blue-600">
                                                ₹{item.totalPrice?.toFixed(2) || '0.00'}
                                            </div>
                                        </div>

                                        <div className="p-0 h-full">
                                            <button
                                                onClick={() => removeItem(index)}
                                                className="w-full h-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors flex items-center justify-center border-0 hover:bg-red-100 bg-transparent"
                                                title="Remove this item"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Navigation Hints */}
                            <div className="bg-gray-50 border-t border-gray-200 p-3 text-center min-w-[1400px]">
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
                            </div>
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
                                            onClick={() => removeItem(index)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                                            title="Remove this item"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Product Selection */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={productSearchTerms[index] || getProductPartNo(item.product)}
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
                                                        if (!productSearchTerms[index] && !item.product) {
                                                            updateProductSearchTerm(index, '');
                                                        }
                                                        setShowProductDropdowns({
                                                            ...showProductDropdowns,
                                                            [index]: true
                                                        });
                                                    }}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    placeholder="Search product..."
                                                    autoComplete="off"
                                                />
                                                {showProductDropdowns[index] && (
                                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                                                        {getFilteredProducts(productSearchTerms[index] || '').map((product, productIndex) => (
                                                            <button
                                                                key={product._id}
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    updateItem(index, 'product', product._id);
                                                                    setShowProductDropdowns({ ...showProductDropdowns, [index]: false });
                                                                    updateProductSearchTerm(index, '');
                                                                    setHighlightedProductIndex({ ...highlightedProductIndex, [index]: -1 });
                                                                }}
                                                                className={`w-full px-3 py-2 text-left hover:bg-blue-50 transition-colors text-sm border-b border-gray-100 last:border-b-0 ${item.product === product._id ? 'bg-blue-100 text-blue-800' : 'text-gray-700'
                                                                    }`}
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
                                if (e.key === 'Tab' && e.shiftKey) {
                                    e.preventDefault();
                                    // Move back to last product's quantity field
                                    const lastRowIndex = formData.items.length - 1;
                                    setTimeout(() => {
                                        const lastQuantityInput = document.querySelector(`[data-row="${lastRowIndex}"][data-field="quantity"]`) as HTMLInputElement;
                                        if (lastQuantityInput) lastQuantityInput.focus();
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
                </div>
            </div>


        </div>
    );
};

export default CreatePurchaseOrder; 