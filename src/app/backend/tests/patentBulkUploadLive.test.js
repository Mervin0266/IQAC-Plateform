'use strict';

const assert = require('assert');
const XLSX = require('xlsx');
const { sequelize } = require('../config/database');
const { Patent, PatentFaculty, Faculty, User } = require('../models');
const patentController = require('../controllers/patentController');
const { generatePatentTemplateBuffer } = require('../services/patentService');

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    }
  };
  return res;
}

async function run() {
  console.log('--- Testing Patent Template Download and Bulk Upload ---');

  let adminUser = await User.findOne({ where: { role: 'admin' } });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Bulk Upload Admin',
      email: 'bulk.admin@christuniversity.in',
      password: 'placeholder_password',
      role: 'admin',
      department: 'IQAC'
    });
  }

  // 1. Test template download
  console.log('Test 1: downloadPatentTemplate');
  const reqTemplate = {};
  const resTemplate = createMockRes();
  await patentController.downloadPatentTemplate(reqTemplate, resTemplate);

  assert.strictEqual(resTemplate.statusCode, 200, 'Template download status should be 200');
  assert(Buffer.isBuffer(resTemplate.body), 'Template download body should be a Buffer');
  assert(resTemplate.body.length > 1000, 'Template buffer should have content');
  console.log('  ✓ [PASS] downloadPatentTemplate returned valid xlsx buffer of length:', resTemplate.body.length);

  // Parse the downloaded template buffer
  const wb = XLSX.read(resTemplate.body, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log('  Template columns:', aoa[0]);
  assert(aoa[0].includes('Title'), 'Template should contain Title header');
  assert(aoa[0].includes('EmpId'), 'Template should contain EmpId header');

  // 2. Prepare a test spreadsheet buffer with 2 patents
  const testWorkbook = XLSX.utils.book_new();
  const testSheetRows = [
    [
      'Title',
      'EmpId',
      'Application No',
      'Patent No',
      'Status',
      'Patent Type',
      'Filing Date',
      'Publication Date',
      'Grant Date',
      'License Date',
      'Commercial Partner',
      'Revenue Generated (INR)',
      'Patent URL',
      'Proof',
      'Abstract'
    ],
    [
      'AI Smart Traffic Controller System',
      'CU_BULK_001',
      'APP_BULK_TEST_991',
      'PAT_BULK_TEST_991',
      'Published',
      'National (Indian)',
      '2024-01-15',
      '2024-08-20',
      '',
      '',
      '',
      '0',
      'https://ipindiaservices.gov.in/publicsearch',
      '',
      'A deep learning intelligent traffic controller apparatus.'
    ],
    [
      'Solar Powered Agricultural Sensor',
      'CU_BULK_002',
      'APP_BULK_TEST_992',
      'PAT_BULK_TEST_992',
      'Granted',
      'National (Indian)',
      '2023-05-10',
      '2023-11-15',
      '2024-06-01',
      '',
      'AgroTech Ltd',
      '150000',
      '',
      '',
      'Autonomous solar sensor for real-time soil moisture monitoring.'
    ]
  ];
  const testWs = XLSX.utils.aoa_to_sheet(testSheetRows);
  XLSX.utils.book_append_sheet(testWorkbook, testWs, 'Sheet1');
  const uploadedBuffer = XLSX.write(testWorkbook, { type: 'buffer', bookType: 'xlsx' });

  // Clean up any old test records
  await Patent.destroy({ where: { applicationNo: ['APP_BULK_TEST_991', 'APP_BULK_TEST_992'] } });

  // 3. Test previewBulkUploadPatents
  console.log('Test 2: previewBulkUploadPatents');
  const reqPreview = {
    file: {
      buffer: uploadedBuffer,
      originalname: 'Patents.xlsx'
    },
    user: adminUser
  };
  const resPreview = createMockRes();
  await patentController.previewBulkUploadPatents(reqPreview, resPreview);

  console.log('  Preview status:', resPreview.statusCode);
  console.log('  Preview summary:', resPreview.body?.summary);
  assert.strictEqual(resPreview.statusCode, 200, 'Preview status should be 200');
  assert.strictEqual(resPreview.body.success, true, 'Preview success should be true');
  assert.strictEqual(resPreview.body.summary.totalRows, 2, 'Total rows should be 2');
  assert.strictEqual(resPreview.body.summary.eligibleCount, 2, 'Eligible count should be 2');
  assert.strictEqual(resPreview.body.rows.length, 2, 'Rows count should be 2');
  assert.strictEqual(resPreview.body.rows[0].data.publicationYear, 2024, 'Row 1 publicationYear should be 2024');
  assert.strictEqual(resPreview.body.rows[1].data.publicationYear, 2023, 'Row 2 publicationYear should be 2023');
  console.log('  ✓ [PASS] previewBulkUploadPatents correctly evaluated 2 rows with derived publication years.');

  // 4. Test importBulkUploadPatents
  console.log('Test 3: importBulkUploadPatents');
  const reqImport = {
    file: {
      buffer: uploadedBuffer,
      originalname: 'Patents.xlsx'
    },
    user: adminUser
  };
  const resImport = createMockRes();
  await patentController.importBulkUploadPatents(reqImport, resImport);

  console.log('  Import status:', resImport.statusCode);
  console.log('  Import body message:', resImport.body?.message);
  console.log('  Import summary:', resImport.body?.summary);
  assert.strictEqual(resImport.statusCode, 200, 'Import status should be 200');
  assert.strictEqual(resImport.body.success, true, 'Import success should be true');
  assert.strictEqual(resImport.body.summary.importedCount, 2, 'Imported count should be 2');

  // Verify records in DB
  const dbPatent1 = await Patent.findOne({ where: { applicationNo: 'APP_BULK_TEST_991' } });
  assert(dbPatent1, 'Patent 1 should exist in DB');
  assert.strictEqual(dbPatent1.publicationYear, 2024, 'DB Patent 1 publicationYear should be 2024');
  assert.strictEqual(dbPatent1.publishedDate, '2024-08-20', 'DB Patent 1 publishedDate should be 2024-08-20');

  const dbPatent2 = await Patent.findOne({ where: { applicationNo: 'APP_BULK_TEST_992' } });
  assert(dbPatent2, 'Patent 2 should exist in DB');
  assert.strictEqual(dbPatent2.publicationYear, 2023, 'DB Patent 2 publicationYear should be 2023');
  assert.strictEqual(parseFloat(dbPatent2.revenue), 150000, 'DB Patent 2 revenue should be 150000');

  // Verify PatentFaculty junction records
  const junctions1 = await PatentFaculty.findAll({ where: { patentId: dbPatent1.id } });
  assert(junctions1.length > 0, 'Patent 1 should have PatentFaculty junction');
  assert.strictEqual(junctions1[0].employeeId, 'CU_BULK_001', 'Junction 1 employeeId should match');

  console.log('  ✓ [PASS] importBulkUploadPatents successfully imported records and created junction table rows.');

  // Clean up
  await PatentFaculty.destroy({ where: { patentId: [dbPatent1.id, dbPatent2.id] } });
  await Patent.destroy({ where: { id: [dbPatent1.id, dbPatent2.id] } });
  console.log('  ✓ Test cleanup completed.');

  console.log('\n================================================================');
  console.log('   ALL TEMPLATE DOWNLOAD & BULK UPLOAD TESTS PASSED (100%)');
  console.log('================================================================');
  process.exit(0);
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
