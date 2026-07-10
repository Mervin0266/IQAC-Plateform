const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EditRequest = sequelize.define('EditRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  achievementId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  },
  coordinatorRemarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hodRemarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  requestedBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'edit_requests',
  timestamps: true
});

module.exports = EditRequest;
