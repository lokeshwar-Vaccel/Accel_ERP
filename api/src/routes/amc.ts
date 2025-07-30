import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  createAMCSchema,
  updateAMCSchema,
  amcQuerySchema,
  scheduleVisitSchema,
  completeVisitSchema,
  renewAMCSchema
} from '../schemas';
import { UserRole } from '../types';
import {
  getAMCContracts as getAMCs,
  getAMCContract as getAMC,
  createAMCContract as createAMC,
  updateAMCContract as updateAMC,
  scheduleAMCVisit as scheduleVisit,
  completeAMCVisit as completeVisit,
  renewAMCContract as renewAMC,
  getExpiringContracts,
  getAMCStats,
  generateAMCReport,
  scheduleEnhancedVisit,
  bulkRenewContracts,
  getAMCPerformance,
  getAMCDetails,
  updateAMCStatus,
  getAMCsByCustomer,
  getExpiringSoon,
  getVisitsDue,
  getAMCDashboard,
  deleteAMCContract,
  bulkDeleteAMCContracts,
  archiveAMCContract
} from '../controllers/amcController';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for AMC management
router.use(checkModuleAccess('amc_management'));



// AMC routes
router.route('/')
  .get(validate(amcQuerySchema, 'query'), checkPermission('read'), getAMCs)
  .post(validate(createAMCSchema), checkPermission('write'), createAMC);

router.route('/:id')
  .get(checkPermission('read'), getAMC)
  .put(validate(updateAMCSchema), checkPermission('write'), updateAMC)
  .delete(restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('delete'), deleteAMCContract);

// AMC actions
router.post('/:id/schedule-visit', validate(scheduleVisitSchema), checkPermission('write'), scheduleVisit);
router.post('/visits/:visitId/complete', validate(completeVisitSchema), checkPermission('write'), completeVisit);
router.post('/:id/renew', validate(renewAMCSchema), checkPermission('write'), renewAMC);

// Enhanced AMC functionality
router.post('/:id/schedule-visit-enhanced', checkPermission('write'), scheduleEnhancedVisit);
router.post('/bulk-renew', checkPermission('write'), bulkRenewContracts);
router.get('/:id/performance', checkPermission('read'), getAMCPerformance);
router.get('/:id/details', checkPermission('read'), getAMCDetails);
router.put('/:id/status', checkPermission('write'), updateAMCStatus);

// Delete and Archive functionality
router.delete('/bulk-delete', restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('delete'), bulkDeleteAMCContracts);
router.put('/:id/archive', restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('write'), archiveAMCContract);

// Customer-specific routes
router.get('/customer/:customerId', checkPermission('read'), getAMCsByCustomer);

// Special queries
router.get('/expiring/contracts', checkPermission('read'), getExpiringContracts);
router.get('/expiring-soon', checkPermission('read'), getExpiringSoon);
router.get('/visits-due', checkPermission('read'), getVisitsDue);
router.get('/stats/overview', checkPermission('read'), getAMCStats);
router.get('/dashboard', checkPermission('read'), getAMCDashboard);

// Reports
router.get('/reports/:type', checkPermission('read'), generateAMCReport);

export default router; 