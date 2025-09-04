import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Download,
  BarChart3,
  PieChart,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Edit,
  X
} from 'lucide-react';
import { apiClient } from '../utils/api';

interface AMCReportProps {
  isOpen: boolean;
  onClose: () => void;
  reportType?: string;
}

interface ReportData {
  [key: string]: any;
}

const AMCReport: React.FC<AMCReportProps> = ({ isOpen, onClose, reportType = 'contract_summary' }) => {
  const [selectedReport, setSelectedReport] = useState(reportType);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: ''
  });

  const reportTypes = [
    { value: 'contract_summary', label: 'Contract Summary', icon: FileText },
    { value: 'revenue_analysis', label: 'Revenue Analysis', icon: DollarSign },
    { value: 'visit_completion', label: 'Visit Completion', icon: CheckCircle },
    { value: 'expiring_contracts', label: 'Expiring Contracts', icon: AlertTriangle },
    { value: 'performance_metrics', label: 'Performance Metrics', icon: Activity }
  ];

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.status) params.append('status', filters.status);

      const response = await apiClient.amc.generateReport(selectedReport, params.toString());
      setReportData(response.data);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateReport();
    }
  }, [isOpen, selectedReport, filters]);

  const formatCurrency = (amount: number) => {
    if (!amount || isNaN(amount)) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-IN');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getCustomerDisplayName = (customer: any) => {
    if (!customer) return 'Unknown Customer';
    if (typeof customer === 'string') return customer;
    if (typeof customer === 'object' && customer.name) return customer.name;
    return 'Unknown Customer';
  };

  const handleExportExcel = async () => {
    if (!reportData) return;
    
    try {
      setLoading(true);
      
      // Build export parameters
      const params = new URLSearchParams();
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      if (filters.status) params.append('status', filters.status);
      params.append('format', 'excel');
      
      // Call the Excel export API
      const response = await apiClient.amc.exportToExcel(params.toString());
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Set filename
      const filename = `AMC_Report_${selectedReport}_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Failed to export to Excel. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderContractSummary = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Contracts</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalContracts}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Contracts</p>
                <p className="text-2xl font-bold text-green-600">{reportData.activeContracts}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.totalValue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Contract Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.averageContractValue)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Visits</p>
                <p className="text-2xl font-bold text-purple-600">{reportData.totalVisits}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Oil Services</p>
                <p className="text-2xl font-bold text-orange-600">{reportData.totalOilServices}</p>
              </div>
              <Edit className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Draft Contracts</p>
                <p className="text-2xl font-bold text-yellow-600">{reportData.draftContracts}</p>
              </div>
              <Edit className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contracts by Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {Object.entries(reportData.contractsByStatus || {}).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count as number}</div>
                <div className="text-sm text-gray-600 capitalize">{status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contracts by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(reportData.contractsByType || {}).map(([type, count]) => (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count as number}</div>
                <div className="text-sm text-gray-600">{type}</div>
              </div>
            ))}
          </div>
        </div>

        {reportData.contracts && reportData.contracts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Details (Top 50)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engine</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.contracts.map((contract: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {contract.contractNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contract.customer ? (
                          <div>
                            <div className="font-medium">{contract.customer.name}</div>
                            <div className="text-xs text-gray-400">{contract.customer.customerType}</div>
                          </div>
                        ) : 'Unknown Customer'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div className="font-medium">{contract.engineSerialNumber}</div>
                          <div className="text-xs text-gray-400">{contract.engineModel} - {contract.kva}KVA</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contract.amcType === 'AMC' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {contract.amcType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(contract.contractValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contract.status === 'active' ? 'bg-green-100 text-green-800' :
                          contract.status === 'expired' ? 'bg-red-100 text-red-800' :
                          contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          contract.status === 'draft' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${contract.completionPercentage || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-600">{contract.completionPercentage || 0}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contract.daysUntilExpiry !== null && contract.daysUntilExpiry !== undefined ? (
                          <span className={contract.daysUntilExpiry <= 30 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {contract.daysUntilExpiry} days
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRevenueAnalysis = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Revenue/Contract</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.averageRevenuePerContract)}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue Categories</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(reportData.revenueByStatus || {}).length}</p>
              </div>
              <PieChart className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
            <div className="space-y-2">
              {Object.entries(reportData.monthlyRevenue || {})
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([month, revenue]) => (
                  <div key={month} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700">{month}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(revenue as number)}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Status</h3>
            <div className="space-y-2">
              {Object.entries(reportData.revenueByStatus || {})
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([status, revenue]) => (
                  <div key={status} className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="text-gray-700 capitalize">{status}</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(revenue as number)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by AMC Type</h3>
          <div className="space-y-2">
            {Object.entries(reportData.revenueByType || {})
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([type, revenue]) => (
                <div key={type} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-700">{type}</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(revenue as number)}</span>
                </div>
              ))}
          </div>
        </div>

        {reportData.topRevenueContracts && reportData.topRevenueContracts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Revenue Contracts</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.topRevenueContracts.map((contract: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {contract.contractNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getCustomerDisplayName(contract.customer)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(contract.contractValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contract.amcType === 'AMC' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {contract.amcType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contract.status === 'active' ? 'bg-green-100 text-green-800' :
                          contract.status === 'expired' ? 'bg-red-100 text-red-800' :
                          contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          contract.status === 'draft' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(contract.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderVisitCompletion = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Scheduled</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalScheduled}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Completed</p>
                <p className="text-2xl font-bold text-green-600">{reportData.totalCompleted}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue Visits</p>
                <p className="text-2xl font-bold text-red-600">{reportData.overdueVisits}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.completionRate?.toFixed(1)}%</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Detailed Visit Statistics */}
        {reportData.completedVisitsDetailed !== undefined && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed Visits</p>
                  <p className="text-2xl font-bold text-green-600">{reportData.completedVisitsDetailed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Visits</p>
                  <p className="text-2xl font-bold text-yellow-600">{reportData.pendingVisitsDetailed}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Cancelled Visits</p>
                  <p className="text-2xl font-bold text-red-600">{reportData.cancelledVisitsDetailed}</p>
                </div>
                <X className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Completion Details</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Engine</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scheduled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Visit</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visit Schedule</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.contracts?.map((contract: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{contract.contractNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getCustomerDisplayName(contract.customer)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contract.engineSerialNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.scheduledVisits}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{contract.completedVisits}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contract.completionRate >= 90 ? 'bg-green-100 text-green-800' :
                        contract.completionRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {contract.completionRate?.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contract.nextVisitDate ? formatDate(contract.nextVisitDate) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {contract.visitSchedule && contract.visitSchedule.length > 0 ? (
                        <div className="flex items-center space-x-1">
                          {contract.visitSchedule.slice(0, 3).map((visit: any, visitIndex: number) => (
                            <div
                              key={visitIndex}
                              className={`w-2 h-2 rounded-full ${
                                visit.status === 'completed' ? 'bg-green-500' :
                                visit.status === 'pending' ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              title={`${formatDate(visit.scheduledDate)} - ${visit.status}${visit.assignedTo ? ` - ${visit.assignedTo}` : ''}`}
                            />
                          ))}
                          {contract.visitSchedule.length > 3 && (
                            <span className="text-xs text-gray-500">+{contract.visitSchedule.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No visits</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderExpiringContracts = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring in 30 Days</p>
                <p className="text-2xl font-bold text-orange-600">{reportData.expiringContracts}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring in 60 Days</p>
                <p className="text-2xl font-bold text-yellow-600">{reportData.expiringIn60Days}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Value at Risk</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.totalValueAtRisk)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expiring Contract Details (30 Days)</h3>
          <div className="space-y-3">
            {reportData.contracts?.map((contract: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex-1">
                  <div className="flex items-center space-x-4">
                    <div>
                      <h4 className="font-medium text-gray-900">{contract.contractNumber}</h4>
                      <p className="text-sm text-gray-600">
                        {contract.customer ? contract.customer.name : 'Unknown Customer'}
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><span className="font-medium">Engine:</span> {contract.engineSerialNumber}</p>
                      <p><span className="font-medium">Model:</span> {contract.engineModel}</p>
                    </div>
                    <div className="text-sm text-gray-600">
                      <p><span className="font-medium">Type:</span> {contract.amcType}</p>
                      <p><span className="font-medium">Visits:</span> {contract.completedVisits}/{contract.numberOfVisits}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-orange-700">
                    <p>Expires on {formatDate(contract.amcEndDate)} ({contract.daysUntilExpiry} days left)</p>
                    <p>Contact: {contract.contactPersonName} - {contract.contactNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(contract.contractValue)}</p>
                  <p className="text-sm text-gray-600">Contract Value</p>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      contract.completionPercentage >= 90 ? 'bg-green-100 text-green-800' :
                      contract.completionPercentage >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {contract.completionPercentage?.toFixed(1)}% Complete
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {reportData.contracts60Days && reportData.contracts60Days.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Expiring in 60 Days</h3>
            <div className="space-y-3">
              {reportData.contracts60Days.map((contract: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div>
                    <h4 className="font-medium text-gray-900">{contract.contractNumber}</h4>
                    <p className="text-sm text-gray-600">{getCustomerDisplayName(contract.customer)}</p>
                    <p className="text-xs text-yellow-700">
                      Expires on {formatDate(contract.amcEndDate)} ({contract.daysUntilExpiry} days left)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(contract.contractValue)}</p>
                    <p className="text-sm text-gray-600">Contract Value</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPerformanceMetrics = () => {
    if (!reportData) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Contracts</p>
                <p className="text-2xl font-bold text-gray-900">{reportData.totalContracts}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Contracts</p>
                <p className="text-2xl font-bold text-green-600">{reportData.activeContracts}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Best Field Engineer</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.bestEngineer ? reportData.bestEngineer.name : 'N/A'}</p>
                {reportData.bestEngineer && (
                  <p className="text-xs text-gray-600">{reportData.bestEngineer.completedVisits}/{reportData.bestEngineer.totalVisits} visits ({reportData.bestEngineer.completionRate}%)</p>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold text-purple-600">{reportData.completionRate?.toFixed(1)}%</p>
              </div>
              <Activity className="w-8 h-8 text-purple-600" />
            </div>
          </div>


        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Overview</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Response Time</span>
                <span className="font-medium">{reportData.averageResponseTime?.toFixed(1)} hours</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Average Contract Duration</span>
                <span className="font-medium">{reportData.averageContractDuration?.toFixed(0)} days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Overall Completion Rate</span>
                <span className="font-medium">{reportData.completionRate?.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Active vs Total</span>
                <span className="font-medium">{reportData.activeContracts}/{reportData.totalContracts}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
            <div className="space-y-3">
              {reportData.averageResponseTime && reportData.averageResponseTime <= 24 && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">Excellent response time (≤24 hours)</span>
                </div>
              )}
              {reportData.averageResponseTime && reportData.averageResponseTime > 24 && reportData.averageResponseTime <= 48 && (
                <div className="flex items-center text-yellow-600">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-sm">Good response time (24-48 hours)</span>
                </div>
              )}
              {reportData.averageResponseTime && reportData.averageResponseTime > 48 && (
                <div className="flex items-center text-red-600">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-sm">Response time needs improvement (&gt;48 hours)</span>
                </div>
              )}
              
              {reportData.completionRate && reportData.completionRate >= 90 && (
                <div className="flex items-center text-green-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">Excellent completion rate (≥90%)</span>
                </div>
              )}
              {reportData.completionRate && reportData.completionRate < 90 && reportData.completionRate >= 70 && (
                <div className="flex items-center text-yellow-600">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-sm">Good completion rate (70-89%)</span>
                </div>
              )}
              {reportData.completionRate && reportData.completionRate < 70 && (
                <div className="flex items-center text-red-600">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-sm">Completion rate needs improvement (&lt;70%)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {reportData.contracts && reportData.contracts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Performance Details (Top 20)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days to Expiry</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract Value</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.contracts.map((contract: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {contract.contractNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getCustomerDisplayName(contract.customer)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contract.status === 'active' ? 'bg-green-100 text-green-800' :
                          contract.status === 'expired' ? 'bg-red-100 text-red-800' :
                          contract.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          contract.status === 'draft' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {contract.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          contract.completionRate >= 90 ? 'bg-green-100 text-green-800' :
                          contract.completionRate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {contract.completionRate?.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contract.daysUntilExpiry !== null && contract.daysUntilExpiry !== undefined ? (
                          <span className={contract.daysUntilExpiry <= 30 ? 'text-red-600 font-medium' : 'text-gray-600'}>
                            {contract.daysUntilExpiry} days
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(contract.contractValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReportContent = () => {
    switch (selectedReport) {
      case 'contract_summary':
        return renderContractSummary();
      case 'revenue_analysis':
        return renderRevenueAnalysis();
      case 'visit_completion':
        return renderVisitCompletion();

      case 'expiring_contracts':
        return renderExpiringContracts();
      case 'performance_metrics':
        return renderPerformanceMetrics();
      default:
        return <div className="text-center py-8 text-gray-500">Select a report type to view data</div>;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AMC Reports</h2>
            <p className="text-gray-600">Generate and view comprehensive AMC reports</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Report Type Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Select Report Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {reportTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setSelectedReport(type.value)}
                    className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedReport === type.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      <Icon className="w-6 h-6" />
                      <span className="text-sm font-medium text-center">{type.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {/* Report Content */}
          <div className="bg-white rounded-lg">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Generating report...</span>
              </div>
            ) : (
              <>
                {reportData?.metadata && (
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center space-x-4">
                        <span>Generated: {formatDate(reportData.metadata.generatedAt)}</span>
                        <span>Records: {reportData.metadata.totalRecords}</span>
                        <span>Type: {reportData.metadata.reportType?.replace('_', ' ')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {reportData.metadata.filters?.dateFrom && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            From: {formatDate(reportData.metadata.filters.dateFrom)}
                          </span>
                        )}
                        {reportData.metadata.filters?.dateTo && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                            To: {formatDate(reportData.metadata.filters.dateTo)}
                          </span>
                        )}
                        {reportData.metadata.filters?.status && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            Status: {reportData.metadata.filters.status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {renderReportContent()}
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={generateReport}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh Report</span>
            </button>
            <button
              onClick={handleExportExcel}
              disabled={loading || !reportData}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AMCReport; 