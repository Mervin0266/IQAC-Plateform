const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SavedReportConfig = sequelize.define('SavedReportConfig', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reportType: {
    type: DataTypes.STRING,
    defaultValue: 'analytical'
  },
  outputFormat: {
    type: DataTypes.STRING,
    defaultValue: 'pdf'
  },
  scopeConfig: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  contentConfig: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  comparisonConfig: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  stylingConfig: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  isShared: {
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
  tableName: 'saved_report_configs',
  timestamps: true,
  indexes: [
    { fields: ['createdBy'] },
    { fields: ['name'] }
  ]
});

module.exports = SavedReportConfig;
