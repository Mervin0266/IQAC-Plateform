const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserPermissionOverride = sequelize.define('UserPermissionOverride', {
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
  moduleKey: {
    type: DataTypes.STRING(64),
    allowNull: false
  },
  permission: {
    type: DataTypes.STRING(32),
    allowNull: false,
    comment: 'view | add | edit | delete | approve | export | import | manage'
  },
  effect: {
    type: DataTypes.STRING(16),
    allowNull: false,
    validate: {
      isIn: [['grant', 'restrict']]
    }
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  updatedBy: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'user_permission_overrides',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['userId', 'moduleKey', 'permission'],
      name: 'user_perm_override_unique'
    }
  ]
});

module.exports = UserPermissionOverride;

