import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { UserRole } from '../types';
import {
  createDigitalServiceReport,
  getDigitalServiceReport,
  getDigitalServiceReportByTicket,
  getDigitalServiceReports,
  updateDigitalServiceReport,
  approveDigitalServiceReport,
  rejectDigitalServiceReport,
  completeDigitalServiceReport,
  deleteDigitalServiceReport,
  getDigitalServiceReportStats
} from '../controllers/digitalServiceReportController';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for service management
router.use(checkModuleAccess('service_management'));

// Create digital service report
router.post('/', checkPermission('write'), createDigitalServiceReport);

// Get digital service report by ID
router.get('/:id', checkPermission('read'), getDigitalServiceReport);

// Get digital service report by ticket ID
router.get('/ticket/:ticketId', checkPermission('read'), getDigitalServiceReportByTicket);

// Get all digital service reports
router.get('/', checkPermission('read'), getDigitalServiceReports);

// Update digital service report
router.put('/:id', checkPermission('write'), updateDigitalServiceReport);

// Approve digital service report
router.put('/:id/approve', checkPermission('write'), approveDigitalServiceReport);

// Reject digital service report
router.put('/:id/reject', checkPermission('write'), rejectDigitalServiceReport);

// Complete digital service report
router.put('/:id/complete', checkPermission('write'), completeDigitalServiceReport);

// Delete digital service report
router.delete('/:id', checkPermission('write'), deleteDigitalServiceReport);

// Get digital service report statistics
router.get('/stats/overview', checkPermission('read'), getDigitalServiceReportStats);

export default router; 