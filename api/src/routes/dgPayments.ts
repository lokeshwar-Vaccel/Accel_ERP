import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import {
  createDGPayment,
  getDGPayments,
  getDGPayment,
  updateDGPayment,
  verifyDGPayment,
  deleteDGPayment,
  getPaymentSummaryByInvoice
} from '../controllers/dgPaymentController';

const router = Router();

// All routes are protected
router.use(protect);

// @route   GET /api/v1/dg-payments
router.get('/', getDGPayments);

// @route   POST /api/v1/dg-payments
router.post('/', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  createDGPayment
);

// @route   GET /api/v1/dg-payments/invoice/:invoiceId/summary
router.get('/invoice/:invoiceId/summary', getPaymentSummaryByInvoice);

// @route   GET /api/v1/dg-payments/:id
router.get('/:id', getDGPayment);

// @route   PUT /api/v1/dg-payments/:id
router.put('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateDGPayment
);

// @route   PATCH /api/v1/dg-payments/:id/verify
router.patch('/:id/verify',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  verifyDGPayment
);

// @route   DELETE /api/v1/dg-payments/:id
router.delete('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  checkPermission('write'),
  deleteDGPayment
);

export default router; 