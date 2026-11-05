'use strict';

/**
 * CHRIST UNIVERSITY IQAC PLATFORM
 * Publications Module — Scopus/Excel Import & Field Standardization Test Suite
 * Version 4.0
 */

const assert = require('assert');
const {
  normalizeDoi,
  normalizeTitle,
  normalizePublicationYear,
  sanitizeCitationCount,
  sanitizeStringField,
  sanitizeUrl
} = require('../controllers/publicationController');

console.log('================================================================');
console.log('  CHRIST University IQAC - Publications Scopus Import Test Suite');
console.log('  Version 4.0 — 12 Approved Fields & Duplicate Protection');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}\n`);
  }
}

// -------------------------------------------------------------
// TEST SUITE 1: Field Sanitization & Normalization Helpers
// -------------------------------------------------------------
console.log('--- Suite 1: Field Sanitization & Normalization Helpers ---');

runTest('normalizeDoi: should trim whitespace, lowercase, and strip URL / DOI prefixes', () => {
  assert.strictEqual(normalizeDoi('https://doi.org/10.1109/ACCESS.2024.12345'), '10.1109/access.2024.12345');
  assert.strictEqual(normalizeDoi('http://dx.doi.org/10.1016/j.compedu.2023.01'), '10.1016/j.compedu.2023.01');
  assert.strictEqual(normalizeDoi('doi: 10.1007/s11276-023-03456-x '), '10.1007/s11276-023-03456-x');
  assert.strictEqual(normalizeDoi('  10.1145/3313831.3376723  '), '10.1145/3313831.3376723');
  assert.strictEqual(normalizeDoi(''), null);
  assert.strictEqual(normalizeDoi(null), null);
  assert.strictEqual(normalizeDoi(undefined), null);
});

runTest('normalizeTitle: should strip punctuation, collapse whitespace, and lowercase', () => {
  const t1 = 'Deep Learning Framework: For Edge IoT Healthcare Sensors!';
  const t2 = 'deep learning framework for edge iot healthcare sensors';
  assert.strictEqual(normalizeTitle(t1), t2);
  assert.strictEqual(normalizeTitle('   A   Novel   Approach...  '), 'a novel approach');
  assert.strictEqual(normalizeTitle(''), '');
  assert.strictEqual(normalizeTitle(null), '');
});

runTest('normalizePublicationYear: should extract valid 4-digit calendar year', () => {
  assert.strictEqual(normalizePublicationYear('2024'), '2024');
  assert.strictEqual(normalizePublicationYear(2023), '2023');
  assert.strictEqual(normalizePublicationYear('2022-2023'), '2022');
  assert.strictEqual(normalizePublicationYear('AY 2025'), '2025');
  assert.strictEqual(normalizePublicationYear('Published in 2021'), '2021');
  assert.strictEqual(normalizePublicationYear('Invalid'), null);
  assert.strictEqual(normalizePublicationYear(''), null);
  assert.strictEqual(normalizePublicationYear(null), null);
});

runTest('sanitizeCitationCount: explicit 0 preserved, missing/N/A returns null', () => {
  // Explicit 0 must NOT become null
  assert.strictEqual(sanitizeCitationCount(0), 0);
  assert.strictEqual(sanitizeCitationCount('0'), 0);
  // Numeric count
  assert.strictEqual(sanitizeCitationCount(42), 42);
  assert.strictEqual(sanitizeCitationCount('105'), 105);
  // Missing / N/A must become null (NOT 0)
  assert.strictEqual(sanitizeCitationCount(null), null);
  assert.strictEqual(sanitizeCitationCount(undefined), null);
  assert.strictEqual(sanitizeCitationCount(''), null);
  assert.strictEqual(sanitizeCitationCount('N/A'), null);
  assert.strictEqual(sanitizeCitationCount('na'), null);
  assert.strictEqual(sanitizeCitationCount('-'), null);
});

runTest('sanitizeStringField: trims whitespace, empty becomes null', () => {
  assert.strictEqual(sanitizeStringField('  IEEE Communications  '), 'IEEE Communications');
  assert.strictEqual(sanitizeStringField('   '), null);
  assert.strictEqual(sanitizeStringField(''), null);
  assert.strictEqual(sanitizeStringField(null), null);
});

runTest('sanitizeUrl: blocks javascript/data schemes, allows http/https', () => {
  assert.strictEqual(sanitizeUrl('https://ieeexplore.ieee.org/document/12345'), 'https://ieeexplore.ieee.org/document/12345');
  assert.strictEqual(sanitizeUrl('http://doi.org/10.1109/5.771073'), 'http://doi.org/10.1109/5.771073');
  assert.strictEqual(sanitizeUrl('javascript:alert(1)'), null);
  assert.strictEqual(sanitizeUrl('data:text/html,<script>alert(1)</script>'), null);
  assert.strictEqual(sanitizeUrl(''), null);
});

// -------------------------------------------------------------
// TEST SUITE 2: 12 Approved Scopus Fields Extraction
// -------------------------------------------------------------
console.log('\n--- Suite 2: 12 Approved Scopus Fields Extraction & Garbage Column Filtering ---');

// Mock 47+ column Scopus raw row
const mockScopus47ColumnsRow = {
  'Authors': 'Nair M., Menon S., Kumar R.',
  'Author full names': 'Nair, Meera (57200000001); Menon, Suresh (57200000002); Kumar, Rajesh (57200000003)',
  'Author(s) ID': '57200000001; 57200000002; 57200000003',
  'Title': 'Biomimetic Ceramic Composites for Aerospace Thermal Protection Systems',
  'Year': '2024',
  'Source title': 'Ceramics International',
  'Volume': '50',
  'Issue': '4',
  'Art. No.': '104523',
  'Page start': '450',
  'Page end': '462',
  'Page count': '13',
  'Cited by': '18',
  'DOI': '10.1016/j.ceramint.2024.01.205',
  'Link': 'https://www.scopus.com/inward/record.uri?eid=2-s2.0-85123456789&partnerID=40',
  'Affiliations': 'Department of Mechanical Engineering, CHRIST University, Bangalore, India',
  'Authors with affiliations': 'Nair, M., CHRIST University; Menon, S., ISRO; Kumar, R., CHRIST University',
  'Abstract': 'This paper presents synthesis and thermal ablation testing of lightweight ceramic matrix composites.',
  'Author Keywords': 'Ceramic composites; Thermal barrier; Aerospace',
  'Index Keywords': 'Aerospace materials; Ceramic matrix composites; Thermal insulation',
  'Funding Details': 'ISRO RESPOND Programme',
  'Funding Text 1': 'This work was funded under ISRO RESPOND grant 2024.',
  'References': 'Smith et al., 2020; Johnson et al., 2022',
  'Correspondence Address': 'Nair, M.; CHRIST University',
  'Editors': '',
  'Publisher': 'Elsevier Ltd',
  'CODEN': 'CINNDH',
  'PubMed ID': '',
  'Language of Original Document': 'English',
  'Abbreviated Source Title': 'Ceram. Int.',
  'Document Type': 'Article',
  'Publication Stage': 'Final',
  'Open Access': 'All Open Access, Gold',
  'Source': 'Scopus',
  'EID': '2-s2.0-85123456789',
  'ISSN': '0272-8842',
  'ISBN': '978-0-12-345678-9'
};

runTest('12 Approved Fields Extraction: extracts only the 12 fields, ignores 35+ unwanted columns', () => {
  // Simulating Scopus field mapping logic
  const row = mockScopus47ColumnsRow;

  const authorName = row['Authors'] || '';
  const authorFullNames = row['Author full names'] || null;
  const title = row['Title'] || '';
  const publicationYear = normalizePublicationYear(row['Year']);
  const journalName = row['Source title'] || '';
  const publisher = row['Publisher'] || null;
  const citationCount = sanitizeCitationCount(row['Cited by']);
  const doi = normalizeDoi(row['DOI']);
  const paperUrl = sanitizeUrl(row['Link']);
  const issn = sanitizeStringField(row['ISSN']);
  const isbn = sanitizeStringField(row['ISBN']);
  const coden = sanitizeStringField(row['CODEN']);

  // Assertions for 12 approved fields
  assert.strictEqual(authorName, 'Nair M., Menon S., Kumar R.');
  assert(authorFullNames.includes('Nair, Meera'));
  assert.strictEqual(title, 'Biomimetic Ceramic Composites for Aerospace Thermal Protection Systems');
  assert.strictEqual(publicationYear, '2024');
  assert.strictEqual(journalName, 'Ceramics International');
  assert.strictEqual(publisher, 'Elsevier Ltd');
  assert.strictEqual(citationCount, 18);
  assert.strictEqual(doi, '10.1016/j.ceramint.2024.01.205');
  assert.strictEqual(paperUrl, 'https://www.scopus.com/inward/record.uri?eid=2-s2.0-85123456789&partnerID=40');
  assert.strictEqual(issn, '0272-8842');
  assert.strictEqual(isbn, '978-0-12-345678-9');
  assert.strictEqual(coden, 'CINNDH');

  // Verify Source title does NOT overwrite Publisher, and Publisher does NOT overwrite Journal Name
  assert.notStrictEqual(journalName, publisher);

  // Verify ISBN is separate from ISSN
  assert.notStrictEqual(isbn, issn);

  // Verify garbage columns are not preserved in the extracted 12-field publication entity
  const finalEntity = {
    authorName,
    authorFullNames,
    title,
    publicationYear,
    journalName,
    publisher,
    citationCount,
    doi,
    paperUrl,
    issn,
    isbn,
    coden
  };

  assert.strictEqual(finalEntity['Funding Details'], undefined);
  assert.strictEqual(finalEntity['Affiliations'], undefined);
  assert.strictEqual(finalEntity['References'], undefined);
  assert.strictEqual(finalEntity['EID'], undefined);
  assert.strictEqual(finalEntity['Author(s) ID'], undefined);
});

// -------------------------------------------------------------
// TEST SUITE 3: Duplicate Detection Rules
// -------------------------------------------------------------
console.log('\n--- Suite 3: Duplicate Detection (DOI Primary & Title+Year Fallback) ---');

const existingDatabaseRecords = [
  {
    id: 'pub-001',
    doi: '10.1109/access.2024.12345',
    title: 'Adaptive Neural Control of Autonomous Drones',
    normalizedTitle: 'adaptive neural control of autonomous drones',
    publicationYear: '2024'
  },
  {
    id: 'pub-002',
    doi: null, // No DOI recorded
    title: 'Blockchain Framework for Academic Credential Verification',
    normalizedTitle: 'blockchain framework for academic credential verification',
    publicationYear: '2023'
  }
];

function checkIsDuplicate(incoming, dbList) {
  const incNormDoi = normalizeDoi(incoming.doi);
  const incNormTitle = normalizeTitle(incoming.title);
  const incYear = normalizePublicationYear(incoming.publicationYear || incoming.year);

  for (const existing of dbList) {
    const exNormDoi = normalizeDoi(existing.doi);
    if (incNormDoi && exNormDoi && incNormDoi === exNormDoi) {
      return { isDuplicate: true, reason: 'Duplicate DOI found in system', existingId: existing.id };
    }

    const exNormTitle = existing.normalizedTitle || normalizeTitle(existing.title);
    const exYear = normalizePublicationYear(existing.publicationYear);
    if (incNormTitle && exNormTitle && incNormTitle === exNormTitle && incYear && exYear && incYear === exYear) {
      return { isDuplicate: true, reason: 'Duplicate Title and Publication Year found in system', existingId: existing.id };
    }
  }

  return { isDuplicate: false };
}

runTest('Duplicate by DOI: matches case-insensitively and regardless of URL prefix', () => {
  const incoming = {
    doi: 'https://doi.org/10.1109/ACCESS.2024.12345',
    title: 'Different Title String',
    year: '2024'
  };
  const result = checkIsDuplicate(incoming, existingDatabaseRecords);
  assert.strictEqual(result.isDuplicate, true);
  assert.strictEqual(result.existingId, 'pub-001');
});

runTest('Duplicate by Fallback (Title + Year): matches when DOI is missing but Title and Year match', () => {
  const incoming = {
    doi: null,
    title: 'Blockchain Framework for Academic Credential Verification!',
    year: '2023'
  };
  const result = checkIsDuplicate(incoming, existingDatabaseRecords);
  assert.strictEqual(result.isDuplicate, true);
  assert.strictEqual(result.existingId, 'pub-002');
});

runTest('Non-Duplicate: same title but different Year is not a duplicate', () => {
  const incoming = {
    doi: null,
    title: 'Blockchain Framework for Academic Credential Verification',
    year: '2024' // Different year from existing 2023
  };
  const result = checkIsDuplicate(incoming, existingDatabaseRecords);
  assert.strictEqual(result.isDuplicate, false);
});

runTest('Non-Duplicate: different DOI and different title is completely new', () => {
  const incoming = {
    doi: '10.1016/j.neucom.2024.100',
    title: 'Quantum Deep Learning Algorithms',
    year: '2024'
  };
  const result = checkIsDuplicate(incoming, existingDatabaseRecords);
  assert.strictEqual(result.isDuplicate, false);
});

// -------------------------------------------------------------
// TEST SUITE 4: Partial Bulk Import with Excluded Duplicate & Invalid Rows
// -------------------------------------------------------------
console.log('\n--- Suite 4: Partial Bulk Import Logic & Row Partitioning ---');

runTest('Bulk upload partitions batch into valid non-duplicates vs skipped duplicates/invalid', () => {
  const batch = [
    // Row 1: Valid & new
    {
      authors: 'Dr. John Doe',
      title: 'Graph Convolutional Networks in Molecular Modeling',
      year: '2024',
      journal: 'Journal of Cheminformatics',
      doi: '10.1186/s13321-024-001'
    },
    // Row 2: Duplicate of pub-001
    {
      authors: 'A. Drone Researcher',
      title: 'Adaptive Neural Control of Autonomous Drones',
      year: '2024',
      journal: 'IEEE Access',
      doi: '10.1109/access.2024.12345'
    },
    // Row 3: Missing required title
    {
      authors: 'Dr. Jane Smith',
      title: '   ',
      year: '2024',
      journal: 'Springer Nature',
      doi: '10.1007/s001-024'
    },
    // Row 4: Valid & new
    {
      authors: 'Dr. Sarah Connor',
      title: 'Cybernetic Automation Architecture',
      year: '2025',
      journal: 'Robotics and Autonomous Systems',
      doi: '10.1016/j.robot.2025.002'
    }
  ];

  const readyToInsert = [];
  const skippedDuplicates = [];
  const skippedInvalid = [];

  for (const item of batch) {
    if (!item.title || !item.title.trim()) {
      skippedInvalid.push({ item, error: 'Missing title' });
      continue;
    }
    const dupCheck = checkIsDuplicate({ doi: item.doi, title: item.title, year: item.year }, existingDatabaseRecords);
    if (dupCheck.isDuplicate) {
      skippedDuplicates.push({ item, reason: dupCheck.reason });
      continue;
    }
    readyToInsert.push(item);
  }

  assert.strictEqual(readyToInsert.length, 2, '2 valid rows must be ready to insert');
  assert.strictEqual(skippedDuplicates.length, 1, '1 duplicate row must be skipped');
  assert.strictEqual(skippedInvalid.length, 1, '1 invalid row must be skipped');
  assert.strictEqual(readyToInsert[0].title, 'Graph Convolutional Networks in Molecular Modeling');
  assert.strictEqual(readyToInsert[1].title, 'Cybernetic Automation Architecture');
});

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`   Publications Test Suite Results: ${passedTests}/${totalTests} Passed`);
console.log('================================================================');

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  console.log('All publications test cases verified successfully.\n');
}

