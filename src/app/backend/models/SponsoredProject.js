const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SponsoredProject = sequelize.define('SponsoredProject', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Title of the sponsored research project'
  },
  principalInvestigator: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Lead researcher / Principal Investigator (PI)'
  },
  coInvestigators: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Co-Principal Investigators (Co-PI) and research team members'
  },
  fundingAgency: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Funding Agency / Sponsor (e.g., DST, SERB, DBT, ICMR, AICTE, Industry)'
  },
  scheme: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Specific funding scheme or program (e.g., CRG, FIST, RPS, Seed Money)'
  },
  agencyType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Government (National)',
    comment: 'Government (National), Government (State), International Agency, Industry / Corporate, University Seed Money / Internal, NGO / Other'
  },
  sanctionOrderNo: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Official Sanction Order Number / Project ID'
  },
  sanctionDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date of grant award / sanction order'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Project commencement date'
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Project expected / actual completion date'
  },
  sanctionedAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Total Sanctioned Grant Amount in INR'
  },
  amountReceived: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    defaultValue: 0.00,
    comment: 'Funds received / released to date in INR'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Ongoing',
    comment: 'Ongoing, Completed, Sanctioned, Proposal Submitted, Terminated'
  },
  progressPercentage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: 'Milestone / progress completion percentage (0 - 100)'
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Host department'
  },
  academicYear: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '2024-2025'
  },
  projectUrl: {
    type: DataTypes.STRING(1000),
    allowNull: true,
    comment: 'Link to sanction letter, progress report, or research portal'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Project summary, objectives, and deliverables'
  },
  approvalStatus: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'approved',
    comment: 'approved, pending, rejected'
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  tableName: 'SponsoredProjects',
  timestamps: true,
  indexes: [
    { fields: ['department'] },
    { fields: ['academicYear'] },
    { fields: ['status'] },
    { fields: ['agencyType'] },
    { fields: ['fundingAgency'] },
    { fields: ['principalInvestigator'] }
  ]
});

module.exports = SponsoredProject;
