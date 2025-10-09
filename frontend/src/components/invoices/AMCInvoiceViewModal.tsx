import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Botton';
import { Badge } from '../ui/Badge';
import { apiClient } from '../../utils/api';
import toast from 'react-hot-toast';
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
  Share2,
  RefreshCw
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
    month: 'short',
    day: 'numeric',
  });
};

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
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

interface AMCInvoiceViewModalProps {
  invoice: any;
  onClose: () => void;
  onEdit?: () => void;
  onPrint?: () => void;
  paymentHistory?: any[];
  loadingPaymentHistory?: boolean;
  onRefreshPaymentHistory?: () => void;
  onGeneratePaymentPDF?: (paymentId: string) => void;
}

const AMCInvoiceViewModal: React.FC<AMCInvoiceViewModalProps> = ({
  invoice,
  onClose,
  onEdit,
  onPrint,
  paymentHistory = [],
  loadingPaymentHistory = false,
  onRefreshPaymentHistory,
  onGeneratePaymentPDF
}) => {
  const [activeTab, setActiveTab] = useState('details');

  if (!invoice) return null;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-orange-100 text-orange-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAMCTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'AMC': return 'bg-blue-100 text-blue-800';
      case 'CAMC': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Render payment method details
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

  // Render payment history
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

  return (
    <Modal isOpen={true} onClose={onClose} size="6xl">
      <div className="bg-white rounded-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                AMC Invoice - {invoice.invoiceNumber}
              </h2>
              <p className="text-sm text-gray-500">
                Created on {formatDateTime(invoice.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onRefreshPaymentHistory && (
              <Button
                onClick={onRefreshPaymentHistory}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </Button>
            )}
            {onEdit && (
              <Button
                onClick={onEdit}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Edit className="w-4 h-4" />
                <span>Edit</span>
              </Button>
            )}
            {onPrint && (
              <Button
                onClick={onPrint}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </Button>
            )}
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <X className="w-4 h-4" />
              <span>Close</span>
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Invoice Details
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'payments'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Payment History ({paymentHistory.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Status and Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900">Invoice Status</span>
                  </div>
                  <Badge className={getStatusBadgeColor(invoice.status)}>
                    {invoice.status?.charAt(0).toUpperCase() + invoice.status?.slice(1)}
                  </Badge>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <IndianRupee className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-900">Payment Status</span>
                  </div>
                  <Badge className={getPaymentStatusBadgeColor(invoice.paymentStatus)}>
                    {invoice.paymentStatus?.charAt(0).toUpperCase() + invoice.paymentStatus?.slice(1)}
                  </Badge>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Wrench className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-900">AMC Type</span>
                  </div>
                  <Badge className={getAMCTypeBadgeColor(invoice.amcType)}>
                    {invoice.amcType}
                  </Badge>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                    <p className="text-sm text-gray-900">{invoice.customer?.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-sm text-gray-900">{invoice.customer?.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-sm text-gray-900">{invoice.customer?.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Invoice Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Invoice Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                    <p className="text-sm text-gray-900">{invoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date</label>
                    <p className="text-sm text-gray-900">{formatDate(invoice.issueDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <p className="text-sm text-gray-900">{formatDate(invoice.dueDate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source Quotation</label>
                    <p className="text-sm text-gray-900">{invoice.sourceQuotation?.quotationNumber || 'Not available'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                    <p className="text-sm text-gray-900">
                      {invoice.createdBy?.firstName && invoice.createdBy?.lastName
                        ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}`
                        : 'Not available'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Financial Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(invoice.grandTotal)}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Paid Amount</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(invoice.paidAmount || 0)}</p>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Remaining Amount</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(invoice.remainingAmount || 0)}</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Payment Progress</p>
                    <p className="text-2xl font-bold text-gray-600">
                      {invoice.grandTotal > 0 ? Math.round(((invoice.paidAmount || 0) / invoice.grandTotal) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
                <p className="text-sm text-gray-500">
                  Total payments: {paymentHistory.length}
                </p>
              </div>
              {renderPaymentHistory()}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AMCInvoiceViewModal;
