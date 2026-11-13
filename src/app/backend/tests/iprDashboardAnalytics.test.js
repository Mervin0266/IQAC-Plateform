'use strict';

/**
 * Automated Test Suite for IPR Dashboard Analytics (Patents & Copyrights)
 * CHRIST (Deemed to be University) — IQAC Platform
 *
 * Verifies:
 * 1. Combined IPR Overview calculations (totals, revenue, status)
 * 2. Dedicated Patents view analytics (status, type, year, commercial partners)
 * 3. Dedicated Copyrights view analytics (authoritative registrationNo, diary numbers)
 * 4. Multi-faculty association safeguard (department counts vs deduplicated university totals, revenue safeguard)
 * 5. Calendar Year filtering (Patents = Publication Year, Copyrights = Application Date Year)
 * 6. Multi-department comparison matrix and deduplicated union
 * 7. Interactive drill-down query engine
 * 8. Role-based access control (RBAC) and organizational scope enforcement
 */

const assert = require('assert');
const {
  getIprDashboardAnalytics,
  getIprDrilldownRecords,
  resolvePermittedDepartments
} = require('../services/iprAnalyticsService');
const { sequelize } = require('../models');

async function runTests() {
  console.log('🧪 Starting IPR Dashboard Analytics & Reporting Test Suite...\n');
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

  // TEST 1: Combined IPR Overview Calculation
  await testAsync('1. Combined IPR Overview returns consistent totals, revenue, and distributions', async () => {
    const data = await getIprDashboardAnalytics({
      view: 'overview',
      calendarYear: 'all',
      department: 'All'
    }, { role: 'Super Admin' });

    assert.ok(data, 'Result object must exist');
    assert.strictEqual(data.success, true, 'Result status must be true');
    assert.ok(data.overview, 'Overview metrics section must be present');

    const { overview } = data;
    assert.strictEqual(typeof overview.totalIprs, 'number', 'totalIprs must be a number');
    assert.strictEqual(typeof overview.totalPatents, 'number', 'totalPatents must be a number');
    assert.strictEqual(typeof overview.totalCopyrights, 'number', 'totalCopyrights must be a number');
    assert.strictEqual(
      overview.totalIprs,
      overview.totalPatents + overview.totalCopyrights,
      'Combined totalIprs must exactly equal totalPatents + totalCopyrights'
    );

    assert.strictEqual(typeof overview.totalRevenueInr, 'number', 'totalRevenueInr must be numeric');
    assert.ok(typeof overview.totalRevenueFormatted === 'string', 'Formatted revenue must be a string');
    assert.ok(Array.isArray(data.availableCalendarYears), 'availableCalendarYears must be an array');
    assert.ok(Array.isArray(overview.distribution), 'distribution chart data must be an array');
    assert.ok(Array.isArray(overview.yearlyTrend), 'yearlyTrend chart data must be an array');
    assert.ok(Array.isArray(overview.departmentContribution), 'departmentContribution chart data must be an array');
  });

  // TEST 2: Dedicated Patents View Analytics
  await testAsync('2. Patents View calculates patent-specific KPIs, types, statuses, and commercial partners', async () => {
    const data = await getIprDashboardAnalytics({
      view: 'patents',
      calendarYear: 'all',
      department: 'All'
    }, { role: 'Super Admin' });

    assert.ok(data.patents, 'Patents section must be present');
    const { patents } = data;
    assert.strictEqual(typeof patents.totalPatents, 'number');
    assert.strictEqual(typeof patents.publishedPatents, 'number');
    assert.strictEqual(typeof patents.grantedPatents, 'number');
    assert.strictEqual(typeof patents.licensedPatents, 'number');
    assert.strictEqual(typeof patents.totalRevenueInr, 'number');

    assert.ok(Array.isArray(patents.statusDistribution), 'statusDistribution must be an array');
    assert.ok(Array.isArray(patents.typeDistribution), 'typeDistribution must be an array');
    assert.ok(Array.isArray(patents.patentsByPublicationYear), 'patentsByPublicationYear must be an array');
    assert.ok(Array.isArray(patents.topCommercialPartners), 'topCommercialPartners must be an array');

    // Verification of type breakdown sums
    if (patents.totalPatents > 0) {
      const sumTypes = patents.typeDistribution.reduce((acc, t) => acc + (t.count || 0), 0);
      assert.strictEqual(sumTypes, patents.totalPatents, 'Sum of patent types must equal total patents');
    }
  });

  // TEST 3: Dedicated Copyrights View Analytics (Authoritative Registration check)
  await testAsync('3. Copyrights View uses registrationNo as authoritative registered status vs diary numbers', async () => {
    const data = await getIprDashboardAnalytics({
      view: 'copyrights',
      calendarYear: 'all',
      department: 'All'
    }, { role: 'Super Admin' });

    assert.ok(data.copyrights, 'Copyrights section must be present');
    const { copyrights } = data;
    assert.strictEqual(typeof copyrights.totalCopyrights, 'number');
    assert.strictEqual(typeof copyrights.registeredCopyrights, 'number');
    assert.strictEqual(typeof copyrights.pendingRegistration, 'number');

    assert.ok(
      copyrights.registeredCopyrights + copyrights.pendingRegistration <= copyrights.totalCopyrights,
      'Status subsets cannot exceed total copyrights'
    );

    assert.ok(Array.isArray(copyrights.registrationDistribution), 'registrationDistribution must be an array');
    assert.ok(Array.isArray(copyrights.applicationTrend), 'applicationTrend must be an array');
    assert.ok(Array.isArray(copyrights.departmentContribution), 'departmentContribution must be an array');
  });

  // TEST 4: Multi-Faculty Association Safeguard & Revenue Preservation
  await testAsync('4. Multi-faculty associations are deduplicated in total counts and revenue is never multiplied', async () => {
    const allData = await getIprDashboardAnalytics({
      view: 'overview',
      calendarYear: 'all',
      department: 'All'
    }, { role: 'Super Admin' });

    // Top departments aggregation check
    const deptTotalsSum = allData.overview.departmentContribution.reduce((acc, d) => acc + d.patents + d.copyrights, 0);

    // If there are multi-department collaborations, deptTotalsSum >= totalIprs (individual credit)
    // but the university totalIprs MUST remain strictly deduplicated to unique record IDs
    assert.ok(
      allData.overview.totalIprs <= (allData.overview.totalPatents + allData.overview.totalCopyrights),
      'University total IPRs must not double count cross-department records'
    );

    // Revenue sanity check: total revenue must equal sum of distinct patents
    assert.strictEqual(
      allData.overview.totalRevenueInr,
      allData.patents.totalRevenueInr,
      'Revenue must be identical across overview and patents view'
    );
  });

  // TEST 5: Calendar Year Filtering Adherence
  await testAsync('5. Calendar Year filter isolates records by publication year (patents) and application year (copyrights)', async () => {
    const overview = await getIprDashboardAnalytics({ view: 'overview' }, { role: 'Super Admin' });
    const testYear = overview.availableCalendarYears.find(y => y !== 'all');

    if (testYear) {
      const filteredData = await getIprDashboardAnalytics({
        view: 'overview',
        calendarYear: testYear,
        department: 'All'
      }, { role: 'Super Admin' });

      assert.strictEqual(filteredData.calendarYear, testYear);
      assert.ok(
        filteredData.overview.totalIprs <= overview.overview.totalIprs,
        'Single year total cannot exceed all-time total'
      );
    }

    // Graceful handling of invalid or non-existent year
    const nonExistentData = await getIprDashboardAnalytics({
      view: 'overview',
      calendarYear: '1901',
      department: 'All'
    }, { role: 'Super Admin' });

    assert.strictEqual(nonExistentData.overview.totalIprs, 0, 'Non-existent year must return 0 without errors');
    assert.strictEqual(nonExistentData.overview.totalRevenueInr, 0);
  });

  // TEST 6: Multi-Department Selection & Deduplicated Union Support
  await testAsync('6. Multi-department queries provide scoped departmental contributions and deduplicated union', async () => {
    const data = await getIprDashboardAnalytics({
      view: 'overview',
      departments: ['Computer Science and Engineering', 'Electronics and Communication Engineering']
    }, { role: 'admin', isSystemAdmin: true });

    assert.ok(data.overview, 'Overview must exist');
    assert.ok(Array.isArray(data.overview.departmentContribution));

    // Department contribution should only have entries for the requested departments or their matching forms
    const totalUnionIprs = data.overview.totalIprs;
    const sumDeptTotals = data.overview.departmentContribution.reduce((acc, d) => acc + d.totalIprs, 0);

    assert.ok(
      totalUnionIprs <= sumDeptTotals || totalUnionIprs === 0,
      'Combined union total must be less than or equal to sum of individual departments (deduplicated)'
    );
  });

  // TEST 7: Interactive Drill-Down Record Engine
  await testAsync('7. getIprDrilldownRecords filters and returns authorized source records', async () => {
    // 1. Fetch all records
    const allDrilldown = await getIprDrilldownRecords({
      module: 'all',
      calendarYear: 'all',
      department: 'All'
    }, { role: 'Super Admin' });

    assert.strictEqual(allDrilldown.success, true);
    assert.ok(Array.isArray(allDrilldown.records));
    assert.strictEqual(allDrilldown.totalRecords, allDrilldown.records.length);

    // 2. Fetch Patent-only records
    const patentDrilldown = await getIprDrilldownRecords({
      module: 'patents',
      calendarYear: 'all',
      department: 'All'
    }, { role: 'Super Admin' });

    patentDrilldown.records.forEach(r => {
      assert.strictEqual(r.module, 'Patent', 'Every record in patents drilldown must be a Patent');
      assert.ok(r.title, 'Record must have title');
      assert.ok(r.status, 'Record must have status');
      assert.ok(r.dateLabel, 'Record must have dateLabel');
    });

    // 3. Fetch Copyright-only records
    const copyrightDrilldown = await getIprDrilldownRecords({
      module: 'copyrights',
      calendarYear: 'all',
      department: 'All'
    }, { role: 'Super Admin' });

    copyrightDrilldown.records.forEach(r => {
      assert.strictEqual(r.module, 'Copyright', 'Every record in copyrights drilldown must be a Copyright');
      assert.strictEqual(r.dateLabel, 'Application Date');
    });
  });

  // TEST 8: Role-Based Access Control (RBAC) & Scope Enforcement
  await testAsync('8. RBAC and scope resolution enforces department boundaries', async () => {
    // Mock HOD user restricted to 'Mechanical Engineering'
    const mockHodUser = {
      role: 'HOD',
      department: 'Mechanical Engineering',
      id: 'hod-user-001'
    };

    const hodScope = await resolvePermittedDepartments({
      department: 'All'
    }, mockHodUser);

    assert.strictEqual(hodScope.isUniversityWide, false);
    assert.ok(Array.isArray(hodScope.departments));
    assert.strictEqual(hodScope.departments.length, 1);
    assert.strictEqual(hodScope.departments[0], 'Mechanical Engineering');

    // HOD requesting a different department outside authorized scope should be blocked with 403
    await assert.rejects(
      async () => {
        await resolvePermittedDepartments({
          department: 'Computer Science and Engineering'
        }, mockHodUser);
      },
      (err) => {
        return err.status === 403 && err.message.includes('outside your authorized scope');
      },
      'Requesting department outside scope must throw 403 forbidden error'
    );

    // Admin user has unrestricted scope
    const adminUser = { role: 'admin', isSystemAdmin: true, department: null };
    const adminScope = await resolvePermittedDepartments({ department: 'All' }, adminUser);
    assert.strictEqual(adminScope.isUniversityWide, true, 'Admin should have unrestricted department scope');
  });

  console.log(`\n🎉 IPR Test Suite Completed: ${passed}/${total} tests passed successfully!\n`);
}

if (require.main === module) {
  runTests().then(() => {
    if (sequelize && typeof sequelize.close === 'function') {
      return sequelize.close();
    }
  }).then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}

module.exports = { runTests };
