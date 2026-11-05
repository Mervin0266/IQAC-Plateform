'use strict';

/**
 * CHRIST UNIVERSITY IQAC PLATFORM
 * Publications Module — Faculty-Wise Multi-File / Folder Bulk Upload & Deduplication Test Suite
 * Version 6.0
 */

const assert = require('assert');
const { extractEmployeeIdFromFilename } = require('../controllers/publicationController');
const publicationController = require('../controllers/publicationController');
const { Publication, Faculty, PublicationFaculty } = require('../models');
const { sequelize } = require('../config/database');

console.log('================================================================');
console.log('  CHRIST University IQAC - Publications Faculty-Wise Multi-File');
console.log('  Bulk Upload, Co-Authorship Deduplication & Association Test Suite');
console.log('  Version 6.0 — Strict Functionality Protection');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runSyncTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}\n`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}\n${err.stack}\n`);
  }
}

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

async function main() {
  // -------------------------------------------------------------
  // TEST SUITE 1: Filename Employee ID Extraction
  // -------------------------------------------------------------
  console.log('--- Suite 1: Filename Employee ID Extraction ---');

  runSyncTest('1.1 extractEmployeeIdFromFilename: Standard underscore delimiters', () => {
    assert.strictEqual(extractEmployeeIdFromFilename('2043_Adarsh_S_V.xlsx'), '2043');
    assert.strictEqual(extractEmployeeIdFromFilename('4862_Akanksha_Rao.csv'), '4862');
    assert.strictEqual(extractEmployeeIdFromFilename('1001_Dr_Rajesh_Kumar.xls'), '1001');
  });

  runSyncTest('1.2 extractEmployeeIdFromFilename: Preserves leading zeros as string', () => {
    assert.strictEqual(extractEmployeeIdFromFilename('00123_Faculty_Name.xlsx'), '00123');
    assert.strictEqual(extractEmployeeIdFromFilename('0987-Publications.csv'), '0987');
    assert.strictEqual(extractEmployeeIdFromFilename('0005_Prof_John.xls'), '0005');
    assert.strictEqual(typeof extractEmployeeIdFromFilename('00123_Faculty.xlsx'), 'string');
  });

  runSyncTest('1.3 extractEmployeeIdFromFilename: Alphanumeric and prefixed department codes', () => {
    assert.strictEqual(extractEmployeeIdFromFilename('EMP001_Rajesh_Kumar.xlsx'), 'EMP001');
    assert.strictEqual(extractEmployeeIdFromFilename('CU-991_Dr_Smith.csv'), 'CU-991');
    assert.strictEqual(extractEmployeeIdFromFilename('F_5432_Publications.xlsx'), 'F_5432');
    assert.strictEqual(extractEmployeeIdFromFilename('2043-Adarsh.csv'), '2043');
    assert.strictEqual(extractEmployeeIdFromFilename('2043 Adarsh.xls'), '2043');
  });

  runSyncTest('1.4 extractEmployeeIdFromFilename: Rejects template & non-faculty filenames', () => {
    assert.strictEqual(extractEmployeeIdFromFilename('publications_template.csv'), null);
    assert.strictEqual(extractEmployeeIdFromFilename('scopus_export_all.xlsx'), null);
    assert.strictEqual(extractEmployeeIdFromFilename('template_publications.xlsx'), null);
    assert.strictEqual(extractEmployeeIdFromFilename('data_export.csv'), null);
    assert.strictEqual(extractEmployeeIdFromFilename(''), null);
    assert.strictEqual(extractEmployeeIdFromFilename(null), null);
  });

  // -------------------------------------------------------------
  // TEST SUITE 2: Faculty Directory Lookup & Canonical Deduplication
  // -------------------------------------------------------------
  console.log('\n--- Suite 2: Faculty Directory Lookup & Conflict Detection ---');

  await runAsyncTest('2.1 getPublicationFacultyDirectory: Returns canonical map and flags conflicts', async () => {
    const origFindAll = Faculty.findAll;
    try {
      Faculty.findAll = async () => [
        {
          id: 'fac-1',
          employeeId: '2043',
          name: 'Dr. Adarsh S V',
          department: 'Computer Science and Engineering',
          status: 'Active',
          academicYear: '2025-2026',
          createdAt: new Date('2025-06-01')
        },
        {
          id: 'fac-1-old',
          employeeId: '2043',
          name: 'Dr. Adarsh S V',
          department: 'Computer Science and Engineering',
          status: 'Active',
          academicYear: '2024-2025',
          createdAt: new Date('2024-06-01')
        },
        // Conflict identity: same employeeId, different name/department
        {
          id: 'fac-conf-1',
          employeeId: '9999',
          name: 'Dr. Original Identity',
          department: 'Civil Engineering',
          status: 'Active',
          academicYear: '2024-2025',
          createdAt: new Date('2024-06-01')
        },
        {
          id: 'fac-conf-2',
          employeeId: '9999',
          name: 'Dr. Conflicting Identity',
          department: 'Mechanical Engineering',
          status: 'Active',
          academicYear: '2025-2026',
          createdAt: new Date('2025-06-01')
        }
      ];

      const req = {
        query: {},
        user: { role: 'admin', id: 'admin-1' }
      };
      const res = createMockRes();

      await publicationController.getPublicationFacultyDirectory(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.ok(res.body.data['2043']);
      assert.strictEqual(res.body.data['2043'].name, 'Dr. Adarsh S V');
      assert.strictEqual(res.body.data['2043'].department, 'Computer Science and Engineering');
      assert.strictEqual(res.body.data['2043'].hasConflict, false);

      // Conflict detection verification
      assert.ok(res.body.data['9999']);
      assert.strictEqual(res.body.data['9999'].hasConflict, true, 'Different department/name on same ID must flag conflict');
    } finally {
      Faculty.findAll = origFindAll;
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 3: Multi-File Co-Authorship & Deduplication Workflow
  // -------------------------------------------------------------
  console.log('\n--- Suite 3: Multi-File Co-Authorship & Publication Deduplication ---');

  await runAsyncTest('3.1 Co-authored publication across two files: 1 Publication created, 2 PublicationFaculty links staged', async () => {
    const origFacultyFindAll = Faculty.findAll;
    const origPubFindAll = Publication.findAll;
    const origPubFacFindAll = PublicationFaculty.findAll;
    const origPubBulkCreate = Publication.bulkCreate;
    const origPubFacBulkCreate = PublicationFaculty.bulkCreate;
    const origTx = sequelize.transaction;

    try {
      Faculty.findAll = async () => [
        {
          id: 'fac-2043',
          employeeId: '2043',
          name: 'Dr. Adarsh S V',
          department: 'Computer Science and Engineering',
          academicYear: '2025-2026'
        },
        {
          id: 'fac-4862',
          employeeId: '4862',
          name: 'Dr. Akanksha Rao',
          department: 'Computer Science and Engineering',
          academicYear: '2025-2026'
        }
      ];

      // No publications exist initially in DB
      Publication.findAll = async () => [];
      PublicationFaculty.findAll = async () => [];

      let mockTxCommitted = false;
      const mockTx = {
        commit: async () => { mockTxCommitted = true; },
        rollback: async () => {}
      };
      sequelize.transaction = async () => mockTx;

      let stagedPublications = [];
      let stagedAssociations = [];

      Publication.bulkCreate = async (records) => {
        stagedPublications = records;
        return records;
      };

      PublicationFaculty.bulkCreate = async (records) => {
        stagedAssociations = records;
        return records;
      };

      const sharedDoi = '10.1109/TII.2024.1234567';
      const sharedTitle = 'Deep Edge AI Sensors For Smart Manufacturing';

      // Simulated batch upload containing rows from 2 different faculty files
      const req = {
        user: { role: 'admin', id: 'admin-1' },
        body: {
          isFacultyWiseBatch: true,
          items: [
            // Row 1 from File 1 (Adarsh 2043)
            {
              sourceFile: '2043_Adarsh_S_V.xlsx',
              employeeId: '2043',
              facultyName: 'Dr. Adarsh S V',
              department: 'Computer Science and Engineering',
              indexing: 'Scopus',
              title: sharedTitle,
              authorName: 'Adarsh S.V., Akanksha R.',
              authorFullNames: 'Adarsh S. V., Akanksha Rao',
              journalName: 'IEEE Transactions on Industrial Informatics',
              publicationYear: '2024',
              citationCount: 15,
              doi: sharedDoi,
              paperUrl: 'https://ieeexplore.ieee.org/document/1234567'
            },
            // Row 2 from File 2 (Akanksha 4862) - SAME paper!
            {
              sourceFile: '4862_Akanksha_Rao.xlsx',
              employeeId: '4862',
              facultyName: 'Dr. Akanksha Rao',
              department: 'Computer Science and Engineering',
              indexing: 'WoS (Web of Science)',
              title: sharedTitle,
              authorName: 'Adarsh S.V., Akanksha R.',
              authorFullNames: 'Adarsh S. V., Akanksha Rao',
              journalName: 'IEEE Transactions on Industrial Informatics',
              publicationYear: '2024',
              citationCount: 15,
              doi: sharedDoi,
              paperUrl: 'https://ieeexplore.ieee.org/document/1234567'
            }
          ]
        }
      };

      const res = createMockRes();
      await publicationController.bulkUploadPublications(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.createdCount, 1, 'Exactly 1 unique publication must be created');
      assert.strictEqual(res.body.linkedCount, 1, 'Second co-author must be counted as existing linked');
      assert.strictEqual(stagedPublications.length, 1, 'Only 1 publication row bulk-inserted');
      assert.strictEqual(stagedAssociations.length, 2, '2 PublicationFaculty association rows bulk-inserted');

      const assocEmpIds = stagedAssociations.map(a => a.employeeId).sort();
      assert.deepStrictEqual(assocEmpIds, ['2043', '4862']);
      assert.strictEqual(stagedAssociations[0].publicationId, stagedPublications[0].id);
      assert.strictEqual(stagedAssociations[1].publicationId, stagedPublications[0].id);
      assert.ok(mockTxCommitted, 'Transaction must be committed');
    } finally {
      Faculty.findAll = origFacultyFindAll;
      Publication.findAll = origPubFindAll;
      PublicationFaculty.findAll = origPubFacFindAll;
      Publication.bulkCreate = origPubBulkCreate;
      PublicationFaculty.bulkCreate = origPubFacBulkCreate;
      sequelize.transaction = origTx;
    }
  });

  await runAsyncTest('3.2 Idempotent Repeat Upload: Repeated file creates 0 publications and skips duplicate associations', async () => {
    const origFacultyFindAll = Faculty.findAll;
    const origPubFindAll = Publication.findAll;
    const origPubFacFindAll = PublicationFaculty.findAll;
    const origTx = sequelize.transaction;

    try {
      Faculty.findAll = async () => [
        {
          id: 'fac-2043',
          employeeId: '2043',
          name: 'Dr. Adarsh S V',
          department: 'Computer Science and Engineering',
          academicYear: '2025-2026'
        }
      ];

      const existingPubId = 'existing-pub-uuid-1';
      const existingDoi = '10.1016/j.jclepro.2024.140890';
      const existingTitle = 'Sustainable High-Volume Fly Ash Concrete Under High Temperatures';

      // Existing Publication in DB
      Publication.findAll = async () => [
        {
          id: existingPubId,
          doi: existingDoi,
          title: existingTitle,
          publicationYear: '2024',
          journalType: 'Scopus'
        }
      ];

      // Existing PublicationFaculty link already in DB
      PublicationFaculty.findAll = async () => [
        {
          publicationId: existingPubId,
          employeeId: '2043'
        }
      ];

      let mockTxRolledBack = false;
      const mockTx = {
        commit: async () => {},
        rollback: async () => { mockTxRolledBack = true; }
      };
      sequelize.transaction = async () => mockTx;

      const req = {
        user: { role: 'admin', id: 'admin-1' },
        body: {
          isFacultyWiseBatch: true,
          items: [
            {
              sourceFile: '2043_Adarsh_S_V.xlsx',
              employeeId: '2043',
              facultyName: 'Dr. Adarsh S V',
              department: 'Computer Science and Engineering',
              indexing: 'Scopus',
              title: existingTitle,
              authorName: 'Adarsh S.V.',
              journalName: 'Journal of Cleaner Production',
              publicationYear: '2024',
              doi: existingDoi
            }
          ]
        }
      };

      const res = createMockRes();
      await publicationController.bulkUploadPublications(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, false, 'Should return success false when nothing new to import');
      assert.strictEqual(res.body.createdCount, 0, 'Must create 0 new publications');
      assert.strictEqual(res.body.linkedCount, 0, 'Must create 0 new links');
      assert.strictEqual(res.body.duplicatesCount, 1, 'Must register 1 duplicate association skipped');
      assert.ok(mockTxRolledBack, 'Must rollback transaction safely');
    } finally {
      Faculty.findAll = origFacultyFindAll;
      Publication.findAll = origPubFindAll;
      PublicationFaculty.findAll = origPubFacFindAll;
      sequelize.transaction = origTx;
    }
  });

  // -------------------------------------------------------------
  // TEST SUITE 4: Strict Year Validation & Empty Field Normalization
  // -------------------------------------------------------------
  console.log('\n--- Suite 4: Strict Validation & Normalization ---');

  await runAsyncTest('4.1 Strict Year Validation: Row missing 4-digit Year is excluded as Needs Review without fabricating year', async () => {
    const origFacultyFindAll = Faculty.findAll;
    const origPubFindAll = Publication.findAll;
    const origPubFacFindAll = PublicationFaculty.findAll;
    const origTx = sequelize.transaction;

    try {
      Faculty.findAll = async () => [
        {
          id: 'fac-2043',
          employeeId: '2043',
          name: 'Dr. Adarsh S V',
          department: 'Computer Science and Engineering',
          academicYear: '2025-2026'
        }
      ];

      Publication.findAll = async () => [];
      PublicationFaculty.findAll = async () => [];

      const mockTx = { commit: async () => {}, rollback: async () => {} };
      sequelize.transaction = async () => mockTx;

      const req = {
        user: { role: 'admin', id: 'admin-1' },
        body: {
          isFacultyWiseBatch: true,
          items: [
            {
              sourceFile: '2043_Adarsh_S_V.xlsx',
              employeeId: '2043',
              facultyName: 'Dr. Adarsh S V',
              department: 'Computer Science and Engineering',
              indexing: 'Scopus',
              title: 'Paper Without Valid 4 Digit Year',
              authorName: 'Adarsh S.V.',
              journalName: 'Test Journal',
              publicationYear: 'Invalid-Year', // Invalid year
              year: '',
              doi: '10.1234/test.no.year'
            }
          ]
        }
      };

      const res = createMockRes();
      await publicationController.bulkUploadPublications(req, res);

      assert.strictEqual(res.body.createdCount, 0, 'No publication should be created');
      assert.strictEqual(res.body.errorsCount, 1, 'Row with invalid year must be flagged as error');
      assert.ok(res.body.errors[0].issues.toLowerCase().includes('year'));
    } finally {
      Faculty.findAll = origFacultyFindAll;
      Publication.findAll = origPubFindAll;
      PublicationFaculty.findAll = origPubFacFindAll;
      sequelize.transaction = origTx;
    }
  });

  await runAsyncTest('4.2 Empty Fields Normalization: Blank strings -> null, explicit 0 citations -> 0', async () => {
    const origFacultyFindAll = Faculty.findAll;
    const origPubFindAll = Publication.findAll;
    const origPubFacFindAll = PublicationFaculty.findAll;
    const origPubBulkCreate = Publication.bulkCreate;
    const origPubFacBulkCreate = PublicationFaculty.bulkCreate;
    const origTx = sequelize.transaction;

    try {
      Faculty.findAll = async () => [
        {
          id: 'fac-2043',
          employeeId: '2043',
          name: 'Dr. Adarsh S V',
          department: 'Computer Science and Engineering',
          academicYear: '2025-2026'
        }
      ];

      Publication.findAll = async () => [];
      PublicationFaculty.findAll = async () => [];

      let stagedPublications = [];
      Publication.bulkCreate = async (records) => {
        stagedPublications = records;
        return records;
      };
      PublicationFaculty.bulkCreate = async () => [];

      const mockTx = { commit: async () => {}, rollback: async () => {} };
      sequelize.transaction = async () => mockTx;

      const req = {
        user: { role: 'admin', id: 'admin-1' },
        body: {
          isFacultyWiseBatch: true,
          items: [
            {
              sourceFile: '2043_Adarsh_S_V.xlsx',
              employeeId: '2043',
              facultyName: 'Dr. Adarsh S V',
              department: 'Computer Science and Engineering',
              indexing: 'Scopus',
              title: 'Field Normalization Verification Paper',
              authorName: 'Adarsh S.V.',
              journalName: 'Test Journal',
              publicationYear: '2024',
              citationCount: 0, // Explicit zero
              doi: '10.5555/norm.test',
              paperUrl: '', // Blank
              publisher: '   ', // Whitespace
              issn: '',
              isbn: '',
              coden: ''
            }
          ]
        }
      };

      const res = createMockRes();
      await publicationController.bulkUploadPublications(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(stagedPublications.length, 1);
      const pub = stagedPublications[0];

      assert.strictEqual(pub.citationCount, 0, 'Explicit 0 citation count must remain 0');
      assert.strictEqual(pub.paperUrl, null, 'Blank URL must be normalized to null');
      assert.strictEqual(pub.publisher, null, 'Whitespace publisher must be normalized to null');
      assert.strictEqual(pub.issn, null, 'Blank issn must be normalized to null');
      assert.strictEqual(pub.isbn, null, 'Blank isbn must be normalized to null');
      assert.strictEqual(pub.coden, null, 'Blank coden must be normalized to null');
    } finally {
      Faculty.findAll = origFacultyFindAll;
      Publication.findAll = origPubFindAll;
      PublicationFaculty.findAll = origPubFacFindAll;
      Publication.bulkCreate = origPubBulkCreate;
      PublicationFaculty.bulkCreate = origPubFacBulkCreate;
      sequelize.transaction = origTx;
    }
  });

  // -------------------------------------------------------------
  // Test Execution Summary
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`  Test Execution Complete: ${passedTests}/${totalTests} Passed`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
