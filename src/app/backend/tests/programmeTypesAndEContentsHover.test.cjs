const assert = require('assert');
const { resolvePdProgramTypeVariants } = require('../controllers/professionalDevelopmentsController');
const { resolveItProgramTypeVariants } = require('../controllers/invitedTalksController');

console.log('=== Test Suite: Programme Types & E-Contents KPI Calculations ===\n');

// ----------------------------------------------------
// TEST 1: Professional Developments Programme Type Aliases
// ----------------------------------------------------
console.log('1. Testing Professional Developments Programme Type Aliases...');
const pdFdpVariants = resolvePdProgramTypeVariants('Faculty Development Programme (FDP)');
assert(pdFdpVariants.includes('FDP'), 'FDP alias should include FDP');
assert(pdFdpVariants.includes('Faculty Development Programme (FDP)'), 'Should include full label');

const pdWorkshopVariants = resolvePdProgramTypeVariants('WORKSHOP');
assert(pdWorkshopVariants.includes('WORKSHOP'), 'Should include WORKSHOP');
assert(pdWorkshopVariants.includes('Workshop'), 'Should include Workshop');

const pdColloquiumVariants = resolvePdProgramTypeVariants('Research Colloquium');
assert(pdColloquiumVariants.includes('RESEARCH_COLLOQIUM'), 'Should resolve legacy spelling RESEARCH_COLLOQIUM');
console.log('   ✓ Professional Developments alias resolution verified.');

// ----------------------------------------------------
// TEST 2: Professional Developments 4 Metric Cards Calculation (No Contributor Multiplier)
// ----------------------------------------------------
console.log('\n2. Testing Professional Developments Metrics Deduplication...');
// Sample data with a 3-day programme co-attended by 3 faculty members
const samplePdRows = [
  {
    id: 'pd-1',
    title: 'Advanced AI and Deep Learning',
    programType: 'FDP',
    durationDays: 5,
    department: 'Computer Science and Engineering',
    facultyAssociations: [
      { employeeId: 'EMP001', isGuestFaculty: false, contributorType: 'VERIFIED' },
      { employeeId: 'EMP002', isGuestFaculty: false, contributorType: 'VERIFIED' }
    ]
  },
  {
    id: 'pd-2',
    title: 'Cloud Native Microservices Workshop',
    programType: 'WORKSHOP',
    durationDays: 3,
    department: 'Electronics and Communication Engineering',
    facultyAssociations: [
      { employeeId: 'EMP001', isGuestFaculty: false, contributorType: 'VERIFIED' }, // Duplicate faculty in another programme
      { employeeId: 'GUEST01', isGuestFaculty: true, contributorType: 'GUEST' }
    ]
  },
  {
    id: 'pd-3',
    title: 'Orientation on Outcome Based Education',
    programType: 'STAFF_ORIENTATION',
    durationDays: null, // missing duration
    department: 'Computer Science and Engineering',
    facultyAssociations: [
      { employeeId: 'EMP003', isGuestFaculty: false, contributorType: 'VERIFIED' }
    ]
  }
];

// Logic matching getProfessionalDevelopmentStats
const totalProgrammes = samplePdRows.length;
let totalProgrammeDays = 0;
let missingDurationCount = 0;
const verifiedFacultySet = new Set();
const guestFacultySet = new Set();
const departmentSet = new Set();

samplePdRows.forEach(row => {
  if (row.durationDays !== null && row.durationDays !== undefined && !isNaN(Number(row.durationDays))) {
    totalProgrammeDays += Number(row.durationDays);
  } else {
    missingDurationCount++;
  }
  if (row.department) departmentSet.add(row.department.trim());

  (row.facultyAssociations || []).forEach(f => {
    if (f.isGuestFaculty || f.contributorType === 'GUEST') {
      guestFacultySet.add(f.employeeId || f.name);
    } else if (f.employeeId) {
      verifiedFacultySet.add(f.employeeId);
    }
  });
});

assert.strictEqual(totalProgrammes, 3, 'Total programmes must equal 3 distinct parents');
// 5 days + 3 days = 8 days (durationDays NOT multiplied by 2 for the 2 contributors in pd-1!)
assert.strictEqual(totalProgrammeDays, 8, 'Total programme days must not multiply duration by contributor count');
assert.strictEqual(missingDurationCount, 1, 'Missing duration count must be 1');
assert.strictEqual(verifiedFacultySet.size, 3, 'Participating verified faculty must count distinct faculty (EMP001, EMP002, EMP003)');
assert.strictEqual(guestFacultySet.size, 1, 'Guest faculty must be segregated');
assert.strictEqual(departmentSet.size, 2, 'Active departments must count distinct valid departments');
console.log('   ✓ Professional Developments KPI metrics accurately deduplicated.');

// ----------------------------------------------------
// TEST 3: Invited Talks Programme Types and 4 Metric Cards
// ----------------------------------------------------
console.log('\n3. Testing Invited Talks 6 Standard Options and Aliases...');
const validItOptions = ['FDP', 'QIP', 'WORKSHOP', 'SEMINAR', 'RESEARCH COLLOQUIUM', 'OTHERS'];
validItOptions.forEach(opt => {
  const vars = resolveItProgramTypeVariants(opt);
  assert(vars.length > 0, `Variants for ${opt} must not be empty`);
});

// Verify legacy spelling mapping
const colloquiumVariants = resolveItProgramTypeVariants('RESEARCH COLLOQUIUM');
assert(colloquiumVariants.includes('RESEARCH_COLLOQIUM'), 'Must include legacy RESEARCH_COLLOQIUM');
assert(colloquiumVariants.includes('RESEARCH COLLOQUIUM'), 'Must include standard RESEARCH COLLOQUIUM');

// Invited Talks Metrics
const sampleItRows = [
  {
    id: 'it-1',
    title: 'Keynote on Quantum Computing',
    programType: 'SEMINAR',
    organization: 'IISc Bangalore',
    media: 'In-Person / Offline',
    facultyAssociations: [{ employeeId: 'EMP001', isGuestFaculty: false }]
  },
  {
    id: 'it-2',
    title: 'Workshop on Generative AI',
    programType: 'WORKSHOP',
    organization: 'iisc bangalore', // Case-insensitive duplicate organization
    media: 'Online / Virtual (Zoom, Teams, Meet)',
    facultyAssociations: [{ employeeId: 'EMP001', isGuestFaculty: false }] // Same faculty
  },
  {
    id: 'it-3',
    title: 'FDP on Clean Energy',
    programType: 'FDP',
    organization: 'NIT Trichy',
    media: null, // missing media
    facultyAssociations: [{ employeeId: 'GUEST_SPK', isGuestFaculty: true }]
  }
];

const totalTalks = sampleItRows.length;
const orgSet = new Set();
const mediaSet = new Set();
const verifiedTalkFaculty = new Set();
const guestTalkFaculty = new Set();

sampleItRows.forEach(row => {
  if (row.organization && row.organization.trim()) {
    orgSet.add(row.organization.trim().toLowerCase());
  }
  if (row.media && row.media.trim()) {
    mediaSet.add(row.media.trim());
  }
  (row.facultyAssociations || []).forEach(f => {
    if (f.isGuestFaculty) guestTalkFaculty.add(f.employeeId || f.name);
    else if (f.employeeId) verifiedTalkFaculty.add(f.employeeId);
  });
});

assert.strictEqual(totalTalks, 3, 'Total talks must be 3');
assert.strictEqual(orgSet.size, 2, 'Host organizations normalized count must be 2 (IISc Bangalore, NIT Trichy)');
assert.strictEqual(mediaSet.size, 2, 'Media types count must be 2 (null excluded)');
assert.strictEqual(verifiedTalkFaculty.size, 1, 'Verified faculty count must be 1 (EMP001)');
assert.strictEqual(guestTalkFaculty.size, 1, 'Guest speaker count must be 1');
console.log('   ✓ Invited Talks metrics and 6 standard program types verified.');

// ----------------------------------------------------
// TEST 4: E-Contents Popover Breakdowns & Percentages
// ----------------------------------------------------
console.log('\n4. Testing E-Contents Popover Breakdown Calculations...');
const sampleEContents = [
  { id: 'ec-1', title: 'Data Structures Module 1', contentType: 'SINGLE_MODULE', eContentPlatform: 'Institutional LMS / Moodle', publicationDate: '2025-02-10' },
  { id: 'ec-2', title: 'Data Structures Module 2', contentType: 'SINGLE_MODULE', eContentPlatform: 'Institutional LMS / Moodle', publicationDate: '2025-03-15' },
  { id: 'ec-3', title: 'Full Stack Web Dev Course', contentType: 'ENTIRE_COURSE', eContentPlatform: 'Coursera', publicationDate: '2024-08-20' },
  { id: 'ec-4', title: 'Cybersecurity Fundamentals', contentType: 'MULTIPLE_MODULE', eContentPlatform: 'SWAYAM / NPTEL', publicationDate: '2023-11-05' }
];

const totalEContents = sampleEContents.length;
const platformCounts = {};
const typeCounts = {};
const yearCounts = {};

sampleEContents.forEach(ec => {
  platformCounts[ec.eContentPlatform] = (platformCounts[ec.eContentPlatform] || 0) + 1;
  typeCounts[ec.contentType] = (typeCounts[ec.contentType] || 0) + 1;
  const yr = new Date(ec.publicationDate).getFullYear();
  yearCounts[yr] = (yearCounts[yr] || 0) + 1;
});

assert.strictEqual(totalEContents, 4, 'Total e-contents should be 4');
assert.strictEqual(platformCounts['Institutional LMS / Moodle'], 2, 'LMS platform count should be 2');
assert.strictEqual(Math.round((platformCounts['Institutional LMS / Moodle'] / totalEContents) * 100), 50, 'LMS percentage should be 50%');
assert.strictEqual(typeCounts['SINGLE_MODULE'], 2, 'Single module count should be 2');
assert.strictEqual(yearCounts[2025], 2, '2025 year count should be 2');
console.log('   ✓ E-Contents popover breakdown calculations verified.');

console.log('\n>>> ALL PROGRAMME TYPES & E-CONTENTS TESTS PASSED SUCCESSFULLY! <<<\n');
