const { ProgramLevel } = require('../models');

// @desc    Get all program levels
// @route   GET /api/program-levels
// @access  Private
exports.getProgramLevels = async (req, res) => {
  try {
    const where = { status: 'Active' };
    const programLevels = await ProgramLevel.findAll({
      where,
      order: [['code', 'ASC']]
    });
    res.json({ success: true, count: programLevels.length, data: programLevels });
  } catch (error) {
    console.error('Get program levels error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get single program level
// @route   GET /api/program-levels/:id
// @access  Private
exports.getProgramLevel = async (req, res) => {
  try {
    const programLevel = await ProgramLevel.findByPk(req.params.id);
    if (!programLevel) {
      return res.status(404).json({ success: false, message: 'Program level not found' });
    }
    res.json({ success: true, data: programLevel });
  } catch (error) {
    console.error('Get program level error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create program level
// @route   POST /api/program-levels
// @access  Private (admin)
exports.createProgramLevel = async (req, res) => {
  try {
    const programLevel = await ProgramLevel.create(req.body);
    res.status(201).json({ success: true, data: programLevel });
  } catch (error) {
    console.error('Create program level error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Update program level
// @route   PUT /api/program-levels/:id
// @access  Private (admin)
exports.updateProgramLevel = async (req, res) => {
  try {
    const programLevel = await ProgramLevel.findByPk(req.params.id);
    if (!programLevel) {
      return res.status(404).json({ success: false, message: 'Program level not found' });
    }
    await programLevel.update(req.body);
    res.json({ success: true, data: programLevel });
  } catch (error) {
    console.error('Update program level error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete program level
// @route   DELETE /api/program-levels/:id
// @access  Private (admin)
exports.deleteProgramLevel = async (req, res) => {
  try {
    const programLevel = await ProgramLevel.findByPk(req.params.id);
    if (!programLevel) {
      return res.status(404).json({ success: false, message: 'Program level not found' });
    }
    await programLevel.destroy();
    res.json({ success: true, message: 'Program level deleted successfully' });
  } catch (error) {
    console.error('Delete program level error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
