import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import {
  sendEmail,
  sendSMS,
  sendWhatsApp,
  getMessageStatus,
  getMessageHistory,
  bulkSendNotifications,
  getCommunicationStats
} from '../controllers/communicationController';

const router = Router();

// All routes are protected
router.use(protect);

// Email routes
router.post('/email/send', sendEmail);

// SMS routes
router.post('/sms/send', sendSMS);

// WhatsApp routes
router.post('/whatsapp/send', sendWhatsApp);

// Message status and history
router.get('/:type/:messageId/status', getMessageStatus);
router.get('/history', getMessageHistory);

// Bulk operations
router.post('/bulk-send', bulkSendNotifications);

// Statistics (restricted to managers and admins)
router.get('/stats', restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER), getCommunicationStats);

export default router; 