const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  recordId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  achievementTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  userRole: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  previousValue: {
    type: DataTypes.JSON,
    allowNull: true
  },
  updatedValue: {
    type: DataTypes.JSON,
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // System Administration V2.0 Structured Fields
  adminUserId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  adminIdentity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  module: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  entity: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  affectedRecordId: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  result: {
    type: DataTypes.STRING(24),
    allowNull: true,
    defaultValue: 'Success'
  },
  correlationId: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  updatedAt: false // Only createdAt is needed for audit logs
});

module.exports = AuditLog;
