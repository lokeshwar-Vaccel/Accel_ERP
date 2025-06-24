import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  createCustomerSchema, 
  updateCustomerSchema, 
  customerQuerySchema,
  addContactHistorySchema 
} from '../schemas';
import { UserRole } from '../types';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for customer management
router.use(checkModuleAccess('customer_management'));

// Placeholder controller functions
const getCustomers = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Get customers endpoint',
    data: [],
    pagination: { page: 1, limit: 10, total: 0, pages: 0 }
  });
};

const getCustomer = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Get customer endpoint',
    data: { id: req.params.id }
  });
};

const createCustomer = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Create customer endpoint',
    data: { ...req.body, id: 'temp-id' }
  });
};

const updateCustomer = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Update customer endpoint',
    data: { id: req.params.id, ...req.body }
  });
};

const deleteCustomer = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Delete customer endpoint',
    data: { id: req.params.id }
  });
};

const addContactHistory = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Add contact history endpoint',
    data: { customerId: req.params.id, ...req.body }
  });
};

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

export default router; 