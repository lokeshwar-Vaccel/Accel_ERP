import { Router } from 'express';
import { protect, checkPermission, checkModuleAccess } from '../middleware/auth';
import {
  createDGPurchaseOrder,
  getDGPurchaseOrderById,
  getAllDGPurchaseOrders,
  updateDGPurchaseOrder,
  deleteDGPurchaseOrder,
  getDGPurchaseOrderStats,
  generatePONumber,
  updateDGPurchaseOrderStatus,
  getPurchaseOrdersByQuotation,
  receiveItems
} from '../controllers/dgPurchaseOrderController';

const router = Router();

// All routes are protected
router.use(protect);
router.use(checkModuleAccess('dg_sales'));

// DG Purchase Order routes
router.get('/generate-number', checkPermission('read'), generatePONumber);
router.get('/stats', checkPermission('read'), getDGPurchaseOrderStats);
router.get('/by-quotation/:quotationId', checkPermission('read'), getPurchaseOrdersByQuotation);
router.get('/', checkPermission('read'), getAllDGPurchaseOrders);
router.get('/:id', checkPermission('read'), getDGPurchaseOrderById);
router.post('/', checkPermission('write'), createDGPurchaseOrder);
router.put('/:id', checkPermission('write'), updateDGPurchaseOrder);
router.delete('/:id', checkPermission('delete'), deleteDGPurchaseOrder);

// Status update route
router.patch('/:id/status', checkPermission('write'), updateDGPurchaseOrderStatus);

// Receive items route
router.post('/:id/receive-items', checkPermission('write'), receiveItems);

export default router; 