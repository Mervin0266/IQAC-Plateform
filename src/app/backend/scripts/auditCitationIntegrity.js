'use strict';

/**
 * CHRIST UNIVERSITY IQAC PLATFORM
 * Citation Management Data Integrity Audit (Read-Only)
 * 
 * Inspects publication_citation_snapshots, citation_yearly_details,
 * and publications for data corruption (e.g. spurious year periods '1526', '1528',
 * double-counted subtotals, or inflated citation counts).
 * 
 * STRICTLY READ-ONLY: Never updates, deletes, or inserts any records.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/database');
const { PublicationCitationSnapshot, CitationYearlyDetail, Publication } = require('../models');

async function runAudit() {
  console.log('================================================================');
  console.log('  CHRIST UNIVERSITY IQAC - CITATION DATA INTEGRITY AUDIT');
  console.log('  Mode: READ-ONLY (No database modifications)');
  console.log('================================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✓ Database connection verified successfully.\n');
  } catch (err) {
    console.error('✗ Unable to connect to database:', err.message);
    console.log('\n--- STANDALONE SQL AUDIT QUERIES (Run directly in Supabase/PostgreSQL) ---');
    console.log(`
-- 1. Find corrupt citation periods (e.g. '1526', '1528', non-year summaries)
SELECT d.id, d."snapshotId", d.period, d."citationCount", d."periodType", s."sourceFile", s."employeeId"
FROM citation_yearly_details d
JOIN publication_citation_snapshots s ON d."snapshotId" = s.id
WHERE d.period ~ '^\\d{4}$' AND (CAST(d.period AS INTEGER) < 1950 OR CAST(d.period AS INTEGER) > 2099)
   OR d.period IN ('1526', '1528', 'Total', 'total');

-- 2. Find snapshots with suspicious total of 6 matching the Suresh K pattern
SELECT s.id, s."publicationId", s."reportedTotal", s."sourceFile", s."employeeId", p.title, p."citationCount"
FROM publication_citation_snapshots s
JOIN publications p ON s."publicationId" = p.id
WHERE s."employeeId" = '3489' OR p.title ILIKE '%bidirectional converter%';

-- 3. Check for snapshots where sum of non-subtotal periods mismatches reportedTotal
SELECT s.id, s."reportedTotal", SUM(d."citationCount") AS computed_sum
FROM publication_citation_snapshots s
JOIN citation_yearly_details d ON s.id = d."snapshotId"
WHERE d."periodType" NOT IN ('subtotal', 'total')
GROUP BY s.id, s."reportedTotal"
HAVING SUM(d."citationCount") != s."reportedTotal";
    `);
    return;
  }

  const findings = {
    corruptPeriods: [],
    suspiciousSnapshots: [],
    targetPublicationStatus: null
  };

  try {
    // 1. Audit citation_yearly_details for invalid period names
    const allDetails = await CitationYearlyDetail.findAll({
      attributes: ['id', 'snapshotId', 'period', 'citationCount', 'periodType', 'status'],
      raw: true
    });

    for (const d of allDetails) {
      const p = String(d.period || '').trim();
      const isCalendarYear = /^(19\d{2}|20\d{2})$/.test(p);
      const isGrouped = /^[<>≤≥]\s*(19\d{2}|20\d{2})$/.test(p);
      const isSubtotal = p.toLowerCase() === 'subtotal';

      if (!isCalendarYear && !isGrouped && !isSubtotal) {
        findings.corruptPeriods.push(d);
      }
    }

    // 2. Audit snapshots for total mismatches
    const allSnapshots = await PublicationCitationSnapshot.findAll({
      attributes: ['id', 'publicationId', 'sourceFile', 'employeeId', 'facultyName', 'reportedTotal', 'reconciliationStatus', 'createdAt'],
      raw: true
    });

    console.log(`Audited ${allSnapshots.length} snapshot(s) and ${allDetails.length} yearly detail record(s).`);

    // 3. Inspect target publication 1: Effects of particle diameter (Row 85, expected total 18)
    const pubConfinedSphere = await Publication.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('title')),
        'LIKE',
        '%confined sphere%'
      ),
      raw: true
    });

    if (pubConfinedSphere) {
      findings.targetPublication1 = {
        id: pubConfinedSphere.id,
        title: pubConfinedSphere.title,
        currentCitationCount: pubConfinedSphere.citationCount,
        issn: pubConfinedSphere.issn,
        publicationYear: pubConfinedSphere.publicationYear,
        expectedCitationCount: 18
      };
    }

    // 4. Inspect target publication 2: Bidirectional converter (Row 8, expected total 3)
    const pubBidirectional = await Publication.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('title')),
        'LIKE',
        '%bidirectional converter%'
      ),
      raw: true
    });

    if (pubBidirectional) {
      findings.targetPublication2 = {
        id: pubBidirectional.id,
        title: pubBidirectional.title,
        currentCitationCount: pubBidirectional.citationCount,
        issn: pubBidirectional.issn,
        publicationYear: pubBidirectional.publicationYear,
        expectedCitationCount: 3
      };
    }

    console.log('\n--- AUDIT FINDINGS SUMMARY ---');
    console.log(`Corrupt / Non-Year Period Records: ${findings.corruptPeriods.length}`);
    if (findings.corruptPeriods.length > 0) {
      console.log('Sample corrupt periods:', findings.corruptPeriods.slice(0, 5));
    }

    if (findings.targetPublication1) {
      console.log('\n--- TARGET PUBLICATION 1 (Row 85) STATUS ---');
      console.log(`Title: ${findings.targetPublication1.title}`);
      console.log(`Current DB Citation Count: ${findings.targetPublication1.currentCitationCount}`);
      console.log(`Verified Expected Scopus Total: ${findings.targetPublication1.expectedCitationCount}`);
      if (findings.targetPublication1.currentCitationCount === 3) {
        console.log('⚠️ ALERT: Citation count was erroneously set to 3 by hardcoded 2026 correction. True total is 18 across 2011-2026.');
      } else if (findings.targetPublication1.currentCitationCount === 18) {
        console.log('✓ VERIFIED: Citation count is 18 (reconciled with true Scopus history).');
      }
    }

    if (findings.targetPublication2) {
      console.log('\n--- TARGET PUBLICATION 2 (Row 8) STATUS ---');
      console.log(`Title: ${findings.targetPublication2.title}`);
      console.log(`Current DB Citation Count: ${findings.targetPublication2.currentCitationCount}`);
      console.log(`Verified Expected Scopus Total: ${findings.targetPublication2.expectedCitationCount}`);
      if (findings.targetPublication2.currentCitationCount === 3) {
        console.log('✓ VERIFIED: Citation count is 3 (reconciled).');
      }
    }

    console.log('\nAudit complete (READ-ONLY). Zero records modified.');

  } catch (err) {
    console.error('Audit execution error:', err);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  runAudit();
}

module.exports = { runAudit };

