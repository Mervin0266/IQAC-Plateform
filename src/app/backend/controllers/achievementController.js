const { Achievement, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../middleware/auditLogger');
const { sendNotification } = require('../middleware/notificationHelper');

// @desc    Get all achievements
// @route   GET /api/achievements
// @access  Private
exports.getAchievements = async (req, res) => {
  try {
    const { category, year, department, status } = req.query;
    
    const where = {};
    if (category) where.category = category;
    if (year && year !== 'all') where.year = year;
    
    // Enforce data isolation based on role
    if (req.user.role === 'faculty') {
      where.createdBy = req.user.id;
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      where.department = req.user.department;
    } else {
      // Admin and Institutional Authority can filter by any department
      if (department && department !== 'all') {
        where.department = {
          [Op.iLike]: `%${department.replace(/-/g, '%')}%`
        };
      }
    }
    
    // Authorities can ONLY see finalized achievements
    if (req.user.role === 'authority') {
      where.status = 'finalized';
    } else if (status) {
      where.status = status;
    }

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

    // Check departmental permission
    if (req.user.role === 'faculty' && achievement.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own achievements.'
      });
    }
    if ((req.user.role === 'coordinator' || req.user.role === 'hod') && achievement.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view achievements within your department.'
      });
    }
    if (req.user.role === 'authority' && achievement.status !== 'finalized') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Institutional Authorities can only view finalized achievements.'
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
    let initialStatus = req.body.status || 'draft';
    if (req.user.role === 'faculty') {
      initialStatus = 'submitted';
    }
    const dept = req.user.role === 'admin' || req.user.role === 'authority' ? req.body.department : req.user.department;

    const achievement = await Achievement.create({
      ...req.body,
      department: dept,
      status: initialStatus,
      createdBy: req.user.id
    });

    // Log creation
    await logAction({
      recordId: achievement.id,
      achievementTitle: achievement.title,
      user: req.user,
      action: 'ACHIEVEMENT_CREATED',
      previousValue: null,
      updatedValue: achievement.toJSON()
    });

    // If submitted directly, send notification to Coordinators
    if (initialStatus === 'submitted') {
      const coordinators = await User.findAll({
        where: {
          role: 'coordinator',
          department: dept
        }
      });
      for (const coord of coordinators) {
        await sendNotification(
          coord.id,
          'New Submission Received',
          `A new achievement "${achievement.title}" has been submitted for review by ${req.user.name}.`,
          'info'
        );
      }
    }

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
// @access  Private
exports.updateAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findByPk(req.params.id);

    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    const previousStatus = achievement.status;

    // Enforce Role Constraints
    if (req.user.role === 'faculty') {
      // Ownership check
      if (achievement.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own achievements.'
        });
      }
      // Lock constraint check (only allow edits if draft, returned, or reopened)
      const allowedFacultyStatuses = ['draft', 'returned_for_correction', 'record_reopened'];
      if (!allowedFacultyStatuses.includes(previousStatus)) {
        return res.status(403).json({
          success: false,
          message: 'This record is locked. Please submit an Edit Request to modify it.'
        });
      }
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      // Department constraint check
      if (achievement.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update achievements in your department.'
        });
      }
    } else if (req.user.role === 'authority') {
      // Institutional authority is read-only
      return res.status(403).json({
        success: false,
        message: 'Access denied. Institutional Authorities cannot update achievements.'
      });
    }

    const oldValues = achievement.toJSON();
    await achievement.update(req.body);
    const newValues = achievement.toJSON();

    // Log update
    await logAction({
      recordId: achievement.id,
      achievementTitle: achievement.title,
      user: req.user,
      action: 'ACHIEVEMENT_UPDATED',
      previousValue: oldValues,
      updatedValue: newValues
    });

    // Handle Workflow Notifications
    if (previousStatus !== achievement.status) {
      const creator = await User.findByPk(achievement.createdBy);
      
      if (achievement.status === 'submitted') {
        // Notify Coordinator
        const coordinators = await User.findAll({ where: { role: 'coordinator', department: achievement.department } });
        for (const coord of coordinators) {
          await sendNotification(coord.id, 'Submission Under Review', `Achievement "${achievement.title}" has been submitted by ${req.user.name}.`);
        }
      } else if (achievement.status === 'approved') {
        // Notify HOD
        const hods = await User.findAll({ where: { role: 'hod', department: achievement.department } });
        for (const hod of hods) {
          await sendNotification(hod.id, 'Action Required: Final HOD Review', `Achievement "${achievement.title}" is approved by coordinator and awaits final HOD check.`);
        }
        if (creator) {
          await sendNotification(creator.id, 'Status Update: Approved by Coordinator', `Your achievement "${achievement.title}" has been approved by the coordinator.`);
        }
      } else if (achievement.status === 'finalized') {
        if (creator) {
          await sendNotification(creator.id, 'Submission Approved & Finalized', `Congratulations! Your achievement "${achievement.title}" has received final HOD approval.`, 'success');
        }
      } else if (achievement.status === 'returned_for_correction') {
        if (creator) {
          await sendNotification(creator.id, 'Action Required: Returned for Correction', `Your achievement "${achievement.title}" was returned for correction. Comments: ${req.body.remarks || 'Please check and resubmit.'}`, 'warning');
        }
      } else if (achievement.status === 'rejected') {
        if (creator) {
          await sendNotification(creator.id, 'Submission Rejected', `Your achievement "${achievement.title}" has been rejected.`, 'error');
        }
      }
    }

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
// @access  Private
exports.deleteAchievement = async (req, res) => {
  try {
    const achievement = await Achievement.findByPk(req.params.id);

    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    // Role constraints for Deletion
    if (req.user.role === 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty members cannot delete achievement records.'
      });
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      if (achievement.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete achievements inside your own department.'
        });
      }
    } else if (req.user.role === 'authority') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Institutional Authorities cannot delete records.'
      });
    }

    const oldValues = achievement.toJSON();
    await achievement.destroy();

    // Log deletion
    await logAction({
      recordId: achievement.id,
      achievementTitle: achievement.title,
      user: req.user,
      action: 'ACHIEVEMENT_DELETED',
      previousValue: oldValues,
      updatedValue: null
    });

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
    
    // Isolation filter for stats
    const where = {};
    if (year) where.year = year;

    if (req.user.role === 'faculty') {
      where.createdBy = req.user.id;
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      where.department = req.user.department;
    } else if (req.user.role === 'authority') {
      where.status = 'finalized';
    }

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

// @desc    Bulk create achievements
// @route   POST /api/achievements/bulk
// @access  Private (Admin, Coordinator, HOD)
exports.bulkCreateAchievements = async (req, res) => {
  try {
    const { achievements } = req.body;
    if (!Array.isArray(achievements) || achievements.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid achievements data. Must be a non-empty array.'
      });
    }

    const dept = req.user.role === 'admin' || req.user.role === 'authority' ? null : req.user.department;

    const createdRecords = [];
    const errors = [];

    for (let i = 0; i < achievements.length; i++) {
      const record = achievements[i];
      if (!record.title || !record.category || !record.date || !record.year) {
        errors.push(`Row ${i + 1}: Missing required fields (title, category, date, year)`);
        continue;
      }

      // Force coordinator/HOD department
      const finalDept = dept || record.department || 'Computer Science and Engineering';

      try {
        const achievement = await Achievement.create({
          ...record,
          department: finalDept,
          status: record.status || 'draft',
          createdBy: req.user.id
        });

        // Log action
        await logAction({
          recordId: achievement.id,
          achievementTitle: achievement.title,
          user: req.user,
          action: 'ACHIEVEMENT_BULK_IMPORTED',
          previousValue: null,
          updatedValue: achievement.toJSON()
        });

        createdRecords.push(achievement);
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message || 'Validation error'}`);
      }
    }

    if (errors.length > 0 && createdRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Bulk import failed completely.',
        errors
      });
    }

    res.status(201).json({
      success: true,
      message: `Bulk import completed. Successfully imported ${createdRecords.length} records.`,
      count: createdRecords.length,
      errors: errors.length > 0 ? errors : null,
      data: createdRecords
    });
  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

