const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CitationYearlyDetail = sequelize.define('CitationYearlyDetail', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  snapshotId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  period: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  citationCount: {
    type: DataTypes.INTEGER,
    allowNull: true // null for unknown/missing, integer for known/0
  },
  periodType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'year' // 'year' | 'grouped' | 'subtotal'
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'known' // 'known' | 'unknown'
  }
}, {
  tableName: 'citation_yearly_details',
  timestamps: true,
  indexes: [
    { fields: ['snapshotId'] },
    { fields: ['period'] },
    { fields: ['periodType'] }
  ]
});

module.exports = CitationYearlyDetail;

