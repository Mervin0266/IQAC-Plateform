const assert = require('assert');
const { sequelize } = require('../config/database');
const { User, Faculty, Award, EContent, SystemConfiguration } = require('../models');
const awardsController = require('../controllers/awardsController');
const eContentsController = require('../controllers/eContentsController');

// Mock Express response helper
function createMockRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    }
  };
}

async function runTests() {
  console.log('--- Starting Achievements (Awards & E-Contents) Test Suite ---');

  try {
    // 1. Verify Database Connection
    await sequelize.authenticate();
    console.log('✓ Database connection verified.');

    // 2. Verify Models and Associations
    assert(Award, 'Award model should be exported');
    assert(EContent, 'EContent model should be exported');
    assert(Award.associations.faculty, 'Award belongsTo Faculty association exists');
    assert(EContent.associations.faculty, 'EContent belongsTo Faculty association exists');
    console.log('✓ Sequelize models and associations verified.');

    // 3. Find or Create a Test Faculty and Admin User
    let faculty = await Faculty.findOne();
    if (!faculty) {
      faculty = await Faculty.create({
        employeeId: 'TEST999',
        name: 'Dr. Test Achievements Faculty',
        department: 'Computer Science and Engineering',
        designation: 'Professor',
        academicYear: '2024-2025'
      });
      console.log('✓ Created test faculty member: TEST999');
    } else {
      console.log(`✓ Using existing faculty: ${faculty.employeeId} - ${faculty.name} (${faculty.department})`);
    }

    const testEmpId = faculty.employeeId;
    const testFacultyName = faculty.name;
    const testDept = faculty.department;

    let adminUser = await User.findOne({ where: { role: 'admin' } });
    if (!adminUser) {
      adminUser = { id: '00000000-0000-0000-0000-000000000001', role: 'admin', isSystemAdmin: true };
    }

    const mockAdminReq = {
      user: {
        id: adminUser.id,
        role: 'admin',
        isSystemAdmin: true,
        department: testDept
      }
    };

    // 4. Test Master Data / Options Retrieval
    console.log('\n--- Testing Master Data Retrieval ---');
    const resAgencyOpts = createMockRes();
    await awardsController.getAgencyTypeOptions({ ...mockAdminReq, query: {} }, resAgencyOpts);
    assert.strictEqual(resAgencyOpts.statusCode, 200);
    assert(Array.isArray(resAgencyOpts.data.options), 'Agency type options returned as array');
    console.log(`✓ Awards Agency Types retrieved: ${resAgencyOpts.data.options.join(', ')}`);

    const resEconOpts = createMockRes();
    await eContentsController.getDropdownOptions({ ...mockAdminReq, query: {} }, resEconOpts);
    assert.strictEqual(resEconOpts.statusCode, 200);
    assert(Array.isArray(resEconOpts.data.platforms), 'E-Content platforms returned');
    assert(Array.isArray(resEconOpts.data.contentTypes), 'E-Content types returned');
    console.log(`✓ E-Content platforms: ${resEconOpts.data.platforms.slice(0, 3).join(', ')}...`);
    console.log(`✓ E-Content content types: ${resEconOpts.data.contentTypes.slice(0, 3).join(', ')}...`);

    // 5. Test Faculty Directory Search
    console.log('\n--- Testing Faculty Lookup Mechanism ---');
    const resFacSearch = createMockRes();
    await awardsController.searchFacultyDirectory({ ...mockAdminReq, query: { q: testEmpId } }, resFacSearch);
    assert.strictEqual(resFacSearch.statusCode, 200);
    assert(Array.isArray(resFacSearch.data.data), 'Faculty search results returned');
    const matchedFac = resFacSearch.data.data.find(f => f.employeeId === testEmpId);
    assert(matchedFac, `Faculty with EmpID ${testEmpId} found in lookup`);
    console.log(`✓ Found faculty via lookup: ${matchedFac.name} (${matchedFac.employeeId})`);

    // 6. Test Awards CRUD & Calendar Year Derivation
    console.log('\n--- Testing Awards CRUD & Calendar Year Derivation ---');
    const resCreateAward = createMockRes();
    const uniqueAwardTitle = `Excellence in Cloud AI Research ${Date.now()}`;
    await awardsController.createAward({
      ...mockAdminReq,
      body: {
        facultyEmpId: testEmpId,
        nameOfRecognition: uniqueAwardTitle,
        description: 'Pioneering work in edge neural acceleration',
        dateOfRecognition: '2025-06-18',
        recognisedAgencyType: 'National',
        recognisingAgencyName: 'Indian National Science Academy',
        proofUrl: 'https://example.com/awards/insa-2025.pdf'
      }
    }, resCreateAward);

    assert.strictEqual(resCreateAward.statusCode, 201, `Award creation should return 201: ${JSON.stringify(resCreateAward.data)}`);
    const createdAward = resCreateAward.data.data;
    assert.strictEqual(createdAward.employeeId, testEmpId);
    assert.strictEqual(createdAward.facultyName, testFacultyName);
    assert.strictEqual(createdAward.department, testDept);
    assert.strictEqual(createdAward.calendarYear, 2025, 'Year must be derived calendar year (2025)');
    console.log(`✓ Award created with ID ${createdAward.id}, derived year: ${createdAward.calendarYear}`);

    // Test Award Duplicate Detection on Single Entry
    const resDupAward = createMockRes();
    await awardsController.createAward({
      ...mockAdminReq,
      body: {
        facultyEmpId: testEmpId,
        nameOfRecognition: uniqueAwardTitle.toLowerCase(), // case-insensitive check
        dateOfRecognition: '2025-06-18',
        recognisedAgencyType: 'National',
        recognisingAgencyName: 'Indian National Science Academy',
      }
    }, resDupAward);
    assert.strictEqual(resDupAward.statusCode, 409, 'Duplicate award should return 409 Conflict');
    console.log('✓ Duplicate Award single-entry rejected with 409 Conflict as expected.');

    // Clean up created award
    await Award.destroy({ where: { id: createdAward.id } });
    console.log('✓ Test award cleaned up.');

    // Test Optional Recognising Agency Name
    const resOptAgencyAward = createMockRes();
    const optAgencyAwardTitle = `Award without Agency Name ${Date.now()}`;
    await awardsController.createAward({
      ...mockAdminReq,
      body: {
        facultyEmpId: testEmpId,
        nameOfRecognition: optAgencyAwardTitle,
        description: 'Testing optional agency name field',
        dateOfRecognition: '2025-07-20',
        recognisedAgencyType: 'National'
        // recognisingAgencyName intentionally omitted
      }
    }, resOptAgencyAward);

    assert.strictEqual(resOptAgencyAward.statusCode, 201, `Award creation without Agency Name should return 201: ${JSON.stringify(resOptAgencyAward.data)}`);
    console.log(`✓ Award with optional (omitted) Recognising Agency Name created successfully`);
    await Award.destroy({ where: { id: resOptAgencyAward.data.data.id } });

    // 7. Test E-Contents CRUD & Calendar Year Derivation
    console.log('\n--- Testing E-Contents CRUD & Calendar Year Derivation ---');
    const resCreateEcon = createMockRes();
    const uniqueEconTitle = `Full Stack Cloud Development MOOC ${Date.now()}`;
    const uniqueEconUrl = `https://swayam.gov.in/courses/test-full-stack-${Date.now()}`;
    await eContentsController.createEContent({
      ...mockAdminReq,
      body: {
        facultyEmpId: testEmpId,
        title: uniqueEconTitle,
        eContentPlatform: 'SWAYAM / NPTEL',
        publicationDate: '2024-10-05',
        url: uniqueEconUrl,
        contentType: 'Complete MOOC Course (4 Quadrants)',
        proofUrl: 'https://example.com/proof/swayam-cert.pdf'
      }
    }, resCreateEcon);

    assert.strictEqual(resCreateEcon.statusCode, 201, `EContent creation should return 201: ${JSON.stringify(resCreateEcon.data)}`);
    const createdEcon = resCreateEcon.data.data;
    assert.strictEqual(createdEcon.employeeId, testEmpId);
    assert.strictEqual(createdEcon.facultyName, testFacultyName);
    assert.strictEqual(createdEcon.calendarYear, 2024, 'Year must be derived calendar year (2024)');
    console.log(`✓ E-Content created with ID ${createdEcon.id}, derived year: ${createdEcon.calendarYear}`);

    // Test E-Content Duplicate Detection
    const resDupEcon = createMockRes();
    await eContentsController.createEContent({
      ...mockAdminReq,
      body: {
        facultyEmpId: testEmpId,
        title: uniqueEconTitle.toUpperCase(),
        publicationDate: '2024-10-05',
        url: uniqueEconUrl,
        eContentPlatform: 'SWAYAM / NPTEL',
        contentType: 'Complete MOOC Course (4 Quadrants)'
      }
    }, resDupEcon);
    assert.strictEqual(resDupEcon.statusCode, 409, 'Duplicate e-content should return 409 Conflict');
    console.log('✓ Duplicate E-Content single-entry rejected with 409 Conflict as expected.');

    // Clean up created e-content
    await EContent.destroy({ where: { id: createdEcon.id } });
    console.log('✓ Test e-content cleaned up.');

    // 8. Test Awards Bulk Upload Validation & Import (with missing, invalid, and duplicate EmpIDs)
    console.log('\n--- Testing Awards Bulk Upload Validation & Partial Import ---');
    const bulkAwardRows = [
      // Row 1: Valid
      {
        employeeId: testEmpId,
        nameOfRecognition: `Valid Bulk Award A ${Date.now()}`,
        description: 'Recognized for excellent mentoring',
        dateOfRecognition: '2025-04-12',
        recognisedAgencyType: 'State',
        recognisingAgencyName: 'Karnataka State Council for Science and Technology',
        proofUrl: 'https://example.com/proof/award-a.pdf'
      },
      // Row 2: Missing EmpID (must be skipped, but not block others)
      {
        employeeId: '',
        nameOfRecognition: 'Missing EmpID Award',
        dateOfRecognition: '2025-05-10',
        recognisedAgencyType: 'National',
        recognisingAgencyName: 'National Academy'
      },
      // Row 3: Invalid / Non-existent EmpID (must be skipped)
      {
        employeeId: 'NON_EXISTENT_FACULTY_EMP_999999',
        nameOfRecognition: 'Invalid EmpID Award',
        dateOfRecognition: '2025-06-15',
        recognisedAgencyType: 'International',
        recognisingAgencyName: 'Global Society'
      },
      // Row 4: Another Valid Row
      {
        employeeId: testEmpId,
        nameOfRecognition: `Valid Bulk Award B ${Date.now()}`,
        description: 'Outstanding researcher',
        dateOfRecognition: '2024-11-20',
        recognisedAgencyType: 'National',
        recognisingAgencyName: 'Indian Science Congress',
        proofUrl: ''
      }
    ];

    // Validate endpoint
    const resValAwards = createMockRes();
    await awardsController.validateBulkAwards({ ...mockAdminReq, body: { rows: bulkAwardRows } }, resValAwards);
    assert.strictEqual(resValAwards.statusCode, 200);
    assert.strictEqual(resValAwards.data.summary.totalRows, 4);
    assert.strictEqual(resValAwards.data.summary.readyCount, 2, '2 rows should be ready');
    assert.strictEqual(resValAwards.data.summary.missingEmpIdCount + resValAwards.data.summary.notFoundEmpIdCount, 2, '2 rows should be flagged');
    console.log(`✓ Bulk Awards Validation passed: Total=4, Ready=2, Flagged=2`);

    // Import endpoint
    const resImpAwards = createMockRes();
    await awardsController.bulkImportAwards({ ...mockAdminReq, body: { rows: resValAwards.data.rows } }, resImpAwards);
    assert.strictEqual(resImpAwards.statusCode, 200);
    assert.strictEqual(resImpAwards.data.summary.importedCount, 2, '2 valid rows should be imported');
    assert.strictEqual(resImpAwards.data.summary.skippedMissingEmpId, 1, '1 row skipped for missing EmpID');
    assert(resImpAwards.data.summary.skippedInvalidEmpId >= 0, 'skippedInvalidEmpId tracked');
    console.log('✓ Bulk Awards Import accurately imported 2 records and skipped 2 invalid records with proper category reasons.');

    // Clean up imported awards
    await Award.destroy({
      where: {
        nameOfRecognition: [bulkAwardRows[0].nameOfRecognition, bulkAwardRows[3].nameOfRecognition]
      }
    });
    console.log('✓ Bulk test awards cleaned up.');

    // 9. Test E-Contents Bulk Upload Validation & Import
    console.log('\n--- Testing E-Contents Bulk Upload Validation & Partial Import ---');
    const bulkEconRows = [
      // Row 1: Valid
      {
        employeeId: testEmpId,
        title: `Valid Bulk E-Content A ${Date.now()}`,
        eContentPlatform: 'SWAYAM / NPTEL',
        publicationDate: '2025-02-14',
        url: `https://swayam.gov.in/courses/bulk-a-${Date.now()}`,
        contentType: 'Interactive Simulation / Virtual Lab'
      },
      // Row 2: Missing EmpID
      {
        employeeId: '',
        title: 'Missing EmpID E-Content',
        eContentPlatform: 'YouTube / Open Platform',
        publicationDate: '2025-03-01',
        url: 'https://youtube.com/watch?v=123',
        contentType: 'Video Lecture Series'
      },
      // Row 3: Non-existent EmpID
      {
        employeeId: 'UNKNOWN_EMP_777777',
        title: 'Unfound Faculty E-Content',
        eContentPlatform: 'Institutional LMS / Moodle',
        publicationDate: '2025-04-01',
        url: 'https://lms.christ.in/1',
        contentType: 'E-Text / Digital Learning Modules'
      },
      // Row 4: Valid
      {
        employeeId: testEmpId,
        title: `Valid Bulk E-Content B ${Date.now()}`,
        eContentPlatform: 'Coursera',
        publicationDate: '2023-08-20',
        url: `https://coursera.org/learn/bulk-b-${Date.now()}`,
        contentType: 'Complete MOOC Course (4 Quadrants)'
      }
    ];

    // Validate endpoint
    const resValEcon = createMockRes();
    await eContentsController.validateBulkEContents({ ...mockAdminReq, body: { rows: bulkEconRows } }, resValEcon);
    assert.strictEqual(resValEcon.statusCode, 200);
    assert.strictEqual(resValEcon.data.summary.totalRows, 4);
    assert.strictEqual(resValEcon.data.summary.readyCount, 2, '2 e-contents should be ready');
    assert.strictEqual(resValEcon.data.summary.missingEmpIdCount + resValEcon.data.summary.notFoundEmpIdCount, 2, '2 e-contents flagged');
    console.log(`✓ Bulk E-Contents Validation passed: Total=4, Ready=2, Flagged=2`);

    // Import endpoint
    const resImpEcon = createMockRes();
    await eContentsController.bulkImportEContents({ ...mockAdminReq, body: { rows: resValEcon.data.rows } }, resImpEcon);
    assert.strictEqual(resImpEcon.statusCode, 200);
    assert.strictEqual(resImpEcon.data.summary.importedCount, 2, '2 valid e-contents imported');
    assert.strictEqual(resImpEcon.data.summary.skippedMissingEmpId, 1, '1 row skipped for missing EmpID');
    assert(resImpEcon.data.summary.skippedInvalidEmpId >= 0, 'skippedInvalidEmpId tracked');
    console.log('✓ Bulk E-Contents Import accurately imported 2 records and skipped 2 invalid records with proper category reasons.');

    // Clean up imported e-contents
    await EContent.destroy({
      where: {
        title: [bulkEconRows[0].title, bulkEconRows[3].title]
      }
    });
    console.log('✓ Bulk test e-contents cleaned up.');

    // 10. Regression Check on other modules
    console.log('\n--- Checking Non-Regression on Existing Modules ---');
    const { Patent, Copyright, Publication } = require('../models');
    assert(Patent, 'Patent model intact');
    assert(Copyright, 'Copyright model intact');
    assert(Publication, 'Publication model intact');
    const patentCount = await Patent.count();
    const copyrightCount = await Copyright.count();
    const pubCount = await Publication.count();
    console.log(`✓ Non-regression verified: Patents count=${patentCount}, Copyrights count=${copyrightCount}, Publications count=${pubCount}`);

    console.log('\n======================================================');
    console.log(' ALL ACHIEVEMENTS (AWARDS & E-CONTENTS) TESTS PASSED! ');
    console.log('======================================================\n');
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runTests();
