const { School, Campus, Department } = require('../models');

// @desc    Get all schools (optionally filter by campusId)
// @route   GET /api/schools
// @access  Private
exports.getSchools = async (req, res) => {
  try {
    const where = { status: 'Active' };
    if (req.query.campusId) {
      where.campusId = req.query.campusId;
    }
    const schools = await School.findAll({
      where,
      order: [['name', 'ASC']],
      include: [
        { model: Campus, as: 'campus', attributes: ['id', 'code', 'name'] },
        { model: Department, as: 'departments', attributes: ['id', 'code', 'name', 'shortName'] }
      ]
    });
    res.json({ success: true, count: schools.length, data: schools });
  } catch (error) {
    console.error('Get schools error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single school
// @route   GET /api/schools/:id
// @access  Private
exports.getSchool = async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id, {
      include: [
        { model: Campus, as: 'campus', attributes: ['id', 'code', 'name'] },
        { model: Department, as: 'departments', attributes: ['id', 'code', 'name', 'shortName', 'status'] }
      ]
    });
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    res.json({ success: true, data: school });
  } catch (error) {
    console.error('Get school error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get departments in a school
// @route   GET /api/schools/:id/departments
// @access  Private
exports.getSchoolDepartments = async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    const departments = await Department.findAll({
      where: { schoolId: req.params.id, status: 'Active' },
      order: [['code', 'ASC']]
    });
    res.json({ success: true, count: departments.length, data: departments });
  } catch (error) {
    console.error('Get school departments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create school
// @route   POST /api/schools
// @access  Private (admin)
exports.createSchool = async (req, res) => {
  try {
    // Validate campus exists
    if (req.body.campusId) {
      const campus = await Campus.findByPk(req.body.campusId);
      if (!campus) {
        return res.status(400).json({ success: false, message: 'Invalid campusId — campus not found' });
      }
    }
    const school = await School.create(req.body);
    res.status(201).json({ success: true, data: school });
  } catch (error) {
    console.error('Create school error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Update school
// @route   PUT /api/schools/:id
// @access  Private (admin)
exports.updateSchool = async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    await school.update(req.body);
    res.json({ success: true, data: school });
  } catch (error) {
    console.error('Update school error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete school
// @route   DELETE /api/schools/:id
// @access  Private (admin)
exports.deleteSchool = async (req, res) => {
  try {
    const school = await School.findByPk(req.params.id);
    if (!school) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }
    await school.destroy();
    res.json({ success: true, message: 'School deleted successfully' });
  } catch (error) {
    console.error('Delete school error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
