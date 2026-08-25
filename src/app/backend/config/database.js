const { Sequelize } = require('sequelize');
require('dotenv').config();

const dbUrl = process.env.DATABASE_URL || '';
const explicitSsl = process.env.DB_SSL;

let enableSsl = false;

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

const dialectOptions = enableSsl
  ? {
      ssl: {
        rejectUnauthorized: false
      }
    }
  : {};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      dialectOptions,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
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
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000
        }
      }
    );

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✓ Database connection established successfully (SSL: ${enableSsl ? 'enabled' : 'disabled'}).`);
  } catch (error) {
    console.error('✗ Unable to connect to the database:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, testConnection };


