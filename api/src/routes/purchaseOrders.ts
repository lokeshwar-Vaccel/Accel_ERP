import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  purchaseOrderQuerySchema,
  receivePOSchema,
  approvePOSchema,
  cancelPOSchema
} from '../schemas';
import { UserRole } from '../types';
import {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
  sendPurchaseOrder,
  receiveItems,
  cancelPurchaseOrder,
  getPurchaseOrderStats
} from '../controllers/purchaseOrderController';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for inventory management
router.use(checkModuleAccess('inventory_management'));

// Placeholder functions
const deletePurchaseOrder = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Delete purchase order endpoint',
    data: { id: req.params.id }
  });
};

const getPendingApprovals = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Get pending approvals endpoint',
    data: []
  });
};

// Purchase Order routes
router.route('/')
  .get(validate(purchaseOrderQuerySchema, 'query'), checkPermission('read'), getPurchaseOrders)
  .post(validate(createPurchaseOrderSchema), checkPermission('write'), createPurchaseOrder);

router.route('/:id')
  .get(checkPermission('read'), getPurchaseOrder)
  .put(validate(updatePurchaseOrderSchema), checkPermission('write'), updatePurchaseOrder)
  .delete(restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('delete'), deletePurchaseOrder);

// Purchase order actions
router.put('/:id/status', checkPermission('write'), updatePurchaseOrderStatus);

router.post('/:id/send', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER), 
  checkPermission('write'), 
  sendPurchaseOrder
);

router.post('/:id/receive', validate(receivePOSchema), checkPermission('write'), receiveItems);
router.post('/:id/cancel', validate(cancelPOSchema), checkPermission('write'), cancelPurchaseOrder);

// Special queries
router.get('/pending/approvals', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER), 
  checkPermission('read'), 
  getPendingApprovals
);

router.get('/stats/overview', checkPermission('read'), getPurchaseOrderStats);

export default router; 