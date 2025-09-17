import express from 'express';
import {
  getDGInvoices,
  getDGInvoiceById,
  createDGInvoice,
  updateDGInvoice,
  deleteDGInvoice,
  exportDGInvoices,
  updateDGInvoicePayment
} from '../controllers/dgInvoiceController';
import { protect, checkPermission } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import {
  createDGInvoiceSchema,
  updateDGInvoiceSchema,
  getDGInvoicesQuerySchema,
  exportDGInvoicesQuerySchema
} from '../schemas/dgInvoiceSchemas';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

// @route   GET /api/v1/dg-invoices
// @desc    Get all DG Invoices
// @access  Private
router.get('/', checkPermission('read'), validateRequest(getDGInvoicesQuerySchema, 'query'), getDGInvoices);

// @route   GET /api/v1/dg-invoices/export
// @desc    Export DG Invoices to Excel
// @access  Private
router.get('/export', checkPermission('read'), validateRequest(exportDGInvoicesQuerySchema, 'query'), exportDGInvoices);

// @route   GET /api/v1/dg-invoices/:id
// @desc    Get DG Invoice by ID
// @access  Private
router.get('/:id', checkPermission('read'), getDGInvoiceById);

// @route   POST /api/v1/dg-invoices
// @desc    Create new DG Invoice
// @access  Private
router.post('/', checkPermission('write'), validateRequest(createDGInvoiceSchema), createDGInvoice);

// @route   PUT /api/v1/dg-invoices/:id
// @desc    Update DG Invoice
// @access  Private
router.put('/:id', checkPermission('write'), validateRequest(updateDGInvoiceSchema), updateDGInvoice);

// @route   PUT /api/v1/dg-invoices/:id/payment
// @desc    Update DG Invoice Payment
// @access  Private
router.put('/:id/payment', checkPermission('write'), updateDGInvoicePayment);

// @route   DELETE /api/v1/dg-invoices/:id
// @desc    Delete DG Invoice
// @access  Private
router.delete('/:id', checkPermission('delete'), deleteDGInvoice);

export default router;