/**
 * Backfill script: restores yearlyDetails for Scopus API Live Retrieval snapshots
 * from their publication's prior verified snapshot.
 */
const { PublicationCitationSnapshot, CitationYearlyDetail, sequelize } = require('../models');
const { Op } = require('sequelize');

async function backfill() {
  console.log('--- Starting Scopus Yearly Details Backfill ---');

  const emptySnaps = await PublicationCitationSnapshot.findAll({
    where: { citationSource: 'Scopus' },
    include: [{ model: CitationYearlyDetail, as: 'yearlyDetails' }],
    order: [['createdAt', 'DESC']]
  });

  const targetSnaps = emptySnaps.filter(s => !s.yearlyDetails || s.yearlyDetails.length === 0);
  console.log(`Found ${targetSnaps.length} empty Scopus snapshots.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const snap of targetSnaps) {
    const priorSnap = await PublicationCitationSnapshot.findOne({
      where: {
        publicationId: snap.publicationId,
        id: { [Op.ne]: snap.id }
      },
      include: [{ model: CitationYearlyDetail, as: 'yearlyDetails' }],
      order: [['createdAt', 'DESC']]
    });

    if (!priorSnap || !priorSnap.yearlyDetails || priorSnap.yearlyDetails.length === 0) {
      skippedCount++;
      continue;
    }

    const currentYearStr = new Date().getFullYear().toString();
    const prevTotal = priorSnap.reportedTotal || 0;
    const diff = (snap.reportedTotal || 0) - prevTotal;

    const detailRows = priorSnap.yearlyDetails.map(yd => {
      let count = yd.citationCount;
      if (diff > 0 && String(yd.period).trim() === currentYearStr) {
        count = (count || 0) + diff;
      }
      return {
        snapshotId: snap.id,
        period: yd.period,
        citationCount: count,
        excludingSelfCount: yd.excludingSelfCount,
        periodType: yd.periodType,
        citationType: yd.citationType || 'all',
        source: yd.source || 'Scopus',
        status: yd.status || 'known'
      };
    });

    if (diff > 0 && !detailRows.some(d => String(d.period).trim() === currentYearStr)) {
      detailRows.push({
        snapshotId: snap.id,
        period: currentYearStr,
        citationCount: diff,
        excludingSelfCount: null,
        periodType: 'year',
        citationType: 'all',
        source: 'Scopus',
        status: 'known'
      });
    }

    if (detailRows.length > 0) {
      await CitationYearlyDetail.bulkCreate(detailRows);
      updatedCount++;
    }
  }

  console.log(`--- Backfill Complete: ${updatedCount} snapshots restored, ${skippedCount} skipped (no prior breakdown) ---`);
  process.exit(0);
}

backfill().catch(err => {
  console.error('Backfill error:', err);
  process.exit(1);
});
