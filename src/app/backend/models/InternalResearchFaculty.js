'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * InternalResearchFaculty Model
 *
 * Relational join connecting an InternalResearchProject to multiple equal faculty associations:
 * - All associated faculty members are treated equally (no PI/Co-PI hierarchy)
 * - Preserves immutable originalDepartment creation snapshot
 * - Live Faculty Management linkage via facultyId / normalizedEmployeeId
 * - Flags invalid EmpIds for user correction
 */
const InternalResearchFaculty = sequelize.define('InternalResearchFaculty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'internal_research_projects',
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
  tableName: 'internal_research_faculties',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['projectId', 'normalizedEmployeeId'],
      name: 'idx_internal_faculties_proj_emp_unique'
    },
    { fields: ['projectId'] },
    { fields: ['facultyId'] },
    { fields: ['originalDepartment'] },
    { fields: ['isValid'] }
  ]
});

module.exports = InternalResearchFaculty;
