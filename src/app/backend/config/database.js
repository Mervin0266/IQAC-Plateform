const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';
const explicitSsl = process.env.DB_SSL;

let enableSsl = false;

if (explicitSsl !== undefined) {
  enableSsl = explicitSsl === 'true' || explicitSsl === 'require';
} else if (dbUrl) {
  const requiresSslInUrl = dbUrl.includes('sslmode=require') || dbUrl.includes('ssl=true');
  const disablesSslInUrl = dbUrl.includes('sslmode=disable') || dbUrl.includes('ssl=false');
  const isLocalHost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1');
  const isRenderInternal = dbUrl.includes('dpg-') && (!dbUrl.includes('.render.com') || dbUrl.includes('.internal'));

  if (disablesSslInUrl || isLocalHost || isRenderInternal) {
    enableSsl = false;
  } else if (requiresSslInUrl) {
    enableSsl = true;
  } else {
    enableSsl = process.env.NODE_ENV === 'production';
  }
} else {
  enableSsl = process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false';
}

function getDialectOptions(useSsl) {
  return useSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    : {};
}

let currentSsl = enableSsl;

const createSequelizeInstance = (useSsl) => {
  const dialectOptions = getDialectOptions(useSsl);
  if (process.env.DATABASE_URL) {
    return new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    });
  } else {
    return new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );
  }
};

let sequelize = createSequelizeInstance(currentSsl);

const setSslMode = (useSsl) => {
  const opts = getDialectOptions(useSsl);
  sequelize.options.dialectOptions = opts;
  sequelize.config.dialectOptions = opts;
  if (sequelize.connectionManager && sequelize.connectionManager.config) {
    sequelize.connectionManager.config.dialectOptions = opts;
  }
};

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✓ Database connection established successfully (SSL: ${currentSsl ? 'enabled' : 'disabled'}).`);
  } catch (error) {
    console.warn(`! Initial database connection attempt failed (SSL: ${currentSsl ? 'enabled' : 'disabled'}):`, error.message);
    
    // Attempt fallback with inverted SSL setting if error suggests SSL mismatch
    const shouldRetryWithInvertedSsl = 
      error.message.includes('Connection terminated unexpectedly') ||
      error.message.includes('SSL') ||
      error.message.includes('ssl') ||
      error.message.includes('no pg_hba.conf entry');

    if (shouldRetryWithInvertedSsl) {
      const alternateSsl = !currentSsl;
      console.log(`Retrying database connection with SSL: ${alternateSsl ? 'enabled' : 'disabled'}...`);
      setSslMode(alternateSsl);
      try {
        await sequelize.authenticate();
        currentSsl = alternateSsl;
        console.log(`✓ Database connection established successfully on retry (SSL: ${currentSsl ? 'enabled' : 'disabled'}).`);
        return;
      } catch (retryErr) {
        console.error('✗ Database connection retry also failed:', retryErr.message);
      }
    }
    
    console.error('✗ Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };

