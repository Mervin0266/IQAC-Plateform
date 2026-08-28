const { Department, School, Campus, Course, ProgramLevel, User } = require('../models');

// @desc    Get all departments (optionally filtered by schoolId)
// @route   GET /api/departments
// @access  Private
exports.getDepartments = async (req, res) => {
  try {
    const where = {};
    if (req.query.schoolId) {
      where.schoolId = req.query.schoolId;
    }

    const departments = await Department.findAll({
      where,
      order: [['establishedYear', 'ASC'], ['code', 'ASC']],
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'code', 'name'],
          include: [
            {
              model: Campus,
              as: 'campus',
              attributes: ['id', 'code', 'name']
            }
          ]
        },
        {
          model: User,
          as: 'hod',
          attributes: ['id', 'name', 'email']
        }
      ]
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

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private
exports.getDepartment = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id, {
      include: [
        {
          model: School,
          as: 'school',
          attributes: ['id', 'code', 'name'],
          include: [
            {
              model: Campus,
              as: 'campus',
              attributes: ['id', 'code', 'name']
            }
          ]
        },
        {
          model: User,
          as: 'hod',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Course,
          as: 'courses',
          where: { status: 'Active' },
          required: false,
          attributes: ['id', 'code', 'name', 'duration', 'programLevelId'],
          include: [
            {
              model: ProgramLevel,
              as: 'programLevel',
              attributes: ['id', 'code', 'name']
            }
          ]
        }
      ]
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get courses for a department (optionally filtered by programLevelId)
// @route   GET /api/departments/:id/courses
// @access  Private
exports.getDepartmentCourses = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const where = { departmentId: req.params.id, status: 'Active' };
    if (req.query.programLevelId) {
      where.programLevelId = req.query.programLevelId;
    }

    const courses = await Course.findAll({
      where,
      order: [['name', 'ASC']],
      include: [
        {
          model: ProgramLevel,
          as: 'programLevel',
          attributes: ['id', 'code', 'name']
        }
      ]
    });

    res.json({
      success: true,
      count: courses.length,
      data: courses
    });
  } catch (error) {
    console.error('Get department courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get program levels available for a specific department
// @route   GET /api/departments/:id/program-levels
// @access  Private
exports.getDepartmentProgramLevels = async (req, res) => {
  try {
    const department = await Department.findByPk(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const courses = await Course.findAll({
      where: { departmentId: req.params.id, status: 'Active' },
      include: [
        {
          model: ProgramLevel,
          as: 'programLevel',
          attributes: ['id', 'code', 'name', 'description']
        }
      ]
    });

    const levelMap = new Map();
    courses.forEach((c) => {
      if (c.programLevel && !levelMap.has(c.programLevel.id)) {
        levelMap.set(c.programLevel.id, c.programLevel);
      }
    });

    const programLevels = Array.from(levelMap.values());

    res.json({
      success: true,
      count: programLevels.length,
      data: programLevels
    });
  } catch (error) {
    console.error('Get department program levels error:', error);
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
    // Validate school exists if provided
    if (req.body.schoolId) {
      const school = await School.findByPk(req.body.schoolId);
      if (!school) {
        return res.status(400).json({
          success: false,
          message: 'Invalid schoolId — school not found'
        });
      }
    }
    // Validate HOD exists if provided
    if (req.body.hodId) {
      const hod = await User.findByPk(req.body.hodId);
      if (!hod) {
        return res.status(400).json({
          success: false,
          message: 'Invalid hodId — user not found'
        });
      }
    }

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

    // Validate school exists if provided
    if (req.body.schoolId) {
      const school = await School.findByPk(req.body.schoolId);
      if (!school) {
        return res.status(400).json({
          success: false,
          message: 'Invalid schoolId — school not found'
        });
      }
    }
    // Validate HOD exists if provided
    if (req.body.hodId) {
      const hod = await User.findByPk(req.body.hodId);
      if (!hod) {
        return res.status(400).json({
          success: false,
          message: 'Invalid hodId — user not found'
        });
      }
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
        // Resolve school if schoolCode is provided
        if (record.schoolCode && !record.schoolId) {
          const school = await School.findOne({ where: { code: record.schoolCode } });
          if (school) {
            record.schoolId = school.id;
          }
        }

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
