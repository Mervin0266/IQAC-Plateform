const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConfigurationVersion = sequelize.define('ConfigurationVersion', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  configId: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  versionNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  entityType: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  entityName: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  previousConfig: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  newConfig: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  adminUserId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  adminIdentity: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  changeStatus: {
    type: DataTypes.STRING(24),
    allowNull: false,
    defaultValue: 'applied',
    validate: {
      isIn: [['applied', 'reverted', 'failed']]
    }
  }
}, {
  tableName: 'configuration_versions',
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['configId'] },
    { fields: ['entityType'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = ConfigurationVersion;

