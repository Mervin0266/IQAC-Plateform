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
    allowNull: true
  },
  projectName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  projectType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: [['Collaborative', 'Sole', 'MOU_Based', 'Private_Consulting', 'Others']]
    }
  },
  otherProjectTypeDescription: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  empIdsRaw: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Normalized comma-separated Employee IDs preserved for traceability'
  },
  hasInvalidEmpIds: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  invalidEmpIds: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  duplicateEmpIds: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  externalCollaborators: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  sponsoringAgency: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  agencyName: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  agencyContactEmail: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  agencyContactNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  year: {
    type: DataTypes.STRING,
    allowNull: true
  },
  consultancyStartYear: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  expectedEndDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  actualCompletionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  projectStatus: {
    type: DataTypes.STRING(50),
    allowNull: true,
    validate: {
      isIn: [['Sanctioned', 'On Going', 'Completed']]
    }
  },
  contractValueInLakhs: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: null
  },
  revenueInLakhs: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  amountReceivedInLakhs: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: null
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
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
    allowNull: true,
    defaultValue: null
  },
  customFields: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
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
