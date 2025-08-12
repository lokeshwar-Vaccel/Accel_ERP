import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, Eye, Download, Send, X } from 'lucide-react';
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
  dgEnquiry?: string;
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
    fuelType: string;
    engineModel: string;
    alternatorModel: string;
    fuelTankCapacity: string;
    runtime: string;
    noiseLevel: string;
    emissionCompliance: string;
  };
  items: Array<{
    product: string;
    description: string;
    hsnCode?: string;
    partNo?: string;
    quantity: number;
    uom: string;
    unitPrice: number;
    discount: number;
    discountedAmount: number;
    taxRate: number;
    taxAmount: number;
    totalPrice: number;
  }>;
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  roundOff: number;
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

  const [formData, setFormData] = useState<QuotationData>({
    quotationNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    customer: {
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
      fuelType: 'Diesel',
      engineModel: '',
      alternatorModel: 'Leroy Somer',
      fuelTankCapacity: '20',
      runtime: '10',
      noiseLevel: '65',
      emissionCompliance: 'CPCB IV+'
    },
    items: [
      {
        product: 'DG Set',
        description: `Supply of ${enquiry?.kva || ''} Kva ${enquiry?.phase || '3'} phase, Mahindra CPCB IV+ compliant, Prime Rated, radiator cooled, powered by Mahindra engine, coupled with ${enquiry?.kva || ''} KVA Leroy Somer/ Equivalent electric alternator 0.8 P.F Standard control panel with ASAS Controller with battery charger, Silencer, Anti-Vibration mountings, exhaust flexible connector, Batteries with cables, fuel tank-with built in IOT(Remote sensing)`,
        quantity: enquiry?.quantity || 1,
        uom: 'nos',
        unitPrice: 0,
        discount: 0,
        discountedAmount: 0,
        taxRate: 18,
        taxAmount: 0,
        totalPrice: 0
      }
    ],
    subtotal: 0,
    totalDiscount: 0,
    totalTax: 0,
    grandTotal: 0,
    roundOff: 0,
    notes: 'We thankfully acknowledge receipt of your enquiry for supply of Mahindra DG sets; we hereby submit our detailed techno-commercial proposal as required by you.\n\nMahindra & Mahindra Ltd is an established Indian MNC Company and "MAHINDRA POWEROL" has entered into power generation business in 2001, having range from 5KVA to 625 KVA DG Sets.\n\nPlease find attached herewith the following as part of our offer:\n• Technical specification of DG Set.\n• Price Schedule with terms & conditions\n• PRODUCT CATALOGUE\n\nWe invite you to join the ever-growing list of satisfied "MAHINDRA POWEROL" DG Sets users and assure you, of our fruitful support. Please call us for any techno commercial clarifications.\n\nWe hope our offer is in line with your requirement, assuring our best attention at all times, and we look forward to receive your valuable order.',
    terms: 'GST: 18% Extra\nTransport: Extra\nUnloading: Extra\nDelivery: 1 Week from the date of receipt of technically & commercially clear purchase orders with advance.\nPayment Terms: 100% Advance along with Purchase Order before dispatch of DG set from factory. Payment should be paid in favour of "SUN POWER SERVICES" payable at Chennai.\nValidity: Offer shall be valid for a period of 30 days from the date of submission of offer and thereafter on written confirmation.',
    validityPeriod: 30,
    deliveryTerms: '1 Week from the date of receipt of technically & commercially clear purchase orders with advance.',
    paymentTerms: '100% Advance along with Purchase Order before dispatch of DG set from factory.',
    warrantyTerms: 'Standard warranty as per manufacturer terms.',
    installationTerms: 'Installation and commissioning services available at extra cost.',
    commissioningTerms: 'Commissioning services available at extra cost.',
    status: 'Draft'
  });

  console.log("formData:", formData);
  

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [showTechnicalSpec, setShowTechnicalSpec] = useState(false);
  const [dgCustomers, setDgCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  useEffect(() => {
    generateQuotationNumber();
    fetchDGCustomers();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.customer-dropdown') && !target.closest('.address-dropdown')) {
        setShowCustomerDropdown(false);
        setShowAddressDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchDGCustomers = async () => {
    try {
      const response = await apiClient.customers.dgCustomers.getAll({ limit: 100 });
      if (response.success) {
        setDgCustomers(response.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch DG customers:', error);
      toast.error('Failed to load customer data');
    }
  };

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
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Recalculate item totals
      const item = newItems[index];
      const discountedAmount = (item.unitPrice * item.quantity) - item.discount;
      const taxAmount = discountedAmount * (item.taxRate / 100);
      const totalPrice = discountedAmount + taxAmount;
      
      newItems[index] = {
        ...item,
        discountedAmount,
        taxAmount,
        totalPrice
      };

      // Recalculate overall totals
      const subtotal = newItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const totalDiscount = newItems.reduce((sum, item) => sum + item.discount, 0);
      const totalTax = newItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const grandTotal = subtotal - totalDiscount + totalTax;
      const roundOff = Math.round(grandTotal) - grandTotal;

      return {
        ...prev,
        items: newItems,
        subtotal,
        totalDiscount,
        totalTax,
        grandTotal: Math.round(grandTotal),
        roundOff
      };
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
          uom: 'nos',
          unitPrice: 0,
          discount: 0,
          discountedAmount: 0,
          taxRate: 18,
          taxAmount: 0,
          totalPrice: 0
        }
      ]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setSelectedAddress(null);
    setShowCustomerDropdown(false);
    setCustomerSearchTerm(customer.name);

    // Update form data with customer information
    setFormData(prev => ({
      ...prev,
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        pan: customer.panNumber || '',
        corporateName: customer.corporateName || '',
        address: customer.addresses?.[0]?.address || '',
        pinCode: customer.addresses?.[0]?.pincode || '',
        tehsil: customer.addresses?.[0]?.tehsil || '',
        district: customer.addresses?.[0]?.district || ''
      },
      dgSpecifications: {
        ...prev.dgSpecifications,
        kva: customer.dgRequirements?.kva || prev.dgSpecifications.kva,
        phase: customer.dgRequirements?.phase || prev.dgSpecifications.phase,
        quantity: customer.dgRequirements?.quantity || prev.dgSpecifications.quantity
      }
    }));
  };

  const handleAddressSelect = (address: any) => {
    setSelectedAddress(address);
    setShowAddressDropdown(false);

    // Update form data with selected address
    setFormData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        address: address.address,
        pinCode: address.pincode,
        tehsil: address.tehsil,
        district: address.district
      }
    }));
  };

  const clearAddressSelection = () => {
    setSelectedAddress(null);
    setShowAddressDropdown(false);
    setFormData(prev => ({
      ...prev,
      customer: {
        ...prev.customer,
        address: '',
        pinCode: '',
        tehsil: '',
        district: ''
      }
    }));
  };

  const filteredCustomers = dgCustomers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.corporateName?.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    customer.phone?.includes(customerSearchTerm)
  );

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.quotationNumber) {
      newErrors.quotationNumber = 'Quotation number is required';
    }
    if (!formData.issueDate) {
      newErrors.issueDate = 'Issue date is required';
    }
    if (!formData.enquiryDetails?.enquiryNo) {
      newErrors['enquiryDetails.enquiryNo'] = 'Enquiry number is critical for follow-up tracking';
    }
    if (!formData.customer.name) {
      newErrors['customer.name'] = 'Customer name is required';
    }
    if (!formData.customer.email) {
      newErrors['customer.email'] = 'Customer email is required';
    }
    if (!formData.customer.phone) {
      newErrors['customer.phone'] = 'Customer phone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiClient.dgSales.quotations.create(formData);
      if (response.success) {
        toast.success('DG Quotation created successfully');
        navigate('/dg-sales');
      }
    } catch (error: any) {
      console.error('Error creating quotation:', error);
      toast.error(error.response?.data?.message || 'Failed to create quotation');
    } finally {
      setSubmitting(false);
    }
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
          </div>
        </div>

        <div className="border-t-2 border-red-600 mb-6"></div>

        {/* Enquiry Details */}
        <div className="mb-6">
          <div className="text-sm font-semibold mb-2 bg-yellow-200 px-2 py-1 rounded">
            Enquiry No: {formData.enquiryDetails?.enquiryNo || '-'}
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
                  onClick={() => downloadDGQuotationPDF(formData)}
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
                onClick={() => downloadDGQuotationPDF(formData)}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Quotation Number"
                value={formData.quotationNumber}
                onChange={(e) => updateField('quotationNumber', e.target.value)}
                error={errors.quotationNumber}
              />
              <Input
                label="Issue Date"
                type="date"
                value={formData.issueDate}
                onChange={(e) => updateField('issueDate', e.target.value)}
                error={errors.issueDate}
              />
              <Input
                label="Valid Until"
                type="date"
                value={formData.validUntil}
                onChange={(e) => updateField('validUntil', e.target.value)}
              />
            </div>
          </div>

          {/* Customer Information */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
            
            {/* Customer Selection */}
            <div className="mb-6 customer-dropdown">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Customer from DG Customers
              </label>
              <div className="relative">
                <Input
                  placeholder="Search customers by name, corporate name, or phone..."
                  value={customerSearchTerm}
                  onChange={(e) => {
                    setCustomerSearchTerm(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                />
                {showCustomerDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map((customer) => (
                        <div
                          key={customer._id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
                          onClick={() => handleCustomerSelect(customer)}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-600">
                            {customer.corporateName && `${customer.corporateName} • `}
                            {customer.phone}
                          </div>
                          {customer.dgRequirements && (
                            <div className="text-xs text-gray-500">
                              {customer.dgRequirements.kva} KVA • {customer.dgRequirements.phase} Phase • Qty: {customer.dgRequirements.quantity}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-2 text-gray-500">No customers found</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Details Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Customer Name"
                value={formData.customer.name}
                onChange={(e) => updateField('customer.name', e.target.value)}
                error={errors['customer.name']}
              />
              <Input
                label="Email"
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
              
              {/* Address Selection */}
              <div className="md:col-span-2 address-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Address
                  {selectedCustomer?.addresses?.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({selectedCustomer.addresses.length} address{selectedCustomer.addresses.length !== 1 ? 'es' : ''} available)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <div className="flex">
                    <Input
                      placeholder={selectedCustomer?.addresses?.length ? 
                        "Select an address from the customer's addresses..." : 
                        "No addresses available for this customer"
                      }
                      value={selectedAddress ? `${selectedAddress.address} - ${selectedAddress.district}` : ''}
                      onChange={(e) => {
                        // Allow typing to search addresses
                        const searchTerm = e.target.value;
                        if (!searchTerm) {
                          setSelectedAddress(null);
                          setFormData(prev => ({
                            ...prev,
                            customer: {
                              ...prev.customer,
                              address: '',
                              pinCode: '',
                              tehsil: '',
                              district: ''
                            }
                          }));
                        }
                      }}
                      onFocus={() => selectedCustomer?.addresses?.length && setShowAddressDropdown(true)}
                      readOnly={!selectedCustomer?.addresses?.length}
                      className="flex-1"
                    />
                    {selectedAddress && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearAddressSelection}
                        className="ml-2"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {showAddressDropdown && selectedCustomer?.addresses?.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-700">
                        Available Addresses
                      </div>
                      {selectedCustomer.addresses.map((address: any, index: number) => (
                        <div
                          key={address.id || index}
                          className="px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-200 last:border-b-0"
                          onClick={() => handleAddressSelect(address)}
                        >
                          <div className="font-medium text-sm flex items-center justify-between">
                            <span>{address.address}</span>
                            {address.isPrimary && (
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {address.district}, {address.state} - {address.pincode}
                          </div>
                          {address.tehsil && (
                            <div className="text-xs text-gray-500 mt-1">
                              Tehsil: {address.tehsil}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedCustomer && !selectedCustomer.addresses?.length && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-center">
                        <div className="text-yellow-600 mr-2">⚠️</div>
                        <div className="text-yellow-800 text-sm">
                          This customer has no addresses saved. Please add an address manually.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

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

            {/* Selected Customer Info */}
            {selectedCustomer && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Selected Customer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <strong>Customer Type:</strong> {selectedCustomer.customerType}
                  </div>
                  <div>
                    <strong>Status:</strong> {selectedCustomer.status}
                  </div>
                  <div>
                    <strong>Assigned Employee:</strong> {selectedCustomer.assignedEmployeeName}
                  </div>
                  <div>
                    <strong>DG Requirements:</strong> {selectedCustomer.dgRequirements?.kva} KVA, {selectedCustomer.dgRequirements?.phase} Phase
                  </div>
                  <div>
                    <strong>Segment:</strong> {selectedCustomer.dgRequirements?.segment}
                  </div>
                  <div>
                    <strong>Follow-ups:</strong> {selectedCustomer.numberOfFollowUps}
                  </div>
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
              />
              <Select
                label="Phase"
                value={formData.dgSpecifications.phase}
                onChange={(e) => updateField('dgSpecifications.phase', e.target.value)}
                options={[
                  { value: '1', label: '1 Phase' },
                  { value: '3', label: '3 Phase' }
                ]}
              />
              <Input
                label="Quantity"
                type="number"
                value={formData.dgSpecifications.quantity}
                onChange={(e) => updateField('dgSpecifications.quantity', parseInt(e.target.value))}
              />
              <Input
                label="Engine Model"
                value={formData.dgSpecifications.engineModel}
                onChange={(e) => updateField('dgSpecifications.engineModel', e.target.value)}
              />
              <Input
                label="Alternator Model"
                value={formData.dgSpecifications.alternatorModel}
                onChange={(e) => updateField('dgSpecifications.alternatorModel', e.target.value)}
              />
              <Input
                label="Emission Compliance"
                value={formData.dgSpecifications.emissionCompliance}
                onChange={(e) => updateField('dgSpecifications.emissionCompliance', e.target.value)}
              />
            </div>
          </div>

          {/* Items */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Items</h2>
              <Button variant="outline" onClick={addItem}>
                Add Item
              </Button>
            </div>
            {formData.items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <Input
                    label="Product"
                    value={item.product}
                    onChange={(e) => updateItem(index, 'product', e.target.value)}
                  />
                  <Input
                    label="Quantity"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value))}
                  />
                  <Input
                    label="Unit Price"
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value))}
                  />
                  <Input
                    label="Tax Rate (%)"
                    type="number"
                    value={item.taxRate}
                    onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value))}
                  />
                </div>
                <div className="mb-4">
                  <Input
                    label="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    Total: ₹{item.totalPrice.toLocaleString()}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={formData.items.length === 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
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

          {/* Totals */}
          <div className="border-t pt-6">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>₹{formData.subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Discount:</span>
                  <span>₹{formData.totalDiscount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Tax:</span>
                  <span>₹{formData.totalTax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Grand Total:</span>
                  <span>₹{formData.grandTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                engineModel={formData.dgSpecifications.engineModel}
                alternatorModel={formData.dgSpecifications.alternatorModel}
                emissionCompliance={formData.dgSpecifications.emissionCompliance}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DGQuotationForm; 