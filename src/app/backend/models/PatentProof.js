const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PatentProof = sequelize.define('PatentProof', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'patents',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  sourceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'drive_link',
    comment: 'drive_upload (file uploaded through platform) or drive_link (external Google Drive URL)'
  },
  driveFileId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Google Drive File ID for managed uploads or extracted link file ID'
  },
  driveFolderId: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Google Drive Folder ID where file is stored'
  },
  driveUrl: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Google Drive viewable / downloadable link'
  },
  fileName: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'Display name of the document'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: 'File size in bytes'
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
    comment: 'verified, pending_verification, access_issue'
  },
  accessRemarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'patent_proofs',
  timestamps: true,
  indexes: [
    { fields: ['patentId'] },
    { fields: ['sourceType'] },
    { fields: ['uploadedBy'] },
    { fields: ['isActive'] }
  ]
});

module.exports = PatentProof;

