import React from 'react';
import { Package } from 'lucide-react';

interface ServiceChargesTableProps {
  serviceCharges: any[];
}

const ServiceChargesTable: React.FC<ServiceChargesTableProps> = ({ serviceCharges }) => {
  if (!serviceCharges || serviceCharges.length === 0) return null;

  const hasDiscount = serviceCharges.some((service: any) => (service.discount || 0) > 0);

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <h4 className="font-medium text-green-900 mb-3 flex items-center">
        <Package className="w-4 h-4 mr-2" />
        Service Charges
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full border border-green-200 rounded-lg">
          <thead className="bg-green-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Description</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">HSN Code</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Quantity</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Basic Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Total Basic</th>
              {hasDiscount && (
                <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Discount %</th>
              )}
              {hasDiscount && (
                <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Final Amount</th>
              )}
              <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">GST %</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">GST Amount</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-green-700 uppercase">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-green-200">
            {(() => {
              let serviceTotalQty = 0;
              let serviceTotalBasicSum = 0;
              let serviceTotalFinalSum = 0;
              let serviceTotalGstSum = 0;
              let serviceTotalAmountSum = 0;

              return (
                <>
                  {serviceCharges.map((service: any, index: number) => {
                    const basicAmount = service.unitPrice || 0;
                    const quantity = service.quantity || 0;
                    const totalBasic = basicAmount * quantity;
                    const discountAmount = totalBasic * ((service.discount || 0) / 100);
                    const finalAmount = totalBasic - discountAmount;
                    const gstAmount = finalAmount * ((service.taxRate || 0) / 100);
                    const totalAmount = finalAmount + gstAmount;

                    // Add to running totals
                    serviceTotalQty += quantity;
                    serviceTotalBasicSum += totalBasic;
                    serviceTotalFinalSum += finalAmount;
                    serviceTotalGstSum += gstAmount;
                    serviceTotalAmountSum += totalAmount;

                    return (
                      <tr key={index} className="bg-white">
                        <td className="px-4 py-2 text-sm text-gray-900">{service.description}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{service.hsnNumber || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">₹{basicAmount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">₹{totalBasic.toFixed(2)}</td>
                        {hasDiscount && (
                          <td className="px-4 py-2 text-sm text-gray-900">{service.discount || 0}%</td>
                        )}
                        {hasDiscount && (
                          <td className="px-4 py-2 text-sm text-gray-900">₹{finalAmount.toFixed(2)}</td>
                        )}
                        <td className="px-4 py-2 text-sm text-gray-900">{service.taxRate || 0}%</td>
                        <td className="px-4 py-2 text-sm text-gray-900">₹{gstAmount.toFixed(2)}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">₹{totalAmount.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                  {/* Service Charges Total Row */}
                  <tr className="bg-green-200 font-semibold border-t-2 border-green-400">
                    <td className="px-4 py-2 text-sm text-green-900" colSpan={2}>TOTAL (Service Charges)</td>
                    <td className="px-4 py-2 text-sm text-green-900">{serviceTotalQty}</td>
                    <td className="px-4 py-2 text-sm text-green-900">-</td>
                    <td className="px-4 py-2 text-sm text-green-900">₹{serviceTotalBasicSum.toFixed(2)}</td>
                    {hasDiscount && (
                      <td className="px-4 py-2 text-sm text-green-900">-</td>
                    )}
                    {hasDiscount && (
                      <td className="px-4 py-2 text-sm text-green-900">₹{serviceTotalFinalSum.toFixed(2)}</td>
                    )}
                    <td className="px-4 py-2 text-sm text-green-900">-</td>
                    <td className="px-4 py-2 text-sm text-green-900">₹{serviceTotalGstSum.toFixed(2)}</td>
                    <td className="px-4 py-2 text-sm font-bold text-green-900">₹{serviceTotalAmountSum.toFixed(2)}</td>
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

export default ServiceChargesTable;
