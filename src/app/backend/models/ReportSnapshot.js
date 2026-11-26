'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ReportSnapshot Model
 * Captures immutable point-in-time report data and calculations, ensuring
 * that Preview, PDF, DOCX, and PPTX exports all render identical verified data.
 */
const ReportSnapshot = sequelize.define('ReportSnapshot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  snapshotId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  reportType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'analytical'
  },
  outputFormat: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pdf'
  },
  scopeConfig: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  contentConfig: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  comparisonConfig: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  stylingConfig: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  reportData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  dataProvenance: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  checksum: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'report_snapshots',
  timestamps: true,
  indexes: [
    { fields: ['snapshotId'], unique: true },
    { fields: ['createdBy'] },
    { fields: ['reportType'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = ReportSnapshot;
