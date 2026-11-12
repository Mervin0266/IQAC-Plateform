'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * CopyrightFaculty Model
 *
 * Relational join connecting a single Copyright record to multiple Faculty members.
 * Preserves:
 * - Immutable originalDepartment captured at registration/application time
 * - Live Faculty Management linkage via facultyId / normalizedEmployeeId
 * - Flagged invalid/unrecognized EmpIds (isValid: false, facultyId: null) for correction without rejecting the record
 */
const CopyrightFaculty = sequelize.define('CopyrightFaculty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  copyrightId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'copyrights',
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
  tableName: 'copyright_faculties',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['copyrightId', 'normalizedEmployeeId'],
      name: 'idx_copyright_faculties_copy_emp_unique'
    },
    { fields: ['copyrightId'] },
    { fields: ['facultyId'] },
    { fields: ['employeeId'] },
    { fields: ['normalizedEmployeeId'] },
    { fields: ['originalDepartment'] },
    { fields: ['isValid'] }
  ]
});

module.exports = CopyrightFaculty;

