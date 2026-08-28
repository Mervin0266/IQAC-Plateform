const { Student } = require('../models');

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
        normalized[field] === '' || normalized[field] === 'NIL') {
      normalized[field] = 'N/A';
    }
  }

  return normalized;
};

/**
 * Maps missing fields in a target student record from other historical academic year
 * records belonging to the same register number.
 */
const enrichFromHistory = async (targetRecord) => {
  if (!targetRecord || !targetRecord.registerNumber) return targetRecord;

  const regNo = String(targetRecord.registerNumber).trim();
  const historicalRecords = await Student.findAll({
    where: { registerNumber: regNo },
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
    const where = {};
    if (req.query.academicYear && req.query.academicYear !== 'all' && req.query.academicYear !== 'All') {
      where.academicYear = req.query.academicYear;
    }
    if (req.query.department && req.query.department !== 'all' && req.query.department !== 'All') {
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

    const students = await Student.findAll({
      where,
      order: [['registerNumber', 'ASC'], ['academicYear', 'DESC'], ['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
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

    const records = await Student.findAll({
      where: { registerNumber: regNo.trim() },
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

    res.json({
      success: true,
      data: merged,
      academicYears: records.map(r => r.academicYear)
    });
  } catch (error) {
    console.error('Lookup student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create student
// @route   POST /api/students
// @access  Private
exports.createStudent = async (req, res) => {
  try {
    const rawRecord = req.body;
    const enriched = await enrichFromHistory(rawRecord);
    const normalized = normalizeStudentRecord(enriched);

    const regNo = normalized.registerNumber;
    const academicYear = normalized.academicYear;

    // Check if record exists for this specific (registerNumber, academicYear) pair
    let student = await Student.findOne({
      where: { registerNumber: regNo, academicYear: academicYear }
    });

    if (student) {
      await student.update(normalized);
    } else {
      student = await Student.create(normalized);
    }

    res.status(201).json({
      success: true,
      data: student
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

    const enriched = await enrichFromHistory({ ...student.toJSON(), ...req.body });
    const normalized = normalizeStudentRecord(enriched);

    await student.update(normalized);

    res.json({
      success: true,
      data: student
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
  try {
    const { students: studentList } = req.body;
    if (!Array.isArray(studentList) || studentList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No student records provided'
      });
    }

    const errors = [];
    const created = [];

    for (let i = 0; i < studentList.length; i++) {
      const rawRecord = studentList[i];
      if (!rawRecord || !rawRecord.registerNumber) continue;

      try {
        const enriched = await enrichFromHistory(rawRecord);
        const normalized = normalizeStudentRecord(enriched);

        const regNo = normalized.registerNumber;
        const academicYear = normalized.academicYear;

        // Check if student record exists for this specific registerNumber and academicYear
        let existingYearRecord = await Student.findOne({
          where: { registerNumber: regNo, academicYear: academicYear }
        });

        if (existingYearRecord) {
          await existingYearRecord.update(normalized);
          created.push(existingYearRecord);
        } else {
          const std = await Student.create(normalized);
          created.push(std);
        }
      } catch (err) {
        errors.push(`Row ${i + 1} (${rawRecord.registerNumber || 'unknown'}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `${created.length} student record(s) processed successfully.${errors.length ? ` ${errors.length} error(s) encountered.` : ''}`,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Bulk create students error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
