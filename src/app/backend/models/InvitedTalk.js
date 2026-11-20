'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InvitedTalk = sequelize.define('InvitedTalk', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  programType: {
    type: DataTypes.STRING(150),
    allowNull: true,
    comment: 'Type of Program'
  },
  organization: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  media: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  proofUrl: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'invited_talks',
  timestamps: true,
  indexes: [
    { fields: ['department'] }
  ]
});

module.exports = InvitedTalk;
