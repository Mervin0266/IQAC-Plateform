'use strict';

/**
 * Historical Patent Migration Script
 * Phase 8: Backfills grantYear for existing historical patent records and cleans up ungranted patents.
 *
 * Usage:
 *   node scripts/migrateHistoricalPatents.js --dry-run   (Default: reports planned changes without writing)
 *   node scripts/migrateHistoricalPatents.js --execute   (Applies changes to the database)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sequelize } = require('../config/database');
const { Patent } = require('../models');

const isExecute = process.argv.includes('--execute');
const isDryRun = !isExecute || process.argv.includes('--dry-run');

const parseYearFromDate = (dateVal) => {
  if (!dateVal) return null;
  const str = String(dateVal).trim();
  const match = str.match(/(19|20)\d{2}/);
  if (match) {
    const yr = parseInt(match[0], 10);
    if (yr >= 1990 && yr <= 2050) return yr;
  }
  const d = new Date(dateVal);
  if (!isNaN(d.getTime())) {
    const yr = d.getFullYear();
    if (yr >= 1990 && yr <= 2050) return yr;
  }
  return null;
};

const parseYearFromAcademicYear = (ay) => {
  if (!ay) return null;
  const str = String(ay).trim();
  // e.g. "2023-2024" -> 2024 (the concluding calendar year of the academic cycle)
  const rangeMatch = str.match(/(\d{4})\s*[-–/]\s*(\d{4})/);
  if (rangeMatch) {
    return parseInt(rangeMatch[2], 10);
  }
  // Single 4-digit year
  const singleMatch = str.match(/\b(19|20\d{2})\b/);
  if (singleMatch) {
    return parseInt(singleMatch[1], 10);
  }
  return null;
};

async function runMigration() {
  console.log('================================================================');
  console.log('   CHRIST University IQAC - Historical Patent Migration');
  console.log(`   Mode: ${isExecute ? 'EXECUTE (Applying changes)' : 'DRY-RUN (Simulating changes)'}`);
  console.log('================================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✓ Database connection established successfully.\n');

    const patents = await Patent.findAll({
      order: [['id', 'ASC']]
    });

    console.log(`Found ${patents.length} total patent records in database.\n`);

    const plannedUpdates = [];
    const unchanged = [];
    const flaggedForReview = [];

    for (const patent of patents) {
      const isGranted = (patent.status || '').toLowerCase() === 'granted';
      let targetYear = null;
      let reviewReason = null;

      if (isGranted) {
        const yearFromDate = parseYearFromDate(patent.grantedDate);
        if (yearFromDate) {
          targetYear = yearFromDate;
        } else {
          // Attempt recovery from academic year
          const yearFromAY = parseYearFromAcademicYear(patent.academicYear);
          if (yearFromAY) {
            targetYear = yearFromAY;
            reviewReason = `Inferred from academic year '${patent.academicYear}' because grant date is missing or invalid ('${patent.grantedDate || 'none'}')`;
          } else {
            reviewReason = `Status is 'Granted' but neither grantedDate ('${patent.grantedDate || 'none'}') nor academicYear ('${patent.academicYear || 'none'}') yielded a valid year`;
          }
        }
      } else {
        // Non-granted patents MUST have grantYear = null
        targetYear = null;
      }

      const currentYear = patent.grantYear !== undefined ? patent.grantYear : null;

      if (reviewReason && !targetYear) {
        flaggedForReview.push({
          id: patent.id,
          applicationNumber: patent.applicationNumber,
          title: patent.title,
          status: patent.status,
          grantedDate: patent.grantedDate,
          academicYear: patent.academicYear,
          currentGrantYear: currentYear,
          reason: reviewReason
        });
      } else if (currentYear !== targetYear) {
        plannedUpdates.push({
          id: patent.id,
          applicationNumber: patent.applicationNumber,
          title: patent.title,
          status: patent.status,
          currentGrantYear: currentYear,
          newGrantYear: targetYear,
          inferredNote: reviewReason || 'Directly parsed from grantedDate'
        });
      } else {
        unchanged.push({
          id: patent.id,
          title: patent.title,
          status: patent.status,
          grantYear: currentYear
        });
      }
    }

    // Print planned updates
    if (plannedUpdates.length > 0) {
      console.log(`--- Planned Updates (${plannedUpdates.length} records) ---`);
      plannedUpdates.slice(0, 15).forEach((item) => {
        console.log(`  [ID ${item.id}] "${item.title.substring(0, 40)}..."`);
        console.log(`    Status: ${item.status} | Current Year: ${item.currentGrantYear} -> New Year: ${item.newGrantYear} (${item.inferredNote})`);
      });
      if (plannedUpdates.length > 15) {
        console.log(`  ... and ${plannedUpdates.length - 15} more records.`);
      }
      console.log('');
    }

    // Print flagged records
    if (flaggedForReview.length > 0) {
      console.log(`--- Flagged for Manual Review (${flaggedForReview.length} records) ---`);
      flaggedForReview.forEach((item) => {
        console.log(`  [ID ${item.id}] App#: ${item.applicationNumber || 'N/A'} | Title: "${item.title.substring(0, 40)}..."`);
        console.log(`    GrantedDate: ${item.grantedDate} | AcademicYear: ${item.academicYear}`);
        console.log(`    Issue: ${item.reason}`);
      });
      console.log('');
    }

    // Execution step
    let appliedCount = 0;
    if (isExecute && plannedUpdates.length > 0) {
      console.log('Applying updates to database in transaction...');
      await sequelize.transaction(async (t) => {
        for (const update of plannedUpdates) {
          await Patent.update(
            { grantYear: update.newGrantYear },
            { where: { id: update.id }, transaction: t }
          );
          appliedCount++;
        }
      });
      console.log(`✓ Successfully updated ${appliedCount} patent records.\n`);
    }

    // Summary Report
    console.log('================================================================');
    console.log('                   MIGRATION SUMMARY REPORT');
    console.log('================================================================');
    console.log(` Total Patents Evaluated:         ${patents.length}`);
    console.log(` Records Requiring Update:        ${plannedUpdates.length}`);
    console.log(` Records Already Consistent:       ${unchanged.length}`);
    console.log(` Flagged for Manual Review:       ${flaggedForReview.length}`);
    console.log(` Changes Applied to DB:           ${isExecute ? appliedCount : 0} (Mode: ${isExecute ? 'EXECUTE' : 'DRY-RUN'})`);
    console.log('================================================================\n');

    if (!isExecute && plannedUpdates.length > 0) {
      console.log('To apply these changes, run:');
      console.log('  node scripts/migrateHistoricalPatents.js --execute\n');
    }

  } catch (error) {
    console.error('✗ Migration encountered an error:', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = {
  runMigration,
  parseYearFromDate,
  parseYearFromAcademicYear
};

