const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ExchangeRate = sequelize.define('ExchangeRate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  baseCurrency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'USD'
  },
  targetCurrency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'INR'
  },
  rate: {
    type: DataTypes.DECIMAL(14, 6),
    allowNull: false
  },
  effectiveDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  source: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'system_reference'
  },
  isManualOverride: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  updatedBy: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'exchange_rates',
  timestamps: true,
  indexes: [
    {
      fields: ['baseCurrency', 'targetCurrency', 'effectiveDate']
    }
  ]
});

module.exports = ExchangeRate;
