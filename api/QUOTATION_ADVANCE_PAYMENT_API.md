# Quotation Advance Payment API Documentation

## Overview
This document describes the API endpoints for managing advance payments on quotations in the Sun Power Services ERP system.

## New Fields Added to Quotation Model

### Advance Payment Fields
- `advanceAmount` (Number, default: 0): The amount paid as advance
- `remainingAmount` (Number, default: 0): The remaining amount to be paid
- `advancePaymentStatus` (String, enum: ['pending', 'partial', 'paid'], default: 'pending'): Current payment status
- `advancePaymentDate` (Date): Date when the advance payment was made
- `advancePaymentMethod` (String): Method of payment (cash, cheque, bank_transfer, upi, card, other)
- `advancePaymentNotes` (String): Additional notes about the payment
- `status` (String, enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], default: 'draft'): Quotation status

## API Endpoints

### 1. Update Quotation Advance Payment
**Endpoint:** `PUT /api/quotations/:id/advance-payment`

**Description:** Updates the advance payment information for a specific quotation.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "advanceAmount": 1000,
  "advancePaymentMethod": "cash",
  "advancePaymentDate": "2024-01-15",
  "advancePaymentNotes": "Advance payment received"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Advance payment updated successfully",
  "data": {
    "quotation": {
      "_id": "quotation_id",
      "quotationNumber": "QTN-001",
      "advanceAmount": 1000,
      "remainingAmount": 500,
      "advancePaymentStatus": "partial",
      "advancePaymentMethod": "cash",
      "advancePaymentDate": "2024-01-15T00:00:00.000Z",
      "advancePaymentNotes": "Advance payment received"
    },
    "advanceAmount": 1000,
    "remainingAmount": 500,
    "advancePaymentStatus": "partial"
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Valid advance amount is required"
}
```

**Response (Error - 404):**
```json
{
  "success": false,
  "message": "Quotation not found"
}
```

### 2. Update Quotation (Includes Advance Payment)
**Endpoint:** `PUT /api/quotations/:id`

**Description:** Updates the entire quotation, including advance payment fields.

**Request Body (Partial):**
```json
{
  "advanceAmount": 1500,
  "advancePaymentMethod": "bank_transfer",
  "advancePaymentNotes": "Updated payment information"
}
```

**Note:** When updating advance payment fields through this endpoint, the system will automatically:
- Calculate the remaining amount
- Update the advance payment status
- Update the quotation status if applicable

### 3. Create Quotation (Includes Advance Payment)
**Endpoint:** `POST /api/quotations`

**Description:** Creates a new quotation with optional advance payment information.

**Request Body (Partial):**
```json
{
  "customer": { "name": "Customer Name" },
  "items": [...],
  "advanceAmount": 500,
  "advancePaymentMethod": "cash"
}
```

**Note:** When creating a quotation with advance payment:
- `remainingAmount` is automatically calculated
- `advancePaymentStatus` is set based on the advance amount
- `status` defaults to 'draft' or 'sent' if advance payment is made

## Business Logic

### Automatic Calculations

1. **Remaining Amount Calculation:**
   ```
   remainingAmount = grandTotal - advanceAmount
   ```

2. **Advance Payment Status:**
   - `pending`: advanceAmount = 0
   - `partial`: 0 < advanceAmount < grandTotal
   - `paid`: advanceAmount >= grandTotal

3. **Quotation Status Updates:**
   - If status is 'draft' and advance payment > 0, status changes to 'sent'

### Validation Rules

1. **Advance Amount:**
   - Must be >= 0
   - Cannot exceed grand total (handled automatically)

2. **Payment Method:**
   - Optional field
   - Common values: cash, cheque, bank_transfer, upi, card, other

3. **Payment Date:**
   - Optional field
   - Should be a valid date

## Example Usage

### Frontend Integration

```typescript
// Update advance payment
const updateAdvancePayment = async (quotationId: string, paymentData: any) => {
  try {
    const response = await apiClient.quotations.update(quotationId, {
      advanceAmount: paymentData.amount,
      advancePaymentMethod: paymentData.method,
      advancePaymentDate: paymentData.date,
      advancePaymentNotes: paymentData.notes
    });
    
    if (response.data.success) {
      // Handle success
      console.log('Payment updated:', response.data.data);
    }
  } catch (error) {
    // Handle error
    console.error('Payment update failed:', error);
  }
};
```

### Backend Testing

Run the test script to verify functionality:
```bash
cd api/src/scripts
npx ts-node test-quotation-advance-payment.ts
```

## Error Handling

The API includes comprehensive error handling:
- **400 Bad Request**: Invalid input data
- **404 Not Found**: Quotation doesn't exist
- **500 Internal Server Error**: Server-side errors

## Security

- All endpoints require authentication (`protect` middleware)
- Users must have 'billing' module access
- Write permission required for payment updates

## Database Schema

The quotation collection now includes these additional fields with proper indexing and validation:

```javascript
{
  advanceAmount: { type: Number, default: 0 },
  remainingAmount: { type: Number, default: 0 },
  advancePaymentStatus: { 
    type: String, 
    enum: ['pending', 'partial', 'paid'], 
    default: 'pending' 
  },
  advancePaymentDate: { type: Date },
  advancePaymentMethod: { type: String },
  advancePaymentNotes: { type: String },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'], 
    default: 'draft' 
  }
}
``` 