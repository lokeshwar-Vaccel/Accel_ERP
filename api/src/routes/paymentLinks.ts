import { Router } from 'express';
import { protect, checkPermission } from '../middleware/auth';
import {
  verifyPaymentLink,
  processEmailPayment,
  sendInvoiceEmail,
  sendPaymentReminder,
  getPaymentLinkStats
} from '../controllers/paymentLinkController';

const router = Router();

// Public routes (no authentication required)
router.get('/verify/:token', verifyPaymentLink);
router.post('/process/:token', processEmailPayment);

// Protected routes (require authentication)
router.use(protect);

// Send invoice email with payment link
router.post('/send-invoice/:invoiceId', checkPermission('write'), sendInvoiceEmail);

// Send payment reminder email
router.post('/send-reminder/:invoiceId', checkPermission('write'), sendPaymentReminder);

// Get payment link statistics
router.get('/stats', checkPermission('read'), getPaymentLinkStats);

export default router; 