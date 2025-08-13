# AMC Management API Documentation

## Overview

This document provides comprehensive documentation for all AMC (Annual Maintenance Contract) Management API endpoints. All endpoints require authentication and appropriate permissions.

## Base URL
```
http://localhost:3000/api/v1/amc
```

## Authentication
All endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### 1. Get All AMC Contracts
**GET** `/amc`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `search` (string): Search term for contract number or terms
- `status` (string): Filter by status (active, expired, cancelled, pending, suspended, draft)
- `customer` (string): Filter by customer ID
- `dateFrom` (string): Filter by start date (ISO format)
- `dateTo` (string): Filter by end date (ISO format)
- `expiringIn` (number): Filter contracts expiring within X days

**Response:**
```json
{
  "success": true,
  "message": "AMC contracts retrieved successfully",
  "data": {
    "contracts": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
}
```

### 2. Get Single AMC Contract
**GET** `/amc/:id`

**Response:**
```json
{
  "success": true,
  "message": "AMC contract retrieved successfully",
  "data": {
    "contract": {
      "_id": "...",
      "contractNumber": "AMC-2024-0001",
      "customer": {...},
      "products": [...],
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T00:00:00.000Z",
      "contractValue": 50000,
      "scheduledVisits": 12,
      "completedVisits": 6,
      "status": "active",
      "terms": "...",
      "createdBy": {...},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### 3. Create AMC Contract
**POST** `/amc`

**Request Body:**
```json
{
  "customer": "customerId",
  "products": ["productId1", "productId2"],
  "startDate": "2024-01-01",
  "endDate": "2024-12-31",
  "contractValue": 50000,
  "scheduledVisits": 12,
  "terms": "Contract terms and conditions...",
  "contractType": "comprehensive",
  "paymentTerms": "monthly"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AMC contract created successfully",
  "data": {
    "contract": {...}
  }
}
```

### 4. Update AMC Contract
**PUT** `/amc/:id`

**Request Body:**
```json
{
  "contractValue": 55000,
  "scheduledVisits": 15,
  "status": "active",
  "terms": "Updated terms..."
}
```

### 5. Delete AMC Contract
**DELETE** `/amc/:id`

**Permissions:** Admin or Super Admin only

### 6. Renew AMC Contract
**POST** `/amc/:id/renew`

**Request Body:**
```json
{
  "newStartDate": "2025-01-01",
  "newEndDate": "2025-12-31",
  "newContractValue": 55000,
  "newScheduledVisits": 12,
  "priceAdjustment": {
    "type": "percentage",
    "value": 10,
    "reason": "Annual price increase"
  },
  "updatedTerms": "Updated contract terms...",
  "autoRenewal": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "AMC contract renewed successfully",
  "data": {
    "originalContract": {...},
    "newContract": {...},
    "priceAdjustment": {
      "type": "percentage",
      "value": 10,
      "reason": "Annual price increase"
    }
  }
}
```

### 7. Bulk Renew Contracts
**POST** `/amc/bulk-renew`

**Request Body:**
```json
{
  "contractIds": ["contractId1", "contractId2"],
  "newStartDate": "2025-01-01",
  "newEndDate": "2025-12-31",
  "newContractValue": 55000,
  "newScheduledVisits": 12,
  "priceAdjustment": {
    "type": "percentage",
    "value": 10,
    "reason": "Annual price increase"
  },
  "updatedTerms": "Updated contract terms...",
  "autoRenewal": false
}
```

### 8. Schedule Visit
**POST** `/amc/:id/schedule-visit`

**Request Body:**
```json
{
  "scheduledDate": "2024-12-15",
  "assignedTo": "technicianId",
  "visitType": "routine",
  "estimatedDuration": 2,
  "notes": "Regular maintenance visit"
}
```

### 9. Enhanced Visit Scheduling
**POST** `/amc/:id/schedule-visit-enhanced`

**Request Body:**
```json
{
  "scheduledDate": "2024-12-15",
  "assignedTo": "technicianId",
  "visitType": "routine",
  "estimatedDuration": 2,
  "notes": "Regular maintenance visit",
  "autoSchedule": false,
  "scheduleType": "manual"
}
```

### 10. Complete Visit
**POST** `/amc/visits/:visitId/complete`

**Request Body:**
```json
{
  "completedDate": "2024-12-15",
  "assignedTo": "technicianId",
  "serviceReport": "Service completed successfully",
  "workPerformed": [
    {
      "task": "Oil change",
      "status": "completed",
      "notes": "Oil changed as scheduled"
    }
  ],
  "partsUsed": [
    {
      "product": "productId",
      "quantity": 1,
      "covered": true
    }
  ],
  "customerFeedback": {
    "rating": 5,
    "comments": "Excellent service"
  }
}
```

### 11. Get AMC Performance
**GET** `/amc/:id/performance`

**Response:**
```json
{
  "success": true,
  "message": "AMC performance metrics retrieved successfully",
  "data": {
    "amc": {...},
    "performanceMetrics": {
      "contractProgress": 75.5,
      "completionRate": 50.0,
      "daysUntilExpiry": 45,
      "remainingVisits": 6,
      "overdueVisits": 0,
      "averageResponseTime": 2.5,
      "customerSatisfaction": 4.5,
      "issueResolutionRate": 95.0
    }
  }
}
```

### 12. Get AMC Details
**GET** `/amc/:id/details`

**Response:**
```json
{
  "success": true,
  "message": "AMC contract details retrieved successfully",
  "data": {
    "contract": {...},
    "metrics": {
      "daysUntilExpiry": 45,
      "completionRate": 50.0,
      "remainingVisits": 6,
      "overdueVisits": 0
    }
  }
}
```

### 13. Update AMC Status
**PUT** `/amc/:id/status`

**Request Body:**
```json
{
  "status": "suspended",
  "reason": "Customer requested suspension"
}
```

### 14. Get AMCs by Customer
**GET** `/amc/customer/:customerId`

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status

### 15. Get Expiring Contracts
**GET** `/amc/expiring/contracts`

**Query Parameters:**
- `days` (number): Days until expiry (default: 30)

### 16. Get Expiring Soon
**GET** `/amc/expiring-soon`

**Query Parameters:**
- `days` (number): Days until expiry (default: 30)

### 17. Get Visits Due
**GET** `/amc/visits-due`

**Query Parameters:**
- `days` (number): Days until visit due (default: 7)

### 18. Get AMC Statistics
**GET** `/amc/stats/overview`

**Response:**
```json
{
  "success": true,
  "message": "AMC statistics retrieved successfully",
  "data": {
    "totalContracts": 150,
    "activeContracts": 120,
    "expiredContracts": 20,
    "cancelledContracts": 10,
    "totalValue": 7500000,
    "averageContractValue": 50000
  }
}
```

### 19. Get AMC Dashboard
**GET** `/amc/dashboard`

**Response:**
```json
{
  "success": true,
  "message": "AMC dashboard statistics retrieved successfully",
  "data": {
    "totalContracts": 150,
    "activeContracts": 120,
    "expiredContracts": 20,
    "expiringSoon": 15,
    "totalValue": 7500000,
    "monthlyRevenue": [
      {
        "_id": "2024-12",
        "revenue": 500000
      }
    ],
    "completionRate": 80.0
  }
}
```

### 20. Generate Reports
**GET** `/amc/reports/:type`

**Report Types:**
- `contract_summary`: Overview of all contracts
- `revenue_analysis`: Revenue trends and analysis
- `visit_completion`: Visit completion statistics
- `customer_satisfaction`: Customer-wise analysis
- `expiring_contracts`: Contracts nearing expiration

**Query Parameters:**
- `dateFrom` (string): Start date (ISO format)
- `dateTo` (string): End date (ISO format)
- `customer` (string): Filter by customer ID
- `status` (string): Filter by status
- `format` (string): Output format (json, csv, pdf)

**Example:**
```
GET /amc/reports/contract_summary?dateFrom=2024-01-01&dateTo=2024-12-31&status=active
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "contractValue",
      "message": "Contract value must be a positive number"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Access token is missing or invalid"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "AMC contract not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error"
}
```

## Testing Examples

### Using cURL

1. **Get all AMC contracts:**
```bash
curl -X GET "http://localhost:3000/api/v1/amc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

2. **Create new AMC contract:**
```bash
curl -X POST "http://localhost:3000/api/v1/amc" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer": "customerId",
    "products": ["productId1"],
    "startDate": "2024-01-01",
    "endDate": "2024-12-31",
    "contractValue": 50000,
    "scheduledVisits": 12,
    "terms": "Contract terms..."
  }'
```

3. **Renew AMC contract:**
```bash
curl -X POST "http://localhost:3000/api/v1/amc/CONTRACT_ID/renew" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "newStartDate": "2025-01-01",
    "newEndDate": "2025-12-31",
    "newContractValue": 55000,
    "newScheduledVisits": 12,
    "priceAdjustment": {
      "type": "percentage",
      "value": 10,
      "reason": "Annual increase"
    },
    "updatedTerms": "Updated terms...",
    "autoRenewal": false
  }'
```

### Using JavaScript/Fetch

```javascript
// Get all AMC contracts
const response = await fetch('http://localhost:3000/api/v1/amc', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

// Create new AMC contract
const createResponse = await fetch('http://localhost:3000/api/v1/amc', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    customer: 'customerId',
    products: ['productId1'],
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    contractValue: 50000,
    scheduledVisits: 12,
    terms: 'Contract terms...'
  })
});

// Renew AMC contract
const renewResponse = await fetch('http://localhost:3000/api/v1/amc/CONTRACT_ID/renew', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    newStartDate: '2025-01-01',
    newEndDate: '2025-12-31',
    newContractValue: 55000,
    newScheduledVisits: 12,
    priceAdjustment: {
      type: 'percentage',
      value: 10,
      reason: 'Annual increase'
    },
    updatedTerms: 'Updated terms...',
    autoRenewal: false
  })
});
```

## Rate Limiting

- **Standard endpoints:** 100 requests per minute
- **Report generation:** 10 requests per minute
- **Bulk operations:** 5 requests per minute

## Pagination

All list endpoints support pagination with the following parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

Response includes pagination metadata:
```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

## Filtering and Sorting

Most endpoints support filtering and sorting:

**Filtering:**
- `status`: Filter by contract status
- `customer`: Filter by customer ID
- `dateFrom/dateTo`: Filter by date range
- `search`: Search in contract number and terms

**Sorting:**
- `sort`: Sort field (prefix with `-` for descending)
- Examples: `createdAt`, `-createdAt`, `contractValue`, `-contractValue`

## Data Validation

All endpoints validate input data using Joi schemas. Common validation rules:

- **Contract Value:** Must be a positive number
- **Dates:** Must be valid ISO date strings
- **IDs:** Must be valid MongoDB ObjectId format
- **Status:** Must be one of the allowed status values
- **Visit Types:** Must be one of: routine, emergency, followup, inspection

## Security

- All endpoints require authentication
- Role-based access control (RBAC)
- Input validation and sanitization
- Rate limiting to prevent abuse
- CORS configuration for web clients 