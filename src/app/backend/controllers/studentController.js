const { Student, StudentEnrollment } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { resolveDepartmentScope } = require('../utils/scopeHelper');
const { sanitizeStudentData } = require('../utils/dataSanitizer');
const { logActionSafe } = require('../middleware/auditLogger');
const { parsePagination, formatPaginationResponse, streamBatchedExport } = require('../utils/paginationHelper');

/**
 * Normalizes register numbers preserving leading zeros and string characters.
 */
const normalizeRegisterNumber = (val) => {
  if (val === null || val === undefined) return '';
  return String(val).trim();
};

/**
 * Normalizes a student record before any DB write.
 */
const normalizeStudentRecord = (record) => {
  const normalized = { ...record };

  if (normalized.registerNumber) {
    normalized.registerNumber = normalizeRegisterNumber(normalized.registerNumber);
  }

  // Auto-generate placeholder email from register number if completely missing
  if (!normalized.email || !normalized.email.trim() || normalized.email === 'NIL' || normalized.email === 'N/A') {
    const regNo = (normalized.registerNumber || 'student').toString().trim();
    normalized.email = `${regNo}@students.christuniversity.in`;
  }

  if (!normalized.academicYear || !normalized.academicYear.trim() || normalized.academicYear === 'NIL' || normalized.academicYear === 'N/A') {
    normalized.academicYear = '2024-2025';
  }

  // Standardize Gender
  if (normalized.gender) {
    const g = String(normalized.gender).trim().toLowerCase();
    if (g === 'm' || g === 'male' || g === 'boy' || g === 'boys') {
      normalized.gender = 'Male';
    } else if (g === 'f' || g === 'female' || g === 'girl' || g === 'girls') {
      normalized.gender = 'Female';
    } else if (g === 'other' || g === 'transgender' || g === 'non-binary') {
      normalized.gender = 'Other';
    }
  } else {
    normalized.gender = 'Male';
  }

  // Nullable string fields
  const nullableStringFields = [
    'phone', 'course', 'department', 'previousSchool', 'bloodGroup', 'batch',
    'guardianName', 'guardianPhone', 'address', 'className', 'applicationNo',
    'mobileNo', 'nationality', 'caste', 'currentCity', 'currentState',
    'permanentCity', 'permanentState', 'permanentCountry', 'parentMobileNo', 'handicapped',
    'handicappedDescription', 'campus', 'school', 'programLevel', 'disability'
  ];

  for (const field of nullableStringFields) {
    if (normalized[field] === undefined || normalized[field] === null ||
        normalized[field] === '' || normalized[field] === 'N/A' || normalized[field] === 'NIL' ||
        String(normalized[field]).trim() === '' || String(normalized[field]).toLowerCase() === 'nil') {
      normalized[field] = null;
    }
  }

  // Handle Date fields safely
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
 * Checks if a department is Science & Humanities (or Basic Sciences).
 */
const isScienceAndHumanities = (dept) => {
  if (!dept) return false;
  const d = dept.toLowerCase();
  return d.includes('humanities') || d.includes('basic science') || d.includes('science and humanities') || d.includes('science & humanities');
};

/**
 * Helper to compute gender breakdown metrics from an array of items or counts.
 */
const computeGenderBreakdown = (items) => {
  let boys = 0;
  let girls = 0;
  let other = 0;
  let notSpecified = 0;

  for (const item of items) {
    const g = String(item.gender || '').trim().toLowerCase();
    const count = parseInt(item.count || 1, 10);
    if (g === 'male' || g === 'm' || g === 'boy' || g === 'boys') {
      boys += count;
    } else if (g === 'female' || g === 'f' || g === 'girl' || g === 'girls') {
      girls += count;
    } else if (g === 'other' || g === 'transgender' || g === 'non-binary') {
      other += count;
    } else {
      notSpecified += count;
    }
  }

  const total = boys + girls + other + notSpecified;
  return { boys, girls, other, notSpecified, total };
};

/**
 * Build query conditions from request for student querying & dynamic statistics
 */
const buildStudentFilterWhere = (req, scopeWhere) => {
  const andConditions = [];
  if (scopeWhere && Object.keys(scopeWhere).length > 0) {
    andConditions.push(scopeWhere);
  }

  // Department Filter
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

  // Gender Filter (All, Male, Female, Other, Not Specified)
  if (req.query.gender && req.query.gender !== 'all' && req.query.gender !== 'All') {
    const targetGender = req.query.gender.trim();
    if (targetGender.toLowerCase() === 'not specified' || targetGender.toLowerCase() === 'unspecified') {
      andConditions.push({
        [Op.or]: [
          { gender: null },
          { gender: '' },
          { gender: { [Op.notIn]: ['Male', 'Female', 'Other'] } }
        ]
      });
    } else {
      andConditions.push({
        gender: { [Op.iLike]: targetGender }
      });
    }
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

const buildStudentSortOrder = (req, isEnrollment = false) => {
  let order = [['registerNumber', 'ASC'], ['id', 'ASC']];
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

// @desc    Get all students with filter support, pagination, full enrollment history, and 5 KPI cards
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  try {
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Student', false);
    const { andConditions, where } = buildStudentFilterWhere(req, scopeWhere);
    const targetYear = req.query.academicYear && req.query.academicYear !== 'all' && req.query.academicYear !== 'All'
      ? req.query.academicYear.trim()
      : null;

    const pagination = parsePagination(req.query);

    let totalCount = 0;
    let studentsRows = [];

    const order = buildStudentSortOrder(req, Boolean(targetYear));

    if (targetYear) {
      // Build enrollment query conditions
      const enrollmentAnd = [{ academicYear: targetYear }];
      if (scopeWhere && Object.keys(scopeWhere).length > 0) {
        enrollmentAnd.push(scopeWhere);
      }
      if ((req.user?.role === 'admin' || req.user?.role === 'authority') &&
          req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
        enrollmentAnd.push({ department: { [Op.iLike]: req.query.department.trim() } });
      }
      if (req.query.programLevel && req.query.programLevel !== 'all' && req.query.programLevel !== 'All') {
        enrollmentAnd.push({ programLevel: { [Op.iLike]: req.query.programLevel.trim() } });
      }
      if (req.query.status && req.query.status !== 'all' && req.query.status !== 'All') {
        enrollmentAnd.push({ status: { [Op.iLike]: req.query.status.trim() } });
      }
      if (req.query.course && req.query.course !== 'all' && req.query.course !== 'All') {
        enrollmentAnd.push({ course: { [Op.iLike]: req.query.course.trim() } });
      }

      // Student join conditions (gender, search)
      const studentWhere = {};
      if (req.query.gender && req.query.gender !== 'all' && req.query.gender !== 'All') {
        const targetGender = req.query.gender.trim();
        if (targetGender.toLowerCase() === 'not specified' || targetGender.toLowerCase() === 'unspecified') {
          studentWhere[Op.or] = [
            { gender: null },
            { gender: '' },
            { gender: { [Op.notIn]: ['Male', 'Female', 'Other'] } }
          ];
        } else {
          studentWhere.gender = { [Op.iLike]: targetGender };
        }
      }

      const searchVal = (req.query.search || req.query.q || '').trim();
      if (searchVal) {
        const term = `%${searchVal}%`;
        enrollmentAnd.push({
          [Op.or]: [
            { registerNumber: { [Op.iLike]: term } },
            { course: { [Op.iLike]: term } },
            { department: { [Op.iLike]: term } },
            { className: { [Op.iLike]: term } },
            { '$student.name$': { [Op.iLike]: term } },
            { '$student.email$': { [Op.iLike]: term } }
          ]
        });
      }

      const enrollmentWhere = { [Op.and]: enrollmentAnd };

      if (pagination.isExport || req.query.stream === 'true') {
        return await streamBatchedExport(res, {
          model: StudentEnrollment,
          where: enrollmentWhere,
          order: [['registerNumber', 'ASC']],
          include: [{ model: Student, as: 'student' }],
          batchSize: 1000,
          maxRecords: pagination.limit || 1000000,
          format: req.query.format === 'csv' ? 'csv' : 'json',
          filename: `students_export_${targetYear}`,
          transformRow: (raw) => {
            const st = raw.student ? raw.student.toJSON() : {};
            const en = raw.toJSON();
            return { ...st, ...en, id: st.id || en.id };
          }
        });
      }

      const { page, limit, offset } = pagination;
      const result = await StudentEnrollment.findAndCountAll({
        where: enrollmentWhere,
        include: [
          {
            model: Student,
            as: 'student',
            where: Object.keys(studentWhere).length > 0 ? studentWhere : undefined,
            include: [
              {
                model: StudentEnrollment,
                as: 'enrollments',
                separate: true,
                order: [['academicYear', 'DESC']]
              }
            ]
          }
        ],
        order,
        limit,
        offset
      });

      totalCount = result.count;
      studentsRows = result.rows.map(row => {
        const enrollment = row.toJSON();
        const student = enrollment.student || {};
        return {
          ...student,
          ...enrollment,
          id: student.id || enrollment.id,
          enrollmentId: enrollment.id,
          academicYear: enrollment.academicYear,
          department: enrollment.department || student.department,
          course: enrollment.course || student.course,
          programLevel: enrollment.programLevel || student.programLevel,
          className: enrollment.className || student.className,
          status: enrollment.status || student.status,
          batch: enrollment.batch || student.batch,
          enrollments: student.enrollments || [enrollment]
        };
      });
    } else {
      // Query canonical students across all years
      if (pagination.isExport || req.query.stream === 'true') {
        return await streamBatchedExport(res, {
          model: Student,
          where,
          order,
          batchSize: 1000,
          maxRecords: pagination.limit || 1000000,
          format: req.query.format === 'csv' ? 'csv' : 'json',
          filename: 'students_export_all',
          transformRow: (rawRow) => sanitizeStudentData([rawRow], req.user)[0]
        });
      }

      const { page, limit, offset } = pagination;
      const result = await Student.findAndCountAll({
        where,
        include: [
          {
            model: StudentEnrollment,
            as: 'enrollments',
            separate: true,
            order: [['academicYear', 'DESC']]
          }
        ],
        order,
        limit,
        offset
      });

      totalCount = result.count;
      studentsRows = result.rows.map(st => st.toJSON());
    }

    // Dynamic 5 KPI calculations with gender splits and 2-level department hover breakdown
    const statsWhere = targetYear
      ? { [Op.and]: [{ academicYear: targetYear }, ...(scopeWhere && Object.keys(scopeWhere).length > 0 ? [scopeWhere] : [])] }
      : (scopeWhere && Object.keys(scopeWhere).length > 0 ? scopeWhere : {});

    // Concurrently compute metrics
    const [
      genderRows,
      levelGenderRows,
      deptGenderRows,
      activeCountResult,
      availableYearsRows,
      activeBreakdownRows,
      stateDiversityRows,
      countryDiversityRows
    ] = await Promise.all([
      // Overall gender breakdown in scope
      targetYear
        ? sequelize.query(`
            SELECT s."gender", COUNT(e."id") as count
            FROM "student_enrollments" e
            JOIN "students" s ON e."studentId" = s."id"
            WHERE e."academicYear" = :targetYear
            GROUP BY s."gender";
          `, { replacements: { targetYear }, type: sequelize.QueryTypes.SELECT })
        : Student.findAll({
            attributes: ['gender', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: statsWhere,
            group: ['gender'],
            raw: true
          }),

      // Program Level with Gender breakdown
      targetYear
        ? sequelize.query(`
            SELECT e."programLevel", s."gender", COUNT(e."id") as count
            FROM "student_enrollments" e
            JOIN "students" s ON e."studentId" = s."id"
            WHERE e."academicYear" = :targetYear
            GROUP BY e."programLevel", s."gender";
          `, { replacements: { targetYear }, type: sequelize.QueryTypes.SELECT })
        : Student.findAll({
            attributes: ['programLevel', 'gender', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: statsWhere,
            group: ['programLevel', 'gender'],
            raw: true
          }),

      // Department with Gender breakdown (for 2-level hover!)
      targetYear
        ? sequelize.query(`
            SELECT e."department", s."gender", COUNT(e."id") as count
            FROM "student_enrollments" e
            JOIN "students" s ON e."studentId" = s."id"
            WHERE e."academicYear" = :targetYear AND e."department" IS NOT NULL
            GROUP BY e."department", s."gender"
            ORDER BY count DESC;
          `, { replacements: { targetYear }, type: sequelize.QueryTypes.SELECT })
        : Student.findAll({
            attributes: ['department', 'gender', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: {
              [Op.and]: [statsWhere, { department: { [Op.ne]: null } }]
            },
            group: ['department', 'gender'],
            raw: true
          }),

      // Active status count
      targetYear
        ? StudentEnrollment.count({
            where: { [Op.and]: [statsWhere, { status: 'Active' }] }
          })
        : Student.count({
            where: { [Op.and]: [statsWhere, { status: 'Active' }] }
          }),

      // Distinct Academic Years list
      StudentEnrollment.findAll({
        attributes: ['academicYear'],
        group: ['academicYear'],
        order: [['academicYear', 'DESC']],
        raw: true
      }),

      // Active student details breakdown
      targetYear
        ? sequelize.query(`
            SELECT s."gender", COALESCE(e."programLevel", s."programLevel", 'UG') as level, COALESCE(e."department", s."department", 'General') as dept, COALESCE(s."campus", 'Bangalore Central') as campus, COUNT(e."id") as count
            FROM "student_enrollments" e
            JOIN "students" s ON e."studentId" = s."id"
            WHERE e."academicYear" = :targetYear AND (e."status" = 'Active' OR s."status" = 'Active')
            GROUP BY s."gender", 2, 3, 4
            ORDER BY count DESC;
          `, { replacements: { targetYear }, type: sequelize.QueryTypes.SELECT })
        : sequelize.query(`
            SELECT s."gender", COALESCE(s."programLevel", 'UG') as level, s."department" as dept, COALESCE(s."campus", 'Bangalore Central') as campus, COUNT(s."id") as count
            FROM "students" s
            WHERE s."status" = 'Active'
            GROUP BY s."gender", 2, 3, 4
            ORDER BY count DESC;
          `, { type: sequelize.QueryTypes.SELECT }),

      // State diversity
      sequelize.query(`
        SELECT COALESCE(NULLIF(TRIM(s."permanentState"), ''), 'Karnataka') as state, COUNT(DISTINCT s."id") as count
        FROM "students" s
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 35;
      `, { type: sequelize.QueryTypes.SELECT }),

      // Country diversity
      sequelize.query(`
        SELECT COALESCE(NULLIF(TRIM(s."permanentCountry"), ''), NULLIF(TRIM(s."nationality"), ''), 'India') as country, COUNT(DISTINCT s."id") as count
        FROM "students" s
        GROUP BY 1
        ORDER BY count DESC
        LIMIT 25;
      `, { type: sequelize.QueryTypes.SELECT })
    ]);

    // Format Active Student breakdown
    let activeBoys = 0, activeGirls = 0, activeOther = 0;
    const activeLevelMap = {};
    const activeDeptMap = {};
    const activeCampusMap = {};

    (activeBreakdownRows || []).forEach(row => {
      const g = String(row.gender || '').trim().toLowerCase();
      const c = parseInt(row.count, 10);
      if (g === 'male' || g === 'm' || g === 'boy' || g === 'boys') activeBoys += c;
      else if (g === 'female' || g === 'f' || g === 'girl' || g === 'girls') activeGirls += c;
      else activeOther += c;

      const lvl = (row.level || 'UG').toUpperCase();
      activeLevelMap[lvl] = (activeLevelMap[lvl] || 0) + c;

      const dept = row.dept || 'General';
      activeDeptMap[dept] = (activeDeptMap[dept] || 0) + c;

      const campus = row.campus || 'Bangalore Central';
      activeCampusMap[campus] = (activeCampusMap[campus] || 0) + c;
    });

    const activeBreakdown = {
      gender: { boys: activeBoys, girls: activeGirls, other: activeOther },
      programLevels: activeLevelMap,
      departments: Object.entries(activeDeptMap).map(([department, count]) => ({ department, count })).sort((a, b) => b.count - a.count).slice(0, 8),
      campuses: activeCampusMap
    };

    const stateDiversity = (stateDiversityRows || []).map(r => ({ state: r.state, count: parseInt(r.count, 10) }));
    const countryDiversity = (countryDiversityRows || []).map(r => ({ country: r.country, count: parseInt(r.count, 10) }));

    // Format Overall Gender
    const totalGender = computeGenderBreakdown(genderRows);
    const total = totalGender.total;

    // Format UG & PG Gender breakdowns
    let ugBoys = 0, ugGirls = 0, ugOther = 0, ugNotSpecified = 0, ugTotal = 0;
    let pgBoys = 0, pgGirls = 0, pgOther = 0, pgNotSpecified = 0, pgTotal = 0;

    levelGenderRows.forEach(row => {
      const lvl = (row.programLevel || 'UG').toUpperCase();
      const g = String(row.gender || '').trim().toLowerCase();
      const c = parseInt(row.count, 10);

      const isUG = lvl === 'UG';
      if (g === 'male' || g === 'm' || g === 'boy' || g === 'boys') {
        if (isUG) ugBoys += c; else pgBoys += c;
      } else if (g === 'female' || g === 'f' || g === 'girl' || g === 'girls') {
        if (isUG) ugGirls += c; else pgGirls += c;
      } else if (g === 'other' || g === 'transgender' || g === 'non-binary') {
        if (isUG) ugOther += c; else pgOther += c;
      } else {
        if (isUG) ugNotSpecified += c; else pgNotSpecified += c;
      }

      if (isUG) ugTotal += c; else pgTotal += c;
    });

    const ugGender = { boys: ugBoys, girls: ugGirls, other: ugOther, notSpecified: ugNotSpecified, total: ugTotal };
    const pgGender = { boys: pgBoys, girls: pgGirls, other: pgOther, notSpecified: pgNotSpecified, total: pgTotal };

    // Format Department list with 2-level hover gender breakdown
    const deptMap = new Map();
    deptGenderRows.forEach(row => {
      const deptName = row.department;
      if (!deptName || deptName === 'NIL' || deptName === 'N/A') return;

      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, {
          department: deptName,
          count: 0,
          gender: { boys: 0, girls: 0, other: 0, notSpecified: 0, total: 0 }
        });
      }

      const deptObj = deptMap.get(deptName);
      const g = String(row.gender || '').trim().toLowerCase();
      const c = parseInt(row.count, 10);

      deptObj.count += c;
      deptObj.gender.total += c;

      if (g === 'male' || g === 'm' || g === 'boy' || g === 'boys') {
        deptObj.gender.boys += c;
      } else if (g === 'female' || g === 'f' || g === 'girl' || g === 'girls') {
        deptObj.gender.girls += c;
      } else if (g === 'other' || g === 'transgender' || g === 'non-binary') {
        deptObj.gender.other += c;
      } else {
        deptObj.gender.notSpecified += c;
      }
    });

    const departmentList = Array.from(deptMap.values()).sort((a, b) => b.count - a.count);

    const stats = {
      total,
      totalGender,
      ugCount: ugTotal,
      ugPercent: total > 0 ? ((ugTotal / total) * 100).toFixed(1) : '0',
      ugGender,
      pgCount: pgTotal,
      pgPercent: total > 0 ? ((pgTotal / total) * 100).toFixed(1) : '0',
      pgGender,
      activeCount: activeCountResult,
      activePercent: total > 0 ? ((activeCountResult / total) * 100).toFixed(1) : '0',
      activeBreakdown,
      stateDiversity,
      countryDiversity,
      depts: departmentList.length,
      departmentList
    };

    const sanitized = sanitizeStudentData(studentsRows, req.user);
    const responsePayload = formatPaginationResponse({
      count: totalCount,
      rows: sanitized,
      page: pagination.page,
      limit: pagination.limit
    });

    responsePayload.rows = sanitized;
    responsePayload.data = sanitized;
    responsePayload.stats = stats;
    responsePayload.distribution = {
      departments: Object.fromEntries(departmentList.map(d => [d.department, d.count])),
      academicYears: availableYearsRows.map(r => r.academicYear).filter(Boolean)
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
    const targetYear = req.query.academicYear && req.query.academicYear !== 'all' && req.query.academicYear !== 'All'
      ? req.query.academicYear.trim()
      : null;

    const statsWhere = targetYear
      ? { [Op.and]: [{ academicYear: targetYear }, ...(scopeWhere && Object.keys(scopeWhere).length > 0 ? [scopeWhere] : [])] }
      : (scopeWhere && Object.keys(scopeWhere).length > 0 ? scopeWhere : {});

    const [
      genderRows,
      levelGenderRows,
      deptGenderRows,
      activeCountResult,
      availableYearsRows
    ] = await Promise.all([
      targetYear
        ? sequelize.query(`
            SELECT s."gender", COUNT(e."id") as count
            FROM "student_enrollments" e
            JOIN "students" s ON e."studentId" = s."id"
            WHERE e."academicYear" = :targetYear
            GROUP BY s."gender";
          `, { replacements: { targetYear }, type: sequelize.QueryTypes.SELECT })
        : Student.findAll({
            attributes: ['gender', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: statsWhere,
            group: ['gender'],
            raw: true
          }),

      targetYear
        ? sequelize.query(`
            SELECT e."programLevel", s."gender", COUNT(e."id") as count
            FROM "student_enrollments" e
            JOIN "students" s ON e."studentId" = s."id"
            WHERE e."academicYear" = :targetYear
            GROUP BY e."programLevel", s."gender";
          `, { replacements: { targetYear }, type: sequelize.QueryTypes.SELECT })
        : Student.findAll({
            attributes: ['programLevel', 'gender', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: statsWhere,
            group: ['programLevel', 'gender'],
            raw: true
          }),

      targetYear
        ? sequelize.query(`
            SELECT e."department", s."gender", COUNT(e."id") as count
            FROM "student_enrollments" e
            JOIN "students" s ON e."studentId" = s."id"
            WHERE e."academicYear" = :targetYear AND e."department" IS NOT NULL
            GROUP BY e."department", s."gender"
            ORDER BY count DESC;
          `, { replacements: { targetYear }, type: sequelize.QueryTypes.SELECT })
        : Student.findAll({
            attributes: ['department', 'gender', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            where: {
              [Op.and]: [statsWhere, { department: { [Op.ne]: null } }]
            },
            group: ['department', 'gender'],
            raw: true
          }),

      targetYear
        ? StudentEnrollment.count({
            where: { [Op.and]: [statsWhere, { status: 'Active' }] }
          })
        : Student.count({
            where: { [Op.and]: [statsWhere, { status: 'Active' }] }
          }),

      StudentEnrollment.findAll({
        attributes: ['academicYear'],
        group: ['academicYear'],
        order: [['academicYear', 'DESC']],
        raw: true
      })
    ]);

    const totalGender = computeGenderBreakdown(genderRows);
    const total = totalGender.total;

    let ugBoys = 0, ugGirls = 0, ugOther = 0, ugNotSpecified = 0, ugTotal = 0;
    let pgBoys = 0, pgGirls = 0, pgOther = 0, pgNotSpecified = 0, pgTotal = 0;

    levelGenderRows.forEach(row => {
      const lvl = (row.programLevel || 'UG').toUpperCase();
      const g = String(row.gender || '').trim().toLowerCase();
      const c = parseInt(row.count, 10);

      const isUG = lvl === 'UG';
      if (g === 'male' || g === 'm' || g === 'boy' || g === 'boys') {
        if (isUG) ugBoys += c; else pgBoys += c;
      } else if (g === 'female' || g === 'f' || g === 'girl' || g === 'girls') {
        if (isUG) ugGirls += c; else pgGirls += c;
      } else if (g === 'other' || g === 'transgender' || g === 'non-binary') {
        if (isUG) ugOther += c; else pgOther += c;
      } else {
        if (isUG) ugNotSpecified += c; else pgNotSpecified += c;
      }

      if (isUG) ugTotal += c; else pgTotal += c;
    });

    const ugGender = { boys: ugBoys, girls: ugGirls, other: ugOther, notSpecified: ugNotSpecified, total: ugTotal };
    const pgGender = { boys: pgBoys, girls: pgGirls, other: pgOther, notSpecified: pgNotSpecified, total: pgTotal };

    const deptMap = new Map();
    deptGenderRows.forEach(row => {
      const deptName = row.department;
      if (!deptName || deptName === 'NIL' || deptName === 'N/A') return;

      if (!deptMap.has(deptName)) {
        deptMap.set(deptName, {
          department: deptName,
          count: 0,
          gender: { boys: 0, girls: 0, other: 0, notSpecified: 0, total: 0 }
        });
      }

      const deptObj = deptMap.get(deptName);
      const g = String(row.gender || '').trim().toLowerCase();
      const c = parseInt(row.count, 10);

      deptObj.count += c;
      deptObj.gender.total += c;

      if (g === 'male' || g === 'm' || g === 'boy' || g === 'boys') {
        deptObj.gender.boys += c;
      } else if (g === 'female' || g === 'f' || g === 'girl' || g === 'girls') {
        deptObj.gender.girls += c;
      } else if (g === 'other' || g === 'transgender' || g === 'non-binary') {
        deptObj.gender.other += c;
      } else {
        deptObj.gender.notSpecified += c;
      }
    });

    const departmentList = Array.from(deptMap.values()).sort((a, b) => b.count - a.count);

    const activeBreakdown = {
      active: activeCountResult,
      inactive: Math.max(0, total - activeCountResult)
    };
    const stateDiversity = [];
    const countryDiversity = [];

    const stats = {
      total,
      totalGender,
      ugCount: ugTotal,
      ugPercent: total > 0 ? ((ugTotal / total) * 100).toFixed(1) : '0',
      ugGender,
      pgCount: pgTotal,
      pgPercent: total > 0 ? ((pgTotal / total) * 100).toFixed(1) : '0',
      pgGender,
      activeCount: activeCountResult,
      activePercent: total > 0 ? ((activeCountResult / total) * 100).toFixed(1) : '0',
      activeBreakdown,
      stateDiversity,
      countryDiversity,
      depts: departmentList.length,
      departmentList
    };

    res.json({
      success: true,
      stats,
      distribution: {
        departments: Object.fromEntries(departmentList.map(d => [d.department, d.count])),
        academicYears: availableYearsRows.map(r => r.academicYear).filter(Boolean)
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

// @desc    Lookup student profile by register number across all academic years
// @route   GET /api/students/lookup/:regNo
// @access  Private
exports.lookupStudentByRegNo = async (req, res) => {
  try {
    const rawRegNo = req.params.regNo;
    if (!rawRegNo) {
      return res.status(400).json({ success: false, message: 'Register number required' });
    }

    const regNo = normalizeRegisterNumber(rawRegNo);

    const student = await Student.findOne({
      where: { registerNumber: regNo },
      include: [
        {
          model: StudentEnrollment,
          as: 'enrollments',
          order: [['academicYear', 'DESC']]
        }
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'No student found with this register number'
      });
    }

    // Check department scope
    if (req.user && req.user.role !== 'admin' && req.user.role !== 'authority' && req.user.department) {
      const isEnrolledInUserDept = student.enrollments && student.enrollments.some(e => e.department === req.user.department);
      if (student.department !== req.user.department && !isEnrolledInUserDept) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Student is outside your department scope.'
        });
      }
    }

    // Exact academic year validation if requested
    const requestedAY = (req.query && req.query.academicYear) ? req.query.academicYear.trim() : null;
    let targetEnrollment = null;
    if (requestedAY) {
      if (student.enrollments && student.enrollments.length > 0) {
        targetEnrollment = student.enrollments.find(e => (e.academicYear || '').trim().toLowerCase() === requestedAY.toLowerCase());
      }
      if (!targetEnrollment && (student.academicYear || '').trim().toLowerCase() === requestedAY.toLowerCase()) {
        targetEnrollment = {
          department: student.department,
          course: student.course,
          academicYear: student.academicYear,
          className: student.className
        };
      }
      if (!targetEnrollment) {
        return res.status(404).json({
          success: false,
          notEnrolledInAY: true,
          message: `Student with Register No "${regNo}" is not enrolled in Academic Year "${requestedAY}".`
        });
      }
    }

    // Detect department transitions
    const transitions = [];
    if (student.enrollments && student.enrollments.length > 1) {
      const sorted = [...student.enrollments].sort((a, b) => String(a.academicYear || '').localeCompare(String(b.academicYear || '')));
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        if (prev.department && curr.department && prev.department !== curr.department) {
          transitions.push({
            fromYear: prev.academicYear,
            toYear: curr.academicYear,
            fromDepartment: prev.department,
            toDepartment: curr.department,
            isFirstYearSH: isScienceAndHumanities(prev.department)
          });
        }
      }
    }

    const sanitized = sanitizeStudentData(student.toJSON(), req.user);

    res.json({
      success: true,
      data: sanitized,
      targetEnrollment,
      enrollments: student.enrollments || [],
      transitions
    });
  } catch (error) {
    console.error('Lookup student error:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// Permanent profile fields that are preserved on Student
const PERMANENT_PROFILE_FIELDS = [
  'name', 'gender', 'dob', 'bloodGroup', 'nationality', 'caste',
  'currentCity', 'currentState', 'permanentCity', 'permanentState', 'permanentCountry',
  'address', 'email', 'phone', 'mobileNo', 'parentMobileNo',
  'guardianName', 'guardianPhone', 'handicapped', 'handicappedDescription',
  'disability', 'admissionDate', 'applicationNo', 'previousSchool'
];

// @desc    Create student or add academic year enrollment (V3.0 intelligent merge)
// @route   POST /api/students
// @access  Private
exports.createStudent = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const rawRecord = req.body;
    const normalized = normalizeStudentRecord(rawRecord);

    if (req.user && req.user.role !== 'admin' && req.user.department) {
      normalized.department = req.user.department;
    }

    const regNo = normalized.registerNumber;
    if (!regNo) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Register number is required.' });
    }

    const targetAcademicYear = normalized.academicYear || '2024-2025';

    // 1. Check if canonical Student exists
    let student = await Student.findOne({
      where: { registerNumber: regNo },
      transaction: t
    });

    let isNewStudent = false;
    let departmentTransition = null;

    if (!student) {
      // Create new permanent profile
      isNewStudent = true;
      student = await Student.create(normalized, { transaction: t });
    } else {
      // Department permission check
      if (req.user && req.user.role !== 'admin' && student.department !== req.user.department) {
        // Check if transition from Science & Humanities
        const isSHTransition = isScienceAndHumanities(student.department);
        if (!isSHTransition) {
          await t.rollback();
          return res.status(403).json({
            success: false,
            message: `Not authorized: Student currently belongs to ${student.department}.`
          });
        }
      }

      // Missing-field-only update on Student profile (do not overwrite existing values)
      const profileUpdates = {};
      for (const field of PERMANENT_PROFILE_FIELDS) {
        const currentVal = student[field];
        const isMissing = !currentVal || currentVal === 'N/A' || currentVal === 'NIL' || currentVal === '';
        const newVal = normalized[field];
        const hasNewVal = newVal && newVal !== 'N/A' && newVal !== 'NIL' && newVal !== '';
        if (isMissing && hasNewVal) {
          profileUpdates[field] = newVal;
        }
      }

      // Check department transition
      if (student.department && normalized.department && student.department !== normalized.department) {
        departmentTransition = {
          from: student.department,
          to: normalized.department,
          isFirstYearSH: isScienceAndHumanities(student.department)
        };
      }

      // Update latest snapshot academic info on student
      profileUpdates.department = normalized.department || student.department;
      profileUpdates.course = normalized.course || student.course;
      profileUpdates.className = normalized.className || student.className;
      profileUpdates.batch = normalized.batch || student.batch;
      profileUpdates.programLevel = normalized.programLevel || student.programLevel;
      profileUpdates.status = normalized.status || student.status;
      profileUpdates.campus = normalized.campus || student.campus;
      profileUpdates.school = normalized.school || student.school;
      profileUpdates.academicYear = targetAcademicYear;

      await student.update(profileUpdates, { transaction: t });
    }

    // 2. Check/Upsert StudentEnrollment for targetAcademicYear
    let enrollment = await StudentEnrollment.findOne({
      where: { studentId: student.id, academicYear: targetAcademicYear },
      transaction: t
    });

    const isSH = isScienceAndHumanities(normalized.department);

    const enrollmentData = {
      studentId: student.id,
      registerNumber: regNo,
      academicYear: targetAcademicYear,
      department: normalized.department || student.department,
      program: normalized.course || student.course,
      course: normalized.course || student.course,
      className: normalized.className || student.className,
      batch: normalized.batch || student.batch,
      programLevel: normalized.programLevel || student.programLevel || 'UG',
      status: normalized.status || student.status || 'Active',
      campus: normalized.campus || student.campus,
      school: normalized.school || student.school,
      isFirstYearSH: isSH,
      customFields: normalized.customFields || {}
    };

    if (enrollment) {
      await enrollment.update(enrollmentData, { transaction: t });
    } else {
      enrollment = await StudentEnrollment.create(enrollmentData, { transaction: t });
    }

    await t.commit();

    await logActionSafe({
      user: req.user,
      action: isNewStudent ? 'CREATE_STUDENT' : 'ENROLL_STUDENT_YEAR',
      title: `${isNewStudent ? 'Created' : 'Updated'} student record: ${student.name} (${regNo})`,
      remarks: `Academic Year: ${targetAcademicYear}, Department: ${enrollmentData.department}${departmentTransition ? ` (Transitioned from ${departmentTransition.from})` : ''}`,
      ipAddress: req.ip
    });

    const completeRecord = {
      ...student.toJSON(),
      ...enrollment.toJSON(),
      id: student.id,
      enrollmentId: enrollment.id,
      departmentTransition
    };

    res.status(201).json({
      success: true,
      data: sanitizeStudentData(completeRecord, req.user),
      isNewStudent,
      departmentTransition
    });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update student profile and academic year enrollment
// @route   PUT /api/students/:id
// @access  Private
exports.updateStudent = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const student = await Student.findByPk(req.params.id, { transaction: t });
    if (!student) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    if (req.user && req.user.role !== 'admin' && student.department !== req.user.department) {
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Access denied: Cannot update student records outside your department.'
      });
    }

    const normalized = normalizeStudentRecord({ ...student.toJSON(), ...req.body });
    if (req.user && req.user.role !== 'admin' && req.user.department) {
      normalized.department = req.user.department;
    }

    await student.update(normalized, { transaction: t });

    // Update corresponding enrollment if academicYear specified
    const targetAY = req.body.academicYear || student.academicYear || '2024-2025';
    let enrollment = await StudentEnrollment.findOne({
      where: { studentId: student.id, academicYear: targetAY },
      transaction: t
    });

    if (enrollment) {
      await enrollment.update({
        department: normalized.department,
        course: normalized.course,
        program: normalized.course,
        className: normalized.className,
        batch: normalized.batch,
        programLevel: normalized.programLevel,
        status: normalized.status,
        campus: normalized.campus,
        school: normalized.school,
        customFields: normalized.customFields || enrollment.customFields
      }, { transaction: t });
    }

    await t.commit();

    res.json({
      success: true,
      data: sanitizeStudentData(student, req.user)
    });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('Update student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete student profile and associated enrollments
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
      message: 'Student profile and enrollment records deleted'
    });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Validate bulk students upload before commit (V3.0 Intelligent Preview)
// @route   POST /api/students/bulk/validate
// @access  Private (admin/coordinator/hod)
exports.validateBulkStudents = async (req, res) => {
  try {
    const { students: studentList, academicYear: defaultAY } = req.body;
    if (!Array.isArray(studentList) || studentList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No student records provided for validation.'
      });
    }

    const targetAY = defaultAY || '2024-2025';
    const regNos = new Set();
    const parsedRows = [];

    // Pre-validate format & detect intra-file duplicate register numbers in the same AY
    const intraBatchKeys = new Set();

    studentList.forEach((raw, idx) => {
      const regNo = normalizeRegisterNumber(
        raw['Register Number'] || raw.registerNumber || raw['Register No'] || raw['regNo'] || raw['RegNo']
      );
      const name = String(raw['Name'] || raw.name || raw['Student Name'] || '').trim();
      const ay = String(raw['Academic Year'] || raw.academicYear || targetAY).trim();

      const issues = [];
      let status = 'ready';

      if (!regNo) {
        issues.push('Register Number is missing.');
        status = 'invalid';
      }
      if (!name) {
        issues.push('Student Name is missing.');
        status = 'invalid';
      }

      const compositeKey = `${regNo}_${ay}`;
      if (regNo && intraBatchKeys.has(compositeKey)) {
        issues.push(`Duplicate entry for Register Number "${regNo}" in academic year "${ay}" within uploaded file.`);
        status = 'duplicate';
      } else if (regNo) {
        intraBatchKeys.add(compositeKey);
        regNos.add(regNo);
      }

      parsedRows.push({
        _tempId: `row_${idx + 1}`,
        _rowNumber: idx + 1,
        _rowStatus: status,
        _issues: issues,
        registerNumber: regNo,
        name,
        academicYear: ay,
        department: raw.department || raw['Department'] || null,
        course: raw.course || raw['Course'] || raw['Program'] || null,
        className: raw.className || raw['Class'] || raw['Section'] || null,
        batch: raw.batch || raw['Batch'] || null,
        programLevel: raw.programLevel || raw['Program Level'] || 'UG',
        gender: raw.gender || raw['Gender'] || 'Male',
        email: raw.email || raw['Email'] || null,
        phone: raw.phone || raw['Phone'] || raw.mobileNo || null,
        status: raw.status || raw['Status'] || 'Active',
        raw
      });
    });

    // Bulk query existing students and their enrollments
    const regNosArray = Array.from(regNos);
    const existingStudents = regNosArray.length > 0 ? await Student.findAll({
      where: { registerNumber: { [Op.in]: regNosArray } },
      include: [{ model: StudentEnrollment, as: 'enrollments' }]
    }) : [];

    const existingStudentMap = new Map();
    existingStudents.forEach(st => existingStudentMap.set(st.registerNumber, st));

    let readyCount = 0;
    let needsReviewCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    // Classify rows & detect transitions / conflicts
    parsedRows.forEach(row => {
      if (row._rowStatus === 'duplicate') {
        duplicateCount++;
        return;
      }
      if (row._rowStatus === 'invalid') {
        invalidCount++;
        return;
      }

      const existing = existingStudentMap.get(row.registerNumber);
      if (!existing) {
        row.category = 'new_student';
        row.categoryLabel = 'New Student Profile';
        readyCount++;
      } else {
        // Department scope check
        if (req.user && req.user.role !== 'admin' && existing.department !== req.user.department) {
          const isSH = isScienceAndHumanities(existing.department);
          if (!isSH) {
            row._rowStatus = 'needs_review';
            row._issues.push(`Student currently registered under ${existing.department}. Cross-department upload requires approval.`);
            needsReviewCount++;
            return;
          }
        }

        const existingEnrollmentInYear = existing.enrollments && existing.enrollments.find(e => e.academicYear === row.academicYear);
        if (existingEnrollmentInYear) {
          row.category = 'existing_enrollment_update';
          row.categoryLabel = 'Existing Enrollment Update';
        } else {
          row.category = 'new_year_enrollment';
          row.categoryLabel = 'New Academic Year Enrollment';
        }

        // Check department transition
        if (existing.department && row.department && existing.department !== row.department) {
          const isSH = isScienceAndHumanities(existing.department);
          row.departmentTransition = {
            from: existing.department,
            to: row.department,
            isFirstYearSH: isSH
          };
          if (isSH) {
            row.infoMessage = `First-Year Science & Humanities progression to ${row.department}.`;
          } else {
            row.infoMessage = `Department transition: ${existing.department} → ${row.department}.`;
          }
        }

        // Missing fields fill info
        const missingFieldsToFill = [];
        for (const f of PERMANENT_PROFILE_FIELDS) {
          const curr = existing[f];
          const isMissing = !curr || curr === 'N/A' || curr === 'NIL' || curr === '';
          const nw = row[f] || (row.raw && row.raw[f]);
          if (isMissing && nw && nw !== 'N/A' && nw !== 'NIL' && nw !== '') {
            missingFieldsToFill.push(f);
          }
        }
        if (missingFieldsToFill.length > 0) {
          row.missingFieldsFilled = missingFieldsToFill;
        }

        readyCount++;
      }
    });

    res.json({
      success: true,
      summary: {
        totalRecords: parsedRows.length,
        ready: readyCount,
        needsReview: needsReviewCount,
        duplicates: duplicateCount,
        invalid: invalidCount
      },
      records: parsedRows
    });
  } catch (error) {
    console.error('Validate bulk students error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Bulk create/update students with V3.0 Intelligent Missing-Field Merge
// @route   POST /api/students/bulk
// @access  Private (admin/coordinator/hod)
exports.bulkCreateStudent = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { students: studentList, academicYear: defaultAY } = req.body;
    if (!Array.isArray(studentList) || studentList.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No student records provided'
      });
    }

    const defaultAcademicYear = defaultAY || '2024-2025';
    const errors = [];
    const validRows = [];

    // Step 1: Pre-validate & collect unique register numbers
    const regNos = new Set();
    const intraBatchKeys = new Set();

    for (let i = 0; i < studentList.length; i++) {
      const raw = studentList[i];
      const regNo = normalizeRegisterNumber(
        raw['Register Number'] || raw.registerNumber || raw['Register No'] || raw['regNo'] || raw['RegNo']
      );
      const name = String(raw['Name'] || raw.name || raw['Student Name'] || '').trim();
      const ay = String(raw['Academic Year'] || raw.academicYear || defaultAcademicYear).trim();

      if (!regNo) {
        errors.push(`Row ${i + 1}: Register Number is required.`);
        continue;
      }
      if (!name) {
        errors.push(`Row ${i + 1} (${regNo}): Student Name is required.`);
        continue;
      }

      const compositeKey = `${regNo}_${ay}`;
      if (intraBatchKeys.has(compositeKey)) {
        errors.push(`Row ${i + 1} (${regNo}): Duplicate record in academic year "${ay}" within uploaded batch.`);
        continue;
      }
      intraBatchKeys.add(compositeKey);

      regNos.add(regNo);
      validRows.push({ index: i, raw, regNo, name, ay });
    }

    if (validRows.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'All records failed initial validation.',
        errors
      });
    }

    // Step 2: Bulk query existing Students and their Enrollments in 1 single query
    const regNosArray = Array.from(regNos);
    const existingStudents = await Student.findAll({
      where: { registerNumber: { [Op.in]: regNosArray } },
      include: [{ model: StudentEnrollment, as: 'enrollments' }],
      transaction: t
    });

    const studentMap = new Map();
    existingStudents.forEach(st => studentMap.set(st.registerNumber, st));

    const studentsToCreate = [];
    const studentsToUpdate = [];
    const enrollmentsToCreate = [];
    const enrollmentsToUpdate = [];

    let departmentTransitionsCount = 0;

    // Step 3: Process rows in memory
    for (const { index, raw, regNo, name, ay } of validRows) {
      try {
        const normalized = normalizeStudentRecord({
          ...raw,
          registerNumber: regNo,
          name,
          academicYear: ay,
          department: raw.department || raw['Department'] || (req.user?.role !== 'admin' ? req.user?.department : null),
          course: raw.course || raw['Course'] || raw['Program'] || null,
          className: raw.className || raw['Class'] || raw['Section'] || null,
          batch: raw.batch || raw['Batch'] || null,
          programLevel: raw.programLevel || raw['Program Level'] || 'UG',
          gender: raw.gender || raw['Gender'] || 'Male',
          email: raw.email || raw['Email'] || null,
          phone: raw.phone || raw['Phone'] || raw.mobileNo || null,
          status: raw.status || raw['Status'] || 'Active'
        });

        const existing = studentMap.get(regNo);

        if (!existing) {
          // Brand new student profile
          studentsToCreate.push({
            data: normalized,
            regNo,
            academicYear: ay,
            rowRaw: normalized
          });
        } else {
          // Existing student profile: authorization check
          if (req.user && req.user.role !== 'admin' && existing.department !== req.user.department) {
            const isSH = isScienceAndHumanities(existing.department);
            if (!isSH) {
              errors.push(`Row ${index + 1} (${regNo}): Student belongs to ${existing.department}. Access denied.`);
              continue;
            }
          }

          // Missing-field-only merge on Student profile
          const profileUpdates = {};
          for (const f of PERMANENT_PROFILE_FIELDS) {
            const curr = existing[f];
            const isMissing = !curr || curr === 'N/A' || curr === 'NIL' || curr === '';
            const nw = normalized[f];
            const hasNw = nw && nw !== 'N/A' && nw !== 'NIL' && nw !== '';
            if (isMissing && hasNw) {
              profileUpdates[f] = nw;
              existing[f] = nw; // update local memory
            }
          }

          // Department transition tracking
          if (existing.department && normalized.department && existing.department !== normalized.department) {
            departmentTransitionsCount++;
          }

          // Update latest snapshot fields
          profileUpdates.department = normalized.department || existing.department;
          profileUpdates.course = normalized.course || existing.course;
          profileUpdates.className = normalized.className || existing.className;
          profileUpdates.batch = normalized.batch || existing.batch;
          profileUpdates.programLevel = normalized.programLevel || existing.programLevel;
          profileUpdates.status = normalized.status || existing.status;
          profileUpdates.campus = normalized.campus || existing.campus;
          profileUpdates.school = normalized.school || existing.school;
          profileUpdates.academicYear = ay;

          studentsToUpdate.push({ student: existing, updates: profileUpdates });

          // Enrollment handling
          const existingEnrollment = existing.enrollments && existing.enrollments.find(e => e.academicYear === ay);
          const isSH = isScienceAndHumanities(normalized.department);

          const enrollmentPayload = {
            studentId: existing.id,
            registerNumber: regNo,
            academicYear: ay,
            department: normalized.department || existing.department,
            program: normalized.course || existing.course,
            course: normalized.course || existing.course,
            className: normalized.className || existing.className,
            batch: normalized.batch || existing.batch,
            programLevel: normalized.programLevel || existing.programLevel || 'UG',
            status: normalized.status || existing.status || 'Active',
            campus: normalized.campus || existing.campus,
            school: normalized.school || existing.school,
            isFirstYearSH: isSH,
            customFields: normalized.customFields || {}
          };

          if (existingEnrollment) {
            enrollmentsToUpdate.push({ enrollment: existingEnrollment, updates: enrollmentPayload });
          } else {
            enrollmentsToCreate.push(enrollmentPayload);
          }
        }
      } catch (rowErr) {
        errors.push(`Row ${index + 1} (${regNo}): ${rowErr.message || 'Processing error'}`);
      }
    }

    // Step 4: Execute DB writes
    let createdCount = 0;

    // Create new students & their initial enrollments
    for (const item of studentsToCreate) {
      const createdStudent = await Student.create(item.data, { transaction: t });
      const isSH = isScienceAndHumanities(item.rowRaw.department);

      enrollmentsToCreate.push({
        studentId: createdStudent.id,
        registerNumber: item.regNo,
        academicYear: item.academicYear,
        department: item.rowRaw.department,
        program: item.rowRaw.course,
        course: item.rowRaw.course,
        className: item.rowRaw.className,
        batch: item.rowRaw.batch,
        programLevel: item.rowRaw.programLevel || 'UG',
        status: item.rowRaw.status || 'Active',
        campus: item.rowRaw.campus,
        school: item.rowRaw.school,
        isFirstYearSH: isSH,
        customFields: item.rowRaw.customFields || {}
      });
      createdCount++;
    }

    // Update existing student profiles
    for (const item of studentsToUpdate) {
      await item.student.update(item.updates, { transaction: t });
      createdCount++;
    }

    // Update existing enrollments
    for (const item of enrollmentsToUpdate) {
      await item.enrollment.update(item.updates, { transaction: t });
    }

    // Bulk insert new enrollments
    if (enrollmentsToCreate.length > 0) {
      await StudentEnrollment.bulkCreate(enrollmentsToCreate, { transaction: t });
    }

    await t.commit();

    await logActionSafe({
      user: req.user,
      action: 'BULK_UPLOAD_STUDENTS_V3',
      title: `Bulk uploaded student records (V3.0)`,
      remarks: `Processed ${createdCount} students, ${enrollmentsToCreate.length} new enrollments, ${enrollmentsToUpdate.length} updated enrollments, ${departmentTransitionsCount} department transitions.`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Processed ${createdCount} student record(s) successfully.${departmentTransitionsCount ? ` Detected ${departmentTransitionsCount} department transitions.` : ''}${errors.length ? ` ${errors.length} error(s) encountered.` : ''}`,
      count: createdCount,
      newEnrollments: enrollmentsToCreate.length,
      updatedEnrollments: enrollmentsToUpdate.length,
      departmentTransitions: departmentTransitionsCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('Bulk create students error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Detect duplicate student profile candidates for consolidation
// @route   GET /api/students/duplicates
// @access  Private (admin/coordinator)
exports.getDuplicateCandidates = async (req, res) => {
  try {
    const [nameDobDuplicates] = await sequelize.query(`
      SELECT s1."id" as "primaryId", s1."registerNumber" as "primaryRegNo", s1."name", s1."dob", s1."department",
             s2."id" as "duplicateId", s2."registerNumber" as "duplicateRegNo", s2."department" as "duplicateDept"
      FROM "students" s1
      JOIN "students" s2 ON LOWER(TRIM(s1."name")) = LOWER(TRIM(s2."name"))
                         AND s1."dob" = s2."dob"
                         AND s1."id" < s2."id"
      WHERE s1."dob" IS NOT NULL;
    `);

    res.json({
      success: true,
      count: nameDobDuplicates.length,
      duplicates: nameDobDuplicates
    });
  } catch (error) {
    console.error('Get duplicate candidates error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Consolidate duplicate student profiles safely into one canonical profile
// @route   POST /api/students/consolidate
// @access  Private (admin/coordinator)
exports.consolidateDuplicates = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { primaryStudentId, duplicateStudentId } = req.body;
    if (!primaryStudentId || !duplicateStudentId) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Both primaryStudentId and duplicateStudentId are required.' });
    }

    const primary = await Student.findByPk(primaryStudentId, { transaction: t });
    const duplicate = await Student.findByPk(duplicateStudentId, { transaction: t });

    if (!primary || !duplicate) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'One or both student profiles not found.' });
    }

    // 1. Merge missing fields into primary
    const updates = {};
    for (const f of PERMANENT_PROFILE_FIELDS) {
      const pVal = primary[f];
      const dVal = duplicate[f];
      const isMissing = !pVal || pVal === 'N/A' || pVal === 'NIL' || pVal === '';
      if (isMissing && dVal && dVal !== 'N/A' && dVal !== 'NIL' && dVal !== '') {
        updates[f] = dVal;
      }
    }
    if (Object.keys(updates).length > 0) {
      await primary.update(updates, { transaction: t });
    }

    // 2. Re-assign enrollments from duplicate to primary (avoiding year collisions)
    const duplicateEnrollments = await StudentEnrollment.findAll({
      where: { studentId: duplicate.id },
      transaction: t
    });

    for (const de of duplicateEnrollments) {
      const existingInPrimary = await StudentEnrollment.findOne({
        where: { studentId: primary.id, academicYear: de.academicYear },
        transaction: t
      });

      if (!existingInPrimary) {
        await de.update({
          studentId: primary.id,
          registerNumber: primary.registerNumber
        }, { transaction: t });
      } else {
        await de.destroy({ transaction: t });
      }
    }

    // 3. Delete redundant student profile
    await duplicate.destroy({ transaction: t });

    await t.commit();

    await logActionSafe({
      user: req.user,
      action: 'CONSOLIDATE_STUDENT_DUPLICATE',
      title: `Consolidated student duplicate: ${duplicate.registerNumber} into ${primary.registerNumber}`,
      remarks: `Merged profile attributes and re-assigned enrollments.`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Successfully consolidated profile ${duplicate.registerNumber} into canonical profile ${primary.registerNumber}.`
    });
  } catch (error) {
    if (t && !t.finished) await t.rollback();
    console.error('Consolidate duplicates error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Advanced Analytics workspace: Multi-year trends, gender splits, transitions
// @route   GET /api/students/analytics
// @access  Private
exports.getStudentAnalytics = async (req, res) => {
  try {
    const { where: scopeWhere } = await resolveDepartmentScope(req, 'Student', false);

    // 1. Enrollment trends by academic year
    const yearlyEnrollment = await StudentEnrollment.findAll({
      attributes: [
        'academicYear',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalStudents'],
        [sequelize.literal(`COUNT(CASE WHEN "status" = 'Active' THEN 1 END)`), 'activeStudents']
      ],
      where: scopeWhere && Object.keys(scopeWhere).length > 0 ? scopeWhere : undefined,
      group: ['academicYear'],
      order: [['academicYear', 'ASC']],
      raw: true
    });

    // 2. Multi-year Department progression & distributions
    const deptDistribution = await StudentEnrollment.findAll({
      attributes: [
        'academicYear',
        'department',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where: {
        [Op.and]: [
          scopeWhere && Object.keys(scopeWhere).length > 0 ? scopeWhere : {},
          { department: { [Op.ne]: null } }
        ]
      },
      group: ['academicYear', 'department'],
      order: [['academicYear', 'ASC'], [sequelize.literal('count'), 'DESC']],
      raw: true
    });

    // 3. Gender distribution across academic years
    const genderTrends = await sequelize.query(`
      SELECT e."academicYear", s."gender", COUNT(e."id") as count
      FROM "student_enrollments" e
      JOIN "students" s ON e."studentId" = s."id"
      GROUP BY e."academicYear", s."gender"
      ORDER BY e."academicYear" ASC;
    `, { type: sequelize.QueryTypes.SELECT });

    // 4. Department transitions count (e.g. Science & Humanities -> Engineering)
    const [transitionsRows] = await sequelize.query(`
      SELECT e1."department" as "fromDept", e2."department" as "toDept", COUNT(DISTINCT e1."studentId") as count
      FROM "student_enrollments" e1
      JOIN "student_enrollments" e2 ON e1."studentId" = e2."studentId"
      WHERE e1."academicYear" < e2."academicYear"
        AND e1."department" IS NOT NULL
        AND e2."department" IS NOT NULL
        AND e1."department" != e2."department"
      GROUP BY e1."department", e2."department"
      ORDER BY count DESC;
    `);

    res.json({
      success: true,
      analytics: {
        yearlyEnrollment,
        deptDistribution,
        genderTrends,
        transitions: transitionsRows
      }
    });
  } catch (error) {
    console.error('Get student analytics error:', error);
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
      const studentsInScope = await Student.findAll({ where, attributes: ['id'], transaction: t });
      const studentIds = studentsInScope.map(s => s.id);

      if (studentIds.length > 0) {
        await StudentEnrollment.destroy({
          where: { studentId: { [Op.in]: studentIds } },
          transaction: t
        });
        deletedCount = await Student.destroy({
          where: { id: { [Op.in]: studentIds } },
          transaction: t
        });
      }
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
