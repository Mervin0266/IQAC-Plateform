'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * PatentFaculty Model
 *
 * Relational join connecting a single Patent record to multiple Faculty inventors.
 * Preserves:
 * - Immutable originalDepartment captured at filing/creation time
 * - Live Faculty Management linkage via facultyId / normalizedEmployeeId
 * - Flagged invalid/unrecognized EmpIds (isValid: false, facultyId: null) for correction without rejecting the record
 */
const PatentFaculty = sequelize.define('PatentFaculty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patents',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
    allowNull: true,
    comment: 'Actual trimmed Employee ID preserving leading zeros (null for Guest Faculty)'
  },
  normalizedEmployeeId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: 'Uppercased trimmed Employee ID key for deduplication and matching (null for Guest Faculty)'
  },
  facultyName: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isGuestFaculty: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  facultyType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Faculty',
    comment: 'Faculty | Guest Faculty'
  },
  designation: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  originalDepartment: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Immutable historical/creation department snapshot for the faculty member'
  },
  originalDepartmentSource: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'creation_snapshot',
    comment: 'verified_history | academic_year_record | creation_snapshot | unrecognized'
  },
  isValid: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'patent_faculties',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['patentId', 'normalizedEmployeeId'],
      name: 'idx_patent_faculties_pat_emp_unique'
    },
    { fields: ['patentId'] },
    { fields: ['facultyId'] },
    { fields: ['employeeId'] },
    { fields: ['normalizedEmployeeId'] },
    { fields: ['originalDepartment'] },
    { fields: ['isValid'] }
  ]
});

module.exports = PatentFaculty;

