import React, { useState, useEffect } from 'react';
import { X, FileText, Package, RefreshCw, AlertTriangle } from 'lucide-react';
import ItemsTable from './ItemsTable';
import ServiceChargesTable from './ServiceChargesTable';
import BatteryBuybackTable from './BatteryBuybackTable';
import DocumentSummary from './DocumentSummary';
import InvoiceDetails from './InvoiceDetails';

interface DocumentViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: any; // Invoice or Quotation
  documentType: 'invoice' | 'quotation';
  onPrint: (document: any) => void;
  onCreateInvoice?: (quotation: any) => void;
  onCreateProforma?: (quotation: any) => void;
  onSendEmail?: (document: any) => void;
  onCreateChallan?: (invoice: any) => void;
  onSaveChanges?: (document: any) => Promise<boolean>;
  paymentHistory?: any[];
  onRefreshPayments?: () => void;
  loadingPayments?: boolean;
  renderPaymentHistory?: () => React.ReactNode;
  getStatusColor: (status: string) => string;
  getPaymentStatusColor: (status: string) => string;
  getPrimaryAddressEmail: (customer: any) => string | null;
  numberToWords: (amount: number) => string;
  navigate?: any;
  // Edit mode props
  onItemEdit?: (index: number, field: string, value: any) => void;
  onRecalculateItem?: (index: number) => void;
  onAutoAdjustTaxRates?: () => void;
  onAutoAdjustUnitPrice?: () => void;
}

const DocumentViewModal: React.FC<DocumentViewModalProps> = ({
  isOpen,
  onClose,
  document,
  documentType,
  onPrint,
  onCreateInvoice,
  onCreateProforma,
  onSendEmail,
  onCreateChallan,
  onSaveChanges,
  paymentHistory,
  onRefreshPayments,
  loadingPayments,
  renderPaymentHistory,
  getStatusColor,
  getPaymentStatusColor,
  getPrimaryAddressEmail,
  numberToWords,
  navigate,
  onItemEdit,
  onRecalculateItem,
  onAutoAdjustTaxRates,
  onAutoAdjustUnitPrice
}) => {
  const [editMode, setEditMode] = useState(false);
  const [originalDocumentData, setOriginalDocumentData] = useState<any>(null);
  const [savingChanges, setSavingChanges] = useState(false);

  console.log("document123:",document);
  
  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditMode(false);
      setOriginalDocumentData(null);
    }
  }, [isOpen]);

  if (!isOpen || !document) return null;

  const isInvoice = documentType === 'invoice';
  const isQuotation = documentType === 'quotation';
  const isProforma = isInvoice && document.invoiceType === 'proforma';

  const hasAmountMismatch = (doc: any) => {
    return isInvoice && doc.externalInvoiceTotal && doc.totalAmount && 
           Math.abs(doc.externalInvoiceTotal - doc.totalAmount) > 0.01;
  };

  const handleSaveChanges = async () => {
    if (!onSaveChanges) return false;
    setSavingChanges(true);
    try {
      const success = await onSaveChanges(document);
      return success;
    } finally {
      setSavingChanges(false);
    }
  };

  const renderHeader = () => (
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <h2 className="text-xl font-semibold text-gray-900">
        {isProforma ? 'Proforma' : isInvoice ? 'Invoice' : 'Quotation'} - {document.invoiceNumber || document.quotationNumber}
      </h2>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPrint(document)}
          className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
        
        {isInvoice && document.invoiceType === 'sale' && onCreateChallan && (
          <button
            onClick={() => {
              onClose();
              onCreateChallan(document);
            }}
            className="flex items-center px-3 py-1 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700"
            title="Create Delivery Challan from this Invoice"
          >
            <Package className="w-4 h-4 mr-1" />
            Create Challan
          </button>
        )}

        {isQuotation && onCreateInvoice && (
          <button
            onClick={() => onCreateInvoice(document)}
            className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Invoice
          </button>
        )}

        {isQuotation && onCreateProforma && (
          <button
            onClick={() => onCreateProforma(document)}
            className="flex items-center px-3 py-1 text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Create Proforma
          </button>
        )}

        {isProforma && onCreateInvoice && (
          <button
            onClick={() => onCreateInvoice(document)}
            className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Invoice
          </button>
        )}

        {onSendEmail && (
          <button
            onClick={() => onSendEmail(document)}
            disabled={!getPrimaryAddressEmail(document.customer)}
            className={`flex items-center px-3 py-1 text-sm rounded-md ${
              getPrimaryAddressEmail(document.customer)
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
            title={getPrimaryAddressEmail(document.customer) ? 
              `Send ${isProforma ? 'proforma' : isInvoice ? 'invoice' : 'quotation'} to customer` : 
              'Customer email not available'
            }
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send Email
          </button>
        )}

        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  );

  const renderDocumentHeader = () => (
    <div className="border-b border-gray-200 pb-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {isProforma ? 'Proforma' : isInvoice ? 'Invoice' : 'Quotation'} #{document.invoiceNumber || document.quotationNumber}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Issue Date: {document.issueDate ? new Date(document.issueDate).toLocaleDateString() : ''}
          </p>
          {isInvoice ? (
            <p className="text-sm text-gray-600">
              Due Date: {document.dueDate ? new Date(document.dueDate).toLocaleDateString() : ''}
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Valid Until: {document.validUntil ? new Date(document.validUntil).toLocaleDateString() : ''}
              </p>
              <p className="text-sm text-gray-600">
                Validity Period: {document.validityPeriod || 30} days
              </p>
            </>
          )}
          {isInvoice && document.invoiceType === 'purchase' && document.poNumber && (
            <p className="text-sm text-gray-600 mt-1">
              PO Number: {document.poNumber}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="flex space-x-2 mb-2">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(document.status ?? '')}`}>
              {(document.status ?? '').charAt(0).toUpperCase() + (document.status ?? '').slice(1)}
            </span>
            {isInvoice && (
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getPaymentStatusColor(document.paymentStatus ?? '')}`}>
                {(document.paymentStatus ?? '').charAt(0).toUpperCase() + (document.paymentStatus ?? '').slice(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl m-4 max-h-[90vh] overflow-y-auto">
        {renderHeader()}
        <div className="p-6 space-y-6">
          {renderDocumentHeader()}
          
          {/* Reference Information Section */}
          {(document.sourceQuotation || document.sourceProforma || document.poFromCustomer) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 print:bg-white print:border-gray-400">
              <h4 className="font-medium text-gray-900 mb-3 print:text-black">Reference Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {document.quotationNumber && (
                  <div className="bg-white border border-blue-200 rounded-lg p-3 print:border-gray-300">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 print:bg-gray-100">
                        <FileText className="w-3 h-3 text-blue-600 print:text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-blue-900 print:text-black">Quotation</span>
                    </div>
                    <div className="text-sm">
                      <div className="font-mono text-blue-700 print:text-black">
                        Quotation Number: {document.sourceQuotation?.quotationNumber}
                      </div>
                      {document.sourceQuotation?.issueDate && (
                        <div className="text-gray-600 print:text-black mt-1">
                          Issue Date: {new Date(document.sourceQuotation.issueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {document.proformaNumber && (
                  <div className="bg-white border border-purple-200 rounded-lg p-3 print:border-gray-300">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-2 print:bg-gray-100">
                        <FileText className="w-3 h-3 text-purple-600 print:text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-purple-900 print:text-black">Proforma</span>
                    </div>
                    <div className="text-sm">
                      <div className="font-mono text-purple-700 print:text-black">
                        Proforma Number: {document.sourceProforma?.invoiceNumber || document.proformaNumber}
                      </div>
                      {document.sourceProforma?.issueDate && (
                        <div className="text-gray-600 print:text-black mt-1">
                          Issue Date: {new Date(document.sourceProforma.issueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {document.poFromCustomer?.poNumber && (
                  <div className="bg-white border border-green-200 rounded-lg p-3 print:border-gray-300">
                    <div className="flex items-center mb-2">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2 print:bg-gray-100">
                        <FileText className="w-3 h-3 text-green-600 print:text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-green-900 print:text-black">PO From Customer</span>
                    </div>
                    <div className="text-sm">
                      <div className="font-mono text-green-700 print:text-black">
                        Po Number: {document.poFromCustomer.poNumber}
                      </div>
                      {document.poFromCustomer.orderDate && (
                        <div className="text-gray-600 print:text-black mt-1">
                          Order Date: {new Date(document.poFromCustomer.orderDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Document Details Section */}
          {(document.subject || document.engineSerialNumber || document.kva || document.hourMeterReading || document.serviceRequestDate || document.qrCodeImage) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                {isProforma ? 'Proforma' : isInvoice ? 'Invoice' : 'Quotation'} Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {document.subject && (
                  <div>
                    <label className="block text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Subject</label>
                    <p className="text-sm text-blue-900 bg-white px-3 py-2 rounded border border-blue-200">
                      {document.subject}
                    </p>
                  </div>
                )}
                {document.engineSerialNumber && (
                  <div>
                    <label className="block text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Engine Serial Number</label>
                    <p className="text-sm text-blue-900 bg-white px-3 py-2 rounded border border-blue-200">
                      {document.engineSerialNumber}
                    </p>
                  </div>
                )}
                {document.kva && (
                  <div>
                    <label className="block text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">KVA Rating</label>
                    <p className="text-sm text-blue-900 bg-white px-3 py-2 rounded border border-blue-200">
                      {document.kva}
                    </p>
                  </div>
                )}
                {document.hourMeterReading && (
                  <div>
                    <label className="block text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Hour Meter Reading</label>
                    <p className="text-sm text-blue-900 bg-white px-3 py-2 rounded border border-blue-200">
                      {document.hourMeterReading}
                    </p>
                  </div>
                )}
                {document.serviceRequestDate && (
                  <div>
                    <label className="block text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Service Request Date</label>
                    <p className="text-sm text-blue-900 bg-white px-3 py-2 rounded border border-blue-200">
                      {new Date(document.serviceRequestDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {document.qrCodeImage && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">QR Code Image</label>
                    <div className="bg-white p-3 rounded border border-blue-200">
                      <img
                        src={document.qrCodeImage}
                        alt="QR Code"
                        className="max-w-xs max-h-48 rounded border border-gray-200 shadow-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invoice Details Section - Only for Sale and Proforma Invoices */}
          {isInvoice && (document.invoiceType === 'sale' || document.invoiceType === 'proforma') && (
            <InvoiceDetails invoice={document} />
          )}

          {/* Amount Mismatch Warning - Only for Invoices */}
          {isInvoice && hasAmountMismatch(document) && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-yellow-800">Amount Mismatch Detected</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Calculated Total: ₹{(document?.totalAmount ?? 0).toFixed(2)} |
                    External Total: ₹{(document?.externalInvoiceTotal ?? 0).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (hasAmountMismatch(document)) {
                      if (document && !originalDocumentData) {
                        setOriginalDocumentData(JSON.parse(JSON.stringify(document)));
                      }
                      setEditMode(true);
                    }
                  }}
                  className={`ml-3 px-3 py-1 rounded-md text-sm transition-colors ${
                    hasAmountMismatch(document)
                      ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!hasAmountMismatch(document)}
                >
                  Edit Items
                </button>
              </div>
            </div>
          )}

          {/* Company Information */}
          <div className={`grid grid-cols-1 gap-6 ${document?.assignedEngineer ? 'md:grid-cols-4' : document?.invoiceType === 'purchase' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
            {/* From Section */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">From:</h4>
              {document?.invoiceType === 'purchase' ? (
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{document?.supplier?.name || 'N/A'}</p>
                  {(document?.supplierEmail || document?.supplier?.email) && <p>Email: {document?.supplierEmail || document?.supplier?.email}</p>}
                  {document?.supplierAddress && (
                    <>
                      <p className="mt-2 font-medium text-gray-700">Address:</p>
                      {document?.supplierAddress?.address && <p>{document?.supplierAddress?.address}</p>}
                      {document?.supplierAddress?.district && document?.supplierAddress?.pincode && (
                        <p>{document?.supplierAddress?.district}, {document?.supplierAddress?.pincode}</p>
                      )}
                      {document?.supplierAddress?.state && <p>{document?.supplierAddress?.state}</p>}
                      {document?.supplierAddress?.gstNumber && (
                        <p className="text-sm text-gray-600">GST: {document?.supplierAddress?.gstNumber}</p>
                      )}
                      {document?.supplierAddress?.isPrimary && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mt-1">
                          Primary Address
                        </span>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{document?.company?.name || 'Sun Power Services'}</p>
                  {document?.company?.phone && <p>Phone: {document?.company?.phone}</p>}
                  {document?.company?.email && <p>Email: {document?.company?.email}</p>}
                  {document?.company?.pan && <p>PAN: {document?.company?.pan}</p>}
                  {document?.location && (
                    <>
                      <p className="mt-2 font-medium text-gray-700">Address:</p>
                      {document?.location?.name && <p>{document?.location?.name}</p>}
                      {document?.location?.address && <p>{document?.location?.address}</p>}
                    </>
                  )}
                  {document?.company?.bankDetails && (
                    document.company.bankDetails.bankName ||
                    document.company.bankDetails.accountNo ||
                    document.company.bankDetails.ifsc ||
                    document.company.bankDetails.branch
                  ) && (
                    <>
                      <p className="mt-3 font-medium text-gray-700">Bank Details:</p>
                      {document?.company?.bankDetails?.bankName && (
                        <p className="text-sm text-gray-600">Bank: {document.company.bankDetails.bankName}</p>
                      )}
                      {document?.company?.bankDetails?.accountNo && (
                        <p className="text-sm text-gray-600">A/C: {document.company.bankDetails.accountNo}</p>
                      )}
                      {document?.company?.bankDetails?.ifsc && (
                        <p className="text-sm text-gray-600">IFSC: {document.company.bankDetails.ifsc}</p>
                      )}
                      {document?.company?.bankDetails?.branch && (
                        <p className="text-sm text-gray-600">Branch: {document.company.bankDetails.branch}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bill To Section */}
            <div>
              {document?.invoiceType === 'purchase' ? (
                <div className="text-sm text-gray-600">
                  <h4 className="font-medium text-gray-900 mb-2">To:</h4>
                  <p className="font-medium">{document?.company?.name || 'Sun Power Services'}</p>
                  {document?.company?.phone && <p>Phone: {document?.company?.phone}</p>}
                  {document?.company?.email && <p>Email: {document?.company?.email}</p>}
                  {document?.company?.pan && <p>PAN: {document?.company?.pan}</p>}
                  {document?.location && (
                    <>
                      <p className="mt-2 font-medium text-gray-700">Address:</p>
                      {document?.location?.name && <p>{document?.location?.name}</p>}
                      {document?.location?.address && <p>{document?.location?.address}</p>}
                      {document?.location?.gstNumber && (
                        <p className="text-sm text-gray-600">GST: {document?.location?.gstNumber}</p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  <h4 className="font-medium text-gray-900 mb-2">Bill To:</h4>
                  <p className="font-medium">{document?.customer?.name || 'N/A'}</p>
                  {(getPrimaryAddressEmail(document?.customer) || document?.customer?.email) && (
                    <p>Email: {getPrimaryAddressEmail(document?.customer) || document?.customer?.email}</p>
                  )}
                  {document?.customer?.phone && <p>Phone: {document?.customer?.phone}</p>}
                  {document?.billToAddress && (
                    <>
                      <p className="mt-2 font-medium text-gray-700">Address:</p>
                      {document?.billToAddress?.address && <p>{document?.billToAddress?.address}</p>}
                      {document?.billToAddress?.district && document?.billToAddress?.pincode && (
                        <p>{document?.billToAddress?.district}, {document?.billToAddress?.pincode}</p>
                      )}
                      {document?.billToAddress?.state && <p>{document?.billToAddress?.state}</p>}
                      {document?.billToAddress?.gstNumber && (
                        <p className="text-sm text-gray-600">GST: {document?.billToAddress?.gstNumber}</p>
                      )}
                      {document?.billToAddress?.isPrimary && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mt-1">
                          Primary Address
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Ship To Section */}
            {document?.invoiceType !== 'purchase' && (
              <div>
                <div className="text-sm text-gray-600">
                  <h4 className="font-medium text-gray-900 mb-2">Ship To:</h4>
                  <p className="font-medium">{document?.customer?.name || 'N/A'}</p>
                  {document?.shipToAddress && (
                    <>
                      <p className="mt-2 font-medium text-gray-700">Address:</p>
                      {document?.shipToAddress?.address && <p>{document?.shipToAddress?.address}</p>}
                      {document?.shipToAddress?.district && document?.shipToAddress?.pincode && (
                        <p>{document?.shipToAddress?.district}, {document?.shipToAddress?.pincode}</p>
                      )}
                      {document?.shipToAddress?.state && <p>{document?.shipToAddress?.state}</p>}
                      {document?.shipToAddress?.gstNumber && (
                        <p className="text-sm text-gray-600">GST: {document?.shipToAddress?.gstNumber}</p>
                      )}
                      {document?.shipToAddress?.isPrimary && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mt-1">
                          Primary Address
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Assigned Engineer Section */}
            {document?.assignedEngineer && (
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Assigned Engineer:</h4>
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{document.assignedEngineer?.firstName} {document.assignedEngineer?.lastName}</p>
                  {document.assignedEngineer?.email && <p>Email: {document.assignedEngineer?.email}</p>}
                  {document.assignedEngineer?.phone && <p>Phone: {document.assignedEngineer?.phone}</p>}
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Field Engineer
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Items Table */}
          <ItemsTable
            items={document.items || []}
            documentType={documentType}
            editMode={editMode}
            hasAmountMismatch={hasAmountMismatch(document)}
            onItemEdit={onItemEdit}
            onRecalculateItem={onRecalculateItem}
            onAutoAdjustTaxRates={onAutoAdjustTaxRates}
            onAutoAdjustUnitPrice={onAutoAdjustUnitPrice}
          />

          {/* Service Charges Table */}
          <ServiceChargesTable serviceCharges={document.serviceCharges || []} />

          {/* Battery Buyback Table */}
          <BatteryBuybackTable batteryBuyBack={document.batteryBuyBack} />

          {/* Document Summary */}
          <DocumentSummary
            document={document}
            documentType={documentType}
            hasAmountMismatch={hasAmountMismatch(document)}
            numberToWords={numberToWords}
          />

          {/* Notes and Terms Section */}
          {(document.notes || document.terms) && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Additional Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {document.notes && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Notes:</h5>
                    <div className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                      {document.notes}
                    </div>
                  </div>
                )}
                {document.terms && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Terms & Conditions:</h5>
                    <div className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                      {document.terms}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Mode Actions - Only for Invoices */}
          {isInvoice && editMode && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <p>Make adjustments to unit prices and tax rates.</p>
                  {hasAmountMismatch(document) && (
                    <p className="font-medium mt-1">Target Total: ₹{(document?.externalInvoiceTotal ?? 0).toFixed(2)}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      if (originalDocumentData) {
                        // Restore original values when canceling
                        // This would need to be handled by parent component
                        setEditMode(false);
                      }
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const success = await handleSaveChanges();
                      if (success) {
                        if (document) {
                          setOriginalDocumentData(JSON.parse(JSON.stringify(document)));
                        }
                        setEditMode(false);
                      }
                    }}
                    disabled={savingChanges}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingChanges ? (
                      <div className="flex items-center">
                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                        Saving...
                      </div>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Payment History</h3>
              <button
                onClick={onRefreshPayments}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                disabled={loadingPayments}
              >
                <RefreshCw className={`w-4 h-4 ${loadingPayments ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              {renderPaymentHistory?.()}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DocumentViewModal;
