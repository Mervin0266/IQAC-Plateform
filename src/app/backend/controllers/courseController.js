const { Course, Department, ProgramLevel } = require('../models');

// @desc    Get all courses (optionally filter by departmentId, programLevelId)
// @route   GET /api/courses
// @access  Private
exports.getCourses = async (req, res) => {
  try {
    const where = { status: 'Active' };
    if (req.query.departmentId) {
      where.departmentId = req.query.departmentId;
    }
    if (req.query.programLevelId) {
      where.programLevelId = req.query.programLevelId;
    }
    const courses = await Course.findAll({
      where,
      order: [['name', 'ASC']],
      include: [
        { model: Department, as: 'department', attributes: ['id', 'code', 'name', 'shortName'] },
        { model: ProgramLevel, as: 'programLevel', attributes: ['id', 'code', 'name'] }
      ]
    });
    res.json({ success: true, count: courses.length, data: courses });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single course
// @route   GET /api/courses/:id
// @access  Private
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [
        { model: Department, as: 'department', attributes: ['id', 'code', 'name', 'shortName'] },
        { model: ProgramLevel, as: 'programLevel', attributes: ['id', 'code', 'name'] }
      ]
    });
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create course
// @route   POST /api/courses
// @access  Private (admin)
exports.createCourse = async (req, res) => {
  try {
    // Validate department exists
    if (req.body.departmentId) {
      const department = await Department.findByPk(req.body.departmentId);
      if (!department) {
        return res.status(400).json({ success: false, message: 'Invalid departmentId — department not found' });
      }
    }
    // Validate program level exists
    if (req.body.programLevelId) {
      const programLevel = await ProgramLevel.findByPk(req.body.programLevelId);
      if (!programLevel) {
        return res.status(400).json({ success: false, message: 'Invalid programLevelId — program level not found' });
      }
    }
    const course = await Course.create(req.body);
    res.status(201).json({ success: true, data: course });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (admin)
exports.updateCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    await course.update(req.body);
    res.json({ success: true, data: course });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (admin)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    await course.destroy();
    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
