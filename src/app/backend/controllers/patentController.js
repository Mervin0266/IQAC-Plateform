const { Patent, User } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { logAction } = require('../middleware/auditLogger');
const { sendNotification } = require('../middleware/notificationHelper');

// @desc    Get all patents with filtering, searching, and role isolation
// @route   GET /api/patents
// @access  Private / Public (optional)
exports.getPatents = async (req, res) => {
  try {
    const {
      status,
      patentType,
      academicYear,
      year,
      department,
      search
    } = req.query;

    const where = {};
    const selectedYear = academicYear || year;

    if (status && status !== 'all') {
      where.status = {
        [Op.iLike]: `%${status.trim()}%`
      };
    }

    if (patentType && patentType !== 'all') {
      where.patentType = {
        [Op.iLike]: `%${patentType.trim()}%`
      };
    }

    if (selectedYear && selectedYear !== 'all') {
      where.academicYear = selectedYear;
    }

    // Role-based data isolation
    if (req.user) {
      if (req.user.role === 'coordinator' || req.user.role === 'hod') {
        if (req.user.department && req.user.department !== 'All') {
          where.department = {
            [Op.iLike]: `%${req.user.department}%`
          };
        }
      } else if (req.user.role === 'authority') {
        where.approvalStatus = 'finalized';
      }
    }

    // Explicit department filter
    if (department && department !== 'all') {
      where.department = {
        [Op.iLike]: `%${department.replace(/-/g, '%')}%`
      };
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      where[Op.or] = [
        { title: { [Op.iLike]: q } },
        { inventors: { [Op.iLike]: q } },
        { applicationNo: { [Op.iLike]: q } },
        { patentNo: { [Op.iLike]: q } },
        { department: { [Op.iLike]: q } },
        { partner: { [Op.iLike]: q } },
        { patentType: { [Op.iLike]: q } }
      ];
    }

    const patents = await Patent.findAll({
      where,
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'name', 'email', 'department']
      }],
      order: [
        ['academicYear', 'DESC'],
        ['filedDate', 'DESC'],
        ['createdAt', 'DESC']
      ]
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
      message: 'Failed to retrieve patent records',
      error: error.message
    });
  }
};

// @desc    Get aggregate patent statistics
// @route   GET /api/patents/stats
// @access  Private / Public
exports.getPatentStats = async (req, res) => {
  try {
    const { year, department } = req.query;
    const where = {};

    if (year && year !== 'all') where.academicYear = year;
    if (department && department !== 'all') {
      where.department = { [Op.iLike]: `%${department}%` };
    }

    const allPatents = await Patent.findAll({ where });

    let filedCount = 0;
    let publishedCount = 0;
    let grantedCount = 0;
    let commercializedCount = 0;
    let totalRevenue = 0;
    let nationalCount = 0;
    let internationalCount = 0;

    const departmentBreakdown = {};
    const yearBreakdown = {};

    allPatents.forEach(p => {
      const s = (p.status || '').toLowerCase();
      if (s.includes('commercial')) {
        commercializedCount++;
      } else if (s.includes('grant')) {
        grantedCount++;
      } else if (s.includes('publish')) {
        publishedCount++;
      } else {
        filedCount++;
      }

      const pType = (p.patentType || '').toLowerCase();
      if (pType.includes('international') || pType.includes('pct') || pType.includes('uspto') || pType.includes('epo')) {
        internationalCount++;
      } else {
        nationalCount++;
      }

      totalRevenue += Number(p.revenue) || 0;

      const dept = p.department || 'Unassigned';
      departmentBreakdown[dept] = (departmentBreakdown[dept] || 0) + 1;

      const y = p.academicYear || 'Unknown';
      yearBreakdown[y] = (yearBreakdown[y] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        total: allPatents.length,
        filed: filedCount,
        published: publishedCount,
        granted: grantedCount,
        commercialized: commercializedCount,
        national: nationalCount,
        international: internationalCount,
        totalRevenue,
        departmentBreakdown,
        yearBreakdown
      }
    });
  } catch (error) {
    console.error('Get patent stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate patent statistics',
      error: error.message
    });
  }
};

// @desc    Get single patent by ID
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
        message: 'Patent record not found'
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
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new patent record
// @route   POST /api/patents
// @access  Private
exports.createPatent = async (req, res) => {
  try {
    const {
      title,
      inventors,
      applicationNo,
      patentNo,
      status,
      patentType,
      department,
      academicYear,
      filedDate,
      publishedDate,
      grantedDate,
      licenseDate,
      partner,
      revenue,
      patentUrl,
      description,
      approvalStatus
    } = req.body;

    // Validation for required fields
    if (!title || !inventors) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: Patent Title and Inventor Name(s).'
      });
    }

    const rawInventors = Array.isArray(inventors) ? inventors.join(', ') : String(inventors);
    const assignedDept = department || req.user.department || 'General';
    const assignedYear = academicYear || '2024-2025';

    const patent = await Patent.create({
      title: title.trim(),
      inventors: rawInventors.trim(),
      applicationNo: applicationNo ? applicationNo.trim() : null,
      patentNo: patentNo ? patentNo.trim() : null,
      status: status || 'published',
      patentType: patentType || 'National (Indian)',
      department: assignedDept.trim(),
      academicYear: assignedYear.trim(),
      filedDate: filedDate || null,
      publishedDate: publishedDate || null,
      grantedDate: grantedDate || null,
      licenseDate: licenseDate || null,
      partner: partner ? partner.trim() : null,
      revenue: revenue ? parseFloat(revenue) : 0.00,
      patentUrl: patentUrl ? patentUrl.trim() : null,
      description: description ? description.trim() : null,
      approvalStatus: approvalStatus || (req.user.role === 'admin' ? 'approved' : 'submitted'),
      createdBy: req.user.id
    });

    await logAction(
      req.user.id,
      'CREATE_PATENT',
      'Patent',
      patent.id,
      null,
      patent.toJSON(),
      req
    );

    res.status(201).json({
      success: true,
      message: 'Patent record created successfully',
      data: patent
    });
  } catch (error) {
    console.error('Create patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create patent',
      error: error.message
    });
  }
};

// @desc    Update patent record
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

    if (req.user.role === 'faculty' && patent.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit patents created by you.'
      });
    }

    const oldValues = patent.toJSON();

    const allowedFields = [
      'title', 'inventors', 'applicationNo', 'patentNo', 'status', 'patentType',
      'department', 'academicYear', 'filedDate', 'publishedDate', 'grantedDate',
      'licenseDate', 'partner', 'revenue', 'patentUrl', 'description', 'approvalStatus'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'inventors' && Array.isArray(req.body.inventors)) {
          patent.inventors = req.body.inventors.join(', ');
        } else {
          patent[field] = req.body[field];
        }
      }
    });

    await patent.save();

    await logAction(
      req.user.id,
      'UPDATE_PATENT',
      'Patent',
      patent.id,
      oldValues,
      patent.toJSON(),
      req
    );

    res.json({
      success: true,
      message: 'Patent updated successfully',
      data: patent
    });
  } catch (error) {
    console.error('Update patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update patent',
      error: error.message
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

    if (req.user.role === 'faculty' && patent.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete patents created by you.'
      });
    }

    const oldValues = patent.toJSON();
    await patent.destroy();

    await logAction(
      req.user.id,
      'DELETE_PATENT',
      'Patent',
      req.params.id,
      oldValues,
      null,
      req
    );

    res.json({
      success: true,
      message: 'Patent deleted successfully'
    });
  } catch (error) {
    console.error('Delete patent error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete patent',
      error: error.message
    });
  }
};

// @desc    Bulk Upload Patents (from parsed CSV / Excel)
// @route   POST /api/patents/bulk
// @access  Private (Admin, HOD, Coordinator, Faculty)
exports.bulkUploadPatents = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, defaultDepartment, defaultYear } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No patent items provided for bulk upload.'
      });
    }

    const validRecords = [];
    const errors = [];

    items.forEach((item, index) => {
      const rowNum = index + 1;
      const title = item.title || item['Title'] || item['Patent Title'] || item['Title of Invention'] || item['Invention Title'] || '';
      const rawInventors = item.inventors || item['Inventors'] || item['Inventor Name'] || item['Inventor Names'] || item['Authors'] || '';
      const applicationNo = item.applicationNo || item['Application No'] || item['Application Number'] || item['Application No.'] || '';
      const patentNo = item.patentNo || item['Patent No'] || item['Patent Number'] || item['Patent No.'] || item['Grant No'] || '';
      const rawStatus = item.status || item['Status'] || item['Patent Status'] || item['Stage'] || 'Published';
      const rawType = item.patentType || item['Patent Type'] || item['Type'] || item['Jurisdiction'] || 'National (Indian)';
      const academicYear = item.academicYear || item['Academic Year'] || item['Year'] || defaultYear || '2024-2025';
      const department = item.department || item['Department'] || defaultDepartment || req.user.department || 'General';
      const filedDate = item.filedDate || item['Filing Date'] || item['Filed Date'] || item['Date of Filing'] || null;
      const publishedDate = item.publishedDate || item['Publication Date'] || item['Published Date'] || item['Date of Publication'] || null;
      const grantedDate = item.grantedDate || item['Grant Date'] || item['Granted Date'] || item['Date of Grant'] || null;
      const licenseDate = item.licenseDate || item['License Date'] || item['Commercialized Date'] || null;
      const partner = item.partner || item['Partner'] || item['Commercial Partner'] || item['Licensee'] || item['Industry Partner'] || '';
      const revenue = item.revenue || item['Revenue'] || item['Revenue Generated'] || item['Royalty'] || 0;
      const patentUrl = item.patentUrl || item['URL'] || item['Patent Link'] || item['Document URL'] || '';
      const description = item.description || item['Abstract'] || item['Description'] || item['Summary'] || '';

      if (!String(title).trim()) {
        errors.push(`Row ${rowNum}: Patent Title is required.`);
        return;
      }
      if (!String(rawInventors).trim()) {
        errors.push(`Row ${rowNum}: Inventor Name(s) is required.`);
        return;
      }

      // Normalize status
      let normalizedStatus = String(rawStatus).trim().toLowerCase();
      if (normalizedStatus.includes('commercial') || normalizedStatus.includes('license')) {
        normalizedStatus = 'commercialized';
      } else if (normalizedStatus.includes('grant')) {
        normalizedStatus = 'granted';
      } else if (normalizedStatus.includes('publish')) {
        normalizedStatus = 'published';
      } else if (normalizedStatus.includes('exam')) {
        normalizedStatus = 'under_examination';
      } else {
        normalizedStatus = 'filed';
      }

      // Normalize patent type
      let normalizedType = String(rawType).trim();
      const lowerType = normalizedType.toLowerCase();
      if (lowerType.includes('pct') || lowerType.includes('wipo')) {
        normalizedType = 'International (PCT)';
      } else if (lowerType.includes('uspto') || lowerType.includes('usa') || lowerType.includes('us')) {
        normalizedType = 'USPTO (USA)';
      } else if (lowerType.includes('epo') || lowerType.includes('europe')) {
        normalizedType = 'EPO (Europe)';
      } else if (lowerType.includes('international') || lowerType.includes('foreign')) {
        normalizedType = 'Other International';
      } else {
        normalizedType = 'National (Indian)';
      }

      const inventorsStr = Array.isArray(rawInventors) ? rawInventors.join(', ') : String(rawInventors);

      validRecords.push({
        title: String(title).trim(),
        inventors: inventorsStr.trim(),
        applicationNo: applicationNo ? String(applicationNo).trim() : null,
        patentNo: patentNo ? String(patentNo).trim() : null,
        status: normalizedStatus,
        patentType: normalizedType,
        department: String(department).trim(),
        academicYear: String(academicYear).trim(),
        filedDate: filedDate || null,
        publishedDate: publishedDate || null,
        grantedDate: grantedDate || null,
        licenseDate: licenseDate || null,
        partner: partner ? String(partner).trim() : null,
        revenue: revenue ? parseFloat(String(revenue).replace(/[^0-9.]/g, '')) || 0.00 : 0.00,
        patentUrl: patentUrl ? String(patentUrl).trim() : null,
        description: description ? String(description).trim() : null,
        approvalStatus: req.user.role === 'admin' ? 'approved' : 'submitted',
        createdBy: req.user.id
      });
    });

    if (validRecords.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No valid patent records found to insert.',
        errors
      });
    }

    const created = await Patent.bulkCreate(validRecords, {
      transaction: t,
      returning: true
    });

    await t.commit();

    await logAction(
      req.user.id,
      'BULK_UPLOAD_PATENTS',
      'Patent',
      null,
      null,
      { count: created.length, errorsCount: errors.length },
      req
    );

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${created.length} patent records.`,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined,
      data: created
    });
  } catch (error) {
    await t.rollback();
    console.error('Bulk upload patents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload for patents.',
      error: error.message
    });
  }
};

// @desc    Clear all patents (Admin / HOD)
// @route   DELETE /api/patents/clear-all
// @access  Private (Admin / HOD)
exports.clearAllPatents = async (req, res) => {
  try {
    const where = {};
    if (req.user.role === 'hod' && req.user.department) {
      where.department = req.user.department;
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only Administrators and HODs can clear patent records.'
      });
    }

    const count = await Patent.destroy({ where });

    await logAction(
      req.user.id,
      'CLEAR_ALL_PATENTS',
      'Patent',
      null,
      null,
      { clearedCount: count, scope: where },
      req
    );

    res.json({
      success: true,
      message: `Cleared ${count} patent records successfully.`
    });
  } catch (error) {
    console.error('Clear patents error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear patents',
      error: error.message
    });
  }
};
