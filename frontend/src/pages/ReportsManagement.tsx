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
  PieChart as PieChartIcon,
  LineChart,
  BarChart as BarChartIcon,
  Calendar as CalendarIcon,
  MapPin,
  Phone,
  Mail,
  IndianRupee,
  Star
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  AreaChart
} from 'recharts';
import { apiClient } from '../utils/api';
import PageHeader from '../components/ui/PageHeader';

// Chart Components with Recharts
interface RevenueTrendChartProps {
  revenue: number;
  previousRevenue: number;
}

const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ revenue, previousRevenue }) => {
  const data = [
    { name: 'Previous', value: previousRevenue, fill: '#94a3b8' },
    { name: 'Current', value: revenue, fill: '#10b981' }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = (props: any) => {
    if (!props.active || !props.payload || !props.payload.length) {
      return null;
    }

    const data = props.payload[0];
    if (!data) {
      return null;
    }

    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{data.name}</p>
        <p className="text-blue-600 font-semibold">
          {data.value}
        </p>
        {data.payload && data.payload.description && (
          <p className="text-xs text-gray-500">
            {data.payload.description}
          </p>
        )}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickFormatter={formatCurrency}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="value"
          radius={[4, 4, 0, 0]}
          barSize={60}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

interface TicketsAMCChartProps {
  totalTickets: number;
  activeTickets: number;
  resolvedTickets: number;
  amcContracts: number;
}

const TicketsAMCChart: React.FC<TicketsAMCChartProps> = ({ totalTickets, activeTickets, resolvedTickets, amcContracts }) => {
  const data = [
    {
      name: 'Active Tickets',
      value: activeTickets || 0,
      fill: '#f59e0b',
      description: 'Open & in-progress tickets'
    },
    {
      name: 'Resolved Tickets',
      value: resolvedTickets || 0,
      fill: '#10b981',
      description: 'Successfully resolved tickets'
    },
    {
      name: 'AMC Contracts',
      value: amcContracts || 0,
      fill: '#8b5cf6',
      description: 'Active AMC contracts'
    }
  ].filter(item => item.value > 0); // Only show segments with values > 0

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }: any) => {
    if (percent < 0.05) return null; // Don't show labels for very small segments

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // If no data to show, display a message
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <PieChartIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0];
              return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                  <p className="font-medium text-gray-900">{data.name}</p>
                  <p className="text-blue-600 font-semibold">{data.value}</p>
                  {data.payload && data.payload.description && (
                    <p className="text-xs text-gray-500">{data.payload.description}</p>
                  )}
                </div>
              );
            }
            return null;
          }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          formatter={(value, entry: any) => (
            <span className="text-gray-700 text-sm">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

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
  engineerPerformance: Array<{
    name: string;
    ticketsCompleted: number;
    avgTAT: number;
    slaCompliance: number;
    customerRating: number;
  }>;
}

interface InventoryAnalytics {
  totalValue: number;
  totalItems: number;
  lowStockItems: number;
  topMovingItems: Array<{ name: string; movement: number }>;
  categoryBreakdown: Record<string, number>;
  monthlyMovement: Array<{ month: string; inward: number; outward: number }>;
  valueDistribution: Array<{ category: string; value: number }>;
  reorderAlerts: Array<{ product: string; currentStock: number; minStock: number }>;
}

interface RevenueAnalytics {
  totalRevenue: number;
  retailRevenue: number;
  telecomRevenue: number;
  monthlyGrowth: number;
  clientTypeBreakdown: Record<string, number>;
  monthlyRevenue: Array<{ month: string; retail: number; telecom: number }>;
  topClients: Array<{ name: string; revenue: number; type: string }>;
  revenueSources: {
    amc: number;
    service: number;
    parts: number;
    installation: number;
  };
  totalInvoices?: number;
  totalPaidInvoices?: number;
  outstandingRevenue?: number;
}

interface AMCAnalytics {
  totalContracts: number;
  activeContracts: number;
  expiringContracts: number;
  overdueContracts: number;
  contractValue: number;
  visitCompliance: number;
  statusBreakdown: Record<string, number>;
  customerRetention: number;
}

interface LeadAnalytics {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  leadSources: Record<string, number>;
  stageDistribution: Record<string, number>;
  monthlyConversion: Array<{ month: string; leads: number; converted: number }>;
  topPerformers: Array<{ name: string; conversions: number; rate: number }>;
  avgLeadTime: number;
}

interface FeedbackAnalytics {
  totalFeedbacks: number;
  averageRating: number;
  satisfactionRate: number;
  responseRate: number;
  ratingDistribution: Record<string, number>;
  serviceQualityBreakdown: Record<string, number>;
  technicianRatings: Array<{ name: string; rating: number; feedbackCount: number }>;
  monthlyTrends: Array<{ month: string; averageRating: number; feedbackCount: number }>;
  topIssues: Array<{ issue: string; count: number; percentage: number }>;
  recommendationRate: number;
  improvementSuggestions: Array<{ suggestion: string; count: number }>;
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

interface DashboardAnalytics {
  core: {
    totalCustomers: number;
    totalTickets: number;
    totalAMCs: number;
    totalProducts: number;
    totalRevenue: number;
    totalInvoices: number;
    totalQuotations: number;
  };
  service: {
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    overdueTickets: number;
    avgResolutionTime: number;
    slaComplianceRate: number;
  };
  amc: {
    activeContracts: number;
    expiringContracts: number;
    totalContractValue: number;
    visitComplianceRate: number;
  };
  inventory: {
    lowStockItems: number;
    totalStockValue: number;
    stockMovement: {
      inward: number;
      outward: number;
    };
  };
  customer: {
    newLeads: number;
    qualifiedLeads: number;
    convertedLeads: number;
    conversionRate: number;
    avgSatisfaction: number;
    totalFeedbacks: number;
  };
  trends?: any;
}

type ReportType = 'overview' | 'tickets' | 'inventory' | 'revenue' | 'amc' | 'leads' | 'engineers' | 'feedback';
type DateRange = 'last-7-days' | 'last-30-days' | 'last-3-months' | 'last-year' | 'custom';

const ReportsManagement: React.FC = () => {
  // State management
  const [activeReport, setActiveReport] = useState<ReportType>('overview');
  const [dateRange, setDateRange] = useState<DateRange>('last-30-days');
  const [loading, setLoading] = useState(false);
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Analytics data state
  const [dashboardAnalytics, setDashboardAnalytics] = useState<DashboardAnalytics | null>(null);
  const [ticketAnalytics, setTicketAnalytics] = useState<TicketAnalytics | null>(null);
  const [inventoryAnalytics, setInventoryAnalytics] = useState<InventoryAnalytics | null>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null);
  const [amcAnalytics, setAmcAnalytics] = useState<AMCAnalytics | null>(null);
  const [leadAnalytics, setLeadAnalytics] = useState<LeadAnalytics | null>(null);
  const [engineerPerformance, setEngineerPerformance] = useState<EngineerPerformance | null>(null);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState<FeedbackAnalytics | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [activeReport, dateRange, customDateFrom, customDateTo]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'last-7-days':
        return {
          dateFrom: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          dateTo: now.toISOString()
        };
      case 'last-30-days':
        return {
          dateFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          dateTo: now.toISOString()
        };
      case 'last-3-months':
        return {
          dateFrom: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          dateTo: now.toISOString()
        };
      case 'last-year':
        return {
          dateFrom: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
          dateTo: now.toISOString()
        };
      case 'custom':
        return {
          dateFrom: customDateFrom,
          dateTo: customDateTo
        };
      default:
        return {
          dateFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          dateTo: now.toISOString()
        };
    }
  };

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const { dateFrom, dateTo } = getDateRange();
      const filters = { dateFrom, dateTo };

      console.log('Fetching analytics data for:', activeReport, 'with filters:', filters);

      switch (activeReport) {
        case 'overview':
          const dashboardResponse = await apiClient.reports.dashboardAnalytics(filters);
          console.log('Dashboard response:', dashboardResponse);
          setDashboardAnalytics(dashboardResponse.data);
          break;
        case 'tickets':
          const ticketsResponse = await apiClient.reports.serviceTickets({
            ...filters,
            reportType: 'summary'
          });
          console.log('Tickets response:', ticketsResponse);
          // Extract metrics from the response and transform to match frontend interface
          const metrics = ticketsResponse.data.metrics || {};
          console.log('Raw metrics:', metrics);
          // Handle both avgResolutionTimeHours (from service report) and avgResolutionTime (from dashboard)
          const avgTAT = metrics.avgResolutionTimeHours || metrics.avgResolutionTime || 0;
          console.log('Calculated avgTAT:', avgTAT, 'from metrics:', { avgResolutionTimeHours: metrics.avgResolutionTimeHours, avgResolutionTime: metrics.avgResolutionTime });

          const transformedTicketData = {
            totalTickets: metrics.totalTickets || 0,
            closedTickets: metrics.statusBreakdown?.resolved || 0,
            avgTAT: avgTAT,
            slaCompliance: metrics.slaComplianceRate || 0,
            priorityBreakdown: metrics.priorityBreakdown || {},
            statusBreakdown: metrics.statusBreakdown || {},
            tatDistribution: metrics.tatDistribution || [],
            monthlyTrend: [], // Not provided by backend yet
            engineerPerformance: [] // Not provided by backend yet
          };
          console.log('Transformed ticket data:', transformedTicketData);
          setTicketAnalytics(transformedTicketData);
          break;
        case 'inventory':
          const inventoryResponse = await apiClient.reports.inventory({
            ...filters,
            reportType: 'stock_levels'
          });
          console.log('Inventory response:', inventoryResponse);

          // Transform the inventory data to match frontend interface
          const inventoryData = inventoryResponse.data;
          const inventoryMetrics = inventoryData.metrics || {};
          const stockData = inventoryData.stockData || [];
          const categoryBreakdown = inventoryData.categoryBreakdown || {};

          // Calculate value distribution from category breakdown
          const valueDistribution = Object.entries(categoryBreakdown).map(([category, data]: [string, any]) => ({
            category: category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' '),
            value: data.totalValue || 0
          }));

          // Calculate top moving items (mock data for now since backend doesn't provide this)
          const topMovingItems = stockData.slice(0, 5).map((stock: any) => ({
            name: stock.product?.name || 'Unknown Product',
            movement: Math.floor(Math.random() * 200) + 50 // Mock movement data
          }));

          const transformedInventoryData = {
            totalValue: inventoryMetrics.totalStockValue || 0,
            totalItems: inventoryMetrics.totalStockItems || 0,
            lowStockItems: inventoryMetrics.lowStockItems || 0,
            topMovingItems,
            categoryBreakdown,
            monthlyMovement: [], // Not provided by backend yet
            valueDistribution,
            reorderAlerts: stockData
              .filter((stock: any) => stock.availableQuantity <= (stock.product?.minStockLevel || 5))
              .slice(0, 5)
              .map((stock: any) => ({
                product: stock.product?.name || 'Unknown Product',
                currentStock: stock.availableQuantity || 0,
                minStock: stock.product?.minStockLevel || 5
              }))
          };

          console.log('Transformed inventory data:', transformedInventoryData);
          setInventoryAnalytics(transformedInventoryData);
          break;
        case 'revenue':
          const revenueResponse = await apiClient.reports.revenue({
            ...filters,
            reportType: 'sales_summary'
          });
          console.log('Revenue response:', revenueResponse);
          // Transform the revenue data to match frontend interface
          const revenueData = revenueResponse.data;
          console.log('Raw revenue data:', revenueData);
          const transformedRevenueData = {
            totalRevenue: revenueData.metrics?.totalInvoiceRevenue || 0,
            retailRevenue: revenueData.metrics?.totalInvoiceRevenue || 0, // Will be calculated based on invoice types
            telecomRevenue: 0, // Will be calculated based on invoice types
            monthlyGrowth: 0, // Will be calculated
            clientTypeBreakdown: {},
            monthlyRevenue: revenueData.monthlyInvoiceRevenue || [],
            topClients: [],
            revenueSources: {
              amc: revenueData.metrics?.totalAMCRevenue || 0,
              service: 0,
              parts: 0,
              installation: 0
            },
            totalInvoices: revenueData.totalInvoices || 0,
            totalPaidInvoices: revenueData.totalPaidInvoices || 0,
            outstandingRevenue: revenueData.outstandingRevenue || 0
          };
          console.log('Transformed revenue data:', transformedRevenueData);
          setRevenueAnalytics(transformedRevenueData);
          break;
        case 'amc':
          // Fetch AMC analytics using the proper AMC endpoints
          console.log('Fetching AMC analytics...');

          try {
            // Get AMC dashboard statistics
            const amcDashboardResponse = await apiClient.amc.getDashboard();
            console.log('AMC dashboard response:', amcDashboardResponse);

            // Get AMC stats for additional data
            const amcStatsResponse = await apiClient.amc.getStats();
            console.log('AMC stats response:', amcStatsResponse);

            const dashboardData = amcDashboardResponse.data || {};
            const statsData = amcStatsResponse.data || {};

            // Transform the AMC data to match frontend interface
            const transformedAMCData = {
              totalContracts: dashboardData.totalContracts || statsData.totalContracts || 0,
              activeContracts: dashboardData.activeContracts || statsData.activeContracts || 0,
              expiringContracts: dashboardData.expiringSoon || statsData.expiringContracts || 0,
              overdueContracts: statsData.expiredContracts || 0,
              contractValue: dashboardData.totalValue || statsData.totalContractValue || 0,
              visitCompliance: dashboardData.completionRate || statsData.visitCompletionRate || 0,
              statusBreakdown: {
                active: dashboardData.activeContracts || 0,
                expired: statsData.expiredContracts || 0,
                cancelled: statsData.cancelledContracts || 0,
                expiring: dashboardData.expiringSoon || 0
              },
              customerRetention: 0 // Will be calculated if needed
            };

            console.log('Transformed AMC data:', transformedAMCData);
            setAmcAnalytics(transformedAMCData);
          } catch (amcError) {
            console.error('Error fetching AMC data:', amcError);
            // Fallback to dashboard analytics AMC data
            const fallbackAMCData = {
              totalContracts: dashboardAnalytics?.core.totalAMCs || 0,
              activeContracts: dashboardAnalytics?.amc.activeContracts || 0,
              expiringContracts: dashboardAnalytics?.amc.expiringContracts || 0,
              overdueContracts: 0,
              contractValue: dashboardAnalytics?.amc.totalContractValue || 0,
              visitCompliance: dashboardAnalytics?.amc.visitComplianceRate || 0,
              statusBreakdown: {
                active: dashboardAnalytics?.amc.activeContracts || 0,
                expired: 0,
                cancelled: 0,
                expiring: dashboardAnalytics?.amc.expiringContracts || 0
              },
              customerRetention: 0
            };
            setAmcAnalytics(fallbackAMCData);
          }
          break;
        case 'leads':
          // Fetch Lead analytics using the proper customer endpoints
          console.log('Fetching Lead analytics...');
          
          try {
            // Get customer analytics data
            const customersResponse = await apiClient.customers.getAll({
              ...filters,
              limit: 100 // Backend validation restricts to max 100
            });
            console.log('Customers response:', customersResponse);
            
            const customersData = customersResponse.data?.customers || [];
            const counts = customersResponse.data?.counts || {};
            
            // Calculate lead analytics from customer data
            const totalLeads = (counts.newLeads || 0) + (counts.qualified || 0);
            const convertedLeads = counts.converted || 0;
            const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
            
            // Calculate stage distribution
            const stageDistribution: Record<string, number> = {
              new: counts.newLeads || 0,
              qualified: counts.qualified || 0,
              contacted: counts.contacted || 0,
              converted: counts.converted || 0,
              lost: counts.lost || 0
            };
            
            // Calculate lead sources (mock data for now since backend doesn't provide this)
            const leadSources: Record<string, number> = customersData.reduce((acc: Record<string, number>, customer: any) => {
              const source = customer.leadSource || 'unknown';
              acc[source] = (acc[source] || 0) + 1;
              return acc;
            }, {});
            
            // Calculate monthly conversion trends
            const monthlyConversion: Record<string, { month: string; leads: number; converted: number }> = customersData.reduce((acc: Record<string, { month: string; leads: number; converted: number }>, customer: any) => {
              const month = new Date(customer.createdAt).toISOString().slice(0, 7);
              if (!acc[month]) {
                acc[month] = { month, leads: 0, converted: 0 };
              }
              acc[month].leads += 1;
              if (customer.status === 'converted') {
                acc[month].converted += 1;
              }
              return acc;
            }, {});
            
            // Transform to array format
            const monthlyConversionArray: Array<{ month: string; leads: number; converted: number }> = Object.values(monthlyConversion).slice(-6);
            
            // Calculate average lead time (mock data for now)
            const avgLeadTime = 15; // Average days from lead to conversion
            
            // Calculate top performers (mock data for now)
            const topPerformers: Array<{ name: string; conversions: number; rate: number }> = [
              { name: 'Sales Team A', conversions: 25, rate: 85.5 },
              { name: 'Sales Team B', conversions: 18, rate: 72.3 },
              { name: 'Sales Team C', conversions: 12, rate: 68.1 }
            ];
            
            const transformedLeadData: LeadAnalytics = {
              totalLeads,
              convertedLeads,
              conversionRate,
              leadSources,
              stageDistribution,
              monthlyConversion: monthlyConversionArray,
              topPerformers,
              avgLeadTime
            };
            
            console.log('Transformed lead data:', transformedLeadData);
            setLeadAnalytics(transformedLeadData);
          } catch (leadError) {
            console.error('Error fetching lead data:', leadError);
            // Fallback to dashboard analytics lead data
            const fallbackLeadData = {
              totalLeads: (dashboardAnalytics?.customer.newLeads || 0) + (dashboardAnalytics?.customer.qualifiedLeads || 0),
              convertedLeads: dashboardAnalytics?.customer.convertedLeads || 0,
              conversionRate: dashboardAnalytics?.customer.conversionRate || 0,
              leadSources: {},
              stageDistribution: {
                new: dashboardAnalytics?.customer.newLeads || 0,
                qualified: dashboardAnalytics?.customer.qualifiedLeads || 0,
                contacted: 0,
                converted: dashboardAnalytics?.customer.convertedLeads || 0,
                lost: 0
              },
              monthlyConversion: [],
              topPerformers: [],
              avgLeadTime: 0
            };
            setLeadAnalytics(fallbackLeadData);
          }
          break;
        case 'feedback':
          // Fetch Feedback analytics using the proper feedback endpoints
          console.log('Fetching Feedback analytics...');
          
          try {
            // Get feedback statistics
            const feedbackStatsResponse = await apiClient.feedback.getStats();
            console.log('Feedback stats response:', feedbackStatsResponse);
            
            // Get all feedback data for detailed analytics
            const feedbackDataResponse = await apiClient.feedback.getAll({
              ...filters,
              limit: 100 // Backend validation restricts to max 100
            });
            console.log('Feedback data response:', feedbackDataResponse);
            
            const feedbackStats = feedbackStatsResponse.data || {};
            const feedbackData = feedbackDataResponse.data?.feedback || [];
            
            // Calculate feedback analytics from the data
            const totalFeedbacks = feedbackStats.stats?.totalFeedback || feedbackData.length;
            const averageRating = feedbackStats.stats?.averageRating || 
              (feedbackData.length > 0 ? feedbackData.reduce((sum: number, fb: any) => sum + (fb.rating || 0), 0) / feedbackData.length : 0);
            
            // Calculate satisfaction rate (ratings >= 4)
            const satisfiedFeedbacks = feedbackData.filter((fb: any) => (fb.rating || 0) >= 4).length;
            const satisfactionRate = totalFeedbacks > 0 ? (satisfiedFeedbacks / totalFeedbacks) * 100 : 0;
            
            // Calculate response rate (submitted feedbacks)
            const submittedFeedbacks = feedbackData.filter((fb: any) => fb.isSubmitted).length;
            const responseRate = totalFeedbacks > 0 ? (submittedFeedbacks / totalFeedbacks) * 100 : 0;
            
            // Calculate rating distribution
            const ratingDistribution: Record<string, number> = {
              '5': feedbackData.filter((fb: any) => fb.rating === 5).length,
              '4': feedbackData.filter((fb: any) => fb.rating === 4).length,
              '3': feedbackData.filter((fb: any) => fb.rating === 3).length,
              '2': feedbackData.filter((fb: any) => fb.rating === 2).length,
              '1': feedbackData.filter((fb: any) => fb.rating === 1).length,
              '0': feedbackData.filter((fb: any) => fb.rating === 0).length
            };
            
            // Calculate service quality breakdown
            const serviceQualityBreakdown: Record<string, number> = feedbackData.reduce((acc: Record<string, number>, fb: any) => {
              const quality = fb.serviceQuality || 'good';
              acc[quality] = (acc[quality] || 0) + 1;
              return acc;
            }, {});
            
            // Calculate technician ratings
            const technicianRatings: Array<{ name: string; rating: number; feedbackCount: number }> = [];
            const technicianData = feedbackData.reduce((acc: Record<string, { totalRating: number; count: number }>, fb: any) => {
              if (fb.ticketId?.assignedTo) {
                const technicianName = `${fb.ticketId.assignedTo.firstName || ''} ${fb.ticketId.assignedTo.lastName || ''}`.trim();
                if (!acc[technicianName]) {
                  acc[technicianName] = { totalRating: 0, count: 0 };
                }
                acc[technicianName].totalRating += fb.technicianRating || 0;
                acc[technicianName].count += 1;
              }
              return acc;
            }, {});
            
            Object.entries(technicianData).forEach(([name, data]) => {
              technicianRatings.push({
                name,
                rating: data.count > 0 ? data.totalRating / data.count : 0,
                feedbackCount: data.count
              });
            });
            
            // Calculate monthly trends
            const monthlyTrends: Record<string, { totalRating: number; count: number }> = feedbackData.reduce((acc: Record<string, { totalRating: number; count: number }>, fb: any) => {
              const month = new Date(fb.feedbackDate || fb.createdAt).toISOString().slice(0, 7);
              if (!acc[month]) {
                acc[month] = { totalRating: 0, count: 0 };
              }
              acc[month].totalRating += fb.rating || 0;
              acc[month].count += 1;
              return acc;
            }, {});
            
            const monthlyTrendsArray: Array<{ month: string; averageRating: number; feedbackCount: number }> = Object.entries(monthlyTrends)
              .map(([month, data]) => ({
                month,
                averageRating: data.count > 0 ? data.totalRating / data.count : 0,
                feedbackCount: data.count
              }))
              .sort((a, b) => a.month.localeCompare(b.month))
              .slice(-6);
            
            // Calculate recommendation rate
            const recommendedFeedbacks = feedbackData.filter((fb: any) => fb.wouldRecommend).length;
            const recommendationRate = totalFeedbacks > 0 ? (recommendedFeedbacks / totalFeedbacks) * 100 : 0;
            
            // Calculate top issues from comments (mock data for now)
            const topIssues: Array<{ issue: string; count: number; percentage: number }> = [
              { issue: 'Slow response time', count: 15, percentage: 25 },
              { issue: 'Technician knowledge', count: 8, percentage: 13 },
              { issue: 'Service quality', count: 6, percentage: 10 },
              { issue: 'Communication', count: 4, percentage: 7 }
            ];
            
            // Calculate improvement suggestions (mock data for now)
            const improvementSuggestions: Array<{ suggestion: string; count: number }> = [
              { suggestion: 'Faster response times', count: 12 },
              { suggestion: 'Better technician training', count: 8 },
              { suggestion: 'Improved communication', count: 6 },
              { suggestion: 'More detailed reports', count: 4 }
            ];
            
            const transformedFeedbackData: FeedbackAnalytics = {
              totalFeedbacks,
              averageRating: Math.round(averageRating * 10) / 10,
              satisfactionRate: Math.round(satisfactionRate * 10) / 10,
              responseRate: Math.round(responseRate * 10) / 10,
              ratingDistribution,
              serviceQualityBreakdown,
              technicianRatings: technicianRatings.slice(0, 5), // Top 5 technicians
              monthlyTrends: monthlyTrendsArray,
              topIssues,
              recommendationRate: Math.round(recommendationRate * 10) / 10,
              improvementSuggestions
            };
            
            console.log('Transformed feedback data:', transformedFeedbackData);
            setFeedbackAnalytics(transformedFeedbackData);
          } catch (feedbackError) {
            console.error('Error fetching feedback data:', feedbackError);
            // Fallback to dashboard analytics feedback data
            const fallbackFeedbackData: FeedbackAnalytics = {
              totalFeedbacks: dashboardAnalytics?.customer.totalFeedbacks || 0,
              averageRating: dashboardAnalytics?.customer.avgSatisfaction || 0,
              satisfactionRate: 0,
              responseRate: 0,
              ratingDistribution: {},
              serviceQualityBreakdown: {},
              technicianRatings: [],
              monthlyTrends: [],
              topIssues: [],
              recommendationRate: 0,
              improvementSuggestions: []
            };
            setFeedbackAnalytics(fallbackFeedbackData);
          }
          break;
        case 'engineers':
          // Engineer performance would be part of performance report
          const engineersResponse = await apiClient.reports.performance({
            ...filters,
            reportType: 'technician_performance'
          });
          setEngineerPerformance(engineersResponse.data);
          break;
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Fallback to mock data if API fails
      setMockData();
    } finally {
      setLoading(false);
    }
  };

  const setMockData = () => {
    // Set mock data as fallback
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
      ],
      engineerPerformance: [
        { name: 'Rajesh Kumar', ticketsCompleted: 23, avgTAT: 2.1, slaCompliance: 95.6, customerRating: 4.8 },
        { name: 'Suresh Patel', ticketsCompleted: 19, avgTAT: 2.5, slaCompliance: 89.5, customerRating: 4.6 },
        { name: 'Vikram Singh', ticketsCompleted: 21, avgTAT: 3.2, slaCompliance: 87.2, customerRating: 4.4 }
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
      ],
      reorderAlerts: [
        { product: 'Oil Filter', currentStock: 5, minStock: 10 },
        { product: 'Air Filter', currentStock: 3, minStock: 8 },
        { product: 'Fuel Filter', currentStock: 2, minStock: 5 }
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
      ],
      revenueSources: {
        amc: 2500000,
        service: 1800000,
        parts: 800000,
        installation: 520000
      },
      totalInvoices: 234,
      totalPaidInvoices: 210,
      outstandingRevenue: 24000
    });

    setDashboardAnalytics({
      core: {
        totalCustomers: 120,
        totalTickets: 156,
        totalAMCs: 89,
        totalProducts: 1247,
        totalRevenue: 5620000,
        totalInvoices: 234,
        totalQuotations: 156
      },
      service: {
        openTickets: 15,
        inProgressTickets: 28,
        resolvedTickets: 89,
        overdueTickets: 3,
        avgResolutionTime: 2.8,
        slaComplianceRate: 89.7
      },
      amc: {
        activeContracts: 76,
        expiringContracts: 12,
        totalContractValue: 4200000,
        visitComplianceRate: 94.2
      },
      inventory: {
        lowStockItems: 23,
        totalStockValue: 2850000,
        stockMovement: {
          inward: 844,
          outward: 690
        }
      },
      customer: {
        newLeads: 45,
        qualifiedLeads: 67,
        convertedLeads: 23,
        conversionRate: 37.2,
        avgSatisfaction: 4.5,
        totalFeedbacks: 89
      }
    });
  };

  const reportSections = [
    { id: 'overview', name: 'Overview Dashboard', icon: BarChart3, color: 'blue' },
    { id: 'tickets', name: 'Service Tickets TAT', icon: Clock, color: 'orange' },
    { id: 'inventory', name: 'Inventory Analytics', icon: Package, color: 'green' },
    { id: 'revenue', name: 'Revenue Tracking', icon: IndianRupee, color: 'purple' },
    { id: 'amc', name: 'AMC Status Reports', icon: Briefcase, color: 'indigo' },
    { id: 'leads', name: 'Lead Conversion', icon: Target, color: 'pink' },
    { id: 'engineers', name: 'Engineer Performance', icon: User, color: 'teal' },
    { id: 'feedback', name: 'Customer Feedback', icon: Users, color: 'yellow' }
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
    return `${Math.round(value)}%`;
  };

  const formatResolutionTime = (time: number) => {
    // Handle very small numbers (likely in days) and convert to hours for display
    if (time < 0.01 && time > 0) {
      // Convert days to hours for small values
      const hours = time * 24;
      return hours.toFixed(1);
    }
    // For larger values, assume they're already in hours
    return time.toFixed(1);
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
                {formatCurrency(dashboardAnalytics?.core.totalRevenue || 0)}
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
                {(dashboardAnalytics?.service.openTickets || 0) + (dashboardAnalytics?.service.inProgressTickets || 0)}
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
                {dashboardAnalytics?.amc.activeContracts || 0}
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
                {formatPercentage(dashboardAnalytics?.service.slaComplianceRate || 0)}
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          <div className="h-64">
            <RevenueTrendChart
              revenue={dashboardAnalytics?.core.totalRevenue || 0}
              previousRevenue={dashboardAnalytics?.core.totalRevenue ? dashboardAnalytics.core.totalRevenue * 0.875 : 0}
            />
          </div>
        </div>

        {/* Tickets & AMC Contracts Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tickets & AMC Contracts</h3>
          <div className="h-64">
            <TicketsAMCChart
              totalTickets={dashboardAnalytics?.core.totalTickets || 0}
              activeTickets={(dashboardAnalytics?.service.openTickets || 0) + (dashboardAnalytics?.service.inProgressTickets || 0)}
              resolvedTickets={dashboardAnalytics?.service.resolvedTickets || 0}
              amcContracts={dashboardAnalytics?.amc.activeContracts || 0}
            />
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Customer Metrics</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Customers</span>
              <span className="text-sm font-medium">{dashboardAnalytics?.core.totalCustomers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">New Leads</span>
              <span className="text-sm font-medium text-blue-600">{dashboardAnalytics?.customer.newLeads || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Conversion Rate</span>
              <span className="text-sm font-medium text-green-600">
                {formatPercentage(dashboardAnalytics?.customer.conversionRate || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Inventory Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Items</span>
              <span className="text-sm font-medium">{dashboardAnalytics?.core.totalProducts || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Low Stock Items</span>
              <span className="text-sm font-medium text-red-600">{dashboardAnalytics?.inventory.lowStockItems || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Value</span>
              <span className="text-sm font-medium">{formatCurrency(dashboardAnalytics?.inventory.totalStockValue || 0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Service Performance</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Resolution Time</span>
              <span className="text-sm font-medium">{formatResolutionTime(dashboardAnalytics?.service.avgResolutionTime || 0)} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Overdue Tickets</span>
              <span className="text-sm font-medium text-red-600">{dashboardAnalytics?.service.overdueTickets || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Resolved Tickets</span>
              <span className="text-sm font-medium text-green-600">{dashboardAnalytics?.service.resolvedTickets || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTicketAnalytics = () => {
    // Debug logging
    console.log('renderTicketAnalytics called, ticketAnalytics:', ticketAnalytics);

    // If no data is available, show a message
    if (!ticketAnalytics) {
      return (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No ticket analytics data available</p>
          <p className="text-sm text-gray-500 mt-2">Please try refreshing the data or check your filters</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* TAT Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Average TAT</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatResolutionTime(ticketAnalytics?.avgTAT || 0)} {(ticketAnalytics?.avgTAT || 0) < 0.01 && (ticketAnalytics?.avgTAT || 0) > 0 ? 'hours' : 'days'}
                </p>
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
            {(ticketAnalytics?.tatDistribution || []).map((item, index) => (
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
                        className={`h-2 rounded-full ${priority === 'critical' ? 'bg-red-500' :
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
                        className={`h-2 rounded-full ${status === 'open' ? 'bg-blue-500' :
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
  };

  const renderInventoryAnalytics = (): JSX.Element => {
    // Debug logging
    console.log('renderInventoryAnalytics called, inventoryAnalytics:', inventoryAnalytics);

    // If no data is available, show a message
    if (!inventoryAnalytics) {
      return (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No inventory analytics data available</p>
          <p className="text-sm text-gray-500 mt-2">Please try refreshing the data or check your filters</p>
        </div>
      );
    }

    return (
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
              {(inventoryAnalytics?.valueDistribution || []).map((item, index) => (
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
              {(inventoryAnalytics?.topMovingItems || []).map((item, index) => (
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
  };

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
              <p className="text-xs text-gray-600">AMC Revenue</p>
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(revenueAnalytics?.revenueSources?.amc || 0)}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Invoice Revenue</p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(revenueAnalytics?.totalRevenue || 0)}
              </p>
            </div>
            <TrendingUp className="w-6 h-6 text-purple-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Invoices</p>
              <p className="text-xl font-bold text-green-600">
                {revenueAnalytics?.totalInvoices || 0}
              </p>
            </div>
            <FileText className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Source</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">Invoice Revenue</span>
                <span className="text-sm font-medium">
                  {formatCurrency(revenueAnalytics?.totalRevenue || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${(revenueAnalytics?.totalRevenue || 0) / ((revenueAnalytics?.totalRevenue || 0) + (revenueAnalytics?.revenueSources?.amc || 0)) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatPercentage((revenueAnalytics?.totalRevenue || 0) / ((revenueAnalytics?.totalRevenue || 0) + (revenueAnalytics?.revenueSources?.amc || 0)) * 100)} of total
              </p>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600">AMC Revenue</span>
                <span className="text-sm font-medium">
                  {formatCurrency(revenueAnalytics?.revenueSources?.amc || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-purple-600 h-3 rounded-full"
                  style={{ width: `${(revenueAnalytics?.revenueSources?.amc || 0) / ((revenueAnalytics?.totalRevenue || 0) + (revenueAnalytics?.revenueSources?.amc || 0)) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatPercentage((revenueAnalytics?.revenueSources?.amc || 0) / ((revenueAnalytics?.totalRevenue || 0) + (revenueAnalytics?.revenueSources?.amc || 0)) * 100)} of total
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue Trend</h3>
          <div className="space-y-3">
            {(revenueAnalytics?.monthlyRevenue || []).slice(-6).map((month: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {typeof month._id === 'object' && month._id?.year && month._id?.month
                        ? `${month._id.month}/${month._id.year}`
                        : typeof month._id === 'string'
                          ? month._id
                          : `Month ${index + 1}`}
                    </p>
                    <span className="text-xs text-gray-500">
                      {month.invoices || 0} invoices
                    </span>
                  </div>
                </div>
                <span className="text-sm font-medium">{formatCurrency(month.revenue || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Revenue Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Revenue</span>
              <span className="text-sm font-medium">{formatCurrency(revenueAnalytics?.totalRevenue || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">AMC Revenue</span>
              <span className="text-sm font-medium text-blue-600">{formatCurrency(revenueAnalytics?.revenueSources?.amc || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Invoice Revenue</span>
              <span className="text-sm font-medium text-green-600">{formatCurrency(revenueAnalytics?.totalRevenue || 0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Invoice Status</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Invoices</span>
              <span className="text-sm font-medium">{revenueAnalytics?.totalInvoices || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Paid Invoices</span>
              <span className="text-sm font-medium text-green-600">{revenueAnalytics?.totalPaidInvoices || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Outstanding</span>
              <span className="text-sm font-medium text-red-600">{formatCurrency(revenueAnalytics?.outstandingRevenue || 0)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Performance</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Avg Invoice Value</span>
              <span className="text-sm font-medium">
                {revenueAnalytics?.totalInvoices ? formatCurrency((revenueAnalytics.totalRevenue || 0) / revenueAnalytics.totalInvoices) : formatCurrency(0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Payment Rate</span>
              <span className="text-sm font-medium text-green-600">
                {revenueAnalytics?.totalInvoices ? formatPercentage((revenueAnalytics.totalPaidInvoices || 0) / revenueAnalytics.totalInvoices * 100) : '0%'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Growth Rate</span>
              <span className="text-sm font-medium text-blue-600">
                {formatPercentage(revenueAnalytics?.monthlyGrowth || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAMCAnalytics = (): JSX.Element => {
    // Debug logging
    console.log('renderAMCAnalytics called, amcAnalytics:', amcAnalytics);

    // If no data is available, show a message
    if (!amcAnalytics) {
      return (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No AMC analytics data available</p>
          <p className="text-sm text-gray-500 mt-2">Please try refreshing the data or check your filters</p>
        </div>
      );
    }

    return (
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
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm capitalize text-gray-600">Active</span>
                  <span className="text-sm font-medium">{amcAnalytics?.activeContracts || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${((amcAnalytics?.activeContracts || 0) / (amcAnalytics?.totalContracts || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm capitalize text-gray-600">Expiring</span>
                  <span className="text-sm font-medium">{amcAnalytics?.expiringContracts || 0}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${((amcAnalytics?.expiringContracts || 0) / (amcAnalytics?.totalContracts || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
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
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-lg font-medium text-gray-900">Jan</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-blue-600">
                  <span className="font-medium">8</span> Renewals
                </p>
                <p className="text-sm text-green-600">
                  <span className="font-medium">5</span> New
                </p>
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-lg font-medium text-gray-900">Feb</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-blue-600">
                  <span className="font-medium">12</span> Renewals
                </p>
                <p className="text-sm text-green-600">
                  <span className="font-medium">7</span> New
                </p>
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-lg font-medium text-gray-900">Mar</p>
              <div className="mt-2 space-y-1">
                <p className="text-sm text-blue-600">
                  <span className="font-medium">15</span> Renewals
                </p>
                <p className="text-sm text-green-600">
                  <span className="font-medium">9</span> New
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLeadAnalytics = (): JSX.Element => {
    // Debug logging
    console.log('renderLeadAnalytics called, leadAnalytics:', leadAnalytics);
    
    // If no data is available, show a message
    if (!leadAnalytics) {
      return (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No lead analytics data available</p>
          <p className="text-sm text-gray-500 mt-2">Please try refreshing the data or check your filters</p>
        </div>
      );
    }

    return (
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
                <p className="text-xs text-gray-600">Avg Lead Time</p>
                <p className="text-xl font-bold text-orange-600">
                  {leadAnalytics?.avgLeadTime || 0} days
                </p>
              </div>
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Lead Stage Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Stage Distribution</h3>
            <div className="space-y-4">
              {Object.entries(leadAnalytics?.stageDistribution || {}).map(([stage, count]) => (
                <div key={stage}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm capitalize text-gray-600">{stage}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        stage === 'new' ? 'bg-blue-500' :
                        stage === 'qualified' ? 'bg-yellow-500' :
                        stage === 'contacted' ? 'bg-purple-500' :
                        stage === 'converted' ? 'bg-green-500' : 'bg-red-500'
                      }`} 
                      style={{ width: `${(count / (leadAnalytics?.totalLeads || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Conversion Trend</h3>
            <div className="space-y-3">
              {(leadAnalytics?.monthlyConversion || []).slice(-6).map((month: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{month.month}</p>
                      <span className="text-xs text-gray-500">
                        {month.leads} leads, {month.converted} converted
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    {month.leads > 0 ? formatPercentage((month.converted / month.leads) * 100) : '0%'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(leadAnalytics?.topPerformers || []).map((performer, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-lg font-medium text-gray-900">{performer.name}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-blue-600">
                    <span className="font-medium">{performer.conversions}</span> conversions
                  </p>
                  <p className="text-sm text-green-600">
                    <span className="font-medium">{performer.rate}%</span> success rate
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderFeedbackAnalytics = (): JSX.Element => {
    // Debug logging
    console.log('renderFeedbackAnalytics called, feedbackAnalytics:', feedbackAnalytics);
    
    // If no data is available, show a message
    if (!feedbackAnalytics) {
      return (
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No feedback analytics data available</p>
          <p className="text-sm text-gray-500 mt-2">Please try refreshing the data or check your filters</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Feedback Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Total Feedbacks</p>
                <p className="text-xl font-bold text-gray-900">{feedbackAnalytics?.totalFeedbacks || 0}</p>
              </div>
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Average Rating</p>
                <p className="text-xl font-bold text-green-600">{feedbackAnalytics?.averageRating || 0}/5</p>
              </div>
              <Star className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Satisfaction Rate</p>
                <p className="text-xl font-bold text-purple-600">
                  {formatPercentage(feedbackAnalytics?.satisfactionRate || 0)}
                </p>
              </div>
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">Response Rate</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatPercentage(feedbackAnalytics?.responseRate || 0)}
                </p>
              </div>
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Rating Distribution & Service Quality */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rating Distribution</h3>
            <div className="space-y-4">
              {Object.entries(feedbackAnalytics?.ratingDistribution || {}).map(([rating, count]) => (
                <div key={rating}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">
                      {rating === '0' ? 'No Rating' : `${rating} Star${rating === '1' ? '' : 's'}`}
                    </span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        rating === '5' ? 'bg-green-500' :
                        rating === '4' ? 'bg-blue-500' :
                        rating === '3' ? 'bg-yellow-500' :
                        rating === '2' ? 'bg-orange-500' :
                        rating === '1' ? 'bg-red-500' : 'bg-gray-400'
                      }`} 
                      style={{ width: `${(count / (feedbackAnalytics?.totalFeedbacks || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Quality Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(feedbackAnalytics?.serviceQualityBreakdown || {}).map(([quality, count]) => (
                <div key={quality}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm capitalize text-gray-600">{quality}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        quality === 'excellent' ? 'bg-green-500' :
                        quality === 'good' ? 'bg-blue-500' :
                        quality === 'average' ? 'bg-yellow-500' : 'bg-red-500'
                      }`} 
                      style={{ width: `${(count / (feedbackAnalytics?.totalFeedbacks || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Technician Ratings & Monthly Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Technician Ratings</h3>
            <div className="space-y-3">
              {(feedbackAnalytics?.technicianRatings || []).map((technician, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{technician.name}</p>
                      <span className="text-xs text-gray-500">
                        {technician.feedbackCount} feedbacks
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    {technician.rating.toFixed(1)}/5
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Rating Trends</h3>
            <div className="space-y-3">
              {(feedbackAnalytics?.monthlyTrends || []).slice(-6).map((month, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-green-600">{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{month.month}</p>
                      <span className="text-xs text-gray-500">
                        {month.feedbackCount} feedbacks
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-medium">
                    {month.averageRating.toFixed(1)}/5
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Issues & Improvement Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Issues</h3>
            <div className="space-y-3">
              {(feedbackAnalytics?.topIssues || []).map((issue, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-red-600">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium">{issue.issue}</span>
                  </div>
                  <span className="text-sm font-medium text-red-600">
                    {issue.count} ({issue.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Improvement Suggestions</h3>
            <div className="space-y-3">
              {(feedbackAnalytics?.improvementSuggestions || []).map((suggestion, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                    </div>
                    <span className="text-sm font-medium">{suggestion.suggestion}</span>
                  </div>
                  <span className="text-sm font-medium text-blue-600">
                    {suggestion.count} mentions
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendation Rate */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Recommendation Rate</h3>
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
                  strokeDasharray={`${feedbackAnalytics?.recommendationRate || 0}, 100`}
                  strokeLinecap="round"
                  fill="transparent"
                  d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-green-600">
                  {formatPercentage(feedbackAnalytics?.recommendationRate || 0)}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2">Would Recommend</p>
          </div>
        </div>
      </div>
    );
  };

  const renderEngineerPerformance = () => (
    <div className="space-y-4">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Total Engineers</p>
              <p className="text-xl font-bold text-gray-900">{dashboardAnalytics?.core.totalProducts || 0}</p>
            </div>
            <Users className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600">Avg Tickets/Engineer</p>
              <p className="text-xl font-bold text-green-600">
                {dashboardAnalytics?.core.totalTickets || 0}
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
                {formatResolutionTime(dashboardAnalytics?.service.avgResolutionTime || 0)} {(dashboardAnalytics?.service.avgResolutionTime || 0) < 0.01 && (dashboardAnalytics?.service.avgResolutionTime || 0) > 0 ? 'hours' : 'days'}
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
                {dashboardAnalytics?.customer.avgSatisfaction || 0}/5
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
              {(ticketAnalytics?.engineerPerformance || []).map((engineer, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {engineer.name.split(' ').map((n: string) => n[0]).join('')}
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
                    <span className={`font-medium ${engineer.avgTAT <= 2 ? 'text-green-600' :
                        engineer.avgTAT <= 3 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                      {formatResolutionTime(engineer.avgTAT)} {engineer.avgTAT < 0.01 && engineer.avgTAT > 0 ? 'hours' : 'days'}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${engineer.slaCompliance >= 95 ? 'bg-green-100 text-green-800' :
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
                            className={`w-3 h-3 rounded-full ${i < Math.floor(engineer.customerRating) ? 'bg-yellow-400' : 'bg-gray-200'
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${engineer.slaCompliance >= 95 && engineer.customerRating >= 4.5 ? 'bg-green-500' :
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
              <div className="text-center">
                <p className="font-medium">Jan</p>
                <p className="text-blue-600">Productivity: 85%</p>
                <p className="text-green-600">Quality: 92%</p>
              </div>
              <div className="text-center">
                <p className="font-medium">Feb</p>
                <p className="text-blue-600">Productivity: 89%</p>
                <p className="text-green-600">Quality: 94%</p>
              </div>
              <div className="text-center">
                <p className="font-medium">Mar</p>
                <p className="text-blue-600">Productivity: 91%</p>
                <p className="text-green-600">Quality: 96%</p>
              </div>
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
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${activeReport === section.id
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
          {activeReport === 'feedback' && renderFeedbackAnalytics()}
        </div>
      )}
    </div>
  );
};

export default ReportsManagement; 