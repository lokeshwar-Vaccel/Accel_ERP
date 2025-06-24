import Joi from 'joi';

// Base report parameters
const baseReportFields = {
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  format: Joi.string().valid('json', 'csv', 'excel', 'pdf'),
  includeGraphs: Joi.boolean(),
  groupBy: Joi.string().valid('day', 'week', 'month', 'quarter', 'year'),
  timezone: Joi.string().default('UTC')
};

// Service ticket analytics schema
export const serviceTicketReportSchema = Joi.object({
  reportType: Joi.string().valid(
    'ticket_summary',
    'tat_analysis', // Turnaround Time Analysis
    'technician_performance',
    'sla_compliance',
    'customer_satisfaction',
    'parts_usage',
    'resolution_analysis'
  ).required(),
  dateFrom: baseReportFields.dateFrom.required(),
  dateTo: baseReportFields.dateTo.greater(Joi.ref('dateFrom')).required(),
  format: baseReportFields.format.default('json'),
  includeGraphs: baseReportFields.includeGraphs.default(false),
  groupBy: baseReportFields.groupBy.default('month'),
  filters: Joi.object({
    status: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ),
    priority: Joi.alternatives().try(
      Joi.string(),
      Joi.array().items(Joi.string())
    ),
    assignedTo: Joi.string().hex().length(24),
    customer: Joi.string().hex().length(24),
    product: Joi.string().hex().length(24),
    serviceType: Joi.string()
  }),
  metrics: Joi.array().items(
    Joi.string().valid(
      'total_tickets',
      'resolved_tickets',
      'average_resolution_time',
      'sla_met_percentage',
      'customer_rating',
      'first_call_resolution',
      'escalation_rate'
    )
  ).default(['total_tickets', 'resolved_tickets', 'average_resolution_time'])
});

// Inventory analytics schema
export const inventoryReportSchema = Joi.object({
  reportType: Joi.string().valid(
    'stock_summary',
    'stock_movement',
    'low_stock_alert',
    'valuation_report',
    'abc_analysis',
    'turnover_analysis',
    'dead_stock_analysis'
  ).required(),
  dateFrom: baseReportFields.dateFrom.required(),
  dateTo: baseReportFields.dateTo.greater(Joi.ref('dateFrom')).required(),
  format: baseReportFields.format.default('json'),
  includeGraphs: baseReportFields.includeGraphs.default(false),
  filters: Joi.object({
    location: Joi.string().hex().length(24),
    category: Joi.string(),
    product: Joi.string().hex().length(24),
    brand: Joi.string(),
    lowStockOnly: Joi.boolean(),
    outOfStockOnly: Joi.boolean()
  }),
  valuationMethod: Joi.string().valid('fifo', 'lifo', 'average', 'current').default('average'),
  includeReservedStock: Joi.boolean().default(true)
});

// Revenue analytics schema
export const revenueReportSchema = Joi.object({
  reportType: Joi.string().valid(
    'revenue_summary',
    'service_revenue',
    'amc_revenue',
    'parts_revenue',
    'monthly_trends',
    'customer_wise_revenue',
    'product_wise_revenue'
  ).required(),
  dateFrom: baseReportFields.dateFrom.required(),
  dateTo: baseReportFields.dateTo.greater(Joi.ref('dateFrom')).required(),
  format: baseReportFields.format.default('json'),
  includeGraphs: baseReportFields.includeGraphs.default(false),
  groupBy: baseReportFields.groupBy.default('month'),
  filters: Joi.object({
    customer: Joi.string().hex().length(24),
    serviceType: Joi.string(),
    revenueSource: Joi.string().valid('service', 'amc', 'parts', 'installation'),
    minAmount: Joi.number().min(0),
    maxAmount: Joi.number().min(Joi.ref('minAmount'))
  }),
  currency: Joi.string().length(3).default('INR'),
  includeTax: Joi.boolean().default(true)
});

// Customer analytics schema
export const customerReportSchema = Joi.object({
  reportType: Joi.string().valid(
    'customer_summary',
    'lead_conversion',
    'customer_acquisition',
    'customer_retention',
    'satisfaction_analysis',
    'contact_frequency',
    'geographic_distribution'
  ).required(),
  dateFrom: baseReportFields.dateFrom.required(),
  dateTo: baseReportFields.dateTo.greater(Joi.ref('dateFrom')).required(),
  format: baseReportFields.format.default('json'),
  includeGraphs: baseReportFields.includeGraphs.default(false),
  groupBy: baseReportFields.groupBy.default('month'),
  filters: Joi.object({
    customerType: Joi.string(),
    status: Joi.string(),
    assignedTo: Joi.string().hex().length(24),
    leadSource: Joi.string(),
    location: Joi.string()
  })
});

// Performance analytics schema
export const performanceReportSchema = Joi.object({
  reportType: Joi.string().valid(
    'technician_performance',
    'team_performance', 
    'productivity_analysis',
    'workload_distribution',
    'skill_analysis',
    'overtime_analysis'
  ).required(),
  dateFrom: baseReportFields.dateFrom.required(),
  dateTo: baseReportFields.dateTo.greater(Joi.ref('dateFrom')).required(),
  format: baseReportFields.format.default('json'),
  includeGraphs: baseReportFields.includeGraphs.default(false),
  groupBy: baseReportFields.groupBy.default('month'),
  filters: Joi.object({
    userId: Joi.string().hex().length(24),
    role: Joi.string(),
    department: Joi.string(),
    skillLevel: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert')
  }),
  metrics: Joi.array().items(
    Joi.string().valid(
      'tickets_completed',
      'average_resolution_time',
      'customer_rating',
      'rework_rate',
      'utilization_rate',
      'overtime_hours'
    )
  ).default(['tickets_completed', 'average_resolution_time', 'customer_rating'])
});

// Financial analytics schema
export const financialReportSchema = Joi.object({
  reportType: Joi.string().valid(
    'profit_loss',
    'cash_flow',
    'expense_analysis',
    'budget_variance',
    'cost_center_analysis',
    'payment_analysis'
  ).required(),
  dateFrom: baseReportFields.dateFrom.required(),
  dateTo: baseReportFields.dateTo.greater(Joi.ref('dateFrom')).required(),
  format: baseReportFields.format.default('json'),
  includeGraphs: baseReportFields.includeGraphs.default(false),
  groupBy: baseReportFields.groupBy.default('month'),
  filters: Joi.object({
    costCenter: Joi.string(),
    expenseCategory: Joi.string(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'overdue')
  }),
  includeProjections: Joi.boolean().default(false),
  baseCurrency: Joi.string().length(3).default('INR')
});

// Custom report schema
export const customReportSchema = Joi.object({
  reportName: Joi.string().max(100).required(),
  description: Joi.string().max(500),
  dataSource: Joi.string().valid(
    'service_tickets',
    'customers',
    'inventory',
    'amc_contracts',
    'purchase_orders',
    'users',
    'financial'
  ).required(),
  dateFrom: baseReportFields.dateFrom.required(),
  dateTo: baseReportFields.dateTo.greater(Joi.ref('dateFrom')).required(),
  format: baseReportFields.format.default('json'),
  fields: Joi.array().items(Joi.string()).min(1).required(),
  filters: Joi.object().unknown(true), // Dynamic filters based on data source
  groupBy: Joi.array().items(Joi.string()),
  sortBy: Joi.array().items(
    Joi.object({
      field: Joi.string().required(),
      order: Joi.string().valid('asc', 'desc').default('desc')
    })
  ),
  aggregations: Joi.array().items(
    Joi.object({
      field: Joi.string().required(),
      function: Joi.string().valid('sum', 'avg', 'count', 'min', 'max').required(),
      alias: Joi.string()
    })
  ),
  limit: Joi.number().integer().min(1).max(10000),
  includeCharts: Joi.boolean().default(false),
  chartConfig: Joi.when('includeCharts', {
    is: true,
    then: Joi.object({
      type: Joi.string().valid('bar', 'line', 'pie', 'area', 'scatter').required(),
      xAxis: Joi.string().required(),
      yAxis: Joi.string().required(),
      title: Joi.string().max(100)
    })
  })
});

// Dashboard metrics schema
export const dashboardMetricsSchema = Joi.object({
  widgets: Joi.array().items(
    Joi.object({
      type: Joi.string().valid(
        'kpi_card',
        'chart',
        'table',
        'gauge',
        'progress_bar',
        'list'
      ).required(),
      title: Joi.string().max(100).required(),
      dataSource: Joi.string().required(),
      config: Joi.object().unknown(true),
      refreshInterval: Joi.number().integer().min(30).max(3600).default(300), // seconds
      position: Joi.object({
        x: Joi.number().integer().min(0),
        y: Joi.number().integer().min(0),
        width: Joi.number().integer().min(1).max(12),
        height: Joi.number().integer().min(1).max(12)
      })
    })
  ).min(1).max(20).required(),
  layout: Joi.string().valid('grid', 'masonry', 'fixed').default('grid'),
  autoRefresh: Joi.boolean().default(true),
  refreshInterval: Joi.number().integer().min(60).max(3600).default(300)
});

// Report scheduling schema
export const scheduleReportSchema = Joi.object({
  reportType: Joi.string().required(),
  reportConfig: Joi.object().required(), // Configuration for the specific report type
  schedule: Joi.object({
    frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly').required(),
    time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(), // HH:MM format
    dayOfWeek: Joi.number().integer().min(0).max(6).when('frequency', {
      is: 'weekly',
      then: Joi.required()
    }),
    dayOfMonth: Joi.number().integer().min(1).max(31).when('frequency', {
      is: 'monthly',
      then: Joi.required()
    }),
    timezone: Joi.string().default('UTC')
  }).required(),
  recipients: Joi.array().items(
    Joi.object({
      email: Joi.string().email().required(),
      name: Joi.string().max(100)
    })
  ).min(1).required(),
  isActive: Joi.boolean().default(true),
  startDate: Joi.date().iso().default(() => new Date()),
  endDate: Joi.date().iso().greater(Joi.ref('startDate'))
});

// Export/Download schema
export const exportDataSchema = Joi.object({
  dataType: Joi.string().valid(
    'customers',
    'service_tickets',
    'inventory',
    'amc_contracts',
    'purchase_orders',
    'users'
  ).required(),
  format: Joi.string().valid('csv', 'excel', 'json').required(),
  filters: Joi.object().unknown(true),
  fields: Joi.array().items(Joi.string()), // Specific fields to export
  dateRange: Joi.object({
    from: Joi.date().iso(),
    to: Joi.date().iso().greater(Joi.ref('from'))
  }),
  includeRelatedData: Joi.boolean().default(false),
  compression: Joi.boolean().default(false)
}); 