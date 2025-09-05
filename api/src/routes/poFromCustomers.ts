import express from 'express';
import {
  getPOFromCustomers,
  getPOFromCustomerById,
  createPOFromCustomer,
  updatePOFromCustomer,
  deletePOFromCustomer,
  updatePOFromCustomerStatus,
  exportPOFromCustomers,
//   uploadPOPdf
} from '../controllers/poFromCustomerController';
import { protect, checkPermission } from '../middleware/auth';
import { uploadPdfSingle, uploadPdfAndImageSingle } from '../middleware/upload';

const router = express.Router();

// @route   GET /api/v1/po-from-customers/export
// @desc    Export PO from customers to Excel
// @access  Private
router.get('/export', protect, checkPermission('read'), exportPOFromCustomers);

// @route   GET /api/v1/po-from-customers
// @desc    Get all PO from customers with pagination and filtering
// @access  Private
router.get('/', protect, checkPermission('read'), getPOFromCustomers);

// @route   GET /api/v1/po-from-customers/:id
// @desc    Get single PO from customer by ID
// @access  Private
router.get('/:id', protect, checkPermission('read'), getPOFromCustomerById);

// @route   POST /api/v1/po-from-customers
// @desc    Create new PO from customer
// @access  Private
router.post('/', protect, checkPermission('write'), createPOFromCustomer);

// @route   PUT /api/v1/po-from-customers/:id
// @desc    Update PO from customer
// @access  Private
router.put('/:id', protect, checkPermission('write'), updatePOFromCustomer);

// @route   PATCH /api/v1/po-from-customers/:id/status
// @desc    Update PO from customer status
// @access  Private
router.patch('/:id/status', protect, checkPermission('write'), updatePOFromCustomerStatus);

// @route   DELETE /api/v1/po-from-customers/:id
// @desc    Delete PO from customer
// @access  Private
router.delete('/:id', protect, checkPermission('delete'), deletePOFromCustomer);

// @route   POST /api/v1/po-from-customers/:id/upload-pdf
// @desc    Upload PDF or image for PO from customer (legacy - use /po-files/upload instead)
// @access  Private
// router.post('/:id/upload-pdf', protect, checkPermission('write'), uploadPdfAndImageSingle, uploadPOPdf);

export default router;
