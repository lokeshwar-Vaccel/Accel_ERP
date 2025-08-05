import express from 'express';
import {
  sendFeedbackEmail,
  getFeedbackForm,
  submitFeedback,
  getFeedbackStats,
  getFeedbackByTicketId
} from '../controllers/customerFeedbackController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Public routes (no authentication required)
router.get('/:token', getFeedbackForm);
router.post('/:token', submitFeedback);

// Protected routes (authentication required)
router.post('/send-email', protect, sendFeedbackEmail);
router.get('/stats', protect, getFeedbackStats);
router.get('/ticket/:ticketId', protect, getFeedbackByTicketId);

export default router; 