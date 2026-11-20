'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Periodical = sequelize.define('Periodical', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  periodicalName: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  publicationDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  publicationType: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  periodicalType: {
    type: DataTypes.STRING(150),
    allowNull: true,
    comment: 'Type of Periodical'
  },
  url: {
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
    comment: 'Derived strictly from publicationDate'
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
  tableName: 'periodicals',
  timestamps: true,
  indexes: [
    { fields: ['publicationDate'] },
    { fields: ['calendarYear'] },
    { fields: ['department'] }
  ]
});

module.exports = Periodical;
