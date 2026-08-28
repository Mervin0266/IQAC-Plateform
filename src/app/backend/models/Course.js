const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { notEmpty: true }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'departments',
      key: 'id'
    }
  },
  programLevelId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'program_levels',
      key: 'id'
    },
    comment: 'FK to program_levels table — UG, PG, PhD'
  },
  duration: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'e.g. 4 Years, 2 Years'
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active'
  }
}, {
  tableName: 'courses',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['code', 'departmentId', 'programLevelId'],
      name: 'courses_code_dept_level_unique'
    }
  ]
});

module.exports = Course;

