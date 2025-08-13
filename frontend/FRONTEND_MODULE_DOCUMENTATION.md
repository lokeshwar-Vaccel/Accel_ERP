# Sun Power Services ERP - Module Documentation

## Table of Contents
1. [Dashboard](#dashboard)
2. [Lead Management](#lead-management)
3. [User Management](#user-management)
4. [Product Management](#product-management)
5. [Inventory Management](#inventory-management)
6. [Service Management](#service-management)
7. [AMC Management](#amc-management)
8. [Purchase Orders](#purchase-orders)
9. [Billing](#billing)
10. [Reports & Analytics](#reports--analytics)
11. [File Management](#file-management)
12. [Communications](#communications)
13. [Admin Settings](#admin-settings)
14. [DG Sales](#dg-sales)
15. [Login & Authentication](#login--authentication)

---

## Dashboard

### Overview
The Dashboard module serves as the central hub providing an overview of key business metrics and recent activities.

### Key Features
- **Real-time Statistics**: Displays total users, customers, active AMCs, pending tickets, monthly revenue, and low stock items
- **Recent Activities**: Shows latest system activities with timestamps
- **Quick Navigation**: Direct access to other modules via stat cards
- **Responsive Design**: Adapts to different screen sizes

### Components
- `Dashboard.tsx` - Main dashboard page
- `StatCard.tsx` - Individual metric display cards
- Activity feed with icons and timestamps

### User Flow
1. User logs in and is redirected to dashboard
2. Dashboard loads with authentication check
3. API calls fetch real-time statistics
4. Fallback data displayed if API fails
5. User can click on stat cards to navigate to respective modules

### Technical Implementation
- Uses Redux for state management
- API integration with dashboard endpoints
- Responsive grid layout with Tailwind CSS
- Loading states and error handling

---

## Lead Management

### Overview
The Lead Management module handles customer prospects, lead tracking, and conversion management.

### Key Features
- **Customer Registration**: Add new leads with contact information
- **Lead Status Tracking**: Monitor lead progression (New → Contacted → Qualified → Converted → Lost)
- **Contact History**: Track all interactions with leads
- **Address Management**: Multiple addresses per customer with GST numbers
- **Lead Assignment**: Assign leads to specific team members
- **Lead Source Tracking**: Categorize leads by source

### Components
- `CustomerManagement.tsx` - Main lead management page
- `CustomerForm.tsx` - Add/edit customer form
- `CustomerTable.tsx` - Lead listing with filters
- `ContactHistory.tsx` - Interaction tracking

### User Flow
1. **Add New Lead**:
   - Fill customer details (name, email, phone, address)
   - Select customer type (Telecom/Retail)
   - Choose lead source
   - Assign to team member
   - Save lead

2. **Lead Management**:
   - View all leads in table format
   - Filter by status, type, assigned person
   - Update lead status
   - Add contact history notes
   - Convert lead to customer

3. **Lead Conversion**:
   - Update status to "Converted"
   - Transfer to customer database
   - Create service contracts if applicable

### Data Models
- Customer types: Telecom, Retail
- Lead statuses: New, Contacted, Qualified, Converted, Lost
- Address structure with GST support
- Contact history with timestamps

---

## User Management

### Overview
The User Management module handles system users, roles, permissions, and access control.

### Key Features
- **User CRUD Operations**: Create, read, update, delete users
- **Role-based Access Control**: Super Admin, Admin, HR, Manager, Viewer roles
- **Module Permissions**: Granular access control per module (read/write/admin)
- **User Status Management**: Active/inactive user accounts
- **Profile Management**: User details, contact information
- **Last Login Tracking**: Monitor user activity

### Components
- `UserManagement.tsx` - Main user management page
- `UserForm.tsx` - Add/edit user form
- `UserTable.tsx` - User listing with filters
- `RoleSelector.tsx` - Role assignment component

### User Flow
1. **Create New User**:
   - Enter personal details (name, email, phone)
   - Assign role and permissions
   - Set module access levels
   - Activate account

2. **User Management**:
   - View all users in table format
   - Filter by role, status, department
   - Edit user permissions
   - Deactivate/reactivate accounts
   - Reset passwords

3. **Permission Management**:
   - Configure module access per user
   - Set read/write/admin permissions
   - Bulk permission updates

### Security Features
- Password hashing and validation
- Session management with JWT tokens
- Role-based route protection
- Module-level access control

---

## Product Management

### Overview
The Product Management module handles product catalog, specifications, pricing, and categorization.

### Key Features
- **Product Catalog**: Comprehensive product database
- **Category Management**: Genset, Spare Parts, Accessories
- **Specification Management**: Detailed product specifications
- **Pricing Management**: Cost and selling price tracking
- **Brand & Model Management**: Product identification
- **Warranty Management**: Warranty terms and duration
- **Tag System**: Product categorization and search

### Components
- `ProductManagement.tsx` - Main product management page
- `ProductForm.tsx` - Add/edit product form
- `ProductTable.tsx` - Product listing with filters
- `CategorySelector.tsx` - Product category selection
- `SpecificationEditor.tsx` - Dynamic specification fields

### User Flow
1. **Add New Product**:
   - Enter basic details (name, description, brand)
   - Select category and subcategory
   - Add specifications (key-value pairs)
   - Set pricing and stock levels
   - Configure warranty terms
   - Add tags for categorization

2. **Product Management**:
   - View all products in table format
   - Filter by category, brand, price range
   - Search by name, model number, tags
   - Bulk operations (delete, update status)

3. **Product Updates**:
   - Edit product information
   - Update specifications
   - Modify pricing
   - Change category or tags

### Data Structure
- Product categories with hierarchical structure
- Dynamic specification fields
- Warranty duration and terms
- Tag-based classification system

---

## Inventory Management

### Overview
The Inventory Management module handles stock tracking, locations, movements, and inventory control.

### Key Features
- **Stock Tracking**: Real-time quantity monitoring
- **Location Management**: Multiple warehouse locations
- **Stock Movements**: Inward, outward, transfer, adjustment tracking
- **Reservation System**: Stock reservation for orders
- **Low Stock Alerts**: Automatic notifications
- **Stock Ledger**: Complete transaction history
- **Batch Management**: Lot and expiry tracking

### Components
- `InventoryManagement.tsx` - Main inventory page
- `StockTable.tsx` - Stock listing with filters
- `StockMovement.tsx` - Stock transaction forms
- `LocationManager.tsx` - Warehouse location management
- `StockAlert.tsx` - Low stock notifications

### User Flow
1. **Stock Operations**:
   - **Inward**: Receive stock from suppliers
   - **Outward**: Issue stock for sales/consumption
   - **Transfer**: Move stock between locations
   - **Adjustment**: Correct stock discrepancies
   - **Reservation**: Reserve stock for pending orders

2. **Inventory Management**:
   - View stock levels across all locations
   - Monitor reserved quantities
   - Track stock movements with timestamps
   - Generate stock reports
   - Set reorder points

3. **Location Management**:
   - Add new warehouse locations
   - Configure location capacity
   - Assign contact persons
   - Set location types

### Stock Transactions
- **Inward**: Purchase orders, returns, adjustments
- **Outward**: Sales, consumption, damage
- **Transfer**: Inter-location movements
- **Reservation**: Order-based stock holds
- **Release**: Cancel reservations

---

## Service Management

### Overview
The Service Management module handles service tickets, scheduling, and service delivery tracking.

### Key Features
- **Service Tickets**: Create and track service requests
- **Priority Management**: Low, Medium, High, Urgent priorities
- **Status Tracking**: Open, In Progress, Resolved, Cancelled
- **Assignment System**: Assign tickets to technicians
- **Scheduling**: Plan service visits and maintenance
- **Service Reports**: Document completed work
- **Parts Usage**: Track parts consumed during service

### Components
- `ServiceManagement.tsx` - Main service management page
- `ServiceTicketForm.tsx` - Create/edit service tickets
- `ServiceTable.tsx` - Ticket listing with filters
- `SchedulingCalendar.tsx` - Service visit planning
- `ServiceReport.tsx` - Work completion documentation

### User Flow
1. **Create Service Ticket**:
   - Select customer and product
   - Describe service requirement
   - Set priority and urgency level
   - Assign to technician
   - Schedule service date
   - Add customer notes

2. **Service Execution**:
   - Update ticket status to "In Progress"
   - Record work duration
   - Document parts used
   - Complete service report
   - Update ticket to "Resolved"

3. **Service Management**:
   - View all service tickets
   - Filter by status, priority, technician
   - Monitor service schedules
   - Track completion rates
   - Generate service reports

### Service Types
- **Preventive Maintenance**: Scheduled maintenance
- **Breakdown Service**: Emergency repairs
- **Installation**: New equipment setup
- **Upgrade**: Equipment modifications
- **Inspection**: Regular assessments

---

## AMC Management

### Overview
The AMC (Annual Maintenance Contract) Management module handles maintenance contracts, scheduling, and service delivery.

### Key Features
- **Contract Management**: Create and manage AMC contracts
- **Visit Scheduling**: Plan and track maintenance visits
- **Contract Renewals**: Monitor expiry and renewal dates
- **Service Tracking**: Record completed maintenance work
- **Payment Management**: Track contract payments
- **Performance Monitoring**: Contract compliance tracking

### Components
- `AMCManagement.tsx` - Main AMC management page
- `AMCForm.tsx` - Contract creation/editing
- `ContractRenewal.tsx` - Renewal management
- `VisitScheduler.tsx` - Maintenance visit planning
- `AMCReport.tsx` - Contract performance reports

### User Flow
1. **Create AMC Contract**:
   - Select customer and products
   - Set contract duration (start/end dates)
   - Define scheduled visits count
   - Set contract value and payment terms
   - Assign service technicians

2. **Contract Execution**:
   - Schedule maintenance visits
   - Track visit completion
   - Record service reports
   - Monitor contract compliance
   - Handle contract renewals

3. **AMC Management**:
   - View all active contracts
   - Monitor upcoming visits
   - Track contract performance
   - Generate renewal reminders
   - Analyze contract profitability

### Contract Types
- **Comprehensive AMC**: Full maintenance coverage
- **Basic AMC**: Essential maintenance only
- **Extended Warranty**: Additional warranty coverage
- **Service Level Agreements**: Custom service terms

---

## Purchase Orders

### Overview
The Purchase Orders module manages procurement processes, supplier management, and order tracking.

### Key Features
- **PO Creation**: Generate purchase orders for suppliers
- **Supplier Management**: Maintain supplier database
- **Order Tracking**: Monitor order status and delivery
- **Approval Workflow**: Multi-level approval process
- **Delivery Management**: Track expected vs actual delivery
- **Payment Tracking**: Monitor payment terms and status

### Components
- `PurchaseOrderManagement.tsx` - Main PO management page
- `CreatePurchaseOrder.tsx` - PO creation form
- `POTable.tsx` - Order listing with filters
- `SupplierSelector.tsx` - Supplier selection
- `ApprovalWorkflow.tsx` - Order approval process

### User Flow
1. **Create Purchase Order**:
   - Select supplier and contact details
   - Add products with quantities and prices
   - Set delivery location and dates
   - Define payment terms
   - Submit for approval

2. **Order Processing**:
   - **Draft**: Initial order creation
   - **Pending Approval**: Awaiting manager approval
   - **Approved**: Order confirmed
   - **Ordered**: Sent to supplier
   - **Partially Delivered**: Partial receipt
   - **Delivered**: Complete delivery
   - **Closed**: Order completed

3. **Order Management**:
   - Track order status
   - Monitor delivery schedules
   - Handle partial deliveries
   - Process returns/refunds
   - Generate PO reports

### Purchase Order Types
- **Regular PO**: Standard procurement
- **Emergency PO**: Urgent requirements
- **Blanket PO**: Long-term agreements
- **Contract PO**: Service contracts

---

## Billing

### Overview
The Billing module handles invoice generation, quotation management, and payment processing.

### Key Features
- **Invoice Management**: Create and manage customer invoices
- **Quotation System**: Generate and track quotations
- **Payment Processing**: Handle customer payments
- **Tax Calculation**: GST and other tax computations
- **Payment Links**: Generate payment links for customers
- **Invoice Templates**: Customizable invoice formats

### Components
- `InvoiceManagement.tsx` - Main billing page
- `InvoiceForm.tsx` - Invoice creation/editing
- `QuotationForm.tsx` - Quotation management
- `PaymentPage.tsx` - Customer payment interface
- `PaymentSuccess.tsx` - Payment confirmation

### User Flow
1. **Create Invoice**:
   - Select customer and products/services
   - Set quantities and prices
   - Apply taxes and discounts
   - Generate invoice number
   - Send to customer

2. **Quotation Process**:
   - Create customer quotations
   - Set validity period
   - Convert quotations to invoices
   - Track quotation status

3. **Payment Processing**:
   - Generate payment links
   - Process online payments
   - Track payment status
   - Send payment reminders
   - Handle payment disputes

### Billing Features
- **Advance Payment**: Partial payment processing
- **Installment Plans**: Flexible payment options
- **Credit Management**: Customer credit limits
- **Payment Methods**: Multiple payment options
- **Invoice History**: Complete billing records

---

## Reports & Analytics

### Overview
The Reports & Analytics module provides comprehensive business intelligence and reporting capabilities.

### Key Features
- **Financial Reports**: Revenue, profit, and cost analysis
- **Operational Reports**: Service, inventory, and customer metrics
- **Performance Analytics**: Team and system performance
- **Custom Reports**: User-defined report generation
- **Data Export**: Multiple export formats (PDF, Excel, CSV)
- **Real-time Dashboards**: Live data visualization

### Components
- `ReportsManagement.tsx` - Main reports page
- `ReportGenerator.tsx` - Custom report creation
- `DataVisualization.tsx` - Charts and graphs
- `ExportManager.tsx` - Report export functionality
- `ReportScheduler.tsx` - Automated report generation

### User Flow
1. **Generate Reports**:
   - Select report type and parameters
   - Choose date ranges and filters
   - Generate report data
   - Review and validate results
   - Export in desired format

2. **Report Types**:
   - **Financial**: Revenue, expenses, profitability
   - **Operational**: Service tickets, inventory levels
   - **Customer**: Customer analysis, satisfaction
   - **Performance**: Team productivity, system usage
   - **Custom**: User-defined metrics

3. **Analytics Dashboard**:
   - View key performance indicators
   - Monitor trends and patterns
   - Identify improvement areas
   - Track business metrics
   - Generate insights

### Report Categories
- **Service Reports**: Ticket completion, response times
- **Inventory Reports**: Stock levels, movements, valuation
- **Revenue Reports**: Sales, payments, outstanding amounts
- **Customer Reports**: Customer analysis, satisfaction scores
- **Performance Reports**: Team productivity, system usage

---

## File Management

### Overview
The File Management module handles document storage, organization, and retrieval across the system.

### Key Features
- **Document Upload**: Multiple file format support
- **Category Organization**: File categorization and tagging
- **Version Control**: File version management
- **Access Control**: Permission-based file access
- **Search & Filter**: Advanced file search capabilities
- **Storage Management**: Efficient file storage and retrieval

### Components
- `FileManagement.tsx` - Main file management page
- `FileUpload.tsx` - File upload interface
- `FileBrowser.tsx` - File navigation and search
- `FilePreview.tsx` - File preview and viewing
- `FileSharing.tsx` - File sharing and permissions

### User Flow
1. **File Upload**:
   - Select files for upload
   - Choose category and tags
   - Set access permissions
   - Upload and process files
   - Generate file metadata

2. **File Organization**:
   - Create file categories
   - Apply tags and labels
   - Organize files in folders
   - Set access permissions
   - Manage file versions

3. **File Access**:
   - Search for files by name, category, tags
   - Filter by date, size, type
   - Preview file contents
   - Download or share files
   - Track file usage

### File Categories
- **Documents**: Invoices, contracts, reports
- **Images**: Product photos, service images
- **Videos**: Training materials, service recordings
- **Archives**: Backup files, historical data
- **Templates**: Standard forms and documents

---

## Communications

### Overview
The Communications module manages customer communication, notifications, and messaging across multiple channels.

### Key Features
- **Multi-channel Communication**: Email, SMS, WhatsApp integration
- **Template Management**: Pre-defined message templates
- **Communication History**: Track all customer interactions
- **Automated Notifications**: System-generated alerts
- **Bulk Messaging**: Send messages to multiple recipients
- **Delivery Tracking**: Monitor message delivery status

### Components
- `CommunicationManagement.tsx` - Main communications page
- `MessageComposer.tsx` - Message creation interface
- `TemplateManager.tsx` - Template management
- `CommunicationHistory.tsx` - Message history tracking
- `NotificationCenter.tsx` - System notifications

### User Flow
1. **Send Messages**:
   - Select communication channel
   - Choose recipients
   - Select message template
   - Customize message content
   - Schedule or send immediately

2. **Template Management**:
   - Create message templates
   - Define variables and placeholders
   - Set template categories
   - Manage template versions
   - Test template delivery

3. **Communication Tracking**:
   - Monitor message delivery status
   - Track customer responses
   - Analyze communication effectiveness
   - Generate communication reports
   - Manage customer preferences

### Communication Channels
- **Email**: Formal communications, invoices, reports
- **SMS**: Quick alerts, reminders, confirmations
- **WhatsApp**: Customer support, updates, notifications
- **In-app**: System notifications, alerts

---

## Admin Settings

### Overview
The Admin Settings module provides system configuration, user preferences, and administrative controls.

### Key Features
- **System Configuration**: Global system settings
- **User Preferences**: Individual user settings
- **Module Configuration**: Module-specific settings
- **Security Settings**: Authentication and authorization
- **Backup & Recovery**: System backup management
- **Audit Logs**: System activity tracking

### Components
- `AdminSettings.tsx` - Main admin settings page
- `SystemConfig.tsx` - System configuration
- `UserPreferences.tsx` - User preference management
- `SecuritySettings.tsx` - Security configuration
- `AuditLogs.tsx` - System activity logs

### User Flow
1. **System Configuration**:
   - Set company information
   - Configure business rules
   - Set default values
   - Configure integrations
   - Manage system parameters

2. **User Preferences**:
   - Set personal preferences
   - Configure notifications
   - Set display options
   - Manage dashboard layout
   - Configure language and timezone

3. **Security Management**:
   - Configure authentication methods
   - Set password policies
   - Manage API keys
   - Configure session timeouts
   - Set access restrictions

### Configuration Areas
- **Business Settings**: Company details, tax rates, currencies
- **System Preferences**: Language, timezone, date formats
- **Security Settings**: Password policies, session management
- **Integration Settings**: API configurations, third-party services
- **Notification Settings**: Alert preferences, delivery methods

---

## DG Sales

### Overview
The DG Sales module manages diesel generator sales, quotations, and customer management specifically for DG products.

### Key Features
- **DG Enquiries**: Manage customer inquiries for generators
- **Quotation Management**: Generate and track DG quotations
- **Purchase Order Management**: Handle customer purchase orders
- **Proforma Invoices**: Create proforma invoices for DG sales
- **Invoice Management**: Generate final invoices
- **Customer Management**: DG-specific customer database

### Components
- `DGSales.tsx` - Main DG sales page
- `DGEnquiryForm.tsx` - Customer inquiry management
- `DGQuotationForm.tsx` - DG quotation creation
- `DGPurchaseOrderManagement.tsx` - PO management
- `DGProformaManagement.tsx` - Proforma invoice management
- `DGInvoiceManagement.tsx` - DG invoice management

### User Flow
1. **Customer Inquiry**:
   - Record customer requirements
   - Capture technical specifications
   - Assess customer needs
   - Create inquiry record
   - Assign to sales team

2. **Quotation Process**:
   - Generate technical specifications
   - Calculate pricing and terms
   - Create detailed quotation
   - Send to customer
   - Track quotation status

3. **Sales Process**:
   - Convert quotation to purchase order
   - Process customer PO
   - Generate proforma invoice
   - Handle payment processing
   - Generate final invoice

### DG Sales Features
- **Technical Specifications**: Detailed generator specifications
- **Pricing Models**: Flexible pricing structures
- **Delivery Management**: Installation and commissioning
- **Warranty Management**: DG-specific warranty terms
- **Service Integration**: Post-sales service coordination

---

## Login & Authentication

### Overview
The Login & Authentication module handles user authentication, session management, and security controls.

### Key Features
- **User Authentication**: Secure login system
- **Password Management**: Password reset and recovery
- **Session Management**: JWT token-based sessions
- **Access Control**: Role-based permissions
- **Security Features**: Rate limiting, brute force protection
- **Multi-factor Authentication**: Enhanced security options

### Components
- `LoginForm.tsx` - User login interface
- `ForgotPasswordForm.tsx` - Password recovery
- `ResetPasswordForm.tsx` - Password reset
- `ProtectedRoute.tsx` - Route protection
- `AuthGuard.tsx` - Authentication middleware

### User Flow
1. **User Login**:
   - Enter email and password
   - Validate credentials
   - Generate JWT token
   - Set user session
   - Redirect to dashboard

2. **Password Recovery**:
   - Request password reset
   - Send reset email
   - Validate reset token
   - Set new password
   - Confirm password change

3. **Session Management**:
   - Validate JWT tokens
   - Handle token expiration
   - Manage user permissions
   - Track login history
   - Handle logout process

### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: Bcrypt password encryption
- **Rate Limiting**: Prevent brute force attacks
- **Session Timeout**: Automatic session expiration
- **Audit Logging**: Track authentication events

---

## Technical Architecture

### Frontend Framework
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework

### State Management
- **Redux Toolkit**: Centralized state management
- **React Redux**: React bindings for Redux
- **Async Thunks**: API call management

### Routing
- **React Router v6**: Client-side routing
- **Protected Routes**: Authentication-based access control
- **Dynamic Routing**: Parameter-based navigation

### UI Components
- **Custom Components**: Reusable UI components
- **Lucide Icons**: Modern icon library
- **Responsive Design**: Mobile-first approach
- **Dark/Light Themes**: Theme switching capability

### API Integration
- **Axios**: HTTP client for API calls
- **RESTful APIs**: Standard API communication
- **Error Handling**: Comprehensive error management
- **Loading States**: User experience optimization

### Development Tools
- **ESLint**: Code quality and consistency
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Hot Reload**: Development efficiency

---

## Module Dependencies

### Core Dependencies
- **Authentication**: Required for all protected modules
- **User Management**: Provides user data and permissions
- **Dashboard**: Aggregates data from all modules

### Module Relationships
- **Lead Management** → **Customer Management** → **Service Management**
- **Product Management** → **Inventory Management** → **Purchase Orders**
- **Service Management** → **AMC Management** → **Billing**
- **DG Sales** → **Quotation** → **Purchase Order** → **Invoice**

### Data Flow
1. **User Authentication** → **Permission Check** → **Module Access**
2. **Data Creation** → **Validation** → **Storage** → **Notification**
3. **Process Initiation** → **Workflow Execution** → **Status Updates** → **Reporting**

---

## Best Practices

### Code Organization
- **Feature-based Structure**: Organize by business modules
- **Component Reusability**: Create reusable UI components
- **Type Safety**: Use TypeScript interfaces consistently
- **Error Handling**: Implement comprehensive error management

### Performance Optimization
- **Lazy Loading**: Load modules on demand
- **Memoization**: Optimize component rendering
- **API Caching**: Reduce redundant API calls
- **Bundle Splitting**: Optimize bundle sizes

### Security Considerations
- **Input Validation**: Validate all user inputs
- **XSS Prevention**: Sanitize user-generated content
- **CSRF Protection**: Implement CSRF tokens
- **Secure Storage**: Use secure storage methods

### User Experience
- **Responsive Design**: Mobile-first approach
- **Loading States**: Show progress indicators
- **Error Messages**: Clear and helpful error messages
- **Accessibility**: WCAG compliance standards

---

## Conclusion

This documentation provides a comprehensive overview of the Sun Power Services ERP frontend application. Each module is designed to handle specific business functions while maintaining consistency in user experience and technical implementation.

The application follows modern web development practices with a focus on:
- **Scalability**: Modular architecture for easy expansion
- **Maintainability**: Clean code structure and documentation
- **Security**: Robust authentication and authorization
- **User Experience**: Intuitive interface and smooth workflows
- **Performance**: Optimized rendering and data management

For additional information or specific implementation details, refer to the individual component files and API documentation. 