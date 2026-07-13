const { Student } = require('../models');

/**
 * Normalize a student record before any DB write.
 *
 * The live PostgreSQL database may have been originally created with NOT NULL
 * constraints on columns that the current Sequelize model marks as allowNull: true.
 * Rather than running manual ALTER TABLE migrations, we provide safe 'N/A' fallbacks
 * for every nullable string/text field so no constraint violation can occur.
 */
const normalizeStudentRecord = (record) => {
  const normalized = { ...record };

  // Auto-generate placeholder email from register number (email is required by DB)
  if (!normalized.email || !normalized.email.trim() || normalized.email === 'NIL') {
    const regNo = (normalized.registerNumber || 'student').toString().trim();
    normalized.email = `${regNo}@students.christuniversity.in`;
  }

  // Provide 'N/A' fallback for every other nullable string / text field
  const nullableStringFields = [
    'phone', 'course', 'department', 'previousSchool', 'bloodGroup', 'batch',
    'guardianName', 'guardianPhone', 'address', 'className', 'applicationNo',
    'mobileNo', 'nationality', 'caste', 'currentCity', 'currentState',
    'permanentCity', 'permanentState', 'parentMobileNo', 'handicapped',
    'handicappedDescription', 'campus', 'disability'
  ];

  for (const field of nullableStringFields) {
    if (normalized[field] === undefined || normalized[field] === null ||
        normalized[field] === '' || normalized[field] === 'NIL') {
      normalized[field] = 'N/A';
    }
  }

  return normalized;
};

// @desc    Get all students
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      order: [['createdAt', 'DESC']]
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

// @desc    Create student
// @route   POST /api/students
// @access  Private
exports.createStudent = async (req, res) => {
  try {
    const student = await Student.create(normalizeStudentRecord(req.body));
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
    await student.update(normalizeStudentRecord(req.body));
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
      const record = normalizeStudentRecord(studentList[i]);
      try {
        const existing = await Student.findOne({
          where: { registerNumber: record.registerNumber }
        });
        if (existing) {
          await existing.update(record);
          created.push(existing);
        } else {
          const std = await Student.create(record);
          created.push(std);
        }
      } catch (err) {
        errors.push(`Row ${i + 1} (${record.registerNumber || 'unknown'}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `${created.length} student record(s) uploaded successfully.${errors.length ? ` ${errors.length} error(s) encountered.` : ''}`,
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
