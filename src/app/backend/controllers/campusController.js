const { Campus, School } = require('../models');

// @desc    Get all campuses
// @route   GET /api/campuses
// @access  Private
exports.getCampuses = async (req, res) => {
  try {
    const campuses = await Campus.findAll({
      where: { status: 'Active' },
      order: [['name', 'ASC']],
      include: [{ model: School, as: 'schools', attributes: ['id', 'code', 'name'] }]
    });
    res.json({ success: true, count: campuses.length, data: campuses });
  } catch (error) {
    console.error('Get campuses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single campus
// @route   GET /api/campuses/:id
// @access  Private
exports.getCampus = async (req, res) => {
  try {
    const campus = await Campus.findByPk(req.params.id, {
      include: [{ model: School, as: 'schools', attributes: ['id', 'code', 'name', 'status'] }]
    });
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found' });
    }
    res.json({ success: true, data: campus });
  } catch (error) {
    console.error('Get campus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get schools in a campus
// @route   GET /api/campuses/:id/schools
// @access  Private
exports.getCampusSchools = async (req, res) => {
  try {
    const campus = await Campus.findByPk(req.params.id);
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found' });
    }
    const schools = await School.findAll({
      where: { campusId: req.params.id, status: 'Active' },
      order: [['name', 'ASC']]
    });
    res.json({ success: true, count: schools.length, data: schools });
  } catch (error) {
    console.error('Get campus schools error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create campus
// @route   POST /api/campuses
// @access  Private (admin)
exports.createCampus = async (req, res) => {
  try {
    const campus = await Campus.create(req.body);
    res.status(201).json({ success: true, data: campus });
  } catch (error) {
    console.error('Create campus error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Update campus
// @route   PUT /api/campuses/:id
// @access  Private (admin)
exports.updateCampus = async (req, res) => {
  try {
    const campus = await Campus.findByPk(req.params.id);
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found' });
    }
    await campus.update(req.body);
    res.json({ success: true, data: campus });
  } catch (error) {
    console.error('Update campus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete campus
// @route   DELETE /api/campuses/:id
// @access  Private (admin)
exports.deleteCampus = async (req, res) => {
  try {
    const campus = await Campus.findByPk(req.params.id);
    if (!campus) {
      return res.status(404).json({ success: false, message: 'Campus not found' });
    }
    await campus.destroy();
    res.json({ success: true, message: 'Campus deleted successfully' });
  } catch (error) {
    console.error('Delete campus error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
