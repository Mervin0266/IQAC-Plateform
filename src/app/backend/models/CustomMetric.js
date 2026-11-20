'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CustomMetric = sequelize.define('CustomMetric', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  formula: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: true
  },
  format: {
    type: DataTypes.STRING,
    defaultValue: 'number'
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'custom_metrics',
  timestamps: true
});

module.exports = CustomMetric;
