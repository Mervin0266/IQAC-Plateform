const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ReportHistory = sequelize.define('ReportHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  reportName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reportType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  outputFormat: {
    type: DataTypes.STRING,
    allowNull: false
  },
  scopeSummary: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reportingPeriod: {
    type: DataTypes.STRING,
    allowNull: true
  },
  sectionsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  pageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  fileUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: true
  },
  fileSize: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'completed'
  },
  configSnapshot: {
    type: DataTypes.JSONB,
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
  tableName: 'report_history',
  timestamps: true,
  indexes: [
    { fields: ['createdBy'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = ReportHistory;
