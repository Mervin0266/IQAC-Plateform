'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Award Model
 *
 * Represents an individual achievement award granted to exactly one faculty member.
 * - Calendar Year is derived strictly from Date of Recognition.
 * - Captures original department/school/campus snapshot at time of record creation.
 * - Links to Faculty Management via facultyId and normalizedEmployeeId.
 */
const Award = sequelize.define('Award', {
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
    comment: 'Original department snapshot at time of award creation'
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
  nameOfRecognition: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: { notEmpty: true }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dateOfRecognition: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  recognisedAgencyType: {
    type: DataTypes.STRING(150),
    allowNull: false,
    validate: { notEmpty: true }
  },
  recognisingAgencyName: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  proofUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  calendarYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Derived strictly from Date of Recognition (e.g. 2025-08-17 -> 2025)'
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
  tableName: 'awards',
  timestamps: true,
  indexes: [
    { fields: ['employeeId'] },
    { fields: ['normalizedEmployeeId'] },
    { fields: ['facultyId'] },
    { fields: ['department'] },
    { fields: ['dateOfRecognition'] },
    { fields: ['calendarYear'] },
    { fields: ['recognisedAgencyType'] }
  ]
});

module.exports = Award;
