const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    validate: { notEmpty: true }
  },
  name: {
    type: DataTypes.STRING(120),
    allowNull: false,
    unique: true,
    validate: { notEmpty: true }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Built-in system roles cannot be permanently deleted'
  },
  isSystemAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Grants exclusive System Administration V2.0 privileges'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  defaultScope: {
    type: DataTypes.STRING(32),
    defaultValue: 'department',
    comment: 'university | campus | school | department | own'
  },
  permissions: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'roles',
  timestamps: true
});

module.exports = Role;

