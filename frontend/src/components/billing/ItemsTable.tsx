import React from 'react';

interface ItemsTableProps {
  items: any[];
  documentType: 'invoice' | 'quotation';
  editMode?: boolean;
  hasAmountMismatch?: boolean;
  onItemEdit?: (index: number, field: string, value: any) => void;
  onRecalculateItem?: (index: number) => void;
  onAutoAdjustTaxRates?: () => void;
  onAutoAdjustUnitPrice?: () => void;
}

const ItemsTable: React.FC<ItemsTableProps> = ({
  items,
  documentType,
  editMode = false,
  hasAmountMismatch = false,
  onItemEdit,
  onRecalculateItem,
  onAutoAdjustTaxRates,
  onAutoAdjustUnitPrice
}) => {
  if (!items || items.length === 0) return null;

  const hasDiscount = items.some((item: any) => (item.discount || 0) > 0);

  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-3">Items:</h4>
      <div className="overflow-x-auto">
        <table className="w-full border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sr.No</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part No</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">HSN Code</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">UOM</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Basic Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Basic</th>
              {hasDiscount && (
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Discount %</th>
              )}
              {hasDiscount && (
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Final Amount</th>
              )}
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST %</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">GST Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Amount</th>
              {editMode && hasAmountMismatch && (
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(() => {
              let totalQty = 0;
              let totalBasicSum = 0;
              let totalDiscountSum = 0;
              let totalFinalSum = 0;
              let totalGstSum = 0;
              let totalAmountSum = 0;

              return (
                <>
                  {items.map((item: any, index: number) => {
                    const basicAmount = item.unitPrice || 0;
                    const quantity = item.quantity || 0;
                    const totalBasic = basicAmount * quantity;
                    const discountAmount = totalBasic * ((item.discount || 0) / 100);
                    const finalAmount = totalBasic - discountAmount;
                    const gstAmount = finalAmount * ((item.taxRate || 0) / 100);
                    const totalAmount = finalAmount + gstAmount;

                    // Add to running totals
                    totalQty += quantity;
                    totalBasicSum += totalBasic;
                    totalDiscountSum += discountAmount;
                    totalFinalSum += finalAmount;
                    totalGstSum += gstAmount;
                    totalAmountSum += totalAmount;

                    return (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.partNo || item?.product?.partNo || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.hsnNumber || item?.product?.hsnNumber || 'N/A'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.uom || 'NOS'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {editMode && hasAmountMismatch ? (
                            <input
                              type="number"
                              placeholder="₹0.00"
                              value={item.unitPrice === null || item.unitPrice === 0 ? '' : item.unitPrice}
                              onChange={(e) => onItemEdit?.(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              onBlur={() => onRecalculateItem?.(index)}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              step="1"
                            />
                          ) : (
                            `₹${basicAmount.toFixed(2)}`
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">₹{totalBasic.toFixed(2)}</td>
                        {hasDiscount && (
                          <td className="px-4 py-2 text-sm text-gray-900">{item.discount || 0}%</td>
                        )}
                        {hasDiscount && (
                          <td className="px-4 py-2 text-sm text-gray-900">₹{finalAmount.toFixed(2)}</td>
                        )}
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {editMode && hasAmountMismatch ? (
                            <input
                              type="number"
                              value={item.taxRate === null || item.taxRate === 0 ? '' : item.taxRate}
                              placeholder="0 - 100%"
                              onChange={(e) => {
                                const value = e.target.value;
                                const num = parseFloat(value);
                                if (value === '') {
                                  onItemEdit?.(index, 'taxRate', null);
                                } else if (!isNaN(num) && num >= 0 && num <= 100) {
                                  onItemEdit?.(index, 'taxRate', num);
                                }
                              }}
                              className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            `${(item.taxRate || 0).toFixed(2)}%`
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">₹{gstAmount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">₹{totalAmount.toFixed(2)}</td>
                        {editMode && hasAmountMismatch && item.quantity !== 0 && (
                          <td className="px-4 py-2 flex text-sm">
                            <button
                              onClick={onAutoAdjustTaxRates}
                              className="ml-3 bg-indigo-600 text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-700"
                            >
                              Auto Adjust Tax
                            </button>
                            <button
                              onClick={onAutoAdjustUnitPrice}
                              className="ml-3 bg-indigo-600 text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-700"
                            >
                              Auto Adjust Price
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Items Total Row */}
                  <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                    <td className="px-4 py-2 text-sm text-gray-900" colSpan={5}>TOTAL (Items)</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{totalQty}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">-</td>
                    <td className="px-4 py-2 text-sm text-gray-900">₹{totalBasicSum.toFixed(2)}</td>
                    {hasDiscount && (
                      <td className="px-4 py-2 text-sm text-gray-900">-</td>
                    )}
                    {hasDiscount && (
                      <td className="px-4 py-2 text-sm text-gray-900">₹{totalFinalSum.toFixed(2)}</td>
                    )}
                    <td className="px-4 py-2 text-sm text-gray-900">-</td>
                    <td className="px-4 py-2 text-sm text-gray-900">₹{totalGstSum.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm font-bold text-gray-900">₹{totalAmountSum.toFixed(2)}</td>
                    {editMode && hasAmountMismatch && <td></td>}
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ItemsTable;
