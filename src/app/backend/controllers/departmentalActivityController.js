const { DepartmentalActivity } = require('../models');

const DEPARTMENTS = [
  'AI and Data Science Engineering',
  'Civil Engineering',
  'Computer Science and Engineering',
  'Electrical and Electronics Engineering',
  'Electronics and Communication Engineering',
  'Mechanical and Automobile Engineering',
  'Science and Humanities (Engineering)',
];

const ACTIVITY_CATEGORIES = [
  'Faculty Development Activities',
  'Seminar / Talks / Training Program',
  'Club Association',
  'Seminar / Conference / Guest Talks',
  'Awards and Recognitions',
  'Workshops and Skill Development',
  'Student Development Program',
  'Industrial Visit',
  'Social Outreach Program',
  'Guest Lectures',
  'Memorandum of Understanding',
  'Extension Activity',
  'Student Publications',
  'Best Practices',
  'SDG Related Events',
];

// @desc    Get all departmental activities (filterable)
// @route   GET /api/departmental-activities
// @access  Private
exports.getActivities = async (req, res) => {
  try {
    const where = {};
    if (req.query.academicYear && req.query.academicYear !== 'All') {
      where.academicYear = req.query.academicYear;
    }
    if (req.query.department && req.query.department !== 'All') {
      where.department = req.query.department;
    }
    if (req.query.activityCategory && req.query.activityCategory !== 'All') {
      where.activityCategory = req.query.activityCategory;
    }
    if (req.query.status && req.query.status !== 'All') {
      where.status = req.query.status;
    }

    const activities = await DepartmentalActivity.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error('Get departmental activities error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get aggregated matrix summary (7 Departments x 15 Categories)
// @route   GET /api/departmental-activities/matrix
// @access  Private
exports.getMatrixSummary = async (req, res) => {
  try {
    const activities = await DepartmentalActivity.findAll();

    // Map departments to their categories and pending reports
    const matrix = {};
    DEPARTMENTS.forEach(dept => {
      matrix[dept] = {
        categories: {},
        eventStatus: 'No Events found',
        pendingNotes: [],
      };
      ACTIVITY_CATEGORIES.forEach(cat => {
        matrix[dept].categories[cat] = {
          count: 0,
          reportDetails: '-',
          items: [],
        };
      });
    });

    activities.forEach(act => {
      const dept = act.department;
      const cat = act.activityCategory;

      if (matrix[dept] && matrix[dept].categories[cat]) {
        matrix[dept].categories[cat].count += 1;
        matrix[dept].categories[cat].items.push(act);
        matrix[dept].eventStatus = 'Updated';

        if (act.reportDetails && act.reportDetails !== '-') {
          matrix[dept].categories[cat].reportDetails = act.reportDetails;
        }
      }

      if (act.status === 'Pending' && act.pendingNotes) {
        if (matrix[dept] && !matrix[dept].pendingNotes.includes(act.pendingNotes)) {
          matrix[dept].pendingNotes.push(act.pendingNotes);
        }
      }
    });

    res.json({
      success: true,
      departments: DEPARTMENTS,
      categories: ACTIVITY_CATEGORIES,
      matrix,
    });
  } catch (error) {
    console.error('Get matrix summary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create departmental activity
// @route   POST /api/departmental-activities
// @access  Private
exports.createActivity = async (req, res) => {
  try {
    const activity = await DepartmentalActivity.create(req.body);
    res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('Create activity error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Update departmental activity
// @route   PUT /api/departmental-activities/:id
// @access  Private
exports.updateActivity = async (req, res) => {
  try {
    const activity = await DepartmentalActivity.findByPk(req.params.id);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity record not found' });
    }
    await activity.update(req.body);
    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete departmental activity
// @route   DELETE /api/departmental-activities/:id
// @access  Private
exports.deleteActivity = async (req, res) => {
  try {
    const activity = await DepartmentalActivity.findByPk(req.params.id);
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity record not found' });
    }
    await activity.destroy();
    res.json({
      success: true,
      message: 'Activity record deleted',
    });
  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Bulk upload departmental activities
// @route   POST /api/departmental-activities/bulk
// @access  Private
exports.bulkUploadActivities = async (req, res) => {
  try {
    const { activities: activityList } = req.body;
    if (!Array.isArray(activityList) || activityList.length === 0) {
      return res.status(400).json({ success: false, message: 'No activity records provided' });
    }

    const created = [];
    const errors = [];

    for (let i = 0; i < activityList.length; i++) {
      try {
        const item = { ...activityList[i] };
        ['academicYear', 'campus', 'school', 'department', 'activityCategory', 'title', 'reportDetails', 'pendingNotes', 'resourcePersons'].forEach(field => {
          if (item[field] === undefined || item[field] === null || item[field] === '' || String(item[field]).trim() === '') {
            item[field] = 'NIL';
          }
        });
        const record = await DepartmentalActivity.create(item);
        created.push(record);
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `${created.length} activity record(s) uploaded successfully.${errors.length ? ` ${errors.length} error(s).` : ''}`,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// @desc    Clear all departmental activities
// @route   DELETE /api/departmental-activities/clear-all
// @access  Private
exports.clearAllActivities = async (req, res) => {
  try {
    const deletedCount = await DepartmentalActivity.destroy({ where: {} });
    res.json({
      success: true,
      message: `Cleared ${deletedCount} departmental activity records.`,
      count: deletedCount,
    });
  } catch (error) {
    console.error('Clear departmental activities error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};
