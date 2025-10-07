# Payment System Setup Guide

This guide will help you set up the complete payment system with Razorpay integration for the Sun Power Services ERP.

## Prerequisites

1. **Razorpay Account**: Sign up at [razorpay.com](https://razorpay.com)
2. **Node.js**: Version 16 or higher
3. **MongoDB**: Running instance
4. **Environment Variables**: Configured properly

## Backend Setup

### 1. Install Dependencies

```bash
cd sun-power-services-erp/api
npm install razorpay
```

### 2. Environment Configuration

Create a `.env` file in the `api` directory with the following variables:

```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/sun-power-erp

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRE=30d

# Server Configuration
PORT=5000
NODE_ENV=development

# Razorpay Configuration
RAZORPAY_KEY_ID=rzp_test_your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 3. Get Razorpay Keys

1. **Test Mode** (Recommended for development):
   - Log into your Razorpay Dashboard
   - Go to Settings → API Keys
   - Generate a new key pair for test mode
   - Copy the Key ID and Key Secret

2. **Live Mode** (For production):
   - Complete KYC verification
   - Generate live mode API keys
   - Update environment variables

### 4. Webhook Configuration

1. In Razorpay Dashboard, go to Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/v1/payments/webhook`
3. Select events: `payment.captured`, `payment.failed`, `order.paid`
4. Copy the webhook secret and add to environment variables

## Frontend Setup

### 1. Install Dependencies

```bash
cd sun-power-services-erp/frontend
npm install razorpay
```

### 2. Environment Configuration

Create a `.env` file in the `frontend` directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api/v1

# Razorpay Configuration
VITE_RAZORPAY_KEY_ID=rzp_test_your_test_key_id
```

### 3. Update Razorpay Key Reference

In `InvoiceManagement.tsx`, update the Razorpay key reference:

```typescript
// Replace this line in processRazorpayPayment function
key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',

// With this
key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID',
```

## Database Setup

The payment system automatically creates the necessary collections:

- `payments`: Stores payment transaction records
- `invoices`: Updated with payment information

## API Endpoints

### Payment Endpoints

- `POST /api/v1/payments/create-order` - Create Razorpay order
- `POST /api/v1/payments/verify` - Verify Razorpay payment
- `POST /api/v1/payments/manual` - Process manual payment
- `GET /api/v1/payments/invoice/:invoiceId` - Get payment history
- `POST /api/v1/payments/webhook` - Razorpay webhook handler

### Invoice Endpoints (Updated)

- `PUT /api/v1/invoices/:id` - Update invoice with payment information

## Usage

### 1. Manual Payment

1. Open an invoice in the Invoice Management page
2. Click "Update Payment"
3. Select "Manual Payment" option
4. Enter payment details (amount, method, date, notes)
5. Click "Update Payment"

### 2. Razorpay Payment

1. Open an invoice in the Invoice Management page
2. Click "Update Payment"
3. Select "Razorpay Gateway" option
4. Enter payment amount
5. Click "Proceed to Payment"
6. Customer will be redirected to Razorpay payment page
7. After successful payment, user will be redirected back

## Security Features

### Backend Security

- **Signature Verification**: All Razorpay payments are verified using HMAC signatures
- **Input Validation**: All payment inputs are validated server-side
- **Amount Validation**: Payment amounts cannot exceed invoice totals
- **Status Tracking**: Comprehensive payment status tracking
- **Error Handling**: Robust error handling for failed payments

### Frontend Security

- **Environment Variables**: Sensitive keys stored in environment variables
- **Input Validation**: Client-side validation for payment amounts
- **Secure Communication**: All API calls use HTTPS
- **User Feedback**: Clear error messages and success confirmations

## Testing

### Test Mode

1. Use Razorpay test keys
2. Test with these card numbers:
   - Success: `4111 1111 1111 1111`
   - Failure: `4000 0000 0000 0002`
3. Use any future expiry date and any 3-digit CVV

### Production Testing

1. Use small amounts for initial testing
2. Monitor webhook events in Razorpay dashboard
3. Check payment records in database
4. Verify invoice status updates

## Troubleshooting

### Common Issues

1. **Payment Verification Failed**
   - Check webhook secret configuration
   - Verify signature calculation
   - Check payment record in database

2. **Razorpay Order Creation Failed**
   - Verify API keys are correct
   - Check amount format (should be in paise)
   - Ensure invoice exists and is valid

3. **Webhook Not Receiving Events**
   - Verify webhook URL is accessible
   - Check webhook secret configuration
   - Monitor webhook logs in Razorpay dashboard

### Debug Mode

Enable debug logging by setting:

```env
NODE_ENV=development
DEBUG=razorpay:*
```

## Monitoring

### Payment Analytics

- Track payment success rates
- Monitor failed payment reasons
- Analyze payment method preferences
- Generate payment reports

### Webhook Monitoring

- Monitor webhook delivery status
- Track webhook processing times
- Alert on webhook failures
- Log all webhook events

## Support

For technical support:

1. Check Razorpay documentation: [docs.razorpay.com](https://docs.razorpay.com)
2. Review application logs
3. Contact development team
4. Check Razorpay support portal

## Production Checklist

- [ ] Use live mode Razorpay keys
- [ ] Configure production webhook URL
- [ ] Set up SSL certificates
- [ ] Configure proper error logging
- [ ] Set up monitoring and alerts
- [ ] Test all payment scenarios
- [ ] Backup payment data
- [ ] Document procedures 