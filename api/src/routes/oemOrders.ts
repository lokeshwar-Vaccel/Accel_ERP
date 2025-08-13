import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import {
  createOEMOrder,
  getOEMOrders,
  getOEMOrder,
  updateOEMOrder,
  updateOEMOrderStatus,
  updateDeliveryStatus,
  createOEMOrderFromPO,
  deleteOEMOrder
} from '../controllers/oemOrderController';

const router = Router();

// All routes are protected
router.use(protect);

// @route   GET /api/v1/oem-orders
router.get('/', getOEMOrders);

// @route   POST /api/v1/oem-orders
router.post('/', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  createOEMOrder
);

// @route   POST /api/v1/oem-orders/from-po/:poId
router.post('/from-po/:poId',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  createOEMOrderFromPO
);

// @route   GET /api/v1/oem-orders/:id
router.get('/:id', getOEMOrder);

// @route   PUT /api/v1/oem-orders/:id
router.put('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateOEMOrder
);

// @route   PATCH /api/v1/oem-orders/:id/status
router.patch('/:id/status',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateOEMOrderStatus
);

// @route   PATCH /api/v1/oem-orders/:id/delivery-status
router.patch('/:id/delivery-status',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateDeliveryStatus
);

// @route   DELETE /api/v1/oem-orders/:id
router.delete('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  checkPermission('write'),
  deleteOEMOrder
);

export default router; 