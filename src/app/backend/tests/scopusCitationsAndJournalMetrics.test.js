/**
 * Test Suite: Scopus Publication Citation Analysis (Workflow A)
 * & Journal Metrics Integration (Workflow B)
 */

const assert = require('assert');
const { calculateQuartileFromPercentile, resolveBestQuartile } = require('../services/scopusService');

async function runTests() {
  console.log('================================================================');
  console.log('  CHRIST University IQAC - Scopus Citations & Journal Metrics');
  console.log('  Workflow A (Publication Citations) & Workflow B (Journal Metrics)');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [FAIL] ${name}`);
      console.error(`    ${err.message}`);
    }
  }

  // 1. Quartile calculation from percentiles
  test('calculateQuartileFromPercentile: Q1 (99th to 75th percentile)', () => {
    assert.strictEqual(calculateQuartileFromPercentile(99), 'Q1');
    assert.strictEqual(calculateQuartileFromPercentile(75), 'Q1');
    assert.strictEqual(calculateQuartileFromPercentile(75.5), 'Q1');
  });

  test('calculateQuartileFromPercentile: Q2 (74.99th to 50th percentile)', () => {
    assert.strictEqual(calculateQuartileFromPercentile(74.9), 'Q2');
    assert.strictEqual(calculateQuartileFromPercentile(50), 'Q2');
  });

  test('calculateQuartileFromPercentile: Q3 (49.99th to 25th percentile)', () => {
    assert.strictEqual(calculateQuartileFromPercentile(49.9), 'Q3');
    assert.strictEqual(calculateQuartileFromPercentile(25), 'Q3');
  });

  test('calculateQuartileFromPercentile: Q4 (below 25th percentile)', () => {
    assert.strictEqual(calculateQuartileFromPercentile(24.9), 'Q4');
    assert.strictEqual(calculateQuartileFromPercentile(0), 'Q4');
  });

  test('calculateQuartileFromPercentile: invalid values return null', () => {
    assert.strictEqual(calculateQuartileFromPercentile(null), null);
    assert.strictEqual(calculateQuartileFromPercentile(undefined), null);
    assert.strictEqual(calculateQuartileFromPercentile(NaN), null);
  });

  // 2. Best Quartile Resolution
  test('resolveBestQuartile: picks highest rank (Q1 > Q2 > Q3 > Q4)', () => {
    assert.strictEqual(resolveBestQuartile(['Q3', 'Q1', 'Q2']), 'Q1');
    assert.strictEqual(resolveBestQuartile(['Q4', 'Q3']), 'Q3');
    assert.strictEqual(resolveBestQuartile(['Q4']), 'Q4');
    assert.strictEqual(resolveBestQuartile([]), null);
  });

  // 3. Cumulative Running Sum Calculation
  test('Cumulative Series Calculation: running totals computed accurately', () => {
    const sortedYearDetails = [
      { period: '2020', citationCount: 5, excludingSelfCount: 4 },
      { period: '2021', citationCount: 10, excludingSelfCount: 8 },
      { period: '2022', citationCount: 15, excludingSelfCount: 12 }
    ];

    let runAll = 0;
    let runExSelf = 0;
    const series = sortedYearDetails.map(yd => {
      runAll += yd.citationCount;
      runExSelf += yd.excludingSelfCount;
      return {
        period: yd.period,
        annualAll: yd.citationCount,
        cumulativeAll: runAll,
        annualExcludingSelf: yd.excludingSelfCount,
        cumulativeExcludingSelf: runExSelf
      };
    });

    assert.strictEqual(series[0].cumulativeAll, 5);
    assert.strictEqual(series[1].cumulativeAll, 15);
    assert.strictEqual(series[2].cumulativeAll, 30);
    assert.strictEqual(series[2].cumulativeExcludingSelf, 24);
  });

  // 4. Faculty Identity Safeguard
  test('Faculty Identity: SCOPUS_API must never be stored as genuine faculty ID', () => {
    const snapshotEmpId = 'SCOPUS_API';
    const verifiedFaculty = { employeeId: 'FAC10234', name: 'Dr. Jane Doe' };

    const effectiveEmpId = (snapshotEmpId && snapshotEmpId !== 'SCOPUS_API')
      ? snapshotEmpId
      : (verifiedFaculty?.employeeId || 'Institutional Research');

    assert.strictEqual(effectiveEmpId, 'FAC10234');
    assert.notStrictEqual(effectiveEmpId, 'SCOPUS_API');
  });

  console.log('\n================================================================');
  console.log(`   Scopus Citations & Journal Metrics Tests: ${passed}/${total} Passed`);
  console.log('================================================================\n');

  if (passed !== total) process.exit(1);
}

runTests();
