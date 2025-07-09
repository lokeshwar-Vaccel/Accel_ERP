// import React, { useState, useEffect, useRef } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { RootState } from '../../redux/store';
// import {
//   fetchNotifications,
//   fetchUnreadCount,
//   markNotificationRead,
//   markAllNotificationsRead,
//   deleteNotification,
//   togglePopup,
//   closePopup
// } from '../../redux/notifications/notificationSlice';
// import { Bell, X, Trash2, Check, Clock, AlertCircle, User, FileText, DollarSign } from 'lucide-react';

// // Utility function to format time ago
// const formatTimeAgo = (dateString: string): string => {
//   const date = new Date(dateString);
//   const now = new Date();
//   const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

//   if (diffInSeconds < 60) return 'Just now';
//   if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
//   if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
//   if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
//   return date.toLocaleDateString();
// };

// // Get notification icon based on type
// const getNotificationIcon = (type: string) => {
//   switch (type) {
//     case 'assignment':
//       return <User className="w-4 h-4 text-blue-500" />;
//     case 'status_change':
//       return <AlertCircle className="w-4 h-4 text-orange-500" />;
//     case 'contact_update':
//       return <User className="w-4 h-4 text-green-500" />;
//     case 'follow_up':
//       return <Clock className="w-4 h-4 text-purple-500" />;
//     case 'payment_received':
//       return <DollarSign className="w-4 h-4 text-green-500" />;
//     case 'invoice_created':
//       return <FileText className="w-4 h-4 text-blue-500" />;
//     default:
//       return <Bell className="w-4 h-4 text-gray-500" />;
//   }
// };

// // Get notification priority color
// const getPriorityColor = (priority: string) => {
//   switch (priority) {
//     case 'high':
//       return 'border-l-red-500';
//     case 'medium':
//       return 'border-l-yellow-500';
//     case 'low':
//       return 'border-l-green-500';
//     default:
//       return 'border-l-gray-300';
//   }
// };

// const NotificationBell: React.FC = () => {
//   const dispatch = useDispatch();
//   const {
//     items: notifications,
//     unreadCount,
//     isPopupOpen,
//     loading,
//     error,
//     hasMore
//   } = useSelector((state: RootState) => state.notifications);

//   const [page, setPage] = useState(1);
//   const popupRef = useRef<HTMLDivElement>(null);

//   // Fetch initial data
//   useEffect(() => {
//     dispatch(fetchUnreadCount());
//     dispatch(fetchNotifications({ page: 1, limit: 20 }));
//   }, [dispatch]);

//   // Handle click outside to close popup
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
//         dispatch(closePopup());
//       }
//     };

//     if (isPopupOpen) {
//       document.addEventListener('mousedown', handleClickOutside);
//     }

//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, [isPopupOpen, dispatch]);

//   // Load more notifications
//   const loadMore = () => {
//     if (hasMore && !loading) {
//       const nextPage = page + 1;
//       setPage(nextPage);
//       dispatch(fetchNotifications({ page: nextPage, limit: 20 }));
//     }
//   };

//   // Handle notification click
//   const handleNotificationClick = (notification: any) => {
//     if (!notification.isRead) {
//       dispatch(markNotificationRead(notification._id));
//     }
    
//     // Navigate to related entity or perform action
//     // This can be customized based on your routing needs
//     console.log('Navigate to:', notification.entityType, notification.entityId);
//   };

//   // Handle delete notification
//   const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
//     e.stopPropagation();
//     dispatch(deleteNotification(notificationId));
//   };

//   // Handle mark all as read
//   const handleMarkAllRead = () => {
//     dispatch(markAllNotificationsRead());
//   };

//   return (
//     <div className="relative" ref={popupRef}>
//       {/* Notification Bell Button */}
//       <button
//         onClick={() => dispatch(togglePopup())}
//         className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors duration-200"
//         aria-label="Notifications"
//       >
//         <Bell className="w-6 h-6" />
        
//         {/* Unread Count Badge */}
//         {unreadCount > 0 && (
//           <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
//             {unreadCount > 99 ? '99+' : unreadCount}
//           </span>
//         )}
//       </button>

//       {/* Notification Popup */}
//       {isPopupOpen && (
//         <div className="absolute right-0 mt-2 w-96 bg-white shadow-xl rounded-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
//           {/* Header */}
//           <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
//             <div className="flex items-center space-x-2">
//               <h3 className="font-semibold text-gray-900">Notifications</h3>
//               {unreadCount > 0 && (
//                 <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
//                   {unreadCount}
//                 </span>
//               )}
//             </div>
//             <div className="flex items-center space-x-2">
//               {unreadCount > 0 && (
//                 <button
//                   onClick={handleMarkAllRead}
//                   className="text-sm text-blue-600 hover:text-blue-800 font-medium"
//                 >
//                   Mark all read
//                 </button>
//               )}
//               <button
//                 onClick={() => dispatch(closePopup())}
//                 className="text-gray-400 hover:text-gray-600"
//               >
//                 <X className="w-4 h-4" />
//               </button>
//             </div>
//           </div>

//           {/* Notifications List */}
//           <div className="flex-1 overflow-y-auto max-h-[400px]">
//             {loading && page === 1 ? (
//               <div className="p-4 text-center text-gray-500">
//                 <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
//                 <p className="mt-2">Loading notifications...</p>
//               </div>
//             ) : notifications.length === 0 ? (
//               <div className="p-8 text-center text-gray-500">
//                 <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
//                 <p className="text-sm">No notifications yet</p>
//                 <p className="text-xs mt-1">We'll notify you when something important happens</p>
//               </div>
//             ) : (
//               <div className="divide-y divide-gray-100">
//                 {notifications.map((notification) => (
//                   <div
//                     key={notification._id}
//                     className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150 border-l-4 ${getPriorityColor(notification.priority)} ${
//                       !notification.isRead ? 'bg-blue-50' : ''
//                     }`}
//                     onClick={() => handleNotificationClick(notification)}
//                   >
//                     <div className="flex items-start space-x-3">
//                       {/* Icon */}
//                       <div className="flex-shrink-0 mt-0.5">
//                         {getNotificationIcon(notification.type)}
//                       </div>

//                       {/* Content */}
//                       <div className="flex-1 min-w-0">
//                         <p className={`text-sm ${!notification.isRead ? 'font-medium text-gray-900' : 'text-gray-700'}`}>
//                           {notification.content}
//                         </p>
//                         <div className="flex items-center justify-between mt-2">
//                           <span className="text-xs text-gray-500">
//                             {formatTimeAgo(notification.createdAt)}
//                           </span>
//                           <div className="flex items-center space-x-1">
//                             {!notification.isRead && (
//                               <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
//                             )}
//                             <button
//                               onClick={(e) => handleDeleteNotification(e, notification._id)}
//                               className="text-gray-400 hover:text-red-500 transition-colors duration-150"
//                             >
//                               <Trash2 className="w-3 h-3" />
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}

//             {/* Load More Button */}
//             {hasMore && notifications.length > 0 && (
//               <div className="p-4 border-t border-gray-200">
//                 <button
//                   onClick={loadMore}
//                   disabled={loading}
//                   className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
//                 >
//                   {loading ? 'Loading...' : 'Load more notifications'}
//                 </button>
//               </div>
//             )}
//           </div>

//           {/* Error Message */}
//           {error && (
//             <div className="p-4 border-t border-gray-200 bg-red-50">
//               <p className="text-sm text-red-600">{error}</p>
//             </div>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default NotificationBell; 