import React from 'react';
import { X, Calendar, User, MapPin, Package, DollarSign, FileText, Download } from 'lucide-react';
import { Button } from './Botton';
import { Badge } from './Badge';

interface DGProformaViewModalProps {
  proforma: any;
  onClose: () => void;
}

const DGProformaViewModal: React.FC<DGProformaViewModalProps> = ({
  proforma,
  onClose
}) => {
  if (!proforma) return null;

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
      'Draft': 'bg-gray-100 text-gray-800',
      'Sent': 'bg-blue-100 text-blue-800',
      'Accepted': 'bg-green-100 text-green-800',
      'Rejected': 'bg-red-100 text-red-800',
      'Expired': 'bg-orange-100 text-orange-800'
    };
    return colorClasses[status as keyof typeof colorClasses] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentStatusColor = (status: string) => {
    const colorClasses = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Partial': 'bg-blue-100 text-blue-800',
      'Paid': 'bg-green-100 text-green-800',
      'Overdue': 'bg-red-100 text-red-800'
    };
    return colorClasses[status as keyof typeof colorClasses] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Proforma Details</h2>
            <p className="text-gray-600">Proforma #{proforma.proformaNumber}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Close
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Proforma Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Proforma Information
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Proforma Number</label>
                  <p className="text-sm text-gray-900">{proforma.proformaNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Proforma Date</label>
                  <p className="text-sm text-gray-900">{formatDate(proforma.proformaDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Valid Until</label>
                  <p className="text-sm text-gray-900">{formatDate(proforma.validUntil)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={getStatusColor(proforma.status)}>
                    {proforma.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Status</label>
                  <Badge className={getPaymentStatusColor(proforma.paymentStatus)}>
                    {proforma.paymentStatus}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Payment Terms</label>
                  <p className="text-sm text-gray-900">{proforma.paymentTerms}</p>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer Information
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer Name</label>
                  <p className="text-sm text-gray-900">{proforma.customer?.name || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900">{proforma.customerEmail}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-sm text-gray-900">{proforma.customer?.phone || 'N/A'}</p>
                </div>
                {proforma.customerAddress && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address</label>
                    <p className="text-sm text-gray-900">
                      {proforma.customerAddress.address}, {proforma.customerAddress.district}, {proforma.customerAddress.state} - {proforma.customerAddress.pincode}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Financial Summary
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Subtotal:</span>
                  <span className="text-sm text-gray-900">{formatCurrency(proforma.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Total Discount:</span>
                  <span className="text-sm text-gray-900">{formatCurrency(proforma.totalDiscount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Tax Rate:</span>
                  <span className="text-sm text-gray-900">{proforma.taxRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Tax Amount:</span>
                  <span className="text-sm text-gray-900">{formatCurrency(proforma.taxAmount)}</span>
                </div>
                {proforma.additionalCharges && (
                  <>
                    {proforma.additionalCharges.freight > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Freight:</span>
                        <span className="text-sm text-gray-900">{formatCurrency(proforma.additionalCharges.freight)}</span>
                      </div>
                    )}
                    {proforma.additionalCharges.insurance > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Insurance:</span>
                        <span className="text-sm text-gray-900">{formatCurrency(proforma.additionalCharges.insurance)}</span>
                      </div>
                    )}
                    {proforma.additionalCharges.packing > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Packing:</span>
                        <span className="text-sm text-gray-900">{formatCurrency(proforma.additionalCharges.packing)}</span>
                      </div>
                    )}
                    {proforma.additionalCharges.other > 0 && (
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Other:</span>
                        <span className="text-sm text-gray-900">{formatCurrency(proforma.additionalCharges.other)}</span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                  <span className="text-lg font-semibold text-gray-900">{formatCurrency(proforma.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Items ({proforma.items?.length || 0})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      KVA
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Phase
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Unit Price
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {proforma.items?.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b">
                        {item.product || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 border-b">
                        <div className="max-w-xs truncate" title={item.description}>
                          {item.description || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900 border-b">
                        {item.kva || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900 border-b">
                        {item.phase || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900 border-b">
                        {item.quantity || 0}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-900 border-b">
                        {formatCurrency(item.unitPrice || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 border-b">
                        {formatCurrency(item.totalPrice || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {proforma.notes && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
              <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                {proforma.notes}
              </p>
            </div>
          )}

          {/* PDF Section */}
          {proforma.proformaPdf && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Proforma PDF</h3>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                <span className="text-sm text-gray-700">Proforma PDF available</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(proforma.proformaPdf, '_blank')}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DGProformaViewModal;