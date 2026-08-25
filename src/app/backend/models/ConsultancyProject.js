const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConsultancyProject = sequelize.define('ConsultancyProject', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  teacherConsultant: {
    type: DataTypes.STRING,
    allowNull: false
  },
  projectName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sponsoringAgency: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  year: {
    type: DataTypes.STRING,
    allowNull: false
  },
  revenueInLakhs: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  department: {
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
  tableName: 'consultancy_projects',
  timestamps: true
});

module.exports = ConsultancyProject;
