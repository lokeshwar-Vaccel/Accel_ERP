import express from 'express';
import {
  createQuotationPayment,
  getPaymentsByQuotation,
  getPaymentById,
  updatePayment,
  deletePayment,
  generatePaymentReceiptPDFEndpoint
} from '../controllers/quotationPaymentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   POST /api/v1/quotation-payments
// @desc    Create a new quotation payment
// @access  Private
router.post('/', createQuotationPayment);

// @route   GET /api/v1/quotation-payments/quotation/:quotationId
// @desc    Get all payments for a specific quotation
// @access  Private
router.get('/quotation/:quotationId', getPaymentsByQuotation);

// @route   GET /api/v1/quotation-payments/:id
// @desc    Get payment by ID
// @access  Private
router.get('/:id', getPaymentById);

// @route   PUT /api/v1/quotation-payments/:id
// @desc    Update payment details
// @access  Private
router.put('/:id', updatePayment);

// @route   DELETE /api/v1/quotation-payments/:id
// @desc    Delete payment
// @access  Private
router.delete('/:id', deletePayment);

// @route   GET /api/v1/quotation-payments/:id/pdf
// @desc    Generate PDF receipt for a payment
// @access  Private
router.get('/:id/pdf', generatePaymentReceiptPDFEndpoint);

export default router;
