'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CustomDashboard = sequelize.define('CustomDashboard', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  layout: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  filters: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isTemplate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'General'
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
  tableName: 'custom_dashboards',
  timestamps: true
});

module.exports = CustomDashboard;
