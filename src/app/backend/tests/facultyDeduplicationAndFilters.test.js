'use strict';

/**
 * CHRIST UNIVERSITY IQAC PLATFORM
 * Faculty Management — Table, Filters & Deduplication Test Suite
 * 
 * Verifies:
 * 1. Exact Designation Filtering: 'Professor' matches only 'Professor', not 'Associate Professor' or 'Assistant Professor'.
 * 2. Gender Filtering: 'Male', 'Female', 'Other' filter strictly; 'All' / 'All Genders' keeps all records including null/undefined.
 * 3. Employee ID Normalization: Preserves string format, whitespace trimming, and leading zeros.
 * 4. Deduplication Across Academic Years:
 *    - In 'All Years' mode: Canonical selection chooses the latest valid academic year.
 *    - In specific AY mode: Canonical selection prioritizes the matching academic year.
 * 5. Distinct Identities with Identical Names: Two faculty with the same name but distinct Employee IDs remain separate records.
 * 6. Identity Conflict Detection: Same Employee ID with differing names or departments flags `hasIdentityConflict: true`.
 * 7. Canonical Natural Sorting: Correctly sorts by employeeId naturally while preserving leading zeros.
 * 8. Controller Integration: `getFaculty` deduplicates candidate records before pagination and returns accurate canonical counts.
 */

const assert = require('assert');
const { Op } = require('sequelize');
const {
  parseAcademicYearStart,
  normalizeEmployeeId,
  deduplicateFacultyRecords,
  sortCanonicalRecords,
  buildFacultyFilterWhere,
  getFaculty
} = require('../controllers/facultyController');
const { Faculty } = require('../models');

console.log('================================================================');
console.log('  CHRIST University IQAC - Faculty Table, Filters & Deduplication Test Suite');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

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

function runSyncTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}\n${err.stack}\n`);
  }
}

// Helper to create mock response object
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

// -------------------------------------------------------------
// Test 1: Designation Exact Matching Logic
// -------------------------------------------------------------
runSyncTest('1. Exact Designation Filtering — Op.iLike without wildcards', () => {
  const req = {
    query: {
      designation: 'Professor'
    },
    user: { role: 'admin' }
  };

  const { where } = buildFacultyFilterWhere(req, {});
  const desigCond = where[Op.and].find(c => c.designation);

  assert.ok(desigCond, 'Where clause should contain designation condition');
  assert.deepStrictEqual(desigCond.designation, { [Op.iLike]: 'Professor' });

  // Simulate SQL iLike exact match evaluation
  const targetPattern = desigCond.designation[Op.iLike].toLowerCase();
  
  const testCases = [
    { desig: 'Professor', expected: true },
    { desig: 'professor', expected: true },
    { desig: 'Associate Professor', expected: false },
    { desig: 'Assistant Professor', expected: false },
    { desig: 'Professor of Practice', expected: false },
    { desig: 'Adjunct Faculty', expected: false }
  ];

  testCases.forEach(({ desig, expected }) => {
    const isMatch = (desig.toLowerCase() === targetPattern);
    assert.strictEqual(
      isMatch,
      expected,
      `Designation "${desig}" match result was ${isMatch}, expected ${expected}`
    );
  });
});

// -------------------------------------------------------------
// Test 2: Gender Filtering and 'All Genders' Null Inclusivity
// -------------------------------------------------------------
runSyncTest('2. Gender Filtering — Strict values and inclusive "All Genders"', () => {
  // Case A: Male filter
  const reqMale = { query: { gender: 'Male' }, user: { role: 'admin' } };
  const whereMale = buildFacultyFilterWhere(reqMale, {}).where;
  const genderCondMale = whereMale[Op.and].find(c => c.gender);
  assert.strictEqual(genderCondMale.gender, 'Male');

  // Case B: Female filter
  const reqFemale = { query: { gender: 'female' }, user: { role: 'admin' } };
  const whereFemale = buildFacultyFilterWhere(reqFemale, {}).where;
  const genderCondFemale = whereFemale[Op.and].find(c => c.gender);
  assert.strictEqual(genderCondFemale.gender, 'Female');

  // Case C: Other filter
  const reqOther = { query: { gender: 'OTHER' }, user: { role: 'admin' } };
  const whereOther = buildFacultyFilterWhere(reqOther, {}).where;
  const genderCondOther = whereOther[Op.and].find(c => c.gender);
  assert.strictEqual(genderCondOther.gender, 'Other');

  // Case D: All Genders filter (Must NOT restrict gender, allowing null/undefined)
  const reqAll = { query: { gender: 'All' }, user: { role: 'admin' } };
  const whereAll = buildFacultyFilterWhere(reqAll, {}).where;
  assert.strictEqual(whereAll[Op.and], undefined, 'Where clause should be empty when gender is All');

  const reqAllGenders = { query: { gender: 'All Genders' }, user: { role: 'admin' } };
  const whereAllGenders = buildFacultyFilterWhere(reqAllGenders, {}).where;
  assert.strictEqual(whereAllGenders[Op.and], undefined, 'Where clause should be empty when gender is All Genders');
});

// -------------------------------------------------------------
// Test 3: Employee ID Normalization & String Preservation
// -------------------------------------------------------------
runSyncTest('3. Employee ID Normalization — Preserves leading zeros and whitespace trimming', () => {
  assert.strictEqual(normalizeEmployeeId(' 002043 '), '002043');
  assert.strictEqual(normalizeEmployeeId('CU-9912'), 'CU-9912');
  assert.strictEqual(normalizeEmployeeId(405), '405');
  assert.strictEqual(normalizeEmployeeId(null), '');
  assert.strictEqual(normalizeEmployeeId(undefined), '');
  assert.strictEqual(typeof normalizeEmployeeId('0012'), 'string');
});

// -------------------------------------------------------------
// Test 4: Deduplication Across Academic Years (Latest AY Selection)
// -------------------------------------------------------------
runSyncTest('4. Deduplication — Selects latest Academic Year in "All Years" view', () => {
  const candidateRows = [
    {
      id: 'uuid-1',
      employeeId: 'CU-101',
      name: 'Dr. Sarah Connor',
      department: 'Computer Science',
      designation: 'Assistant Professor',
      academicYear: '2023-2024',
      createdAt: '2023-08-01T00:00:00.000Z'
    },
    {
      id: 'uuid-2',
      employeeId: 'CU-101',
      name: 'Dr. Sarah Connor',
      department: 'Computer Science',
      designation: 'Associate Professor', // Promoted in 2025
      academicYear: '2025-2026',
      createdAt: '2025-08-01T00:00:00.000Z'
    },
    {
      id: 'uuid-3',
      employeeId: 'CU-101',
      name: 'Dr. Sarah Connor',
      department: 'Computer Science',
      designation: 'Assistant Professor',
      academicYear: '2024-2025',
      createdAt: '2024-08-01T00:00:00.000Z'
    }
  ];

  const deduplicated = deduplicateFacultyRecords(candidateRows, 'All');

  assert.strictEqual(deduplicated.length, 1, 'Should return exactly 1 canonical record');
  assert.strictEqual(deduplicated[0].id, 'uuid-2', 'Should choose 2025-2026 (latest AY) record');
  assert.strictEqual(deduplicated[0].academicYear, '2025-2026');
  assert.strictEqual(deduplicated[0].designation, 'Associate Professor');
});

// -------------------------------------------------------------
// Test 5: Deduplication with Explicit Academic Year Filter
// -------------------------------------------------------------
runSyncTest('5. Deduplication — Prioritizes requested Academic Year when filter is active', () => {
  const candidateRows = [
    {
      id: 'uuid-1',
      employeeId: 'CU-102',
      name: 'Dr. Bruce Banner',
      department: 'Physics',
      designation: 'Associate Professor',
      academicYear: '2023-2024'
    },
    {
      id: 'uuid-2',
      employeeId: 'CU-102',
      name: 'Dr. Bruce Banner',
      department: 'Physics',
      designation: 'Professor',
      academicYear: '2024-2025'
    },
    {
      id: 'uuid-3',
      employeeId: 'CU-102',
      name: 'Dr. Bruce Banner',
      department: 'Physics',
      designation: 'Senior Professor',
      academicYear: '2025-2026'
    }
  ];

  // Requesting AY 2024-2025 specifically
  const deduplicated = deduplicateFacultyRecords(candidateRows, '2024-2025');

  assert.strictEqual(deduplicated.length, 1);
  assert.strictEqual(deduplicated[0].id, 'uuid-2', 'Should prioritize the 2024-2025 record');
  assert.strictEqual(deduplicated[0].academicYear, '2024-2025');
  assert.strictEqual(deduplicated[0].designation, 'Professor');
});

// -------------------------------------------------------------
// Test 6: Same Name, Different Employee IDs (Preserves Distinct Profiles)
// -------------------------------------------------------------
runSyncTest('6. Identity Preservation — Distinct Employee IDs with identical names remain separate', () => {
  const candidateRows = [
    {
      id: 'uuid-10',
      employeeId: '00101',
      name: 'Dr. John Smith',
      department: 'Mathematics',
      designation: 'Associate Professor',
      academicYear: '2025-2026'
    },
    {
      id: 'uuid-11',
      employeeId: '00102', // Different Emp ID
      name: 'Dr. John Smith', // Same name
      department: 'Management',
      designation: 'Assistant Professor',
      academicYear: '2025-2026'
    }
  ];

  const deduplicated = deduplicateFacultyRecords(candidateRows, 'All');

  assert.strictEqual(deduplicated.length, 2, 'Both distinct faculty members must be preserved');
  const empIds = deduplicated.map(f => f.employeeId);
  assert.ok(empIds.includes('00101'));
  assert.ok(empIds.includes('00102'));
});

// -------------------------------------------------------------
// Test 7: Identity Conflict Detection
// -------------------------------------------------------------
runSyncTest('7. Conflict Detection — Same Employee ID with different names/departments is flagged', () => {
  const candidateRows = [
    {
      id: 'uuid-21',
      employeeId: 'CU-5555',
      name: 'Dr. Alice Morgan',
      department: 'Computer Science',
      academicYear: '2024-2025'
    },
    {
      id: 'uuid-22',
      employeeId: 'CU-5555',
      name: 'Dr. Bob Vance', // Conflicting name
      department: 'Mechanical Engineering', // Conflicting dept
      academicYear: '2025-2026'
    }
  ];

  const deduplicated = deduplicateFacultyRecords(candidateRows, 'All');

  assert.strictEqual(deduplicated.length, 1);
  assert.strictEqual(deduplicated[0].hasIdentityConflict, true, 'Conflict flag must be set to true');
});

// -------------------------------------------------------------
// Test 8: Natural Sorting by Employee ID Preserving Leading Zeros
// -------------------------------------------------------------
runSyncTest('8. Natural Sorting — Naturally sorts Employee IDs with leading zeros', () => {
  const records = [
    { id: '1', employeeId: '00100', name: 'Zack' },
    { id: '2', employeeId: '00020', name: 'Alice' },
    { id: '3', employeeId: '00005', name: 'Bob' },
    { id: '4', employeeId: '00020', name: 'Charlie' } // duplicate ID tie-breaker
  ];

  const sortedAsc = sortCanonicalRecords([...records], 'employeeId-asc');
  assert.strictEqual(sortedAsc[0].employeeId, '00005');
  assert.strictEqual(sortedAsc[1].employeeId, '00020');
  assert.strictEqual(sortedAsc[2].employeeId, '00020');
  assert.strictEqual(sortedAsc[3].employeeId, '00100');

  const sortedDesc = sortCanonicalRecords([...records], 'employeeId-desc');
  assert.strictEqual(sortedDesc[0].employeeId, '00100');
  assert.strictEqual(sortedDesc[3].employeeId, '00005');
});

// -------------------------------------------------------------
// Test 9: End-to-End Controller Integration with Mocked Sequelize
// -------------------------------------------------------------
runAsyncTest('9. Controller Integration — getFaculty deduplicates and paginates canonical count', async () => {
  const originalFindAll = Faculty.findAll;

  try {
    // Mock 5 database records representing 3 unique faculty members across multiple years
    Faculty.findAll = async (opts) => {
      if (opts && Array.isArray(opts.attributes) && opts.attributes.includes('academicYear')) {
        return [{ academicYear: '2025-2026' }, { academicYear: '2024-2025' }];
      }

      return [
        // Faculty 1 (2 records)
        {
          id: 'f1-2025',
          employeeId: 'CU-001',
          name: 'Dr. Rajesh Kumar',
          department: 'Computer Science',
          designation: 'Professor',
          academicYear: '2025-2026',
          createdAt: '2025-06-01',
          highestQualification: 'Ph.D.'
        },
        {
          id: 'f1-2024',
          employeeId: 'CU-001',
          name: 'Dr. Rajesh Kumar',
          department: 'Computer Science',
          designation: 'Associate Professor',
          academicYear: '2024-2025',
          createdAt: '2024-06-01',
          highestQualification: 'Ph.D.'
        },
        // Faculty 2 (2 records)
        {
          id: 'f2-2025',
          employeeId: 'CU-002',
          name: 'Dr. Priya Sharma',
          department: 'Electronics',
          designation: 'Assistant Professor',
          academicYear: '2025-2026',
          createdAt: '2025-06-01',
          highestQualification: 'Ph.D.'
        },
        {
          id: 'f2-2024',
          employeeId: 'CU-002',
          name: 'Dr. Priya Sharma',
          department: 'Electronics',
          designation: 'Assistant Professor',
          academicYear: '2024-2025',
          createdAt: '2024-06-01',
          highestQualification: 'Ph.D.'
        },
        // Faculty 3 (1 record)
        {
          id: 'f3-2025',
          employeeId: 'CU-003',
          name: 'Prof. Anil Gupta',
          department: 'Mechanical',
          designation: 'Adjunct Faculty',
          academicYear: '2025-2026',
          createdAt: '2025-06-01',
          highestQualification: 'M.Tech'
        }
      ];
    };

    const req = {
      query: {
        page: '1',
        limit: '10',
        academicYear: 'All'
      },
      user: {
        role: 'admin'
      }
    };

    const res = createMockRes();
    await getFaculty(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    
    // Total count must be 3 unique faculty, NOT 5 raw records!
    assert.strictEqual(res.body.pagination.total, 3, 'Total pagination count must reflect 3 unique canonical faculty');
    assert.strictEqual(res.body.data.length, 3, 'Data page must contain 3 canonical faculty members');

    // Verify Faculty 1 has latest title 'Professor' from 2025-2026
    const rajesh = res.body.data.find(f => f.employeeId === 'CU-001');
    assert.strictEqual(rajesh.designation, 'Professor');
    assert.strictEqual(rajesh.academicYear, '2025-2026');
    assert.strictEqual(rajesh.id, 'f1-2025');

    // Verify stats calculation reflects canonical records
    assert.strictEqual(res.body.stats.total, 3);
    assert.strictEqual(res.body.stats.phdCount, 2); // Rajesh & Priya
    assert.strictEqual(res.body.stats.seniorCadre, 2); // Rajesh & Priya (includes 'professor')
  } finally {
    Faculty.findAll = originalFindAll;
  }
});

// -------------------------------------------------------------
// Run & Report
// -------------------------------------------------------------
(async () => {
  // Give all async tasks a chance to finish
  setTimeout(() => {
    console.log('----------------------------------------------------------------');
    console.log(`Test Execution Complete: ${passedTests}/${totalTests} Passed`);
    console.log('----------------------------------------------------------------\n');
    if (passedTests !== totalTests) {
      process.exit(1);
    }
  }, 200);
})();
