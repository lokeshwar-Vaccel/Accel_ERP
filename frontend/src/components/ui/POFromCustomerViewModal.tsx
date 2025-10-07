import React, { useEffect } from 'react';
import {
  X,
  Calendar,
  Building2,
  Mail,
  Phone,
  MapPin,
  Package,
  FileText,
  Download,
  Edit,
  Trash2
} from 'lucide-react';

// Types
interface POFromCustomer {
  _id: string;
  poNumber: string;
  customer: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  customerEmail: string;
  customerAddress: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    gstNumber?: string;
    isPrimary?: boolean;
  };
  quotationNumber?: {
    _id: string;
    quotationNumber: string;
    issueDate: string;
    grandTotal: number;
    status: string;
  };
  items: Array<{
    product: {
      _id: string;
      name: string;
      partNo: string;
      hsnNumber?: string;
      brand?: string;
      category?: string;
    };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate: number;
    description?: string;
    uom?: string;
    hsnNumber?: string;
  }>;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'draft' | 'sent_to_customer' | 'customer_approved' | 'in_production' | 'ready_for_delivery' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'failed';
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  department: 'retail' | 'corporate' | 'industrial_marine' | 'others';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notes?: string;
  poPdf?: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface POFromCustomerViewModalProps {
  po: POFromCustomer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

// Utility functions
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getStatusColor = (status: string) => {
  const colorClasses = {
    draft: 'bg-gray-100 text-gray-800',
    sent_to_customer: 'bg-blue-100 text-blue-800',
    customer_approved: 'bg-green-100 text-green-800',
    in_production: 'bg-yellow-100 text-yellow-800',
    ready_for_delivery: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return colorClasses[status as keyof typeof colorClasses] || 'bg-gray-100 text-gray-800';
};

const getPriorityColor = (priority: string) => {
  const colorClasses = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800'
  };
  return colorClasses[priority as keyof typeof colorClasses] || 'bg-gray-100 text-gray-800';
};

const getPaymentStatusColor = (status: string) => {
  const colorClasses = {
    pending: 'bg-red-100 text-red-800',
    partial: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    gst_pending: 'bg-orange-100 text-orange-800'
  };
  return colorClasses[status as keyof typeof colorClasses] || 'bg-gray-100 text-gray-800';
};

const POFromCustomerViewModal: React.FC<POFromCustomerViewModalProps> = ({
  po,
  isOpen,
  onClose,
  onEdit,
  onDelete
}) => {
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !po) return null;

  const handleDownloadPDF = () => {
    if (po.poPdf) {
      const link = document.createElement('a');
      link.href = po.poPdf;
      link.download = `PO-${po.poNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">PO From Customer Details</h2>
            <p className="text-sm text-gray-500 mt-1">PO Number: {po.poNumber}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(po._id)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => onDelete(po._id)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Basic Information */}
            <div className="space-y-6">
              {/* PO Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2" />
                  PO Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">PO Number</label>
                    <p className="text-sm text-gray-900 font-medium">{po.poNumber}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Department</label>
                    <p className="text-sm text-gray-900 capitalize">{po.department.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(po.status)}`}>
                      {po.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priority</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(po.priority)}`}>
                      {po.priority.charAt(0).toUpperCase() + po.priority.slice(1)}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Order Date</label>
                    <p className="text-sm text-gray-900">{formatDate(po.orderDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Expected Delivery</label>
                    <p className="text-sm text-gray-900">
                      {po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Customer Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Customer Name</label>
                    <p className="text-sm text-gray-900 font-medium">{po.customer.name}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{po.customer.email}</span>
                  </div>
                  {po.customer.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{po.customer.phone}</span>
                    </div>
                  )}
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div className="text-sm text-gray-900">
                      <p>{po.customerAddress.address}</p>
                      <p>{po.customerAddress.district}, {po.customerAddress.state} - {po.customerAddress.pincode}</p>
                      {po.customerAddress.gstNumber && (
                        <p className="text-gray-500">GST: {po.customerAddress.gstNumber}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quotation Information */}
              {po.quotationNumber && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Quotation Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Quotation Number</label>
                      <p className="text-sm text-gray-900 font-medium">{po.quotationNumber.quotationNumber}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Issue Date</label>
                      <p className="text-sm text-gray-900">{formatDate(po.quotationNumber.issueDate)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Quotation Total</label>
                      <p className="text-sm text-gray-900 font-medium">{formatCurrency(po.quotationNumber.grandTotal)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(po.quotationNumber.status)}`}>
                        {po.quotationNumber.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Amount</label>
                    <p className="text-sm text-gray-900 font-medium text-lg">{formatCurrency(po.totalAmount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Paid Amount</label>
                    <p className="text-sm text-gray-900 font-medium">{formatCurrency(po.paidAmount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Remaining Amount</label>
                    <p className="text-sm text-gray-900 font-medium">{formatCurrency(po.remainingAmount)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(po.paymentStatus)}`}>
                      {po.paymentStatus.charAt(0).toUpperCase() + po.paymentStatus.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Items and PDF */}
            <div className="space-y-6">
              {/* Items Table */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {po.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 text-sm text-gray-900">{index + 1}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-gray-500 text-xs">{item.product.partNo}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">{item.quantity} {item.uom || 'nos'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-3 py-2 text-sm text-gray-900 font-medium">{formatCurrency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-end">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        Total: {formatCurrency(po.totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* PDF Section */}
              {po.poPdf && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    PO Document
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-8 h-8 text-red-500" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">PO Document</p>
                          <p className="text-xs text-gray-500">PDF File</p>
                        </div>
                      </div>
                      <button
                        onClick={handleDownloadPDF}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700 transition-colors"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <iframe
                        src={po.poPdf}
                        className="w-full h-96"
                        title="PO Document"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {po.notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{po.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POFromCustomerViewModal;
