const { sequelize } = require('../config/database');
const { Publication, PublicationFaculty, Faculty, PublicationCitationSnapshot, CitationYearlyDetail, ScopusSource, User } = require('../models');
const { validateBulkFilename } = require('../utils/publicationFilenameValidator');

async function runTests() {
  console.log('=== TEST SUITE: INCREMENTAL PUBLICATION & CITATION IMPORT WITH ABSOLUTE COUNTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    await sequelize.authenticate();
    console.log('Connected to database.\n');

    // 1. Filename validation tests
    console.log('--- 1. Filename Validator Tests ---');
    const pubCheck = validateBulkFilename('12345_Suresh_Kishore_PUBLICATION.xlsx', 'publications');
    assert(pubCheck.valid === true && pubCheck.employeeId === '12345', 'Validates EMPID_NAME_PUBLICATION.xlsx');

    const citCheck = validateBulkFilename('12345_Suresh_Kishore_CITATIONS.xlsx', 'citations');
    assert(citCheck.valid === true && citCheck.employeeId === '12345', 'Validates EMPID_NAME_CITATIONS.xlsx');

    const wrongModuleCheck = validateBulkFilename('12345_Suresh_Kishore_CITATIONS.xlsx', 'publications');
    assert(wrongModuleCheck.valid === false && wrongModuleCheck.reasonCode === 'wrong_module', 'Rejects citations file when uploading publications');

    // 2. Incremental Publication Import & Safe Metadata Updates
    console.log('\n--- 2. Incremental Publication Import & Non-destructive Updates ---');
    const testDoi = `10.1016/test.inc.${Date.now()}`;
    const testTitle = `Incremental Test Publication ${Date.now()}`;

    const existingUser = await User.findOne();
    const testUserId = existingUser ? existingUser.id : crypto.randomUUID();

    // Create initial publication
    const pub = await Publication.create({
      id: crypto.randomUUID(),
      title: testTitle,
      authorName: 'Dr. Test Author',
      doi: testDoi,
      journalName: 'Test Automation Journal',
      journalType: 'Scopus',
      publicationYear: '2024',
      academicYear: '2024-2025',
      department: 'Computer Science and Engineering',
      citationCount: 4,
      status: 'approved',
      createdBy: testUserId
    });

    assert(pub && pub.id, 'Initial publication created');

    // Simulate incremental import where this publication is present with updated publisher & page number
    const { bulkUploadPublications } = require('../controllers/publicationController');

    // Mock faculty for association
    let faculty = await Faculty.findOne({ where: { department: 'Computer Science and Engineering' } });
    if (!faculty) {
      faculty = await Faculty.create({
        id: crypto.randomUUID(),
        employeeId: 'TEST9999',
        name: 'Dr. Test Faculty',
        department: 'Computer Science and Engineering',
        designation: 'Professor',
        academicYear: '2024-2025'
      });
    }

    const mockReq = {
      body: {
        items: [
          {
            row: 1,
            sourceFile: `${faculty.employeeId}_${faculty.name.replace(/\s+/g, '_')}_PUBLICATION.xlsx`,
            title: testTitle,
            authorName: 'Dr. Test Author',
            doi: testDoi,
            journalName: 'Test Automation Journal',
            publicationYear: '2024',
            publisher: 'Elsevier International',
            pageNumber: '100-115',
            indexing: 'Scopus'
          }
        ],
        defaultDepartment: 'Computer Science and Engineering',
        defaultIndexing: 'Scopus'
      },
      user: { id: testUserId, role: 'admin', department: 'Computer Science and Engineering' },
      ip: '127.0.0.1'
    };

    let responseData = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          responseData = { code, ...data };
          return responseData;
        }
      }),
      json: (data) => {
        responseData = { code: 200, ...data };
        return responseData;
      }
    };

    await bulkUploadPublications(mockReq, mockRes);
    assert(responseData && responseData.linkedCount === 1, 'Incremental upload successfully recognized existing publication and linked faculty');

    const updatedPub = await Publication.findByPk(pub.id);
    assert(updatedPub.publisher === 'Elsevier International', 'Existing publication safely updated with new valid metadata (publisher)');
    assert(updatedPub.pageNumber === '100-115', 'Existing publication safely updated with new valid metadata (pageNumber)');

    // 3. Absolute Citation Value Rule (Part E Section 15)
    console.log('\n--- 3. Absolute Citation Value Rule & Preservation of Omitted Years ---');
    // Initial state:
    // Create baseline snapshot with years:
    // 2022: 1 citation
    // 2023: 2 citations
    // 2024: 4 citations
    // 2025: 5 citations
    // Total = 12 citations
    const initialSnapshot = await PublicationCitationSnapshot.create({
      id: crypto.randomUUID(),
      publicationId: pub.id,
      sourceFile: `${faculty.employeeId}_${faculty.name.replace(/\s+/g, '_')}_CITATIONS.xlsx`,
      employeeId: faculty.employeeId,
      facultyName: faculty.name,
      citationSource: 'Uploaded',
      reportedTotal: 12,
      previousTotal: null,
      reconciliationStatus: 'reconciled',
      approvalStatus: 'approved'
    });

    await CitationYearlyDetail.bulkCreate([
      { snapshotId: initialSnapshot.id, period: '2022', citationCount: 1, periodType: 'year', source: 'Uploaded' },
      { snapshotId: initialSnapshot.id, period: '2023', citationCount: 2, periodType: 'year', source: 'Uploaded' },
      { snapshotId: initialSnapshot.id, period: '2024', citationCount: 4, periodType: 'year', source: 'Uploaded' },
      { snapshotId: initialSnapshot.id, period: '2025', citationCount: 5, periodType: 'year', source: 'Uploaded' }
    ]);

    pub.citationCount = 12;
    await pub.save();

    // Now, upload an incremental citation file that specifies:
    // 2023: 3 (changed from 2)
    // 2024: 6 (changed from 4)
    // 2025: 8 (changed from 5)
    // 2026: 4 (new year)
    // Note: 2022 is OMITTED in this new incremental file!
    // Expected Result:
    // 2022: PRESERVED at 1!
    // 2023: becomes 3 (NOT 2 + 3 = 5!)
    // 2024: becomes 6 (NOT 4 + 6 = 10!)
    // 2025: becomes 8 (NOT 5 + 8 = 13!)
    // 2026: becomes 4 (new year)
    // Total = 1 + 3 + 6 + 8 + 4 = 22!
    // previousTotal = 12!

    const { confirmCitationsUpdate } = require('../controllers/publicationController');

    const confirmReq = {
      body: {
        confirmedUpdates: [
          {
            publicationId: pub.id,
            sourceFile: `${faculty.employeeId}_${faculty.name.replace(/\s+/g, '_')}_CITATIONS.xlsx`,
            employeeId: faculty.employeeId,
            facultyName: faculty.name,
            reportedTotal: 22,
            reconciliationStatus: 'reconciled',
            yearlyDetails: [
              { period: '2023', citationCount: 3, periodType: 'year' },
              { period: '2024', citationCount: 6, periodType: 'year' },
              { period: '2025', citationCount: 8, periodType: 'year' },
              { period: '2026', citationCount: 4, periodType: 'year' }
            ]
          }
        ],
        batchMetadata: [
          {
            filename: `${faculty.employeeId}_${faculty.name.replace(/\s+/g, '_')}_CITATIONS.xlsx`,
            employeeId: faculty.employeeId,
            facultyName: faculty.name,
            totalRecords: 1
          }
        ]
      },
      user: { id: testUserId, role: 'admin' },
      ip: '127.0.0.1'
    };

    let confirmResData = null;
    const confirmRes = {
      status: (code) => ({
        json: (data) => {
          confirmResData = { code, ...data };
          return confirmResData;
        }
      }),
      json: (data) => {
        confirmResData = { code: 200, ...data };
        return confirmResData;
      }
    };

    await confirmCitationsUpdate(confirmReq, confirmRes);
    assert(confirmResData && confirmResData.success === true, 'Citation confirm update API executed successfully');

    // Verify stored snapshot & yearly details
    const latestSnapshot = await PublicationCitationSnapshot.findOne({
      where: { publicationId: pub.id },
      include: [{ model: CitationYearlyDetail, as: 'yearlyDetails' }],
      order: [['createdAt', 'DESC']]
    });

    assert(latestSnapshot.reportedTotal === 22, 'New reportedTotal is exactly 22 (absolute total)');
    assert(latestSnapshot.previousTotal === 12, 'previousTotal recorded in snapshot history is 12');

    const detailMap = {};
    latestSnapshot.yearlyDetails.forEach(d => {
      detailMap[d.period] = d.citationCount;
    });

    assert(detailMap['2022'] === 1, 'Omitted year 2022 preserved at its previous value (1)');
    assert(detailMap['2023'] === 3, 'Year 2023 replaced with new absolute value 3 (not summed 2+3=5)');
    assert(detailMap['2024'] === 6, 'Year 2024 replaced with new absolute value 6 (not summed 4+6=10)');
    assert(detailMap['2025'] === 8, 'Year 2025 replaced with new absolute value 8 (not summed 5+8=13)');
    assert(detailMap['2026'] === 4, 'New year 2026 inserted with absolute value 4');

    const refetchedPub = await Publication.findByPk(pub.id);
    assert(refetchedPub.citationCount === 22, 'Publication citationCount updated to absolute total 22');

    // 4. Source Separation Test
    console.log('\n--- 4. Citation Source Separation Test ---');
    assert(latestSnapshot.citationSource === 'Uploaded', 'Snapshot citationSource is strictly Uploaded');
    assert(latestSnapshot.citationSource !== 'Scopus', 'Uploaded citations are kept separate from Scopus live retrieval');

    // 5. Centralized Journal Metrics & Batch Refresh
    console.log('\n--- 5. Centralized Journal Metrics & Admin Refresh Test ---');
    const { refreshAllJournalMetrics } = require('../controllers/publicationController');
    let refreshAllResData = null;
    const refreshAllRes = {
      status: (code) => ({
        json: (data) => {
          refreshAllResData = { code, ...data };
          return refreshAllResData;
        }
      }),
      json: (data) => {
        refreshAllResData = { code: 200, ...data };
        return refreshAllResData;
      }
    };

    await refreshAllJournalMetrics({ body: { limit: 2 }, user: { role: 'admin' } }, refreshAllRes);
    assert(refreshAllResData && refreshAllResData.success === true, 'Admin Refresh All Journal Metrics executed successfully');

    // Cleanup test records
    await CitationYearlyDetail.destroy({ where: { snapshotId: [initialSnapshot.id, latestSnapshot.id] } });
    await PublicationCitationSnapshot.destroy({ where: { publicationId: pub.id } });
    await PublicationFaculty.destroy({ where: { publicationId: pub.id } });
    await Publication.destroy({ where: { id: pub.id } });

    console.log('\n======================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('======================================================');

    process.exit(failed > 0 ? 1 : 0);

  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
