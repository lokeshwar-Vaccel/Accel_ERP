import React, { useState } from 'react';
import { X, Package, User, MapPin, DollarSign, Calendar, CheckCircle, XCircle, Clock, Truck } from 'lucide-react';
import { apiClient } from '../../utils/api';
import { Button } from './Botton';
import { Badge } from './Badge';
import TabbedNav from './TabbedNav';
import toast from 'react-hot-toast';

interface DGPurchaseOrderViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  purchaseOrder: any;
}

const DGPurchaseOrderViewModal: React.FC<DGPurchaseOrderViewModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  purchaseOrder
}) => {
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!purchaseOrder?._id) return;

    setUpdatingStatus(true);
    try {
      const response = await apiClient.dgSales.purchaseOrders.updateStatus(purchaseOrder._id, newStatus, 'Status updated from view modal');
      if (response.success) {
        toast.success(`Purchase Order status updated to ${newStatus}`);
        onSuccess();
        onClose();
      } else {
        toast.error(response.data?.message || 'Failed to update status');
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error('Error updating purchase order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'draft': return 'info';
      case 'sent': return 'warning';
      case 'confirmed': return 'success';
      case 'received': return 'success';
      case 'partially_received': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'info';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return Clock;
      case 'sent': return Package;
      case 'confirmed': return CheckCircle;
      case 'received': return CheckCircle;
      case 'partially_received': return Truck;
      case 'cancelled': return XCircle;
      default: return Clock;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount?.toLocaleString() || '0'}`;
  };

  if (!isOpen || !purchaseOrder) return null;

  const tabs = [
    { key: 'basic', label: 'Basic Info', icon: <Package className="w-4 h-4" /> },
    { key: 'customer', label: 'Customer', icon: <User className="w-4 h-4" /> },
    { key: 'supplier', label: 'Supplier', icon: <MapPin className="w-4 h-4" /> },
    { key: 'items', label: 'Items', icon: <DollarSign className="w-4 h-4" /> },
    { key: 'shipping', label: 'Shipping', icon: <Calendar className="w-4 h-4" /> }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              DG Purchase Order Details
            </h2>
            <Badge variant={getStatusBadgeVariant(purchaseOrder.status)}>
              {purchaseOrder.status}
            </Badge>
            <Badge variant="default">
              {purchaseOrder.priority}
            </Badge>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <TabbedNav
            tabs={tabs}
            activeTab="basic"
            onTabChange={() => {}}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">PO Number</label>
                  <p className="mt-1 text-sm text-gray-900">{purchaseOrder.poNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(purchaseOrder.orderDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Delivery</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(purchaseOrder.expectedDeliveryDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <p className="mt-1 text-sm text-gray-900 font-medium">{formatCurrency(purchaseOrder.totalAmount)}</p>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{purchaseOrder.customer?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{purchaseOrder.customer?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{purchaseOrder.customer?.phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">PAN</label>
                  <p className="mt-1 text-sm text-gray-900">{purchaseOrder.customer?.pan || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {purchaseOrder.customer?.address && (
                      <>
                        {purchaseOrder.customer.address}
                        {purchaseOrder.customer.pinCode && `, ${purchaseOrder.customer.pinCode}`}
                        {purchaseOrder.customer.tehsil && `, ${purchaseOrder.customer.tehsil}`}
                        {purchaseOrder.customer.district && `, ${purchaseOrder.customer.district}`}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Supplier Info */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Supplier Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
                  <p className="mt-1 text-sm text-gray-900">{purchaseOrder.supplier}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{purchaseOrder.supplierEmail}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {purchaseOrder.supplierAddress?.address && (
                      <>
                        {purchaseOrder.supplierAddress.address}
                        {purchaseOrder.supplierAddress.state && `, ${purchaseOrder.supplierAddress.state}`}
                        {purchaseOrder.supplierAddress.district && `, ${purchaseOrder.supplierAddress.district}`}
                        {purchaseOrder.supplierAddress.pincode && `, ${purchaseOrder.supplierAddress.pincode}`}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
              <div className="space-y-4">
                {purchaseOrder.items?.map((item: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Product</label>
                        <p className="mt-1 text-sm text-gray-900">{item.description}</p>
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
                        <label className="block text-sm font-medium text-gray-700">Total Price</label>
                        <p className="mt-1 text-sm text-gray-900 font-medium">{formatCurrency(item.totalPrice)}</p>
                      </div>
                      {item.notes && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Notes</label>
                          <p className="mt-1 text-sm text-gray-900">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-right">
                  <div className="text-lg font-medium">
                    Total Amount: {formatCurrency(purchaseOrder.totalAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Shipping Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ship Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(purchaseOrder.shipDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Docket Number</label>
                  <p className="mt-1 text-sm text-gray-900">{purchaseOrder.docketNumber || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Number of Packages</label>
                  <p className="mt-1 text-sm text-gray-900">{purchaseOrder.noOfPackages || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">GST Invoice Number</label>
                  <p className="mt-1 text-sm text-gray-900">{purchaseOrder.gstInvoiceNumber || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(purchaseOrder.invoiceDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Document Number</label>
                  <p className="mt-1 text-sm text-gray-900">{purchaseOrder.documentNumber || 'Not set'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Document Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(purchaseOrder.documentDate)}</p>
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            {(purchaseOrder.notes || purchaseOrder.terms) && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Notes & Terms</h3>
                {purchaseOrder.notes && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900">{purchaseOrder.notes}</p>
                  </div>
                )}
                {purchaseOrder.terms && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
                    <p className="mt-1 text-sm text-gray-900">{purchaseOrder.terms}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Status:</span>
            <Badge variant={getStatusBadgeVariant(purchaseOrder.status)}>
              {purchaseOrder.status}
            </Badge>
          </div>
          <div className="flex items-center space-x-3">
            {/* Status Update Buttons */}
            {purchaseOrder.status === 'draft' && (
              <Button
                onClick={() => handleStatusUpdate('sent')}
                disabled={updatingStatus}
                variant="primary"
              >
                Send PO
              </Button>
            )}
            {purchaseOrder.status === 'sent' && (
              <>
                <Button
                  onClick={() => handleStatusUpdate('confirmed')}
                  disabled={updatingStatus}
                  variant="primary"
                >
                  Confirm
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={updatingStatus}
                  variant="danger"
                >
                  Cancel
                </Button>
              </>
            )}
            {purchaseOrder.status === 'confirmed' && (
              <>
                <Button
                  onClick={() => handleStatusUpdate('received')}
                  disabled={updatingStatus}
                  variant="primary"
                >
                  Mark Received
                </Button>
                <Button
                  onClick={() => handleStatusUpdate('partially_received')}
                  disabled={updatingStatus}
                  variant="secondary"
                >
                  Partially Received
                </Button>
              </>
            )}
            <Button
              onClick={onClose}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DGPurchaseOrderViewModal; 