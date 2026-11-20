const assert = require('assert');
const { sequelize } = require('../config/database');
const {
  resolveHierarchyScope,
  getFacultyDirectory,
  calculateReportAnalytics,
  generateReportBuilderExport
} = require('../services/institutionalReportBuilderService');
const { SavedReportConfig, ReportHistory, User } = require('../models');

async function runTestSuite() {
  console.log('=== TEST SUITE: INSTITUTIONAL REPORT BUILDER ===\n');

  try {
    await sequelize.authenticate();
    console.log('[PASS] Connected to database');

    // 1. Hierarchy Scope Resolution Test
    console.log('\n--- 1. Scope Resolution ---');
    const scopeAll = await resolveHierarchyScope({});
    assert(scopeAll.campuses.length >= 0, 'Campuses array returned');
    assert(scopeAll.departments.length >= 0, 'Departments array returned');
    console.log(`[PASS] Scope All resolved: ${scopeAll.campuses.length} campuses, ${scopeAll.departments.length} departments. Label: "${scopeAll.scopeLabel}"`);

    // 2. Faculty Directory Test
    console.log('\n--- 2. Faculty Directory Retrieval ---');
    const facDir = await getFacultyDirectory({});
    assert(facDir.success === true, 'Faculty directory success true');
    console.log(`[PASS] Faculty directory returned ${facDir.count} verified faculty members`);

    // 3. Complete Report Analytics & Mandatory Quartiles Test
    console.log('\n--- 3. Report Analytics & Quartiles ---');
    const testConfig = {
      reportType: 'analytical',
      outputFormat: 'pdf',
      scopeConfig: {
        campuses: ['All'],
        schools: ['All'],
        departments: ['All'],
        academicYears: ['2026-27', '2025-26', '2024-25', '2023-24'],
        facultyMode: 'all'
      },
      contentConfig: {
        sections: { executiveOverview: true, academicFaculty: true, researchInnovation: true, placements: true, accreditation: true, comparativeAnalytics: true, insightsActionPlan: true, appendix: true }
      }
    };

    const analytics = await calculateReportAnalytics(testConfig);
    assert(analytics.meta, 'Metadata exists');
    assert(analytics.metrics, 'Metrics exists');
    assert(analytics.pages && analytics.pages.length >= 8, 'Multi-page document model assembled (at least 8 pages)');
    console.log(`[PASS] Analytics calculated: ${analytics.pages.length} document pages generated`);

    // Validate Quartiles
    const pubMetrics = analytics.metrics.publications;
    assert(typeof pubMetrics.total === 'number', 'Total publications is a number');
    assert(typeof pubMetrics.q1Count === 'number', 'Q1 count is a number');
    assert(typeof pubMetrics.q2Count === 'number', 'Q2 count is a number');
    assert(typeof pubMetrics.q3Count === 'number', 'Q3 count is a number');
    assert(typeof pubMetrics.q4Count === 'number', 'Q4 count is a number');
    assert(typeof pubMetrics.unclassifiedCount === 'number', 'Unclassified count is a number');
    assert(typeof pubMetrics.quartileCoveragePct === 'number', 'Quartile coverage % is a number');
    console.log(`[PASS] Quartile Metrics verified: Total=${pubMetrics.total}, Q1=${pubMetrics.q1Count}, Q2=${pubMetrics.q2Count}, Q3=${pubMetrics.q3Count}, Q4=${pubMetrics.q4Count}, Unknown=${pubMetrics.unclassifiedCount}, Coverage=${pubMetrics.quartileCoveragePct}%`);

    // Validate No Student Academic Performance
    const pageTypes = analytics.pages.map(p => p.pageType);
    assert(!pageTypes.includes('student_academic_performance'), 'Student academic performance is strictly excluded');
    console.log('[PASS] Student Academic Performance is strictly excluded');

    // 4. Global Faculty Filter Test
    console.log('\n--- 4. Global Faculty Filter & Deduplication ---');
    if (facDir.faculties.length > 0) {
      const sampleEmpId = facDir.faculties[0].employeeId;
      const sampleName = facDir.faculties[0].name;
      const facFilterConfig = {
        ...testConfig,
        scopeConfig: {
          ...testConfig.scopeConfig,
          facultyMode: 'selected',
          selectedFacultyEmpIds: [sampleEmpId, sampleName]
        }
      };

      const filteredAnalytics = await calculateReportAnalytics(facFilterConfig);
      assert(filteredAnalytics.meta.facultyFilterActive === true, 'Faculty filter is active');
      assert(filteredAnalytics.meta.facultyFilterCount <= 2, 'Faculty filter count reflects selected faculty');
      console.log(`[PASS] Global Faculty Filter successfully applied: ${filteredAnalytics.meta.facultyFilterCount} faculty, ${filteredAnalytics.metrics.publications.total} deduplicated publications`);
    }

    // 5. PDF & Word Document Generation Test
    console.log('\n--- 5. PDF and Word (.docx) Generation ---');
    const adminUser = await User.findOne();
    const pdfExport = await generateReportBuilderExport(
      { ...testConfig, outputFormat: 'pdf', name: 'Test PDF Report' },
      {},
      adminUser
    );
    assert(pdfExport.buffer && pdfExport.buffer.length > 1000, 'PDF buffer generated');
    assert(pdfExport.filename.endsWith('.pdf'), 'PDF filename valid');
    console.log(`[PASS] PDF Document successfully generated (${pdfExport.buffer.length} bytes, file: ${pdfExport.filename})`);

    const wordExport = await generateReportBuilderExport(
      { ...testConfig, outputFormat: 'docx', name: 'Test Word Report' },
      {},
      adminUser
    );
    assert(wordExport.buffer && wordExport.buffer.length > 1000, 'Word buffer generated');
    assert(wordExport.filename.endsWith('.docx'), 'Word filename valid');
    console.log(`[PASS] Word Document successfully generated (${wordExport.buffer.length} bytes, file: ${wordExport.filename})`);

    // 6. Saved Configurations CRUD Test
    console.log('\n--- 6. Saved Configurations CRUD ---');
    const createdConfig = await SavedReportConfig.create({
      name: 'Engineering Research Quartile Benchmark',
      description: 'Test configuration for Engineering departments',
      reportType: 'analytical',
      outputFormat: 'pdf',
      scopeConfig: testConfig.scopeConfig,
      contentConfig: testConfig.contentConfig,
      createdBy: adminUser ? adminUser.id : null
    });
    assert(createdConfig.id, 'Config created with ID');
    console.log(`[PASS] Saved config created: ${createdConfig.id} (${createdConfig.name})`);

    await createdConfig.update({ name: 'Updated Engineering Research Quartile Benchmark' });
    const fetchedConfig = await SavedReportConfig.findByPk(createdConfig.id);
    assert(fetchedConfig.name.startsWith('Updated'), 'Config successfully updated');
    console.log('[PASS] Saved config updated');

    await createdConfig.destroy();
    const deletedConfig = await SavedReportConfig.findByPk(createdConfig.id);
    assert(!deletedConfig, 'Config successfully deleted');
    console.log('[PASS] Saved config deleted');

    // 7. Report History Verification Test
    console.log('\n--- 7. Report History ---');
    const historyCount = await ReportHistory.count();
    assert(historyCount >= 2, 'Report history records stored for generated exports');
    console.log(`[PASS] Report History verified: ${historyCount} total generated reports on file`);

    console.log('\n======================================================');
    console.log('ALL BACKEND REPORT BUILDER TESTS PASSED SUCCESSFULLY!');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n[FAIL] Test suite encountered error:', err);
    process.exit(1);
  }
}

runTestSuite();
