const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserOrganizationalScope = sequelize.define('UserOrganizationalScope', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  scopeType: {
    type: DataTypes.STRING(24),
    allowNull: false,
    defaultValue: 'department',
    validate: {
      isIn: [['university', 'campus', 'school', 'department', 'own']]
    }
  },
  campusId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  campusName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  schoolId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  schoolName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  departmentName: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  isPrimary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'user_organizational_scopes',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['scopeType'] },
    { fields: ['departmentName'] }
  ]
});

module.exports = UserOrganizationalScope;

