const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

module.exports = sequelize.define('PublicReport', {
  section: { type: DataTypes.STRING, primaryKey: true },
  period: { type: DataTypes.STRING, primaryKey: true },
  draft: DataTypes.JSONB,
  published: DataTypes.JSONB,
  publishedAt: DataTypes.DATE,
  publishedBy: DataTypes.UUID,
  archivedAt: DataTypes.DATE,
  archivedBy: DataTypes.UUID,
  version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
}, { tableName: 'public_reports' });
