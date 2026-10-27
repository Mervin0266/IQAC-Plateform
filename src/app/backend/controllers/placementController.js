const { Placement, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { logActionSafe } = require('../middleware/auditLogger');
const { parsePagination, formatPaginationResponse } = require('../utils/paginationHelper');

// @desc    Get all placements
// @route   GET /api/placements
// @access  Private
exports.getPlacements = async (req, res) => {
  try {
    const { batch, placementType, company } = req.query;
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Placement', false);
    
    const where = { ...scopeWhere };
    if ((req.user.role === 'admin' || req.user.role === 'authority') &&
        req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
      where.department = req.query.department;
    }
    if (batch) where.batch = batch;
    if (placementType) where.placementType = placementType;
    if (company) where.company = { [Op.iLike]: `%${company}%` };

    const { page, limit, offset } = parsePagination(req.query);

    const { count, rows: placements } = await Placement.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email']
      }],
      order: [['placementDate', 'DESC'], ['id', 'ASC']],
      limit,
      offset,
      distinct: true
    });

    res.json(formatPaginationResponse({
      count,
      rows: placements,
      page,
      limit
    }));
  } catch (error) {
    console.error('Get placements error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get placement statistics
// @route   GET /api/placements/stats
// @access  Private
exports.getPlacementStats = async (req, res) => {
  try {
    const { batch } = req.query;
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Placement', false);
    const where = { ...scopeWhere };
    
    if (batch) where.batch = batch;
    if ((req.user.role === 'admin' || req.user.role === 'authority') &&
        req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
      where.department = req.query.department;
    }

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
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

const ALLOWED_PLACEMENT_FIELDS = [
  'studentId', 'studentName', 'batch', 'course', 'company', 'package', 'offerLetterUrl'
];

// @desc    Create placement
// @route   POST /api/placements
// @access  Private
exports.createPlacement = async (req, res) => {
  try {
    const dept = req.user.role === 'admin' ? (req.body.department || 'General') : (req.user.department || 'General');
    const record = {};
    ALLOWED_PLACEMENT_FIELDS.forEach(f => {
      if (req.body[f] !== undefined) record[f] = req.body[f];
    });
    record.department = dept;
    record.createdBy = req.user.id;

    const placement = await Placement.create(record);

    res.status(201).json({
      success: true,
      data: placement
    });
  } catch (error) {
    console.error('Create placement error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
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
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && req.user.role !== 'hod') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update placements'
      });
    }

    if (req.user.role !== 'admin' && placement.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot update placements outside your department.'
      });
    }

    const updateData = {};
    ALLOWED_PLACEMENT_FIELDS.forEach(f => {
      if (req.body[f] !== undefined) updateData[f] = req.body[f];
    });
    if (req.user.role === 'admin' && req.body.department !== undefined) {
      updateData.department = req.body.department;
    }

    delete updateData.id;
    delete updateData.createdBy;

    await placement.update(updateData);

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
    if (req.user.role !== 'admin' && req.user.role !== 'coordinator' && req.user.role !== 'hod') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete placements'
      });
    }

    if (req.user.role !== 'admin' && placement.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot delete placements outside your department.'
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

// @desc    Bulk create placements
// @route   POST /api/placements/bulk
// @access  Private (Admin, Coordinator)
exports.bulkCreatePlacements = async (req, res) => {
  try {
    const { placements } = req.body;
    if (!Array.isArray(placements) || placements.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid placements data. Must be a non-empty array.'
      });
    }

    const userDept = req.user.role === 'admin' ? null : req.user.department;

    const validRecords = [];
    const errors = [];

    for (let i = 0; i < placements.length; i++) {
      const record = placements[i];

      const studentId = record.studentId || record['Register Number'];
      const studentName = record.studentName || record['Name'];
      const batch = record.batch || record['AY (Academic Year)'] || record['AY( Academic Year)'] || record['AY (Academic Year)'] || record['AY'] || record['Batch'];
      const department = userDept || record.department || record['Department'];
      const course = record.course || record['Course'] || null;
      const company = record.company || record['Company'];
      let packageVal = record.package !== undefined ? record.package : record['Package'];

      let parsedPackage = 0;
      if (packageVal !== undefined && packageVal !== null) {
        if (typeof packageVal === 'string') {
          parsedPackage = parseFloat(packageVal.replace(/[^0-9.]/g, '')) || 0;
        } else {
          parsedPackage = parseFloat(packageVal) || 0;
        }
        if (parsedPackage > 1000) {
          parsedPackage = parsedPackage / 100000;
        }
      }

      if (!studentName || !studentId || !batch || !company) {
        errors.push({
          row: i + 1,
          message: 'Missing mandatory fields: Name, Register Number, Batch, or Company.'
        });
        continue;
      }

      if (userDept && department && department !== userDept) {
        errors.push({
          row: i + 1,
          message: `Cannot upload placement records for another department (${department}).`
        });
        continue;
      }

      validRecords.push({
        studentName,
        studentId,
        batch,
        department: userDept || department,
        course,
        company,
        package: parsedPackage,
        placementType: record.placementType || record['Placement Type'] || 'On-Campus',
        offerLetterUrl: record.offerLetterUrl || null,
        remarks: record.remarks || null,
        createdBy: req.user.id
      });
    }

    let createdRecords = [];
    if (validRecords.length > 0) {
      createdRecords = await Placement.bulkCreate(validRecords, { returning: true });
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
    console.error('Bulk import placements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Clear all placement records
// @route   DELETE /api/placements/clear-all
// @access  Private (Admin/Coordinator/HOD)
exports.clearAllPlacements = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'Placement', true);

    let deletedCount = 0;
    await sequelize.transaction(async (t) => {
      deletedCount = await Placement.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_PLACEMENTS',
      title: `Cleared placement records: ${scopeDescription}`,
      remarks: `Deleted ${deletedCount} placement records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Placement records (${deletedCount}) cleared successfully for ${scopeDescription}`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Clear all placements error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
