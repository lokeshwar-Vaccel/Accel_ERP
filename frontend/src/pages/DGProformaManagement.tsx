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
  Printer
} from 'lucide-react';
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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

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
      address: '',
      state: '',
      district: '',
      pincode: ''
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
        fetchQuotations()
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
        address: '',
        state: '',
        district: '',
        pincode: ''
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
    const errors: FormErrors = {};

    if (!formData.customerId) {
      errors.customerId = 'Customer is required';
    }

    if (!formData.issueDate) {
      errors.issueDate = 'Issue date is required';
    }

    if (!formData.dueDate) {
      errors.dueDate = 'Due date is required';
    }

    if (!formData.validUntil) {
      errors.validUntil = 'Valid until date is required';
    }

    if (!formData.purpose) {
      errors.purpose = 'Purpose is required';
    }

    if (!formData.customerAddress.address) {
      errors.customerAddress = 'Customer address is required';
    }

    if (!formData.companyDetails.name || !formData.companyDetails.address) {
      errors.companyDetails = 'Company details are required';
    }

    // Validate items
    if (formData.items.length === 0) {
      errors.items = 'At least one item is required';
    } else {
      formData.items.forEach((item, index) => {
        if (!item.description) {
          errors[`item_${index}_description`] = 'Item description is required';
        }
        if (item.quantity <= 0) {
          errors[`item_${index}_quantity`] = 'Quantity must be greater than 0';
        }
        if (item.unitPrice <= 0) {
          errors[`item_${index}_unitPrice`] = 'Unit price must be greater than 0';
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
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

  // Update item calculations
  const updateItemCalculations = (index: number) => {
    const newItems = [...formData.items];
    const item = newItems[index];
    item.taxAmount = (item.quantity * item.unitPrice * item.taxRate) / 100;
    item.totalPrice = (item.quantity * item.unitPrice) + item.taxAmount;
    
    setFormData(prev => ({
      ...prev,
      items: newItems
    }));
    
    calculateTotals();
  };

  // Form submission
  const handleFormSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const submitData = {
        ...formData,
        customerId: formData.customerId,
        dgPurchaseOrderId: formData.dgPurchaseOrderId || undefined,
        quotationId: formData.quotationId || undefined
      };

      if (editingProforma) {
        await apiClient.dgSales.proformaInvoices.update(editingProforma._id, submitData);
      } else {
        await apiClient.dgSales.proformaInvoices.create(submitData);
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingProforma(null);
      fetchProformaInvoices();
    } catch (error) {
      console.error('Error saving proforma invoice:', error);
    } finally {
      setSubmitting(false);
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
              <DollarSign className="w-8 h-8 text-green-600" />
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
                {pi.status === 'draft' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditProforma(pi)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
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
            {/* <div className="flex items-center justify-between mb-6">
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
            </div> */}

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
                        setFormData(prev => ({
                          ...prev,
                          customerId: e.target.value,
                          customerAddress: customer ? {
                            address: customer.address || '',
                            state: customer.district || '',
                            district: customer.district || '',
                            pincode: customer.pinCode || ''
                          } : prev.customerAddress
                        }));
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

              {/* Items */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                  <Button
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      items: [...prev.items, {
                        description: '',
                        specifications: '',
                        kva: '',
                        phase: '',
                        quantity: 1,
                        unitPrice: 0,
                        taxRate: 18,
                        taxAmount: 0,
                        totalPrice: 0
                      }]
                    }))}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Item</span>
                  </Button>
                </div>

                {formErrors.items && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{formErrors.items}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        <button
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            items: prev.items.filter((_, i) => i !== index)
                          }))}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].description = e.target.value;
                              setFormData(prev => ({ ...prev, items: newItems }));
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors[`item_${index}_description`] ? 'border-red-500' : 'border-gray-300'}`}
                            placeholder="Item description"
                          />
                          {formErrors[`item_${index}_description`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_description`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Specifications
                          </label>
                          <input
                            type="text"
                            value={item.specifications}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].specifications = e.target.value;
                              setFormData(prev => ({ ...prev, items: newItems }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Technical specifications"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            KVA Rating
                          </label>
                          <input
                            type="text"
                            value={item.kva}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].kva = e.target.value;
                              setFormData(prev => ({ ...prev, items: newItems }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="e.g., 10 KVA"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phase
                          </label>
                          <select
                            value={item.phase}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].phase = e.target.value;
                              setFormData(prev => ({ ...prev, items: newItems }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select phase...</option>
                            <option value="Single Phase">Single Phase</option>
                            <option value="Three Phase">Three Phase</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quantity <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].quantity = parseInt(e.target.value) || 1;
                              setFormData(prev => ({ ...prev, items: newItems }));
                              updateItemCalculations(index);
                            }}
                            min="1"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors[`item_${index}_quantity`] ? 'border-red-500' : 'border-gray-300'}`}
                          />
                          {formErrors[`item_${index}_quantity`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_quantity`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Unit Price <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].unitPrice = parseFloat(e.target.value) || 0;
                              setFormData(prev => ({ ...prev, items: newItems }));
                              updateItemCalculations(index);
                            }}
                            min="0"
                            step="0.01"
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${formErrors[`item_${index}_unitPrice`] ? 'border-red-500' : 'border-gray-300'}`}
                          />
                          {formErrors[`item_${index}_unitPrice`] && (
                            <p className="text-red-500 text-xs mt-1">{formErrors[`item_${index}_unitPrice`]}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tax Rate (%)
                          </label>
                          <input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].taxRate = parseFloat(e.target.value) || 0;
                              setFormData(prev => ({ ...prev, items: newItems }));
                              updateItemCalculations(index);
                            }}
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tax Amount
                          </label>
                          <input
                            type="number"
                            value={item.taxAmount.toFixed(2)}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Total Price
                          </label>
                          <input
                            type="number"
                            value={item.totalPrice.toFixed(2)}
                            disabled
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                          />
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
                      className="w-full text-lg font-bold text-blue-900 border-none focus:ring-0"
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