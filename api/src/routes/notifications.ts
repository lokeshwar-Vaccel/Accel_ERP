import express from 'express';
import {
  getUserNotifications,
  getNotificationsByCategory,
  getUrgentNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats,
  createNotification,
  createBulkNotifications,
  getLowStockSummary,
  triggerLowStockNotifications,
  getLowStockItems
} from '../controllers/notificationController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user notifications
router.get('/', getUserNotifications);

// Get notifications by category
router.get('/category/:category', getNotificationsByCategory);

// Get urgent notifications
router.get('/urgent', getUrgentNotifications);

// Get notification statistics
router.get('/stats', getNotificationStats);

// Mark notification as read
router.patch('/:id/read', markNotificationAsRead);

// Mark all notifications as read
router.patch('/read-all', markAllNotificationsAsRead);

// Delete notification
router.delete('/:id', deleteNotification);

// Create notification (internal use)
router.post('/create', createNotification);

// Create bulk notifications (internal use)
router.post('/create-bulk', createBulkNotifications);

// Low stock notification routes
router.get('/low-stock-summary', getLowStockSummary);
router.get('/low-stock-items', getLowStockItems);
router.post('/trigger-low-stock', triggerLowStockNotifications);



export default router;