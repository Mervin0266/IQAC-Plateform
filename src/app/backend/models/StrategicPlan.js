const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StrategicPlan = sequelize.define('StrategicPlan', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  department: {
    type: DataTypes.STRING,
    allowNull: false
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM(
      'academic-excellence',
      'research-innovation',
      'infrastructure',
      'student-development',
      'faculty-development',
      'industry-collaboration',
      'international-relations',
      'quality-assurance'
    ),
    allowNull: false
  },
  objective: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  targetDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('planned', 'in-progress', 'completed', 'delayed', 'cancelled'),
    defaultValue: 'planned'
  },
  progress: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  budget: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  responsible: {
    type: DataTypes.STRING,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false
  }
}, {
  tableName: 'strategic_plans',
  timestamps: true
});

module.exports = StrategicPlan;
