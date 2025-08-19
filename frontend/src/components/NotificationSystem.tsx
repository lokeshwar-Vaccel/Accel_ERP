import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, AlertCircle, Info, CheckCircle, X, Filter, Search, RefreshCw } from 'lucide-react';
import { Button } from './ui/Botton';
import { Badge } from './ui/Badge';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import apiClient from '../utils/api';
import { toast } from 'react-hot-toast';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface Notification {
  _id: string;
  type: 'assignment' | 'status_change' | 'contact_history' | 'follow_up' | 'general' | 'low_stock' | 'out_of_stock' | 'payment_due' | 'amc_expiry' | 'service_reminder' | 'system_alert';
  title: string;
  message: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'inventory' | 'customer' | 'service' | 'payment' | 'system' | 'general';
  customerId?: any;
  productId?: any;
  metadata?: Record<string, any>;
  actionUrl?: string;
  createdAt: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

const NotificationSystem: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    priority: '',
    isRead: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Get user info and real-time notifications from Redux store
  const { user } = useSelector((state: RootState) => state.auth) || {};
  const notificationsState = useSelector((state: RootState) => state.notifications);
  
  // Safely extract values with fallbacks
  const realTimeNotifications = notificationsState?.items || [];

  // Initialize WebSocket connection
  const { isConnected, connectionError } = useWebSocket({
    userId: user?.id || '',
    authToken: localStorage.getItem('authToken') || '',
    enabled: !!user?.id
  });

  // Fetch notifications and stats
  const fetchNotifications = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const params: any = {
        page: pageNum,
        limit: 20
      };

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          params[key] = value;
        }
      });

      const response = await apiClient.notifications.getAll(params);
      const newNotifications = response.data.notifications || [];
      
      if (append) {
        setNotifications(prev => [...prev, ...newNotifications]);
      } else {
        setNotifications(newNotifications);
      }

      setHasMore(newNotifications.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.notifications.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    }
  };

  // Load more notifications
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1, true);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await apiClient.notifications.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification._id === notificationId 
            ? { ...notification, isRead: true }
            : notification
        )
      );
      fetchStats(); // Refresh stats
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await apiClient.notifications.markAllAsRead();
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      fetchStats(); // Refresh stats
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await apiClient.notifications.delete(notificationId);
      setNotifications(prev => 
        prev.filter(notification => notification._id !== notificationId)
      );
      fetchStats(); // Refresh stats
      toast.success('Notification deleted successfully');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  // Apply filters
  const applyFilters = () => {
    setPage(1);
    fetchNotifications(1, false);
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      type: '',
      category: '',
      priority: '',
      isRead: ''
    });
    setSearchTerm('');
    setPage(1);
    fetchNotifications(1, false);
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'assignment':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'status_change':
        return <AlertCircle className="w-5 h-5 text-purple-500" />;
      case 'contact_history':
        return <Info className="w-5 h-5 text-green-500" />;
      case 'follow_up':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  // Get notification priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'inventory':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'customer':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'service':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'payment':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'system':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Handle notification click with proper type handling
  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    
    if (notification.actionUrl) {
      // Navigate to the action URL
      window.location.href = notification.actionUrl;
    }
  };

  useEffect(() => {
    // Fetch both notifications and stats on component mount
    fetchNotifications(1, false);
    fetchStats();
    
    // Set up periodic refresh every 30 seconds to keep data updated
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Refresh data when dropdown opens to ensure latest information
    if (isOpen) {
      fetchNotifications(1, false);
      fetchStats();
    }
  }, [isOpen]);

  // Combine real-time notifications with fetched notifications
  const allNotifications = [...realTimeNotifications, ...notifications];
  
  // Calculate unread count more reliably
  const realTimeUnreadCount = realTimeNotifications.filter((n: any) => !n.isRead).length;
  const fetchedUnreadCount = notifications.filter((n: any) => !n.isRead).length;
  const totalUnreadCount = Math.max(realTimeUnreadCount, fetchedUnreadCount, stats?.unread || 0);
  


  return (
    <div className="relative">
      {/* WebSocket Connection Status */}
      {connectionError && (
        <div className="absolute -top-12 left-0 bg-red-500 text-white text-xs p-2 rounded whitespace-nowrap z-30">
          Connection Error: {connectionError}
        </div>
      )}
      
      {!isConnected && !connectionError && (
        <div className="absolute -top-12 left-0 bg-yellow-500 text-white text-xs p-2 rounded whitespace-nowrap z-30">
          Connecting to notification service...
        </div>
      )}

      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-gray-700 hover:text-blue-600 transition-all duration-200 group"
      >
        {/* White circle background with shadow */}
        <div className="absolute inset-0 bg-white rounded-full shadow-lg border border-gray-100 group-hover:shadow-xl group-hover:border-blue-200 transition-all duration-200"></div>
        
        {/* Bell icon */}
        <div className="relative z-10 p-1.5">
          <Bell size={20} className="transition-transform duration-200 group-hover:scale-110" />
        </div>
        
        {/* Green dot indicator for unread notifications */}
        {totalUnreadCount > 0 && (
          <div className="absolute -top-1 -right-1 z-20">
            <div className="w-5 h-5 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
            <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-bold">
              {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
            </span>
          </div>
        )}
        
        {/* Loading indicator when fetching data */}
        {!totalUnreadCount && (
          <div className="absolute -top-1 -right-1 z-20">
            <div className="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse">
              <div className="w-3 h-3 bg-white rounded-full animate-spin mx-auto mt-1"></div>
            </div>
          </div>
        )}


      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-4 w-[620px] bg-white rounded-3xl shadow-2xl border border-gray-100 z-50 max-h-[85vh] overflow-hidden">
          {/* Header with gradient background */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600"></div>
            <div className="relative p-6 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
                    <Bell className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Notifications</h3>
                    <div className="flex items-center space-x-2">
                      <p className="text-blue-100 text-sm">Stay updated with real-time alerts</p>
                      <div className={`w-2 h-2 rounded-full ${
                        isConnected ? 'bg-green-400' : 'bg-red-400'
                      }`} title={isConnected ? 'Real-time connected' : 'Real-time disconnected'}></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {totalUnreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl border border-white/30 text-sm font-medium transition-all duration-200 hover:scale-105"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          {stats && (
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-gray-700">
                      <span className="text-green-600 font-bold text-lg">{totalUnreadCount}</span> unread
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">
                      {stats.total} total
                    </span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          )}

          {/* Search and Filter Bar */}
          <div className="p-6 border-b border-gray-100 bg-white">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search notifications by title or message..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 text-sm border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl transition-all duration-200"
                />
              </div>
              <button
                onClick={() => setFilters(prev => ({ ...prev, isRead: prev.isRead === 'false' ? '' : 'false' }))}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 border ${
                  filters.isRead === 'false' 
                    ? 'bg-blue-500 text-white border-blue-500 shadow-md' 
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {filters.isRead === 'false' ? '✓ Show All' : '👁 Unread Only'}
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto bg-gradient-to-b from-gray-50 to-white">
            {allNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="p-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-inner">
                  <Bell size={32} className="text-gray-400" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">All caught up!</h4>
                <p className="text-gray-500">No notifications to show right now.</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {allNotifications
                  .filter(notification => 
                    searchTerm === '' || 
                    notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    notification.message.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((notification) => (
                    <div
                      key={notification._id}
                      className={`group p-5 rounded-2xl border transition-all duration-300 hover:shadow-lg cursor-pointer transform hover:-translate-y-1 ${
                        !notification.isRead 
                          ? 'bg-white border-l-4 border-l-blue-500 shadow-md' 
                          : 'bg-gray-50/80 border border-gray-200 hover:bg-white'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start space-x-4">
                        {/* Icon with better styling */}
                        <div className="flex-shrink-0">
                          <div className={`p-3 rounded-2xl shadow-sm ${
                            !notification.isRead 
                              ? 'bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-200' 
                              : 'bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200'
                          }`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>
                        
                        {/* Content with improved layout */}
                        <div className="flex-1 min-w-0">
                          {/* Header with title and priority */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h4 className={`font-bold text-gray-900 mb-2 leading-tight ${
                                !notification.isRead ? 'text-lg' : 'text-base'
                              }`}>
                                {notification.title}
                              </h4>
                              <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                                {notification.message}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <Badge 
                                className={`text-xs px-3 py-1.5 font-semibold rounded-full shadow-sm ${
                                  notification.priority === 'urgent' ? 'bg-red-100 text-red-700 border border-red-200' :
                                  notification.priority === 'high' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                                  notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                  'bg-blue-100 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {notification.priority}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Footer with metadata and actions */}
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span className="flex items-center">
                                <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                {formatDate(notification.createdAt)}
                              </span>
                              {notification.customerId && (
                                <span className="flex items-center">
                                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                                  Customer
                                </span>
                              )}
                              {notification.productId && (
                                <span className="flex items-center">
                                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                  Product
                                </span>
                              )}
                            </div>
                            
                            {/* Action buttons with better styling */}
                            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              {!notification.isRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification._id);
                                  }}
                                  className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-110"
                                  title="Mark as read"
                                >
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification._id);
                                }}
                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-110"
                                title="Delete notification"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Load More Section */}
          {hasMore && (
            <div className="p-6 border-t border-gray-100 bg-white">
              <Button 
                onClick={loadMore} 
                disabled={loading}
                variant="outline"
                className="w-full py-3 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm font-medium rounded-xl transition-all duration-200 hover:shadow-md"
              >
                {loading ? (
                  <div className="flex items-center">
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Loading more notifications...
                  </div>
                ) : (
                  <span>Load More Notifications</span>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationSystem; 