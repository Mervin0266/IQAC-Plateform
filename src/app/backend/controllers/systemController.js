const models = require('../models');
const { Op } = require('sequelize');

// @desc    Clear entire database data (all tables clean without initial data)
// @route   POST /api/system/clear-database
// @access  Private (Admin)
exports.clearDatabase = async (req, res) => {
  try {
    const {
      Student,
      Faculty,
      DepartmentalActivity,
      Achievement,
      Placement,
      ConsultancyProject,
      ResearchMetric,
      Patent,
      StrategicPlan,
      Document,
      EditRequest,
      AuditLog,
      Notification,
      UserDepartmentHistory,
      DepartmentLineage,
      ParameterDataSubmission,
      AccreditationParameter,
      AccreditationFramework,
      Course,
      Department,
      School,
      Campus,
      ProgramLevel,
      User
    } = models;

    console.log('⚠️ Clearing entire database requested by user:', req.user?.email || 'admin');

    // 1. Clear child / transactional records first
    await Student.destroy({ where: {}, truncate: false });
    await Faculty.destroy({ where: {}, truncate: false });
    await DepartmentalActivity.destroy({ where: {}, truncate: false });
    await Achievement.destroy({ where: {}, truncate: false });
    await Placement.destroy({ where: {}, truncate: false });
    await ConsultancyProject.destroy({ where: {}, truncate: false });
    await ResearchMetric.destroy({ where: {}, truncate: false });
    await Patent.destroy({ where: {}, truncate: false });
    await StrategicPlan.destroy({ where: {}, truncate: false });
    await EditRequest.destroy({ where: {}, truncate: false });
    await AuditLog.destroy({ where: {}, truncate: false });
    await Notification.destroy({ where: {}, truncate: false });
    await UserDepartmentHistory.destroy({ where: {}, truncate: false });
    await DepartmentLineage.destroy({ where: {}, truncate: false });
    await ParameterDataSubmission.destroy({ where: {}, truncate: false });
    await AccreditationParameter.destroy({ where: {}, truncate: false });
    await AccreditationFramework.destroy({ where: {}, truncate: false });
    await Document.destroy({ where: {}, truncate: false });

    // 2. Clear academic hierarchy
    await Course.destroy({ where: {}, truncate: false });
    await Department.destroy({ where: {}, truncate: false });
    await School.destroy({ where: {}, truncate: false });
    await Campus.destroy({ where: {}, truncate: false });
    await ProgramLevel.destroy({ where: {}, truncate: false });

    // 3. Clear all users EXCEPT the currently logged in admin user
    if (req.user && req.user.id) {
      await User.destroy({
        where: {
          id: { [Op.ne]: req.user.id }
        }
      });
    } else {
      const admin = await User.findOne({ where: { role: 'admin' } });
      if (admin) {
        await User.destroy({
          where: {
            id: { [Op.ne]: admin.id }
          }
        });
      }
    }

    console.log('✓ Database cleared successfully! Website is now 100% clean without initial data.');

    res.json({
      success: true,
      message: 'Entire database cleared successfully. The website is now clean without any initial data.'
    });
  } catch (error) {
    console.error('Clear database error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear database'
    });
  }
};
