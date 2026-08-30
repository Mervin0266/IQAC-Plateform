const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Faculty = sequelize.define('Faculty', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sNo: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  employeeId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  designation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  academicYear: {
    type: DataTypes.STRING,
    defaultValue: '2024-2025'
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: true
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  panCardNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  dateOfJoining: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  prevTeachingExpYears: {
    type: DataTypes.STRING,
    defaultValue: '0'
  },
  prevTeachingExpMonths: {
    type: DataTypes.STRING,
    defaultValue: '0'
  },
  prevIndustryExpYears: {
    type: DataTypes.STRING,
    defaultValue: '0'
  },
  prevIndustryExpMonths: {
    type: DataTypes.STRING,
    defaultValue: '0'
  },
  qualificationLevel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  highestQualification: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cuExpYears: {
    type: DataTypes.STRING,
    defaultValue: '0'
  },
  cuExpMonths: {
    type: DataTypes.STRING,
    defaultValue: '0'
  },
  // Legacy / optional fields kept for compatibility
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  qualifications: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  specialization: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'On Sabbatical', 'Relieved'),
    defaultValue: 'Active'
  }
}, {
  tableName: 'faculties',
  timestamps: true
});

module.exports = Faculty;
