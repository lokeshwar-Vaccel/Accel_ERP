import express from 'express';
import {
  createPurchaseOrderPayment,
  getPaymentsByPurchaseOrder,
  getPaymentById,
  updatePayment,
  deletePayment
} from '../controllers/purchaseOrderPaymentController';
import { checkPermission } from '../middleware/auth';

const router = express.Router();

// All routes require authentication and appropriate permissions
router.use(checkPermission('read'));

// Create a new payment
router.post('/', checkPermission('write'), createPurchaseOrderPayment);

// Get all payments for a specific purchase order
router.get('/po/:poId', getPaymentsByPurchaseOrder);

// Get payment by ID
router.get('/:id', getPaymentById);

// Update payment
router.put('/:id', checkPermission('write'), updatePayment);

// Delete payment
router.delete('/:id', checkPermission('write'), deletePayment);

export default router; 