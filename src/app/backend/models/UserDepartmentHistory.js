const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserDepartmentHistory = sequelize.define('UserDepartmentHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g. Computer Science and Engineering, AI and Data Science'
  },
  departmentCode: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'e.g. CSE, ADSE'
  },
  designation: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  startAcademicYear: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'e.g. 2020-2021'
  },
  endAcademicYear: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: 'NULL indicates currently active affiliation'
  },
  effectiveFrom: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  effectiveTo: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  isCurrent: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  transferReason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    defaultValue: 'Department Bifurcation / Split'
  }
}, {
  tableName: 'user_department_history',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['departmentCode'] },
    { fields: ['startAcademicYear', 'endAcademicYear'] },
    { fields: ['isCurrent'] }
  ]
});

module.exports = UserDepartmentHistory;
