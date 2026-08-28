const { Campus, School, Department, Course, ProgramLevel } = require('../models');

// @desc    Get counts of all academic hierarchy levels
// @route   GET /api/hierarchy/stats
// @access  Private
exports.getHierarchyStats = async (req, res) => {
  try {
    const totalCampuses = await Campus.count({ where: { status: 'Active' } });
    const totalSchools = await School.count({ where: { status: 'Active' } });
    const totalDepartments = await Department.count({ where: { status: 'Active' } });
    const totalProgramLevels = await ProgramLevel.count({ where: { status: 'Active' } });
    const totalCourses = await Course.count({ where: { status: 'Active' } });

    // Program level breakdown counts
    const ugLevel = await ProgramLevel.findOne({ where: { code: 'UG' } });
    const pgLevel = await ProgramLevel.findOne({ where: { code: 'PG' } });
    const phdLevel = await ProgramLevel.findOne({ where: { code: 'PHD' } });

    const totalUGPrograms = ugLevel ? await Course.count({ where: { programLevelId: ugLevel.id, status: 'Active' } }) : 0;
    const totalPGPrograms = pgLevel ? await Course.count({ where: { programLevelId: pgLevel.id, status: 'Active' } }) : 0;
    const totalPhDPrograms = phdLevel ? await Course.count({ where: { programLevelId: phdLevel.id, status: 'Active' } }) : 0;

    res.json({
      success: true,
      data: {
        totalCampuses,
        totalSchools,
        totalDepartments,
        totalProgramLevels,
        totalCourses,
        totalUGPrograms,
        totalPGPrograms,
        totalPhDPrograms
      }
    });
  } catch (error) {
    console.error('Get hierarchy stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get the complete hierarchical tree (Campus -> School -> Department -> Course with ProgramLevel)
// @route   GET /api/hierarchy/tree
// @access  Private
exports.getHierarchyTree = async (req, res) => {
  try {
    const tree = await Campus.findAll({
      where: { status: 'Active' },
      order: [['name', 'ASC']],
      include: [
        {
          model: School,
          as: 'schools',
          where: { status: 'Active' },
          required: false,
          order: [['name', 'ASC']],
          include: [
            {
              model: Department,
              as: 'departments',
              where: { status: 'Active' },
              required: false,
              order: [['name', 'ASC']],
              include: [
                {
                  model: Course,
                  as: 'courses',
                  where: { status: 'Active' },
                  required: false,
                  include: [
                    {
                      model: ProgramLevel,
                      as: 'programLevel',
                      attributes: ['id', 'code', 'name']
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    });

    res.json({
      success: true,
      data: tree
    });
  } catch (error) {
    console.error('Get hierarchy tree error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};
