'use strict';

const assert = require('assert');
const {
  verifyPlacementBatch,
  parseCompensation,
  parseMonthlyStipend,
  parseProofUrl
} = require('../controllers/placementController');

async function runTests() {
  console.log('🧪 Starting Internship Bulk Upload Workflow Test Suite...\n');

  // =========================================================================
  // TEST SUITE 1: Helper parsing tests
  // =========================================================================
  console.log('--- Test Suite 1: parseMonthlyStipend & parseProofUrl ---');

  // 1.1 Blank / Null / N/A
  const blank1 = parseMonthlyStipend('');
  assert.strictEqual(blank1.valid, true);
  assert.strictEqual(blank1.value, null);
  assert.strictEqual(blank1.formatted, 'Not Provided');

  const blank2 = parseMonthlyStipend('   ');
  assert.strictEqual(blank2.valid, true);
  assert.strictEqual(blank2.value, null);

  const blank3 = parseMonthlyStipend('N/A');
  assert.strictEqual(blank3.valid, true);
  assert.strictEqual(blank3.value, null);

  const blank4 = parseMonthlyStipend('-');
  assert.strictEqual(blank4.valid, true);
  assert.strictEqual(blank4.value, null);

  // 1.2 Unpaid / Zero
  const zero1 = parseMonthlyStipend('0');
  assert.strictEqual(zero1.valid, true);
  assert.strictEqual(zero1.value, 0);
  assert.strictEqual(zero1.formatted, 'Unpaid');

  const zero2 = parseMonthlyStipend('Unpaid');
  assert.strictEqual(zero2.valid, true);
  assert.strictEqual(zero2.value, 0);
  assert.strictEqual(zero2.formatted, 'Unpaid');

  // 1.3 Positive numbers
  const pos1 = parseMonthlyStipend(15000);
  assert.strictEqual(pos1.valid, true);
  assert.strictEqual(pos1.value, 15000);
  assert.strictEqual(pos1.formatted, '₹15,000/month');

  const pos2 = parseMonthlyStipend('₹ 25,000 /month');
  assert.strictEqual(pos2.valid, true);
  assert.strictEqual(pos2.value, 25000);
  assert.strictEqual(pos2.formatted, '₹25,000/month');

  // 1.4 Invalid numbers
  const inv1 = parseMonthlyStipend(-500);
  assert.strictEqual(inv1.valid, false);

  const inv2 = parseMonthlyStipend('invalid_amount');
  assert.strictEqual(inv2.valid, false);

  // 1.5 Proof URLs
  const proofNull = parseProofUrl(null);
  assert.strictEqual(proofNull.valid, true);
  assert.strictEqual(proofNull.url, null);

  const proofDrive = parseProofUrl('https://drive.google.com/file/d/12345/view?usp=sharing');
  assert.strictEqual(proofDrive.valid, true);
  assert.strictEqual(proofDrive.url, 'https://drive.google.com/file/d/12345/view?usp=sharing');

  const proofInvalid = parseProofUrl('just_a_filename.pdf');
  assert.strictEqual(proofInvalid.valid, false);

  console.log('✅ parseMonthlyStipend & parseProofUrl unit tests passed.');

  // =========================================================================
  // TEST SUITE 2: Student resolution & 6-column internship verification
  // =========================================================================
  console.log('\n--- Test Suite 2: Student lookup, Name priority & 6-column mapping ---');

  const mockStudents = [
    {
      id: 'stu-1',
      registerNumber: '2447001',
      name: 'Adarsh S V',
      department: 'Computer Science and Engineering',
      course: 'B.Tech CSE',
      campus: 'Kengeri Campus',
      school: 'School of Engineering and Technology',
      enrollments: [
        {
          id: 'enr-1',
          academicYear: '2024-2025',
          department: 'Computer Science and Engineering',
          course: 'B.Tech Computer Science and Engineering',
          campus: 'Kengeri Campus',
          school: 'School of Engineering and Technology'
        }
      ]
    },
    {
      id: 'stu-2',
      registerNumber: '2447002',
      name: '', // DB Name empty -> tests fallback
      department: 'Civil Engineering',
      course: 'B.Tech Civil',
      campus: 'Kengeri Campus',
      school: 'School of Engineering and Technology',
      enrollments: [
        {
          id: 'enr-2',
          academicYear: '2024-2025',
          department: 'Civil Engineering',
          course: 'B.Tech Civil Engineering',
          campus: 'Kengeri Campus',
          school: 'School of Engineering and Technology'
        }
      ]
    },
    {
      id: 'stu-3',
      registerNumber: '2447003',
      name: 'Kavya Ramesh',
      department: 'Electronics and Communication Engineering',
      course: 'B.Tech ECE',
      campus: 'Kengeri Campus',
      school: 'School of Engineering and Technology',
      enrollments: [
        // Enrolled in 2023-2024, NOT in 2024-2025!
        {
          id: 'enr-3',
          academicYear: '2023-2024',
          department: 'Electronics and Communication Engineering',
          course: 'B.Tech ECE'
        }
      ]
    }
  ];

  const testRecords = [
    // Row 1: Valid internship (DB name priority: DB has 'Adarsh S V', spreadsheet has 'A. S. V.')
    {
      'Name': 'A. S. V.',
      'Register Number': '2447001',
      'Designation/Role': 'SDE Intern',
      'Company': 'Amazon',
      'Monthly Stipend (INR)': '45000',
      'Proof': 'https://drive.google.com/file/d/offer1'
    },
    // Row 2: Valid internship with empty DB name -> fallback to spreadsheet Name 'Deepa Nair'
    {
      'Name': 'Deepa Nair',
      'Register Number': '2447002',
      'Designation/Role': 'Research Intern',
      'Company': 'L&T Construction',
      'Monthly Stipend (INR)': '0', // Unpaid
      'Proof': ''
    },
    // Row 3: Unknown student register number -> Skipped/Invalid (DO NOT auto-register!)
    {
      'Name': 'Unknown Person',
      'Register Number': '9999999',
      'Designation/Role': 'Developer',
      'Company': 'Startup XYZ',
      'Monthly Stipend (INR)': '10000',
      'Proof': ''
    },
    // Row 4: Student exists but has NO active enrollment in targetAY (2024-2025) -> Skipped/Invalid
    {
      'Name': 'Kavya Ramesh',
      'Register Number': '2447003',
      'Designation/Role': 'IoT Intern',
      'Company': 'Bosch',
      'Monthly Stipend (INR)': '20000',
      'Proof': ''
    },
    // Row 5: Missing mandatory Company -> Skipped/Invalid
    {
      'Name': 'Adarsh S V',
      'Register Number': '2447001',
      'Designation/Role': 'Intern',
      'Company': '',
      'Monthly Stipend (INR)': '15000',
      'Proof': ''
    },
    // Row 6: Invalid stipend format
    {
      'Name': 'Adarsh S V',
      'Register Number': '2447001',
      'Designation/Role': 'ML Intern',
      'Company': 'Microsoft',
      'Monthly Stipend (INR)': 'negative-five-hundred',
      'Proof': ''
    },
    // Row 7: Invalid proof format
    {
      'Name': 'Adarsh S V',
      'Register Number': '2447001',
      'Designation/Role': 'Data Intern',
      'Company': 'Google',
      'Monthly Stipend (INR)': '60000',
      'Proof': 'not_a_valid_link'
    }
  ];

  const result = await verifyPlacementBatch(testRecords, {
    academicYear: '2024-2025',
    placementType: 'internship',
    mockStudents
  });

  const summary = result.summary;
  console.log('Verification Summary:', summary);

  assert.strictEqual(summary.total, 7);
  assert.strictEqual(summary.ready, 2);
  assert.strictEqual(summary.invalid, 5);
  assert.strictEqual(summary.skippedUnknownRegister, 1, 'Should record 1 unknown register number');
  assert.strictEqual(summary.skippedMissingEnrollment, 1, 'Should record 1 missing enrollment');
  assert.strictEqual(summary.skippedMissingRequired, 1, 'Should record 1 missing company');
  assert.strictEqual(summary.rejectedInvalidStipend, 1, 'Should record 1 invalid stipend');
  assert.strictEqual(summary.rejectedInvalidProof, 1, 'Should record 1 invalid proof');

  // Verify Row 1: DB Name takes priority over spreadsheet Name
  const row1 = result.records[0];
  assert.strictEqual(row1._rowStatus, 'ready');
  assert.strictEqual(row1.studentName, 'Adarsh S V', 'DB name must take priority over spreadsheet name');
  assert.strictEqual(row1.department, 'Computer Science and Engineering', 'Department must be derived from enrollment');
  assert.strictEqual(row1.course, 'B.Tech Computer Science and Engineering', 'Course must be derived from enrollment');
  assert.strictEqual(row1.monthlyStipend, 45000);
  assert.strictEqual(row1.offerLetterUrl, 'https://drive.google.com/file/d/offer1');

  // Verify Row 2: Spreadsheet Name fallback used when DB name is empty
  const row2 = result.records[1];
  assert.strictEqual(row2._rowStatus, 'ready');
  assert.strictEqual(row2.studentName, 'Deepa Nair', 'Spreadsheet name must be used as fallback');
  assert.strictEqual(row2.department, 'Civil Engineering');
  assert.strictEqual(row2.monthlyStipend, 0);
  assert.strictEqual(row2.packageFormatted, 'Unpaid');

  console.log('✅ 6-column mapping, name priority, and enrollment checks passed.');

  // =========================================================================
  // TEST SUITE 3: Multiple internships vs Exact duplicate detection
  // =========================================================================
  console.log('\n--- Test Suite 3: Multiple internships vs exact duplicates ---');

  const duplicateTestRecords = [
    // Internship A: Amazon, SDE Intern
    {
      'Name': 'Adarsh S V',
      'Register Number': '2447001',
      'Designation/Role': 'SDE Intern',
      'Company': 'Amazon',
      'Monthly Stipend (INR)': '45000'
    },
    // Internship B: Microsoft, ML Intern (Same student, DIFFERENT company -> Allowed!)
    {
      'Name': 'Adarsh S V',
      'Register Number': '2447001',
      'Designation/Role': 'ML Intern',
      'Company': 'Microsoft',
      'Monthly Stipend (INR)': '55000'
    },
    // Internship C: Amazon, Cloud Intern (Same student, SAME company, DIFFERENT role -> Allowed!)
    {
      'Name': 'Adarsh S V',
      'Register Number': '2447001',
      'Designation/Role': 'Cloud Intern',
      'Company': 'Amazon',
      'Monthly Stipend (INR)': '50000'
    },
    // Internship D: Amazon, SDE Intern (Exact duplicate of Internship A -> MUST BE SKIPPED!)
    {
      'Name': 'Adarsh S V',
      'Register Number': '2447001',
      'Designation/Role': 'SDE Intern',
      'Company': 'Amazon',
      'Monthly Stipend (INR)': '45000'
    }
  ];

  const dupResult = await verifyPlacementBatch(duplicateTestRecords, {
    academicYear: '2024-2025',
    placementType: 'internship',
    mockStudents
  });

  console.log('Duplicate Test Summary:', dupResult.summary);
  assert.strictEqual(dupResult.summary.total, 4);
  assert.strictEqual(dupResult.summary.ready, 3, 'Multiple distinct internships for one student must be ready');
  assert.strictEqual(dupResult.summary.duplicates, 1, 'Exact duplicate must be flagged');
  assert.strictEqual(dupResult.summary.skippedExactDuplicates, 1);
  assert.strictEqual(dupResult.records[3]._rowStatus, 'duplicate');

  console.log('✅ Multiple internships allowed & exact duplicates properly skipped.');

  // =========================================================================
  // TEST SUITE 4: Placement preservation (Zero regression)
  // =========================================================================
  console.log('\n--- Test Suite 4: Placements module preservation ---');

  const placementRecords = [
    {
      'Register Number': '2447001',
      'Name': 'Adarsh S V',
      'Department': 'Computer Science and Engineering',
      'Program': 'B.Tech Computer Science and Engineering',
      'Designation/Role': 'Software Engineer',
      'Company': 'Google',
      'Package': '18.5'
    }
  ];

  const placementResult = await verifyPlacementBatch(placementRecords, {
    academicYear: '2024-2025',
    placementType: 'placement',
    mockStudents
  });

  assert.strictEqual(placementResult.summary.ready, 1);
  assert.strictEqual(placementResult.records[0].package, 18.5);
  assert.strictEqual(placementResult.records[0].packageFormatted, '₹ 18.5 LPA');

  console.log('✅ Placements workflow preserved with 100% fidelity.');

  console.log('\n🎉 ALL INTERNSHIP BULK UPLOAD TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
