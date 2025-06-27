import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  getStockLocations,
  createStockLocation,
  updateStockLocation,
  deleteStockLocation,
  toggleStockLocationStatus
} from '../controllers/stockLocationController';
import { 
  stockQuerySchema,
  stockAdjustmentSchema,
  stockTransferSchema,
  createStockLocationSchema,
  updateStockLocationSchema
} from '../schemas';
import { UserRole } from '../types';
import {
  getStockLevels as getStock,
  adjustStock,
  transferStock
} from '../controllers/stockController';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for inventory management
router.use(checkModuleAccess('inventory_management'));


// Use getStock for low stock items too (it supports lowStock=true parameter)
const getLowStockItems = getStock;

// Stock routes
router.get('/', validate(stockQuerySchema, 'query'), checkPermission('read'), getStock);
router.get('/low-stock', checkPermission('read'), getLowStockItems);

// Stock adjustments
router.post('/adjust', validate(stockAdjustmentSchema), checkPermission('write'), adjustStock);

// Stock transfers
router.post('/transfer', validate(stockTransferSchema), checkPermission('write'), transferStock);

// Stock locations
router.route('/locations')
  .get(checkPermission('read'), getStockLocations)
  .post(validate(createStockLocationSchema), checkPermission('write'), createStockLocation);

router.put('/locations/:id', 
  validate(updateStockLocationSchema), 
  checkPermission('write'), 
  updateStockLocation
);

router.delete('/locations/:id', 
  checkPermission('delete'), 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), 
  deleteStockLocation
);

router.patch('/locations/:id/toggle', 
  checkPermission('write'), 
  toggleStockLocationStatus
);

export default router; 