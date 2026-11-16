'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * EContent Model
 *
 * Represents an individual e-content/digital learning resource created by exactly one faculty member.
 * - Calendar Year is derived strictly from Publication Date.
 * - Captures original department/school/campus snapshot at time of record creation.
 * - Links to Faculty Management via facultyId and normalizedEmployeeId.
 */
const EContent = sequelize.define('EContent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  facultyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'faculties',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  employeeId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'Exact Employee ID string preserving leading zeros'
  },
  normalizedEmployeeId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'Normalized uppercase Employee ID for deduplication and matching'
  },
  facultyName: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  designation: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  department: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Original department snapshot at time of e-content creation'
  },
  originalDepartment: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  originalDepartmentSource: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'creation_snapshot'
  },
  school: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  campus: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { notEmpty: true }
  },
  eContentPlatform: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: { notEmpty: true }
  },
  publicationDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { notEmpty: true }
  },
  contentType: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: { notEmpty: true }
  },
  proofUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  calendarYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Derived strictly from Publication Date (e.g. 2024-11-09 -> 2024)'
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
    },
    onDelete: 'SET NULL'
  }
}, {
  tableName: 'e_contents',
  timestamps: true,
  indexes: [
    { fields: ['employeeId'] },
    { fields: ['normalizedEmployeeId'] },
    { fields: ['facultyId'] },
    { fields: ['department'] },
    { fields: ['publicationDate'] },
    { fields: ['calendarYear'] },
    { fields: ['eContentPlatform'] },
    { fields: ['contentType'] }
  ]
});

module.exports = EContent;
