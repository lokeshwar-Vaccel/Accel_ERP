import express from 'express';
import {
  getAMCQuotations,
  getAMCQuotationById,
  createAMCQuotation,
  updateAMCQuotation,
  deleteAMCQuotation,
  updateAMCQuotationPayment,
  getAMCQuotationStats,
  sendAMCQuotationEmailToCustomer,
  updateAMCQuotationStatus
} from '../controllers/amcQuotationController';
import { protect } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   GET /api/v1/amc-quotations
// @desc    Get all AMC quotations with pagination and filtering
// @access  Private
router.get('/', getAMCQuotations);

// @route   GET /api/v1/amc-quotations/stats
// @desc    Get AMC quotation statistics
// @access  Private
router.get('/stats', getAMCQuotationStats);

// @route   GET /api/v1/amc-quotations/:id
// @desc    Get a single AMC quotation by ID
// @access  Private
router.get('/:id', getAMCQuotationById);

// @route   POST /api/v1/amc-quotations
// @desc    Create a new AMC quotation
// @access  Private
router.post('/', createAMCQuotation);

// @route   PUT /api/v1/amc-quotations/:id
// @desc    Update an AMC quotation
// @access  Private
router.put('/:id', updateAMCQuotation);

// @route   PUT /api/v1/amc-quotations/:id/payment
// @desc    Update AMC quotation payment
// @access  Private
router.put('/:id/payment', updateAMCQuotationPayment);

// @route   POST /api/v1/amc-quotations/:id/send-email
// @desc    Send AMC quotation email to customer
// @access  Private
router.post('/:id/send-email', sendAMCQuotationEmailToCustomer);

// @route   PUT /api/v1/amc-quotations/:id/status
// @desc    Update AMC quotation status
// @access  Private
router.put('/:id/status', updateAMCQuotationStatus);

// @route   DELETE /api/v1/amc-quotations/:id
// @desc    Delete an AMC quotation
// @access  Private
router.delete('/:id', deleteAMCQuotation);

export default router;
