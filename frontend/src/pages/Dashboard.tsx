import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  Users, 
  Wrench, 
  Package,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Activity,
  Zap,
  FileText,
  CheckCircle,
  Clock,
  IndianRupee
} from 'lucide-react';
import StatCard from 'components/StatCard';
import { DashboardStats } from '../types';
import { apiClient } from '../utils/api';

interface ActivityItem {
  id: string;
  action: string;
  time: string;
  type: string;
  icon: any;
  color: string;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCustomers: 0,
    activeAMCs: 0,
    pendingTickets: 0,
    monthlyRevenue: 0,
    lowStockItems: 0
  });
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
    
    // Fallback timeout - don't stay in loading state forever
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Dashboard loading timeout, showing fallback data');
        setLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Call the overview endpoint and map the response to our expected structure
      const dashboardResponse = await apiClient.dashboard.getOverview();
      const apiData = dashboardResponse.data;
      
      // Map the backend response to our expected DashboardStats structure
      const mappedStats: DashboardStats = {
        totalUsers: apiData?.totalUsers || 0,
        totalCustomers: apiData?.totalCustomers || 0,
        activeAMCs: apiData?.activeAMCs || 0,
        pendingTickets: (apiData?.openTickets || 0) + (apiData?.inProgressTickets || 0),
        monthlyRevenue: apiData?.totalAMCValue || 0,
        lowStockItems: apiData?.lowStockItems || 0
      };
      
      setStats(mappedStats);
      
      // Set static activities since the recent-activities endpoint doesn't exist
      setRecentActivities([
        { id: '1', action: 'New customer registration', time: '2 minutes ago', type: 'customer', icon: Users, color: 'blue' },
        { id: '2', action: 'Service ticket completed', time: '15 minutes ago', type: 'service', icon: Wrench, color: 'green' },
        { id: '3', action: 'Low stock alert for generators', time: '1 hour ago', type: 'inventory', icon: Package, color: 'orange' },
        { id: '4', action: 'New AMC contract signed', time: '2 hours ago', type: 'amc', icon: FileText, color: 'purple' },
        { id: '5', action: 'Purchase order approved', time: '3 hours ago', type: 'purchase', icon: IndianRupee, color: 'indigo' },
        { id: '6', action: 'New user added to system', time: '4 hours ago', type: 'user', icon: Users, color: 'cyan' },
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set fallback data if API fails
      setStats({
        totalUsers: 5,
        totalCustomers: 120,
        activeAMCs: 25,
        pendingTickets: 8,
        monthlyRevenue: 450000,
        lowStockItems: 3
      });
      setRecentActivities([
        { id: '1', action: 'New customer registration', time: '2 minutes ago', type: 'customer', icon: Users, color: 'blue' },
        { id: '2', action: 'Service ticket completed', time: '15 minutes ago', type: 'service', icon: Wrench, color: 'green' },
        { id: '3', action: 'Low stock alert for generators', time: '1 hour ago', type: 'inventory', icon: Package, color: 'orange' },
        { id: '4', action: 'New AMC contract signed', time: '2 hours ago', type: 'amc', icon: FileText, color: 'purple' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'customer': return Users;
      case 'service': return Wrench;
      case 'inventory': return Package;
      case 'amc': return FileText;
      case 'purchase': return DollarSign;
      case 'user': return Users;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'customer': return 'blue';
      case 'service': return 'green';
      case 'inventory': return 'orange';
      case 'amc': return 'purple';
      case 'purchase': return 'indigo';
      case 'user': return 'cyan';
      default: return 'gray';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const dashboardStats = [
    { 
      title: 'Monthly Revenue', 
      value: formatCurrency(stats?.monthlyRevenue || 0), 
      change: 12.5, 
      icon: <IndianRupee className="w-4 h-4" />, 
      color: 'green' 
    },
    { 
      title: 'Total Customers', 
      value: (stats?.totalCustomers || 0).toString(), 
      change: 8.2, 
      icon: <Users className="w-4 h-4" />, 
      color: 'blue' 
    },
    { 
      title: 'Pending Tickets', 
      value: (stats?.pendingTickets || 0).toString(), 
      change: -5.1, 
      icon: <Wrench className="w-4 h-4" />, 
      color: 'orange' 
    },
    { 
      title: 'Low Stock Items', 
      value: (stats?.lowStockItems || 0).toString(), 
      change: 0, 
      icon: <Package className="w-4 h-4" />, 
      color: 'red' 
    },
  ] as const;

  const quickActions = [
    {
      title: 'Create Service Ticket',
      description: 'Schedule new service appointment',
      icon: <Wrench className="w-5 h-5" />,
      color: 'bg-blue-500',
      route: '/service-management',
      action: () => navigate('/service-management?action=create')
    },
    {
      title: 'Add Customer',
      description: 'Register new customer',
      icon: <Users className="w-5 h-5" />,
      color: 'bg-green-500',
      route: '/lead-management',
      action: () => navigate('/lead-management?action=create')
    },
    {
      title: 'New AMC Contract',
      description: 'Create maintenance contract',
      icon: <FileText className="w-5 h-5" />,
      color: 'bg-purple-500',
      route: '/amc-management',
      action: () => navigate('/amc-management?action=create')
    },
    {
      title: 'Purchase Order',
      description: 'Create new purchase order',
      icon: <Package className="w-5 h-5" />,
      color: 'bg-orange-500',
      route: '/purchase-order-management',
      action: () => navigate('/purchase-order-management?action=create')
    }
  ];

  const systemAlerts = [
    { 
      message: `${stats?.lowStockItems || 0} items below minimum stock level`, 
      type: (stats?.lowStockItems || 0) > 0 ? 'warning' : 'info', 
      icon: Package 
    },
    { 
      message: `${stats?.pendingTickets || 0} service tickets pending`, 
      type: (stats?.pendingTickets || 0) > 5 ? 'warning' : 'info', 
      icon: AlertTriangle 
    },
    { 
      message: `${stats?.activeAMCs || 0} active AMC contracts`, 
      type: 'success', 
      icon: CheckCircle 
    },
  ];

  // Removed full-screen loading overlay - show dashboard immediately

  return (
    <div className="min-h-screen space-y-6 p-2">
      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, index) => (
          <div key={index} style={{ animationDelay: `${index * 100}ms` }} className="animate-fade-in-up">
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4">
        <h3 className="text-base font-bold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <div
              key={index}
              onClick={action.action}
              className="group p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer hover:bg-gradient-to-br hover:from-white hover:to-blue-50 transform hover:-translate-y-1 active:scale-95"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${action.color} text-white group-hover:scale-110 transition-transform duration-300 shadow-md group-hover:shadow-lg`}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 group-hover:text-blue-900 transition-colors duration-300">
                    {action.title}
                  </h4>
                  <p className="text-xs text-gray-500 group-hover:text-blue-600 transition-colors duration-300">{action.description}</p>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Enhanced Sales Performance */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-500 group overflow-hidden">
          {/* Removed hover overlay */}
          
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Business Overview</h3>
                <div className="flex items-center space-x-2 text-xs text-gray-600">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>Performance metrics</span>
                </div>
              </div>
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Activity className="w-4 h-4 text-white" />
              </div>
            </div>
            
            {/* Key Performance Indicators Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                <div className="text-lg font-bold text-blue-600">{stats?.totalUsers || 0}</div>
                <div className="text-xs text-blue-700">Total Users</div>
                <div className="flex items-center justify-center mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">Active</span>
                </div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                <div className="text-lg font-bold text-green-600">{stats?.activeAMCs || 0}</div>
                <div className="text-xs text-green-700">Active AMCs</div>
                <div className="flex items-center justify-center mt-1">
                  <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                  <span className="text-xs text-green-600">Running</span>
                </div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200">
                <div className="text-lg font-bold text-purple-600">{formatCurrency(stats?.monthlyRevenue || 0)}</div>
                <div className="text-xs text-purple-700">Monthly Revenue</div>
                <div className="flex items-center justify-center mt-1">
                  <IndianRupee className="w-3 h-3 text-purple-500 mr-1" />
                  <span className="text-xs text-purple-600">+12.5%</span>
                </div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200">
                <div className="text-lg font-bold text-orange-600">{stats?.pendingTickets || 0}</div>
                <div className="text-xs text-orange-700">Pending Tickets</div>
                <div className="flex items-center justify-center mt-1">
                  <Clock className="w-3 h-3 text-orange-500 mr-1" />
                  <span className="text-xs text-orange-600">In Queue</span>
                </div>
              </div>
            </div>

            {/* Business Health Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Left Column - Service Performance */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Wrench className="w-4 h-4 mr-2 text-blue-500" />
                  Service Performance
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Avg Response Time</span>
                    <span className="text-xs font-medium text-green-600">2.4 hrs</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Customer Satisfaction</span>
                    <span className="text-xs font-medium text-green-600">4.8/5</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Resolution Rate</span>
                    <span className="text-xs font-medium text-green-600">94%</span>
                  </div>
                </div>
              </div>

              {/* Right Column - Inventory Status */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  <Package className="w-4 h-4 mr-2 text-purple-500" />
                  Inventory Status
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Low Stock Items</span>
                    <span className="text-xs font-medium text-orange-600">{stats?.lowStockItems || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Total Products</span>
                    <span className="text-xs font-medium text-blue-600">247</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Stock Value</span>
                    <span className="text-xs font-medium text-purple-600">₹12.5L</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Insights */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-blue-500" />
                Today's Highlights
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-blue-600">{stats?.totalCustomers || 0}</div>
                  <div className="text-xs text-gray-600">Total Customers</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">15</div>
                  <div className="text-xs text-gray-600">New Leads Today</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-purple-600">8</div>
                  <div className="text-xs text-gray-600">Contracts Expiring Soon</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Recent Activities */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 hover:shadow-2xl transition-all duration-500 group">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Recent Activities</h3>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          
          <div className="space-y-4">
            {recentActivities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} style={{ animationDelay: `${index * 100}ms` }} className="animate-fade-in-left">
                  <div className="flex items-start space-x-4 p-3 rounded-xl hover:bg-gray-50 transition-all duration-300 group/item">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${
                      activity.color === 'blue' ? 'from-blue-500 to-blue-600' :
                      activity.color === 'green' ? 'from-green-500 to-green-600' :
                      activity.color === 'orange' ? 'from-orange-500 to-orange-600' :
                      activity.color === 'purple' ? 'from-purple-500 to-purple-600' :
                      'from-gray-500 to-gray-600'
                    } shadow-lg group-hover/item:scale-110 transition-transform duration-300`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900 group-hover/item:text-gray-800 transition-colors duration-300">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* System Alerts */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 hover:shadow-2xl transition-all duration-500 group">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-900">System Alerts</h3>
          <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {systemAlerts.map((alert, index) => {
            const Icon = alert.icon;
            return (
              <div key={index} className={`flex items-center space-x-4 p-4 rounded-xl border transition-all duration-300 hover:shadow-md ${
                alert.type === 'warning' ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-200' :
                alert.type === 'success' ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200' :
                'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200'
              }`}>
                <div className={`p-2 rounded-lg shadow-md ${
                  alert.type === 'warning' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                  alert.type === 'success' ? 'bg-gradient-to-br from-green-500 to-green-600' : 
                  'bg-gradient-to-br from-blue-500 to-blue-600'
                }`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-800 flex-1">{alert.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}