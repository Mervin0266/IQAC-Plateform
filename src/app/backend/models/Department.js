const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Department = sequelize.define('Department', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: { notEmpty: true }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { notEmpty: true }
  },
  shortName: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'Short display name, e.g. CSE, ECE, MECH'
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'schools',
      key: 'id'
    },
    comment: 'FK to schools table. Nullable for backward compat during migration.'
  },
  hodId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'FK to users table — the Head of Department'
  },
  // Legacy HOD fields — kept for backward compatibility
  hodName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hodEmail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  establishedYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active'
  }
}, {
  tableName: 'departments',
  timestamps: true
});

module.exports = Department;
