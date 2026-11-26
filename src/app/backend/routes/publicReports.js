const express = require('express');
const { Op } = require('sequelize');
const { auth, authorize } = require('../middleware/auth');
const { Placement } = require('../models');
const { logActionSafe } = require('../middleware/auditLogger');
const PublicReport = require('../models/PublicReport');
const sections = require('../../public-report-sections.json');
const { validateReport, placementSummary } = require('../utils/publicReportData');

const router = express.Router();
const periodPattern = /^\d{4}(?:-(?:\d{2}|\d{4}))?$/;
const publishedFields = ['section', 'period', 'published', 'publishedAt'];

function handle(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
}

router.param('section', (req, res, next, section) => {
  if (!Object.hasOwn(sections, section)) return res.status(404).json({ message: 'Unknown section.' });
  next();
});

router.get('/', handle(async (req, res) => {
  const rows = await PublicReport.findAll({
    where: { published: { [Op.ne]: null } },
    attributes: publishedFields,
    order: [['period', 'DESC']],
  });
  const latest = {};
  for (const row of rows) {
    if (Object.hasOwn(latest, row.section)) continue;
    const { records, ...summary } = row.published;
    latest[row.section] = { period: row.period, published: summary, publishedAt: row.publishedAt };
  }
  res.json(latest);
}));

router.get('/section/:section', handle(async (req, res) => {
  const rows = await PublicReport.findAll({
    where: { section: req.params.section, published: { [Op.ne]: null } },
    attributes: publishedFields,
    order: [['period', 'DESC']],
  });
  res.json(rows);
}));

router.use('/admin', auth, authorize('admin'));

router.get('/admin/placements-summary', handle(async (req, res) => {
  const { batch } = req.query;
  if (typeof batch !== 'string' || !periodPattern.test(batch)) return res.status(400).json({ message: 'Enter a year or academic year.' });
  const rows = await Placement.findAll({
    where: { batch },
    attributes: ['studentId', 'company', 'package', 'placementType'],
    raw: true,
  });
  if (!rows.length) return res.status(404).json({ message: 'No placement records match this reporting period.' });
  res.json(placementSummary(rows));
}));

router.get('/admin/:section', handle(async (req, res) => {
  const rows = await PublicReport.findAll({ where: { section: req.params.section }, order: [['period', 'DESC']] });
  res.json(rows);
}));

router.put('/admin/:section/:period', handle(async (req, res) => {
  const { section, period } = req.params;
  const { action, version, report } = req.body ?? {};
  if (!periodPattern.test(period) || !Number.isSafeInteger(version) || version < 0 ||
      !['save', 'publish', 'archive'].includes(action)) {
    return res.status(400).json({ message: 'Enter a valid period and action.' });
  }
  let draft;
  if (action === 'save') {
    try {
      draft = validateReport(section, report);
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  const conflict = () => res.status(409).json({ message: 'The report changed. Reload it before making another update.' });
  const key = { section, period };
  if (action === 'save' && version === 0) {
    const [row, created] = await PublicReport.findOrCreate({ where: key, defaults: { draft } });
    return created ? res.status(201).json(row) : conflict();
  }

  const row = await PublicReport.findOne({ where: { ...key, version } });
  if (!row) return conflict();
  const changes = { version: version + 1 };
  if (action === 'save') changes.draft = draft;
  if (action === 'publish') {
    if (!row.draft) return res.status(400).json({ message: 'Save a draft before publishing.' });
    Object.assign(changes, { published: row.draft, publishedBy: req.user.id, publishedAt: new Date(), draft: null, archivedBy: null, archivedAt: null });
  }
  if (action === 'archive') {
    if (!row.published) return res.status(400).json({ message: 'There is no published report to archive.' });
    Object.assign(changes, { draft: row.draft ?? row.published, published: null, archivedBy: req.user.id, archivedAt: new Date() });
  }
  const [count, updated] = await PublicReport.update(changes, { where: { ...key, version }, returning: true });
  if (!count) return conflict();
  if (action !== 'save') {
    await logActionSafe({
      user: req.user,
      action: action === 'publish' ? 'PUBLISH_PUBLIC_REPORT' : 'ARCHIVE_PUBLIC_REPORT',
      title: sections[section].title + ' ? ' + period,
      ipAddress: req.ip,
    });
  }
  res.json(updated[0]);
}));

router.use((error, req, res, next) => {
  console.error('Public reports:', error.message);
  res.status(503).json({ message: 'Reports are temporarily unavailable.' });
});

module.exports = router;
