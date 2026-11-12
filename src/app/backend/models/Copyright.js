'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Copyright = sequelize.define('Copyright', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { notEmpty: true }
  },
  empIdsRaw: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Normalized comma-separated Employee IDs preserved for traceability (including invalid IDs flagged for correction)'
  },
  dateOfApplication: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  calendarYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Authoritative calendar year derived strictly from Date of Application'
  },
  registrationNo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  diaryNumber: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  dateOfReceipt: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'submitted',
    comment: 'draft, submitted, registered'
  },
  proofUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  proofSourceType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'drive_link, drive_upload, local_upload'
  },
  proofFileId: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  proofFileName: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  proofAccessStatus: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'verified, pending_verification, access_issue'
  },
  proofAccessRemarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hasInvalidEmpIds: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  invalidEmpIds: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  duplicateEmpIds: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  customFields: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'copyrights',
  timestamps: true,
  indexes: [
    { fields: ['dateOfApplication'] },
    { fields: ['calendarYear'] },
    { fields: ['registrationNo'] },
    { fields: ['diaryNumber'] },
    { fields: ['status'] },
    { fields: ['hasInvalidEmpIds'] },
    { fields: ['createdBy'] }
  ]
});

module.exports = Copyright;

