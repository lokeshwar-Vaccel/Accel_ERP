import React, { useState, useEffect } from 'react';
import { X, Download, Mail, Printer, Check, X as XIcon, RefreshCw } from 'lucide-react';
import { Button } from './Botton';
import { Badge } from './Badge';
import { downloadDGQuotationPDF } from '../../utils/dgQuotationPdf';
import { apiClient } from '../../utils/api';

interface DGQuotationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: any;
  onStatusUpdate?: (status: string) => void;
}

const DGQuotationViewModal: React.FC<DGQuotationViewModalProps> = ({
  isOpen,
  onClose,
  quotation,
  onStatusUpdate
}) => {
  const [updatingStatus, setUpdatingStatus] = React.useState(false);
  
  // Payment history state
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  console.log("quotation:",quotation);
  

  // Helper function to convert quotation data for PDF
  const convertToDGQuotationData = (data: any) => {
    return {
      ...data,
      items: data.dgItems?.map((item: any) => ({
        product: item.product,
        description: item.description,
        quantity: item.quantity,
        uom: item.uom || 'nos',
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        discountedAmount: item.discountedAmount || 0,
        taxRate: item.taxRate || 0,
        taxAmount: item.taxAmount || 0,
        totalPrice: item.totalPrice || (item.quantity * item.unitPrice)
      })) || [],
      services: data.services?.map((service: any) => ({
        serviceName: service.serviceName,
        description: service.description,
        quantity: service.quantity,
        uom: service.uom || 'nos',
        unitPrice: service.unitPrice,
        discount: service.discount || 0,
        discountedAmount: service.discountedAmount || 0,
        taxRate: service.taxRate || 0,
        taxAmount: service.taxAmount || 0,
        totalPrice: service.totalPrice || (service.quantity * service.unitPrice)
      })) || []
    };
  };

  const handleDownloadPDF = async () => {
    const convertedData = convertToDGQuotationData(quotation);
    await downloadDGQuotationPDF(convertedData);
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
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
        return <Badge variant="info">{status || 'Draft'}</Badge>;
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!onStatusUpdate) return;
    
    setUpdatingStatus(true);
    try {
      await onStatusUpdate(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit'
    });
  };

  // Fetch payment history for DG quotation
  const fetchDGQuotationPaymentHistory = async (quotationId: string) => {
    try {
      setLoadingPayments(true);
      const response = await apiClient.dgSales.dgQuotationPayments.getByQuotation(quotationId);
      console.log('DG Quotation Payment History Response:', response);
      if (response.success) {
        // Handle different possible response structures
        let payments = [];
        if (Array.isArray(response.data)) {
          payments = response.data;
        } else if (response.data?.payments && Array.isArray(response.data.payments)) {
          payments = response.data.payments;
        } else if ((response.data as any)?.data && Array.isArray((response.data as any).data)) {
          payments = (response.data as any).data;
        }
        console.log('Processed payments:', payments);
        setPaymentHistory(payments);
      } else {
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Error fetching DG quotation payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  // Helper function to get payment method label
  const getPaymentMethodLabel = (value: string) => {
    const options = [
      { value: '', label: 'Select payment method' },
      { value: 'cash', label: 'Cash' },
      { value: 'bank_transfer', label: 'Bank Transfer' },
      { value: 'cheque', label: 'Cheque' },
      { value: 'upi', label: 'UPI' },
      { value: 'card', label: 'Card' },
      { value: 'other', label: 'Other' }
    ];
    return options.find(option => option.value === value)?.label || value;
  };

  // Helper function to render payment method details
  const renderPaymentMethodDetails = (method: string, details: any) => {
    console.log("Payment Method Details Debug:", {
      method,
      details,
      detailsType: typeof details,
      detailsKeys: details ? Object.keys(details) : 'no details',
      detailsLength: details ? Object.keys(details).length : 0
    });
    
    if (!details || typeof details !== 'object' || Object.keys(details).length === 0) {
      console.log("No payment method details to render");
      return (
        <div className="text-xs text-gray-500 italic">
          No additional payment details available
        </div>
      );
    }

    const renderDetail = (label: string, value: any, formatter?: (val: any) => string) => {
      if (!value) return null;
      return (
        <div className="text-xs">
          <span className="font-medium text-gray-600">{label}:</span> 
          <span className="ml-1 text-gray-800">{formatter ? formatter(value) : String(value)}</span>
        </div>
      );
    };

    // Handle nested structure where details are inside method-specific objects
    let actualDetails = details;
    
    // Check if details are nested under the payment method key
    if (method === 'cheque' && details.cheque) {
      actualDetails = details.cheque;
    } else if (method === 'bank_transfer' && details.bankTransfer) {
      actualDetails = details.bankTransfer;
    } else if (method === 'upi' && details.upi) {
      actualDetails = details.upi;
    } else if (method === 'card' && details.card) {
      actualDetails = details.card;
    } else if (method === 'cash' && details.cash) {
      actualDetails = details.cash;
    } else if (method === 'other' && details.other) {
      actualDetails = details.other;
    }

    console.log("Actual Details:", actualDetails);

    switch (method) {
      case 'bank_transfer':
        return (
          <>
            {renderDetail('Bank', actualDetails.bankName)}
            {renderDetail('Account Number', actualDetails.accountNumber)}
            {renderDetail('Transaction ID', actualDetails.transactionId)}
            {renderDetail('IFSC Code', actualDetails.ifscCode)}
            {renderDetail('Transfer Date', actualDetails.transferDate, formatDate)}
            {renderDetail('Reference Number', actualDetails.referenceNumber)}
          </>
        );
      case 'cheque':
        return (
          <>
            {renderDetail('Cheque Number', actualDetails.chequeNumber)}
            {renderDetail('Bank', actualDetails.bankName)}
            {renderDetail('Branch', actualDetails.branchName)}
            {renderDetail('Issue Date', actualDetails.issueDate, formatDate)}
            {renderDetail('Account Holder', actualDetails.accountHolderName)}
            {renderDetail('Account Number', actualDetails.accountNumber)}
          </>
        );
      case 'upi':
        return (
          <>
            {renderDetail('UPI ID', actualDetails.upiId)}
            {renderDetail('Transaction ID', actualDetails.transactionId)}
            {renderDetail('Transaction Reference', actualDetails.transactionReference)}
            {renderDetail('Payer Name', actualDetails.payerName)}
            {renderDetail('Payer Phone', actualDetails.payerPhone)}
          </>
        );
      case 'card':
        return (
          <>
            {renderDetail('Card Type', actualDetails.cardType)}
            {renderDetail('Card Network', actualDetails.cardNetwork)}
            {renderDetail('Last 4 Digits', actualDetails.lastFourDigits)}
            {renderDetail('Transaction ID', actualDetails.transactionId)}
            {renderDetail('Authorization Code', actualDetails.authorizationCode)}
            {renderDetail('Card Holder', actualDetails.cardHolderName)}
          </>
        );
      case 'cash':
        return (
          <>
            {renderDetail('Received By', actualDetails.receivedBy)}
            {renderDetail('Receipt Number', actualDetails.receiptNumber)}
          </>
        );
      case 'other':
        return (
          <>
            {renderDetail('Method Name', actualDetails.methodName)}
            {renderDetail('Reference Number', actualDetails.referenceNumber)}
            {actualDetails.additionalDetails && Object.keys(actualDetails.additionalDetails).length > 0 && (
              <div className="mt-1">
                <span className="font-medium text-gray-600">Additional Details:</span>
                {Object.entries(actualDetails.additionalDetails).map(([key, value]) => 
                  renderDetail(key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'), value)
                )}
              </div>
            )}
          </>
        );
      default:
        // For any other payment method or unknown methods, show all available details
        const entries = Object.entries(actualDetails).filter(([key, value]) => value !== null && value !== undefined && value !== '');
        if (entries.length === 0) {
          return (
            <div className="text-xs text-gray-500 italic">
              No additional payment details available
            </div>
          );
        }
        return entries.map(([key, value]) => 
          renderDetail(key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'), value)
        );
    }
  };

  // Fetch payment history when component mounts
  useEffect(() => {
    if (quotation?._id) {
      fetchDGQuotationPaymentHistory(quotation._id);
    }
  }, [quotation?._id]);

  // Helper function to render payment history
  const renderPaymentHistory = () => {
    if (loadingPayments) {
      return (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading payment history...</span>
        </div>
      );
    }

    // Ensure paymentHistory is always an array
    const payments = Array.isArray(paymentHistory) ? paymentHistory : [];

    console.log("payments123:",payments);
    
    if (payments.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No payment records found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {payments.map((payment, index) => {
          console.log("Payment Debug:", {
            paymentId: payment._id,
            paymentMethod: payment.paymentMethod,
            paymentMethodDetails: payment.paymentMethodDetails,
            hasDetails: payment.paymentMethodDetails && Object.keys(payment.paymentMethodDetails).length > 0
          });
          return (
          <div key={payment._id || index} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${payment.paymentStatus === 'completed' ? 'bg-green-500' :
                    payment.paymentStatus === 'pending' ? 'bg-yellow-500' :
                      payment.paymentStatus === 'failed' ? 'bg-red-500' :
                        'bg-gray-500'
                  }`}></div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {getPaymentMethodLabel(payment.paymentMethod)} Payment
                  </h4>
                  <p className="text-xs text-gray-500">
                    {formatDate(payment.paymentDate)} • {payment.paymentStatus}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    {formatCurrency(payment.amount)}
                  </p>
                  {payment.receiptNumber && (
                    <p className="text-xs text-gray-500">Receipt: {payment.receiptNumber}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method Details */}
            {payment.paymentMethodDetails && 
             typeof payment.paymentMethodDetails === 'object' && 
             Object.keys(payment.paymentMethodDetails).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-xs font-medium text-gray-700 mb-2">Payment Details:</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {renderPaymentMethodDetails(payment.paymentMethod, payment.paymentMethodDetails)}
                </div>
              </div>
            )}

            {/* Payment Notes */}
            {payment.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-600">
                  <span className="font-medium">Notes:</span> {payment.notes}
                </p>
              </div>
            )}
          </div>
          );
        })}
      </div>
    );
  };

  if (!isOpen || !quotation) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              DG Quotation Details
            </h2>
            {getStatusBadge(quotation.status)}
            <Badge variant="default">
              {quotation.quotationNumber || 'N/A'}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            {/* <Button 
              variant="outline" 
              size="sm"
              onClick={handleDownloadPDF}
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button> */}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header with Company Branding */}
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center">
                  <div className="text-red-600 font-bold text-3xl italic">powerol</div>
                  <div className="text-sm text-gray-600 ml-2">by Mahindra</div>
                </div>
                <div className="text-right">
                  <div className="text-red-600 font-bold text-xl italic flex items-center">
                    <span className="mr-2">☀️</span>Sun Power Services
                  </div>
                </div>
              </div>
              <div className="border-t-2 border-red-600 mb-6"></div>
              
              {/* Quotation Details */}
              <div className="mb-6">
                <div className="text-sm mb-2">
                  <span className="font-semibold">Enquiry No:</span> {quotation.enquiryDetails?.enquiryNo || 'Drop Down'}
                </div>
                <div className="flex justify-between items-center mb-4">
                  <div className="text-sm">
                    <span className="font-semibold">Ref:</span> {quotation.quotationNumber || 'SPS / 0001 / 25-26'}
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">Date:</span> {quotation.issueDate || '03-July-2025'}
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="mb-6">
                <div className="text-sm font-semibold mb-2">To,</div>
                <div className="text-sm mb-1">{quotation.customer?.name || quotation.customer?.corporateName || 'M/s. Enpar Heater'}</div>
                <div className="text-sm mb-1">
                  {quotation.shipToAddress?.address ? 
                    `${quotation.shipToAddress.address}, ${quotation.shipToAddress.district}, ${quotation.shipToAddress.state} - ${quotation.shipToAddress.pincode}${quotation.shipToAddress.gstNumber ? ' GST: ' + quotation.shipToAddress.gstNumber : ''}` :
                    quotation.customer?.address || '2nd floor Sri Towers, 17/18, Pattullos Road, Mount Road, Bayapettak, Chennai.'
                  }
                </div>
                {quotation.customer?.phone && (
                  <div className="text-sm mb-1">
                    <span className="font-semibold">Phone:</span> {quotation.customer.phone}
                  </div>
                )}
                {quotation.customer?.email && (
                  <div className="text-sm mb-1">
                    <span className="font-semibold">Email:</span> {quotation.customer.email}
                  </div>
                )}
                {quotation.customer?.pan && (
                  <div className="text-sm mb-1">
                    <span className="font-semibold">PAN:</span> {quotation.customer.pan}
                  </div>
                )}
                {quotation.salesEngineer && (
                  <div className="text-sm mb-2">
                    <span className="font-semibold">Sales Engineer:</span> {quotation.salesEngineer.fullName} 
                    <span className="text-gray-600 ml-2">({quotation.salesEngineer.salesEmployeeCode})</span>
                  </div>
                )}
                <div className="text-sm mb-4">Dear Sir,</div>
                <div className="text-sm mb-2">
                  <span className="font-semibold">Subject:</span> {quotation.subject || 'Drop Down-A'}
                </div>
              </div>
            </div>


            {/* Financial Summary */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Subtotal:</span>
                  <span className="text-sm font-medium">₹{quotation.subtotal?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Discount:</span>
                  <span className="text-sm font-medium">₹{quotation.totalDiscount?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tax:</span>
                  <span className="text-sm font-medium">₹{quotation.totalTax?.toLocaleString() || '0'}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-lg font-semibold text-gray-900">Grand Total:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    ₹{quotation.grandTotal?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Actions */}
            {quotation.status === 'Draft' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-3">Actions</h4>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => handleStatusUpdate('Sent')}
                    disabled={updatingStatus}
                    size="sm"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Mark as Sent
                  </Button>
                </div>
              </div>
            )}

            {quotation.status === 'Sent' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-900 mb-3">Customer Response</h4>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => handleStatusUpdate('Accepted')}
                    disabled={updatingStatus}
                    variant="primary"
                    size="sm"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark as Accepted
                  </Button>
                  <Button
                    onClick={() => handleStatusUpdate('Rejected')}
                    disabled={updatingStatus}
                    variant="danger"
                    size="sm"
                  >
                    <XIcon className="w-4 h-4 mr-2" />
                    Mark as Rejected
                  </Button>
                </div>
              </div>
            )}

                        {/* Customer Information Details */}
                        <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.customer?.name || quotation.customer?.corporateName || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.customer?.email || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.customer?.phone || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PAN Number</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.customer?.pan || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.customer?.address || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">District</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.customer?.district || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.customer?.state || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">PIN Code</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.customer?.pinCode || quotation.customer?.pincode || '-'}</p>
                  </div>
                </div>
              </div>
            </div>


            {/* DG Specifications */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">DG Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">KVA Rating</label>
                    <p className="mt-1 text-sm text-gray-900 font-semibold">{quotation.dgSpecifications?.kva || quotation.dgSpecifications?.kvaRating || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phase</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.dgSpecifications?.phase || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quantity</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.dgSpecifications?.quantity || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DG Model</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.dgSpecifications?.dgModel || quotation.dgSpecifications?.model || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.dgSpecifications?.fuelType || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Engine Model</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.dgSpecifications?.engineModel || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Alternator Model</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.dgSpecifications?.alternatorModel || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cylinder</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.dgSpecifications?.cylinder || '-'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fuel Tank Capacity</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.dgSpecifications?.fuelTankCapacity || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Runtime</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.dgSpecifications?.runtime || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Noise Level</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.dgSpecifications?.noiseLevel || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Warranty Hours</label>
                    <p className="mt-1 text-sm text-gray-900">{quotation.dgSpecifications?.warrantyHours || quotation.warrantyHours || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Product Details</h3>
              {quotation.dgItems && quotation.dgItems.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sr. No.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product Description
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Rate (INR)
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total (INR)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quotation.dgItems.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {index + 1}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {/* <div className="font-medium">{item.product}</div> */}
                            <div className="text-gray-500 text-xs mt-1">{item.description}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                            {item.quantity} {item.uom}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            ₹{item.unitPrice?.toLocaleString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                            ₹{(item.totalPrice || (item.quantity * item.unitPrice))?.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {/* Totals Row */}
                      <tr className="bg-gray-50">
                        <td className="px-4 py-4" colSpan={4}>
                          <span className="text-sm font-semibold text-gray-900">Subtotal</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                          ₹{quotation.subtotal?.toLocaleString() || '0'}
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-4" colSpan={4}>
                          <span className="text-sm font-semibold text-gray-900">Discount</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                          ₹{quotation.totalDiscount?.toLocaleString() || '0'}
                        </td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td className="px-4 py-4" colSpan={4}>
                          <span className="text-sm font-semibold text-gray-900">Tax</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                          ₹{quotation.totalTax?.toLocaleString() || '0'}
                        </td>
                      </tr>
                      <tr className="bg-gray-100 border-t-2 border-gray-300">
                        <td className="px-4 py-4" colSpan={4}>
                          <span className="text-lg font-bold text-gray-900">Grand Total</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-lg font-bold text-gray-900 text-right">
                          ₹{quotation.grandTotal?.toLocaleString() || '0'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No items added to this quotation
                </div>
              )}
            </div>

            {/* Services */}
            {/* <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Services</h3>
              {quotation.services && quotation.services.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {quotation.services.map((service: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {service.serviceName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {service.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {service.quantity} {service.uom}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ₹{service.unitPrice?.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            ₹{(service.quantity * service.unitPrice)?.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No services added to this quotation
                </div>
              )}
            </div> */}

            {/* Commercial Terms */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Commercial Terms</h3>
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200 w-1/3">Quotation No.</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.quotationNumber || '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">Issue Date</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.issueDate ? new Date(quotation.issueDate).toLocaleDateString() : '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">Valid Until</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">Quotation Revision No.</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.quotationRevisionNo || '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">DG Enquiry No.</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.enquiryDetails?.enquiryNo || '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">Subject</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.subject || '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">Tax Rate</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.taxRate ? `${quotation.taxRate}%` : '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">Freight Terms</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.freightTerms || '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">Delivery Period</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.deliveryPeriod || '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">Validity Days</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.validityDays ? `${quotation.validityDays} days` : '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">Warranty From Invoice</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.warrantyFromInvoice || '-'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 border-r border-gray-200">Warranty From Commissioning</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{quotation.warrantyFromCommissioning || '-'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment History */}
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                <button
                  onClick={() => fetchDGQuotationPaymentHistory(quotation._id)}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  disabled={loadingPayments}
                >
                  <RefreshCw className={`w-4 h-4 ${loadingPayments ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
              <div className="bg-white rounded-lg p-4">
                {renderPaymentHistory()}
              </div>
            </div>

            {/* Terms & Notes */}
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border">
                  {quotation.notes || 'No notes added'}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Terms & Conditions</h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border">
                  {quotation.terms || 'No terms and conditions specified'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Delivery Terms</h4>
                  <p className="text-gray-700 text-sm">
                    {quotation.deliveryTerms || '-'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Terms</h4>
                  <p className="text-gray-700 text-sm">
                    {quotation.paymentTerms || '-'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Warranty Terms</h4>
                  <p className="text-gray-700 text-sm">
                    {quotation.warrantyTerms || '-'}
                  </p>
                </div>

                {/* <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Installation Terms</h4>
                  <p className="text-gray-700 text-sm">
                    {quotation.installationTerms || '-'}
                  </p>
                </div> */}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Status:</span>
            {getStatusBadge(quotation.status)}
            <span className="text-sm text-gray-600 ml-4">Created:</span>
            <span className="text-sm text-gray-900">
              {quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString() : '-'}
            </span>
          </div>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DGQuotationViewModal; 