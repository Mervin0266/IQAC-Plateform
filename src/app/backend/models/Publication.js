const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Publication = sequelize.define('Publication', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  authorName: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  authorFullNames: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  journalName: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  publisher: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  journalType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Scopus',
    comment: 'Scopus, WoS (Web of Science), or others as needed'
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: null
  },
  publicationYear: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  publicationDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  doi: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  issn: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isbn: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  coden: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  volume: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  issue: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pageNumber: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  impactFactor: {
    type: DataTypes.DECIMAL(6, 3),
    allowNull: true
  },
  citationCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  paperUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  abstract: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'approved'
  },
  quartile: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  quartileStatus: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Pending'
  },
  scopusSourceId: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  citeScoreYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  citeScoreValue: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true
  },
  scopusEid: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  scopusDocId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  scopusUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  scopusCitedByUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  citationMatchMethod: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  citationStatus: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'Pending'
  },
  lastCitationRefreshAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextCitationRefreshAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  citationError: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  scopusEnrichment: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },
  customFields: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'publications',
  timestamps: true,
  indexes: [
    { fields: ['journalType'] },
    { fields: ['academicYear'] },
    { fields: ['publicationYear'] },
    { fields: ['department'] },
    { fields: ['doi'] },
    { fields: ['quartile'] },
    { fields: ['quartileStatus'] },
    { fields: ['scopusEid'] },
    { fields: ['citationStatus'] },
    { fields: ['nextCitationRefreshAt'] },
    { fields: ['createdBy'] }
  ]
});

module.exports = Publication;
