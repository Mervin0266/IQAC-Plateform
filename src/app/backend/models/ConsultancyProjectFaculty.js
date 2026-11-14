'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ConsultancyProjectFaculty Model
 *
 * Relational join connecting a single ConsultancyProject record to multiple Faculty owners.
 * Preserves:
 * - Immutable originalDepartment captured at creation/assignment time
 * - Live Faculty Management linkage via facultyId / normalizedEmployeeId
 * - Flagged invalid/unrecognized EmpIds (isValid: false, facultyId: null) for correction without rejecting the record
 */
const ConsultancyProjectFaculty = sequelize.define('ConsultancyProjectFaculty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'consultancy_projects',
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
    allowNull: false,
    comment: 'Actual trimmed Employee ID preserving leading zeros'
  },
  normalizedEmployeeId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'Uppercased trimmed Employee ID key for deduplication and matching'
  },
  facultyName: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'consultancy_project_faculties',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['projectId', 'normalizedEmployeeId'],
      name: 'idx_consultancy_faculties_proj_emp_unique'
    },
    { fields: ['projectId'] },
    { fields: ['facultyId'] },
    { fields: ['employeeId'] },
    { fields: ['normalizedEmployeeId'] },
    { fields: ['originalDepartment'] },
    { fields: ['isValid'] }
  ]
});

module.exports = ConsultancyProjectFaculty;
