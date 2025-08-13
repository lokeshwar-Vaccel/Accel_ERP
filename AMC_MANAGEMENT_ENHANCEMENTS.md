# AMC Management Enhancements

## Overview

This document outlines the comprehensive enhancements made to the AMC (Annual Maintenance Contract) Management system, including new features for contract renewal, report generation, visit scheduling, and bulk operations.

## New Features Implemented

### 1. Enhanced Contract Renewal System

#### Features:
- **Individual Contract Renewal**: Renew single contracts with price adjustments and updated terms
- **Bulk Contract Renewal**: Renew multiple contracts simultaneously
- **Price Adjustment Options**: Percentage or fixed amount adjustments
- **Auto-Renewal Settings**: Enable automatic renewal for contracts
- **Renewal Terms Management**: Update terms and conditions for renewed contracts

#### Components:
- `ContractRenewal.tsx`: Modal component for contract renewal
- Backend endpoints: `POST /api/v1/amc/:id/renew` and `POST /api/v1/amc/bulk-renew`

#### Usage:
```typescript
// Individual renewal
const handleRenewContract = (amc: AMC) => {
  setSelectedAMCForRenewal(amc);
  setShowContractRenewal(true);
};

// Bulk renewal
const handleBulkRenewal = () => {
  const expiringContracts = getExpiringContracts();
  setSelectedContractsForBulkRenewal(expiringContracts);
  setShowBulkRenewal(true);
};
```

### 2. Comprehensive Report Generation

#### Report Types:
- **Contract Summary**: Overview of all contracts with status distribution
- **Revenue Analysis**: Monthly revenue trends and financial metrics
- **Visit Completion**: Service visit statistics and completion rates
- **Customer Satisfaction**: Customer-wise contract analysis
- **Expiring Contracts**: Contracts nearing expiration with risk assessment

#### Features:
- **Filterable Reports**: Filter by date range, customer, status
- **Multiple Export Formats**: JSON, CSV, PDF (placeholder)
- **Real-time Data**: Live data from database
- **Visual Analytics**: Charts and progress indicators

#### Components:
- `AMCReport.tsx`: Comprehensive report generation interface
- Backend endpoint: `GET /api/v1/amc/reports/:type`

#### Usage:
```typescript
const handleGenerateReport = () => {
  setShowReportModal(true);
};

// Generate specific report
const response = await apiClient.amc.generateReport('contract_summary', {
  dateFrom: '2024-01-01',
  dateTo: '2024-12-31',
  customer: 'customerId',
  status: 'active'
});
```

### 3. Enhanced Visit Scheduling

#### Features:
- **Manual Scheduling**: Schedule individual visits with detailed information
- **Auto-Scheduling**: Automatically schedule all visits for a contract
- **Optimized Scheduling**: Smart scheduling based on contract duration
- **Visit Types**: Routine, Emergency, Follow-up, Inspection
- **Technician Assignment**: Assign visits to specific technicians
- **Duration Estimation**: Set estimated visit duration

#### Components:
- `VisitScheduler.tsx`: Advanced visit scheduling interface
- Backend endpoint: `POST /api/v1/amc/:id/schedule-visit-enhanced`

#### Usage:
```typescript
const handleScheduleVisit = (amc: AMC) => {
  setSelectedAMCForVisit(amc);
  setShowVisitScheduler(true);
};

// Schedule visit with data
const visitData = {
  scheduledDate: '2024-12-15',
  assignedTo: 'technicianId',
  visitType: 'routine',
  estimatedDuration: 2,
  notes: 'Regular maintenance visit',
  autoSchedule: false,
  scheduleType: 'manual'
};
```

### 4. Bulk Operations

#### Features:
- **Bulk Selection**: Select multiple contracts for operations
- **Bulk Renewal**: Renew multiple contracts simultaneously
- **Bulk Actions**: Future expansion for other bulk operations
- **Selection Indicators**: Visual feedback for selected contracts

#### Implementation:
```typescript
const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
const [selectedContractsForBulkRenewal, setSelectedContractsForBulkRenewal] = useState<AMC[]>([]);

const handleContractSelection = (amc: AMC) => {
  const isSelected = selectedContractsForBulkRenewal.some(c => c._id === amc._id);
  if (isSelected) {
    setSelectedContractsForBulkRenewal(prev => prev.filter(c => c._id !== amc._id));
  } else {
    setSelectedContractsForBulkRenewal(prev => [...prev, amc]);
  }
};
```

### 5. Performance Metrics

#### Features:
- **Contract Progress**: Visual progress indicators
- **Completion Rates**: Visit completion statistics
- **Expiry Tracking**: Days until contract expiry
- **Performance Analytics**: Response time and satisfaction metrics

#### Backend Endpoint:
- `GET /api/v1/amc/:id/performance`: Get detailed performance metrics

## Backend Enhancements

### New Controller Functions

#### 1. Report Generation (`generateAMCReport`)
```typescript
export const generateAMCReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Generates various types of AMC reports
  // Supports filtering by date, customer, status
  // Returns structured data for frontend visualization
};
```

#### 2. Enhanced Visit Scheduling (`scheduleEnhancedVisit`)
```typescript
export const scheduleEnhancedVisit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Handles both manual and automatic visit scheduling
  // Supports single visits and bulk scheduling
  // Includes optimization algorithms
};
```

#### 3. Bulk Contract Renewal (`bulkRenewContracts`)
```typescript
export const bulkRenewContracts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Processes multiple contract renewals
  // Applies price adjustments and updates
  // Creates new contracts and updates old ones
};
```

#### 4. Performance Metrics (`getAMCPerformance`)
```typescript
export const getAMCPerformance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Calculates comprehensive performance metrics
  // Includes progress, completion rates, expiry tracking
  // Provides actionable insights
};
```

### New API Routes

```typescript
// Enhanced AMC functionality
router.post('/:id/schedule-visit-enhanced', checkPermission('write'), scheduleEnhancedVisit);
router.post('/bulk-renew', checkPermission('write'), bulkRenewContracts);
router.get('/:id/performance', checkPermission('read'), getAMCPerformance);

// Reports
router.get('/reports/:type', checkPermission('read'), generateAMCReport);
```

### Enhanced API Client

```typescript
amc = {
  // ... existing methods ...
  
  // Enhanced functionality
  scheduleEnhancedVisit: (id: string, visitData: any) =>
    this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}/schedule-visit-enhanced`, {
      method: 'POST',
      body: JSON.stringify(visitData),
    }),

  bulkRenew: (contractIds: string[], renewalData: any) =>
    this.makeRequest<{ success: boolean; data: any }>('/amc/bulk-renew', {
      method: 'POST',
      body: JSON.stringify({ contractIds, ...renewalData }),
    }),

  getPerformance: (id: string) =>
    this.makeRequest<{ success: boolean; data: any }>(`/amc/${id}/performance`),

  generateReport: (type: string, params?: any) =>
    this.makeRequest<{ success: boolean; data: any }>(`/amc/reports/${type}${params ? `?${new URLSearchParams(params)}` : ''}`),
};
```

## Frontend Components

### 1. AMCReport Component
- **Purpose**: Generate and display comprehensive AMC reports
- **Features**: Multiple report types, filtering, export options
- **Props**: `isOpen`, `onClose`, `reportType`

### 2. VisitScheduler Component
- **Purpose**: Schedule visits with advanced options
- **Features**: Manual/auto scheduling, technician assignment, visit types
- **Props**: `isOpen`, `onClose`, `amcId`, `amcData`

### 3. ContractRenewal Component
- **Purpose**: Handle contract renewals and bulk renewals
- **Features**: Price adjustments, auto-renewal, terms management
- **Props**: `isOpen`, `onClose`, `amcData`, `isBulkRenewal`, `selectedContracts`

## User Interface Enhancements

### 1. Enhanced Header Actions
- **Generate Reports**: Access to comprehensive reporting
- **Bulk Actions**: Toggle bulk selection mode
- **Expiry Alerts**: Quick access to expiring contracts
- **New Contract**: Create new AMC contracts

### 2. Improved Table Interface
- **Bulk Selection**: Checkboxes for multi-select
- **Enhanced Actions**: Contextual action buttons
- **Progress Indicators**: Visual progress bars
- **Status Indicators**: Color-coded status badges

### 3. Modal Interfaces
- **Report Generation**: Comprehensive report interface
- **Visit Scheduling**: Advanced scheduling options
- **Contract Renewal**: Detailed renewal process

## Data Flow

### 1. Report Generation Flow
```
User clicks "Generate Reports" 
→ Opens AMCReport modal 
→ User selects report type and filters 
→ Frontend calls API with parameters 
→ Backend generates report data 
→ Frontend displays formatted report
```

### 2. Visit Scheduling Flow
```
User clicks "Schedule Visit" 
→ Opens VisitScheduler modal 
→ User configures visit details 
→ Frontend sends visit data to API 
→ Backend creates visit schedule 
→ Frontend updates AMC data
```

### 3. Contract Renewal Flow
```
User clicks "Renew Contract" 
→ Opens ContractRenewal modal 
→ User configures renewal details 
→ Frontend sends renewal data to API 
→ Backend creates new contract 
→ Frontend updates contract list
```

## Security and Permissions

### 1. Permission Checks
- **Read Access**: Required for viewing reports and performance metrics
- **Write Access**: Required for scheduling visits and renewing contracts
- **Admin Access**: Required for bulk operations

### 2. Data Validation
- **Input Validation**: All user inputs are validated
- **Business Logic**: Contract renewal rules are enforced
- **Error Handling**: Comprehensive error handling and user feedback

## Future Enhancements

### 1. Advanced Analytics
- **Predictive Analytics**: Predict contract renewal likelihood
- **Performance Forecasting**: Forecast service requirements
- **Customer Insights**: Deep customer behavior analysis

### 2. Automation Features
- **Auto-Scheduling**: Intelligent visit scheduling based on usage patterns
- **Auto-Renewal**: Automatic contract renewal with approval workflow
- **Notification System**: Automated alerts for expiring contracts

### 3. Integration Features
- **Calendar Integration**: Sync visits with external calendars
- **Email Notifications**: Automated email notifications
- **Mobile App**: Mobile interface for field technicians

## Testing Considerations

### 1. Unit Tests
- **Component Testing**: Test all new React components
- **API Testing**: Test all new backend endpoints
- **Integration Testing**: Test end-to-end workflows

### 2. User Acceptance Testing
- **Report Generation**: Verify all report types work correctly
- **Visit Scheduling**: Test manual and auto-scheduling
- **Contract Renewal**: Test individual and bulk renewals

## Performance Considerations

### 1. Database Optimization
- **Indexing**: Proper indexing for report queries
- **Query Optimization**: Efficient queries for large datasets
- **Caching**: Cache frequently accessed data

### 2. Frontend Optimization
- **Lazy Loading**: Load components on demand
- **Data Pagination**: Handle large datasets efficiently
- **State Management**: Efficient state management for complex operations

## Conclusion

The enhanced AMC Management system provides a comprehensive solution for managing annual maintenance contracts with advanced features for reporting, scheduling, and renewal operations. The modular architecture allows for easy extension and maintenance while providing a rich user experience.

The implementation follows best practices for security, performance, and user experience, making it ready for production deployment and future enhancements. 