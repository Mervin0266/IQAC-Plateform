const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccreditationParameter = sequelize.define('AccreditationParameter', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  frameworkId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'accreditation_frameworks',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  criterionNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g. Criterion 1 / TLR / Pillar 2'
  },
  criterionTitle: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  metricId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g. 1.1.1, 3.2.1, TLR-SS'
  },
  metricTitle: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  metricType: {
    type: DataTypes.ENUM('Quantitative', 'Qualitative'),
    defaultValue: 'Quantitative',
    allowNull: false
  },
  weightage: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 10.0,
    validate: { min: 0 }
  },
  benchmarkValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Target benchmark value'
  },
  unitOfMeasure: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Count',
    comment: 'Count, Percentage, LPA, Ratio, Scale'
  },
  isDepartmentSpecific: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  guidelinesUrl: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active'
  }
}, {
  tableName: 'accreditation_parameters',
  timestamps: true,
  indexes: [
    { fields: ['frameworkId'] },
    { fields: ['metricId'] },
    { fields: ['criterionNumber'] }
  ]
});

module.exports = AccreditationParameter;
