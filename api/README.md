# Sun Power Services ERP - Backend API

A comprehensive Enterprise Resource Planning (ERP) system for Sun Power Services, built with Node.js, TypeScript, Express, and MongoDB.

## Features

### Modules Included

1. **User Management**
   - Role-based access control (RBAC)
   - User CRUD operations
   - Module-based permissions
   - Authentication & Authorization

2. **Customer Relationship Management (CRM)**
   - Lead Management
   - Customer Profiles (Retail/Telecom)
   - Contact History & Follow-ups
   - Lead-to-Customer conversion tracking

3. **Inventory Management**
   - Product Master (Gensets, spare parts, accessories)
   - Multi-location stock management
   - Purchase Orders & Delivery tracking
   - Stock transactions & reconciliation

4. **Service Management**
   - Service ticket creation & tracking
   - Digital service reports with signatures
   - SLA & response time monitoring
   - Parts usage tracking

5. **Annual Maintenance Contracts (AMC)**
   - Contract management & scheduling
   - Auto-generated visit schedules
   - Expiry reminders & notifications
   - Performance tracking

6. **Reports & Analytics**
   - Service ticket analytics with SLA compliance
   - Inventory reports with low stock alerts
   - Revenue analysis (AMC vs Purchase Orders)
   - Customer conversion funnel analytics
   - Performance metrics (individual & team)
   - Custom report builder with filtering
   - Automated report scheduling
   - Export functionality (JSON, CSV, PDF ready)

7. **Admin Settings & Configuration**
   - System settings management (General, Email, SMS, WhatsApp)
   - Email template management with variables
   - Business rules configuration (SLA hours, stock thresholds)
   - Communication provider settings
   - System monitoring and information

8. **File Management**
   - Document upload/download with security
   - Digital signature capture and storage
   - File categorization and tagging
   - Multi-format support (images, PDFs, office docs)
   - Storage statistics and analytics
   - Related entity linking

9. **Communication System**
   - Email notifications with templates
   - SMS messaging integration
   - WhatsApp Business API support
   - Bulk messaging capabilities
   - Message status tracking and delivery confirmations
   - Communication history and analytics

### User Roles

- **Super Admin**: Full system access
- **Admin**: Comprehensive access (subset of Super Admin)
- **HR**: User Management, Inventory, Finance
- **Manager**: All modules except Admin Settings
- **Viewer**: Configurable read-only access

## Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi with comprehensive schemas
- **Security**: Helmet, CORS, Rate Limiting, JWT authentication
- **File Upload**: Multer with file type validation and size limits
- **Email**: Nodemailer (ready for SMTP configuration)
- **SMS**: Integration ready (Twilio, MSG91, etc.)
- **WhatsApp**: Business API integration ready
- **Scheduling**: node-cron (ready for automated reports and notifications)
- **Data Export**: Built-in JSON/CSV export capabilities

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd sun-power-services-erp/api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configurations:
   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/sun-power-services-erp
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   JWT_REMEMBER_ME_EXPIRES_IN=30d
   ```

4. **Start MongoDB**
   ```bash
   mongod
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:5000`

## API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Main Endpoints

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - Register new user (Admin only)
- `GET /auth/me` - Get current user profile
- `PUT /auth/profile` - Update user profile
- `PUT /auth/change-password` - Change password
- `POST /auth/logout` - Logout user

#### User Management
- `GET /users` - Get all users
- `POST /users` - Create new user
- `GET /users/:id` - Get user by ID
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user
- `PUT /users/:id/reset-password` - Reset user password
- `GET /users/stats` - Get user statistics

#### Lead Management
- `GET /customers` - Get all customers
- `POST /customers` - Create new customer
- `GET /customers/:id` - Get customer by ID
- `PUT /customers/:id` - Update customer
- `DELETE /customers/:id` - Delete customer
- `POST /customers/:id/contact` - Add contact history

#### Product Management
- `GET /products` - Get all products
- `POST /products` - Create new product
- `GET /products/:id` - Get product by ID
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product

#### Inventory Management
- `GET /stock/locations` - Get all stock locations
- `POST /stock/locations` - Create stock location
- `GET /stock` - Get stock levels
- `PUT /stock/:productId/:locationId` - Update stock
- `POST /stock/transfer` - Transfer stock between locations

#### Service Management
- `GET /services` - Get all service tickets
- `POST /services` - Create new service ticket
- `GET /services/:id` - Get service ticket by ID
- `PUT /services/:id` - Update service ticket
- `DELETE /services/:id` - Delete service ticket
- `POST /services/:id/assign` - Assign technician to ticket
- `PUT /services/:id/status` - Update ticket status
- `POST /services/:id/parts` - Add parts usage
- `POST /services/:id/report` - Submit service report

#### AMC Management
- `GET /amc` - Get all AMC contracts
- `POST /amc` - Create new AMC contract
- `GET /amc/:id` - Get AMC contract by ID
- `PUT /amc/:id` - Update AMC contract
- `DELETE /amc/:id` - Delete AMC contract
- `POST /amc/:id/visit` - Schedule/record visit
- `GET /amc/:id/visits` - Get contract visit history
- `PUT /amc/:id/renew` - Renew AMC contract

#### Purchase Orders
- `GET /purchase-orders` - Get all purchase orders
- `POST /purchase-orders` - Create new purchase order
- `GET /purchase-orders/:id` - Get purchase order by ID
- `PUT /purchase-orders/:id` - Update purchase order
- `DELETE /purchase-orders/:id` - Delete purchase order
- `PUT /purchase-orders/:id/status` - Update PO status
- `POST /purchase-orders/:id/receive` - Record item receipt

#### Reports & Analytics
- `POST /reports/service-tickets` - Generate service tickets report
- `POST /reports/inventory` - Generate inventory report
- `POST /reports/revenue` - Generate revenue report
- `POST /reports/customers` - Generate customer analytics report
- `POST /reports/performance` - Generate performance report
- `POST /reports/custom` - Generate custom report
- `POST /reports/schedule` - Schedule automated reports
- `GET /reports/schedule` - Get scheduled reports
- `POST /reports/export` - Export report data
- `GET /reports/history` - Get report generation history

#### File Management
- `POST /files/upload` - Upload single file
- `POST /files/upload-multiple` - Upload multiple files
- `POST /files/signature` - Upload digital signature
- `GET /files/:fileId/download` - Download file
- `GET /files/:fileId` - Get file metadata
- `GET /files` - List files with filters
- `DELETE /files/:fileId` - Delete file
- `GET /files/stats/overview` - Get file statistics

#### Admin Settings & Configuration
- `GET /admin/settings` - Get all system settings
- `GET /admin/settings/:key` - Get specific setting
- `PUT /admin/settings/:key` - Update system setting
- `GET /admin/email-templates` - Get email templates
- `POST /admin/email-templates` - Create email template
- `PUT /admin/email-templates/:id` - Update email template
- `DELETE /admin/email-templates/:id` - Delete email template
- `POST /admin/test-email` - Test email configuration
- `GET /admin/system-info` - Get system information

#### Communications
- `POST /communications/email/send` - Send email
- `POST /communications/sms/send` - Send SMS
- `POST /communications/whatsapp/send` - Send WhatsApp message
- `GET /communications/:type/:messageId/status` - Get message status
- `GET /communications/history` - Get message history
- `POST /communications/bulk-send` - Send bulk notifications
- `GET /communications/stats` - Get communication statistics

#### Dashboard
- `GET /dashboard/overview` - Get dashboard overview statistics
- `GET /dashboard/recent-activities` - Get recent activities
- `GET /dashboard/performance-metrics` - Get performance metrics
- `GET /dashboard/alerts` - Get system alerts

### Response Format

All API responses follow this structure:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

### Error Handling

Error responses include:
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm test` - Run tests

### Project Structure

```
src/
├── config/           # Configuration files
├── controllers/      # Route controllers
│   ├── authController.ts
│   ├── userController.ts
│   ├── customerController.ts
│   ├── productController.ts
│   ├── stockController.ts
│   ├── serviceController.ts
│   ├── amcController.ts
│   ├── purchaseOrderController.ts
│   ├── dashboardController.ts
│   ├── reportController.ts        # ✨ NEW
│   ├── fileController.ts          # ✨ NEW
│   ├── adminController.ts         # ✨ NEW
│   └── communicationController.ts # ✨ NEW
├── database/         # Database connection
├── entities/         # Business entities
├── errors/           # Error handling
├── middleware/       # Express middleware
├── models/           # Mongoose models
├── routes/           # API routes
│   ├── auth.ts
│   ├── users.ts
│   ├── customers.ts
│   ├── products.ts
│   ├── stock.ts
│   ├── services.ts
│   ├── amc.ts
│   ├── purchaseOrders.ts
│   ├── dashboard.ts
│   ├── reports.ts         # ✨ NEW
│   ├── files.ts           # ✨ NEW
│   ├── admin.ts           # ✨ NEW
│   ├── communications.ts  # ✨ NEW
│   └── index.ts
├── schemas/          # Validation schemas
├── services/         # Business logic
├── types/            # TypeScript types
├── utils/            # Utility functions
├── uploads/          # File storage directory # ✨ NEW
└── index.ts          # Application entry point
```

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for code formatting
- Write descriptive commit messages
- Add JSDoc comments for functions

## Deployment

### Production Build

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Set production environment variables**
   ```bash
   export NODE_ENV=production
   export MONGODB_URI=your-production-mongodb-uri
   export JWT_SECRET=your-production-jwt-secret
   ```

3. **Start the production server**
   ```bash
   npm start
   ```

### Environment Variables

Required environment variables:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_EXPIRES_IN` - JWT expiration time for normal login (default: 7d)
- `JWT_REMEMBER_ME_EXPIRES_IN` - JWT expiration time for remember me login (default: 30d)

Optional environment variables:

**Email Configuration:**
- `SMTP_HOST` - Email server host
- `SMTP_PORT` - Email server port (default: 587)
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password
- `EMAIL_FROM_NAME` - Sender name for emails
- `EMAIL_FROM_ADDRESS` - Sender email address

**SMS Configuration:**
- `SMS_PROVIDER` - SMS provider (twilio, msg91, etc.)
- `SMS_API_KEY` - SMS service API key
- `SMS_SENDER_ID` - SMS sender ID

**WhatsApp Configuration:**
- `WHATSAPP_API_URL` - WhatsApp Business API URL
- `WHATSAPP_ACCESS_TOKEN` - WhatsApp access token
- `WHATSAPP_PHONE_NUMBER_ID` - WhatsApp phone number ID

**Security & Performance:**
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window (default: 15 minutes)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 100)
- `FILE_UPLOAD_MAX_SIZE` - Maximum file upload size (default: 10MB)
- `ALLOWED_FILE_TYPES` - Comma-separated list of allowed MIME types

## Advanced Features

### 📊 **Comprehensive Reporting System**
- **Real-time Analytics**: Service tickets, inventory, revenue, and performance
- **Custom Report Builder**: Flexible filtering, grouping, and data visualization
- **Automated Scheduling**: Set up recurring reports with email delivery
- **Multiple Export Formats**: JSON, CSV, PDF-ready data structures
- **SLA Compliance Tracking**: Monitor response times and performance metrics

### 📁 **File Management System**
- **Secure Upload/Download**: Multi-format support with access controls
- **Digital Signatures**: Capture and store customer signatures
- **Document Organization**: Categorization, tagging, and entity linking
- **Storage Analytics**: Track usage, file types, and storage statistics

### 📱 **Multi-Channel Communication**
- **Email Notifications**: Template-based with variable substitution
- **SMS Integration**: Ready for Twilio, MSG91, and other providers
- **WhatsApp Business**: Automated messaging and notifications
- **Bulk Operations**: Send notifications to multiple recipients
- **Delivery Tracking**: Monitor message status and delivery confirmations

### ⚙️ **Advanced Admin Controls**
- **System Configuration**: Centralized settings management
- **Email Templates**: Rich template editor with dynamic variables
- **Business Rules**: Configurable SLA hours, stock thresholds, reminders
- **System Monitoring**: Real-time system information and health checks

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access Control** - Granular permissions by module
- **File Security** - Access controls and MIME type validation
- **Rate Limiting** - Protection against abuse
- **CORS Configuration** - Cross-origin resource sharing
- **Helmet Security** - Security headers
- **Input Validation** - Request validation with Joi
- **Error Handling** - Secure error responses
- **Data Sanitization** - SQL injection and XSS protection

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software for Sun Power Services.

## Support

For support and questions, please contact the development team.

---

**Sun Power Services ERP** - Building efficient business management solutions. 