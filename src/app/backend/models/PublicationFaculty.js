const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * PublicationFaculty Model
 * 
 * Represents an association between a verified faculty member and a scholarly publication.
 * Enables:
 * - One unique publication record in the platform.
 * - Multiple verified faculty members associated with that publication.
 * - Uniqueness enforcement on (publicationId, employeeId).
 * - Safe auditing, department derivation, and source file tracking.
 */
const PublicationFaculty = sequelize.define('PublicationFaculty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  publicationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'publications',
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
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Normalized string Employee ID with preserved leading zeros'
  },
  facultyName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Snapshot of verified faculty member name'
  },
  department: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Verified department derived from faculty master directory'
  },
  sourceFile: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Name of the source spreadsheet file (e.g. 2043_Adarsh_S_V.xlsx)'
  },
  indexing: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'Scopus',
    comment: 'Indexing source for this file (Scopus, WoS, Scopus & WoS, etc.)'
  }
}, {
  tableName: 'publication_faculties',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['publicationId', 'employeeId'],
      name: 'idx_publication_faculties_pub_emp_unique'
    },
    { fields: ['employeeId'] },
    { fields: ['department'] },
    { fields: ['facultyId'] },
    { fields: ['publicationId'] }
  ]
});

module.exports = PublicationFaculty;

