import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import {
  createOEM,
  getOEMs,
  getOEM,
  updateOEM,
  updateOEMStatus,
  addOEMAddress,
  updateOEMAddress,
  removeOEMAddress,
  addOEMBankDetail,
  updateOEMBankDetail,
  removeOEMBankDetail,
  deleteOEM
} from '../controllers/oemController';

const router = Router();

// All routes are protected
router.use(protect);

// @route   GET /api/v1/oems
router.get('/', getOEMs);

// @route   POST /api/v1/oems
router.post('/', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  createOEM
);

// @route   GET /api/v1/oems/:id
router.get('/:id', getOEM);

// @route   PUT /api/v1/oems/:id
router.put('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateOEM
);

// @route   PATCH /api/v1/oems/:id/status
router.patch('/:id/status',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateOEMStatus
);

// Address management routes
// @route   POST /api/v1/oems/:id/addresses
router.post('/:id/addresses',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  addOEMAddress
);

// @route   PUT /api/v1/oems/:id/addresses/:addressId
router.put('/:id/addresses/:addressId',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateOEMAddress
);

// @route   DELETE /api/v1/oems/:id/addresses/:addressId
router.delete('/:id/addresses/:addressId',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  removeOEMAddress
);

// Bank details management routes
// @route   POST /api/v1/oems/:id/bank-details
router.post('/:id/bank-details',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  addOEMBankDetail
);

// @route   PUT /api/v1/oems/:id/bank-details/:bankDetailId
router.put('/:id/bank-details/:bankDetailId',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateOEMBankDetail
);

// @route   DELETE /api/v1/oems/:id/bank-details/:bankDetailId
router.delete('/:id/bank-details/:bankDetailId',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  removeOEMBankDetail
);

// @route   DELETE /api/v1/oems/:id
router.delete('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  checkPermission('write'),
  deleteOEM
);

export default router; 