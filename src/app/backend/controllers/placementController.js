const { Placement, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all placements
// @route   GET /api/placements
// @access  Private
exports.getPlacements = async (req, res) => {
  try {
    const { department, batch, placementType, company } = req.query;
    
    const where = {};
    if (department) where.department = department;
    if (batch) where.batch = batch;
    if (placementType) where.placementType = placementType;
    if (company) where.company = { [Op.iLike]: `%${company}%` };

    const placements = await Placement.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }],
      order: [['placementDate', 'DESC']]
    });

    res.json({
      success: true,
      count: placements.length,
      data: placements
    });
  } catch (error) {
    console.error('Get placements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get placement statistics
// @route   GET /api/placements/stats
// @access  Private
exports.getPlacementStats = async (req, res) => {
  try {
    const { batch, department } = req.query;
    const where = {};
    
    if (batch) where.batch = batch;
    if (department) where.department = department;

    const { sequelize } = require('../config/database');

    const stats = await Placement.findAll({
      where,
      attributes: [
        'department',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalPlacements'],
        [sequelize.fn('AVG', sequelize.col('package')), 'avgPackage'],
        [sequelize.fn('MAX', sequelize.col('package')), 'maxPackage'],
        [sequelize.fn('MIN', sequelize.col('package')), 'minPackage']
      ],
      group: ['department']
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get placement stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create placement
// @route   POST /api/placements
// @access  Private
exports.createPlacement = async (req, res) => {
  try {
    const placement = await Placement.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: placement
    });
  } catch (error) {
    console.error('Create placement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update placement
// @route   PUT /api/placements/:id
// @access  Private
exports.updatePlacement = async (req, res) => {
  try {
    const placement = await Placement.findByPk(req.params.id);

    if (!placement) {
      return res.status(404).json({
        success: false,
        message: 'Placement not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update placements'
      });
    }

    await placement.update(req.body);

    res.json({
      success: true,
      data: placement
    });
  } catch (error) {
    console.error('Update placement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete placement
// @route   DELETE /api/placements/:id
// @access  Private
exports.deletePlacement = async (req, res) => {
  try {
    const placement = await Placement.findByPk(req.params.id);

    if (!placement) {
      return res.status(404).json({
        success: false,
        message: 'Placement not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete placements'
      });
    }

    await placement.destroy();

    res.json({
      success: true,
      message: 'Placement deleted successfully'
    });
  } catch (error) {
    console.error('Delete placement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
