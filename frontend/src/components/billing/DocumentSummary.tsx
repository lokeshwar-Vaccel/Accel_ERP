import React from 'react';

interface DocumentSummaryProps {
  document: any;
  documentType: 'invoice' | 'quotation';
  hasAmountMismatch?: boolean;
  numberToWords: (amount: number) => string;
}

const DocumentSummary: React.FC<DocumentSummaryProps> = ({
  document,
  documentType,
  hasAmountMismatch = false,
  numberToWords
}) => {
  const safeToFixed = (val: any, digits = 2) => {
    const num = typeof val === 'number' ? val : parseFloat(val);
    return isNaN(num) ? '0.00' : num.toFixed(digits);
  };

  // Calculate totals properly
  const calculateTotals = () => {
    // Items calculation
    const itemsSubtotal = (document.items || []).reduce((sum: number, item: any) => {
      const basicAmount = (item.unitPrice || 0) * (item.quantity || 0);
      const discountAmount = basicAmount * ((item.discount || 0) / 100);
      return sum + (basicAmount - discountAmount);
    }, 0);
    
    const itemsTax = (document.items || []).reduce((sum: number, item: any) => {
      const basicAmount = (item.unitPrice || 0) * (item.quantity || 0);
      const discountAmount = basicAmount * ((item.discount || 0) / 100);
      const finalAmount = basicAmount - discountAmount;
      return sum + (finalAmount * ((item.taxRate || 0) / 100));
    }, 0);

    // Service calculation
    const serviceSubtotal = (document.serviceCharges || []).reduce((sum: number, service: any) => {
      const basicAmount = (service.unitPrice || 0) * (service.quantity || 0);
      const discountAmount = basicAmount * ((service.discount || 0) / 100);
      return sum + (basicAmount - discountAmount);
    }, 0);
    
    const serviceTax = (document.serviceCharges || []).reduce((sum: number, service: any) => {
      const basicAmount = (service.unitPrice || 0) * (service.quantity || 0);
      const discountAmount = basicAmount * ((service.discount || 0) / 100);
      const finalAmount = basicAmount - discountAmount;
      return sum + (finalAmount * ((service.taxRate || 0) / 100));
    }, 0);

    // Battery calculation
    const batteryAmount = document.batteryBuyBack && document.batteryBuyBack.quantity > 0 
      ? (document.batteryBuyBack.totalPrice || 0) 
      : 0;

    const totalSubtotal = itemsSubtotal + serviceSubtotal;
    const totalTax = itemsTax + serviceTax;
    const finalTotal = totalSubtotal + totalTax - batteryAmount;

    return {
      itemsSubtotal,
      itemsTax,
      itemsTotal: itemsSubtotal + itemsTax,
      serviceSubtotal,
      serviceTax,
      serviceTotal: serviceSubtotal + serviceTax,
      batteryAmount,
      totalSubtotal,
      totalTax,
      finalTotal
    };
  };

  const totals = calculateTotals();

  return (
    <div className="border-t border-gray-200 pt-4">
      <div className="flex justify-end">
        <div className="w-96 space-y-2 text-right">
          
          {/* Items Breakdown */}
          {document.items && document.items.length > 0 && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h5 className="text-sm font-semibold text-gray-700 mb-2">Items Summary</h5>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Items Basic Amount:</span>
                <span>₹{totals.itemsSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Items Tax:</span>
                <span>₹{totals.itemsTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t pt-1">
                <span>Items Total:</span>
                <span className="text-blue-600">₹{totals.itemsTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Service Charges Breakdown */}
          {document.serviceCharges && document.serviceCharges.length > 0 && (
            <div className="bg-green-50 p-3 rounded-lg">
              <h5 className="text-sm font-semibold text-green-700 mb-2">Service Charges Summary</h5>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Service Basic Amount:</span>
                <span>₹{totals.serviceSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Service Tax:</span>
                <span>₹{totals.serviceTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t pt-1">
                <span>Service Total:</span>
                <span className="text-green-600">₹{totals.serviceTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Battery Buyback Breakdown */}
          {document.batteryBuyBack && document.batteryBuyBack.quantity > 0 && (
            <div className="bg-orange-50 p-3 rounded-lg">
              <h5 className="text-sm font-semibold text-orange-700 mb-2">Battery Buyback Summary</h5>
              {(() => {
                const batteryBasic = (document.batteryBuyBack.unitPrice || 0) * (document.batteryBuyBack.quantity || 0);
                const batteryDiscount = batteryBasic * ((document.batteryBuyBack.discount || 0) / 100);
                const batteryFinal = batteryBasic - batteryDiscount;
                const batteryTax = batteryFinal * ((document.batteryBuyBack.taxRate || 0) / 100);
                const batteryTotal = batteryFinal + batteryTax;

                return (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Battery Basic Amount:</span>
                      <span>₹{batteryBasic.toFixed(2)}</span>
                    </div>
                    {batteryDiscount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">Battery Discount:</span>
                        <span className="text-red-600">-₹{batteryDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Battery Tax:</span>
                      <span>₹{batteryTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium border-t pt-1">
                      <span>Battery Buyback Total:</span>
                      <span className="text-orange-600">-₹{batteryTotal.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {/* Overall Summary */}
          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <h5 className="text-sm font-semibold text-blue-800 mb-3">Final Summary</h5>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Subtotal (Before Tax):</span>
              <span className="font-medium">₹{totals.totalSubtotal.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-700">Total Tax (GST):</span>
              <span className="font-medium">₹{totals.totalTax.toFixed(2)}</span>
            </div>

            {totals.batteryAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Battery Buyback Deduction:</span>
                <span className="font-medium text-orange-600">-₹{totals.batteryAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-lg border-t-2 border-blue-300 pt-2 mt-2">
              <span className="text-blue-800">Grand Total:</span>
              <span className={hasAmountMismatch ? 'text-red-600' : 'text-blue-600'}>
                ₹{totals.finalTotal.toFixed(2)}
              </span>
            </div>

            {hasAmountMismatch && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>External Total:</span>
                <span>₹{safeToFixed(document?.externalInvoiceTotal)}</span>
              </div>
            )}

            <div className="flex justify-between text-xs pt-2 border-t">
              <span className="text-gray-600">Amount in Words:</span>
              <span className="font-medium text-gray-700 max-w-xs text-right">
                {totals.finalTotal ? numberToWords(totals.finalTotal) : 'Zero Rupees Only'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSummary;
