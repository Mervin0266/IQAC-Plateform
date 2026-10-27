const { Faculty } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { sanitizeFacultyData } = require('../utils/dataSanitizer');
const { logActionSafe } = require('../middleware/auditLogger');
const { parsePagination, formatPaginationResponse, streamBatchedExport } = require('../utils/paginationHelper');

// @desc    Get all faculty
// @route   GET /api/faculty
// @access  Private
exports.getFaculty = async (req, res) => {
  try {
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Faculty', false);
    const where = { ...scopeWhere };

    if (req.query.academicYear && req.query.academicYear !== 'all' && req.query.academicYear !== 'All') {
      where.academicYear = req.query.academicYear;
    }

    if ((req.user.role === 'admin' || req.user.role === 'authority') &&
        req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
      where.department = req.query.department;
    }

    const pagination = parsePagination(req.query);

    if (pagination.isExport || req.query.stream === 'true') {
      return await streamBatchedExport(res, {
        model: Faculty,
        where,
        order: [['sNo', 'ASC'], ['id', 'ASC']],
        batchSize: 1000,
        maxRecords: pagination.limit || 1000000,
        format: req.query.format === 'csv' ? 'csv' : 'json',
        filename: 'faculty_export',
        transformRow: (rawRow) => sanitizeFacultyData([rawRow], req.user, false)[0]
      });
    }

    const { page, limit, offset } = pagination;

    const { count, rows: faculty } = await Faculty.findAndCountAll({
      where,
      order: [['sNo', 'ASC'], ['id', 'ASC']],
      limit,
      offset
    });

    // Sensitive field protection: Never expose PAN in ordinary faculty list responses (Phase A5)
    const sanitized = sanitizeFacultyData(faculty, req.user, false);

    res.json(formatPaginationResponse({
      count,
      rows: sanitized,
      page,
      limit
    }));
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Create faculty
// @route   POST /api/faculty
// @access  Private
exports.createFaculty = async (req, res) => {
  try {
    const maxSNoFaculty = await Faculty.findOne({
      order: [['sNo', 'DESC']]
    });
    const nextSNo = maxSNoFaculty && maxSNoFaculty.sNo ? maxSNoFaculty.sNo + 1 : 1;

    const record = {
      ...req.body,
      sNo: req.body.sNo || nextSNo,
      academicYear: req.body.academicYear || '2024-2025'
    };

    if (req.user && req.user.role !== 'admin' && req.user.department) {
      record.department = req.user.department;
    }

    const existing = await Faculty.findOne({
      where: {
        employeeId: record.employeeId,
        academicYear: record.academicYear
      }
    });

    if (existing) {
      if (req.user && req.user.role !== 'admin' && existing.department !== req.user.department) {
        return res.status(403).json({ success: false, message: 'Not authorized to update faculty in another department.' });
      }
      await existing.update(record);
      return res.json({
        success: true,
        data: sanitizeFacultyData(existing, req.user)
      });
    }

    const faculty = await Faculty.create(record);
    res.status(201).json({
      success: true,
      data: sanitizeFacultyData(faculty, req.user)
    });
  } catch (error) {
    console.error('Create faculty error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Bulk create faculty from CSV upload
// @route   POST /api/faculty/bulk
// @access  Private (admin/coordinator)
exports.bulkCreateFaculty = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { faculty: facultyList } = req.body;
    if (!Array.isArray(facultyList) || facultyList.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No faculty records provided'
      });
    }

    const maxSNoFaculty = await Faculty.findOne({
      order: [['sNo', 'DESC']],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    let nextSNo = maxSNoFaculty && maxSNoFaculty.sNo ? maxSNoFaculty.sNo + 1 : 1;

    const errors = [];
    const created = [];

    for (let i = 0; i < facultyList.length; i++) {
      const raw = facultyList[i];
      if (!raw || !raw.employeeId) {
        errors.push(`Row ${i + 1}: employeeId is required.`);
        continue;
      }

      const record = { ...raw };
      if (!record.academicYear) {
        record.academicYear = '2024-2025';
      }

      if (!record.name || String(record.name).trim() === '') {
        errors.push(`Row ${i + 1} (${record.employeeId}): name is required.`);
        continue;
      }

      if (req.user && req.user.role !== 'admin' && req.user.department) {
        record.department = req.user.department;
      }

      // Sanitize Date fields: dateOfBirth, dateOfJoining
      ['dateOfBirth', 'dateOfJoining'].forEach(df => {
        const val = record[df];
        if (!val || String(val).toLowerCase() === 'nil' || String(val).toLowerCase() === 'n/a' || String(val).toLowerCase() === 'invalid date' || String(val).trim() === '') {
          record[df] = null;
        } else {
          const d = new Date(val);
          if (isNaN(d.getTime())) {
            record[df] = null;
          } else {
            record[df] = d.toISOString().split('T')[0];
          }
        }
      });

      // Sanitize ENUM fields: gender, status
      if (!record.gender || !['Male', 'Female', 'Other'].includes(String(record.gender).trim())) {
        record.gender = 'Male';
      }
      if (!record.status || !['Active', 'On Sabbatical', 'Relieved'].includes(String(record.status).trim())) {
        record.status = 'Active';
      }

      // Fallback string fields to 'NIL'
      Object.keys(record).forEach(k => {
        if (!['sNo', 'dateOfBirth', 'dateOfJoining'].includes(k)) {
          if (record[k] === undefined || record[k] === null || record[k] === '' || record[k] === 'N/A' || String(record[k]).trim() === '') {
            record[k] = 'NIL';
          }
        }
      });

    // Batch look up all employeeIds in 1 query
    const allEmpIds = faculty.map(f => f && f.employeeId ? String(f.employeeId).trim() : null).filter(Boolean);
    const existingFacultyRecords = await Faculty.findAll({
      where: { employeeId: { [Op.in]: allEmpIds } },
      transaction: t
    });

    const compositeMap = new Map();
    const anyDeptMap = new Map();
    for (const ef of existingFacultyRecords) {
      compositeMap.set(`${ef.employeeId}_${ef.academicYear}`, ef);
      if (!anyDeptMap.has(ef.employeeId)) {
        anyDeptMap.set(ef.employeeId, ef.department);
      }
    }

    const toCreate = [];

    for (let i = 0; i < faculty.length; i++) {
      const record = faculty[i];
      if (!record.employeeId) continue;

      try {
        const compKey = `${record.employeeId}_${record.academicYear}`;
        const existing = compositeMap.get(compKey);

        if (existing) {
          if (req.user && req.user.role !== 'admin' && existing.department !== req.user.department) {
            errors.push(`Row ${i + 1} (${record.employeeId}): Not authorized to update faculty in another department.`);
            continue;
          }
          if (existing.sNo === null || existing.sNo === undefined) {
            record.sNo = nextSNo++;
          } else {
            record.sNo = existing.sNo;
          }
          await existing.update(record, { transaction: t });
          created.push(existing);
        } else {
          const anyDept = anyDeptMap.get(record.employeeId);
          if (anyDept && req.user && req.user.role !== 'admin' && anyDept !== req.user.department) {
            errors.push(`Row ${i + 1} (${record.employeeId}): Faculty belongs to another department (${anyDept}).`);
            continue;
          }

          if (!record.sNo) {
            record.sNo = nextSNo++;
          }
          toCreate.push(record);
        }
      } catch (err) {
        errors.push(`Row ${i + 1} (${record.employeeId || 'unknown'}): ${err.message || 'Validation error'}`);
      }
    }

    if (toCreate.length > 0) {
      const inserted = await Faculty.bulkCreate(toCreate, { transaction: t, returning: true });
      created.push(...inserted);
    }

    if (created.length === 0 && errors.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'All faculty records failed validation or authorization.',
        count: 0,
        errors
      });
    }

    await t.commit();

    await logActionSafe({
      user: req.user,
      action: 'BULK_UPLOAD_FACULTY',
      title: `Bulk uploaded faculty records`,
      remarks: `Processed ${created.length} faculty members with ${errors.length} errors.`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `${created.length} faculty record(s) uploaded successfully.${errors.length ? ` ${errors.length} error(s) encountered.` : ''}`,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Bulk create faculty error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update faculty
// @route   PUT /api/faculty/:id
// @access  Private
exports.updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty record not found'
      });
    }

    if (req.user && req.user.role !== 'admin' && faculty.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot update faculty records outside your department.'
      });
    }

    const updateData = { ...req.body };
    if (req.user && req.user.role !== 'admin' && req.user.department) {
      updateData.department = req.user.department;
    }

    await faculty.update(updateData);
    res.json({
      success: true,
      data: sanitizeFacultyData(faculty, req.user)
    });
  } catch (error) {
    console.error('Update faculty error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete faculty
// @route   DELETE /api/faculty/:id
// @access  Private
exports.deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty record not found'
      });
    }

    if (req.user && req.user.role !== 'admin' && faculty.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot delete faculty records outside your department.'
      });
    }

    await faculty.destroy();
    res.json({
      success: true,
      message: 'Faculty record deleted'
    });
  } catch (error) {
    console.error('Delete faculty error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Clear all faculty records
// @route   DELETE /api/faculty/clear-all
// @access  Private (Admin/Coordinator/HOD)
exports.clearAllFaculty = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'Faculty', true);

    let deletedCount = 0;
    await sequelize.transaction(async (t) => {
      deletedCount = await Faculty.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_FACULTY',
      title: `Cleared faculty records: ${scopeDescription}`,
      remarks: `Deleted ${deletedCount} faculty records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Faculty records (${deletedCount}) cleared successfully for ${scopeDescription}`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Clear all faculty error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
