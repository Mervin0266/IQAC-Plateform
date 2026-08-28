const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DepartmentalActivity = sequelize.define('DepartmentalActivity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '2024-2025',
  },
  campus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Bangalore Kengeri Campus',
  },
  school: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'School of Engineering and Technology',
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  activityCategory: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g. Faculty Development Activities, Seminar / Talks / Training Program, Club Association, MoUs, Industrial Visit, etc.',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  reportDetails: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Reports 2025',
  },
  reportYear: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  eventDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  resourcePersons: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  participantsCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  documentUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Completed', 'Pending', 'In Progress'),
    defaultValue: 'Completed',
  },
  pendingNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'departmental_activities',
});

module.exports = DepartmentalActivity;
