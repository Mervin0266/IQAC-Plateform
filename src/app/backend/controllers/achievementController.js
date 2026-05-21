const { Achievement, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all achievements
// @route   GET /api/achievements
// @access  Private
exports.getAchievements = async (req, res) => {
  try {
    const { category, year, department, status } = req.query;
    
    const where = {};
    if (category) where.category = category;
    if (year) where.year = year;
    if (department) where.department = department;
    if (status) where.status = status;

    const achievements = await Achievement.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }],
      order: [['date', 'DESC']]
    });

    res.json({
      success: true,
      count: achievements.length,
      data: achievements
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single achievement
// @route   GET /api/achievements/:id
// @access  Private
exports.getAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    res.json({
      success: true,
      data: achievement
    });
  } catch (error) {
    console.error('Get achievement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create achievement
// @route   POST /api/achievements
// @access  Private (Admin, Coordinator, Faculty)
exports.createAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: achievement
    });
  } catch (error) {
    console.error('Create achievement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update achievement
// @route   PUT /api/achievements/:id
// @access  Private (Admin, Coordinator)
exports.updateAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findByPk(req.params.id);

    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && achievement.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this achievement'
      });
    }

    await achievement.update(req.body);

    res.json({
      success: true,
      data: achievement
    });
  } catch (error) {
    console.error('Update achievement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete achievement
// @route   DELETE /api/achievements/:id
// @access  Private (Admin, Coordinator)
exports.deleteAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findByPk(req.params.id);

    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && achievement.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this achievement'
      });
    }

    await achievement.destroy();

    res.json({
      success: true,
      message: 'Achievement deleted successfully'
    });
  } catch (error) {
    console.error('Delete achievement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get achievement statistics
// @route   GET /api/achievements/stats
// @access  Private
exports.getAchievementStats = async (req, res) => {
  try {
    const { year } = req.query;
    const where = year ? { year } : {};

    const total = await Achievement.count({ where });
    const byCategory = await Achievement.findAll({
      where,
      attributes: [
        'category',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['category']
    });

    res.json({
      success: true,
      data: {
        total,
        byCategory
      }
    });
  } catch (error) {
    console.error('Get achievement stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
