import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Botton';
import { Badge } from '../ui/Badge';
import {
  X,
  Printer,
  Edit,
  Calendar,
  Clock,
  DollarSign,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Package,
  Wrench,
  Settings,
  FileText,
  IndianRupee,
  CheckCircle,
  AlertTriangle,
  Info,
  Copy,
  Share2
} from 'lucide-react';

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper function to get payment method label
const getPaymentMethodLabel = (method: string) => {
  switch (method) {
    case 'cash': return 'Cash';
    case 'cheque': return 'Cheque';
    case 'bank_transfer': return 'Bank Transfer';
    case 'upi': return 'UPI';
    case 'card': return 'Card';
    case 'other': return 'Other';
    default: return method.charAt(0).toUpperCase() + method.slice(1);
  }
};

interface AMCQuotationViewModalProps {
  quotation: any;
  onClose: () => void;
  onEdit: () => void;
  onPrint: () => void;
  paymentHistory?: any[];
  loadingPaymentHistory?: boolean;
  onRefreshPaymentHistory?: () => void;
  onGeneratePaymentPDF?: (paymentId: string) => void;
}

const AMCQuotationViewModal: React.FC<AMCQuotationViewModalProps> = ({
  quotation,
  onClose,
  onEdit,
  onPrint,
  paymentHistory = [],
  loadingPaymentHistory = false,
  onRefreshPaymentHistory,
  onGeneratePaymentPDF,
}) => {
  // Helper function to render payment history
  const renderPaymentHistory = () => {
    if (loadingPaymentHistory) {
      return (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">Loading payment history...</span>
        </div>
      );
    }

    if (paymentHistory.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          <p className="text-sm">No payment records found</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {paymentHistory.map((payment, index) => (
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
                {onGeneratePaymentPDF && (
                  <button
                    onClick={() => onGeneratePaymentPDF(payment._id)}
                    className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                    title="Generate PDF Receipt"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>PDF</span>
                  </button>
                )}
              </div>
            </div>

            {/* Payment Method Details */}
            {payment.paymentMethodDetails && Object.keys(payment.paymentMethodDetails).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
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
        ))}
      </div>
    );
  };

  // Helper function to render payment method details
  const renderPaymentMethodDetails = (paymentMethod: string, details: any) => {
    switch (paymentMethod) {
      case 'cash':
        return (
          <>
            {details.cash?.receivedBy && (
              <div>
                <span className="text-sm font-medium text-gray-600">Received By:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cash.receivedBy}</span>
              </div>
            )}
            {details.cash?.receiptNumber && (
              <div>
                <span className="text-sm font-medium text-gray-600">Receipt Number:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cash.receiptNumber}</span>
              </div>
            )}
          </>
        );
      case 'cheque':
        return (
          <>
            {details.cheque?.chequeNumber && (
              <div>
                <span className="text-sm font-medium text-gray-600">Cheque Number:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cheque.chequeNumber}</span>
              </div>
            )}
            {details.cheque?.bankName && (
              <div>
                <span className="text-sm font-medium text-gray-600">Bank:</span>
                <span className="ml-2 text-sm text-gray-900">{details.cheque.bankName}</span>
              </div>
            )}
            {details.cheque?.issueDate && (
              <div>
                <span className="text-sm font-medium text-gray-600">Issue Date:</span>
                <span className="ml-2 text-sm text-gray-900">{formatDate(details.cheque.issueDate)}</span>
              </div>
            )}
          </>
        );
      case 'bank_transfer':
        return (
          <>
            {details.bankTransfer?.transactionId && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transaction ID:</span>
                <span className="ml-2 text-sm text-gray-900">{details.bankTransfer.transactionId}</span>
              </div>
            )}
            {details.bankTransfer?.bankName && (
              <div>
                <span className="text-sm font-medium text-gray-600">Bank:</span>
                <span className="ml-2 text-sm text-gray-900">{details.bankTransfer.bankName}</span>
              </div>
            )}
            {details.bankTransfer?.transferDate && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transfer Date:</span>
                <span className="ml-2 text-sm text-gray-900">{formatDate(details.bankTransfer.transferDate)}</span>
              </div>
            )}
          </>
        );
      case 'upi':
        return (
          <>
            {details.upi?.upiId && (
              <div>
                <span className="text-sm font-medium text-gray-600">UPI ID:</span>
                <span className="ml-2 text-sm text-gray-900">{details.upi.upiId}</span>
              </div>
            )}
            {details.upi?.transactionId && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transaction ID:</span>
                <span className="ml-2 text-sm text-gray-900">{details.upi.transactionId}</span>
              </div>
            )}
          </>
        );
      case 'card':
        return (
          <>
            {details.card?.cardType && (
              <div>
                <span className="text-sm font-medium text-gray-600">Card Type:</span>
                <span className="ml-2 text-sm text-gray-900">{details.card.cardType}</span>
              </div>
            )}
            {details.card?.transactionId && (
              <div>
                <span className="text-sm font-medium text-gray-600">Transaction ID:</span>
                <span className="ml-2 text-sm text-gray-900">{details.card.transactionId}</span>
              </div>
            )}
          </>
        );
      default:
        return null;
    }
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get payment status badge color
  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'gst_pending': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get AMC type badge color
  const getAMCTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'AMC': return 'bg-blue-100 text-blue-800';
      case 'CAMC': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="AMC Quotation Details"
      size="6xl"
    >
      <div className="p-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {quotation.quotationNumber}
            </h2>
            <Badge className={getStatusBadgeColor(quotation.status)}>
              {quotation.status}
            </Badge>
            <Badge className={getPaymentStatusBadgeColor(quotation.paymentStatus)}>
              {quotation.paymentStatus}
            </Badge>
            <Badge className={getAMCTypeBadgeColor(quotation.amcType)}>
              {quotation.amcType}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={onPrint}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </Button>
            <Button
              onClick={onEdit}
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </Button>
          </div>
        </div>

        {/* Company Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-red-200">
          <div className="flex items-center">
            <div className="text-red-600 font-bold text-2xl">powerol</div>
            <div className="text-gray-600 text-sm ml-2">by Mahindra</div>
          </div>
          <div className="flex items-center">
            <div className="text-red-600 font-semibold">Sun Power Services</div>
          </div>
        </div>

        {/* Document Title */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ANNUAL MAINTENANCE (AMC) OFFER</h1>
        </div>

        {/* Customer and Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Customer Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Customer Information
            </h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Name:</span>
                <span className="ml-2 text-gray-900">{quotation.customer.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Email:</span>
                <span className="ml-2 text-gray-900">{quotation.customer.email}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Phone:</span>
                <span className="ml-2 text-gray-900">{quotation.customer.phone}</span>
              </div>
              {quotation.customer.pan && (
                <div>
                  <span className="font-medium text-gray-700">PAN:</span>
                  <span className="ml-2 text-gray-900">{quotation.customer.pan}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quotation Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Quotation Information
            </h3>
            <div className="space-y-2">
              <div>
                <span className="font-medium text-gray-700">Issue Date:</span>
                <span className="ml-2 text-gray-900">{formatDate(quotation.issueDate)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Valid Until:</span>
                <span className="ml-2 text-gray-900">{formatDate(quotation.validUntil)}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Reference:</span>
                <span className="ml-2 text-gray-900">{quotation.refOfQuote || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Subject:</span>
                <span className="ml-2 text-gray-900">{quotation.subject || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* AMC Contract Details */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            AMC Contract Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <span className="font-medium text-gray-700">Contract Duration:</span>
              <span className="ml-2 text-gray-900">{quotation.contractDuration} months</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Billing Cycle:</span>
              <span className="ml-2 text-gray-900 capitalize">{quotation.billingCycle}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Number of Visits:</span>
              <span className="ml-2 text-gray-900">{quotation.numberOfVisits}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Oil Services:</span>
              <span className="ml-2 text-gray-900">{quotation.numberOfOilServices}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Response Time:</span>
              <span className="ml-2 text-gray-900">{quotation.responseTime} hours</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Emergency Contact:</span>
              <span className="ml-2 text-gray-900">{quotation.emergencyContactHours}</span>
            </div>
          </div>
          {quotation.coverageArea && (
            <div className="mt-3">
              <span className="font-medium text-gray-700">Coverage Area:</span>
              <span className="ml-2 text-gray-900">{quotation.coverageArea}</span>
            </div>
          )}
        </div>

        {/* AMC Period */}
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            AMC Period
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-700">AMC Start Date:</span>
              <span className="ml-2 text-gray-900">{formatDate(quotation.amcPeriodFrom)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">AMC End Date:</span>
              <span className="ml-2 text-gray-900">{formatDate(quotation.amcPeriodTo)}</span>
            </div>
          </div>
        </div>

        {/* Offer Details Table */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Offer Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-left">Make</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Engine Sl.No</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">DG Rating in KVA</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Type Of Visits</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Qty</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">AMC/CAMC cost per DG</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Total AMC Amount per DG</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">GST @ 18%</th>
                  <th className="border border-gray-300 px-4 py-2 text-left">Total AMC Cost</th>
                </tr>
              </thead>
              <tbody>
                {quotation.offerItems.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="border border-gray-300 px-4 py-2">{item.make}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.engineSlNo}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.dgRatingKVA}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.typeOfVisits}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.qty}</td>
                    <td className="border border-gray-300 px-4 py-2">{formatCurrency(item.amcCostPerDG)}</td>
                    <td className="border border-gray-300 px-4 py-2">{formatCurrency(item.totalAMCAmountPerDG)}</td>
                    <td className="border border-gray-300 px-4 py-2">{formatCurrency(item.gst18)}</td>
                    <td className="border border-gray-300 px-4 py-2">{formatCurrency(item.totalAMCCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* CAMC Spares Section */}
        {quotation.amcType === 'CAMC' && quotation.sparesItems && quotation.sparesItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Spares replaced in this periodical service</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left">Sr.No</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Part No</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">HSN Code</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.sparesItems.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="border border-gray-300 px-4 py-2 text-center">{item.srNo}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.partNo}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.description}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.hsnCode}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 underline">TERMS & CONDITIONS:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <span className="font-medium text-gray-700">PAYMENT:</span>
                <span className="ml-2 text-gray-900">{quotation.paymentTermsText || 'N/A'}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <span className="font-medium text-gray-700">VALIDITY:</span>
                <span className="ml-2 text-gray-900">{quotation.validityText || 'N/A'}</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <span className="font-medium text-gray-700">GST:</span>
            <span className="ml-2 text-gray-900">{quotation.gstIncluded ? 'Included' : 'Not Included'}</span>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
            <IndianRupee className="w-5 h-5 mr-2" />
            Financial Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <span className="font-medium text-gray-700">Subtotal:</span>
              <span className="ml-2 text-gray-900">{formatCurrency(quotation.subtotal)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Total Tax:</span>
              <span className="ml-2 text-gray-900">{formatCurrency(quotation.totalTax)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Grand Total:</span>
              <span className="ml-2 text-gray-900 font-bold">{formatCurrency(quotation.grandTotal)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Paid Amount:</span>
              <span className="ml-2 text-gray-900">{formatCurrency(quotation.paidAmount)}</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">Remaining:</span>
              <span className="ml-2 text-gray-900">{formatCurrency(quotation.remainingAmount)}</span>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        {/* {quotation.performanceMetrics && (
          <div className="bg-yellow-50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              Performance Metrics
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="font-medium text-gray-700">Avg Response Time:</span>
                <span className="ml-2 text-gray-900">{quotation.performanceMetrics.avgResponseTime} hours</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Customer Satisfaction:</span>
                <span className="ml-2 text-gray-900">{quotation.performanceMetrics.customerSatisfaction}%</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Issue Resolution Rate:</span>
                <span className="ml-2 text-gray-900">{quotation.performanceMetrics.issueResolutionRate}%</span>
              </div>
            </div>
          </div>
        )} */}

        {/* Additional Notes */}
        {(quotation.notes || quotation.terms) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Information</h3>
            {quotation.notes && (
              <div className="mb-3">
                <span className="font-medium text-gray-700">Notes:</span>
                <p className="mt-1 text-gray-900">{quotation.notes}</p>
              </div>
            )}
            {quotation.terms && (
              <div>
                <span className="font-medium text-gray-700">Terms:</span>
                <p className="mt-1 text-gray-900">{quotation.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Closing Statement */}
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            We trust that our offer is in line with your requirement and shall be glad to receive your valued Purchase Order.
          </p>
          <div className="text-right">
            <p className="font-medium">Authorised Signatory</p>
          </div>
        </div>

        {/* Payment History */}
        {paymentHistory && paymentHistory.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
              {onRefreshPaymentHistory && (
                <button
                  onClick={onRefreshPaymentHistory}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  disabled={loadingPaymentHistory}
                >
                  <svg className={`w-4 h-4 ${loadingPaymentHistory ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              {renderPaymentHistory()}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Created: {formatDateTime(quotation.createdAt)}
            {quotation.updatedAt !== quotation.createdAt && (
              <span className="ml-4">Updated: {formatDateTime(quotation.updatedAt)}</span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={onClose}
              variant="outline"
            >
              Close
            </Button>
            <Button
              onClick={onEdit}
              className="flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AMCQuotationViewModal;
