const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize } = require('../config/database');
const { Department, School, ProgramLevel, Course } = require('../models');

async function ensureSOA() {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    let soe = await School.findOne({ where: { code: 'SOE' } });
    if (!soe) {
      soe = await School.findOne();
    }

    let ugLevel = await ProgramLevel.findOne({ where: { code: 'UG' } });
    let pgLevel = await ProgramLevel.findOne({ where: { code: 'PG' } });
    let phdLevel = await ProgramLevel.findOne({ where: { code: 'PHD' } });

    let soa = await Department.findOne({
      where: {
        code: 'SOA'
      }
    });

    if (!soa) {
      soa = await Department.create({
        code: 'SOA',
        name: 'School of Architecture',
        shortName: 'SOA',
        schoolId: soe ? soe.id : null,
        establishedYear: 2017,
        status: 'Active',
        description: 'Department / School of Architecture'
      });
      console.log('✓ Created Department: School of Architecture (SOA)');
    } else {
      soa.name = 'School of Architecture';
      soa.status = 'Active';
      await soa.save();
      console.log('✓ School of Architecture (SOA) already exists, refreshed.');
    }

    // Courses
    if (ugLevel) {
      const barch = await Course.findOne({ where: { code: 'BARCH' } });
      if (!barch) {
        await Course.create({
          code: 'BARCH',
          name: 'Bachelor of Architecture (B.Arch)',
          departmentId: soa.id,
          programLevelId: ugLevel.id,
          duration: '5 Years',
          status: 'Active'
        });
        console.log('✓ Created Course: B.Arch');
      }
    }

    if (pgLevel) {
      const march = await Course.findOne({ where: { code: 'MARCH-URBAN' } });
      if (!march) {
        await Course.create({
          code: 'MARCH-URBAN',
          name: 'Master of Architecture (M.Arch - Urban Design)',
          departmentId: soa.id,
          programLevelId: pgLevel.id,
          duration: '2 Years',
          status: 'Active'
        });
        console.log('✓ Created Course: M.Arch');
      }
    }

    if (phdLevel) {
      const phdArch = await Course.findOne({ where: { code: 'PHD-ARCH' } });
      if (!phdArch) {
        await Course.create({
          code: 'PHD-ARCH',
          name: 'PhD in Architecture',
          departmentId: soa.id,
          programLevelId: phdLevel.id,
          duration: '3-5 Years',
          status: 'Active'
        });
        console.log('✓ Created Course: PhD in Architecture');
      }
    }

    console.log('✓ All SOA data ensured.');
    process.exit(0);
  } catch (err) {
    console.error('Error ensuring SOA department:', err);
    process.exit(1);
  }
}

ensureSOA();
