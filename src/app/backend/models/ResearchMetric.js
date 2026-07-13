const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ResearchMetric = sequelize.define('ResearchMetric', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: false
  },
  periodType: {
    type: DataTypes.ENUM('yearly', 'monthly'),
    allowNull: false,
    defaultValue: 'yearly'
  },
  periodValue: { // e.g., 'AY 2024-25', 'June - 2025'
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  books: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  chapters: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  scopusJournals: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  nationalJournals: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  internationalJournals: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  citations: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  patentsIndian: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  patentsInternational: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  conferencesNational: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  conferencesInternational: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  consultancyCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  consultancyAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  seedMoneyCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  seedMoneyAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  },
  externalProjectsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  externalProjectsAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0.00
  }
}, {
  tableName: 'research_metrics',
  timestamps: true
});

module.exports = ResearchMetric;
