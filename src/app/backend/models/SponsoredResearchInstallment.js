const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SponsoredResearchInstallment = sequelize.define('SponsoredResearchInstallment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sponsored_projects',
      key: 'id'
    },
    comment: 'Associated sponsored project ID'
  },
  installmentNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Sequence number of installment (e.g., 1, 2, 3)'
  },
  paymentDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date funds were released / credited'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Installment fund amount in INR'
  },
  paymentReference: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Transaction ID, UTR number, PFMS reference, or sanction release order'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Installment notes, remarks, or conditions'
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
  tableName: 'sponsored_research_installments',
  timestamps: true,
  indexes: [
    { fields: ['projectId'] },
    { fields: ['paymentDate'] }
  ]
});

module.exports = SponsoredResearchInstallment;

