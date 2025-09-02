import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  createCustomerSchema, 
  updateCustomerSchema, 
  customerQuerySchema,
  addContactHistorySchema,
  updateContactHistorySchema,
  convertLeadSchema,
  scheduleFollowUpSchema
} from '../schemas';
import { UserRole } from '../types';
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addContactHistory,
  updateContactHistory,
  deleteContactHistory,
  convertLead,
  scheduleFollowUp,
  getOEMCustomers,
  getConvertedCustomers,
  exportCustomers,
} from '../controllers/customerController';
import multer from 'multer';
import { previewCustomerImport, importCustomers } from '../controllers/customerImportController';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for lead management
router.use(checkModuleAccess('lead_management'));

const upload = multer();

// Customer Excel import routes
router.post('/preview-import', upload.single('file'), checkPermission('write'), previewCustomerImport);
router.post('/import', upload.single('file'), checkPermission('write'), importCustomers);

// OEM Customers route
router.get('/oem', checkPermission('read'), getOEMCustomers);

// Converted Customers route
router.get('/converted', checkPermission('read'), getConvertedCustomers);

// Customer routes
router.route('/')
  .get(validate(customerQuerySchema, 'query'), checkPermission('read'), getCustomers)
  .post(validate(createCustomerSchema), checkPermission('write'), createCustomer);

// Export customers/suppliers to Excel
router.get('/export', checkPermission('read'), exportCustomers);

router.route('/:id')
  .get(checkPermission('read'), getCustomer)
  .put(validate(updateCustomerSchema), checkPermission('write'), updateCustomer)
  .delete(restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('delete'), deleteCustomer);

// Contact history
router.post('/:id/contact-history', 
  validate(addContactHistorySchema), 
  checkPermission('write'), 
  addContactHistory
);

router.put('/:id/contact-history/:contactId',
  validate(updateContactHistorySchema),
  checkPermission('write'),
  updateContactHistory
);

router.delete('/:id/contact-history/:contactId',
  checkPermission('delete'),
  deleteContactHistory
);

// Lead conversion
router.put('/:id/convert',
  validate(convertLeadSchema),
  checkPermission('write'),
  convertLead
);

// Follow-up scheduling
router.post('/:id/follow-up',
  validate(scheduleFollowUpSchema),
  checkPermission('write'),
  scheduleFollowUp
);



export default router; 