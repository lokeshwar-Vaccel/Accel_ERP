import React from 'react';
import { X, Download, Mail, Printer, Check, X as XIcon } from 'lucide-react';
import { Button } from './Botton';
import { Badge } from './Badge';
import TabbedNav from './TabbedNav';

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
  const [activeTab, setActiveTab] = React.useState('basic');
  const [updatingStatus, setUpdatingStatus] = React.useState(false);

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

  if (!isOpen || !quotation) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">
              DG Quotation Details
            </h2>
            {getStatusBadge(quotation.status)}
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              Email
            </Button>
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
          <TabbedNav
            tabs={[
              { key: 'basic', label: 'Basic Info', icon: '📋' },
              { key: 'customer', label: 'Customer', icon: '👤' },
              { key: 'dg-specs', label: 'DG Specifications', icon: '⚡' },
              { key: 'items', label: 'Items', icon: '📦' },
              { key: 'services', label: 'Services', icon: '🔧' },
              { key: 'terms', label: 'Terms & Notes', icon: '📝' }
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="mt-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quotation Information</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Quotation Number</label>
                        <p className="text-gray-900">{quotation.quotationNumber}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Issue Date</label>
                        <p className="text-gray-900">
                          {quotation.issueDate ? new Date(quotation.issueDate).toLocaleDateString() : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Valid Until</label>
                        <p className="text-gray-900">
                          {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Status</label>
                        <div className="mt-1">{getStatusBadge(quotation.status)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Summary</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">₹{quotation.subtotal?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-medium">₹{quotation.totalDiscount?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax:</span>
                        <span className="font-medium">₹{quotation.totalTax?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-lg font-semibold text-gray-900">Grand Total:</span>
                        <span className="text-lg font-semibold text-gray-900">
                          ₹{quotation.grandTotal?.toLocaleString() || '0'}
                        </span>
                      </div>
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
              </div>
            )}

            {activeTab === 'customer' && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Customer Name</label>
                      <p className="text-gray-900">{quotation.customer?.name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-gray-900">{quotation.customer?.email || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <p className="text-gray-900">{quotation.customer?.phone || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">PAN Number</label>
                      <p className="text-gray-900">{quotation.customer?.pan || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Corporate Name</label>
                      <p className="text-gray-900">{quotation.customer?.corporateName || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Address</label>
                      <p className="text-gray-900">{quotation.customer?.address || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">PIN Code</label>
                      <p className="text-gray-900">{quotation.customer?.pinCode || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">District</label>
                      <p className="text-gray-900">{quotation.customer?.district || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dg-specs' && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">DG Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">KVA Rating</label>
                      <p className="text-gray-900">{quotation.dgSpecifications?.kva || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phase</label>
                      <p className="text-gray-900">{quotation.dgSpecifications?.phase || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Quantity</label>
                      <p className="text-gray-900">{quotation.dgSpecifications?.quantity || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Fuel Type</label>
                      <p className="text-gray-900">{quotation.dgSpecifications?.fuelType || '-'}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Engine Model</label>
                      <p className="text-gray-900">{quotation.dgSpecifications?.engineModel || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Alternator Model</label>
                      <p className="text-gray-900">{quotation.dgSpecifications?.alternatorModel || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Fuel Tank Capacity</label>
                      <p className="text-gray-900">{quotation.dgSpecifications?.fuelTankCapacity || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Runtime</label>
                      <p className="text-gray-900">{quotation.dgSpecifications?.runtime || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'items' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Items</h3>
                {quotation.items && quotation.items.length > 0 ? (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
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
                        {quotation.items.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.product}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {item.quantity} {item.uom}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ₹{item.unitPrice?.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              ₹{(item.quantity * item.unitPrice)?.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No items added to this quotation
                  </div>
                )}
              </div>
            )}

            {activeTab === 'services' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Services</h3>
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
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {quotation.notes || 'No notes added'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Terms & Conditions</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {quotation.terms || 'No terms and conditions specified'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Delivery Terms</h4>
                    <p className="text-gray-700 text-sm">
                      {quotation.deliveryTerms || 'Standard delivery terms apply'}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Terms</h4>
                    <p className="text-gray-700 text-sm">
                      {quotation.paymentTerms || 'Standard payment terms apply'}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Warranty Terms</h4>
                    <p className="text-gray-700 text-sm">
                      {quotation.warrantyTerms || 'Standard warranty terms apply'}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Installation Terms</h4>
                    <p className="text-gray-700 text-sm">
                      {quotation.installationTerms || 'Standard installation terms apply'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Created on {quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString() : '-'}
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DGQuotationViewModal; 