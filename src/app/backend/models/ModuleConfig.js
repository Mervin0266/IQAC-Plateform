const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ModuleConfig = sequelize.define('ModuleConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  moduleKey: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true
  },
  moduleName: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  routeKey: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  tableNameRef: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  isEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  isCritical: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'Critical platform modules cannot be disabled'
  },
  dependencies: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  affectedRoutes: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  lastChangedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastChangedBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'module_configs',
  timestamps: true
});

module.exports = ModuleConfig;

