import express from 'express';
import {
  createAMCQuotationPayment,
  getAMCQuotationPayments,
  getAMCQuotationPaymentById,
  getAMCQuotationPaymentsByQuotation,
  updateAMCQuotationPaymentStatus,
  deleteAMCQuotationPayment,
  generateAMCQuotationPaymentReceipt
} from '../controllers/amcQuotationPaymentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   POST /api/v1/amc-quotation-payments
// @desc    Create a new AMC quotation payment
// @access  Private
router.post('/', createAMCQuotationPayment);

// @route   GET /api/v1/amc-quotation-payments
// @desc    Get all AMC quotation payments with optional filtering
// @access  Private
router.get('/', getAMCQuotationPayments);

// @route   GET /api/v1/amc-quotation-payments/:id
// @desc    Get AMC quotation payment by ID
// @access  Private
router.get('/:id', getAMCQuotationPaymentById);

// @route   GET /api/v1/amc-quotation-payments/quotation/:quotationId
// @desc    Get payments for a specific AMC quotation
// @access  Private
router.get('/quotation/:quotationId', getAMCQuotationPaymentsByQuotation);

// @route   PUT /api/v1/amc-quotation-payments/:id/status
// @desc    Update AMC quotation payment status
// @access  Private
router.put('/:id/status', updateAMCQuotationPaymentStatus);

// @route   DELETE /api/v1/amc-quotation-payments/:id
// @desc    Delete AMC quotation payment
// @access  Private
router.delete('/:id', deleteAMCQuotationPayment);

// @route   GET /api/v1/amc-quotation-payments/:id/receipt
// @desc    Generate payment receipt PDF for AMC quotation payment
// @access  Private
router.get('/:id/receipt', generateAMCQuotationPaymentReceipt);

export default router;
