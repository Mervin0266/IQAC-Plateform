const { Sequelize } = require('sequelize');

// Load environment configuration: In test mode, prefer .env.test; otherwise load .env
if (process.env.NODE_ENV === 'test') {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env.test') });
} else {
  require('dotenv').config();
}

let sequelize;
let enableSsl = false;

if (process.env.NODE_ENV === 'test') {
  const testDbUrl = process.env.TEST_DATABASE_URL;
  if (!testDbUrl || !testDbUrl.trim()) {
    throw new Error('SECURITY ABORT: TEST_DATABASE_URL is required when NODE_ENV=test. Refusing to fall back to DATABASE_URL.');
  }

  // Positive verification: Must explicitly target a test database name (e.g. iqac_test or ending with _test)
  const parsedUrl = new URL(testDbUrl);
  const dbName = parsedUrl.pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test') && !dbName.includes('test')) {
    throw new Error(`SECURITY ABORT: Target database '${dbName}' is not a verified test database (must end in '_test'). Refusing to execute.`);
  }

  // Deny remote cloud hosts during testing
  const prohibitedHostSignatures = [
    'render.com', 'onrender.com', 'aws.com', 'amazonaws.com', 'rds',
    'supabase.co', 'railway.app', 'heroku', 'cockroach', 'neon.tech',
    'christuniversity.in'
  ];
  for (const sig of prohibitedHostSignatures) {
    if (parsedUrl.hostname.includes(sig)) {
      throw new Error(`SECURITY ABORT: TEST_DATABASE_URL points to a remote cloud host (${sig}). Refusing to execute.`);
    }
  }

  sequelize = new Sequelize(testDbUrl, {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  const dbUrl = process.env.DATABASE_URL || '';
  const explicitSsl = process.env.DB_SSL;

  if (explicitSsl !== undefined) {
    enableSsl = explicitSsl === 'true' || explicitSsl === 'require';
  } else if (dbUrl) {
    const isLocalHost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
    const disablesSslInUrl = dbUrl.includes('sslmode=disable') || dbUrl.includes('ssl=false');
    enableSsl = !isLocalHost && !disablesSslInUrl;
  } else {
    const isLocalHost = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';
    enableSsl = process.env.NODE_ENV === 'production' && !isLocalHost && process.env.DB_SSL !== 'false';
  }

  const poolMax = parseInt(process.env.DB_POOL_MAX, 10) || 10;
  const poolMin = parseInt(process.env.DB_POOL_MIN, 10) || 0;
  const poolAcquire = parseInt(process.env.DB_POOL_ACQUIRE_MS, 10) || 30000;
  const poolIdle = parseInt(process.env.DB_POOL_IDLE_MS, 10) || 10000;
  const statementTimeout = parseInt(process.env.DB_STATEMENT_TIMEOUT_MS, 10) || 30000;

  const dialectOptions = {};
  if (enableSsl) {
    dialectOptions.ssl = {
      // In production behind managed Cloud DBs (Render/AWS RDS), support strict CA validation if provided
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' || false,
      ...(process.env.DB_CA_CERT && { ca: require('fs').readFileSync(process.env.DB_CA_CERT, 'utf8') })
    };
  }
  // Enforce query statement timeout to prevent runaway queries / resource exhaustion
  dialectOptions.statement_timeout = statementTimeout;

  const poolConfig = {
    max: poolMax,
    min: poolMin,
    acquire: poolAcquire,
    idle: poolIdle
  };

  sequelize = process.env.DATABASE_URL
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions,
        pool: poolConfig
      })
    : new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          dialect: 'postgres',
          logging: process.env.NODE_ENV === 'development' ? console.log : false,
          dialectOptions,
          pool: poolConfig
        }
      );
}

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    if (process.env.NODE_ENV !== 'test') {
      console.log(`✓ Database connection established successfully (SSL: ${enableSsl ? 'enabled' : 'disabled'}).`);
    }
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };
