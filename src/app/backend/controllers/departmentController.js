const { Department } = require('../models');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['establishedYear', 'ASC'], ['code', 'ASC']]
    });
    res.json({
      success: true,
      count: departments.length,
      data: departments
    });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Private
exports.createDepartment = async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private
exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }
    await department.update(req.body);
    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private
exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }
    await department.destroy();
    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Bulk create departments from CSV upload
// @route   POST /api/departments/bulk
// @access  Private (admin/coordinator)
exports.bulkCreateDepartment = async (req, res) => {
  try {
    const { departments: departmentList } = req.body;
    if (!Array.isArray(departmentList) || departmentList.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No department records provided'
      });
    }

    const errors = [];
    const created = [];

    for (let i = 0; i < departmentList.length; i++) {
      const record = departmentList[i];
      try {
        const existing = await Department.findOne({
          where: { code: record.code }
        });
        if (existing) {
          await existing.update(record);
          created.push(existing);
        } else {
          const dept = await Department.create(record);
          created.push(dept);
        }
      } catch (err) {
        errors.push(`Row ${i + 1} (${record.code || 'unknown'}): ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: `${created.length} department record(s) uploaded successfully.${errors.length ? ` ${errors.length} error(s) encountered.` : ''}`,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Bulk create departments error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};
