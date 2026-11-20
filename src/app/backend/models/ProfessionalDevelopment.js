'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ProfessionalDevelopment = sequelize.define('ProfessionalDevelopment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Name of the Programme'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  durationDays: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Manually entered duration in days — never auto-calculated'
  },
  organizedBy: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  organizationName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  programType: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  role: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  proofUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  calendarYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Derived strictly from startDate'
  },
  department: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  school: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  campus: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  customFields: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'professional_developments',
  timestamps: true,
  indexes: [
    { fields: ['startDate'] },
    { fields: ['calendarYear'] },
    { fields: ['department'] }
  ]
});

module.exports = ProfessionalDevelopment;
