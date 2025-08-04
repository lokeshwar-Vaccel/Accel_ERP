import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import {
  createProformaInvoice,
  getProformaInvoices,
  getProformaInvoice,
  updateProformaInvoice,
  updateProformaInvoiceStatus,
  deleteProformaInvoice,
  createProformaFromPO
} from '../controllers/proformaInvoiceController';

const router = Router();

// All routes are protected
router.use(protect);

// @route   GET /api/v1/proforma-invoices
router.get('/', getProformaInvoices);

// @route   POST /api/v1/proforma-invoices
router.post('/', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  createProformaInvoice
);

// @route   POST /api/v1/proforma-invoices/from-po/:poId
router.post('/from-po/:poId',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  createProformaFromPO
);

// @route   GET /api/v1/proforma-invoices/:id
router.get('/:id', getProformaInvoice);

// @route   PUT /api/v1/proforma-invoices/:id
router.put('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateProformaInvoice
);

// @route   PATCH /api/v1/proforma-invoices/:id/status
router.patch('/:id/status',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateProformaInvoiceStatus
);

// @route   DELETE /api/v1/proforma-invoices/:id
router.delete('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  checkPermission('write'),
  deleteProformaInvoice
);

export default router; 