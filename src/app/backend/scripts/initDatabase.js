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

    // Create sample faculty users
    const facultyUsers = await User.bulkCreate([
      {
        name: 'Dr. Rajesh Kumar',
        email: 'rajesh.kumar@christuniversity.in',
        password: 'Faculty@123',
        role: 'faculty',
        department: 'Computer Science and Engineering',
        employeeId: 'FAC001',
        phone: '+91-9876543211'
      },
      {
        name: 'Dr. Priya Sharma',
        email: 'priya.sharma@christuniversity.in',
        password: 'Faculty@123',
        role: 'faculty',
        department: 'Electronics and Communication Engineering',
        employeeId: 'FAC002',
        phone: '+91-9876543212'
      },
      {
        name: 'Dr. Suresh Menon',
        email: 'suresh.menon@christuniversity.in',
        password: 'Coordinator@123',
        role: 'coordinator',
        department: 'Civil Engineering',
        employeeId: 'COORD001',
        phone: '+91-9876543213'
      }
    ]);
    console.log('✓ Sample faculty users created');

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
        status: 'published',
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
        status: 'published',
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
        status: 'published',
        createdBy: facultyUsers[0].id
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
        createdBy: facultyUsers[0].id
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
        createdBy: facultyUsers[2].id
      }
    ]);
    console.log('✓ Sample patents created');

    // Create sample placements
    const placements = await Placement.bulkCreate([
      {
        studentName: 'Rahul Verma',
        studentId: 'CSE20001',
        department: 'Computer Science and Engineering',
        batch: '2020-2024',
        company: 'Google India',
        role: 'Software Engineer',
        package: 4500000,
        placementType: 'placement',
        placementDate: '2024-02-15',
        location: 'Bangalore',
        createdBy: adminUser.id
      },
      {
        studentName: 'Priya Patel',
        studentId: 'ECE20015',
        department: 'Electronics and Communication Engineering',
        batch: '2020-2024',
        company: 'Intel Corporation',
        role: 'Hardware Engineer',
        package: 3200000,
        placementType: 'placement',
        placementDate: '2024-02-20',
        location: 'Bangalore',
        createdBy: adminUser.id
      }
    ]);
    console.log('✓ Sample placements created');

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
        createdBy: facultyUsers[0].id
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
        createdBy: facultyUsers[2].id
      }
    ]);
    console.log('✓ Sample strategic plans created');

    console.log('\n========================================');
    console.log('Database initialization completed!');
    console.log('========================================');
    console.log('\nDefault Credentials:');
    console.log(`Admin Email: ${process.env.DEFAULT_ADMIN_EMAIL || 'admin@christuniversity.in'}`);
    console.log(`Admin Password: ${process.env.DEFAULT_ADMIN_PASSWORD || 'Admin@123'}`);
    console.log('\nSample Faculty Login:');
    console.log('Email: rajesh.kumar@christuniversity.in');
    console.log('Password: Faculty@123');
    console.log('\nSample Coordinator Login:');
    console.log('Email: suresh.menon@christuniversity.in');
    console.log('Password: Coordinator@123');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  }
};

initDatabase();
