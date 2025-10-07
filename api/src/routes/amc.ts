import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  createAMCSchema,
  updateAMCSchema,
  amcQuerySchema,
  scheduleVisitSchema,
  scheduleVisitsBulkSchema,
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
  scheduleVisitsBulk,
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
  archiveAMCContract,
  regenerateVisitSchedule,
  getAMCsByVisitDate,
  getVisitScheduleSummary,
  exportAMCToExcel,
  exportAMCReportToExcel
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

// Special queries (must come before /:id routes)
router.get('/dashboard', checkPermission('read'), getAMCDashboard);
router.get('/stats/overview', checkPermission('read'), getAMCStats);
router.get('/expiring/contracts', checkPermission('read'), getExpiringContracts);
router.get('/expiring-soon', checkPermission('read'), getExpiringSoon);
router.get('/visits-due', checkPermission('read'), getVisitsDue);
router.get('/customer/:customerId', checkPermission('read'), getAMCsByCustomer);

// Visit schedule filtering routes
router.get('/visits-by-date', checkPermission('read'), getAMCsByVisitDate);
router.get('/visit-schedule-summary', checkPermission('read'), getVisitScheduleSummary);

// Export functionality
router.get('/export-excel', checkPermission('read'), exportAMCToExcel);

// Enhanced AMC functionality
router.post('/bulk-renew', checkPermission('write'), bulkRenewContracts);
router.delete('/bulk-delete', restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('delete'), bulkDeleteAMCContracts);

router.route('/:id')
  .get(checkPermission('read'), getAMC)
  .put(validate(updateAMCSchema), checkPermission('write'), updateAMC)
  .delete(restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('delete'), deleteAMCContract);

// AMC actions
router.post('/:id/schedule-visit', validate(scheduleVisitSchema), checkPermission('write'), scheduleVisit);
router.post('/:id/complete-visit', validate(completeVisitSchema), checkPermission('write'), completeVisit);
router.post('/:id/renew', validate(renewAMCSchema), checkPermission('write'), renewAMC);

// Enhanced AMC functionality
router.post('/:id/schedule-visit-enhanced', checkPermission('write'), scheduleEnhancedVisit);
router.post('/:id/schedule-visits-bulk', validate(scheduleVisitsBulkSchema), checkPermission('write'), scheduleVisitsBulk);
router.get('/:id/performance', checkPermission('read'), getAMCPerformance);
router.get('/:id/details', checkPermission('read'), getAMCDetails);
router.put('/:id/status', checkPermission('write'), updateAMCStatus);

// Delete and Archive functionality
router.put('/:id/archive', restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN), checkPermission('write'), archiveAMCContract);

// Regenerate visit schedule
router.put('/:id/regenerate-visits', checkPermission('write'), regenerateVisitSchedule);

// Reports
router.get('/reports/:type', checkPermission('read'), generateAMCReport);
router.get('/report/export-excel', checkPermission('read'), exportAMCReportToExcel);

export default router; 