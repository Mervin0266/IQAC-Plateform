'use strict';

const assert = require('assert');
const { Patent, User } = require('../models');
const patentController = require('../controllers/patentController');

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

async function run() {
  console.log('--- Testing Patent Year Filtering ---');

  let adminUser = await User.findOne({ where: { role: 'admin' } });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Filter Test Admin',
      email: 'filter.admin@christuniversity.in',
      password: 'placeholder_password',
      role: 'admin',
      department: 'IQAC'
    });
  }

  // 1. Test filtering by year=all
  console.log('Test 1: Filter with year=all');
  const reqAll = {
    user: adminUser,
    query: { year: 'all', page: '1', limit: '10' }
  };
  const resAll = createMockRes();
  await patentController.getPatents(reqAll, resAll);

  assert.strictEqual(resAll.statusCode, 200, 'Status should be 200');
  assert(resAll.body.count > 0, 'Count should be > 0 for year=all');
  console.log(`  ✓ [PASS] year=all returned total count: ${resAll.body.count}`);

  // 2. Test filtering by year=2024
  console.log('Test 2: Filter with year=2024');
  const req2024 = {
    user: adminUser,
    query: { year: '2024', page: '1', limit: '50' }
  };
  const res2024 = createMockRes();
  await patentController.getPatents(req2024, res2024);

  assert.strictEqual(res2024.statusCode, 200, 'Status should be 200');
  assert(res2024.body.count > 0, 'Count should be > 0 for year=2024 (was failing with 0 previously)');
  assert(res2024.body.rows.length > 0, 'Rows should not be empty for year=2024');
  assert(res2024.body.rows.every(p => p.publicationYear === 2024), 'Every row returned for year=2024 must have publicationYear === 2024');
  console.log(`  ✓ [PASS] year=2024 returned count: ${res2024.body.count}, all rows have publicationYear === 2024`);

  // 3. Test filtering with publicationYear=2025 (verify NO 2026 data leaked!)
  console.log('Test 3: Filter with publicationYear=2025');
  const req2025 = {
    user: adminUser,
    query: { publicationYear: '2025', page: '1', limit: '100' }
  };
  const res2025 = createMockRes();
  await patentController.getPatents(req2025, res2025);

  assert.strictEqual(res2025.statusCode, 200, 'Status should be 200');
  assert(res2025.body.count > 0, 'Count should be > 0 for publicationYear=2025');
  assert(res2025.body.rows.every(p => p.publicationYear === 2025), 'Every row returned for 2025 must have publicationYear === 2025 (no 2026 data)');
  console.log(`  ✓ [PASS] publicationYear=2025 returned count: ${res2025.body.count}, strictly 2025 records with zero 2026 leakage`);

  // 4. Test filtering by missing / blank date
  console.log('Test 4: Filter with year=missing');
  const reqMissing = {
    user: adminUser,
    query: { year: 'missing', page: '1', limit: '50' }
  };
  const resMissing = createMockRes();
  await patentController.getPatents(reqMissing, resMissing);

  assert.strictEqual(resMissing.statusCode, 200, 'Status should be 200');
  assert(resMissing.body.count > 0, 'Count should be > 0 for year=missing');
  resMissing.body.rows.forEach(p => {
    assert.strictEqual(p.publicationYear, null, 'publicationYear should be null for missing filter');
  });
  console.log(`  ✓ [PASS] year=missing returned count: ${resMissing.body.count} (all with publicationYear = null)`);

  // 5. Test academic year range filter: 2023-2024
  console.log('Test 5: Filter with year=2023-2024');
  const reqRange = {
    user: adminUser,
    query: { year: '2023-2024', page: '1', limit: '50' }
  };
  const resRange = createMockRes();
  await patentController.getPatents(reqRange, resRange);

  assert.strictEqual(resRange.statusCode, 200, 'Status should be 200');
  assert(resRange.body.count > 0, 'Count should be > 0 for academic year range 2023-2024');
  console.log(`  ✓ [PASS] year=2023-2024 returned count: ${resRange.body.count}`);

  console.log('\n================================================================');
  console.log('   ALL PATENT YEAR FILTER TESTS PASSED (100%)');
  console.log('================================================================');
  process.exit(0);
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

