const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConfigurationBackup = sequelize.define('ConfigurationBackup', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  schemaVersion: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: '2.0'
  },
  snapshot: {
    type: DataTypes.JSONB,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  createdByName: {
    type: DataTypes.STRING(200),
    allowNull: false
  }
}, {
  tableName: 'configuration_backups',
  timestamps: true,
  updatedAt: false
});

module.exports = ConfigurationBackup;

