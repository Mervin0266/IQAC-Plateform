const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DepartmentLineage = sequelize.define('DepartmentLineage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  domainGroup: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g. Computing Domain, Mechanical & Automotive Sciences'
  },
  parentDepartment: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g. Computer Science and Engineering'
  },
  childDepartment: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g. Artificial Intelligence and Data Science'
  },
  splitAcademicYear: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'First academic year of the new entity, e.g. 2024-25'
  },
  splitDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Active', 'Historical'),
    defaultValue: 'Active'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'department_lineages',
  timestamps: true
});

module.exports = DepartmentLineage;
