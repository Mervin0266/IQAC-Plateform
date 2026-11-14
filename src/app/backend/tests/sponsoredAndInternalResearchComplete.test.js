'use strict';

/**
 * Complete Verification Test Suite for:
 * 1. Sponsored Research -> External Research (18 columns, PI/Co-PI hierarchy, Sanction Year, Duration, 4-part duplicate detection)
 * 2. Sponsored Research -> Internal Research (7 columns, Equal Faculty, Seed Money, Calendar Year, 3-part duplicate detection)
 */

const assert = require('assert');
const XLSX = require('xlsx');
const {
  EXTERNAL_RESEARCH_TEMPLATE_COLUMNS,
  VALID_EXTERNAL_STATUSES,
  parseAndNormalizeEmpIds: parseExternalEmpIds,
  deriveSanctionYear,
  normalizeExternalStatus,
  deriveSchoolAndCampus,
  buildExternalDuplicateKey,
  buildExternalTemplateWorkbook,
  buildExternalTemplateCsv,
  evaluateBulkExternalRows,
  executeBulkImportExternal
} = require('../services/sponsoredResearchService');

const {
  INTERNAL_RESEARCH_TEMPLATE_COLUMNS,
  CONFIGURED_SEED_MONEY_SCHEMES,
  parseAndNormalizeEmpIds: parseInternalEmpIds,
  deriveCalendarYear,
  normalizeSeedMoneyScheme,
  buildInternalDuplicateKey,
  buildInternalTemplateWorkbook,
  buildInternalTemplateCsv,
  evaluateBulkInternalRows,
  executeBulkImportInternal
} = require('../services/internalResearchService');

const { calculateProjectDuration } = require('../utils/projectDurationHelper');
const {
  SponsoredProject,
  SponsoredProjectFaculty,
  InternalResearchProject,
  InternalResearchFaculty,
  Faculty,
  User
} = require('../models');
const { sequelize } = require('../config/database');

async function runTests() {
  console.log('--- STARTING SPONSORED & INTERNAL RESEARCH COMPLETE TESTS ---');

  // TEST 1: Template column structures
  console.log('Test 1: Verifying exact template column counts and headers...');
  assert.strictEqual(EXTERNAL_RESEARCH_TEMPLATE_COLUMNS.length, 18, 'External Research template must have exactly 18 columns');
  assert.strictEqual(EXTERNAL_RESEARCH_TEMPLATE_COLUMNS[0], 'Project Title');
  assert.strictEqual(EXTERNAL_RESEARCH_TEMPLATE_COLUMNS[1], 'Investigators EmpId');
  assert.strictEqual(EXTERNAL_RESEARCH_TEMPLATE_COLUMNS[7], 'Sanction Year');
  assert.strictEqual(EXTERNAL_RESEARCH_TEMPLATE_COLUMNS[10], 'Project Duration');
  assert.strictEqual(EXTERNAL_RESEARCH_TEMPLATE_COLUMNS[17], 'Description');

  assert.strictEqual(INTERNAL_RESEARCH_TEMPLATE_COLUMNS.length, 7, 'Internal Research template must have exactly 7 columns');
  assert.deepStrictEqual(INTERNAL_RESEARCH_TEMPLATE_COLUMNS, [
    'EmpId',
    'Seed Money',
    'Title',
    'Start Date',
    'End Date',
    'Sanctioned Amount',
    'Proof'
  ]);
  console.log('✓ Template columns verified (18 for External, 7 for Internal)');

  // TEST 2: Template workbook generation
  console.log('Test 2: Verifying Excel workbook and CSV generation...');
  const extWb = buildExternalTemplateWorkbook();
  assert.strictEqual(extWb.SheetNames[0], 'External Research Template');
  const extSheet = extWb.Sheets['External Research Template'];
  const extData = XLSX.utils.sheet_to_json(extSheet, { header: 1 });
  assert.strictEqual(extData[0].length, 18);

  const extCsv = buildExternalTemplateCsv();
  assert.ok(extCsv.includes('Project Title,Investigators EmpId,Funding Agency'));

  const intWb = buildInternalTemplateWorkbook();
  assert.strictEqual(intWb.SheetNames[0], 'Internal Research Template');
  const intSheet = intWb.Sheets['Internal Research Template'];
  const intData = XLSX.utils.sheet_to_json(intSheet, { header: 1 });
  assert.strictEqual(intData[0].length, 7);

  const intCsv = buildInternalTemplateCsv();
  assert.ok(intCsv.includes('EmpId,Seed Money,Title,Start Date,End Date,Sanctioned Amount,Proof'));
  console.log('✓ Workbooks and CSV streams generated successfully');

  // TEST 3: External Multi-Investigator PI / Co-PI parsing
  console.log('Test 3: Verifying External PI / Co-PI position hierarchy...');
  const parsedExt = parseExternalEmpIds(' 3489 , 2043, 1672 , 2043 ');
  assert.strictEqual(parsedExt.piEmpId, '3489', 'First EmpId must be PI');
  assert.deepStrictEqual(parsedExt.coPiEmpIds, ['2043', '1672'], 'Subsequent EmpIds must be Co-PIs in order');
  assert.deepStrictEqual(parsedExt.duplicateEmpIds, ['2043'], 'Duplicates must be captured');
  assert.strictEqual(parsedExt.hasDuplicates, true);
  console.log('✓ External PI / Co-PI ordering and deduplication verified');

  // TEST 4: Internal Multi-Faculty Equal parsing
  console.log('Test 4: Verifying Internal Equal Faculty parsing (no PI / Co-PI)...');
  const parsedInt = parseInternalEmpIds('4241, 1899, 2295');
  assert.deepStrictEqual(parsedInt.empIds, ['4241', '1899', '2295']);
  assert.strictEqual(parsedInt.piEmpId, undefined, 'Internal research must not have PI designation');
  console.log('✓ Internal Equal Faculty parsing verified');

  // TEST 5: Date and Duration Derivations
  console.log('Test 5: Verifying calendar year and duration calculations...');
  assert.strictEqual(deriveSanctionYear('2024-07-18'), 2024);
  assert.strictEqual(deriveCalendarYear('2025-01-10'), 2025);

  const dur1 = calculateProjectDuration('2024-07-01', '2027-07-01');
  assert.strictEqual(dur1.isValid, true);
  assert.strictEqual(dur1.years, 3);
  assert.strictEqual(dur1.formatted, '3 Years (36 Months)');

  const durInvalid = calculateProjectDuration('2025-01-01', '2024-01-01');
  assert.strictEqual(durInvalid.isValid, false);
  console.log('✓ Date and Duration derivations verified');

  // TEST 6: Duplicate detection keys
  console.log('Test 6: Verifying 4-part and 3-part duplicate detection keys...');
  const extKey1 = buildExternalDuplicateKey('AI Microgrid', 'DST', '2024-06-15', ['2295', '4241']);
  const extKey2 = buildExternalDuplicateKey('ai microgrid', 'dst', '2024-06-15', ['4241', '2295']);
  assert.strictEqual(extKey1, extKey2, 'External duplicate key must be case-insensitive and unordered for investigators');

  const intKey1 = buildInternalDuplicateKey('Smart IoT Node', 'MRP', '2024-07-01', ['1899', '2295']);
  const intKey2 = buildInternalDuplicateKey('smart iot node', 'mrp', '2024-07-01', ['2295', '1899']);
  assert.strictEqual(intKey1, intKey2, 'Internal duplicate key must be case-insensitive and unordered for faculty');
  console.log('✓ Duplicate detection keys verified');

  // TEST 7: Database Faculty Lookup & Evaluation
  console.log('Test 7: Testing database integration and row evaluation...');
  const faculties = await Faculty.findAll({ limit: 5 });
  console.log(`Found ${faculties.length} faculties in database for evaluation`);
  assert.ok(faculties.length >= 2, 'Should have at least 2 faculties in DB');

  const validEmpId1 = faculties[0].employeeId;
  const validEmpId2 = faculties[1].employeeId;

  // External evaluation test
  const extRowsToEval = [
    {
      'Project Title': 'Autonomous Navigation Robot for Agricultural Monitoring',
      'Investigators EmpId': `${validEmpId1}, ${validEmpId2}`,
      'Funding Agency': 'DST',
      'Scheme / Program': 'Core Research Grant',
      'Agency Type': 'Government (National)',
      'Sanction Order No': 'DST/TEST/2026/01',
      'Sanction Date': '2024-06-15',
      'Start Date': '2024-07-01',
      'End Date': '2026-06-30',
      'Sanctioned Amount (INR)': 2500000,
      'Amount Received (INR)': 1000000,
      'Status': 'Ongoing'
    },
    {
      // Row with invalid PI (999999) and valid Co-PI
      'Project Title': 'Unresolved PI Project Test',
      'Investigators EmpId': `999999, ${validEmpId2}`,
      'Funding Agency': 'SERB',
      'Sanction Date': '2024-08-10',
      'Sanctioned Amount (INR)': 1500000,
      'Status': 'Ongoing'
    }
  ];

  const extEval = await evaluateBulkExternalRows({
    rows: extRowsToEval,
    user: { id: 1 },
    Faculty,
    SponsoredProject
  });

  assert.strictEqual(extEval.totalRows, 2);
  assert.strictEqual(extEval.rows[0].rowStatus, 'VALID');
  assert.strictEqual(extEval.rows[0].piFaculty.employeeId, validEmpId1);
  assert.strictEqual(extEval.rows[0].facultyAssociations.length, 2);
  assert.strictEqual(extEval.rows[0].facultyAssociations[0].role, 'PI');
  assert.strictEqual(extEval.rows[0].facultyAssociations[1].role, 'Co-PI');

  // Unresolved PI row
  assert.strictEqual(extEval.rows[1].hasUnresolvedPI, true);
  assert.strictEqual(extEval.rows[1].rowStatus, 'SKIPPED_INVALID_EMPID');
  assert.strictEqual(extEval.rows[1].facultyAssociations[1].role, 'Co-PI', 'Valid second EmpId must NOT be auto-promoted to PI!');
  console.log('✓ External row evaluation and unresolved PI protection verified');

  // Internal evaluation test
  const intRowsToEval = [
    {
      'EmpId': `${validEmpId1}, ${validEmpId2}`,
      'Seed Money': 'Centre for Research - Seed Money Project (MRP)',
      'Title': 'Internal IoT Smart Waste Sorter',
      'Start Date': '2024-09-01',
      'End Date': '2025-08-31',
      'Sanctioned Amount': 300000,
      'Proof': 'https://drive.google.com/file/d/test123'
    },
    {
      // Row with all invalid EmpIds
      'EmpId': '888888, 999999',
      'Seed Money': 'Faculty Research Grant (FRG)',
      'Title': 'All Invalid Faculty Internal Test',
      'Start Date': '2024-10-01',
      'Sanctioned Amount': 200000
    }
  ];

  const intEval = await evaluateBulkInternalRows({
    rows: intRowsToEval,
    user: { id: 1 },
    Faculty,
    InternalResearchProject
  });

  assert.strictEqual(intEval.totalRows, 2);
  assert.strictEqual(intEval.rows[0].rowStatus, 'VALID');
  assert.strictEqual(intEval.rows[0].calendarYear, 2024);
  assert.strictEqual(intEval.rows[0].facultyAssociations[0].isValid, true);
  assert.strictEqual(intEval.rows[0].facultyAssociations[0].role, undefined, 'Internal faculty must have NO PI/Co-PI role');

  assert.strictEqual(intEval.rows[1].rowStatus, 'SKIPPED_INVALID_EMPID');
  assert.strictEqual(intEval.skippedInvalidEmpIdCount, 1);
  console.log('✓ Internal row evaluation verified');

  // TEST 8: Atomic Import & Foreign Key Associations
  console.log('Test 8: Testing atomic bulk import in database transactions...');
  const adminUser = await User.findOne({ where: { role: 'admin' } });
  assert.ok(adminUser, 'Admin user must exist in DB');

  // Import valid external project
  const extImportResult = await executeBulkImportExternal({
    evaluatedRows: [extEval.rows[0]],
    user: adminUser,
    sequelize,
    SponsoredProject,
    SponsoredProjectFaculty,
    SponsoredResearchDocument: null
  });
  assert.strictEqual(extImportResult.successfulImports, 1);
  const createdExtId = extImportResult.importedProjectIds[0];

  const reloadedExt = await SponsoredProject.findByPk(createdExtId, {
    include: [{ model: SponsoredProjectFaculty, as: 'facultyAssociations' }]
  });
  assert.strictEqual(reloadedExt.facultyAssociations.length, 2);
  const reloadedPi = reloadedExt.facultyAssociations.find(a => a.role === 'PI');
  const reloadedCoPi = reloadedExt.facultyAssociations.find(a => a.role === 'Co-PI');
  assert.strictEqual(reloadedPi.employeeId, validEmpId1);
  assert.strictEqual(reloadedCoPi.employeeId, validEmpId2);

  // Import valid internal project
  const intImportResult = await executeBulkImportInternal({
    evaluatedRows: [intEval.rows[0]],
    user: adminUser,
    sequelize,
    InternalResearchProject,
    InternalResearchFaculty
  });
  assert.strictEqual(intImportResult.successfulImports, 1);
  const createdIntId = intImportResult.importedProjectIds[0];

  const reloadedInt = await InternalResearchProject.findByPk(createdIntId, {
    include: [{ model: InternalResearchFaculty, as: 'facultyAssociations' }]
  });
  assert.strictEqual(reloadedInt.facultyAssociations.length, 2);
  assert.strictEqual(reloadedInt.calendarYear, 2024);
  assert.strictEqual(reloadedInt.seedMoney, 'Centre for Research - Seed Money Project (MRP)');

  console.log('✓ Database records and relational associations imported cleanly');

  // Clean up created test records
  await SponsoredProjectFaculty.destroy({ where: { projectId: createdExtId } });
  await SponsoredProject.destroy({ where: { id: createdExtId } });
  await InternalResearchFaculty.destroy({ where: { projectId: createdIntId } });
  await InternalResearchProject.destroy({ where: { id: createdIntId } });
  console.log('✓ Cleaned up test records');

  // TEST 9: Existing records verification
  console.log('Test 9: Verifying existing database records are preserved...');
  const countExt = await SponsoredProject.count();
  console.log(`Current existing Sponsored Projects in DB: ${countExt}`);
  assert.ok(countExt >= 5, 'All original sponsored projects must be preserved intact!');

  console.log('--- ALL SPONSORED & INTERNAL RESEARCH BACKEND TESTS PASSED (100%) ---');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
