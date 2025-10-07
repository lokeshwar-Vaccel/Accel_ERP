import { Router } from 'express';
import { protect, restrictTo, checkPermission } from '../middleware/auth';
import { UserRole } from '../types';
import {
  getDashboardStats,
  getSalesPerformanceReport,
  getProfitLossReport,
  getCustomerAnalysisReport,
  getEnquiryConversionReport,
  getExecutivePerformanceReport
} from '../controllers/dgReportsController';

const router = Router();

// All routes are protected
router.use(protect);

// @route   GET /api/v1/dg-reports/dashboard
router.get('/dashboard', getDashboardStats);

// @route   GET /api/v1/dg-reports/sales-performance
router.get('/sales-performance', getSalesPerformanceReport);

// @route   GET /api/v1/dg-reports/profit-loss
router.get('/profit-loss', 
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  getProfitLossReport
);

// @route   GET /api/v1/dg-reports/customer-analysis
router.get('/customer-analysis', getCustomerAnalysisReport);

// @route   GET /api/v1/dg-reports/enquiry-conversion
router.get('/enquiry-conversion', getEnquiryConversionReport);

// @route   GET /api/v1/dg-reports/executive-performance
router.get('/executive-performance',
  restrictTo(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  getExecutivePerformanceReport
);

export default router; 