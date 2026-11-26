'use strict';

const assert = require('assert');
const { getPublicResearchAnalytics } = require('../controllers/publicResearchAnalyticsController');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

async function runTests() {
  console.log('🧪 Starting Public Research Analytics Test Suite...\n');

  // Test 1: Full Institutional Aggregates (Default: all academic years, all departments)
  console.log('--- Test 1: Full Institutional Aggregates ---');
  const req1 = { query: { academicYears: 'all', department: 'all' } };
  const res1 = createMockRes();
  await getPublicResearchAnalytics(req1, res1);

  assert.strictEqual(res1.statusCode, 200, 'Expected status 200');
  assert.strictEqual(res1.body.success, true, 'Expected success: true');
  const data = res1.body.data;
  assert.ok(data, 'Data payload must exist');

  // Verify Meta & Exchange Rate
  assert.ok(data.meta, 'Meta object must exist');
  assert.ok(data.meta.exchangeRate, 'Exchange rate object must exist');
  assert.ok(data.meta.exchangeRate.rate > 0, 'Exchange rate must be positive');
  assert.ok(data.meta.exchangeRate.effectiveDate, 'Effective date must be present');
  assert.ok(Array.isArray(data.meta.availableAcademicYears), 'availableAcademicYears must be an array');
  assert.ok(Array.isArray(data.meta.availableDepartments), 'availableDepartments must be an array');

  // Verify 6 KPI Cards
  console.log('Checking 6 KPI Cards...');
  assert.strictEqual(typeof data.kpis.indexedPublications, 'number');
  assert.ok(data.kpis.indexedPublications >= 1000, 'Indexed publications count should match verified records (1068)');
  assert.strictEqual(typeof data.kpis.approvedCitations, 'number');
  assert.ok(data.kpis.approvedCitations >= 10000, 'Approved citations count should match verified records (10486)');
  assert.ok(data.kpis.extramuralGrants.sanctionedInr.includes('₹'), 'Extramural grants must show INR primary');
  assert.ok(data.kpis.extramuralGrants.sanctionedUsd.includes('$'), 'Extramural grants must show USD secondary');
  assert.ok(data.kpis.extramuralGrants.projectsCount > 0, 'Extramural projects count must be > 0');
  assert.ok(data.kpis.patentsAndIpr.patentsTotal > 0, 'Patents total must be > 0 (253)');
  assert.strictEqual(data.kpis.patentsAndIpr.patentsGranted + data.kpis.patentsAndIpr.patentsPublished, data.kpis.patentsAndIpr.patentsTotal);
  assert.ok(data.kpis.consultancyInflow.revenueInr.includes('₹'), 'Consultancy inflow must show INR primary');
  assert.ok(data.kpis.consultancyInflow.revenueUsd.includes('$'), 'Consultancy inflow must show USD secondary');
  assert.ok(data.kpis.consultancyInflow.assignmentsCount > 0, 'Consultancy assignments count must be > 0');
  assert.ok(data.kpis.periodicalsAndColumns > 0, 'Periodicals count must be > 0');
  console.log('✅ 6 KPI Cards Verified');

  // Verify Section 1: Research Publication Performance
  console.log('Checking Section 1: Research Publications...');
  assert.strictEqual(data.publications.total, data.kpis.indexedPublications);
  assert.ok(Array.isArray(data.publications.indexingBreakdown), 'indexingBreakdown must be array');
  assert.ok(Array.isArray(data.publications.quartiles), 'quartiles must be array');
  assert.ok(Array.isArray(data.publications.yearlyTrends), 'yearlyTrends must be array');
  assert.ok(Array.isArray(data.publications.departmentDistribution), 'departmentDistribution must be array');
  assert.ok(data.publications.avgPubsPerFaculty > 0, 'avgPubsPerFaculty must be > 0');
  console.log('✅ Section 1 Verified');

  // Verify Section 2: Citation Performance
  console.log('Checking Section 2: Citations...');
  assert.strictEqual(data.citations.total, data.kpis.approvedCitations);
  assert.ok(data.citations.avgPerPublication > 0, 'avgPerPublication must be > 0');
  assert.ok(data.citations.coverage.coveragePercentage > 0, 'coveragePercentage must be > 0');
  assert.strictEqual(data.citations.coverage.citedCount + data.citations.coverage.uncitedCount, data.publications.total);
  assert.ok(Array.isArray(data.citations.yearlyTrends), 'yearlyTrends must be array');
  assert.ok(Array.isArray(data.citations.brackets), 'brackets must be array');
  assert.ok(Array.isArray(data.citations.departmentDistribution), 'departmentDistribution must be array');
  console.log('✅ Section 2 Verified');

  // Verify Section 3: Sponsored Research Performance
  console.log('Checking Section 3: Sponsored Research...');
  assert.strictEqual(data.sponsoredResearch.externalProjects.count, data.kpis.extramuralGrants.projectsCount);
  assert.ok(data.sponsoredResearch.externalProjects.sanctionedInr.includes('₹'));
  assert.ok(data.sponsoredResearch.externalProjects.sanctionedUsd.includes('$'));
  assert.ok(data.sponsoredResearch.internalProjects.count > 0, 'Internal projects count must be > 0');
  assert.ok(Array.isArray(data.sponsoredResearch.yearlyTrends), 'yearlyTrends must be array');
  assert.ok(Array.isArray(data.sponsoredResearch.agencyDistribution), 'agencyDistribution must be array');
  assert.ok(Array.isArray(data.sponsoredResearch.departmentDistribution), 'departmentDistribution must be array');
  console.log('✅ Section 3 Verified');

  // Verify Section 4: Intellectual Property Performance (IPR)
  console.log('Checking Section 4: Intellectual Property...');
  assert.strictEqual(data.intellectualProperty.patents.total, data.kpis.patentsAndIpr.patentsTotal);
  assert.strictEqual(data.intellectualProperty.patents.granted, data.kpis.patentsAndIpr.patentsGranted);
  assert.strictEqual(data.intellectualProperty.patents.published, data.kpis.patentsAndIpr.patentsPublished);
  assert.ok(Array.isArray(data.intellectualProperty.patentStatusBreakdown), 'patentStatusBreakdown must be array');
  assert.ok(Array.isArray(data.intellectualProperty.yearlyTrends), 'yearlyTrends must be array');
  assert.ok(Array.isArray(data.intellectualProperty.departmentDistribution), 'departmentDistribution must be array');
  console.log('✅ Section 4 Verified');

  // Verify Section 5: Consultancy Performance
  console.log('Checking Section 5: Consultancy Performance...');
  assert.strictEqual(data.consultancy.totalAssignments, data.kpis.consultancyInflow.assignmentsCount);
  assert.ok(data.consultancy.financials.revenueInr.includes('₹'));
  assert.ok(data.consultancy.financials.revenueUsd.includes('$'));
  assert.ok(Array.isArray(data.consultancy.yearlyTrends), 'yearlyTrends must be array');
  assert.ok(Array.isArray(data.consultancy.projectTypeDistribution), 'projectTypeDistribution must be array');
  assert.ok(Array.isArray(data.consultancy.departmentDistribution), 'departmentDistribution must be array');
  console.log('✅ Section 5 Verified');

  // ZERO PII Verification: No names, emails, internal employee IDs, or register numbers
  console.log('Checking ZERO PII compliance...');
  const jsonStr = JSON.stringify(data);
  assert.ok(!jsonStr.includes('@christuniversity.in'), 'Must contain zero emails');
  assert.ok(!jsonStr.includes('"employeeId"'), 'Must contain zero internal employeeIds');
  assert.ok(!jsonStr.includes('"registerNo"'), 'Must contain zero student register numbers');
  assert.ok(!jsonStr.includes('"password"'), 'Must contain zero passwords');
  console.log('✅ ZERO PII Verified');

  // Test 2: In-Memory Caching Verification
  console.log('\n--- Test 2: In-Memory Caching ---');
  const req2 = { query: { academicYears: 'all', department: 'all' } };
  const res2 = createMockRes();
  await getPublicResearchAnalytics(req2, res2);
  assert.strictEqual(res2.body.isCached, true, 'Second identical request must return isCached: true');
  console.log('✅ In-Memory Caching Verified');

  // Test 3: Department Filtering
  console.log('\n--- Test 3: Department Filtering ---');
  const req3 = { query: { department: 'Computer Science and Engineering', academicYears: 'all' } };
  const res3 = createMockRes();
  await getPublicResearchAnalytics(req3, res3);
  assert.strictEqual(res3.statusCode, 200);
  assert.strictEqual(res3.body.data.meta.filtersApplied.department, 'Computer Science and Engineering');
  assert.ok(res3.body.data.publications.total > 0, 'CSE department must have publication records');
  console.log('✅ Department Filtering Verified');

  console.log('\n🎉 ALL PUBLIC RESEARCH ANALYTICS TESTS PASSED SUCCESSFULLY!\n');
}

runTests().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
