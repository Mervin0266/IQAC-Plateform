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
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  course: {
    type: DataTypes.STRING,
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  previousSchool: {
    type: DataTypes.STRING,
    allowNull: false
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
    allowNull: false
  },
  admissionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'Graduated', 'On Leave'),
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
  }
}, {
  tableName: 'students',
  timestamps: true
});

module.exports = Student;
