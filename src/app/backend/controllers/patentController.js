const { Patent, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all patents
// @route   GET /api/patents
// @access  Private
exports.getPatents = async (req, res) => {
  try {
    const { status, department } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (department) where.department = department;

    const patents = await Patent.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }],
      order: [['filedDate', 'DESC']]
    });

    res.json({
      success: true,
      count: patents.length,
      data: patents
    });
  } catch (error) {
    console.error('Get patents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single patent
// @route   GET /api/patents/:id
// @access  Private
exports.getPatent = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    if (!patent) {
      return res.status(404).json({
        success: false,
        message: 'Patent not found'
      });
    }

    res.json({
      success: true,
      data: patent
    });
  } catch (error) {
    console.error('Get patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create patent
// @route   POST /api/patents
// @access  Private
exports.createPatent = async (req, res) => {
  try {
    const patent = await Patent.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: patent
    });
  } catch (error) {
    console.error('Create patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update patent
// @route   PUT /api/patents/:id
// @access  Private
exports.updatePatent = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id);

    if (!patent) {
      return res.status(404).json({
        success: false,
        message: 'Patent not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && patent.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this patent'
      });
    }

    await patent.update(req.body);

    res.json({
      success: true,
      data: patent
    });
  } catch (error) {
    console.error('Update patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete patent
// @route   DELETE /api/patents/:id
// @access  Private
exports.deletePatent = async (req, res) => {
  try {
    const patent = await Patent.findByPk(req.params.id);

    if (!patent) {
      return res.status(404).json({
        success: false,
        message: 'Patent not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete patents'
      });
    }

    await patent.destroy();

    res.json({
      success: true,
      message: 'Patent deleted successfully'
    });
  } catch (error) {
    console.error('Delete patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
