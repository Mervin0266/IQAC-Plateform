const { Document, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all documents
// @route   GET /api/documents
// @access  Private
exports.getDocuments = async (req, res) => {
  try {
    const { category, department, academicYear, semester, status } = req.query;
    
    const where = {};
    if (category) where.category = category;
    if (department) where.department = department;
    if (academicYear) where.academicYear = academicYear;
    if (semester) where.semester = semester;
    if (status) where.status = status;

    // Faculty can only see their department's documents unless admin
    if (req.user.role === 'faculty' && req.user.department) {
      where.department = req.user.department;
    }

    const documents = await Document.findAll({
      where,
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'name', 'email', 'department']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: documents.length,
      data: documents
    });
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
    const document = await Document.create({
      ...req.body,
      uploadedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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

    await document.update(req.body);

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && document.uploadedBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this document'
      });
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
