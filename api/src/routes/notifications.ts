import express from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats,
  createNotification
} from '../controllers/notificationController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get user notifications
router.get('/', getUserNotifications);

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

export default router;