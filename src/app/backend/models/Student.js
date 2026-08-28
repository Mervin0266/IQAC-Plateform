const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  registerNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  course: {
    type: DataTypes.STRING,
    allowNull: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  previousSchool: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gender: {
    type: DataTypes.STRING,
    defaultValue: 'Male'
  },
  dob: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  bloodGroup: {
    type: DataTypes.STRING,
    allowNull: true
  },
  batch: {
    type: DataTypes.STRING,
    allowNull: true
  },
  admissionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Active'
  },
  guardianName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  guardianPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  className: {
    type: DataTypes.STRING,
    allowNull: true
  },
  applicationNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  mobileNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  nationality: {
    type: DataTypes.STRING,
    allowNull: true
  },
  caste: {
    type: DataTypes.STRING,
    allowNull: true
  },
  currentCity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  currentState: {
    type: DataTypes.STRING,
    allowNull: true
  },
  permanentCity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  permanentState: {
    type: DataTypes.STRING,
    allowNull: true
  },
  parentMobileNo: {
    type: DataTypes.STRING,
    allowNull: true
  },
  handicapped: {
    type: DataTypes.STRING,
    allowNull: true
  },
  handicappedDescription: {
    type: DataTypes.TEXT,
    defaultValue: 'NIL',
    allowNull: true
  },
  campus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  school: {
    type: DataTypes.STRING,
    allowNull: true
  },
  programLevel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  academicYear: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '2024-2025'
  },
  disability: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'students',
  timestamps: true
});

module.exports = Student;
