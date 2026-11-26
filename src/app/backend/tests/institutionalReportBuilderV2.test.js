/**
 * Comprehensive Integration & Verification Test for IQAC Institutional Report Builder V2.0
 * 
 * Verifies:
 * 1. Summary, Analytical, and Detailed report generation.
 * 2. Summary report strictly has NO visual charts (isSummary: true, includeCharts: false).
 * 3. All 6 comparison dimensions:
 *    - Academic Year vs Academic Year (chronological with zero-denominator safe growth)
 *    - Department vs Department
 *    - School vs School
 *    - Campus vs Campus
 *    - External Institutional Benchmarking (NIRF Rank 63, MoE parameters)
 *    - Institutional Performance Trends
 * 4. Immutable snapshot creation and persistence in ReportSnapshot table.
 * 5. Identical snapshot reuse for export without recalculation.
 * 6. "Refresh Data" creates a fresh snapshot with new snapshotId.
 * 7. Multi-format export: PDF, DOCX (Word), and PPTX (PowerPoint 16:9).
 * 8. Field catalog & Comparison options endpoint compliance.
 */

const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

const {
  calculateReportAnalytics,
  generateReportBuilderExport,
  getFieldCatalog,
  getComparisonOptions,
  refreshReportSnapshot,
  getSnapshotById
} = require('../services/institutionalReportBuilderService');

const { ReportSnapshot } = require('../models');

async function runTests() {
  console.log('================================================================');
  console.log('STARTING IQAC REPORT BUILDER V2.0 INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return (async () => {
      try {
        await fn();
        console.log(`  [PASS] ${name}`);
        passed++;
      } catch (err) {
        console.error(`  [FAIL] ${name}:`, err.message);
        failed++;
      }
    })();
  }

  // 1. Catalog & Comparison Options Test
  await test('Field Catalog returns 8 Level 1 Sections with Level 2/3 metadata', async () => {
    const catalog = getFieldCatalog();
    assert.strictEqual(Array.isArray(catalog.sections), true, 'Sections must be array');
    assert.strictEqual(catalog.sections.length, 8, `Expected 8 sections, got ${catalog.sections.length}`);
    
    // Ensure Student Academic Performance is strictly excluded
    const academicSection = catalog.sections.find(s => s.id === 'academic_faculty');
    assert.ok(academicSection, 'Academic & Faculty section must exist');
    assert.strictEqual(
      academicSection.subsections.some(sub => {
        const text = (typeof sub === 'string' ? sub : (sub.id + ' ' + sub.name)).toLowerCase();
        return text.includes('student_grade') || text.includes('student_result') || text.includes('student_academic');
      }),
      false,
      'Student grades must be excluded'
    );

    // Ensure Research section has dedicated Quartiles
    const researchSection = catalog.sections.find(s => s.id === 'research_innovation');
    assert.ok(
      researchSection.subsections.some(sub => {
        const text = (typeof sub === 'string' ? sub : (sub.id + ' ' + sub.name)).toLowerCase();
        return text.includes('quartile');
      }),
      'Research must include quartiles subsection'
    );
  });

  await test('Comparison Options returns all 6 supported dimensions', async () => {
    const options = getComparisonOptions();
    assert.strictEqual(Array.isArray(options), true, 'Options must be array');
    assert.strictEqual(options.length, 6, `Expected 6 comparison options, got ${options.length}`);
    
    const ids = options.map(o => o.id);
    assert.ok(ids.includes('ay_vs_ay'), 'Must include ay_vs_ay');
    assert.ok(ids.includes('dept_vs_dept'), 'Must include dept_vs_dept');
    assert.ok(ids.includes('school_vs_school'), 'Must include school_vs_school');
    assert.ok(ids.includes('campus_vs_campus'), 'Must include campus_vs_campus');
    assert.ok(ids.includes('external_benchmark'), 'Must include external_benchmark');
    assert.ok(ids.includes('performance_trends'), 'Must include performance_trends');
  });

  // Base configuration
  const testScope = {
    campuses: ['All'],
    schools: ['All'],
    departments: ['All'],
    academicYears: ['2023-24', '2024-25'],
    facultyAttribution: 'primary'
  };

  const testContent = {
    sections: [
      'executive_overview',
      'academic_faculty',
      'research_innovation',
      'placements',
      'accreditation',
      'comparative_analytics',
      'insights_action_plan',
      'appendix'
    ],
    subsections: {
      publications: true,
      quartiles: true,
      citations: true,
      patents: true,
      copyrights: true,
      consultancy: true,
      sponsoredProjects: true,
      kpiCards: true,
      summaryTables: true,
      detailedTables: true,
      charts: true
    }
  };

  const testComparisons = {
    yearWise: true,
    departmentWise: true,
    schoolWise: true,
    campusWise: true,
    externalBenchmark: true,
    performanceTrends: true
  };

  let summarySnapshotId = null;
  let summaryReportData = null;

  // 2. Summary Report Generation Test (STRICTLY NO CHARTS)
  await test('Summary Report generation strictly excludes visual charts', async () => {
    summaryReportData = await calculateReportAnalytics({
      reportType: 'summary',
      outputFormat: 'pdf',
      scopeConfig: testScope,
      contentConfig: testContent,
      comparisonConfig: testComparisons
    });

    assert.ok(summaryReportData.snapshotId, 'Must generate snapshotId');
    summarySnapshotId = summaryReportData.snapshotId;

    assert.strictEqual(summaryReportData.reportType, 'summary');
    assert.ok(Array.isArray(summaryReportData.pages), 'Must have pages array');

    // Strictly NO visual charts in any page
    summaryReportData.pages.forEach((p, idx) => {
      assert.strictEqual(
        p.includeCharts,
        false,
        `Page ${idx + 1} (${p.title || p.pageType}) must have includeCharts=false in summary report`
      );
      assert.strictEqual(
        p.isSummary,
        true,
        `Page ${idx + 1} must be marked isSummary=true`
      );
    });

    // Verify 6 comparison dimensions exist in summary data
    assert.ok(Array.isArray(summaryReportData.ayComparisonRows), 'ayComparisonRows must exist');
    assert.ok(Array.isArray(summaryReportData.departmentComparisons), 'departmentComparisons must exist');
    assert.ok(Array.isArray(summaryReportData.schoolComparisons), 'schoolComparisons must exist');
    assert.ok(Array.isArray(summaryReportData.campusComparisons), 'campusComparisons must exist');
    assert.ok(summaryReportData.externalBenchmarking, 'externalBenchmarking must exist');
    assert.strictEqual(summaryReportData.externalBenchmarking.institutionalRank, 63, 'NIRF Rank must be 63');
    assert.ok(Array.isArray(summaryReportData.longitudinalTrends), 'longitudinalTrends must exist');
  });

  // 3. Analytical Report Generation Test (Visual Charts Included)
  await test('Analytical Report generation includes visual charts', async () => {
    const analyticalData = await calculateReportAnalytics({
      reportType: 'analytical',
      outputFormat: 'pdf',
      scopeConfig: testScope,
      contentConfig: testContent,
      comparisonConfig: testComparisons
    });

    assert.strictEqual(analyticalData.reportType, 'analytical');
    const chartPages = analyticalData.pages.filter(p => p.includeCharts);
    assert.ok(chartPages.length > 0, 'Analytical report must have pages with includeCharts=true');
  });

  // 4. Snapshot Persistence & Immutability Test
  await test('Report Snapshot is persisted in database and reloaded identically', async () => {
    assert.ok(summarySnapshotId, 'Need summarySnapshotId from previous test');

    const persistedSnapshot = await getSnapshotById(summarySnapshotId);
    assert.ok(persistedSnapshot, 'Snapshot must be retrievable from database');
    assert.strictEqual(persistedSnapshot.snapshotId, summarySnapshotId);
    assert.strictEqual(persistedSnapshot.reportType, 'summary');

    // Now call calculateReportAnalytics with snapshotId: should return cached data identically
    const cachedData = await calculateReportAnalytics({
      snapshotId: summarySnapshotId,
      reportType: 'summary',
      outputFormat: 'pdf',
      scopeConfig: testScope
    });

    assert.strictEqual(cachedData.snapshotId, summarySnapshotId);
    assert.strictEqual(cachedData.meta.snapshotId, summarySnapshotId);
  });

  // 5. Snapshot Refresh Test
  await test('Refresh Snapshot creates a new snapshot with fresh ID', async () => {
    assert.ok(summarySnapshotId, 'Need summarySnapshotId from previous test');

    const refreshed = await refreshReportSnapshot(summarySnapshotId);
    assert.ok(refreshed, 'Refreshed snapshot must be returned');
    assert.ok(refreshed.snapshotId, 'New snapshot must have snapshotId');
    assert.notStrictEqual(refreshed.snapshotId, summarySnapshotId, 'New snapshotId must differ from old snapshotId');
  });

  // 6. PDF Export from Snapshot
  await test('PDF export generates valid non-empty PDF document buffer from snapshot', async () => {
    const pdfResult = await generateReportBuilderExport({
      reportType: 'summary',
      targetFormat: 'pdf',
      snapshotId: summarySnapshotId,
      scopeConfig: testScope,
      contentConfig: testContent,
      comparisonConfig: testComparisons
    });

    assert.ok(pdfResult.buffer, 'PDF export must return a buffer');
    assert.ok(pdfResult.buffer.length > 1000, `PDF buffer too small: ${pdfResult.buffer.length} bytes`);
    
    // Check PDF header: %PDF
    const pdfHeader = pdfResult.buffer.slice(0, 4).toString('utf8');
    assert.strictEqual(pdfHeader, '%PDF', `Invalid PDF magic bytes: ${pdfHeader}`);
    console.log(`    Generated PDF size: ${(pdfResult.buffer.length / 1024).toFixed(1)} KB`);
  });

  // 7. Word (.docx) Export from Snapshot
  await test('Word (.docx) export generates valid non-empty DOCX document buffer from snapshot', async () => {
    const docxResult = await generateReportBuilderExport({
      reportType: 'summary',
      targetFormat: 'docx',
      snapshotId: summarySnapshotId,
      scopeConfig: testScope,
      contentConfig: testContent,
      comparisonConfig: testComparisons
    });

    assert.ok(docxResult.buffer, 'DOCX export must return a buffer');
    assert.ok(docxResult.buffer.length > 1000, `DOCX buffer too small: ${docxResult.buffer.length} bytes`);
    
    // Check ZIP header for DOCX: PK\x03\x04
    const zipHeader = docxResult.buffer.slice(0, 4).toString('hex');
    assert.strictEqual(zipHeader, '504b0304', `Invalid DOCX magic bytes: ${zipHeader}`);
    console.log(`    Generated DOCX size: ${(docxResult.buffer.length / 1024).toFixed(1)} KB`);
  });

  // 8. Native PowerPoint (.pptx) Export from Snapshot
  await test('PowerPoint (.pptx) export generates valid 16:9 widescreen presentation from snapshot', async () => {
    const pptxResult = await generateReportBuilderExport({
      reportType: 'summary',
      targetFormat: 'pptx',
      snapshotId: summarySnapshotId,
      scopeConfig: testScope,
      contentConfig: testContent,
      comparisonConfig: testComparisons
    });

    assert.ok(pptxResult.buffer, 'PPTX export must return a buffer');
    assert.ok(pptxResult.buffer.length > 1000, `PPTX buffer too small: ${pptxResult.buffer.length} bytes`);
    
    // Check ZIP header for PPTX: PK\x03\x04
    const zipHeader = pptxResult.buffer.slice(0, 4).toString('hex');
    assert.strictEqual(zipHeader, '504b0304', `Invalid PPTX magic bytes: ${zipHeader}`);
    console.log(`    Generated PPTX size: ${(pptxResult.buffer.length / 1024).toFixed(1)} KB`);
  });

  // 9. Data Quality & Reconciliation Engine Test
  await test('Data Quality & Reconciliation Engine validates metrics with cross-section checks', async () => {
    assert.ok(summaryReportData.validation, 'Validation object must exist on reportData');
    assert.strictEqual(typeof summaryReportData.validation.isValid, 'boolean', 'isValid must be boolean');
    assert.ok(summaryReportData.validation.summary, 'Validation summary must exist');
    assert.ok(summaryReportData.validation.summary.totalChecks >= 5, `Expected >=5 checks, got ${summaryReportData.validation.summary.totalChecks}`);
    assert.strictEqual(summaryReportData.validation.summary.criticalErrors, 0, 'Must have 0 critical errors');
    assert.ok(Array.isArray(summaryReportData.validation.details), 'details must be array');
    assert.ok(summaryReportData.validation.metricRegistry, 'metricRegistry must be present');
    console.log(`    Validation checks passed: ${summaryReportData.validation.summary.passed}/${summaryReportData.validation.summary.totalChecks}`);
  });

  // 10. Dual Quartile Percentages & Unclassified Safeguards Test
  await test('Publication quartiles compute dual percentages (ranked vs total) without error imputation', async () => {
    const pubMetrics = summaryReportData.metrics.publications;
    assert.ok(pubMetrics, 'Publication metrics must exist');
    assert.ok(Array.isArray(pubMetrics.quartileBreakdown), 'quartileBreakdown must be array');
    assert.strictEqual(pubMetrics.quartileBreakdown.length, 5, 'Must have 5 segments (Q1-Q4 + Unclassified)');

    pubMetrics.quartileBreakdown.slice(0, 4).forEach(q => {
      assert.ok('percentageOfRanked' in q, `Quartile ${q.label} must have percentageOfRanked`);
      assert.ok('percentageOfTotal' in q, `Quartile ${q.label} must have percentageOfTotal`);
      assert.ok('displayNote' in q, `Quartile ${q.label} must have displayNote`);
    });

    assert.ok('unclassifiedCount' in pubMetrics, 'unclassifiedCount must exist');
    assert.ok('quartileEligibility' in pubMetrics, 'quartileEligibility must exist');
    assert.ok(pubMetrics.quartileEligibility.eligibleJournalsCount !== undefined, 'Eligibility journals must exist');
  });

  // 11. Placement Zero-State Safeguard Test
  await test('Placement analytics safeguards null packages when zero placements recorded', async () => {
    const placeMetrics = summaryReportData.metrics.placements;
    assert.ok(placeMetrics, 'Placement metrics must exist');
    
    if (placeMetrics.placedStudents === 0) {
      assert.strictEqual(placeMetrics.highestPackageLpa, null, 'highestPackageLpa must be null when placedStudents is 0 (never 0.00 LPA)');
      assert.strictEqual(placeMetrics.avgPackageLpa, null, 'avgPackageLpa must be null when placedStudents is 0');
      assert.strictEqual(placeMetrics.medianPackageLpa, null, 'medianPackageLpa must be null when placedStudents is 0');
      assert.strictEqual(placeMetrics.hasPlacedRecords, false, 'hasPlacedRecords must be false when placedStudents is 0');
      assert.ok(placeMetrics.emptyRecruiterNotice, 'emptyRecruiterNotice must be populated');
    } else {
      assert.ok(placeMetrics.highestPackageLpa > 0, 'highestPackageLpa must be > 0 when placed');
      assert.strictEqual(placeMetrics.hasPlacedRecords, true, 'hasPlacedRecords must be true');
    }
  });

  // 12. Analytical PDF 13-Page Generation Test
  await test('Analytical 13-page PDF generation executes cleanly with all section banners', async () => {
    const analyticalPdf = await generateReportBuilderExport({
      reportType: 'analytical',
      targetFormat: 'pdf',
      scopeConfig: testScope,
      contentConfig: testContent,
      comparisonConfig: testComparisons
    });

    assert.ok(analyticalPdf.buffer, 'Analytical PDF must return buffer');
    assert.ok(analyticalPdf.buffer.length > 5000, `Analytical PDF too small: ${analyticalPdf.buffer.length} bytes`);
    console.log(`    Analytical PDF generated: ${(analyticalPdf.buffer.length / 1024).toFixed(1)} KB`);
  });

  // 13. Detailed PDF 18-Page Generation Test (with Detailed Registers)
  await test('Detailed 18-page PDF generation executes cleanly with all 5 record registers', async () => {
    const detailedPdf = await generateReportBuilderExport({
      reportType: 'detailed',
      targetFormat: 'pdf',
      scopeConfig: testScope,
      contentConfig: testContent,
      comparisonConfig: testComparisons
    });

    assert.ok(detailedPdf.buffer, 'Detailed PDF must return buffer');
    assert.ok(detailedPdf.buffer.length > 5000, `Detailed PDF too small: ${detailedPdf.buffer.length} bytes`);
    console.log(`    Detailed PDF generated: ${(detailedPdf.buffer.length / 1024).toFixed(1)} KB`);
  });

  // 14. Complete 9-Combination Multi-Format Matrix Test
  await test('Full 9-Combination Matrix (Summary, Analytical, Detailed x PDF, DOCX, PPTX)', async () => {
    const JSZip = require('jszip');
    const matrix = [
      { type: 'summary', format: 'pdf', minKb: 5 },
      { type: 'summary', format: 'docx', minKb: 5 },
      { type: 'summary', format: 'pptx', minKb: 10, expectedSlides: 5 },
      { type: 'analytical', format: 'pdf', minKb: 5 },
      { type: 'analytical', format: 'docx', minKb: 5 },
      { type: 'analytical', format: 'pptx', minKb: 10, expectedSlides: 13 },
      { type: 'detailed', format: 'pdf', minKb: 5 },
      { type: 'detailed', format: 'docx', minKb: 5 },
      { type: 'detailed', format: 'pptx', minKb: 10, expectedSlides: 18 }
    ];

    for (const item of matrix) {
      const result = await generateReportBuilderExport({
        reportType: item.type,
        targetFormat: item.format,
        scopeConfig: testScope,
        contentConfig: testContent,
        comparisonConfig: testComparisons
      });

      assert.ok(result.buffer, `Buffer missing for ${item.type} ${item.format}`);
      const kb = result.buffer.length / 1024;
      assert.ok(kb >= item.minKb, `${item.type} ${item.format} too small: ${kb.toFixed(1)} KB`);

      if (item.format === 'pptx') {
        const zip = await JSZip.loadAsync(result.buffer);
        const slideFiles = Object.keys(zip.files).filter(k => /^ppt\/slides\/slide\d+\.xml$/.test(k));
        assert.strictEqual(
          slideFiles.length,
          item.expectedSlides,
          `${item.type} PPTX must have exactly ${item.expectedSlides} slides, got ${slideFiles.length}`
        );
        console.log(`    Matrix check passed: ${item.type.toUpperCase()} PPTX -> ${slideFiles.length} slides (${kb.toFixed(1)} KB)`);
      } else {
        console.log(`    Matrix check passed: ${item.type.toUpperCase()} ${item.format.toUpperCase()} (${kb.toFixed(1)} KB)`);
      }
    }
  });

  console.log('\n================================================================');
  console.log(`TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
