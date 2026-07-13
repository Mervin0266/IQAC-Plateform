const { User, Achievement, ResearchMetric } = require('../models');

const autoSeed = async (sequelize) => {
  try {
    // Sync the database schema (create tables and add missing columns if they don't exist)
    await sequelize.sync({ force: false, alter: { drop: false } });
    console.log('✓ Database schema synchronized');

    // Check if users already exist in the database
    const userCount = await User.count();
    if (userCount > 0) {
      console.log('✓ Database already contains users. Skipping auto-seeding.');
      return;
    }

    console.log('Database is empty. Starting automatic database seeding...');

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
        periodType: 'yearly',
        periodValue: 'AY 2024-25',
        department: 'Civil Engineering',
        books: 0, chapters: 1, scopusJournals: 13, nationalJournals: 0, internationalJournals: 14, citations: 127,
        patentsIndian: 1, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 8,
        consultancyCount: 1, consultancyAmount: 10000.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'yearly',
        periodValue: 'AY 2024-25',
        department: 'Computer Science and Engineering',
        books: 6, chapters: 71, scopusJournals: 77, nationalJournals: 0, internationalJournals: 77, citations: 70,
        patentsIndian: 7, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 106,
        consultancyCount: 4, consultancyAmount: 1560408.00, seedMoneyCount: 10, seedMoneyAmount: 1624168.00, externalProjectsCount: 6, externalProjectsAmount: 4411660.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'yearly',
        periodValue: 'AY 2024-25',
        department: 'Electronics and Communication Engineering',
        books: 3, chapters: 9, scopusJournals: 16, nationalJournals: 0, internationalJournals: 16, citations: 35,
        patentsIndian: 9, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 44,
        consultancyCount: 29, consultancyAmount: 793140.00, seedMoneyCount: 9, seedMoneyAmount: 1792510.00, externalProjectsCount: 4, externalProjectsAmount: 2313431.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'yearly',
        periodValue: 'AY 2024-25',
        department: 'Electrical and Electronics Engineering',
        books: 1, chapters: 1, scopusJournals: 15, nationalJournals: 2, internationalJournals: 15, citations: 207,
        patentsIndian: 4, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 11,
        consultancyCount: 1, consultancyAmount: 600000.00, seedMoneyCount: 3, seedMoneyAmount: 839000.00, externalProjectsCount: 2, externalProjectsAmount: 6135000.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'yearly',
        periodValue: 'AY 2024-25',
        department: 'Mechanical Engineering',
        books: 7, chapters: 3, scopusJournals: 26, nationalJournals: 2, internationalJournals: 26, citations: 36,
        patentsIndian: 22, patentsInternational: 0, conferencesNational: 3, conferencesInternational: 24,
        consultancyCount: 7, consultancyAmount: 103000.00, seedMoneyCount: 8, seedMoneyAmount: 2308000.00, externalProjectsCount: 3, externalProjectsAmount: 3200000.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'yearly',
        periodValue: 'AY 2024-25',
        department: 'Sciences and Humanities',
        books: 3, chapters: 9, scopusJournals: 47, nationalJournals: 0, internationalJournals: 47, citations: 94,
        patentsIndian: 4, patentsInternational: 0, conferencesNational: 2, conferencesInternational: 15,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 2, seedMoneyAmount: 600000.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2024-2025',
        periodType: 'yearly',
        periodValue: 'AY 2024-25',
        department: 'School of Architecture',
        books: 0, chapters: 7, scopusJournals: 2, nationalJournals: 0, internationalJournals: 5, citations: 7,
        patentsIndian: 15, patentsInternational: 0, conferencesNational: 10, conferencesInternational: 20,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 2, externalProjectsAmount: 4996500.00
      },

      // AY 2025-2026 Monthly Breakdown for AIML & Data Science (from Screenshot 2)
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'June - 2025',
        department: 'AIML & Data Science',
        books: 1, chapters: 11, scopusJournals: 2, nationalJournals: 0, internationalJournals: 2, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'July - 2025',
        department: 'AIML & Data Science',
        books: 3, chapters: 5, scopusJournals: 2, nationalJournals: 0, internationalJournals: 2, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 2,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'August - 2025',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'September - 2025',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'October - 2025',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'November - 2025',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'December - 2025',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'January - 2026',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'February - 2026',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'March - 2026',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'April - 2026',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      },
      {
        academicYear: '2025-2026',
        periodType: 'monthly',
        periodValue: 'May - 2026',
        department: 'AIML & Data Science',
        books: 0, chapters: 0, scopusJournals: 0, nationalJournals: 0, internationalJournals: 0, citations: 0,
        patentsIndian: 0, patentsInternational: 0, conferencesNational: 0, conferencesInternational: 0,
        consultancyCount: 0, consultancyAmount: 0.00, seedMoneyCount: 0, seedMoneyAmount: 0.00, externalProjectsCount: 0, externalProjectsAmount: 0.00
      }
    ]);
    console.log('✓ Pre-seeded research summary metrics created');

    console.log('✓ Automatic database seeding completed successfully!');
  } catch (error) {
    console.error('✗ Automatic database seeding failed:', error);
  }
};

module.exports = autoSeed;
