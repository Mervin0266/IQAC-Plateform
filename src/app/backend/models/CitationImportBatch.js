const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CitationImportBatch = sequelize.define('CitationImportBatch', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  filename: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  fileChecksum: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  fileFormat: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'csv'
  },
  employeeId: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  facultyId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  facultyName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  department: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false
  },
  sourceType: {
    type: DataTypes.STRING(100),
    defaultValue: 'Scopus Citation Overview'
  },
  totalRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  matchedRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  needsReviewRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  notFoundRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  duplicateRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  updatedRecords: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'completed'
  }
}, {
  tableName: 'citation_import_batches',
  timestamps: true,
  indexes: [
    { fields: ['employeeId'] },
    { fields: ['uploadedBy'] },
    { fields: ['fileChecksum'] },
    { fields: ['status'] }
  ]
});

module.exports = CitationImportBatch;

