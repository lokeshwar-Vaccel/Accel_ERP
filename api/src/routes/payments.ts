import { Router } from 'express';
import { protect, checkPermission } from '../middleware/auth';
import { 
  createRazorpayOrder,
  verifyRazorpayPayment,
  processManualPayment,
  getInvoicePayments,
  razorpayWebhook
} from '../controllers/paymentController';

const router = Router();

// Public webhook route (no authentication required, but signature verified)
router.post('/webhook', razorpayWebhook);

// Protected routes
router.use(protect);

// Create Razorpay order
router.post('/create-order', checkPermission('write'), createRazorpayOrder);

// Verify Razorpay payment
router.post('/verify', checkPermission('write'), verifyRazorpayPayment);

// Process manual payment
router.post('/manual', checkPermission('write'), processManualPayment);

// Get payment history for an invoice
router.get('/invoice/:invoiceId', checkPermission('read'), getInvoicePayments);

export default router; 