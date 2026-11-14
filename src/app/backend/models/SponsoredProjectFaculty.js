'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * SponsoredProjectFaculty Model
 *
 * Relational join connecting a SponsoredProject (External Research) to multiple Faculty investigators:
 * - Position 0 determines role: 'PI' (Principal Investigator)
 * - Position 1+ determines role: 'Co-PI' (Co-Investigator)
 *
 * Preserves:
 * - Immutable originalDepartment captured at creation/assignment time
 * - Live Faculty Management linkage via facultyId / normalizedEmployeeId
 * - Flagged invalid/unrecognized EmpIds (isValid: false, facultyId: null) for correction without dropping records
 */
const SponsoredProjectFaculty = sequelize.define('SponsoredProjectFaculty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sponsored_projects',
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
    comment: 'Trimmed Employee ID preserving leading zeros'
  },
  normalizedEmployeeId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: 'Uppercased trimmed Employee ID key for matching'
  },
  role: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'PI',
    comment: 'PI (Principal Investigator) or Co-PI (Co-Investigator)'
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
    comment: 'Historical/creation department snapshot'
  },
  originalDepartmentSource: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'creation_snapshot',
    comment: 'creation_snapshot | verified_history | unrecognized'
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
  tableName: 'sponsored_project_faculties',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['projectId', 'normalizedEmployeeId'],
      name: 'idx_sponsored_faculties_proj_emp_unique'
    },
    { fields: ['projectId'] },
    { fields: ['facultyId'] },
    { fields: ['role'] },
    { fields: ['originalDepartment'] },
    { fields: ['isValid'] }
  ]
});

module.exports = SponsoredProjectFaculty;
