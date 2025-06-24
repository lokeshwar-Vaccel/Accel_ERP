import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
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

// Placeholder controller functions for stock locations (to be implemented)
const getStockLocations = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Get stock locations endpoint',
    data: []
  });
};

const createStockLocation = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Create stock location endpoint',
    data: { ...req.body, id: 'temp-id' }
  });
};

const updateStockLocation = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Update stock location endpoint',
    data: { id: req.params.id, ...req.body }
  });
};

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

export default router; 