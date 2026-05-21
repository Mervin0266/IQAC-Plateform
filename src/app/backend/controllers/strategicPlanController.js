const { StrategicPlan, User } = require('../models');
const { Op } = require('sequelize');

// @desc    Get all strategic plans
// @route   GET /api/strategic-plans
// @access  Private
exports.getStrategicPlans = async (req, res) => {
  try {
    const { department, academicYear, category, status } = req.query;
    
    const where = {};
    if (department) where.department = department;
    if (academicYear) where.academicYear = academicYear;
    if (category) where.category = category;
    if (status) where.status = status;

    // Faculty/Coordinator can only see their department's plans unless admin
    if ((req.user.role === 'faculty' || req.user.role === 'coordinator') && req.user.department) {
      where.department = req.user.department;
    }

    const plans = await StrategicPlan.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }],
      order: [['targetDate', 'ASC']]
    });

    res.json({
      success: true,
      count: plans.length,
      data: plans
    });
  } catch (error) {
    console.error('Get strategic plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single strategic plan
// @route   GET /api/strategic-plans/:id
// @access  Private
exports.getStrategicPlan = async (req, res) => {
  try {
    const plan = await StrategicPlan.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Strategic plan not found'
      });
    }

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Get strategic plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create strategic plan
// @route   POST /api/strategic-plans
// @access  Private
exports.createStrategicPlan = async (req, res) => {
  try {
    const plan = await StrategicPlan.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Create strategic plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update strategic plan
// @route   PUT /api/strategic-plans/:id
// @access  Private
exports.updateStrategicPlan = async (req, res) => {
  try {
    const plan = await StrategicPlan.findByPk(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Strategic plan not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && plan.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this strategic plan'
      });
    }

    await plan.update(req.body);

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Update strategic plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete strategic plan
// @route   DELETE /api/strategic-plans/:id
// @access  Private
exports.deleteStrategicPlan = async (req, res) => {
  try {
    const plan = await StrategicPlan.findByPk(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Strategic plan not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete strategic plans'
      });
    }

    await plan.destroy();

    res.json({
      success: true,
      message: 'Strategic plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete strategic plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get strategic plan statistics
// @route   GET /api/strategic-plans/stats
// @access  Private
exports.getStrategicPlanStats = async (req, res) => {
  try {
    const { department, academicYear } = req.query;
    const where = {};
    
    if (department) where.department = department;
    if (academicYear) where.academicYear = academicYear;

    const { sequelize } = require('../config/database');

    const stats = await StrategicPlan.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('AVG', sequelize.col('progress')), 'avgProgress']
      ],
      group: ['status']
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get strategic plan stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
