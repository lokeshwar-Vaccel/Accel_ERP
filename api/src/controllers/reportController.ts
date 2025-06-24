import { Response, NextFunction } from 'express';
import { ServiceTicket } from '../models/ServiceTicket';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Stock } from '../models/Stock';
import { AMC } from '../models/AMC';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { User } from '../models/User';
import { AuthenticatedRequest, APIResponse, TicketStatus, AMCStatus, LeadStatus } from '../types';
import { AppError } from '../middleware/errorHandler';

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
    
    if (status) query.status = status;
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
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {});

      const priorityBreakdown = tickets.reduce((acc: any, ticket: any) => {
        acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
        return acc;
      }, {});

      // Calculate average resolution time for resolved tickets
      const resolvedTickets = tickets.filter((t: any) => t.status === TicketStatus.RESOLVED && t.completedDate);
      const avgResolutionTime = resolvedTickets.length > 0 
        ? resolvedTickets.reduce((acc: number, ticket: any) => {
            const resolutionTime = (new Date(ticket.completedDate).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
            return acc + resolutionTime;
          }, 0) / resolvedTickets.length
        : 0;

      // SLA compliance
      const overdueTickets = tickets.filter((t: any) => 
        t.slaDeadline && new Date() > new Date(t.slaDeadline) && 
        [TicketStatus.OPEN, TicketStatus.IN_PROGRESS].includes(t.status)
      ).length;

      metrics = {
        totalTickets,
        statusBreakdown,
        priorityBreakdown,
        avgResolutionTimeHours: Math.round(avgResolutionTime * 100) / 100,
        overdueTickets,
        slaComplianceRate: totalTickets > 0 ? Math.round(((totalTickets - overdueTickets) / totalTickets) * 100) : 100
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
    if (dateFrom) dateQuery.$gte = new Date(dateFrom);
    if (dateTo) dateQuery.$lte = new Date(dateTo);

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

    // Monthly breakdown for purchase orders
    const monthlyPurchases = await PurchaseOrder.aggregate([
      { $match: poQuery },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
          },
          spending: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const metrics = {
      totalAMCRevenue: amcRevenue[0]?.totalValue || 0,
      totalAMCContracts: amcRevenue[0]?.count || 0,
      totalPurchaseSpending: purchaseSpending[0]?.totalSpent || 0,
      totalPurchaseOrders: purchaseSpending[0]?.count || 0,
      netRevenue: (amcRevenue[0]?.totalValue || 0) - (purchaseSpending[0]?.totalSpent || 0)
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
        monthlyPurchases
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

      const resolvedTickets = userTickets.filter(t => t.status === TicketStatus.RESOLVED);
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
              $sum: { $cond: [{ $eq: ['$status', TicketStatus.RESOLVED] }, 1, 0] }
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