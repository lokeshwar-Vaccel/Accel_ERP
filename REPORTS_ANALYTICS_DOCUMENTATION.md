# Reports & Analytics System Documentation

## Overview

The Sun Power Services ERP system includes a comprehensive reports and analytics module designed to provide business intelligence and insights across all operational areas. This system enables data-driven decision making through real-time analytics, customizable reports, and performance tracking.

## System Architecture

### Backend Components

1. **Analytics Service** (`api/src/services/analyticsService.ts`)
   - Core analytics calculations and data processing
   - Aggregation and statistical analysis
   - Performance optimization for large datasets

2. **Report Controller** (`api/src/controllers/reportController.ts`)
   - API endpoints for report generation
   - Data filtering and query optimization
   - Export functionality

3. **Report Schemas** (`api/src/schemas/reportSchemas.ts`)
   - Input validation for report parameters
   - Type definitions for analytics data
   - Schema validation rules

### Frontend Components

1. **Reports Management** (`frontend/src/pages/ReportsManagement.tsx`)
   - Interactive dashboard interface
   - Real-time data visualization
   - Report customization options

2. **Dashboard** (`frontend/src/pages/Dashboard.tsx`)
   - Overview metrics and KPIs
   - Quick insights and alerts
   - Performance indicators

## Available Reports

### 1. Dashboard Analytics

**Endpoint:** `POST /api/v1/reports/dashboard-analytics`

**Description:** Comprehensive overview of all business metrics and KPIs.

**Key Metrics:**
- **Core Metrics:** Total customers, tickets, AMCs, products, revenue, invoices, quotations
- **Service Metrics:** Open/in-progress tickets, resolution time, SLA compliance
- **AMC Metrics:** Active contracts, expiring contracts, contract value, visit compliance
- **Inventory Metrics:** Low stock items, total value, stock movement
- **Customer Metrics:** Leads, conversions, satisfaction ratings

**Sample Request:**
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31",
  "includeTrends": true,
  "includePredictions": false
}
```

**Sample Response:**
```json
{
  "success": true,
  "message": "Dashboard analytics generated successfully",
  "data": {
    "reportType": "dashboard_analytics",
    "generatedAt": "2024-01-15T10:30:00Z",
    "core": {
      "totalCustomers": 120,
      "totalTickets": 156,
      "totalAMCs": 89,
      "totalRevenue": 5620000
    },
    "service": {
      "openTickets": 15,
      "inProgressTickets": 28,
      "avgResolutionTime": 2.8,
      "slaComplianceRate": 89.7
    },
    "amc": {
      "activeContracts": 76,
      "expiringContracts": 12,
      "totalContractValue": 4200000,
      "visitComplianceRate": 94.2
    }
  }
}
```

### 2. Service Tickets Analytics

**Endpoint:** `POST /api/v1/reports/service-tickets`

**Description:** Detailed analysis of service ticket performance, TAT, and SLA compliance.

**Key Metrics:**
- Total tickets and closed tickets
- Average turnaround time (TAT)
- SLA compliance rate
- Priority and status breakdown
- TAT distribution analysis
- Engineer performance metrics

**Sample Request:**
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31",
  "status": "resolved",
  "priority": "high",
  "assignedTo": "user_id",
  "groupBy": "status",
  "includeMetrics": true
}
```

### 3. Inventory Analytics

**Endpoint:** `POST /api/v1/reports/inventory`

**Description:** Comprehensive inventory analysis including stock levels, movements, and valuations.

**Key Metrics:**
- Total inventory value and items
- Low stock alerts
- Category breakdown
- Stock movement trends
- Value distribution
- Reorder recommendations

**Sample Request:**
```json
{
  "category": "gensets",
  "location": "warehouse_id",
  "lowStock": true,
  "includeStockValue": true,
  "includeMovements": true
}
```

### 4. Revenue Analytics

**Endpoint:** `POST /api/v1/reports/revenue`

**Description:** Revenue analysis across different sources and customer types.

**Key Metrics:**
- Total revenue (AMC + Service + Parts + Installation)
- Revenue by customer type (Retail/Telecom)
- Monthly revenue trends
- Top clients analysis
- Revenue source breakdown

**Sample Request:**
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31",
  "groupBy": "month",
  "includeProjections": false
}
```

### 5. Customer Analytics

**Endpoint:** `POST /api/v1/reports/customers`

**Description:** Customer analysis including lead conversion, satisfaction, and retention.

**Key Metrics:**
- Lead conversion funnel
- Customer satisfaction ratings
- Customer activity analysis
- Retention metrics
- Customer type distribution

**Sample Request:**
```json
{
  "customerType": "retail",
  "status": "converted",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31",
  "includeActivity": true
}
```

### 6. Performance Analytics

**Endpoint:** `POST /api/v1/reports/performance`

**Description:** Team and individual performance analysis.

**Key Metrics:**
- Individual engineer performance
- Team productivity metrics
- Resolution time analysis
- SLA compliance by engineer
- Customer ratings

**Sample Request:**
```json
{
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31",
  "userId": "engineer_id",
  "includeTeamMetrics": true
}
```

## Data Models

### Analytics Filters

```typescript
interface AnalyticsFilters {
  dateFrom?: Date;
  dateTo?: Date;
  customerType?: string;
  location?: string;
  assignedTo?: string;
  status?: string;
  priority?: string;
  category?: string;
}
```

### Dashboard Metrics

```typescript
interface DashboardMetrics {
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
```

## Frontend Integration

### Reports Management Component

The `ReportsManagement` component provides:

1. **Interactive Navigation:** Tab-based navigation between different report types
2. **Date Range Filtering:** Predefined and custom date ranges
3. **Real-time Data:** Live data updates with loading states
4. **Export Functionality:** PDF, Excel, and CSV export options
5. **Responsive Design:** Mobile-friendly interface

### Key Features

- **Real-time Analytics:** Data refreshes automatically based on selected filters
- **Interactive Charts:** Visual representation of data using charts and graphs
- **Drill-down Capability:** Click on metrics to view detailed breakdowns
- **Customizable Views:** User can customize which metrics to display
- **Export Options:** Multiple export formats for reports

## Performance Optimization

### Backend Optimizations

1. **Database Indexing:** Optimized indexes for frequently queried fields
2. **Aggregation Pipelines:** Efficient MongoDB aggregation for complex calculations
3. **Caching:** Redis caching for frequently accessed reports
4. **Pagination:** Large dataset handling with pagination
5. **Query Optimization:** Optimized queries for better performance

### Frontend Optimizations

1. **Lazy Loading:** Reports load only when accessed
2. **Data Caching:** Client-side caching for better UX
3. **Debounced Updates:** Optimized filter updates
4. **Virtual Scrolling:** For large data tables
5. **Progressive Loading:** Load data in chunks

## Security & Access Control

### Authentication & Authorization

1. **JWT Authentication:** Secure token-based authentication
2. **Role-based Access:** Different access levels for different user roles
3. **Module Permissions:** Granular permissions for report access
4. **Data Privacy:** Sensitive data filtering based on user permissions

### Data Protection

1. **Input Validation:** Comprehensive input validation and sanitization
2. **SQL Injection Prevention:** Parameterized queries
3. **XSS Protection:** Output encoding and sanitization
4. **Rate Limiting:** API rate limiting to prevent abuse

## Monitoring & Logging

### Analytics Tracking

1. **Report Usage:** Track which reports are most frequently accessed
2. **Performance Metrics:** Monitor report generation times
3. **Error Tracking:** Comprehensive error logging and monitoring
4. **User Behavior:** Track user interactions with reports

### System Health

1. **Database Performance:** Monitor query performance and optimization
2. **API Response Times:** Track API response times and bottlenecks
3. **Error Rates:** Monitor error rates and system health
4. **Resource Usage:** Track CPU, memory, and disk usage

## Future Enhancements

### Planned Features

1. **Predictive Analytics:** Machine learning-based predictions
2. **Advanced Visualizations:** More interactive charts and graphs
3. **Real-time Dashboards:** Live data streaming and updates
4. **Mobile App:** Native mobile application for reports
5. **AI-powered Insights:** Automated insights and recommendations

### Technical Improvements

1. **Microservices Architecture:** Break down into smaller, focused services
2. **Event-driven Architecture:** Real-time data processing
3. **Advanced Caching:** Multi-level caching strategy
4. **Data Warehouse:** Dedicated data warehouse for analytics
5. **ETL Pipelines:** Automated data extraction and transformation

## Troubleshooting

### Common Issues

1. **Slow Report Generation:**
   - Check database indexes
   - Optimize aggregation pipelines
   - Implement caching

2. **Data Accuracy Issues:**
   - Verify data sources
   - Check calculation logic
   - Validate data integrity

3. **Performance Issues:**
   - Monitor query performance
   - Implement pagination
   - Optimize frontend rendering

### Debugging Tools

1. **Database Profiling:** MongoDB profiler for query analysis
2. **API Monitoring:** Request/response logging
3. **Frontend Debugging:** Browser developer tools
4. **Performance Monitoring:** Application performance monitoring tools

## Support & Maintenance

### Regular Maintenance

1. **Database Optimization:** Regular index maintenance and optimization
2. **Cache Management:** Cache invalidation and cleanup
3. **Performance Monitoring:** Regular performance reviews
4. **Security Updates:** Regular security patches and updates

### Support Channels

1. **Documentation:** Comprehensive documentation and guides
2. **Training:** User training and onboarding
3. **Technical Support:** Dedicated technical support team
4. **Community:** User community and forums

---

This documentation provides a comprehensive overview of the Reports & Analytics system. For specific implementation details, refer to the source code and API documentation. 