const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccreditationFramework = sequelize.define('AccreditationFramework', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: { notEmpty: true },
    comment: 'Unique identifier code e.g. NAAC_SSR_2024, NIRF_ENGG_2025, NBA_TIER1'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: { notEmpty: true }
  },
  category: {
    type: DataTypes.ENUM('NAAC', 'NIRF', 'NBA', 'QS_RANKING', 'THE_WORLD', 'INTERNAL_IQAC'),
    allowNull: false,
    defaultValue: 'NAAC'
  },
  academicYear: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: '2024-2025'
  },
  totalWeightage: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1000,
    validate: { min: 1 }
  },
  status: {
    type: DataTypes.ENUM('Active', 'Draft', 'Archived'),
    defaultValue: 'Active'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: 'accreditation_frameworks',
  timestamps: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['status'] },
    { fields: ['academicYear'] }
  ]
});

module.exports = AccreditationFramework;
