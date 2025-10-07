import Joi from 'joi';

// TypeScript interfaces for validation results
export interface DashboardMetricsInput {
  dateRange?: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
  dateFrom?: string;
  dateTo?: string;
  metrics?: ('tickets' | 'revenue' | 'customers' | 'inventory' | 'amc' | 'performance')[];
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  filters?: {
    location?: string;
    assignedTo?: string;
    status?: string;
    priority?: string;
    category?: string;
  };
}

export interface TicketAnalyticsInput {
  reportType: 'summary' | 'tat_analysis' | 'sla_compliance' | 'technician_performance' | 'customer_satisfaction';
  dateFrom: string;
  dateTo: string;
  groupBy?: 'day' | 'week' | 'month';
  filters?: {
    assignedTo?: string;
    customer?: string;
    product?: string;
    status?: string;
    priority?: string;
    serviceType?: string;
  };
  format?: 'json' | 'csv' | 'excel' | 'pdf';
  includeGraphs?: boolean;
}

export interface InventoryReportInput {
  reportType: 'stock_levels' | 'movement_analysis' | 'valuation' | 'reorder_alerts' | 'deadstock_analysis';
  dateFrom?: string;
  dateTo?: string;
  filters?: {
    location?: string;
    category?: string;
    product?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
  };
  valuationMethod?: 'fifo' | 'lifo' | 'average' | 'current';
  format?: 'json' | 'csv' | 'excel' | 'pdf';
  includeGraphs?: boolean;
}

export interface RevenueReportInput {
  reportType: 'sales_summary' | 'amc_revenue' | 'service_revenue' | 'monthly_trends' | 'customer_wise' | 'product_wise';
  dateFrom: string;
  dateTo: string;
  groupBy?: 'day' | 'week' | 'month' | 'quarter';
  filters?: {
    customer?: string;
    product?: string;
    location?: string;
    paymentStatus?: 'paid' | 'pending' | 'overdue';
    revenueType?: 'service' | 'amc' | 'parts' | 'installation';
  };
  format?: 'json' | 'csv' | 'excel' | 'pdf';
  includeGraphs?: boolean;
  currency?: string;
}

export interface CustomerReportInput {
  reportType: 'customer_summary' | 'lead_analysis' | 'satisfaction_analysis' | 'retention_analysis' | 'communication_history';
  dateFrom?: string;
  dateTo?: string;
  filters?: {
    customerType?: 'retail' | 'telecom';
    status?: string;
    assignedTo?: string;
    leadSource?: string;
    region?: string;
  };
  format?: 'json' | 'csv' | 'excel' | 'pdf';
  includeGraphs?: boolean;
}

export interface PerformanceReportInput {
  reportType: 'technician_performance' | 'team_productivity' | 'response_time' | 'resolution_rate' | 'efficiency_metrics';
  dateFrom: string;
  dateTo: string;
  filters?: {
    assignedTo?: string;
    team?: string;
    location?: string;
    serviceType?: string;
  };
  metrics?: ('response_time' | 'resolution_time' | 'first_call_resolution' | 'customer_rating' | 'tickets_completed')[];
  format?: 'json' | 'csv' | 'excel' | 'pdf';
  includeGraphs?: boolean;
}

export interface CustomReportInput {
  name: string;
  description?: string;
  reportType: 'tabular' | 'summary' | 'analytical';
  dataSource: 'tickets' | 'customers' | 'products' | 'stock' | 'amc' | 'purchase_orders' | 'users';
  fields: {
    fieldName: string;
    alias?: string;
    aggregation?: 'sum' | 'count' | 'avg' | 'min' | 'max' | 'group';
    sortOrder?: 'asc' | 'desc';
  }[];
  filters?: {
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
    value: any;
  }[];
  dateRange?: {
    dateField: string;
    dateFrom?: string;
    dateTo?: string;
  };
  groupBy?: string[];
  limit?: number;
  format?: 'json' | 'csv' | 'excel' | 'pdf';
  isPublic?: boolean;
  scheduledReports?: {
    enabled?: boolean;
    frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    recipients?: string[];
  };
}

export interface ScheduledReportInput {
  reportId: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  schedule: {
    time?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    monthOfYear?: number;
  };
  recipients: string[];
  format: 'json' | 'csv' | 'excel' | 'pdf';
  parameters?: Record<string, any>;
  isActive?: boolean;
  nextRunDate?: string;
}

export interface ReportExportInput {
  reportId?: string;
  reportData?: any;
  format: 'csv' | 'excel' | 'pdf';
  filename?: string;
  options?: {
    includeHeaders?: boolean;
    dateFormat?: string;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'A4' | 'A3' | 'letter' | 'legal';
    includeGraphs?: boolean;
    watermark?: string;
  };
}

export interface ReportTemplateInput {
  name: string;
  description?: string;
  category: 'tickets' | 'inventory' | 'revenue' | 'customers' | 'performance' | 'custom';
  template: {
    structure: {
      title: string;
      sections: {
        type: 'table' | 'chart' | 'summary' | 'text';
        title?: string;
        query?: string;
        chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'area';
        columns?: string[];
      }[];
    };
    styling?: {
      headerColor?: string;
      fontFamily?: string;
      fontSize?: number;
      logoUrl?: string;
    };
  };
  parameters?: {
    name: string;
    type: 'string' | 'number' | 'date' | 'boolean' | 'select';
    required?: boolean;
    defaultValue?: any;
    options?: any[];
  }[];
  isActive?: boolean;
}

export interface ReportSharingInput {
  reportId: string;
  shareWith: string[];
  permissions: ('view' | 'edit' | 'delete' | 'share')[];
  expiresAt?: string;
  password?: string;
  publicAccess?: boolean;
  emailNotification?: boolean;
}

export interface BulkReportOperationInput {
  reportIds: string[];
  operation: 'delete' | 'archive' | 'share' | 'export' | 'schedule';
  parameters?: {
    shareWith?: string[];
    exportFormat?: 'csv' | 'excel' | 'pdf';
    scheduleFrequency?: 'daily' | 'weekly' | 'monthly';
  };
}

// Base report fields
const baseReportFields = {
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso(),
  format: Joi.string().valid('json', 'csv', 'excel', 'pdf'),
  includeGraphs: Joi.boolean(),
  groupBy: Joi.string().valid('day', 'week', 'month', 'quarter', 'year')
};

// Dashboard metrics schema
export const dashboardMetricsSchema = Joi.object<DashboardMetricsInput>({
  dateRange: Joi.string().valid('today', 'week', 'month', 'quarter', 'year', 'custom').default('month'),
  dateFrom: baseReportFields.dateFrom.when('dateRange', {
    is: 'custom',
    then: Joi.required()
  }),
  dateTo: baseReportFields.dateTo.when('dateRange', {
    is: 'custom',
    then: Joi.date().iso().required().greater(Joi.ref('dateFrom'))
  }),
  metrics: Joi.array().items(
    Joi.string().valid('tickets', 'revenue', 'customers', 'inventory', 'amc', 'performance')
  ).default(['tickets', 'revenue', 'customers']),
  groupBy: baseReportFields.groupBy.default('day'),
  filters: Joi.object({
    location: Joi.string().hex().length(24),
    assignedTo: Joi.string().hex().length(24),
    status: Joi.string(),
    priority: Joi.string(),
    category: Joi.string()
  })
});

// Ticket analytics schema
export const ticketAnalyticsSchema = Joi.object<TicketAnalyticsInput>({
  reportType: Joi.string().valid(
    'summary',
    'tat_analysis',
    'sla_compliance',
    'technician_performance',
    'customer_satisfaction'
  ).required(),
  dateFrom: baseReportFields.dateFrom.required(),
  dateTo: baseReportFields.dateTo.greater(Joi.ref('dateFrom')).required(),
  groupBy: baseReportFields.groupBy,
  filters: Joi.object({
    assignedTo: Joi.string().hex().length(24),
    customer: Joi.string().hex().length(24),
    product: Joi.string().hex().length(24),
    status: Joi.string(),
    priority: Joi.string(),
    serviceType: Joi.string()
  }),
  format: baseReportFields.format.default('json'),
  includeGraphs: baseReportFields.includeGraphs.default(false)
});

// Inventory report schema
export const inventoryReportSchema = Joi.object<InventoryReportInput>({
  reportType: Joi.string().valid(
    'stock_levels',
    'movement_analysis',
    'valuation',
    'reorder_alerts',
    'deadstock_analysis'
  ).required(),
  dateFrom: baseReportFields.dateFrom,
  dateTo: baseReportFields.dateTo,
  filters: Joi.object({
    location: Joi.string().hex().length(24),
    category: Joi.string(),
    product: Joi.string().hex().length(24),
    lowStock: Joi.boolean(),
    outOfStock: Joi.boolean()
  }),
  valuationMethod: Joi.string().valid('fifo', 'lifo', 'average', 'current').default('average'),
  format: baseReportFields.format.default('json'),
  includeGraphs: baseReportFields.includeGraphs.default(false)
});

// Revenue report schema
export const revenueReportSchema = Joi.object<RevenueReportInput>({
  reportType: Joi.string().valid(
    'sales_summary',
    'amc_revenue',
    'service_revenue',
    'monthly_trends',
    'customer_wise',
    'product_wise'
  ).required(),
  dateFrom: baseReportFields.dateFrom.required(),
  dateTo: baseReportFields.dateTo.greater(Joi.ref('dateFrom')).required(),
  groupBy: baseReportFields.groupBy,
  filters: Joi.object({
    customer: Joi.string().hex().length(24),
    product: Joi.string().hex().length(24),
    location: Joi.string().hex().length(24),
    paymentStatus: Joi.string().valid('paid', 'pending', 'overdue'),
    revenueType: Joi.string().valid('service', 'amc', 'parts', 'installation')
  }),
  format: baseReportFields.format.default('json'),
  includeGraphs: baseReportFields.includeGraphs.default(false),
  currency: Joi.string().length(3).default('INR') // ISO currency code
});

// Customer report schema
export const customerReportSchema = Joi.object<CustomerReportInput>({
  reportType: Joi.string().valid(
    'customer_summary',
    'lead_analysis',
    'satisfaction_analysis',
    'retention_analysis',
    'communication_history'
  ).required(),
  dateFrom: baseReportFields.dateFrom,
  dateTo: baseReportFields.dateTo,
  filters: Joi.object({
    customerType: Joi.string().valid('retail', 'telecom'),
    status: Joi.string(),
    assignedTo: Joi.string().hex().length(24),
    leadSource: Joi.string(),
    region: Joi.string()
  }),
  format: baseReportFields.format.default('json'),
  includeGraphs: baseReportFields.includeGraphs.default(false)
});

// Performance report schema
export const performanceReportSchema = Joi.object<PerformanceReportInput>({
  reportType: Joi.string().valid(
    'technician_performance',
    'team_productivity',
    'response_time',
    'resolution_rate',
    'efficiency_metrics'
  ).required(),
  dateFrom: baseReportFields.dateFrom.required(),
  dateTo: baseReportFields.dateTo.greater(Joi.ref('dateFrom')).required(),
  filters: Joi.object({
    assignedTo: Joi.string().hex().length(24),
    team: Joi.string(),
    location: Joi.string().hex().length(24),
    serviceType: Joi.string()
  }),
  metrics: Joi.array().items(
    Joi.string().valid(
      'response_time',
      'resolution_time',
      'first_call_resolution',
      'customer_rating',
      'tickets_completed'
    )
  ),
  format: baseReportFields.format.default('json'),
  includeGraphs: baseReportFields.includeGraphs.default(false)
});

// Custom report schema
export const customReportSchema = Joi.object<CustomReportInput>({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500),
  reportType: Joi.string().valid('tabular', 'summary', 'analytical').required(),
  dataSource: Joi.string().valid(
    'tickets',
    'customers',
    'products',
    'stock',
    'amc',
    'purchase_orders',
    'users'
  ).required(),
  fields: Joi.array().items(
    Joi.object({
      fieldName: Joi.string().required(),
      alias: Joi.string().max(50),
      aggregation: Joi.string().valid('sum', 'count', 'avg', 'min', 'max', 'group'),
      sortOrder: Joi.string().valid('asc', 'desc')
    })
  ).min(1).required(),
  filters: Joi.array().items(
    Joi.object({
      field: Joi.string().required(),
      operator: Joi.string().valid(
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'greater_than',
        'less_than',
        'between',
        'in',
        'not_in'
      ).required(),
      value: Joi.any().required()
    })
  ),
  dateRange: Joi.object({
    dateField: Joi.string().required(),
    dateFrom: baseReportFields.dateFrom,
    dateTo: baseReportFields.dateTo
  }),
  groupBy: Joi.array().items(Joi.string()),
  limit: Joi.number().integer().min(1).max(10000).default(1000),
  format: baseReportFields.format.default('json'),
  isPublic: Joi.boolean().default(false),
  scheduledReports: Joi.object({
    enabled: Joi.boolean().default(false),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly'),
    dayOfWeek: Joi.number().integer().min(0).max(6), // 0 = Sunday
    dayOfMonth: Joi.number().integer().min(1).max(31),
    recipients: Joi.array().items(Joi.string().email())
  })
});

// Scheduled report schema
export const scheduledReportSchema = Joi.object<ScheduledReportInput>({
  reportId: Joi.string().hex().length(24).required(),
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500),
  frequency: Joi.string().valid('daily', 'weekly', 'monthly', 'quarterly', 'yearly').required(),
  schedule: Joi.object({
    time: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:MM format
    dayOfWeek: Joi.number().integer().min(0).max(6),
    dayOfMonth: Joi.number().integer().min(1).max(31),
    monthOfYear: Joi.number().integer().min(1).max(12)
  }).required(),
  recipients: Joi.array().items(Joi.string().email()).min(1).required(),
  format: Joi.string().valid('json', 'csv', 'excel', 'pdf').required(),
  parameters: Joi.object().unknown(true),
  isActive: Joi.boolean().default(true),
  nextRunDate: Joi.date().iso()
});

// Report export schema
export const reportExportSchema = Joi.object<ReportExportInput>({
  reportId: Joi.string().hex().length(24),
  reportData: Joi.any().when('reportId', {
    is: Joi.exist(),
    otherwise: Joi.required()
  }),
  format: Joi.string().valid('csv', 'excel', 'pdf').required(),
  filename: Joi.string().max(255),
  options: Joi.object({
    includeHeaders: Joi.boolean().default(true),
    dateFormat: Joi.string().default('YYYY-MM-DD'),
    orientation: Joi.string().valid('portrait', 'landscape').default('portrait'),
    pageSize: Joi.string().valid('A4', 'A3', 'letter', 'legal').default('A4'),
    includeGraphs: Joi.boolean().default(false),
    watermark: Joi.string().max(100)
  })
});

// Report template schema
export const reportTemplateSchema = Joi.object<ReportTemplateInput>({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500),
  category: Joi.string().valid('tickets', 'inventory', 'revenue', 'customers', 'performance', 'custom').required(),
  template: Joi.object({
    structure: Joi.object({
      title: Joi.string().required(),
      sections: Joi.array().items(
        Joi.object({
          type: Joi.string().valid('table', 'chart', 'summary', 'text').required(),
          title: Joi.string(),
          query: Joi.string(),
          chartType: Joi.string().valid('line', 'bar', 'pie', 'doughnut', 'area'),
          columns: Joi.array().items(Joi.string())
        })
      ).required()
    }).required(),
    styling: Joi.object({
      headerColor: Joi.string().pattern(/^#([0-9A-F]{3}|[0-9A-F]{6})$/i),
      fontFamily: Joi.string(),
      fontSize: Joi.number().min(8).max(24),
      logoUrl: Joi.string().uri()
    })
  }).required(),
  parameters: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('string', 'number', 'date', 'boolean', 'select').required(),
      required: Joi.boolean().default(false),
      defaultValue: Joi.any(),
      options: Joi.array()
    })
  ),
  isActive: Joi.boolean().default(true)
});

// Report sharing schema
export const reportSharingSchema = Joi.object<ReportSharingInput>({
  reportId: Joi.string().hex().length(24).required(),
  shareWith: Joi.array().items(Joi.string().email()).min(1).required(),
  permissions: Joi.array().items(
    Joi.string().valid('view', 'edit', 'delete', 'share')
  ).min(1).required(),
  expiresAt: Joi.date().iso().greater('now'),
  password: Joi.string().min(6).max(50),
  publicAccess: Joi.boolean().default(false),
  emailNotification: Joi.boolean().default(true)
});

// Bulk report operations schema
export const bulkReportOperationSchema = Joi.object<BulkReportOperationInput>({
  reportIds: Joi.array().items(Joi.string().hex().length(24)).min(1).max(50).required(),
  operation: Joi.string().valid('delete', 'archive', 'share', 'export', 'schedule').required(),
  parameters: Joi.object().when('operation', {
    switch: [
      {
        is: 'share',
        then: Joi.object({
          shareWith: Joi.array().items(Joi.string().email()).required()
        })
      },
      {
        is: 'export',
        then: Joi.object({
          exportFormat: Joi.string().valid('csv', 'excel', 'pdf').required()
        })
      },
      {
        is: 'schedule',
        then: Joi.object({
          scheduleFrequency: Joi.string().valid('daily', 'weekly', 'monthly').required()
        })
      }
    ]
  })
}); 