const { Faculty } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { sanitizeFacultyData } = require('../utils/dataSanitizer');
const { logActionSafe } = require('../middleware/auditLogger');
const { parsePagination, formatPaginationResponse, streamBatchedExport } = require('../utils/paginationHelper');

// @desc    Get all faculty
/**
 * Build query conditions from request for faculty querying & dynamic statistics
 */
const buildFacultyFilterWhere = (req, scopeWhere) => {
  const andConditions = [];
  if (scopeWhere && Object.keys(scopeWhere).length > 0) {
    andConditions.push(scopeWhere);
  }

  // Academic Year Filter
  if (req.query.academicYear && req.query.academicYear !== 'all' && req.query.academicYear !== 'All') {
    const y = req.query.academicYear.trim();
    andConditions.push({
      [Op.or]: [
        { academicYear: y },
        { academicYear: { [Op.iLike]: `${y.slice(0, 4)}%` } }
      ]
    });
  }

  // Department Filter
  if ((req.user?.role === 'admin' || req.user?.role === 'authority') &&
      req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
    andConditions.push({
      department: { [Op.iLike]: req.query.department.trim() }
    });
  }

  // Designation Filter
  if (req.query.designation && req.query.designation !== 'all' && req.query.designation !== 'All') {
    andConditions.push({
      designation: { [Op.iLike]: `%${req.query.designation.trim()}%` }
    });
  }

  // Full-Text Search across major faculty fields
  const searchVal = (req.query.search || req.query.q || '').trim();
  if (searchVal) {
    const term = `%${searchVal}%`;
    andConditions.push({
      [Op.or]: [
        { name: { [Op.iLike]: term } },
        { employeeId: { [Op.iLike]: term } },
        { department: { [Op.iLike]: term } },
        { designation: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { highestQualification: { [Op.iLike]: term } },
        { qualificationLevel: { [Op.iLike]: term } }
      ]
    });
  }

  return {
    andConditions,
    where: andConditions.length > 0 ? { [Op.and]: andConditions } : {}
  };
};

const buildFacultySortOrder = (req) => {
  let order = [['sNo', 'ASC'], ['id', 'ASC']];
  if (req.query.sortBy) {
    const [field, dir] = req.query.sortBy.split('-');
    const validFields = ['sNo', 'name', 'department', 'designation', 'academicYear', 'employeeId'];
    const direction = (dir && dir.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
    if (validFields.includes(field)) {
      order = [[field, direction], ['id', 'ASC']];
    }
  }
  return order;
};

// @desc    Get all faculty with dynamic filters, pagination, and KPI stats
// @route   GET /api/faculty
// @access  Private
exports.getFaculty = async (req, res) => {
  try {
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Faculty', false);
    const { andConditions, where } = buildFacultyFilterWhere(req, scopeWhere);
    const order = buildFacultySortOrder(req);

    const pagination = parsePagination(req.query);

    if (pagination.isExport || req.query.stream === 'true') {
      return await streamBatchedExport(res, {
        model: Faculty,
        where,
        order,
        batchSize: 1000,
        maxRecords: pagination.limit || 1000000,
        format: req.query.format === 'csv' ? 'csv' : 'json',
        filename: 'faculty_export',
        transformRow: (rawRow) => sanitizeFacultyData([rawRow], req.user, false)[0]
      });
    }

    const { page, limit, offset } = pagination;

    // Concurrently fetch faculty page and compute dynamic distribution metrics on the EXACT filtered where
    const [
      facultyResult,
      phdCount,
      seniorCount,
      deptRows,
      desigRows,
      allYearsRows,
      expRows
    ] = await Promise.all([
      Faculty.findAndCountAll({
        where,
        order,
        limit,
        offset
      }),
      Faculty.count({
        where: {
          [Op.and]: [
            ...andConditions,
            {
              [Op.or]: [
                { qualificationLevel: { [Op.iLike]: '%PHD%' } },
                { highestQualification: { [Op.iLike]: '%DOCTOR%' } }
              ]
            }
          ]
        }
      }),
      Faculty.count({
        where: {
          [Op.and]: [
            ...andConditions,
            {
              [Op.or]: [
                { designation: { [Op.iLike]: '%Professor%' } },
                { designation: { [Op.iLike]: '%Head%' } },
                { designation: { [Op.iLike]: '%Dean%' } }
              ]
            }
          ]
        }
      }),
      Faculty.findAll({
        attributes: ['department', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where,
        group: ['department'],
        raw: true
      }),
      Faculty.findAll({
        attributes: ['designation', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where,
        group: ['designation'],
        raw: true
      }),
      Faculty.findAll({
        attributes: ['academicYear'],
        group: ['academicYear'],
        raw: true
      }),
      Faculty.findAll({
        attributes: ['prevTeachingExpYears', 'prevIndustryExpYears', 'cuExpYears'],
        where,
        raw: true
      })
    ]);

    const total = facultyResult.count;
    let totalExpYears = 0;
    expRows.forEach(f => {
      const prevY = parseFloat(f.prevTeachingExpYears || '0') || 0;
      const prevInd = parseFloat(f.prevIndustryExpYears || '0') || 0;
      const cuY = parseFloat(f.cuExpYears || '0') || 0;
      totalExpYears += (prevY + prevInd + cuY);
    });
    const avgExp = total > 0 ? (totalExpYears / total).toFixed(1) : '0';

    const deptCounts = {};
    deptRows.forEach(r => {
      if (r.department && r.department !== 'NIL' && r.department !== 'N/A') {
        deptCounts[r.department] = parseInt(r.count, 10);
      }
    });

    const desigCounts = {};
    desigRows.forEach(r => {
      if (r.designation && r.designation !== 'NIL' && r.designation !== 'N/A') {
        desigCounts[r.designation] = parseInt(r.count, 10);
      }
    });

    const stats = {
      total,
      phdCount,
      phdPercent: total > 0 ? ((phdCount / total) * 100).toFixed(1) : '0',
      seniorCadre: seniorCount,
      seniorPercent: total > 0 ? ((seniorCount / total) * 100).toFixed(1) : '0',
      depts: Object.keys(deptCounts).length,
      avgExp
    };

    // Sensitive field protection: Never expose PAN in ordinary faculty list responses (Phase A5)
    const sanitized = sanitizeFacultyData(facultyResult.rows, req.user, false);

    const responsePayload = formatPaginationResponse({
      count: total,
      rows: sanitized,
      page,
      limit
    });

    responsePayload.stats = stats;
    responsePayload.distribution = {
      departments: deptCounts,
      designations: desigCounts,
      academicYears: allYearsRows.map(r => r.academicYear).filter(Boolean)
    };

    res.json(responsePayload);
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get standalone faculty KPI stats matching active filters
// @route   GET /api/faculty/stats
// @access  Private
exports.getFacultyStats = async (req, res) => {
  try {
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Faculty', false);
    const { andConditions, where } = buildFacultyFilterWhere(req, scopeWhere);

    const [
      total,
      phdCount,
      seniorCount,
      deptRows,
      desigRows,
      allYearsRows,
      expRows
    ] = await Promise.all([
      Faculty.count({ where }),
      Faculty.count({
        where: {
          [Op.and]: [
            ...andConditions,
            {
              [Op.or]: [
                { qualificationLevel: { [Op.iLike]: '%PHD%' } },
                { highestQualification: { [Op.iLike]: '%DOCTOR%' } }
              ]
            }
          ]
        }
      }),
      Faculty.count({
        where: {
          [Op.and]: [
            ...andConditions,
            {
              [Op.or]: [
                { designation: { [Op.iLike]: '%Professor%' } },
                { designation: { [Op.iLike]: '%Head%' } },
                { designation: { [Op.iLike]: '%Dean%' } }
              ]
            }
          ]
        }
      }),
      Faculty.findAll({
        attributes: ['department', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where,
        group: ['department'],
        raw: true
      }),
      Faculty.findAll({
        attributes: ['designation', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where,
        group: ['designation'],
        raw: true
      }),
      Faculty.findAll({
        attributes: ['academicYear'],
        group: ['academicYear'],
        raw: true
      }),
      Faculty.findAll({
        attributes: ['prevTeachingExpYears', 'prevIndustryExpYears', 'cuExpYears'],
        where,
        raw: true
      })
    ]);

    let totalExpYears = 0;
    expRows.forEach(f => {
      const prevY = parseFloat(f.prevTeachingExpYears || '0') || 0;
      const prevInd = parseFloat(f.prevIndustryExpYears || '0') || 0;
      const cuY = parseFloat(f.cuExpYears || '0') || 0;
      totalExpYears += (prevY + prevInd + cuY);
    });
    const avgExp = total > 0 ? (totalExpYears / total).toFixed(1) : '0';

    const deptCounts = {};
    deptRows.forEach(r => {
      if (r.department && r.department !== 'NIL' && r.department !== 'N/A') {
        deptCounts[r.department] = parseInt(r.count, 10);
      }
    });

    const desigCounts = {};
    desigRows.forEach(r => {
      if (r.designation && r.designation !== 'NIL' && r.designation !== 'N/A') {
        desigCounts[r.designation] = parseInt(r.count, 10);
      }
    });

    const stats = {
      total,
      phdCount,
      phdPercent: total > 0 ? ((phdCount / total) * 100).toFixed(1) : '0',
      seniorCadre: seniorCount,
      seniorPercent: total > 0 ? ((seniorCount / total) * 100).toFixed(1) : '0',
      depts: Object.keys(deptCounts).length,
      avgExp
    };

    res.json({
      success: true,
      stats,
      distribution: {
        departments: deptCounts,
        designations: desigCounts,
        academicYears: allYearsRows.map(r => r.academicYear).filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Get faculty stats error:', error);
    res.status(500).json({
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
    const validRows = [];
    const empIds = new Set();

    // Step 1: Pre-process and sanitize records in memory
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

      const empId = String(record.employeeId).trim();
      empIds.add(empId);
      validRows.push({ index: i, record });
    }

    // Step 2: Batch look up all employeeIds in 1 query
    const allEmpIds = Array.from(empIds);
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

    // Step 3: Fast in-memory matching and updates
    for (const { index, record } of validRows) {
      try {
        const compKey = `${record.employeeId}_${record.academicYear}`;
        const existing = compositeMap.get(compKey);

        if (existing) {
          if (req.user && req.user.role !== 'admin' && existing.department !== req.user.department) {
            errors.push(`Row ${index + 1} (${record.employeeId}): Not authorized to update faculty in another department.`);
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
            errors.push(`Row ${index + 1} (${record.employeeId}): Faculty belongs to another department (${anyDept}).`);
            continue;
          }

          if (!record.sNo) {
            record.sNo = nextSNo++;
          }
          toCreate.push(record);
        }
      } catch (err) {
        errors.push(`Row ${index + 1} (${record.employeeId || 'unknown'}): ${err.message || 'Validation error'}`);
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
