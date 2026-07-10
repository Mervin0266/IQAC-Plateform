const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');

const app = express();

// CORS
const clientUrl = process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, '') : null;
const clientUrlWithSlash = clientUrl ? `${clientUrl}/` : null;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    clientUrl,
    clientUrlWithSlash
  ].filter(Boolean),
  credentials: true
}));

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000 // limit each IP to 10000 requests per windowMs (high limit for local dev / polling)
});
app.use('/api/', limiter);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/achievements', require('./routes/achievements'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/patents', require('./routes/patents'));
app.use('/api/placements', require('./routes/placements'));
app.use('/api/strategic-plans', require('./routes/strategicPlans'));
app.use('/api/edit-requests', require('./routes/editRequests'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/students', require('./routes/students'));
app.use('/api/faculty', require('./routes/faculty'));
app.use('/api/departments', require('./routes/departments'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'IQAC Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync database (in production, use migrations)
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✓ Database synchronized');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`✓ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
      console.log(`✓ Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('✗ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});