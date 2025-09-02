import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Download, Send, X, Plus, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../utils/api';
import { downloadDGQuotationPDF } from '../utils/dgQuotationPdf';
import { Button } from '../components/ui/Botton';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import DGTechnicalSpecification from '../components/ui/DGTechnicalSpecification';

interface DGQuotationFormProps {
  enquiryId?: string;
}

interface QuotationData {
  quotationNumber: string;
  issueDate: string;
  validUntil: string;
  quotationRevisionNo: string;
  dgEnquiry?: string;
  subject: string;
  annexureRating: string;
  dgModel: string;
  cylinder: string;
  // Warranty fields
  warrantyFromInvoice: string;
  warrantyFromCommissioning: string;
  warrantyHours: string;
  // Terms & Conditions fields
  taxRate: string;
  freightTerms: string;
  deliveryPeriod: string;
  validityDays: string;
  enquiryDetails?: {
    enquiryNo: string;
    enquiryDate: string;
    enquiryType: string;
    enquiryStatus: string;
    enquiryStage: string;
    assignedEmployeeName: string;
    plannedFollowUpDate: string;
    numberOfFollowUps: number;
  };
  location?: string;
  customer: {
    _id?: string;
    name: string;
    email: string;
    phone: string;
    pan?: string;
    corporateName?: string;
    address?: string;
    pinCode?: string;
    tehsil?: string;
    district?: string;
  };
  billToAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    addressId?: number;
  };
  shipToAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    addressId?: number;
  };
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    pan: string;
    bankDetails: {
      bankName: string;
      accountNo: string;
      ifsc: string;
      branch: string;
    };
  };
  dgSpecifications: {
    kva: string;
    phase: string;
    quantity: number;
    segment: string;
    subSegment: string;
    dgOwnership: string;
   
  };
  items: Array<{
    product: string;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    // Optional fields for compatibility
    uom?: string;
    discount?: number;
    discountedAmount?: number;
    taxRate?: number;
    taxAmount?: number;
    // DG Product specific fields
    kva: string;
    phase: string;
    annexureRating: string;
    dgModel: string;
    numberOfCylinders: number;
    subject: string;
    isActive: boolean;
  }>;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
  grandTotalInWords: string;
  notes: string;
  terms: string;
  validityPeriod: number;
  deliveryTerms: string;
  paymentTerms: string;
  warrantyTerms: string;
  installationTerms: string;
  commissioningTerms: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
}

const DGQuotationForm: React.FC<DGQuotationFormProps> = ({ enquiryId }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const enquiry = location.state?.enquiry;
  console.log("enquiry12:", enquiry);


  const [formData, setFormData] = useState<QuotationData>({
    quotationNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    quotationRevisionNo: '01',
    subject: '',
    annexureRating: '',
    dgModel: '',
    cylinder: '',
        // Warranty fields
    warrantyFromInvoice: '30',
    warrantyFromCommissioning: '24',
    warrantyHours: '5000',
    // Terms & Conditions fields
    taxRate: '18',
    freightTerms: 'extra',
    deliveryPeriod: '6',
    validityDays: '30',
    dgEnquiry: enquiryId || enquiry?._id || '',
    enquiryDetails: {
      enquiryNo: enquiry?.enquiryNo || '',
      enquiryDate: enquiry?.enquiryDate ? new Date(enquiry.enquiryDate).toISOString().split('T')[0] : '',
      enquiryType: enquiry?.enquiryType || '',
      enquiryStatus: enquiry?.enquiryStatus || '',
      enquiryStage: enquiry?.enquiryStage || '',
      assignedEmployeeName: enquiry?.assignedEmployeeName || '',
      plannedFollowUpDate: enquiry?.plannedFollowUpDate ? new Date(enquiry.plannedFollowUpDate).toISOString().split('T')[0] : '',
      numberOfFollowUps: enquiry?.numberOfFollowUps || 0
    },
    location: enquiry?.location || '',
    customer: {
      _id: enquiry?.customerId || '',
      name: enquiry?.customerName || '',
      email: enquiry?.email || '',
      phone: enquiry?.phoneNumber || '',
      pan: enquiry?.panNumber || '',
      corporateName: enquiry?.corporateName || '',
      address: enquiry?.address || '',
      pinCode: enquiry?.pinCode || '',
      tehsil: enquiry?.tehsil || '',
      district: enquiry?.district || ''
    },
    billToAddress: { address: '', state: '', district: '', pincode: '' },
    shipToAddress: { address: '', state: '', district: '', pincode: '' },
    company: {
      name: 'Sun Power Services',
      address: 'Chennai, Tamil Nadu',
      phone: '+91 9840375605',
      email: 'pssayeeganesh.mahindra@gmail.com',
      pan: '33BLFPS9951M1ZC',
      bankDetails: {
        bankName: 'HDFC',
        accountNo: '50200051862959',
        ifsc: 'HDFC0005281',
        branch: 'MOULIVAKKAM'
      }
    },
    dgSpecifications: {
      kva: enquiry?.kva || '',
      phase: enquiry?.phase || '3',
      quantity: enquiry?.quantity || 1,
      segment: enquiry?.segment || '',
      subSegment: enquiry?.subSegment || '',
      dgOwnership: enquiry?.dgOwnership || '',
    },
    items: [
      {
        product: '',
        description: '',
        quantity: enquiry?.quantity || 1,
        unitPrice: 0,
        totalPrice: 0,
        // DG Product specific fields
        kva: enquiry?.kva || '',
        phase: enquiry?.phase || '3',
        annexureRating: '',
        dgModel: '',
        numberOfCylinders: 0,
        subject: '',
        isActive: true
      }
    ],
    subtotal: 0,
    totalDiscount: 0,
    totalTax: 0,
    grandTotal: 0,
    roundOff: 0,
    grandTotalInWords: '',
    notes: '',  
    terms: '',
    validityPeriod: 30,
    deliveryTerms: '',
    paymentTerms: '',
    warrantyTerms: '',
    installationTerms: '',
    commissioningTerms: '',
    status: 'Draft'
  });

  console.log("formData:", formData);


  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showTechnicalSpec, setShowTechnicalSpec] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<QuotationData['customer'] | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<QuotationData['customer'] | null>(null);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [dgProducts, setDgProducts] = useState<any[]>([]);
  const [showDgProductSelector, setShowDgProductSelector] = useState(false);
  const [dgProductSearchTerm, setDgProductSearchTerm] = useState('');
  const [showProductDescriptionDropdown, setShowProductDescriptionDropdown] = useState<Record<number, boolean>>({});
  const [productDescriptionSearchTerm, setProductDescriptionSearchTerm] = useState<Record<number, string>>({});

  // Location and Customer dropdown states
  const [locations, setLocations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const [highlightedLocationIndex, setHighlightedLocationIndex] = useState(-1);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);

  // Address dropdown states
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showBillToAddressDropdown, setShowBillToAddressDropdown] = useState(false);
  const [showShipToAddressDropdown, setShowShipToAddressDropdown] = useState(false);
  const [highlightedBillToAddressIndex, setHighlightedBillToAddressIndex] = useState(-1);
  const [highlightedShipToAddressIndex, setHighlightedShipToAddressIndex] = useState(-1);

  // Warranty and Terms dropdown states
  const [showWarrantyInvoiceDropdown, setShowWarrantyInvoiceDropdown] = useState(false);
  const [showWarrantyCommissioningDropdown, setShowWarrantyCommissioningDropdown] = useState(false);
  const [showWarrantyHoursDropdown, setShowWarrantyHoursDropdown] = useState(false);
  const [showTaxRateDropdown, setShowTaxRateDropdown] = useState(false);
  const [showFreightTermsDropdown, setShowFreightTermsDropdown] = useState(false);
  const [showDeliveryPeriodDropdown, setShowDeliveryPeriodDropdown] = useState(false);
  const [showValidityDaysDropdown, setShowValidityDaysDropdown] = useState(false);
  
  const [warrantyInvoiceSearchTerm, setWarrantyInvoiceSearchTerm] = useState('');
  const [warrantyCommissioningSearchTerm, setWarrantyCommissioningSearchTerm] = useState('');
  const [warrantyHoursSearchTerm, setWarrantyHoursSearchTerm] = useState('');
  const [taxRateSearchTerm, setTaxRateSearchTerm] = useState('');
  const [freightTermsSearchTerm, setFreightTermsSearchTerm] = useState('');
  const [deliveryPeriodSearchTerm, setDeliveryPeriodSearchTerm] = useState('');
  const [validityDaysSearchTerm, setValidityDaysSearchTerm] = useState('');
  
  const [highlightedWarrantyInvoiceIndex, setHighlightedWarrantyInvoiceIndex] = useState(-1);
  const [highlightedWarrantyCommissioningIndex, setHighlightedWarrantyCommissioningIndex] = useState(-1);
  const [highlightedWarrantyHoursIndex, setHighlightedWarrantyHoursIndex] = useState(-1);
  const [highlightedTaxRateIndex, setHighlightedTaxRateIndex] = useState(-1);
  const [highlightedFreightTermsIndex, setHighlightedFreightTermsIndex] = useState(-1);
  const [highlightedDeliveryPeriodIndex, setHighlightedDeliveryPeriodIndex] = useState(-1);
  const [highlightedValidityDaysIndex, setHighlightedValidityDaysIndex] = useState(-1);

  // DG Product Selection dropdown states
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showAnnexureRatingDropdown, setShowAnnexureRatingDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showCylinderDropdown, setShowCylinderDropdown] = useState(false);
  
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');
  const [annexureRatingSearchTerm, setAnnexureRatingSearchTerm] = useState('');
  const [modelSearchTerm, setModelSearchTerm] = useState('');
  const [cylinderSearchTerm, setCylinderSearchTerm] = useState('');
  
  const [highlightedSubjectIndex, setHighlightedSubjectIndex] = useState(-1);
  const [highlightedAnnexureRatingIndex, setHighlightedAnnexureRatingIndex] = useState(-1);
  const [highlightedModelIndex, setHighlightedModelIndex] = useState(-1);
  const [highlightedCylinderIndex, setHighlightedCylinderIndex] = useState(-1);

  useEffect(() => {
    generateQuotationNumber();
    fetchDGProducts();
    fetchLocations();
    fetchCustomers();
  }, []);

  // Recalculate totals when tax rate changes
  useEffect(() => {
    if (formData.items.length > 0) {
      recalculateTotals();
    }
  }, [formData.taxRate]);

  // Validate form in real-time for better UX
  useEffect(() => {
    // Only validate if user has interacted with the form
    if (formData.quotationNumber || formData.customer.name) {
      validateForm();
    }
  }, [
    formData.quotationNumber,
    formData.issueDate,
    formData.validUntil,
    formData.quotationRevisionNo,
    formData.customer.name,
    formData.customer.email, // Still watch for changes to validate format if provided
    formData.customer.phone,
    formData.billToAddress,
    formData.shipToAddress,
    formData.items,
    formData.dgSpecifications
  ]);

  // Debug effect to monitor state changes
  useEffect(() => {
    console.log('Current formData:', formData);
    console.log('Current locations:', locations);
    console.log('Current customers:', customers);
    console.log('Current addresses:', addresses);
  }, [formData, locations, customers, addresses]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container') && !target.closest('.product-description-dropdown')) {
        setShowLocationDropdown(false);
        setShowCustomerDropdown(false);
        setShowBillToAddressDropdown(false);
        setShowShipToAddressDropdown(false);
        setShowProductDescriptionDropdown({});
        // Close warranty and terms dropdowns
        setShowWarrantyInvoiceDropdown(false);
        setShowWarrantyCommissioningDropdown(false);
        setShowWarrantyHoursDropdown(false);
        setShowTaxRateDropdown(false);
        setShowFreightTermsDropdown(false);
        setShowDeliveryPeriodDropdown(false);
        setShowValidityDaysDropdown(false);
        // Close DG Product Selection dropdowns
        setShowSubjectDropdown(false);
        setShowAnnexureRatingDropdown(false);
        setShowModelDropdown(false);
        setShowCylinderDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const generateQuotationNumber = async () => {
    try {
      const response = await apiClient.dgSales.quotations.generateNumber();
      if (response.success) {
        setFormData(prev => ({
          ...prev,
          quotationNumber: response.data.quotationNumber
        }));
      }
    } catch (error) {
      console.error('Failed to generate quotation number:', error);
    }
  };

  const fetchDGProducts = async () => {
    try {
      const response = await apiClient.dgProducts.getAll({ limit: 100 });
      if (response.success && response.data) {
        const responseData = response.data as any;
        const products = responseData.products || responseData;
        setDgProducts(Array.isArray(products) ? products : []);
      }
    } catch (error) {
      console.error('Failed to fetch DG products:', error);
      setDgProducts([]);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await apiClient.stock.getLocations();
      let locationsData: any[] = [];

      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          locationsData = response.data;
        } else if ((response.data as any).locations && Array.isArray((response.data as any).locations)) {
          locationsData = (response.data as any).locations;
        }
      }

      console.log('Fetched locations:', locationsData);
      setLocations(locationsData);

      // Set "Main Office" as default if not already selected
      if (!formData.location) {
        const mainOffice = locationsData.find(loc => loc.name === "Main Office");
        if (mainOffice) {
          setFormData(prev => ({ ...prev, location: mainOffice._id }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await apiClient.customers.getAll({ limit: 100 });
      let customersData: any[] = [];

      if (response.success && response.data) {
        if (Array.isArray(response.data)) {
          customersData = response.data;
        } else if ((response.data as any).customers && Array.isArray((response.data as any).customers)) {
          customersData = (response.data as any).customers;
        }
      }

      console.log('Fetched customers:', customersData);
      setCustomers(customersData);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setCustomers([]);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev };
      const keys = field.split('.');
      let current: any = newData;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }

      current[keys[keys.length - 1]] = value;
      return newData;
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Recalculate totals if tax rate changes
    if (field === 'taxRate') {
      setTimeout(() => {
        recalculateTotals();
      }, 0);
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };

      // Recalculate item totals
      const item = newItems[index];
      const subtotal = item.unitPrice * item.quantity;
      const totalPrice = subtotal;

      newItems[index] = {
        ...item,
        totalPrice
      };

      // Recalculate overall totals
      const totalSubtotal = newItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      
      // Calculate tax using the selected tax rate
      const taxRatePercent = parseFloat(prev.taxRate || '18');
      const totalTax = (totalSubtotal * taxRatePercent) / 100;
      const grandTotal = totalSubtotal + totalTax;
      const roundOff = Math.round(grandTotal) - grandTotal;

      const newFormData = {
        ...prev,
        items: newItems,
        subtotal: totalSubtotal,
        totalDiscount: 0,
        totalTax: totalTax,
        grandTotal: Math.round(grandTotal),
        roundOff
      };

      // Update grand total in words
      setTimeout(() => {
        updateGrandTotalInWords(Math.round(grandTotal));
      }, 0);

      return newFormData;
    });
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          // DG Product specific fields
          kva: '',
          phase: '',
          annexureRating: '',
          dgModel: '',
          numberOfCylinders: 0,
          subject: '',
          isActive: true
        }
      ]
    }));
  };

  const addDGProduct = (dgProduct: any) => {
    const description = dgProduct.description || `Supply of ${dgProduct.kva} kVA ${dgProduct.phase === 'single' ? '1 phase' : '3 phase'}, Mahindra CPCB IV+ compliant, Prime Rated, radiator cooled, powered by Mahindra engine, electronic ${dgProduct.numberOfCylinders} cylinder engine, model ${dgProduct.dgModel}, coupled with ${dgProduct.kva} KVA alternator, Standard control panel with ASAS Controller with battery charger, Silencer, Anti-Vibration mountings, exhaust flexible connector, Batteries with cables, fuel tank.`;

    setFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product: `DG Set - ${dgProduct.kva} KVA ${dgProduct.phase === 'single' ? '1P' : '3P'}`,
          description: description,
          quantity: 1,
          unitPrice: 0,
          totalPrice: 0,
          // DG Product specific fields
          kva: dgProduct.kva,
          phase: dgProduct.phase,
          annexureRating: dgProduct.annexureRating,
          dgModel: dgProduct.dgModel,
          numberOfCylinders: dgProduct.numberOfCylinders,
          subject: dgProduct.subject,
          isActive: dgProduct.isActive
        }
      ]
    }));
    setShowDgProductSelector(false);
  };

  // Function to convert number to words
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const convertLessThanOneThousand = (n: number): string => {
      if (n === 0) return '';

      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      if (n < 1000) return ones[Math.floor(n / 1000)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convertLessThanOneThousand(n % 100) : '');
      return '';
    };

    const convert = (n: number): string => {
      if (n === 0) return 'Zero';
      if (n < 1000) return convertLessThanOneThousand(n);
      if (n < 100000) return convertLessThanOneThousand(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convertLessThanOneThousand(n % 1000) : '');
      if (n < 10000000) return convertLessThanOneThousand(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(Math.floor(n / 1000) % 100) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convertLessThanOneThousand(n % 1000) : '') : '');
      return convertLessThanOneThousand(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let result = convert(rupees) + ' Rupees';
    if (paise > 0) {
      result += ' and ' + convert(paise) + ' Paise';
    }
    return result + ' Only';
  };

  // Function to update grand total in words
  const updateGrandTotalInWords = (total: number) => {
    const words = numberToWords(total);
    updateField('grandTotalInWords', words);
  };

  // Function to recalculate totals when tax rate changes
  const recalculateTotals = () => {
    setFormData(prev => {
      const totalSubtotal = prev.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      
      // Calculate tax using the selected tax rate
      const taxRatePercent = parseFloat(prev.taxRate || '18');
      const totalTax = (totalSubtotal * taxRatePercent) / 100;
      const grandTotal = totalSubtotal + totalTax;
      const roundOff = Math.round(grandTotal) - grandTotal;

      const newFormData = {
        ...prev,
        subtotal: totalSubtotal,
        totalDiscount: 0,
        totalTax: totalTax,
        grandTotal: Math.round(grandTotal),
        roundOff
      };

      // Update grand total in words
      setTimeout(() => {
        updateGrandTotalInWords(Math.round(grandTotal));
      }, 0);

      return newFormData;
    });
  };

  // Function to handle product description selection
  const handleProductDescriptionSelect = (itemIndex: number, dgProduct: any) => {
    const description = dgProduct.description || `Supply of ${dgProduct.kva} kVA ${dgProduct.phase === 'single' ? '1 phase' : '3 phase'}, Mahindra CPCB IV+ compliant, Prime Rated, radiator cooled, powered by Mahindra engine, electronic ${dgProduct.numberOfCylinders} cylinder engine, model ${dgProduct.dgModel}, coupled with ${dgProduct.kva} KVA alternator, Standard control panel with ASAS Controller with battery charger, Silencer, Anti-Vibration mountings, exhaust flexible connector, Batteries with cables, fuel tank.`;

    updateItem(itemIndex, 'description', description);
    updateItem(itemIndex, 'product', `DG Set - ${dgProduct.kva} KVA ${dgProduct.phase === 'single' ? '1P' : '3P'}`);
    updateItem(itemIndex, 'partNo', dgProduct.dgModel || '');

    setShowProductDescriptionDropdown(prev => ({ ...prev, [itemIndex]: false }));
    setProductDescriptionSearchTerm(prev => ({ ...prev, [itemIndex]: '' }));
  };

  // Function to get filtered DG products for description dropdown
  const getFilteredDGProductsForDescription = (searchTerm: string) => {
    return dgProducts.filter(product =>
      !searchTerm ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.kva?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.dgModel?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  // Helper functions for DG specification dropdowns
  const getUniqueSubjects = () => {
    const subjects = dgProducts.map(product => product.subject).filter(Boolean);
    return [...new Set(subjects)];
  };

  const getUniqueAnnexureRatings = () => {
    const ratings = dgProducts.map(product => product.annexureRating).filter(Boolean);
    return [...new Set(ratings)];
  };

  const getUniqueModels = () => {
    const models = dgProducts.map(product => product.dgModel).filter(Boolean);
    return [...new Set(models)];
  };

  const getUniqueCylinders = () => {
    const cylinders = dgProducts.map(product => product.numberOfCylinders?.toString()).filter(Boolean);
    return [...new Set(cylinders)];
  };

  // Auto-selection logic for Model and Cylinder when Annexure Rating is selected
  const handleAnnexureRatingChange = (annexureRating: string) => {
    updateField('annexureRating', annexureRating);
    
    // Find matching products with this annexure rating
    const matchingProducts = dgProducts.filter(product => product.annexureRating === annexureRating);
    
    if (matchingProducts.length > 0) {
      // Auto-select the first matching model and cylinder
      const firstMatch = matchingProducts[0];
      updateField('dgModel', firstMatch.dgModel || '');
      updateField('cylinder', firstMatch.numberOfCylinders?.toString() || '');
    }
  };

  // Validation function for warranty and terms fields
  const validateWarrantyAndTerms = () => {
    const errors: string[] = [];
    
    // Validate warranty fields are valid numbers
    if (formData.warrantyFromInvoice && !/^\d+$/.test(formData.warrantyFromInvoice)) {
      errors.push('Warranty from invoice must be a valid number');
    }
    if (formData.warrantyFromCommissioning && !/^\d+$/.test(formData.warrantyFromCommissioning)) {
      errors.push('Warranty from commissioning must be a valid number');
    }
    if (formData.warrantyHours && !/^\d+$/.test(formData.warrantyHours)) {
      errors.push('Warranty hours must be a valid number');
    }
    
    // Validate tax rate is a valid number
    if (formData.taxRate && !/^\d+$/.test(formData.taxRate)) {
      errors.push('Tax rate must be a valid number');
    }
    
    // Validate delivery period is valid (number or "immediate")
    if (formData.deliveryPeriod && formData.deliveryPeriod !== 'immediate' && !/^\d+$/.test(formData.deliveryPeriod)) {
      errors.push('Delivery period must be a valid number or "immediate"');
    }
    
    // Validate validity is a valid number
    if (formData.validityDays && !/^\d+$/.test(formData.validityDays)) {
      errors.push('Validity period must be a valid number');
    }
    
    // Validate freight terms is lowercase
    if (formData.freightTerms && !['extra', 'included'].includes(formData.freightTerms)) {
      errors.push('Freight terms must be "extra" or "included"');
    }
    
    return errors;
  };

  // Helper function to convert QuotationData to DGQuotationData for PDF
  const convertToDGQuotationData = (data: QuotationData) => {
    const taxRatePercent = parseFloat(data.taxRate || '18');
    return {
      ...data,
      items: data.items.map(item => ({
        product: item.product,
        description: item.description,
        quantity: item.quantity,
        uom: 'nos',
        unitPrice: item.unitPrice,
        discount: 0,
        discountedAmount: 0,
        taxRate: taxRatePercent,
        taxAmount: (item.unitPrice * item.quantity * taxRatePercent) / 100,
        totalPrice: item.totalPrice
      }))
    };
  };

  // Helper functions for dropdowns
  const getLocationLabel = (locationId: string) => {
    if (!Array.isArray(locations) || !locationId) return '';
    const location = locations.find(loc => (loc as any)._id === locationId);
    return location ? `${(location as any).name} (${(location as any).type})` : '';
  };

  const getCustomerLabel = (customerId: string) => {
    if (!Array.isArray(customers) || !customerId) return '';
    const customer = customers.find(cust => cust._id === customerId);
    return customer ? customer.name : '';
  };

  const getAddressLabel = (addressId: string) => {
    if (!Array.isArray(addresses) || !addressId) return '';
    const address = addresses.find(addr => addr.id === parseInt(addressId));
    return address ? `${address.address} - ${address.district}` : '';
  };

  // Helper functions for warranty and terms dropdowns
  const warrantyInvoiceOptions = [
    { value: '30', label: '30 months' },
    { value: '24', label: '24 months' },
    { value: '18', label: '18 months' }
  ];

  const warrantyCommissioningOptions = [
    { value: '24', label: '24 months' }
  ];

  const warrantyHoursOptions = [
    { value: '5000', label: '5000 hours' },
    { value: '1000', label: '1000 hours' }
  ];

  const taxRateOptions = [
    { value: '18', label: '18%' },
    { value: '28', label: '28%' }
  ];

  const freightTermsOptions = [
    { value: 'extra', label: 'Extra' },
    { value: 'included', label: 'Included' }
  ];

  const deliveryPeriodOptions = [
    { value: 'immediate', label: 'Immediate' },
    { value: '1', label: '1 week' },
    { value: '2', label: '2 weeks' },
    { value: '3', label: '3 weeks' },
    { value: '4', label: '4 weeks' },
    { value: '5', label: '5 weeks' },
    { value: '6', label: '6 weeks' }
  ];

  const validityDaysOptions = [
    { value: '30', label: '30 days' },
    { value: '15', label: '15 days' },
    { value: '7', label: '1 week' }
  ];

  const getWarrantyInvoiceLabel = (value: string) => {
    const option = warrantyInvoiceOptions.find(opt => opt.value === value);
    return option ? option.label : '';
  };

  const getWarrantyCommissioningLabel = (value: string) => {
    const option = warrantyCommissioningOptions.find(opt => opt.value === value);
    return option ? option.label : '';
  };

  const getWarrantyHoursLabel = (value: string) => {
    const option = warrantyHoursOptions.find(opt => opt.value === value);
    return option ? option.label : '';
  };

  const getTaxRateLabel = (value: string) => {
    const option = taxRateOptions.find(opt => opt.value === value);
    return option ? option.label : '';
  };

  const getFreightTermsLabel = (value: string) => {
    const option = freightTermsOptions.find(opt => opt.value === value);
    return option ? option.label : '';
  };

  const getDeliveryPeriodLabel = (value: string) => {
    const option = deliveryPeriodOptions.find(opt => opt.value === value);
    return option ? option.label : '';
  };

  const getValidityDaysLabel = (value: string) => {
    const option = validityDaysOptions.find(opt => opt.value === value);
    return option ? option.label : '';
  };

  // Helper functions for DG Product Selection dropdowns
  const getSubjectLabel = (value: string) => {
    return value || '';
  };

  const getAnnexureRatingLabel = (value: string) => {
    return value || '';
  };

  const getModelLabel = (value: string) => {
    return value || '';
  };

  const getCylinderLabel = (value: string) => {
    return value ? `${value} Cylinder` : '';
  };

  // Keyboard navigation handlers
  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    if (!Array.isArray(locations)) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedLocationIndex(prev =>
        prev < locations.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedLocationIndex(prev =>
        prev > 0 ? prev - 1 : locations.length - 1
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedLocationIndex >= 0) {
        const location = locations[highlightedLocationIndex];
        setFormData(prev => ({ ...prev, location: (location as any)._id }));
        setShowLocationDropdown(false);
        setLocationSearchTerm('');
        setHighlightedLocationIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowLocationDropdown(false);
      setHighlightedLocationIndex(-1);
    }
  };

  const handleCustomerKeyDown = (e: React.KeyboardEvent) => {
    if (!Array.isArray(customers)) return;

    const filteredCustomers = customers.filter(customer =>
      customer.type === 'customer' && (
        customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase())
      )
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedCustomerIndex(prev =>
        prev < filteredCustomers.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedCustomerIndex(prev =>
        prev > 0 ? prev - 1 : filteredCustomers.length - 1
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedCustomerIndex >= 0) {
        const customer = filteredCustomers[highlightedCustomerIndex];
        handleCustomerSelect(customer._id);
        setCustomerSearchTerm('');
        setHighlightedCustomerIndex(-1);
        setAddresses(customer.addresses || []);
      }
    } else if (e.key === 'Escape') {
      setShowCustomerDropdown(false);
      setHighlightedCustomerIndex(-1);
    }
  };

  const handleBillToAddressKeyDown = (e: React.KeyboardEvent) => {
    if (!Array.isArray(addresses)) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedBillToAddressIndex(prev =>
        prev < addresses.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedBillToAddressIndex(prev =>
        prev > 0 ? prev - 1 : addresses.length - 1
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedBillToAddressIndex >= 0) {
        const address = addresses[highlightedBillToAddressIndex];
        setFormData(prev => ({
          ...prev,
          billToAddress: {
            address: address.address,
            state: address.state,
            district: address.district,
            pincode: address.pincode,
            ...(address.id && { addressId: address.id })
          }
        }));
        setShowBillToAddressDropdown(false);
        setHighlightedBillToAddressIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowBillToAddressDropdown(false);
      setHighlightedBillToAddressIndex(-1);
    }
  };

  const handleShipToAddressKeyDown = (e: React.KeyboardEvent) => {
    if (!Array.isArray(addresses)) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedShipToAddressIndex(prev =>
        prev < addresses.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedShipToAddressIndex(prev =>
        prev > 0 ? prev - 1 : addresses.length - 1
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedShipToAddressIndex >= 0) {
        const address = addresses[highlightedShipToAddressIndex];
        setFormData(prev => ({
          ...prev,
          shipToAddress: {
            address: address.address,
            state: address.state,
            district: address.district,
            pincode: address.pincode,
            ...(address.id && { addressId: address.id })
          }
        }));
        setShowShipToAddressDropdown(false);
        setHighlightedShipToAddressIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowShipToAddressDropdown(false);
      setHighlightedShipToAddressIndex(-1);
    }
  };

  // Keyboard navigation handlers for warranty and terms dropdowns
  const handleWarrantyInvoiceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedWarrantyInvoiceIndex(prev => prev < warrantyInvoiceOptions.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedWarrantyInvoiceIndex(prev => prev > 0 ? prev - 1 : warrantyInvoiceOptions.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedWarrantyInvoiceIndex >= 0) {
        const option = warrantyInvoiceOptions[highlightedWarrantyInvoiceIndex];
        updateField('warrantyFromInvoice', option.value);
        setShowWarrantyInvoiceDropdown(false);
        setWarrantyInvoiceSearchTerm('');
        setHighlightedWarrantyInvoiceIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowWarrantyInvoiceDropdown(false);
      setHighlightedWarrantyInvoiceIndex(-1);
    }
  };

  const handleTaxRateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedTaxRateIndex(prev => prev < taxRateOptions.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedTaxRateIndex(prev => prev > 0 ? prev - 1 : taxRateOptions.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedTaxRateIndex >= 0) {
        const option = taxRateOptions[highlightedTaxRateIndex];
        updateField('taxRate', option.value);
        setShowTaxRateDropdown(false);
        setTaxRateSearchTerm('');
        setHighlightedTaxRateIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowTaxRateDropdown(false);
      setHighlightedTaxRateIndex(-1);
    }
  };

  const handleFreightTermsKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedFreightTermsIndex(prev => prev < freightTermsOptions.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedFreightTermsIndex(prev => prev > 0 ? prev - 1 : freightTermsOptions.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedFreightTermsIndex >= 0) {
        const option = freightTermsOptions[highlightedFreightTermsIndex];
        updateField('freightTerms', option.value);
        setShowFreightTermsDropdown(false);
        setFreightTermsSearchTerm('');
        setHighlightedFreightTermsIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowFreightTermsDropdown(false);
      setHighlightedFreightTermsIndex(-1);
    }
  };

  const handleDeliveryPeriodKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedDeliveryPeriodIndex(prev => prev < deliveryPeriodOptions.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedDeliveryPeriodIndex(prev => prev > 0 ? prev - 1 : deliveryPeriodOptions.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedDeliveryPeriodIndex >= 0) {
        const option = deliveryPeriodOptions[highlightedDeliveryPeriodIndex];
        updateField('deliveryPeriod', option.value);
        setShowDeliveryPeriodDropdown(false);
        setDeliveryPeriodSearchTerm('');
        setHighlightedDeliveryPeriodIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowDeliveryPeriodDropdown(false);
      setHighlightedDeliveryPeriodIndex(-1);
    }
  };

  const handleValidityDaysKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedValidityDaysIndex(prev => prev < validityDaysOptions.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedValidityDaysIndex(prev => prev > 0 ? prev - 1 : validityDaysOptions.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedValidityDaysIndex >= 0) {
        const option = validityDaysOptions[highlightedValidityDaysIndex];
        updateField('validityDays', option.value);
        setShowValidityDaysDropdown(false);
        setValidityDaysSearchTerm('');
        setHighlightedValidityDaysIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowValidityDaysDropdown(false);
      setHighlightedValidityDaysIndex(-1);
    }
  };

  // Keyboard navigation handlers for DG Product Selection dropdowns
  const handleSubjectKeyDown = (e: React.KeyboardEvent) => {
    const subjects = getUniqueSubjects();
    const filteredSubjects = subjects.filter(subject => 
      !subjectSearchTerm || subject.toLowerCase().includes(subjectSearchTerm.toLowerCase())
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedSubjectIndex(prev => prev < filteredSubjects.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedSubjectIndex(prev => prev > 0 ? prev - 1 : filteredSubjects.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedSubjectIndex >= 0) {
        const subject = filteredSubjects[highlightedSubjectIndex];
        updateField('subject', subject);
        setShowSubjectDropdown(false);
        setSubjectSearchTerm('');
        setHighlightedSubjectIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowSubjectDropdown(false);
      setHighlightedSubjectIndex(-1);
    }
  };

  const handleAnnexureRatingKeyDown = (e: React.KeyboardEvent) => {
    const ratings = getUniqueAnnexureRatings();
    const filteredRatings = ratings.filter(rating => 
      !annexureRatingSearchTerm || rating.toLowerCase().includes(annexureRatingSearchTerm.toLowerCase())
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedAnnexureRatingIndex(prev => prev < filteredRatings.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedAnnexureRatingIndex(prev => prev > 0 ? prev - 1 : filteredRatings.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedAnnexureRatingIndex >= 0) {
        const rating = filteredRatings[highlightedAnnexureRatingIndex];
        handleAnnexureRatingChange(rating);
        setShowAnnexureRatingDropdown(false);
        setAnnexureRatingSearchTerm('');
        setHighlightedAnnexureRatingIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowAnnexureRatingDropdown(false);
      setHighlightedAnnexureRatingIndex(-1);
    }
  };

  const handleModelKeyDown = (e: React.KeyboardEvent) => {
    const models = getUniqueModels();
    const filteredModels = models.filter(model => 
      !modelSearchTerm || model.toLowerCase().includes(modelSearchTerm.toLowerCase())
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedModelIndex(prev => prev < filteredModels.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedModelIndex(prev => prev > 0 ? prev - 1 : filteredModels.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedModelIndex >= 0) {
        const model = filteredModels[highlightedModelIndex];
        updateField('dgModel', model);
        setShowModelDropdown(false);
        setModelSearchTerm('');
        setHighlightedModelIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowModelDropdown(false);
      setHighlightedModelIndex(-1);
    }
  };

  const handleCylinderKeyDown = (e: React.KeyboardEvent) => {
    const cylinders = getUniqueCylinders();
    const filteredCylinders = cylinders.filter(cylinder => 
      !cylinderSearchTerm || cylinder.toLowerCase().includes(cylinderSearchTerm.toLowerCase())
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedCylinderIndex(prev => prev < filteredCylinders.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedCylinderIndex(prev => prev > 0 ? prev - 1 : filteredCylinders.length - 1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedCylinderIndex >= 0) {
        const cylinder = filteredCylinders[highlightedCylinderIndex];
        updateField('cylinder', cylinder);
        setShowCylinderDropdown(false);
        setCylinderSearchTerm('');
        setHighlightedCylinderIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowCylinderDropdown(false);
      setHighlightedCylinderIndex(-1);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c._id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer: {
          _id: customer._id,
          name: customer.name,
          email: customer.email || '',
          phone: customer.phone || '',
          pan: customer.pan || '',
          corporateName: customer.corporateName || '',
          address: customer.address || '',
          pinCode: customer.pinCode || '',
          tehsil: customer.tehsil || '',
          district: customer.district || ''
        },
        billToAddress: { address: '', state: '', district: '', pincode: '' },
        shipToAddress: { address: '', state: '', district: '', pincode: '' }
      }));
      setShowCustomerDropdown(false);
      setAddresses(customer.addresses || []);
    }
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic Information validation
    if (!formData.quotationNumber || formData.quotationNumber.trim() === '') {
      newErrors.quotationNumber = 'Quotation number is required';
    }
    if (!formData.issueDate) {
      newErrors.issueDate = 'Issue date is required';
    }
    if (!formData.validUntil) {
      newErrors.validUntil = 'Valid until date is required';
    }
    if (!formData.quotationRevisionNo || formData.quotationRevisionNo.trim() === '') {
      newErrors.quotationRevisionNo = 'Quotation revision number is required';
    }

    // Customer validation
    if (!formData.customer.name || formData.customer.name.trim() === '') {
      newErrors['customer.name'] = 'Customer name is required';
    }
    // Email is optional, but if provided, should be valid
    if (formData.customer.email && formData.customer.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.customer.email)) {
        newErrors['customer.email'] = 'Please enter a valid email address';
      }
    }
    if (!formData.customer.phone || formData.customer.phone.trim() === '') {
      newErrors['customer.phone'] = 'Customer phone is required';
    }

    // Address validation
    if (!formData.billToAddress?.address || formData.billToAddress.address.trim() === '') {
      newErrors['billToAddress.address'] = 'Bill to address is required';
    }
    if (!formData.shipToAddress?.address || formData.shipToAddress.address.trim() === '') {
      newErrors['shipToAddress.address'] = 'Ship to address is required';
    }

    // Items validation
    if (!formData.items || formData.items.length === 0) {
      newErrors.items = 'At least one item is required';
    } else {
      formData.items.forEach((item, index) => {
        if (!item.product || item.product.trim() === '') {
          newErrors[`items.${index}.product`] = `Product name is required for item ${index + 1}`;
        }
        if (!item.description || item.description.trim() === '') {
          newErrors[`items.${index}.description`] = `Description is required for item ${index + 1}`;
        }
        if (!item.quantity || item.quantity <= 0) {
          newErrors[`items.${index}.quantity`] = `Valid quantity is required for item ${index + 1}`;
        }
        if (!item.unitPrice || item.unitPrice <= 0) {
          newErrors[`items.${index}.unitPrice`] = `Valid unit price is required for item ${index + 1}`;
        }
      });
    }

    // DG Specifications validation
    if (!formData.dgSpecifications.kva || formData.dgSpecifications.kva.trim() === '') {
      newErrors['dgSpecifications.kva'] = 'KVA rating is required';
    }
    if (!formData.dgSpecifications.phase || formData.dgSpecifications.phase.trim() === '') {
      newErrors['dgSpecifications.phase'] = 'Phase is required';
    }
    if (!formData.dgSpecifications.quantity || formData.dgSpecifications.quantity <= 0) {
      newErrors['dgSpecifications.quantity'] = 'Valid quantity is required';
    }

    // Validate warranty and terms fields (but don't block submission for these)
    const warrantyTermsErrors = validateWarrantyAndTerms();
    if (warrantyTermsErrors.length > 0) {
      console.warn('Warranty/Terms validation warnings:', warrantyTermsErrors);
      // Don't add these to newErrors as they shouldn't block submission
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    
    if (!isValid) {
      console.error('Form validation errors:', newErrors);
    }
    
    return isValid;
  };

  const handleSubmit = async () => {
    console.log('Starting form validation...');
    
    if (!validateForm()) {
      const errorCount = Object.keys(errors).length;
      toast.error(`Please fix ${errorCount} validation error(s) before submitting`);
      
      // Scroll to first error field
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        console.log('First error field:', firstErrorField, 'Error:', errors[firstErrorField]);
        const element = document.querySelector(`[name="${firstErrorField}"]`) || 
                       document.querySelector(`input[value*="${firstErrorField}"]`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    console.log('Form validation passed. Submitting quotation...');
    setSubmitting(true);
    
    try {
      // Transform payload to match backend model structure
      const payload = {
        ...formData,
        dgItems: formData.items.map(item => ({
          ...item,
          // Ensure all required fields are present
          product: item.product || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.totalPrice || 0,
          kva: item.kva || formData.dgSpecifications.kva || '',
          phase: item.phase || formData.dgSpecifications.phase || '',
          annexureRating: item.annexureRating || formData.annexureRating || '',
          dgModel: item.dgModel || formData.dgModel || '',
          numberOfCylinders: item.numberOfCylinders || parseInt(formData.cylinder) || 0,
          subject: item.subject || formData.subject || '',
          isActive: item.isActive !== undefined ? item.isActive : true
        })),
        // Remove the items field since we're using dgItems
        items: undefined
      };

      console.log('Payload being sent:', payload);

      const response = await apiClient.dgSales.quotations.create(payload);
      if (response.success) {
        toast.success('DG Quotation created successfully');
        navigate('/dg-sales');
              } else {
          throw new Error('Failed to create quotation');
        }
    } catch (error: any) {
      console.error('Error creating quotation:', error);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to create quotation. Please check your data and try again.';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to display validation errors
  const displayValidationErrors = () => {
    const errorEntries = Object.entries(errors);
    if (errorEntries.length > 0) {
      console.log('Current validation errors:', errors);
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <div className="text-red-600 mr-2">⚠️</div>
            <div className="text-red-800 font-semibold">
              Please fix the following errors before submitting:
            </div>
          </div>
          <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
            {errorEntries.map(([field, error]) => (
              <li key={field}>{error}</li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  const renderPreview = () => {
    return (
      <div className="bg-white p-8 max-w-4xl mx-auto shadow-lg">
        {/* Header with Logos */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center">
            <div className="text-red-600 font-bold text-2xl italic">powerol</div>
            <div className="text-sm text-gray-600 ml-2">by Mahindra</div>
          </div>
          <div className="text-right">
            <div className="text-red-600 font-bold text-xl italic">Sun Power Services</div>
            <div className="text-sm text-gray-600">{formData.issueDate}</div>
            <div className="text-xs text-gray-500">Rev. {formData.quotationRevisionNo}</div>
          </div>
        </div>

        <div className="border-t-2 border-red-600 mb-6"></div>

        {/* Quotation and Enquiry Details */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm font-semibold bg-blue-200 px-2 py-1 rounded">
              Quotation No: {formData.quotationNumber || '-'}
            </div>
            <div className="text-sm font-semibold bg-yellow-200 px-2 py-1 rounded">
              Enquiry No: {formData.enquiryDetails?.enquiryNo || '-'}
            </div>
          </div>
          <div className="text-sm font-semibold mb-2">TO</div>
          <div className="text-sm mb-1">{formData.customer.name}</div>
          <div className="text-sm mb-1">{formData.customer.address}</div>
          <div className="text-sm mb-1">Kind Attn. {formData.customer.corporateName}</div>
          <div className="text-sm mb-1">Mob number - {formData.customer.phone}</div>
          <div className="text-sm mb-4">Site @{formData.customer.district}</div>
          <div className="text-sm mb-4">Dear Sir,</div>
        </div>

        {/* Subject */}
        <div className="text-center font-bold text-lg mb-6">
          Sub: Best Quote for Supply {formData.dgSpecifications.kva} & {formData.dgSpecifications.kva} Kva Mahindra Powerol DG set CPCB IV+
        </div>

        {/* Body Content */}
        <div className="text-sm leading-relaxed mb-6">
          {formData.notes.split('\n').map((paragraph, index) => (
            <p key={index} className="mb-2">{paragraph}</p>
          ))}
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Sl.No</th>
                <th className="border border-gray-300 p-2 text-left">Description</th>
                <th className="border border-gray-300 p-2 text-center">Qty</th>
                <th className="border border-gray-300 p-2 text-right">Basic price</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{index + 1}</td>
                  <td className="border border-gray-300 p-2">{item.description}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 p-2 text-right">
                    ₹{item.unitPrice.toLocaleString()}
                  </td>
                </tr>
              ))}
              {dgProducts
                .filter(product =>
                  !dgProductSearchTerm ||
                  product.kva?.toLowerCase().includes(dgProductSearchTerm.toLowerCase()) ||
                  product.phase?.toLowerCase().includes(dgProductSearchTerm.toLowerCase()) ||
                  product.dgModel?.toLowerCase().includes(dgProductSearchTerm.toLowerCase()) ||
                  product.subject?.toLowerCase().includes(dgProductSearchTerm.toLowerCase())
                ).length === 0 && (
                  <tr>
                    <td colSpan={8} className="border border-gray-300 p-4 text-center text-gray-500">
                      {dgProductSearchTerm ? 'No DG products found matching your search.' : 'No DG products available.'}
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>

        {/* Commercial Terms */}
        <div className="mb-6">
          <div className="text-sm">
            <div className="mb-1"><strong>GST:</strong> 18% Extra</div>
            <div className="mb-1"><strong>Transport:</strong> Extra</div>
            <div className="mb-1"><strong>Unloading:</strong> Extra</div>
            <div className="mb-1"><strong>Delivery:</strong> {formData.deliveryTerms}</div>
            <div className="mb-1"><strong>Payment Terms:</strong> {formData.paymentTerms}</div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="mb-6">
          <table className="w-full border border-gray-300">
            <tbody>
              <tr><td className="border border-gray-300 p-2 font-semibold">GST NO</td><td className="border border-gray-300 p-2">{formData.company.pan}</td></tr>
              <tr><td className="border border-gray-300 p-2 font-semibold">ACCOUNT NAME</td><td className="border border-gray-300 p-2">{formData.company.name}</td></tr>
              <tr><td className="border border-gray-300 p-2 font-semibold">ACCOUNT NUMBER</td><td className="border border-gray-300 p-2">{formData.company.bankDetails.accountNo}</td></tr>
              <tr><td className="border border-gray-300 p-2 font-semibold">BANK</td><td className="border border-gray-300 p-2">{formData.company.bankDetails.bankName}</td></tr>
              <tr><td className="border border-gray-300 p-2 font-semibold">BRANCH</td><td className="border border-gray-300 p-2">{formData.company.bankDetails.branch}</td></tr>
              <tr><td className="border border-gray-300 p-2 font-semibold">IFSC CODE</td><td className="border border-gray-300 p-2">{formData.company.bankDetails.ifsc}</td></tr>
            </tbody>
          </table>
        </div>

        {/* Validity */}
        <div className="mb-6">
          <div className="text-sm">
            <strong>Validity:</strong> Offer shall be valid for a period of {formData.validityPeriod} days from the date of submission of offer and thereafter on written confirmation.
          </div>
        </div>

        {/* Signature */}
        <div className="mt-8">
          <div className="text-sm mb-2">Yours Truly,</div>
          <div className="text-sm font-semibold mb-1">For {formData.company.name}</div>
          <div className="text-sm mb-1">P.S.Sayee Ganesh</div>
          <div className="text-sm mb-1">Senior Sales Manager - HKVA</div>
          <div className="text-sm mb-1">Mob: {formData.company.phone}</div>
          <div className="text-sm">Email: {formData.company.email}</div>
        </div>
      </div>
    );
  };

  // Effect to handle enquiry data and auto-fill customer details
  useEffect(() => {
    console.log('Enquiry data received:', enquiry);
    console.log('Customers loaded:', customers);
    
    if (enquiry && enquiry.customer?._id) {
      console.log('Looking for customer with ID:', enquiry.customer?._id);
      // Find the customer in the customers list
      const customer = customers.find(cust => cust._id === enquiry.customer?._id);
      console.log('Found customer:', customer);
      
      if (customer) {
        console.log('Auto-filling customer details:', customer);
        // Set the customer and addresses
        setFormData(prev => ({
          ...prev,
          customer: {
            _id: customer._id,
            name: customer.name,
            email: customer.email || '',
            phone: customer.phone || '',
            pan: customer.pan || '',
            corporateName: customer.corporateName || '',
            address: customer.address || '',
            pinCode: customer.pinCode || '',
            tehsil: customer.tehsil || '',
            district: customer.district || ''
          }
        }));
        setAddresses(customer.addresses || []);
        
        // If enquiry has addresses, set the first one as bill to and ship to
        if (customer.addresses && customer.addresses.length > 0) {
          const primaryAddress = customer.addresses.find((addr: any) => addr.isPrimary) || customer.addresses[0];
          console.log('Setting addresses:', primaryAddress);
          setFormData(prev => ({
            ...prev,
            billToAddress: {
              address: primaryAddress.address,
              state: primaryAddress.state,
              district: primaryAddress.district,
              pincode: primaryAddress.pincode,
              ...(primaryAddress.id && { addressId: primaryAddress.id })
            },
            shipToAddress: {
              address: primaryAddress.address,
              state: primaryAddress.state,
              district: primaryAddress.district,
              pincode: primaryAddress.pincode,
              ...(primaryAddress.id && { addressId: primaryAddress.id })
            }
          }));
        }
        
        // Show success message
        // toast.success(`Customer "${customer.name}" details auto-filled successfully!`);
      } else {
        console.log('Customer not found in customers list');
        // If customer not found in list, try to use enquiry data directly
        if (enquiry.customerName) {
          console.log('Using enquiry data directly for customer details');
          setFormData(prev => ({
            ...prev,
            customer: {
              _id: enquiry.customerId || '',
              name: enquiry.customerName || '',
              email: enquiry.email || '',
              phone: enquiry.phoneNumber || '',
              pan: enquiry.panNumber || '',
              corporateName: enquiry.corporateName || '',
              address: enquiry.address || '',
              pinCode: enquiry.pinCode || '',
              tehsil: enquiry.tehsil || '',
              district: enquiry.district || ''
            }
          }));
          // toast.success(`Customer "${enquiry.customerName}" details auto-filled from enquiry data!`);
        }
      }
    }
  }, [enquiry, customers]);

  if (previewMode) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setPreviewMode(false)}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Edit
                </Button>
                <h1 className="text-xl font-semibold">DG Quotation Preview</h1>
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleSubmit} disabled={submitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {submitting ? 'Saving...' : 'Save Quotation'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadDGQuotationPDF(convertToDGQuotationData(formData))}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="py-8">
          {renderPreview()}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-sm border-b">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/dg-sales')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to DG Sales
              </Button>
              <h1 className="text-xl font-semibold">Create DG Quotation</h1>
              {enquiry && (
                <div className="flex items-center space-x-2">
                  <Badge variant="info">
                    From Enquiry: {enquiry.customerName}
                  </Badge>
                  {formData.enquiryDetails?.enquiryNo && (
                    <Badge variant="warning">
                      Enquiry: {formData.enquiryDetails.enquiryNo}
                    </Badge>
                  )}
                  {formData.enquiryDetails?.enquiryStatus && (
                    <Badge variant={
                      formData.enquiryDetails.enquiryStatus === 'Active' ? 'success' :
                        formData.enquiryDetails.enquiryStatus === 'Pending' ? 'warning' :
                          formData.enquiryDetails.enquiryStatus === 'Closed' ? 'danger' : 'info'
                    }>
                      {formData.enquiryDetails.enquiryStatus}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setPreviewMode(true)}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTechnicalSpec(true)}
              >
                Technical Spec
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadDGQuotationPDF(convertToDGQuotationData(formData))}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Saving...' : 'Save Quotation'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Display Validation Errors */}
        {displayValidationErrors()}

        {/* DG Product Selection - At the Top */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">DG Product Selection</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={subjectSearchTerm || getSubjectLabel(formData.subject)}
                  onChange={(e) => {
                    setSubjectSearchTerm(e.target.value);
                    if (!showSubjectDropdown) setShowSubjectDropdown(true);
                    setHighlightedSubjectIndex(-1);
                  }}
                  onFocus={() => {
                    setShowSubjectDropdown(true);
                    setHighlightedSubjectIndex(-1);
                  }}
                  onKeyDown={handleSubjectKeyDown}
                  placeholder="Search or select subject"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showSubjectDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showSubjectDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {getUniqueSubjects()
                      .filter(subject => 
                        !subjectSearchTerm || 
                        subject.toLowerCase().includes(subjectSearchTerm.toLowerCase())
                      )
                      .map((subject, index) => (
                        <button
                          key={subject}
                          onClick={() => {
                            updateField('subject', subject);
                            setShowSubjectDropdown(false);
                            setSubjectSearchTerm('');
                            setHighlightedSubjectIndex(-1);
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                            formData.subject === subject ? 'bg-blue-100 text-blue-800' :
                            highlightedSubjectIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                            'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {subject}
                        </button>
                      ))}
                    {getUniqueSubjects().filter(subject => 
                      !subjectSearchTerm || 
                      subject.toLowerCase().includes(subjectSearchTerm.toLowerCase())
                    ).length === 0 && subjectSearchTerm && (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No subjects found for "{subjectSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Annexure Rating
              </label>
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={annexureRatingSearchTerm || getAnnexureRatingLabel(formData.annexureRating)}
                  onChange={(e) => {
                    setAnnexureRatingSearchTerm(e.target.value);
                    if (!showAnnexureRatingDropdown) setShowAnnexureRatingDropdown(true);
                    setHighlightedAnnexureRatingIndex(-1);
                  }}
                  onFocus={() => {
                    setShowAnnexureRatingDropdown(true);
                    setHighlightedAnnexureRatingIndex(-1);
                  }}
                  onKeyDown={handleAnnexureRatingKeyDown}
                  placeholder="Search or select annexure rating"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showAnnexureRatingDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showAnnexureRatingDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {getUniqueAnnexureRatings()
                      .filter(rating => 
                        !annexureRatingSearchTerm || 
                        rating.toLowerCase().includes(annexureRatingSearchTerm.toLowerCase())
                      )
                      .map((rating, index) => (
                        <button
                          key={rating}
                          onClick={() => {
                            handleAnnexureRatingChange(rating);
                            setShowAnnexureRatingDropdown(false);
                            setAnnexureRatingSearchTerm('');
                            setHighlightedAnnexureRatingIndex(-1);
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                            formData.annexureRating === rating ? 'bg-blue-100 text-blue-800' :
                            highlightedAnnexureRatingIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                            'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                    {getUniqueAnnexureRatings().filter(rating => 
                      !annexureRatingSearchTerm || 
                      rating.toLowerCase().includes(annexureRatingSearchTerm.toLowerCase())
                    ).length === 0 && annexureRatingSearchTerm && (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No annexure ratings found for "{annexureRatingSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={modelSearchTerm || getModelLabel(formData.dgModel)}
                  onChange={(e) => {
                    setModelSearchTerm(e.target.value);
                    if (!showModelDropdown) setShowModelDropdown(true);
                    setHighlightedModelIndex(-1);
                  }}
                  onFocus={() => {
                    setShowModelDropdown(true);
                    setHighlightedModelIndex(-1);
                  }}
                  onKeyDown={handleModelKeyDown}
                  placeholder="Search or select model"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showModelDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showModelDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {getUniqueModels()
                      .filter(model => 
                        !modelSearchTerm || 
                        model.toLowerCase().includes(modelSearchTerm.toLowerCase())
                      )
                      .map((model, index) => (
                        <button
                          key={model}
                          onClick={() => {
                            updateField('dgModel', model);
                            setShowModelDropdown(false);
                            setModelSearchTerm('');
                            setHighlightedModelIndex(-1);
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                            formData.dgModel === model ? 'bg-blue-100 text-blue-800' :
                            highlightedModelIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                            'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {model}
                        </button>
                      ))}
                    {getUniqueModels().filter(model => 
                      !modelSearchTerm || 
                      model.toLowerCase().includes(modelSearchTerm.toLowerCase())
                    ).length === 0 && modelSearchTerm && (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No models found for "{modelSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cylinder
              </label>
              <div className="relative dropdown-container">
                <input
                  type="text"
                  value={cylinderSearchTerm || getCylinderLabel(formData.cylinder)}
                  onChange={(e) => {
                    setCylinderSearchTerm(e.target.value);
                    if (!showCylinderDropdown) setShowCylinderDropdown(true);
                    setHighlightedCylinderIndex(-1);
                  }}
                  onFocus={() => {
                    setShowCylinderDropdown(true);
                    setHighlightedCylinderIndex(-1);
                  }}
                  onKeyDown={handleCylinderKeyDown}
                  placeholder="Search or select cylinder"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCylinderDropdown ? 'rotate-180' : ''}`} />
                </div>
                {showCylinderDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                    {getUniqueCylinders()
                      .filter(cylinder => 
                        !cylinderSearchTerm || 
                        cylinder.toLowerCase().includes(cylinderSearchTerm.toLowerCase())
                      )
                      .map((cylinder, index) => (
                        <button
                          key={cylinder}
                          onClick={() => {
                            updateField('cylinder', cylinder);
                            setShowCylinderDropdown(false);
                            setCylinderSearchTerm('');
                            setHighlightedCylinderIndex(-1);
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                            formData.cylinder === cylinder ? 'bg-blue-100 text-blue-800' :
                            highlightedCylinderIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                            'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {cylinder} Cylinder
                        </button>
                      ))}
                    {getUniqueCylinders().filter(cylinder => 
                      !cylinderSearchTerm || 
                      cylinder.toLowerCase().includes(cylinderSearchTerm.toLowerCase())
                    ).length === 0 && cylinderSearchTerm && (
                      <div className="px-3 py-2 text-sm text-gray-500 text-center">
                        No cylinders found for "{cylinderSearchTerm}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Warranty and Terms Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Warranty & Terms Configuration</h2>
          
          {/* Warranty Section */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-3 text-gray-800">Warranty Options</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warranty from Invoice Date
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={warrantyInvoiceSearchTerm || getWarrantyInvoiceLabel(formData.warrantyFromInvoice)}
                    onChange={(e) => {
                      setWarrantyInvoiceSearchTerm(e.target.value);
                      if (!showWarrantyInvoiceDropdown) setShowWarrantyInvoiceDropdown(true);
                      setHighlightedWarrantyInvoiceIndex(-1);
                    }}
                    onFocus={() => {
                      setShowWarrantyInvoiceDropdown(true);
                      setHighlightedWarrantyInvoiceIndex(-1);
                    }}
                    onKeyDown={handleWarrantyInvoiceKeyDown}
                    placeholder="Select warranty period"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showWarrantyInvoiceDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showWarrantyInvoiceDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      {warrantyInvoiceOptions
                        .filter(option => 
                          !warrantyInvoiceSearchTerm || 
                          option.label.toLowerCase().includes(warrantyInvoiceSearchTerm.toLowerCase())
                        )
                        .map((option, index) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              updateField('warrantyFromInvoice', option.value);
                              setShowWarrantyInvoiceDropdown(false);
                              setWarrantyInvoiceSearchTerm('');
                              setHighlightedWarrantyInvoiceIndex(-1);
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                              formData.warrantyFromInvoice === option.value ? 'bg-blue-100 text-blue-800' :
                              highlightedWarrantyInvoiceIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warranty from Commissioning
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={getWarrantyCommissioningLabel(formData.warrantyFromCommissioning)}
                    readOnly
                    onFocus={() => {
                      setShowWarrantyCommissioningDropdown(true);
                      setHighlightedWarrantyCommissioningIndex(-1);
                    }}
                    placeholder="Select commissioning warranty"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showWarrantyCommissioningDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showWarrantyCommissioningDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      {warrantyCommissioningOptions.map((option, index) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            updateField('warrantyFromCommissioning', option.value);
                            setShowWarrantyCommissioningDropdown(false);
                            setHighlightedWarrantyCommissioningIndex(-1);
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                            formData.warrantyFromCommissioning === option.value ? 'bg-blue-100 text-blue-800' :
                            highlightedWarrantyCommissioningIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                            'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warranty Hours
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={warrantyHoursSearchTerm || getWarrantyHoursLabel(formData.warrantyHours)}
                    onChange={(e) => {
                      setWarrantyHoursSearchTerm(e.target.value);
                      if (!showWarrantyHoursDropdown) setShowWarrantyHoursDropdown(true);
                      setHighlightedWarrantyHoursIndex(-1);
                    }}
                    onFocus={() => {
                      setShowWarrantyHoursDropdown(true);
                      setHighlightedWarrantyHoursIndex(-1);
                    }}
                    placeholder="Select warranty hours"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showWarrantyHoursDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showWarrantyHoursDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      {warrantyHoursOptions
                        .filter(option => 
                          !warrantyHoursSearchTerm || 
                          option.label.toLowerCase().includes(warrantyHoursSearchTerm.toLowerCase())
                        )
                        .map((option, index) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              updateField('warrantyHours', option.value);
                              setShowWarrantyHoursDropdown(false);
                              setWarrantyHoursSearchTerm('');
                              setHighlightedWarrantyHoursIndex(-1);
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                              formData.warrantyHours === option.value ? 'bg-blue-100 text-blue-800' :
                              highlightedWarrantyHoursIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
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

          {/* Terms & Conditions Section */}
          <div className="mb-6">
            <h3 className="text-md font-semibold mb-3 text-gray-800">Terms & Conditions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={taxRateSearchTerm || getTaxRateLabel(formData.taxRate)}
                    onChange={(e) => {
                      setTaxRateSearchTerm(e.target.value);
                      if (!showTaxRateDropdown) setShowTaxRateDropdown(true);
                      setHighlightedTaxRateIndex(-1);
                    }}
                    onFocus={() => {
                      setShowTaxRateDropdown(true);
                      setHighlightedTaxRateIndex(-1);
                    }}
                    onKeyDown={handleTaxRateKeyDown}
                    placeholder="Select tax rate"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showTaxRateDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showTaxRateDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      {taxRateOptions
                        .filter(option => 
                          !taxRateSearchTerm || 
                          option.label.toLowerCase().includes(taxRateSearchTerm.toLowerCase())
                        )
                        .map((option, index) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              updateField('taxRate', option.value);
                              setShowTaxRateDropdown(false);
                              setTaxRateSearchTerm('');
                              setHighlightedTaxRateIndex(-1);
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                              formData.taxRate === option.value ? 'bg-blue-100 text-blue-800' :
                              highlightedTaxRateIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Freight Terms
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={freightTermsSearchTerm || getFreightTermsLabel(formData.freightTerms)}
                    onChange={(e) => {
                      setFreightTermsSearchTerm(e.target.value);
                      if (!showFreightTermsDropdown) setShowFreightTermsDropdown(true);
                      setHighlightedFreightTermsIndex(-1);
                    }}
                    onFocus={() => {
                      setShowFreightTermsDropdown(true);
                      setHighlightedFreightTermsIndex(-1);
                    }}
                    onKeyDown={handleFreightTermsKeyDown}
                    placeholder="Select freight terms"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showFreightTermsDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showFreightTermsDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      {freightTermsOptions
                        .filter(option => 
                          !freightTermsSearchTerm || 
                          option.label.toLowerCase().includes(freightTermsSearchTerm.toLowerCase())
                        )
                        .map((option, index) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              updateField('freightTerms', option.value);
                              setShowFreightTermsDropdown(false);
                              setFreightTermsSearchTerm('');
                              setHighlightedFreightTermsIndex(-1);
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                              formData.freightTerms === option.value ? 'bg-blue-100 text-blue-800' :
                              highlightedFreightTermsIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delivery Period
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={deliveryPeriodSearchTerm || getDeliveryPeriodLabel(formData.deliveryPeriod)}
                    onChange={(e) => {
                      setDeliveryPeriodSearchTerm(e.target.value);
                      if (!showDeliveryPeriodDropdown) setShowDeliveryPeriodDropdown(true);
                      setHighlightedDeliveryPeriodIndex(-1);
                    }}
                    onFocus={() => {
                      setShowDeliveryPeriodDropdown(true);
                      setHighlightedDeliveryPeriodIndex(-1);
                    }}
                    onKeyDown={handleDeliveryPeriodKeyDown}
                    placeholder="Select delivery period"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDeliveryPeriodDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showDeliveryPeriodDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      {deliveryPeriodOptions
                        .filter(option => 
                          !deliveryPeriodSearchTerm || 
                          option.label.toLowerCase().includes(deliveryPeriodSearchTerm.toLowerCase())
                        )
                        .map((option, index) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              updateField('deliveryPeriod', option.value);
                              setShowDeliveryPeriodDropdown(false);
                              setDeliveryPeriodSearchTerm('');
                              setHighlightedDeliveryPeriodIndex(-1);
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                              formData.deliveryPeriod === option.value ? 'bg-blue-100 text-blue-800' :
                              highlightedDeliveryPeriodIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Validity Period
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={validityDaysSearchTerm || getValidityDaysLabel(formData.validityDays)}
                    onChange={(e) => {
                      setValidityDaysSearchTerm(e.target.value);
                      if (!showValidityDaysDropdown) setShowValidityDaysDropdown(true);
                      setHighlightedValidityDaysIndex(-1);
                    }}
                    onFocus={() => {
                      setShowValidityDaysDropdown(true);
                      setHighlightedValidityDaysIndex(-1);
                    }}
                    onKeyDown={handleValidityDaysKeyDown}
                    placeholder="Select validity period"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showValidityDaysDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showValidityDaysDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      {validityDaysOptions
                        .filter(option => 
                          !validityDaysSearchTerm || 
                          option.label.toLowerCase().includes(validityDaysSearchTerm.toLowerCase())
                        )
                        .map((option, index) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              updateField('validityDays', option.value);
                              setShowValidityDaysDropdown(false);
                              setValidityDaysSearchTerm('');
                              setHighlightedValidityDaysIndex(-1);
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${
                              formData.validityDays === option.value ? 'bg-blue-100 text-blue-800' :
                              highlightedValidityDaysIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
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
            {/* </div> */}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {/* Enquiry Information - CRITICAL */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-red-600">📋 Enquiry Information (Critical for Follow-up)</h2>
            {!formData.enquiryDetails?.enquiryNo && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <div className="text-red-600 mr-2">⚠️</div>
                  <div className="text-red-800 font-semibold">
                    Warning: Enquiry Number is missing! This is critical for follow-up tracking and process management.
                  </div>
                </div>
              </div>
            )}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Enquiry Number *
                  </label>
                  <div className="p-2 bg-white border border-gray-300 rounded font-mono text-sm">
                    {formData.enquiryDetails?.enquiryNo || 'Not Available'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Enquiry Date
                  </label>
                  <div className="p-2 bg-white border border-gray-300 rounded text-sm">
                    {formData.enquiryDetails?.enquiryDate || 'Not Available'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Enquiry Type
                  </label>
                  <div className="p-2 bg-white border border-gray-300 rounded text-sm">
                    {formData.enquiryDetails?.enquiryType || 'Not Available'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Enquiry Status
                  </label>
                  <div className="p-2 bg-white border border-gray-300 rounded text-sm">
                    {formData.enquiryDetails?.enquiryStatus || 'Not Available'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Enquiry Stage
                  </label>
                  <div className="p-2 bg-white border border-gray-300 rounded text-sm">
                    {formData.enquiryDetails?.enquiryStage || 'Not Available'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Assigned Employee
                  </label>
                  <div className="p-2 bg-white border border-gray-300 rounded text-sm">
                    {formData.enquiryDetails?.assignedEmployeeName || 'Not Available'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Planned Follow-up Date
                  </label>
                  <div className="p-2 bg-white border border-gray-300 rounded text-sm">
                    {formData.enquiryDetails?.plannedFollowUpDate || 'Not Available'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">
                    Number of Follow-ups
                  </label>
                  <div className="p-2 bg-white border border-gray-300 rounded text-sm">
                    {formData.enquiryDetails?.numberOfFollowUps || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                label="Quotation Number"
                value={formData.quotationNumber}
                onChange={(e) => updateField('quotationNumber', e.target.value)}
                error={errors.quotationNumber}
              />
              <Input
                label="Quotation Date"
                type="date"
                value={formData.issueDate}
                onChange={(e) => updateField('issueDate', e.target.value)}
                error={errors.issueDate}
              />
              <Input
                label="Quotation Validity Date"
                type="date"
                value={formData.validUntil}
                onChange={(e) => updateField('validUntil', e.target.value)}
                error={errors.validUntil}
              />
              <Input
                label="Quotation Revision No."
                value={formData.quotationRevisionNo}
                onChange={(e) => updateField('quotationRevisionNo', e.target.value)}
                error={errors.quotationRevisionNo}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  value={formData.paymentTerms}
                  onChange={(e) => updateField('paymentTerms', e.target.value)}
                  placeholder="Enter payment terms..."
                />
              </div>
            </div>
          </div>

          {/* Location and Customer Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Location and Customer Information</h2>

            {/* Customer and Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Location *
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={locationSearchTerm || getLocationLabel(formData.location || '')}
                    onChange={(e) => {
                      setLocationSearchTerm(e.target.value);
                      if (!showLocationDropdown) setShowLocationDropdown(true);
                      setHighlightedLocationIndex(-1);
                    }}
                    onFocus={() => {
                      setShowLocationDropdown(true);
                      setHighlightedLocationIndex(-1);
                    }}
                    autoComplete="off"
                    onKeyDown={handleLocationKeyDown}
                    placeholder="Search location or press ↓ to open"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
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
                          console.log('Selecting location:', (location as any)._id);
                          setFormData(prev => ({ ...prev, location: (location as any)._id }));
                          setShowLocationDropdown(false);
                          setLocationSearchTerm('');
                          setHighlightedLocationIndex(-1);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.location ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        Select location
                      </button>
                      {Array.isArray(locations) && locations
                        .filter(location =>
                          (location as any).name.toLowerCase().includes(locationSearchTerm.toLowerCase()) ||
                          (location as any).type.toLowerCase().includes(locationSearchTerm.toLowerCase())
                        )
                        .map((location, index) => (
                          <button
                            key={(location as any)._id}
                            onClick={() => {
                              console.log('Selecting location:', (location as any)._id);
                              setFormData(prev => ({ ...prev, location: (location as any)._id }));
                              setShowLocationDropdown(false);
                              setLocationSearchTerm('');
                              setHighlightedLocationIndex(-1);
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.location === (location as any)._id ? 'bg-blue-100 text-blue-800' :
                              highlightedLocationIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <div>
                              <div className="font-medium">{(location as any).name}</div>
                              <div className="text-xs text-gray-500 capitalize">{(location as any).type.replace('_', ' ')}</div>
                            </div>
                          </button>
                        ))}
                      {Array.isArray(locations) && locations.filter(location =>
                        (location as any).name.toLowerCase().includes(locationSearchTerm.toLowerCase()) ||
                        (location as any).type.toLowerCase().includes(locationSearchTerm.toLowerCase())
                      ).length === 0 && locationSearchTerm && (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            No locations found for "{locationSearchTerm}"
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={customerSearchTerm || getCustomerLabel(formData.customer._id || '')}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      if (!showCustomerDropdown) setShowCustomerDropdown(true);
                      setHighlightedCustomerIndex(-1);
                    }}
                    onFocus={() => {
                      setShowCustomerDropdown(true);
                      setHighlightedCustomerIndex(-1);
                    }}
                    onKeyDown={handleCustomerKeyDown}
                    disabled={true}
                    placeholder="Search customer or press ↓ to open"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showCustomerDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showCustomerDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                      </div>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            customer: { _id: '', name: '', email: '', phone: '', pan: '', corporateName: '', address: '', pinCode: '', tehsil: '', district: '' },
                            billToAddress: { address: '', state: '', district: '', pincode: '' },
                            shipToAddress: { address: '', state: '', district: '', pincode: '' }
                          }));
                          setShowCustomerDropdown(false);
                          setCustomerSearchTerm('');
                          setAddresses([]);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.customer._id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        Select customer
                      </button>
                      {customers
                        .filter(customer =>
                          customer.type === 'customer' && (
                            customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                            customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                            customer.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                          )
                        )
                        .map((customer, index) => (
                          <button
                            key={customer._id}
                            onClick={() => {
                              handleCustomerSelect(customer._id);
                              setCustomerSearchTerm('');
                              setHighlightedCustomerIndex(-1);
                              setAddresses(customer.addresses || []);
                            }}
                            className={`w-full px-3 py-2 text-left transition-colors text-sm ${formData.customer._id === customer._id ? 'bg-blue-100 text-blue-800' :
                              highlightedCustomerIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                                'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-gray-500">{customer.email}</div>
                            </div>
                          </button>
                        ))}
                      {customers.filter(customer =>
                        customer.type === 'customer' && (
                          customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                          customer.email?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                          customer.phone?.toLowerCase().includes(customerSearchTerm.toLowerCase())
                        )
                      ).length === 0 && customerSearchTerm && (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            No customers found for "{customerSearchTerm}"
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To and Ship To Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bill To Address *
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={getAddressLabel((formData.billToAddress as any)?.addressId?.toString())}
                    readOnly
                    disabled={!formData.customer._id}
                    onFocus={() => {
                      if (formData.customer._id) {
                        setShowBillToAddressDropdown(true);
                        setHighlightedBillToAddressIndex(-1);
                      }
                    }}
                    onKeyDown={handleBillToAddressKeyDown}
                    placeholder={!formData.customer._id ? "Select customer first" : "Press ↓ to open address list"}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg transition-colors ${!formData.customer._id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showBillToAddressDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showBillToAddressDropdown && formData.customer._id && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                      </div>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            billToAddress: { address: '', state: '', district: '', pincode: '' }
                          }));
                          setShowBillToAddressDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.billToAddress?.address ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        Select bill to address
                      </button>
                      {addresses.map((address, index) => (
                        <button
                          key={address.id}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              billToAddress: {
                                address: address.address,
                                state: address.state,
                                district: address.district,
                                pincode: address.pincode,
                                ...(address.id && { addressId: address.id })
                              }
                            }));
                            setShowBillToAddressDropdown(false);
                            setHighlightedBillToAddressIndex(-1);
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${(formData.billToAddress as any)?.addressId === address.id ? 'bg-blue-100 text-blue-800' :
                            highlightedBillToAddressIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <div>
                            <div className="font-medium">{address.address}</div>
                            <div className="text-xs text-gray-500">{address.district}, {address.pincode}</div>
                            {address.isPrimary && (
                              <div className="text-xs text-blue-600 font-medium">Primary</div>
                            )}
                          </div>
                        </button>
                      ))}
                      {addresses.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          No addresses found for this customer
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ship To Address *
                </label>
                <div className="relative dropdown-container">
                  <input
                    type="text"
                    value={getAddressLabel((formData.shipToAddress as any)?.addressId?.toString())}
                    readOnly
                    disabled={!formData.customer._id}
                    onFocus={() => {
                      if (formData.customer._id) {
                        setShowShipToAddressDropdown(true);
                        setHighlightedShipToAddressIndex(-1);
                      }
                    }}
                    onKeyDown={handleShipToAddressKeyDown}
                    placeholder={!formData.customer._id ? "Select customer first" : "Press ↓ to open address list"}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg transition-colors ${!formData.customer._id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showShipToAddressDropdown ? 'rotate-180' : ''}`} />
                  </div>
                  {showShipToAddressDropdown && formData.customer._id && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-0.5 max-h-60 overflow-y-auto">
                      <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑↓</kbd> Navigate •
                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Enter/Tab</kbd> Select •
                        <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs ml-1">Esc</kbd> Close
                      </div>
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            shipToAddress: { address: '', state: '', district: '', pincode: '' }
                          }));
                          setShowShipToAddressDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.shipToAddress?.address ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        Select ship to address
                      </button>
                      {addresses.map((address, index) => (
                        <button
                          key={address.id}
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              shipToAddress: {
                                address: address.address,
                                state: address.state,
                                district: address.district,
                                pincode: address.pincode,
                                ...(address.id && { addressId: address.id })
                              }
                            }));
                            setShowShipToAddressDropdown(false);
                            setHighlightedShipToAddressIndex(-1);
                          }}
                          className={`w-full px-3 py-2 text-left transition-colors text-sm ${(formData.shipToAddress as any)?.addressId === address.id ? 'bg-blue-100 text-blue-800' :
                            highlightedShipToAddressIndex === index ? 'bg-blue-200 text-blue-900 border-l-4 border-l-blue-600' :
                              'text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                          <div>
                            <div className="font-medium">{address.address}</div>
                            <div className="text-xs text-gray-500">{address.district}, {address.pincode}</div>
                            {address.isPrimary && (
                              <div className="text-xs text-blue-600 font-medium">Primary</div>
                            )}
                          </div>
                        </button>
                      ))}
                      {addresses.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          No addresses found for this customer
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
            
            {formData.customer._id ? (
              // Customer Details Display (Read-only when customer is selected)
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Selected Customer Details</h3>
                  {/* <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        customer: { _id: '', name: '', email: '', phone: '', pan: '', corporateName: '', address: '', pinCode: '', tehsil: '', district: '' },
                        billToAddress: { address: '', state: '', district: '', pincode: '' },
                        shipToAddress: { address: '', state: '', district: '', pincode: '' }
                      }));
                      setAddresses([]);
                    }}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Change Customer
                  </Button> */}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">Basic Information</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Customer Name</label>
                        <div className="p-3 bg-white border border-gray-300 rounded-md text-gray-900 font-medium">
                          {formData.customer.name}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Email (Optional)</label>
                        <div className="p-3 bg-white border border-gray-300 rounded-md text-gray-900">
                          {formData.customer.email || 'Not provided'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Phone</label>
                        <div className="p-3 bg-white border border-gray-300 rounded-md text-gray-900">
                          {formData.customer.phone || 'Not provided'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">PAN Number</label>
                        <div className="p-3 bg-white border border-gray-300 rounded-md text-gray-900">
                          {formData.customer.pan || 'Not provided'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bill To and Ship To Addresses Display */}
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 border-b border-gray-200 pb-2">Address Information</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Bill To Address</label>
                        <div className="p-3 bg-white border border-gray-300 rounded-md text-gray-900">
                          {formData.billToAddress?.address ? (
                            <div>
                              <div className="font-medium">{formData.billToAddress.address}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {formData.billToAddress.district}, {formData.billToAddress.state} - {formData.billToAddress.pincode}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">No bill to address selected</span>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-2">Ship To Address</label>
                        <div className="p-3 bg-white border border-gray-300 rounded-md text-gray-900">
                          {formData.shipToAddress?.address ? (
                            <div>
                              <div className="font-medium">{formData.shipToAddress.address}</div>
                              <div className="text-sm text-gray-600 mt-1">
                                {formData.shipToAddress.district}, {formData.shipToAddress.state} - {formData.shipToAddress.pincode}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic">No ship to address selected</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Customer Details Form (Editable when no customer is selected)
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <div className="text-yellow-600 mr-2">⚠️</div>
                  <div className="text-yellow-800 font-semibold">
                    Please select a customer from the dropdown above to auto-fill customer details
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Customer Name"
                    value={formData.customer.name}
                    onChange={(e) => updateField('customer.name', e.target.value)}
                    error={errors['customer.name']}
                  />
                  <Input
                    label="Email (Optional)"
                    type="email"
                    value={formData.customer.email}
                    onChange={(e) => updateField('customer.email', e.target.value)}
                    error={errors['customer.email']}
                  />
                  <Input
                    label="Phone"
                    value={formData.customer.phone}
                    onChange={(e) => updateField('customer.phone', e.target.value)}
                    error={errors['customer.phone']}
                  />
                  <Input
                    label="PAN Number"
                    value={formData.customer.pan}
                    onChange={(e) => updateField('customer.pan', e.target.value)}
                  />
                  <Input
                    label="Corporate Name"
                    value={formData.customer.corporateName}
                    onChange={(e) => updateField('customer.corporateName', e.target.value)}
                  />
                  <Input
                    label="Address"
                    value={formData.customer.address}
                    onChange={(e) => updateField('customer.address', e.target.value)}
                  />
                  <Input
                    label="PIN Code"
                    value={formData.customer.pinCode}
                    onChange={(e) => updateField('customer.pinCode', e.target.value)}
                  />
                  <Input
                    label="District"
                    value={formData.customer.district}
                    onChange={(e) => updateField('customer.district', e.target.value)}
                  />
                  <Input
                    label="Tehsil"
                    value={formData.customer.tehsil}
                    onChange={(e) => updateField('customer.tehsil', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* DG Specifications */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">DG Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="KVA Rating"
                value={formData.dgSpecifications.kva}
                onChange={(e) => updateField('dgSpecifications.kva', e.target.value)}
                disabled={true}
              />
              <Select
                label="Phase"
                value={formData.dgSpecifications.phase}
                onChange={(e) => updateField('dgSpecifications.phase', e.target.value)}
                options={[
                  { value: '1', label: '1 Phase' },
                  { value: '3', label: '3 Phase' }
                ]}
                disabled={true}
              />
              <Input
                label="Quantity"
                type="number"
                value={formData.dgSpecifications.quantity}
                onChange={(e) => updateField('dgSpecifications.quantity', parseInt(e.target.value))}
                disabled={true}
              />
              <Input
                label="Segment"
                value={formData.dgSpecifications.segment}
                onChange={(e) => updateField('dgSpecifications.segment', e.target.value)}
                disabled={true}
              />
              <Input
                label="Sub Segment"
                value={formData.dgSpecifications.subSegment}
                onChange={(e) => updateField('dgSpecifications.subSegment', e.target.value)}
                disabled={true}
              />
              <Input
                label="DG Ownership"
                value={formData.dgSpecifications.dgOwnership}
                onChange={(e) => updateField('dgSpecifications.dgOwnership', e.target.value)}
                disabled={true}
              />
            </div>
            
            
          </div>

          {/* Items */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Items</h2>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setShowDgProductSelector(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add DG Product
                </Button>
                <Button variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left font-semibold">Sr. No.</th>
                    <th className="border border-gray-300 p-3 text-left font-semibold">Product Description</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">Quantity</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">Basic Unit Price (INR)</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">Net Taxable Amt (INR)</th>
                    <th className="border border-gray-300 p-3 text-center font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-3 text-center">{index + 1}</td>
                      <td className="border border-gray-300 p-3">
                        <div className="relative product-description-dropdown">
                          <textarea
                            value={item.description}
                            onChange={(e) => {
                              updateItem(index, 'description', e.target.value);
                              setProductDescriptionSearchTerm(prev => ({ ...prev, [index]: e.target.value }));
                              if (!showProductDescriptionDropdown[index]) {
                                setShowProductDescriptionDropdown(prev => ({ ...prev, [index]: true }));
                              }
                            }}
                            onFocus={() => {
                              setShowProductDescriptionDropdown(prev => ({ ...prev, [index]: true }));
                            }}
                            className="w-full border-none resize-none focus:outline-none bg-transparent"
                            rows={3}
                            placeholder="Product description"
                          />

                          {showProductDescriptionDropdown[index] && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
                              <div className="p-2 border-b border-gray-200">
                                <input
                                  type="text"
                                  placeholder="Search DG products..."
                                  value={productDescriptionSearchTerm[index] || ''}
                                  onChange={(e) => setProductDescriptionSearchTerm(prev => ({ ...prev, [index]: e.target.value }))}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  autoFocus
                                />
                              </div>
                              <div className="py-1">
                                {getFilteredDGProductsForDescription(productDescriptionSearchTerm[index] || '').length === 0 ? (
                                  <div className="px-3 py-2 text-sm text-gray-500">No DG products found</div>
                                ) : (
                                  getFilteredDGProductsForDescription(productDescriptionSearchTerm[index] || '').map(product => (
                                    <button
                                      key={product._id}
                                      onClick={() => handleProductDescriptionSelect(index, product)}
                                      className="w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="font-medium text-gray-900">
                                        {product.kva} KVA {product.phase === 'single' ? '1P' : '3P'} - {product.dgModel}
                                      </div>
                                      <div className="text-xs text-gray-600 truncate">
                                        {product.description || `Supply of ${product.kva} kVA ${product.phase === 'single' ? '1 phase' : '3 phase'}, Mahindra CPCB IV+ compliant...`}
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full text-center border-none focus:outline-none bg-transparent"
                          min="0"
                          step="1"
                        />
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        <input
                          type="number"
                          value={item.unitPrice || ''}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            updateItem(index, 'unitPrice', value);
                          }}
                          className="w-full text-center border-none focus:outline-none bg-transparent"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="border border-gray-300 p-3 text-center font-medium">
                        ₹{item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="border border-gray-300 p-3 text-center">
                        {formData.items.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-200"
                            disabled={formData.items.length === 1}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Tax Row */}
                  <tr>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3 text-center font-semibold" colSpan={2}>
                      CGST/SGST/IGST ({formData.taxRate || '18'}%)
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-medium">
                      ₹{formData.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* Sub Total Row */}
                  <tr>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3"></td>
                    <td className="border border-gray-300 p-3 text-center font-semibold" colSpan={2}>
                      Sub Total (In Rupees)
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold">
                      ₹{formData.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Grand Total Section */}
            <div className="mt-4">
              <table className="w-full border border-gray-300">
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>
                      Grand Total (In Rupees)
                    </td>
                    <td className="border border-gray-300 p-3 text-center font-bold" colSpan={2}>
                      ₹{formData.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3 font-semibold" colSpan={3}>
                      Grand Total In Words
                    </td>
                    <td className="border border-gray-300 p-3 text-center" colSpan={2}>
                      <input
                        type="text"
                        value={formData.grandTotalInWords || ''}
                        onChange={(e) => updateField('grandTotalInWords', e.target.value)}
                        className="w-full text-center border-none focus:outline-none bg-transparent"
                        placeholder="Enter amount in words"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Follow-up Tracking */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4 text-blue-600">📞 Follow-up Tracking</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Next Follow-up Date
                  </label>
                  <Input
                    type="date"
                    value={formData.enquiryDetails?.plannedFollowUpDate || ''}
                    onChange={(e) => updateField('enquiryDetails.plannedFollowUpDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Follow-up Count
                  </label>
                  <div className="p-2 bg-white border border-gray-300 rounded text-sm">
                    {formData.enquiryDetails?.numberOfFollowUps || 0} follow-ups completed
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Employee
                  </label>
                  <div className="p-2 bg-white border border-gray-300 rounded text-sm">
                    {formData.enquiryDetails?.assignedEmployeeName || 'Not Assigned'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Terms and Notes */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Terms and Notes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={8}
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={8}
                  value={formData.terms}
                  onChange={(e) => updateField('terms', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>



        {/* DG Product Selector Modal */}
        {showDgProductSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Select DG Product
                </h2>
                <button
                  onClick={() => setShowDgProductSelector(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4 flex justify-between items-center">
                  <Input
                    label="Search DG Products"
                    placeholder="Search by KVA, phase, model..."
                    value={dgProductSearchTerm}
                    onChange={(e) => setDgProductSearchTerm(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      addItem();
                      setShowDgProductSelector(false);
                    }}
                    className="ml-4"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manual Item
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 p-2 text-left">S.NO</th>
                        <th className="border border-gray-300 p-2 text-left">SUBJECT</th>
                        <th className="border border-gray-300 p-2 text-left">ANNEXURE RATING</th>
                        <th className="border border-gray-300 p-2 text-center">KVA</th>
                        <th className="border border-gray-300 p-2 text-center">PHASE</th>
                        <th className="border border-gray-300 p-2 text-left">MODEL & CYLINDER</th>
                        <th className="border border-gray-300 p-2 text-left">PRODUCT DESCRIPTION</th>
                        <th className="border border-gray-300 p-2 text-center">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dgProducts
                        .filter(product =>
                          !dgProductSearchTerm ||
                          product.kva?.toLowerCase().includes(dgProductSearchTerm.toLowerCase()) ||
                          product.phase?.toLowerCase().includes(dgProductSearchTerm.toLowerCase()) ||
                          product.dgModel?.toLowerCase().includes(dgProductSearchTerm.toLowerCase()) ||
                          product.subject?.toLowerCase().includes(dgProductSearchTerm.toLowerCase())
                        )
                        .map((product, index) => (
                          <tr key={product._id} className="hover:bg-gray-50">
                            <td className="border border-gray-300 p-2 text-center">
                              {index + 1}
                            </td>
                            <td className="border border-gray-300 p-2">
                              <div className="text-sm text-gray-900 font-medium leading-tight">
                                Offer for the Supply of {product.kva} kVA ({product.phase === 'single' ? '1P' : '3P'}) Genset confirming to latest CPCB IV+ emission norms.
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2">
                              <div className="text-sm text-gray-900 font-medium leading-tight">
                                {product.kva} Kva ({product.phase === 'single' ? '1P' : '3P'})
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              <div className="text-sm text-gray-900 font-medium">
                                {product.kva}
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              <div className="text-sm text-gray-900 font-medium">
                                {product.phase === 'single' ? '1P' : '3P'}
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2">
                              <div className="text-sm text-gray-900 font-medium leading-tight">
                                {product.dgModel} & CYL-{product.numberOfCylinders}
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2">
                              <div className="text-sm text-gray-900 leading-tight max-w-xs">
                                {product.description || `Supply of ${product.kva} kVA ${product.phase === 'single' ? '1 phase' : '3 phase'}, Mahindra CPCB IV+ compliant, Prime Rated, radiator cooled, powered by Mahindra engine, electronic ${product.numberOfCylinders} cylinder engine, model ${product.dgModel}, coupled with ${product.kva} KVA alternator, Standard control panel with ASAS Controller with battery charger, Silencer, Anti-Vibration mountings, exhaust flexible connector, Batteries with cables, fuel tank.`}
                              </div>
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              <Button
                                size="sm"
                                onClick={() => addDGProduct(product)}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                Add to Quotation
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Technical Specification Modal */}
        {showTechnicalSpec && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Technical Specification
                </h2>
                <button
                  onClick={() => setShowTechnicalSpec(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <DGTechnicalSpecification
                  kva={formData.dgSpecifications.kva}
                  phase={formData.dgSpecifications.phase}
                  engineModel=""
                  alternatorModel=""
                  emissionCompliance=""
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DGQuotationForm; 