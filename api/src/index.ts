import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { createServer } from 'http';

import { connectDB } from './database/connection';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import routes from './routes';
import createSampleData from './scripts/seed';
import socketService from './services/socketService';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();

// Create HTTP server for Socket.IO
const server = createServer(app);

// Set security headers
app.use(helmet());

// Enable CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourfrontenddomain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Rate limiting (more lenient in development)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '') || (process.env.NODE_ENV === 'development' ? 1000 : 100), // Configurable via env
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and certain routes
    return req.path === '/health' || req.path === '/api/v1/health';
  }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sun Power Services ERP API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize Socket.IO for real-time notifications
    socketService.initialize(server);
    console.log('✅ Socket.IO service initialized');

    // WebSocket-only notification system
    console.log('📡 All notifications are now real-time via WebSocket only');

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      console.log(`📡 API Documentation: http://localhost:${PORT}/api/v1`);
      console.log(`🔌 WebSocket server ready for real-time notifications`);
      console.log(`📱 Real-time notifications enabled via WebSocket`);
      // createSampleData(); 
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('Unhandled Promise Rejection:', err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

startServer(); 