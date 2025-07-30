import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Calendar, 
  DollarSign, 
  FileText, 
  Users, 
  Settings,
  CheckCircle,
  AlertTriangle,
  X,
  Plus,
  Trash2
} from 'lucide-react';
import { apiClient } from '../utils/api';

interface ContractRenewalProps {
  isOpen: boolean;
  onClose: () => void;
  amcData?: any;
  isBulkRenewal?: boolean;
  selectedContracts?: any[];
}

interface RenewalData {
  newStartDate: string;
  newEndDate: string;
  newContractValue: number;
  newScheduledVisits: number;
  priceAdjustment?: {
    type: 'percentage' | 'fixed';
    value: number;
    reason: string;
  };
  updatedTerms?: string;
  addProducts?: string[];
  removeProducts?: string[];
  autoRenewal: boolean;
  renewalTerms?: string;
}

const ContractRenewal: React.FC<ContractRenewalProps> = ({ 
  isOpen, 
  onClose, 
  amcData, 
  isBulkRenewal = false, 
  selectedContracts = [] 
}) => {
  const [renewalData, setRenewalData] = useState<RenewalData>({
    newStartDate: '',
    newEndDate: '',
    newContractValue: 0,
    newScheduledVisits: 4,
    autoRenewal: false,
    renewalTerms: ''
  });

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPriceAdjustment, setShowPriceAdjustment] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
      if (amcData && !isBulkRenewal) {
        // Calculate new dates based on original contract
        const originalStart = new Date(amcData.startDate);
        const originalEnd = new Date(amcData.endDate);
        const duration = originalEnd.getTime() - originalStart.getTime();
        
        const newStartDate = new Date(originalEnd);
        const newEndDate = new Date(newStartDate.getTime() + duration);

        setRenewalData({
          newStartDate: newStartDate.toISOString().split('T')[0],
          newEndDate: newEndDate.toISOString().split('T')[0],
          newContractValue: amcData.contractValue,
          newScheduledVisits: amcData.scheduledVisits,
          autoRenewal: false,
          renewalTerms: amcData.terms || ''
        });
      }
    }
  }, [isOpen, amcData, isBulkRenewal]);

  const fetchProducts = async () => {
    try {
      const response = await apiClient.products.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (isBulkRenewal) {
        const contractIds = selectedContracts.map(c => c._id);
        await apiClient.amc.bulkRenew(contractIds, renewalData);
      } else {
        await apiClient.amc.renew(amcData._id, renewalData);
      }
      onClose();
      // You might want to trigger a refresh of the AMC data here
    } catch (error: any) {
      setError(error.message || 'Failed to renew contract');
    } finally {
      setSubmitting(false);
    }
  };

  const calculateNewValue = () => {
    if (!amcData || !renewalData.priceAdjustment) return renewalData.newContractValue;

    const baseValue = amcData.contractValue;
    if (renewalData.priceAdjustment.type === 'percentage') {
      return baseValue * (1 + renewalData.priceAdjustment.value / 100);
    } else {
      return baseValue + renewalData.priceAdjustment.value;
    }
  };

  const calculateDuration = () => {
    if (!renewalData.newStartDate || !renewalData.newEndDate) return 0;
    
    const start = new Date(renewalData.newStartDate);
    const end = new Date(renewalData.newEndDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const renderBulkRenewalSummary = () => {
    if (!isBulkRenewal) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Bulk Renewal Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-blue-700">Contracts to Renew:</span>
            <span className="ml-2 font-medium text-blue-900">{selectedContracts.length}</span>
          </div>
          <div>
            <span className="text-blue-700">Total Current Value:</span>
            <span className="ml-2 font-medium text-blue-900">
              ₹{selectedContracts.reduce((sum, c) => sum + c.contractValue, 0).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-blue-700">Average Contract Value:</span>
            <span className="ml-2 font-medium text-blue-900">
              ₹{(selectedContracts.reduce((sum, c) => sum + c.contractValue, 0) / selectedContracts.length).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderContractDetails = () => {
    if (isBulkRenewal || !amcData) return null;

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Original Contract Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Contract Number:</span>
            <span className="ml-2 font-medium text-gray-900">{amcData.contractNumber}</span>
          </div>
          <div>
            <span className="text-gray-600">Customer:</span>
            <span className="ml-2 font-medium text-gray-900">
              {typeof amcData.customer === 'object' ? amcData.customer.name : 'Unknown'}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Current Value:</span>
            <span className="ml-2 font-medium text-gray-900">₹{amcData.contractValue.toLocaleString()}</span>
          </div>
          <div>
            <span className="text-gray-600">Scheduled Visits:</span>
            <span className="ml-2 font-medium text-gray-900">{amcData.scheduledVisits}</span>
          </div>
          <div>
            <span className="text-gray-600">Start Date:</span>
            <span className="ml-2 font-medium text-gray-900">{new Date(amcData.startDate).toLocaleDateString()}</span>
          </div>
          <div>
            <span className="text-gray-600">End Date:</span>
            <span className="ml-2 font-medium text-gray-900">{new Date(amcData.endDate).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {isBulkRenewal ? 'Bulk Contract Renewal' : 'Renew Contract'}
            </h2>
            <p className="text-gray-600">
              {isBulkRenewal 
                ? `Renew ${selectedContracts.length} selected contracts` 
                : 'Create a new contract based on the existing one'
              }
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {renderBulkRenewalSummary()}
          {renderContractDetails()}

          {/* Renewal Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Renewal Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Start Date *
                </label>
                <input
                  type="date"
                  required
                  value={renewalData.newStartDate}
                  onChange={(e) => setRenewalData({ ...renewalData, newStartDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New End Date *
                </label>
                <input
                  type="date"
                  required
                  value={renewalData.newEndDate}
                  onChange={(e) => setRenewalData({ ...renewalData, newEndDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contract Value (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={renewalData.newContractValue}
                  onChange={(e) => setRenewalData({ ...renewalData, newContractValue: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scheduled Visits *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={renewalData.newScheduledVisits}
                  onChange={(e) => setRenewalData({ ...renewalData, newScheduledVisits: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Price Adjustment */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Price Adjustment</label>
                <button
                  type="button"
                  onClick={() => setShowPriceAdjustment(!showPriceAdjustment)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showPriceAdjustment ? 'Hide' : 'Add Adjustment'}
                </button>
              </div>
              
              {showPriceAdjustment && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type</label>
                      <select
                        value={renewalData.priceAdjustment?.type || 'percentage'}
                        onChange={(e) => setRenewalData({
                          ...renewalData,
                          priceAdjustment: {
                            ...renewalData.priceAdjustment,
                            type: e.target.value as 'percentage' | 'fixed'
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Value</label>
                      <input
                        type="number"
                        value={renewalData.priceAdjustment?.value || 0}
                        onChange={(e) => setRenewalData({
                          ...renewalData,
                          priceAdjustment: {
                            ...renewalData.priceAdjustment,
                            value: Number(e.target.value)
                          }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                      <input
                        type="text"
                        value={renewalData.priceAdjustment?.reason || ''}
                        onChange={(e) => setRenewalData({
                          ...renewalData,
                          priceAdjustment: {
                            ...renewalData.priceAdjustment,
                            reason: e.target.value
                          }
                        })}
                        placeholder="e.g., Inflation, Service upgrade"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {amcData && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-sm text-blue-900">
                        <span className="font-medium">Original Value:</span> ₹{amcData.contractValue.toLocaleString()}
                        <br />
                        <span className="font-medium">New Value:</span> ₹{calculateNewValue().toLocaleString()}
                        <br />
                        <span className="font-medium">Difference:</span> ₹{(calculateNewValue() - amcData.contractValue).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Auto Renewal */}
            <div className="mb-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Auto Renewal</h4>
                  <p className="text-xs text-gray-600">Automatically renew this contract when it expires</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRenewalData({ ...renewalData, autoRenewal: !renewalData.autoRenewal })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    renewalData.autoRenewal ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      renewalData.autoRenewal ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Updated Terms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Updated Terms & Conditions
              </label>
              <textarea
                value={renewalData.updatedTerms || ''}
                onChange={(e) => setRenewalData({ ...renewalData, updatedTerms: e.target.value })}
                rows={4}
                placeholder="Enter updated terms and conditions for the renewed contract..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-green-900 mb-2">Renewal Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-green-700">Contract Duration:</span>
                <span className="ml-2 font-medium text-green-900">{calculateDuration()} days</span>
              </div>
              <div>
                <span className="text-green-700">Contract Value:</span>
                <span className="ml-2 font-medium text-green-900">₹{renewalData.newContractValue.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-green-700">Scheduled Visits:</span>
                <span className="ml-2 font-medium text-green-900">{renewalData.newScheduledVisits}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>{isBulkRenewal ? 'Renew Contracts' : 'Renew Contract'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContractRenewal; 