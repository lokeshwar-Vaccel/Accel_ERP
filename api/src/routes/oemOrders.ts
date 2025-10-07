import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  createOEMOrderSchema,
  updateOEMOrderSchema,
  oemOrderQuerySchema,
  updateOEMOrderStatusSchema,
  updateOEMOrderPaymentSchema
} from '../schemas/oemOrderSchemas';
import { UserRole } from '../types';
import {
  getOEMOrders,
  getOEMOrder,
  createOEMOrder,
  updateOEMOrder,
  deleteOEMOrder,
  updateOEMOrderStatus,
  updateOEMOrderPayment,
  getOEMOrderStats,
  generateOEMOrderNumber
} from '../controllers/oemOrderController';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for DG sales
router.use(checkModuleAccess('dg_sales'));

// OEM Order routes
router.route('/')
  .get(validate(oemOrderQuerySchema, 'query'), checkPermission('read'), getOEMOrders)
  .post(validate(createOEMOrderSchema), checkPermission('write'), createOEMOrder);

router.route('/stats')
  .get(checkPermission('read'), getOEMOrderStats);

router.route('/generate-number')
  .get(checkPermission('read'), generateOEMOrderNumber);

router.route('/:id')
  .get(checkPermission('read'), getOEMOrder)
  .put(validate(updateOEMOrderSchema), checkPermission('write'), updateOEMOrder)
  .delete(restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('delete'), deleteOEMOrder);

// OEM order actions
router.put('/:id/status', validate(updateOEMOrderStatusSchema), checkPermission('write'), updateOEMOrderStatus);
router.put('/:id/payment', validate(updateOEMOrderPaymentSchema), checkPermission('write'), updateOEMOrderPayment);

export default router;