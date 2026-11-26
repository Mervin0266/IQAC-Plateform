const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateReport, placementSummary } = require('../utils/publicReportData');

test('public reports preserve verified zero and exclude fields outside the public schema', () => {
  const input = {
    source: 'Career services', url: 'https://example.com/summary',
    metrics: { Recruiters: 0, 'Average package': '' },
    records: [{ title: 'Department overview', category: '', detail: '', url: '', studentId: 'internal' }],
  };
  const report = validateReport('placements-internships', input);
  assert.deepEqual(report.metrics, { Recruiters: 0 });
  assert.equal(Object.hasOwn(report.records[0], 'studentId'), false);
  assert.throws(() => validateReport('placements-internships', { ...input, url: 'javascript:alert(1)' }));
  assert.throws(() => validateReport('placements-internships', { ...input, metrics: { Recruiters: 1.5 } }));
  assert.throws(() => validateReport('rankings', { ...input, metrics: { 'NAAC valid until': '2026-02-30' } }));
});

test('placement rollups deduplicate students and use valid full-time offers for package figures', () => {
  const rows = [
    { placementType: 'placement', studentId: 'a', company: 'Org A', package: '4.00' },
    { placementType: 'placement', studentId: 'a', company: 'Org B', package: '8.00' },
    { placementType: 'placement', studentId: 'b', company: 'org a', package: 0 },
    { placementType: 'internship', studentId: 'c', company: 'Other', package: 100 },
  ];
  assert.deepEqual(placementSummary(rows), {
    'Students with full-time offers': 2,
    Recruiters: 2,
    'Average package': 6,
    'Median package': 6,
    'Highest package': 8,
  });
});
