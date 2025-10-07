import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import {
  createDGProformaInvoice,
  getDGProformaInvoices,
  getDGProformaInvoice,
  updateDGProformaInvoice,
  updateDGProformaInvoiceStatus,
  deleteDGProformaInvoice,
  createDGProformaFromPO
} from '../controllers/DGProformaInvoiceController';

const router = Router();

// All routes are protected
router.use(protect);

// @route   GET /api/v1/dg-proforma-invoices
router.get('/', getDGProformaInvoices);

// @route   POST /api/v1/dg-proforma-invoices
router.post('/', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  createDGProformaInvoice
);

// @route   POST /api/v1/dg-proforma-invoices/from-po/:poId
router.post('/from-po/:poId',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  createDGProformaFromPO
);

// @route   GET /api/v1/dg-proforma-invoices/:id
router.get('/:id', getDGProformaInvoice);

// @route   PUT /api/v1/dg-proforma-invoices/:id
router.put('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateDGProformaInvoice
);

// @route   PATCH /api/v1/dg-proforma-invoices/:id/status
router.patch('/:id/status',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateDGProformaInvoiceStatus
);

// @route   DELETE /api/v1/dg-proforma-invoices/:id
router.delete('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  checkPermission('write'),
  deleteDGProformaInvoice
);

export default router; 