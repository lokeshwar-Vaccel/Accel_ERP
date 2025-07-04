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
} from '../controllers/customerController';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for customer management
router.use(checkModuleAccess('customer_management'));

// Customer routes
router.route('/')
  .get(validate(customerQuerySchema, 'query'), checkPermission('read'), getCustomers)
  .post(validate(createCustomerSchema), checkPermission('write'), createCustomer);

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