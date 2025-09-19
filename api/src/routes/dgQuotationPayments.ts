import express from 'express';
import {
  createDGQuotationPayment,
  getPaymentsByDGQuotation,
  getPaymentById,
  updatePayment,
  deletePayment
} from '../controllers/dgQuotationPaymentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   POST /api/v1/dg-quotation-payments
// @desc    Create a new DG quotation payment
// @access  Private
router.post('/', createDGQuotationPayment);

// @route   GET /api/v1/dg-quotation-payments/quotation/:quotationId
// @desc    Get all payments for a specific DG quotation
// @access  Private
router.get('/quotation/:quotationId', getPaymentsByDGQuotation);

// @route   GET /api/v1/dg-quotation-payments/:id
// @desc    Get payment by ID
// @access  Private
router.get('/:id', getPaymentById);

// @route   PUT /api/v1/dg-quotation-payments/:id
// @desc    Update payment
// @access  Private
router.put('/:id', updatePayment);

// @route   DELETE /api/v1/dg-quotation-payments/:id
// @desc    Delete payment
// @access  Private
router.delete('/:id', deletePayment);

export default router;
