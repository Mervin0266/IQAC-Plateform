'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * InternalResearchProject Model
 *
 * Represents university-supported internal research or seed-money projects.
 * Distinct from externally funded Sponsored Projects:
 * - Equal faculty ownership (no PI/Co-PI hierarchy)
 * - Seed Money scheme / program classification
 * - Calendar Year derived exclusively from Start Date
 * - Optional End Date
 * - NO project status field
 */
const InternalResearchProject = sequelize.define('InternalResearchProject', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Title of the internal research / seed money project'
  },
  seedMoney: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Configured internal seed money scheme or program name'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Mandatory commencement date'
  },
  calendarYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Authoritative calendar year derived strictly from startDate'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Optional project completion date'
  },
  duration: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Calculated duration when both Start Date and End Date are available'
  },
  sanctionedAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Total sanctioned seed money / financial grant amount in INR'
  },
  department: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Primary or host department'
  },
  proofUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Web link to proof document (e.g., Google Drive URL)'
  },
  proofDriveFileId: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  proofFileName: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  empIdsRaw: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Original raw comma-separated EmpIDs'
  },
  hasInvalidEmpIds: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  invalidEmpIds: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  duplicateEmpIds: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  approvalStatus: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'approved'
  },
  customFields: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
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
  tableName: 'internal_research_projects',
  timestamps: true,
  indexes: [
    { fields: ['department'] },
    { fields: ['calendarYear'] },
    { fields: ['seedMoney'] },
    { fields: ['startDate'] },
    { fields: ['createdBy'] }
  ]
});

module.exports = InternalResearchProject;
