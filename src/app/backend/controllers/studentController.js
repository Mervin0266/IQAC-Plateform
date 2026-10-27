const { Student } = require('../models');
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
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  try {
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Student', false);
    const where = { ...scopeWhere };

    if (req.query.academicYear && req.query.academicYear !== 'all' && req.query.academicYear !== 'All') {
      where.academicYear = req.query.academicYear;
    }
    // Only admin and authority can select/filter arbitrary department
    if ((req.user.role === 'admin' || req.user.role === 'authority') &&
        req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
      where.department = req.query.department;
    }
    if (req.query.campus && req.query.campus !== 'all' && req.query.campus !== 'All') {
      where.campus = req.query.campus;
    }
    if (req.query.school && req.query.school !== 'all' && req.query.school !== 'All') {
      where.school = req.query.school;
    }
    if (req.query.programLevel && req.query.programLevel !== 'all' && req.query.programLevel !== 'All') {
      where.programLevel = req.query.programLevel;
    }
    if (req.query.course && req.query.course !== 'all' && req.query.course !== 'All') {
      where.course = req.query.course;
    }

    const pagination = parsePagination(req.query);

    if (pagination.isExport || req.query.stream === 'true') {
      return await streamBatchedExport(res, {
        model: Student,
        where,
        order: [['registerNumber', 'ASC'], ['academicYear', 'DESC'], ['id', 'ASC']],
        batchSize: 1000,
        maxRecords: pagination.limit || 1000000,
        format: req.query.format === 'csv' ? 'csv' : 'json',
        filename: 'students_export',
        transformRow: (rawRow) => sanitizeStudentData([rawRow], req.user)[0]
      });
    }

    const { page, limit, offset } = pagination;

    const { count, rows: students } = await Student.findAndCountAll({
      where,
      order: [['registerNumber', 'ASC'], ['academicYear', 'DESC'], ['id', 'ASC']],
      limit,
      offset
    });

    const sanitized = sanitizeStudentData(students, req.user);

    res.json(formatPaginationResponse({
      count,
      rows: sanitized,
      page,
      limit
    }));
  } catch (error) {
    console.error('Get students error:', error);
    res.status(error.status || 500).json({
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

// @desc    Bulk create students from CSV upload
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
    const created = [];

    for (let i = 0; i < studentList.length; i++) {
      const rawRecord = studentList[i];
      if (!rawRecord || !rawRecord.registerNumber) {
        errors.push(`Row ${i + 1}: registerNumber is required.`);
        continue;
      }

      try {
        const enriched = await enrichFromHistory(rawRecord, req.user);
        const normalized = normalizeStudentRecord(enriched);

        if (!normalized.name || String(normalized.name).trim() === '') {
          errors.push(`Row ${i + 1} (${rawRecord.registerNumber}): name is required.`);
          continue;
        }

        if (req.user && req.user.role !== 'admin' && req.user.department) {
          normalized.department = req.user.department;
        }

        const regNo = normalized.registerNumber;
        const academicYear = normalized.academicYear || '2024-2025';
        normalized.academicYear = academicYear;

        // Deterministic transaction-scoped advisory lock on composite key
        const lockKey = `student_${regNo}_${academicYear}`;
        await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:lockKey))', {
          replacements: { lockKey },
          transaction: t
        });

        // Check if student record exists for this composite key: (registerNumber, academicYear)
        const existingYearRecord = await Student.findOne({
          where: { registerNumber: regNo, academicYear: academicYear },
          transaction: t,
          lock: t.LOCK.UPDATE
        });

        if (existingYearRecord) {
          if (req.user && req.user.role !== 'admin' && existingYearRecord.department !== req.user.department) {
            errors.push(`Row ${i + 1} (${regNo}): Not authorized to update student in another department.`);
            continue;
          }
          await existingYearRecord.update(normalized, { transaction: t });
          created.push(existingYearRecord);
        } else {
          // Check for cross-department conflict across any academic year
          const existingAnyRecord = await Student.findOne({
            where: { registerNumber: regNo },
            transaction: t
          });

          if (existingAnyRecord && req.user && req.user.role !== 'admin' && existingAnyRecord.department !== req.user.department) {
            errors.push(`Row ${i + 1} (${regNo}): Student belongs to another department (${existingAnyRecord.department}).`);
            continue;
          }

          const std = await Student.create(normalized, { transaction: t });
          created.push(std);
        }
      } catch (err) {
        const detail = err.errors && Array.isArray(err.errors)
          ? err.errors.map(e => e.message || e.path).join(', ')
          : (err.message || 'Validation error');
        errors.push(`Row ${i + 1} (${rawRecord.registerNumber || 'unknown'}): ${detail}`);
      }
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
