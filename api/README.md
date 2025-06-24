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
   - Ticket TAT reports
   - Inventory valuation
   - Revenue tracking
   - Performance metrics

7. **Admin Settings & Configuration**
   - Master data management
   - System configurations
   - Data import/export capabilities

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
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **File Upload**: Multer
- **Email**: Nodemailer
- **Scheduling**: node-cron

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
   JWT_EXPIRE=7d
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

#### Customer Management
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
├── database/         # Database connection
├── entities/         # Business entities
├── errors/           # Error handling
├── middleware/       # Express middleware
├── models/           # Mongoose models
├── routes/           # API routes
├── schemas/          # Validation schemas
├── services/         # Business logic
├── types/            # TypeScript types
├── utils/            # Utility functions
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
- `JWT_EXPIRE` - JWT expiration time

Optional environment variables:

- `SMTP_HOST` - Email server host
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email password
- `RATE_LIMIT_WINDOW_MS` - Rate limiting window
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Role-Based Access Control** - Granular permissions
- **Rate Limiting** - Protection against abuse
- **CORS Configuration** - Cross-origin resource sharing
- **Helmet Security** - Security headers
- **Input Validation** - Request validation with Joi
- **Error Handling** - Secure error responses

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