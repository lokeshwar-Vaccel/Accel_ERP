import express from 'express';
import { protect } from '../middleware/auth';
import {
  createInvoicePayment,
  getPaymentsByInvoice,
  getPaymentById,
  updatePayment,
  deletePayment,
  generateInvoicePaymentReceiptPDF
} from '../controllers/invoicePaymentController';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// Create a new invoice payment
router.post('/', createInvoicePayment);

// Get payments by invoice ID
router.get('/invoice/:invoiceId', getPaymentsByInvoice);

// Get payment by ID
router.get('/:id', getPaymentById);

// Update payment
router.put('/:id', updatePayment);

// Delete payment
router.delete('/:id', deletePayment);

// Generate PDF receipt for a payment
router.get('/:id/pdf', generateInvoicePaymentReceiptPDF);

export default router;
