import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { apiClient } from '../../utils/api';
// import { Notification, NotificationStats } from '../types';

interface NotificationBellProps {
  className?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(1, false);
      fetchStats();
    }
  }, [isOpen]);

  useEffect(() => {
    // Fetch stats on component mount
    fetchStats();
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell size={20} />
        {stats && stats.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center min-w-[20px]">
            {stats.unreadCount > 99 ? '99+' : stats.unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
            <div className="flex items-center space-x-2">
              {stats && stats.unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell size={24} className="mx-auto mb-2 opacity-50" />
                <p>No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            !notification.isRead ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                            {notification.title}
                          </p>
                          <div className="flex items-center space-x-1">
                            <span className={`text-xs ${getPriorityColor(notification.priority)}`}>
                              {notification.priority}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                        {notification.customerId && (
                          <p className="text-xs text-blue-600 mt-1">
                            Customer: {notification.customerId.name}
                          </p>
                        )}
                      </div>
                      <div className="flex-shrink-0 flex items-center space-x-1">
                        {!notification.isRead && (
                          <button
                            onClick={() => markAsRead(notification._id)}
                            className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification._id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More Button */}
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load more'}
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