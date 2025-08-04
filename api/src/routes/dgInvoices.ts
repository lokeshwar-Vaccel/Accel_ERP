import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import {
  createDGInvoice,
  getDGInvoices,
  getDGInvoice,
  updateDGInvoice,
  updatePaymentStatus,
  updateDeliveryStatus,
  createDGInvoiceFromPO,
  deleteDGInvoice
} from '../controllers/dgInvoiceController';

const router = Router();

// All routes are protected
router.use(protect);

// @route   GET /api/v1/dg-invoices
router.get('/', getDGInvoices);

// @route   POST /api/v1/dg-invoices
router.post('/', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  createDGInvoice
);

// @route   POST /api/v1/dg-invoices/from-po/:poId
router.post('/from-po/:poId',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  createDGInvoiceFromPO
);

// @route   GET /api/v1/dg-invoices/:id
router.get('/:id', getDGInvoice);

// @route   PUT /api/v1/dg-invoices/:id
router.put('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateDGInvoice
);

// @route   PATCH /api/v1/dg-invoices/:id/payment-status
router.patch('/:id/payment-status',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updatePaymentStatus
);

// @route   PATCH /api/v1/dg-invoices/:id/delivery-status
router.patch('/:id/delivery-status',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateDeliveryStatus
);

// @route   DELETE /api/v1/dg-invoices/:id
router.delete('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  checkPermission('write'),
  deleteDGInvoice
);

export default router; 