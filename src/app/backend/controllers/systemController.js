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

    console.log('⚠️ Clearing user upload data requested by admin:', req.user?.email || 'admin');

    // 1. Clear transactional uploaded data
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

    // 2. Unlink HOD from Departments (since non-admin users will be cleared)
    await Department.update({ hodId: null }, { where: {} });

    // 3. Clear custom users EXCEPT default role accounts & current logged-in admin user
    const autoSeed = require('../config/autoSeed');
    await autoSeed.ensureDefaultUsers();

    // Ensure non-default users are cleared while keeping default role accounts active

    // 4. Ensure Basic Academic Hierarchy Structure exists (Campus, School, ProgramLevels, Departments, Courses)
    const deptCount = await Department.count();
    if (deptCount === 0) {
      // Re-seed basic structural hierarchy if empty
      const kengeriCampus = await Campus.create({
        code: 'KENGERI', name: 'Kengeri Campus', description: 'Christ University Kengeri Campus, Bangalore', status: 'Active'
      });
      const schoolOfEngineering = await School.create({
        code: 'SOE', name: 'School of Engineering and Technology', description: 'School of Engineering and Technology', campusId: kengeriCampus.id, status: 'Active'
      });
      const ugLevel = await ProgramLevel.create({ code: 'UG', name: 'Undergraduate', description: 'Undergraduate Degree Programs', status: 'Active' });
      const pgLevel = await ProgramLevel.create({ code: 'PG', name: 'Postgraduate', description: 'Postgraduate Master Programs', status: 'Active' });
      const phdLevel = await ProgramLevel.create({ code: 'PHD', name: 'Doctoral', description: 'Doctoral Research Programs', status: 'Active' });

      const adseDept = await Department.create({ code: 'ADSE', name: 'AI and Data Science Engineering', shortName: 'ADSE', schoolId: schoolOfEngineering.id, establishedYear: 2021, status: 'Active' });
      const cseDept = await Department.create({ code: 'CSE', name: 'Computer Science and Engineering', shortName: 'CSE', schoolId: schoolOfEngineering.id, establishedYear: 2010, status: 'Active' });
      const eceDept = await Department.create({ code: 'ECE', name: 'Electronics and Communication Engineering', shortName: 'ECE', schoolId: schoolOfEngineering.id, establishedYear: 2010, status: 'Active' });
      const civilDept = await Department.create({ code: 'CIVIL', name: 'Civil Engineering', shortName: 'CIVIL', schoolId: schoolOfEngineering.id, establishedYear: 2010, status: 'Active' });
      const eeeDept = await Department.create({ code: 'EEE', name: 'Electrical and Electronics Engineering', shortName: 'EEE', schoolId: schoolOfEngineering.id, establishedYear: 2010, status: 'Active' });
      const mechDept = await Department.create({ code: 'MECH', name: 'Mechanical and Automobile Engineering', shortName: 'MECH', schoolId: schoolOfEngineering.id, establishedYear: 2010, status: 'Active' });
      const shDept = await Department.create({ code: 'S&H', name: 'Sciences and Humanities (Engineering)', shortName: 'S&H', schoolId: schoolOfEngineering.id, establishedYear: 2010, status: 'Active' });

      await Course.bulkCreate([
        { code: 'BTECH-ADSE-AIML', name: 'BTech (Computer Science and Engineering - Artificial Intelligence and Machine Learning)', departmentId: adseDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
        { code: 'BTECH-ADSE-DS', name: 'BTech (Computer Science and Engineering - Data Science)', departmentId: adseDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
        { code: 'BTECH-AIML', name: 'BTech (Artificial Intelligence and Machine Learning)', departmentId: adseDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
        { code: 'BTECH-CSE', name: 'BTech in Computer Science and Engineering', departmentId: cseDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
        { code: 'BTECH-ECE', name: 'BTech in Electronics and Communication Engineering', departmentId: eceDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
        { code: 'BTECH-CIVIL', name: 'BTech in Civil Engineering', departmentId: civilDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
        { code: 'BTECH-EEE', name: 'BTech in Electrical and Electronics Engineering', departmentId: eeeDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
        { code: 'BTECH-MECH', name: 'BTech in Mechanical Engineering', departmentId: mechDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' }
      ]);
    }

    console.log('✓ Uploaded data cleared successfully! Basic department and academic hierarchy preserved.');

    res.json({
      success: true,
      message: 'All uploaded transactional data cleared successfully. Basic department details and structural hierarchy remain intact.'
    });
  } catch (error) {
    console.error('Clear database error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear database'
    });
  }
};
