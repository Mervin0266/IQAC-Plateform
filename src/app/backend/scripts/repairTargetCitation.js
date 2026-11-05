'use strict';

/**
 * CHRIST UNIVERSITY IQAC PLATFORM
 * Safe Data Repair Script for Suresh K (Emp ID: 3489) Target Publication
 * 
 * Target Publication:
 * "A high-efficient multi-port bidirectional converter for renewable energy and hybrid electric vehicle applications"
 * 
 * Fix: Reconciles corrupt citation count (6 -> 3) and replaces spurious periods (1526, 1528)
 * with the true Scopus breakdown (<2022: 0, 2022..2025: 0, 2026: 3, Subtotal: 3, >2026: 0).
 * 
 * Usage:
 *   node repairTargetCitation.js            (Dry-run mode by default - no changes made)
 *   node repairTargetCitation.js --execute  (Executes transactional database correction)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { sequelize } = require('../config/database');
const { Publication, PublicationCitationSnapshot, CitationYearlyDetail } = require('../models');

async function repair() {
  const isDryRun = !process.argv.includes('--execute');

  console.log('================================================================');
  console.log('  CHRIST UNIVERSITY IQAC - TARGET CITATION DATA REPAIR');
  console.log(`  Mode: ${isDryRun ? 'DRY-RUN (Simulated only, no changes)' : 'EXECUTE (Applying changes)'}`);
  console.log('================================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to database.\n');
  } catch (err) {
    console.error('✗ Cannot connect to database:', err.message);
    console.log('Please execute src/app/backend/scripts/dataCorrectionPlan.sql directly in Supabase.');
    process.exit(1);
  }

  const t = await sequelize.transaction();

  try {
    // 1. Find target publication
    const pub = await Publication.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('title')),
        'LIKE',
        '%bidirectional converter%'
      ),
      transaction: t
    });

    if (!pub) {
      console.log('Target publication not found in database. Exiting.');
      await t.rollback();
      return;
    }

    console.log(`Found Publication: "${pub.title}"`);
    console.log(`Publication ID: ${pub.id}`);
    console.log(`Current citationCount in DB: ${pub.citationCount}`);

    // 2. Find associated snapshot for Emp ID 3489
    const snapshot = await PublicationCitationSnapshot.findOne({
      where: {
        publicationId: pub.id,
        employeeId: '3489'
      },
      order: [['createdAt', 'DESC']],
      transaction: t
    });

    if (snapshot) {
      console.log(`Found Snapshot ID: ${snapshot.id}`);
      console.log(`Current Snapshot reportedTotal: ${snapshot.reportedTotal}`);

      const corruptDetails = await CitationYearlyDetail.findAll({
        where: {
          snapshotId: snapshot.id,
          period: ['1526', '1528']
        },
        transaction: t
      });

      console.log(`Found ${corruptDetails.length} corrupt yearly detail record(s) ('1526', '1528').`);

      if (!isDryRun) {
        // Delete corrupt periods
        await CitationYearlyDetail.destroy({
          where: {
            snapshotId: snapshot.id,
            period: ['1526', '1528']
          },
          transaction: t
        });

        // Insert genuine Scopus breakdown
        const correctBreakdown = [
          { snapshotId: snapshot.id, period: '<2022', periodType: 'grouped', citationCount: 0, status: 'known' },
          { snapshotId: snapshot.id, period: '2022', periodType: 'year', citationCount: 0, status: 'known' },
          { snapshotId: snapshot.id, period: '2023', periodType: 'year', citationCount: 0, status: 'known' },
          { snapshotId: snapshot.id, period: '2024', periodType: 'year', citationCount: 0, status: 'known' },
          { snapshotId: snapshot.id, period: '2025', periodType: 'year', citationCount: 0, status: 'known' },
          { snapshotId: snapshot.id, period: '2026', periodType: 'year', citationCount: 3, status: 'known' },
          { snapshotId: snapshot.id, period: 'Subtotal', periodType: 'subtotal', citationCount: 3, status: 'known' },
          { snapshotId: snapshot.id, period: '>2026', periodType: 'grouped', citationCount: 0, status: 'known' }
        ];

        await CitationYearlyDetail.bulkCreate(correctBreakdown, { transaction: t });

        // Update snapshot reported total to 3
        snapshot.reportedTotal = 3;
        snapshot.reconciliationStatus = 'reconciled';
        await snapshot.save({ transaction: t });
        console.log('✓ Corrected snapshot reportedTotal to 3 and reconciliationStatus to reconciled.');
      }
    }

    if (!isDryRun) {
      pub.citationCount = 3;
      await pub.save({ transaction: t });
      console.log(`✓ Corrected publication citationCount from ${pub.citationCount} to 3.`);

      await t.commit();
      console.log('\n✓ Transaction successfully committed. Data repair complete.');
    } else {
      await t.rollback();
      console.log('\n[DRY RUN] Rolled back simulation. Run with --execute to commit changes to database.');
    }

  } catch (err) {
    await t.rollback();
    console.error('Error during data repair:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  repair();
}

module.exports = { repair };

