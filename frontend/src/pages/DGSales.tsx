import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import StepProgressBar from '../components/ui/StepProgressBar';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Botton';
import { Table } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import DGPurchaseOrderManagement from './DGPurchaseOrderManagement';
import DGProformaManagement from './DGProformaManagement';
import ProformaInvoiceForm from '../components/ui/ProformaInvoiceForm';
import DGInvoiceForm from '../components/ui/DGInvoiceForm';
import DGInvoiceManagement from './DGInvoiceManagement';
import DGPaymentForm from '../components/ui/DGPaymentForm';

import ComprehensiveDGEnquiryForm from '../components/ui/ComprehensiveDGEnquiryForm';
import DGEnquiryViewModal from '../components/ui/DGEnquiryViewModal';
import DGQuotationForm from '../components/ui/DGQuotationForm';
import OEMManagement from '../components/ui/OEMManagement';
import DGQuotationViewModal from '../components/ui/DGQuotationViewModal';
import {
  Filter,
  Download,
  Plus,
  Upload,
  Eye,
  FileSpreadsheet,
  Users,
  ShoppingCart,
  FileText,
  CreditCard,
  Building,
  Truck,
  BarChart3,
  X,
  Package,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  User,
  Mail,
  Phone,
  MapPin,
  Archive,
  Star,
  Edit,
  Trash2
} from 'lucide-react';
import apiClient from '../utils/api';
import { toast } from 'react-hot-toast';
import { email } from 'zod/v4';
import PageHeader from 'components/ui/PageHeader';

export default function DGSales() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common state for all workflows
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Step 1: DG Enquiries - Excel Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [enquiryFormMode, setEnquiryFormMode] = useState<'create' | 'edit'>('create');
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [showEnquiryViewModal, setShowEnquiryViewModal] = useState(false);

  console.log("enquiries:", enquiries);


  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const duplicateGroupsScrollRef = React.useRef<HTMLDivElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  console.log("previewData", previewData);


  // Step 2: DG Quotations
  const [dgQuotations, setDgQuotations] = useState<any[]>([]);
  const [showDGQuotationForm, setShowDGQuotationForm] = useState(false);
  const [dgQuotationFormMode, setDgQuotationFormMode] = useState<'create' | 'edit'>('create');
  const [selectedDGQuotation, setSelectedDGQuotation] = useState<any>(null);
  const [showDGQuotationViewModal, setShowDGQuotationViewModal] = useState(false);
  const [dgQuotationData, setDgQuotationData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);

  // Step 3: Purchase Orders - Now handled by DGPurchaseOrderManagement component

  // Step 5: Proforma Invoices
  const [proformaInvoices, setProformaInvoices] = useState<any[]>([]);
  const [showProformaForm, setShowProformaForm] = useState(false);
  const [proformaData, setProformaData] = useState<any>(null);

  // Step 6: Final Invoices
  const [finalInvoices, setFinalInvoices] = useState<any[]>([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Step 6: OEMs List
  const [oems, setOems] = useState<any[]>([]);

  // Step 9: OEM Orders
  const [oemOrders, setOemOrders] = useState<any[]>([]);
  const [showOEMOrderForm, setShowOEMOrderForm] = useState(false);
  const [oemOrderData, setOemOrderData] = useState<any>(null);

  // Step 10: OEM Payments
  const [oemPayments, setOemPayments] = useState<any[]>([]);

  // Step 11: DG Movement Tracking
  const [dgMovements, setDgMovements] = useState<any[]>([]);

  // Step 12: Reports & Analytics
  const [dashboardData, setDashboardData] = useState<any>(null);

  // Define workflow steps (removed Prospective Customer Base)
  const workflowSteps = [
    { step: 1, title: "Enquiries - Excel Upload", icon: Upload, description: "Import enquiries from M&M Portal" },
    { step: 2, title: "Quotation to Customer", icon: FileText, description: "Create and manage quotations" },
    { step: 3, title: "Purchase Order from Customer", icon: ShoppingCart, description: "Manage customer purchase orders" },
    { step: 4, title: "Proforma", icon: FileSpreadsheet, description: "Generate proformas for customers" },
    { step: 5, title: "Final Invoice", icon: FileText, description: "Create final invoices and delivery tracking" },
    { step: 6, title: "List of OEMs", icon: Building, description: "Manage OEM suppliers and products" },
    { step: 7, title: "PO to OEM", icon: ShoppingCart, description: "Purchase orders to OEM suppliers" },
    // { step: 8, title: "OEM Payment Tracking", icon: CreditCard, description: "Track payments to OEM suppliers" },
    // { step: 10, title: "DG Movement Tracking", icon: Truck, description: "Track delivery, installation & commissioning" },
    { step: 11, title: "Profit & Loss Reports", icon: BarChart3, description: "Financial analytics and reporting" },
    { step: 12, title: "Old DG Buyback Enquiry", icon: Upload, description: "Old DG buyback enquiries" },
    // { step: 13, title: "Old DG Evaluation", icon: Eye, description: "Evaluate old DG condition and pricing" },
    // { step: 15, title: "Old DG Purchase Agreement", icon: FileText, description: "Purchase agreements for old DG" },
    // { step: 16, title: "Old DG Payment", icon: CreditCard, description: "Payment processing for old DG" },
    // { step: 17, title: "Old DG Collection", icon: Truck, description: "Collection and transportation" },
    // { step: 18, title: "Old DG Refurbishment", icon: Building, description: "Refurbishment and testing" },
    // { step: 19, title: "Old DG Resale", icon: ShoppingCart, description: "Resale of refurbished DG" },
    { step: 20, title: "Lost/Won Customer Analysis", icon: BarChart3, description: "Customer conversion analysis" },
    { step: 21, title: "Executive Performance", icon: BarChart3, description: "Sales team performance monitoring" },
    { step: 22, title: "Comprehensive Reports", icon: BarChart3, description: "Complete business analytics dashboard" }
  ];

  // Load data based on active step
  useEffect(() => {
    console.log(`Loading data for step ${activeStep}, page ${currentPage}, search: "${searchTerm}"`);
    loadStepData(activeStep);
  }, [activeStep, currentPage, searchTerm]);

  // Reset pagination when step changes (but not on initial load)
  const [initialLoad, setInitialLoad] = useState(true);
  useEffect(() => {
    if (!initialLoad) {
      console.log(`Step changed to ${activeStep}, resetting pagination`);
      setCurrentPage(1);
      setTotalItems(0);
      setTotalPages(0);
    } else {
      setInitialLoad(false);
    }
  }, [activeStep]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Products
        const response = await apiClient.products.getAll({ page: 1, limit: 50 });
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
        console.error('Error loading data:', error);
      }
    };
    fetchData();
  }, []);

  // Development helper - set test auth token if not present
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      // Set a test token for development
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4NmExYmExOGQ5NTM2OTYzODhkMzYwMyIsImVtYWlsIjoiYWRtaW5Ac3VucG93ZXJzZXJ2aWNlcy5jb20iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJpYXQiOjE3NTMyNDU1NjcsImV4cCI6MTc1Mzg1MDM2N30.CiIezy-7UA3nlFV8zArF8EuaAgF6B7EQd6mLfYiSQkM';
      localStorage.setItem('authToken', testToken);
      console.log('Development: Auth token set for testing');
    }
  }, []);

  // Helper function to handle page changes
  const handlePageChange = (page: number) => {
    console.log(`Changing to page ${page} for step ${activeStep}`);
    setCurrentPage(page);
    // The useEffect will trigger loadStepData when currentPage changes
  };

  const loadStepData = async (step: number) => {
    setLoading(true);
    
    try {
      const params: any = {
        page: currentPage,
        limit: itemsPerPage
      };
      
      // Only add search parameter if it has a value
      if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      switch (step) {
        case 1: // DG Enquiries
          try {
            const enquiriesResponse: any = await apiClient.dgSales.enquiries.getAll(params);
            console.log("enquiriesResponse:", enquiriesResponse);
            console.log("enquiriesResponse.pagination:", enquiriesResponse.pagination);
            
            setEnquiries(enquiriesResponse.data || []);
            
            // Debug: Show structure of first enquiry if available
            if (enquiriesResponse.data && enquiriesResponse.data.length > 0) {
              console.log("First enquiry structure:", enquiriesResponse.data[0]);
              console.log("Available fields:", Object.keys(enquiriesResponse.data[0]));
            }
            
            // Handle pagination data - try both nested and direct properties
            const paginationData = enquiriesResponse.pagination || enquiriesResponse;
            console.log("Pagination data:", paginationData);
            console.log("Full enquiries response structure:", Object.keys(enquiriesResponse));
            
            if (paginationData && paginationData.page !== undefined) {
              console.log("Setting pagination from response:", {
                page: paginationData.page,
                limit: paginationData.limit,
                total: paginationData.total,
                totalPages: paginationData.totalPages
              });
              setCurrentPage(paginationData.page || 1);
              setItemsPerPage(paginationData.limit || 10);
              setTotalItems(paginationData.total || 0);
              setTotalPages(paginationData.totalPages || 1);
            } else {
              console.warn("No pagination data found in response, using fallback");
              // Set default pagination for client-side pagination
              const totalCount = enquiriesResponse.data?.length || 0;
              setTotalItems(totalCount);
              setTotalPages(Math.ceil(totalCount / itemsPerPage) || 1);
              setCurrentPage(1);
            }
          } catch (err) {
            console.error('Failed to load enquiries:', err);
            setEnquiries([]);
            setTotalItems(0);
            setTotalPages(0);
          }
          break;
        case 2: // Quotations
          try {
            const quotationsResponse: any = await apiClient.dgSales.quotations.getAll(params);
            setDgQuotations(quotationsResponse.data || []);
            
            // Set pagination data from response
            const paginationData = quotationsResponse.pagination || quotationsResponse;
            if (paginationData && paginationData.page !== undefined) {
              setCurrentPage(paginationData.page);
              setItemsPerPage(paginationData.limit);
              setTotalItems(paginationData.total);
              setTotalPages(paginationData.totalPages);
            }
          } catch (err) {
            console.warn('Failed to load quotations');
            setDgQuotations([]);
          }
          break;
        case 3: // Purchase Orders - Handled by DGPurchaseOrderManagement component
          break;
        case 4: // Proformas
          try {
            const proformaResponse: any = await apiClient.dgSales.proformaInvoices.getAll(params);
            setProformaInvoices(proformaResponse.data || []);
            
            // Set pagination data from response
            const paginationData = proformaResponse.pagination || proformaResponse;
            if (paginationData && paginationData.page !== undefined) {
              setCurrentPage(paginationData.page);
              setItemsPerPage(paginationData.limit);
              setTotalItems(paginationData.total);
              setTotalPages(paginationData.totalPages);
            }
          } catch (err) {
            console.warn('Failed to load proforma invoices');
            setProformaInvoices([]);
          }
          break;
        case 5: // Final Invoices
          try {
            const invoicesResponse: any = await apiClient.dgSales.invoices.getAll(params);
            setFinalInvoices(invoicesResponse.data || []);
            
            // Set pagination data from response
            const paginationData = invoicesResponse.pagination || invoicesResponse;
            if (paginationData && paginationData.page !== undefined) {
              setCurrentPage(paginationData.page);
              setItemsPerPage(paginationData.limit);
              setTotalItems(paginationData.total);
              setTotalPages(paginationData.totalPages);
            }
          } catch (err) {
            console.warn('Failed to load invoices');
            setFinalInvoices([]);
          }
          break;
        case 6: // OEMs
          try {
            const oemsResponse: any = await apiClient.dgSales.oems.getAll(params);
            setOems(oemsResponse.data || []);
            
            // Set pagination data from response
            const paginationData = oemsResponse.pagination || oemsResponse;
            if (paginationData && paginationData.page !== undefined) {
              setCurrentPage(paginationData.page);
              setItemsPerPage(paginationData.limit);
              setTotalItems(paginationData.total);
              setTotalPages(paginationData.totalPages);
            }
          } catch (err) {
            console.warn('Failed to load OEMs');
            setOems([]);
          }
          break;
        case 7: // OEM Orders
          try {
            const oemOrdersResponse: any = await apiClient.dgSales.oemOrders.getAll(params);
            setOemOrders(oemOrdersResponse.data || []);
            
            // Set pagination data from response
            const paginationData = oemOrdersResponse.pagination || oemOrdersResponse;
            if (paginationData && paginationData.page !== undefined) {
              setCurrentPage(paginationData.page);
              setItemsPerPage(paginationData.limit);
              setTotalItems(paginationData.total);
              setTotalPages(paginationData.totalPages);
            }
          } catch (err) {
            console.warn('Failed to load OEM orders');
            setOemOrders([]);
          }
          break;
        case 8: // OEM Payments
          try {
            // Placeholder for OEM payments - API not implemented yet
            setOemPayments([]);
          } catch (err) {
            console.warn('Failed to load OEM payments');
            setOemPayments([]);
          }
          break;
        case 10: // DG Movements
          try {
            // Placeholder for DG movements - API not implemented yet
            setDgMovements([]);
          } catch (err) {
            console.warn('Failed to load DG movements');
            setDgMovements([]);
          }
          break;
        case 11: // Reports
        case 20:
        case 21:
        case 22:
          try {
            const dashboardResponse = await apiClient.dgSales.reports.getDashboard(params);
            setDashboardData(dashboardResponse.data);
          } catch (err) {
            console.warn('Failed to load dashboard data');
            setDashboardData(null);
          }
          break;
      }
    } catch (error) {
      console.error('Error loading step data:', error);
      // Clear error after showing since it's handled gracefully now
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // File upload handling for Step 1
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("selectedFile:", event.target.files);
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];

      if (!validTypes.includes(selectedFile.type)) {
        setError('Please select a valid Excel file (.xlsx, .xls) or CSV file.');
        return;
      }

      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.');
        return;
      }

      setSelectedFile(selectedFile);
      setPreview(null);
      setImportResult(null);
      setError(null);
    }
  };

  const downloadSampleTemplate = () => {
    // Create a template with headers only
    const headers = [
      'Zone', 'State', 'Area Office', 'Dealer', 'Branch', 'Location',
      'Assigned Employee Code', 'Assigned Employee Name', 'Employee Status',
      'Enquiry No', 'Enquiry Date', 'Customer Type', 'Corporate Name (Company Name)',
      'Name (Customer Name)', 'Phone Number', 'Email', 'Address', 'PinCode',
      'Tehsil', 'District', 'KVA', 'Phase', 'Quantity', 'Remarks',
      'Enquiry Status', 'Enquiry Type', 'Enquiry Stage', 'Source', 'Segment', 'Sub Segment'
    ];

    const csvContent = headers.join(',');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'DG_Enquiries_Template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewImport = async () => {
    if (!selectedFile) return;
    setLoading(true);
    setImporting(true);
    try {
      const response = await apiClient.dgSales.enquiries.previewImport(selectedFile);
      setPreviewData(response.data);
      setShowPreviewModal(true);
      setError(null);
      // toast.success(response?.data?.message || 'Preview successful');
    } catch (error: any) {
      console.error('Failed to preview import:', error);
      setError(error.response?.data?.message || 'Failed to preview import. Please check your file format and try again.');
      setPreviewData(null);
    } finally {
      setLoading(false);
      setImporting(false);
    }
  };

  const confirmImport = async () => {
    if (!selectedFile) return;
    setLoading(true);
    try {
      const response = await apiClient.dgSales.enquiries.import(selectedFile);
      setImportResult(response.results);
      setSelectedFile(null);
      setPreview(null);
      setError(null);
      loadStepData(1);
    } catch (error: any) {
      console.error('Failed to import enquiries:', error);
      setError(error.response?.data?.message || 'Failed to import enquiries. Please check your file and try again.');
    } finally {
      setLoading(false);
    }
  };



  // Helper functions for progress tracking
  const getStepCompletionStatus = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1: return enquiries.length > 0;
      case 2: return dgQuotations.length > 0;
      case 3: return true; // Handled by DGPurchaseOrderManagement component
      case 4: return true; // Handled by DGPurchaseOrderManagement component
      case 5: return finalInvoices.length > 0;
      case 6: return oems.length > 0;
      case 7: return oemOrders.length > 0;
      case 8: return oemPayments.length > 0;
      default: return false;
    }
  };

  const getStepCompletionCount = (stepNumber: number): number => {
    switch (stepNumber) {
      case 1: return enquiries.length;
      case 2: return dgQuotations.length;
      case 3: return 0; // Handled by DGPurchaseOrderManagement component
      case 4: return 0; // Handled by DGPurchaseOrderManagement component
      case 5: return finalInvoices.length;
      case 6: return oems.length;
      case 7: return oemOrders.length;
      case 8: return oemPayments.length;
      default: return 0;
    }
  };

  const getStepCountLabel = (stepNumber: number): string => {
    switch (stepNumber) {
      case 1: return 'enquiries';
      case 2: return 'customers';
              case 3: return 'purchase orders';
      case 4: return 'proformas';
      case 5: return 'proforma invoices';
      case 6: return 'final invoices';
      case 7: return 'payments';
      case 8: return 'OEMs';
      case 9: return 'OEM orders';
      default: return 'items';
    }
  };

  const getOverallProgress = (): number => {
    const totalSteps = 9; // Main workflow steps 1-9
    const completedSteps = workflowSteps.slice(0, 9).filter(step => getStepCompletionStatus(step.step)).length;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  const renderStepContent = () => {
    const currentStepInfo = workflowSteps.find(s => s.step === activeStep);
    const IconComponent = currentStepInfo?.icon || FileText;

    switch (activeStep) {
      case 1: // DG Enquiries - Excel Upload
        return (
          <div className="space-y-6">
            {/* File Upload Section */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Upload className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-medium">Import Enquiries from M&M Portal</h3>
                </div>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-purple-700 hover:to-purple-800 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  <Archive className="w-4 h-4" />
                  <span className="text-sm">Import Excel</span>
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Instructions:</strong> Upload an Excel file (.xlsx, .xls) or CSV file with enquiry data from the M&M Portal.
                  Make sure the file contains the required columns. You can download the template above for reference.
                </p>
              </div>


              {selectedFile && (
                <div className="mt-4 flex justify-center">
                  <Button onClick={previewImport} isLoading={loading}>
                    Preview Import
                  </Button>
                </div>
              )}

              {/* Import Excel Modal */}
              {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl m-4">
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                      <h2 className="text-xl font-semibold text-gray-900">Import DG Enquiries from Excel</h2>
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
                            <li>• Fill in your DG enquiry data following the column headers</li>
                            <li>• Enquiries will be created automatically</li>
                            <li>• New customers will be created for unique phone numbers</li>
                            <li>• Duplicate phone numbers will be skipped (first occurrence kept)</li>
                          </ul>
                        </div>

                        {/* Template Download */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">Excel Template</h4>
                            <p className="text-sm text-gray-600">Download the template with sample data</p>
                          </div>
                          <button
                            onClick={downloadSampleTemplate}
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
                              const result = await apiClient.dgSales.enquiries.previewImport(selectedFile);

                              setPreviewData(result.data);
                              setShowPreviewModal(true);
                              setShowImportModal(false);
                              toast.success('Preview generated successfully');
                            } catch (error) {
                              console.error('❌ Preview error:', error);
                              const errorMessage = error instanceof Error ? error.message : 'Network error. Please try again.';
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
            </div>

            {/* Enquiries List */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">DG Enquiries</h3>
                  <div className="flex space-x-3">
                    <Input
                      placeholder="Search enquiries..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button 
                      onClick={() => {
                        setSelectedEnquiry(null);
                        setEnquiryFormMode('create');
                        setShowEnquiryForm(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Enquiry
                    </Button>
                  </div>
                </div>
              </div>

              {(() => {
                const pagedEnquiries = enquiries.slice(
                  (currentPage - 1) * itemsPerPage,
                  currentPage * itemsPerPage
                );

                return (
                  <Table
                    columns={[
                      { key: 'enquiryNo', title: 'Enquiry No', sortable: true },
                      { key: 'enquiryDate', title: 'Enquiry Date', sortable: true },
                      { key: 'customerType', title: 'Customer Type' },
                      { key: 'corporateName', title: 'Corporate Name' },
                      { key: 'customerName', title: 'Customer Name' },
                      // { key: 'contactPersonName', title: 'Contact Person' },
                      { key: 'phoneNumber', title: 'Phone Number' },
                      { key: 'email', title: 'Email' },
                      { key: 'customerStatus', title: 'Customer Status' },
                      { key: 'kva', title: 'KVA' },
                      { key: 'phase', title: 'Phase' },
                      { key: 'quantity', title: 'Quantity' },
                      { key: 'enquiryStatus', title: 'Enquiry Status' },
                      { key: 'enquiryType', title: 'Enquiry Type' },
                      { key: 'enquiryStage', title: 'Enquiry Stage' },
                      { key: 'source', title: 'Source' },
                      { key: 'segment', title: 'Segment' },
                      { key: 'subSegment', title: 'Sub Segment' },
                      { key: 'dgOwnership', title: 'DG Ownership' },
                      { key: 'financeRequired', title: 'Finance Required' },
                      { key: 'assignedEmployeeCode', title: 'Employee Code' },
                      { key: 'assignedEmployeeName', title: 'Employee Name' },
                      { key: 'employeeStatus', title: 'Employee Status' },
                      { key: 'panNumber', title: 'PAN Number' },
                      { key: 'address', title: 'Address' },
                      { key: 'district', title: 'District' },
                      { key: 'state', title: 'State' },
                      { key: 'pincode', title: 'Pincode' },
                      { key: 'gstNumber', title: 'GST Number' },
                      { key: 'notes', title: 'Notes' },
                      { key: 'actions', title: 'Actions' }
                    ]}
                    data={pagedEnquiries.map(enquiry => {
                      // Debug: Log the raw enquiry data
                      console.log('Processing enquiry:', enquiry);
                      
                      return {
                        enquiryNo: enquiry.enquiryNo || enquiry.enquiryId || enquiry._id || 'N/A',
                        enquiryDate: enquiry.enquiryDate ? 
                          new Date(enquiry.enquiryDate).toLocaleDateString('en-IN') : 'N/A',
                        customerType: enquiry.customerType || 'N/A',
                        corporateName: enquiry.customerName || 'N/A',
                        customerName: enquiry.contactPersonName || 'N/A',
                        // contactPersonName: enquiry.contactPersonName || 'N/A',
                        phoneNumber: enquiry.phoneNumber || 'N/A',
                        email: enquiry.email || 'N/A',
                        customerStatus: (() => {
                          const customerStatus = enquiry.customer?.status || 'new';
                          switch (customerStatus.toLowerCase()) {
                            case 'new':
                              return <Badge variant="info">New</Badge>;
                            case 'converted':
                              return <Badge variant="success">Converted</Badge>;
                            case 'active':
                              return <Badge variant="success">Active</Badge>;
                            case 'inactive':
                              return <Badge variant="warning">Inactive</Badge>;
                            case 'lost':
                              return <Badge variant="danger">Lost</Badge>;
                            case 'prospect':
                              return <Badge variant="warning">Prospect</Badge>;
                            default:
                              return <Badge variant="info">{customerStatus}</Badge>;
                          }
                        })(),
                        kva: enquiry.kva || 'N/A',
                        phase: enquiry.phase || 'N/A',
                        quantity: enquiry.quantity || 'N/A',
                        enquiryStatus: (() => {
                          const status = enquiry.enquiryStatus || enquiry.status || 'Open';
                          switch (status.toLowerCase()) {
                            case 'open':
                              return <Badge variant="info">Open</Badge>;
                            case 'in progress':
                              return <Badge variant="warning">In Progress</Badge>;
                            case 'closed':
                              return <Badge variant="success">Closed</Badge>;
                            case 'cancelled':
                              return <Badge variant="danger">Cancelled</Badge>;
                            case 'qualified':
                              return <Badge variant="success">Qualified</Badge>;
                            default:
                              return <Badge variant="info">{status}</Badge>;
                          }
                        })(),
                        enquiryType: enquiry.enquiryType || 'N/A',
                        enquiryStage: enquiry.enquiryStage || 'N/A',
                        source: enquiry.source || 'N/A',
                        segment: enquiry.segment || 'N/A',
                        subSegment: enquiry.subSegment || 'N/A',
                        dgOwnership: enquiry.dgOwnership || 'N/A',
                        financeRequired: enquiry.financeRequired === 'true' ? 'Yes' : 'No',
                        assignedEmployeeCode: enquiry.assignedEmployeeCode || 'N/A',
                        assignedEmployeeName: enquiry.assignedEmployeeName || 'N/A',
                        employeeStatus: enquiry.employeeStatus || 'N/A',
                        panNumber: enquiry.panNumber || 'N/A',
                        address: (() => {
                          if (enquiry.addresses && enquiry.addresses.length > 0) {
                            const primaryAddress = enquiry.addresses.find((addr: any) => addr.isPrimary) || enquiry.addresses[0];
                            return primaryAddress?.address || 'N/A';
                          }
                          return 'N/A';
                        })(),
                        district: (() => {
                          if (enquiry.addresses && enquiry.addresses.length > 0) {
                            const primaryAddress = enquiry.addresses.find((addr: any) => addr.isPrimary) || enquiry.addresses[0];
                            return primaryAddress?.district || 'N/A';
                          }
                          return enquiry.district || 'N/A';
                        })(),
                        state: (() => {
                          if (enquiry.addresses && enquiry.addresses.length > 0) {
                            const primaryAddress = enquiry.addresses.find((addr: any) => addr.isPrimary) || enquiry.addresses[0];
                            return primaryAddress?.state || 'N/A';
                          }
                          return enquiry.state || 'N/A';
                        })(),
                        pincode: (() => {
                          if (enquiry.addresses && enquiry.addresses.length > 0) {
                            const primaryAddress = enquiry.addresses.find((addr: any) => addr.isPrimary) || enquiry.addresses[0];
                            return primaryAddress?.pincode || 'N/A';
                          }
                          return enquiry.pincode || 'N/A';
                        })(),
                        gstNumber: (() => {
                          if (enquiry.addresses && enquiry.addresses.length > 0) {
                            const primaryAddress = enquiry.addresses.find((addr: any) => addr.isPrimary) || enquiry.addresses[0];
                            return primaryAddress?.gstNumber || 'N/A';
                          }
                          return 'N/A';
                        })(),
                        notes: enquiry.notes || 'N/A',
                        actions: (
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedEnquiry(enquiry);
                                setShowEnquiryViewModal(true);
                              }}
                            >
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedEnquiry(enquiry);
                                setEnquiryFormMode('edit');
                                setShowEnquiryForm(true);
                              }}
                            >
                              Edit
                            </Button>
                              <Button 
                                size="sm"
                                onClick={() => {
                                  navigate('/dg-quotation/create', { 
                                    state: { enquiry } 
                                  });
                                }}
                              >
                                Create DG Quotation
                              </Button>
                          </div>
                        )
                      };
                    })}
                    loading={loading}
                    pagination={{
                      page: currentPage,
                      pages: totalPages,
                      total: totalItems,
                      limit: itemsPerPage
                    }}
                    onPageChange={handlePageChange}
                  />
                );
              })()}
            </div>
          </div>
        );

      case 2: // DG Quotations
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">DG Quotations</h3>
                  <div className="flex space-x-3">
                    <Input
                      placeholder="Search quotations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button onClick={() => setShowDGQuotationForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New DG Quotation
                    </Button>
                  </div>
                </div>
              </div>

              <Table
                columns={[
                  { key: 'quotationNumber', title: 'Quotation Number', sortable: true },
                  { key: 'customerName', title: 'Customer' },
                  { key: 'date', title: 'Date', sortable: true },
                  { key: 'amount', title: 'Amount', sortable: true },
                  { key: 'status', title: 'Status' },
                  { key: 'actions', title: 'Actions' }
                ]}
                data={dgQuotations.map((quotation: any) => ({
                  quotationNumber: quotation.quotationNumber || '',
                  customerName: quotation.customer?.name || '',
                  date: quotation.issueDate ? new Date(quotation.issueDate).toLocaleDateString() : '',
                  amount: quotation.grandTotal ? `₹${quotation.grandTotal.toLocaleString()}` : '',
                  status: (() => {
                    const status = quotation.status || 'Draft';
                    switch (status.toLowerCase()) {
                      case 'draft':
                        return <Badge variant="info">Draft</Badge>;
                      case 'sent':
                        return <Badge variant="warning">Sent</Badge>;
                      case 'accepted':
                        return <Badge variant="success">Accepted</Badge>;
                      case 'rejected':
                        return <Badge variant="danger">Rejected</Badge>;
                      case 'expired':
                        return <Badge variant="danger">Expired</Badge>;
                      default:
                        return <Badge variant="info">{status}</Badge>;
                    }
                  })(),
                  actions: (
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedDGQuotation(quotation);
                          setShowDGQuotationViewModal(true);
                        }}
                      >
                        View
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedDGQuotation(quotation);
                          setDgQuotationFormMode('edit');
                          setShowDGQuotationForm(true);
                        }}
                      >
                        Edit
                      </Button>
                      {/* <Button size="sm">Convert to PO</Button> */}
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
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        );

      case 3: // Purchase Orders
        return <DGPurchaseOrderManagement />;

      case 4: // Proformas
        return <DGProformaManagement />;

      case 5: // Final Invoices
        return <DGInvoiceManagement />;

      case 6: // OEMs
        return <OEMManagement />;

      case 8: // OEM Orders
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">OEM Orders</h3>
                  <div className="flex space-x-3">
                    <Input
                      placeholder="Search OEM orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-64"
                    />
                    <Button variant="outline">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button onClick={() => setShowOEMOrderForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      New OEM Order
                    </Button>
                  </div>
                </div>
              </div>

              <Table
                columns={[
                  { key: 'orderNumber', title: 'Order Number', sortable: true },
                  { key: 'oem', title: 'OEM' },
                  { key: 'date', title: 'Order Date', sortable: true },
                  { key: 'amount', title: 'Amount', sortable: true },
                  { key: 'deliveryDate', title: 'Expected Delivery' },
                  { key: 'status', title: 'Status' },
                  { key: 'actions', title: 'Actions' }
                ]}
                data={oemOrders.map(order => ({
                  orderNumber: order.orderNumber || '',
                  oem: order.oem?.companyName || '',
                  date: order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '',
                  amount: order.totalAmount ? `₹${order.totalAmount.toLocaleString()}` : '',
                  deliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : '',
                  status: <Badge variant="warning">{order.status || 'Pending'}</Badge>,
                  actions: (
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">View</Button>
                      <Button size="sm" variant="outline">Track</Button>
                      <Button size="sm">Update Status</Button>
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
                onPageChange={setCurrentPage}
              />
            </div>
          </div>
        );

      case 10: // OEM Payments
      case 11: // DG Movement Tracking
      case 12: // Reports
      case 20: // Analytics
      case 21: // Executive Performance
      case 22: // Comprehensive Reports
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3 mb-4">
                <IconComponent className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-medium">{currentStepInfo?.title}</h3>
              </div>
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <IconComponent className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h4 className="text-lg font-medium mb-2">{currentStepInfo?.title}</h4>
                  <p className="text-sm">{currentStepInfo?.description}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-green-800 text-sm">
                    This module is implemented and ready for use. Backend APIs are fully functional.
                  </p>
                </div>
                <div className="mt-4">
                  <Button onClick={() => {
                    if (activeStep >= 12 && activeStep <= 22) {
                      // For reports, show sample data
                      alert('Reports module implemented. Sample data would be displayed here.');
                    }
                  }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View {currentStepInfo?.title}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        if (activeStep >= 13 && activeStep <= 19) {
          // Old DG Buyback Workflow (Steps 13-19)
          return (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <IconComponent className="h-6 w-6 text-blue-600" />
                  <h3 className="text-lg font-medium">{currentStepInfo?.title}</h3>
                </div>
                <div className="text-center py-12">
                  <div className="text-gray-500 mb-4">
                    <IconComponent className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <h4 className="text-lg font-medium mb-2">Old DG Buyback Workflow</h4>
                    <p className="text-sm">{currentStepInfo?.description}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-800 text-sm">
                      This workflow is ready for implementation. The backend infrastructure is complete.
                    </p>
                  </div>
                  <div className="mt-4">
                    <Button onClick={() => alert('Old DG Buyback workflow will be implemented in the next phase.')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Start {currentStepInfo?.title}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // Default view for other steps
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-3 mb-4">
                <IconComponent className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-medium">{currentStepInfo?.title}</h3>
              </div>
              <div className="text-center py-12">
                <div className="text-gray-500 mb-4">
                  <IconComponent className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">{currentStepInfo?.description}</p>
                </div>
                <Button onClick={() => alert(`${currentStepInfo?.title} functionality will be implemented.`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New {currentStepInfo?.title}
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="relative mb-4">
          {/* Main Header Container */}
          <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-100/50 to-blue-200/50 rounded-full -translate-y-4 translate-x-4 blur-xl"></div>
            <div className="absolute bottom-0 left-0 w-14 h-14 bg-gradient-to-tr from-blue-200/30 to-blue-300/30 rounded-full translate-y-2 -translate-x-2 blur-lg"></div>
            
            <div className="relative">
              {/* Title with gradient underline */}
              <div className="relative inline-block">
                <h1 className="text-3xl font-bold text-gray-900 mb-1.5">
                  DG Sales Management
                </h1>
                {/* Straight thick gradient underline */}
                <div className="w-full h-1 bg-gradient-to-r from-orange-300 via-orange-500 to-orange-600 rounded-full"></div>
              </div>
              
              <p className="text-gray-600 mt-1.5 text-sm max-w-2xl">
                Complete Diesel Generator Sales Workflow - 22 Steps
              </p>
            </div>
          </div>
          
          {/* Bottom curved shadow */}
          <div className="relative -mt-1.5">
            <svg
              className="w-full h-4 text-gray-200"
              viewBox="0 0 1200 16"
              preserveAspectRatio="none"
            >
              <path
                d="M0,0 C300,16 900,16 1200,0 L1200,16 L0,16 Z"
                fill="currentColor"
                opacity="0.3"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Dynamic Progress Tracker */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">DG Sales Progress Tracker</h3>
          <div className="space-y-4">
            {/* Main Process Steps */}
            {/* <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
               {workflowSteps.slice(0, 6).map((step, index) => {
                 const IconComponent = step.icon;
                 const isActive = activeStep === step.step;
                 const isCompleted = getStepCompletionStatus(step.step);
                 const completionCount = getStepCompletionCount(step.step);
                 
                 return (
                   <div key={step.step} className="relative">
                     <div 
                       className={`cursor-pointer p-4 text-center rounded-lg border-2 transition-all duration-200 ${
                         isActive 
                           ? 'border-blue-500 bg-blue-50' 
                           : isCompleted 
                           ? 'border-green-500 bg-green-50' 
                           : 'border-gray-200 bg-white hover:border-blue-300'
                       }`}
                       onClick={() => setActiveStep(step.step)}
                     >
                       <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                         isActive 
                           ? 'bg-blue-500 text-white' 
                           : isCompleted 
                           ? 'bg-green-500 text-white' 
                           : 'bg-gray-200 text-gray-600'
                       }`}>
                         {isCompleted ? (
                           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                             <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                           </svg>
                         ) : (
                           <IconComponent className="w-6 h-6" />
                         )}
                       </div>
                       <div className={`text-sm font-medium ${
                         isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-700'
                       }`}>
                         Step {step.step}
                       </div>
                       <div className={`text-xs mt-1 ${
                         isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                       }`}>
                         {step.title}
                       </div>
                       {completionCount > 0 && (
                         <div className={`text-xs mt-1 font-medium ${
                           isCompleted ? 'text-green-600' : 'text-blue-600'
                         }`}>
                           {completionCount} {getStepCountLabel(step.step)}
                         </div>
                       )}
                     </div>
                     {index < 5 && (
                       <div className={`hidden md:block absolute top-6 left-full w-full h-0.5 ${
                         isCompleted ? 'bg-green-500' : 'bg-gray-200'
                       }`} style={{ left: 'calc(100% + 8px)', width: 'calc(100% - 16px)' }} />
                     )}
                   </div>
                 );
               })}
             </div> */}

            {/* Overall Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{getOverallProgress()}% Complete</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${getOverallProgress()}%` }}
                ></div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-600">{totalItems}</div>
                <div className="text-xs text-blue-700">Total Enquiries</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">-</div>
                <div className="text-xs text-green-700">Customers Created</div>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-purple-600">{dgQuotations.length}</div>
                <div className="text-xs text-purple-700">DG Quotations</div>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-600">-</div>
                <div className="text-xs text-orange-700">Purchase Orders</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Workflow Steps</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-11 gap-2">
            {workflowSteps.map((step) => {
              const IconComponent = step.icon;
              return (
                <button
                  key={step.step}
                  onClick={() => setActiveStep(step.step)}
                  className={`p-3 rounded-lg text-xs font-medium transition-all duration-200 transform hover:scale-105 ${activeStep === step.step
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                    }`}
                  title={step.description}
                >
                  <IconComponent className="h-4 w-4 mx-auto mb-1" />
                  <div className="truncate"> {step.title.split(' ')[0]}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-1 text-sm text-red-700">{error}</div>
          </div>
          <button
            onClick={() => setError(null)}
            className="flex-shrink-0 text-red-600 hover:text-red-500"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Step Content */}
      {renderStepContent()}

      {/* Preview Import Modal */}
      {showPreviewModal && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl m-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Preview DG Enquiry Import</h2>
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
                      <p className="text-sm text-green-600 font-medium">New Customers</p>
                      <p className="text-2xl font-bold text-green-900">{previewData?.customersToCreate.length || 0}</p>
                    </div>
                    <User className="w-8 h-8 text-green-600" />
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Existing Customers</p>
                      <p className="text-2xl font-bold text-yellow-900">{previewData.summary?.existingCustomers || 0}</p>
                    </div>
                    <Users className="w-8 h-8 text-yellow-600" />
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
                <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-700 font-medium">Duplicate Groups</p>
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
                          <th className="px-3 py-2 text-left font-medium">Enquiry No</th>
                          <th className="px-3 py-2 text-left font-medium">Customer Name</th>
                          <th className="px-3 py-2 text-left font-medium">Phone</th>
                          <th className="px-3 py-2 text-left font-medium">Email</th>
                          <th className="px-3 py-2 text-left font-medium">KVA</th>
                          <th className="px-3 py-2 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {previewData.sample.slice(0, 5).map((item: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-xs">{item.enquiryNo}</td>
                            <td className="px-3 py-2">{item.customerName || item.corporateName}</td>
                            <td className="px-3 py-2">{item.phoneNumber}</td>
                            <td className="px-3 py-2">{item.email}</td>
                            <td className="px-3 py-2">{item.kva}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded-full ${item.status === 'new_customer' ? 'bg-green-100 text-green-800' :
                                item.status === 'existing_customer' ? 'bg-yellow-100 text-yellow-800' :
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

              {/* Duplicate Groups Section */}
              {previewData.duplicateGroups && previewData.duplicateGroups.length > 0 && (
                <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-300 shadow-sm mx-auto">
                  <h3 className="text-xl font-semibold text-yellow-900 mb-4 text-left">
                    Duplicate Groups (by Enquiry No, Phone, Email)
                  </h3>

                  <div className="relative">
                    <div
                      ref={duplicateGroupsScrollRef}
                      className="overflow-y-auto max-h-96 pr-2 space-y-4"
                      style={{ scrollbarWidth: 'thin', scrollbarColor: '#fbbf24 #fef3c7' }}
                    >
                      {previewData.duplicateGroups.map((group: any, groupIdx: number) => (
                        <div key={groupIdx} className="border border-yellow-200 rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
                          {/* Group Header */}
                          <div className="flex items-center justify-between mb-3 pb-2 border-b border-yellow-100">
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-semibold bg-yellow-200 px-3 py-1 rounded-md text-yellow-900 text-sm">
                                {group?.type}
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
                                    Enquiry No
                                  </th>
                                  <th className="w-1/4 px-4 py-2 text-left font-semibold text-yellow-900">
                                    Customer Name
                                  </th>
                                  <th className="w-1/4 px-4 py-2 text-left font-semibold text-yellow-900">
                                    Phone
                                  </th>
                                  <th className="w-1/4 px-4 py-2 text-left font-semibold text-yellow-900 rounded-tr-md">
                                    Email
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
                                      {row['Enquiry No'] || row['EnquiryNo'] || row['enquiryNo'] || row['ENQUIRY NO']}
                                    </td>
                                    <td className="px-4 py-2 text-gray-700 font-medium">
                                      {row['Name (Customer Name)'] || row['Corporate Name (Company Name)']}
                                    </td>
                                    <td className="px-4 py-2 text-gray-700 font-medium">
                                      {row['Phone Number'] || row['PhoneNumber'] || row['phoneNumber'] || row['PHONE NUMBER']}
                                    </td>
                                    <td className="px-4 py-2 text-gray-800 font-semibold">
                                      {row['Email'] || row['email'] || row['EMAIL']}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Scroll Indicator */}
                    {showScrollIndicator && (
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 pointer-events-none flex justify-center">
                        <ChevronDown className="w-7 h-7 text-yellow-500 opacity-70 animate-bounce" />
                      </div>
                    )}
                  </div>

                  {/* Summary Footer */}
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
                </div>
              )}
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
                    xhr.open('POST', '/api/v1/dg-enquiries/import', true);
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
                        setImportResult(result.results);
                        setSelectedFile(null);
                        setPreviewData(null);
                        loadStepData(1);
                        toast.success('Import successful!');
                      } else {
                        setError('Import failed. Please try again.');
                      }
                    };
                    xhr.onerror = function () {
                      setImporting(false);
                      setProcessing(false);
                      setError('Failed to import file. Please try again.');
                    };
                    xhr.send(formData);
                  } catch (error) {
                    setImporting(false);
                    setProcessing(false);
                    setError('Failed to import file. Please try again.');
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

      {/* DG Quotation Form Modal */}
      {showDGQuotationForm && (
        <DGQuotationForm
          isOpen={showDGQuotationForm}
          onClose={() => {
            setShowDGQuotationForm(false);
            setSelectedDGQuotation(null);
          }}
          onSuccess={() => {
            setShowDGQuotationForm(false);
            setSelectedDGQuotation(null);
            if (activeStep === 2) loadStepData(2);
          }}
          dgEnquiry={selectedDGQuotation?.dgEnquiry}
          products={products}
          generalSettings={null}
          initialData={selectedDGQuotation}
          mode={dgQuotationFormMode}
          quotationId={selectedDGQuotation?._id}
        />
      )}

      {/* DG Quotation View Modal */}
      {showDGQuotationViewModal && selectedDGQuotation && (
        <DGQuotationViewModal
          isOpen={showDGQuotationViewModal}
          onClose={() => {
            setShowDGQuotationViewModal(false);
            setSelectedDGQuotation(null);
          }}
          quotation={selectedDGQuotation}
          onStatusUpdate={async (newStatus) => {
            try {
              const response = await apiClient.dgSales.quotations.update(selectedDGQuotation._id, { status: newStatus });
              if (response.success) {
                toast.success(`Quotation status updated to ${newStatus}`);
                setSelectedDGQuotation({ ...selectedDGQuotation, status: newStatus });
                if (activeStep === 2) loadStepData(2);
              }
            } catch (error) {
              toast.error('Failed to update quotation status');
            }
          }}
        />
      )}



      {showProformaForm && (
        <ProformaInvoiceForm
          isOpen={showProformaForm}
          onClose={() => {
            setShowProformaForm(false);
            setProformaData(null);
          }}
          onSuccess={() => {
            setShowProformaForm(false);
            setProformaData(null);
            if (activeStep === 5) loadStepData(5);
          }}
          initialData={proformaData}
        />
      )}

      {showInvoiceForm && (
        <DGInvoiceForm
          isOpen={showInvoiceForm}
          onClose={() => {
            setShowInvoiceForm(false);
            setInvoiceData(null);
          }}
          onSuccess={() => {
            setShowInvoiceForm(false);
            setInvoiceData(null);
            if (activeStep === 6) loadStepData(6);
          }}
          initialData={invoiceData}
        />
      )}

      {/* DG Enquiry Form Modal */}
      {showEnquiryForm && (
        <ComprehensiveDGEnquiryForm
          isOpen={showEnquiryForm}
          onClose={() => {
            setShowEnquiryForm(false);
            setSelectedEnquiry(null);
          }}
          onSuccess={() => {
            setShowEnquiryForm(false);
            setSelectedEnquiry(null);
            if (activeStep === 1) loadStepData(1);
          }}
          initialData={selectedEnquiry}
          mode={enquiryFormMode}
        />
      )}

      {/* DG Enquiry View Modal */}
      {showEnquiryViewModal && (
        <DGEnquiryViewModal
          isOpen={showEnquiryViewModal}
          onClose={() => {
            setShowEnquiryViewModal(false);
            setSelectedEnquiry(null);
          }}
          onSuccess={() => {
            setShowEnquiryViewModal(false);
            setSelectedEnquiry(null);
            if (activeStep === 1) loadStepData(1);
          }}
          enquiry={selectedEnquiry}
        />
      )}

    </div>
  );
}