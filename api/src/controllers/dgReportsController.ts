import { Response, NextFunction } from 'express';
import { DGEnquiry } from '../models/DGEnquiry';
import { DGPurchaseOrder } from '../models/DGPurchaseOrder';
import { DGInvoice } from '../models/DGInvoice';
import { DGPayment } from '../models/DGPayment';
import { OEMOrder } from '../models/OEMOrder';
import { Customer } from '../models/Customer';
import { AuthenticatedRequest } from '../types';
import { AppError } from '../middleware/errorHandler';

// @desc    Get DG Sales Dashboard Stats
// @route   GET /api/v1/dg-reports/dashboard
// @access  Private
export const getDashboardStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Enquiries Stats
    const totalEnquiries = await DGEnquiry.countDocuments(dateFilter);
    const convertedEnquiries = await DGEnquiry.countDocuments({
      ...dateFilter,
      customer: { $exists: true }
    });

    // Sales Stats
    const totalPOs = await DGPurchaseOrder.countDocuments(dateFilter);
    const completedPOs = await DGPurchaseOrder.countDocuments({
      ...dateFilter,
      status: 'completed'
    });

    // Revenue Stats
    const revenueData = await DGInvoice.aggregate([
      { $match: { ...dateFilter, paymentStatus: { $in: ['paid', 'partial'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$paidAmount' },
          totalInvoices: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Customer Stats
    const totalCustomers = await Customer.countDocuments({
      ...dateFilter,
      isDGSalesCustomer: true
    });

    // Payment Stats
    const paymentData = await DGPayment.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      }
    ]);

    // Conversion Rate
    const conversionRate = totalEnquiries > 0 ? (convertedEnquiries / totalEnquiries) * 100 : 0;

    const stats = {
      enquiries: {
        total: totalEnquiries,
        converted: convertedEnquiries,
        conversionRate: Math.round(conversionRate * 100) / 100
      },
      sales: {
        totalPOs,
        completedPOs,
        completionRate: totalPOs > 0 ? Math.round((completedPOs / totalPOs) * 100) : 0
      },
      revenue: {
        total: revenueData[0]?.totalRevenue || 0,
        invoiceCount: revenueData[0]?.totalInvoices || 0,
        averageOrderValue: revenueData[0]?.averageOrderValue || 0
      },
      customers: {
        total: totalCustomers
      },
      payments: {
        total: paymentData[0]?.totalPayments || 0,
        count: paymentData[0]?.paymentCount || 0
      }
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Sales Performance Report
// @route   GET /api/v1/dg-reports/sales-performance
// @access  Private
export const getSalesPerformanceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
    const matchStage: any = {};
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    let groupByFormat: string;
    switch (groupBy) {
      case 'day':
        groupByFormat = '%Y-%m-%d';
        break;
      case 'week':
        groupByFormat = '%Y-%U';
        break;
      case 'year':
        groupByFormat = '%Y';
        break;
      default:
        groupByFormat = '%Y-%m';
    }

    const salesData = await DGPurchaseOrder.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$createdAt' } },
          totalOrders: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const revenueData = await DGInvoice.aggregate([
      { $match: { ...matchStage, paymentStatus: { $in: ['paid', 'partial'] } } },
      {
        $group: {
          _id: { $dateToString: { format: groupByFormat, date: '$createdAt' } },
          totalRevenue: { $sum: '$paidAmount' },
          totalInvoices: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        sales: salesData,
        revenue: revenueData,
        period: groupBy
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Profit & Loss Report
// @route   GET /api/v1/dg-reports/profit-loss
// @access  Private
export const getProfitLossReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Revenue from customer payments
    const revenueData = await DGPayment.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' }
        }
      }
    ]);

    // Cost from OEM orders
    const costData = await OEMOrder.aggregate([
      { $match: { ...dateFilter, paymentStatus: { $in: ['advance_paid', 'partial', 'completed'] } } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Outstanding amounts
    const outstandingRevenue = await DGInvoice.aggregate([
      { $match: { ...dateFilter, paymentStatus: { $in: ['pending', 'partial'] } } },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$balanceAmount' }
        }
      }
    ]);

    const outstandingCosts = await OEMOrder.aggregate([
      { $match: { ...dateFilter, paymentStatus: { $in: ['pending', 'advance_paid', 'partial'] } } },
      {
        $group: {
          _id: null,
          totalOutstanding: { $sum: '$balanceAmount' }
        }
      }
    ]);

    const revenue = revenueData[0]?.totalRevenue || 0;
    const cost = costData[0]?.totalCost || 0;
    const grossProfit = revenue - cost;
    const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const profitLoss = {
      revenue: {
        total: revenue,
        outstanding: outstandingRevenue[0]?.totalOutstanding || 0
      },
      costs: {
        total: cost,
        outstanding: outstandingCosts[0]?.totalOutstanding || 0
      },
      profit: {
        gross: grossProfit,
        margin: Math.round(profitMargin * 100) / 100
      }
    };

    res.json({
      success: true,
      data: profitLoss
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Customer Analysis Report
// @route   GET /api/v1/dg-reports/customer-analysis
// @access  Private
export const getCustomerAnalysisReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Top customers by revenue
    const topCustomers = await DGPayment.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$amount' },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      { $unwind: '$customerInfo' },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $project: {
          customerName: '$customerInfo.name',
          customerEmail: '$customerInfo.email',
          customerPhone: '$customerInfo.phone',
          totalSpent: 1,
          paymentCount: 1
        }
      }
    ]);

    // Customer acquisition over time
    const customerAcquisition = await Customer.aggregate([
      { $match: { ...dateFilter, isDGSalesCustomer: true } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          newCustomers: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Customer status distribution
    const customerStatus = await Customer.aggregate([
      { $match: { isDGSalesCustomer: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        topCustomers,
        acquisition: customerAcquisition,
        statusDistribution: customerStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Enquiry Conversion Report
// @route   GET /api/v1/dg-reports/enquiry-conversion
// @access  Private
export const getEnquiryConversionReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Enquiry conversion funnel
    const totalEnquiries = await DGEnquiry.countDocuments(dateFilter);
    const customersGenerated = await DGEnquiry.countDocuments({
      ...dateFilter,
      customer: { $exists: true }
    });
    const quotationsCreated = await DGEnquiry.countDocuments({
      ...dateFilter,
      customer: { $exists: true }
    }); // Simplified - would need to join with quotations
    
    const purchaseOrders = await DGPurchaseOrder.countDocuments(dateFilter);
    const completedSales = await DGPurchaseOrder.countDocuments({
      ...dateFilter,
      status: 'completed'
    });

    // Conversion by source
    const conversionBySource = await DGEnquiry.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$source',
          totalEnquiries: { $sum: 1 },
          convertedToCustomer: {
            $sum: { $cond: [{ $ne: ['$customer', null] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          source: '$_id',
          totalEnquiries: 1,
          convertedToCustomer: 1,
          conversionRate: {
            $multiply: [
              { $divide: ['$convertedToCustomer', '$totalEnquiries'] },
              100
            ]
          }
        }
      },
      { $sort: { conversionRate: -1 } }
    ]);

    // Geographic analysis
    const geographicAnalysis = await DGEnquiry.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            state: '$state',
            district: '$district'
          },
          enquiryCount: { $sum: 1 },
          convertedCount: {
            $sum: { $cond: [{ $ne: ['$customer', null] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          state: '$_id.state',
          district: '$_id.district',
          enquiryCount: 1,
          convertedCount: 1,
          conversionRate: {
            $multiply: [
              { $divide: ['$convertedCount', '$enquiryCount'] },
              100
            ]
          }
        }
      },
      { $sort: { enquiryCount: -1 } },
      { $limit: 20 }
    ]);

    const conversionFunnel = {
      enquiries: totalEnquiries,
      customers: customersGenerated,
      quotations: quotationsCreated,
      purchaseOrders: purchaseOrders,
      completedSales: completedSales,
      rates: {
        enquiryToCustomer: totalEnquiries > 0 ? (customersGenerated / totalEnquiries) * 100 : 0,
        customerToPO: customersGenerated > 0 ? (purchaseOrders / customersGenerated) * 100 : 0,
        poToCompletion: purchaseOrders > 0 ? (completedSales / purchaseOrders) * 100 : 0,
        overallConversion: totalEnquiries > 0 ? (completedSales / totalEnquiries) * 100 : 0
      }
    };

    res.json({
      success: true,
      data: {
        funnel: conversionFunnel,
        bySource: conversionBySource,
        geographic: geographicAnalysis
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Executive Performance Report
// @route   GET /api/v1/dg-reports/executive-performance
// @access  Private
export const getExecutivePerformanceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    // Performance by assigned employee
    const executivePerformance = await DGEnquiry.aggregate([
      { $match: { ...dateFilter, assignedEmployeeName: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: {
            employeeName: '$assignedEmployeeName',
            employeeCode: '$assignedEmployeeCode'
          },
          totalEnquiries: { $sum: 1 },
          convertedEnquiries: {
            $sum: { $cond: [{ $ne: ['$customer', null] }, 1, 0] }
          },
          avgFollowUps: { $avg: '$numberOfFollowUps' }
        }
      },
      {
        $project: {
          employeeName: '$_id.employeeName',
          employeeCode: '$_id.employeeCode',
          totalEnquiries: 1,
          convertedEnquiries: 1,
          conversionRate: {
            $multiply: [
              { $divide: ['$convertedEnquiries', '$totalEnquiries'] },
              100
            ]
          },
          avgFollowUps: { $round: ['$avgFollowUps', 2] }
        }
      },
      { $sort: { conversionRate: -1 } }
    ]);

    res.json({
      success: true,
      data: executivePerformance
    });
  } catch (error) {
    next(error);
  }
}; 