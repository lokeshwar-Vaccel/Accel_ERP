import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/api';

interface WorkBreakdown {
  natureOfWork: string;
  subNatureOfWork: string;
  ticketCount: number;
  totalConvenienceCharges: number;
}

interface EngineerStats {
  engineerId: string;
  engineerName: string;
  workBreakdown: WorkBreakdown[];
  totalTickets: number;
  totalConvenienceCharges: number;
}

interface WorkStatsData {
  period: {
    start: string;
    end: string;
    fromMonth: string | null;
    toMonth: string | null;
    month: string | null;
  };
  engineerStats: EngineerStats[];
  overallStats: Array<{
    natureOfWork: string;
    subNatureOfWork: string;
    ticketCount: number;
    totalConvenienceCharges: number;
  }>;
  summary: {
    totalEngineers: number;
    totalTickets: number;
    totalConvenienceCharges: number;
  };
}

const EngineerWorkStatsExample: React.FC = () => {
  const [workStats, setWorkStats] = useState<WorkStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEngineer, setSelectedEngineer] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const fetchWorkStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: any = {};
      if (selectedEngineer) params.engineerId = selectedEngineer;
      if (selectedMonth) params.month = selectedMonth;
      
      const response = await apiClient.services.getEngineerWorkStats(params);
      
      if (response.success) {
        setWorkStats(response.data);
      } else {
        setError('Failed to fetch work statistics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkStats();
  }, []);

  const handleEngineerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEngineer(e.target.value);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  const handleRefresh = () => {
    fetchWorkStats();
  };

  if (loading) {
    return <div className="p-4">Loading work statistics...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error: {error}
        <button 
          onClick={handleRefresh}
          className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!workStats) {
    return <div className="p-4">No data available</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Engineer Work Statistics</h2>
        
        {/* Filters */}
        <div className="flex gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Engineer:</label>
            <select
              value={selectedEngineer}
              onChange={handleEngineerChange}
              className="border rounded px-3 py-2"
            >
              <option value="">All Engineers</option>
              {workStats.engineerStats.map((engineer) => (
                <option key={engineer.engineerId} value={engineer.engineerId}>
                  {engineer.engineerName}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={handleMonthChange}
              className="border rounded px-3 py-2"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-100 p-4 rounded mb-6">
          <h3 className="text-lg font-semibold mb-2">Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="font-medium">Total Engineers:</span> {workStats.summary.totalEngineers}
            </div>
            <div>
              <span className="font-medium">Total Tickets:</span> {workStats.summary.totalTickets}
            </div>
            <div>
              <span className="font-medium">Total Convenience Charges:</span> ₹{workStats.summary.totalConvenienceCharges}
            </div>
          </div>
        </div>
      </div>

      {/* Engineer Statistics */}
      <div className="space-y-6">
        {workStats.engineerStats.map((engineer) => (
          <div key={engineer.engineerId} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{engineer.engineerName}</h3>
              <div className="text-sm text-gray-600">
                Total: {engineer.totalTickets} tickets | ₹{engineer.totalConvenienceCharges}
              </div>
            </div>
            
            {/* Work Breakdown Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Nature of Work</th>
                    <th className="px-4 py-2 text-left">Sub Nature of Work</th>
                    <th className="px-4 py-2 text-right">Ticket Count</th>
                    <th className="px-4 py-2 text-right">Convenience Charges</th>
                  </tr>
                </thead>
                <tbody>
                  {engineer.workBreakdown.map((work, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">{work.natureOfWork}</td>
                      <td className="px-4 py-2">{work.subNatureOfWork}</td>
                      <td className="px-4 py-2 text-right">{work.ticketCount}</td>
                      <td className="px-4 py-2 text-right">₹{work.totalConvenienceCharges}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Overall Statistics */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Overall Statistics by Work Type</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left">Nature of Work</th>
                <th className="px-4 py-2 text-left">Sub Nature of Work</th>
                <th className="px-4 py-2 text-right">Total Tickets</th>
                <th className="px-4 py-2 text-right">Total Convenience Charges</th>
              </tr>
            </thead>
            <tbody>
              {workStats.overallStats.map((stat, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-2">{stat.natureOfWork}</td>
                  <td className="px-4 py-2">{stat.subNatureOfWork}</td>
                  <td className="px-4 py-2 text-right">{stat.ticketCount}</td>
                  <td className="px-4 py-2 text-right">₹{stat.totalConvenienceCharges}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EngineerWorkStatsExample;
