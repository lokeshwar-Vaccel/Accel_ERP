import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { 
  ticketAnalyticsSchema,
  inventoryReportSchema,
  revenueReportSchema,
  customerReportSchema,
  performanceReportSchema,
  customReportSchema,
  scheduledReportSchema,
  reportExportSchema,
  dashboardMetricsSchema
} from '../schemas';
import { UserRole } from '../types';
import {
  generateDashboardAnalytics,
  generateServiceReport,
  generateInventoryReport,
  generateRevenueReport,
  generateCustomerReport,
  generatePerformanceReport,
  generateCustomReport,
  scheduleReport,
  getScheduledReports,
  exportData,
  getReportHistory
} from '../controllers/reportController';

const router = Router();

// All routes are protected
router.use(protect);

// Check module access for reports and analytics
router.use(checkModuleAccess('reports_analytics'));

// Dashboard analytics
router.post('/dashboard-analytics', validate(dashboardMetricsSchema), checkPermission('read'), generateDashboardAnalytics);

// Service reports
router.post('/service-tickets', validate(ticketAnalyticsSchema), checkPermission('read'), generateServiceReport);

// Inventory reports
router.post('/inventory', validate(inventoryReportSchema), checkPermission('read'), generateInventoryReport);

// Revenue reports
router.post('/revenue', validate(revenueReportSchema), checkPermission('read'), generateRevenueReport);

// Customer reports
router.post('/customers', validate(customerReportSchema), checkPermission('read'), generateCustomerReport);

// Performance reports
router.post('/performance', validate(performanceReportSchema), checkPermission('read'), generatePerformanceReport);

// Custom reports
router.post('/custom', validate(customReportSchema), checkPermission('read'), generateCustomReport);

// Report scheduling
router.route('/schedule')
  .get(checkPermission('read'), getScheduledReports)
  .post(validate(scheduledReportSchema), checkPermission('write'), scheduleReport);

// Data export
router.post('/export', validate(reportExportSchema), checkPermission('read'), exportData);

// Report history
router.get('/history', checkPermission('read'), getReportHistory);

export default router; 