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

    const dept = req.user.role === 'admin' ? null : req.user.department;

    const createdRecords = [];
    const errors = [];

    for (let i = 0; i < placements.length; i++) {
      const record = placements[i];

      // Normalize keys based on user's format:
      // Register Number, Name, AY (Academic Year), Department, Course, Company, Package
      const studentId = record.studentId || record['Register Number'];
      const studentName = record.studentName || record['Name'];
      const batch = record.batch || record['AY (Academic Year)'] || record['AY( Academic Year)'] || record['AY (Academic Year)'] || record['AY'] || record['Batch'];
      const department = record.department || record['Department'];
      const course = record.course || record['Course'] || null;
      const company = record.company || record['Company'];
      let packageVal = record.package !== undefined ? record.package : record['Package'];

      // Parse and normalize package/Salary (e.g. 8.5 LPA, 8,50,000, 8.5)
      let parsedPackage = 0;
      if (packageVal !== undefined && packageVal !== null) {
        if (typeof packageVal === 'string') {
          parsedPackage = parseFloat(packageVal.replace(/[^0-9.]/g, '')) || 0;
        } else {
          parsedPackage = parseFloat(packageVal) || 0;
        }
        if (parsedPackage > 1000) {
          parsedPackage = parsedPackage / 100000; // Convert 850000 to 8.5 LPA
        }
      }

      if (!studentName || !studentId || !batch || !company) {
        errors.push(`Row ${i + 1}: Missing required fields (Register Number, Name, AY (Academic Year), Company)`);
        continue;
      }

      // Force coordinator department
      const finalDept = dept || department || 'Computer Science and Engineering';

      try {
        const placement = await Placement.create({
          studentName,
          studentId,
          batch,
          department: finalDept,
          course,
          company,
          role: record.role || 'Not Specified',
          package: parsedPackage,
          placementType: record.placementType || 'placement',
          placementDate: record.placementDate || new Date().toISOString().split('T')[0],
          location: record.location || null,
          createdBy: req.user.id
        });

        createdRecords.push(placement);
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
    console.error('Bulk import placements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

