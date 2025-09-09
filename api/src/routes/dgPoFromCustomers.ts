import express from 'express';
import {
  getDGPoFromCustomers,
  getDGPoFromCustomerById,
  createDGPoFromCustomer,
  updateDGPoFromCustomer,
  deleteDGPoFromCustomer,
  updateDGPoFromCustomerStatus,
  exportDGPoFromCustomers,
} from '../controllers/dgPoFromCustomerController';
import { protect, checkPermission } from '../middleware/auth';
import { uploadPdfSingle, uploadPdfAndImageSingle } from '../middleware/upload';

const router = express.Router();

// @route   GET /api/v1/dg-po-from-customers/export
// @desc    Export DG PO from customers to Excel
// @access  Private
router.get('/export', protect, checkPermission('read'), exportDGPoFromCustomers);

// @route   GET /api/v1/dg-po-from-customers
// @desc    Get all DG PO from customers with pagination and filtering
// @access  Private
router.get('/', protect, checkPermission('read'), getDGPoFromCustomers);

// @route   GET /api/v1/dg-po-from-customers/:id
// @desc    Get single DG PO from customer by ID
// @access  Private
router.get('/:id', protect, checkPermission('read'), getDGPoFromCustomerById);

// @route   POST /api/v1/dg-po-from-customers
// @desc    Create new DG PO from customer
// @access  Private
router.post('/', protect, checkPermission('write'), createDGPoFromCustomer);

// @route   PUT /api/v1/dg-po-from-customers/:id
// @desc    Update DG PO from customer
// @access  Private
router.put('/:id', protect, checkPermission('write'), updateDGPoFromCustomer);

// @route   PATCH /api/v1/dg-po-from-customers/:id/status
// @desc    Update DG PO from customer status
// @access  Private
router.patch('/:id/status', protect, checkPermission('write'), updateDGPoFromCustomerStatus);

// @route   DELETE /api/v1/dg-po-from-customers/:id
// @desc    Delete DG PO from customer
// @access  Private
router.delete('/:id', protect, checkPermission('delete'), deleteDGPoFromCustomer);

export default router;
