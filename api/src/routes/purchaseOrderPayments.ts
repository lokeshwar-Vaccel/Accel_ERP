import express from 'express';
import {
  createPurchaseOrderPayment,
  getPaymentsByPurchaseOrder,
  getPaymentById,
  updatePayment,
  deletePayment,
  generatePaymentReceiptPDFEndpoint
} from '../controllers/purchaseOrderPaymentController';
import { protect, checkPermission } from '../middleware/auth';

const router = express.Router();

// All routes require authentication and appropriate permissions
router.use(protect);
router.use(checkPermission('read'));

// Create a new payment
router.post('/', checkPermission('write'), createPurchaseOrderPayment);

// Get all payments for a specific purchase order (must come before /:id route)
router.get('/po/:poId', checkPermission('read'), getPaymentsByPurchaseOrder);

// Get payment by ID
router.get('/:id', checkPermission('read'), getPaymentById);

// Generate PDF receipt for payment
router.get('/:id/pdf', checkPermission('read'), generatePaymentReceiptPDFEndpoint);

// Update payment
router.put('/:id', checkPermission('write'), updatePayment);

// Delete payment
router.delete('/:id', checkPermission('write'), deletePayment);

export default router; 