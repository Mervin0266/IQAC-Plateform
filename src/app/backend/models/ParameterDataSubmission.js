const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ParameterDataSubmission = sequelize.define('ParameterDataSubmission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  parameterId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'accreditation_parameters',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  academicYear: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  actualValue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  qualitativeResponse: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  calculatedScore: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected'),
    defaultValue: 'Draft'
  },
  reviewerComments: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  evidenceDocumentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'documents',
      key: 'id'
    }
  },
  submittedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'parameter_data_submissions',
  timestamps: true,
  indexes: [
    { fields: ['parameterId'] },
    { fields: ['department'] },
    { fields: ['academicYear'] },
    { fields: ['status'] }
  ]
});

module.exports = ParameterDataSubmission;
