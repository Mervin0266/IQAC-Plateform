const { EditRequest, Achievement, User } = require('../models');
const { logAction } = require('../middleware/auditLogger');
const { Op } = require('sequelize');

// @desc    Create edit request
// @route   POST /api/edit-requests
// @access  Private (Faculty)
exports.createEditRequest = async (req, res) => {
  try {
    const { achievementId, reason } = req.body;

    if (!achievementId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide achievementId and reason'
      });
    }

    const achievement = await Achievement.findByPk(achievementId);
    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }

    // Verify ownership
    if (achievement.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to request edits for this achievement'
      });
    }

    // Check if a pending request already exists
    const existing = await EditRequest.findOne({
      where: {
        achievementId,
        status: 'pending'
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An edit request is already pending for this achievement'
      });
    }

    // Create request
    const request = await EditRequest.create({
      achievementId,
      reason,
      status: 'pending',
      requestedBy: req.user.id
    });

    // Update achievement status
    const oldStatus = achievement.status;
    await achievement.update({ status: 'edit_requested' });

    // Log action
    await logAction({
      recordId: achievement.id,
      achievementTitle: achievement.title,
      user: req.user,
      action: 'EDIT_REQUEST_CREATED',
      previousValue: { status: oldStatus },
      updatedValue: { status: 'edit_requested' },
      remarks: `Reason: ${reason}`
    });

    res.status(201).json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Create edit request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all edit requests
// @route   GET /api/edit-requests
// @access  Private (Admin, Authority, HOD, Coordinator)
exports.getEditRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;

    let includeUserWhere = {};
    // Departmental isolation for HOD and Coordinator
    if (req.user.role === 'hod' || req.user.role === 'coordinator') {
      includeUserWhere.department = req.user.department;
    }

    const requests = await EditRequest.findAll({
      where,
      include: [
        {
          model: Achievement,
          as: 'achievement',
          attributes: ['id', 'title', 'status', 'department']
        },
        {
          model: User,
          as: 'requester',
          where: includeUserWhere,
          attributes: ['id', 'name', 'email', 'department']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    console.error('Get edit requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Approve or reject edit request
// @route   PUT /api/edit-requests/:id
// @access  Private (Admin, HOD, Coordinator)
exports.updateEditRequest = async (req, res) => {
  try {
    const { status, remarks } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide status as approved or rejected'
      });
    }

    const request = await EditRequest.findByPk(req.params.id, {
      include: [{ model: Achievement, as: 'achievement' }]
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Edit request not found'
      });
    }

    const achievement = request.achievement;

    // Check departmental permission
    if (req.user.role !== 'admin' && req.user.department !== achievement.department) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to manage requests in other departments'
      });
    }

    const remarksField = req.user.role === 'hod' ? 'hodRemarks' : 'coordinatorRemarks';
    
    // Update request status
    await request.update({
      status,
      [remarksField]: remarks
    });

    const oldStatus = achievement.status;
    let newStatus = oldStatus;

    if (status === 'approved') {
      newStatus = 'record_reopened';
      await achievement.update({ status: 'record_reopened' });
    } else {
      // Revert back to finalized
      newStatus = 'finalized';
      await achievement.update({ status: 'finalized' });
    }

    // Log action
    await logAction({
      recordId: achievement.id,
      achievementTitle: achievement.title,
      user: req.user,
      action: status === 'approved' ? 'EDIT_REQUEST_APPROVED' : 'EDIT_REQUEST_REJECTED',
      previousValue: { status: oldStatus },
      updatedValue: { status: newStatus },
      remarks: remarks || ''
    });

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Update edit request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
