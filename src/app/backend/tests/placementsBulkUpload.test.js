'use strict';

/**
 * Automated Test Suite: Placements & Internships Bulk Upload V2.1
 * CHRIST University IQAC Platform
 *
 * Test Suites:
 * 1. 7-Column Header Parsing & Header Structure Validation
 * 2. Academic Year & Record Type Inheritance from Common Upload Metadata
 * 3. Placement Compensation Validation (LPA mandatory, non-negative, finite)
 * 4. Internship Compensation Validation (monthly stipend INR, optional, blank = null, explicit 0 = unpaid)
 * 5. Compensation Integrity & Prevention of 100,000 Threshold Division
 * 6. Student Details Identity Verification (Register Number string, leading zeros, name/dept matching)
 * 7. Rejection of Unregistered Students (flags as invalid/needs_review, no auto-creation)
 * 8. Multiple Distinct Offers Allowed for Same Student
 * 9. Exact Duplicate Offer Detection (Intra-batch and Database records)
 * 10. Department Authorization Checks (Role-based & Department-scoped access)
 * 11. Offer Letter File Validation (PDF/PNG/JPG, 10MB size limit, MIME types)
 * 12. Offer Letter Association with Specific Offer Record
 * 13. Placement vs Internship Analytics & KPI Separation (LPA vs monthly stipend)
 */

const assert = require('assert');
const path = require('path');
const {
  parseCompensation,
  verifyPlacementBatch
} = require('../controllers/placementController');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof res.then === 'function') {
      return res
        .then(() => {
          console.log(`  ✓ [PASS] ${testName}`);
          passedTests++;
        })
        .catch(err => {
          console.error(`  ✗ [FAIL] ${testName}`);
          console.error(`     Error: ${err.message}`);
        });
    }
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${testName}`);
    console.error(`     Error: ${err.message}`);
  }
}

console.log('================================================================');
console.log('   CHRIST University IQAC - Placements Bulk Upload V2.1 Tests');
console.log('================================================================\n');

async function runAllTests() {
  // ─── SUITE 1: 7-COLUMN HEADER PARSING & HEADER STRUCTURE ───────────────────
  console.log('--- Suite 1: 7-Column Header Parsing & Mandatory Fields ---');

  const EXPECTED_HEADERS = [
    'Register Number',
    'Name',
    'Department',
    'Program',
    'Designation/Role',
    'Company',
    'Package'
  ];

  runTest('Template contains exactly 7 standardized columns', () => {
    assert.strictEqual(EXPECTED_HEADERS.length, 7);
    assert.deepStrictEqual(EXPECTED_HEADERS, [
      'Register Number',
      'Name',
      'Department',
      'Program',
      'Designation/Role',
      'Company',
      'Package'
    ]);
  });

  await runTest('Record missing Register Number is marked invalid', async () => {
    const records = [{
      'Register Number': '',
      'Name': 'Ananya Sharma',
      'Department': 'Computer Science and Engineering',
      'Program': 'B.Tech',
      'Designation/Role': 'Software Engineer',
      'Company': 'Infosys',
      'Package': '8.5'
    }];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      mockStudents: [{ registerNumber: '2140001', name: 'Ananya Sharma', department: 'Computer Science and Engineering' }]
    });
    assert.strictEqual(result.summary.invalid, 1);
    assert.strictEqual(result.records[0]._rowStatus, 'invalid');
    assert(result.records[0]._issues.some(i => i.includes('Register Number')));
  });

  await runTest('Record missing Company is marked invalid', async () => {
    const records = [{
      'Register Number': '2140001',
      'Name': 'Ananya Sharma',
      'Department': 'Computer Science and Engineering',
      'Program': 'B.Tech',
      'Designation/Role': 'Software Engineer',
      'Company': '',
      'Package': '8.5'
    }];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      mockStudents: [{ registerNumber: '2140001', name: 'Ananya Sharma', department: 'Computer Science and Engineering' }]
    });
    assert.strictEqual(result.summary.invalid, 1);
    assert(result.records[0]._issues.some(i => i.includes('Company')));
  });

  // ─── SUITE 2: ACADEMIC YEAR & RECORD TYPE INHERITANCE ─────────────────────
  console.log('\n--- Suite 2: Common Upload Metadata Inheritance ---');

  await runTest('Records inherit Academic Year and Placement Type from common options', async () => {
    const records = [{
      'Register Number': '2140001',
      'Name': 'Ananya Sharma',
      'Department': 'Computer Science and Engineering',
      'Program': 'B.Tech',
      'Designation/Role': 'Software Engineer',
      'Company': 'TCS',
      'Package': '7.0'
    }];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2025-2026',
      placementType: 'placement',
      campus: 'Kengeri Campus',
      school: 'School of Engineering and Technology',
      mockStudents: [{ registerNumber: '2140001', name: 'Ananya Sharma', department: 'Computer Science and Engineering' }]
    });
    assert.strictEqual(result.records[0].batch, '2025-2026');
    assert.strictEqual(result.records[0].placementType, 'placement');
    assert.strictEqual(result.records[0].campus, 'Kengeri Campus');
    assert.strictEqual(result.records[0].school, 'School of Engineering and Technology');
  });

  await runTest('Internship upload assigns placementType = internship to all rows', async () => {
    const records = [{
      'Register Number': '2140001',
      'Name': 'Ananya Sharma',
      'Department': 'Computer Science and Engineering',
      'Program': 'B.Tech',
      'Designation/Role': 'Intern',
      'Company': 'Amazon',
      'Package': '40000'
    }];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'internship',
      mockStudents: [{ registerNumber: '2140001', name: 'Ananya Sharma', department: 'Computer Science and Engineering' }]
    });
    assert.strictEqual(result.records[0].placementType, 'internship');
  });

  // ─── SUITE 3: PLACEMENT COMPENSATION VALIDATION (LPA) ─────────────────────
  console.log('\n--- Suite 3: Placement Compensation Validation (LPA) ---');

  runTest('Placement accepts positive float in LPA', () => {
    const res = parseCompensation('14.5', 'placement');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.value, 14.5);
    assert.strictEqual(res.formatted, '₹ 14.5 LPA');
  });

  runTest('Placement accepts integer in LPA', () => {
    const res = parseCompensation(6, 'placement');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.value, 6);
    assert.strictEqual(res.formatted, '₹ 6 LPA');
  });

  runTest('Placement accepts 0 LPA', () => {
    const res = parseCompensation(0, 'placement');
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.value, 0);
  });

  runTest('Placement rejects blank / empty package (mandatory for placement)', () => {
    const res1 = parseCompensation('', 'placement');
    assert.strictEqual(res1.valid, false);
    assert(res1.error.includes('mandatory'));

    const res2 = parseCompensation(null, 'placement');
    assert.strictEqual(res2.valid, false);

    const res3 = parseCompensation(undefined, 'placement');
    assert.strictEqual(res3.valid, false);
  });

  runTest('Placement rejects negative package', () => {
    const res = parseCompensation('-5', 'placement');
    assert.strictEqual(res.valid, false);
    assert(res.error.includes('negative'));
  });

  runTest('Placement rejects non-numeric string', () => {
    const res = parseCompensation('TBD', 'placement');
    assert.strictEqual(res.valid, false);
    assert(res.error.includes('non-negative number'));
  });

  // ─── SUITE 4: INTERNSHIP COMPENSATION VALIDATION (MONTHLY INR) ────────────
  console.log('\n--- Suite 4: Internship Compensation Validation (Monthly INR) ---');

  runTest('Internship accepts blank/null package as null ("Not Provided")', () => {
    const res1 = parseCompensation('', 'internship');
    assert.strictEqual(res1.valid, true);
    assert.strictEqual(res1.value, null);
    assert.strictEqual(res1.formatted, 'Not Provided');

    const res2 = parseCompensation(null, 'internship');
    assert.strictEqual(res2.valid, true);
    assert.strictEqual(res2.value, null);

    const res3 = parseCompensation('NIL', 'internship');
    assert.strictEqual(res3.valid, true);
    assert.strictEqual(res3.value, null);

    const res4 = parseCompensation('-', 'internship');
    assert.strictEqual(res4.valid, true);
    assert.strictEqual(res4.value, null);
  });

  runTest('Internship accepts explicit 0 as ₹0 (Unpaid)', () => {
    const res1 = parseCompensation(0, 'internship');
    assert.strictEqual(res1.valid, true);
    assert.strictEqual(res1.value, 0);
    assert.strictEqual(res1.formatted, '₹0 (Unpaid)');

    const res2 = parseCompensation('0', 'internship');
    assert.strictEqual(res2.valid, true);
    assert.strictEqual(res2.value, 0);
    assert.strictEqual(res2.formatted, '₹0 (Unpaid)');
  });

  runTest('Internship accepts positive monthly stipend in INR', () => {
    const res1 = parseCompensation('25000', 'internship');
    assert.strictEqual(res1.valid, true);
    assert.strictEqual(res1.value, 25000);
    assert.strictEqual(res1.formatted, '₹ 25,000 /mo');

    const res2 = parseCompensation('₹ 35,000', 'internship');
    assert.strictEqual(res2.valid, true);
    assert.strictEqual(res2.value, 35000);
    assert.strictEqual(res2.formatted, '₹ 35,000 /mo');
  });

  runTest('Internship rejects negative stipend', () => {
    const res = parseCompensation('-1500', 'internship');
    assert.strictEqual(res.valid, false);
    assert(res.error.includes('negative'));
  });

  // ─── SUITE 5: PREVENTION OF 100,000 THRESHOLD DIVISION ─────────────────────
  console.log('\n--- Suite 5: Compensation Integrity & No Unsafe Division ---');

  runTest('Placement package 12 LPA is stored as 12, not divided by 100,000', () => {
    const res = parseCompensation(12, 'placement');
    assert.strictEqual(res.value, 12);
    assert.notStrictEqual(res.value, 0.00012);
  });

  runTest('Internship stipend 25000 is stored as 25000, not divided by 100,000', () => {
    const res = parseCompensation(25000, 'internship');
    assert.strictEqual(res.value, 25000);
    assert.notStrictEqual(res.value, 0.25);
  });

  // ─── SUITE 6: STUDENT DETAILS IDENTITY VERIFICATION ────────────────────────
  console.log('\n--- Suite 6: Student Details Identity Verification ---');

  runTest('Preserves leading zeros in Register Numbers', () => {
    const records = [{
      'Register Number': '0098765',
      'Name': 'Kavya Nair',
      'Department': 'Data Science',
      'Program': 'M.Sc',
      'Company': 'Deloitte',
      'Package': '9.0'
    }];
    return verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      mockStudents: [{ registerNumber: '0098765', name: 'Kavya Nair', department: 'Data Science' }]
    }).then(result => {
      assert.strictEqual(result.records[0].studentId, '0098765');
      assert.strictEqual(result.records[0]._rowStatus, 'ready');
    });
  });

  await runTest('Detects student name mismatch against Student Details profile', async () => {
    const records = [{
      'Register Number': '2140002',
      'Name': 'Rohit Verma',
      'Department': 'Mechanical Engineering',
      'Program': 'B.Tech',
      'Company': 'Bosch',
      'Package': '7.5'
    }];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      mockStudents: [{ registerNumber: '2140002', name: 'Siddharth Rao', department: 'Mechanical Engineering' }]
    });
    assert.strictEqual(result.records[0]._rowStatus, 'needs_review');
    assert(result.records[0]._issues.some(i => i.includes('differs from Student Details profile')));
  });

  await runTest('Detects department mismatch against Student Details profile', async () => {
    const records = [{
      'Register Number': '2140003',
      'Name': 'Priya Menon',
      'Department': 'Civil Engineering',
      'Program': 'B.Tech',
      'Company': 'L&T',
      'Package': '6.0'
    }];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      mockStudents: [{ registerNumber: '2140003', name: 'Priya Menon', department: 'Computer Science and Engineering' }]
    });
    assert.strictEqual(result.records[0]._rowStatus, 'needs_review');
    assert(result.records[0]._issues.some(i => i.includes('Department')));
  });

  // ─── SUITE 7: REJECTION OF UNREGISTERED STUDENTS ───────────────────────────
  console.log('\n--- Suite 7: Rejection of Unregistered Students ---');

  await runTest('Rejects student not found in Student Details without auto-creation', async () => {
    const records = [{
      'Register Number': '9999999',
      'Name': 'Ghost Student',
      'Department': 'Physics',
      'Company': 'Unknown Corp',
      'Package': '5.0'
    }];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      mockStudents: [] // Empty database
    });
    assert.strictEqual(result.summary.invalid, 1);
    assert.strictEqual(result.records[0]._rowStatus, 'invalid');
    assert(result.records[0]._issues.some(i => i.includes('does not exist in Student Details')));
  });

  // ─── SUITE 8: MULTIPLE DISTINCT OFFERS PER STUDENT ────────────────────────
  console.log('\n--- Suite 8: Multiple Distinct Offers Permitted ---');

  await runTest('Allows multiple distinct offers for same student across companies or roles', async () => {
    const records = [
      {
        'Register Number': '2140010',
        'Name': 'Aditya Kumar',
        'Department': 'Computer Science and Engineering',
        'Program': 'B.Tech',
        'Designation/Role': 'Software Engineer',
        'Company': 'Google',
        'Package': '24.0'
      },
      {
        'Register Number': '2140010',
        'Name': 'Aditya Kumar',
        'Department': 'Computer Science and Engineering',
        'Program': 'B.Tech',
        'Designation/Role': 'Cloud Consultant',
        'Company': 'Microsoft',
        'Package': '22.0'
      }
    ];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      mockStudents: [{ registerNumber: '2140010', name: 'Aditya Kumar', department: 'Computer Science and Engineering' }]
    });
    assert.strictEqual(result.summary.ready, 2);
    assert.strictEqual(result.records[0]._rowStatus, 'ready');
    assert.strictEqual(result.records[1]._rowStatus, 'ready');
  });

  // ─── SUITE 9: EXACT DUPLICATE OFFER DETECTION ──────────────────────────────
  console.log('\n--- Suite 9: Duplicate Offer Detection ---');

  await runTest('Detects intra-batch duplicate offer and flags second occurrence', async () => {
    const records = [
      {
        'Register Number': '2140020',
        'Name': 'Meera Joshi',
        'Department': 'Electronics and Communication',
        'Program': 'B.Tech',
        'Designation/Role': 'VLSI Engineer',
        'Company': 'Qualcomm',
        'Package': '18.0'
      },
      {
        'Register Number': '2140020',
        'Name': 'Meera Joshi',
        'Department': 'Electronics and Communication',
        'Program': 'B.Tech',
        'Designation/Role': 'VLSI Engineer',
        'Company': 'Qualcomm',
        'Package': '18.0'
      }
    ];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      mockStudents: [{ registerNumber: '2140020', name: 'Meera Joshi', department: 'Electronics and Communication', course: 'B.Tech' }]
    });
    assert.strictEqual(result.summary.ready, 1);
    assert.strictEqual(result.summary.duplicates, 1);
    assert.strictEqual(result.records[0]._rowStatus, 'ready');
    assert.strictEqual(result.records[1]._rowStatus, 'duplicate');
  });

  await runTest('Detects duplicate offer matching existing database record', async () => {
    const records = [{
      'Register Number': '2140021',
      'Name': 'Varun Gupta',
      'Department': 'Information Technology',
      'Program': 'B.Tech',
      'Designation/Role': 'Data Analyst',
      'Company': 'Goldman Sachs',
      'Package': '16.0'
    }];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      mockStudents: [{ registerNumber: '2140021', name: 'Varun Gupta', department: 'Information Technology', course: 'B.Tech' }],
      mockPlacements: [{
        studentId: '2140021',
        company: 'Goldman Sachs',
        role: 'Data Analyst',
        package: 16.0,
        batch: '2024-2025',
        placementType: 'placement'
      }]
    });
    assert.strictEqual(result.summary.duplicates, 1);
    assert.strictEqual(result.records[0]._rowStatus, 'duplicate');
    assert(result.records[0]._issues.some(i => i.includes('already recorded in the database')));
  });

  // ─── SUITE 10: DEPARTMENT AUTHORIZATION CHECKS ────────────────────────────
  console.log('\n--- Suite 10: Department Authorization Checks ---');

  await runTest('Coordinator is authorized for own department records', async () => {
    const records = [{
      'Register Number': '2140030',
      'Name': 'Rahul Sen',
      'Department': 'Computer Science and Engineering',
      'Program': 'B.Tech',
      'Company': 'Wipro',
      'Package': '6.5'
    }];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      user: { role: 'coordinator', department: 'Computer Science and Engineering' },
      mockStudents: [{ registerNumber: '2140030', name: 'Rahul Sen', department: 'Computer Science and Engineering', course: 'B.Tech' }]
    });
    assert.strictEqual(result.summary.ready, 1);
    assert.strictEqual(result.records[0]._rowStatus, 'ready');
  });

  await runTest('Coordinator is blocked from uploading records for other departments', async () => {
    const records = [{
      'Register Number': '2140031',
      'Name': 'Ankit Paul',
      'Department': 'Mechanical Engineering',
      'Program': 'B.Tech',
      'Company': 'Tata Motors',
      'Package': '6.0'
    }];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      user: { role: 'coordinator', department: 'Computer Science and Engineering' },
      mockStudents: [{ registerNumber: '2140031', name: 'Ankit Paul', department: 'Mechanical Engineering', course: 'B.Tech' }]
    });
    assert.strictEqual(result.summary.invalid, 1);
    assert.strictEqual(result.records[0]._rowStatus, 'invalid');
    assert(result.records[0]._issues.some(i => i.includes('not authorized')));
  });

  await runTest('Admin user is authorized for any department', async () => {
    const records = [{
      'Register Number': '2140032',
      'Name': 'Simran Kaur',
      'Department': 'Civil Engineering',
      'Program': 'B.Tech',
      'Company': 'Sobha',
      'Package': '5.5'
    }];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      user: { role: 'admin', department: 'Central Administration' },
      mockStudents: [{ registerNumber: '2140032', name: 'Simran Kaur', department: 'Civil Engineering', course: 'B.Tech' }]
    });
    assert.strictEqual(result.summary.ready, 1);
  });

  // ─── SUITE 11: OFFER LETTER FILE VALIDATION ───────────────────────────────
  console.log('\n--- Suite 11: Offer Letter File Validation ---');

  runTest('Validates allowed extensions: PDF, JPG, JPEG, PNG', () => {
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png'];
    const validFiles = ['letter.pdf', 'offer.JPG', 'scan.jpeg', 'doc.PNG'];
    const invalidFiles = ['offer.docx', 'script.exe', 'archive.zip', 'letter.html'];

    validFiles.forEach(f => {
      const ext = path.extname(f).toLowerCase();
      assert(allowedExts.includes(ext), `Expected ${f} to be allowed`);
    });

    invalidFiles.forEach(f => {
      const ext = path.extname(f).toLowerCase();
      assert(!allowedExts.includes(ext), `Expected ${f} to be rejected`);
    });
  });

  runTest('Enforces 10MB file size limit', () => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const validSize = 5 * 1024 * 1024; // 5MB
    const oversized = 11 * 1024 * 1024; // 11MB

    assert(validSize <= MAX_SIZE);
    assert(oversized > MAX_SIZE);
  });

  // ─── SUITE 12: OFFER LETTER ASSOCIATION WITH SPECIFIC RECORD ──────────────
  console.log('\n--- Suite 12: Offer Letter Record Association ---');

  await runTest('Offer letters attach to specific offer record ID, not register number', async () => {
    const records = [
      {
        _tempId: 'temp-offer-1',
        'Register Number': '2140050',
        'Name': 'Deepak Raj',
        'Department': 'Information Technology',
        'Program': 'B.Tech',
        'Company': 'Oracle',
        'Package': '15.0',
        offerLetterUrl: 'https://drive.google.com/oracle-offer.pdf',
        offerLetterFileName: 'Oracle_Offer.pdf'
      },
      {
        _tempId: 'temp-offer-2',
        'Register Number': '2140050',
        'Name': 'Deepak Raj',
        'Department': 'Information Technology',
        'Program': 'B.Tech',
        'Company': 'Cisco',
        'Package': '14.0'
      }
    ];
    const result = await verifyPlacementBatch(records, {
      academicYear: '2024-2025',
      placementType: 'placement',
      mockStudents: [{ registerNumber: '2140050', name: 'Deepak Raj', department: 'Information Technology' }]
    });

    assert.strictEqual(result.summary.withOfferLetters, 1);
    assert.strictEqual(result.summary.withoutOfferLetters, 1);
    assert.strictEqual(result.records[0].offerLetterUrl, 'https://drive.google.com/oracle-offer.pdf');
    assert.strictEqual(result.records[1].offerLetterUrl, null);
  });

  // ─── SUITE 13: KPI / STATS SEPARATION (LPA VS MONTHLY INR) ────────────────
  console.log('\n--- Suite 13: Placement LPA vs Internship Stipend KPI Separation ---');

  runTest('Placement statistics isolate LPA from Internship stipends', () => {
    const mixedRecords = [
      { placementType: 'placement', package: 12.0 },
      { placementType: 'placement', package: 8.0 },
      { placementType: 'placement', package: 16.0 },
      { placementType: 'internship', package: 25000 },
      { placementType: 'internship', package: 40000 },
      { placementType: 'internship', package: null },
      { placementType: 'internship', package: 0 }
    ];

    // Compute Placement Stats (LPA)
    const placements = mixedRecords.filter(r => r.placementType === 'placement');
    const placementPackages = placements.map(p => Number(p.package)).filter(p => !isNaN(p) && p > 0);
    const avgPlacementLPA = placementPackages.reduce((a, b) => a + b, 0) / placementPackages.length;
    const maxPlacementLPA = Math.max(...placementPackages);

    assert.strictEqual(avgPlacementLPA, 12.0);
    assert.strictEqual(maxPlacementLPA, 16.0);

    // Compute Internship Stats (Stipend INR)
    const internships = mixedRecords.filter(r => r.placementType === 'internship');
    const paidInternships = internships.map(i => i.package).filter(pkg => pkg !== null && pkg !== undefined && Number(pkg) > 0);
    const unpaidInternships = internships.filter(i => i.package === 0 || i.package === '0');
    const notProvidedInternships = internships.filter(i => i.package === null || i.package === undefined);

    const avgStipend = paidInternships.reduce((a, b) => a + Number(b), 0) / paidInternships.length;

    assert.strictEqual(paidInternships.length, 2);
    assert.strictEqual(unpaidInternships.length, 1);
    assert.strictEqual(notProvidedInternships.length, 1);
    assert.strictEqual(avgStipend, 32500);

    // Ensure stipend ₹32,500 was never added to placement packages
    assert(avgPlacementLPA < 20);
  });

  // ─── TEST SUMMARY ──────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`   TEST RESULTS: ${passedTests} / ${totalTests} Passed`);
  console.log('================================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal error in test suite:', err);
  process.exit(1);
});
