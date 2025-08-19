import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { apiClient } from '../../utils/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
// import { Notification, NotificationStats } from '../types';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Get user info from Redux store
  const { user } = useSelector((state: RootState) => state.auth) || {};
  const notificationsState = useSelector((state: RootState) => state.notifications);
  
  // Debug auth state
  console.log('🔐 Auth State Debug:', {
    authState: useSelector((state: RootState) => state.auth),
    user: user,
    userId: user?.id,
    isAuthenticated: useSelector((state: RootState) => state.auth.isAuthenticated)
  });

  
  // Safely extract values with fallbacks
  const realTimeNotifications = notificationsState?.items || [];

  // Initialize WebSocket connection only when user is loaded
  const { isConnected, connectionError } = useWebSocket({
    userId: user?.id || '',
    authToken: localStorage.getItem('authToken') || '',
    enabled: !!user?.id && !!localStorage.getItem('authToken')
  });

  // Debug WebSocket connection
  console.log('🔌 WebSocket Debug:', {
    user: user,
    userId: user?.id,
    hasAuthToken: !!localStorage.getItem('authToken'),
    enabled: !!user?.id,
    isConnected,
    connectionError
  });


  // Fetch notifications and stats
  const fetchNotifications = async (pageNum = 1, append = false) => {
    try {
      setLoading(true);
      const response = await apiClient.notifications.getAll({
        page: pageNum,
        limit: 10,
        // isRead: true
      });

      const newNotifications = response.data.notifications || [];
      
      if (append) {
        setNotifications(prev => [...prev, ...newNotifications]);
      } else {
        setNotifications(newNotifications);
      }

      setHasMore(newNotifications.length === 10);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await apiClient.notifications.getStats();
      console.log('Notification stats response:', response);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      // Even if there's an error, try to fetch again after a delay
      setTimeout(() => {
        fetchStats();
      }, 5000);
    } finally {
      setStatsLoading(false);
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
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
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
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'assignment':
          return '👤';
      case 'status_change':
          return '🔄';
        case 'contact_history':
          return '📞';
      case 'follow_up':
          return '⏰';
      case 'low_stock':
          return '⚠️';
      case 'out_of_stock':
          return '🚫';
      case 'over_stock':
          return '📦';
      default:
          return '📢';
    }
  };

  // Get notification priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
          return 'text-red-500';
      case 'medium':
          return 'text-yellow-500';
      case 'low':
          return 'text-green-500';
      default:
          return 'text-gray-500';
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

  // Combine real-time notifications with fetched notifications
  const allNotifications = [...realTimeNotifications, ...notifications];
  
  // Calculate unread count more reliably
  const realTimeUnreadCount = realTimeNotifications.filter((n: any) => !n.isRead).length;
  const fetchedUnreadCount = notifications.filter((n: any) => !n.isRead).length;
  const totalUnreadCount = Math.max(realTimeUnreadCount, fetchedUnreadCount, stats?.unreadCount || 0);
  

  

  


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

  return (
    <div className={`relative ${className}`}>
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
        className="relative p-2 text-gray-600 hover:text-gray-800 bg-gray-100 rounded-full transition-colors"
      >
        {/* Pulsing ring for unread notifications */}
        {totalUnreadCount > 0 && (
          <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-75"></div>
        )}
        
        <Bell size={20} />
        

        

        
        {/* Loading indicator when stats are being fetched */}
        {statsLoading && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] z-10 animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full animate-spin"></div>
          </span>
        )}
        
        {/* Show count even when loading to prevent empty state */}
        {!statsLoading && totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-green-500 text-black text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px] z-10 font-bold">
            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
          </span>
        )}


      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 w-96 max-h-[500px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div>
              <h3 className="text-xl font-bold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-sm text-gray-600">
                  {totalUnreadCount > 0 ? `${totalUnreadCount} unread` : 'All caught up!'}
                </p>
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`} title={isConnected ? 'Real-time connected' : 'Real-time disconnected'}></div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {totalUnreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {allNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell size={28} className="opacity-60" />
                </div>
                <p className="text-lg font-medium text-gray-700 mb-2">No notifications</p>
                <p className="text-sm text-gray-500">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {allNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-5 hover:bg-gray-50 transition-all duration-200 ${
                      !notification.isRead ? 'bg-blue-50/50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between">
                          <p className={`text-sm font-semibold leading-tight ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-2 ml-3">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              notification.priority === 'high' ? 'bg-red-100 text-red-700' :
                              notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {notification.priority}
                            </span>
                            <span className="text-xs text-gray-400 font-medium">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {notification.message}
                        </p>
                        {notification.customerId && (
                          <div className="flex items-center space-x-2 pt-2">
                            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                            <p className="text-xs font-medium text-blue-700">
                              {notification.customerId.name}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-center space-y-2">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                            title="Mark as read"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification._id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete notification"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && (
              <div className="p-6 text-center border-t border-gray-100">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    'Load more notifications'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell; 