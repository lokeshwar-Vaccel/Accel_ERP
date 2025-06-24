import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import {
  getSettings,
  getSetting,
  updateSetting,
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  testEmailConfiguration,
  getSystemInfo
} from '../controllers/adminController';

const router = Router();

// All routes are protected and require admin access
router.use(protect);
router.use(restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN));

// System settings routes
router.get('/settings', getSettings);
router.get('/settings/:key', getSetting);
router.put('/settings/:key', updateSetting);

// Email templates routes
router.get('/email-templates', getEmailTemplates);
router.post('/email-templates', createEmailTemplate);
router.put('/email-templates/:id', updateEmailTemplate);
router.delete('/email-templates/:id', deleteEmailTemplate);

// Email configuration testing
router.post('/test-email', testEmailConfiguration);

// System information
router.get('/system-info', getSystemInfo);

export default router; 