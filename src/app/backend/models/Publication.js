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
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  journalName: {
    type: DataTypes.STRING,
    allowNull: false
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
    allowNull: false,
    defaultValue: '2024-2025'
  },
  publicationDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  doi: {
    type: DataTypes.STRING,
    allowNull: true
  },
  issn: {
    type: DataTypes.STRING,
    allowNull: true
  },
  volume: {
    type: DataTypes.STRING,
    allowNull: true
  },
  issue: {
    type: DataTypes.STRING,
    allowNull: true
  },
  pageNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  impactFactor: {
    type: DataTypes.DECIMAL(6, 3),
    allowNull: true
  },
  citationCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
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
    { fields: ['department'] },
    { fields: ['createdBy'] }
  ]
});

module.exports = Publication;
