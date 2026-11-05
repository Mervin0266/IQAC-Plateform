const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PublicationCitationSnapshot = sequelize.define('PublicationCitationSnapshot', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  publicationId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  importBatchId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  sourceFile: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  employeeId: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  facultyName: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  citationSource: {
    type: DataTypes.STRING(100),
    defaultValue: 'Scopus'
  },
  reportedTotal: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  previousTotal: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  reconciliationStatus: {
    type: DataTypes.STRING(50),
    defaultValue: 'reconciled' // 'reconciled' | 'incomplete' | 'unreconciled'
  },
  approvalStatus: {
    type: DataTypes.STRING(50),
    defaultValue: 'approved'
  },
  reportDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'publication_citation_snapshots',
  timestamps: true,
  indexes: [
    { fields: ['publicationId'] },
    { fields: ['importBatchId'] },
    { fields: ['employeeId'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = PublicationCitationSnapshot;

