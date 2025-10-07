import React from 'react';

interface BatteryBuybackTableProps {
  batteryBuyBack: any;
}

const BatteryBuybackTable: React.FC<BatteryBuybackTableProps> = ({ batteryBuyBack }) => {
  if (!batteryBuyBack || batteryBuyBack.quantity <= 0) return null;

  const hasDiscount = (batteryBuyBack?.discount || 0) > 0;
  const batteryBasicAmount = batteryBuyBack.unitPrice || 0;
  const batteryQuantity = batteryBuyBack.quantity || 0;
  const batteryTotalBasic = batteryBasicAmount * batteryQuantity;
  const batteryDiscountAmount = batteryTotalBasic * ((batteryBuyBack.discount || 0) / 100);
  const batteryFinalAmount = batteryTotalBasic - batteryDiscountAmount;

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
      <h4 className="font-medium text-orange-900 mb-3 flex items-center">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Battery Buyback Charges
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full border border-orange-200 rounded-lg">
          <thead className="bg-orange-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Description</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">HSN Code</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Quantity</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Basic Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Total Basic</th>
              {hasDiscount && (
                <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Discount %</th>
              )}
              {hasDiscount && (
                <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Final Amount</th>
              )}
              <th className="px-4 py-2 text-left text-xs font-medium text-orange-700 uppercase">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-orange-200">
            <tr className="bg-white">
              <td className="px-4 py-2 text-sm text-gray-900">{batteryBuyBack.description}</td>
              <td className="px-4 py-2 text-sm text-gray-900">{batteryBuyBack.hsnNumber || '-'}</td>
              <td className="px-4 py-2 text-sm text-gray-900">{batteryQuantity}</td>
              <td className="px-4 py-2 text-sm text-gray-900">₹{batteryBasicAmount.toFixed(2)}</td>
              <td className="px-4 py-2 text-sm text-gray-900">₹{batteryTotalBasic.toFixed(2)}</td>
              {hasDiscount && (
                <td className="px-4 py-2 text-sm text-gray-900">{batteryBuyBack.discount || 0}%</td>
              )}
              {hasDiscount && (
                <td className="px-4 py-2 text-sm text-gray-900">₹{batteryFinalAmount.toFixed(2)}</td>
              )}
              <td className="px-4 py-2 text-sm font-medium text-gray-900">₹{(batteryBuyBack.totalPrice || 0).toFixed(2)}</td>
            </tr>
            {/* Battery Buyback Total Row */}
            <tr className="bg-orange-200 font-semibold border-t-2 border-orange-400">
              <td className="px-4 py-2 text-sm text-orange-900" colSpan={2}>TOTAL (Battery Buyback)</td>
              <td className="px-4 py-2 text-sm text-orange-900">{batteryQuantity}</td>
              <td className="px-4 py-2 text-sm text-orange-900">-</td>
              <td className="px-4 py-2 text-sm text-orange-900">₹{batteryTotalBasic.toFixed(2)}</td>
              {hasDiscount && (
                <td className="px-4 py-2 text-sm text-orange-900">-</td>
              )}
              {hasDiscount && (
                <td className="px-4 py-2 text-sm text-orange-900">₹{batteryFinalAmount.toFixed(2)}</td>
              )}
              <td className="px-4 py-2 text-sm font-bold text-orange-900">₹{(batteryBuyBack.totalPrice || 0).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BatteryBuybackTable;
