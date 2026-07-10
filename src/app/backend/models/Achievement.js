const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Achievement = sequelize.define('Achievement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM(
      'rankings',
      'accreditations',
      'awards',
      'research',
      'placements',
      'infrastructure',
      'international',
      'other'
    ),
    allowNull: false
  },
  subcategory: {
    type: DataTypes.STRING,
    allowNull: true
  },
  achieverType: {
    type: DataTypes.ENUM('student', 'scholar', 'faculty'),
    allowNull: true,
    defaultValue: 'faculty'
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  year: {
    type: DataTypes.STRING,
    allowNull: false
  },
  rank: {
    type: DataTypes.STRING,
    allowNull: true
  },
  score: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  organization: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  participants: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  impact: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(
      'draft',
      'submitted',
      'under_coordinator_review',
      'returned_for_correction',
      'rejected',
      'approved',
      'under_hod_review',
      'finalized',
      'edit_requested',
      'edit_request_approved',
      'record_reopened'
    ),
    defaultValue: 'draft'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'achievements',
  timestamps: true
});

module.exports = Achievement;
