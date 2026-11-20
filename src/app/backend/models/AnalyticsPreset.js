'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AnalyticsPreset = sequelize.define('AnalyticsPreset', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false
  },
  config: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
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
  tableName: 'analytics_presets',
  timestamps: true
});

module.exports = AnalyticsPreset;
