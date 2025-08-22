import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  createServiceTicketSchema,
  updateServiceTicketSchema,
  serviceTicketQuerySchema,
  completeServiceSchema,
  assignServiceSchema,
  updateServiceStatusSchema,
  bulkServiceImportSchema
} from '../schemas';
import { UserRole } from '../types';
import {
  getServiceTickets,
  getServiceTicket,
  createServiceTicket,
  updateServiceTicket,
  updateExcelServiceTicket,
  assignServiceTicket,
  completeServiceTicket,
  addPartsUsed,
  getServiceStats,
  updateServiceTicketStatus,
  bulkImportServiceTickets,
  exportServiceTickets,
  getCustomerEngines,
  getCustomerAddresses
} from '../controllers/serviceController';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for service management
router.use(checkModuleAccess('service_management'));

// Placeholder for delete function (to be implemented)
const deleteServiceTicket = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Delete service ticket endpoint',
    data: { id: req.params.id }
  });
};

// Service ticket routes
router.route('/')
  .get(validate(serviceTicketQuerySchema, 'query'), checkPermission('read'), getServiceTickets)
  .post(validate(createServiceTicketSchema), checkPermission('write'), createServiceTicket);

// Bulk operations (must come before /:id routes)
router.post('/bulk-import', validate(bulkServiceImportSchema), checkPermission('write'), bulkImportServiceTickets);
router.get('/export', checkPermission('read'), exportServiceTickets);

router.route('/:id')
  .get(checkPermission('read'), getServiceTicket)
  .put(validate(updateServiceTicketSchema), checkPermission('write'), updateServiceTicket)
  .delete(restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('delete'), deleteServiceTicket);

// Excel-specific update route (must come before /:id/assign to avoid conflicts)
router.put('/:id/excel-update', checkPermission('write'), updateExcelServiceTicket);

// Service ticket actions
router.post('/:id/assign', validate(assignServiceSchema), checkPermission('write'), assignServiceTicket);
router.post('/:id/complete', validate(completeServiceSchema), checkPermission('write'), completeServiceTicket);
router.put('/:id/status', validate(updateServiceStatusSchema), checkPermission('write'), updateServiceTicketStatus);

// Statistics
router.get('/stats/overview', checkPermission('read'), getServiceStats);

// Customer data endpoints
router.get('/customer/:customerId/engines', checkPermission('read'), getCustomerEngines);
router.get('/customer/:customerId/addresses', checkPermission('read'), getCustomerAddresses);

export default router; 