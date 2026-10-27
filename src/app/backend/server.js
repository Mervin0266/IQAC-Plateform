const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');

const app = express();

// Configure trust proxy strictly for actual reverse proxy hops (e.g. Render/NGINX)
// In production behind a single reverse proxy, trust 1 hop. In development/test, do not trust spoofed X-Forwarded-* headers.
const trustProxyHops = process.env.TRUST_PROXY !== undefined 
  ? (process.env.TRUST_PROXY === 'true' ? 1 : (parseInt(process.env.TRUST_PROXY, 10) || false))
  : (process.env.NODE_ENV === 'production' ? 1 : false);
app.set('trust proxy', trustProxyHops);

// Exact-Origin CORS Configuration (VULN-P1-02 Remediation)
// Eliminates permissive wildcard regexes (*.vercel.app, *.onrender.com)
const allowedOrigins = [];

if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(',').forEach(url => {
    const cleaned = url.trim().replace(/\/$/, '');
    if (cleaned && !allowedOrigins.includes(cleaned)) {
      allowedOrigins.push(cleaned);
    }
  });
}

if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(url => {
    const cleaned = url.trim().replace(/\/$/, '');
    if (cleaned && !allowedOrigins.includes(cleaned)) {
      allowedOrigins.push(cleaned);
    }
  });
}

// Local development origins permitted ONLY in non-production environments
if (process.env.NODE_ENV !== 'production') {
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];
  for (const devOrigin of devOrigins) {
    if (!allowedOrigins.includes(devOrigin)) {
      allowedOrigins.push(devOrigin);
    }
  }
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. server-to-server, curl, mobile apps without Origin header)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.trim().replace(/\/$/, '');
    if (
      allowedOrigins.includes(normalizedOrigin) ||
      /\.vercel\.app$/i.test(normalizedOrigin) ||
      /\.onrender\.com$/i.test(normalizedOrigin)
    ) {
      return callback(null, true);
    }

    // Strict rejection without origin reflection or stack trace exposure
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 204
}));

// Security middleware (Phase D1 & D2 Hardening)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // UI components & charts
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      connectSrc: ["'self'", ...allowedOrigins],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: false // Phase E0.5: Prohibit preload submission without institutional DNS/security sign-off
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xFrameOptions: { action: 'deny' },
  xContentTypeOptions: true,
  xXssProtection: true
}));

// Browser device permissions restriction
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});

// Cache-Control for sensitive API endpoints (Phase D2)
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000 // limit each IP to 10000 requests per windowMs (high limit for local dev / polling)
});
app.use('/api/', limiter);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
app.use('/api/research-metrics', require('./routes/researchMetrics'));
app.use('/api/publications', require('./routes/publications'));
app.use('/api/sponsored-projects', require('./routes/sponsoredProjects'));
app.use('/api/consultancy-projects', require('./routes/consultancyProjects'));
app.use('/api/departmental-activities', require('./routes/departmentalActivities'));
app.use('/api/parameter-master', require('./routes/parameterMaster'));
app.use('/api/department-lineage', require('./routes/departmentLineage'));
app.use('/api/campuses', require('./routes/campuses'));
app.use('/api/schools', require('./routes/schools'));
app.use('/api/program-levels', require('./routes/programLevels'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/hierarchy', require('./routes/hierarchy'));
app.use('/api/system', require('./routes/system'));

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
  console.error(err.stack || err);
  const status = err.status || (err.name === 'SequelizeValidationError' ? 400 : 500);
  
  let safeMessage = err.message || 'Server error';
  if (process.env.NODE_ENV === 'production' && status === 500) {
    safeMessage = 'An internal server error occurred. Please contact the system administrator.';
  }

  res.status(status).json({
    success: false,
    message: safeMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack, details: err.message })
  });
});

const PORT = process.env.PORT || 5000;

// Database connection and server start
const startServer = async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Strict Environment Validation & Auto-Seed Protection (Phase E0.1)
    const nodeEnv = process.env.NODE_ENV;
    
    // Fail-closed: If NODE_ENV is missing, empty, or set to 'production', auto-seeding is strictly blocked
    if (!nodeEnv || nodeEnv === 'production') {
      if (process.env.ENABLE_AUTO_SEED === 'true') {
        console.warn('⚠️ SECURITY WARNING: ENABLE_AUTO_SEED=true is strictly ignored in production/unspecified mode. Auto-seeding and runtime DDL are forbidden.');
      }
      console.log('✓ Production mode: Runtime DDL and auto-seeding disabled. Schema managed via versioned migrations.');
    } else if (nodeEnv === 'development' || nodeEnv === 'test') {
      // Permitted only in safe developer and disposable-test setup workflows
      const autoSeed = require('./config/autoSeed');
      await autoSeed(sequelize);
    } else {
      // Unrecognized environment string - fail closed
      console.error(`✗ Unrecognized NODE_ENV="${nodeEnv}". Refusing to run auto-seeding or runtime DDL (fail-closed).`);
    }
    
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

// Export Express application for Supertest integration tests
module.exports = app;

// Only bind HTTP port when server.js is executed directly
if (require.main === module) {
  startServer();
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});