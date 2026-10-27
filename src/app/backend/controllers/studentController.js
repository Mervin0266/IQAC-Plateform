const { Student } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { sanitizeStudentData } = require('../utils/dataSanitizer');
const { logActionSafe } = require('../middleware/auditLogger');
const { parsePagination, formatPaginationResponse, streamBatchedExport } = require('../utils/paginationHelper');

/**
 * Normalize a student record before any DB write.
 */
const normalizeStudentRecord = (record) => {
  const normalized = { ...record };

  // Auto-generate placeholder email from register number if completely missing
  if (!normalized.email || !normalized.email.trim() || normalized.email === 'NIL' || normalized.email === 'N/A') {
    const regNo = (normalized.registerNumber || 'student').toString().trim();
    normalized.email = `${regNo}@students.christuniversity.in`;
  }

  if (!normalized.academicYear || !normalized.academicYear.trim() || normalized.academicYear === 'NIL' || normalized.academicYear === 'N/A') {
    normalized.academicYear = '2024-2025';
  }

  // Provide 'N/A' fallback for every other nullable string / text field
  const nullableStringFields = [
    'phone', 'course', 'department', 'previousSchool', 'bloodGroup', 'batch',
    'guardianName', 'guardianPhone', 'address', 'className', 'applicationNo',
    'mobileNo', 'nationality', 'caste', 'currentCity', 'currentState',
    'permanentCity', 'permanentState', 'parentMobileNo', 'handicapped',
    'handicappedDescription', 'campus', 'school', 'programLevel', 'disability'
  ];

  for (const field of nullableStringFields) {
    if (normalized[field] === undefined || normalized[field] === null ||
        normalized[field] === '' || normalized[field] === 'N/A' || String(normalized[field]).trim() === '') {
      normalized[field] = 'NIL';
    }
  }

  // Handle Date fields safely (null if missing/NIL/N/A or invalid date)
  const dateFields = ['dob', 'admissionDate'];
  for (const df of dateFields) {
    if (!normalized[df] || normalized[df] === 'NIL' || normalized[df] === 'N/A' || String(normalized[df]).trim() === '') {
      normalized[df] = null;
    } else {
      const dStr = String(normalized[df]).trim();
      const parsed = new Date(dStr);
      if (isNaN(parsed.getTime())) {
        normalized[df] = null;
      }
    }
  }

  return normalized;
};

/**
 * Maps missing fields in a target student record from other historical academic year
 * records belonging to the same register number.
 * Scoped by department for non-admin/non-authority users.
 */
const enrichFromHistory = async (targetRecord, user) => {
  if (!targetRecord || !targetRecord.registerNumber) return targetRecord;

  const regNo = String(targetRecord.registerNumber).trim();
  const where = { registerNumber: regNo };

  if (user && user.role !== 'admin' && user.role !== 'authority' && user.department) {
    where.department = user.department;
  }

  const historicalRecords = await Student.findAll({
    where,
    order: [['createdAt', 'DESC']]
  });

  if (!historicalRecords || historicalRecords.length === 0) {
    return targetRecord;
  }

  const mapFields = [
    'name', 'email', 'phone', 'mobileNo', 'parentMobileNo',
    'guardianName', 'guardianPhone', 'gender', 'dob', 'bloodGroup',
    'nationality', 'caste', 'currentCity', 'currentState',
    'permanentCity', 'permanentState', 'address', 'handicapped',
    'handicappedDescription', 'disability', 'campus', 'school',
    'department', 'programLevel', 'course', 'className', 'applicationNo', 'previousSchool'
  ];

  const enriched = { ...targetRecord };

  for (const hist of historicalRecords) {
    for (const field of mapFields) {
      const currentVal = enriched[field];
      const isMissing = !currentVal || currentVal === 'N/A' || currentVal === 'NIL' || currentVal === '';
      const histVal = hist[field];
      const hasHistVal = histVal && histVal !== 'N/A' && histVal !== 'NIL' && histVal !== '';

      if (isMissing && hasHistVal) {
        enriched[field] = histVal;
      }
    }
  }

  return enriched;
};

// @desc    Get all students (optionally filter by academicYear, department, school, campus, programLevel, course)
/**
 * Build query conditions from request for student querying & dynamic statistics
 */
const buildStudentFilterWhere = (req, scopeWhere) => {
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

  // Department Filter (Admins/Authorities can filter any; others already scoped by scopeWhere)
  if ((req.user?.role === 'admin' || req.user?.role === 'authority') &&
      req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
    andConditions.push({
      department: { [Op.iLike]: req.query.department.trim() }
    });
  }

  // Program Level Filter (UG, PG, PhD)
  if (req.query.programLevel && req.query.programLevel !== 'all' && req.query.programLevel !== 'All') {
    andConditions.push({
      programLevel: { [Op.iLike]: req.query.programLevel.trim() }
    });
  }

  // Status Filter (Active, Graduated, On Leave)
  if (req.query.status && req.query.status !== 'all' && req.query.status !== 'All') {
    andConditions.push({
      status: { [Op.iLike]: req.query.status.trim() }
    });
  }

  // Campus Filter
  if (req.query.campus && req.query.campus !== 'all' && req.query.campus !== 'All') {
    andConditions.push({
      campus: { [Op.iLike]: req.query.campus.trim() }
    });
  }

  // School Filter
  if (req.query.school && req.query.school !== 'all' && req.query.school !== 'All') {
    andConditions.push({
      school: { [Op.iLike]: req.query.school.trim() }
    });
  }

  // Course Filter
  if (req.query.course && req.query.course !== 'all' && req.query.course !== 'All') {
    andConditions.push({
      course: { [Op.iLike]: req.query.course.trim() }
    });
  }

  // Full-Text Search across major student identifiers
  const searchVal = (req.query.search || req.query.q || '').trim();
  if (searchVal) {
    const term = `%${searchVal}%`;
    andConditions.push({
      [Op.or]: [
        { name: { [Op.iLike]: term } },
        { registerNumber: { [Op.iLike]: term } },
        { email: { [Op.iLike]: term } },
        { course: { [Op.iLike]: term } },
        { department: { [Op.iLike]: term } },
        { className: { [Op.iLike]: term } }
      ]
    });
  }

  return {
    andConditions,
    where: andConditions.length > 0 ? { [Op.and]: andConditions } : {}
  };
};

const buildStudentSortOrder = (req) => {
  let order = [['registerNumber', 'ASC'], ['academicYear', 'DESC'], ['id', 'ASC']];
  if (req.query.sortBy) {
    const [field, dir] = req.query.sortBy.split('-');
    const validFields = ['registerNumber', 'name', 'department', 'academicYear', 'programLevel', 'status', 'className'];
    const direction = (dir && dir.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
    if (validFields.includes(field)) {
      order = [[field, direction], ['registerNumber', 'ASC'], ['id', 'ASC']];
    }
  }
  return order;
};

// @desc    Get all students with filter support, pagination, and dynamic KPI analytics
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  try {
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Student', false);
    const { andConditions, where } = buildStudentFilterWhere(req, scopeWhere);
    const order = buildStudentSortOrder(req);

    const pagination = parsePagination(req.query);

    if (pagination.isExport || req.query.stream === 'true') {
      return await streamBatchedExport(res, {
        model: Student,
        where,
        order,
        batchSize: 1000,
        maxRecords: pagination.limit || 1000000,
        format: req.query.format === 'csv' ? 'csv' : 'json',
        filename: 'students_export',
        transformRow: (rawRow) => sanitizeStudentData([rawRow], req.user)[0]
      });
    }

    const { page, limit, offset } = pagination;

    // Concurrently fetch students page and compute dynamic distribution metrics on the EXACT filtered where
    const [
      studentsResult,
      activeCount,
      deptRows,
      levelRows,
      allYearsRows
    ] = await Promise.all([
      Student.findAndCountAll({
        where,
        order,
        limit,
        offset
      }),
      Student.count({
        where: {
          [Op.and]: [...andConditions, { status: 'Active' }]
        }
      }),
      Student.findAll({
        attributes: ['department', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where,
        group: ['department'],
        raw: true
      }),
      Student.findAll({
        attributes: ['programLevel', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where,
        group: ['programLevel'],
        raw: true
      }),
      Student.findAll({
        attributes: ['academicYear'],
        group: ['academicYear'],
        raw: true
      })
    ]);

    const total = studentsResult.count;
    const deptCounts = {};
    deptRows.forEach(r => {
      if (r.department && r.department !== 'NIL' && r.department !== 'N/A') {
        deptCounts[r.department] = parseInt(r.count, 10);
      }
    });

    const levelCounts = {};
    let ugCount = 0;
    let pgCount = 0;
    levelRows.forEach(r => {
      const lvl = r.programLevel || 'UG';
      const c = parseInt(r.count, 10);
      levelCounts[lvl] = c;
      if (lvl.toUpperCase() === 'UG') {
        ugCount += c;
      } else {
        pgCount += c;
      }
    });

    const stats = {
      total,
      ugCount,
      ugPercent: total > 0 ? ((ugCount / total) * 100).toFixed(1) : '0',
      pgCount,
      pgPercent: total > 0 ? ((pgCount / total) * 100).toFixed(1) : '0',
      activeCount,
      activePercent: total > 0 ? ((activeCount / total) * 100).toFixed(1) : '0',
      depts: Object.keys(deptCounts).length
    };

    const sanitized = sanitizeStudentData(studentsResult.rows, req.user);
    const responsePayload = formatPaginationResponse({
      count: total,
      rows: sanitized,
      page,
      limit
    });

    responsePayload.stats = stats;
    responsePayload.distribution = {
      departments: deptCounts,
      levels: levelCounts,
      academicYears: allYearsRows.map(r => r.academicYear).filter(Boolean)
    };

    res.json(responsePayload);
  } catch (error) {
    console.error('Get students error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get standalone student census stats matching active filters
// @route   GET /api/students/stats
// @access  Private
exports.getStudentStats = async (req, res) => {
  try {
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Student', false);
    const { andConditions, where } = buildStudentFilterWhere(req, scopeWhere);

    const [
      total,
      activeCount,
      deptRows,
      levelRows,
      allYearsRows
    ] = await Promise.all([
      Student.count({ where }),
      Student.count({
        where: {
          [Op.and]: [...andConditions, { status: 'Active' }]
        }
      }),
      Student.findAll({
        attributes: ['department', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where,
        group: ['department'],
        raw: true
      }),
      Student.findAll({
        attributes: ['programLevel', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        where,
        group: ['programLevel'],
        raw: true
      }),
      Student.findAll({
        attributes: ['academicYear'],
        group: ['academicYear'],
        raw: true
      })
    ]);

    const deptCounts = {};
    deptRows.forEach(r => {
      if (r.department && r.department !== 'NIL' && r.department !== 'N/A') {
        deptCounts[r.department] = parseInt(r.count, 10);
      }
    });

    const levelCounts = {};
    let ugCount = 0;
    let pgCount = 0;
    levelRows.forEach(r => {
      const lvl = r.programLevel || 'UG';
      const c = parseInt(r.count, 10);
      levelCounts[lvl] = c;
      if (lvl.toUpperCase() === 'UG') {
        ugCount += c;
      } else {
        pgCount += c;
      }
    });

    const stats = {
      total,
      ugCount,
      ugPercent: total > 0 ? ((ugCount / total) * 100).toFixed(1) : '0',
      pgCount,
      pgPercent: total > 0 ? ((pgCount / total) * 100).toFixed(1) : '0',
      activeCount,
      activePercent: total > 0 ? ((activeCount / total) * 100).toFixed(1) : '0',
      depts: Object.keys(deptCounts).length
    };

    res.json({
      success: true,
      stats,
      distribution: {
        departments: deptCounts,
        levels: levelCounts,
        academicYears: allYearsRows.map(r => r.academicYear).filter(Boolean)
      }
    });
  } catch (error) {
    console.error('Get student stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Lookup student details by register number across all academic years
// @route   GET /api/students/lookup/:regNo
// @access  Private
exports.lookupStudentByRegNo = async (req, res) => {
  try {
    const { regNo } = req.params;
    if (!regNo) {
      return res.status(400).json({ success: false, message: 'Register number required' });
    }

    const where = { registerNumber: regNo.trim() };
    if (req.user && req.user.role !== 'admin' && req.user.role !== 'authority' && req.user.department) {
      where.department = req.user.department;
    }

    const records = await Student.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });

    if (!records || records.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No student found with this register number'
      });
    }

    const merged = {};
    const mapFields = [
      'registerNumber', 'name', 'email', 'phone', 'mobileNo', 'parentMobileNo',
      'guardianName', 'guardianPhone', 'gender', 'dob', 'bloodGroup',
      'nationality', 'caste', 'currentCity', 'currentState',
      'permanentCity', 'permanentState', 'address', 'handicapped',
      'handicappedDescription', 'disability', 'campus', 'school',
      'department', 'programLevel', 'course', 'className', 'applicationNo', 'previousSchool'
    ];

    for (const rec of records) {
      for (const field of mapFields) {
        const val = rec[field];
        if (!merged[field] || merged[field] === 'N/A' || merged[field] === 'NIL' || merged[field] === '') {
          if (val && val !== 'N/A' && val !== 'NIL' && val !== '') {
            merged[field] = val;
          }
        }
      }
    }

    const sanitizedMerged = sanitizeStudentData(merged, req.user);

    res.json({
      success: true,
      data: sanitizedMerged,
      academicYears: records.map(r => r.academicYear)
    });
  } catch (error) {
    console.error('Lookup student error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Create student
// @route   POST /api/students
// @access  Private
exports.createStudent = async (req, res) => {
  try {
    const rawRecord = req.body;
    const enriched = await enrichFromHistory(rawRecord, req.user);
    const normalized = normalizeStudentRecord(enriched);

    if (req.user && req.user.role !== 'admin' && req.user.department) {
      normalized.department = req.user.department;
    }

    const regNo = normalized.registerNumber;
    const academicYear = normalized.academicYear;

    // Check if record exists for this specific (registerNumber, academicYear) pair
    let student = await Student.findOne({
      where: { registerNumber: regNo, academicYear: academicYear }
    });

    if (student) {
      if (req.user && req.user.role !== 'admin' && student.department !== req.user.department) {
        return res.status(403).json({ success: false, message: 'Not authorized to update student in another department.' });
      }
      await student.update(normalized);
    } else {
      student = await Student.create(normalized);
    }

    res.status(201).json({
      success: true,
      data: sanitizeStudentData(student, req.user)
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private
exports.updateStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    if (req.user && req.user.role !== 'admin' && student.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot update student records outside your department.'
      });
    }

    const enriched = await enrichFromHistory({ ...student.toJSON(), ...req.body }, req.user);
    const normalized = normalizeStudentRecord(enriched);

    if (req.user && req.user.role !== 'admin' && req.user.department) {
      normalized.department = req.user.department;
    }

    await student.update(normalized);

    res.json({
      success: true,
      data: sanitizeStudentData(student, req.user)
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    if (req.user && req.user.role !== 'admin' && student.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot delete student records outside your department.'
      });
    }

    await student.destroy();
    res.json({
      success: true,
      message: 'Student record deleted'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Bulk create students from CSV upload (High-Performance Batched)
// @route   POST /api/students/bulk
// @access  Private (admin/coordinator/hod)
exports.bulkCreateStudent = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { students: studentList } = req.body;
    if (!Array.isArray(studentList) || studentList.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No student records provided'
      });
    }

    const errors = [];
    const validRows = [];

    // Step 1: Pre-validate in memory and collect unique register numbers
    const regNos = new Set();
    for (let i = 0; i < studentList.length; i++) {
      const rawRecord = studentList[i];
      if (!rawRecord || !rawRecord.registerNumber) {
        errors.push(`Row ${i + 1}: registerNumber is required.`);
        continue;
      }
      const regNo = String(rawRecord.registerNumber).trim();
      regNos.add(regNo);
      validRows.push({ index: i, raw: rawRecord, regNo });
    }

    // Step 2: Batch fetch all historical records for all register numbers in 1 single query
    const allRegNosArray = Array.from(regNos);
    const whereScope = { registerNumber: { [Op.in]: allRegNosArray } };
    if (req.user && req.user.role !== 'admin' && req.user.role !== 'authority' && req.user.department) {
      whereScope.department = req.user.department;
    }

    const existingRecords = await Student.findAll({
      where: whereScope,
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    // Step 3: Index existing records in memory by regNo and by composite (regNo + academicYear)
    const historyByRegNo = new Map();
    const existingByComposite = new Map();

    for (const rec of existingRecords) {
      if (!historyByRegNo.has(rec.registerNumber)) {
        historyByRegNo.set(rec.registerNumber, []);
      }
      historyByRegNo.get(rec.registerNumber).push(rec);

      const compKey = `${rec.registerNumber}_${rec.academicYear}`;
      existingByComposite.set(compKey, rec);
    }

    // Fields for historical enrichment
    const mapFields = [
      'name', 'email', 'phone', 'mobileNo', 'parentMobileNo',
      'guardianName', 'guardianPhone', 'gender', 'dob', 'bloodGroup',
      'nationality', 'caste', 'currentCity', 'currentState',
      'permanentCity', 'permanentState', 'address', 'handicapped',
      'handicappedDescription', 'disability', 'campus', 'school',
      'department', 'programLevel', 'course', 'className', 'applicationNo', 'previousSchool'
    ];

    const toCreate = [];
    const created = [];

    // Step 4: Process rows in memory without per-row DB roundtrips
    for (const { index, raw, regNo } of validRows) {
      try {
        // Fast in-memory enrichment from pre-fetched history
        const enriched = { ...raw };
        const histRecords = historyByRegNo.get(regNo) || [];
        for (const hist of histRecords) {
          for (const field of mapFields) {
            const currentVal = enriched[field];
            const isMissing = !currentVal || currentVal === 'N/A' || currentVal === 'NIL' || currentVal === '';
            const histVal = hist[field];
            if (isMissing && histVal && histVal !== 'N/A' && histVal !== 'NIL' && histVal !== '') {
              enriched[field] = histVal;
            }
          }
        }

        const normalized = normalizeStudentRecord(enriched);
        if (!normalized.name || String(normalized.name).trim() === '') {
          errors.push(`Row ${index + 1} (${regNo}): name is required.`);
          continue;
        }

        if (req.user && req.user.role !== 'admin' && req.user.department) {
          normalized.department = req.user.department;
        }

        const academicYear = normalized.academicYear || '2024-2025';
        normalized.academicYear = academicYear;

        const compKey = `${regNo}_${academicYear}`;
        const existingYearRecord = existingByComposite.get(compKey);

        if (existingYearRecord) {
          if (req.user && req.user.role !== 'admin' && existingYearRecord.department !== req.user.department) {
            errors.push(`Row ${index + 1} (${regNo}): Not authorized to update student in another department.`);
            continue;
          }
          await existingYearRecord.update(normalized, { transaction: t });
          created.push(existingYearRecord);
        } else {
          // Check cross-department conflict across any year
          const anyExisting = histRecords[0];
          if (anyExisting && req.user && req.user.role !== 'admin' && anyExisting.department !== req.user.department) {
            errors.push(`Row ${index + 1} (${regNo}): Student belongs to another department (${anyExisting.department}).`);
            continue;
          }

          toCreate.push(normalized);
        }
      } catch (rowErr) {
        errors.push(`Row ${index + 1} (${regNo}): ${rowErr.message || 'Validation error'}`);
      }
    }

    // Step 5: Fast single-query bulk insert for all new student records
    if (toCreate.length > 0) {
      const inserted = await Student.bulkCreate(toCreate, { transaction: t, returning: true });
      created.push(...inserted);
    }

    if (created.length === 0 && errors.length > 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'All student records failed validation or authorization.',
        count: 0,
        errors
      });
    }

    await t.commit();

    await logActionSafe({
      user: req.user,
      action: 'BULK_UPLOAD_STUDENTS',
      title: `Bulk uploaded student records`,
      remarks: `Processed ${created.length} students with ${errors.length} errors.`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `${created.length} student record(s) processed successfully.${errors.length ? ` ${errors.length} error(s) encountered.` : ''}`,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Bulk create students error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Clear all student records
// @route   DELETE /api/students/clear-all
// @access  Private (Admin/Coordinator/HOD)
exports.clearAllStudents = async (req, res) => {
  try {
    const { where, scopeDescription } = await resolveDepartmentScope(req, 'Student', true);

    let deletedCount = 0;
    await sequelize.transaction(async (t) => {
      deletedCount = await Student.destroy({ where, transaction: t });
    });

    await logActionSafe({
      user: req.user,
      action: 'CLEAR_ALL_STUDENTS',
      title: `Cleared student records: ${scopeDescription}`,
      remarks: `Deleted ${deletedCount} student records. Scope: ${scopeDescription}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Student records (${deletedCount}) cleared successfully for ${scopeDescription}`,
      count: deletedCount
    });
  } catch (error) {
    console.error('Clear all students error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
