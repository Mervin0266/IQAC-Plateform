'use strict';

/**
 * Automated Test Suite for Institutional Intelligence Dashboard V2.0
 * & Complete Institutional Report Generator
 * CHRIST (Deemed to be University) — IQAC Platform
 */

const assert = require('assert');
const {
  getInstitutionalAnalytics,
  generateInstitutionalExcelReport,
  generateInstitutionalPdfReport,
  generateInstitutionalWordReport,
  normalizeAY,
  expandAyList
} = require('../services/institutionalReportService');

async function runTests() {
  console.log('🧪 Starting Institutional Intelligence Dashboard & Report Generator Test Suite...\n');
  let passed = 0;
  let total = 0;

  function test(description, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${description}`);
      console.error(`    ${err.message}`);
      throw err;
    }
  }

  async function testAsync(description, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${description}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${description}`);
      console.error(`    ${err.message}`);
      throw err;
    }
  }

  // 1. Academic Year Normalization
  test('normalizeAY should normalize various academic year formats', () => {
    assert.strictEqual(normalizeAY('2024-25'), '2024-25');
    assert.strictEqual(normalizeAY('AY 2024-25'), '2024-25');
    assert.strictEqual(normalizeAY('AY 2024–25'), '2024-25');
    assert.strictEqual(normalizeAY('2024-2025'), '2024-25');
    assert.strictEqual(normalizeAY('2024'), '2024-25');
  });

  // 2. Academic Year Multi-Format Expansion for Database Queries
  test('expandAyList expands canonical AY into 4-digit, 2-digit, AY-prefixed, and calendar formats', () => {
    const expanded = expandAyList(['AY 2024–25', '2023-24']);
    // Must include 4-digit database format
    assert.ok(expanded.includes('2024-2025'), 'Must match 2024-2025 stored in students/faculties');
    assert.ok(expanded.includes('2023-2024'), 'Must match 2023-2024 stored in sponsored/patents');
    // Must include 2-digit format
    assert.ok(expanded.includes('2024-25'));
    assert.ok(expanded.includes('2024–25'));
    assert.ok(expanded.includes('AY 2024-25'));
    assert.ok(expanded.includes('AY 2024–25'));
    // Must include publication calendar year start
    assert.ok(expanded.includes('2024'), 'Must match publication calendar year 2024');
    assert.ok(expanded.includes('2023'), 'Must match publication calendar year 2023');
  });

  // 3. Centralized Analytics Aggregation & 5 Sections Coverage
  await testAsync('getInstitutionalAnalytics returns all 5 sections with correct structure and dataQuality indicators', async () => {
    const data = await getInstitutionalAnalytics({
      academicYears: ['AY 2026–27', 'AY 2025–26', 'AY 2024–25', 'AY 2023–24'],
      campus: 'All',
      school: 'All'
    });

    assert.ok(data, 'Data object should exist');
    assert.ok(data.executiveOverview, 'Section 1: executiveOverview must be present');
    assert.ok(data.academicFaculty, 'Section 2: academicFaculty must be present');
    assert.ok(data.researchInnovation, 'Section 3: researchInnovation must be present');
    assert.ok(data.placementsInternships, 'Section 4: placementsInternships must be present');
    assert.ok(data.accreditationRankings, 'Section 5: accreditationRankings must be present');
    assert.ok(data.dataQuality, 'Data quality status object must be present');

    // Section 1 Verification
    assert.strictEqual(typeof data.executiveOverview.totalStudents, 'number');
    assert.strictEqual(typeof data.executiveOverview.totalFaculty, 'number');
    assert.ok(Array.isArray(data.executiveOverview.yearlyOverview));

    // Section 2 Verification (Strict Cross-Tab Consistency & Denominator Compatibility)
    assert.strictEqual(typeof data.academicFaculty.phdFacultyCount, 'number');
    assert.strictEqual(data.academicFaculty.totalFaculty, data.executiveOverview.totalFaculty, 'Total faculty must match between Executive and Academic tabs');
    assert.strictEqual(data.academicFaculty.totalStudents, data.executiveOverview.totalStudents, 'Total students must match between Executive and Academic tabs');
    assert.ok(data.academicFaculty.phdFacultyCount <= data.academicFaculty.totalFaculty, 'PhD faculty count must not exceed total distinct faculty');
    assert.ok(Number(data.academicFaculty.phdPercentage) <= 100, 'PhD percentage must never exceed 100%');
    assert.ok(Array.isArray(data.academicFaculty.designationDistribution));
    assert.ok(Array.isArray(data.academicFaculty.departmentBreakdown));

    const sumDesignations = (data.academicFaculty.seniorFacultyCount || 0) +
      (data.academicFaculty.assistantProfCount || 0) +
      (data.academicFaculty.otherFacultyCount || 0);
    assert.strictEqual(sumDesignations, data.academicFaculty.totalFaculty, 'Sum of cadre designations must match total faculty');

    const sumGender = data.academicFaculty.genderDistribution.reduce((acc, g) => acc + g.count, 0);
    assert.strictEqual(sumGender, data.academicFaculty.totalFaculty, 'Sum of gender distribution must match total faculty');

    const sumDeptFaculty = data.academicFaculty.departmentBreakdown.reduce((acc, d) => acc + d.faculty, 0);
    assert.strictEqual(sumDeptFaculty, data.academicFaculty.totalFaculty, 'Sum of departmental faculty must match total distinct faculty');

    const sumDeptStudents = data.academicFaculty.departmentBreakdown.reduce((acc, d) => acc + d.students, 0);
    assert.strictEqual(sumDeptStudents, data.academicFaculty.totalStudents, 'Sum of departmental students must match total distinct students');

    // Section 3 Verification
    assert.strictEqual(typeof data.researchInnovation.totalPublications, 'number');
    assert.strictEqual(typeof data.researchInnovation.totalSponsoredAmountLakhs, 'number');
    assert.ok(Array.isArray(data.researchInnovation.yearlyResearch));

    // Section 4 Verification
    assert.strictEqual(typeof data.placementsInternships.uniquePlaced, 'number');
    assert.strictEqual(typeof data.placementsInternships.totalOffers, 'number');
    assert.ok(Array.isArray(data.placementsInternships.salaryRanges));

    // Section 5 Verification
    assert.strictEqual(data.accreditationRankings.naacGrade, 'A++');
    assert.strictEqual(data.accreditationRankings.naacCgpa, '3.74');
    assert.strictEqual(data.accreditationRankings.isNaacReferenceValue, true);
    assert.strictEqual(data.accreditationRankings.nirfOverall, '63');
    assert.strictEqual(data.accreditationRankings.isNirfReferenceValue, true);
    assert.ok(Array.isArray(data.accreditationRankings.criteriaBreakdown));
    assert.strictEqual(data.accreditationRankings.criteriaBreakdown.length, 7);
  });

  // 4. Excel Export Buffer Generation (All 3 Report Levels)
  await testAsync('generateInstitutionalExcelReport creates valid .xlsx buffer across levels', async () => {
    const mockReportData = await getInstitutionalAnalytics();

    // Summary Level
    const summaryBuf = await generateInstitutionalExcelReport({
      reportData: mockReportData,
      reportLevel: 'summary'
    });
    assert.ok(Buffer.isBuffer(summaryBuf));
    assert.ok(summaryBuf.length > 5000, 'Excel buffer size should be substantial');

    // Analytical Level
    const analyticalBuf = await generateInstitutionalExcelReport({
      reportData: mockReportData,
      reportLevel: 'analytical'
    });
    assert.ok(Buffer.isBuffer(analyticalBuf));
    assert.ok(analyticalBuf.length > 5000);

    // Detailed Level with Source Breakdown
    const detailedBuf = await generateInstitutionalExcelReport({
      reportData: mockReportData,
      reportLevel: 'detailed',
      includeSourceBreakdown: true
    });
    assert.ok(Buffer.isBuffer(detailedBuf));
    assert.ok(detailedBuf.length > 5000);
  });

  // 5. PDF Export Buffer Generation (Valid PDF 1.4 header and SMask logo)
  test('generateInstitutionalPdfReport creates valid PDF 1.4 buffer', () => {
    const mockReportData = {
      scopeDisplay: 'University-wide',
      academicYears: ['AY 2026–27', 'AY 2025–26', 'AY 2024–25'],
      executiveOverview: { totalStudents: 500, totalFaculty: 40, studentFacultyRatio: '12.5' },
      academicFaculty: { phdFacultyCount: 25, phdPercentage: '62.5' },
      researchInnovation: { totalPublications: 85, totalCitations: 240, totalSponsoredAmountLakhs: 45.5 },
      placementsInternships: { uniquePlaced: 320, placementRate: '82.0', avgPackageLpa: '7.85' },
      accreditationRankings: { naacGrade: 'A++', naacCgpa: '3.74', nirfOverall: '63' },
      sourceRecords: []
    };

    const pdfBuf = generateInstitutionalPdfReport({
      reportData: mockReportData,
      reportLevel: 'summary'
    });

    assert.ok(Buffer.isBuffer(pdfBuf));
    const header = pdfBuf.subarray(0, 8).toString('latin1');
    assert.ok(header.startsWith('%PDF-1.4'), 'Must start with %PDF-1.4 header');
    assert.ok(pdfBuf.length > 10000, 'PDF buffer should contain fonts and embedded streams');
  });

  // 6. Word (.docx) Export Buffer Generation
  await testAsync('generateInstitutionalWordReport creates valid Word document buffer', async () => {
    const mockReportData = {
      scopeDisplay: 'School of Engineering and Technology',
      academicYears: ['AY 2024–25'],
      executiveOverview: { totalStudents: 300, totalFaculty: 25, studentFacultyRatio: '12.0' },
      academicFaculty: { phdFacultyCount: 18, phdPercentage: '72.0' },
      researchInnovation: { totalPublications: 50, totalCitations: 150, totalSponsoredAmountLakhs: 20.0 },
      placementsInternships: { uniquePlaced: 210, placementRate: '85.0', avgPackageLpa: '8.20' },
      accreditationRankings: { naacGrade: 'A++', naacCgpa: '3.74', nirfOverall: '63' },
      sourceRecords: []
    };

    const wordBuf = await generateInstitutionalWordReport({
      reportData: mockReportData,
      reportLevel: 'analytical'
    });

    assert.ok(Buffer.isBuffer(wordBuf));
    // Word (.docx) files are ZIP archives starting with magic bytes 'PK' (0x50, 0x4B)
    assert.strictEqual(wordBuf[0], 0x50, 'Must start with PK zip header byte 1');
    assert.strictEqual(wordBuf[1], 0x4B, 'Must start with PK zip header byte 2');
    assert.ok(wordBuf.length > 5000, 'Word buffer size should be valid');
  });

  // 7. Placement LPA vs Stipend Segregation
  await testAsync('Placement package calculations segregate LPA from monthly stipends', async () => {
    const data = await getInstitutionalAnalytics();
    const place = data.placementsInternships;

    // Average LPA should be formatted as decimal string or number or null
    assert.ok(typeof place.avgPackageLpa === 'string' || typeof place.avgPackageLpa === 'number' || place.avgPackageLpa === null);
    // Internship stipend should be an integer in INR
    assert.strictEqual(typeof place.avgInternshipStipend, 'number');
  });

  // 8. Scoped filtering adherence
  await testAsync('getInstitutionalAnalytics respects department filtering', async () => {
    const data = await getInstitutionalAnalytics({
      departments: ['Computer Science and Engineering']
    });

    assert.ok(data.scopeDisplay.includes('Computer Science') || data.scopeDisplay.includes('Department'));
  });

  console.log(`\n🎉 Test Suite Completed: ${passed}/${total} tests passed successfully!\n`);
}

if (require.main === module) {
  runTests().catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
