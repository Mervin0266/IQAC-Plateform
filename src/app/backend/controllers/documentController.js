const { Document, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { logActionSafe } = require('../middleware/auditLogger');
const { parsePagination, formatPaginationResponse } = require('../utils/paginationHelper');

// Allowed fields for regular client updates
const CLIENT_DOCUMENT_FIELDS = [
  'title', 'description', 'category', 'subcategory',
  'academicYear', 'semester', 'courseCode', 'courseName',
  'fileName', 'filePath', 'fileSize', 'fileType', 'tags'
];

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res) => {
  try {
    const { category, academicYear, semester, status } = req.query;
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Document', false);
    const where = { ...scopeWhere };

    if (category) where.category = category;
    if ((req.user.role === 'admin' || req.user.role === 'authority') &&
        req.query.department && req.query.department !== 'All') {
      where.department = req.query.department;
    }
    if (academicYear) where.academicYear = academicYear;
    if (semester) where.semester = semester;
    if (status) where.status = status;

    const { page, limit, offset } = parsePagination(req.query);

    const { count, rows: documents } = await Document.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'name', 'email', 'department']
      }],
      order: [['createdAt', 'DESC'], ['id', 'ASC']],
      limit,
      offset,
      distinct: true
    });

    res.json(formatPaginationResponse({
      count,
      rows: documents,
      page,
      limit
    }));
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single document
// @route   GET /api/documents/:id
// @access  Private
exports.getDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Role-based departmental access control
    if (req.user && req.user.role !== 'admin' && req.user.role !== 'authority') {
      if (req.user.department && document.department && document.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to access documents outside your department.'
        });
      }
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create document
// @route   POST /api/documents
// @access  Private
exports.createDocument = async (req, res) => {
  try {
    const safeData = {};
    CLIENT_DOCUMENT_FIELDS.forEach(f => {
      if (req.body[f] !== undefined) safeData[f] = req.body[f];
    });

    // Enforce ownership and departmental isolation
    safeData.uploadedBy = req.user.id;
    if (req.user.role !== 'admin' && req.user.department) {
      safeData.department = req.user.department;
    } else if (req.body.department) {
      safeData.department = req.body.department;
    }

    // Privileged status setting
    if (['admin', 'coordinator', 'hod'].includes(req.user.role) && req.body.status) {
      safeData.status = req.body.status;
    } else {
      safeData.status = 'approved';
    }

    const document = await Document.create(safeData);

    await logActionSafe({
      user: req.user,
      action: 'CREATE_DOCUMENT',
      title: `Created document: ${document.title}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update document
// @route   PUT /api/documents/:id
// @access  Private
exports.updateDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && document.uploadedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this document'
      });
    }

    // Explicit field allowlist preventing unauthorized mass assignment (VULN-P2)
    const updates = {};
    CLIENT_DOCUMENT_FIELDS.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    // Only administrators and department coordinators/HODs can change approval status
    if (req.body.status !== undefined) {
      if (['admin', 'coordinator', 'hod'].includes(req.user.role)) {
        updates.status = req.body.status;
      }
    }

    // Department scope can only be changed by Admin
    if (req.body.department !== undefined && req.user.role === 'admin') {
      updates.department = req.body.department;
    }

    // Ownership (uploadedBy) and ID can NEVER be overwritten via client payload
    delete updates.uploadedBy;
    delete updates.id;

    await document.update(updates);

    await logActionSafe({
      user: req.user,
      action: 'UPDATE_DOCUMENT',
      title: `Updated document: ${document.title}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Delete document
// @route   DELETE /api/documents/:id
// @access  Private
exports.deleteDocument = async (req, res) => {
  try {
    const document = await Document.findByPk(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      if (req.user.department && document.department && document.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Cannot delete documents outside your department'
        });
      }
      if (req.user.role !== 'coordinator' && req.user.role !== 'hod' && document.uploadedBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this document'
        });
      }
    }

    await document.destroy();

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Clear all documents
// @route   DELETE /api/documents/clear-all
// @access  Private (Admin / Coordinator / HOD)
exports.clearAllDocuments = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'Document', true);

    let count = 0;
    await sequelize.transaction(async (t) => {
      count = await Document.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_DOCUMENTS',
      title: `Cleared documents: ${scopeDescription}`,
      remarks: `Deleted ${count} document records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Documents (${count}) cleared successfully for ${scopeDescription}`,
      deletedCount: count
    });
  } catch (error) {
    console.error('Clear documents error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

