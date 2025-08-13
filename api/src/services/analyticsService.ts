import { ServiceTicket } from '../models/ServiceTicket';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Stock } from '../models/Stock';
import { AMC } from '../models/AMC';
import { Invoice } from '../models/Invoice';
import { Quotation } from '../models/Quotation';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { User } from '../models/User';
import { CustomerFeedback } from '../models/CustomerFeedback';
import { TicketStatus, AMCStatus, LeadStatus } from '../types';

export interface AnalyticsFilters {
  dateFrom?: Date;
  dateTo?: Date;
  customerType?: string;
  location?: string;
  assignedTo?: string;
  status?: string;
  priority?: string;
  category?: string;
}

export interface DashboardMetrics {
  core: {
    totalCustomers: number;
    totalTickets: number;
    totalAMCs: number;
    totalProducts: number;
    totalRevenue: number;
    totalInvoices: number;
    totalQuotations: number;
  };
  service: {
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    overdueTickets: number;
    avgResolutionTime: number;
    slaComplianceRate: number;
  };
  amc: {
    activeContracts: number;
    expiringContracts: number;
    totalContractValue: number;
    visitComplianceRate: number;
  };
  inventory: {
    lowStockItems: number;
    totalStockValue: number;
    stockMovement: {
      inward: number;
      outward: number;
    };
  };
  customer: {
    newLeads: number;
    qualifiedLeads: number;
    convertedLeads: number;
    conversionRate: number;
    avgSatisfaction: number;
    totalFeedbacks: number;
  };
}

export interface TicketAnalytics {
  totalTickets: number;
  closedTickets: number;
  avgTAT: number;
  slaCompliance: number;
  priorityBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
  tatDistribution: Array<{ range: string; count: number }>;
  monthlyTrend: Array<{ month: string; tickets: number; closed: number }>;
  engineerPerformance: Array<{
    name: string;
    ticketsCompleted: number;
    avgTAT: number;
    slaCompliance: number;
    customerRating: number;
  }>;
}

export interface InventoryAnalytics {
  totalValue: number;
  totalItems: number;
  lowStockItems: number;
  topMovingItems: Array<{ name: string; movement: number }>;
  categoryBreakdown: Record<string, number>;
  monthlyMovement: Array<{ month: string; inward: number; outward: number }>;
  valueDistribution: Array<{ category: string; value: number }>;
  reorderAlerts: Array<{ product: string; currentStock: number; minStock: number }>;
}

export interface RevenueAnalytics {
  totalRevenue: number;
  retailRevenue: number;
  telecomRevenue: number;
  monthlyGrowth: number;
  clientTypeBreakdown: Record<string, number>;
  monthlyRevenue: Array<{ month: string; retail: number; telecom: number }>;
  topClients: Array<{ name: string; revenue: number; type: string }>;
  revenueSources: {
    amc: number;
    service: number;
    parts: number;
    installation: number;
  };
}

export interface AMCAnalytics {
  totalContracts: number;
  activeContracts: number;
  expiringContracts: number;
  overdueContracts: number;
  contractValue: number;
  visitCompliance: number;
  monthlyRenewals: Array<{ month: string; renewals: number; new: number }>;
  statusBreakdown: Record<string, number>;
  customerRetention: number;
}

export interface LeadAnalytics {
  totalLeads: number;
  convertedLeads: number;
  conversionRate: number;
  leadSources: Record<string, number>;
  stageDistribution: Record<string, number>;
  monthlyConversion: Array<{ month: string; leads: number; converted: number }>;
  topPerformers: Array<{ name: string; conversions: number; rate: number }>;
  avgLeadTime: number;
}

export class AnalyticsService {
  /**
   * Generate comprehensive dashboard metrics
   */
  static async generateDashboardMetrics(filters: AnalyticsFilters): Promise<DashboardMetrics> {
    const dateQuery = this.buildDateQuery(filters);

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
      Invoice.aggregate([
        { $match: { ...dateQuery, status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
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
      ServiceTicket.countDocuments({ ...dateQuery, status: TicketStatus.IN_PROGRESS }),
      ServiceTicket.countDocuments({ ...dateQuery, status: TicketStatus.RESOLVED }),
      ServiceTicket.countDocuments({ 
        ...dateQuery, 
        slaDeadline: { $lt: new Date() },
        status: { $in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] }
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
                  1000 * 60 * 60 * 24
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

    return {
      core: {
        totalCustomers: totalCustomers || 0,
        totalTickets: totalTickets || 0,
        totalAMCs: totalAMCs || 0,
        totalProducts: totalProducts || 0,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalInvoices: totalInvoices || 0,
        totalQuotations: totalQuotations || 0
      },
      service: {
        openTickets: openTickets || 0,
        inProgressTickets: inProgressTickets || 0,
        resolvedTickets: resolvedTickets || 0,
        overdueTickets: overdueTickets || 0,
        avgResolutionTime: avgResolutionTime[0]?.avgTime || 0,
        slaComplianceRate: totalTickets > 0 ? 
          Math.round(((totalTickets - (overdueTickets || 0)) / totalTickets) * 100) : 100
      },
      amc: {
        activeContracts: activeAMCs || 0,
        expiringContracts: expiringAMCs || 0,
        totalContractValue: totalAMCValue[0]?.total || 0,
        visitComplianceRate: visitCompliance[0] ? 
          Math.round((visitCompliance[0].totalCompleted / visitCompliance[0].totalScheduled) * 100) : 0
      },
      inventory: {
        lowStockItems: lowStockItems[0]?.count || 0,
        totalStockValue: totalStockValue[0]?.totalValue || 0,
        stockMovement: {
          inward: stockMovement[0]?.totalInward || 0,
          outward: stockMovement[0]?.totalOutward || 0
        }
      },
      customer: {
        newLeads: newLeads || 0,
        qualifiedLeads: qualifiedLeads || 0,
        convertedLeads: convertedLeads || 0,
        conversionRate: (newLeads + qualifiedLeads) > 0 ? 
          Math.round((convertedLeads / (newLeads + qualifiedLeads)) * 100) : 0,
        avgSatisfaction: customerSatisfaction[0]?.avgRating || 0,
        totalFeedbacks: customerSatisfaction[0]?.totalFeedbacks || 0
      }
    };
  }

  /**
   * Generate ticket analytics
   */
  static async generateTicketAnalytics(filters: AnalyticsFilters): Promise<TicketAnalytics> {
    const dateQuery = this.buildDateQuery(filters);

    const tickets = await ServiceTicket.find(dateQuery)
      .populate('customer', 'name customerType')
      .populate('assignedTo', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    const totalTickets = tickets.length;
    const closedTickets = tickets.filter(t => t.status === TicketStatus.RESOLVED).length;

    // Calculate TAT distribution
    const resolvedTickets = tickets.filter(t => t.status === TicketStatus.RESOLVED && t.completedDate);
    const tatDistribution = [
      { range: '0-1 days', count: 0 },
      { range: '1-3 days', count: 0 },
      { range: '3-7 days', count: 0 },
      { range: '7+ days', count: 0 }
    ];

    let totalTAT = 0;
    resolvedTickets.forEach(ticket => {
      const tat = (new Date(ticket.completedDate!).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      totalTAT += tat;
      
      if (tat <= 1) tatDistribution[0].count++;
      else if (tat <= 3) tatDistribution[1].count++;
      else if (tat <= 7) tatDistribution[2].count++;
      else tatDistribution[3].count++;
    });

    const avgTAT = resolvedTickets.length > 0 ? totalTAT / resolvedTickets.length : 0;

    // Calculate SLA compliance
    const overdueTickets = tickets.filter(t => 
      t.slaDeadline && new Date() > new Date(t.slaDeadline) && 
      [TicketStatus.OPEN, TicketStatus.IN_PROGRESS].includes(t.status)
    ).length;

    const slaCompliance = totalTickets > 0 ? 
      Math.round(((totalTickets - overdueTickets) / totalTickets) * 100) : 100;

    // Priority and status breakdown
    const priorityBreakdown = tickets.reduce((acc: any, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {});

    const statusBreakdown = tickets.reduce((acc: any, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});

    // Engineer performance
    const engineerPerformance = await ServiceTicket.aggregate([
      { $match: { ...dateQuery, assignedTo: { $exists: true } } },
      {
        $group: {
          _id: '$assignedTo',
          ticketsCompleted: { $sum: 1 },
          avgTAT: {
            $avg: {
              $cond: [
                { $and: [{ $eq: ['$status', TicketStatus.RESOLVED] }, { $ne: ['$completedDate', null] }] },
                { $divide: [{ $subtract: ['$completedDate', '$createdAt'] }, 1000 * 60 * 60 * 24] },
                null
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
          name: {
            $concat: [
              { $arrayElemAt: ['$user.firstName', 0] },
              ' ',
              { $arrayElemAt: ['$user.lastName', 0] }
            ]
          },
          ticketsCompleted: 1,
          avgTAT: { $round: ['$avgTAT', 1] },
          slaCompliance: 95, // Placeholder - would need more complex calculation
          customerRating: 4.5 // Placeholder - would need feedback data
        }
      }
    ]);

    // Monthly trend
    const monthlyTrend = await ServiceTicket.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          tickets: { $sum: 1 },
          closed: {
            $sum: { $cond: [{ $eq: ['$status', TicketStatus.RESOLVED] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    return {
      totalTickets,
      closedTickets,
      avgTAT: Math.round(avgTAT * 100) / 100,
      slaCompliance,
      priorityBreakdown,
      statusBreakdown,
      tatDistribution,
      monthlyTrend: monthlyTrend.map(item => ({
        month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
        tickets: item.tickets,
        closed: item.closed
      })),
      engineerPerformance
    };
  }

  /**
   * Generate inventory analytics
   */
  static async generateInventoryAnalytics(filters: AnalyticsFilters): Promise<InventoryAnalytics> {
    const dateQuery = this.buildDateQuery(filters);

    const stockData = await Stock.find(dateQuery)
      .populate('product', 'name category brand price minStockLevel')
      .populate('location', 'name type');

    const totalValue = stockData.reduce((acc, stock) => {
      const price = (stock as any).product?.price || 0;
      return acc + ((stock as any).availableQuantity * price);
    }, 0);

    const lowStockItems = stockData.filter(stock => 
      (stock as any).availableQuantity <= ((stock as any).product?.minStockLevel || 5)
    ).length;

    // Category breakdown
    const categoryBreakdown = stockData.reduce((acc: any, stock) => {
      const category = (stock as any).product?.category || 'uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Value distribution
    const valueDistribution = stockData.reduce((acc: any, stock) => {
      const category = (stock as any).product?.category || 'uncategorized';
      const value = (stock as any).availableQuantity * ((stock as any).product?.price || 0);
      
      const existing = acc.find((item: any) => item.category === category);
      if (existing) {
        existing.value += value;
      } else {
        acc.push({ category, value });
      }
      return acc;
    }, []);

    // Top moving items (placeholder - would need movement data)
    const topMovingItems = [
      { name: 'Oil Filter', movement: 145 },
      { name: 'Air Filter', movement: 132 },
      { name: 'Fuel Filter', movement: 98 }
    ];

    // Monthly movement (placeholder)
    const monthlyMovement = [
      { month: 'Jan', inward: 234, outward: 189 },
      { month: 'Feb', inward: 312, outward: 267 },
      { month: 'Mar', inward: 298, outward: 234 }
    ];

    // Reorder alerts
    const reorderAlerts = stockData
      .filter(stock => (stock as any).availableQuantity <= ((stock as any).product?.minStockLevel || 5))
      .map(stock => ({
        product: (stock as any).product?.name || 'Unknown',
        currentStock: (stock as any).availableQuantity,
        minStock: (stock as any).product?.minStockLevel || 5
      }))
      .slice(0, 10);

    return {
      totalValue: Math.round(totalValue * 100) / 100,
      totalItems: stockData.length,
      lowStockItems,
      topMovingItems,
      categoryBreakdown,
      monthlyMovement,
      valueDistribution,
      reorderAlerts
    };
  }

  /**
   * Generate revenue analytics
   */
  static async generateRevenueAnalytics(filters: AnalyticsFilters): Promise<RevenueAnalytics> {
    const dateQuery = this.buildDateQuery(filters);

    // AMC revenue
    const amcRevenue = await AMC.aggregate([
      { $match: { ...dateQuery, status: AMCStatus.ACTIVE } },
      {
        $group: {
          _id: null,
          total: { $sum: '$contractValue' }
        }
      }
    ]);

    // Invoice revenue
    const invoiceRevenue = await Invoice.aggregate([
      { $match: { ...dateQuery, status: 'paid' } },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRevenue = (amcRevenue[0]?.total || 0) + (invoiceRevenue[0]?.total || 0);

    // Revenue by customer type
    const revenueByType = await Invoice.aggregate([
      { $match: { ...dateQuery, status: 'paid' } },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      {
        $group: {
          _id: { $arrayElemAt: ['$customerInfo.customerType', 0] },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const retailRevenue = revenueByType.find(r => r._id === 'retail')?.revenue || 0;
    const telecomRevenue = revenueByType.find(r => r._id === 'telecom')?.revenue || 0;

    // Monthly revenue trend
    const monthlyRevenue = await Invoice.aggregate([
      { $match: { ...dateQuery, status: 'paid' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top clients
    const topClients = await Invoice.aggregate([
      { $match: { ...dateQuery, status: 'paid' } },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      {
        $group: {
          _id: '$customer',
          revenue: { $sum: '$totalAmount' },
          customerType: { $arrayElemAt: ['$customerInfo.customerType', 0] },
          customerName: { $arrayElemAt: ['$customerInfo.name', 0] }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    return {
      totalRevenue,
      retailRevenue,
      telecomRevenue,
      monthlyGrowth: 12.5, // Placeholder - would need historical data
      clientTypeBreakdown: {
        retail: retailRevenue / totalRevenue * 100,
        telecom: telecomRevenue / totalRevenue * 100
      },
      monthlyRevenue: monthlyRevenue.map(item => ({
        month: `${item._id.year}-${item._id.month.toString().padStart(2, '0')}`,
        retail: item.revenue * 0.6, // Placeholder
        telecom: item.revenue * 0.4 // Placeholder
      })),
      topClients: topClients.map(client => ({
        name: client.customerName || 'Unknown',
        revenue: client.revenue,
        type: client.customerType || 'retail'
      })),
      revenueSources: {
        amc: amcRevenue[0]?.total || 0,
        service: invoiceRevenue[0]?.total * 0.7 || 0,
        parts: invoiceRevenue[0]?.total * 0.2 || 0,
        installation: invoiceRevenue[0]?.total * 0.1 || 0
      }
    };
  }

  /**
   * Build date query from filters
   */
  private static buildDateQuery(filters: AnalyticsFilters): any {
    const dateQuery: any = {};
    if (filters.dateFrom || filters.dateTo) {
      dateQuery.createdAt = {};
      if (filters.dateFrom) dateQuery.createdAt.$gte = filters.dateFrom;
      if (filters.dateTo) dateQuery.createdAt.$lte = filters.dateTo;
    }
    return dateQuery;
  }
} 