import React from 'react';
import { ShoppingCart, Plus, Search, Package } from 'lucide-react';

const PurchaseOrderManagement: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage purchase orders and suppliers</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>New Purchase Order</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Purchase Order Management</h3>
        <p className="text-gray-500">Track and manage all your purchase orders</p>
      </div>
    </div>
  );
};

export default PurchaseOrderManagement; 