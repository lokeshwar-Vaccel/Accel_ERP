import React from 'react';
import { FileText, Calendar, Package, Truck, CreditCard, MapPin } from 'lucide-react';

interface InvoiceDetailsProps {
  invoice: any;
}

const InvoiceDetails: React.FC<InvoiceDetailsProps> = ({ invoice }) => {
  const isProforma = invoice?.invoiceType === 'proforma';
  
  // Only show if we have at least one invoice detail field
  const hasInvoiceDetails = 
    invoice?.irn || 
    invoice?.ackNumber || 
    invoice?.ackDate || 
    invoice?.deliveryNote || 
    invoice?.buyersOrderNumber || 
    invoice?.buyersOrderDate || 
    invoice?.dispatchDocNo || 
    invoice?.dispatchDocDate || 
    invoice?.dispatchedThrough || 
    invoice?.termsOfPayment || 
    invoice?.otherReferences || 
    invoice?.deliveryNoteDate || 
    invoice?.destination || 
    invoice?.termsOfDelivery || 
    invoice?.referenceNo || 
    invoice?.referenceDate;

  if (!hasInvoiceDetails) return null;

  const formatDate = (dateString: string | Date) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <h4 className="font-medium text-green-900 mb-3 flex items-center">
        <FileText className="w-4 h-4 mr-2" />
        {isProforma ? 'Proforma' : 'Invoice'} Details
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Invoice Number */}
        {invoice?.invoiceNumber && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
              {isProforma ? 'Proforma' : 'Invoice'} Number
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200 font-mono">
              {invoice.invoiceNumber}
            </p>
          </div>
        )}

        {/* IRN */}
        {invoice?.irn && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
              IRN ({isProforma ? 'Proforma' : 'Invoice'} Reference Number)
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200 font-mono">
              {invoice.irn}
            </p>
          </div>
        )}

        {/* Ack Number */}
        {invoice?.ackNumber && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
              Ack No (Acknowledgement Number)
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200 font-mono">
              {invoice.ackNumber}
            </p>
          </div>
        )}

        {/* Ack Date */}
        {invoice?.ackDate && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Ack Date (Acknowledgement Date)
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200">
              {formatDate(invoice.ackDate)}
            </p>
          </div>
        )}

        {/* Delivery Note */}
        {invoice?.deliveryNote && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1 flex items-center">
              <Package className="w-3 h-3 mr-1" />
              Delivery Note
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200">
              {invoice.deliveryNote}
            </p>
          </div>
        )}

        {/* Delivery Note Date */}
        {invoice?.deliveryNoteDate && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Delivery Note Date
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200">
              {formatDate(invoice.deliveryNoteDate)}
            </p>
          </div>
        )}

        {/* Buyer's Order Number */}
        {invoice?.buyersOrderNumber && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
              Buyer's Order Number
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200 font-mono">
              {invoice.buyersOrderNumber}
            </p>
          </div>
        )}

        {/* Buyer's Order Date */}
        {invoice?.buyersOrderDate && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Buyer's Order Date
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200">
              {formatDate(invoice.buyersOrderDate)}
            </p>
          </div>
        )}

        {/* Dispatch Doc No */}
        {invoice?.dispatchDocNo && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1 flex items-center">
              <Truck className="w-3 h-3 mr-1" />
              Dispatch Doc No
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200 font-mono">
              {invoice.dispatchDocNo}
            </p>
          </div>
        )}

        {/* Dispatch Doc Date */}
        {invoice?.dispatchDocDate && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Dispatch Doc Date
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200">
              {formatDate(invoice.dispatchDocDate)}
            </p>
          </div>
        )}

        {/* Dispatched Through */}
        {invoice?.dispatchedThrough && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1 flex items-center">
              <Truck className="w-3 h-3 mr-1" />
              Dispatched Through
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200">
              {invoice.dispatchedThrough}
            </p>
          </div>
        )}

        {/* Destination */}
        {invoice?.destination && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1 flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              Destination
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200">
              {invoice.destination}
            </p>
          </div>
        )}

        {/* Terms of Payment */}
        {invoice?.termsOfPayment && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1 flex items-center">
              <CreditCard className="w-3 h-3 mr-1" />
              Terms of Payment
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200">
              {invoice.termsOfPayment}
            </p>
          </div>
        )}

        {/* Other References */}
        {invoice?.otherReferences && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
              Other References
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200">
              {invoice.otherReferences}
            </p>
          </div>
        )}

        {/* Reference No */}
        {invoice?.referenceNo && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
              Reference No
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200 font-mono">
              {invoice.referenceNo}
            </p>
          </div>
        )}

        {/* Reference Date */}
        {invoice?.referenceDate && (
          <div>
            <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1 flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              Reference Date
            </label>
            <p className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200">
              {formatDate(invoice.referenceDate)}
            </p>
          </div>
        )}
      </div>

      {/* Terms of Delivery - Full width */}
      {invoice?.termsOfDelivery && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-green-700 uppercase tracking-wide mb-1 flex items-center">
            <Package className="w-3 h-3 mr-1" />
            Terms of Delivery
          </label>
          <div className="text-sm text-green-900 bg-white px-3 py-2 rounded border border-green-200">
            {invoice.termsOfDelivery}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetails;
