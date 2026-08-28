const { Faculty } = require('../models');

// @desc    Get all faculty
// @route   GET /api/faculty
// @access  Private
exports.getFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findAll({
      order: [['sNo', 'ASC'], ['createdAt', 'DESC']]
    });
    res.json({
      success: true,
      count: faculty.length,
      data: faculty
    });
  } catch (error) {
    console.error('Get faculty error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create faculty
// @route   POST /api/faculty
// @access  Private
exports.createFaculty = async (req, res) => {
  try {
    const maxSNoFaculty = await Faculty.findOne({
      order: [['sNo', 'DESC']]
    });
    const nextSNo = maxSNoFaculty && maxSNoFaculty.sNo ? maxSNoFaculty.sNo + 1 : 1;

    const record = {
      ...req.body,
      sNo: req.body.sNo || nextSNo
    };

    const faculty = await Faculty.create(record);
    res.status(201).json({
      success: true,
      data: faculty
    });
  } catch (error) {
    console.error('Create faculty error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Bulk create faculty from CSV upload
// @route   POST /api/faculty/bulk
// @access  Private (admin/coordinator)
exports.bulkCreateFaculty = async (req, res) => {
  try {
    const { faculty: facultyList } = req.body;
    if (!Array.isArray(facultyList) || facultyList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No faculty records provided'
      });
    }

    const maxSNoFaculty = await Faculty.findOne({
      order: [['sNo', 'DESC']]
    });
    let nextSNo = maxSNoFaculty && maxSNoFaculty.sNo ? maxSNoFaculty.sNo + 1 : 1;

    const errors = [];
    const created = [];

    for (let i = 0; i < facultyList.length; i++) {
      const record = { ...facultyList[i] };
      Object.keys(record).forEach(k => {
        if (k !== 'sNo' && (record[k] === undefined || record[k] === null || record[k] === '' || record[k] === 'N/A' || String(record[k]).trim() === '')) {
          record[k] = 'NIL';
        }
      });
      try {
        const existing = await Faculty.findOne({
          where: { employeeId: record.employeeId }
        });
        if (existing) {
          // If existing record has no sNo, assign it now
          if (existing.sNo === null || existing.sNo === undefined) {
            record.sNo = nextSNo++;
          } else {
            record.sNo = existing.sNo;
          }
          await existing.update(record);
          created.push(existing);
        } else {
          if (!record.sNo) {
            record.sNo = nextSNo++;
          }
          const fac = await Faculty.create(record);
          created.push(fac);
        }
      } catch (err) {
        errors.push(`Row ${i + 1} (${record.employeeId || 'unknown'}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `${created.length} faculty record(s) uploaded successfully.${errors.length ? ` ${errors.length} error(s) encountered.` : ''}`,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Bulk create faculty error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update faculty
// @route   PUT /api/faculty/:id
// @access  Private
exports.updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty record not found'
      });
    }
    await faculty.update(req.body);
    res.json({
      success: true,
      data: faculty
    });
  } catch (error) {
    console.error('Update faculty error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete faculty
// @route   DELETE /api/faculty/:id
// @access  Private
exports.deleteFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findByPk(req.params.id);
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty record not found'
      });
    }
    await faculty.destroy();
    res.json({
      success: true,
      message: 'Faculty record deleted'
    });
  } catch (error) {
    console.error('Delete faculty error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
