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
  // Sales Engineer assignment
  salesEngineer?: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
    salesEmployeeCode: string;
  };
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
    gstNumber?: string;
    addressId?: number;
  };
  shipToAddress?: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    gstNumber?: string;
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
    billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
    shipToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
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
  
  // Address search terms
  const [billToAddressSearchTerm, setBillToAddressSearchTerm] = useState('');
  const [shipToAddressSearchTerm, setShipToAddressSearchTerm] = useState('');
  
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

  // Sales Engineer dropdown states
  const [salesEngineers, setSalesEngineers] = useState<any[]>([]);
  const [showSalesEngineerDropdown, setShowSalesEngineerDropdown] = useState(false);
  const [salesEngineerSearchTerm, setSalesEngineerSearchTerm] = useState('');
  const [highlightedSalesEngineerIndex, setHighlightedSalesEngineerIndex] = useState(-1);

  useEffect(() => {
    generateQuotationNumber();
    fetchDGProducts();
    fetchLocations();
    fetchCustomers();
    fetchSalesEngineers();
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
      // Use non-paginated API to fetch all customers for dropdown
      const response = await apiClient.customers.getAllForDropdown({ type: 'customer' });
      let customersData: any[] = [];

      if (response.success && response.data && Array.isArray(response.data)) {
        customersData = response.data;
      } else if (response.success && response.data) {
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

  const fetchSalesEngineers = async () => {
    try {
      const response = await apiClient.users.getSalesEngineers();
      if (response.success && response.data && response.data.salesEngineers) {
        console.log('Fetched sales engineers:', response.data.salesEngineers);
        setSalesEngineers(response.data.salesEngineers);
      } else {
        console.log('No sales engineers found or invalid response format');
        setSalesEngineers([]);
      }
    } catch (error) {
      console.error('Failed to fetch sales engineers:', error);
      setSalesEngineers([]);
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
          product: dgProduct._id,
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
    updateItem(itemIndex, 'product', dgProduct._id);
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

  const handleSalesEngineerKeyDown = (e: React.KeyboardEvent) => {
    if (!Array.isArray(salesEngineers)) return;

    const filteredSalesEngineers = salesEngineers.filter(engineer =>
      engineer.fullName.toLowerCase().includes(salesEngineerSearchTerm.toLowerCase()) ||
      engineer.email?.toLowerCase().includes(salesEngineerSearchTerm.toLowerCase()) ||
      engineer.salesEmployeeCode?.toLowerCase().includes(salesEngineerSearchTerm.toLowerCase())
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedSalesEngineerIndex(prev =>
        prev < filteredSalesEngineers.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedSalesEngineerIndex(prev =>
        prev > 0 ? prev - 1 : filteredSalesEngineers.length - 1
      );
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      if (highlightedSalesEngineerIndex >= 0) {
        const salesEngineer = filteredSalesEngineers[highlightedSalesEngineerIndex];
        handleSalesEngineerSelect(salesEngineer._id);
        setSalesEngineerSearchTerm('');
        setHighlightedSalesEngineerIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowSalesEngineerDropdown(false);
      setHighlightedSalesEngineerIndex(-1);
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
            gstNumber: address.gstNumber || '',
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
            gstNumber: address.gstNumber || '',
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
        billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
        shipToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
      }));
      setShowCustomerDropdown(false);
      setAddresses(customer.addresses || []);
    }
  };

  const handleSalesEngineerSelect = (salesEngineerId: string) => {
    const salesEngineer = salesEngineers.find(se => se._id === salesEngineerId);
    if (salesEngineer) {
      setFormData(prev => ({
        ...prev,
        salesEngineer: {
          _id: salesEngineer._id,
          firstName: salesEngineer.firstName,
          lastName: salesEngineer.lastName,
          fullName: salesEngineer.fullName,
          email: salesEngineer.email,
          phone: salesEngineer.phone,
          salesEmployeeCode: salesEngineer.salesEmployeeCode
        }
      }));
      setShowSalesEngineerDropdown(false);
      setSalesEngineerSearchTerm('');
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
      <div className="bg-white p-8 max-w-4xl mx-auto shadow-lg" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header with Logos */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center">
            <div className="text-red-600 font-bold text-3xl italic" style={{ color: '#dc2626' }}>powerol</div>
            <div className="text-sm text-gray-600 ml-2">by Mahindra</div>
          </div>
          <div className="text-right">
            <div className="text-red-600 font-bold text-xl italic flex items-center" style={{ color: '#dc2626' }}>
              <span className="mr-2">☀️</span>Sun Power Services
            </div>
          </div>
        </div>

        <div className="border-t-2 border-red-600 mb-6" style={{ borderColor: '#dc2626' }}></div>

        {/* Enquiry/Quotation Header */}
        <div className="mb-6">
          <div className="text-sm mb-2">
            <span className="font-semibold">Enquiry No:</span> {formData.enquiryDetails?.enquiryNo || 'Drop Down'} 
            {/* <span className="text-xs text-gray-500 ml-2">(Able to search either customer name or the Enquiry number)</span> */}
          </div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm">
              <span className="font-semibold">Ref:</span> {formData.quotationNumber || 'SPS / 0001 / 25-26'}
            </div>
            <div className="text-sm">
              <span className="font-semibold">Date:</span> {formData.issueDate || '03-July-2025'}
            </div>
          </div>
        </div>

        {/* Recipient Details */}
        <div className="mb-6">
          <div className="text-sm font-semibold mb-2">To,</div>
          <div className="text-sm mb-1">{formData.customer.name || 'M/s. Enpar Heater'}</div>
          <div className="text-sm mb-1">{formData?.shipToAddress?.address + ', ' + formData?.shipToAddress?.district + ', ' + formData?.shipToAddress?.state + ' - ' + formData?.shipToAddress?.pincode + (formData?.shipToAddress?.gstNumber ? ' GST: ' + formData?.shipToAddress?.gstNumber : '')}</div>
          {/* {formData.salesEngineer && (
            <div className="text-sm mb-2">
              <span className="font-semibold">Sales Engineer:</span> {formData.salesEngineer.fullName} 
              <span className="text-gray-600 ml-2">({formData.salesEngineer.salesEmployeeCode})</span>
            </div>
          )} */}
          <div className="text-sm mb-4">Dear Sir,</div>
          <div className="text-sm mb-2">
            <span className="font-semibold">Subject:</span> {formData.subject || 'Drop Down-A'}
          </div>
        </div>

        {/* Introduction Text */}
        <div className="text-sm leading-relaxed mb-6">
          <p className="mb-3">
            We thank you very much for the interest shown in Mahindra Powerol Genset.
          </p>
          <p className="mb-3">
            Mahindra Powerol offers end to end solution for your back power requirements from 5 kVA to 625 kVA gensets in single configuration and up-to 4000 kVA in multiple configurations.
          </p>
          <p className="mb-3">
            Mahindra Powerol is the only Indian Industrial Engine manufacturer to win the prestigious JQM & DEMING AWARD. All Mahindra Engines meet the stringent CPCB IV+ norms for Noise and Exhaust Emission.
          </p>
          <p className="mb-3">
            Mahindra engines are manufactured at our facilities in Chakan, Pune and Nagpur with fully automated, controlled environment engine assembly and Quality control systems.
          </p>
          <p className="mb-3">
            More than 4,00,000 Mahindra Powerol gensets are powering diversified segments like Engineering, Realty, Retail, IT, Telecom, BFSI, Manufacturing, Pharma, Textile, Oil & Gas, DGSND.
          </p>
          <p className="mb-3">
            It will be our pleasure to serve you. Thanking you and assuring you of our prompt attention at all times.
          </p>
        </div>

        {/* Services Section */}
        <div className="mb-6">
          <div className="text-sm mb-3">
            We, Dealer / GOEM name are the leading authorized channel partner of Mahindra Powerol.
          </div>
          <div className="text-sm mb-3">
            We offer end to end power solutions to our valued customers that include:
          </div>
          <div className="text-sm ml-4 mb-3">
            <div className="mb-1">1. Pre-sales consultation on power requirement and genset selection.</div>
            <div className="mb-1">2. Delivery, Installation and commissioning at the site</div>
            <div className="mb-1">3. Assistance in fulfilling statutory formalities</div>
            <div className="mb-1">4. Onsite training for operation & maintenance.</div>
          </div>
          <div className="text-sm mb-3">
            We also undertake supply of multiple gensets in synchronization and turnkey projects for higher power requirements. We offer need specific customized control panels for operating Gensets in AMF, synchronizing, grid power synchronizing and distribution.
          </div>
          <div className="text-sm mb-3">
            We are pleased to enclose herewith our detailed Techno - Commercial offer with following annexures.
          </div>
          <div className="text-sm ml-4 mb-3">
            <div className="mb-1">Annexure A: Technical specifications</div>
            <div className="mb-1">Annexure B: Commercial terms and conditions</div>
          </div>
          <div className="text-sm mb-3">
            We trust you would find the same in line with your requirement and welcome any clarification sought pertaining to the subject. We look forward to establish a long term business association with you and await your favourable response.
          </div>
          <div className="text-sm">
            Thanking you and assuring you of our best attention at all times
          </div>
        </div>

        {/* Salient Features */}
        <div className="mb-6">
          <div className="text-center font-bold text-lg mb-4 underline">Salient Features of MAHINDRA POWEROL Silent Genset</div>
          <div className="text-sm space-y-1">
            <div>• Compact size with Manual/Automatic starting system. IoT Remote Monitoring System will be provided as standard feature.</div>
            <div>• Sound Proof, Weather Proof enclosure.</div>
            <div>• Low vibration, best in class fuel consumption with electronic fuel injection system.</div>
            <div>• Class G3 Governing in its range, which gives better accuracy in decreasing the speed drop in transient and lowering the recovery time of the speed.</div>
            <div>• Low cost of service & spares.</div>
            <div>• Low operation cost.</div>
            <div>• Confirms to statutory Govt. CPCBIV+ emission & noise level norms.</div>
            <div>• The Enclosure is of modular construction with the provision to assemble and dismantle easily.</div>
            <div>• The sheet metal components are <strong>9 tanks pre-treated</strong> and is <strong>Polyester based powder coated (inside as well as outside)</strong> for long life.</div>
            <div>• All <strong>Nuts-bolts, hardware are of Stainless Steel</strong> for longer life.</div>
            <div>• Battery is provided in a tray inside the enclosure.</div>
            <div>• Doors are gasketed with high quality EPDN gaskets to avoid leakage of sound.</div>
            <div>• <strong>Optimised EATS (Exhaust After Treatment System) is provided to control exhaust noise & emission.</strong></div>
            <div>• Specially designed sound attenuators are provided to control sound at air entry & exit points inside the enclosure.</div>
            <div>• To make the system vibration free, engine and alternator are mounted on specially designed anti-vibration pads mounted on base frame.</div>
            <div>• The enclosure is designed and layout of the equipment is such that there is easy access to all serviceable parts.</div>
            <div>• Adequate ventilation is provided to meet air requirement for combustion & heat removal.</div>
            <div>• Fluid drains for lube oil and fuel.</div>
          </div>
          
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">The silent DG set comes with following safety features:</div>
            <div className="text-sm space-y-1">
              <div>• High water temperature</div>
              <div>• Low lube oil pressure</div>
              <div>• Emergency stop push button outside the enclosure.</div>
              <div>• EGR</div>
              <div>• Cold Start feature (Optional)</div>
              <div>• Specially designed Standard Control Panel is mounted inside enclosure itself.</div>
              <div>• In-built draw in type fuel tank of suitable capacity.</div>
              <div>• With UV resistant powder coating, can withstand extreme environments.</div>
              <div>• The walls of the enclosure are insulated with the fire-retardant & noise absorbent foam/rockwool so as to comply with the noise level of 75 dB(A) at distance of 1 mtr. in open free field environment as per ISO 8528 part 10 specified by ministry of Environment & Forest.</div>
            </div>
          </div>
        </div>

        {/* Technical Specifications */}
        <div className="mb-6">
          <div className="text-center font-bold text-lg mb-4">TECHNICAL SPECIFICATIONS OF MAHINDRA POWEROL DIESEL GENERATING SET</div>
          
          <div className="mb-4">
            <div className="text-sm font-bold mb-2">DIESEL ENGINE:</div>
            <div className="text-sm mb-2">
              Mahindra Engine Model: {formData.dgSpecifications.kva || '300'} KVA CPCB II, 6 Cylinder, liquid cooled, Turbocharged aftercooled, 1500 RPM, rotary, compression ignition, 4 stroke, 2500 Hrs continuous run, CPCB IV+ norms.
            </div>
            <div className="text-sm space-y-1">
              <div>• Radiator with Fan</div>
              <div>• Electric starter motor</div>
              <div>• Oil as per IS 1368/Part II class governor</div>
              <div>• Battery charging alternator</div>
              <div>• Dry type air cleaner</div>
              <div>• CRDI System</div>
              <div>• Lube Oil & fuel filter</div>
              <div>• COC, MR</div>
              <div>• Fuel tank</div>
              <div>• Inbuilt drain trays for fuel and lube oil, coolant/oil area</div>
              <div>• Robust & corrosion resistant enclosure</div>
              <div>• Insulated walls</div>
              <div>• IoT/Remote Monitoring System</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-bold mb-2">ALTERNATOR:</div>
            <div className="text-sm">
              Mahindra Alternator: 2500 rpm, 415V, 3 phase, 50Hz, 0.8 PF, self excited, self regulated, Brushless, floor mounted, conforms to IS 4722/IEC 60034-1, suitable for tropical conditions.
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-bold mb-2">ACOUSTIC ENCLOSURE:</div>
            <div className="text-sm space-y-1">
              <div>• Modular construction, easily dismantled</div>
              <div>• 7 tank pre treated, polyester powder coated sheet metal</div>
              <div>• Specially designed sound attenuators</div>
              <div>• In-built drain trays</div>
              <div>• Insulated walls with fire retardant & noise absorbers</div>
              <div>• Designed for 75dB(A) noise level compliance and certified by Ministry of Environment & Forests</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-sm font-bold mb-2">CONTROL PANEL:</div>
            <div className="text-sm mb-2">
              14/16 gauge CRCA sheet, powder coated, Microprocessor based genset controller, MCCB, Key Switch, Push Button, LED indicators, Current Transformer, Instrument Fuses, basic safeties and protections.
            </div>
            <div className="text-sm">Contact our consultants for more details.</div>
          </div>
        </div>

        {/* Commercial Terms - Annexure B */}
        <div className="mb-6">
          <div className="text-center font-bold text-lg mb-4">ANNEXURE B</div>
          
          <div className="mb-4">
            <div className="text-sm font-bold mb-2">Commercial Terms:</div>
            <table className="w-full border border-gray-300 text-sm">
              <tbody>
                <tr><td className="border border-gray-300 p-2 font-semibold">Quotation No.</td><td className="border border-gray-300 p-2">{formData.quotationNumber || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Issue Date</td><td className="border border-gray-300 p-2">{formData.issueDate || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Valid Until</td><td className="border border-gray-300 p-2">{formData.validUntil || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Quotation Revision No.</td><td className="border border-gray-300 p-2">{formData.quotationRevisionNo || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">DG Enquiry No.</td><td className="border border-gray-300 p-2">{formData.enquiryDetails?.enquiryNo || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Subject</td><td className="border border-gray-300 p-2">{formData.subject || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Annexure Rating</td><td className="border border-gray-300 p-2">{formData.annexureRating || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">DG Model</td><td className="border border-gray-300 p-2">{formData.dgModel || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Cylinder</td><td className="border border-gray-300 p-2">{formData.cylinder || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Warranty From Invoice</td><td className="border border-gray-300 p-2">{formData.warrantyFromInvoice || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Warranty From Commissioning</td><td className="border border-gray-300 p-2">{formData.warrantyFromCommissioning || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Warranty Hours</td><td className="border border-gray-300 p-2">{formData.warrantyHours || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Tax Rate</td><td className="border border-gray-300 p-2">{formData.taxRate || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Freight Terms</td><td className="border border-gray-300 p-2">{formData.freightTerms || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Delivery Period</td><td className="border border-gray-300 p-2">{formData.deliveryPeriod || 'Internal Entry'}</td></tr>
                <tr><td className="border border-gray-300 p-2 font-semibold">Validity Days</td><td className="border border-gray-300 p-2">{formData.validityDays || 'Internal Entry'}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="mb-4">
            <div className="text-sm font-bold mb-2">Product Details:</div>
            <table className="w-full border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Sr. No.</th>
                  <th className="border border-gray-300 p-2 text-left">Product Description</th>
                  <th className="border border-gray-300 p-2 text-center">Quantity</th>
                  <th className="border border-gray-300 p-2 text-right">Unit Rate (INR)</th>
                  <th className="border border-gray-300 p-2 text-right">Total (INR)</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{index + 1}</td>
                  <td className="border border-gray-300 p-2">{item.description}</td>
                  <td className="border border-gray-300 p-2 text-center">{item.quantity}</td>
                    <td className="border border-gray-300 p-2 text-right">₹{item.unitPrice.toLocaleString()}</td>
                    <td className="border border-gray-300 p-2 text-right">₹{item.totalPrice.toLocaleString()}</td>
                </tr>
              ))}
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold" colSpan={4}>Subtotal</td>
                  <td className="border border-gray-300 p-2 text-right font-semibold">₹{formData.subtotal.toLocaleString()}</td>
                  </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold" colSpan={4}>Discount</td>
                  <td className="border border-gray-300 p-2 text-right font-semibold">₹{formData.totalDiscount.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold" colSpan={4}>Tax</td>
                  <td className="border border-gray-300 p-2 text-right font-semibold">₹{formData.totalTax.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2 font-semibold" colSpan={4}>Grand Total</td>
                  <td className="border border-gray-300 p-2 text-right font-semibold">₹{formData.grandTotal.toLocaleString()}</td>
                </tr>
            </tbody>
          </table>
          </div>
        </div>

        {/* Warranty Policy */}
        <div className="mb-6">
          <div className="text-sm font-bold mb-2">WARRANTY POLICY:</div>
          <div className="text-sm mb-3">
            `Warranty period: {formData.warrantyFromInvoice} months from date of invoice OR {formData.warrantyFromCommissioning} months from Date of commissioning OR {formData.warrantyHours} Hours of operation whichever is earlier. Warranty for electrical/proprietary items as per manufacturer's standard clause. Warranty does not cover normal wear and tear, accident, wrong handling, improper maintenance.`
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="mb-6">
          <div className="text-sm font-bold mb-2">TERMS & CONDITIONS:</div>
          <div className="text-sm space-y-2">
            <div><span className="font-semibold">Taxes:</span> Prices are inclusive of GST @{formData.taxRate || '18'}%.</div>
            <div><span className="font-semibold">Freight:</span> Prices are Exclusive of freight charges - Separately mentioned {formData.freightTerms || 'Extra'}.</div>
            <div><span className="font-semibold">Transit Insurance:</span> Extra at actuals.</div>
            <div><span className="font-semibold">Approvals:</span> Approval from concern authorities shall be by customers account.</div>
            <div><span className="font-semibold">Delivery:</span> Ex-stock subject to prior sale. {formData.deliveryPeriod || '2-3 weeks'} from the date of receipt of your confirmed order/advance payment. We shall not be responsible for any delay due to force majeure conditions.</div>
            <div><span className="font-semibold">Validity:</span> Our offer shall remain valid for a period of {formData.validityDays || '30'} Days from the date of our offer and subject to your confirmation/amendment.</div>
            <div><span className="font-semibold">Scope of Supply:</span> Our offer is confined to the stipulated technical and commercial clauses and subject to mutual agreement.</div>
          </div>
        </div>

        {/* Exclusions */}
        <div className="mb-6">
          <div className="text-sm font-bold mb-2">EXCLUSIONS:</div>
          <div className="text-sm">
            Installation/job work, unloading, earthing pits, DG room, foundation, cabling, exhaust piping, manual changeover switch, etc. will be charged extra.
          </div>
        </div>

        {/* Arbitration */}
        <div className="mb-6">
          <div className="text-sm font-bold mb-2">ARBITRATION:</div>
          <div className="text-sm">
            Any dispute arising out of or in connection with this contract shall be settled by arbitration in accordance with the Arbitration and Conciliation Act 1996. The arbitration shall be conducted by a single arbitrator appointed by mutual consent. The venue of arbitration shall be at Chennai and the language of arbitration shall be English.
          </div>
        </div>

        {/* Signature */}
        <div className="mt-8">
          <div className="text-sm mb-2">Yours Truly,</div>
          <div className="text-sm font-semibold mb-1">For SUN POWER SERVICES</div>
          <div className="text-sm mb-1">Name: {formData.salesEngineer?.firstName + ' ' + formData.salesEngineer?.lastName || '________________'}</div>
          <div className="text-sm mb-1">Role:  Sales Engineer</div>
          <div className="text-sm mb-1">Mobile: {formData.salesEngineer?.phone || formData.company.phone || '________________'}</div>
          <div className="text-sm">Email: {formData.salesEngineer?.email || formData.company.email || '________________'}</div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-red-600">
          <div className="text-sm font-bold mb-2">AUTHORISED DEALER OF SALES AND SERVICE FOR MAHINDRA DIESEL GENERATORS</div>
          <div className="text-sm mb-1">Door No. 53, Plot No. 4, 4th Street, Phase-1Extension, Vivekakonni Nagar, Chennai - 600 116.</div>
          <div className="text-sm mb-1">Phone: 044 2482 8218</div>
          <div className="text-sm">E-mail: sunpowerservices@gmail.com Web: www.sunpowerservices.in</div>
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
              gstNumber: primaryAddress.gstNumber || '',
              ...(primaryAddress.id && { addressId: primaryAddress.id })
            },
            shipToAddress: {
              address: primaryAddress.address,
              state: primaryAddress.state,
              district: primaryAddress.district,
              pincode: primaryAddress.pincode,
              gstNumber: primaryAddress.gstNumber || '',
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
                  onClick={async () => await downloadDGQuotationPDF(convertToDGQuotationData(formData))}
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
          <div className="flex justify-center mt-8">
            <Button
              onClick={async () => await downloadDGQuotationPDF(convertToDGQuotationData(formData))}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Fixed Information Message at Top */}
      {/* <div className="bg-blue-50 border-b border-blue-200 sticky top-0 z-10">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                DG Quotation Creation
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>
                  You are creating a quotation for a <strong>converted customer</strong>. 
                  This quotation will be based on the enquiry details and can be sent to the customer for approval.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div> */}

      <div className="bg-white shadow-sm border-b border-blue-200 sticky top-0 z-10">
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
                  {/* <Badge variant="info">
                    From Enquiry: {enquiry.customerName}
                  </Badge> */}
                  {formData.enquiryDetails?.enquiryNo && (
                    <Badge variant="warning">
                      Enquiry: {formData.enquiryDetails.enquiryNo}
                    </Badge>
                  )}
                  {/* {formData.enquiryDetails?.enquiryStatus && (
                    <Badge variant={
                      formData.enquiryDetails.enquiryStatus === 'Active' ? 'success' :
                        formData.enquiryDetails.enquiryStatus === 'Pending' ? 'warning' :
                          formData.enquiryDetails.enquiryStatus === 'Closed' ? 'danger' : 'info'
                    }>
                      {formData.enquiryDetails.enquiryStatus}
                    </Badge>
                  )} */}
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
                onClick={async () => await downloadDGQuotationPDF(convertToDGQuotationData(formData))}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              {/* <Button
                variant="outline"
                onClick={() => setShowTechnicalSpec(true)}
              >
                Technical Spec
              </Button> */}
              {/* <Button
                variant="outline"
                onClick={async () => await downloadDGQuotationPDF(convertToDGQuotationData(formData))}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button> */}
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
                  value={subjectSearchTerm || (formData.subject ? getSubjectLabel(formData.subject) : '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSubjectSearchTerm(value);
                    
                    // If input is cleared, clear the subject selection
                    if (!value) {
                      setFormData(prev => ({ ...prev, subject: '' }));
                    }
                    
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
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.subject && !subjectSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, subject: '' }));
                        setSubjectSearchTerm('');
                      }}
                      className="text-gray-400 hover:text-gray-600 mr-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
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
                  value={annexureRatingSearchTerm || (formData.annexureRating ? getAnnexureRatingLabel(formData.annexureRating) : '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAnnexureRatingSearchTerm(value);
                    
                    // If input is cleared, clear the annexure rating selection
                    if (!value) {
                      setFormData(prev => ({ ...prev, annexureRating: '' }));
                    }
                    
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
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.annexureRating && !annexureRatingSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, annexureRating: '' }));
                        setAnnexureRatingSearchTerm('');
                      }}
                      className="text-gray-400 hover:text-gray-600 mr-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
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
                  value={modelSearchTerm || (formData.dgModel ? getModelLabel(formData.dgModel) : '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    setModelSearchTerm(value);
                    
                    // If input is cleared, clear the model selection
                    if (!value) {
                      setFormData(prev => ({ ...prev, dgModel: '' }));
                    }
                    
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
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.dgModel && !modelSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, dgModel: '' }));
                        setModelSearchTerm('');
                      }}
                      className="text-gray-400 hover:text-gray-600 mr-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
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
                  value={cylinderSearchTerm || (formData.cylinder ? getCylinderLabel(formData.cylinder) : '')}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCylinderSearchTerm(value);
                    
                    // If input is cleared, clear the cylinder selection
                    if (!value) {
                      setFormData(prev => ({ ...prev, cylinder: '' }));
                    }
                    
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
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  {formData.cylinder && !cylinderSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, cylinder: '' }));
                        setCylinderSearchTerm('');
                      }}
                      className="text-gray-400 hover:text-gray-600 mr-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
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
                    value={warrantyInvoiceSearchTerm || (formData.warrantyFromInvoice ? getWarrantyInvoiceLabel(formData.warrantyFromInvoice) : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setWarrantyInvoiceSearchTerm(value);
                      
                      // If input is cleared, clear the warranty selection
                      if (!value) {
                        setFormData(prev => ({ ...prev, warrantyFromInvoice: '30' }));
                      }
                      
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
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.warrantyFromInvoice && formData.warrantyFromInvoice !== '30' && !warrantyInvoiceSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, warrantyFromInvoice: '30' }));
                          setWarrantyInvoiceSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                    value={warrantyHoursSearchTerm || (formData.warrantyHours ? getWarrantyHoursLabel(formData.warrantyHours) : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setWarrantyHoursSearchTerm(value);
                      
                      // If input is cleared, clear the warranty selection
                      if (!value) {
                        setFormData(prev => ({ ...prev, warrantyHours: '5000' }));
                      }
                      
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
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.warrantyHours && formData.warrantyHours !== '5000' && !warrantyHoursSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, warrantyHours: '5000' }));
                          setWarrantyHoursSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                    value={taxRateSearchTerm || (formData.taxRate ? getTaxRateLabel(formData.taxRate) : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setTaxRateSearchTerm(value);
                      
                      // If input is cleared, clear the tax rate selection
                      if (!value) {
                        setFormData(prev => ({ ...prev, taxRate: '18' }));
                      }
                      
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
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.taxRate && formData.taxRate !== '18' && !taxRateSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, taxRate: '18' }));
                          setTaxRateSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                    value={freightTermsSearchTerm || (formData.freightTerms ? getFreightTermsLabel(formData.freightTerms) : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFreightTermsSearchTerm(value);
                      
                      // If input is cleared, clear the freight terms selection
                      if (!value) {
                        setFormData(prev => ({ ...prev, freightTerms: 'extra' }));
                      }
                      
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
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.freightTerms && formData.freightTerms !== 'extra' && !freightTermsSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, freightTerms: 'extra' }));
                          setFreightTermsSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                    value={deliveryPeriodSearchTerm || (formData.deliveryPeriod ? getDeliveryPeriodLabel(formData.deliveryPeriod) : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDeliveryPeriodSearchTerm(value);
                      
                      // If input is cleared, clear the delivery period selection
                      if (!value) {
                        setFormData(prev => ({ ...prev, deliveryPeriod: '6' }));
                      }
                      
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
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.deliveryPeriod && formData.deliveryPeriod !== '6' && !deliveryPeriodSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, deliveryPeriod: '6' }));
                          setDeliveryPeriodSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                    value={validityDaysSearchTerm || (formData.validityDays ? getValidityDaysLabel(formData.validityDays) : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setValidityDaysSearchTerm(value);
                      
                      // If input is cleared, clear the validity days selection
                      if (!value) {
                        setFormData(prev => ({ ...prev, validityDays: '30' }));
                      }
                      
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
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.validityDays && formData.validityDays !== '30' && !validityDaysSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, validityDays: '30' }));
                          setValidityDaysSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sales Engineer
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Search sales engineer..."
                    value={salesEngineerSearchTerm}
                    onChange={(e) => {
                      setSalesEngineerSearchTerm(e.target.value);
                      setShowSalesEngineerDropdown(true);
                      setHighlightedSalesEngineerIndex(-1);
                    }}
                    onFocus={() => setShowSalesEngineerDropdown(true)}
                    onKeyDown={handleSalesEngineerKeyDown}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {showSalesEngineerDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {salesEngineers
                      .filter(engineer =>
                        engineer.fullName.toLowerCase().includes(salesEngineerSearchTerm.toLowerCase()) ||
                        engineer.email?.toLowerCase().includes(salesEngineerSearchTerm.toLowerCase()) ||
                        engineer.salesEmployeeCode?.toLowerCase().includes(salesEngineerSearchTerm.toLowerCase())
                      )
                      .map((engineer, index) => (
                        <div
                          key={engineer._id}
                          className={`px-4 py-3 cursor-pointer hover:bg-gray-100 ${
                            index === highlightedSalesEngineerIndex ? 'bg-blue-100' : ''
                          }`}
                          onClick={() => handleSalesEngineerSelect(engineer._id)}
                        >
                          <div className="font-medium text-gray-900">{engineer.fullName}</div>
                          <div className="text-sm text-gray-500">{engineer.email}</div>
                          <div className="text-xs text-gray-400">Code: {engineer.salesEmployeeCode}</div>
                        </div>
                      ))}
                    {salesEngineers.filter(engineer =>
                      engineer.fullName.toLowerCase().includes(salesEngineerSearchTerm.toLowerCase()) ||
                      engineer.email?.toLowerCase().includes(salesEngineerSearchTerm.toLowerCase()) ||
                      engineer.salesEmployeeCode?.toLowerCase().includes(salesEngineerSearchTerm.toLowerCase())
                    ).length === 0 && (
                      <div className="px-4 py-3 text-gray-500">No sales engineers found</div>
                    )}
                  </div>
                )}
                
                {formData.salesEngineer && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-blue-900">{formData.salesEngineer.fullName}</div>
                        <div className="text-sm text-blue-700">{formData.salesEngineer.email}</div>
                        <div className="text-xs text-blue-600">Code: {formData.salesEngineer.salesEmployeeCode}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, salesEngineer: undefined }));
                          setSalesEngineerSearchTerm('');
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
                    value={locationSearchTerm || (formData.location ? getLocationLabel(formData.location) : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocationSearchTerm(value);
                      
                      // If input is cleared, clear the location selection
                      if (!value) {
                        setFormData(prev => ({ ...prev, location: '' }));
                      }
                      
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
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.location && !locationSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, location: '' }));
                          setLocationSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                    value={customerSearchTerm || (formData.customer._id ? getCustomerLabel(formData.customer._id) : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomerSearchTerm(value);
                      
                      // If input is cleared, clear the customer selection
                      if (!value) {
                        setFormData(prev => ({
                          ...prev,
                          customer: { _id: '', name: '', email: '', phone: '', pan: '', corporateName: '', address: '', pinCode: '', tehsil: '', district: '' },
                          billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
                          shipToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
                        }));
                        setAddresses([]);
                      }
                      
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
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.customer._id && !customerSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            customer: { _id: '', name: '', email: '', phone: '', pan: '', corporateName: '', address: '', pinCode: '', tehsil: '', district: '' },
                            billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
                            shipToAddress: { address: '', state: '', district: '', pincode: '' }
                          }));
                          setAddresses([]);
                          setCustomerSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                            billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
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
                    value={billToAddressSearchTerm || (formData.billToAddress?.address ? getAddressLabel((formData.billToAddress as any)?.addressId?.toString()) : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBillToAddressSearchTerm(value);
                      
                      // If input is cleared, clear the address selection
                      if (!value) {
                        setFormData(prev => ({
                          ...prev,
                          billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
                        }));
                      }
                      
                      if (!showBillToAddressDropdown) setShowBillToAddressDropdown(true);
                      setHighlightedBillToAddressIndex(-1);
                    }}
                    onFocus={() => {
                      if (formData.customer._id) {
                        setShowBillToAddressDropdown(true);
                        setHighlightedBillToAddressIndex(-1);
                      }
                    }}
                    autoComplete="off"
                    onKeyDown={handleBillToAddressKeyDown}
                    disabled={!formData.customer._id}
                    placeholder={!formData.customer._id ? "Select customer first" : "Search address or press ↓ to open"}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg transition-colors ${!formData.customer._id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.billToAddress?.address && !billToAddressSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
                          }));
                          setBillToAddressSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                            billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
                          }));
                          setShowBillToAddressDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm ${!formData.billToAddress?.address ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
                      >
                        Select bill to address
                      </button>
                      {addresses
                        .filter(address =>
                          !billToAddressSearchTerm ||
                          address.address.toLowerCase().includes(billToAddressSearchTerm.toLowerCase()) ||
                          address.district.toLowerCase().includes(billToAddressSearchTerm.toLowerCase()) ||
                          address.state.toLowerCase().includes(billToAddressSearchTerm.toLowerCase()) ||
                          address.pincode.includes(billToAddressSearchTerm)
                        )
                        .map((address, index) => (
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
                            setBillToAddressSearchTerm('');
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
                      {addresses.filter(address =>
                        !billToAddressSearchTerm ||
                        address.address.toLowerCase().includes(billToAddressSearchTerm.toLowerCase()) ||
                        address.district.toLowerCase().includes(billToAddressSearchTerm.toLowerCase()) ||
                        address.state.toLowerCase().includes(billToAddressSearchTerm.toLowerCase()) ||
                        address.pincode.includes(billToAddressSearchTerm)
                      ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          {addresses.length === 0 ? 'No addresses found for this customer' : `No addresses found for "${billToAddressSearchTerm}"`}
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
                    value={shipToAddressSearchTerm || (formData.shipToAddress?.address ? getAddressLabel((formData.shipToAddress as any)?.addressId?.toString()) : '')}
                    onChange={(e) => {
                      const value = e.target.value;
                      setShipToAddressSearchTerm(value);
                      
                      // If input is cleared, clear the address selection
                      if (!value) {
                        setFormData(prev => ({
                          ...prev,
                          shipToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
                        }));
                      }
                      
                      if (!showShipToAddressDropdown) setShowShipToAddressDropdown(true);
                      setHighlightedShipToAddressIndex(-1);
                    }}
                    onFocus={() => {
                      if (formData.customer._id) {
                        setShowShipToAddressDropdown(true);
                        setHighlightedShipToAddressIndex(-1);
                      }
                    }}
                    autoComplete="off"
                    onKeyDown={handleShipToAddressKeyDown}
                    disabled={!formData.customer._id}
                    placeholder={!formData.customer._id ? "Select customer first" : "Search address or press ↓ to open"}
                    className={`w-full px-3 py-2 pr-10 border rounded-lg transition-colors ${!formData.customer._id
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      }`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {formData.shipToAddress?.address && !shipToAddressSearchTerm && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            shipToAddress: { address: '', state: '', district: '', pincode: '' }
                          }));
                          setShipToAddressSearchTerm('');
                        }}
                        className="text-gray-400 hover:text-gray-600 mr-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
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
                      {addresses
                        .filter(address =>
                          !shipToAddressSearchTerm ||
                          address.address.toLowerCase().includes(shipToAddressSearchTerm.toLowerCase()) ||
                          address.district.toLowerCase().includes(shipToAddressSearchTerm.toLowerCase()) ||
                          address.state.toLowerCase().includes(shipToAddressSearchTerm.toLowerCase()) ||
                          address.pincode.includes(shipToAddressSearchTerm)
                        )
                        .map((address, index) => (
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
                            setShipToAddressSearchTerm('');
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
                      {addresses.filter(address =>
                        !shipToAddressSearchTerm ||
                        address.address.toLowerCase().includes(shipToAddressSearchTerm.toLowerCase()) ||
                        address.district.toLowerCase().includes(shipToAddressSearchTerm.toLowerCase()) ||
                        address.state.toLowerCase().includes(shipToAddressSearchTerm.toLowerCase()) ||
                        address.pincode.includes(shipToAddressSearchTerm)
                      ).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          {addresses.length === 0 ? 'No addresses found for this customer' : `No addresses found for "${shipToAddressSearchTerm}"`}
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
                        billToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' },
                        shipToAddress: { address: '', state: '', district: '', pincode: '', gstNumber: '' }
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
                              {formData.billToAddress.gstNumber && (
                                <div className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">GST:</span> {formData.billToAddress.gstNumber}
                                </div>
                              )}
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
                              {formData.shipToAddress.gstNumber && (
                                <div className="text-sm text-gray-600 mt-1">
                                  <span className="font-medium">GST:</span> {formData.shipToAddress.gstNumber}
                                </div>
                              )}
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
                          step="1"
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
                {/* <div>
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
                </div> */}
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