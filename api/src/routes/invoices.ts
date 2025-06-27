import { Router } from 'express';
import { protect, checkPermission, checkModuleAccess } from '../middleware/auth';
import { 
  getInvoices, 
  createInvoice, 
  updateInvoice, 
  getInvoiceStats 
} from '../controllers/invoiceController';

const router = Router();

// All routes are protected and require invoice management access
router.use(protect);
router.use(checkModuleAccess('invoice_management'));

// Invoice routes
router.route('/')
  .get(checkPermission('read'), getInvoices)
  .post(checkPermission('write'), createInvoice);

router.route('/stats')
  .get(checkPermission('read'), getInvoiceStats);

router.route('/:id')
  .put(checkPermission('write'), updateInvoice);

export default router; 