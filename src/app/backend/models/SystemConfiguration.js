const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemConfiguration = sequelize.define('SystemConfiguration', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  configKey: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  category: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  label: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  value: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'system_configurations',
  timestamps: true
});

module.exports = SystemConfiguration;

