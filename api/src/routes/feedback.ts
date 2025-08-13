import express from 'express';
import {
  sendFeedbackEmail,
  getFeedbackForm,
  submitFeedback,
  getFeedbackStats,
  getFeedbackByTicketId,
  getAllFeedback
} from '../controllers/customerFeedbackController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Protected routes (authentication required) - must come before /:token routes
router.post('/send-email', protect, sendFeedbackEmail);
router.get('/stats', protect, getFeedbackStats);
router.get('/all', protect, getAllFeedback);
router.get('/ticket/:ticketId', protect, getFeedbackByTicketId);

// Public routes (no authentication required) - must come after specific routes
router.get('/:token', getFeedbackForm);
router.post('/:token', submitFeedback);

export default router; 