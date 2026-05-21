const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Patent = sequelize.define('Patent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  inventors: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('published', 'granted', 'commercialized'),
    allowNull: false
  },
  applicationNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  patentNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  filedDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  grantedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  partner: {
    type: DataTypes.STRING,
    allowNull: true
  },
  licenseDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  revenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'patents',
  timestamps: true
});

module.exports = Patent;
