import React, { useState } from 'react';
import { BarChart3, Download, Calendar, FileText, TrendingUp } from 'lucide-react';

const ReportsManagement: React.FC = () => {
  const [selectedReport, setSelectedReport] = useState('service-tickets');
  const [dateRange, setDateRange] = useState('last-30-days');

  const reportTypes = [
    { id: 'service-tickets', name: 'Service Tickets Report', icon: FileText },
    { id: 'inventory', name: 'Inventory Report', icon: BarChart3 },
    { id: 'revenue', name: 'Revenue Analysis', icon: TrendingUp },
    { id: 'customer', name: 'Customer Analytics', icon: FileText },
    { id: 'performance', name: 'Performance Metrics', icon: BarChart3 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Generate comprehensive business reports</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>Export Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold mb-4">Report Types</h3>
          <div className="space-y-2">
            {reportTypes.map((report) => {
              const Icon = report.icon;
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    selectedReport === report.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{report.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Report Configuration</h3>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="last-7-days">Last 7 Days</option>
              <option value="last-30-days">Last 30 Days</option>
              <option value="last-3-months">Last 3 Months</option>
              <option value="last-year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="bg-gray-50 rounded-lg p-8 text-center">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Report Preview</h4>
            <p className="text-gray-500 mb-4">
              Configure your report parameters and generate detailed analytics
            </p>
            <div className="flex space-x-3 justify-center">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                Generate Report
              </button>
              <button className="border border-gray-300 px-4 py-2 rounded-lg">
                Schedule Report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsManagement; 