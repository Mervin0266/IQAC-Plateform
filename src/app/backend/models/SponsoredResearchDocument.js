const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SponsoredResearchDocument = sequelize.define('SponsoredResearchDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'sponsored_projects',
      key: 'id'
    },
    comment: 'Associated sponsored project ID'
  },
  documentCategory: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'agreement_letter',
    comment: 'agreement_letter or payment_receipt'
  },
  sourceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'drive_link',
    comment: 'drive_upload, drive_link, or local_upload'
  },
  driveFileId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Google Drive File ID or local relative storage path'
  },
  driveFolderId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Google Drive target folder ID where the file resides'
  },
  driveUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Accessible web view URL for the document'
  },
  fileName: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Original name of uploaded document or title'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'File MIME type (e.g., application/pdf, image/png)'
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'Size of file in bytes'
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  uploadedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  accessStatus: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending_verification',
    comment: 'verified, restricted, or pending_verification'
  },
  accessRemarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: 'Soft deletion / active toggle'
  }
}, {
  tableName: 'sponsored_research_documents',
  timestamps: true,
  indexes: [
    { fields: ['projectId'] },
    { fields: ['documentCategory'] },
    { fields: ['sourceType'] },
    { fields: ['uploadedBy'] },
    { fields: ['isActive'] }
  ]
});

module.exports = SponsoredResearchDocument;

