import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Clock,
  Package,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  CheckCircle,
  Target,
  User,
  Briefcase,
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Settings,
  PieChart,
  LineChart,
  BarChart as BarChartIcon,
  Calendar as CalendarIcon,
  MapPin,
  Phone,
  Mail,
  IndianRupee
} from 'lucide-react';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';

// Types for analytics data
interface TicketAnalytics {
  totalTickets: number;
  closedTickets: number;
  avgTAT: number;
  slaCompliance: number;
  priorityBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  tatDistribution: Array<{ range: string; count: number }>;
  monthlyTrend: Array<{ month: string; tickets: number; closed: number }>;
}

interface InventoryAnalytics {
  totalValue: number;
  totalItems: number;
  lowStockItems: number;
  topMovingItems: Array<{ name: string; movement: number }>;
  categoryBreakdown: Record<string, number>;
  monthlyMovement: Array<{ month: string; inward: number; outward: number }>;
  valueDistribution: Array<{ category: string; value: number }>;
}

interface RevenueAnalytics {
  totalRevenue: number;
  retailRevenue: number;
  telecomRevenue: number;
  monthlyGrowth: number;
  clientTypeBreakdown: Record<string, number>;
  monthlyRevenue: Array<{ month: string; retail: number; telecom: number }>;
  topClients: Array<{ name: string; revenue: number; type: string }>;
}

interface AMCAnalytics {
  totalContracts: number;
  activeContracts: number;
  expiringContracts: number;
  overdueContracts: number;
  contractValue: number;
  visitCompliance: number;
  monthlyRenewals: Array<{ month: string; renewals: number; new: number }>;
  statusBreakdown: Record<string, number>;
}

interface LeadAnalytics {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  leadSources: Record<string, number>;
  stageDistribution: Record<string, number>;
  monthlyConversion: Array<{ month: string; leads: number; converted: number }>;
  topPerformers: Array<{ name: string; conversions: number; rate: number }>;
}

interface EngineerPerformance {
  totalEngineers: number;
  avgTicketsPerEngineer: number;
  avgResolutionTime: number;
  engineerStats: Array<{
    name: string;
    ticketsCompleted: number;
    avgTAT: number;
    slaCompliance: number;
    customerRating: number;
  }>;
  performanceTrend: Array<{ month: string; productivity: number; quality: number }>;
}

type ReportType = 'overview' | 'tickets' | 'inventory' | 'revenue' | 'amc' | 'leads' | 'engineers';
type DateRange = 'last-7-days' | 'last-30-days' | 'last-3-months' | 'last-year' | 'custom';

const ReportsManagement: React.FC = () => {
  // State management
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('last-30-days');
  const [loading, setLoading] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  
  // Analytics data state
  const [ticketAnalytics, setTicketAnalytics] = useState<TicketAnalytics | null>(null);
  const [inventoryAnalytics, setInventoryAnalytics] = useState<InventoryAnalytics | null>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null);
  const [amcAnalytics, setAmcAnalytics] = useState<AMCAnalytics | null>(null);
  const [leadAnalytics, setLeadAnalytics] = useState<LeadAnalytics | null>(null);
  const [engineerPerformance, setEngineerPerformance] = useState<EngineerPerformance | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [activeReport, dateRange, customDateFrom, customDateTo]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // In a real application, these would be actual API calls
      // For now, using mock data that represents the structure
      
      setTimeout(() => {
        setTicketAnalytics({
          totalTickets: 156,
          closedTickets: 134,
          avgTAT: 2.8,
          slaCompliance: 89.7,
          priorityBreakdown: { critical: 12, high: 34, medium: 78, low: 32 },
          statusBreakdown: { open: 15, in_progress: 28, resolved: 89, closed: 24 },
          tatDistribution: [
            { range: '0-1 days', count: 45 },
            { range: '1-3 days', count: 67 },
            { range: '3-7 days', count: 32 },
            { range: '7+ days', count: 12 }
          ],
          monthlyTrend: [
            { month: 'Jan', tickets: 45, closed: 42 },
            { month: 'Feb', tickets: 52, closed: 48 },
            { month: 'Mar', tickets: 59, closed: 44 }
          ]
        });

        setInventoryAnalytics({
          totalValue: 2850000,
          totalItems: 1247,
          lowStockItems: 23,
          topMovingItems: [
            { name: 'Oil Filter', movement: 145 },
            { name: 'Air Filter', movement: 132 },
            { name: 'Fuel Filter', movement: 98 }
          ],
          categoryBreakdown: { gensets: 450, spare_parts: 632, accessories: 165 },
          monthlyMovement: [
            { month: 'Jan', inward: 234, outward: 189 },
            { month: 'Feb', inward: 312, outward: 267 },
            { month: 'Mar', inward: 298, outward: 234 }
          ],
          valueDistribution: [
            { category: 'Gensets', value: 2100000 },
            { category: 'Spare Parts', value: 550000 },
            { category: 'Accessories', value: 200000 }
          ]
        });

        setRevenueAnalytics({
          totalRevenue: 5620000,
          retailRevenue: 3480000,
          telecomRevenue: 2140000,
          monthlyGrowth: 12.5,
          clientTypeBreakdown: { retail: 62, telecom: 38 },
          monthlyRevenue: [
            { month: 'Jan', retail: 1200000, telecom: 800000 },
            { month: 'Feb', retail: 1150000, telecom: 650000 },
            { month: 'Mar', retail: 1130000, telecom: 690000 }
          ],
          topClients: [
            { name: 'Mumbai Industries Ltd', revenue: 450000, type: 'retail' },
            { name: 'TechCorp Solutions', revenue: 380000, type: 'telecom' },
            { name: 'PowerGen Systems', revenue: 320000, type: 'retail' }
          ]
        });

        setAmcAnalytics({
          totalContracts: 89,
          activeContracts: 76,
          expiringContracts: 12,
          overdueContracts: 3,
          contractValue: 4200000,
          visitCompliance: 94.2,
          monthlyRenewals: [
            { month: 'Jan', renewals: 8, new: 5 },
            { month: 'Feb', renewals: 12, new: 7 },
            { month: 'Mar', renewals: 15, new: 9 }
          ],
          statusBreakdown: { active: 76, expiring: 12, expired: 1 }
        });

        setLeadAnalytics({
          totalLeads: 234,
          convertedLeads: 87,
          conversionRate: 37.2,
          leadSources: { website: 89, referral: 67, cold_call: 45, social: 33 },
          stageDistribution: { prospect: 56, qualified: 89, proposal: 45, negotiation: 32, closed: 12 },
          monthlyConversion: [
            { month: 'Jan', leads: 78, converted: 29 },
            { month: 'Feb', leads: 82, converted: 31 },
            { month: 'Mar', leads: 74, converted: 27 }
          ],
          topPerformers: [
            { name: 'Rajesh Kumar', conversions: 23, rate: 45.2 },
            { name: 'Priya Sharma', conversions: 19, rate: 38.7 },
            { name: 'Amit Singh', conversions: 16, rate: 34.8 }
          ]
        });

        setEngineerPerformance({
          totalEngineers: 12,
          avgTicketsPerEngineer: 13.2,
          avgResolutionTime: 2.8,
          engineerStats: [
            { name: 'Rajesh Kumar', ticketsCompleted: 23, avgTAT: 2.1, slaCompliance: 95.6, customerRating: 4.8 },
            { name: 'Suresh Patel', ticketsCompleted: 19, avgTAT: 2.5, slaCompliance: 89.5, customerRating: 4.6 },
            { name: 'Vikram Singh', ticketsCompleted: 21, avgTAT: 3.2, slaCompliance: 87.2, customerRating: 4.4 }
          ],
          performanceTrend: [
            { month: 'Jan', productivity: 85, quality: 92 },
            { month: 'Feb', productivity: 89, quality: 94 },
            { month: 'Mar', productivity: 91, quality: 96 }
          ]
        });

        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setLoading(false);
    }
  };

  const reportSections = [
    { id: 'overview', name: 'Overview Dashboard', icon: BarChart3, color: 'blue' },
    { id: 'tickets', name: 'Service Tickets TAT', icon: Clock, color: 'orange' },
    { id: 'inventory', name: 'Inventory Analytics', icon: Package, color: 'green' },
    { id: 'revenue', name: 'Revenue Tracking', icon: IndianRupee, color: 'purple' },
    { id: 'amc', name: 'AMC Status Reports', icon: Briefcase, color: 'indigo' },
    { id: 'leads', name: 'Lead Conversion', icon: Target, color: 'pink' },
    { id: 'engineers', name: 'Engineer Performance', icon: User, color: 'teal' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-600" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const renderOverviewDashboard = () => (
    <div className="space-y-4">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(revenueAnalytics?.totalRevenue || 0)}
              </p>
              <div className="flex items-center mt-1">
                {getChangeIcon(12.5)}
                <span className={`text-sm ml-1 ${getChangeColor(12.5)}`}>
                  +12.5% from last month
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <IndianRupee className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Active Tickets</p>
              <p className="text-xl font-bold text-gray-900">
                {ticketAnalytics?.totalTickets || 0}
              </p>
              <div className="flex items-center mt-1">
                {getChangeIcon(-5.2)}
                <span className={`text-sm ml-1 ${getChangeColor(-5.2)}`}>
                  -5.2% from last month
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">AMC Contracts</p>
              <p className="text-xl font-bold text-gray-900">
                {amcAnalytics?.activeContracts || 0}
              </p>
              <div className="flex items-center mt-1">
                {getChangeIcon(8.1)}
                <span className={`text-sm ml-1 ${getChangeColor(8.1)}`}>
                  +8.1% from last month
                </span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">SLA Compliance</p>
              <p className="text-xl font-bold text-gray-900">
                {formatPercentage(ticketAnalytics?.slaCompliance || 0)}
              </p>
              <div className="flex items-center mt-1">
                {getChangeIcon(2.3)}
                <span className={`text-sm ml-1 ${getChangeColor(2.3)}`}>
                  +2.3% from last month
                </span>
              </div>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Revenue Trend
          </h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <LineChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Revenue trend chart would be rendered here</p>
            </div>
          </div>
        </div>

        {/* Ticket Status Distribution */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2" />
            Ticket Status Distribution
          </h3>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <PieChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Ticket status pie chart would be rendered here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Top Performing Engineers</h4>
          <div className="space-y-3">
            {engineerPerformance?.engineerStats.slice(0, 3).map((engineer, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-900">{engineer.name}</p>
                    <p className="text-xs text-gray-600">{engineer.ticketsCompleted} tickets</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">{engineer.customerRating}/5</p>
                  <p className="text-xs text-gray-600">{formatPercentage(engineer.slaCompliance)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Revenue by Client Type</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Retail Clients</span>
                <span className="text-sm font-medium">
                  {formatCurrency(revenueAnalytics?.retailRevenue || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(revenueAnalytics?.retailRevenue || 0) / (revenueAnalytics?.totalRevenue || 1) * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Telecom Clients</span>
                <span className="text-sm font-medium">
                  {formatCurrency(revenueAnalytics?.telecomRevenue || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${(revenueAnalytics?.telecomRevenue || 0) / (revenueAnalytics?.totalRevenue || 1) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-md font-semibold text-gray-900 mb-3">AMC Status Summary</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Active Contracts</span>
              <span className="text-sm font-medium text-green-600">
                {amcAnalytics?.activeContracts || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Expiring Soon</span>
              <span className="text-sm font-medium text-orange-600">
                {amcAnalytics?.expiringContracts || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Overdue</span>
              <span className="text-sm font-medium text-red-600">
                {amcAnalytics?.overdueContracts || 0}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-900">Total Value</span>
                <span className="text-xs font-medium text-gray-900">
                  {formatCurrency(amcAnalytics?.contractValue || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTicketAnalytics = () => (
    <div className="space-y-4">
      {/* TAT Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Average TAT</p>
              <p className="text-xl font-bold text-gray-900">{ticketAnalytics?.avgTAT || 0} days</p>
            </div>
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">SLA Compliance</p>
              <p className="text-xl font-bold text-green-600">
                {formatPercentage(ticketAnalytics?.slaCompliance || 0)}
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Tickets</p>
              <p className="text-xl font-bold text-gray-900">{ticketAnalytics?.totalTickets || 0}</p>
            </div>
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Closed Tickets</p>
              <p className="text-xl font-bold text-gray-900">{ticketAnalytics?.closedTickets || 0}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* TAT Distribution */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Turnaround Time Distribution</h3>
        <div className="grid grid-cols-4 gap-4">
          {ticketAnalytics?.tatDistribution.map((item, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-xl font-bold text-blue-600">{item.count}</p>
              <p className="text-xs text-gray-600">{item.range}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Priority & Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(ticketAnalytics?.priorityBreakdown || {}).map(([priority, count]) => (
              <div key={priority} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-600">{priority}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        priority === 'critical' ? 'bg-red-500' :
                        priority === 'high' ? 'bg-orange-500' :
                        priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`} 
                      style={{ width: `${(count / (ticketAnalytics?.totalTickets || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-8">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(ticketAnalytics?.statusBreakdown || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-600">{status.replace('_', ' ')}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        status === 'open' ? 'bg-blue-500' :
                        status === 'in_progress' ? 'bg-yellow-500' :
                        status === 'resolved' ? 'bg-green-500' : 'bg-gray-500'
                      }`} 
                      style={{ width: `${(count / (ticketAnalytics?.totalTickets || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-8">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderInventoryAnalytics = () => (
    <div className="space-y-4">
      {/* Inventory Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Value</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(inventoryAnalytics?.totalValue || 0)}
              </p>
            </div>
            <Package className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Items</p>
              <p className="text-xl font-bold text-gray-900">{inventoryAnalytics?.totalItems || 0}</p>
            </div>
            <BarChartIcon className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Low Stock Items</p>
              <p className="text-xl font-bold text-red-600">{inventoryAnalytics?.lowStockItems || 0}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Categories</p>
              <p className="text-xl font-bold text-gray-900">
                {Object.keys(inventoryAnalytics?.categoryBreakdown || {}).length}
              </p>
            </div>
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Value Distribution & Top Moving Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Value Distribution by Category</h3>
          <div className="space-y-4">
            {inventoryAnalytics?.valueDistribution.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600">{item.category}</span>
                  <span className="text-sm font-medium">{formatCurrency(item.value)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(item.value / (inventoryAnalytics?.totalValue || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Moving Items</h3>
          <div className="space-y-3">
            {inventoryAnalytics?.topMovingItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-green-600">{index + 1}</span>
                  </div>
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-xs text-gray-600">{item.movement} units</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderRevenueAnalytics = () => (
    <div className="space-y-4">
      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(revenueAnalytics?.totalRevenue || 0)}
              </p>
            </div>
            <IndianRupee className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Retail Revenue</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(revenueAnalytics?.retailRevenue || 0)}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Telecom Revenue</p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(revenueAnalytics?.telecomRevenue || 0)}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Monthly Growth</p>
              <p className="text-xl font-bold text-green-600">
                {formatPercentage(revenueAnalytics?.monthlyGrowth || 0)}
              </p>
            </div>
            <ArrowUp className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Client Type</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Retail Clients</span>
                <span className="text-sm font-medium">
                  {formatCurrency(revenueAnalytics?.retailRevenue || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full" 
                  style={{ width: `${(revenueAnalytics?.retailRevenue || 0) / (revenueAnalytics?.totalRevenue || 1) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatPercentage((revenueAnalytics?.retailRevenue || 0) / (revenueAnalytics?.totalRevenue || 1) * 100)} of total
              </p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Telecom Clients</span>
                <span className="text-sm font-medium">
                  {formatCurrency(revenueAnalytics?.telecomRevenue || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-purple-600 h-3 rounded-full" 
                  style={{ width: `${(revenueAnalytics?.telecomRevenue || 0) / (revenueAnalytics?.totalRevenue || 1) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatPercentage((revenueAnalytics?.telecomRevenue || 0) / (revenueAnalytics?.totalRevenue || 1) * 100)} of total
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Revenue Clients</h3>
          <div className="space-y-3">
            {revenueAnalytics?.topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{client.name}</p>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      client.type === 'retail' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {client.type.charAt(0).toUpperCase() + client.type.slice(1)}
                    </span>
                  </div>
                </div>
                <span className="text-sm font-medium">{formatCurrency(client.revenue)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Revenue Trend */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <LineChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Monthly revenue trend chart would be rendered here</p>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              {revenueAnalytics?.monthlyRevenue.map((month, index) => (
                <div key={index} className="text-center">
                  <p className="font-medium">{month.month}</p>
                  <p className="text-blue-600">{formatCurrency(month.retail + month.telecom)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAMCAnalytics = () => (
    <div className="space-y-4">
      {/* AMC Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Contracts</p>
              <p className="text-xl font-bold text-gray-900">{amcAnalytics?.totalContracts || 0}</p>
            </div>
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Active Contracts</p>
              <p className="text-xl font-bold text-green-600">{amcAnalytics?.activeContracts || 0}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Expiring Soon</p>
              <p className="text-xl font-bold text-orange-600">{amcAnalytics?.expiringContracts || 0}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Contract Value</p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(amcAnalytics?.contractValue || 0)}
              </p>
            </div>
            <IndianRupee className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* AMC Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Status Distribution</h3>
          <div className="space-y-4">
            {Object.entries(amcAnalytics?.statusBreakdown || {}).map(([status, count]) => (
              <div key={status}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm capitalize text-gray-600">{status}</span>
                  <span className="text-sm font-medium">{count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      status === 'active' ? 'bg-green-500' :
                      status === 'expiring' ? 'bg-orange-500' : 'bg-red-500'
                    }`} 
                    style={{ width: `${(count / (amcAnalytics?.totalContracts || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visit Compliance</h3>
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-300"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="transparent"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-green-500"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${amcAnalytics?.visitCompliance || 0}, 100`}
                  strokeLinecap="round"
                  fill="transparent"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-green-600">
                  {formatPercentage(amcAnalytics?.visitCompliance || 0)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Visit Compliance Rate</p>
          </div>
        </div>
      </div>

      {/* Monthly Renewals */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Renewals & New Contracts</h3>
        <div className="grid grid-cols-3 gap-4">
          {amcAnalytics?.monthlyRenewals.map((month, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-lg font-medium text-gray-900">{month.month}</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-blue-600">
                  <span className="font-medium">{month.renewals}</span> Renewals
                </p>
                <p className="text-sm text-green-600">
                  <span className="font-medium">{month.new}</span> New
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderLeadAnalytics = () => (
    <div className="space-y-4">
      {/* Lead Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Leads</p>
              <p className="text-xl font-bold text-gray-900">{leadAnalytics?.totalLeads || 0}</p>
            </div>
            <Target className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Converted</p>
              <p className="text-xl font-bold text-green-600">{leadAnalytics?.convertedLeads || 0}</p>
            </div>
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Conversion Rate</p>
              <p className="text-xl font-bold text-purple-600">
                {formatPercentage(leadAnalytics?.conversionRate || 0)}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Top Performer Rate</p>
                             <p className="text-xl font-bold text-orange-600">
                 {formatPercentage((leadAnalytics?.topPerformers && leadAnalytics.topPerformers.length > 0) ? leadAnalytics.topPerformers[0].rate : 0)}
               </p>
            </div>
            <User className="w-6 h-6 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Lead Sources & Stages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Sources</h3>
          <div className="space-y-3">
            {Object.entries(leadAnalytics?.leadSources || {}).map(([source, count]) => (
              <div key={source} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-600">{source.replace('_', ' ')}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(count / (leadAnalytics?.totalLeads || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-8">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Pipeline</h3>
          <div className="space-y-3">
            {Object.entries(leadAnalytics?.stageDistribution || {}).map(([stage, count]) => (
              <div key={stage} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-600">{stage}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        stage === 'prospect' ? 'bg-gray-500' :
                        stage === 'qualified' ? 'bg-blue-500' :
                        stage === 'proposal' ? 'bg-yellow-500' :
                        stage === 'negotiation' ? 'bg-orange-500' : 'bg-green-500'
                      }`} 
                      style={{ width: `${(count / (leadAnalytics?.totalLeads || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-8">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Sales Team</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {leadAnalytics?.topPerformers.map((performer, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-yellow-100 text-yellow-600' :
                  index === 1 ? 'bg-gray-100 text-gray-600' : 'bg-orange-100 text-orange-600'
                }`}>
                  <span className="font-bold">{index + 1}</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{performer.name}</p>
                  <p className="text-xs text-gray-600">Sales Representative</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Conversions</span>
                  <span className="text-sm font-medium">{performer.conversions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Rate</span>
                  <span className="text-sm font-medium text-green-600">
                    {formatPercentage(performer.rate)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderEngineerPerformance = () => (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Engineers</p>
              <p className="text-xl font-bold text-gray-900">{engineerPerformance?.totalEngineers || 0}</p>
            </div>
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Avg Tickets/Engineer</p>
              <p className="text-xl font-bold text-green-600">
                {engineerPerformance?.avgTicketsPerEngineer || 0}
              </p>
            </div>
            <Activity className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Avg Resolution Time</p>
              <p className="text-xl font-bold text-orange-600">
                {engineerPerformance?.avgResolutionTime || 0} days
              </p>
            </div>
            <Clock className="w-6 h-6 text-orange-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Avg Rating</p>
              <p className="text-xl font-bold text-purple-600">
                {engineerPerformance?.engineerStats
                  ? (
                      engineerPerformance.engineerStats.reduce(
                        (sum, eng) => sum + (eng.customerRating ?? 0),
                        0
                      ) / (engineerPerformance.engineerStats.length || 1)
                    ).toFixed(1)
                  : "0.0"
                }/5
              </p>
            </div>
            <CheckCircle className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Engineer Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Individual Engineer Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engineer
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tickets Completed
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg TAT
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SLA Compliance
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Rating
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {engineerPerformance?.engineerStats.map((engineer, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {engineer.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-xs font-medium text-gray-900">{engineer.name}</div>
                        <div className="text-xs text-gray-500">Field Engineer</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    <span className="font-medium">{engineer.ticketsCompleted}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    <span className={`font-medium ${
                      engineer.avgTAT <= 2 ? 'text-green-600' :
                      engineer.avgTAT <= 3 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {engineer.avgTAT} days
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      engineer.slaCompliance >= 95 ? 'bg-green-100 text-green-800' :
                      engineer.slaCompliance >= 85 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {formatPercentage(engineer.slaCompliance)}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    <div className="flex items-center">
                      <span className="font-medium">{engineer.customerRating}/5</span>
                      <div className="ml-2 flex space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-3 h-3 rounded-full ${
                              i < Math.floor(engineer.customerRating) ? 'bg-yellow-400' : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          engineer.slaCompliance >= 95 && engineer.customerRating >= 4.5 ? 'bg-green-500' :
                          engineer.slaCompliance >= 85 && engineer.customerRating >= 4.0 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} 
                        style={{ width: `${(engineer.slaCompliance / 100) * 100}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Trend */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Performance Trend</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <LineChart className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">Performance trend chart would be rendered here</p>
            <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
              {engineerPerformance?.performanceTrend.map((month, index) => (
                <div key={index} className="text-center">
                  <p className="font-medium">{month.month}</p>
                  <p className="text-blue-600">Productivity: {month.productivity}%</p>
                  <p className="text-green-600">Quality: {month.quality}%</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="pl-2 pr-6 py-6 space-y-4">
      {/* Header */}
      <PageHeader 
        title="Reports & Analytics"
        subtitle="Comprehensive business insights and performance metrics"
      >
        <div className="flex space-x-3">
          <button
            onClick={fetchAnalyticsData}
            className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-gray-700 hover:to-gray-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
          <button className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-1.5 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg">
            <Download className="w-4 h-4" />
            <span className="text-sm">Export Report</span>
          </button>
        </div>
      </PageHeader>

      {/* Navigation & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Report Type Navigation */}
          <div className="flex flex-wrap gap-2">
            {reportSections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveReport(section.id as ReportType)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    activeReport === section.id
                      ? `bg-${section.color}-50 text-${section.color}-700 border border-${section.color}-200`
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{section.name}</span>
                </button>
              );
            })}
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="px-2 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm focus:border-blue-500"
            >
              <option value="last-7-days">Last 7 Days</option>
              <option value="last-30-days">Last 30 Days</option>
              <option value="last-3-months">Last 3 Months</option>
              <option value="last-year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
            
            {dateRange === 'custom' && (
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      ) : (
        <div>
          {activeReport === 'overview' && renderOverviewDashboard()}
          {activeReport === 'tickets' && renderTicketAnalytics()}
          {activeReport === 'inventory' && renderInventoryAnalytics()}
          {activeReport === 'revenue' && renderRevenueAnalytics()}
          {activeReport === 'amc' && renderAMCAnalytics()}
          {activeReport === 'leads' && renderLeadAnalytics()}
          {activeReport === 'engineers' && renderEngineerPerformance()}
        </div>
      )}
    </div>
  );
};

export default ReportsManagement; 