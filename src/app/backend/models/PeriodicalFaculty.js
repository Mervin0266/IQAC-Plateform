'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PeriodicalFaculty = sequelize.define('PeriodicalFaculty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  periodicalId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'periodicals',
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
    allowNull: true
  },
  normalizedEmployeeId: {
    type: DataTypes.STRING(64),
    allowNull: true
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
    allowNull: true
  },
  contributorType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Verified Faculty',
    comment: 'Verified Faculty | Guest Faculty | Unverified Faculty'
  },
  isGuestFaculty: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'periodical_faculties',
  timestamps: true,
  indexes: [
    { fields: ['periodicalId'] },
    { fields: ['facultyId'] },
    { fields: ['employeeId'] },
    { fields: ['normalizedEmployeeId'] }
  ]
});

module.exports = PeriodicalFaculty;
