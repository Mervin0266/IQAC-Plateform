const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const StudentEnrollment = sequelize.define('StudentEnrollment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  studentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  registerNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  academicYear: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true
  },
  program: {
    type: DataTypes.STRING,
    allowNull: true
  },
  course: {
    type: DataTypes.STRING,
    allowNull: true
  },
  className: {
    type: DataTypes.STRING,
    allowNull: true
  },
  batch: {
    type: DataTypes.STRING,
    allowNull: true
  },
  programLevel: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Active'
  },
  campus: {
    type: DataTypes.STRING,
    allowNull: true
  },
  school: {
    type: DataTypes.STRING,
    allowNull: true
  },
  yearOfStudy: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isFirstYearSH: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  customFields: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  }
}, {
  tableName: 'student_enrollments',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['studentId', 'academicYear'],
      name: 'idx_student_enrollments_student_year_unique'
    },
    {
      unique: true,
      fields: ['registerNumber', 'academicYear'],
      name: 'idx_student_enrollments_regno_year_unique'
    },
    {
      fields: ['registerNumber'],
      name: 'idx_student_enrollments_regno'
    },
    {
      fields: ['department'],
      name: 'idx_student_enrollments_department'
    },
    {
      fields: ['academicYear'],
      name: 'idx_student_enrollments_academic_year'
    },
    {
      fields: ['programLevel'],
      name: 'idx_student_enrollments_program_level'
    },
    {
      fields: ['status'],
      name: 'idx_student_enrollments_status'
    }
  ]
});

module.exports = StudentEnrollment;
