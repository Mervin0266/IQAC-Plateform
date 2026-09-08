const { User, Achievement, ResearchMetric, Campus, School, Department, ProgramLevel, Course, Student, DepartmentalActivity, Publication, Patent, SponsoredProject } = require('../models');

const autoSeed = async (sequelize) => {
  try {
    // 0. Pre-sync migrations to fix any legacy PostgreSQL enum or constraint issues
    try {
      await sequelize.query('ALTER TABLE "research_metrics" ALTER COLUMN "periodType" TYPE VARCHAR(50) USING "periodType"::VARCHAR;');
      await sequelize.query("UPDATE \"research_metrics\" SET \"periodType\" = 'academic_year' WHERE \"periodType\" = 'yearly';");
      await sequelize.query("UPDATE \"research_metrics\" SET \"periodType\" = 'month' WHERE \"periodType\" = 'monthly';");
      await sequelize.query('DROP TYPE IF EXISTS "enum_research_metrics_periodType" CASCADE;');
    } catch (e) {
      // Ignore if table does not exist yet
    }

    try {
      await sequelize.query(`
        ALTER TABLE "patents" ALTER COLUMN "inventors" TYPE TEXT USING CASE 
          WHEN pg_typeof("inventors")::text = 'text[]' OR pg_typeof("inventors")::text = 'character varying[]'
          THEN array_to_string("inventors", ', ')
          ELSE "inventors"::text
        END;
      `);
    } catch (e) {
      // Ignore if table does not exist yet
    }

    try {
      await sequelize.query('ALTER TABLE "patents" ALTER COLUMN "approvalStatus" TYPE VARCHAR(50) USING "approvalStatus"::VARCHAR;');
      await sequelize.query('DROP TYPE IF EXISTS "enum_patents_approvalStatus" CASCADE;');
    } catch (e) {
      // Ignore if table does not exist yet
    }

    try {
      await sequelize.query('ALTER TABLE "publications" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::VARCHAR;');
      await sequelize.query('DROP TYPE IF EXISTS "enum_publications_status" CASCADE;');
    } catch (e) {
      // Ignore if table does not exist yet
    }

    // Sync the database schema (create tables and add missing columns if they don't exist)
    await sequelize.sync({ force: false, alter: { drop: false } });
    console.log('✓ Database schema synchronized');

    // Drop legacy unique constraint on students(registerNumber) if present in DB
    try {
      await sequelize.query('ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_registerNumber_key" CASCADE;');
      await sequelize.query('ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_register_number_key" CASCADE;');
      await sequelize.query('DROP INDEX IF EXISTS "students_register_number_key";');
      await sequelize.query('DROP INDEX IF EXISTS "students_registerNumber_key";');
    } catch (e) {
      // Ignore if table/constraint not present
    }

    // Ensure research_metrics periodType is VARCHAR(50) and normalize legacy enum values
    try {
      await sequelize.query('ALTER TABLE "research_metrics" ALTER COLUMN "periodType" TYPE VARCHAR(50) USING "periodType"::VARCHAR;');
      await sequelize.query("UPDATE \"research_metrics\" SET \"periodType\" = 'academic_year' WHERE \"periodType\" = 'yearly';");
      await sequelize.query("UPDATE \"research_metrics\" SET \"periodType\" = 'month' WHERE \"periodType\" = 'monthly';");
      await sequelize.query('DROP TYPE IF EXISTS "enum_research_metrics_periodType" CASCADE;');
      await sequelize.query('ALTER TABLE "patents" ALTER COLUMN "approvalStatus" TYPE VARCHAR(50) USING "approvalStatus"::VARCHAR;');
      await sequelize.query('ALTER TABLE "publications" ALTER COLUMN "status" TYPE VARCHAR(50) USING "status"::VARCHAR;');
    } catch (e) {
      // Ignore if table not present
    }

    // Ensure default system login accounts always exist
    await ensureDefaultUsers();

    // Ensure initial publications exist if table is empty
    await ensureInitialPublications();

    // Ensure initial patents exist if table is empty
    await ensureInitialPatents();

    // Ensure initial sponsored projects exist if table is empty
    await ensureInitialSponsoredProjects();

    // Check if basic academic hierarchy (Departments) already exists in the database
    const deptCount = await Department.count();
    if (deptCount > 0) {
      console.log('✓ Database contains academic hierarchy and default users.');
      return;
    }

    console.log('Departments table is empty. Starting automatic database seeding...');

    // 1. Create Campus
    const kengeriCampus = await Campus.create({
      code: 'KENGERI',
      name: 'Kengeri Campus',
      description: 'Christ University Kengeri Campus, Bangalore',
      status: 'Active'
    });
    console.log('✓ Kengeri Campus seeded');

    // 2. Create School
    const schoolOfEngineering = await School.create({
      code: 'SOE',
      name: 'School of Engineering and Technology',
      description: 'School of Engineering and Technology',
      campusId: kengeriCampus.id,
      status: 'Active'
    });
    console.log('✓ School of Engineering and Technology seeded');

    // 3. Create Program Levels
    const ugLevel = await ProgramLevel.create({
      code: 'UG',
      name: 'Undergraduate',
      description: 'Undergraduate Degree Programs',
      status: 'Active'
    });

    const pgLevel = await ProgramLevel.create({
      code: 'PG',
      name: 'Postgraduate',
      description: 'Postgraduate Master Programs',
      status: 'Active'
    });

    const phdLevel = await ProgramLevel.create({
      code: 'PHD',
      name: 'Doctoral',
      description: 'Doctoral Research Programs',
      status: 'Active'
    });
    console.log('✓ 3 Program Levels seeded (UG, PG, PHD)');

    // 4. Create Departments
    const adseDept = await Department.create({
      code: 'ADSE',
      name: 'AI and Data Science Engineering',
      shortName: 'ADSE',
      schoolId: schoolOfEngineering.id,
      establishedYear: 2021,
      status: 'Active',
      description: 'Department of AI and Data Science Engineering'
    });

    const cseDept = await Department.create({
      code: 'CSE',
      name: 'Computer Science and Engineering',
      shortName: 'CSE',
      schoolId: schoolOfEngineering.id,
      establishedYear: 2010,
      status: 'Active',
      description: 'Department of Computer Science and Engineering'
    });

    const eceDept = await Department.create({
      code: 'ECE',
      name: 'Electronics and Communication Engineering',
      shortName: 'ECE',
      schoolId: schoolOfEngineering.id,
      establishedYear: 2010,
      status: 'Active',
      description: 'Department of Electronics and Communication Engineering'
    });

    const civilDept = await Department.create({
      code: 'CIVIL',
      name: 'Civil Engineering',
      shortName: 'CIVIL',
      schoolId: schoolOfEngineering.id,
      establishedYear: 2010,
      status: 'Active',
      description: 'Department of Civil Engineering'
    });

    const eeeDept = await Department.create({
      code: 'EEE',
      name: 'Electrical and Electronics Engineering',
      shortName: 'EEE',
      schoolId: schoolOfEngineering.id,
      establishedYear: 2010,
      status: 'Active',
      description: 'Department of Electrical and Electronics Engineering'
    });

    const mechDept = await Department.create({
      code: 'MECH',
      name: 'Mechanical and Automobile Engineering',
      shortName: 'MECH',
      schoolId: schoolOfEngineering.id,
      establishedYear: 2010,
      status: 'Active',
      description: 'Department of Mechanical and Automobile Engineering'
    });

    const soaDept = await Department.create({
      code: 'SOA',
      name: 'School of Architecture',
      shortName: 'SOA',
      schoolId: schoolOfEngineering.id,
      establishedYear: 2017,
      status: 'Active',
      description: 'Department / School of Architecture'
    });

    const shDept = await Department.create({
      code: 'S&H',
      name: 'Sciences and Humanities (Engineering)',
      shortName: 'S&H',
      schoolId: schoolOfEngineering.id,
      establishedYear: 2010,
      status: 'Active',
      description: 'Department of Sciences and Humanities (Engineering)'
    });
    console.log('✓ 8 Departments seeded');

    // 5. Create Courses / Programs
    await Course.bulkCreate([
      // 7.1 AI and Data Science Engineering
      { code: 'BTECH-ADSE-AIML', name: 'BTech (Computer Science and Engineering - Artificial Intelligence and Machine Learning)', departmentId: adseDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
      { code: 'BTECH-ADSE-DS', name: 'BTech (Computer Science and Engineering - Data Science)', departmentId: adseDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
      { code: 'BTECH-AIML', name: 'BTech (Artificial Intelligence and Machine Learning)', departmentId: adseDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
      { code: 'BTECH-ADSE-AIML-LE', name: 'BTech (CSE - AI & ML) - Lateral Entry', departmentId: adseDept.id, programLevelId: ugLevel.id, duration: '3 Years', status: 'Active' },
      { code: 'BTECH-ADSE-DS-LE', name: 'BTech (CSE - Data Science) - Lateral Entry', departmentId: adseDept.id, programLevelId: ugLevel.id, duration: '3 Years', status: 'Active' },
      { code: 'MTECH-DS', name: 'MTech (Data Science)', departmentId: adseDept.id, programLevelId: pgLevel.id, duration: '2 Years', status: 'Active' },
      { code: 'PHD-ADSE', name: 'PhD in AI and Data Science Engineering', departmentId: adseDept.id, programLevelId: phdLevel.id, duration: '3-5 Years', status: 'Active' },

      // 7.2 Computer Science and Engineering
      { code: 'BTECH-CSE', name: 'BTech in Computer Science and Engineering', departmentId: cseDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
      { code: 'BTECH-CSE-LE', name: 'BTech (Computer Science and Engineering) - Lateral Entry', departmentId: cseDept.id, programLevelId: ugLevel.id, duration: '3 Years', status: 'Active' },
      { code: 'MTECH-CSE', name: 'MTech in Computer Science and Engineering', departmentId: cseDept.id, programLevelId: pgLevel.id, duration: '2 Years', status: 'Active' },
      { code: 'PHD-CSE', name: 'PhD in Computer Science and Engineering', departmentId: cseDept.id, programLevelId: phdLevel.id, duration: '3-5 Years', status: 'Active' },

      // 7.3 Electronics and Communication Engineering
      { code: 'BTECH-ECE', name: 'BTech in Electronics and Communication Engineering', departmentId: eceDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
      { code: 'BTECH-ECE-LE', name: 'BTech (ECE) - Lateral Entry', departmentId: eceDept.id, programLevelId: ugLevel.id, duration: '3 Years', status: 'Active' },
      { code: 'MTECH-ECE-VLSI', name: 'MTech in Electronics and Communication Engineering (VLSI and Embedded Systems)', departmentId: eceDept.id, programLevelId: pgLevel.id, duration: '2 Years', status: 'Active' },
      { code: 'PHD-ECE', name: 'PhD in Electronics and Communication Engineering', departmentId: eceDept.id, programLevelId: phdLevel.id, duration: '3-5 Years', status: 'Active' },

      // 7.4 Civil Engineering
      { code: 'BTECH-CIVIL', name: 'BTech in Civil Engineering', departmentId: civilDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
      { code: 'BTECH-CIVIL-LE', name: 'BTech (Civil Engineering) - Lateral Entry', departmentId: civilDept.id, programLevelId: ugLevel.id, duration: '3 Years', status: 'Active' },
      { code: 'MTECH-CIVIL-SE', name: 'MTech in Structural Engineering', departmentId: civilDept.id, programLevelId: pgLevel.id, duration: '2 Years', status: 'Active' },
      { code: 'PHD-CIVIL', name: 'PhD in Civil Engineering', departmentId: civilDept.id, programLevelId: phdLevel.id, duration: '3-5 Years', status: 'Active' },

      // 7.5 Electrical and Electronics Engineering
      { code: 'BTECH-EEE', name: 'BTech in Electrical and Electronics Engineering', departmentId: eeeDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
      { code: 'BTECH-EEE-LE', name: 'BTech (EEE) - Lateral Entry', departmentId: eeeDept.id, programLevelId: ugLevel.id, duration: '3 Years', status: 'Active' },
      { code: 'MTECH-EEE-PS', name: 'MTech in Power Systems / Electrical Engineering', departmentId: eeeDept.id, programLevelId: pgLevel.id, duration: '2 Years', status: 'Active' },
      { code: 'PHD-EEE', name: 'PhD in Electrical and Electronics Engineering', departmentId: eeeDept.id, programLevelId: phdLevel.id, duration: '3-5 Years', status: 'Active' },

      // 7.6 Mechanical and Automobile Engineering
      { code: 'BTECH-MECH', name: 'BTech in Mechanical Engineering', departmentId: mechDept.id, programLevelId: ugLevel.id, duration: '4 Years', status: 'Active' },
      { code: 'BTECH-MECH-LE', name: 'BTech (Mechanical Engineering) - Lateral Entry', departmentId: mechDept.id, programLevelId: ugLevel.id, duration: '3 Years', status: 'Active' },
      { code: 'MTECH-MECH-AS', name: 'MTech in Mechanical Engineering (Automotive Systems)', departmentId: mechDept.id, programLevelId: pgLevel.id, duration: '2 Years', status: 'Active' },
      { code: 'PHD-MECH', name: 'PhD in Mechanical Engineering', departmentId: mechDept.id, programLevelId: phdLevel.id, duration: '3-5 Years', status: 'Active' },

      // 7.7 School of Architecture
      { code: 'BARCH', name: 'Bachelor of Architecture (B.Arch)', departmentId: soaDept.id, programLevelId: ugLevel.id, duration: '5 Years', status: 'Active' },
      { code: 'MARCH-URBAN', name: 'Master of Architecture (M.Arch - Urban Design)', departmentId: soaDept.id, programLevelId: pgLevel.id, duration: '2 Years', status: 'Active' },
      { code: 'PHD-ARCH', name: 'PhD in Architecture and Sustainable Built Environment', departmentId: soaDept.id, programLevelId: phdLevel.id, duration: '3-5 Years', status: 'Active' },

      // 7.8 Sciences and Humanities (Engineering)
      { code: 'PHD-SH', name: 'PhD in Mathematics / Physics / Chemistry (Engineering streams)', departmentId: shDept.id, programLevelId: phdLevel.id, duration: '3-5 Years', status: 'Active' }
    ]);
    console.log('✓ All courses/programs seeded with proper program levels');

    // Create default admin user
    const adminUser = await User.create({
      name: 'System Administrator',
      email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@christuniversity.in',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123',
      role: 'admin',
      department: 'Administration',
      employeeId: 'ADMIN001',
      phone: '+91-9876543210'
    });
    console.log('✓ Default admin user created');

    // Create default authority user
    const authorityUser = await User.create({
      name: 'Dr. Jane Doe (Dean)',
      email: 'dean@christuniversity.in',
      password: 'Authority@123',
      role: 'authority',
      department: 'Deans Office',
      employeeId: 'DEAN001',
      phone: '+91-9876543220'
    });
    console.log('✓ Default authority user created');

    // Create sample users (HOD, Coordinator, Faculty)
    const seededUsers = await User.bulkCreate([
      {
        name: 'Dr. Rajesh Kumar (HOD)',
        email: 'hod.cse@christuniversity.in',
        password: 'Hod@123',
        role: 'hod',
        department: 'Computer Science and Engineering',
        employeeId: 'HOD001',
        phone: '+91-9876543211'
      },
      {
        name: 'Dr. Suresh Menon (Coordinator)',
        email: 'coord.cse@christuniversity.in',
        password: 'Coordinator@123',
        role: 'coordinator',
        department: 'Computer Science and Engineering',
        employeeId: 'COORD001',
        phone: '+91-9876543213'
      },
      {
        name: 'Dr. Priya Sharma (Faculty)',
        email: 'faculty.cse@christuniversity.in',
        password: 'Faculty@123',
        role: 'faculty',
        department: 'Computer Science and Engineering',
        employeeId: 'FAC001',
        phone: '+91-9876543212'
      }
    ], { individualHooks: true });
    console.log('✓ Sample departmental users created');

    // Associate HOD to Department
    const hodUser = seededUsers.find(u => u.role === 'hod');
    if (hodUser) {
      await cseDept.update({ hodId: hodUser.id, hodName: hodUser.name, hodEmail: hodUser.email });
      console.log('✓ HOD associated with CSE Department');
    }


    // Create sample achievements
    await Achievement.bulkCreate([
      {
        title: 'NIRF Ranking 2024 - Band 101-150',
        description: 'Christ University secured position in Band 101-150 in NIRF Rankings 2024',
        category: 'rankings',
        subcategory: 'NIRF',
        date: '2024-06-11',
        year: '2024',
        rank: 'Band 101-150',
        score: 54.23,
        organization: 'NIRF',
        impact: 'National Recognition',
        status: 'finalized',
        createdBy: adminUser.id
      },
      {
        title: 'NAAC A++ Accreditation',
        description: 'Christ University awarded NAAC A++ accreditation with CGPA 3.65',
        category: 'accreditations',
        subcategory: 'NAAC',
        date: '2023-12-15',
        year: '2023',
        score: 3.65,
        organization: 'NAAC',
        impact: 'Institutional Excellence',
        status: 'finalized',
        createdBy: adminUser.id
      },
      {
        title: 'Best Research Paper Award - IEEE Conference',
        description: 'Research paper on AI in Healthcare won best paper award',
        category: 'research',
        department: 'Computer Science and Engineering',
        date: '2024-03-20',
        year: '2024',
        organization: 'IEEE',
        participants: 'Dr. Rajesh Kumar, Dr. Priya Sharma',
        impact: 'International Recognition',
        status: 'finalized',
        createdBy: seededUsers[2].id
      }
    ]);
    console.log('✓ Sample achievements created');

    // Create pre-seeded Research Metrics
    await ResearchMetric.bulkCreate([
      // AY 2024-2025 (Yearly breakdown from Screenshot 1)
      {
        academicYear: '2024-2025',
        periodType: 'academic_year',
        periodValue: 'AY 2024-25',
        department: 'Civil Engineering',
        books: 0, chapters: 1, scopusJournals: 13, nationalJournals: 0, internationalJournals: 14, citations: 127,
        patentsIndian: 1, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 8,
        consultancyCount: 1, consultancyAmount: 10000.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'academic_year',
        periodValue: 'AY 2024-25',
        department: 'Computer Science and Engineering',
        books: 6, chapters: 71, scopusJournals: 77, nationalJournals: 0, internationalJournals: 77, citations: 70,
        patentsIndian: 7, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 106,
        consultancyCount: 4, consultancyAmount: 1560408.00, seedMoneyCount: 10, seedMoneyAmount: 1624168.00, externalProjectsCount: 6, externalProjectsAmount: 4411660.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'academic_year',
        periodValue: 'AY 2024-25',
        department: 'Electronics and Communication Engineering',
        books: 3, chapters: 9, scopusJournals: 16, nationalJournals: 0, internationalJournals: 16, citations: 35,
        patentsIndian: 9, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 44,
        consultancyCount: 29, consultancyAmount: 793140.00, seedMoneyCount: 9, seedMoneyAmount: 1792510.00, externalProjectsCount: 4, externalProjectsAmount: 2313431.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'academic_year',
        periodValue: 'AY 2024-25',
        department: 'Electrical and Electronics Engineering',
        books: 1, chapters: 1, scopusJournals: 15, nationalJournals: 2, internationalJournals: 15, citations: 207,
        patentsIndian: 4, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 11,
        consultancyCount: 1, consultancyAmount: 600000.00, seedMoneyCount: 3, seedMoneyAmount: 839000.00, externalProjectsCount: 2, externalProjectsAmount: 6135000.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'academic_year',
        periodValue: 'AY 2024-25',
        department: 'Mechanical Engineering',
        books: 7, chapters: 3, scopusJournals: 26, nationalJournals: 2, internationalJournals: 26, citations: 36,
        patentsIndian: 22, patentsInternational: 0, conferencesNational: 3, conferencesInternational: 24,
        consultancyCount: 7, consultancyAmount: 103000.00, seedMoneyCount: 8, seedMoneyAmount: 2308000.00, externalProjectsCount: 3, externalProjectsAmount: 3200000.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'academic_year',
        periodValue: 'AY 2024-25',
        department: 'Sciences and Humanities',
        books: 3, chapters: 9, scopusJournals: 47, nationalJournals: 0, internationalJournals: 47, citations: 94,
        patentsIndian: 4, patentsInternational: 0, conferencesNational: 2, conferencesInternational: 15,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 2, seedMoneyAmount: 600000.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'academic_year',
        periodValue: 'AY 2024-25',
        department: 'School of Architecture',
        books: 0, chapters: 7, scopusJournals: 2, nationalJournals: 0, internationalJournals: 5, citations: 7,
        patentsIndian: 15, patentsInternational: 0, conferencesNational: 10, conferencesInternational: 20,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 2, externalProjectsAmount: 4996500.00
      },

      // AY 2025-2026 Monthly Breakdown for AIML & Data Science (from Screenshot 2)
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'June - 2025',
        department: 'AIML & Data Science',
        books: 1, chapters: 11, scopusJournals: 2, nationalJournals: 0, internationalJournals: 2, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'July - 2025',
        department: 'AIML & Data Science',
        books: 3, chapters: 5, scopusJournals: 2, nationalJournals: 0, internationalJournals: 2, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 2,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'August - 2025',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'September - 2025',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'October - 2025',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'November - 2025',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'December - 2025',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'January - 2026',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'February - 2026',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'March - 2026',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'April - 2026',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'month',
        periodValue: 'May - 2026',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      }
    ]);
    console.log('✓ Pre-seeded research summary metrics created');

    // 7. Create Sample Students
    await Student.bulkCreate([
      {
        registerNumber: '2460301',
        name: 'Aarav Sharma',
        email: 'aarav.sharma@students.christuniversity.in',
        phone: '+91 9876543201',
        campus: 'Kengeri Campus',
        school: 'School of Engineering and Technology',
        department: 'Computer Science and Engineering',
        programLevel: 'UG',
        course: 'BTech in Computer Science and Engineering',
        academicYear: '2024-2025',
        batch: '2024-2028',
        gender: 'Male',
        status: 'Active',
        bloodGroup: 'O+',
        admissionDate: '2024-07-15'
      },
      {
        registerNumber: '2460302',
        name: 'Ananya Rao',
        email: 'ananya.rao@students.christuniversity.in',
        phone: '+91 9876543202',
        campus: 'Kengeri Campus',
        school: 'School of Engineering and Technology',
        department: 'AI and Data Science Engineering',
        programLevel: 'UG',
        course: 'BTech (Artificial Intelligence and Machine Learning)',
        academicYear: '2024-2025',
        batch: '2024-2028',
        gender: 'Female',
        status: 'Active',
        bloodGroup: 'A+',
        admissionDate: '2024-07-15'
      },
      {
        registerNumber: '2460303',
        name: 'Rohan Verma',
        email: 'rohan.verma@students.christuniversity.in',
        phone: '+91 9876543203',
        campus: 'Kengeri Campus',
        school: 'School of Engineering and Technology',
        department: 'Electronics and Communication Engineering',
        programLevel: 'PG',
        course: 'MTech in Electronics and Communication Engineering (VLSI and Embedded Systems)',
        academicYear: '2024-2025',
        batch: '2024-2026',
        gender: 'Male',
        status: 'Active',
        bloodGroup: 'B+',
        admissionDate: '2024-07-20'
      },
      {
        registerNumber: '2560301',
        name: 'Diya Patel',
        email: 'diya.patel@students.christuniversity.in',
        phone: '+91 9876543204',
        campus: 'Kengeri Campus',
        school: 'School of Engineering and Technology',
        department: 'Civil Engineering',
        programLevel: 'PhD',
        course: 'PhD in Civil Engineering',
        academicYear: '2025-2026',
        batch: '2025-2029',
        gender: 'Female',
        status: 'Active',
        bloodGroup: 'AB+',
        admissionDate: '2025-07-10'
      },
      {
        registerNumber: '2560302',
        name: 'Karthik N',
        email: 'karthik.n@students.christuniversity.in',
        phone: '+91 9876543205',
        campus: 'Kengeri Campus',
        school: 'School of Engineering and Technology',
        department: 'Electrical and Electronics Engineering',
        programLevel: 'UG',
        course: 'BTech in Electrical and Electronics Engineering',
        academicYear: '2025-2026',
        batch: '2025-2029',
        gender: 'Male',
        status: 'Active',
        bloodGroup: 'O-',
        admissionDate: '2025-07-12'
      }
    ]);
    // 9. Departmental Activities start empty
    console.log('✓ Departmental activities initialized (empty)');

    console.log('✓ Automatic database seeding completed successfully!');
  } catch (error) {
    console.error('✗ Automatic database seeding failed:', error);
  }
};

const ensureDefaultUsers = async () => {
  try {
    const defaultAccounts = [
      {
        name: 'System Administrator',
        email: process.env.DEFAULT_ADMIN_EMAIL || 'admin@christuniversity.in',
        password: process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123',
        role: 'admin',
        department: 'Administration',
        employeeId: 'ADMIN001',
        phone: '+91-9876543210',
        isActive: true
      },
      {
        name: 'Dr. Jane Doe (Dean)',
        email: 'dean@christuniversity.in',
        password: 'Authority@123',
        role: 'authority',
        department: 'Deans Office',
        employeeId: 'DEAN001',
        phone: '+91-9876543220',
        isActive: true
      },
      {
        name: 'Dr. Rajesh Kumar (HOD)',
        email: 'hod.cse@christuniversity.in',
        password: 'Hod@123',
        role: 'hod',
        department: 'Computer Science and Engineering',
        employeeId: 'HOD001',
        phone: '+91-9876543211',
        isActive: true
      },
      {
        name: 'Dr. Suresh Menon (Coordinator)',
        email: 'coord.cse@christuniversity.in',
        password: 'Coordinator@123',
        role: 'coordinator',
        department: 'Computer Science and Engineering',
        employeeId: 'COORD001',
        phone: '+91-9876543213',
        isActive: true
      },
      {
        name: 'Dr. Priya Sharma (Faculty)',
        email: 'faculty.cse@christuniversity.in',
        password: 'Faculty@123',
        role: 'faculty',
        department: 'Computer Science and Engineering',
        employeeId: 'FAC001',
        phone: '+91-9876543212',
        isActive: true
      }
    ];

    for (const acc of defaultAccounts) {
      const existing = await User.findOne({ where: { email: acc.email } });
      if (!existing) {
        await User.create(acc);
        console.log(`✓ Default login account created: ${acc.email}`);
      } else if (!existing.isActive) {
        await existing.update({ isActive: true });
      }
    }
  } catch (err) {
    console.error('Error ensuring default users:', err.message);
  }
};

const ensureInitialPublications = async () => {
  try {
    const pubCount = await Publication.count();
    if (pubCount > 0) return;

    const adminUser = await User.findOne({ where: { role: 'admin' } });
    if (!adminUser) return;

    const samplePubs = [
      {
        authorName: 'Dr. Rajesh Kumar, Dr. Priya Sharma',
        title: 'Optimized Edge Computing Gateway for Precision Agricultural Sensor Networks',
        journalName: 'IEEE Internet of Things Journal',
        journalType: 'Scopus',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        publicationDate: '2024-03-15',
        doi: '10.1109/JIOT.2024.3378912',
        issn: '2327-4662',
        volume: '11',
        issue: '6',
        pageNumber: '9420-9432',
        impactFactor: 8.200,
        citationCount: 14,
        paperUrl: 'https://ieeexplore.ieee.org',
        abstract: 'This paper proposes an intelligent low-power edge gateway using adaptive compression algorithms for smart irrigation grids.',
        status: 'approved',
        createdBy: adminUser.id
      },
      {
        authorName: 'Dr. Deepa Singh, Dr. Suresh Menon',
        title: 'Thermal and Mechanical Characterization of Fly-Ash Based Geopolymer Concretes',
        journalName: 'Construction and Building Materials (Elsevier)',
        journalType: 'WoS (Web of Science)',
        department: 'Civil Engineering',
        academicYear: '2024-2025',
        publicationDate: '2024-01-20',
        doi: '10.1016/j.conbuildmat.2024.135241',
        issn: '0950-0618',
        volume: '412',
        issue: '1',
        pageNumber: '135-148',
        impactFactor: 7.400,
        citationCount: 9,
        paperUrl: 'https://sciencedirect.com',
        abstract: 'An experimental study evaluating compressive durability and microstructural properties of geopolymer matrices.',
        status: 'approved',
        createdBy: adminUser.id
      },
      {
        authorName: 'Dr. Anand V, Dr. Priya Sharma',
        title: 'Deep Transfer Learning Architecture for Automated Brain Tumor Segmentation in MRI',
        journalName: 'Springer Journal of Ambient Intelligence and Humanized Computing',
        journalType: 'Scopus',
        department: 'AI and Data Science Engineering',
        academicYear: '2023-2024',
        publicationDate: '2023-11-10',
        doi: '10.1007/s12652-023-04612-9',
        issn: '1868-5137',
        volume: '14',
        issue: '11',
        pageNumber: '15201-15214',
        impactFactor: 3.800,
        citationCount: 22,
        paperUrl: 'https://link.springer.com',
        abstract: 'A dual-pathway convolutional neural network with attention mechanisms for multi-sequence MRI image segmentation.',
        status: 'approved',
        createdBy: adminUser.id
      },
      {
        authorName: 'Dr. Karthik N, Dr. Rajesh Kumar',
        title: 'Adaptive Frequency Regulation in Microgrids with High Renewable Penetration',
        journalName: 'IET Generation, Transmission & Distribution',
        journalType: 'WoS (Web of Science)',
        department: 'Electrical and Electronics Engineering',
        academicYear: '2023-2024',
        publicationDate: '2023-08-05',
        doi: '10.1049/gtd2.12890',
        issn: '1751-8687',
        volume: '17',
        issue: '15',
        pageNumber: '3410-3424',
        impactFactor: 2.800,
        citationCount: 6,
        paperUrl: 'https://ietresearch.onlinelibrary.wiley.com',
        abstract: 'Design and hardware-in-the-loop validation of a robust predictive controller for islanded microgrid stability.',
        status: 'approved',
        createdBy: adminUser.id
      }
    ];

    await Publication.bulkCreate(samplePubs);
    console.log(`✓ Seeded ${samplePubs.length} initial research publications (Scopus & WoS)`);
  } catch (err) {
    console.error('Error seeding initial publications:', err.message);
  }
};

const ensureInitialPatents = async () => {
  try {
    const patentCount = await Patent.count();
    if (patentCount > 0) return;

    const adminUser = await User.findOne({ where: { role: 'admin' } });
    if (!adminUser) return;

    const samplePatents = [
      {
        title: 'IoT-Based Edge Computational Device for Real-Time Agricultural Water Level Sensing',
        inventors: 'Dr. Rajesh Kumar, Dr. Priya Sharma, Dr. Anand V',
        applicationNo: 'IN202441012345',
        patentNo: 'PAT-IN-489021',
        status: 'granted',
        patentType: 'National (Indian)',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        filedDate: '2023-04-12',
        publishedDate: '2023-10-15',
        grantedDate: '2024-05-20',
        licenseDate: '2024-08-01',
        partner: 'AgriTech Automation Solutions Pvt. Ltd.',
        revenue: 450000.00,
        patentUrl: 'https://ipindiaservices.gov.in',
        description: 'An edge gateway device with automated duty cycling for precision irrigation flow control.',
        approvalStatus: 'approved',
        createdBy: adminUser.id
      },
      {
        title: 'Sustainable High-Durability Geopolymer Binder Formulation Utilizing Thermal Fly Ash',
        inventors: 'Dr. Suresh Menon, Dr. Deepa Singh',
        applicationNo: 'IN202441023456',
        patentNo: null,
        status: 'published',
        patentType: 'National (Indian)',
        department: 'Civil Engineering',
        academicYear: '2024-2025',
        filedDate: '2024-01-18',
        publishedDate: '2024-07-22',
        grantedDate: null,
        licenseDate: null,
        partner: null,
        revenue: 0.00,
        patentUrl: 'https://ipindiaservices.gov.in',
        description: 'Alkali-activated composite cementitious mixture with accelerated curing and high resistance to sulfate attack.',
        approvalStatus: 'approved',
        createdBy: adminUser.id
      },
      {
        title: 'Compact Dual-Band MIMO Antenna System for 5G Cellular and Satellite Telemetry',
        inventors: 'Dr. Anand V, Dr. Priya Sharma',
        applicationNo: 'PCT/IB2023/056789',
        patentNo: 'US11894520B2',
        status: 'commercialized',
        patentType: 'International (PCT)',
        department: 'Electronics and Communication Engineering',
        academicYear: '2023-2024',
        filedDate: '2022-08-10',
        publishedDate: '2023-02-14',
        grantedDate: '2023-11-28',
        licenseDate: '2024-02-15',
        partner: 'Qualcomm Technologies Inc. (Global Licensing)',
        revenue: 1250000.00,
        patentUrl: 'https://patents.google.com',
        description: 'High-isolation compact antenna array for integrated millimeter-wave transceivers.',
        approvalStatus: 'approved',
        createdBy: adminUser.id
      },
      {
        title: 'Intelligent Adaptive Energy Router for High-Penetration Hybrid Renewable Microgrids',
        inventors: 'Dr. Karthik N, Dr. Rajesh Kumar',
        applicationNo: 'IN202341034567',
        patentNo: null,
        status: 'filed',
        patentType: 'National (Indian)',
        department: 'Electrical and Electronics Engineering',
        academicYear: '2023-2024',
        filedDate: '2023-11-05',
        publishedDate: null,
        grantedDate: null,
        licenseDate: null,
        partner: null,
        revenue: 0.00,
        patentUrl: 'https://ipindiaservices.gov.in',
        description: 'Predictive power routing topology minimizing battery degradation during peak solar fluctuations.',
        approvalStatus: 'approved',
        createdBy: adminUser.id
      }
    ];

    await Patent.bulkCreate(samplePatents);
    console.log(`✓ Seeded ${samplePatents.length} initial research patents (Published, Granted, Commercialized)`);
  } catch (err) {
    console.error('Error seeding initial patents:', err.message);
  }
};

const ensureInitialSponsoredProjects = async () => {
  try {
    const count = await SponsoredProject.count();
    if (count > 0) return;

    const adminUser = await User.findOne({ where: { role: 'admin' } });
    if (!adminUser) return;

    const sampleProjects = [
      {
        title: 'Development of Edge AI Gateway and Deep Learning Sensors for Real-Time Cardiac Monitoring',
        principalInvestigator: 'Dr. Rajesh Kumar',
        coInvestigators: 'Dr. Priya Sharma, Dr. Arun Kumar',
        fundingAgency: 'Department of Science & Technology (DST - SERB)',
        scheme: 'Core Research Grant (CRG)',
        agencyType: 'Government (National)',
        sanctionOrderNo: 'DST/SERB/CRG/2023/004821',
        sanctionDate: '2023-09-15',
        startDate: '2023-10-01',
        endDate: '2026-09-30',
        sanctionedAmount: 4850000.00,
        amountReceived: 2800000.00,
        status: 'Ongoing',
        progressPercentage: 65,
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        projectUrl: 'https://serbonline.in',
        description: 'Multi-institutional funded grant to develop miniaturized low-power wearable ECG/SpO2 IoT edge devices with sub-10ms anomaly detection.',
        approvalStatus: 'approved',
        createdBy: adminUser.id
      },
      {
        title: 'Sustainable High-Performance Geopolymer Structural Binders Utilizing Fly Ash and Industrial Blast Furnace Slag',
        principalInvestigator: 'Dr. Suresh Menon',
        coInvestigators: 'Dr. Anita Rao',
        fundingAgency: 'AICTE - Research Promotion Scheme (RPS)',
        scheme: 'Research Promotion Scheme (RPS)',
        agencyType: 'Government (National)',
        sanctionOrderNo: 'AICTE/RPS/CIVIL/2023/892',
        sanctionDate: '2023-11-20',
        startDate: '2024-01-05',
        endDate: '2026-01-04',
        sanctionedAmount: 2200000.00,
        amountReceived: 1450000.00,
        status: 'Ongoing',
        progressPercentage: 50,
        department: 'Civil Engineering',
        academicYear: '2024-2025',
        projectUrl: 'https://aicte-india.org',
        description: 'Experimental investigation and structural optimization of zero-cement alkali-activated green concrete for low-carbon heavy infrastructure.',
        approvalStatus: 'approved',
        createdBy: adminUser.id
      },
      {
        title: 'Design and Millimeter-Wave Prototype Validation of 5G/6G Dual-Polarized MIMO Antenna Transceivers',
        principalInvestigator: 'Dr. Deepa Singh',
        coInvestigators: 'Dr. Anand V',
        fundingAgency: 'Qualcomm India Research Grant',
        scheme: 'Industry Sponsored Innovation Fund',
        agencyType: 'Industry / Corporate',
        sanctionOrderNo: 'QCOM/IN/2022/GRANT-109',
        sanctionDate: '2022-08-10',
        startDate: '2022-09-01',
        endDate: '2024-08-31',
        sanctionedAmount: 3500000.00,
        amountReceived: 3500000.00,
        status: 'Completed',
        progressPercentage: 100,
        department: 'Electronics and Communication Engineering',
        academicYear: '2023-2024',
        projectUrl: 'https://qualcomm.com/research',
        description: 'Design, electromagnetic simulation, and anechoic chamber testing of high-isolation phased-array transceivers for next-generation base stations.',
        approvalStatus: 'approved',
        createdBy: adminUser.id
      },
      {
        title: 'Intelligent Decentralized Energy Routing and Battery Life Optimization for Off-Grid Hybrid Microgrids',
        principalInvestigator: 'Dr. Karthik N',
        coInvestigators: 'Dr. Vikram Patel',
        fundingAgency: 'Ministry of New and Renewable Energy (MNRE)',
        scheme: 'National Renewable Energy R&D Programme',
        agencyType: 'Government (National)',
        sanctionOrderNo: 'MNRE/RND/2024/EE/561',
        sanctionDate: '2024-03-12',
        startDate: '2024-04-01',
        endDate: '2027-03-31',
        sanctionedAmount: 5400000.00,
        amountReceived: 2100000.00,
        status: 'Ongoing',
        progressPercentage: 30,
        department: 'Electrical and Electronics Engineering',
        academicYear: '2024-2025',
        projectUrl: 'https://mnre.gov.in',
        description: 'Development of multi-agent reinforcement learning controller for seamless solar-wind-battery power flow stabilization in rural microgrids.',
        approvalStatus: 'approved',
        createdBy: adminUser.id
      },
      {
        title: 'Development of Biomimetic Nanostructured Lightweight Ceramic Composites for High-Temperature Aerospace Heat Shields',
        principalInvestigator: 'Dr. Meera Nair',
        coInvestigators: 'Dr. Suresh Menon',
        fundingAgency: 'Indian Space Research Organisation (ISRO - RESPOND)',
        scheme: 'RESPOND Programme',
        agencyType: 'Government (National)',
        sanctionOrderNo: 'ISRO/RESPOND/MECH/2024/782',
        sanctionDate: '2024-06-01',
        startDate: '2024-07-01',
        endDate: '2027-06-30',
        sanctionedAmount: 6200000.00,
        amountReceived: 2500000.00,
        status: 'Ongoing',
        progressPercentage: 25,
        department: 'Mechanical and Automobile Engineering',
        academicYear: '2024-2025',
        projectUrl: 'https://isro.gov.in/respond',
        description: 'Synthesis and thermal ablation testing of porous ceramic-matrix composites capable of withstanding hypersonic reentry temperatures above 1600°C.',
        approvalStatus: 'approved',
        createdBy: adminUser.id
      }
    ];

    await SponsoredProject.bulkCreate(sampleProjects);
    console.log(`✓ Seeded ${sampleProjects.length} initial sponsored research projects (DST, AICTE, ISRO, Qualcomm)`);
  } catch (err) {
    console.error('Error seeding initial sponsored projects:', err.message);
  }
};

autoSeed.ensureDefaultUsers = ensureDefaultUsers;
autoSeed.ensureInitialPublications = ensureInitialPublications;
autoSeed.ensureInitialPatents = ensureInitialPatents;
autoSeed.ensureInitialSponsoredProjects = ensureInitialSponsoredProjects;
module.exports = autoSeed;


