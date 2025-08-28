# Purchase Order Updates Summary

## Overview
This document summarizes the changes made to implement:
1. **Purchase Order Type** - A required dropdown with options: "commercial" and "breakdown_order" (stored in snake_case)
2. **Department** - A required dropdown with options: "retail", "corporate", "industrial_marine", and "others" (stored in snake_case)
3. **Status** - A required dropdown with options: "approved_order_sent_sap", "credit_not_available", "fully_invoiced", "order_under_process", "partially_invoiced", and "rejected" (stored in snake_case)

**Note**: All field values are now stored in lowercase with underscores (snake_case) format for consistency and database optimization.

## Backend Changes

### 1. PurchaseOrder Model (`/api/src/models/PurchaseOrder.ts`)
- Added `purchaseOrderType` field as required enum: `'commercial' | 'breakdown_order'`
- Updated `department` field to be required enum: `'retail' | 'corporate' | 'industrial_marine' | 'others'`
- Updated `status` field to be required enum: `'approved_order_sent_sap' | 'credit_not_available' | 'fully_invoiced' | 'order_under_process' | 'partially_invoiced' | 'rejected'`
- Added index for `purchaseOrderType` field for better query performance
- Updated virtual methods and business logic methods to work with new snake_case values

### 2. Types (`/api/src/types/index.ts`)
- Updated `IPurchaseOrder` interface to include all three new fields
- `purchaseOrderType` is required with snake_case values
- `department` is required with snake_case values
- `status` is required with snake_case enum values

### 3. Validation Schemas (`/api/src/schemas/purchaseOrderSchemas.ts`)
- Updated `CreatePurchaseOrderInput` interface
- Updated `UpdatePurchaseOrderInput` interface  
- Updated Joi validation schemas for all three fields with snake_case values
- Updated import schemas to include all fields
- All fields are required for creation, optional for updates

## Frontend Changes

### 1. CreatePurchaseOrder Component (`/frontend/src/pages/CreatePurchaseOrder.tsx`)
- Added `purchaseOrderType` field to interfaces with snake_case values
- Added `purchaseOrderType` dropdown with search functionality
- Updated department options to match new required snake_case values
- Updated status type definition to use new snake_case enum values
- Added validation for all fields
- Updated form submission to include all fields
- Set default values: `purchaseOrderType: 'commercial'`, `department: 'retail'`

### 2. PurchaseOrderManagement Component (`/frontend/src/pages/PurchaseOrderManagement.tsx`)
- Updated `PurchaseOrder` interface to include all three fields with snake_case values
- Added new "PO Type" column to the table
- Updated table colspan from 7 to 8 columns
- Updated status handling throughout the component
- Updated status colors and messages for new snake_case enum values
- Updated action buttons to work with new status values
- Added search functionality for all fields
- Added display of all fields in the details modal

### 3. CreatePurchaseinvoiceForm Component (`/frontend/src/pages/CreatePurchaseinvoiceForm.tsx`)
- Updated interfaces to include all three fields
- Updated form handling for all fields
- Set appropriate default values

## Migration Scripts

### Update Script for Type and Department (`/api/src/scripts/update-purchase-order-type.ts`)
- Script to update existing purchase orders with missing fields
- Sets default `purchaseOrderType` to 'Commercial'
- Maps existing department values to new format:
  - 'Corporate (Telecom)' → 'Corporate'
  - 'Industrial & Marine (IE)' → 'Industrial & Marine'
  - Invalid/missing departments → 'Retail'
- Provides detailed logging of all updates

### Update Script for Status (`/api/src/scripts/update-purchase-order-status.ts`)
- Script to update existing purchase order statuses to new enum values
- Maps old statuses to new ones:
  - 'draft' → 'Order Under Process'
  - 'sent' → 'Order Under Process'
  - 'confirmed' → 'Approved & Order Sent to SAP'
  - 'partially_received' → 'Partially Invoiced'
  - 'received' → 'Fully Invoiced'
  - 'cancelled' → 'Rejected'
- Sets invalid statuses to 'Order Under Process' as default
- Provides detailed logging and status breakdown

## New Required Fields

### Purchase Order Type
- **Options**: commercial, breakdown_order
- **Default**: commercial
- **Required**: Yes (for new POs)
- **Storage Format**: snake_case (lowercase with underscores)

### Department  
- **Options**: retail, corporate, industrial_marine, others
- **Default**: retail
- **Required**: Yes (for new POs)
- **Storage Format**: snake_case (lowercase with underscores)

### Status
- **Options**: approved_order_sent_sap, credit_not_available, fully_invoiced, order_under_process, partially_invoiced, rejected
- **Default**: order_under_process
- **Required**: Yes (for new POs)
- **Storage Format**: snake_case (lowercase with underscores)

## Data Migration

### Running the Migration
```bash
cd api/src/scripts
npm run ts-node update-all-purchase-order-fields.ts
```

### What the Migration Does

**Comprehensive Field Update:**
1. **Status Field**: Maps old status values to new snake_case enum values
2. **Department Field**: Maps old department values to new snake_case format
3. **Purchase Order Type Field**: Maps old type values to new snake_case format
4. **Default Values**: Sets appropriate defaults for missing fields
5. **Validation**: Ensures all fields have valid values
6. **Reporting**: Provides detailed breakdown of all changes

**Field Value Mappings:**
- Status: 'Approved & Order Sent to SAP' → 'approved_order_sent_sap'
- Status: 'Credit Not Available' → 'credit_not_available'
- Status: 'Fully Invoiced' → 'fully_invoiced'
- Status: 'Order Under Process' → 'order_under_process'
- Status: 'Partially Invoiced' → 'partially_invoiced'
- Status: 'Rejected' → 'rejected'
- Department: 'Retail' → 'retail'
- Department: 'Corporate' → 'corporate'
- Department: 'Industrial & Marine' → 'industrial_marine'
- Department: 'Others' → 'others'
- Purchase Order Type: 'Commercial' → 'commercial'
- Purchase Order Type: 'Breakdown Order' → 'breakdown_order'

## Validation Rules

### Backend Validation
- All three fields are required when creating new purchase orders
- All three fields are optional when updating existing purchase orders
- Values must match the exact enum options

### Frontend Validation
- Form validation ensures all three fields are selected before submission
- Dropdown interfaces prevent invalid selections
- Search functionality works with all fields

## Impact on Existing Data

### Existing Purchase Orders
- Will be updated with default values if fields are missing
- Existing department values will be mapped to new format
- Existing status values will be mapped to new enum values
- No data loss will occur

### New Purchase Orders
- Must have all three fields selected
- Cannot be created without selecting valid options
- Will use the new required field structure

## Testing Recommendations

1. **Test Migration Scripts**: Run on a test database first
2. **Test Form Creation**: Ensure all three fields are required
3. **Test Form Updates**: Ensure all three fields can be modified
4. **Test Status Workflow**: Verify status transitions work correctly
5. **Test Search**: Verify search works with all fields
6. **Test Import**: Verify import functionality works with new fields
7. **Test Validation**: Ensure invalid values are rejected

## Rollback Plan

If issues arise, the changes can be rolled back by:
1. Reverting the model changes
2. Running a reverse migration script
3. Reverting frontend changes
4. Restoring previous validation schemas

## Notes

- All changes maintain backward compatibility for existing data
- The migration scripts handle data transformation automatically from old format to snake_case
- Frontend changes provide a better user experience with dropdowns
- All fields are indexed for optimal query performance
- Status workflow now follows a more logical business process
- **All field values are now stored in snake_case format for consistency and database optimization**
- **Frontend displays user-friendly labels while backend stores snake_case values**
- **Migration script handles all three fields comprehensively in a single run** 