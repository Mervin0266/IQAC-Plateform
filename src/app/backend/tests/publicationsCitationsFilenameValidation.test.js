const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
  validateBulkFilename,
  MODULE_ALLOWED_EXTENSIONS
} = require('../utils/publicationFilenameValidator');
const publicationController = require('../controllers/publicationController');
const {
  Publication,
  PublicationFaculty,
  Faculty
} = require('../models');
const { sequelize } = require('../config/database');

let passed = 0;
let total = 0;

function runSyncTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    process.exitCode = 1;
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
    json(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function main() {
  console.log('\n======================================================================');
  console.log('  Publications & Citations Filename Validation + UI Structure Tests');
  console.log('======================================================================\n');

  // ------------------------------------------------------------------
  // 1. Sidebar Order & Citations Stepper Structural Checks
  // ------------------------------------------------------------------
  console.log('--- Suite 1: Sidebar Navigation Order & Citations Stepper ---');

  runSyncTest('1.1 Sidebar places Publications immediately above IPRs in Research & Innovation', () => {
    const sidebarPath = path.join(__dirname, '../../components/Sidebar.tsx');
    const sidebarSrc = fs.readFileSync(sidebarPath, 'utf-8');
    const startIdx = sidebarSrc.indexOf("key: 'research'");
    const endIdx = sidebarSrc.indexOf("key: 'placements-internships'");
    assert.ok(startIdx !== -1 && endIdx !== -1 && endIdx > startIdx, 'Research & Innovation navigation block must exist in Sidebar.tsx');
    const block = sidebarSrc.slice(startIdx, endIdx);

    const metricsIdx = block.indexOf("key: 'research-metrics'");
    const sponsoredIdx = block.indexOf("key: 'sponsored-research'");
    const consultancyIdx = block.indexOf("key: 'consultancy-projects'");
    const publicationsIdx = block.indexOf("key: 'publications'");
    const iprsIdx = block.indexOf("key: 'iprs'");
    const patentsIdx = block.indexOf("key: 'research-innovation'");
    const copyrightsIdx = block.indexOf("key: 'copyrights'");

    assert.ok(metricsIdx !== -1 && sponsoredIdx !== -1 && consultancyIdx !== -1);
    assert.ok(publicationsIdx !== -1 && iprsIdx !== -1 && patentsIdx !== -1 && copyrightsIdx !== -1);
    assert.ok(metricsIdx < sponsoredIdx, 'Research Metrics Grid precedes Sponsored Research');
    assert.ok(sponsoredIdx < consultancyIdx, 'Sponsored Research precedes Consultancy Projects');
    assert.ok(consultancyIdx < publicationsIdx, 'Consultancy Projects precedes Publications');
    assert.ok(publicationsIdx < iprsIdx, 'Publications must appear directly above IPRs');
    assert.ok(iprsIdx < patentsIdx && patentsIdx < copyrightsIdx, 'IPRs contains Patents and Copyrights');
  });

  runSyncTest('1.2 Citations Stepper uses equal 5-column grid without negative -mx-6 clipping', () => {
    const stepperPath = path.join(__dirname, '../../components/CitationsBulkUploadFlow.tsx');
    const stepperSrc = fs.readFileSync(stepperPath, 'utf-8');
    assert.strictEqual(stepperSrc.includes('-mx-6'), false, 'Citations stepper must not use -mx-6 negative margin clipping');
    assert.ok(stepperSrc.includes('grid-cols-5'), 'Citations stepper must use equal 5-column grid layout');
    assert.ok(stepperSrc.includes('aria-label="Citations bulk upload steps"'));
    ['Upload', 'Validation', 'Preview', 'Confirmation', 'Summary'].forEach((label) => {
      assert.ok(stepperSrc.includes(label), `Stepper must contain "${label}" stage`);
    });
  });

  // ------------------------------------------------------------------
  // 2. Standardized Filename Validator: Publications
  // ------------------------------------------------------------------
  console.log('\n--- Suite 2: Standardized Publications Filename Validation ---');

  runSyncTest('2.1 Accepts valid Publications filenames across extensions & multi-underscore names', () => {
    assert.deepStrictEqual(MODULE_ALLOWED_EXTENSIONS.publications, ['xlsx', 'xls', 'csv']);

    const validCases = [
      { file: '3489_Suresh_K_Publications.xlsx', empId: '3489', name: 'Suresh K', ext: 'xlsx' },
      { file: '2043_Adarsh_S_V_Publications.xlsx', empId: '2043', name: 'Adarsh S V', ext: 'xlsx' },
      { file: '00123_Faculty_Name_Publications.csv', empId: '00123', name: 'Faculty Name', ext: 'csv' },
      { file: 'EMP001_John_Doe_publications.xls', empId: 'EMP001', name: 'John Doe', ext: 'xls' },
      { file: 'CU-991_Dr_Smith_Publications.XLSX', empId: 'CU-991', name: 'Dr Smith', ext: 'xlsx' },
      { file: 'folder/dept/F_5432_Prof_Rao_Publications.xlsx', empId: 'F_5432', name: 'Prof Rao', ext: 'xlsx' }
    ];

    for (const tc of validCases) {
      const res = publicationController.validateBulkFilename(tc.file, 'publications');
      assert.strictEqual(res.valid, true, `Expected "${tc.file}" to be valid, got: ${res.error}`);
      assert.strictEqual(res.employeeId, tc.empId);
      assert.strictEqual(res.facultyNameFromFile, tc.name);
      assert.strictEqual(res.extension, tc.ext);
    }
  });

  runSyncTest('2.2 Rejects invalid Publications filenames with exact failure reasons', () => {
    const crossModule = validateBulkFilename('3489_Suresh_K_Citations.xlsx', 'publications');
    assert.strictEqual(crossModule.valid, false);
    assert.strictEqual(crossModule.reasonCode, 'wrong_module');

    const missingModule = validateBulkFilename('3489_Suresh_K.xlsx', 'publications');
    assert.strictEqual(missingModule.valid, false);
    assert.strictEqual(missingModule.reasonCode, 'missing_module_identifier');

    const singularModule = validateBulkFilename('3489_Suresh_K_Publication.xlsx', 'publications');
    assert.strictEqual(singularModule.valid, false);
    assert.strictEqual(singularModule.reasonCode, 'invalid_module_identifier');

    const missingEmpId = validateBulkFilename('Suresh_K_Publications.xlsx', 'publications');
    assert.strictEqual(missingEmpId.valid, false);
    assert.strictEqual(missingEmpId.reasonCode, 'missing_employee_id');

    const missingName = validateBulkFilename('3489_Publications.xlsx', 'publications');
    assert.strictEqual(missingName.valid, false);
    assert.strictEqual(missingName.reasonCode, 'missing_faculty_name');

    const badExt = validateBulkFilename('3489_Suresh_K_Publications.pdf', 'publications');
    assert.strictEqual(badExt.valid, false);
    assert.strictEqual(badExt.reasonCode, 'invalid_extension');

    const tempFile = validateBulkFilename('~$3489_Suresh_K_Publications.xlsx', 'publications');
    assert.strictEqual(tempFile.valid, false);
    assert.strictEqual(tempFile.reasonCode, 'hidden_or_temp_file');
  });

  // ------------------------------------------------------------------
  // 3. Standardized Filename Validator: Citations
  // ------------------------------------------------------------------
  console.log('\n--- Suite 3: Standardized Citations Filename Validation ---');

  runSyncTest('3.1 Accepts valid Citations filenames (.csv and .xlsx only)', () => {
    assert.deepStrictEqual(MODULE_ALLOWED_EXTENSIONS.citations, ['csv', 'xlsx']);

    const validCases = [
      { file: '3489_Suresh_K_Citations.csv', empId: '3489', name: 'Suresh K', ext: 'csv' },
      { file: '2043_Adarsh_S_V_Citations.xlsx', empId: '2043', name: 'Adarsh S V', ext: 'xlsx' },
      { file: '00123_Dr_Sharma_citations.CSV', empId: '00123', name: 'Dr Sharma', ext: 'csv' },
      { file: 'CU-991_Dr_Smith_Citations.xlsx', empId: 'CU-991', name: 'Dr Smith', ext: 'xlsx' }
    ];

    for (const tc of validCases) {
      const res = validateBulkFilename(tc.file, 'citations');
      assert.strictEqual(res.valid, true, `Expected "${tc.file}" to be valid, got: ${res.error}`);
      assert.strictEqual(res.employeeId, tc.empId);
      assert.strictEqual(res.facultyNameFromFile, tc.name);
      assert.strictEqual(res.extension, tc.ext);
    }
  });

  runSyncTest('3.2 Rejects invalid Citations filenames (cross-module, .xls, missing module/ID/name)', () => {
    const crossModule = validateBulkFilename('3489_Suresh_K_Publications.csv', 'citations');
    assert.strictEqual(crossModule.valid, false);
    assert.strictEqual(crossModule.reasonCode, 'wrong_module');

    const legacyXls = validateBulkFilename('3489_Suresh_K_Citations.xls', 'citations');
    assert.strictEqual(legacyXls.valid, false);
    assert.strictEqual(legacyXls.reasonCode, 'invalid_extension');

    const missingModule = validateBulkFilename('3489_Suresh_K.csv', 'citations');
    assert.strictEqual(missingModule.valid, false);
    assert.strictEqual(missingModule.reasonCode, 'missing_module_identifier');

    const singularModule = validateBulkFilename('3489_Suresh_K_Citation.csv', 'citations');
    assert.strictEqual(singularModule.valid, false);
    assert.strictEqual(singularModule.reasonCode, 'invalid_module_identifier');

    const missingEmpId = validateBulkFilename('Suresh_K_Citations.csv', 'citations');
    assert.strictEqual(missingEmpId.valid, false);
    assert.strictEqual(missingEmpId.reasonCode, 'missing_employee_id');

    const missingName = validateBulkFilename('3489_Citations.xlsx', 'citations');
    assert.strictEqual(missingName.valid, false);
    assert.strictEqual(missingName.reasonCode, 'missing_faculty_name');
  });

  // ------------------------------------------------------------------
  // 4. Controller Batch Validation & Isolation Tests
  // ------------------------------------------------------------------
  console.log('\n--- Suite 4: Controller Folder Batch Isolation & Faculty Derivation ---');

  await runAsyncTest('4.1 bulkUploadPublications rejects invalid/wrong-module files while importing valid files and deriving department from Faculty', async () => {
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

      let stagedPubs = [];
      let stagedLinks = [];
      Publication.bulkCreate = async (rows) => { stagedPubs = rows; return rows; };
      PublicationFaculty.bulkCreate = async (rows) => { stagedLinks = rows; return rows; };

      let committed = false;
      sequelize.transaction = async () => ({
        commit: async () => { committed = true; },
        rollback: async () => {}
      });

      const req = {
        user: { role: 'admin', id: 'admin-1' },
        body: {
          isFacultyWiseBatch: true,
          enforceStrictModuleFilename: true,
          items: [
            // Valid file (department intentionally omitted to verify Faculty Directory derivation)
            {
              sourceFile: '2043_Adarsh_S_V_Publications.xlsx',
              title: 'Edge AI Systems in IQAC',
              authorName: 'Adarsh S.V.',
              journalName: 'IEEE Access',
              publicationYear: '2025',
              doi: '10.1109/EDGE.2025.001'
            },
            // Wrong module (_Citations uploaded in Publications)
            {
              sourceFile: '2043_Adarsh_S_V_Citations.xlsx',
              title: 'Wrong Module Paper',
              authorName: 'Adarsh S.V.',
              journalName: 'IEEE Access',
              publicationYear: '2025'
            },
            // Missing module identifier
            {
              sourceFile: '2043_Adarsh_S_V.xlsx',
              title: 'Missing Module Paper',
              authorName: 'Adarsh S.V.',
              journalName: 'IEEE Access',
              publicationYear: '2025'
            },
            // Missing EmpID
            {
              sourceFile: 'Adarsh_S_V_Publications.xlsx',
              title: 'Missing EmpID Paper',
              authorName: 'Adarsh S.V.',
              journalName: 'IEEE Access',
              publicationYear: '2025'
            },
            // Unknown EmpID
            {
              sourceFile: '9999_Ghost_Faculty_Publications.xlsx',
              title: 'Unknown Faculty Paper',
              authorName: 'Ghost',
              journalName: 'IEEE Access',
              publicationYear: '2025'
            }
          ]
        }
      };

      const res = createMockRes();
      await publicationController.bulkUploadPublications(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.createdCount, 1, 'Valid file must create exactly 1 publication');
      assert.strictEqual(res.body.errorsCount, 4, 'All 4 invalid items must be isolated as errors');
      assert.strictEqual(stagedPubs.length, 1);
      assert.strictEqual(stagedPubs[0].department, 'Computer Science and Engineering', 'Department must derive from Faculty Directory');
      assert.strictEqual(stagedLinks.length, 1);
      assert.strictEqual(stagedLinks[0].employeeId, '2043');
      assert.ok(committed);
    } finally {
      Faculty.findAll = origFacultyFindAll;
      Publication.findAll = origPubFindAll;
      PublicationFaculty.findAll = origPubFacFindAll;
      Publication.bulkCreate = origPubBulkCreate;
      PublicationFaculty.bulkCreate = origPubFacBulkCreate;
      sequelize.transaction = origTx;
    }
  });

  await runAsyncTest('4.2 validateAndPreviewCitations isolates invalid filenames while verifying & matching valid Citations files in the same batch', async () => {
    const origFacultyFindAll = Faculty.findAll;
    const origPubFindAll = Publication.findAll;

    try {
      Faculty.findAll = async () => [
        {
          id: 'fac-3489',
          employeeId: '3489',
          name: 'Dr. Suresh K',
          department: 'Chemical Engineering',
          academicYear: '2025-2026'
        }
      ];
      Publication.findAll = async () => [
        {
          id: 'pub-1',
          title: 'Catalytic Flow Reactor Analysis',
          publicationYear: '2023',
          academicYear: '2023-2024',
          issn: '1234-5678',
          journalName: 'Chemical Engineering Science',
          department: 'Chemical Engineering',
          citationCount: 2
        }
      ];

      const validCsv = [
        'Document Title,ISSN,Publication Year,2024,2025,Total',
        'Catalytic Flow Reactor Analysis,1234-5678,2023,3,4,7'
      ].join('\n');

      const req = {
        user: { role: 'admin', id: 'admin-1' },
        body: {
          files: [
            { filename: '3489_Suresh_K_Citations.csv', content: validCsv },
            { filename: '3489_Suresh_K_Publications.csv', content: validCsv },
            { filename: '3489_Suresh_K.csv', content: validCsv },
            { filename: 'Suresh_K_Citations.csv', content: validCsv },
            { filename: '3489_Citations.csv', content: validCsv },
            { filename: '3489_Suresh_K_Citations.xls', content: validCsv },
            { filename: '9999_Unknown_Citations.csv', content: validCsv }
          ]
        }
      };

      const res = createMockRes();
      await publicationController.validateAndPreviewCitations(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.success, true);
      assert.strictEqual(res.body.files.length, 7);

      const validFileSummary = res.body.files.find(f => f.filename === '3489_Suresh_K_Citations.csv');
      assert.strictEqual(validFileSummary.status, 'verified');
      assert.strictEqual(validFileSummary.matchedCount, 1);
      assert.strictEqual(validFileSummary.verifiedFaculty.department, 'Chemical Engineering');

      const rejectedNames = [
        '3489_Suresh_K_Publications.csv',
        '3489_Suresh_K.csv',
        'Suresh_K_Citations.csv',
        '3489_Citations.csv',
        '3489_Suresh_K_Citations.xls'
      ];
      for (const name of rejectedNames) {
        const entry = res.body.files.find(f => f.filename === name);
        assert.strictEqual(entry.status, 'error', `${name} must be rejected at file level`);
        assert.strictEqual(entry.recordCount, 0, `${name} must not parse records into eligible batch`);
      }

      const unknownFacEntry = res.body.files.find(f => f.filename === '9999_Unknown_Citations.csv');
      assert.strictEqual(unknownFacEntry.status, 'warning');
      assert.ok(unknownFacEntry.warning.includes('9999'));

      assert.strictEqual(res.body.summary.eligibleUpdatesCount, 1, 'Only matched record from valid file is eligible');
    } finally {
      Faculty.findAll = origFacultyFindAll;
      Publication.findAll = origPubFindAll;
    }
  });

  console.log('\n======================================================================');
  console.log(`  TEST SUMMARY: ${passed} / ${total} Passed`);
  console.log('======================================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
