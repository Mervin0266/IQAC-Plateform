const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ScopusSource = sequelize.define('ScopusSource', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  issn: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  eIssn: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  sourceTitle: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  scopusSourceId: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  publisher: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  sourceType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  scopusUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  subjectAreas: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  citeScoresByYear: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  sjrByYear: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  snipByYear: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  scholarlyOutputByYear: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  metricsHistory: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  lastFetchedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  nextRefreshAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastRefreshStatus: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'scopus_sources',
  timestamps: true,
  indexes: [
    { fields: ['issn'] },
    { fields: ['eIssn'] },
    { fields: ['scopusSourceId'] }
  ]
});

module.exports = ScopusSource;
