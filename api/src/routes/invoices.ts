import { Router } from 'express';
import { protect, checkPermission, checkModuleAccess } from '../middleware/auth';
import { 
  getInvoices, 
  createInvoice, 
  updateInvoice, 
  getInvoiceStats, 
  updateInvoiceProductPriceAndGST,
  sendInvoiceEmail,
  sendPaymentReminder,
  createInvoiceFromQuotation,
  exportInvoices
} from '../controllers/invoiceController';

const router = Router();

// All routes are protected and require invoice management access
router.use(protect);
router.use(checkModuleAccess('billing'));

// Invoice routes
router.route('/')
  .get(checkPermission('read'), getInvoices)
  .post(checkPermission('write'), createInvoice);

router.route('/create-from-quotation')
  .post(checkPermission('write'), createInvoiceFromQuotation);

router.route('/stats')
  .get(checkPermission('read'), getInvoiceStats);

router.route('/export')
  .get(checkPermission('read'), exportInvoices);

router.route('/:id')
  .put(checkPermission('write'), updateInvoice);

  router.put(
  '/:invoiceId/products',
  updateInvoiceProductPriceAndGST
);

// Email routes
router.post('/:id/send-email', checkPermission('write'), sendInvoiceEmail);
router.post('/:id/send-reminder', checkPermission('write'), sendPaymentReminder);

export default router; 