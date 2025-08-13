import { Router } from 'express';
import { protect, checkPermission, checkModuleAccess } from '../middleware/auth';
import { 
  getDGInvoices, 
  getDGInvoice,
  createDGInvoice, 
  updateDGInvoice,
  deleteDGInvoice,
  getDGInvoiceStats, 
  updateDGInvoiceProductPriceAndGST,
  sendDGInvoiceEmail,
  sendDGPaymentReminder
} from '../controllers/dgInvoiceController';

const router = Router();

// All routes are protected and require DG invoice management access
router.use(protect);
// router.use(checkModuleAccess('dgSales'));

// DG Invoice routes
router.route('/')
  .get(checkPermission('read'), getDGInvoices)
  .post(checkPermission('write'), createDGInvoice);

router.route('/stats')
  .get(checkPermission('read'), getDGInvoiceStats);

router.route('/:id')
  .get(checkPermission('read'), getDGInvoice)
  .put(checkPermission('write'), updateDGInvoice)
  .delete(checkPermission('delete'), deleteDGInvoice);

router.put(
  '/:invoiceId/products',
  checkPermission('write'),
  updateDGInvoiceProductPriceAndGST
);

// Email routes
router.post('/:id/send-email', checkPermission('write'), sendDGInvoiceEmail);
router.post('/:id/send-reminder', checkPermission('write'), sendDGPaymentReminder);

export default router; 