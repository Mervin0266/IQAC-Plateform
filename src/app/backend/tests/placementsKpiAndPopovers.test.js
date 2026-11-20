const assert = require('assert');

console.log('--- Testing Placement KPI & Popovers Calculation Logic ---');

// Mock data representing realistic placement records with duplicates & multi-offers
const samplePlacementOffers = [
  // Student 1: 2 offers (4.5 and 8.0 LPA) -> highest should be 8.0 LPA
  { studentId: '2364001', studentName: 'Aarav Menon', department: 'AI and Data Science Engineering', course: 'BTCSAIML', company: 'TVS Motor', package: 4.5, placementType: 'placement', batch: '2023-2024' },
  { studentId: '2364001', studentName: 'Aarav Menon', department: 'AI and Data Science Engineering', course: 'BTCSAIML', company: 'Cognizant', package: 8.0, placementType: 'placement', batch: '2023-2024' },
  
  // Student 2: 1 offer (6.0 LPA)
  { studentId: '2364002', studentName: 'Ananya Nair', department: 'Computer Science and Engineering', course: 'BTCS', company: 'LTI Mindtree', package: 6.0, placementType: 'placement', batch: '2023-2024' },
  
  // Student 3: 2 offers (7.5 and 15.0 LPA) -> highest should be 15.0 LPA
  { studentId: '2364003', studentName: 'Rohan Kumar', department: 'Electronics and Communication Engineering', course: 'BTCECE', company: 'Schneider Electric', package: 7.5, placementType: 'placement', batch: '2023-2024' },
  { studentId: '2364003', studentName: 'Rohan Kumar', department: 'Electronics and Communication Engineering', course: 'BTCECE', company: 'Texas Instruments', package: 15.0, placementType: 'placement', batch: '2023-2024' },

  // Student 4: Tied for highest (15.0 LPA)
  { studentId: '2364004', studentName: 'Priya Sharma', department: 'Computer Science and Engineering', course: 'BTCS', company: 'Cisco', package: 15.0, placementType: 'placement', batch: '2023-2024' },

  // Internship record (should be ignored in placement CTC metrics)
  { studentId: '2364005', studentName: 'Dev Patel', department: 'Computer Science and Engineering', course: 'BTCS', company: 'Google', package: 50000, placementType: 'internship', batch: '2023-2024' }
];

function calculateKpis(records) {
  const placementList = records.filter(p => p.placementType === 'placement');
  const internshipList = records.filter(p => p.placementType === 'internship');

  const studentMap = new Map();
  placementList.forEach(p => {
    const regNo = (p.studentId || '').trim();
    const pkg = parseFloat(p.package || 0);
    const existing = studentMap.get(regNo);
    if (!existing) {
      studentMap.set(regNo, {
        studentId: regNo,
        studentName: p.studentName,
        department: p.department,
        offers: [p],
        highestOffer: p,
        maxPackage: pkg
      });
    } else {
      existing.offers.push(p);
      if (pkg > existing.maxPackage) {
        existing.maxPackage = pkg;
        existing.highestOffer = p;
      }
    }
  });

  const uniqueStudents = Array.from(studentMap.values());
  const packages = uniqueStudents.map(s => s.maxPackage).filter(p => p > 0);
  const n = packages.length;

  const avgPkg = n > 0 ? packages.reduce((sum, v) => sum + v, 0) / n : 0;
  const maxPkg = n > 0 ? Math.max(...packages) : 0;
  const tiedStudents = uniqueStudents.filter(s => Math.abs(s.maxPackage - maxPkg) < 0.001);

  const sorted = [...packages].sort((a, b) => a - b);
  let median = 0;
  if (n > 0) {
    const mid = Math.floor(n / 2);
    median = n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return {
    uniquePlacedCount: uniqueStudents.length,
    totalOffersCount: placementList.length,
    multiOfferCount: uniqueStudents.filter(s => s.offers.length > 1).length,
    packages,
    avgPkg,
    maxPkg,
    tiedStudentsCount: tiedStudents.length,
    median,
    totalInternships: internshipList.length
  };
}

const stats = calculateKpis(samplePlacementOffers);

console.log('Computed stats:', stats);

// Assertions:
// Total offers = 6, across 4 unique students (Aarav, Ananya, Rohan, Priya)
assert.strictEqual(stats.uniquePlacedCount, 4, 'Unique placed students count must be 4');
assert.strictEqual(stats.totalOffersCount, 6, 'Total placement offers count must be 6');
assert.strictEqual(stats.multiOfferCount, 2, 'Two students have multiple placement offers');

// Packages per student:
// Aarav: 8.0, Ananya: 6.0, Rohan: 15.0, Priya: 15.0
// Sorted: [6.0, 8.0, 15.0, 15.0]
assert.strictEqual(stats.maxPkg, 15.0, 'Highest package must be 15.0 LPA');
assert.strictEqual(stats.tiedStudentsCount, 2, 'Two students tied for highest package');

// Avg = (6 + 8 + 15 + 15) / 4 = 44 / 4 = 11.0 LPA
assert.strictEqual(stats.avgPkg, 11.0, 'Average package must be exactly 11.0 LPA');

// Median of [6.0, 8.0, 15.0, 15.0] = (8.0 + 15.0) / 2 = 11.5 LPA
assert.strictEqual(stats.median, 11.5, 'Median package for even n=4 must be 11.5 LPA');

// Internships count must be preserved = 1
assert.strictEqual(stats.totalInternships, 1, 'Internships count must be preserved');

console.log('✓ All Placement KPI & Popover calculation tests PASSED!');
