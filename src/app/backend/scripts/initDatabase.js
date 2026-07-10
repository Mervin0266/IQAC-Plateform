const { sequelize } = require('../config/database');
const { User, Achievement, Document, Patent, Placement, StrategicPlan } = require('../models');
require('dotenv').config();

const initDatabase = async () => {
  try {
    console.log('Starting database initialization...');

    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    // Sync all models
    await sequelize.sync({ force: true });
    console.log('✓ Database tables created');

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
    const achievements = await Achievement.bulkCreate([
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
        createdBy: seededUsers[2].id // Faculty user
      }
    ]);
    console.log('✓ Sample achievements created');

    // Create sample patents
    const patents = await Patent.bulkCreate([
      {
        title: 'AI-based Medical Diagnosis System',
        description: 'Advanced AI system for early disease detection',
        inventors: ['Dr. Rajesh Kumar', 'Dr. Priya Sharma'],
        department: 'Computer Science and Engineering',
        status: 'published',
        applicationNo: 'IN202411001234',
        filedDate: '2024-01-15',
        createdBy: seededUsers[2].id
      },
      {
        title: 'Sustainable Water Purification Technology',
        description: 'Eco-friendly water purification system',
        inventors: ['Dr. Suresh Menon'],
        department: 'Civil Engineering',
        status: 'granted',
        applicationNo: 'IN202311002345',
        patentNo: 'IN405678',
        filedDate: '2023-02-20',
        grantedDate: '2024-01-10',
        createdBy: seededUsers[1].id
      }
    ]);
    console.log('✓ Sample patents created');



    // Create sample strategic plans
    const strategicPlans = await StrategicPlan.bulkCreate([
      {
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        category: 'research-innovation',
        objective: 'Establish AI Research Lab',
        description: 'Set up state-of-the-art AI research laboratory with latest equipment',
        targetDate: '2024-12-31',
        status: 'in-progress',
        progress: 65,
        budget: 5000000,
        responsible: 'Dr. Rajesh Kumar',
        createdBy: seededUsers[2].id
      },
      {
        department: 'Civil Engineering',
        academicYear: '2024-2025',
        category: 'infrastructure',
        objective: 'Upgrade Geotechnical Lab',
        description: 'Modernize geotechnical testing laboratory',
        targetDate: '2025-03-31',
        status: 'planned',
        progress: 25,
        budget: 3000000,
        responsible: 'Dr. Suresh Menon',
        createdBy: seededUsers[1].id
      }
    ]);
    console.log('✓ Sample strategic plans created');

    // Create sample documents
    const sampleDocs = await Document.bulkCreate([
      {
        title: 'Data Structures and Algorithms - Syllabus',
        description: 'Syllabus for Data Structures and Algorithms course (CSE201)',
        category: 'course-files',
        subcategory: 'syllabus',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        semester: '3',
        courseCode: 'CSE201',
        courseName: 'Data Structures and Algorithms',
        fileName: 'Data Structures and Algorithms - Syllabus.pdf',
        filePath: '/uploads/Data-Structures-and-Algorithms-Syllabus.pdf',
        fileSize: 2516582, // 2.4 MB
        fileType: 'application/pdf',
        status: 'approved',
        uploadedBy: seededUsers[2].id
      },
      {
        title: 'Database Management Systems - Syllabus',
        description: 'Syllabus for Database Management Systems course (CSE301)',
        category: 'course-files',
        subcategory: 'syllabus',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        semester: '5',
        courseCode: 'CSE301',
        courseName: 'Database Management Systems',
        fileName: 'Database Management Systems - Syllabus.pdf',
        filePath: '/uploads/Database-Management-Systems-Syllabus.pdf',
        fileSize: 1887436, // 1.8 MB
        fileType: 'application/pdf',
        status: 'pending',
        uploadedBy: seededUsers[2].id
      },
      {
        title: 'Object Oriented Programming - Syllabus',
        description: 'Syllabus for Object Oriented Programming course (CSE102)',
        category: 'course-files',
        subcategory: 'syllabus',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        semester: '2',
        courseCode: 'CSE102',
        courseName: 'Object Oriented Programming',
        fileName: 'Object Oriented Programming - Syllabus.pdf',
        filePath: '/uploads/Object-Oriented-Programming-Syllabus.pdf',
        fileSize: 3250585, // 3.1 MB
        fileType: 'application/pdf',
        status: 'approved',
        uploadedBy: seededUsers[2].id
      },
      {
        title: 'Computer Networks - Syllabus',
        description: 'Syllabus for Computer Networks course (ECE401)',
        category: 'course-files',
        subcategory: 'syllabus',
        department: 'Electronics and Communication Engineering',
        academicYear: '2024-2025',
        semester: '7',
        courseCode: 'ECE401',
        courseName: 'Computer Networks',
        fileName: 'Computer Networks - Syllabus.pdf',
        filePath: '/uploads/Computer-Networks-Syllabus.pdf',
        fileSize: 2831155, // 2.7 MB
        fileType: 'application/pdf',
        status: 'approved',
        uploadedBy: seededUsers[0].id
      },
      {
        title: 'Week 1-4 Lesson Plan - Data Structures',
        description: 'Lesson plan for the first 4 weeks of Data Structures (CSE201)',
        category: 'course-files',
        subcategory: 'lesson-plan',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        semester: '3',
        courseCode: 'CSE201',
        courseName: 'Data Structures and Algorithms',
        fileName: 'Week 1-4 Lesson Plan - Data Structures.pdf',
        filePath: '/uploads/Week-1-4-Lesson-Plan-Data-Structures.pdf',
        fileSize: 1258291, // 1.2 MB
        fileType: 'application/pdf',
        status: 'approved',
        uploadedBy: seededUsers[2].id
      },
      {
        title: 'Monthly Lesson Plan - DBMS',
        description: 'Monthly teaching schedule for Database Management Systems (CSE301)',
        category: 'course-files',
        subcategory: 'lesson-plan',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        semester: '5',
        courseCode: 'CSE301',
        courseName: 'Database Management Systems',
        fileName: 'Monthly Lesson Plan - DBMS.pdf',
        filePath: '/uploads/Monthly-Lesson-Plan-DBMS.pdf',
        fileSize: 1003520, // 980 KB
        fileType: 'application/pdf',
        status: 'pending',
        uploadedBy: seededUsers[2].id
      },
      {
        title: 'Linked Lists - Teaching Notes',
        description: 'Comprehensive notes on Singly and Doubly Linked Lists',
        category: 'course-files',
        subcategory: 'teaching-notes',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        semester: '3',
        courseCode: 'CSE201',
        courseName: 'Data Structures and Algorithms',
        fileName: 'Linked Lists - Teaching Notes.pdf',
        filePath: '/uploads/Linked-Lists-Teaching-Notes.pdf',
        fileSize: 4404019, // 4.2 MB
        fileType: 'application/pdf',
        status: 'approved',
        uploadedBy: seededUsers[2].id
      },
      {
        title: 'SQL Queries - Lecture Notes',
        description: 'Lecture notes covering complex SQL Joins and Subqueries',
        category: 'course-files',
        subcategory: 'teaching-notes',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        semester: '5',
        courseCode: 'CSE301',
        courseName: 'Database Management Systems',
        fileName: 'SQL Queries - Lecture Notes.pdf',
        filePath: '/uploads/SQL-Queries-Lecture-Notes.pdf',
        fileSize: 2936012, // 2.8 MB
        fileType: 'application/pdf',
        status: 'approved',
        uploadedBy: seededUsers[2].id
      },
      {
        title: 'Mid-Term Exam - Data Structures',
        description: 'Question paper for Mid-Term Assessment',
        category: 'course-files',
        subcategory: 'assessments',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        semester: '3',
        courseCode: 'CSE201',
        courseName: 'Data Structures and Algorithms',
        fileName: 'Mid-Term Exam - Data Structures.pdf',
        filePath: '/uploads/Mid-Term-Exam-Data-Structures.pdf',
        fileSize: 876544, // 856 KB
        fileType: 'application/pdf',
        status: 'approved',
        uploadedBy: seededUsers[2].id
      },
      {
        title: 'January 2024 - Attendance Sheet',
        description: 'Student attendance tracker sheet for January',
        category: 'course-files',
        subcategory: 'attendance',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        semester: '3',
        courseCode: 'CSE201',
        courseName: 'Data Structures and Algorithms',
        fileName: 'January 2024 - Attendance Sheet.xlsx',
        filePath: '/uploads/January-2024-Attendance-Sheet.xlsx',
        fileSize: 126976, // 124 KB
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        status: 'approved',
        uploadedBy: seededUsers[2].id
      },
      {
        title: 'CO-PO Mapping Matrix - CSE201',
        description: 'Course Outcome to Program Outcome Mapping matrix',
        category: 'course-files',
        subcategory: 'co-po-mapping',
        department: 'Computer Science and Engineering',
        academicYear: '2024-2025',
        semester: '3',
        courseCode: 'CSE201',
        courseName: 'Data Structures and Algorithms',
        fileName: 'CO-PO Mapping Matrix - CSE201.xlsx',
        filePath: '/uploads/CO-PO-Mapping-Matrix-CSE201.xlsx',
        fileSize: 68608, // 67 KB
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        status: 'approved',
        uploadedBy: seededUsers[2].id
      }
    ]);
    console.log('✓ Sample documents created');

    console.log('\n========================================');
    console.log('Database initialization completed!');
    console.log('========================================');
    console.log('\nDefault Credentials:');
    console.log(`Admin Email: ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@christuniversity.in'}`);
    console.log(`Admin Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123'}`);
    console.log('\nSample Institutional Authority Login:');
    console.log('Email: dean@christuniversity.in');
    console.log('Password: Authority@123');
    console.log('\nSample HOD Login:');
    console.log('Email: hod.cse@christuniversity.in');
    console.log('Password: Hod@123');
    console.log('\nSample Coordinator Login:');
    console.log('Email: coord.cse@christuniversity.in');
    console.log('Password: Coordinator@123');
    console.log('\nSample Faculty Login:');
    console.log('Email: faculty.cse@christuniversity.in');
    console.log('Password: Faculty@123');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  }
};

initDatabase();
