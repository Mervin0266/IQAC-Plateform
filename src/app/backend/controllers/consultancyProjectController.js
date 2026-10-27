const { ConsultancyProject, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction, logActionSafe } = require('../middleware/auditLogger');
const { sendNotification } = require('../middleware/notificationHelper');
const { resolveDepartmentScope } = require('../utils/scopeHelper');

// @desc    Get all consultancy projects
// @route   GET /api/consultancy-projects
// @access  Private
exports.getConsultancyProjects = async (req, res) => {
  try {
    const { year, department, status } = req.query;

    const where = {};
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

    if (status && status !== 'all') {
      where.status = status;
    }

    const projects = await ConsultancyProject.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    console.error('Get consultancy projects error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get single consultancy project
// @route   GET /api/consultancy-projects/:id
// @access  Private
exports.getConsultancyProject = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Consultancy project not found'
      });
    }

    // Check departmental permission
    if (req.user.role === 'faculty' && project.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own records.'
      });
    }
    if ((req.user.role === 'coordinator' || req.user.role === 'hod') && project.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view records within your department.'
      });
    }
    // Institutional Authority can view records across all statuses

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Get consultancy project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create consultancy project
// @route   POST /api/consultancy-projects
// @access  Private (Admin, Coordinator, Faculty)
exports.createConsultancyProject = async (req, res) => {
  try {
    let initialStatus = req.body.status || 'draft';
    if (req.user.role === 'faculty') {
      initialStatus = 'submitted';
    }
    const dept = req.user.role === 'admin' || req.user.role === 'authority' ? (req.body.department || req.user.department || 'General') : req.user.department;

    const allowedCreateFields = [
      'projectName', 'clientName', 'clientAddress', 'principalConsultant', 'coConsultants',
      'financialYear', 'academicYear', 'startDate', 'endDate', 'sanctionedAmount', 'amountReceived',
      'remarks', 'proofUrl'
    ];
    const safeData = {};
    allowedCreateFields.forEach(f => {
      if (req.body[f] !== undefined) safeData[f] = req.body[f];
    });
    safeData.department = dept;
    safeData.status = initialStatus;
    safeData.createdBy = req.user.id;

    const project = await ConsultancyProject.create(safeData);

    // Log creation
    await logAction({
      recordId: project.id,
      achievementTitle: project.projectName,
      user: req.user,
      action: 'CONSULTANCY_PROJECT_CREATED',
      previousValue: null,
      updatedValue: project.toJSON()
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
          'New Consultancy Submission',
          `A new consultancy project "${project.projectName}" has been submitted by ${req.user.name}.`,
          'info'
        );
      }
    }

    res.status(201).json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Create consultancy project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update consultancy project
// @route   PUT /api/consultancy-projects/:id
// @access  Private
exports.updateConsultancyProject = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Consultancy project not found'
      });
    }

    const previousStatus = project.status;

    // Enforce Role Constraints
    if (req.user.role === 'faculty') {
      if (project.createdBy !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own records.'
        });
      }
      const allowedFacultyStatuses = ['draft', 'returned_for_correction', 'record_reopened'];
      if (!allowedFacultyStatuses.includes(previousStatus)) {
        return res.status(403).json({
          success: false,
          message: 'This record is locked. Please submit an Edit Request to modify it.'
        });
      }
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      if (project.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update records in your department.'
        });
      }
    } else if (req.user.role === 'authority') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Institutional Authorities cannot update records.'
      });
    }

    const allowedUpdateFields = [
      'projectName', 'clientName', 'clientAddress', 'principalConsultant', 'coConsultants',
      'financialYear', 'academicYear', 'startDate', 'endDate', 'sanctionedAmount', 'amountReceived',
      'remarks', 'proofUrl'
    ];
    const updates = {};
    allowedUpdateFields.forEach(f => {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    });

    // Only coordinator, hod, and admin can change workflow status
    if (['admin', 'hod', 'coordinator'].includes(req.user.role) && req.body.status !== undefined) {
      updates.status = req.body.status;
    }

    // Only admin can change department
    if (req.user.role === 'admin' && req.body.department !== undefined) {
      updates.department = req.body.department;
    }

    delete updates.id;
    delete updates.createdBy;

    const oldValues = project.toJSON();
    await project.update(updates);
    const newValues = project.toJSON();

    // Log update
    await logAction({
      recordId: project.id,
      achievementTitle: project.projectName,
      user: req.user,
      action: 'CONSULTANCY_PROJECT_UPDATED',
      previousValue: oldValues,
      updatedValue: newValues
    });

    // Handle Workflow Notifications
    if (previousStatus !== project.status) {
      const creator = await User.findByPk(project.createdBy);

      if (project.status === 'submitted') {
        const coordinators = await User.findAll({ where: { role: 'coordinator', department: project.department } });
        for (const coord of coordinators) {
          await sendNotification(coord.id, 'Consultancy Submission Under Review', `Consultancy project "${project.projectName}" has been submitted by ${req.user.name}.`);
        }
      } else if (project.status === 'approved') {
        const hods = await User.findAll({ where: { role: 'hod', department: project.department } });
        for (const hod of hods) {
          await sendNotification(hod.id, 'Action Required: Consultancy HOD Review', `Consultancy project "${project.projectName}" is approved by coordinator and awaits final HOD check.`);
        }
        if (creator) {
          await sendNotification(creator.id, 'Status Update: Approved by Coordinator', `Your consultancy project "${project.projectName}" has been approved by the coordinator.`);
        }
      } else if (project.status === 'finalized') {
        if (creator) {
          await sendNotification(creator.id, 'Consultancy Project Finalized', `Congratulations! Your consultancy project "${project.projectName}" has received final HOD approval.`, 'success');
        }
      } else if (project.status === 'returned_for_correction') {
        if (creator) {
          await sendNotification(creator.id, 'Action Required: Returned for Correction', `Your consultancy project "${project.projectName}" was returned for correction. Comments: ${req.body.remarks || 'Please check and resubmit.'}`, 'warning');
        }
      } else if (project.status === 'rejected') {
        if (creator) {
          await sendNotification(creator.id, 'Consultancy Project Rejected', `Your consultancy project "${project.projectName}" has been rejected.`, 'error');
        }
      }
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('Update consultancy project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete consultancy project
// @route   DELETE /api/consultancy-projects/:id
// @access  Private
exports.deleteConsultancyProject = async (req, res) => {
  try {
    const project = await ConsultancyProject.findByPk(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Consultancy project not found'
      });
    }

    // Role constraints for Deletion
    if (req.user.role === 'faculty') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Faculty members cannot delete records.'
      });
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      if (project.department !== req.user.department) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only delete records inside your own department.'
        });
      }
    } else if (req.user.role === 'authority') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Institutional Authorities cannot delete records.'
      });
    }

    const oldValues = project.toJSON();
    await project.destroy();

    // Log deletion
    await logAction({
      recordId: project.id,
      achievementTitle: project.projectName,
      user: req.user,
      action: 'CONSULTANCY_PROJECT_DELETED',
      previousValue: oldValues,
      updatedValue: null
    });

    res.json({
      success: true,
      message: 'Consultancy project deleted successfully'
    });
  } catch (error) {
    console.error('Delete consultancy project error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Clear all consultancy projects
// @route   DELETE /api/consultancy-projects/clear-all
// @access  Private (Admin / Coordinator / HOD)
exports.clearAllConsultancyProjects = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'ConsultancyProject', true);

    let count = 0;
    await sequelize.transaction(async (t) => {
      count = await ConsultancyProject.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_CONSULTANCY_PROJECTS',
      title: `Cleared consultancy projects: ${scopeDescription}`,
      remarks: `Deleted ${count} consultancy project records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Successfully cleared ${count} consultancy project record(s) for ${scopeDescription}.`
    });
  } catch (error) {
    console.error('Clear consultancy projects error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to clear consultancy project records'
    });
  }
};

// @desc    Get consultancy project statistics
// @route   GET /api/consultancy-projects/stats
// @access  Private
exports.getConsultancyStats = async (req, res) => {
  try {
    const { year } = req.query;

    const where = {};
    if (year && year !== 'all') where.year = year;

    if (req.user.role === 'faculty') {
      where.createdBy = req.user.id;
    } else if (req.user.role === 'coordinator' || req.user.role === 'hod') {
      where.department = req.user.department;
    }

    const total = await ConsultancyProject.count({ where });
    const totalRevenue = await ConsultancyProject.sum('revenueInLakhs', { where }) || 0;

    const byDepartment = await ConsultancyProject.findAll({
      where,
      attributes: [
        'department',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('revenueInLakhs')), 'revenue']
      ],
      group: ['department']
    });

    res.json({
      success: true,
      data: {
        total,
        totalRevenue,
        byDepartment
      }
    });
  } catch (error) {
    console.error('Get consultancy stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Bulk create consultancy projects
// @route   POST /api/consultancy-projects/bulk
// @access  Private (Admin, Coordinator, HOD)
exports.bulkCreateConsultancyProjects = async (req, res) => {
  try {
    const { consultancyProjects } = req.body;
    if (!Array.isArray(consultancyProjects) || consultancyProjects.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid consultancy projects data. Must be a non-empty array.'
      });
    }

    const dept = req.user.role === 'admin' || req.user.role === 'authority' ? null : req.user.department;

    const validRecords = [];
    const errors = [];

    for (let i = 0; i < consultancyProjects.length; i++) {
      const record = consultancyProjects[i];
      if (!record.teacherConsultant || !record.projectName || !record.sponsoringAgency || !record.year) {
        errors.push(`Row ${i + 1}: Missing required fields (teacherConsultant, projectName, sponsoringAgency, year)`);
        continue;
      }

      const finalDept = dept || record.department || 'Not Specified';

      validRecords.push({
        teacherConsultant: record.teacherConsultant,
        projectName: record.projectName,
        sponsoringAgency: record.sponsoringAgency,
        year: record.year,
        revenueInLakhs: parseFloat(record.revenueInLakhs) || 0,
        department: finalDept,
        status: record.status || 'draft',
        createdBy: req.user.id
      });
    }

    let createdRecords = [];
    if (validRecords.length > 0) {
      createdRecords = await ConsultancyProject.bulkCreate(validRecords, { returning: true });

      try {
        await logAction({
          user: req.user,
          action: 'CONSULTANCY_PROJECT_BULK_IMPORTED',
          title: `Bulk imported ${createdRecords.length} consultancy projects`,
          remarks: `Imported ${createdRecords.length} records. Errors: ${errors.length}`,
          ipAddress: req.ip
        });
      } catch (logErr) {}
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
