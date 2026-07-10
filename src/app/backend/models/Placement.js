const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Placement = sequelize.define('Placement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  studentName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  studentId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  course: {
    type: DataTypes.STRING,
    allowNull: true
  },
  batch: {
    type: DataTypes.STRING,
    allowNull: false
  },
  company: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    allowNull: true
  },
  package: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  placementType: {
    type: DataTypes.ENUM('placement', 'internship'),
    allowNull: true,
    defaultValue: 'placement'
  },
  placementDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'placements',
  timestamps: true
});

module.exports = Placement;
