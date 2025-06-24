import React from 'react';
// import StatCard from './StatCard';
import { 
  DollarSign, 
  Users, 
  Wrench, 
  Package,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Activity,
  Zap
} from 'lucide-react';
import StatCard from 'components/StatCard';

export default function Dashboard() {
  const stats = [
    { title: 'Total Revenue', value: '₹0', change: 12.5, icon: <DollarSign className="w-6 h-6" />, color: 'green' },
    { title: 'Active Leads', value: '0', change: 8.2, icon: <Users className="w-6 h-6" />, color: 'blue' },
    { title: 'Service Tickets', value: '0', change: -5.1, icon: <Wrench className="w-6 h-6" />, color: 'orange' },
    { title: 'Low Stock Items', value: '0', change: 0, icon: <Package className="w-6 h-6" />, color: 'red' },
  ] as const;

  const recentActivities = [
    { id: 1, action: 'New lead from TechCorp', time: '2 minutes ago', type: 'lead', icon: Users, color: 'blue' },
    { id: 2, action: 'Service completed for ABC Industries', time: '15 minutes ago', type: 'service', icon: Wrench, color: 'green' },
    { id: 3, action: 'Inventory alert: Generator parts low', time: '1 hour ago', type: 'inventory', icon: Package, color: 'orange' },
    { id: 4, action: 'Quote sent to XYZ Manufacturing', time: '2 hours ago', type: 'sales', icon: DollarSign, color: 'purple' },
  ];

  const priorityTasks = [
    { task: 'Follow up with MegaCorp for genset order', priority: 'high', progress: 75 },
    { task: 'Review service engineer schedules', priority: 'medium', progress: 45 },
    { task: 'Update inventory minimum levels', priority: 'low', progress: 90 },
  ];

  const systemAlerts = [
    { message: 'Server maintenance scheduled for tonight', type: 'info', icon: Activity },
    { message: '3 service tickets overdue', type: 'warning', icon: AlertTriangle },
    { message: 'Backup completed successfully', type: 'success', icon: Zap },
  ];

  return (
    <div className="min-h-screen space-y-8 p-2">
      {/* Enhanced Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} style={{ animationDelay: `${index * 100}ms` }} className="animate-fade-in-up">
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enhanced Sales Performance */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-500 group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 opacity-0  transition-opacity duration-500"></div>
          
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Sales Performance</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>0% from last month</span>
                </div>
              </div>
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
            
            <div className="h-72 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border border-gray-200 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10"></div>
              <div className="relative text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <p className="text-gray-600 font-medium">Interactive Sales Chart</p>
                <p className="text-sm text-gray-500 mt-1">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Recent Activities */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-500 group">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Recent Activities</h3>
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
                      'from-purple-500 to-purple-600'
                    } shadow-lg group-hover/item:scale-110 transition-transform duration-300`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 group-hover/item:text-gray-800 transition-colors duration-300">
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

      {/* Enhanced Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Enhanced Priority Tasks */}
        {/* <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-500 group">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Priority Tasks</h3>
            <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-xs font-semibold text-blue-700">
              3 Active
            </div>
          </div>
          
          <div className="space-y-4">
            {priorityTasks.map((item, index) => (
              <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300 group/task">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      item.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                      item.priority === 'medium' ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 
                      'bg-gradient-to-r from-green-500 to-green-600'
                    } shadow-lg`}></div>
                    <span className="text-sm font-medium text-gray-800 group-hover/task:text-gray-900 transition-colors duration-300">
                      {item.task}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">{item.progress}%</span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-2 rounded-full transition-all duration-1000 ${
                      item.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                      item.priority === 'medium' ? 'bg-gradient-to-r from-orange-500 to-orange-600' : 
                      'bg-gradient-to-r from-green-500 to-green-600'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div> */}

        {/* Enhanced System Alerts */}
        {/* <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 hover:shadow-2xl transition-all duration-500 group">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">System Alerts</h3>
            <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
          </div>
          
          <div className="space-y-4">
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
                  <span className="text-sm font-medium text-gray-800 flex-1">{alert.message}</span>
                </div>
              );
            })}
          </div>
        </div> */}
      </div>
    </div>
  );
}