const { StrategicPlan, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { logActionSafe } = require('../middleware/auditLogger');

// @desc    Get all strategic plans
// @route   GET /api/strategic-plans
// @access  Private
exports.getStrategicPlans = async (req, res) => {
  try {
    const { academicYear, category, status } = req.query;
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'StrategicPlan', false);
    const where = { ...scopeWhere };

    if ((req.user.role === 'admin' || req.user.role === 'authority') &&
        req.query.department && req.query.department !== 'All') {
      where.department = req.query.department;
    }
    if (academicYear) where.academicYear = academicYear;
    if (category) where.category = category;
    if (status) where.status = status;

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

const ALLOWED_PLAN_FIELDS = [
  'academicYear', 'category', 'objective', 'description', 'targetDate',
  'status', 'progress', 'budget', 'responsible', 'kpis'
];

// @desc    Create strategic plan
// @route   POST /api/strategic-plans
// @access  Private
exports.createStrategicPlan = async (req, res) => {
  try {
    const dept = req.user.role === 'admin' ? (req.body.department || 'General') : (req.user.department || 'General');
    const safeData = {};
    ALLOWED_PLAN_FIELDS.forEach(f => {
      if (req.body[f] !== undefined) safeData[f] = req.body[f];
    });
    safeData.department = dept;
    safeData.createdBy = req.user.id;

    const plan = await StrategicPlan.create(safeData);

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

    if (req.user.role !== 'admin' && req.user.department && plan.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot update strategic plans outside your department.'
      });
    }

    const updates = {};
    ALLOWED_PLAN_FIELDS.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    if (req.user.role === 'admin' && req.body.department !== undefined) {
      updates.department = req.body.department;
    }

    delete updates.id;
    delete updates.createdBy;

    await plan.update(updates);

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

// @desc    Clear all strategic plans
// @route   DELETE /api/strategic-plans/clear-all
// @access  Private (Admin/Coordinator/HOD)
exports.clearAllStrategicPlans = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'StrategicPlan', true);

    let deletedCount = 0;
    await sequelize.transaction(async (t) => {
      deletedCount = await StrategicPlan.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_STRATEGIC_PLANS',
      title: `Cleared strategic plans: ${scopeDescription}`,
      remarks: `Deleted ${deletedCount} strategic plan records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `All strategic plans (${deletedCount}) cleared successfully for ${scopeDescription}`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Clear all strategic plans error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

