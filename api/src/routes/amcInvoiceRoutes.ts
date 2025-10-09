import express from 'express';
import {
  getAMCInvoices,
  getAMCInvoiceById,
  createAMCInvoice,
  createAMCInvoiceFromQuotation,
  updateAMCInvoice,
  deleteAMCInvoice,
  recordAMCInvoicePayment,
  sendAMCInvoiceEmail,
  getAMCInvoiceStats
} from '../controllers/amcInvoiceController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   GET /api/v1/amc-invoices
// @desc    Get all AMC invoices with pagination and filtering
// @access  Private
router.get('/', getAMCInvoices);

// @route   GET /api/v1/amc-invoices/stats
// @desc    Get AMC invoice statistics
// @access  Private
router.get('/stats', getAMCInvoiceStats);

// @route   GET /api/v1/amc-invoices/:id
// @desc    Get single AMC invoice by ID
// @access  Private
router.get('/:id', getAMCInvoiceById);

// @route   POST /api/v1/amc-invoices
// @desc    Create new AMC invoice
// @access  Private
router.post('/', createAMCInvoice);

// @route   POST /api/v1/amc-invoices/from-quotation/:quotationId
// @desc    Create AMC invoice from quotation
// @access  Private
router.post('/from-quotation/:quotationId', createAMCInvoiceFromQuotation);

// @route   PUT /api/v1/amc-invoices/:id
// @desc    Update AMC invoice
// @access  Private
router.put('/:id', updateAMCInvoice);

// @route   DELETE /api/v1/amc-invoices/:id
// @desc    Delete AMC invoice
// @access  Private
router.delete('/:id', deleteAMCInvoice);

// @route   POST /api/v1/amc-invoices/:id/payment
// @desc    Record payment for AMC invoice
// @access  Private
router.post('/:id/payment', recordAMCInvoicePayment);

// @route   POST /api/v1/amc-invoices/:id/send-email
// @desc    Send AMC invoice email to customer
// @access  Private
router.post('/:id/send-email', sendAMCInvoiceEmail);

export default router;