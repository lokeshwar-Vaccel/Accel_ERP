import { Router } from 'express';
import { protect, restrictTo, checkModuleAccess, checkPermission } from '../middleware/auth';
import { validate } from '../utils/validation';
import { dashboardMetricsSchema } from '../schemas';
import { UserRole } from '../types';
import {
  getDashboardOverview,
  getRecentActivities,
  getMonthlyStats,
  getPerformanceMetrics
} from '../controllers/dashboardController';

const router = Router();

// All routes are protected
router.use(protect);

// Keep placeholder functions for features not yet implemented

const getServiceMetrics = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Service metrics endpoint',
    data: {
      totalTickets: 0,
      openTickets: 0,
      inProgressTickets: 0,
      completedTickets: 0,
      overdueTickets: 0,
      avgResolutionTime: 0,
      slaCompliance: 0,
      customerSatisfaction: 0
    }
  });
};

const getInventoryMetrics = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Inventory metrics endpoint',
    data: {
      totalProducts: 0,
      totalStockValue: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      pendingOrders: 0,
      stockTurnoverRate: 0
    }
  });
};

const getRevenueMetrics = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Revenue metrics endpoint',
    data: {
      totalRevenue: 0,
      monthlyRevenue: 0,
      serviceRevenue: 0,
      amcRevenue: 0,
      partsRevenue: 0,
      revenueGrowth: 0
    }
  });
};

const getCustomerMetrics = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Customer metrics endpoint',
    data: {
      totalCustomers: 0,
      newCustomers: 0,
      activeCustomers: 0,
      conversionRate: 0,
      customerRetention: 0,
      avgCustomerValue: 0
    }
  });
};

// getPerformanceMetrics and getRecentActivities now imported from controller

const getAlerts = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'System alerts endpoint',
    data: {
      criticalAlerts: 0,
      warningAlerts: 0,
      infoAlerts: 0,
      alerts: []
    }
  });
};

const getChartData = async (req: any, res: any) => {
  const { type } = req.params;
  res.json({
    success: true,
    message: `${type} chart data endpoint`,
    data: {
      labels: [],
      datasets: []
    }
  });
};

const saveCustomDashboard = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Save custom dashboard endpoint',
    data: { ...req.body, id: 'temp-dashboard-id' }
  });
};

const getCustomDashboards = async (req: any, res: any) => {
  res.json({
    success: true,
    message: 'Get custom dashboards endpoint',
    data: []
  });
};

// Dashboard overview (accessible to all authenticated users)
router.get('/overview', getDashboardOverview);

// Service metrics (requires service_management access)
router.get('/metrics/service', 
  checkModuleAccess('service_management'), 
  checkPermission('read'), 
  getServiceMetrics
);

// Inventory metrics (requires inventory_management access)
router.get('/metrics/inventory', 
  checkModuleAccess('inventory_management'), 
  checkPermission('read'), 
  getInventoryMetrics
);

// Revenue metrics (requires finance access)
router.get('/metrics/revenue', 
  checkModuleAccess('finance'), 
  checkPermission('read'), 
  getRevenueMetrics
);

// Customer metrics (requires lead_management access)
router.get('/metrics/customers', 
  checkModuleAccess('lead_management'), 
  checkPermission('read'), 
  getCustomerMetrics
);

// Performance metrics (requires user_management or reports_analytics access)
router.get('/metrics/performance', 
  checkPermission('read'), 
  getPerformanceMetrics
);

// Recent activities
router.get('/activities', getRecentActivities);

// Monthly statistics
router.get('/monthly-stats', getMonthlyStats);

// System alerts
router.get('/alerts', getAlerts);

// Chart data
router.get('/charts/:type', getChartData);

// Custom dashboards
router.route('/custom')
  .get(checkPermission('read'), getCustomDashboards)
  .post(validate(dashboardMetricsSchema), checkPermission('write'), saveCustomDashboard);

export default router; 