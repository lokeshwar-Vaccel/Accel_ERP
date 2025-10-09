import express from 'express';
import {
  getAllAMCInvoicePayments,
  getAMCInvoicePayments,
  getAMCInvoicePaymentById,
  getAMCInvoicePaymentsByInvoice,
  createAMCInvoicePayment,
  updateAMCInvoicePayment,
  updateAMCInvoicePaymentStatus,
  deleteAMCInvoicePayment,
  getAMCInvoicePaymentSummary,
  generateAMCInvoicePaymentReceipt
} from '../controllers/amcInvoicePaymentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   POST /api/v1/amc-invoice-payments
// @desc    Create a new AMC invoice payment
// @access  Private
router.post('/', createAMCInvoicePayment);

// @route   GET /api/v1/amc-invoice-payments
// @desc    Get all AMC invoice payments with optional filtering
// @access  Private
router.get('/', getAllAMCInvoicePayments);

// @route   GET /api/v1/amc-invoice-payments/:id
// @desc    Get AMC invoice payment by ID
// @access  Private
router.get('/:id', getAMCInvoicePaymentById);

// @route   GET /api/v1/amc-invoice-payments/invoice/:invoiceId
// @desc    Get payments for a specific AMC invoice
// @access  Private
router.get('/invoice/:invoiceId', getAMCInvoicePaymentsByInvoice);

// @route   GET /api/v1/amc-invoice-payments/:invoiceId/payments
// @desc    Get all payments for a specific AMC invoice (alternative route)
// @access  Private
router.get('/:invoiceId/payments', getAMCInvoicePayments);

// @route   GET /api/v1/amc-invoice-payments/:invoiceId/payment-summary
// @desc    Get payment summary for an AMC invoice
// @access  Private
router.get('/:invoiceId/payment-summary', getAMCInvoicePaymentSummary);


// @route   PUT /api/v1/amc-invoice-payments/:id/status
// @desc    Update AMC invoice payment status
// @access  Private
router.put('/:id/status', updateAMCInvoicePaymentStatus);

// @route   PUT /api/v1/amc-invoice-payments/:invoiceId/payments/:paymentId
// @desc    Update an existing payment
// @access  Private
router.put('/:invoiceId/payments/:paymentId', updateAMCInvoicePayment);

// @route   DELETE /api/v1/amc-invoice-payments/:id
// @desc    Delete AMC invoice payment
// @access  Private
router.delete('/:id', deleteAMCInvoicePayment);

// @route   DELETE /api/v1/amc-invoice-payments/:invoiceId/payments/:paymentId
// @desc    Delete a payment (alternative route)
// @access  Private
router.delete('/:invoiceId/payments/:paymentId', deleteAMCInvoicePayment);

// @route   GET /api/v1/amc-invoice-payments/:id/receipt
// @desc    Generate payment receipt PDF for AMC invoice payment
// @access  Private
router.get('/:id/receipt', generateAMCInvoicePaymentReceipt);

export default router;
