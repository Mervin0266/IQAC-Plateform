const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConsultancyDocument = sequelize.define('ConsultancyDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  projectId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'consultancy_projects',
      key: 'id'
    },
    comment: 'Associated consultancy project ID'
  },
  documentCategory: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'agreement_work_order',
    comment: 'agreement_work_order, invoice, or payment_receipt'
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
    comment: 'Google Drive File ID or storage path'
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
    defaultValue: 'active',
    comment: 'active, verified, restricted, or pending_verification'
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
  tableName: 'consultancy_documents',
  timestamps: true,
  indexes: [
    { fields: ['projectId'] },
    { fields: ['documentCategory'] },
    { fields: ['sourceType'] },
    { fields: ['uploadedBy'] },
    { fields: ['isActive'] }
  ]
});

module.exports = ConsultancyDocument;
