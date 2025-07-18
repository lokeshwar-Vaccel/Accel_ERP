# Comprehensive Quotation System Documentation

## Overview

The Sun Power Services Quotation System is a production-ready solution that handles complex quotation generation with comprehensive validation, accurate financial calculations, and seamless user experience. The system ensures data integrity, compliance with business rules, and supports flexible item configuration.

## Architecture

### Backend Components

#### 1. Quotation Controller (`quotationController.ts`)
- **Primary Functions:**
  - `createQuotation()` - Creates new quotations with validation
  - `createQuotationFromImage()` - Creates quotations from image data
  - `getQuotationById()` - Retrieves specific quotations
  - `getQuotations()` - Lists quotations with pagination
  - `updateQuotation()` - Updates existing quotations
  - `deleteQuotation()` - Deletes quotations

#### 2. Quotation Service (`quotationService.ts`)
- **Core Business Logic:**
  - `validateQuotationData()` - Comprehensive validation
  - `calculateQuotationTotals()` - Financial calculations
  - `sanitizeQuotationData()` - Data sanitization
  - `generateQuotationFromInvoice()` - Invoice to quotation conversion
  - `generateQuotationHTML()` - HTML generation
  - `generateQuotationPDF()` - PDF generation

#### 3. Quotation Model (`Quotation.ts`)
- **Data Structure:**
  - Customer information (name, email, phone, address, PAN)
  - Company details (name, address, phone, email, PAN, bank details)
  - Items array with product details
  - Financial calculations (subtotal, discounts, taxes, totals)
  - Metadata (quotation number, dates, validity period)

### Frontend Components

#### 1. Quotation Utilities (`quotationUtils.ts`)
- **Validation Functions:**
  - `validateQuotationData()` - Frontend validation
  - `calculateQuotationTotals()` - Client-side calculations
  - `sanitizeQuotationData()` - Data sanitization
  - `getFieldErrorMessage()` - Error message mapping

#### 2. Quotation Form (`QuotationForm.tsx`)
- **Features:**
  - Real-time validation
  - Dynamic calculations
  - Customer and product selection
  - Item management (add/remove/update)
  - Error handling and user feedback

## Validation Rules

### Mandatory Fields

#### Customer Information
- **Name:** Required, non-empty string
- **Address:** Required, non-empty string
- **Email:** Optional, but must be valid format if provided
- **Phone:** Optional, but must be valid format if provided
- **PAN:** Optional

#### Company Information
- **Name:** Required, non-empty string
- **Address:** Required, non-empty string
- **Phone:** Required, non-empty string
- **Email:** Required, valid email format
- **PAN:** Optional

#### Items
- **Product:** Required, non-empty string
- **Description:** Required, non-empty string
- **Quantity:** Required, greater than 0
- **Unit Price:** Required, non-negative
- **Discount:** Optional, between 0-100%
- **Tax Rate:** Optional, between 0-100%
- **UOM:** Required, non-empty string

### Financial Validation
- **Grand Total:** Must be greater than 0
- **Subtotal:** Calculated as sum of (quantity × unit price)
- **Discounts:** Applied as percentage of subtotal
- **Taxes:** Applied to discounted amount
- **Rounding:** Grand total rounded to nearest rupee

## Calculation Logic

### Item-Level Calculations
```javascript
const itemSubtotal = quantity × unitPrice;
const discountAmount = (discountRate / 100) × itemSubtotal;
const discountedAmount = itemSubtotal - discountAmount;
const taxAmount = (taxRate / 100) × discountedAmount;
const totalPrice = discountedAmount + taxAmount;
```

### Quotation-Level Calculations
```javascript
const subtotal = sum(itemSubtotals);
const totalDiscount = sum(discountAmounts);
const totalTax = sum(taxAmounts);
const grandTotalBeforeRound = subtotal - totalDiscount + totalTax;
const grandTotal = Math.round(grandTotalBeforeRound);
const roundOff = grandTotal - grandTotalBeforeRound;
```

## API Endpoints

### Create Quotation
```
POST /api/v1/quotations
```
**Request Body:**
```json
{
  "customer": {
    "name": "Customer Name",
    "email": "customer@example.com",
    "phone": "+91 9876543210",
    "address": "Customer Address",
    "pan": "ABCDE1234F"
  },
  "company": {
    "name": "Company Name",
    "address": "Company Address",
    "phone": "+91 9176660123",
    "email": "company@example.com",
    "pan": "33BLFPS9951M1ZC"
  },
  "items": [
    {
      "product": "Product ID",
      "description": "Product Description",
      "quantity": 1,
      "unitPrice": 100.00,
      "discount": 5,
      "taxRate": 18,
      "uom": "nos"
    }
  ],
  "notes": "Additional notes",
  "terms": "Payment terms",
  "validityPeriod": 30
}
```

### Create from Image
```
POST /api/v1/quotations/from-image
```
Creates quotation with hardcoded image data.

### Get Quotations
```
GET /api/v1/quotations?page=1&limit=10
```

### Get Specific Quotation
```
GET /api/v1/quotations/:id
```

### Update Quotation
```
PUT /api/v1/quotations/:id
```

### Delete Quotation
```
DELETE /api/v1/quotations/:id
```

## Error Handling

### Validation Errors
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "customer.name",
      "message": "Customer name is required"
    },
    {
      "field": "items[0].quantity",
      "message": "Quantity must be greater than 0"
    }
  ]
}
```

### Database Errors
- **Duplicate Quotation Number:** Returns 400 with appropriate message
- **Invalid ObjectId:** Returns 404 with "Quotation not found"
- **Validation Errors:** Returns 400 with detailed error messages

## Testing

### Running Tests
```bash
# Run comprehensive test suite
node test-quotation-comprehensive.js

# Test specific functionality
node test-quotation.js
```

### Test Coverage
- ✅ Authentication
- ✅ Valid quotation creation
- ✅ Invalid data validation
- ✅ Calculation accuracy
- ✅ Image-based quotation creation
- ✅ CRUD operations
- ✅ Error handling

## Usage Examples

### 1. Create Basic Quotation
```javascript
const quotationData = {
  customer: {
    name: "M/S.AU Small Finance",
    email: "contact@ausmallfinance.com",
    phone: "+91 9876543210",
    address: "Sewaartham Enterprises Pvt Ltd, Chennai",
    pan: "ABCDE1234F"
  },
  company: {
    name: "Sun Power Services",
    address: "Plot no 1, Phase 1, Chennai",
    phone: "+91 9176660123",
    email: "24x7powerolservice@gmail.com",
    pan: "33BLFPS9951M1ZC"
  },
  items: [
    {
      product: "507338A",
      description: "POWEROL SUPER PREMIUM ENGINE OIL",
      quantity: 9.75,
      unitPrice: 274.58,
      discount: 5,
      taxRate: 18,
      uom: "Ltr"
    }
  ],
  validityPeriod: 30
};

const response = await apiClient.quotations.create(quotationData);
```

### 2. Create from Image Data
```javascript
const response = await apiClient.quotations.createFromImage();
```

### 3. Validate Data
```javascript
import { validateQuotationData } from '../utils/quotationUtils';

const validationResult = validateQuotationData(quotationData);
if (!validationResult.isValid) {
  console.log('Validation errors:', validationResult.errors);
}
```

### 4. Calculate Totals
```javascript
import { calculateQuotationTotals } from '../utils/quotationUtils';

const calculationResult = calculateQuotationTotals(items);
console.log('Grand Total:', calculationResult.grandTotal);
```

## Security Features

### Input Sanitization
- All string inputs are trimmed
- Numbers are validated and converted
- Email and phone formats are validated
- XSS prevention through proper encoding

### Authentication
- JWT token required for all operations
- Role-based access control
- Permission checking for different operations

### Data Validation
- Server-side validation for all inputs
- Client-side validation for immediate feedback
- Comprehensive error messages
- Type checking and format validation

## Performance Optimizations

### Backend
- Efficient database queries with proper indexing
- Caching for frequently accessed data
- Optimized calculation algorithms
- Connection pooling for database

### Frontend
- Real-time calculations without server calls
- Debounced input validation
- Efficient state management
- Optimized re-renders

## Business Rules

### Quotation Number Generation
- Automatic generation using `generateReferenceId('quotation')`
- Format: `QT{date}-{letter}-{sequence}`
- Example: `QT250627-A-000001`

### Validity Period
- Default: 30 days
- Configurable: 1-365 days
- Automatically sets `validUntil` date

### Financial Calculations
- All calculations rounded to 2 decimal places
- Grand total rounded to nearest rupee
- Round-off amount tracked separately
- Tax calculated on discounted amount

### Item Management
- Minimum 1 item required
- Maximum items: No limit
- Product selection from existing catalog
- Dynamic pricing and discount application

## Troubleshooting

### Common Issues

#### 1. Validation Errors
**Problem:** Quotation creation fails with validation errors
**Solution:** Check all required fields and ensure data formats are correct

#### 2. Calculation Discrepancies
**Problem:** Totals don't match expected values
**Solution:** Verify tax and discount rates are within 0-100% range

#### 3. Authentication Issues
**Problem:** API calls return 401 errors
**Solution:** Ensure valid JWT token is provided in Authorization header

#### 4. Database Errors
**Problem:** Quotation number already exists
**Solution:** System automatically generates unique numbers, retry the request

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG=quotation:*
```

## Future Enhancements

### Planned Features
- [ ] Email integration for quotation sending
- [ ] PDF generation with custom templates
- [ ] Bulk quotation operations
- [ ] Advanced reporting and analytics
- [ ] Mobile app integration
- [ ] Multi-currency support
- [ ] Digital signature integration

### Performance Improvements
- [ ] Redis caching for frequently accessed data
- [ ] Database query optimization
- [ ] Frontend bundle size reduction
- [ ] API response compression

## Support

For technical support or questions about the quotation system:
- Email: support@sunpowerservices.com
- Documentation: [Internal Wiki]
- Issue Tracking: [GitHub Issues]

---

**Last Updated:** December 2024
**Version:** 1.0.0
**Maintainer:** Development Team 