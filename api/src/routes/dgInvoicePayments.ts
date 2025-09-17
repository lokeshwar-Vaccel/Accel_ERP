import express from 'express';
import {
  createDGInvoicePayment,
  getPaymentsByDGInvoice,
  getPaymentById,
  updatePayment,
  deletePayment,
  generatePaymentReceiptPDFEndpoint
} from '../controllers/dgInvoicePaymentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   POST /api/v1/dg-invoice-payments
// @desc    Create a new DG invoice payment
// @access  Private
router.post('/', createDGInvoicePayment);

// @route   GET /api/v1/dg-invoice-payments/invoice/:dgInvoiceId
// @desc    Get all payments for a specific DG invoice
// @access  Private
router.get('/invoice/:dgInvoiceId', getPaymentsByDGInvoice);

// @route   GET /api/v1/dg-invoice-payments/:id
// @desc    Get payment by ID
// @access  Private
router.get('/:id', getPaymentById);

// @route   PUT /api/v1/dg-invoice-payments/:id
// @desc    Update payment details
// @access  Private
router.put('/:id', updatePayment);

// @route   DELETE /api/v1/dg-invoice-payments/:id
// @desc    Delete payment
// @access  Private
router.delete('/:id', deletePayment);

// @route   GET /api/v1/dg-invoice-payments/:id/pdf
// @desc    Generate PDF receipt for a payment
// @access  Private
router.get('/:id/pdf', generatePaymentReceiptPDFEndpoint);

export default router;
