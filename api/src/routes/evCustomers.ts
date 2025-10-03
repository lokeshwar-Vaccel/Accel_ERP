import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  createEVCustomerSchema, 
  updateEVCustomerSchema
} from '../schemas/evCustomerSchema';
import { UserRole } from '../types';
import {
  getAllEVCustomers,
  getEVCustomerById,
  createEVCustomer,
  updateEVCustomer,
  deleteEVCustomer,
  previewEVCustomerImport,
  importEVCustomers,
  exportEVCustomers
} from '../controllers/evCustomerController';
import multer from 'multer';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for service management (temporarily disabled for debugging)
// router.use(checkModuleAccess('service_management'));

const upload = multer();

// EV Customer Excel import/export routes
router.post('/preview-import', upload.single('file'), checkPermission('write'), previewEVCustomerImport);
router.post('/import', upload.single('file'), checkPermission('write'), importEVCustomers);
router.get('/export', checkPermission('read'), exportEVCustomers);

// EV Customer CRUD routes
router.get('/', checkPermission('read'), getAllEVCustomers);
router.get('/:id', checkPermission('read'), getEVCustomerById);
router.post('/', checkPermission('write'), validate(createEVCustomerSchema), createEVCustomer);
router.put('/:id', checkPermission('write'), validate(updateEVCustomerSchema), updateEVCustomer);
router.delete('/:id', checkPermission('delete'), deleteEVCustomer);

export default router;
