# Engineer Work Statistics API

## Overview
This API endpoint provides detailed statistics about engineer work performance, broken down by nature of work and sub-nature of work. It counts the number of tickets each engineer has worked on for different types of work.

## Endpoint
```
GET /api/v1/services/reports/engineer-work-stats
```

## Query Parameters
- `engineerId` (optional): Filter by specific engineer ID
- `fromMonth` (optional): Start month in YYYY-MM format (used with toMonth)
- `toMonth` (optional): End month in YYYY-MM format (used with fromMonth)
- `month` (optional): Single month in YYYY-MM format (alternative to fromMonth/toMonth)

## Response Format
```json
{
  "success": true,
  "message": "Engineer work statistics retrieved successfully",
  "data": {
    "period": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z",
      "fromMonth": "2024-01",
      "toMonth": "2024-01",
      "month": null
    },
    "engineerStats": [
      {
        "engineerId": "64a1b2c3d4e5f6789012345",
        "engineerName": "John Doe",
        "workBreakdown": [
          {
            "natureOfWork": "oil_service",
            "subNatureOfWork": "fsc",
            "ticketCount": 5,
            "totalConvenienceCharges": 2500
          },
          {
            "natureOfWork": "site_visit",
            "subNatureOfWork": "amc",
            "ticketCount": 3,
            "totalConvenienceCharges": 1500
          }
        ],
        "totalTickets": 8,
        "totalConvenienceCharges": 4000
      }
    ],
    "overallStats": [
      {
        "natureOfWork": "oil_service",
        "subNatureOfWork": "fsc",
        "ticketCount": 15,
        "totalConvenienceCharges": 7500
      }
    ],
    "summary": {
      "totalEngineers": 5,
      "totalTickets": 50,
      "totalConvenienceCharges": 25000
    }
  }
}
```

## Usage Examples

### Frontend Usage
```typescript
import { apiClient } from '../utils/api';

// Get all engineer stats for current month
const response = await apiClient.services.getEngineerWorkStats();

// Get stats for specific engineer
const engineerStats = await apiClient.services.getEngineerWorkStats({
  engineerId: '64a1b2c3d4e5f6789012345'
});

// Get stats for specific month
const monthStats = await apiClient.services.getEngineerWorkStats({
  month: '2024-01'
});

// Get stats for date range
const rangeStats = await apiClient.services.getEngineerWorkStats({
  fromMonth: '2024-01',
  toMonth: '2024-03'
});
```

### Direct API Call
```javascript
// Get all engineer stats
fetch('/api/v1/services/reports/engineer-work-stats', {
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));

// Get stats with filters
const params = new URLSearchParams({
  engineerId: '64a1b2c3d4e5f6789012345',
  month: '2024-01'
});

fetch(`/api/v1/services/reports/engineer-work-stats?${params}`, {
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

## Data Structure

### Engineer Stats
Each engineer in `engineerStats` contains:
- `engineerId`: Unique identifier for the engineer
- `engineerName`: Full name of the engineer
- `workBreakdown`: Array of work type breakdowns
- `totalTickets`: Total number of tickets for this engineer
- `totalConvenienceCharges`: Total convenience charges for this engineer

### Work Breakdown
Each item in `workBreakdown` contains:
- `natureOfWork`: Type of work (oil_service, site_visit, breakdown, etc.)
- `subNatureOfWork`: Sub-type of work (fsc, amc, paid, etc.)
- `ticketCount`: Number of tickets for this work type
- `totalConvenienceCharges`: Total convenience charges for this work type

### Overall Stats
Each item in `overallStats` contains:
- `natureOfWork`: Type of work
- `subNatureOfWork`: Sub-type of work
- `ticketCount`: Total tickets across all engineers for this work type
- `totalConvenienceCharges`: Total convenience charges across all engineers for this work type

## Filtering Options

1. **By Engineer**: Use `engineerId` parameter to get stats for a specific engineer
2. **By Month**: Use `month` parameter for a single month
3. **By Date Range**: Use `fromMonth` and `toMonth` parameters for a range
4. **No Filters**: Get stats for all engineers in the current month

## Notes
- Only resolved and closed tickets are included in the statistics
- Only field engineers are included in the results
- The API supports both `ServiceEngineerName` and `assignedTo` fields for engineer assignment
- Date filtering is based on `ServiceAttendedDate` field
- All monetary values are in the base currency unit
