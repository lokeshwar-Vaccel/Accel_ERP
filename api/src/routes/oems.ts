import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import {
  createOEM,
  getOEMs,
  getOEM,
  updateOEM,
  updateOEMStatus,
  updateOEMRating,
  addOEMProduct,
  updateOEMProduct,
  removeOEMProduct,
  searchOEMProducts,
  deleteOEM
} from '../controllers/oemController';

const router = Router();

// All routes are protected
router.use(protect);

// @route   GET /api/v1/oems/products/search
router.get('/products/search', searchOEMProducts);

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

// @route   PATCH /api/v1/oems/:id/rating
router.patch('/:id/rating',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateOEMRating
);

// @route   POST /api/v1/oems/:id/products
router.post('/:id/products',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  addOEMProduct
);

// @route   PUT /api/v1/oems/:id/products/:productId
router.put('/:id/products/:productId',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  updateOEMProduct
);

// @route   DELETE /api/v1/oems/:id/products/:productId
router.delete('/:id/products/:productId',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  checkPermission('write'),
  removeOEMProduct
);

// @route   DELETE /api/v1/oems/:id
router.delete('/:id',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  checkPermission('write'),
  deleteOEM
);

export default router; 