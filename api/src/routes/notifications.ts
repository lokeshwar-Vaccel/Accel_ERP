import express from 'express';
import {
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getUnreadCount,
  createNotification
} from '../controllers/notificationController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Get user notifications with pagination
router.get('/', getUserNotifications);

// Get unread notification count
router.get('/unread-count', getUnreadCount);

// Mark notification as read
router.patch('/:id/read', markNotificationRead);

// Mark all notifications as read
router.patch('/mark-all-read', markAllNotificationsRead);

// Delete notification
router.delete('/:id', deleteNotification);

// Create notification (internal use)
router.post('/create', createNotification);

export default router; 