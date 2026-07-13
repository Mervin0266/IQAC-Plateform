const { Student } = require('../models');

/**
 * Normalize a student record before DB write.
 * Fills in a placeholder email if none is provided, preventing NOT NULL
 * constraint violations on the `email` column (which may be NOT NULL in the
 * database from an earlier schema version).
 */
const normalizeStudentRecord = (record) => {
  const normalized = { ...record };
  if (!normalized.email || normalized.email === 'NIL' || normalized.email.trim() === '') {
    const regNo = (normalized.registerNumber || 'student').toString().trim();
    normalized.email = `${regNo}@students.christuniversity.in`;
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
