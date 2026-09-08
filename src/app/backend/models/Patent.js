const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Patent = sequelize.define('Patent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  inventors: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Comma-separated inventor names or array string'
  },
  applicationNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  patentNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'published',
    comment: 'filed, published, granted, commercialized, under_examination'
  },
  patentType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'National (Indian)',
    comment: 'National (Indian), International (PCT), USPTO (USA), EPO (Europe), Other'
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
  filedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  publishedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  grantedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  licenseDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  partner: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Commercializing agency or industry licensee'
  },
  revenue: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0.00,
    comment: 'Revenue or royalty generated in INR'
  },
  patentUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Official patent URL / gazette link / Google Patents link'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Abstract / Claims summary'
  },
  approvalStatus: {
    type: DataTypes.STRING(50),
    defaultValue: 'approved'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'patents',
  timestamps: true,
  indexes: [
    { fields: ['status'] },
    { fields: ['patentType'] },
    { fields: ['academicYear'] },
    { fields: ['department'] },
    { fields: ['createdBy'] }
  ]
});

module.exports = Patent;
