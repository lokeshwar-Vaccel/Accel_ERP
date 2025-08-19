import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Stock } from '../models/Stock';
import { ServiceTicket } from '../models/ServiceTicket';
import { AMC } from '../models/AMC';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { AuthenticatedRequest, APIResponse, TicketStatus, AMCStatus, LeadStatus } from '../types';
import { AppError } from '../middleware/errorHandler';

// @desc    Get dashboard overview statistics
// @route   GET /api/v1/dashboard/overview
// @access  Private
export const getDashboardOverview = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get basic counts
    const totalUsers = await User.countDocuments();
    const totalCustomers = await Customer.countDocuments();
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalTickets = await ServiceTicket.countDocuments();
    const totalAMCs = await AMC.countDocuments();
    const totalPOs = await PurchaseOrder.countDocuments();

    // Get critical metrics
    const openTickets = await ServiceTicket.countDocuments({ status: TicketStatus.OPEN });
    const inProgressTickets = await ServiceTicket.countDocuments({ status: TicketStatus.IN_PROGRESS });
    const overdueTickets = await ServiceTicket.countDocuments({ 
      slaDeadline: { $lt: new Date() },
      status: { $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] }
    });

    // Get new leads count
    const newLeads = await Customer.countDocuments({ status: LeadStatus.NEW });
    const qualifiedLeads = await Customer.countDocuments({ status: LeadStatus.QUALIFIED });

    // Get AMC metrics
    const activeAMCs = await AMC.countDocuments({ status: AMCStatus.ACTIVE });
    const expiringAMCs = await AMC.countDocuments({
      endDate: { $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      status: AMCStatus.ACTIVE
    });

    // Get low stock items using the proper method that compares with minStockLevel
    const lowStockItemsArray = await (Stock as any).getLowStockItems();
    const lowStockItems = lowStockItemsArray.length;

    // Get purchase order metrics
    const pendingPOs = await PurchaseOrder.countDocuments({ status: 'draft' });
    const confirmedPOs = await PurchaseOrder.countDocuments({ status: 'confirmed' });

    // Calculate revenue metrics (sample calculation)
    const totalAMCValue = await AMC.aggregate([
      { $match: { status: AMCStatus.ACTIVE } },
      { $group: { _id: null, total: { $sum: '$contractValue' } } }
    ]);

    const totalPOValue = await PurchaseOrder.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Get recent activity counts
    const recentTickets = await ServiceTicket.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const recentCustomers = await Customer.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    const response: APIResponse = {
      success: true,
      message: 'Dashboard overview retrieved successfully',
      data: {
        // Total counts
        totalUsers,
        totalCustomers,
        totalProducts,
        totalTickets,
        totalAMCs,
        totalPOs,

        // Critical metrics
        openTickets,
        inProgressTickets,
        overdueTickets,
        pendingTickets: openTickets + inProgressTickets, // Combined pending tickets for frontend
        newLeads,
        qualifiedLeads,
        activeAMCs,
        expiringAMCs,
        lowStockItems,
        pendingPOs,
        confirmedPOs,

        // Financial metrics
        totalAMCValue: totalAMCValue[0]?.total || 0,
        totalPOValue: totalPOValue[0]?.total || 0,
        monthlyRevenue: totalAMCValue[0]?.total || 0, // Use AMC value as monthly revenue for now

        // Recent activity
        recentTickets,
        recentCustomers,

        // Calculated metrics
        ticketResolutionRate: totalTickets > 0 ? 
          Math.round(((totalTickets - openTickets - inProgressTickets) / totalTickets) * 100) : 0,
        amcRenewalRate: totalAMCs > 0 ? 
          Math.round((activeAMCs / totalAMCs) * 100) : 0
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent activities
// @route   GET /api/v1/dashboard/activities
// @access  Private
export const getRecentActivities = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { limit = 10 } = req.query;

    // Get recent service tickets
    const recentTickets = await ServiceTicket.find()
      .populate('customer', 'name')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(Number(limit) / 2)
      .select('ticketNumber description status priority createdAt');

    // Get recent customers
    const recentCustomers = await Customer.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit) / 2)
      .select('name customerType status createdAt');

    // Format activities
    const activities = [
      ...recentTickets.map(ticket => ({
        type: 'ticket',
        id: ticket._id,
        title: `New Service Ticket: ${ticket.ticketNumber}`,
        description: ticket.complaintDescription,
        status: ticket.status,
        date: (ticket as any).createdAt,
        customer: (ticket.customer as any)?.name,
        assignedTo: (ticket.assignedTo as any) ? 
          `${(ticket.assignedTo as any).firstName} ${(ticket.assignedTo as any).lastName}` : null
      })),
      ...recentCustomers.map(customer => ({
        type: 'customer',
        id: customer._id,
        title: `New ${customer.customerType} Customer`,
        description: customer.name,
        status: customer.status,
        date: (customer as any).createdAt
      }))
    ];

    // Sort by date
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const response: APIResponse = {
      success: true,
      message: 'Recent activities retrieved successfully',
      data: { activities: activities.slice(0, Number(limit)) }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get monthly statistics
// @route   GET /api/v1/dashboard/monthly-stats
// @access  Private
export const getMonthlyStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { months = 6 } = req.query;

    // Get ticket creation trends
    const ticketTrends = await ServiceTicket.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          resolved: {
            $sum: {
              $cond: [{ $eq: ['$status', TicketStatus.RESOLVED] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: Number(months) }
    ]);

    // Get customer acquisition trends
    const customerTrends = await Customer.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newCustomers: { $sum: 1 },
          retailCustomers: {
            $sum: {
              $cond: [{ $eq: ['$customerType', 'retail'] }, 1, 0]
            }
          },
          telecomCustomers: {
            $sum: {
              $cond: [{ $eq: ['$customerType', 'telecom'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: Number(months) }
    ]);

    // Get AMC trends
    const amcTrends = await AMC.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newContracts: { $sum: 1 },
          totalValue: { $sum: '$contractValue' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: Number(months) }
    ]);

    const response: APIResponse = {
      success: true,
      message: 'Monthly statistics retrieved successfully',
      data: {
        ticketTrends,
        customerTrends,
        amcTrends
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

// @desc    Get performance metrics
// @route   GET /api/v1/dashboard/performance
// @access  Private
export const getPerformanceMetrics = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Average ticket resolution time
    const avgResolutionTime = await ServiceTicket.aggregate([
      {
        $match: {
          status: TicketStatus.RESOLVED,
          completedDate: { $exists: true }
        }
      },
      {
        $addFields: {
          resolutionHours: {
            $divide: [
              { $subtract: ['$completedDate', '$createdAt'] },
              1000 * 60 * 60
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: '$resolutionHours' },
          minHours: { $min: '$resolutionHours' },
          maxHours: { $max: '$resolutionHours' }
        }
      }
    ]);

    // SLA compliance rate
    const slaMetrics = await ServiceTicket.aggregate([
      {
        $match: {
          slaDeadline: { $exists: true },
          status: { $in: [TicketStatus.RESOLVED, TicketStatus.CLOSED] }
        }
      },
      {
        $addFields: {
          slaBreached: {
            $cond: [
              { $gt: ['$completedDate', '$slaDeadline'] },
              1,
              0
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          breachedTickets: { $sum: '$slaBreached' }
        }
      }
    ]);

    // Team performance by assigned user
    const teamPerformance = await ServiceTicket.aggregate([
      {
        $match: {
          assignedTo: { $exists: true },
          status: TicketStatus.RESOLVED
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          ticketsResolved: { $sum: 1 },
          avgResolutionTime: {
            $avg: {
              $divide: [
                { $subtract: ['$completedDate', '$createdAt'] },
                1000 * 60 * 60
              ]
            }
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
          ticketsResolved: 1,
          avgResolutionTime: 1,
          userName: { $concat: [{ $arrayElemAt: ['$user.firstName', 0] }, ' ', { $arrayElemAt: ['$user.lastName', 0] }] }
        }
      },
      { $sort: { ticketsResolved: -1 } },
      { $limit: 10 }
    ]);

    const slaComplianceRate = slaMetrics[0] ? 
      Math.round(((slaMetrics[0].totalTickets - slaMetrics[0].breachedTickets) / slaMetrics[0].totalTickets) * 100) : 0;

    const response: APIResponse = {
      success: true,
      message: 'Performance metrics retrieved successfully',
      data: {
        avgResolutionTime: avgResolutionTime[0] || { avgHours: 0, minHours: 0, maxHours: 0 },
        slaComplianceRate,
        teamPerformance
      }
    };

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
}; 