import { Response, NextFunction } from 'express';
import { ServiceTicket } from '../models/ServiceTicket';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Stock } from '../models/Stock';
import { AMC } from '../models/AMC';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { User } from '../models/User';
import { Invoice } from '../models/Invoice';
import { Quotation } from '../models/Quotation';
import { DigitalServiceReport } from '../models/DigitalServiceReport';
import { CustomerFeedback } from '../models/CustomerFeedback';
import { AuthenticatedRequest, APIResponse, TicketStatus, AMCStatus, LeadStatus } from '../types';
import { AppError } from '../middleware/errorHandler';

// Helper function to calculate total revenue from invoices
const calculateTotalRevenue = async (dateQuery: any = {}) => {
  const revenueResult = await Invoice.aggregate([
    { $match: dateQuery },
    { $group: { _id: null, total: { $sum: '$totalAmount' } } }
  ]);
  return revenueResult[0]?.total || 0;
};

// Helper function to calculate revenue by different criteria
const calculateRevenueBreakdown = async (dateQuery: any = {}) => {
  const revenueBreakdown = await Invoice.aggregate([
    { $match: dateQuery },
    {
      $group: {
        _id: {
          invoiceType: '$invoiceType',
          paymentStatus: '$paymentStatus',
          status: '$status'
        },
        totalRevenue: { $sum: '$totalAmount' },
        count: { $sum: 1 }
      }
    },
    { $sort: { totalRevenue: -1 } }
  ]);
  return revenueBreakdown;
};

// @desc    Generate comprehensive dashboard analytics
// @route   POST /api/v1/reports/dashboard-analytics
// @access  Private
export const generateDashboardAnalytics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      dateFrom, 
      dateTo, 
      includeTrends = true,
      includePredictions = false 
    } = req.body;

    // Build date query
    const dateQuery: any = {};
    if (dateFrom || dateTo) {
      dateQuery.createdAt = {};
      if (dateFrom) dateQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.createdAt.$lte = new Date(dateTo);
    }

    // Core metrics
    const [
      totalCustomers,
      totalTickets,
      totalAMCs,
      totalProducts,
      totalRevenue,
      totalInvoices,
      totalQuotations
    ] = await Promise.all([
      Customer.countDocuments(dateQuery),
      ServiceTicket.countDocuments(dateQuery),
      AMC.countDocuments(dateQuery),
      Product.countDocuments({ ...dateQuery, isActive: true }),
      // Use helper function to calculate total revenue
      calculateTotalRevenue(dateQuery),
      Invoice.countDocuments(dateQuery),
      Quotation.countDocuments(dateQuery)
    ]);

    // Service metrics
    const [
      openTickets,
      inProgressTickets,
      resolvedTickets,
      overdueTickets,
      avgResolutionTime
    ] = await Promise.all([
      ServiceTicket.countDocuments({ ...dateQuery, status: TicketStatus.OPEN }),
      ServiceTicket.countDocuments({ ...dateQuery, ServiceRequestStatus: TicketStatus.RESOLVED }),
      ServiceTicket.countDocuments({ ...dateQuery, status: TicketStatus.RESOLVED }),
      ServiceTicket.countDocuments({ 
        ...dateQuery, 
        slaDeadline: { $lt: new Date() },
        ServiceRequestStatus: { $in: [TicketStatus.OPEN] }
      }),
      ServiceTicket.aggregate([
        { $match: { ...dateQuery, status: TicketStatus.RESOLVED, completedDate: { $exists: true } } },
        {
          $group: {
            _id: null,
            avgTime: {
              $avg: {
                $divide: [
                  { $subtract: ['$completedDate', '$createdAt'] },
                  1000 * 60 * 60 * 24 // Convert to days
                ]
              }
            }
          }
        }
      ])
    ]);

    // AMC metrics
    const [
      activeAMCs,
      expiringAMCs,
      totalAMCValue,
      visitCompliance
    ] = await Promise.all([
      AMC.countDocuments({ ...dateQuery, status: AMCStatus.ACTIVE }),
      AMC.countDocuments({
        ...dateQuery,
        endDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        status: AMCStatus.ACTIVE
      }),
      AMC.aggregate([
        { $match: { ...dateQuery, status: AMCStatus.ACTIVE } },
        { $group: { _id: null, total: { $sum: '$contractValue' } } }
      ]),
      AMC.aggregate([
        { $match: { ...dateQuery, status: AMCStatus.ACTIVE } },
        {
          $group: {
            _id: null,
            totalScheduled: { $sum: '$scheduledVisits' },
            totalCompleted: { $sum: '$completedVisits' }
          }
        }
      ])
    ]);

    // Inventory metrics
    const [
      lowStockItems,
      totalStockValue,
      stockMovement
    ] = await Promise.all([
      Stock.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        {
          $match: {
            $expr: {
              $lte: ['$availableQuantity', { $arrayElemAt: ['$productInfo.minStockLevel', 0] }]
            }
          }
        },
        { $count: 'count' }
      ]),
      Stock.aggregate([
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: {
                $multiply: [
                  '$availableQuantity',
                  { $arrayElemAt: ['$productInfo.price', 0] }
                ]
              }
            }
          }
        }
      ]),
      Stock.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: null,
            totalInward: { $sum: '$inwardQuantity' },
            totalOutward: { $sum: '$outwardQuantity' }
          }
        }
      ])
    ]);

    // Customer metrics
    const [
      newLeads,
      qualifiedLeads,
      convertedLeads,
      customerSatisfaction
    ] = await Promise.all([
      Customer.countDocuments({ ...dateQuery, status: LeadStatus.NEW }),
      Customer.countDocuments({ ...dateQuery, status: LeadStatus.QUALIFIED }),
      Customer.countDocuments({ ...dateQuery, status: LeadStatus.CONVERTED }),
      CustomerFeedback.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalFeedbacks: { $sum: 1 }
          }
        }
      ])
    ]);

    // Trends data if requested
    let trends = {};
    if (includeTrends) {
      const monthlyData = await ServiceTicket.aggregate([
        { $match: dateQuery },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            tickets: { $sum: 1 },
            resolved: {
              $sum: { $cond: [{ $eq: ['$status', TicketStatus.RESOLVED] }, 1, 0] }
            }
          }
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } }
      ]);

      trends = { monthlyData };
    }

    const response: APIResponse = {
      success: true,
      message: 'Dashboard analytics generated successfully',
      data: {
        reportType: 'dashboard_analytics',
        generatedAt: new Date(),
        filters: req.body,
        
        // Core metrics
        core: {
          totalCustomers: totalCustomers || 0,
          totalTickets: totalTickets || 0,
          totalAMCs: totalAMCs || 0,
          totalProducts: totalProducts || 0,
          totalRevenue: totalRevenue || 0,
          totalInvoices: totalInvoices || 0,
          totalQuotations: totalQuotations || 0
        },

        // Service metrics
        service: {
          openTickets: openTickets || 0,
          inProgressTickets: inProgressTickets || 0,
          resolvedTickets: resolvedTickets || 0,
          overdueTickets: overdueTickets || 0,
          avgResolutionTime: avgResolutionTime[0]?.avgTime || 0,
          slaComplianceRate: totalTickets > 0 ? 
            Math.round(((totalTickets - (overdueTickets || 0)) / totalTickets) * 100) : 100
        },

        // AMC metrics
        amc: {
          activeContracts: activeAMCs || 0,
          expiringContracts: expiringAMCs || 0,
          totalContractValue: totalAMCValue[0]?.total || 0,
          visitComplianceRate: visitCompliance[0] ? 
            Math.round((visitCompliance[0].totalCompleted / visitCompliance[0].totalScheduled) * 100) : 0
        },

        // Inventory metrics
        inventory: {
          lowStockItems: lowStockItems[0]?.count || 0,
          totalStockValue: totalStockValue[0]?.totalValue || 0,
          stockMovement: {
            inward: stockMovement[0]?.totalInward || 0,
            outward: stockMovement[0]?.totalOutward || 0
          }
        },

        // Customer metrics
        customer: {
          newLeads: newLeads || 0,
          qualifiedLeads: qualifiedLeads || 0,
          convertedLeads: convertedLeads || 0,
          conversionRate: (newLeads + qualifiedLeads) > 0 ? 
            Math.round((convertedLeads / (newLeads + qualifiedLeads)) * 100) : 0,
          avgSatisfaction: customerSatisfaction[0]?.avgRating || 0,
          totalFeedbacks: customerSatisfaction[0]?.totalFeedbacks || 0
        },

        trends
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate service tickets report
// @route   POST /api/v1/reports/service-tickets
// @access  Private
export const generateServiceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      dateFrom, 
      dateTo, 
      status, 
      priority, 
      assignedTo, 
      customer,
      groupBy = 'status',
      includeMetrics = true 
    } = req.body;

    // Build query
    const query: any = {};
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    if (status) query.ServiceRequestStatus = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (customer) query.customer = customer;

    // Get tickets with populated data
    const tickets = await ServiceTicket.find(query)
      .populate('customer', 'name customerType')
      .populate('product', 'name category')
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    // Generate metrics if requested
    let metrics = {};
    if (includeMetrics) {
      const totalTickets = tickets.length;
      const statusBreakdown = tickets.reduce((acc: any, ticket: any) => {
        acc[ticket.ServiceRequestStatus] = (acc[ticket.ServiceRequestStatus] || 0) + 1;
        return acc;
      }, {});

      const priorityBreakdown = tickets.reduce((acc: any, ticket: any) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {});

      // Calculate average resolution time for resolved tickets
      const resolvedTickets = tickets.filter((t: any) => t.ServiceRequestStatus === TicketStatus.RESOLVED && t.completedDate);
      const avgResolutionTime = resolvedTickets.length > 0 
        ? resolvedTickets.reduce((acc: number, ticket: any) => {
            const resolutionTime = (new Date(ticket.completedDate).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
            return acc + resolutionTime;
          }, 0) / resolvedTickets.length
        : 0;

      // SLA compliance
      const overdueTickets = tickets.filter((t: any) => 
        t.slaDeadline && new Date() > new Date(t.slaDeadline) && 
        [TicketStatus.OPEN].includes(t.ServiceRequestStatus)
      ).length;

      // TAT distribution
      const tatDistribution = [
        { range: '0-1 days', count: 0 },
        { range: '1-3 days', count: 0 },
        { range: '3-7 days', count: 0 },
        { range: '7+ days', count: 0 }
      ];

      resolvedTickets.forEach((ticket: any) => {
        const tat = (new Date(ticket.completedDate).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (tat <= 1) tatDistribution[0].count++;
        else if (tat <= 3) tatDistribution[1].count++;
        else if (tat <= 7) tatDistribution[2].count++;
        else tatDistribution[3].count++;
      });

      metrics = {
        totalTickets,
        statusBreakdown,
        priorityBreakdown,
        avgResolutionTimeHours: Math.round(avgResolutionTime * 100) / 100,
        overdueTickets,
        slaComplianceRate: totalTickets > 0 ? Math.round(((totalTickets - overdueTickets) / totalTickets) * 100) : 100,
        tatDistribution
      };
    }

    // Group data if requested
    let groupedData = {};
    if (groupBy) {
      groupedData = tickets.reduce((acc: any, ticket: any) => {
        const key = ticket[groupBy] || 'unassigned';
        if (!acc[key]) acc[key] = [];
        acc[key].push(ticket);
        return acc;
      }, {});
    }

    const response: APIResponse = {
      success: true,
      message: 'Service tickets report generated successfully',
      data: {
        reportType: 'service_tickets',
        generatedAt: new Date(),
        filters: req.body,
        tickets,
        metrics,
        groupedData: Object.keys(groupedData).length > 0 ? groupedData : undefined
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate inventory report
// @route   POST /api/v1/reports/inventory
// @access  Private
export const generateInventoryReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      category, 
      location, 
      lowStock = false, 
      includeStockValue = true,
      includeMovements = false 
    } = req.body;

    // Build query for products
    const productQuery: any = { isActive: true };
    if (category) productQuery.category = category;

    const products = await Product.find(productQuery);

    // Get stock data
    const stockQuery: any = {};
    if (location) stockQuery.location = location;

    const stockData = await Stock.find(stockQuery)
      .populate('product', 'name category brand price minStockLevel')
      .populate('location', 'name type');

    // Filter for low stock if requested
    let filteredStock = stockData;
    if (lowStock) {
      filteredStock = stockData.filter((stock: any) => 
        stock.availableQuantity <= (stock.product?.minStockLevel || 5)
      );
    }

    // Calculate metrics
    const metrics = {
      totalProducts: products.length,
      totalStockItems: stockData.length,
      lowStockItems: stockData.filter((stock: any) => 
        stock.availableQuantity <= (stock.product?.minStockLevel || 5)
      ).length,
      outOfStockItems: stockData.filter((stock: any) => stock.availableQuantity === 0).length
    };

    // Calculate total stock value if requested
    if (includeStockValue) {
      const totalValue = stockData.reduce((acc: number, stock: any) => {
        const price = stock.product?.price || 0;
        return acc + (stock.availableQuantity * price);
      }, 0);
      
      (metrics as any).totalStockValue = Math.round(totalValue * 100) / 100;
    }

    // Group by category
    const categoryBreakdown = stockData.reduce((acc: any, stock: any) => {
      const category = stock.product?.category || 'uncategorized';
      if (!acc[category]) {
        acc[category] = { items: 0, totalQuantity: 0, totalValue: 0 };
      }
      acc[category].items += 1;
      acc[category].totalQuantity += stock.availableQuantity;
      acc[category].totalValue += stock.availableQuantity * (stock.product?.price || 0);
      return acc;
    }, {});

    const response: APIResponse = {
      success: true,
      message: 'Inventory report generated successfully',
      data: {
        reportType: 'inventory',
        generatedAt: new Date(),
        filters: req.body,
        stockData: filteredStock,
        metrics,
        categoryBreakdown
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate revenue report
// @route   POST /api/v1/reports/revenue
// @access  Private
export const generateRevenueReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      dateFrom, 
      dateTo, 
      groupBy = 'month',
      includeProjections = false 
    } = req.body;

    // Build date query
    const dateQuery: any = {};
    if (dateFrom || dateTo) {
      dateQuery.createdAt = {};
      if (dateFrom) dateQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.createdAt.$lte = new Date(dateTo);
    }

    // Get AMC revenue
    const amcQuery: any = { status: AMCStatus.ACTIVE };
    if (Object.keys(dateQuery).length > 0) {
      amcQuery.startDate = dateQuery;
    }

    const amcRevenue = await AMC.aggregate([
      { $match: amcQuery },
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$contractValue' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get purchase order spending
    const poQuery: any = { status: { $ne: 'cancelled' } };
    if (Object.keys(dateQuery).length > 0) {
      poQuery.orderDate = dateQuery;
    }

    const purchaseSpending = await PurchaseOrder.aggregate([
      { $match: poQuery },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get invoice revenue - Updated to sum totalAmount from all invoices
    const invoiceRevenue = await calculateTotalRevenue(dateQuery);

    // Get paid invoice revenue separately for comparison
    const paidInvoiceRevenue = await Invoice.aggregate([
      { $match: { ...dateQuery, status: 'paid' } },
      {
        $group: {
          _id: null,
          totalPaidRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Monthly breakdown for AMCs
    const monthlyAMCRevenue = await AMC.aggregate([
      { $match: amcQuery },
      {
        $group: {
          _id: {
            year: { $year: '$startDate' },
            month: { $month: '$startDate' }
          },
          revenue: { $sum: '$contractValue' },
          contracts: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Monthly breakdown for invoices - Updated to use totalAmount
    const monthlyInvoiceRevenue = await Invoice.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          invoices: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get revenue breakdown by invoice type
    const revenueByType = await Invoice.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$invoiceType',
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    // Get revenue breakdown by payment status
    const revenueByPaymentStatus = await Invoice.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: '$paymentStatus',
          totalRevenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    const metrics = {
      totalAMCRevenue: amcRevenue[0]?.totalValue || 0,
      totalAMCContracts: amcRevenue[0]?.count || 0,
      totalInvoiceRevenue: invoiceRevenue || 0,
      totalInvoices: await Invoice.countDocuments(dateQuery),
      totalPaidRevenue: paidInvoiceRevenue[0]?.totalPaidRevenue || 0,
      totalPaidInvoices: paidInvoiceRevenue[0]?.count || 0,
      totalPurchaseSpending: purchaseSpending[0]?.totalSpent || 0,
      totalPurchaseOrders: purchaseSpending[0]?.count || 0,
      netRevenue: (amcRevenue[0]?.totalValue || 0) + (invoiceRevenue || 0) - (purchaseSpending[0]?.totalSpent || 0),
      outstandingRevenue: (invoiceRevenue || 0) - (paidInvoiceRevenue[0]?.totalPaidRevenue || 0)
    };

    const response: APIResponse = {
      success: true,
      message: 'Revenue report generated successfully',
      data: {
        reportType: 'revenue',
        generatedAt: new Date(),
        filters: req.body,
        metrics,
        monthlyAMCRevenue,
        monthlyInvoiceRevenue,
        revenueByType,
        revenueByPaymentStatus
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate customer report
// @route   POST /api/v1/reports/customers
// @access  Private
export const generateCustomerReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      customerType, 
      status, 
      dateFrom, 
      dateTo,
      includeActivity = true 
    } = req.body;

    // Build query
    const query: any = {};
    if (customerType) query.customerType = customerType;
    if (status) query.status = status;
    
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });

    // Generate metrics
    const totalCustomers = customers.length;
    const statusBreakdown = customers.reduce((acc: any, customer: any) => {
      acc[customer.status] = (acc[customer.status] || 0) + 1;
      return acc;
    }, {});

    const typeBreakdown = customers.reduce((acc: any, customer: any) => {
      acc[customer.customerType] = (acc[customer.customerType] || 0) + 1;
      return acc;
    }, {});

    // Conversion funnel
    const conversionMetrics = {
      newLeads: customers.filter(c => c.status === LeadStatus.NEW).length,
      qualifiedLeads: customers.filter(c => c.status === LeadStatus.QUALIFIED).length,
      contactedLeads: customers.filter(c => c.status === LeadStatus.CONTACTED).length,
      convertedLeads: customers.filter(c => c.status === LeadStatus.CONVERTED).length,
      lostLeads: customers.filter(c => c.status === LeadStatus.LOST).length
    };

    const conversionRate = totalCustomers > 0 
      ? Math.round((conversionMetrics.convertedLeads / totalCustomers) * 100) 
      : 0;

    // Customer activity if requested
    let activityData = {};
    if (includeActivity) {
      // Get recent tickets and AMCs for these customers
      const customerIds = customers.map(c => c._id);
      
      const recentTickets = await ServiceTicket.countDocuments({
        customer: { $in: customerIds },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      });

      const activeAMCs = await AMC.countDocuments({
        customer: { $in: customerIds },
        status: AMCStatus.ACTIVE
      });

      activityData = {
        recentTickets,
        activeAMCs
      };
    }

    const response: APIResponse = {
      success: true,
      message: 'Customer report generated successfully',
      data: {
        reportType: 'customers',
        generatedAt: new Date(),
        filters: req.body,
        customers,
        metrics: {
          totalCustomers,
          statusBreakdown,
          typeBreakdown,
          conversionMetrics,
          conversionRate,
          ...activityData
        }
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate performance report
// @route   POST /api/v1/reports/performance
// @access  Private
export const generatePerformanceReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      dateFrom, 
      dateTo, 
      userId,
      includeTeamMetrics = true 
    } = req.body;

    // Build date query
    const dateQuery: any = {};
    if (dateFrom || dateTo) {
      dateQuery.createdAt = {};
      if (dateFrom) dateQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) dateQuery.createdAt.$lte = new Date(dateTo);
    }

    // Individual performance metrics
    let individualMetrics = {};
    if (userId) {
      const userTickets = await ServiceTicket.find({
        ...dateQuery,
        assignedTo: userId
      });

      const resolvedTickets = userTickets.filter(t => t.ServiceRequestStatus === TicketStatus.RESOLVED);
      const avgResolutionTime = resolvedTickets.length > 0
        ? resolvedTickets.reduce((acc, ticket) => {
            const time = (new Date(ticket.completedDate!).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
            return acc + time;
          }, 0) / resolvedTickets.length
        : 0;

      individualMetrics = {
        userId,
        totalTicketsAssigned: userTickets.length,
        ticketsResolved: resolvedTickets.length,
        avgResolutionTimeHours: Math.round(avgResolutionTime * 100) / 100,
        resolutionRate: userTickets.length > 0 ? Math.round((resolvedTickets.length / userTickets.length) * 100) : 0
      };
    }

    // Team performance metrics
    let teamMetrics = {};
    if (includeTeamMetrics) {
      const teamPerformance = await ServiceTicket.aggregate([
        { $match: { ...dateQuery, assignedTo: { $exists: true } } },
        {
          $group: {
            _id: '$assignedTo',
            totalTickets: { $sum: 1 },
            resolvedTickets: {
              $sum: { $cond: [{ $eq: ['$ServiceRequestStatus', TicketStatus.RESOLVED] }, 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $project: {
            totalTickets: 1,
            resolvedTickets: 1,
            resolutionRate: {
              $multiply: [
                { $divide: ['$resolvedTickets', '$totalTickets'] },
                100
              ]
            },
            userName: {
              $concat: [
                { $arrayElemAt: ['$user.firstName', 0] },
                ' ',
                { $arrayElemAt: ['$user.lastName', 0] }
              ]
            }
          }
        },
        { $sort: { resolutionRate: -1 } }
      ]);

      teamMetrics = { teamPerformance };
    }

    const response: APIResponse = {
      success: true,
      message: 'Performance report generated successfully',
      data: {
        reportType: 'performance',
        generatedAt: new Date(),
        filters: req.body,
        individualMetrics,
        ...teamMetrics
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Generate custom report
// @route   POST /api/v1/reports/custom
// @access  Private
export const generateCustomReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { 
      reportName,
      collections = [],
      filters = {},
      fields = [],
      groupBy,
      sortBy = 'createdAt',
      limit = 1000
    } = req.body;

    const results: any = {};

    // Process each requested collection
    for (const collection of collections) {
      let query = filters[collection] || {};
      
      switch (collection) {
        case 'customers':
          results.customers = await Customer.find(query)
            .select(fields.length > 0 ? fields.join(' ') : '')
            .sort({ [sortBy]: -1 })
            .limit(limit);
          break;

        case 'tickets':
          results.tickets = await ServiceTicket.find(query)
            .populate('customer', 'name customerType')
            .populate('assignedTo', 'firstName lastName')
            .select(fields.length > 0 ? fields.join(' ') : '')
            .sort({ [sortBy]: -1 })
            .limit(limit);
          break;

        case 'products':
          results.products = await Product.find(query)
            .select(fields.length > 0 ? fields.join(' ') : '')
            .sort({ [sortBy]: -1 })
            .limit(limit);
          break;

        case 'amc':
          results.amc = await AMC.find(query)
            .populate('customer', 'name customerType')
            .select(fields.length > 0 ? fields.join(' ') : '')
            .sort({ [sortBy]: -1 })
            .limit(limit);
          break;

        case 'purchase_orders':
          results.purchase_orders = await PurchaseOrder.find(query)
            .select(fields.length > 0 ? fields.join(' ') : '')
            .sort({ [sortBy]: -1 })
            .limit(limit);
          break;
      }
    }

    const response: APIResponse = {
      success: true,
      message: 'Custom report generated successfully',
      data: {
        reportType: 'custom',
        reportName,
        generatedAt: new Date(),
        filters: req.body,
        results
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Schedule a report
// @route   POST /api/v1/reports/schedule
// @access  Private
export const scheduleReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // For now, we'll just store the schedule configuration
    // In a real implementation, you'd use a job scheduler like node-cron
    const scheduleConfig = {
      ...req.body,
      id: `schedule-${Date.now()}`,
      createdBy: req.user!.id,
      createdAt: new Date(),
      status: 'active'
    };

    const response: APIResponse = {
      success: true,
      message: 'Report scheduled successfully',
      data: scheduleConfig
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get scheduled reports
// @route   GET /api/v1/reports/schedule
// @access  Private
export const getScheduledReports = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Placeholder - in real implementation, fetch from database
    const scheduledReports = [
      {
        id: 'schedule-1',
        reportType: 'service_tickets',
        frequency: 'weekly',
        nextRun: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active'
      }
    ];

    const response: APIResponse = {
      success: true,
      message: 'Scheduled reports retrieved successfully',
      data: scheduledReports
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Export data
// @route   POST /api/v1/reports/export
// @access  Private
export const exportData = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { reportType, format = 'json', data } = req.body;

    // Generate export file URL (in real implementation, save to file storage)
    const exportUrl = `exports/${reportType}-${Date.now()}.${format}`;

    const response: APIResponse = {
      success: true,
      message: 'Data export initiated successfully',
      data: {
        exportUrl,
        format,
        recordCount: Array.isArray(data) ? data.length : 0,
        generatedAt: new Date()
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get report history
// @route   GET /api/v1/reports/history
// @access  Private
export const getReportHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Placeholder - in real implementation, fetch from database
    const reportHistory = [
      {
        id: 'report-1',
        type: 'service_tickets',
        generatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        generatedBy: req.user!.id,
        recordCount: 156,
        status: 'completed'
      }
    ];

    const response: APIResponse = {
      success: true,
      message: 'Report history retrieved successfully',
      data: reportHistory
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 